import './style.css';
import * as THREE from 'three';
import { Battlefield, GROUND_HALF_DEPTH, GROUND_HALF_WIDTH } from './scene/Battlefield';
import { UnitArmies } from './scene/Units';
import { Effects } from './scene/Effects';
import { Combat } from './scene/Combat';
import { Emplacements } from './scene/Emplacements';
import { AirSupport } from './scene/Aircraft';
import { Nametags } from './scene/Nametags';
import { ChatBridge } from './data/chat';
import { Hud } from './ui/hud';
import { EventOverlay } from './ui/EventOverlay';
import { StatsPanel } from './ui/StatsPanel';
import { BinanceFeed } from './data/BinanceFeed';
import { marketStore } from './data/store';
import { sfx } from './audio';
import { config } from './config';
import type { CampSide } from './scene/Battlefield';

const app = document.getElementById('app')!;
const sceneContainer = document.createElement('div');
sceneContainer.id = 'scene-container';
app.appendChild(sceneContainer);

const battlefield = new Battlefield(sceneContainer);
const effects = new Effects(battlefield.scene);

// Shells and bombs detonate through the same particle system as
// liquidations, but with the camera shake dialled right down - background
// fire should light up the field without making the shot unwatchable.
const combat = new Combat(battlefield.scene, (position, color, magnitude) => {
  effects.explode(position, color, magnitude, 0.16);
});

const nametags = new Nametags(battlefield.scene);
const units = new UnitArmies(battlefield.scene, combat, nametags);
const emplacements = new Emplacements(battlefield.scene, combat);
const airSupport = new AirSupport(battlefield.scene, combat, {
  fieldHalfWidth: GROUND_HALF_WIDTH,
  fieldHalfDepth: GROUND_HALF_DEPTH,
  jetsPerSide: config.quality === 'low' ? 1 : 2,
  helisPerSide: config.quality === 'low' ? 1 : 2,
});
const hud = new Hud(app);
const statsPanel = new StatsPanel(hud.root);
const eventOverlay = new EventOverlay(app);

// --- Wall depth -> army size ------------------------------------------------
const USD_PER_UNIT = 260_000;
const MIN_UNITS = 22;
const MAX_UNITS = 145;

function wallToUnits(usd: number): number {
  return THREE.MathUtils.clamp(Math.round(usd / USD_PER_UNIT), MIN_UNITS, MAX_UNITS);
}

function priceTickStep(price: number): number {
  return Math.max(25, Math.round((price * 0.0015) / 25) * 25);
}

marketStore.subscribe((state) => {
  hud.setStatus(state.status);

  if (state.ticker) {
    hud.setTicker(state.ticker);
    statsPanel.setPrice(state.ticker.price, state.ticker.changePercent24h);
    battlefield.setCenterPrice(state.ticker.price, priceTickStep(state.ticker.price));
  }

  if (state.book && state.ticker) {
    hud.setBook(state.book, state.pressure, state.pressureRatio, state.ticker.price);
    units.setDesiredTotal('bears', wallToUnits(state.book.askWallUsd));
    units.setDesiredTotal('bulls', wallToUnits(state.book.bidWallUsd));
  }

  battlefield.setPressureRatio(state.pressureRatio);
});

marketStore.onLiquidation((liq) => {
  const side: CampSide = liq.side === 'short' ? 'bears' : 'bulls';
  const magnitude = THREE.MathUtils.clamp(liq.usd / 60_000, 0.2, 2.2);
  const unitsLost = THREE.MathUtils.clamp(Math.round(liq.usd / 35_000), 1, 8);

  const { position, names } = units.killUnits(side, unitsLost, battlefield.frontlineWorldX);
  const color = side === 'bears' ? 0xe0483f : 0x36c17a;
  if (position) {
    effects.explode(position, color, magnitude);
    // Leave hulls behind. Replacements roll out of the camp on a delay, so
    // a stretch of front that has been fought over hard stays visibly
    // wrecked for a while afterwards.
    effects.addWreck(position, 1 + Math.min(magnitude, 1) * 0.6);
  }

  hud.pushLiquidation(liq, unitsLost);
  sfx.explosion(magnitude);

  // Losing an enlisted viewer's unit is the most personal thing that can
  // happen on screen, so it gets its own line in the log.
  for (const name of names) {
    hud.pushFeed({
      id: `fallen-${name}-${liq.time}`,
      kind: 'status',
      side,
      text: `${name} was wiped out on the ${side === 'bears' ? 'Bear' : 'Bull'} line`,
      detail: 'K.I.A.',
      time: liq.time,
    });
  }
});

marketStore.onMilestone((m) => {
  hud.pushMilestone(m);
  sfx.milestone();
});

// Whale prints, wall shifts and ground gained all print to the same battle
// log as liquidations, so the corner keeps telling the story even when
// nothing is being liquidated.
marketStore.onFeed((event) => {
  if (event.kind === 'liquidation') return;
  hud.pushFeed(event);
  if (event.kind === 'whale') sfx.blip(event.side === 'bulls');
});

marketStore.onStats((stats) => statsPanel.setStats(stats));

// The handful of moments worth interrupting the screen for. The overlay
// rate-limits itself, so only play the sting when it actually showed.
marketStore.onMajorEvent((event) => {
  if (!eventOverlay.show(event)) return;
  sfx.sting(event.intensity);
  if (event.intensity > 0.75) sfx.alarm();
});

// Situation reports if the market goes quiet; the store rate-limits itself,
// so this can poll cheaply.
window.setInterval(() => marketStore.tickFeed(), 4000);

// --- Feed lifecycle ----------------------------------------------------------
const feed = new BinanceFeed(config.symbol, {
  onTicker: (t) => marketStore.setTicker(t),
  onDepth: (o) => marketStore.setBook(o),
  onTrade: (tr) => marketStore.addTrade(tr),
  onLiquidation: (l) => marketStore.addLiquidation(l),
  onStatus: (s) => marketStore.setStatus(s),
});
feed.start();

// --- Chat enlistment ---------------------------------------------------
// Viewers who talk in chat get their own unit with their handle above it.
const chat = new ChatBridge((author) => {
  const side = units.enlist(author);
  if (!side) return;
  hud.pushFeed({
    id: `enlist-${author}-${Date.now()}`,
    kind: 'status',
    side,
    text: `${author} joined the ${side === 'bears' ? 'Bears' : 'Bulls'}`,
    detail: 'ENLISTED',
    time: Date.now(),
  });
});
chat.start();

// Start the audio graph at boot rather than on the first explosion, so the
// ambient bed is already there when a viewer tunes in. No-op when sound is
// off. OBS' browser source has no user gesture to wait for, so this is the
// only chance to get the context running.
sfx.resume();

// A normal browser still holds audio suspended until the page is clicked;
// OBS does not. Poll the real context state and show the prompt only while
// it is genuinely blocked, so it appears when someone opens the file by
// hand and never on the stream itself. Any click retries.
const wakeAudio = () => sfx.resume();
window.addEventListener('pointerdown', wakeAudio);
window.addEventListener('keydown', wakeAudio);
window.setInterval(() => {
  const { enabled, state } = sfx.status;
  hud.setAudioBlocked(enabled && state !== 'running');
}, 700);

window.addEventListener('beforeunload', () => {
  feed.stop();
  chat.stop();
});

// --- Debug/demo hook ----------------------------------------------------------
// Opt-in via ?debug=1. Lets a streamer sanity-check the scene from the
// devtools console (or this repo's own screenshot tooling) without waiting
// on a real liquidation, and without exposing anything when debug is off.
if (new URLSearchParams(window.location.search).get('debug') === '1') {
  let demoPrice = 78_450;
  (window as unknown as { battlefieldDebug: Record<string, () => void> }).battlefieldDebug = {
    demoTicker: () => {
      demoPrice += (Math.random() - 0.5) * 40;
      marketStore.setTicker({
        price: demoPrice,
        changePercent24h: -0.97,
        high24h: demoPrice + 900,
        low24h: demoPrice - 900,
        volume24hBase: 12000,
        updatedAt: Date.now(),
      });
      const mk = (base: number, dir: 1 | -1) =>
        Array.from({ length: 20 }, (_, i) => ({ price: base + dir * i * 12, qty: 0.2 + Math.random() * 3 }));
      marketStore.setBook({
        bids: mk(demoPrice - 5, -1),
        asks: mk(demoPrice + 5, 1),
        bidWallUsd: 31_400_000,
        askWallUsd: 25_400_000,
        updatedAt: Date.now(),
      });
      marketStore.setStatus('live');
    },
    demoLiquidation: () => {
      const side = Math.random() > 0.5 ? 'short' : 'long';
      marketStore.addLiquidation({
        id: `demo-${Date.now()}`,
        side,
        price: demoPrice,
        qtyBase: 0.6,
        usd: 51_500 + Math.random() * 150_000,
        time: Date.now(),
      });
    },
    // Audio diagnostics. `state` must read "running" and `peak` must go
    // above zero while something is firing, otherwise the page is silent.
    audioStatus: (() => sfx.status) as unknown as () => void,
    testSound: (() => {
      sfx.resume();
      sfx.explosion(1);
      sfx.sting(0.9);
    }) as unknown as () => void,
    // Park the camera somewhere specific - handy for lining up a shot or
    // grabbing a close-up of the models. Needs ?interact=1 so the
    // cinematic drift isn't fighting for the camera.
    setCamera: ((x: number, y: number, z: number, tx = 0, ty = 1, tz = 0) => {
      battlefield.camera.position.set(x, y, z);
      battlefield.camera.lookAt(tx, ty, tz);
    }) as unknown as () => void,
    demoMega: () => {
      marketStore.addLiquidation({
        id: `demo-mega-${Date.now()}`,
        side: Math.random() > 0.5 ? 'short' : 'long',
        price: demoPrice,
        qtyBase: 8,
        usd: 400_000 + Math.random() * 900_000,
        time: Date.now(),
      });
    },
    demoWhale: () => {
      const usd = 140_000 + Math.random() * 600_000;
      marketStore.addTrade({
        id: `demo-trade-${Date.now()}`,
        price: demoPrice,
        qtyBase: usd / demoPrice,
        usd,
        isBuyerMaker: Math.random() > 0.5,
        time: Date.now(),
      });
    },
  };
}

// --- Render loop --------------------------------------------------------------
const minFrameMs = config.fpsCap > 0 ? 1000 / config.fpsCap : 0;
let lastFrameTime = 0;
let intensityTimer = 0;

function frame(now: number): void {
  requestAnimationFrame(frame);
  if (minFrameMs > 0 && now - lastFrameTime < minFrameMs) return;
  lastFrameTime = now;

  const dt = battlefield.update();
  const frontlineX = battlefield.frontlineWorldX;
  if (effects.shake > 0) battlefield.shake(effects.shake);
  units.update(dt, frontlineX);
  emplacements.update(dt, frontlineX);
  airSupport.update(dt, frontlineX);
  combat.update(dt);
  effects.update(dt);
  battlefield.render();

  // Swell the ambient battle bed with how many units are actually fighting.
  intensityTimer += dt;
  if (intensityTimer > 1) {
    intensityTimer = 0;
    const engaged = units.activeCount('bears') + units.activeCount('bulls');
    sfx.setIntensity(Math.min(1, engaged / 150));
  }
}
requestAnimationFrame(frame);

window.addEventListener('resize', () => battlefield.resize());
