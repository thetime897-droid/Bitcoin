import './style.css';
import * as THREE from 'three';
import { Battlefield } from './scene/Battlefield';
import { UnitArmies } from './scene/Units';
import { Effects } from './scene/Effects';
import { Hud } from './ui/hud';
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
const units = new UnitArmies(battlefield.scene, battlefield.bearsAnchor.position.x, battlefield.bullsAnchor.position.x);
const effects = new Effects(battlefield.scene);
const hud = new Hud(app);

// --- Wall depth -> army size ------------------------------------------------
const USD_PER_UNIT = 500_000;
const MIN_UNITS = 4;
const MAX_UNITS = 32;

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

  const pos = units.killUnits(side, unitsLost, battlefield.frontlineWorldX);
  const color = side === 'bears' ? 0xe0483f : 0x36c17a;
  if (pos) effects.explode(pos, color, magnitude);

  hud.pushLiquidation(liq, unitsLost);
  sfx.explosion(magnitude);
});

marketStore.onMilestone((m) => {
  hud.pushMilestone(m);
  sfx.milestone();
});

// --- Feed lifecycle ----------------------------------------------------------
const feed = new BinanceFeed(config.symbol, {
  onTicker: (t) => marketStore.setTicker(t),
  onDepth: (o) => marketStore.setBook(o),
  onTrade: (tr) => marketStore.addTrade(tr),
  onLiquidation: (l) => marketStore.addLiquidation(l),
  onStatus: (s) => marketStore.setStatus(s),
});
feed.start();

window.addEventListener('beforeunload', () => feed.stop());

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
  };
}

// --- Render loop --------------------------------------------------------------
const minFrameMs = config.fpsCap > 0 ? 1000 / config.fpsCap : 0;
let lastFrameTime = 0;

function frame(now: number): void {
  requestAnimationFrame(frame);
  if (minFrameMs > 0 && now - lastFrameTime < minFrameMs) return;
  lastFrameTime = now;

  const dt = battlefield.update();
  if (effects.shake > 0) battlefield.shake(effects.shake);
  units.update(dt, battlefield.frontlineWorldX);
  effects.update(dt);
  battlefield.render();
}
requestAnimationFrame(frame);

window.addEventListener('resize', () => battlefield.resize());
