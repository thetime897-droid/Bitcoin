// Einstellungen per URL, z. B. http://localhost:8080/?sekunden=30&ton=0
const params = new URLSearchParams(location.search);
const SHOW_MS = (Number(params.get('sekunden')) || 25) * 1000;
const SOUND = params.get('ton') !== '0';
const NOTICE_EVERY = 8; // nach so vielen Meldungen kommt der Hinweis in groß
const NOTICE_MS = 12000;
const ROTATION_POOL = 20; // wenn nichts Neues kommt: die neuesten N im Kreis zeigen
const COINS = ['BTC', 'ETH', 'SOL', 'XRP', 'BNB'];

const CATEGORY = {
  aktien: { label: 'Aktien', color: 'var(--aktien)' },
  etf: { label: 'ETF', color: 'var(--etf)' },
  krypto: { label: 'Krypto', color: 'var(--krypto)' },
  makro: { label: 'Wirtschaft', color: 'var(--makro)' },
};

const $ = (id) => document.getElementById(id);
const stage = $('stage');

// ---------------------------------------------------------------- Skalierung

function fit() {
  const s = Math.min(innerWidth / 1920, innerHeight / 1080);
  stage.style.transform = `translate(${(innerWidth - 1920 * s) / 2}px, ${(innerHeight - 1080 * s) / 2}px) scale(${s})`;
}
addEventListener('resize', fit);
fit();

// ---------------------------------------------------------------- Uhrzeit

function tick() {
  const now = new Date();
  const time = now.toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' });
  const date = now.toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
  $('clock').innerHTML = `${time}<small>${date} · Berlin</small>`;
}
setInterval(tick, 1000);
tick();

function ago(ts) {
  const min = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (min < 1) return 'gerade eben';
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.floor(min / 60);
  return `vor ${h} Std.`;
}

// ---------------------------------------------------------------- Kurse (Binance, kostenlos)

const priceEls = {};
for (const c of COINS) {
  const el = document.createElement('div');
  el.className = 'price';
  el.innerHTML = `<b>${c}</b><span class="val">–</span><span class="chg"></span>`;
  $('prices').append(el);
  priceEls[c] = el;
}

function fmtPrice(v) {
  const digits = v >= 1000 ? 0 : v >= 10 ? 2 : 4;
  return v.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits }) + ' $';
}

function connectPrices() {
  const streams = COINS.map((c) => `${c.toLowerCase()}usdt@miniTicker`).join('/');
  const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
  ws.onmessage = (e) => {
    const d = JSON.parse(e.data).data;
    const coin = d.s.replace('USDT', '');
    const el = priceEls[coin];
    if (!el) return;
    const close = Number(d.c);
    const pct = ((close - Number(d.o)) / Number(d.o)) * 100;
    el.querySelector('.val').textContent = fmtPrice(close);
    const chg = el.querySelector('.chg');
    chg.textContent = `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct).toLocaleString('de-DE', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} %`;
    chg.className = `chg ${pct >= 0 ? 'up' : 'down'}`;
  };
  // Stream darf nie einfrieren: bei Abbruch nach 5 s neu verbinden.
  ws.onclose = () => setTimeout(connectPrices, 5000);
  ws.onerror = () => ws.close();
}
connectPrices();

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

// ---------------------------------------------------------------- Nachrichten & Rotation

let items = []; // neueste zuerst
const queue = []; // noch nicht gezeigte Meldungen
const seen = new Set();
let current = null;
let shownCount = 0;
let rotateIdx = 0;
let timer = null;

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

function next() {
  clearTimeout(timer);
  if (!items.length) return;

  // Regelmäßig den großen Hinweis einblenden.
  if (shownCount > 0 && shownCount % NOTICE_EVERY === 0 && current !== 'notice') {
    current = 'notice';
    showNotice();
    timer = setTimeout(next, NOTICE_MS);
    return;
  }

  let it = queue.shift();
  if (!it) {
    const pool = items.slice(0, ROTATION_POOL);
    it = pool[rotateIdx++ % pool.length];
  }
  seen.add(it.id);
  current = it;
  shownCount++;
  showStory(it);
  timer = setTimeout(next, it.breaking ? SHOW_MS * 1.4 : SHOW_MS);
}

function setAccent(color) {
  stage.style.setProperty('--accent', color);
}

function restartAnim(el) {
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
}

function runProgress(ms) {
  const bar = $('progress');
  bar.style.transition = 'none';
  bar.style.width = '0';
  void bar.offsetWidth;
  bar.style.transition = `width ${ms}ms linear`;
  bar.style.width = '100%';
}

function showStory(it) {
  const cat = CATEGORY[it.category] ?? CATEGORY.makro;
  setAccent(cat.color);
  $('empty').hidden = true;
  $('notice').hidden = true;
  const story = $('story');
  story.hidden = false;
  restartAnim(story);

  $('s-breaking').hidden = !it.breaking;
  $('s-cat').textContent = cat.label;
  $('s-source').textContent = it.source;
  $('s-ago').textContent = ago(it.date);
  $('s-title').textContent = it.title;
  $('s-summary').textContent = it.summary;
  $('s-summary').hidden = !it.summary;
  $('s-points').replaceChildren(...it.points.map((p) => Object.assign(document.createElement('li'), { textContent: p })));

  if (it.breaking) chime();
  runProgress(it.breaking ? SHOW_MS * 1.4 : SHOW_MS);
  renderList();
}

function showNotice() {
  setAccent('var(--warn)');
  $('story').hidden = true;
  $('empty').hidden = true;
  const n = $('notice');
  n.hidden = false;
  restartAnim(n);
  runProgress(NOTICE_MS);
  renderList();
}

let listed = new Set();
function renderList() {
  const top = items.slice(0, 7);
  $('list').replaceChildren(...top.map((it) => {
    const cat = CATEGORY[it.category] ?? CATEGORY.makro;
    const li = document.createElement('li');
    li.style.setProperty('--c', cat.color);
    if (current && current.id === it.id) li.classList.add('active');
    if (listed.size && !listed.has(it.id)) li.classList.add('new');
    li.innerHTML = `<div class="li-meta"><b></b><span></span></div><div class="li-title"></div>`;
    li.querySelector('b').textContent = cat.label;
    li.querySelector('span').textContent = `${new Date(it.date).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })} · ${it.source}`;
    li.querySelector('.li-title').textContent = it.title;
    return li;
  }));
  listed = new Set(top.map((i) => i.id));
}

// Laufband: wird nach jedem Durchlauf mit den aktuellen Überschriften neu befüllt.
const tickerEl = $('ticker');
function fillTicker() {
  const heads = items.slice(0, 20);
  if (!heads.length) {
    tickerEl.textContent = 'Warte auf Meldungen … +++ Keine Anlageberatung +++';
  } else {
    tickerEl.replaceChildren();
    heads.forEach((it, i) => {
      if (i) tickerEl.append(Object.assign(document.createElement('span'), { className: 'sep', textContent: '+++' }));
      tickerEl.append(document.createTextNode(`${it.source}: ${it.title}`));
    });
    tickerEl.append(Object.assign(document.createElement('span'), { className: 'sep', textContent: '+++' }));
    tickerEl.append(document.createTextNode('Keine Anlageberatung'));
  }
  // Gleichmäßiges Tempo, egal wie lang der Text ist (~140 px/s).
  requestAnimationFrame(() => {
    restartAnim(tickerEl);
    tickerEl.style.animationDuration = `${tickerEl.scrollWidth / 140}s`;
  });
}
tickerEl.addEventListener('animationiteration', fillTicker);

setInterval(() => {
  if (current && current !== 'notice') $('s-ago').textContent = ago(current.date);
}, 30000);

// ---------------------------------------------------------------- Verbindung zum Server

function connect() {
  const es = new EventSource('/events');

  es.addEventListener('init', (e) => {
    const { items: list, demo } = JSON.parse(e.data);
    $('demo').hidden = !demo;
    const firstLoad = !items.length;
    upsert(list);
    // Beim ersten Laden die wichtigen und neuesten Meldungen zuerst zeigen.
    if (firstLoad) list.slice(0, 10).forEach(enqueue);
    renderList();
    if (firstLoad) { fillTicker(); next(); }
  });

  es.addEventListener('item', (e) => {
    const it = JSON.parse(e.data);
    const wasEmpty = !items.length;
    upsert([it]);
    enqueue(it);
    renderList();
    if (wasEmpty) { fillTicker(); next(); }
    // Eilmeldungen unterbrechen die aktuelle (normale) Meldung sofort.
    else if (it.breaking && !(current && current.breaking)) next();
  });

  // EventSource verbindet sich bei Abbruch selbst neu.
}
connect();
