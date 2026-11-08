// Broker-app look ("theme": "tr"): white rounded cards at the top of the
// frame, heavy black type with green accents, app-style charts and lists.
// Built to sit over a phone screen recording (render with --alpha).
(function () {
  const C = window.Clip, S = C.scenes;
  const G = '#0d7d4d', GL = '#18a565', CHK = '#2fbf68', RD = '#e5392f', INK = '#111317', GR = '#8b9099';
  const T = (C.tr = {});

  // Tone colours: green (default), red, gold - gold gets a darker ink for
  // contrast on white and a warm tint for tiles.
  const GD = '#b8860b', GDL = '#fbf1d6';
  T.tone = (t) => (t === 'red' ? RD : t === 'gold' ? GD : G);
  T.tint = (t) => (t === 'red' ? '#fde6e3' : t === 'gold' ? GDL : '#ddf4e8');
  T.rich = (text, col = GL) => String(text || '').replace(/\*([^*]+)\*/g, `<span style="color:${col}">$1</span>`).replace(/\n/g, '<br>');

  // White card pinned to the top; enters with a short drop and settles.
  T.card = (st, { y = 120, w = 984, pad = 46, minH = 0 } = {}) =>
    C.h('div', { class: 'trcard', style: { left: (1080 - w) / 2 + 'px', top: y + 'px', width: w + 'px', padding: pad + 'px', minHeight: minH + 'px' } }, st);
  // Card drops in with a little overshoot, then its rows rise in one after
  // another (70 ms apart) - the layered build editors do by hand in CapCut.
  T.enter = (card, t, at = 0.05) => {
    const k = C.k(t, at, 0.42, 'back');
    card.style.opacity = C.k(t, at, 0.18);
    card.style.transform = `translateY(${(1 - k) * -34}px) scale(${(0.95 + 0.05 * k) * (1 + Math.sin(t * 1.3) * 0.003)})`;
    if (!card._kids) card._kids = [...card.children].filter((c) => !c.dataset.own);
    card._kids.forEach((el, i) => {
      const kc = C.k(t, at + 0.1 + i * 0.07, 0.45, 'expo');
      el.style.opacity = kc;
      el.style.translate = `0 ${(1 - kc) * 26}px`;
    });
  };
  // Sound design for a count-up: soft ticks that speed up while the digits
  // roll, then one accent on landing - cash for money, a pop otherwise.
  T.countSfx = (ctx, value, at, dur) => {
    const n = Math.max(4, Math.min(9, Math.round(dur * 8)));
    for (let i = 0; i < n; i++) ctx.cue('tick', at + dur * Math.pow(i / n, 1.6), 0.45);
    ctx.cue(/[€$¥£]|mrd|mio|euro|dollar|yuan/i.test(String(value)) ? 'cash' : 'pop', at + dur, 0.6);
  };
  T.pillSfx = (ctx, n, at, step) => { if (n) ctx.cue('whoosh', at - 0.08, 0.3); for (let i = 0; i < n; i++) ctx.cue('tick', at + i * step + 0.05, 0.55); };
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
    ctx.cue('pop', (sp.at ?? 1.5) + 0.05, 0.7);
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
    hl.innerHTML = T.rich(p.text, p.accent ? C.color(p.accent) : GL);
    let bigEl, bigAt = p.bigAt ?? 0.4;
    if (p.big) {
      const row = C.h('div', { class: 'ctr', style: { justifyContent: 'flex-start', gap: '22px', marginTop: '18px' } }, card);
      bigEl = big(row, p.big, C.color(p.bigColor || G));
      if (p.bigSide) C.h('div', { style: { fontSize: '30px', fontWeight: 800, color: INK, lineHeight: 1.15 } }, row, String(p.bigSide).replace(/\n/g, '<br>'));
    }
    const pills = p.pills ? T.pills(card, p.pills, p.pillsDark !== false) : [];
    const stick = T.sticker(st, p.sticker, ctx);
    ctx.cue('whoosh', 0, 0.8);
    if (bigEl && countable(p.big) && (p.countDur ?? 0.8) > 0.05) T.countSfx(ctx, p.big, bigAt, p.countDur ?? 0.8);
    T.pillSfx(ctx, pills.length, p.pillsAt ?? 0.9, 0.15);
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
    const col = T.tone(p.tone);
    const card = T.card(st, p.card);
    if (p.brand) T.header(card, p.brand, p.context);
    if (p.label) C.h('div', { style: { fontSize: '30px', fontWeight: 800, color: INK, marginBottom: '20px' } }, card, p.label);
    const row = C.h('div', { class: 'ctr', style: { justifyContent: 'flex-start', gap: '28px' } }, card);
    const tile = C.h('div', { class: 'ctr', style: { width: '128px', height: '128px', borderRadius: '30px', background: T.tint(p.tone), flex: 'none' } }, row);
    C.h('div', { class: 'ctr', style: { width: '64px', height: '64px', borderRadius: '50%', background: col, color: '#fff', fontSize: p.icon && p.icon.length > 1 ? '30px' : '38px', fontWeight: 900 } }, tile, p.icon || '%');
    const num = big(row, p.value || '', col, p.size || 170);
    if (p.sub) C.h('div', { style: { fontSize: '32px', fontWeight: 700, color: '#4b5058', marginTop: '22px' } }, card, T.rich(p.sub, p.subAccent ? C.color(p.subAccent) : col));
    const pills = p.pills ? T.pills(card, p.pills) : [];
    const stick = T.sticker(st, p.sticker, ctx);
    const at = p.at ?? 0.35;
    if (p.tone === 'gold') ctx.cue('shine', at + (p.countDur ?? 0.9) - 0.1, 0.45);
    ctx.cue('whoosh', 0, 0.8);
    if (countable(p.value) && p.countUp !== false) T.countSfx(ctx, p.cashAt != null ? '' : p.value, at, p.countDur ?? 0.9);
    else ctx.cue('pop', at, 0.6);
    if (p.cashAt != null) ctx.cue('cash', p.cashAt, 0.6);
    T.pillSfx(ctx, pills.length, p.pillsAt ?? 1.2, 0.18);
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
    ctx.cue('pop', 0.2, 0.6);
    for (let i = 0; i < 4; i++) ctx.cue('tick', 0.3 + i * 0.16, 0.4);
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
    if (p.title) C.h('div', { style: { fontSize: '50px', fontWeight: 900, color: INK, marginBottom: '22px' } }, card, T.rich(p.title, p.accent ? C.color(p.accent) : GL));
    const rows = (p.items || []).map((it, i) => {
      const r = C.h('div', { class: 'ctr', style: { justifyContent: 'flex-start', gap: '20px', padding: '20px 24px', borderRadius: '20px', background: '#f2f3f5', marginTop: i ? '14px' : 0 } }, card);
      C.h('div', { class: 'ctr', style: { width: '44px', height: '44px', borderRadius: '50%', background: INK, color: '#fff', fontSize: '24px', fontWeight: 900, flex: 'none' } }, r, String(i + 1));
      const tx = C.h('div', { style: { flex: 1 } }, r);
      C.h('div', { style: { fontSize: '34px', fontWeight: 800, color: INK } }, tx, T.rich(it.text, p.accent ? C.color(p.accent) : GL));
      if (it.sub) C.h('div', { style: { fontSize: '24px', fontWeight: 600, color: GR, marginTop: '4px' } }, tx, it.sub);
      if (it.value) C.h('div', { style: { fontSize: '34px', fontWeight: 900, color: it.ok === false ? RD : G } }, r, it.value);
      const mark = C.h('div', { class: 'ctr', style: { width: '50px', height: '50px', borderRadius: '50%', background: it.mark ? C.color(it.markColor || INK) : it.ok === false ? RD : CHK, color: '#fff', fontSize: '28px', fontWeight: 900, flex: 'none' } }, r, it.mark || (it.ok === false ? '✕' : '✓'));
      const at = it.at ?? 0.6 + i * 0.6;
      r.dataset.own = 1;
      ctx.cue('whoosh', at - 0.38, 0.32); ctx.cue('tick', at - 0.3, 0.5);
      ctx.cue(it.ok === false ? 'error' : 'pop', at + 0.02, it.ok === false ? 0.35 : 0.55);
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
    const tag = C.h('div', { style: { display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '8px 18px', borderRadius: '12px', background: '#fde6e3', color: RD, fontSize: '26px', fontWeight: 800, marginBottom: '22px' } }, card);
    const dot = p.live ? C.h('span', { style: { width: '14px', height: '14px', borderRadius: '50%', background: RD } }, tag) : null;
    tag.insertAdjacentHTML('beforeend', `<span>${p.tag || 'Achtung'}</span>`);
    const row = C.h('div', { class: 'ctr', style: { justifyContent: 'flex-start', gap: '28px' } }, card);
    const tile = C.h('div', { class: 'ctr', style: { width: '120px', height: '120px', borderRadius: '30px', background: '#fde6e3', flex: 'none' } }, row);
    tile.innerHTML = `<svg width="64" height="58" viewBox="0 0 64 58"><path d="M32 3 L61 54 H3 Z" fill="${RD}" stroke="${RD}" stroke-width="5" stroke-linejoin="round"/><rect x="29" y="20" width="6" height="18" rx="3" fill="#fff"/><circle cx="32" cy="45" r="3.6" fill="#fff"/></svg>`;
    const tx = C.h('div', { style: { fontSize: (p.size || 54) + 'px', fontWeight: 900, color: INK, lineHeight: 1.08, letterSpacing: '-1px' } }, row);
    tx.innerHTML = T.rich(p.text, RD);
    if (p.sub) C.h('div', { style: { fontSize: '30px', fontWeight: 700, color: '#4b5058', marginTop: '22px', lineHeight: 1.3 } }, card, T.rich(p.sub, RD));
    const pills = p.pills ? T.pills(card, p.pills) : [];
    const stick = T.sticker(st, p.sticker, ctx);
    ctx.cue('whoosh', 0, 0.8); ctx.cue('downer', 0.25, 0.3);
    T.pillSfx(ctx, pills.length, p.pillsAt ?? 1.2, 0.18);
    return (t) => {
      T.enter(card, t);
      const kt = C.k(t, 0.2, 0.4, 'back');
      tile.style.transform = `scale(${Math.max(0, kt)}) rotate(${t > 0.6 && t < 1.1 ? Math.sin(t * 40) * 6 * (1.1 - t) * 2 : 0}deg)`;
      tag.style.transform = `scale(${Math.max(0, C.k(t, 0.1, 0.3, 'back'))})`;
      if (dot) { const ph = (t * 1.4) % 1; dot.style.boxShadow = `0 0 0 ${ph * 12}px rgba(229,57,47,${0.45 * (1 - ph)})`; dot.style.opacity = 0.6 + 0.4 * Math.abs(Math.sin(t * 3)); }
      stick(t);
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
    const W = 904, H = p.height || 400, X0 = 6, X1 = W - 6, Y0 = 30, Y1 = H - 20;
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
    ctx.cue('whoosh', 0, 0.8); ctx.cue('whoosh', drawAt + 0.1, 0.45); ctx.cue('pop', drawAt + drawDur, 0.5);
    if (p.threshold) ctx.cue('whoosh-down', p.threshold.at ?? drawAt + drawDur + 0.3, 0.5);
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
  // -------------------------------------------------------------- trBars ---
  // Holdings / ranking: logo tile, name, bar that grows to its share.
  S.trBars = (st, p, ctx) => {
    const card = T.card(st, p.card);
    if (p.brand) T.header(card, p.brand, p.context);
    if (p.title) C.h('div', { style: { fontSize: '50px', fontWeight: 900, color: INK, marginBottom: '24px' } }, card, T.rich(p.title));
    const items = p.items || [];
    const mx = p.max || Math.max(...items.map((i) => i.value));
    const rows = items.map((it, i) => {
      const r = C.h('div', { class: 'ctr', style: { justifyContent: 'flex-start', gap: '18px', marginTop: i ? '20px' : 0 } }, card);
      C.chip(it.brand || it.name, 64, r);
      const col = C.h('div', { style: { flex: 1 } }, r);
      const top = C.h('div', { class: 'ctr', style: { justifyContent: 'space-between', fontSize: '32px', fontWeight: 800, color: INK } }, col);
      C.h('span', {}, top, it.name);
      const val = C.h('span', { style: { color: G, fontWeight: 900 } }, top, '');
      const track = C.h('div', { style: { height: '18px', borderRadius: '9px', background: '#eef0f2', marginTop: '10px', overflow: 'hidden' } }, col);
      const bar = C.h('div', { style: { height: '100%', width: '0%', borderRadius: '9px', background: i === 0 ? GL : '#7fd3a6' } }, track);
      return { it, val, bar, at: it.at ?? 0.5 + i * 0.35 };
    });
    const note = p.note ? C.h('div', { style: { fontSize: '24px', fontWeight: 600, color: GR, marginTop: '22px' } }, card, p.note) : null;
    if (note) note.dataset.own = 1;
    rows.forEach((rw) => { ctx.cue('tick', rw.at, 0.5); ctx.cue('pop', rw.at + 0.75, 0.35); });
    ctx.cue('whoosh', 0);
    return (t) => {
      T.enter(card, t);
      rows.forEach((rw) => {
        const k = C.k(t, rw.at, 0.8, 'out');
        rw.bar.style.width = (rw.it.value / mx) * 100 * k + '%';
        rw.val.textContent = C.count(rw.it.label || String(rw.it.value), k);
      });
      if (note) note.style.opacity = C.k(t, (rows[rows.length - 1]?.at ?? 0) + 0.6, 0.3);
    };
  };
  // ------------------------------------------------------------ trVersus ---
  // "Google vs Amazon": two logo columns, a black VS badge drops between them.
  S.trVersus = (st, p, ctx) => {
    const card = T.card(st, p.card);
    if (p.title) C.h('div', { style: { fontSize: '52px', fontWeight: 900, color: INK, marginBottom: '26px', letterSpacing: '-1px' } }, card, T.rich(p.title, p.titleAccent ? C.color(p.titleAccent) : GL));
    const row = C.h('div', { class: 'ctr', style: { justifyContent: 'space-around', position: 'relative' } }, card);
    const sides = [p.left || {}, p.right || {}].map((sd, i) => {
      const col = C.h('div', { class: 'ctr', style: { flexDirection: 'column', gap: '12px', width: '360px', padding: '22px 0', borderRadius: '28px', background: '#f6f7f8' } }, row);
      if (sd.brands) { const lr = C.h('div', { class: 'ctr', style: { gap: '10px' } }, col); sd.brands.forEach((b) => C.chip(b, sd.chip || 92, lr)); }
      else C.chip(sd.brand || sd.name, 110, col);
      C.h('div', { style: { fontSize: (sd.nameSize || 46) + 'px', fontWeight: 900, color: INK, textAlign: 'center' } }, col, sd.name || C.brand(sd.brand).name);
      if (sd.sub) C.h('div', { style: { fontSize: '26px', fontWeight: 700, color: GR, textAlign: 'center' } }, col, sd.sub);
      if (sd.value) C.h('div', { style: { fontSize: '44px', fontWeight: 900, color: sd.tone === 'red' ? RD : G } }, col, sd.value);
      return { col, at: p.at?.[i] ?? 0.35 + i * 0.5 };
    });
    const vs = C.h('div', { class: 'ctr', style: { position: 'absolute', left: '50%', top: '50%', width: '110px', height: '110px', margin: '-55px 0 0 -55px', borderRadius: '50%', background: INK, color: '#fff', fontSize: '42px', fontWeight: 900, boxShadow: '0 0 0 10px #fff' } }, row, 'VS');
    const vsAt = p.vsAt ?? sides[1].at + 0.45;
    sides.forEach((sd) => { sd.col.dataset.k = 1; ctx.cue('whoosh', sd.at, 0.5); ctx.cue('pop', sd.at + 0.2, 0.45); });
    ctx.cue('whoosh', 0, 0.7); ctx.cue('impact', vsAt + 0.05, 0.3); ctx.cue('pop', vsAt + 0.05, 0.6);
    const stick = T.sticker(st, p.sticker, ctx);
    return (t) => {
      T.enter(card, t);
      sides.forEach((sd, i) => {
        const k = C.k(t, sd.at, 0.5, 'expo');
        sd.col.style.opacity = C.k(t, sd.at, 0.2);
        sd.col.style.transform = `translateX(${(1 - k) * (i ? 120 : -120)}px) translateY(${Math.sin(t * 1.6 + i * 2) * 3}px)`;
      });
      vs.style.transform = `scale(${Math.max(0, C.k(t, vsAt, 0.4, 'back')) * (1 + Math.sin(t * 3) * 0.02)}) rotate(${(1 - C.k(t, vsAt, 0.4)) * -90}deg)`;
      stick(t);
    };
  };

  // ------------------------------------------------------------ trMetric ---
  // Earnings-style card: title + logo top right, small grey label, big
  // figure, sub label; an optional second figure (delta) lands later.
  S.trMetric = (st, p, ctx) => {
    const card = T.card(st, { pad: 40, ...p.card });
    const tone = T.tone(p.tone);
    const top = C.h('div', { class: 'ctr', style: { justifyContent: 'space-between', alignItems: 'flex-start' } }, card);
    const tl = C.h('div', {}, top);
    C.h('div', { style: { fontSize: '40px', fontWeight: 900, color: INK } }, tl, T.rich(p.title, p.accent ? C.color(p.accent) : GL));
    if (p.label) C.h('div', { style: { fontSize: '28px', fontWeight: 700, color: GR, marginTop: '4px' } }, tl, p.label);
    const logos = C.h('div', { class: 'ctr', style: { gap: '10px' } }, top);
    (p.logos || (p.brand ? [p.brand] : [])).forEach((b) => C.chip(b, 70, logos));
    const num = big(card, p.value || '', tone, p.size || 120);
    num.style.margin = '10px 0 4px';
    if (p.sub) C.h('div', { style: { fontSize: '30px', fontWeight: 700, color: '#4b5058' } }, card, T.rich(p.sub, tone));
    let d2;
    if (p.second) {
      d2 = big(card, p.second.value, C.color(p.second.tone === 'red' ? RD : p.second.color || G), p.second.size || 96);
      d2.style.marginTop = '8px'; d2.dataset.own = 1;
      if ((p.second.size || 96) < 80) d2.style.letterSpacing = '-1px';
    }
    const pills = p.pills ? T.pills(card, p.pills) : [];
    const at = p.at ?? 0.4, d2At = p.second?.at ?? at + 1.6;
    ctx.cue('whoosh', 0, 0.8);
    if (p.value) T.countSfx(ctx, p.value, at, p.countDur ?? 0.9);
    if (d2) { ctx.cue('whoosh', d2At - 0.1, 0.4); T.countSfx(ctx, p.second.value, d2At, 0.6); }
    T.pillSfx(ctx, pills.length, p.pillsAt ?? at + 1.4, 0.18);
    const stick = T.sticker(st, p.sticker, ctx);
    return (t) => {
      T.enter(card, t);
      if (p.value) num.textContent = countable(p.value) && p.countUp !== false ? C.count(p.value, C.k(t, at, p.countDur ?? 0.9, 'out')) : p.value;
      num.style.opacity = C.k(t, at - 0.05, 0.15);
      if (d2) {
        const k = C.k(t, d2At, 0.4, 'back');
        d2.style.opacity = C.k(t, d2At, 0.12);
        d2.style.transform = `translateY(${(1 - Math.min(1, k)) * 30}px) scale(${0.8 + 0.2 * Math.max(0, k)})`;
        d2.style.transformOrigin = '0 50%';
        d2.textContent = C.count(p.second.value, C.k(t, d2At, 0.6, 'out'));
      }
      pills.forEach((el, i) => (el.style.transform = `scale(${Math.max(0, C.k(t, (p.pillsAt ?? at + 1.4) + i * 0.18, 0.32, 'back'))})`));
      stick(t);
    };
  };

  // --------------------------------------------------------------- trBuy ---
  // Portfolio card: logo tile, name, black date pill, big green amount,
  // one-line pitch and green tag pills ("Gekauft 30. Okt.").
  S.trBuy = (st, p, ctx) => {
    const card = T.card(st, { pad: 40, ...p.card });
    const head = C.h('div', { class: 'ctr', style: { justifyContent: 'flex-start', gap: '22px' } }, card);
    C.chip(p.brand, 96, head);
    const hn = C.h('div', {}, head);
    C.h('div', { style: { fontSize: '46px', fontWeight: 900, color: INK, lineHeight: 1 } }, hn, p.name || C.brand(p.brand).name);
    if (p.badge) C.h('div', { style: { display: 'inline-block', marginTop: '10px', padding: '6px 18px', borderRadius: '14px', background: INK, color: '#fff', fontSize: '24px', fontWeight: 800 } }, hn, p.badge);
    const num = big(card, p.value || '', T.tone(p.tone), p.size || 130);
    num.style.margin = '18px 0 6px';
    if (p.sub) C.h('div', { style: { fontSize: '32px', fontWeight: 800, color: INK } }, card, T.rich(p.sub));
    const row = C.h('div', { class: 'ctr', style: { justifyContent: 'flex-start', gap: '12px', marginTop: '20px' } }, card);
    const tags = (p.tags || []).map((tg, i) => C.h('div', { style: { padding: '8px 20px', borderRadius: '14px', background: i % 2 ? INK : '#ddf4e8', color: i % 2 ? '#fff' : G, fontSize: '26px', fontWeight: 800 } }, row, tg));
    const at = p.at ?? 0.4, tagsAt = p.tagsAt ?? at + 1.3;
    ctx.cue('whoosh', 0, 0.8);
    T.countSfx(ctx, p.value, at, p.countDur ?? 0.9);
    T.pillSfx(ctx, tags.length, tagsAt, 0.2);
    const stick = T.sticker(st, p.sticker, ctx);
    return (t) => {
      T.enter(card, t);
      num.textContent = countable(p.value) ? C.count(p.value, C.k(t, at, p.countDur ?? 0.9, 'out')) : p.value;
      tags.forEach((el, i) => (el.style.transform = `scale(${Math.max(0, C.k(t, tagsAt + i * 0.2, 0.32, 'back'))})`));
      stick(t);
    };
  };

  // -------------------------------------------------------------- trPoll ---
  // Comment-bait question with numbered red answers ticking in.
  S.trPoll = (st, p, ctx) => {
    const card = T.card(st, p.card);
    const q = C.h('div', { style: { fontSize: '54px', fontWeight: 900, color: INK, lineHeight: 1.1, letterSpacing: '-1px', marginBottom: '26px' } }, card);
    q.innerHTML = T.rich(p.question);
    const opts = (p.options || []).map((o, i) => {
      const r = C.h('div', { class: 'ctr', style: { justifyContent: 'flex-start', gap: '18px', marginTop: i ? '16px' : 0, fontSize: '36px', fontWeight: 800, color: INK } }, card);
      C.h('div', { class: 'ctr', style: { width: '48px', height: '48px', borderRadius: '50%', background: RD, color: '#fff', fontSize: '26px', fontWeight: 900, flex: 'none' } }, r, String(i + 1));
      r.insertAdjacentHTML('beforeend', `<span>${o}</span>`);
      r.dataset.own = 1;
      const at = (p.at ?? 0.7) + i * (p.step ?? 0.35);
      ctx.cue('tick', at, 0.6);
      return { r, at };
    });
    let note;
    if (p.note) { note = C.h('div', { style: { fontSize: '24px', fontWeight: 600, color: GR, marginTop: '24px' } }, card, p.note); note.dataset.own = 1; }
    ctx.cue('whoosh', 0, 0.8);
    return (t) => {
      T.enter(card, t);
      opts.forEach((o) => {
        const k = C.k(t, o.at, 0.4, 'back');
        o.r.style.opacity = C.k(t, o.at, 0.15);
        o.r.style.transform = `translateX(${(1 - Math.min(1, k)) * -40}px)`;
      });
      if (note) note.style.opacity = C.k(t, (opts[opts.length - 1]?.at ?? 0.5) + 0.4, 0.3);
    };
  };

  // -------------------------------------------------------------- trRule ---
  // "Meine Faustregel": two outlined columns, the chosen one ticked green.
  S.trRule = (st, p, ctx) => {
    const card = T.card(st, p.card);
    C.h('div', { style: { fontSize: '52px', fontWeight: 900, color: INK, marginBottom: '24px' } }, card, T.rich(p.title || 'Meine *Faustregel*'));
    const row = C.h('div', { class: 'ctr', style: { gap: '22px', alignItems: 'stretch' } }, card);
    const cols = [p.left || {}, p.right || {}].map((c, i) => {
      const good = c.good !== false && i === 0 || c.good === true;
      const col = good ? GL : RD;
      const d = C.h('div', { style: { flex: 1, padding: '24px', borderRadius: '26px', border: `4px solid ${col}55`, background: good ? '#f2fbf6' : '#fff' } }, row);
      C.h('div', { style: { fontSize: '28px', fontWeight: 700, color: GR } }, d, c.label || '');
      C.h('div', { style: { fontSize: '42px', fontWeight: 900, color: col, lineHeight: 1.1, margin: '6px 0 14px' } }, d, c.title || '');
      const res = C.h('div', { style: { fontSize: '26px', fontWeight: 800, color: good ? INK : GR } }, d, (good ? '✓ ' : '✕ ') + (c.result || ''));
      const at = c.at ?? 0.5 + i * 0.9;
      d.dataset.own = 1;
      ctx.cue('whoosh', at, 0.4); ctx.cue(good ? 'pop' : 'tick', at + 0.45, 0.55);
      return { d, res, at };
    });
    ctx.cue('whoosh', 0, 0.8);
    return (t) => {
      T.enter(card, t);
      cols.forEach((c, i) => {
        const k = C.k(t, c.at, 0.5, 'expo');
        c.d.style.opacity = C.k(t, c.at, 0.2);
        c.d.style.transform = `translateY(${(1 - k) * 40}px)`;
        c.res.style.transform = `scale(${Math.max(0, C.k(t, c.at + 0.45, 0.35, 'back'))})`;
        c.res.style.transformOrigin = '0 50%';
      });
    };
  };
  // -------------------------------------------------------------- trPost ---
  // Social video statement: avatar, name, verified tick, quote, a video
  // thumbnail with play button and a live time stamp. Neutral card, no
  // platform logo - the platform is only named in the meta line.
  S.trPost = (st, p, ctx) => {
    const card = T.card(st, { pad: 40, ...p.card });
    const head = C.h('div', { class: 'ctr', style: { justifyContent: 'flex-start', gap: '18px' } }, card);
    C.chip(p.avatar || { name: p.name, glyph: (p.name || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2), color: '#1c3d6e' }, 84, head);
    const hn = C.h('div', {}, head);
    C.h('div', { class: 'ctr', style: { justifyContent: 'flex-start', gap: '10px', fontSize: '38px', fontWeight: 900, color: INK } }, hn, `${p.name || ''}<span style="display:inline-flex;width:34px;height:34px;border-radius:50%;background:#1d9bf0;color:#fff;font-size:22px;align-items:center;justify-content:center">✓</span>`);
    C.h('div', { style: { fontSize: '26px', fontWeight: 600, color: GR } }, hn, p.role || '');
    const q = C.h('div', { style: { fontSize: '40px', fontWeight: 800, color: INK, lineHeight: 1.25, margin: '24px 0 20px' } }, card);
    q.innerHTML = T.rich(p.quote, p.accent ? C.color(p.accent) : GL);
    const vid = C.h('div', { class: 'ctr', style: { position: 'relative', height: '250px', borderRadius: '26px', background: 'linear-gradient(135deg,#1b2430,#0d1218)', overflow: 'hidden' } }, card);
    C.h('div', { style: { position: 'absolute', left: '22px', top: '18px', padding: '6px 14px', borderRadius: '10px', background: 'rgba(255,255,255,.12)', color: '#fff', fontSize: '22px', fontWeight: 800 } }, vid, p.videoLabel || 'Video-Statement');
    const play = C.h('div', { class: 'ctr', style: { width: '104px', height: '104px', borderRadius: '50%', background: 'rgba(255,255,255,.95)', color: INK, fontSize: '44px', paddingLeft: '8px' } }, vid, '▶');
    const bar = C.h('div', { style: { position: 'absolute', left: '22px', right: '22px', bottom: '20px', height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,.2)' } }, vid);
    const prog = C.h('div', { style: { height: '100%', width: '0%', borderRadius: '4px', background: RD } }, bar);
    const meta = C.h('div', { style: { fontSize: '24px', fontWeight: 600, color: GR, marginTop: '16px' } }, card, p.meta || '');
    const stick = T.sticker(st, p.sticker, ctx);
    const qAt = p.quoteAt ?? 0.6;
    ctx.cue('whoosh', 0, 0.8); ctx.cue('pop', 0.35, 0.5); ctx.cue('tick', p.playAt ?? 1.6, 0.6);
    return (t) => {
      T.enter(card, t);
      play.style.transform = `scale(${Math.max(0, C.k(t, 0.5, 0.4, 'back')) * (1 + Math.sin(t * 3) * 0.03)})`;
      prog.style.width = Math.min(100, Math.max(0, (t - (p.playAt ?? 1.6)) * 9)) + '%';
      q.style.clipPath = `inset(0 ${100 - C.k(t, qAt, 0.9, 'inOut') * 100}% 0 0)`;
      stick(t);
    };
  };

  // ---------------------------------------------------------- tr icons ---
  const BL = '#2f6bff';
  T.icon = (name, col = G, size = 120) => {
    const w = size, h = size;
    if (name === 'tower') return `<svg width="${w}" height="${h}" viewBox="0 0 100 120"><path d="M50 26 L28 116 M50 26 L72 116 M36 86 H64 M40 62 H60 M31 104 L60 74 M69 104 L40 74" stroke="${INK}" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="50" cy="20" r="8" fill="${col}"/><path d="M33 8 A24 24 0 0 0 33 32 M67 8 A24 24 0 0 1 67 32" stroke="${col}" stroke-width="5" fill="none" stroke-linecap="round"/></svg>`;
    if (name === 'sat') return `<svg width="${w}" height="${h}" viewBox="0 0 120 100"><rect x="4" y="32" width="34" height="28" rx="3" fill="${col}"/><rect x="82" y="32" width="34" height="28" rx="3" fill="${col}"/><path d="M15 32 V60 M27 32 V60 M93 32 V60 M105 32 V60 M4 46 H38 M82 46 H116" stroke="#fff" stroke-width="2.5"/><line x1="38" y1="46" x2="82" y2="46" stroke="${INK}" stroke-width="5"/><rect x="46" y="28" width="28" height="36" rx="7" fill="${INK}"/><path d="M60 64 V78" stroke="${INK}" stroke-width="5"/><path d="M48 86 A14 10 0 0 0 72 86" stroke="${INK}" stroke-width="5" fill="none"/></svg>`;
    if (name === 'phone') return `<svg width="${w * 0.6}" height="${h}" viewBox="0 0 60 100"><rect x="4" y="3" width="52" height="94" rx="11" fill="#f6f7f8" stroke="${INK}" stroke-width="5"/>${[0, 1, 2, 3].map((i) => `<rect x="${13 + i * 9.5}" y="${70 - i * 12}" width="7" height="${16 + i * 12}" rx="2" fill="${col}"/>`).join('')}</svg>`;
    return '';
  };
  // Stamp label ("KEIN NETZ", "NICHT FERTIG") placed on the card.
  const stampEl = (parent, text, col, x, y, size = 46) => {
    const el = C.h('div', { style: { position: 'absolute', left: x + 'px', top: y + 'px', padding: '8px 24px', borderRadius: '14px', border: `5px solid ${col}`, background: '#fff', color: col, fontSize: size + 'px', fontWeight: 900, whiteSpace: 'nowrap', letterSpacing: '1px' } }, parent, text);
    el.dataset.own = 1; el.style.opacity = 0;
    return el;
  };

  // ------------------------------------------------------------ trSignal ---
  // Funkmast + Handy: the phone drifts out of range, bars die one by one,
  // "KEIN NETZ" stamps in. Optional: a satellite flies in, beams down and
  // the bars come back (Starlink-style rescue).
  S.trSignal = (st, p, ctx) => {
    const card = T.card(st, { pad: 40, ...p.card });
    if (p.brand) T.header(card, p.brand, p.context);
    const ttl = C.h('div', { style: { fontSize: (p.size || 52) + 'px', fontWeight: 900, color: INK, lineHeight: 1.1, letterSpacing: '-1px' } }, card);
    ttl.innerHTML = T.rich(p.title || 'Außer *Reichweite*', p.accent ? C.color(p.accent) : RD);
    const W = 904, H = 470;
    const box = C.h('div', { style: { position: 'relative', width: W + 'px', height: H + 'px', marginTop: '10px' } }, card);
    const sv = C.svg(box, W, H); sv.style.position = 'absolute';
    // tower
    const tw = C.s('g', { transform: 'translate(120 120)' }, sv);
    tw.innerHTML = `<path d="M90 50 L44 330 M90 50 L136 330 M62 240 H118 M70 160 H110 M52 290 L112 200 M128 290 L68 200" stroke="${INK}" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="90" cy="40" r="15" fill="${G}" class="tip"/>`;
    const tip = tw.querySelector('.tip');
    const arcs = [0, 1, 2].map(() => C.s('circle', { cx: 210, cy: 160, r: 30, fill: 'none', stroke: G, 'stroke-width': 5 }, sv));
    // phone
    const ph = C.s('g', {}, sv);
    ph.innerHTML = `<rect x="0" y="0" width="170" height="300" rx="30" fill="#f6f7f8" stroke="${INK}" stroke-width="9"/><rect x="62" y="16" width="46" height="10" rx="5" fill="${INK}"/>`;
    const bars = [0, 1, 2, 3].map((i) => C.s('rect', { x: 34 + i * 28, y: 240 - (40 + i * 34), width: 20, height: 40 + i * 34, rx: 5, fill: G }, ph));
    // satellite + beam
    const beam = C.s('polygon', { points: '0,0 0,0 0,0', fill: GL, opacity: 0 }, sv);
    const sat = C.s('g', { style: p.satellite ? '' : 'display:none' }, sv);
    sat.innerHTML = `<g transform="translate(-60 -50)">${T.icon('sat', BL, 120).replace(/<\/?svg[^>]*>/g, '')}</g>`;
    sat.firstChild.setAttribute('transform', 'translate(-75 -62) scale(1.25)');
    const lost = stampEl(box, p.lostText || 'KEIN NETZ', RD, 520, 330, 48);
    const okEl = p.satellite ? stampEl(box, p.okText || 'Netz per Satellit', G, 470, 330, 42) : null;
    const dropAt = p.dropAt ?? 0.7, stepB = 0.2, lostAt = dropAt + 4 * stepB + 0.05;
    const satAt = p.satAt ?? lostAt + 0.7, fillAt = satAt + 0.55;
    ctx.cue('whoosh', 0, 0.8);
    ctx.cue('whoosh-down', dropAt - 0.05, 0.4);
    for (let i = 0; i < 4; i++) ctx.cue('tick', dropAt + i * stepB, 0.55);
    ctx.cue('stamp', lostAt, 0.7); ctx.cue('error', lostAt + 0.02, 0.3);
    if (p.satellite) {
      ctx.cue('whoosh', satAt - 0.1, 0.6); ctx.cue('shine', fillAt - 0.15, 0.4);
      for (let i = 0; i < 4; i++) ctx.cue('tick', fillAt + i * 0.14, 0.55);
      ctx.cue('success', fillAt + 0.65, 0.45);
    }
    const stick = T.sticker(st, p.sticker, ctx);
    return (t) => {
      T.enter(card, t);
      const away = C.k(t, dropAt - 0.3, 1.0, 'inOut');
      const px = 560 + away * 120, py = 150;
      ph.setAttribute('transform', `translate(${px} ${py + Math.sin(t * 2) * 3})`);
      const sOn = p.satellite ? C.k(t, satAt, 0.6, 'expo') : 0;
      let lvl = 4 - Math.min(4, Math.max(0, Math.floor((t - dropAt) / stepB + 1)));
      if (t < dropAt) lvl = 4;
      let fill = 0;
      if (p.satellite && t >= fillAt) fill = Math.min(4, Math.floor((t - fillAt) / 0.14) + 1);
      bars.forEach((b, i) => {
        const on = fill ? i < fill : i < lvl;
        b.setAttribute('fill', on ? (fill ? BL : G) : '#d5d8dc');
      });
      const live = 1 - C.k(t, dropAt, 0.8);
      tip.setAttribute('fill', live > 0.3 ? G : RD);
      arcs.forEach((a, i) => {
        const ph2 = ((t * 0.9 + i / 3) % 1);
        const reach = 30 + ph2 * (120 + live * 260);
        a.setAttribute('r', reach);
        a.setAttribute('stroke', live > 0.3 ? G : '#c5c9cf');
        a.style.opacity = (1 - ph2) * (0.25 + 0.65 * live);
      });
      const kL = C.k(t, lostAt, 0.35, 'back');
      const lostOut = p.satellite ? C.k(t, fillAt + 0.3, 0.25) : 0;
      lost.style.opacity = C.k(t, lostAt, 0.1) * (1 - lostOut);
      lost.style.transform = `scale(${Math.max(0, kL) * (1 + 0.6 * (1 - Math.min(1, kL)))}) rotate(-8deg)`;
      if (p.satellite) {
        const sx = C.lerp(1000, 470, sOn), sy = C.lerp(-80, 70, sOn);
        sat.setAttribute('transform', `translate(${sx} ${sy + Math.sin(t * 2.2) * 4}) rotate(${(1 - sOn) * 25})`);
        sat.style.opacity = C.k(t, satAt, 0.15);
        const kb = C.k(t, fillAt - 0.25, 0.35);
        beam.setAttribute('points', `${sx - 10},${sy + 40} ${sx + 10},${sy + 40} ${px + 170},${py + 10} ${px},${py + 10}`);
        beam.setAttribute('opacity', kb * (0.22 + Math.sin(t * 6) * 0.05));
        beam.setAttribute('fill', BL);
        const kO = C.k(t, fillAt + 0.6, 0.35, 'back');
        okEl.style.opacity = C.k(t, fillAt + 0.6, 0.12);
        okEl.style.transform = `scale(${Math.max(0, kO)}) rotate(-5deg)`;
      }
      stick(t);
    };
  };

  // ------------------------------------------------------------ trStrike ---
  // "Nur Satelliten-Internet" gets a red strike, the new label slides in.
  S.trStrike = (st, p, ctx) => {
    const card = T.card(st, p.card);
    if (p.brand) T.header(card, p.brand, p.context);
    C.h('div', { style: { fontSize: (p.size || 64) + 'px', fontWeight: 900, color: INK, letterSpacing: '-1px', marginBottom: '22px' } }, card, T.rich(p.title, p.accent ? C.color(p.accent) : BL));
    const oldRow = C.h('div', { style: { position: 'relative', display: 'inline-block', padding: '14px 28px', borderRadius: '18px', background: '#eef0f2', color: INK, fontSize: '40px', fontWeight: 800 } }, card, p.old || '');
    const line = C.h('div', { style: { position: 'absolute', left: '-8px', top: '50%', height: '8px', marginTop: '-4px', width: '0%', borderRadius: '4px', background: RD } }, oldRow);
    const nw = C.h('div', { style: { marginTop: '24px', padding: '22px 30px', borderRadius: '24px', border: `5px solid ${GL}`, background: '#f2fbf6', color: G, fontSize: (p.newSize || 50) + 'px', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1.1 } }, card, T.rich(p.new || '', INK));
    nw.dataset.own = 1;
    if (p.sub) { const sb = C.h('div', { style: { fontSize: '30px', fontWeight: 700, color: '#4b5058', marginTop: '20px' } }, card, T.rich(p.sub)); sb.dataset.own = 1; sb.className = 'trsub'; }
    const subEl = card.querySelector('.trsub');
    const pills = p.pills ? T.pills(card, p.pills) : [];
    pills.forEach((x) => (x.parentNode.dataset.own = 1));
    const strikeAt = p.strikeAt ?? 0.8, newAt = p.newAt ?? strikeAt + 0.6, pillsAt = p.pillsAt ?? newAt + 0.7;
    ctx.cue('whoosh', 0, 0.8); ctx.cue('marker', strikeAt, 0.6); ctx.cue('error', strikeAt + 0.25, 0.25);
    ctx.cue('whoosh', newAt - 0.1, 0.55); ctx.cue('pop', newAt + 0.2, 0.6);
    T.pillSfx(ctx, pills.length, pillsAt, 0.18);
    const stick = T.sticker(st, p.sticker, ctx);
    return (t) => {
      T.enter(card, t);
      line.style.width = C.k(t, strikeAt, 0.4, 'inOut') * 106 + '%';
      oldRow.style.opacity = 1 - 0.5 * C.k(t, strikeAt + 0.4, 0.3);
      oldRow.style.transform = `rotate(${C.k(t, strikeAt + 0.3, 0.3, 'back') * -2}deg)`;
      const k = C.k(t, newAt, 0.5, 'back');
      nw.style.opacity = C.k(t, newAt, 0.15);
      nw.style.transform = `translateX(${(1 - Math.min(1, k)) * 80}px) scale(${0.9 + 0.1 * Math.max(0, k)})`;
      if (subEl) subEl.style.opacity = C.k(t, newAt + 0.4, 0.3);
      if (pills.length) pills[0].parentNode.style.opacity = C.k(t, pillsAt - 0.1, 0.1);
      pills.forEach((el, i) => (el.style.transform = `scale(${Math.max(0, C.k(t, pillsAt + i * 0.18, 0.32, 'back'))})`));
      stick(t);
    };
  };

  // -------------------------------------------------------------- trDots ---
  // Grid of red dots ("Funklöcher") that flip to blue/green in a wave.
  S.trDots = (st, p, ctx) => {
    const card = T.card(st, p.card);
    C.h('div', { style: { fontSize: (p.size || 58) + 'px', fontWeight: 900, color: INK, letterSpacing: '-1px', marginBottom: '26px' } }, card, T.rich(p.title || '*Funklöcher*', RD));
    const cols = p.cols || 9, rows = p.rows || 5, D = 64, gap = 30;
    const grid = C.h('div', { style: { display: 'grid', gridTemplateColumns: `repeat(${cols}, ${D}px)`, gap: gap + 'px', justifyContent: 'center' } }, card);
    const to = C.color(p.to || BL);
    const dots = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const d = C.h('div', { style: { width: D + 'px', height: D + 'px', borderRadius: '50%', background: RD } }, grid);
      dots.push({ d, at: (p.flipAt ?? 1.0) + (c / cols) * 0.9 + C.rand(r * 31 + c) * 0.35 });
    }
    const cap = C.h('div', { class: 'ctr', style: { justifyContent: 'space-between', marginTop: '28px', fontSize: '34px', fontWeight: 900 } }, card);
    const capL = C.h('span', { style: { color: RD } }, cap, p.before || 'Kein Netz');
    const capR = C.h('span', { style: { color: to } }, cap, p.after || 'Netz');
    const flipAt = p.flipAt ?? 1.0;
    ctx.cue('whoosh', 0, 0.8); ctx.cue('alert', 0.4, 0.25);
    ctx.cue('whoosh', flipAt - 0.1, 0.5);
    for (let i = 0; i < 8; i++) ctx.cue('tick', flipAt + i * 0.16, 0.45);
    ctx.cue('success', flipAt + 1.35, 0.5);
    const stick = T.sticker(st, p.sticker, ctx);
    return (t) => {
      T.enter(card, t);
      dots.forEach((o, i) => {
        const k = C.k(t, o.at, 0.25, 'back');
        const on = t >= o.at;
        o.d.style.background = on ? to : RD;
        const pulse = on ? 0 : Math.sin(t * 5 + i) * 0.06;
        o.d.style.transform = `scale(${(on ? 0.6 + 0.4 * Math.max(0, k) : 1) + pulse})`;
        o.d.style.opacity = on ? 1 : 0.85;
      });
      const kC = C.k(t, flipAt + 1.2, 0.3);
      capL.style.opacity = 1 - 0.6 * kC;
      capL.style.textDecoration = kC > 0.5 ? 'line-through' : 'none';
      capR.style.opacity = 0.25 + 0.75 * kC;
      capR.style.transform = `scale(${1 + 0.15 * Math.sin(Math.PI * Math.min(1, kC))})`;
      stick(t);
    };
  };

  // -------------------------------------------------------------- trYear ---
  // Rollout card: small label, big year that rolls (2026 -> 2027), progress
  // bar that only gets part of the way, then a "NICHT FERTIG" stamp.
  S.trYear = (st, p, ctx) => {
    const card = T.card(st, p.card);
    C.h('div', { style: { fontSize: (p.size || 58) + 'px', fontWeight: 900, color: INK, letterSpacing: '-1px', textAlign: 'center' } }, card, T.rich(p.title || 'Der *Rollout*', BL));
    if (p.label) C.h('div', { style: { fontSize: '30px', fontWeight: 800, color: GR, letterSpacing: '8px', textAlign: 'center', marginTop: '14px' } }, card, p.label);
    const win = C.h('div', { style: { position: 'relative', height: '190px', overflow: 'hidden', marginTop: '6px' } }, card);
    const mk = (txt) => C.h('div', { style: { position: 'absolute', left: 0, right: 0, textAlign: 'center', fontSize: '180px', fontWeight: 900, color: BL, lineHeight: '190px', letterSpacing: '-4px' } }, win, txt);
    const y1 = mk(String(p.from ?? 2026)), y2 = mk(String(p.to ?? 2027));
    const track = C.h('div', { style: { position: 'relative', height: '16px', borderRadius: '8px', marginTop: '18px', backgroundImage: `repeating-linear-gradient(90deg, #c5c9cf 0 14px, transparent 14px 26px)`, backgroundSize: '100% 4px', backgroundRepeat: 'no-repeat', backgroundPosition: '0 50%' } }, card);
    const bar = C.h('div', { style: { height: '100%', width: '0%', borderRadius: '8px', background: BL } }, track);
    if (p.sub) C.h('div', { style: { fontSize: '30px', fontWeight: 700, color: '#4b5058', marginTop: '24px', textAlign: 'center', lineHeight: 1.3 } }, card, T.rich(p.sub, BL));
    const rollAt = p.rollAt ?? 0.8, barAt = p.barAt ?? rollAt + 0.4;
    ctx.cue('whoosh', 0, 0.8); ctx.cue('tick', 0.45, 0.5);
    ctx.cue('whoosh', rollAt - 0.05, 0.45); ctx.cue('pop', rollAt + 0.3, 0.6);
    for (let i = 0; i < 5; i++) ctx.cue('tick', barAt + i * 0.17, 0.4);
    const stick = T.sticker(st, p.sticker, ctx);
    return (t) => {
      T.enter(card, t);
      const k = C.k(t, rollAt, 0.45, 'back');
      y1.style.transform = `translateY(${-Math.min(1.2, k) * 190}px)`;
      y2.style.transform = `translateY(${(1 - k) * 190}px)`;
      bar.style.width = C.k(t, barAt, 0.9, 'out') * (p.progress ?? 0.3) * 100 + '%';
      stick(t);
    };
  };

  // ------------------------------------------------------------ trHybrid ---
  // "Stadt = 5G-Mast  +  Nirgendwo = Satellit" -> result pill.
  S.trHybrid = (st, p, ctx) => {
    const card = T.card(st, p.card);
    if (p.title) C.h('div', { style: { fontSize: '54px', fontWeight: 900, color: INK, letterSpacing: '-1px', marginBottom: '26px' } }, card, T.rich(p.title, p.accent ? C.color(p.accent) : BL));
    const row = C.h('div', { class: 'ctr', style: { gap: '18px', alignItems: 'stretch', position: 'relative' } }, card);
    const items = (p.items || []).map((it, i) => {
      const d = C.h('div', { class: 'ctr', style: { flex: 1, flexDirection: 'column', gap: '10px', padding: '26px 16px', borderRadius: '28px', background: '#f6f7f8' } }, row);
      const ic = C.h('div', { class: 'ctr', style: { height: '150px' } }, d); ic.innerHTML = T.icon(it.icon, C.color(it.color || (i ? BL : G)), 140);
      C.h('div', { style: { fontSize: '28px', fontWeight: 700, color: GR } }, d, it.label || '');
      C.h('div', { style: { fontSize: '44px', fontWeight: 900, color: INK, textAlign: 'center', lineHeight: 1.05 } }, d, T.rich(it.title || ''));
      const at = it.at ?? 0.45 + i * 0.8;
      ctx.cue('whoosh', at - 0.05, 0.5); ctx.cue('pop', at + 0.25, 0.5);
      return { d, ic, at, i };
    });
    const plus = C.h('div', { class: 'ctr', style: { position: 'absolute', left: '50%', top: '50%', width: '84px', height: '84px', margin: '-42px 0 0 -42px', borderRadius: '50%', background: INK, color: '#fff', fontSize: '52px', fontWeight: 900, boxShadow: '0 0 0 9px #fff' } }, row, '+');
    const plusAt = p.plusAt ?? (items[1]?.at ?? 1) + 0.4;
    ctx.cue('impact', plusAt + 0.05, 0.25); ctx.cue('pop', plusAt + 0.05, 0.55);
    let res;
    const resAt = p.resultAt ?? plusAt + 0.6;
    if (p.result) {
      res = C.h('div', { style: { marginTop: '24px', padding: '18px 26px', borderRadius: '20px', background: INK, color: '#fff', fontSize: '36px', fontWeight: 900, textAlign: 'center' } }, card, T.rich(p.result, '#5fe39a'));
      res.dataset.own = 1;
      ctx.cue('whoosh', resAt - 0.1, 0.45); ctx.cue('ding', resAt + 0.2, 0.45);
    }
    ctx.cue('whoosh', 0, 0.8);
    const stick = T.sticker(st, p.sticker, ctx);
    return (t) => {
      T.enter(card, t);
      items.forEach((o) => {
        const k = C.k(t, o.at, 0.5, 'expo');
        o.d.style.opacity = C.k(t, o.at, 0.2);
        o.d.style.transform = `translateY(${(1 - k) * 50}px)`;
        o.ic.style.transform = `translateY(${Math.sin(t * 2 + o.i * 2) * 5}px) scale(${Math.max(0, C.k(t, o.at + 0.1, 0.45, 'back'))})`;
      });
      plus.style.transform = `scale(${Math.max(0, C.k(t, plusAt, 0.4, 'back'))}) rotate(${(1 - C.k(t, plusAt, 0.4)) * 180}deg)`;
      if (res) { const k = C.k(t, resAt, 0.45, 'back'); res.style.opacity = C.k(t, resAt, 0.15); res.style.transform = `scale(${0.85 + 0.15 * Math.max(0, k)})`; }
      stick(t);
    };
  };

  // ----------------------------------------------------------- trPartner ---
  // "Qualcomm × SpaceX": two logo tiles (chip + wordmark) slide in from the
  // sides, an × badge slams between them, a line connects them, then the
  // purpose line and date pills land. Wordmarks are typeset, not logo files
  // (pass `logo` on a side to use a real image).
  S.trPartner = (st, p, ctx) => {
    const card = T.card(st, { pad: 40, ...p.card });
    const tag = C.h('div', { style: { display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '8px 18px', borderRadius: '12px', background: '#e6eeff', color: BL, fontSize: '26px', fontWeight: 800, marginBottom: '18px' } }, card);
    const dot = C.h('span', { style: { width: '14px', height: '14px', borderRadius: '50%', background: BL } }, tag);
    tag.insertAdjacentHTML('beforeend', `<span>${p.tag || 'Offizielle Partnerschaft'}</span>`);
    if (p.title) C.h('div', { style: { fontSize: (p.size || 56) + 'px', fontWeight: 900, color: INK, letterSpacing: '-1px', lineHeight: 1.1, marginBottom: '26px' } }, card, T.rich(p.title, p.accent ? C.color(p.accent) : BL));
    const row = C.h('div', { class: 'ctr', style: { justifyContent: 'space-between', position: 'relative', height: '250px' } }, card);
    const link = C.h('div', { style: { position: 'absolute', left: '200px', right: '200px', top: '50%', height: '6px', marginTop: '-3px', borderRadius: '3px', background: `linear-gradient(90deg, ${C.brand(p.left?.brand).color}, ${C.brand(p.right?.brand).color})`, transformOrigin: '50% 50%' } }, row);
    const sides = [p.left || {}, p.right || {}].map((sd, i) => {
      const b = C.brand(sd.brand);
      const col = C.h('div', { class: 'ctr', style: { flexDirection: 'column', gap: '14px', width: '400px', height: '250px', borderRadius: '30px', background: '#f6f7f8', border: `4px solid ${b.color}22`, position: 'relative', zIndex: 1 } }, row);
      C.chip(sd.logo ? { ...b, logo: sd.logo } : sd.brand, 110, col);
      const wm = C.h('div', { style: { fontSize: (sd.wordSize || 54) + 'px', fontWeight: 900, color: sd.wordColor || b.color, letterSpacing: sd.spacing ?? '-1px', lineHeight: 1 } }, col, sd.word || b.name);
      if (sd.sub) C.h('div', { style: { fontSize: '24px', fontWeight: 700, color: GR } }, col, sd.sub);
      return { col, wm, at: p.at?.[i] ?? 0.3 + i * 0.35 };
    });
    const x = C.h('div', { class: 'ctr', style: { position: 'absolute', left: '50%', top: '50%', width: '104px', height: '104px', margin: '-52px 0 0 -52px', borderRadius: '50%', background: INK, color: '#fff', fontSize: '60px', fontWeight: 900, boxShadow: '0 0 0 10px #fff', zIndex: 2 } }, row, p.joiner || '×');
    const xAt = p.xAt ?? sides[1].at + 0.45;
    let line;
    if (p.line) { line = C.h('div', { style: { fontSize: '40px', fontWeight: 900, color: INK, marginTop: '26px', lineHeight: 1.15 } }, card, T.rich(p.line, p.accent ? C.color(p.accent) : BL)); line.dataset.own = 1; }
    const pills = p.pills ? T.pills(card, p.pills) : [];
    if (pills.length) pills[0].parentNode.dataset.own = 1;
    const lineAt = p.lineAt ?? xAt + 0.5, pillsAt = p.pillsAt ?? lineAt + 0.6;
    ctx.cue('whoosh', 0, 0.8);
    sides.forEach((sd) => { ctx.cue('whoosh', sd.at - 0.05, 0.55); ctx.cue('pop', sd.at + 0.25, 0.5); });
    ctx.cue('impact', xAt + 0.05, 0.35); ctx.cue('pop', xAt + 0.05, 0.6); ctx.cue('shine', xAt + 0.25, 0.4);
    if (line) { ctx.cue('whoosh', lineAt - 0.1, 0.45); ctx.cue('tick', lineAt + 0.1, 0.5); }
    T.pillSfx(ctx, pills.length, pillsAt, 0.18);
    const stick = T.sticker(st, p.sticker, ctx);
    return (t) => {
      T.enter(card, t);
      const ph = (t * 1.3) % 1;
      dot.style.boxShadow = `0 0 0 ${ph * 12}px rgba(47,107,255,${0.45 * (1 - ph)})`;
      sides.forEach((sd, i) => {
        const k = C.k(t, sd.at, 0.55, 'expo');
        sd.col.style.opacity = C.k(t, sd.at, 0.15);
        sd.col.style.transform = `translateX(${(1 - k) * (i ? 260 : -260)}px) translateY(${Math.sin(t * 1.6 + i * 2) * 3}px)`;
        sd.wm.style.clipPath = `inset(0 ${100 - C.k(t, sd.at + 0.2, 0.45, 'inOut') * 100}% 0 0)`;
      });
      link.style.transform = `scaleX(${C.k(t, xAt - 0.1, 0.4, 'out')})`;
      const kx = C.k(t, xAt, 0.4, 'back');
      x.style.transform = `scale(${Math.max(0, kx) * (1 + Math.sin(t * 3) * 0.02)}) rotate(${(1 - C.k(t, xAt, 0.4)) * -180}deg)`;
      x.style.boxShadow = `0 0 0 10px #fff, 0 0 0 ${10 + C.k(t, xAt + 0.1, 0.6) * 30}px rgba(47,107,255,${0.35 * (1 - C.k(t, xAt + 0.1, 0.6))})`;
      if (line) { line.style.opacity = C.k(t, lineAt, 0.15); line.style.transform = `translateY(${(1 - C.k(t, lineAt, 0.4, 'expo')) * 24}px)`; }
      if (pills.length) pills[0].parentNode.style.opacity = C.k(t, pillsAt - 0.1, 0.1);
      pills.forEach((el, i) => (el.style.transform = `scale(${Math.max(0, C.k(t, pillsAt + i * 0.18, 0.32, 'back'))})`));
      stick(t);
    };
  };

  // ----------------------------------------------------------- trInsider ---
  // Directors' Dealings: live tag, person + company chip, big amount that
  // counts up, three fact tiles, green "KAUF" stamp.
  S.trInsider = (st, p, ctx) => {
    const card = T.card(st, { pad: 44, ...p.card });
    const tone = T.tone(p.tone);
    const tag = C.h('div', { style: { display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '8px 18px', borderRadius: '12px', background: T.tint(p.tone), color: tone, fontSize: '28px', fontWeight: 800, marginBottom: '22px' } }, card);
    const dot = C.h('span', { style: { width: '14px', height: '14px', borderRadius: '50%', background: tone } }, tag);
    tag.insertAdjacentHTML('beforeend', `<span>${p.tag || 'Insider-Kauf'}</span>`);
    const head = C.h('div', { class: 'ctr', style: { justifyContent: 'flex-start', gap: '20px' } }, card);
    C.chip(p.brand || 'RHM', 104, head);
    const hn = C.h('div', {}, head);
    C.h('div', { style: { fontSize: '46px', fontWeight: 900, color: INK, lineHeight: 1.05 } }, hn, p.name || '');
    C.h('div', { style: { fontSize: '28px', fontWeight: 700, color: GR, marginTop: '4px' } }, hn, p.role || '');
    if (p.label) C.h('div', { style: { fontSize: '30px', fontWeight: 800, color: '#4b5058', marginTop: '28px' } }, card, p.label);
    const num = big(card, p.value || '', tone, p.size || 160);
    num.style.marginTop = '4px';
    const grid = C.h('div', { class: 'ctr', style: { gap: '14px', marginTop: '26px', alignItems: 'stretch' } }, card);
    grid.dataset.own = 1;
    const tiles = (p.facts || []).map((f, i) => {
      const d = C.h('div', { style: { flex: 1, padding: '18px 20px', borderRadius: '22px', background: '#f2f3f5' } }, grid);
      C.h('div', { style: { fontSize: '24px', fontWeight: 700, color: GR } }, d, f.label);
      C.h('div', { style: { fontSize: (f.size || 44) + 'px', fontWeight: 900, color: INK, letterSpacing: '-1px', whiteSpace: 'nowrap' } }, d, f.value);
      return { d, at: (p.factsAt ?? 2.0) + i * 0.22 };
    });
    const stamp = stampEl(card, p.stamp || 'KAUF', tone, 700, 40, 52);
    const at = p.at ?? 0.6, stampAt = p.stampAt ?? at + (p.countDur ?? 1.1) + 0.1;
    ctx.cue('whoosh', 0, 0.8); ctx.cue('pop', 0.3, 0.45);
    T.countSfx(ctx, p.value, at, p.countDur ?? 1.1);
    ctx.cue('stamp', stampAt, 0.7);
    if (tiles.length) ctx.cue('whoosh', tiles[0].at - 0.08, 0.4);
    tiles.forEach((tl) => ctx.cue('tick', tl.at + 0.05, 0.55));
    const stick = T.sticker(st, p.sticker, ctx);
    return (t) => {
      T.enter(card, t);
      const ph = (t * 1.4) % 1;
      dot.style.boxShadow = `0 0 0 ${ph * 12}px ${tone}${Math.round(0x70 * (1 - ph)).toString(16).padStart(2, '0')}`;
      num.textContent = countable(p.value) ? C.count(p.value, C.k(t, at, p.countDur ?? 1.1, 'out')) : p.value;
      num.style.transform = `scale(${1 + 0.06 * Math.sin(Math.PI * C.k(t, at + (p.countDur ?? 1.1) - 0.05, 0.3))})`;
      num.style.transformOrigin = '0 50%';
      const kS = C.k(t, stampAt, 0.35, 'back');
      stamp.style.opacity = C.k(t, stampAt, 0.1);
      stamp.style.transform = `scale(${Math.max(0, kS) * (1 + 0.7 * (1 - Math.min(1, kS)))}) rotate(-10deg)`;
      tiles.forEach((tl) => {
        const k = C.k(t, tl.at, 0.45, 'back');
        tl.d.style.opacity = C.k(t, tl.at, 0.12);
        tl.d.style.transform = `translateY(${(1 - Math.min(1, k)) * 30}px) scale(${0.9 + 0.1 * Math.max(0, k)})`;
      });
      stick(t);
    };
  };

  // ------------------------------------------------------------ trWallet ---
  // Phone-wallet card: EU-star badge, balance counts up, payments slide in,
  // then everything greys out, a red lock drops in and a stamp hits
  // ("EINGEFROREN?") with a shake.
  T.euStars = (size = 64) => {
    const st = [...Array(12)].map((_, i) => { const a = (i / 12) * Math.PI * 2; return `<text x="${50 + Math.sin(a) * 32}" y="${50 - Math.cos(a) * 32 + 5}" text-anchor="middle" font-size="15" fill="#ffcc00">★</text>`; }).join('');
    return `<svg width="${size}" height="${size}" viewBox="0 0 100 100"><rect width="100" height="100" rx="24" fill="#003399"/>${st}<text x="50" y="62" text-anchor="middle" font-size="34" font-weight="900" fill="#fff" font-family="Inter, sans-serif">€</text></svg>`;
  };
  S.trWallet = (st, p, ctx) => {
    const card = T.card(st, { pad: 40, ...p.card });
    const inner = C.h('div', {}, card);
    const head = C.h('div', { class: 'ctr', style: { justifyContent: 'flex-start', gap: '18px' } }, inner);
    C.h('div', {}, head).innerHTML = T.euStars(84);
    const hn = C.h('div', {}, head);
    C.h('div', { style: { fontSize: '40px', fontWeight: 900, color: INK } }, hn, p.title || 'Digitaler Euro');
    C.h('div', { style: { fontSize: '26px', fontWeight: 700, color: GR } }, hn, p.subtitle || 'Wallet');
    C.h('div', { style: { fontSize: '30px', fontWeight: 800, color: GR, marginTop: '28px' } }, inner, p.label || 'Guthaben');
    const num = big(inner, p.balance || '0 €', INK, p.size || 150);
    const rows = (p.rows || []).map((r, i) => {
      const el = C.h('div', { class: 'ctr', style: { justifyContent: 'space-between', padding: '18px 22px', borderRadius: '18px', background: '#f2f3f5', marginTop: i ? '12px' : '24px', fontSize: '32px', fontWeight: 800, color: INK } }, inner);
      el.innerHTML = `<span>${r.icon ? r.icon + ' ' : ''}${r.text}</span><span style="color:${r.value && String(r.value).trim().startsWith('+') ? G : INK}">${r.value || ''}</span>`;
      return { el, at: (p.rowsAt ?? 1.3) + i * (p.rowStep ?? 0.35) };
    });
    const lock = C.h('div', { class: 'ctr', style: { position: 'absolute', left: p.lockX || '50%', top: p.lockY || '42%', width: '170px', height: '170px', margin: '-85px 0 0 -85px', borderRadius: '50%', background: RD, boxShadow: '0 0 0 14px rgba(229,57,47,.18)', opacity: 0 } }, card);
    lock.innerHTML = `<svg width="90" height="100" viewBox="0 0 90 100"><path d="M22 44 V30 a23 23 0 0 1 46 0 V44" fill="none" stroke="#fff" stroke-width="11" stroke-linecap="round" class="shackle"/><rect x="8" y="42" width="74" height="54" rx="12" fill="#fff"/><circle cx="45" cy="64" r="8" fill="${RD}"/><rect x="41" y="66" width="8" height="16" rx="3" fill="${RD}"/></svg>`;
    lock.dataset.own = 1;
    const shackle = lock.querySelector('.shackle');
    const stamp = stampEl(card, p.lockText || 'EINGEFROREN?', RD, 0, 0, 62);
    stamp.style.left = '50%'; stamp.style.top = '68%';
    const at = p.at ?? 0.4, lockAt = p.lockAt ?? 3.0, stampAt = lockAt + 0.45;
    ctx.cue('whoosh', 0, 0.8);
    T.countSfx(ctx, p.balance, at, p.countDur ?? 0.8);
    if (rows.length) ctx.cue('whoosh', rows[0].at - 0.1, 0.35);
    rows.forEach((r) => ctx.cue('tick', r.at + 0.05, 0.5));
    ctx.cue('whoosh-down', lockAt - 0.1, 0.55); ctx.cue('lock', lockAt + 0.3, 0.8);
    ctx.cue('stamp', stampAt, 0.8); ctx.cue('error', stampAt + 0.05, 0.35);
    const stick = T.sticker(st, p.sticker, ctx);
    return (t) => {
      T.enter(card, t);
      num.textContent = countable(p.balance) ? C.count(p.balance, C.k(t, at, p.countDur ?? 0.8, 'out'), p.from) : p.balance;
      rows.forEach((r) => { const k = C.k(t, r.at, 0.4, 'expo'); r.el.style.opacity = C.k(t, r.at, 0.12); r.el.style.transform = `translateX(${(1 - k) * 60}px)`; });
      const kG = C.k(t, lockAt, 0.4);
      inner.style.filter = `grayscale(${kG}) blur(${kG * 3}px)`;
      inner.style.opacity = 1 - 0.45 * kG;
      const kL = C.k(t, lockAt, 0.45, 'back');
      lock.style.opacity = C.k(t, lockAt, 0.12);
      const shake = t > stampAt && t < stampAt + 0.4 ? Math.sin(t * 70) * 10 * (stampAt + 0.4 - t) / 0.4 : 0;
      lock.style.transform = `translateY(${(1 - Math.min(1, kL)) * -120}px) scale(${Math.max(0, kL)}) rotate(${shake}deg)`;
      shackle.setAttribute('transform', `translate(0 ${C.k(t, lockAt + 0.25, 0.15) * 8 - 8 + 8})`);
      const kS = C.k(t, stampAt, 0.35, 'back');
      stamp.style.opacity = C.k(t, stampAt, 0.1);
      stamp.style.transform = `translate(-50%, -50%) scale(${Math.max(0, kS) * (1 + 0.7 * (1 - Math.min(1, kS)))}) rotate(-8deg)`;
      card.style.translate = shake ? `${shake * 0.8}px 0` : '0 0';
      stick(t);
    };
  };
})();
