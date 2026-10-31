// Core helpers for the clip engine. Everything is driven by an explicit time
// value (seconds) instead of CSS transitions, so a frame rendered at t=1.4s is
// identical in the live preview and in the frame-by-frame video export.
(function () {
  const C = (window.Clip = {});
  const NS = 'http://www.w3.org/2000/svg';

  C.clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  C.lerp = (a, b, k) => a + (b - a) * k;
  C.E = {
    linear: (t) => t,
    out: (t) => 1 - Math.pow(1 - t, 3),
    in: (t) => t * t * t,
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    back: (t) => {
      const c1 = 1.9, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    expo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  };
  // Progress 0..1 of a tween that starts at `start` and lasts `dur` seconds.
  C.k = (t, start, dur = 0.5, ease = 'out') => C.E[ease](C.clamp((t - start) / dur));

  // Deterministic pseudo-random numbers, so particles look identical per frame.
  C.rand = (seed) => {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  C.h = (tag, attrs = {}, parent, html) => {
    const e = document.createElement(tag);
    for (const k in attrs) {
      if (k === 'style' && typeof attrs[k] === 'object') {
        for (const sk in attrs[k]) sk.startsWith('--') ? e.style.setProperty(sk, attrs[k][sk]) : (e.style[sk] = attrs[k][sk]);
      }
      else if (k === 'class') e.className = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    if (html != null) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  };
  C.s = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  C.svg = (parent, w = 1080, h = 860) =>
    C.s('svg', { viewBox: `0 0 ${w} ${h}`, width: w, height: h, class: 'layer' }, parent);

  // Absolutely position an element by its centre and apply a transform.
  C.place = (el, x, y) => {
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.classList.add('abs');
    return el;
  };
  C.tf = (el, { x = 0, y = 0, s = 1, sx, sy, r = 0, o } = {}) => {
    el.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px) rotate(${r}deg) scale(${sx ?? s},${sy ?? s})`;
    if (o != null) el.style.opacity = o;
  };
  // Standard "pop in": scale up with overshoot while fading in.
  C.pop = (el, t, start, dur = 0.38, extra = {}) => {
    const k = C.k(t, start, dur, 'back');
    const f = C.k(t, start, dur * 0.5);
    C.tf(el, { ...extra, s: (extra.s ?? 1) * Math.max(0, k), o: f });
    return k;
  };
  C.rise = (el, t, start, dur = 0.5, dist = 40) => {
    const k = C.k(t, start, dur);
    C.tf(el, { y: (1 - k) * dist, o: k });
    return k;
  };

  // Shrinks an element's font size until it is at most maxW pixels wide.
  C.fit = (el, maxW) => {
    const w = el.scrollWidth;
    if (w > maxW) el.style.fontSize = parseFloat(getComputedStyle(el).fontSize) * (maxW / w) + 'px';
  };

  // Interpolates a number inside a display string: "$64.6B" at k=.5 -> "$32.3B".
  C.count = (str, k, from = 0) => {
    const m = String(str).match(/^(.*?)(\d[\d,]*(?:\.\d+)?)(.*)$/);
    if (!m) return String(str);
    // German decimals ("53,4") count as decimals, not thousands separators.
    if (/^\d+,\d{1,2}$/.test(m[2])) {
      const [i, f] = m[2].split(',');
      return m[1] + C.lerp(from, parseFloat(i + '.' + f), k).toFixed(f.length).replace('.', ',') + m[3];
    }
    const raw = m[2].replace(/,/g, '');
    const dec = (raw.split('.')[1] || '').length;
    let v = C.lerp(from, parseFloat(raw), k).toFixed(dec);
    if (m[2].includes(',')) {
      const [i, f] = v.split('.');
      v = i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (f ? '.' + f : '');
    }
    return m[1] + v + m[3];
  };

  C.hex = (h) => {
    const n = parseInt(h.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  C.mix = (a, b, k) => {
    const A = C.hex(a), B = C.hex(b);
    return `rgb(${A.map((v, i) => Math.round(C.lerp(v, B[i], k))).join(',')})`;
  };

  C.COLORS = {
    green: '#2ee86a', red: '#ff3b3b', cyan: '#3fd0ff', amber: '#ffb020',
    grey: '#7d8794', white: '#ffffff', gold: '#f5c542', blue: '#3b82f6', purple: '#a855f7',
  };
  C.color = (c, fallback = 'cyan') => C.COLORS[c] || c || C.COLORS[fallback];

  // Brand chips are drawn from a glyph + brand colour, not trademark logos.
  // Pass `logo: "path/to/logo.png"` on any brand to use a real image instead.
  C.BRANDS = {
    META: { name: 'META', color: '#0a7cff', glyph: '∞' },
    GOOGL: { name: 'GOOGLE', color: '#4285f4', glyph: 'G' },
    MSFT: { name: 'MICROSOFT', color: '#00a4ef', glyph: 'M' },
    AMZN: { name: 'AMAZON', color: '#ff9900', glyph: 'a' },
    NVDA: { name: 'NVIDIA', color: '#76b900', glyph: 'N' },
    AAPL: { name: 'APPLE', color: '#8e959b', glyph: 'A' },
    TSLA: { name: 'TESLA', color: '#e31937', glyph: 'T' },
    AMD: { name: 'AMD', color: '#ed1c24', glyph: 'AMD' },
    INTC: { name: 'INTEL', color: '#0071c5', glyph: 'i' },
    ARM: { name: 'ARM', color: '#0091bd', glyph: 'arm' },
    QCOM: { name: 'QUALCOMM', color: '#3253dc', glyph: 'Q' },
    MRVL: { name: 'MARVELL', color: '#c8102e', glyph: 'M' },
    TSM: { name: 'TSMC', color: '#c4161c', glyph: 'TS' },
    CRWV: { name: 'COREWEAVE', color: '#2c6bed', glyph: 'CW' },
    OPENAI: { name: 'OPENAI', color: '#10a37f', glyph: 'AI' },
    MSTR: { name: 'STRATEGY', color: '#f7931a', glyph: 'S' },
    COIN: { name: 'COINBASE', color: '#0052ff', glyph: 'C' },
    BLK: { name: 'BLACKROCK', color: '#111111', glyph: 'BR' },
    BTC: { name: 'BITCOIN', color: '#f7931a', glyph: '₿' },
    ETH: { name: 'ETHEREUM', color: '#627eea', glyph: 'Ξ' },
    SOL: { name: 'SOLANA', color: '#9945ff', glyph: '◎' },
    XRP: { name: 'XRP', color: '#23292f', glyph: 'X' },
    GOLD: { name: 'GOLD', color: '#d4a017', glyph: 'Au' },
    USD: { name: 'DOLLAR', color: '#2e9d5b', glyph: '$' },
    EUR: { name: 'EURO', color: '#1f4fa8', glyph: '€' },
    FED: { name: 'FED', color: '#1c3d6e', glyph: 'FED' },
    SPX: { name: 'S&P 500', color: '#c8102e', glyph: '500' },
    NDX: { name: 'NASDAQ', color: '#0096d6', glyph: 'NQ' },
    DAX: { name: 'DAX', color: '#1a1a1a', glyph: 'DAX' },
    AI: { name: 'AI', color: '#3fd0ff', glyph: 'AI' },
  };
  C.brand = (b) => {
    if (b == null) b = '?';
    if (typeof b === 'string') {
      const key = b.toUpperCase();
      return { ticker: key, ...(C.BRANDS[key] || { name: key, color: '#3fd0ff', glyph: key.slice(0, 2) }) };
    }
    const base = b.ticker ? C.brand(b.ticker) : { ticker: b.name || '?', color: '#3fd0ff', glyph: (b.name || '?').slice(0, 2) };
    return { ...base, ...b };
  };
  C.chip = (b, size = 96, parent) => {
    b = C.brand(b);
    const d = C.h('div', { class: 'chip', style: { width: size + 'px', height: size + 'px', '--c': b.color } }, parent);
    if (b.logo) C.h('img', { src: b.logo }, d);
    else {
      const n = [...b.glyph].length, emoji = /\p{Extended_Pictographic}/u.test(b.glyph);
      C.h('span', { style: { fontSize: size * (emoji ? 0.6 : n > 3 ? 0.24 : n > 2 ? 0.3 : n > 1 ? 0.4 : 0.58) + 'px' } }, d, b.glyph);
    }
    return d;
  };

  // 2:1 isometric box; (cx, cy) is the centre of the top face.
  C.isoBox = (parent, cx, cy, w, depth, { top = '#1b2a33', left = '#0f1a20', right = '#0b1318', stroke = 'none', sw = 2 } = {}) => {
    const g = C.s('g', {}, parent);
    const hw = w, hh = w / 2;
    const pts = (a) => a.map((p) => p.join(',')).join(' ');
    C.s('polygon', { points: pts([[cx - hw, cy], [cx, cy + hh], [cx, cy + hh + depth], [cx - hw, cy + depth]]), fill: left, stroke, 'stroke-width': sw }, g);
    C.s('polygon', { points: pts([[cx + hw, cy], [cx, cy + hh], [cx, cy + hh + depth], [cx + hw, cy + depth]]), fill: right, stroke, 'stroke-width': sw }, g);
    C.s('polygon', { points: pts([[cx, cy - hh], [cx + hw, cy], [cx, cy + hh], [cx - hw, cy]]), fill: top, stroke, 'stroke-width': sw }, g);
    return g;
  };

  // Random walk from `from` to `to` (Brownian bridge) for believable charts.
  C.walk = ({ from = 100, to = 90, points = 40, vol = 0.02, seed = 1 }) => {
    const out = [from];
    for (let i = 1; i < points; i++) out.push(out[i - 1] * (1 + (C.rand(seed * 1000 + i) - 0.5) * 2 * vol));
    const err = to - out[points - 1];
    return out.map((v, i) => v + (err * i) / (points - 1));
  };

  C.niceTicks = (min, max, count = 4) => {
    const span = max - min || 1;
    const raw = span / count;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || raw;
    const lo = Math.floor(min / step) * step;
    const ticks = [];
    for (let v = lo; v <= max + step * 0.001; v += step) ticks.push(+v.toFixed(10));
    return ticks;
  };
})();
