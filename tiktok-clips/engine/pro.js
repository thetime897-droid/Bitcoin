// Pro scene set ("theme": "pro"): explainer-style motion graphics modelled on
// high-end finance shorts - glass tiles with HUD brackets, isometric chips, a
// rotating dot globe, a robot agent, a phone transcript, money flowing into
// tills. Every element blurs in, settles with an expo ease and keeps moving.
(function () {
  const C = window.Clip, S = C.scenes;
  const CY = '#3fd0ff', GR = '#2ee86a', RD = '#ff3b4a', GD = '#f5c542';
  const P = (C.pro = {});

  // Blur-in reveal: rises, sharpens and settles; x/y/s/r are the resting pose.
  P.show = (el, t, at, { dur = 0.55, dy = 36, s0 = 0.9, blur = 12, x = 0, y = 0, s = 1, r = 0 } = {}) => {
    const k = C.k(t, at, dur, 'expo');
    el.style.opacity = C.k(t, at, dur * 0.45);
    el.style.filter = k < 0.999 ? `blur(${(1 - k) * blur}px)` : '';
    el.style.transform = `translate(-50%,-50%) translate(${x}px,${y + (1 - k) * dy}px) rotate(${r}deg) scale(${s * C.lerp(s0, 1, k)})`;
    return k;
  };
  P.tile = (parent, w, h, style = {}) => C.h('div', { class: 'ptile', style: { width: w + 'px', height: h + 'px', ...style } }, parent);
  P.label = (parent, text, size = 24, color) => C.h('div', { class: 'plabel', style: { fontSize: size + 'px', ...(color ? { color } : {}) } }, parent, text);

  // Four HUD corner brackets around a w x h box centred on (cx, cy).
  P.brackets = (parent, cx, cy, w, h, col = CY, len = 40) => {
    const box = C.place(C.h('div', { style: { width: w + 'px', height: h + 'px', pointerEvents: 'none' } }, parent), cx, cy);
    [['left', 'top'], ['right', 'top'], ['left', 'bottom'], ['right', 'bottom']].forEach(([a, b]) =>
      C.h('div', { style: { position: 'absolute', [a]: 0, [b]: 0, width: len + 'px', height: len + 'px', [`border-${a}`]: `3px solid ${col}`, [`border-${b}`]: `3px solid ${col}`, opacity: 0.8 } }, box));
    return box;
  };

  // Rubber stamp that slams in (shared by several pro scenes).
  P.stamp = (st, ctx, sp) => {
    if (!sp) return () => {};
    const col = C.color(sp.color || 'red');
    const el = C.place(C.h('div', { class: 'stamp', style: { color: col, fontSize: (sp.size || 56) + 'px' } }, st, sp.text || ''), sp.x ?? 540, sp.y ?? 780);
    C.fit(el, 820);
    return (t) => {
      const k = C.k(t, sp.at ?? 2, 0.26);
      C.tf(el, { s: C.lerp(2.1, 1, k) * (1 + Math.sin(t * 2.6) * 0.01 * k), r: (sp.rotate ?? -6) + Math.sin(t * 1.8) * 0.7 * k, o: k });
    };
  };

  // Isometric CPU package: drawn flat, then sheared to iso. (cx, cy) = top face centre.
  P.chip = (svg, cx, cy, size, { label = '', color = CY, labelColor = '#eaf8ff' } = {}) => {
    const g = C.s('g', {}, svg);
    const iso = (dy) => `matrix(0.707,0.409,-0.707,0.409,${cx},${cy + dy})`;
    const h = size / 2;
    C.s('ellipse', { cx, cy: cy + size * 0.18, rx: size * 0.95, ry: size * 0.5, fill: 'url(#pg-floor)' }, g);
    const base = C.s('g', { transform: iso(size * 0.1) }, g);
    C.s('rect', { x: -h, y: -h, width: size, height: size, rx: size * 0.06, fill: '#070d13' }, base);
    const top = C.s('g', { transform: iso(0) }, g);
    const n = 8, pw = size * 0.035, pl = size * 0.07;
    for (let i = 0; i < n; i++) {
      const q = -h + size * 0.16 + (i * size * 0.68) / (n - 1);
      C.s('rect', { x: q - pw / 2, y: -h - pl, width: pw, height: pl, fill: '#c9a24a' }, top);
      C.s('rect', { x: q - pw / 2, y: h, width: pw, height: pl, fill: '#c9a24a' }, top);
      C.s('rect', { x: -h - pl, y: q - pw / 2, width: pl, height: pw, fill: '#c9a24a' }, top);
      C.s('rect', { x: h, y: q - pw / 2, width: pl, height: pw, fill: '#c9a24a' }, top);
    }
    const body = C.s('rect', { x: -h, y: -h, width: size, height: size, rx: size * 0.06, fill: 'url(#pg-chip)', stroke: color, 'stroke-width': 3, 'stroke-opacity': 0.8 }, top);
    for (let i = 0; i < 6; i++) {
      const o = -h + size * 0.12 + i * size * 0.15;
      C.s('path', { d: `M${o},${-h + size * 0.06} L${o},${-h * 0.75} M${-h + size * 0.06},${o} L${-h * 0.75},${o}`, stroke: color, 'stroke-opacity': 0.35, 'stroke-width': 2 }, top);
    }
    C.s('rect', { x: -h * 0.6, y: -h * 0.6, width: size * 0.6, height: size * 0.6, rx: size * 0.05, fill: 'url(#pg-die)', stroke: 'rgba(255,255,255,.3)', 'stroke-width': 1.5 }, top);
    if (label) {
      const tx = C.s('text', { x: 0, y: size * 0.055, 'text-anchor': 'middle', 'font-size': size * (label.length > 3 ? 0.15 : 0.2), 'font-weight': 900, fill: labelColor, 'font-family': 'Inter, sans-serif' }, top);
      tx.textContent = label;
    }
    return { g, body };
  };

  // Dot globe with rough continents; returns rotate(deg) to spin it.
  P.globe = (svg, cx, cy, R) => {
    C.s('circle', { cx, cy, r: R * 1.18, fill: 'url(#pg-floor)', opacity: 0.6 }, svg);
    C.s('circle', { cx, cy, r: R, fill: 'url(#pg-sphere)', stroke: CY, 'stroke-opacity': 0.35, 'stroke-width': 2 }, svg);
    const land = [[-100, 45, 32, 20], [-75, 15, 10, 9], [-60, -15, 15, 25], [15, 50, 18, 11], [20, 5, 20, 28], [90, 48, 50, 20], [105, 20, 18, 13], [135, -25, 17, 11], [-40, 72, 14, 8], [45, 25, 12, 10]];
    const pts = [];
    for (let lat = -78; lat <= 78; lat += 4.5) {
      const step = 4.5 / Math.max(0.3, Math.cos((lat * Math.PI) / 180));
      for (let lon = -180; lon < 180; lon += step) {
        const isLand = land.some(([lo, la, rl, rb]) => ((lon - lo) / rl) ** 2 + ((lat - la) / rb) ** 2 < 1);
        pts.push({ lat, lon, el: C.s('circle', { r: isLand ? R * 0.012 : R * 0.006, fill: isLand ? '#8be6ff' : '#2f7fa3' }, svg) });
      }
    }
    return (rot) => pts.forEach((q) => {
      const la = (q.lat * Math.PI) / 180, lo = ((q.lon + rot) * Math.PI) / 180;
      const z = Math.cos(la) * Math.cos(lo);
      if (z < 0.02) { q.el.style.display = 'none'; return; }
      q.el.style.display = '';
      q.el.setAttribute('cx', cx + Math.cos(la) * Math.sin(lo) * R);
      q.el.setAttribute('cy', cy - Math.sin(la) * R);
      q.el.style.opacity = 0.2 + 0.8 * z;
    });
  };

  // -------------------------------------------------------------- proHook ---
  // 2x2 tiles of companies, red crosshair with a "?" - then every speech
  // bubble flips to the same word and the word lands as a banner.
  S.proHook = (st, p, ctx) => {
    const src = (p.sources || ['GOOGL', 'META', 'MSFT', 'AMZN']).map(C.brand);
    const pos = [[300, 230], [780, 230], [300, 600], [780, 600]];
    const revealAt = p.revealAt ?? 2.0;
    const red = C.h('div', { style: { position: 'absolute', left: '-200px', right: '-200px', top: '-150px', bottom: '-150px', background: 'radial-gradient(ellipse 50% 45% at 50% 50%, rgba(255,40,60,.32), rgba(255,40,60,0) 70%)' } }, st);
    const svg = C.svg(st);
    const cross = [
      C.s('line', { x1: 540, y1: 40, x2: 540, y2: 800, stroke: RD, 'stroke-width': 5 }, svg),
      C.s('line', { x1: 80, y1: 415, x2: 1000, y2: 415, stroke: RD, 'stroke-width': 5 }, svg),
    ];
    const tiles = src.map((b, i) => {
      const d = C.place(P.tile(st, 400, 330, { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '22px' }), pos[i][0], pos[i][1]);
      C.chip(b, 150, d);
      P.label(d, b.name, 28);
      const bub = C.h('div', { class: 'ctr', style: { position: 'absolute', top: '-34px', right: '-14px', minWidth: '120px', height: '66px', padding: '0 18px', borderRadius: '20px', background: '#fff', color: '#111', fontWeight: 900, fontSize: '30px', boxShadow: '0 10px 26px rgba(0,0,0,.45)' } }, d, '???');
      return { d, bub, at: 0.1 + i * 0.12, i };
    });
    const q = C.place(C.h('div', { class: 'ctr', style: { width: '150px', height: '150px', borderRadius: '50%', background: 'radial-gradient(circle at 40% 35%, #ff6b78, #c4101f)', color: '#fff', fontSize: '96px', fontWeight: 900, boxShadow: '0 0 50px rgba(255,40,60,.8), inset 0 4px 0 rgba(255,255,255,.3)' } }, st, '?'), 540, 415);
    const banner = C.place(C.h('div', { class: 'ptile ctr', style: { width: '940px', height: '200px', borderColor: CY, boxShadow: `0 0 60px rgba(63,208,255,.45), 0 30px 60px rgba(0,0,0,.6)` } }, st), 540, 415);
    const word = C.h('div', { style: { fontSize: '120px', fontWeight: 900, letterSpacing: '-3px', color: '#fff', textShadow: `0 0 34px ${CY}` } }, banner, p.word || 'KI-AGENTEN');
    C.fit(word, 860);
    const stampUp = P.stamp(st, ctx, p.stamp && { y: 590, ...p.stamp });
    ctx.cue('whoosh', 0); ctx.cue('whoosh', revealAt - 0.15);
    return (t) => {
      const kr = C.k(t, revealAt, 0.45, 'expo');
      red.style.opacity = C.k(t, 0.4, 0.5) * (1 - kr);
      cross.forEach((l, i) => { l.style.opacity = C.k(t, 0.5 + i * 0.1, 0.3) * (1 - kr); });
      tiles.forEach((tl) => {
        P.show(tl.d, t, tl.at, { s: 1 - kr * 0.06, y: Math.sin(t * 1.6 + tl.i) * 4 });
        tl.d.style.opacity = C.k(t, tl.at, 0.25) * (1 - kr * 0.45);
        const kb = C.k(t, tl.at + 0.5, 0.4, 'back');
        const kf = C.k(t, revealAt + tl.i * 0.06, 0.3, 'inOut');
        tl.bub.textContent = kf < 0.5 ? '???' : p.bubble || 'AGENTEN';
        tl.bub.style.background = kf < 0.5 ? '#fff' : CY;
        tl.bub.style.fontSize = kf < 0.5 ? '30px' : '22px';
        tl.bub.style.transform = `scale(${Math.max(0, kb) * Math.max(0.02, Math.abs(1 - kf * 2))}, ${Math.max(0, kb)}) translateY(${Math.sin(t * 2.4 + tl.i) * 4}px)`;
      });
      const kq = C.k(t, 0.7, 0.4, 'back');
      q.style.transform = `translate(-50%,-50%) scale(${Math.max(0, kq) * (1 - kr) * (1 + Math.sin(t * 6) * 0.04)})`;
      P.show(banner, t, revealAt + 0.05, { s0: 0.6, dy: 0, blur: 16, y: Math.sin(t * 1.4) * 4 });
      stampUp(t);
    };
  };

  // ------------------------------------------------------------- proChart ---
  // Glass chart card: header, glowing line drawing in, price tag riding the
  // head, then a big result badge. color "red" turns it into a crash card.
  S.proChart = (st, p, ctx) => {
    const col = C.color(p.color || 'green');
    const card = C.place(P.tile(st, 940, 720, { borderColor: col + '66', boxShadow: `0 30px 60px rgba(0,0,0,.55), 0 0 50px ${col}22, inset 0 1px 0 rgba(255,255,255,.12)` }), 540, 410);
    const head = C.h('div', { class: 'ctr', style: { position: 'absolute', left: '34px', top: '28px', gap: '16px' } }, card);
    if (p.ticker) C.chip(p.ticker, 58, head);
    C.h('div', { style: { fontSize: '34px', fontWeight: 900 } }, head, p.name || C.brand(p.ticker).name);
    if (p.market) C.h('div', { class: 'plabel', style: { position: 'absolute', right: '34px', top: '46px', fontSize: '22px', color: '#9fb4c6' } }, card, `<span style="color:${GR}">●</span> ${p.market}`);
    const data = Array.isArray(p.data) ? p.data : C.walk(p.data || { from: 100, to: 400, points: 60, vol: 0.04, seed: 3 });
    let lo = Math.min(...data), hi = Math.max(...data);
    if (p.threshold) { hi = Math.max(hi, p.threshold.value * 1.08); lo = Math.min(lo, p.threshold.min ?? lo); }
    const pad = (hi - lo) * 0.12; lo -= pad; hi += pad * 2.2;
    const W = 940, H = 720, X0 = 120, X1 = W - 60, Y0 = 130, Y1 = H - 90;
    const xAt = (i) => X0 + ((X1 - X0) * i) / (data.length - 1), yAt = (v) => Y1 - ((v - lo) / (hi - lo)) * (Y1 - Y0);
    const svg = C.svg(card, W, H);
    const gid = 'pc' + Math.round(C.rand(data.length + data[0]) * 1e6);
    const lg = C.s('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 }, C.s('defs', {}, svg));
    C.s('stop', { offset: 0, 'stop-color': col, 'stop-opacity': 0.35 }, lg);
    C.s('stop', { offset: 1, 'stop-color': col, 'stop-opacity': 0 }, lg);
    const unit = p.unit ?? '$';
    C.niceTicks(lo, hi, 4).filter((v) => v >= lo && v <= hi).forEach((v) => {
      C.s('line', { x1: X0, x2: X1, y1: yAt(v), y2: yAt(v), stroke: 'rgba(255,255,255,.07)', 'stroke-width': 2 }, svg);
      if (p.yTicks !== false) C.s('text', { x: X0 - 14, y: yAt(v) + 8, 'text-anchor': 'end', 'font-size': 22, 'font-weight': 600, fill: '#6f8598', 'font-family': 'Inter' }, svg).textContent = unit + Math.round(v).toLocaleString('de-DE');
    });
    (p.xLabels || []).forEach((l, i, a) => (C.s('text', { x: X0 + ((X1 - X0) * (i + 0.5)) / a.length, y: H - 40, 'text-anchor': 'middle', 'font-size': 22, fill: '#6f8598', 'font-weight': 600, 'font-family': 'Inter' }, svg).textContent = l));
    // Optional threshold line ("PANIK > 35").
    let thr, thrLab;
    if (p.threshold) {
      const ty = yAt(p.threshold.value), tc = C.color(p.threshold.color || 'red');
      thr = C.s('line', { x1: X0, x2: X1, y1: ty, y2: ty, stroke: tc, 'stroke-width': 4, 'stroke-dasharray': '14 10' }, svg);
      thrLab = C.place(C.h('div', { class: 'badge', style: { background: tc, fontSize: '24px', padding: '6px 14px', borderRadius: '10px' } }, card, p.threshold.label || ''), X0 + 150, ty - 34);
    }
    const area = C.s('path', { fill: `url(#${gid})` }, svg);
    const line = C.s('path', { fill: 'none', stroke: col, 'stroke-width': 6, 'stroke-linejoin': 'round', filter: 'url(#glow-sm)' }, svg);
    const ring = C.s('circle', { r: 10, fill: 'none', stroke: col, 'stroke-width': 3 }, svg);
    const dot = C.s('circle', { r: 9, fill: '#fff', stroke: col, 'stroke-width': 4 }, svg);
    const tag = C.place(C.h('div', { style: { padding: '8px 16px', borderRadius: '12px', background: '#0b141d', border: `2px solid ${col}`, fontWeight: 900, fontSize: '28px', color: '#fff' } }, card), 0, 0);
    const badge = C.place(C.h('div', { style: { textAlign: 'center' } }, card), p.badgeX ?? X1 - 190, p.badgeY ?? Y1 - 120);
    C.h('div', { style: { fontSize: '112px', fontWeight: 900, color: col, lineHeight: 1, letterSpacing: '-3px', whiteSpace: 'nowrap', textShadow: `0 0 30px ${col}aa` } }, badge, p.badge || '');
    if (p.badgeSub) C.h('div', { class: 'plabel', style: { fontSize: '24px', marginTop: '8px' } }, badge, p.badgeSub);
    const drawAt = p.drawAt ?? 0.35, drawDur = p.drawDur ?? 1.6, badgeAt = p.badgeAt ?? drawAt + drawDur + 0.1;
    const fmt = p.fmt || ((v) => unit + Math.round(v).toLocaleString('de-DE'));
    ctx.cue('whoosh', 0);
    if (p.cashAt != null) ctx.cue('cash', p.cashAt);
    const stampUp = P.stamp(st, ctx, p.stamp && { y: 850, ...p.stamp });
    return (t) => {
      P.show(card, t, 0, { s0: 0.94 });
      if (p.tint) ctx.tint(C.k(t, badgeAt, 0.4) * 0.8, 'red');
      const f = C.k(t, drawAt, drawDur, 'inOut') * (data.length - 1);
      const n = Math.floor(f), r = f - n;
      const pts = [];
      for (let i = 0; i <= n; i++) pts.push([xAt(i), yAt(data[i])]);
      if (n < data.length - 1) pts.push([xAt(n + r), yAt(C.lerp(data[n], data[n + 1], r))]);
      const d = pts.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ',' + q[1].toFixed(1)).join('');
      line.setAttribute('d', d);
      area.setAttribute('d', d + `L${pts[pts.length - 1][0]},${Y1}L${X0},${Y1}Z`);
      const [hx, hy] = pts[pts.length - 1];
      [dot, ring].forEach((c) => { c.setAttribute('cx', hx); c.setAttribute('cy', hy); });
      const ph = (t * 1.2) % 1;
      ring.setAttribute('r', 10 + ph * 26); ring.style.opacity = (1 - ph) * C.k(t, drawAt, 0.2);
      dot.style.opacity = C.k(t, drawAt, 0.2);
      tag.textContent = fmt(C.lerp(data[Math.min(n, data.length - 1)], data[Math.min(n + 1, data.length - 1)], r));
      tag.style.left = hx + 'px'; tag.style.top = hy - 56 + Math.sin(t * 2) * 3 + 'px';
      tag.style.opacity = p.tag === false ? 0 : C.k(t, drawAt + 0.1, 0.3);
      if (thr) { const kt = C.k(t, p.threshold.at ?? badgeAt + 0.5, 0.5, 'inOut'); thr.setAttribute('x2', C.lerp(X0, X1, kt)); thr.style.opacity = kt > 0 ? 1 : 0; thrLab.style.transform = `translate(-50%,-50%) scale(${Math.max(0, C.k(t, (p.threshold.at ?? badgeAt + 0.5) + 0.3, 0.35, 'back'))})`; }
      P.show(badge, t, badgeAt, { s0: 0.5, dy: 0, blur: 14, s: 1 + Math.sin(t * 2.4) * 0.015 });
      stampUp(t);
    };
  };

  // ------------------------------------------------------------- proAgent ---
  // Robot under a spotlight on a glowing platform; task cards pop in and get
  // ticked off one by one.
  S.proAgent = (st, p, ctx) => {
    const svg = C.svg(st);
    C.s('polygon', { points: '470,-120 610,-120 760,470 320,470', fill: 'url(#pg-beam)', opacity: 0.55 }, svg);
    const floor = C.s('g', {}, svg);
    C.s('ellipse', { cx: 540, cy: 470, rx: 230, ry: 56, fill: 'url(#pg-floor)' }, floor);
    [150, 190, 230].forEach((rx, i) => C.s('ellipse', { cx: 540, cy: 470, rx, ry: rx * 0.24, fill: 'none', stroke: CY, 'stroke-opacity': 0.5 - i * 0.12, 'stroke-width': 3, 'stroke-dasharray': i === 1 ? '14 10' : '' }, floor));
    const bot = C.s('g', {}, svg);
    const b = (tag, a) => C.s(tag, a, bot);
    b('line', { x1: 540, y1: 40, x2: 540, y2: 70, stroke: '#9fd8f0', 'stroke-width': 5 });
    b('circle', { cx: 540, cy: 34, r: 10, fill: CY, filter: 'url(#glow-sm)' });
    b('rect', { x: 478, y: 70, width: 124, height: 100, rx: 34, fill: 'url(#pg-robot)', stroke: '#6fc9ee', 'stroke-opacity': 0.6, 'stroke-width': 2 });
    const visor = b('rect', { x: 494, y: 100, width: 92, height: 34, rx: 17, fill: CY, filter: 'url(#glow-sm)' });
    b('rect', { x: 524, y: 170, width: 32, height: 18, rx: 6, fill: '#20384f' });
    b('path', { d: 'M462,192 Q540,178 618,192 L604,330 Q540,346 476,330 Z', fill: 'url(#pg-robot)', stroke: '#6fc9ee', 'stroke-opacity': 0.55, 'stroke-width': 2 });
    const core = b('circle', { cx: 540, cy: 252, r: 18, fill: CY, filter: 'url(#glow-sm)' });
    const armL = C.s('g', {}, bot), armR = C.s('g', {}, bot);
    [[armL, 448, -1], [armR, 632, 1]].forEach(([g, x, sd]) => {
      C.s('circle', { cx: x, cy: 204, r: 15, fill: CY, opacity: 0.85 }, g);
      C.s('rect', { x: x - 13, y: 214, width: 26, height: 110, rx: 13, fill: 'url(#pg-robot)', stroke: '#6fc9ee', 'stroke-opacity': 0.5, 'stroke-width': 2 }, g);
      C.s('circle', { cx: x, cy: 332, r: 14, fill: '#1c3550', stroke: CY, 'stroke-width': 2 }, g);
      g.dataset.x = x; g.dataset.sd = sd;
    });
    [506, 574].forEach((x) => {
      b('rect', { x: x - 17, y: 336, width: 34, height: 104, rx: 15, fill: 'url(#pg-robot)', stroke: '#6fc9ee', 'stroke-opacity': 0.5, 'stroke-width': 2 });
      b('rect', { x: x - 26, y: 432, width: 52, height: 22, rx: 10, fill: '#183049' });
    });
    const tasks = (p.tasks || []).map((tk, i, a) => {
      const x = 540 + (i - (a.length - 1) / 2) * 320;
      const d = C.place(P.tile(st, 290, 300, { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }), x, 690);
      C.h('div', { style: { fontSize: '86px', lineHeight: 1 } }, d, tk.icon || '✈️');
      P.label(d, tk.text || '', 30, '#fff');
      const ok = C.h('div', { class: 'badge', style: { background: GR, color: '#062611', fontSize: '22px', padding: '6px 16px', borderRadius: '12px' } }, d, '✓ ' + (tk.done || 'ERLEDIGT'));
      const beam = C.s('line', { x1: 540, y1: 300, x2: x, y2: 540, stroke: CY, 'stroke-width': 3, 'stroke-dasharray': '6 10', opacity: 0 }, svg);
      const at = tk.at ?? 1 + i * 0.6;
      if (tk.cash) ctx.cue('cash', at + 0.5);
      return { d, ok, beam, at };
    });
    ctx.cue('whoosh', 0); if (tasks.length) ctx.cue('whoosh', tasks[0].at);
    return (t) => {
      svg.style.opacity = C.k(t, 0, 0.4);
      const bob = Math.sin(t * 2.2) * 7;
      bot.setAttribute('transform', `translate(0 ${bob + (1 - C.k(t, 0.05, 0.6, 'expo')) * -120})`);
      visor.setAttribute('width', 92); visor.style.opacity = 0.75 + 0.25 * Math.sin(t * 5);
      core.setAttribute('r', 16 + Math.sin(t * 4) * 3);
      armL.setAttribute('transform', `rotate(${8 + Math.sin(t * 1.8) * 6} 448 204)`);
      armR.setAttribute('transform', `rotate(${-8 - Math.sin(t * 1.8 + 1) * 6} 632 204)`);
      tasks.forEach((tk, i) => {
        P.show(tk.d, t, tk.at, { y: Math.sin(t * 1.7 + i) * 5 });
        tk.ok.style.transform = `scale(${Math.max(0, C.k(t, tk.at + 0.45, 0.35, 'back'))})`;
        const kb = C.k(t, tk.at, 0.3);
        tk.beam.style.opacity = kb * (0.5 + 0.3 * Math.sin(t * 4 + i));
        tk.beam.style.strokeDashoffset = -t * 40;
      });
    };
  };

  // ------------------------------------------------------------- proStats ---
  // Stacked stat cards: logo, big count-up figure, label, sparkline, delta.
  S.proStats = (st, p, ctx) => {
    const items = p.items || [];
    const cards = items.map((it, i) => {
      const y = 200 + i * 420 - (items.length === 1 ? -210 : 0);
      const d = C.place(P.tile(st, 960, 360), 540, y);
      const head = C.h('div', { class: 'ctr', style: { position: 'absolute', left: '36px', top: '30px', gap: '16px' } }, d);
      C.chip(it.ticker, 64, head);
      C.h('div', { style: { fontSize: '32px', fontWeight: 900 } }, head, it.name || C.brand(it.ticker).name);
      const num = C.h('div', { style: { position: 'absolute', left: '36px', top: '118px', fontSize: '136px', fontWeight: 900, letterSpacing: '-4px', lineHeight: 1, color: '#fff' } }, d);
      const unit = it.unit ? `<span style="color:${CY};font-size:70px;letter-spacing:0;margin-left:14px">${it.unit}</span>` : '';
      const lab = P.label(d, it.label || '', 24, '#9fb4c6');
      Object.assign(lab.style, { position: 'absolute', left: '40px', bottom: '30px' });
      const sv = C.svg(d, 360, 180); Object.assign(sv.style, { left: 'auto', right: '40px', top: '80px' });
      const sp = it.spark || [2, 3, 3, 5, 6, 8, 11, 15, 21, 28];
      const mx = Math.max(...sp);
      const pts = sp.map((v, j) => [10 + (340 * j) / (sp.length - 1), 170 - (v / mx) * 150]);
      const path = C.s('path', { d: pts.map((q, j) => (j ? 'L' : 'M') + q.join(',')).join(''), fill: 'none', stroke: CY, 'stroke-width': 6, 'stroke-linecap': 'round', filter: 'url(#glow-sm)', pathLength: 100 }, sv);
      const end = C.s('circle', { cx: pts[pts.length - 1][0], cy: pts[pts.length - 1][1], r: 9, fill: '#fff', stroke: CY, 'stroke-width': 4 }, sv);
      const delta = it.delta ? C.h('div', { class: 'badge', style: { position: 'absolute', right: '40px', bottom: '28px', background: 'rgba(46,232,106,.16)', color: GR, border: `2px solid ${GR}`, fontSize: '24px', padding: '6px 16px', borderRadius: '12px' } }, d, '↑ ' + it.delta) : null;
      const at = it.at ?? 0.2 + i * 1.2;
      return { d, num, unit, it, path, end, delta, at, i };
    });
    ctx.cue('whoosh', 0);
    cards.slice(1).forEach((c) => ctx.cue('whoosh', c.at));
    return (t) => cards.forEach((c) => {
      P.show(c.d, t, c.at, { y: Math.sin(t * 1.5 + c.i) * 4 });
      c.num.innerHTML = C.count(c.it.value, C.k(t, c.at + 0.15, 1.0, 'out')) + c.unit;
      const kp = C.k(t, c.at + 0.25, 1.0, 'inOut');
      c.path.setAttribute('stroke-dasharray', `${kp * 100} 100`);
      c.end.style.opacity = C.k(t, c.at + 1.1, 0.2);
      c.end.setAttribute('r', 9 + Math.sin(t * 4) * 2);
      if (c.delta) c.delta.style.transform = `scale(${Math.max(0, C.k(t, c.at + 1.1, 0.35, 'back'))})`;
    });
  };

  // ------------------------------------------------------------- proPhone ---
  // Phone with an earnings-call transcript: the search query types itself,
  // the key sentence gets highlighted, the speaker chip sits in front.
  S.proPhone = (st, p, ctx) => {
    const wrap = C.place(C.h('div', { style: { width: '520px', height: '840px', perspective: '1400px' } }, st), 600, 420);
    const phone = C.h('div', { style: { position: 'absolute', inset: 0, borderRadius: '70px', background: '#0b0e13', border: '12px solid #232a33', boxShadow: '0 40px 80px rgba(0,0,0,.6), 0 0 0 2px #3a4450, inset 0 0 0 2px #000', overflow: 'hidden', padding: '34px 30px', transformStyle: 'preserve-3d' } }, wrap);
    C.h('div', { style: { position: 'absolute', left: '50%', top: '14px', width: '130px', height: '34px', marginLeft: '-65px', borderRadius: '20px', background: '#000' } }, phone);
    C.h('div', { class: 'ctr', style: { justifyContent: 'space-between', fontSize: '22px', fontWeight: 700, color: '#fff', padding: '0 18px' } }, phone, `<span>${p.time || '15:31'}</span><span>▮▮▮ ◔</span>`);
    C.h('div', { style: { textAlign: 'center', fontSize: '18px', letterSpacing: '3px', color: '#7f93a6', fontWeight: 800, margin: '22px 0 16px' } }, phone, p.app || 'EARNINGS CALL');
    C.h('div', { style: { fontSize: '36px', fontWeight: 900, color: '#fff', lineHeight: 1.1 } }, phone, p.docTitle || 'Transkript');
    const search = C.h('div', { style: { marginTop: '18px', height: '52px', borderRadius: '14px', background: '#1a2029', display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px', fontSize: '21px', color: '#c9d3dd' } }, phone);
    C.h('span', {}, search, '🔍');
    const q = C.h('span', { style: { whiteSpace: 'nowrap', overflow: 'hidden' } }, search);
    const caret = C.h('span', { style: { width: '2px', height: '26px', background: CY } }, search);
    C.h('div', { style: { margin: '12px 0 10px', fontSize: '18px', color: '#7f93a6' } }, phone, '1 / 1 Treffer');
    const body = C.h('div', { style: { fontSize: '23px', lineHeight: 1.5, color: '#b9c4cf' } }, phone);
    (p.paragraphs || []).forEach((tx) => {
      const el = C.h('p', { style: { margin: '0 0 18px' } }, body);
      el.innerHTML = tx.replace(/\*([^*]+)\*/g, '<span class="phl">$1</span>');
    });
    const hls = [...body.querySelectorAll('.phl')];
    hls.forEach((h) => Object.assign(h.style, { backgroundImage: 'linear-gradient(#f5b84a,#f5b84a)', backgroundRepeat: 'no-repeat', backgroundSize: '0% 100%', boxDecorationBreak: 'clone', webkitBoxDecorationBreak: 'clone', padding: '0 3px', borderRadius: '4px' }));
    const who = C.place(C.h('div', { class: 'ptile ctr', style: { gap: '16px', padding: '18px 26px', justifyContent: 'flex-start' } }, st), 300, 760);
    if (p.ticker) C.chip(p.ticker, 62, who);
    const wt = C.h('div', {}, who);
    C.h('div', { style: { fontSize: '30px', fontWeight: 900 } }, wt, p.speaker || '');
    C.h('div', { class: 'plabel', style: { fontSize: '18px', color: '#9fb4c6' } }, wt, p.role || '');
    const typeAt = p.typeAt ?? 0.5, hlAt = p.highlightAt || hls.map((_, i) => 1.6 + i * 0.9);
    ctx.cue('whoosh', 0);
    return (t) => {
      P.show(wrap, t, 0, { s0: 0.85, dy: 80 });
      phone.style.transform = `rotateY(${-14 + Math.sin(t * 0.8) * 3}deg) rotateX(${5 + Math.sin(t * 0.6) * 1.5}deg)`;
      const nq = Math.round(C.k(t, typeAt, 0.9, 'linear') * (p.query || '').length);
      q.textContent = (p.query || '').slice(0, nq);
      caret.style.opacity = Math.floor(t * 3) % 2 ? 1 : 0.2;
      hls.forEach((h, i) => {
        const k = C.k(t, hlAt[i] ?? 2, 0.5, 'inOut');
        h.style.backgroundSize = `${k * 100}% 100%`;
        h.style.color = k > 0.4 ? '#111' : '';
      });
      body.style.transform = `translateY(${-C.k(t, 0.8, 3, 'inOut') * (p.scroll ?? 30)}px)`;
      P.show(who, t, 0.4, { dy: 30, y: Math.sin(t * 1.6) * 4 });
    };
  };

  // ------------------------------------------------------------ proLayers ---
  // Numbered "?" medallions that flip to their answer; optional end question.
  S.proLayers = (st, p, ctx) => {
    const items = p.items || [];
    const n = items.length, gap = 330, y = p.question ? 300 : 380;
    const svg = C.svg(st);
    const rail = C.s('line', { x1: 540 - gap * (n - 1) / 2, x2: 540 + gap * (n - 1) / 2, y1: y + 230, y2: y + 230, stroke: CY, 'stroke-width': 3, 'stroke-opacity': 0.5 }, svg);
    const pulse = C.s('circle', { r: 8, fill: CY, filter: 'url(#glow-sm)', cy: y + 230 }, svg);
    const tiles = items.map((it, i) => {
      const x = 540 + (i - (n - 1) / 2) * gap;
      const focus = p.focus === i;
      const outer = C.place(C.h('div', { style: { width: '290px', height: '330px' } }, st), x, y);
      const tile = P.tile(outer, 290, 330, { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', transition: 'none' });
      const front = C.h('div', { class: 'ctr', style: { width: '150px', height: '150px', borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #e9f4fb, #8ea6b8 45%, #3f5466 80%)', color: '#123', fontSize: '92px', fontWeight: 900, boxShadow: '0 10px 30px rgba(0,0,0,.5), 0 0 30px rgba(63,208,255,.35)' } }, tile, '?');
      const back = C.h('div', { class: 'ctr', style: { display: 'none', flexDirection: 'column', gap: '12px', textAlign: 'center' } }, tile);
      C.h('div', { style: { fontSize: '96px', lineHeight: 1 } }, back, it.icon || '');
      C.h('div', { style: { fontSize: '32px', fontWeight: 900, color: C.color(it.color || 'cyan'), lineHeight: 1.1 } }, back, it.text || '');
      const lab = C.place(P.label(st, it.label || `EBENE ${i + 1}`, 24, '#9fb4c6'), x, y + 200);
      const node = C.s('circle', { cx: x, cy: y + 230, r: 10, fill: '#0b141d', stroke: CY, 'stroke-width': 3 }, svg);
      const br = focus ? P.brackets(st, x, y, 340, 380) : null;
      return { outer, tile, front, back, lab, node, br, it, i, x, at: 0.1 + i * 0.12, focus };
    });
    let qEl;
    if (p.question) {
      qEl = C.place(C.h('div', { style: { textAlign: 'center' } }, st), 540, 690);
      C.h('div', { style: { fontSize: '76px', fontWeight: 900, letterSpacing: '-1px' } }, qEl, p.question);
      C.h('div', { class: 'ctr', style: { gap: '12px', marginTop: '18px', fontSize: '32px', fontWeight: 800, color: CY } }, qEl, '💬 ' + (p.cta || 'Schreib’s in die Kommentare'));
      if (p.note) C.h('div', { class: 'plabel', style: { fontSize: '20px', color: '#7f93a6', marginTop: '18px' } }, qEl, p.note);
    }
    ctx.cue('whoosh', 0);
    const firstFlip = items.find((it) => it.at != null);
    if (firstFlip) ctx.cue('whoosh', firstFlip.at);
    return (t) => {
      rail.style.opacity = C.k(t, 0.3, 0.4) * 0.6;
      const span = gap * (n - 1);
      pulse.setAttribute('cx', 540 - span / 2 + ((t * 0.5) % 1) * span);
      pulse.style.opacity = C.k(t, 0.4, 0.3);
      tiles.forEach((tl) => {
        P.show(tl.outer, t, tl.at, { s: tl.focus ? 1.08 : 1, y: Math.sin(t * 1.6 + tl.i) * 5 });
        tl.lab.style.opacity = C.k(t, tl.at + 0.2, 0.3);
        tl.node.style.opacity = C.k(t, tl.at + 0.2, 0.3);
        if (tl.br) P.show(tl.br, t, tl.at + 0.3, { s0: 1.2, dy: 0, s: 1 + Math.sin(t * 3) * 0.015 });
        const flipAt = p.revealed ? -1 : tl.it.at;
        if (flipAt != null) {
          const kf = C.k(t, flipAt, 0.5, 'inOut');
          tl.front.style.display = kf < 0.5 ? '' : 'none';
          tl.back.style.display = kf < 0.5 ? 'none' : 'flex';
          tl.tile.style.transform = `scaleX(${Math.max(0.02, Math.abs(1 - kf * 2))})`;
          if (kf >= 0.5) tl.tile.style.borderColor = C.color(tl.it.color || 'cyan');
        } else tl.front.style.transform = `rotate(${Math.sin(t * 2 + tl.i) * 6}deg)`;
      });
      if (qEl) P.show(qEl, t, p.questionAt ?? 0.8);
    };
  };

  // -------------------------------------------------------------- proGlobe ---
  // Rotating dot globe fed by iso chips below it ("every server runs on...").
  S.proGlobe = (st, p, ctx) => {
    const svg = C.svg(st);
    const spin = P.globe(svg, 540, 280, 250);
    const chips = (p.chips || [{ label: 'intel', name: 'INTEL' }, { label: 'AMD', name: 'AMD' }]).map((c, i, a) => {
      const x = 540 + (i - (a.length - 1) / 2) * 470;
      const g = C.s('g', {}, svg);
      const ch = P.chip(g, x, 640, 190, { label: c.label, color: CY });
      const beam = C.s('path', { d: `M${x},610 C${x},520 ${540 + (x - 540) * 0.35},560 ${540 + (x - 540) * 0.35},480`, stroke: CY, 'stroke-width': 4, fill: 'none', 'stroke-dasharray': '4 14', 'stroke-linecap': 'round', filter: 'url(#glow-sm)' }, svg);
      const name = C.place(P.label(st, c.name, 30, '#fff'), x, 810);
      return { g, beam, name, at: 0.6 + i * 0.25, i, x };
    });
    const tag = p.caption ? C.place(C.h('div', { class: 'ptile', style: { padding: '12px 26px', fontSize: '28px', fontWeight: 900, letterSpacing: '1px' } }, st, p.caption), 540, 560) : null;
    ctx.cue('whoosh', 0); ctx.cue('whoosh', 0.6);
    return (t) => {
      spin(t * 22 + 20);
      svg.style.opacity = C.k(t, 0, 0.5);
      chips.forEach((c) => {
        const k = C.k(t, c.at, 0.55, 'expo');
        c.g.setAttribute('transform', `translate(0 ${(1 - k) * 80 + Math.sin(t * 1.8 + c.i) * 5})`);
        c.g.style.opacity = C.k(t, c.at, 0.25);
        c.beam.style.opacity = C.k(t, c.at + 0.4, 0.3);
        c.beam.style.strokeDashoffset = t * 60;
        c.name.style.opacity = C.k(t, c.at + 0.2, 0.3);
      });
      if (tag) P.show(tag, t, p.captionAt ?? 1.4, { y: Math.sin(t * 2) * 3 });
    };
  };

  // ---------------------------------------------------------- proBlueprint ---
  // Companies' own chips, all licensed from one blueprint holder: LIZENZ tags
  // pop on each chip and coins roll down into the licensor's pile.
  S.proBlueprint = (st, p, ctx) => {
    const src = (p.sources || ['AMZN', 'GOOGL', 'MSFT']).map(C.brand);
    const svg = C.svg(st);
    const hubX = 540, hubY = 600;
    const lines = [], chips = [];
    src.forEach((b, i) => {
      const x = 540 + (i - 1) * 320;
      lines.push(C.s('path', { d: `M${x},330 C${x},470 ${hubX + (x - hubX) * 0.3},${hubY - 160} ${hubX + (x - hubX) * 0.25},${hubY - 70}`, stroke: GD, 'stroke-width': 4, fill: 'none', 'stroke-opacity': 0.75 }, svg));
      const g = C.s('g', {}, svg);
      P.chip(g, x, 270, 150, { label: b.glyph, color: CY });
      const logo = C.place(C.chip(b, 92, st), x, 70);
      const lic = C.place(C.h('div', { class: 'badge', style: { background: 'linear-gradient(180deg,#ffe58a,#d39b1d)', color: '#3a2700', fontSize: '22px', padding: '6px 14px', borderRadius: '10px' } }, st, p.licenseText || 'LIZENZ'), x, 380);
      chips.push({ g, logo, lic, x, i, at: 0.1 + i * 0.15 });
    });
    const hub = C.place(C.h('div', { class: 'ctr', style: { width: '190px', height: '190px', borderRadius: '50%', background: 'radial-gradient(circle at 40% 35%, #1d6fa0, #0a2a40)', border: `5px solid ${CY}`, boxShadow: `0 0 50px ${CY}88, inset 0 0 30px rgba(0,0,0,.5)`, color: '#fff', fontSize: '64px', fontWeight: 900, letterSpacing: '-2px' } }, st, p.hubText || 'arm'), hubX, hubY);
    const pileG = C.s('g', {}, svg);
    const coins = [];
    for (let i = 0; i < 26; i++) coins.push({ i, el: C.s('ellipse', { rx: 22, ry: 9, fill: 'url(#pg-gold)', stroke: '#8a5d05', 'stroke-width': 2 }, svg) });
    const pile = [];
    for (let i = 0; i < 22; i++) pile.push(C.s('ellipse', { cx: hubX - 120 + (i % 11) * 24 + (Math.floor(i / 11) * 12), cy: 800 - Math.floor(i / 11) * 12, rx: 22, ry: 9, fill: 'url(#pg-gold)', stroke: '#8a5d05', 'stroke-width': 2, opacity: 0 }, pileG));
    const cap = C.place(P.label(st, p.caption || 'LIZENZGEBÜHREN → ARM', 26, GD), hubX, 850);
    const licAt = p.licenseAt ?? 1.3, coinsAt = p.coinsAt ?? 2.0;
    ctx.cue('whoosh', 0); ctx.cue('whoosh', licAt); ctx.cue('cash', coinsAt + 0.5);
    const stampUp = P.stamp(st, ctx, p.stamp && { y: 470, ...p.stamp });
    const L = lines.map((l) => l.getTotalLength());
    lines.forEach((l, i) => (l.style.strokeDasharray = L[i]));
    return (t) => {
      chips.forEach((c) => {
        P.show(c.logo, t, c.at, { y: Math.sin(t * 1.7 + c.i) * 4 });
        const k = C.k(t, c.at + 0.15, 0.55, 'expo');
        c.g.setAttribute('transform', `translate(0 ${(1 - k) * 60 + Math.sin(t * 1.7 + c.i) * 4})`);
        c.g.style.opacity = C.k(t, c.at + 0.15, 0.25);
        c.lic.style.transform = `translate(-50%,-50%) scale(${Math.max(0, C.k(t, licAt + c.i * 0.15, 0.35, 'back'))}) rotate(-4deg)`;
      });
      lines.forEach((l, i) => (l.style.strokeDashoffset = L[i] * (1 - C.k(t, licAt + 0.2 + i * 0.1, 0.5, 'inOut'))));
      P.show(hub, t, 0.7, { s0: 0.4, dy: 0, s: 1 + Math.sin(t * 3) * 0.02 });
      coins.forEach((c) => {
        const li = c.i % lines.length, ph = ((t - coinsAt) * 0.9 + c.i / coins.length) % 1;
        if (t < coinsAt + (c.i / coins.length) * 1.1) { c.el.style.opacity = 0; return; }
        const pt = lines[li].getPointAtLength(ph * L[li]);
        c.el.setAttribute('cx', pt.x); c.el.setAttribute('cy', pt.y);
        c.el.style.opacity = ph > 0.92 ? 0 : 1;
      });
      const filled = Math.floor(C.k(t, coinsAt + 0.6, 2.0) * pile.length);
      pile.forEach((c, i) => (c.style.opacity = i < filled ? 1 : 0));
      cap.style.opacity = C.k(t, coinsAt + 0.4, 0.3);
      stampUp(t);
    };
  };

  // ------------------------------------------------------------- proGrowth ---
  // Two iso columns: last year vs now, the tall one counting up its multiple.
  S.proGrowth = (st, p, ctx) => {
    const svg = C.svg(st);
    C.s('ellipse', { cx: 540, cy: 720, rx: 420, ry: 120, fill: 'url(#pg-floor)', opacity: 0.7 }, svg);
    const cols = [{ x: 360, h: 34, label: p.beforeLabel || 'VORJAHR', col: '#4f6475' }, { x: 720, h: 430, label: p.afterLabel || 'HEUTE', col: CY }];
    const groups = cols.map(() => C.s('g', {}, svg));
    const labs = cols.map((c) => C.place(P.label(st, c.label, 28, '#cfe9f7'), c.x, 800));
    const big = C.place(C.h('div', { style: { fontSize: '170px', fontWeight: 900, letterSpacing: '-6px', color: '#fff', textShadow: `0 0 40px ${CY}` } }, st, ''), 720, 0);
    const head = p.ticker ? C.place(C.h('div', { class: 'ptile ctr', style: { gap: '14px', padding: '14px 24px' } }, st), 300, 120) : null;
    if (head) { C.chip(p.ticker, 58, head); C.h('div', { style: { fontSize: '26px', fontWeight: 900, lineHeight: 1.15 } }, head, p.caption || ''); }
    const growAt = p.growAt ?? 0.6, growDur = p.growDur ?? 1.4;
    ctx.cue('whoosh', 0); ctx.cue('whoosh', growAt);
    return (t) => {
      const k = C.k(t, growAt, growDur, 'expo');
      cols.forEach((c, i) => {
        while (groups[i].firstChild) groups[i].firstChild.remove();
        const h = i ? Math.max(8, c.h * k) : c.h * C.k(t, 0.3, 0.5, 'expo');
        const w = 92, base = 730;
        C.isoBox(groups[i], c.x, base - h - w / 2, w, h, i ? { top: '#9be9ff', left: '#1b8fbf', right: '#0d5f86', stroke: 'rgba(255,255,255,.35)', sw: 1.5 } : { top: '#7b8d9b', left: '#3e4f5c', right: '#2a3742' });
        if (i) groups[i].setAttribute('filter', 'url(#glow-sm)');
      });
      labs.forEach((l, i) => (l.style.opacity = C.k(t, 0.3 + i * 0.2, 0.3)));
      const topY = 730 - cols[1].h * k - 92;
      big.textContent = C.count(p.value || '20×', C.k(t, growAt, growDur, 'out'));
      big.style.top = topY - 90 + Math.sin(t * 2) * 4 + 'px';
      big.style.opacity = C.k(t, growAt + 0.1, 0.3);
      if (head) P.show(head, t, 0.1, { y: Math.sin(t * 1.5) * 3 });
    };
  };

  // ----------------------------------------------------------- proCheckout ---
  // Shopping pages fall away, the agent goes straight to the till; the till
  // flashes PAID and gets its owner's crown.
  S.proCheckout = (st, p, ctx) => {
    const pages = (p.pages || ['STARTSEITE', 'SUCHE', 'PRODUKT', 'BEWERTUNGEN', 'WARENKORB']).map((name, i) => {
      const x = 230 + (i % 2) * 300 + (i >= 4 ? 120 : 0), y = 90 + i * 115;
      const d = C.place(C.h('div', { style: { width: '270px', height: '96px', borderRadius: '16px', background: 'linear-gradient(180deg,#f4f9fd,#d9e6ef)', boxShadow: '0 12px 24px rgba(0,0,0,.35)', padding: '12px 16px' } }, st), x, y);
      C.h('div', { style: { fontSize: '18px', fontWeight: 900, color: '#28394a', letterSpacing: '1px' } }, d, '••• ' + name);
      [70, 45, 85].forEach((w) => C.h('div', { style: { height: '8px', width: w + '%', borderRadius: '4px', background: '#b8c9d6', marginTop: '7px' } }, d));
      return { d, i };
    });
    const svg = C.svg(st);
    const slash = C.s('line', { x1: 120, y1: 640, x2: 760, y2: 40, stroke: RD, 'stroke-width': 9, 'stroke-linecap': 'round', filter: 'url(#glow-sm)', pathLength: 100, 'stroke-dasharray': '0 100' }, svg);
    const arc = C.s('path', { d: 'M860,90 C980,250 960,420 800,520', stroke: CY, 'stroke-width': 5, fill: 'none', 'stroke-dasharray': '10 12', filter: 'url(#glow-sm)', opacity: 0 }, svg);
    const orb = C.place(C.h('div', { class: 'ctr', style: { flexDirection: 'column', gap: '6px' } }, st), 860, 80);
    C.h('div', { class: 'ctr', style: { width: '100px', height: '100px', borderRadius: '50%', background: `radial-gradient(circle at 40% 35%, #bff1ff, ${CY} 55%, #0a6b94)`, boxShadow: `0 0 40px ${CY}`, fontSize: '50px' } }, orb, '🤖');
    P.label(orb, p.agent || 'KI-AGENT', 20, CY);
    const term = C.place(C.h('div', { style: { width: '330px', height: '400px', borderRadius: '34px', background: 'linear-gradient(180deg,#26313c,#0e151c)', border: '3px solid #4b5b69', boxShadow: '0 30px 60px rgba(0,0,0,.6)', padding: '24px' } }, st), 760, 600);
    const screen = C.h('div', { class: 'ctr', style: { height: '170px', borderRadius: '18px', background: '#0a2030', border: '2px solid #1d4a63', flexDirection: 'column', gap: '6px' } }, term);
    const paid = C.h('div', { class: 'ctr', style: { flexDirection: 'column', opacity: 0 } }, screen);
    C.h('div', { style: { fontSize: '70px', color: GR, lineHeight: 1 } }, paid, '✓');
    C.h('div', { style: { fontSize: '44px', fontWeight: 900, color: '#fff' } }, paid, p.paidText || 'BEZAHLT');
    const wait = C.h('div', { style: { fontSize: '30px', color: '#7f93a6', fontWeight: 800 } }, screen, '· · ·');
    const pad = C.h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginTop: '22px' } }, term);
    for (let i = 0; i < 9; i++) C.h('div', { style: { height: '44px', borderRadius: '10px', background: i === 8 ? GR : '#33414e' } }, pad);
    const crown = C.place(C.h('div', { style: { fontSize: '90px' } }, st, '👑'), 760, 330);
    const owner = C.place(C.h('div', { class: 'ptile ctr', style: { gap: '14px', padding: '12px 22px', borderColor: GR } }, st), 760, 845);
    if (p.owner) C.chip(p.owner, 52, owner);
    C.h('div', { style: { fontSize: '28px', fontWeight: 900 } }, owner, p.ownerText || 'BESITZER DER KASSE');
    const slashAt = p.slashAt ?? 1.3, payAt = p.paidAt ?? 2.0, ownAt = p.ownerAt ?? 2.7;
    ctx.cue('whoosh', 0); ctx.cue('whoosh', slashAt); ctx.cue('cash', payAt);
    return (t) => {
      const kf = C.k(t, slashAt + 0.2, 0.5);
      pages.forEach((pg) => {
        P.show(pg.d, t, 0.1 + pg.i * 0.1, { y: Math.sin(t * 1.4 + pg.i) * 4, r: -3 + pg.i * 1.5 });
        pg.d.style.opacity = C.k(t, 0.1 + pg.i * 0.1, 0.25) * (1 - kf * 0.75);
        if (kf > 0) pg.d.style.filter = `blur(${kf * 5}px)`;
      });
      slash.setAttribute('stroke-dasharray', `${C.k(t, slashAt, 0.3) * 100} 100`);
      slash.style.opacity = 1 - C.k(t, payAt + 0.4, 0.4) * 0.7;
      P.show(orb, t, 0.4, { y: Math.sin(t * 2.4) * 6 });
      arc.style.opacity = C.k(t, slashAt + 0.3, 0.3); arc.style.strokeDashoffset = -t * 50;
      P.show(term, t, 0.6, { y: Math.sin(t * 1.5) * 4, s: 1 + C.k(t, payAt, 0.2) * (1 - C.k(t, payAt + 0.2, 0.3)) * 0.05 });
      const kp = C.k(t, payAt, 0.25);
      paid.style.opacity = kp; wait.style.display = kp > 0 ? 'none' : '';
      screen.style.boxShadow = kp > 0 ? `0 0 ${30 * kp}px ${GR}` : '';
      screen.style.borderColor = kp > 0 ? GR : '#1d4a63';
      P.show(crown, t, ownAt, { s0: 0.3, dy: -40, r: Math.sin(t * 2) * 5 });
      P.show(owner, t, ownAt + 0.15, { y: Math.sin(t * 1.7) * 3 });
    };
  };
})();
