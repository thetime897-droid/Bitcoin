// Broker-app look ("theme": "tr"): white rounded cards at the top of the
// frame, heavy black type with green accents, app-style charts and lists.
// Built to sit over a phone screen recording (render with --alpha).
(function () {
  const C = window.Clip, S = C.scenes;
  const G = '#0d7d4d', GL = '#18a565', CHK = '#2fbf68', RD = '#e5392f', INK = '#111317', GR = '#8b9099';
  const T = (C.tr = {});

  T.rich = (text, col = GL) => String(text || '').replace(/\*([^*]+)\*/g, `<span style="color:${col}">$1</span>`).replace(/\n/g, '<br>');

  // White card pinned to the top; enters with a short drop and settles.
  T.card = (st, { y = 120, w = 984, pad = 46, minH = 0 } = {}) =>
    C.h('div', { class: 'trcard', style: { left: (1080 - w) / 2 + 'px', top: y + 'px', width: w + 'px', padding: pad + 'px', minHeight: minH + 'px' } }, st);
  T.enter = (card, t, at = 0.05) => {
    const k = C.k(t, at, 0.42, 'back');
    card.style.opacity = C.k(t, at, 0.18);
    card.style.transform = `translateY(${(1 - k) * -34}px) scale(${(0.95 + 0.05 * k) * (1 + Math.sin(t * 1.3) * 0.003)})`;
  };
  // Small row above the headline: brand mark (or a ticker tile) + context.
  T.header = (card, brand = 'Trade Republic', context = '') => {
    const h = C.h('div', { class: 'ctr', style: { justifyContent: 'flex-start', gap: '12px', fontSize: '28px', fontWeight: 800, color: INK, marginBottom: '14px' } }, card);
    if (typeof brand === 'object' || (brand && C.BRANDS[String(brand).toUpperCase()])) {
      C.chip(brand, 40, h);
      h.insertAdjacentHTML('beforeend', `<span>${C.brand(brand).name}</span>`);
    } else if (brand) {
      h.insertAdjacentHTML('beforeend', `<svg width="40" height="30" viewBox="0 0 40 30"><path d="M2 7 C10 1 18 13 27 7 C31 4 35 4 38 6 L38 25 C35 23 31 23 27 26 C18 32 10 20 2 26 Z" fill="${INK}"/></svg><span>${brand}</span>`);
    }
    if (context) h.insertAdjacentHTML('beforeend', `<span style="color:${GR};font-weight:600">· ${context}</span>`);
    return h;
  };
  T.pills = (parent, items, dark = true) => {
    const row = C.h('div', { class: 'ctr', style: { justifyContent: 'flex-start', gap: '12px', flexWrap: 'wrap', marginTop: '22px' } }, parent);
    return (items || []).map((p) => C.h('div', { style: { padding: '10px 22px', borderRadius: '30px', background: dark ? INK : '#eef0f2', color: dark ? '#fff' : INK, fontSize: '26px', fontWeight: 800 } }, row, p));
  };
  // Rotated outline sticker ("Pro & Contra", "NEU bei TR").
  T.sticker = (st, sp, ctx) => {
    if (!sp) return () => {};
    const col = C.color(sp.color || RD);
    const el = C.place(C.h('div', { style: { padding: '10px 24px', borderRadius: '16px', border: `4px solid ${col}`, background: '#fff', color: col, fontSize: (sp.size || 38) + 'px', fontWeight: 900, whiteSpace: 'nowrap', boxShadow: '0 8px 20px rgba(0,0,0,.18)' } }, st, (sp.icon ? sp.icon + ' ' : '') + sp.text), sp.x ?? 760, sp.y ?? 560);
    ctx.cue('whoosh', sp.at ?? 1.5, 0.7);
    return (t) => {
      const k = C.k(t, sp.at ?? 1.5, 0.35, 'back');
      C.tf(el, { s: Math.max(0, k) * (1 + Math.sin(t * 2.4) * 0.012), r: (sp.rotate ?? -6) + Math.sin(t * 1.7) * 0.6, o: C.k(t, sp.at ?? 1.5, 0.12) });
    };
  };
  const big = (parent, text, col, size = 150) => C.h('div', { style: { fontSize: size + 'px', fontWeight: 900, color: col, lineHeight: 1, letterSpacing: '-5px', whiteSpace: 'nowrap' } }, parent, text);
  const countable = (s) => /\d/.test(String(s));

  // ---------------------------------------------------------- trHeadline ---
  S.trHeadline = (st, p, ctx) => {
    const card = T.card(st, p.card);
    if (p.brand !== false) T.header(card, p.brand ?? 'Trade Republic', p.context);
    const hl = C.h('div', { style: { fontSize: (p.size || 56) + 'px', fontWeight: 900, color: INK, lineHeight: 1.12, letterSpacing: '-1px' } }, card);
    hl.innerHTML = T.rich(p.text);
    let bigEl, bigAt = p.bigAt ?? 0.4;
    if (p.big) {
      const row = C.h('div', { class: 'ctr', style: { justifyContent: 'flex-start', gap: '22px', marginTop: '18px' } }, card);
      bigEl = big(row, p.big, C.color(p.bigColor || G));
      if (p.bigSide) C.h('div', { style: { fontSize: '30px', fontWeight: 800, color: INK, lineHeight: 1.15 } }, row, String(p.bigSide).replace(/\n/g, '<br>'));
    }
    const pills = p.pills ? T.pills(card, p.pills, p.pillsDark !== false) : [];
    const stick = T.sticker(st, p.sticker, ctx);
    ctx.cue('whoosh', 0);
    return (t) => {
      T.enter(card, t);
      if (bigEl && countable(p.big)) bigEl.textContent = C.count(p.big, C.k(t, bigAt, p.countDur ?? 0.8, 'out'));
      pills.forEach((el, i) => (el.style.transform = `scale(${Math.max(0, C.k(t, (p.pillsAt ?? 0.9) + i * 0.15, 0.32, 'back'))})`));
      stick(t);
    };
  };

  // -------------------------------------------------------------- trStat ---
  S.trStat = (st, p, ctx) => {
    const red = p.tone === 'red';
    const col = red ? RD : G;
    const card = T.card(st, p.card);
    if (p.brand) T.header(card, p.brand, p.context);
    if (p.label) C.h('div', { style: { fontSize: '30px', fontWeight: 800, color: INK, marginBottom: '20px' } }, card, p.label);
    const row = C.h('div', { class: 'ctr', style: { justifyContent: 'flex-start', gap: '28px' } }, card);
    const tile = C.h('div', { class: 'ctr', style: { width: '128px', height: '128px', borderRadius: '30px', background: red ? '#fde6e3' : '#ddf4e8', flex: 'none' } }, row);
    C.h('div', { class: 'ctr', style: { width: '64px', height: '64px', borderRadius: '50%', background: col, color: '#fff', fontSize: p.icon && p.icon.length > 1 ? '30px' : '38px', fontWeight: 900 } }, tile, p.icon || '%');
    const num = big(row, p.value || '', col, p.size || 170);
    if (p.sub) C.h('div', { style: { fontSize: '32px', fontWeight: 700, color: '#4b5058', marginTop: '22px' } }, card, T.rich(p.sub, col));
    const pills = p.pills ? T.pills(card, p.pills) : [];
    const stick = T.sticker(st, p.sticker, ctx);
    const at = p.at ?? 0.35;
    ctx.cue('whoosh', 0);
    if (p.cashAt != null) ctx.cue('cash', p.cashAt);
    return (t) => {
      T.enter(card, t);
      tile.style.transform = `scale(${Math.max(0, C.k(t, 0.15, 0.4, 'back'))}) rotate(${(1 - C.k(t, 0.15, 0.4)) * -20}deg)`;
      num.textContent = countable(p.value) && p.countUp !== false ? C.count(p.value, C.k(t, at, p.countDur ?? 0.9, 'out')) : p.value;
      pills.forEach((el, i) => (el.style.transform = `scale(${Math.max(0, C.k(t, (p.pillsAt ?? 1.2) + i * 0.18, 0.32, 'back'))})`));
      stick(t);
    };
  };

  // ------------------------------------------------------------ trNumber ---
  // "Nummer 2 von 3" with a progress ring around the numeral.
  S.trNumber = (st, p, ctx) => {
    const n = p.n || 1, of = p.of || 3;
    const card = T.card(st, { pad: 40, ...p.card });
    const row = C.h('div', { class: 'ctr', style: { justifyContent: 'flex-start', gap: '34px' } }, card);
    const sv = C.svg(row, 170, 170); sv.style.position = 'static';
    C.s('circle', { cx: 85, cy: 85, r: 70, fill: 'none', stroke: '#e6e8eb', 'stroke-width': 12 }, sv);
    const arc = C.s('circle', { cx: 85, cy: 85, r: 70, fill: 'none', stroke: GL, 'stroke-width': 12, 'stroke-linecap': 'round', pathLength: 100, transform: 'rotate(-90 85 85)' }, sv);
    const num = C.s('text', { x: 85, y: 112, 'text-anchor': 'middle', 'font-size': 84, 'font-weight': 900, fill: G, 'font-family': 'Inter, sans-serif' }, sv);
    num.textContent = n;
    const txt = C.h('div', {}, row);
    C.h('div', { style: { fontSize: '30px', fontWeight: 700, color: GR } }, txt, `Nummer ${n} von ${of}`);
    const ttl = C.h('div', { style: { fontSize: '60px', fontWeight: 900, color: INK, lineHeight: 1.05, letterSpacing: '-1px' } }, txt);
    ttl.innerHTML = T.rich(p.title);
    ctx.cue('whoosh', 0);
    return (t) => {
      T.enter(card, t);
      arc.setAttribute('stroke-dasharray', `${C.k(t, 0.25, 0.8, 'out') * (n / of) * 100} 100`);
      num.setAttribute('transform', `translate(85 85) scale(${Math.max(0, C.k(t, 0.2, 0.4, 'back'))}) translate(-85 -85)`);
    };
  };

  // -------------------------------------------------------------- trList ---
  // "So geht's" rows; each gets a green check (or red cross) on its beat.
  S.trList = (st, p, ctx) => {
    const card = T.card(st, p.card);
    if (p.brand) T.header(card, p.brand, p.context);
    if (p.title) C.h('div', { style: { fontSize: '50px', fontWeight: 900, color: INK, marginBottom: '22px' } }, card, T.rich(p.title));
    const rows = (p.items || []).map((it, i) => {
      const r = C.h('div', { class: 'ctr', style: { justifyContent: 'flex-start', gap: '20px', padding: '20px 24px', borderRadius: '20px', background: '#f2f3f5', marginTop: i ? '14px' : 0 } }, card);
      C.h('div', { class: 'ctr', style: { width: '44px', height: '44px', borderRadius: '50%', background: INK, color: '#fff', fontSize: '24px', fontWeight: 900, flex: 'none' } }, r, String(i + 1));
      const tx = C.h('div', { style: { flex: 1 } }, r);
      C.h('div', { style: { fontSize: '34px', fontWeight: 800, color: INK } }, tx, T.rich(it.text));
      if (it.sub) C.h('div', { style: { fontSize: '24px', fontWeight: 600, color: GR, marginTop: '4px' } }, tx, it.sub);
      if (it.value) C.h('div', { style: { fontSize: '34px', fontWeight: 900, color: it.ok === false ? RD : G } }, r, it.value);
      const mark = C.h('div', { class: 'ctr', style: { width: '50px', height: '50px', borderRadius: '50%', background: it.ok === false ? RD : CHK, color: '#fff', fontSize: '28px', fontWeight: 900, flex: 'none' } }, r, it.ok === false ? '✕' : '✓');
      const at = it.at ?? 0.6 + i * 0.6;
      return { r, mark, at, i };
    });
    ctx.cue('whoosh', 0);
    return (t) => {
      T.enter(card, t);
      rows.forEach((rw) => {
        const k = C.k(t, rw.at - 0.35, 0.35, 'out');
        rw.r.style.opacity = 0.35 + 0.65 * k;
        rw.r.style.transform = `translateX(${(1 - k) * 20}px)`;
        rw.mark.style.transform = `scale(${Math.max(0, C.k(t, rw.at, 0.35, 'back'))})`;
        rw.r.style.boxShadow = t > rw.at && t < rw.at + 0.5 ? `0 0 0 3px ${CHK}55` : '';
      });
    };
  };

  // -------------------------------------------------------------- trWarn ---
  S.trWarn = (st, p, ctx) => {
    const card = T.card(st, p.card);
    const tag = C.h('div', { style: { display: 'inline-block', padding: '8px 18px', borderRadius: '12px', background: '#fde6e3', color: RD, fontSize: '26px', fontWeight: 800, marginBottom: '22px' } }, card, p.tag || 'Achtung');
    const row = C.h('div', { class: 'ctr', style: { justifyContent: 'flex-start', gap: '28px' } }, card);
    const tile = C.h('div', { class: 'ctr', style: { width: '120px', height: '120px', borderRadius: '30px', background: '#fde6e3', flex: 'none' } }, row);
    tile.innerHTML = `<svg width="64" height="58" viewBox="0 0 64 58"><path d="M32 3 L61 54 H3 Z" fill="${RD}" stroke="${RD}" stroke-width="5" stroke-linejoin="round"/><rect x="29" y="20" width="6" height="18" rx="3" fill="#fff"/><circle cx="32" cy="45" r="3.6" fill="#fff"/></svg>`;
    const tx = C.h('div', { style: { fontSize: '54px', fontWeight: 900, color: INK, lineHeight: 1.08, letterSpacing: '-1px' } }, row);
    tx.innerHTML = T.rich(p.text, RD);
    if (p.sub) C.h('div', { style: { fontSize: '30px', fontWeight: 700, color: '#4b5058', marginTop: '22px', lineHeight: 1.3 } }, card, T.rich(p.sub, RD));
    const pills = p.pills ? T.pills(card, p.pills) : [];
    ctx.cue('whoosh', 0);
    return (t) => {
      T.enter(card, t);
      const kt = C.k(t, 0.2, 0.4, 'back');
      tile.style.transform = `scale(${Math.max(0, kt)}) rotate(${t > 0.6 && t < 1.1 ? Math.sin(t * 40) * 6 * (1.1 - t) * 2 : 0}deg)`;
      tag.style.transform = `scale(${Math.max(0, C.k(t, 0.1, 0.3, 'back'))})`;
      pills.forEach((el, i) => (el.style.transform = `scale(${Math.max(0, C.k(t, (p.pillsAt ?? 1.2) + i * 0.18, 0.32, 'back'))})`));
    };
  };

  // ------------------------------------------------------------- trChart ---
  // App-style instrument card: name, price, change, range tabs and a line
  // that draws in with a dotted start-price baseline.
  S.trChart = (st, p, ctx) => {
    const up = !(String(p.change || '').trim().startsWith('-') || String(p.change || '').trim().startsWith('−') || String(p.change || '').includes('▼'));
    const col = p.color ? C.color(p.color) : up ? CHK : RD;
    const card = T.card(st, { pad: 40, ...p.card });
    if (p.brand) T.header(card, p.brand, p.context);
    const head = C.h('div', { class: 'ctr', style: { justifyContent: 'flex-start', gap: '18px' } }, card);
    if (p.ticker) C.chip(p.ticker, 64, head);
    const hn = C.h('div', {}, head);
    C.h('div', { style: { fontSize: '26px', fontWeight: 700, color: GR } }, hn, p.name || '');
    const pr = C.h('div', { class: 'ctr', style: { justifyContent: 'flex-start', gap: '16px' } }, hn);
    const price = C.h('div', { style: { fontSize: '62px', fontWeight: 900, color: INK, letterSpacing: '-1px' } }, pr, p.price || '');
    const chg = C.h('div', { style: { fontSize: '30px', fontWeight: 800, color: up ? CHK : RD } }, pr, (up ? '▲ ' : '▼ ') + String(p.change || '').replace(/^[-−+▲▼\s]+/, ''));
    const W = 904, H = 400, X0 = 6, X1 = W - 6, Y0 = 30, Y1 = H - 20;
    const sv = C.svg(card, W, H); Object.assign(sv.style, { position: 'relative', display: 'block', marginTop: '18px' });
    const data = Array.isArray(p.data) ? p.data : C.walk(p.data || { from: 100, to: 94, points: 70, vol: 0.01, seed: 2 });
    let lo = Math.min(...data), hi = Math.max(...data);
    if (p.threshold) hi = Math.max(hi, p.threshold.value * 1.06);
    const pad = (hi - lo) * 0.1; lo -= pad; hi += pad;
    const xAt = (i) => X0 + ((X1 - X0) * i) / (data.length - 1), yAt = (v) => Y1 - ((v - lo) / (hi - lo)) * (Y1 - Y0);
    C.s('line', { x1: X0, x2: X1, y1: yAt(data[0]), y2: yAt(data[0]), stroke: '#c5c9cf', 'stroke-width': 3, 'stroke-dasharray': '2 9', 'stroke-linecap': 'round' }, sv);
    let thr, thrLab;
    if (p.threshold) {
      const ty = yAt(p.threshold.value);
      thr = C.s('line', { x1: X0, x2: X1, y1: ty, y2: ty, stroke: RD, 'stroke-width': 4, 'stroke-dasharray': '14 10' }, sv);
      thrLab = C.h('div', { style: { position: 'absolute', left: '40px', top: 40 + 64 + 18 + ty - 20 + 'px', padding: '6px 14px', borderRadius: '10px', background: RD, color: '#fff', fontSize: '24px', fontWeight: 800 } }, card, p.threshold.label || '');
    }
    const gid = 'trg' + Math.round(C.rand(data.length) * 1e6);
    const lg = C.s('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 }, C.s('defs', {}, sv));
    C.s('stop', { offset: 0, 'stop-color': col, 'stop-opacity': 0.16 }, lg);
    C.s('stop', { offset: 1, 'stop-color': col, 'stop-opacity': 0 }, lg);
    const area = C.s('path', { fill: `url(#${gid})` }, sv);
    const line = C.s('path', { fill: 'none', stroke: col, 'stroke-width': 4.5, 'stroke-linejoin': 'round' }, sv);
    const ring = C.s('circle', { r: 8, fill: 'none', stroke: col, 'stroke-width': 3 }, sv);
    const dot = C.s('circle', { r: 8, fill: col }, sv);
    const tabs = C.h('div', { class: 'ctr', style: { justifyContent: 'space-around', marginTop: '18px', fontSize: '26px', fontWeight: 800, color: GR } }, card);
    (p.ranges || ['1T', '1W', '1M', '1J', 'Max']).forEach((r) => C.h('div', { style: { padding: '6px 18px', borderRadius: '12px', ...(r === (p.range || '1M') ? { color: col, background: up ? '#e3f6ec' : '#fde6e3' } : {}) } }, tabs, r));
    const stick = T.sticker(st, p.sticker, ctx);
    const drawAt = p.drawAt ?? 0.3, drawDur = p.drawDur ?? 1.4;
    ctx.cue('whoosh', 0);
    return (t) => {
      T.enter(card, t);
      const f = C.k(t, drawAt, drawDur, 'inOut') * (data.length - 1);
      const n = Math.floor(f), r = f - n;
      const pts = [];
      for (let i = 0; i <= n; i++) pts.push([xAt(i), yAt(data[i])]);
      if (n < data.length - 1) pts.push([xAt(n + r), yAt(C.lerp(data[n], data[n + 1], r))]);
      const d = pts.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ',' + q[1].toFixed(1)).join('');
      line.setAttribute('d', d); area.setAttribute('d', d + `L${pts[pts.length - 1][0]},${Y1}L${X0},${Y1}Z`);
      const [hx, hy] = pts[pts.length - 1];
      [dot, ring].forEach((c) => { c.setAttribute('cx', hx); c.setAttribute('cy', hy); });
      const ph = (t * 1.1) % 1;
      ring.setAttribute('r', 8 + ph * 20); ring.style.opacity = (1 - ph) * C.k(t, drawAt + drawDur, 0.2);
      if (p.countPrice !== false && countable(p.price)) price.textContent = C.count(p.price, C.k(t, drawAt, drawDur, 'inOut'), p.priceFrom ?? parseFloat(String(p.price).replace(',', '.')) * 0.95);
      chg.style.opacity = C.k(t, drawAt + drawDur - 0.2, 0.3);
      if (thr) { const kt = C.k(t, p.threshold.at ?? drawAt + drawDur + 0.3, 0.5, 'inOut'); thr.setAttribute('x2', C.lerp(X0, X1, kt)); thr.style.opacity = kt > 0 ? 1 : 0; thrLab.style.transform = `scale(${Math.max(0, C.k(t, (p.threshold.at ?? drawAt + drawDur + 0.3) + 0.3, 0.3, 'back'))})`; }
      stick(t);
    };
  };
})();
