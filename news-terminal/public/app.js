// Einstellungen per URL, z. B. http://localhost:8080/?sekunden=30&ton=0
const params = new URLSearchParams(location.search);
const SHOW_MS = (Number(params.get('sekunden')) || 25) * 1000;
const MARKET_MS = (Number(params.get('markt')) || 18) * 1000;
const NOTICE_MS = 12000;
const SOUND = params.get('ton') !== '0';
const STORIES_PER_MARKET = 3; // nach so vielen Meldungen kommt eine Markt-Folie
const NOTICE_EVERY = 10; // nach so vielen Einblendungen kommt der große Hinweis
const ROTATION_POOL = 20; // wenn nichts Neues kommt: die neuesten N im Kreis zeigen
const SIDE_TAB_MS = 9000;

const CATEGORY = {
  aktien: { label: 'Aktien', color: 'var(--aktien)' },
  etf: { label: 'ETF', color: 'var(--etf)' },
  krypto: { label: 'Krypto', color: 'var(--krypto)' },
  makro: { label: 'Wirtschaft', color: 'var(--makro)' },
};

const MARKET_SLIDES = {
  stocks: { label: 'Top-Bewegungen: Aktien', color: 'var(--aktien)' },
  crypto: { label: 'Top-Bewegungen: Krypto', color: 'var(--krypto)' },
  focus: { label: 'Aktie im Fokus', color: 'var(--aktien)' },
  overview: { label: 'Indizes, ETFs & ETCs', color: 'var(--etf)' },
};
const MARKET_CYCLE = ['stocks', 'crypto', 'focus', 'overview'];

const $ = (id) => document.getElementById(id);
const stage = $('stage');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ---------------------------------------------------------------- Skalierung

function fit() {
  const s = Math.min(innerWidth / 1920, innerHeight / 1080);
  stage.style.transform = `translate(${(innerWidth - 1920 * s) / 2}px, ${(innerHeight - 1080 * s) / 2}px) scale(${s})`;
}
addEventListener('resize', fit);
fit();

// ---------------------------------------------------------------- Formatierung

function fmtNum(v, digits) {
  if (digits == null) {
    const a = Math.abs(v);
    digits = a >= 1000 ? 0 : a >= 10 ? 2 : a >= 1 ? 3 : 4;
  }
  return v.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
const fmtPrice = (q, v = q.price) => `${fmtNum(v)}${q.unit ? ` ${q.unit}` : ''}`;
const fmtPct = (p) => (p == null ? '–' : `${p >= 0 ? '▲' : '▼'} ${fmtNum(Math.abs(p), 2)} %`);
const dir = (p) => (p >= 0 ? 'up' : 'down');

function ago(ts) {
  const min = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (min < 1) return 'gerade eben';
  if (min < 60) return `vor ${min} Min.`;
  return `vor ${Math.floor(min / 60)} Std.`;
}

/** Kleiner Kursverlauf als SVG. Die Linie zeichnet sich beim Einblenden. */
function spark(values, { w = 100, h = 30, pct = 0, area = false } = {}) {
  if (!values || values.length < 2) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 2 - ((v - min) / span) * (h - 4)]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('');
  const color = pct >= 0 ? 'var(--up)' : 'var(--down)';
  const id = `g${Math.random().toString(36).slice(2, 8)}`;
  const fill = area
    ? `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><path d="${d}L${w},${h}L0,${h}Z" fill="url(#${id})"/>`
    : '';
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${fill}<path class="line" pathLength="1" d="${d}" fill="none" stroke="${color}" stroke-width="${area ? 3 : 2}" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>`;
}

function restartAnim(el) {
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
}

// ---------------------------------------------------------------- Uhrzeit

function tick() {
  const now = new Date();
  const time = now.toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' });
  const date = now.toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
  $('clock').innerHTML = `${time}<small>${date} · Berlin</small>`;
}
setInterval(tick, 1000);
tick();

// ---------------------------------------------------------------- Kurse

let markets = { indices: [], stocks: [], etfs: [], crypto: [] };
const bySym = new Map();

function allQuotes() {
  return [...markets.indices, ...markets.stocks, ...markets.etfs, ...markets.crypto];
}

function setMarkets(m) {
  if (!m) return;
  const prev = new Map(bySym);
  markets = m;
  bySym.clear();
  for (const q of allQuotes()) bySym.set(q.sym, q);
  updateStrip(prev);
}

// Kurs-Laufband oben: Indizes, große Kryptos, beliebte ETFs/ETCs.
let stripKey = '';
function stripQuotes() {
  return [...markets.indices, ...markets.crypto.slice(0, 6), ...markets.etfs.slice(0, 3), ...markets.etfs.filter((e) => e.kind === 'ETC')]
    .filter((q, i, a) => a.findIndex((x) => x.sym === q.sym) === i);
}

function updateStrip(prev) {
  const list = stripQuotes();
  const key = list.map((q) => q.sym).join(',');
  const track = $('strip');
  if (key !== stripKey) {
    stripKey = key;
    const html = list.map((q) => `<span class="q" data-sym="${esc(q.sym)}"><span class="n">${esc(q.name)}</span><span class="v">${fmtPrice(q)}</span><span class="c ${dir(q.pct)}">${fmtPct(q.pct)}</span>${spark(q.spark, { w: 70, h: 24, pct: q.pct })}</span>`).join('');
    track.innerHTML = html + html; // doppelt für nahtlose Endlosschleife
    requestAnimationFrame(() => { track.style.animationDuration = `${track.scrollWidth / 2 / 70}s`; });
    return;
  }
  // Nur Werte austauschen und kurz grün/rot aufblinken lassen.
  for (const el of track.querySelectorAll('.q')) {
    const q = bySym.get(el.dataset.sym);
    const old = prev.get(el.dataset.sym);
    if (!q) continue;
    const v = el.querySelector('.v');
    const text = fmtPrice(q);
    if (v.textContent !== text) {
      v.textContent = text;
      v.classList.remove('flash-up', 'flash-down');
      void v.offsetWidth;
      if (old?.price != null) v.classList.add(q.price >= old.price ? 'flash-up' : 'flash-down');
    }
    const c = el.querySelector('.c');
    c.textContent = fmtPct(q.pct);
    c.className = `c ${dir(q.pct)}`;
  }
}

const withPct = (list) => list.filter((q) => q.pct != null);
const gainers = (list, n) => withPct(list).sort((a, b) => b.pct - a.pct).slice(0, n);
const losers = (list, n) => withPct(list).sort((a, b) => a.pct - b.pct).slice(0, n);

function rowsHtml(list, maxAbs) {
  return list.map((q, i) => `
    <div class="row" style="animation-delay:${i * 0.12}s">
      <div class="bar" style="--w:${Math.min(100, (Math.abs(q.pct) / (maxAbs || 1)) * 100)}%;background:var(--${dir(q.pct)})"></div>
      <div class="nm">${esc(q.name)}<small>${fmtPrice(q)}</small></div>
      ${spark(q.spark, { w: 90, h: 32, pct: q.pct })}
      <div class="pc ${dir(q.pct)}">${fmtPct(q.pct)}</div>
    </div>`).join('');
}

function targetHtml(q) {
  const t = q.target;
  if (!t) return '';
  const lo = Math.min(t.low ?? t.mean, q.price) * 0.97;
  const hi = Math.max(t.high ?? t.mean, q.price) * 1.03;
  const pos = (v) => `${(((v - lo) / (hi - lo)) * 100).toFixed(1)}%`;
  const upside = ((t.mean - q.price) / q.price) * 100;
  return `
    <div class="target">
      <div class="t-head">Ø Analysten-Kursziel <b>${fmtPrice(q, t.mean)}</b> <span class="${dir(upside)}">(${upside >= 0 ? '+' : ''}${fmtNum(upside, 1)} %)</span></div>
      <div class="tbar">
        <div class="mk mean" style="left:${pos(t.mean)}"><span>Ø Ziel</span></div>
        <div class="mk now" style="left:${pos(q.price)}"><span>Kurs</span></div>
        ${t.low != null ? `<span class="lo">${fmtNum(t.low)}</span>` : ''}${t.high != null ? `<span class="hi">${fmtNum(t.high)}</span>` : ''}
      </div>
      <div class="fine">${t.n} Analysten${t.rec ? ` · Konsens: ${esc(t.rec)}` : ''} · Meinungen Dritter, keine Empfehlung</div>
    </div>`;
}

// ---------------------------------------------------------------- Seitenleiste: Live-Bewegungen

const SIDE_TABS = [
  { title: 'Aktien ▲ Gewinner', get: () => gainers(markets.stocks, 5) },
  { title: 'Aktien ▼ Verlierer', get: () => losers(markets.stocks, 5) },
  { title: 'Krypto ▲ Gewinner', get: () => gainers(markets.crypto, 5) },
  { title: 'Krypto ▼ Verlierer', get: () => losers(markets.crypto, 5) },
];
let sideTab = -1;
function nextSideTab() {
  const tabs = SIDE_TABS.map((t) => ({ ...t, list: t.get() })).filter((t) => t.list.length);
  if (!tabs.length) {
    $('mv-list').innerHTML = '<div class="fine" style="color:var(--muted)">Warte auf Kurse …</div>';
    return;
  }
  sideTab = (sideTab + 1) % tabs.length;
  const tab = tabs[sideTab];
  $('mv-title').textContent = tab.title;
  const maxAbs = Math.max(...tab.list.map((q) => Math.abs(q.pct)));
  $('mv-list').innerHTML = rowsHtml(tab.list, maxAbs);
  $('mv-dots').innerHTML = tabs.map((_, i) => `<i class="${i === sideTab ? 'on' : ''}" style="--t:${SIDE_TAB_MS}ms"></i>`).join('');
}
setInterval(nextSideTab, SIDE_TAB_MS);

// ---------------------------------------------------------------- Ton bei Eilmeldung

let audio;
function chime() {
  if (!SOUND) return;
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') audio.resume();
    const t = audio.currentTime;
    [880, 1320].forEach((f, i) => {
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0, t + i * 0.18);
      g.gain.linearRampToValueAtTime(0.18, t + i * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.18 + 0.6);
      o.connect(g).connect(audio.destination);
      o.start(t + i * 0.18);
      o.stop(t + i * 0.18 + 0.7);
    });
  } catch { /* Ton ist optional */ }
}

// ---------------------------------------------------------------- Rotation

let items = []; // neueste zuerst
const queue = []; // noch nicht gezeigte Meldungen
const seen = new Set();
let current = null; // { type, item? }
let rotateIdx = 0;
let marketIdx = 0;
let storiesSinceMarket = 0;
let slidesSinceNotice = 0;
let timer = null;
let slideStart = 0;
let slideEnd = 0;

function upsert(list) {
  const byId = new Map(items.map((i) => [i.id, i]));
  for (const it of list) byId.set(it.id, it);
  items = [...byId.values()].sort((a, b) => b.date - a.date).slice(0, 150);
}

function enqueue(it) {
  if (seen.has(it.id) || queue.some((q) => q.id === it.id)) return;
  if (it.breaking) queue.unshift(it);
  else queue.push(it);
}

function marketAvailable(type) {
  if (type === 'stocks') return withPct(markets.stocks).length >= 4;
  if (type === 'crypto') return withPct(markets.crypto).length >= 4;
  if (type === 'focus') return markets.stocks.length > 0;
  return markets.indices.length + markets.etfs.length >= 4;
}

function planMarket() {
  for (let i = 0; i < MARKET_CYCLE.length; i++) {
    const idx = (marketIdx + i) % MARKET_CYCLE.length;
    if (marketAvailable(MARKET_CYCLE[idx])) return { type: 'market', market: MARKET_CYCLE[idx], idx };
  }
  return null;
}

/** Was als Nächstes kommt - ohne etwas zu verändern (für "Als nächstes"). */
function plan(forceStory = false) {
  if (!forceStory) {
    if (slidesSinceNotice >= NOTICE_EVERY) return { type: 'notice' };
    if (storiesSinceMarket >= STORIES_PER_MARKET || !items.length) {
      const m = planMarket();
      if (m) return m;
    }
  }
  if (queue.length) return { type: 'story', item: queue[0], fromQueue: true };
  if (items.length) {
    const pool = items.slice(0, ROTATION_POOL);
    return { type: 'story', item: pool[rotateIdx % pool.length] };
  }
  return null;
}

function next(forceStory = false) {
  clearTimeout(timer);
  const p = plan(forceStory);
  if (!p) return;

  slidesSinceNotice++;
  let ms;
  if (p.type === 'notice') {
    slidesSinceNotice = 0;
    ms = NOTICE_MS;
    showNotice();
  } else if (p.type === 'market') {
    marketIdx = p.idx + 1;
    storiesSinceMarket = 0;
    ms = MARKET_MS;
    showMarket(p.market);
  } else {
    if (p.fromQueue) queue.shift();
    else rotateIdx++;
    seen.add(p.item.id);
    storiesSinceMarket++;
    ms = p.item.breaking ? SHOW_MS * 1.4 : SHOW_MS;
    showStory(p.item);
  }
  current = p;
  slideStart = Date.now();
  slideEnd = slideStart + ms;
  runProgress(ms);
  renderList();
  timer = setTimeout(() => next(), ms);
}

function describe(p) {
  if (!p) return '–';
  if (p.type === 'notice') return 'Wichtiger Hinweis';
  if (p.type === 'market') return MARKET_SLIDES[p.market].label;
  return p.item.title;
}

// Countdown bis zur nächsten Einblendung (Ring in der Kopfzeile).
const RING = 119.4;
setInterval(() => {
  if (!slideEnd) return;
  const left = Math.max(0, slideEnd - Date.now());
  const frac = left / (slideEnd - slideStart || 1);
  $('countdown').textContent = `${Math.ceil(left / 1000)} s`;
  $('ring').style.strokeDashoffset = String(RING * (1 - frac));
  const text = describe(plan());
  if ($('upnext').textContent !== text) $('upnext').textContent = text;
}, 250);

function setAccent(color) {
  stage.style.setProperty('--accent', color);
}

function runProgress(ms) {
  const bar = $('progress');
  bar.style.transition = 'none';
  bar.style.width = '0';
  void bar.offsetWidth;
  bar.style.transition = `width ${ms}ms linear`;
  bar.style.width = '100%';
}

function showOnly(id) {
  for (const s of ['empty', 'story', 'market', 'notice']) $(s).hidden = s !== id;
  restartAnim($(id));
}

function showStory(it) {
  const cat = CATEGORY[it.category] ?? CATEGORY.makro;
  setAccent(cat.color);
  showOnly('story');

  $('s-breaking').hidden = !it.breaking;
  $('s-cat').textContent = cat.label;
  $('s-source').textContent = it.source;
  $('s-ago').textContent = ago(it.date);
  $('s-title').textContent = it.title;
  $('s-summary').textContent = it.summary;
  $('s-summary').hidden = !it.summary;
  $('s-points').replaceChildren(...it.points.map((p) => Object.assign(document.createElement('li'), { textContent: p })));

  // Geht es um eine bekannte Aktie/Krypto? Dann Kurs (und ggf. Kursziel) zeigen.
  const q = it.symbol && bySym.get(it.symbol);
  const focus = $('s-focus');
  focus.hidden = !q;
  if (q) {
    focus.innerHTML = `
      <div><div class="f-name">${esc(q.name)} · ${esc(q.kind)}</div><div class="f-price">${fmtPrice(q)}</div><div class="f-pct ${dir(q.pct)}">${fmtPct(q.pct)} heute</div></div>
      ${q.target ? targetHtml(q) : `<div class="fine" style="color:var(--muted)">Kurs ${q.kind === 'Krypto' ? 'der letzten 24 Std.' : 'heute'}</div>`}
      ${spark(q.spark, { w: 300, h: 70, pct: q.pct, area: true })}`;
    restartAnim(focus);
  }

  if (it.breaking) chime();
}

function showMarket(type) {
  const info = MARKET_SLIDES[type];
  setAccent(info.color);
  const el = $('market');
  let body = '';
  const stand = `Stand ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })} · Kurse ggf. verzögert`;

  if (type === 'stocks' || type === 'crypto') {
    const list = type === 'stocks' ? markets.stocks : markets.crypto;
    const up = gainers(list, 5);
    const down = losers(list, 5);
    const maxAbs = Math.max(...[...up, ...down].map((q) => Math.abs(q.pct)));
    body = `
      <div class="m-head"><h1>${info.label}</h1><div class="sub">${type === 'crypto' ? 'Etablierte Kryptowährungen · 24 Std. · ' : 'Veränderung heute · '}${stand}</div></div>
      <div class="m-cols">
        <div class="m-col"><h2 class="up">▲ Stärkste Gewinner</h2>${rowsHtml(up, maxAbs)}</div>
        <div class="m-col"><h2 class="down">▼ Stärkste Verlierer</h2>${rowsHtml(down, maxAbs)}</div>
      </div>`;
  } else if (type === 'focus') {
    // Die Aktie mit der größten Bewegung heute, bevorzugt mit Kursziel.
    const sorted = withPct(markets.stocks).sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
    const q = sorted.find((s) => s.target) ?? sorted[0] ?? markets.stocks[0];
    body = `
      <div class="m-head"><h1>Im Fokus: ${esc(q.name)}</h1><div class="sub">Größte Bewegung heute · ${stand}</div></div>
      <div class="big-focus">
        <div>
          <div class="bf-price">${fmtPrice(q)}</div>
          <div class="bf-pct ${dir(q.pct)}">${fmtPct(q.pct)} heute</div>
          ${spark(q.spark, { w: 900, h: 330, pct: q.pct, area: true }).replace('class="spark"', 'class="spark bigspark"')}
        </div>
        <div class="bf-side">
          ${q.target ? targetHtml(q) : '<div class="target"><div class="t-head">Für diesen Wert liegen gerade keine Analysten-Kursziele vor.</div></div>'}
          ${q.spark?.length > 1 ? `<div class="stats">
            <div><span>Tageshoch</span><b>${fmtPrice(q, Math.max(...q.spark))}</b></div>
            <div><span>Tagestief</span><b>${fmtPrice(q, Math.min(...q.spark))}</b></div>
            <div><span>Tagesbeginn</span><b>${fmtPrice(q, q.spark[0])}</b></div>
          </div>` : ''}
        </div>
      </div>`;
  } else {
    const tile = (q, i) => `<div class="tile" style="animation-delay:${i * 0.06}s"><div class="nm">${esc(q.name)}</div><div class="val">${fmtPrice(q)}</div><div class="pc ${dir(q.pct)}">${fmtPct(q.pct)}</div>${spark(q.spark, { w: 200, h: 28, pct: q.pct, area: true })}</div>`;
    body = `
      <div class="m-head"><h1>${info.label}</h1><div class="sub">Veränderung heute · ${stand}</div></div>
      <div class="tiles-label">Indizes & Rohstoffe</div>
      <div class="tiles">${markets.indices.slice(0, 8).map(tile).join('')}</div>
      <div class="tiles-label" style="margin-top:16px">Beliebte ETFs & ETCs</div>
      <div class="tiles">${markets.etfs.slice(0, 8).map((q, i) => tile({ ...q, name: `${q.name} (${q.kind})` }, i + 8)).join('')}</div>`;
  }
  el.innerHTML = body;
  showOnly('market');
}

function showNotice() {
  setAccent('var(--warn)');
  showOnly('notice');
}

let listed = new Set();
function renderList() {
  const top = items.slice(0, 3);
  $('list').replaceChildren(...top.map((it) => {
    const cat = CATEGORY[it.category] ?? CATEGORY.makro;
    const li = document.createElement('li');
    li.style.setProperty('--c', cat.color);
    if (current?.item?.id === it.id) li.classList.add('active');
    if (listed.size && !listed.has(it.id)) li.classList.add('new');
    li.innerHTML = '<div class="li-meta"><b></b><span></span></div><div class="li-title"></div>';
    li.querySelector('b').textContent = cat.label;
    li.querySelector('span').textContent = `${new Date(it.date).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })} · ${it.source}`;
    li.querySelector('.li-title').textContent = it.title;
    return li;
  }));
  listed = new Set(top.map((i) => i.id));
}

// News-Laufband: wird nach jedem Durchlauf mit den aktuellen Überschriften neu befüllt.
const tickerEl = $('ticker');
function fillTicker() {
  const heads = items.slice(0, 20);
  tickerEl.replaceChildren();
  const add = (text) => {
    if (tickerEl.childNodes.length) tickerEl.append(Object.assign(document.createElement('span'), { className: 'sep', textContent: '+++' }));
    tickerEl.append(document.createTextNode(text));
  };
  if (!heads.length) add('Warte auf Meldungen …');
  for (const it of heads) add(`${it.source}: ${it.title}`);
  add('Keine Anlageberatung');
  requestAnimationFrame(() => {
    restartAnim(tickerEl);
    tickerEl.style.animationDuration = `${tickerEl.scrollWidth / 140}s`;
  });
}
tickerEl.addEventListener('animationiteration', fillTicker);

setInterval(() => {
  if (current?.type === 'story') $('s-ago').textContent = ago(current.item.date);
}, 30000);

// ---------------------------------------------------------------- Verbindung zum Server

let started = false;
function startIfReady() {
  if (started || (!items.length && !allQuotes().length)) return;
  started = true;
  fillTicker();
  nextSideTab();
  next();
}

function connect() {
  const es = new EventSource('/events');

  es.addEventListener('init', (e) => {
    const { items: list, demo, markets: m } = JSON.parse(e.data);
    $('demo').hidden = !demo;
    setMarkets(m);
    const firstLoad = !items.length;
    upsert(list);
    // Beim ersten Laden die wichtigen und neuesten Meldungen zuerst zeigen.
    if (firstLoad) list.slice(0, 10).forEach(enqueue);
    renderList();
    startIfReady();
  });

  es.addEventListener('markets', (e) => {
    setMarkets(JSON.parse(e.data));
    startIfReady();
  });

  es.addEventListener('item', (e) => {
    const it = JSON.parse(e.data);
    upsert([it]);
    enqueue(it);
    renderList();
    if (!started) return startIfReady();
    // Eilmeldungen unterbrechen die aktuelle Einblendung sofort.
    if (it.breaking && !current?.item?.breaking) next(true);
  });

  // EventSource verbindet sich bei Abbruch selbst neu.
}
connect();
