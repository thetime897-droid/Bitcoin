// Scene library. Each scene builds its DOM/SVG once into the 1080x860 stage and
// returns update(t) which positions everything for time t (seconds).
// Visual language copied from the reference: dark glass panels, white logo
// chips, isometric pads, neon green/red/cyan glow, count-up numbers, stamps.
(function () {
  const C = window.Clip;
  const S = (C.scenes = {});
  const G = C.COLORS;

  // Optional rubber stamp ("AUSVERKAUFT", "LÄUFT") that slams in at p.stamp.at.
  const addStamp = (st, p, ctx, def = {}) => {
    if (!p.stamp) return () => {};
    const sp = { at: 1.4, color: 'red', y: 700, ...def, ...p.stamp };
    const col = C.color(sp.color);
    const el = C.place(C.h('div', { class: 'stamp', style: { color: col, fontSize: (sp.size || 64) + 'px' } }, st, sp.text || ''), sp.x ?? 540, sp.y);
    C.fit(el, 780);
    ctx.cue('stamp', sp.at);
    return (t) => {
      const ks = C.k(t, sp.at, 0.28);
      C.tf(el, { s: C.lerp(2.2, 1, ks) * (1 + Math.sin(t * 2.6) * 0.012 * ks), r: (sp.rotate ?? -8) + Math.sin(t * 1.9) * 0.9 * ks, o: ks });
      ctx.flash(t, sp.at + 0.12, col + '55');
    };
  };

  // ---------------------------------------------------------------- hook ---
  // Red alarm badge over the face cam (render with --alpha). "AI BUBBLE POP SIGNAL 🚨"
  S.hook = (st, p, ctx) => {
    // Faceless default: badge sits mid-frame on pulsing alarm rings. With a
    // face cam (layout "top" + --alpha) it sits high, like the reference.
    const full = ctx.frame.classList.contains('layout-full');
    const cy = p.y ?? (full ? 820 : 330);
    const rings = full && p.rings !== false ? C.svg(ctx.frame, 1080, 1920) : null;
    const ringEls = rings ? [0, 1, 2, 3].map(() => C.s('circle', { cx: 540, cy, fill: 'none', stroke: C.color(p.color || 'red'), 'stroke-width': 4, filter: 'url(#glow-sm)' }, rings)) : [];
    const wrap = C.place(C.h('div', { class: 'ctr', style: { flexDirection: 'column', gap: '22px' } }, ctx.frame), 540, cy);
    wrap.style.zIndex = 6;
    const badge = C.h('div', { class: 'badge', style: {
      background: `linear-gradient(180deg, ${C.color(p.color || '#ff2d2d')} 0%, #c30d0d 100%)`, fontSize: (p.size || 74) + 'px',
      padding: '14px 34px', borderRadius: '22px', fontFamily: "'Inter Display', var(--font)", letterSpacing: '-1px',
      boxShadow: '0 10px 40px rgba(255,0,0,.45), inset 0 2px 0 rgba(255,255,255,.35)', position: 'relative', overflow: 'hidden',
    } }, wrap, `${p.text || 'HOOK'}${p.emoji ? ' <span>' + p.emoji + '</span>' : ''}`);
    C.fit(badge, 960);
    const shine = C.h('div', { style: { position: 'absolute', top: '-20%', bottom: '-20%', width: '120px', left: '0',
      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent)', transform: 'skewX(-20deg)' } }, badge);
    const sub = p.sub ? C.h('div', { style: { fontSize: '46px', fontWeight: 800, color: '#fff', textShadow: '0 3px 12px rgba(0,0,0,.8)' } }, wrap, p.sub) : null;
    ctx.cue('whoosh', 0); ctx.cue('impact', 0.05); ctx.cue('shine', 0.6);
    if (sub) ctx.cue('pop', 0.45);
    return (t) => {
      const k = C.k(t, 0.05, 0.5, 'back');
      const shake = t > 0.3 && t < 0.6 ? Math.sin(t * 90) * 6 * (0.6 - t) / 0.3 : 0;
      badge.style.transform = `scale(${C.lerp(1.6, 1, k) * (1 + Math.sin(Math.max(0, t - 1) * 5) * 0.012)}) rotate(${C.lerp(-6, 0, k) + shake * 0.3}deg)`;
      badge.style.opacity = C.k(t, 0.05, 0.15);
      shine.style.left = C.lerp(-160, 1000, C.k(t, 0.6, 0.7, 'inOut')) + 'px';
      if (sub) { const s = C.k(t, 0.45, 0.4); sub.style.opacity = s; sub.style.transform = `translateY(${(1 - s) * 24}px)`; }
      ringEls.forEach((r, i) => {
        const ph = ((t + i * 0.55) / 2.2) % 1;
        r.setAttribute('r', 160 + ph * 420);
        r.style.opacity = C.k(t, 0.3, 0.3) * (1 - ph) * 0.7;
      });
      if (full) ctx.tint(C.k(t, 0, 0.5) * 0.8, 'red');
      ctx.flash(t, 0.05, 'rgba(255,40,40,.35)');
    };
  };

  // ----------------------------------------------------------- statement ---
  // Kinetic typography for sentences without data, so faceless videos never
  // fall back to an empty frame. Wrap key words in *stars* to highlight them.
  S.statement = (st, p, ctx) => {
    const col = C.color(p.color || 'cyan');
    const icon = p.icon ? C.place(C.h('div', { style: { fontSize: '150px', lineHeight: 1, filter: `drop-shadow(0 0 30px ${col}88)` } }, st, p.icon), 540, 170) : null;
    const box = C.place(C.h('div', { class: 'ctr', style: { flexWrap: 'wrap', width: '820px', gap: '6px 24px', textAlign: 'center' } }, st), 540, icon ? 520 : 430);
    const paper = ctx.theme === 'paper';
    const words = String(p.text || '').split(/\s+/).filter(Boolean).map((w) => {
      const hl = /^\*.*\*[.,!?:]*$/.test(w);
      const clean = w.replace(/\*/g, '');
      const el = C.h('span', { style: { display: 'inline-block', fontSize: (p.size || 92) + 'px', fontWeight: 900, lineHeight: 1.12, letterSpacing: '-1px',
        color: hl && !paper ? col : 'var(--text)', textShadow: hl && !paper ? `0 0 28px ${col}` : 'none', position: 'relative' } }, box, clean);
      const ul = hl && !paper ? C.h('span', { style: { position: 'absolute', left: 0, right: 0, bottom: '-4px', height: '8px', borderRadius: '4px', background: col, boxShadow: `0 0 16px ${col}`, transformOrigin: '0 50%' } }, el) : null;
      return { el, hl, ul };
    });
    const stagger = p.stagger ?? Math.min(0.14, 1.3 / Math.max(1, words.length));
    ctx.cue('whoosh', 0.05, 0.7);
    if (icon) ctx.cue('pop', 0.05);
    words.forEach((w, i) => w.hl && (paper ? ctx.mark(w.el, 0.15 + i * stagger + 0.3, 0.4) : ctx.cue('ping', 0.15 + i * stagger + 0.25, 0.7)));
    const stampUp = addStamp(st, p, ctx, { y: icon ? 800 : 720, at: 0.15 + words.length * stagger + 0.4 });
    return (t) => {
      stampUp(t);
      if (icon) { C.pop(icon, t, 0.05, 0.5); icon.style.marginTop = Math.sin(t * 2.4) * 10 + 'px'; }
      words.forEach((w, i) => {
        const s = 0.15 + i * stagger;
        const k = C.k(t, s, 0.4, 'back');
        const bump = w.hl ? 1 + Math.sin(C.clamp((t - s - 0.25) / 0.35) * Math.PI) * 0.12 : 1;
        w.el.style.transform = `translateY(${(1 - k) * 50 + Math.sin(t * 2.2 + i * 0.7) * 3 * k}px) scale(${Math.max(0, k) * bump})`;
        w.el.style.opacity = C.k(t, s, 0.15);
        if (w.ul) w.ul.style.transform = `scaleX(${C.k(t, s + 0.3, 0.35)})`;
      });
    };
  };

  // ---------------------------------------------------------------- flow ---
  // Sources on iso pads, glowing pipes into a hub, money particles flowing.
  S.flow = (st, p, ctx) => {
    const src = (p.sources || ['MSFT', 'GOOGL', 'AMZN']).map(C.brand);
    const n = src.length, gap = Math.min(270, 900 / n);
    const xs = src.map((_, i) => 540 + (i - (n - 1) / 2) * gap);
    const padY = 330, hubX = 540, hubY = 640;
    const flowColor = C.color(p.color || 'green');
    const warnColor = C.color(p.warnColor || 'amber');
    const svg = C.svg(st);
    const pads = xs.map((x) => C.isoBox(svg, x, padY, 62, 26, { top: '#173b2c', left: '#0d2219', right: '#0a1a13', stroke: 'rgba(46,232,106,.55)' }));
    const pipes = xs.map((x) => {
      const d = `M${x},${padY + 40} C${x},${padY + 190} ${hubX},${hubY - 190} ${hubX},${hubY - 20}`;
      const bg = C.s('path', { d, class: 'pipe-bg' }, svg);
      const path = C.s('path', { d, class: 'pipe', stroke: flowColor, filter: 'url(#glow)' }, svg);
      const L = path.getTotalLength();
      path.style.strokeDasharray = L;
      return { path, bg, L };
    });
    const hub = C.isoBox(svg, hubX, hubY, 120, 40, { top: '#0f2230', left: '#0a1720', right: '#07121a', stroke: G.cyan, sw: 2.5 });
    const hubInner = C.isoBox(svg, hubX, hubY - 6, 70, 10, { top: '#123246', left: '#0b2030', right: '#081824', stroke: 'rgba(63,208,255,.6)', sw: 1.5 });
    const parts = [];
    const N = 16;
    pipes.forEach((pp, i) => {
      for (let j = 0; j < N; j++) parts.push({ i, j, el: C.s('rect', { width: 18, height: 10, rx: 2, fill: flowColor, filter: 'url(#glow-sm)' }, svg) });
    });
    const chips = src.map((b, i) => C.place(C.chip(b, 104, st), xs[i], padY - 70));
    const names = src.map((b, i) => C.place(C.h('div', { class: 'label', style: { fontSize: '24px' } }, st, b.name), xs[i], padY - 160));
    const qs = src.map((b, i) => C.place(C.h('div', { class: 'ctr', style: { width: '44px', height: '44px', borderRadius: '50%', background: warnColor, color: '#1a1000', fontWeight: 900, fontSize: '30px', boxShadow: `0 0 20px ${warnColor}` } }, st, '?'), xs[i] + 46, padY - 20));
    const hubLabel = C.place(C.h('div', { class: 'tag', style: { color: G.cyan, fontSize: '30px', padding: '6px 22px', borderRadius: '30px' } }, st, p.target?.label || p.target || 'AI'), hubX, hubY + 130);
    const warnAt = p.warnAt ?? Infinity;
    ctx.cue('whoosh', 0);
    src.forEach((_, i) => ctx.cue('pop', 0.1 + i * 0.16));
    ctx.cue('whoosh', 0.75, 0.8); ctx.cue('coins', 1.2, 0.7);
    ctx.cue('alert', warnAt, 0.6);
    const stampUp = addStamp(st, p, ctx, { y: 480, color: 'green', at: 3 });
    return (t) => {
      stampUp(t);
      const kw = C.k(t, warnAt, 0.5);
      src.forEach((b, i) => {
        const s = 0.1 + i * 0.16;
        C.pop(chips[i], t, s);
        const kn = C.k(t, s, 0.3);
        names[i].style.opacity = kn;
        names[i].style.color = t > s && t < s + 0.7 ? G.cyan : 'var(--text)';
        const kp = C.k(t, s + 0.05, 0.45);
        pads[i].style.opacity = kp;
        pads[i].style.transform = `translateY(${(1 - kp) * 30}px)`;
        C.pop(qs[i], t, warnAt + i * 0.12, 0.4);
      });
      const kh = C.k(t, 0.6, 0.45, 'back');
      [hub, hubInner].forEach((g) => { g.style.opacity = C.k(t, 0.6, 0.2); g.style.transformOrigin = `${hubX}px ${hubY}px`; g.style.transform = `scale(${kh})`; });
      C.pop(hubLabel, t, 0.85);
      const col = C.mix(flowColor, warnColor, kw);
      pipes.forEach((pp, i) => {
        const k = C.k(t, 0.8 + i * 0.1, 0.6, 'inOut');
        pp.path.style.strokeDashoffset = pp.L * (1 - k);
        pp.path.setAttribute('stroke', col);
        pp.path.style.opacity = 1 - kw * 0.45;
        pp.bg.style.opacity = C.k(t, 0.8 + i * 0.1, 0.4);
      });
      const flowT = t - 1.2;
      const speed = C.lerp(0.55, 0.22, kw);
      parts.forEach((q) => {
        const pp = pipes[q.i];
        if (flowT < 0) { q.el.style.opacity = 0; return; }
        // integrate speed change so particles do not jump when the warn beat hits
        const travel = t < warnAt ? flowT * 0.55 : (warnAt - 1.2) * 0.55 + (t - warnAt) * speed;
        const ph = (travel + q.j / N + C.rand(q.i * 50 + q.j) * 0.05) % 1;
        const pt = pp.path.getPointAtLength(ph * pp.L);
        const jx = (C.rand(q.j * 7 + q.i) - 0.5) * 22, jy = (C.rand(q.j * 13 + q.i) - 0.5) * 12;
        q.el.setAttribute('x', pt.x + jx - 9); q.el.setAttribute('y', pt.y + jy - 5);
        q.el.setAttribute('transform', `rotate(${C.rand(q.j * 3 + q.i) * 80 - 40} ${pt.x + jx} ${pt.y + jy})`);
        q.el.setAttribute('fill', col);
        const thin = kw > 0 && q.j % 3 !== 0 ? 1 - kw : 1;
        q.el.style.opacity = C.k(flowT, q.j * 0.03, 0.2) * (ph > 0.94 ? 0 : 1) * thin;
      });
    };
  };

  // ----------------------------------------------------------- linechart ---
  S.linechart = (st, p, ctx) => {
    const pw = 880, ph = 640;
    const panel = C.place(C.h('div', { class: 'panel corners', style: { width: pw + 'px', height: ph + 'px' } }, st), 540, 430);
    const head = C.h('div', { class: 'ctr', style: { position: 'absolute', left: '26px', top: '22px', gap: '14px', justifyContent: 'flex-start' } }, panel);
    if (p.ticker) {
      C.chip(p.ticker, 50, head);
      C.h('div', { class: 'label', style: { fontSize: '30px' } }, head, p.name || C.brand(p.ticker).ticker);
    }
    if (p.header) C.h('div', { class: 'label muted', style: { position: 'absolute', right: '28px', top: '34px', fontSize: '22px' } }, panel, p.header);

    const main = Array.isArray(p.data) ? p.data : C.walk(p.data || { from: 760, to: 697, points: 44, vol: 0.012, seed: 3 });
    const drop = p.drop ? (Array.isArray(p.drop.data) ? p.drop.data : C.walk({ from: main[main.length - 1], points: 10, vol: 0.01, seed: 9, ...(p.drop.data || { to: main[main.length - 1] * 0.917 }) })) : [];
    const all = main.concat(drop.slice(1));
    let lo = Math.min(...all), hi = Math.max(...all);
    const pad = (hi - lo) * 0.12; lo -= pad; hi += pad;
    if (p.projection) hi += (hi - lo) * 0.25;
    const ticks = C.niceTicks(lo, hi, 4).filter((v) => v >= lo && v <= hi);
    const X0 = 130, X1 = pw - 50, Y0 = 130, Y1 = ph - 90;
    const total = p.projection ? main.length * 1.6 : all.length;
    const xAt = (i) => X0 + ((X1 - X0) * i) / (total - 1);
    const yAt = (v) => Y1 - ((v - lo) / (hi - lo)) * (Y1 - Y0);
    const svg = C.svg(panel, pw, ph);
    const unit = p.unit ?? '$', dec = p.decimals ?? 2;
    const fmt = (v) => unit + v.toFixed(dec);
    if (p.yLabel) C.s('text', { x: 34, y: (Y0 + Y1) / 2, class: 'axis', transform: `rotate(-90 34 ${(Y0 + Y1) / 2})`, 'text-anchor': 'middle', 'font-size': 20 }, svg).textContent = p.yLabel;
    ticks.forEach((v) => {
      C.s('line', { x1: X0, x2: X1, y1: yAt(v), y2: yAt(v), stroke: 'var(--grid)', 'stroke-width': 2 }, svg);
      if (p.yTicks !== false) C.s('text', { x: X0 - 16, y: yAt(v) + 8, class: 'axis', 'text-anchor': 'end' }, svg).textContent = unit + (dec > 0 && v % 1 ? v.toFixed(1) : Math.round(v));
    });
    (p.xLabels || []).forEach((lab, i, a) => {
      C.s('text', { x: X0 + ((X1 - X0) * i) / Math.max(1, a.length - 1) * (a.length > 1 ? 1 : 0) + (a.length === 1 ? (X1 - X0) / 2 : 0), y: ph - 40, class: 'axis', 'text-anchor': 'middle' }, svg).textContent = lab;
    });
    const mainCol = C.color(p.color || 'cyan');
    const grad = (id, col) => {
      const lg = C.s('linearGradient', { id, x1: 0, y1: 0, x2: 0, y2: 1 }, C.s('defs', {}, svg));
      C.s('stop', { offset: 0, 'stop-color': col, 'stop-opacity': 0.35 }, lg);
      C.s('stop', { offset: 1, 'stop-color': col, 'stop-opacity': 0 }, lg);
    };
    grad('lc-a', mainCol); grad('lc-r', G.red);
    const area = C.s('path', { fill: 'url(#lc-a)' }, svg);
    const line = C.s('path', { fill: 'none', stroke: mainCol, 'stroke-width': 5, 'stroke-linejoin': 'round', filter: 'url(#glow-sm)' }, svg);
    const dArea = C.s('path', { fill: 'url(#lc-r)' }, svg);
    const dLine = C.s('path', { fill: 'none', stroke: G.red, 'stroke-width': 6, 'stroke-linejoin': 'round', filter: 'url(#glow-sm)' }, svg);
    const dot = C.s('circle', { r: 10, fill: '#0a1219', stroke: mainCol, 'stroke-width': 5, filter: 'url(#glow-sm)' }, svg);
    const tag = C.place(C.h('div', { class: 'tag', style: { color: mainCol } }, panel), 0, 0);

    const partial = (arr, f, offset = 0) => {
      const n = Math.floor(f);
      const pts = [];
      for (let i = 0; i <= n && i < arr.length; i++) pts.push([xAt(i + offset), yAt(arr[i])]);
      if (n < arr.length - 1) {
        const r = f - n;
        pts.push([xAt(n + r + offset), yAt(C.lerp(arr[n], arr[n + 1], r))]);
      }
      return pts;
    };
    const toD = (pts) => pts.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ',' + q[1].toFixed(1)).join('');
    const toArea = (pts) => (pts.length ? toD(pts) + `L${pts[pts.length - 1][0]},${Y1}L${pts[0][0]},${Y1}Z` : '');

    const drawDur = p.drawDur ?? 1.6;
    let ev, evLine, evLab;
    if (p.event) {
      ev = { at: drawDur + 0.2, ...p.event };
      const ex = xAt(ev.index ?? main.length - 1);
      evLine = C.s('line', { x1: ex, x2: ex, y1: Y0 - 20, y2: Y1, stroke: G.cyan, 'stroke-width': 3, 'stroke-dasharray': '8 6' }, svg);
      evLab = C.place(C.h('div', { class: 'tag', style: { color: G.cyan, fontSize: '24px' } }, panel, ev.label || 'EARNINGS'), ex - 10, Y0 - 40);
      evLab.style.transformOrigin = '50% 100%';
    }
    let dr, badge, box;
    if (p.drop) {
      dr = { at: drawDur + 1.0, ...p.drop };
      const bx0 = xAt(main.length - 1) - 12, bx1 = xAt(all.length - 1) + 16;
      box = C.s('rect', { x: bx0, y: yAt(Math.max(...drop)) - 30, width: bx1 - bx0, height: yAt(Math.min(...drop)) - yAt(Math.max(...drop)) + 60, fill: 'rgba(255,59,59,.08)', stroke: G.red, 'stroke-width': 2.5, 'stroke-dasharray': '10 7', rx: 6 }, svg);
      badge = C.place(C.h('div', { class: 'ctr', style: { flexDirection: 'column', padding: '12px 24px', borderRadius: '14px', border: `3px solid ${G.red}`, background: 'rgba(40,4,6,.92)', boxShadow: `0 0 30px rgba(255,59,59,.5)` } }, panel), dr.x ?? (X0 + X1) / 2 - 20, dr.y ?? Y1 - 110);
      badge.innerHTML = `<div style="color:${G.red};font-weight:900;font-size:58px;line-height:1"></div>` + (dr.sub ? `<div class="label" style="font-size:24px;margin-top:6px">${dr.sub}</div>` : '');
    }
    let pr, prLine, prLab, prStrike;
    if (p.projection) {
      pr = { at: drawDur + 0.4, ...p.projection };
      const sx = xAt(main.length - 1), sy = yAt(main[main.length - 1]);
      const tx = X1 - 30, ty = Y0 + 10;
      prLine = C.s('path', { d: `M${sx},${sy} L${tx},${ty}`, stroke: G.green, 'stroke-width': 5, 'stroke-dasharray': '12 9', fill: 'none', 'marker-end': 'url(#arrow-g)' }, svg);
      prLab = C.place(C.h('div', { class: 'tag', style: { color: G.green, position: 'absolute' } }, panel, pr.label || 'SHOULD GO UP'), 230, 112);
      prStrike = C.h('div', { style: { position: 'absolute', left: '-6px', right: '-6px', top: '50%', height: '5px', background: G.red, transformOrigin: '0 50%', boxShadow: `0 0 10px ${G.red}` } }, prLab);
    }
    ctx.cue('whoosh', 0); ctx.cue('whoosh', 0.3, 0.5);
    if (ev) ctx.cue('ping', ev.at);
    if (pr) { ctx.cue('whoosh', pr.at, 0.7); if (pr.strikeAt != null) ctx.cue('error', pr.strikeAt); }
    if (dr) { ctx.cue('downer', dr.at); ctx.cue('impact', dr.at + 0.75); }
    const stampUp = addStamp(st, p, ctx, { y: 800, color: 'amber' });
    return (t) => {
      stampUp(t);
      C.pop(panel, t, 0, 0.45);
      const kd = C.k(t, 0.3, drawDur, 'inOut');
      const f = kd * (main.length - 1);
      const pts = partial(main, f);
      line.setAttribute('d', toD(pts)); area.setAttribute('d', toArea(pts));
      const last = pts[pts.length - 1];
      let hx = last[0], hy = last[1], hv = C.lerp(main[Math.floor(f)], main[Math.min(main.length - 1, Math.floor(f) + 1)], f % 1);
      if (dr) {
        const kdr = C.k(t, dr.at, 0.8, 'in');
        const dp = kdr > 0 ? partial(drop, kdr * (drop.length - 1), main.length - 1) : [];
        dLine.setAttribute('d', dp.length ? toD(dp) : ''); dArea.setAttribute('d', dp.length ? toArea(dp) : '');
        if (dp.length) { const q = dp[dp.length - 1]; hx = q[0]; hy = q[1]; hv = C.lerp(drop[0], drop[drop.length - 1], kdr); }
        const kb = C.k(t, dr.at + 0.7, 0.3);
        box.style.opacity = kb;
        C.pop(badge, t, dr.at + 0.75, 0.45);
        badge.firstChild.textContent = C.count(dr.badge || '-8.3%', C.k(t, dr.at + 0.75, 0.6));
        panel.style.borderColor = t > dr.at + 0.6 ? 'rgba(255,59,59,.6)' : '';
        ctx.flash(t, dr.at + 0.75, 'rgba(255,30,30,.45)');
        if (p.drop.tint !== false) ctx.tint(C.k(t, dr.at + 0.6, 0.6), 'red');
        dot.setAttribute('stroke', kdr > 0 ? G.red : mainCol);
        tag.style.color = kdr > 0 ? G.red : mainCol;
      }
      dot.setAttribute('cx', hx); dot.setAttribute('cy', hy);
      dot.style.opacity = kd > 0 ? 1 : 0;
      tag.textContent = fmt(hv);
      tag.style.left = hx + 'px'; tag.style.top = hy + (p.tagBelow ? 46 : -46) + 'px';
      tag.style.opacity = C.k(t, 0.4, 0.3) * (p.tag === false ? 0 : 1);
      if (ev) {
        const ke = C.k(t, ev.at, 0.4);
        evLine.style.opacity = ke; evLine.setAttribute('y2', C.lerp(Y0 - 20, Y1, ke));
        C.pop(evLab, t, ev.at, 0.4);
      }
      if (pr) {
        const kp = C.k(t, pr.at, 0.7, 'inOut');
        prLine.style.opacity = kp > 0 ? 1 : 0;
        const L = 1200; prLine.style.strokeDasharray = `12 9`; prLine.style.clipPath = `inset(0 ${100 - kp * 100}% 0 0)`;
        C.pop(prLab, t, pr.at, 0.4); prLab.style.transform = 'none'; prLab.style.left = '40px'; prLab.style.top = '92px';
        prLab.style.opacity = C.k(t, pr.at, 0.3);
        prStrike.style.transform = `scaleX(${pr.strikeAt != null ? C.k(t, pr.strikeAt, 0.35) : 0})`;
        if (pr.strikeAt != null) prLine.style.opacity = 1 - C.k(t, pr.strikeAt, 0.4) * 0.65;
      }
    };
  };

  // ---------------------------------------------------------------- bars ---
  // Expected vs actual style comparison with 3D bars, stamp and badge.
  S.bars = (st, p, ctx) => {
    const pw = p.width || 820, ph = 660;
    const panel = C.place(C.h('div', { class: 'panel corners', style: { width: pw + 'px', height: ph + 'px' } }, st), 540, 430);
    const head = C.h('div', { class: 'ctr', style: { position: 'absolute', left: '26px', top: '22px', gap: '14px' } }, panel);
    if (p.ticker) { C.chip(p.ticker, 50, head); C.h('div', { class: 'label', style: { fontSize: '30px' } }, head, p.name || C.brand(p.ticker).ticker); }
    if (p.header) C.h('div', { class: 'label muted', style: { position: 'absolute', right: '28px', top: '34px', fontSize: '22px' } }, panel, p.header);
    const items = p.items || [];
    const vals = items.map((i) => i.value).concat(p.line ? [p.line.value] : []);
    const lo = p.min ?? Math.min(0, ...vals), hi = p.max ?? Math.max(...vals) * 1.08;
    const X0 = 120, X1 = pw - 50, Y0 = 140, Y1 = ph - 100;
    const yAt = (v) => Y1 - ((v - lo) / (hi - lo)) * (Y1 - Y0);
    const svg = C.svg(panel, pw, ph);
    if (p.axis !== false) {
      C.niceTicks(lo, hi, 3).filter((v) => v >= lo && v <= hi).forEach((v) => {
        C.s('line', { x1: X0, x2: X1, y1: yAt(v), y2: yAt(v), stroke: 'var(--grid)', 'stroke-width': 2 }, svg);
        C.s('text', { x: X0 - 14, y: yAt(v) + 8, class: 'axis', 'text-anchor': 'end' }, svg).textContent = (p.unit ?? '') + v + (p.suffix ?? '');
      });
    }
    const n = items.length, slot = (X1 - X0) / n, bw = Math.min(170, slot * 0.55), dep = 24;
    const bars = items.map((it, i) => {
      const cx = X0 + slot * (i + 0.5);
      const g = C.s('g', {}, svg);
      const col = C.color(it.color || (it.style === 'ghost' ? '#3a4652' : 'green'));
      const ghost = it.style === 'ghost';
      const front = C.s('rect', { x: cx - bw / 2, width: bw, fill: ghost ? 'rgba(80,95,110,.25)' : col, stroke: ghost ? '#8995a3' : 'none', 'stroke-width': 3, 'stroke-dasharray': ghost ? '10 8' : '' }, g);
      const side = C.s('polygon', { fill: ghost ? 'rgba(60,70,80,.3)' : 'rgba(0,0,0,.28)' }, g);
      const top = C.s('polygon', { fill: ghost ? 'rgba(140,150,160,.25)' : 'rgba(255,255,255,.35)' }, g);
      if (!ghost) g.setAttribute('filter', 'url(#glow-sm)');
      const val = C.place(C.h('div', { style: { fontWeight: 900, fontSize: '40px', color: ghost ? 'var(--text)' : col } }, panel), cx, 0);
      const lab = C.place(C.h('div', { class: 'label muted', style: { fontSize: '26px' } }, panel, it.label || ''), cx, Y1 + 40);
      return { it, cx, front, side, top, val, lab, col, ghost };
    });
    let line, lineLab;
    if (p.line) {
      line = C.s('line', { x1: X0 - 10, x2: X1, y1: yAt(p.line.value), y2: yAt(p.line.value), stroke: C.color(p.line.color || 'cyan'), 'stroke-width': 4, filter: 'url(#glow-sm)' }, svg);
      lineLab = C.place(C.h('div', { class: 'label', style: { color: C.color(p.line.color || 'cyan'), fontSize: '24px' } }, panel, p.line.label || ''), X0 + 90, yAt(p.line.value) - 26);
    }
    const q = p.revealAt != null ? C.place(C.h('div', { style: { fontSize: '260px', fontWeight: 900, color: G.cyan, textShadow: `0 0 40px ${G.cyan}` } }, panel, '?'), pw / 2, ph / 2 + 20) : null;
    const start = p.revealAt ?? 0.4;
    const stamp = p.stamp ? C.place(C.h('div', { class: 'stamp', style: { color: C.color(p.stamp.color || 'green') } }, panel, p.stamp.text || 'BEAT'), p.stamp.x ?? X0 + slot * 0.55, p.stamp.y ?? Y0 + 20) : null;
    const badge = p.badge ? C.place(C.h('div', { class: 'badge', style: { background: `linear-gradient(180deg, ${C.color(p.badge.color || 'gold')}, #c98a00)`, color: '#2a1a00', fontSize: '24px', padding: '6px 16px', borderRadius: '20px' } }, panel, p.badge.text), bars[p.badge.index ?? n - 1]?.cx ?? pw / 2, 0) : null;
    ctx.cue('whoosh', 0);
    if (q) ctx.cue('pop', 0.2);
    items.forEach((it, i) => ctx.cue('pop', start + i * 0.25, 0.6));
    if (stamp) { const at = p.stamp.at ?? start + 1.3; ctx.cue('riser', at - 1.1, 0.6); ctx.cue('stamp', at); }
    if (badge) ctx.cue('ding', p.badge.at ?? start + 2);
    return (t) => {
      C.pop(panel, t, 0, 0.45);
      if (q) { const kq = C.k(t, start - 0.15, 0.3); C.tf(q, { s: 1 + kq * 0.3, o: (1 - kq) * C.k(t, 0.2, 0.3) }); }
      bars.forEach((b, i) => {
        const k = C.k(t, start + i * 0.25, 0.8, 'out');
        const v = C.lerp(lo, b.it.value, k);
        const y = yAt(v), h = Y1 - y;
        b.front.setAttribute('y', y); b.front.setAttribute('height', Math.max(0, h));
        const x1 = b.cx + bw / 2;
        b.side.setAttribute('points', `${x1},${y} ${x1 + dep},${y - dep * 0.6} ${x1 + dep},${Y1 - dep * 0.6} ${x1},${Y1}`);
        b.top.setAttribute('points', `${b.cx - bw / 2},${y} ${x1},${y} ${x1 + dep},${y - dep * 0.6} ${b.cx - bw / 2 + dep},${y - dep * 0.6}`);
        const vis = k > 0 ? 1 : 0;
        [b.front, b.side, b.top].forEach((e) => (e.style.opacity = vis));
        if (b.it.colorAt != null && !b.ghost) {
          const kc = C.k(t, b.it.colorAt, 0.3);
          const c = C.mix('#6b7682', b.col.startsWith('#') ? b.col : '#2ee86a', kc);
          b.front.setAttribute('fill', c); b.val.style.color = c;
        }
        b.val.textContent = C.count(b.it.text ?? b.it.value, k, Math.max(0, lo));
        b.val.style.top = y - 44 + 'px'; b.val.style.opacity = C.k(t, start + i * 0.25 + 0.1, 0.3);
        b.lab.style.opacity = C.k(t, start, 0.3);
        if (badge && i === (p.badge.index ?? n - 1)) badge.style.top = y - 100 + 'px';
      });
      if (line) {
        const kl = C.k(t, p.line.at ?? start + 0.2, 0.6, 'inOut');
        line.setAttribute('x2', C.lerp(X0 - 10, X1, kl)); line.style.opacity = kl > 0 ? 1 : 0;
        lineLab.style.opacity = kl;
      }
      if (stamp) {
        const at = p.stamp.at ?? start + 1.3;
        const ks = C.k(t, at, 0.28, 'out');
        C.tf(stamp, { s: C.lerp(2.2, 1, ks), r: -8, o: ks });
        ctx.flash(t, at + 0.15, `${C.color(p.stamp.color || 'green')}55`);
      }
      if (badge) C.pop(badge, t, p.badge.at ?? start + 2, 0.4);
    };
  };

  // -------------------------------------------------------------- series ---
  // Many small bars growing left to right (e.g. cash flow by year).
  S.series = (st, p, ctx) => {
    const pw = 860, ph = 560;
    const panel = C.place(C.h('div', { class: 'panel', style: { width: pw + 'px', height: ph + 'px', background: 'transparent', border: '0', boxShadow: 'none' } }, st), 540, 430);
    const head = C.h('div', { class: 'ctr', style: { position: 'absolute', left: '20px', top: '0', gap: '14px' } }, panel);
    if (p.ticker) C.chip(p.ticker, 52, head);
    if (p.header) C.h('div', { class: 'label', style: { fontSize: '26px' } }, head, p.header);
    if (p.pill) C.h('div', { class: 'tag', style: { position: 'absolute', left: '20px', top: '76px', color: G.cyan, fontSize: '22px', borderRadius: '20px' } }, panel, '• ' + p.pill);
    const vals = p.values || [3, 4, 5, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15];
    const lo = Math.min(0, ...vals), hi = Math.max(...vals);
    const X0 = 30, X1 = pw - 30, Y0 = 170, Y1 = ph - 90;
    const y0 = Y1 - ((0 - lo) / (hi - lo)) * (Y1 - Y0);
    const yAt = (v) => y0 - (v / (hi - lo)) * (Y1 - Y0);
    const svg = C.svg(panel, pw, ph);
    C.s('line', { x1: X0, x2: X1, y1: y0, y2: y0, stroke: 'var(--muted)', 'stroke-width': 2, opacity: 0.5 }, svg);
    const slot = (X1 - X0) / vals.length, bw = slot * 0.62;
    const col = C.color(p.color || 'green');
    const hl = p.highlight;
    const bars = vals.map((v, i) => {
      const c = hl && (hl.index ?? vals.length - 1) === i ? C.color(hl.color || 'red') : col;
      return { v, c, el: C.s('rect', { x: X0 + slot * i + (slot - bw) / 2, width: bw, rx: 3, fill: c, filter: 'url(#glow-sm)' }, svg) };
    });
    if (p.startLabel) C.place(C.h('div', { class: 'axis-dom' }, panel, p.startLabel), X0 + slot / 2, Y1 + 40);
    const endLab = p.endLabel ? C.place(C.h('div', { class: 'axis-dom', style: { fontWeight: 800 } }, panel, p.endLabel), X1 - slot / 2, Y1 + 40) : null;
    const badge = hl?.badge ? C.place(C.h('div', { class: 'tag', style: { color: C.color(hl.color || 'red'), fontSize: '28px', padding: '10px 26px', boxShadow: `0 0 24px ${C.color(hl.color || 'red')}66` } }, panel, hl.badge), pw / 2 + 100, ph + 30) : null;
    const step = Math.min(0.12, 1.6 / vals.length);
    ctx.cue('whoosh', 0);
    vals.forEach((_, i) => ctx.cue('tick', 0.3 + i * step, 0.7));
    if (hl) ctx.cue('error', hl.at ?? 0.3 + vals.length * step + 0.4);
    return (t) => {
      panel.style.opacity = C.k(t, 0, 0.3);
      bars.forEach((b, i) => {
        const k = C.k(t, 0.3 + i * step, 0.5, 'back');
        const y = yAt(b.v * Math.max(0, k));
        b.el.setAttribute('y', Math.min(y, y0)); b.el.setAttribute('height', Math.abs(y0 - y));
        b.el.style.opacity = k > 0 ? 1 : 0;
      });
      if (hl) {
        const at = hl.at ?? 0.3 + vals.length * step + 0.4;
        const last = bars[hl.index ?? vals.length - 1];
        last.el.setAttribute('fill', t < at ? col : last.c);
        if (endLab) endLab.style.color = t < at ? '' : last.c;
        if (badge) C.pop(badge, t, at + 0.15);
        ctx.flash(t, at, 'rgba(255,40,40,.3)');
      }
    };
  };

  // --------------------------------------------------------------- cards ---
  // Hierarchy of ticker cards with % change: one main card dragging others.
  S.cards = (st, p, ctx) => {
    const card = (it, w = 300) => {
      const b = C.brand(it.ticker || it);
      const ch = String(it.change ?? '');
      const neg = ch.trim().startsWith('-') || ch.trim().startsWith('−');
      const col = C.color(it.color || (neg ? 'red' : 'green'));
      const d = C.h('div', { class: 'panel ctr', style: { width: w + 'px', padding: '18px 20px', gap: '16px', justifyContent: 'flex-start', borderColor: col + 'aa', boxShadow: `0 0 34px ${col}44, inset 0 0 30px ${col}18` } }, st);
      C.chip(b, 64, d);
      const txt = C.h('div', {}, d);
      C.h('div', { class: 'label', style: { fontSize: '30px' } }, txt, it.name || b.ticker);
      const val = C.h('div', { style: { fontSize: '34px', fontWeight: 900, color: col } }, txt, ch);
      return { d, val, ch, col };
    };
    const svg = C.svg(st);
    [180, 300, 420].forEach((r) => C.s('circle', { cx: 540, cy: 120, r, fill: 'none', stroke: 'rgba(255,59,59,.12)', 'stroke-width': 2 }, svg));
    const main = p.main ? card(p.main, 340) : null;
    if (main) C.place(main.d, 540, 120);
    const items = (p.items || []).map((it) => card(it));
    const cols = p.columns || 2, rows = Math.ceil(items.length / cols);
    const pos = items.map((_, i) => {
      const r = Math.floor(i / cols), c = i % cols;
      const inRow = Math.min(cols, items.length - r * cols);
      return [540 + (c - (inRow - 1) / 2) * 360, (main ? 330 : 180) + r * (rows > 2 ? 150 : 180)];
    });
    items.forEach((it, i) => C.place(it.d, pos[i][0], pos[i][1]));
    const lines = main ? pos.map(([x, y]) => {
      const l = C.s('path', { d: `M540,180 C540,${y - 70} ${x},${y - 110} ${x},${y - 55}`, fill: 'none', stroke: items[0]?.col || G.red, 'stroke-width': 4, filter: 'url(#glow-sm)' }, svg);
      const L = l.getTotalLength(); l.style.strokeDasharray = L; return { l, L };
    }) : [];
    if (main) ctx.cue('impact', 0.15, 0.7);
    items.forEach((_, i) => ctx.cue('pop', (main ? 0.55 : 0.1) + i * 0.12));
    return (t) => {
      if (main) { C.pop(main.d, t, 0.1); main.val.textContent = C.count(main.ch, C.k(t, 0.2, 0.8)); }
      lines.forEach((l, i) => (l.l.style.strokeDashoffset = l.L * (1 - C.k(t, 0.4 + i * 0.06, 0.35))));
      items.forEach((it, i) => {
        const s = (main ? 0.55 : 0.1) + i * 0.12;
        C.pop(it.d, t, s, 0.4, { y: Math.sin(t * 1.7 + i) * 4 });
        it.val.textContent = C.count(it.ch, C.k(t, s + 0.1, 0.7));
      });
      if (main && p.flash !== false) ctx.flash(t, 0.15, 'rgba(255,30,30,.25)');
    };
  };

  // -------------------------------------------------------------- number ---
  S.number = (st, p, ctx) => {
    const col = C.color(p.color || 'red');
    const paper = ctx.theme === 'paper';
    const svg = C.svg(st);
    const dots = [];
    if (!paper) for (let x = -14; x <= 14; x++) for (let y = -14; y <= 14; y++) {
      const d = Math.hypot(x, y);
      if (d > 14) continue;
      dots.push({ d, el: C.s('circle', { cx: 540 + x * 28, cy: 400 + y * 28, r: 3.2, fill: col }, svg) });
    }
    const num = C.place(C.h('div', { style: { fontSize: (p.size || 300) + 'px', fontWeight: 900, color: p.textColor || (paper ? 'var(--text)' : '#fff'), lineHeight: 1, textShadow: paper ? 'none' : `0 0 40px ${col}, 0 0 4px ${col}`, whiteSpace: 'nowrap', letterSpacing: '-6px' } }, st), 540, 360);
    num.textContent = p.value ?? '1';
    C.fit(num, 800);
    const lab = C.place(C.h('div', { class: 'label', style: { fontSize: '50px', letterSpacing: '8px' } }, st, p.label || ''), 540, 560);
    const ul = C.place(C.h('div', { style: { width: '120px', height: '6px', background: col, boxShadow: `0 0 14px ${col}`, borderRadius: '3px' } }, st), 540, 610);
    ctx.cue('impact', 0.1);
    if (p.countUp !== false) for (let i = 0; i < 9; i++) ctx.cue('tick', 0.1 + i * ((p.countDur ?? 0.9) / 9), 0.6);
    if (paper) ctx.mark(num, 0.1 + (p.countDur ?? 0.9) + 0.15, 0.5);
    const stampUp = addStamp(st, p, ctx, { y: 730 });
    return (t) => {
      stampUp(t);
      dots.forEach((d) => {
        const wave = Math.max(0, 1 - Math.abs(d.d - (t * 9) % 22) / 3);
        d.el.style.opacity = C.k(t, d.d * 0.03, 0.3) * ((1 - d.d / 15) * 0.55 + wave * 0.35);
      });
      const kn = C.k(t, 0.1, 0.5, 'back');
      C.tf(num, { s: C.lerp(0.6, 1, kn) * (1 + Math.sin(t * 3) * 0.012 * kn), o: C.k(t, 0.1, 0.2) });
      num.textContent = C.count(p.value ?? '1', p.countUp === false ? 1 : C.k(t, 0.1, p.countDur ?? 0.9));
      C.rise(lab, t, 0.45);
      ul.style.transform = `translate(-50%,-50%) scaleX(${C.k(t, 0.6, 0.4)})`;
      ctx.flash(t, 0.1, `${col}44`);
    };
  };

  // --------------------------------------------------------------- tanks ---
  // Fuel tanks per company; one drains empty. "Who runs out first?"
  S.tanks = (st, p, ctx) => {
    const items = (p.items || []).map((it) => ({ ...it, b: C.brand(it.ticker || it) }));
    const n = items.length, gap = Math.min(170, 900 / n);
    const svg = C.svg(st);
    const defs = C.s('defs', {}, svg);
    const lg = C.s('linearGradient', { id: 'tk-glass', x1: 0, x2: 1 }, defs);
    [['0', 'rgba(255,255,255,.18)'], ['.3', 'rgba(255,255,255,.04)'], ['.75', 'rgba(255,255,255,.02)'], ['1', 'rgba(255,255,255,.16)']].forEach(([o, c]) => C.s('stop', { offset: o, 'stop-color': c }, lg));
    const metal = C.s('linearGradient', { id: 'tk-metal', x1: 0, x2: 1 }, defs);
    [['0', '#5d6670'], ['.45', '#d5dbe0'], ['1', '#4a525a']].forEach(([o, c]) => C.s('stop', { offset: o, 'stop-color': c }, metal));
    const TW = Math.min(110, gap * 0.66), TT = 140, TB = 580, H = TB - TT;
    const tanks = items.map((it, i) => {
      const cx = 540 + (i - (n - 1) / 2) * gap, x = cx - TW / 2;
      const g = C.s('g', {}, svg);
      const liq = C.s('rect', { x: x + 6, width: TW - 12, fill: G.green, filter: 'url(#glow-sm)' }, g);
      const surf = C.s('ellipse', { cx, rx: TW / 2 - 6, ry: 8, fill: '#8dffb4' }, g);
      const bubbles = [...Array(7)].map((_, j) => C.s('circle', { r: 3 + C.rand(j + i * 9) * 4, fill: 'rgba(255,230,120,.8)' }, g));
      C.s('rect', { x, y: TT, width: TW, height: H, fill: 'url(#tk-glass)', stroke: 'rgba(255,255,255,.25)', 'stroke-width': 2 }, g);
      [0.33, 0.66].forEach((f) => C.s('rect', { x: x - 3, y: TT + H * f - 4, width: TW + 6, height: 8, fill: 'url(#tk-metal)' }, g));
      C.s('rect', { x: x - 6, y: TT - 30, width: TW + 12, height: 32, rx: 6, fill: 'url(#tk-metal)' }, g);
      C.s('ellipse', { cx, cy: TT - 30, rx: TW / 2 + 6, ry: 10, fill: '#e8edf1' }, g);
      C.s('rect', { x: cx - 6, y: TT - 54, width: 12, height: 24, fill: 'url(#tk-metal)' }, g);
      C.s('rect', { x: x - 10, y: TB, width: TW + 20, height: 26, rx: 6, fill: 'url(#tk-metal)' }, g);
      const chip = C.place(C.chip(it.b, 62, st), cx, TB + 80);
      const name = C.place(C.h('div', { class: 'label', style: { fontSize: '22px' } }, st, it.name || it.b.ticker), cx, TB + 138);
      return { it, cx, g, liq, surf, bubbles, chip, name };
    });
    const dr = p.drain;
    const badge = dr ? C.place(C.h('div', { class: 'badge', style: { background: G.red, fontSize: '26px', padding: '6px 16px', boxShadow: `0 0 24px ${G.red}` } }, st, dr.badge || 'EMPTY'), tanks[dr.index ?? n - 1].cx, TT - 90) : null;
    const q = p.questionAt != null ? C.place(C.h('div', { class: 'ctr', style: { width: '120px', height: '120px', borderRadius: '50%', border: `4px dashed ${G.cyan}`, color: G.cyan, fontSize: '80px', fontWeight: 900, textShadow: `0 0 20px ${G.cyan}` } }, st, '?'), 540, 30) : null;
    tanks.forEach((_, i) => ctx.cue('pop', 0.1 + i * 0.1, 0.6));
    if (dr) { ctx.cue('downer', dr.at ?? 2); ctx.cue('alert', (dr.at ?? 2) + 1.1, 0.7); }
    if (q) ctx.cue('pop', p.questionAt);
    return (t) => {
      tanks.forEach((tk, i) => {
        tk.g.style.opacity = C.k(t, i * 0.1, 0.3);
        C.pop(tk.chip, t, 0.1 + i * 0.1);
        tk.name.style.opacity = C.k(t, 0.2 + i * 0.1, 0.3);
        let lvl = (tk.it.level ?? 0.85) * C.k(t, 0.3 + i * 0.1, 1.0, 'out');
        let red = 0;
        if (dr && (dr.index ?? n - 1) === i) {
          const kd = C.k(t, dr.at ?? 2, 1.2, 'inOut');
          lvl = C.lerp(lvl, dr.level ?? 0.04, kd); red = kd;
          tk.name.style.color = red > 0.5 ? G.red : '';
        }
        const y = TB - H * lvl;
        const col = C.mix('#2ee86a', '#ff3b3b', red);
        tk.liq.setAttribute('y', y); tk.liq.setAttribute('height', TB - y); tk.liq.setAttribute('fill', col);
        tk.surf.setAttribute('cy', y); tk.surf.setAttribute('fill', C.mix('#8dffb4', '#ff8a8a', red));
        tk.surf.style.opacity = lvl > 0.01 ? 1 : 0;
        tk.bubbles.forEach((b, j) => {
          const ph = (t * (0.25 + C.rand(j * 3 + i) * 0.3) + C.rand(j + i * 7)) % 1;
          b.setAttribute('cx', tk.cx + (C.rand(j * 11 + i) - 0.5) * (TW - 30));
          b.setAttribute('cy', TB - ph * (TB - y));
          b.style.opacity = lvl > 0.08 ? 0.8 * (1 - ph) : 0;
        });
      });
      if (badge) C.pop(badge, t, (dr.at ?? 2) + 1.1);
      if (dr) ctx.flash(t, (dr.at ?? 2) + 1.1, 'rgba(255,30,30,.3)');
      if (q) C.pop(q, t, p.questionAt);
    };
  };

  // ------------------------------------------------------------- mystery ---
  // Numbered "?" cards. Optional reveal flips each card to its text.
  S.mystery = (st, p, ctx) => {
    const n = p.count || (p.reveal || []).length || 3;
    const gap = Math.min(270, 940 / n), w = gap * 0.82, h = w * 1.12;
    const box = C.place(C.h('div', { class: 'panel', style: { width: gap * n + 40 + 'px', height: h + 110 + 'px', background: 'rgba(63,208,255,.04)', borderColor: 'rgba(63,208,255,.45)' } }, st), 540, 400);
    const scan = C.h('div', { style: { position: 'absolute', top: 0, bottom: 0, width: '6px', background: G.cyan, boxShadow: `0 0 30px 8px ${G.cyan}`, opacity: 0.6 } }, box);
    const cards = [...Array(n)].map((_, i) => {
      const c = C.place(C.h('div', { class: 'panel corners ctr', style: { width: w + 'px', height: h + 'px', background: 'linear-gradient(180deg,#0e2230,#08131b)', borderColor: 'rgba(63,208,255,.55)', flexDirection: 'column' } }, st), 540 + (i - (n - 1) / 2) * gap, 380);
      const front = C.h('div', { style: { fontSize: w * 0.55 + 'px', fontWeight: 900, color: '#e8f8ff', textShadow: `0 0 30px ${G.cyan}`, lineHeight: 1 } }, c, '?');
      const r = (p.reveal || [])[i];
      const back = C.h('div', { class: 'ctr', style: { display: 'none', flexDirection: 'column', gap: '10px', padding: '10px', textAlign: 'center' } }, c);
      if (r) {
        if (r.ticker) C.chip(r.ticker, w * 0.4, back);
        if (r.icon) C.h('div', { style: { fontSize: w * 0.32 + 'px' } }, back, r.icon);
        C.h('div', { style: { fontWeight: 900, fontSize: Math.min(40, w * 0.16) + 'px', color: C.color(r.color || 'white'), textTransform: 'uppercase', lineHeight: 1.1 } }, back, r.text || '');
      }
      const num = C.place(C.h('div', { class: 'label muted', style: { fontSize: '26px' } }, st, String(i + 1).padStart(2, '0')), 540 + (i - (n - 1) / 2) * gap, 380 + h / 2 + 34);
      return { c, front, back, num, r };
    });
    cards.forEach((cd, i) => { ctx.cue('pop', 0.1 + i * 0.14); if (cd.r && cd.r.at != null) { ctx.cue('whoosh', cd.r.at, 0.5); ctx.cue('ping', cd.r.at + 0.25); } });
    return (t) => {
      box.style.opacity = C.k(t, 0, 0.3) * 0.9;
      C.tf(box, {});
      const bw = gap * n + 40;
      scan.style.left = ((t * 0.55) % 1) * bw + 'px';
      scan.style.opacity = 0.5 * C.k(t, 0.3, 0.3);
      cards.forEach((cd, i) => {
        const s = 0.1 + i * 0.14;
        const k = C.pop(cd.c, t, s);
        cd.front.style.opacity = 0.75 + 0.25 * Math.sin(t * 5 + i);
        cd.num.style.opacity = C.k(t, s, 0.3);
        if (cd.r && cd.r.at != null) {
          const kf = C.k(t, cd.r.at, 0.5, 'inOut');
          const sx = kf < 0.5 ? 1 - kf * 2 : (kf - 0.5) * 2;
          cd.front.style.display = kf < 0.5 ? '' : 'none';
          cd.back.style.display = kf < 0.5 ? 'none' : 'flex';
          C.tf(cd.c, { sx: Math.max(0.02, sx) * k, sy: k, o: 1 });
          if (kf >= 0.5) cd.c.style.borderColor = C.color(cd.r.color || 'cyan');
        }
      });
    };
  };

  // ------------------------------------------------------------ calendar ---
  S.calendar = (st, p, ctx) => {
    const dates = p.dates || [{ month: 'OKT', day: '28' }, { month: 'OKT', day: '29' }];
    const n = dates.length, gap = Math.min(420, 980 / n);
    const svg = C.svg(st);
    const cols = dates.map((d, i) => {
      const x = 540 + (i - (n - 1) / 2) * gap;
      const cal = C.place(C.h('div', { class: 'panel', style: { width: '200px', height: '220px', overflow: 'hidden', background: '#fff', border: '0', boxShadow: '0 16px 40px rgba(0,0,0,.35)' } }, st), x, 160);
      C.h('div', { class: 'ctr label', style: { height: '60px', background: `linear-gradient(180deg, ${G.cyan}, #1a98c9)`, color: '#fff', fontSize: '28px' } }, cal, d.month || '');
      C.h('div', { class: 'ctr', style: { height: '160px', color: '#121417', fontSize: '110px', fontWeight: 900, letterSpacing: '-4px' } }, cal, d.day || '');
      const lab = C.place(C.h('div', { class: 'label', style: { fontSize: '24px', padding: '6px 16px', borderRadius: '8px' } }, st, d.label || ''), x, 310);
      const logos = (d.logos || []).map((l, j, a) => C.place(C.chip(l, 90, st), x + (j - (a.length - 1) / 2) * 150, 470));
      const names = (d.logos || []).map((l, j, a) => C.place(C.h('div', { class: 'label muted', style: { fontSize: '20px' } }, st, C.brand(l).name), x + (j - (a.length - 1) / 2) * 150, 540));
      const lines = (d.logos || []).map((l, j, a) => {
        const lx = x + (j - (a.length - 1) / 2) * 150;
        const pth = C.s('path', { d: `M${x},335 L${x},385 L${lx},385 L${lx},420`, fill: 'none', stroke: G.cyan, 'stroke-width': 3 }, svg);
        const L = pth.getTotalLength(); pth.style.strokeDasharray = L; return { pth, L };
      });
      return { d, cal, lab, logos, names, lines };
    });
    cols.forEach((c, i) => {
      ctx.cue('whoosh-down', 0.1 + i * 0.25, 0.6);
      ctx.cue('ping', c.d.at ?? (p.highlightAt ?? 1.2) + i * 0.3, 0.8);
      c.logos.forEach((_, j) => ctx.cue('pop', (c.d.logosAt ?? 0.5 + i * 0.25) + j * 0.12, 0.6));
    });
    return (t) => {
      cols.forEach((c, i) => {
        const s = 0.1 + i * 0.25;
        const k = C.k(t, s, 0.55, 'back');
        C.tf(c.cal, { y: (1 - k) * -60, o: C.k(t, s, 0.2), r: (1 - k) * (i % 2 ? 6 : -6) });
        const hl = c.d.at ?? (p.highlightAt ?? 1.2) + i * 0.3;
        c.lab.style.opacity = C.k(t, s + 0.3, 0.3);
        const kh = C.k(t, hl, 0.3);
        c.lab.style.background = kh > 0 ? `rgba(63,208,255,${0.9 * kh})` : 'transparent';
        c.lab.style.color = kh > 0.5 ? '#fff' : 'var(--muted)';
        c.lines.forEach((l) => (l.pth.style.strokeDashoffset = l.L * (1 - C.k(t, hl + 0.1, 0.35))));
        c.logos.forEach((lg, j) => C.pop(lg, t, (c.d.logosAt ?? 0.5 + i * 0.25) + j * 0.12));
        c.names.forEach((nm, j) => (nm.style.opacity = C.k(t, (c.d.logosAt ?? 0.5 + i * 0.25) + j * 0.12, 0.3)));
      });
    };
  };

  // ---------------------------------------------------------------- rule ---
  // Stone tablet "THE OLD RULE: A -> B" that cracks when the rule breaks.
  S.rule = (st, p, ctx) => {
    const W = 720, H = 420;
    const wrap = C.place(C.h('div', { style: { width: W + 'px', height: H + 'px' } }, st), 540, 450);
    const crack = [[0.5, 0], [0.47, 0.18], [0.54, 0.34], [0.46, 0.52], [0.53, 0.7], [0.48, 0.86], [0.51, 1]];
    const half = (side) => {
      const poly = side === 'l'
        ? [[0, 0], ...crack, [0, 1]]
        : [[1, 0], ...crack, [1, 1]];
      const d = C.h('div', { style: { position: 'absolute', inset: 0, clipPath: `polygon(${poly.map(([x, y]) => `${x * 100}% ${y * 100}%`).join(',')})` } }, wrap);
      const tab = C.h('div', { style: { position: 'absolute', inset: '30px 0 0 0', borderRadius: '60px 60px 16px 16px', background: 'linear-gradient(160deg,#fbfcfd 0%,#e3e7ea 55%,#cfd5d9 100%)', boxShadow: '0 30px 60px rgba(0,0,0,.25), inset 0 2px 0 #fff, inset 0 -8px 0 rgba(0,0,0,.08)' } }, d);
      const row = C.h('div', { class: 'ctr', style: { position: 'absolute', left: '40px', right: '40px', top: '120px', height: '210px', gap: '40px', background: 'rgba(255,255,255,.6)', borderRadius: '20px', border: '2px solid rgba(0,0,0,.06)' } }, tab);
      const lcol = C.h('div', { class: 'ctr', style: { flexDirection: 'column', gap: '18px' } }, row);
      const check = C.h('div', { class: 'ctr', style: { width: '110px', height: '110px', borderRadius: '50%', background: '#c9ced3', color: '#fff', fontSize: '66px', fontWeight: 900 } }, lcol, p.left?.icon || '✓');
      C.h('div', { class: 'label', style: { color: '#222', fontSize: '28px' } }, lcol, p.left?.label || 'BEAT');
      const arrow = C.h('div', { style: { fontSize: '90px', fontWeight: 900, color: '#c9ced3', marginTop: '-40px' } }, row, '➜');
      const rcol = C.h('div', { class: 'ctr', style: { flexDirection: 'column', gap: '18px' } }, row);
      const chart = C.h('div', { class: 'ctr', style: { width: '130px', height: '110px', borderRadius: '14px', background: '#fff', border: '2px solid rgba(0,0,0,.08)' } }, rcol);
      const sv = C.svg(chart, 110, 80); sv.style.position = 'static';
      const ln = C.s('polyline', { points: '8,66 34,46 52,54 78,26 100,14', fill: 'none', stroke: '#c9ced3', 'stroke-width': 6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, sv);
      const rl = C.h('div', { class: 'label', style: { color: '#222', fontSize: '28px', position: 'relative' } }, rcol, p.right?.label || 'STOCK UP');
      const strike = C.h('div', { style: { position: 'absolute', left: '-6px', right: '-6px', top: '50%', height: '5px', background: G.red, transformOrigin: '0 50%', transform: 'scaleX(0)' } }, rl);
      const sign = C.h('div', { class: 'label', style: { position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)', padding: '12px 30px', borderRadius: '10px', fontSize: '30px', color: '#3a1d06', background: 'linear-gradient(180deg,#d9a066,#a8682f)', boxShadow: '0 6px 0 #6e3f17, 0 10px 20px rgba(0,0,0,.25)' } }, d, p.tag || 'THE OLD RULE');
      return { d, check, arrow, ln, rl, strike, sign };
    };
    const L = half('l'), R = half('r');
    const svg = C.svg(wrap, W, H);
    const crackPath = C.s('polyline', { points: crack.map(([x, y]) => `${x * W},${y * H}`).join(' '), fill: 'none', stroke: G.cyan, 'stroke-width': 5, filter: 'url(#glow)' }, svg);
    const cl = crackPath.getTotalLength(); crackPath.style.strokeDasharray = cl;
    const breaker = p.breaker ? C.place(C.chip(p.breaker, 110, st), 540, 160) : null;
    if (breaker) breaker.style.boxShadow = `0 0 40px ${G.cyan}`;
    const actAt = p.activateAt ?? 0.9, brAt = p.breakAt ?? 2.2;
    ctx.cue('whoosh', 0); ctx.cue('success', actAt, 0.8);
    if (breaker) ctx.cue('whoosh-down', brAt - 0.45);
    ctx.cue('crack', brAt); ctx.cue('error', brAt + 0.5, 0.8);
    return (t) => {
      C.pop(wrap, t, 0, 0.5);
      const ka = C.k(t, actAt, 0.35);
      [L, R].forEach((h) => {
        h.check.style.background = C.mix('#c9ced3', '#2ecc5a', ka);
        h.check.style.transform = `scale(${1 + Math.sin(C.clamp((t - actAt) / 0.35) * Math.PI) * 0.15})`;
        h.check.style.boxShadow = ka > 0.5 ? '0 0 26px rgba(46,204,90,.6)' : '';
        h.arrow.style.color = C.mix('#c9ced3', '#1b1f24', C.k(t, actAt + 0.25, 0.3));
        h.ln.setAttribute('stroke', C.mix('#c9ced3', '#2ecc5a', C.k(t, actAt + 0.5, 0.3)));
      });
      const kb = C.k(t, brAt, 0.45, 'in');
      if (breaker) {
        const kd = C.k(t, brAt - 0.45, 0.45, 'in');
        C.tf(breaker, { y: C.lerp(-260, 0, kd), o: C.k(t, brAt - 0.45, 0.15) });
      }
      crackPath.style.strokeDashoffset = cl * (1 - kb);
      const ks = C.k(t, brAt + 0.35, 0.5, 'out');
      L.d.style.transform = `translateX(${-14 * ks}px) rotate(${-2 * ks}deg)`;
      R.d.style.transform = `translateX(${14 * ks}px) rotate(${2 * ks}deg)`;
      [L, R].forEach((h) => {
        h.strike.style.transform = `scaleX(${C.k(t, brAt + 0.5, 0.3)})`;
        if (t > brAt + 0.5) { h.ln.setAttribute('stroke', G.red); h.ln.setAttribute('points', '8,14 34,34 52,26 78,54 100,66'); h.rl.style.color = G.red; }
        else h.ln.setAttribute('points', '8,66 34,46 52,54 78,26 100,14');
      });
      const shake = t > brAt && t < brAt + 0.35 ? Math.sin(t * 120) * 6 : 0;
      wrap.style.marginLeft = shake + 'px';
      ctx.flash(t, brAt + 0.05, 'rgba(63,208,255,.35)');
    };
  };

  // ---------------------------------------------------------------- loop ---
  // Doom loop: nodes on a circle with arrows spinning between them.
  S.loop = (st, p, ctx) => {
    const col = C.color(p.color || 'red');
    const cx = 540, cy = 420, R = 230;
    const svg = C.svg(st);
    C.s('circle', { cx, cy, r: R + 90, fill: 'none', stroke: col, 'stroke-opacity': 0.15, 'stroke-width': 2 }, svg);
    C.s('circle', { cx, cy, r: R - 90, fill: 'none', stroke: col, 'stroke-opacity': 0.25, 'stroke-width': 3 }, svg);
    const ring = C.s('g', {}, svg);
    const arcs = [0, 180].map((a0) => {
      const a1 = a0 + 130;
      const p0 = [cx + R * Math.cos((a0 * Math.PI) / 180), cy + R * Math.sin((a0 * Math.PI) / 180)];
      const p1 = [cx + R * Math.cos((a1 * Math.PI) / 180), cy + R * Math.sin((a1 * Math.PI) / 180)];
      return C.s('path', { d: `M${p0} A${R},${R} 0 0 1 ${p1}`, fill: 'none', stroke: col, 'stroke-width': 7, 'stroke-dasharray': '22 12', 'marker-end': 'url(#arrow-r)', filter: 'url(#glow-sm)' }, ring);
    });
    const nodes = (p.nodes || [{ text: 'DEBT', icon: '🔒' }, { text: 'PAYBACK', icon: '●' }]).map((nd, i, a) => {
      const ang = (p.startAngle ?? -150) + (360 / a.length) * i;
      const x = cx + R * Math.cos((ang * Math.PI) / 180), y = cy + R * Math.sin((ang * Math.PI) / 180);
      return C.place(C.h('div', { class: 'ctr', style: { gap: '10px', padding: '12px 26px', borderRadius: '40px', fontWeight: 900, fontSize: '32px', color: '#fff', background: 'rgba(30,5,6,.95)', border: `3px solid ${col}`, boxShadow: `0 0 26px ${col}88` } }, st, `${nd.icon ? `<span style="color:${col}">${nd.icon}</span>` : ''}${nd.text}`), x, y);
    });
    const center = p.center ? C.place(C.h('div', { class: 'label', style: { fontSize: '34px', color: col, textAlign: 'center', whiteSpace: 'normal', width: '260px' } }, st, p.center), cx, cy) : null;
    ctx.cue('whoosh', 0.2); ctx.cue('alert', 0.3, 0.45);
    nodes.forEach((_, i) => ctx.cue('pop', 0.3 + i * 0.35));
    return (t) => {
      ring.style.opacity = C.k(t, 0.2, 0.4);
      ring.setAttribute('transform', `rotate(${t * (p.speed ?? 70)} ${cx} ${cy})`);
      arcs.forEach((a) => (a.style.strokeDashoffset = -t * 60));
      nodes.forEach((nd, i) => C.pop(nd, t, 0.3 + i * 0.35));
      if (center) C.pop(center, t, 0.9);
      ctx.tint(C.k(t, 0, 0.6) * (p.tint === false ? 0 : 1), 'red');
    };
  };

  // -------------------------------------------------------------- versus ---
  // Two options side by side. flow "out": data leaves to the top (bad);
  // flow "stay": data circles the icon and gets locked in (good).
  S.versus = (st, p, ctx) => {
    const sides = [p.left || {}, p.right || {}];
    const rightAt = p.rightAt ?? 1.4;
    const N = 12;
    const cols = sides.map((sd, i) => {
      const x = i ? 780 : 300, s0 = i ? rightAt : 0.1;
      const col = C.color(sd.color || (i ? 'green' : 'red'));
      const panel = C.place(C.h('div', { class: 'panel', style: { width: '400px', height: '760px', borderColor: col + '88', boxShadow: `0 0 50px ${col}22, inset 0 0 40px ${col}10` } }, st), x, 430);
      const title = C.place(C.h('div', { class: 'label', style: { fontSize: '32px', color: col } }, st, sd.title || ''), x, 100);
      const icon = C.place(C.h('div', { style: { fontSize: '120px', lineHeight: 1 } }, st, sd.icon || ''), x, 250);
      const you = C.place(C.h('div', { style: { fontSize: '86px', lineHeight: 1 } }, st, sd.from || '📱'), x, 540);
      const parts = [...Array(N)].map(() => C.place(C.h('div', { style: { width: '22px', height: '16px', borderRadius: '4px', background: col, boxShadow: `0 0 12px ${col}` } }, st), x, 400));
      const lock = sd.lock ? C.place(C.h('div', { style: { fontSize: '64px' } }, st, '🔒'), x + 70, 300) : null;
      const verdict = C.place(C.h('div', { class: 'badge', style: { background: col, color: col === G.green ? '#05210f' : '#fff', fontSize: '28px', boxShadow: `0 0 26px ${col}88` } }, st, sd.verdict || ''), x, 700);
      const vAt = sd.verdictAt ?? s0 + 1.6;
      ctx.cue('whoosh', s0, 0.7); ctx.cue('pop', s0 + 0.25); ctx.cue('pop', s0 + 0.45, 0.6);
      for (let k = 0; k < 4; k++) ctx.cue('blip', s0 + 0.8 + k * 0.22, 0.5);
      ctx.cue(col === G.green ? 'success' : 'error', vAt, 0.9);
      if (lock) ctx.cue('lock', vAt - 0.35);
      return { sd, x, s0, col, panel, title, icon, you, parts, lock, verdict, vAt };
    });
    const vs = C.place(C.h('div', { class: 'ctr', style: { width: '96px', height: '96px', borderRadius: '50%', background: '#0b141c', border: '3px solid var(--muted)', fontWeight: 900, fontSize: '34px' } }, st, 'VS'), 540, 400);
    return (t) => {
      C.pop(vs, t, rightAt - 0.2);
      cols.forEach((c, i) => {
        C.pop(c.panel, t, c.s0, 0.45);
        c.title.style.opacity = C.k(t, c.s0 + 0.1, 0.3);
        C.pop(c.icon, t, c.s0 + 0.25);
        C.pop(c.you, t, c.s0 + 0.45);
        const ft = t - c.s0 - 0.8;
        c.parts.forEach((q, j) => {
          if (ft < 0) { q.style.opacity = 0; return; }
          let px, py, o;
          if ((c.sd.flow || (i ? 'stay' : 'out')) === 'out') {
            const ph = (ft * 0.7 + j / N) % 1;
            px = c.x + (C.rand(j * 3 + i) - 0.5) * 120 + Math.sin(ph * 6 + j) * 10;
            py = C.lerp(480, 120, ph);
            o = Math.sin(Math.PI * ph);
          } else {
            const a = ft * 2.2 + (j / N) * Math.PI * 2;
            const r = C.lerp(1.6, 1, C.k(ft, 0, 0.8));
            px = c.x + Math.cos(a) * 130 * r; py = 260 + Math.sin(a) * 50 * r;
            o = 0.9;
          }
          q.style.left = px + 'px'; q.style.top = py + 'px';
          q.style.opacity = o * C.k(ft, j * 0.05, 0.2);
        });
        if (c.lock) C.pop(c.lock, t, c.vAt - 0.35);
        C.pop(c.verdict, t, c.vAt);
      });
    };
  };

  // --------------------------------------------------------------- quote ---
  // A quoted post with phrases that get marker-highlighted on their beats.
  // Mark phrases with *stars*; generic card, deliberately not a platform clone.
  S.quote = (st, p, ctx) => {
    const card = C.place(C.h('div', { class: 'panel', style: { width: '860px', padding: '40px 46px', textAlign: 'left' } }, st), 540, p.y ?? 410);
    const head = C.h('div', { class: 'ctr', style: { justifyContent: 'flex-start', gap: '20px', marginBottom: '26px' } }, card);
    const initials = p.initials || (p.author || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2);
    C.h('div', { class: 'ctr', style: { width: '78px', height: '78px', borderRadius: '50%', background: 'linear-gradient(135deg,#3a4656,#1b232d)', fontWeight: 900, fontSize: '32px', flex: 'none' } }, head, initials);
    const who = C.h('div', {}, head);
    C.h('div', { style: { fontWeight: 900, fontSize: '36px' } }, who, p.author || '');
    if (p.handle) C.h('div', { class: 'muted', style: { fontSize: '26px', fontWeight: 600 } }, who, p.handle);
    const cols = (p.hlColors || ['cyan', 'amber', 'red']).map((c) => C.color(c));
    const hls = [];
    const paras = (p.text || []).map((txt) => {
      const el = C.h('div', { style: { fontSize: (p.size || 38) + 'px', fontWeight: 600, lineHeight: 1.4, marginBottom: '22px' } }, card);
      el.innerHTML = txt.replace(/\*([^*]+)\*/g, (_, m) => `<span class="hl">${m}</span>`);
      el.querySelectorAll('.hl').forEach((h) => hls.push(h));
      return el;
    });
    hls.forEach((h, i) => {
      const c = cols[i % cols.length];
      Object.assign(h.style, { backgroundImage: `linear-gradient(90deg, ${c}66 0 50%, transparent 50%)`, backgroundSize: '200% 100%', backgroundRepeat: 'no-repeat', borderRadius: '6px', padding: '0 4px', boxDecorationBreak: 'clone', webkitBoxDecorationBreak: 'clone' });
    });
    const meta = p.meta ? C.h('div', { class: 'muted', style: { fontSize: '24px', fontWeight: 600 } }, card, p.meta) : null;
    const times = hls.map((_, i) => (p.highlightAt || [])[i] ?? 1.2 + i * 1.1);
    ctx.cue('whoosh', 0); ctx.cue('pop', 0.1);
    times.forEach((at) => { ctx.cue('whoosh', at, 0.35); ctx.cue('ping', at + 0.3, 0.6); });
    return (t) => {
      C.pop(card, t, 0, 0.5);
      paras.forEach((el, i) => {
        const k = C.k(t, 0.25 + i * 0.25, 0.4);
        el.style.opacity = k;
        el.style.transform = `translateY(${(1 - k) * 20}px)`;
      });
      if (meta) meta.style.opacity = C.k(t, 0.8, 0.4);
      hls.forEach((h, i) => {
        const k = C.k(t, times[i], 0.6, 'inOut');
        h.style.backgroundPosition = `${100 - k * 100}% 0`;
        h.style.color = k > 0.5 ? '#fff' : '';
      });
    };
  };

  // --------------------------------------------------------------- gauge ---
  // Speedometer whose needle swings to a percentage (risk, odds, sentiment).
  S.gauge = (st, p, ctx) => {
    const col = C.color(p.color || 'red');
    const v = C.clamp((p.value ?? 60) / 100);
    const cx = 540, cy = 440, R = 280;
    const pt = (deg, r) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];
    const arc = (r) => { const a = pt(150, r), b = pt(390, r); return `M${a} A${r},${r} 0 1 1 ${b}`; };
    const svg = C.svg(st);
    C.s('circle', { cx, cy, r: R + 46, fill: 'rgba(20,28,36,.6)', stroke: 'rgba(255,255,255,.12)', 'stroke-width': 3 }, svg);
    C.s('path', { d: arc(R), fill: 'none', stroke: 'rgba(255,255,255,.1)', 'stroke-width': 34, 'stroke-linecap': 'round' }, svg);
    const val = C.s('path', { d: arc(R), fill: 'none', stroke: col, 'stroke-width': 34, 'stroke-linecap': 'round', pathLength: 100, filter: 'url(#glow-sm)' }, svg);
    for (let i = 0; i <= 10; i++) {
      const deg = 150 + 24 * i, [x1, y1] = pt(deg, R - 34), [x2, y2] = pt(deg, R - 58);
      C.s('line', { x1, y1, x2, y2, stroke: 'rgba(255,255,255,.5)', 'stroke-width': i % 5 ? 3 : 5 }, svg);
      const [tx, ty] = pt(deg, R - 86);
      C.s('text', { x: tx, y: ty + 8, class: 'axis', 'text-anchor': 'middle', 'font-size': 24 }, svg).textContent = i * 10;
    }
    const needle = C.s('g', {}, svg);
    C.s('polygon', { points: `${cx - 10},${cy} ${cx},${cy - R + 70} ${cx + 10},${cy}`, fill: col, filter: 'url(#glow-sm)' }, needle);
    C.s('circle', { cx, cy, r: 26, fill: '#d9dee3', stroke: '#6b7682', 'stroke-width': 4 }, svg);
    const num = C.place(C.h('div', { style: { fontSize: '120px', fontWeight: 900, color: col, textShadow: `0 0 30px ${col}` } }, st, ''), cx, cy + 215);
    const chip = p.ticker ? C.place(C.h('div', { class: 'tag ctr', style: { gap: '12px', color: 'var(--text)', background: '#fff', borderColor: '#fff', padding: '6px 18px' } }, st), cx, cy + 300) : null;
    if (chip) { C.chip(p.ticker, 40, chip); C.h('span', { style: { color: '#111' } }, chip, p.name || C.brand(p.ticker).name); }
    const lab = C.place(C.h('div', { class: 'label', style: { fontSize: '34px' } }, st, p.label || ''), cx, cy + (chip ? 362 : 300));
    const sub = p.sub ? C.place(C.h('div', { class: 'label muted', style: { fontSize: '24px' } }, st, p.sub), cx, cy + (chip ? 408 : 346)) : null;
    const at = p.at ?? 0.9, sweep = p.sweepDur ?? 1.6;
    ctx.cue('whoosh', 0); ctx.cue('riser', at + sweep - 1.1, 0.6);
    for (let i = 0; i < 8; i++) ctx.cue('tick', at + (i * sweep) / 8, 0.5);
    ctx.cue('alert', at + sweep, 0.7);
    return (t) => {
      svg.style.opacity = C.k(t, 0, 0.3);
      svg.style.transformOrigin = `${cx}px ${cy}px`;
      svg.style.transform = `scale(${C.lerp(0.85, 1, C.k(t, 0, 0.5, 'back'))})`;
      const k = C.k(t, at, sweep, 'back');
      const wob = t > at + sweep ? Math.sin(t * 22) * 0.6 * Math.exp(-(t - at - sweep) * 2) : 0;
      const cur = v * k;
      needle.setAttribute('transform', `rotate(${240 * cur - 120 + wob} ${cx} ${cy})`);
      val.setAttribute('stroke-dasharray', `${Math.max(0, cur) * 100} 100`);
      val.style.opacity = cur > 0.005 ? 1 : 0;
      num.textContent = Math.round(Math.max(0, Math.min(v, cur)) * 100) + '%';
      num.style.opacity = C.k(t, at, 0.3);
      if (chip) C.pop(chip, t, 0.3);
      C.rise(lab, t, 0.5);
      if (sub) C.rise(sub, t, 0.7);
      ctx.flash(t, at + sweep, col + '44');
    };
  };

  // =========================================================== paper look ===
  // Scenes built for theme "paper": a printed analysis sheet that gets marked
  // up with a highlighter. Text is wrapped as *marked* to get a stroke.
  const markup = (el, html, ctx, times, start = 0.8, gap = 0.55) => {
    el.innerHTML = html.replace(/\*([^*]+)\*/g, '<span class="m">$1</span>');
    [...el.querySelectorAll('.m')].forEach((m, i) => ctx.mark(m, times?.[i] ?? start + i * gap, 0.45));
  };
  const INK = '#3e3e44', GREEN = '#4f8a3c', RED = '#d9573b';

  // Title sheet: brand tile, question headline, small price chart with tag.
  S.sheet = (st, p, ctx) => {
    const chip = C.place(C.chip(p.ticker || 'AMZN', 92, st), 540, 30);
    const head = C.place(C.h('div', { style: { width: '900px', textAlign: 'center', fontSize: (p.size || 88) + 'px', fontWeight: 800, lineHeight: 1.1, color: INK, letterSpacing: '-2px' } }, st), 540, 190);
    markup(head, p.text || '', ctx, p.markAt);
    const arrow = C.place(C.h('div', { style: { fontSize: '60px', color: INK } }, st, '→'), 540, 335);
    const pts = p.points || [168, 175, 160, 125, 100, 90, 95, 105, 128, 140, 150, 175, 180, 185, 180, 195, 225, 210, 230, 220, 240, 235, 250, 253];
    const data = [];
    for (let i = 0; i < (pts.length - 1) * 6; i++) {
      const a = pts[Math.floor(i / 6)], b = pts[Math.floor(i / 6) + 1];
      data.push(C.lerp(a, b, (i % 6) / 6) * (1 + (C.rand(i + 3) - 0.5) * 0.05));
    }
    data.push(pts[pts.length - 1]);
    const X0 = 170, X1 = 900, Y0 = 410, Y1 = 740, hi = p.max || 400;
    const xAt = (i) => X0 + ((X1 - X0) * i) / (data.length - 1), yAt = (v) => Y1 - (v / hi) * (Y1 - Y0);
    const svg = C.svg(st);
    [0, 100, 200, 300, 400].filter((v) => v <= hi).forEach((v) => {
      C.s('line', { x1: X0, x2: X1, y1: yAt(v), y2: yAt(v), stroke: 'rgba(0,0,0,.08)', 'stroke-width': 2 }, svg);
      C.s('text', { x: X0 - 18, y: yAt(v) + 8, class: 'axis', 'text-anchor': 'end' }, svg).textContent = '$' + v;
    });
    (p.xLabels || ['2022', '2023', '2024', '2025', '2026']).forEach((l, i, a) => {
      C.s('text', { x: X0 + ((X1 - X0) * (i + 0.5)) / a.length, y: Y1 + 40, class: 'axis', 'text-anchor': 'middle' }, svg).textContent = l;
    });
    const area = C.s('path', { fill: 'rgba(79,138,60,.12)' }, svg);
    const line = C.s('path', { fill: 'none', stroke: '#55555c', 'stroke-width': 4, 'stroke-linejoin': 'round' }, svg);
    const dot = C.s('circle', { r: 9, fill: '#fff', stroke: GREEN, 'stroke-width': 4 }, svg);
    const tag = C.place(C.h('div', { class: 'badge', style: { background: GREEN, fontSize: '30px', padding: '6px 16px', borderRadius: '10px' } }, st, p.price || '$253'), X1 - 40, yAt(data[data.length - 1]) - 50);
    const foot = C.place(C.h('div', { style: { fontSize: '34px', fontWeight: 700, color: INK } }, st), 540, 815);
    markup(foot, p.footer || '', ctx, [p.footerAt ?? 2.4]);
    const drawAt = p.drawAt ?? 0.3, drawDur = p.drawDur ?? 1.3;
    ctx.cue('paper', 0, 0.8); ctx.cue('pop', 0.1); ctx.cue('whoosh', drawAt, 0.5); ctx.cue('pop', drawAt + drawDur);
    return (t) => {
      C.pop(chip, t, 0.05);
      C.rise(head, t, 0.1, 0.4, 30);
      arrow.style.opacity = C.k(t, 0.3, 0.3);
      arrow.style.marginLeft = Math.sin(t * 3) * 8 + 'px';
      const n = Math.max(1, Math.floor(C.k(t, drawAt, drawDur, 'inOut') * (data.length - 1)) + 1);
      const d = data.slice(0, n).map((v, i) => (i ? 'L' : 'M') + xAt(i).toFixed(1) + ',' + yAt(v).toFixed(1)).join('');
      line.setAttribute('d', d);
      area.setAttribute('d', d + `L${xAt(n - 1)},${Y1}L${X0},${Y1}Z`);
      dot.setAttribute('cx', xAt(n - 1)); dot.setAttribute('cy', yAt(data[n - 1]));
      C.pop(tag, t, drawAt + drawDur);
      foot.style.opacity = C.k(t, drawAt + drawDur, 0.3);
    };
  };

  // Five phases of a business; steps highlight a column and drop a tag in.
  S.phases = (st, p, ctx) => {
    const names = p.names || ['1\nStart-up', '2\nHyper-\nwachstum', '3\nOperativer\nHebel', '4\nKapital-\nrückgabe', '5\nNieder-\ngang'];
    const X0 = 40, X1 = 1040, Y0 = 60, YH = 230, Y1 = 760, cw = (X1 - X0) / 5, base = 540;
    const box = C.h('div', { style: { position: 'absolute', left: X0 + 'px', top: Y0 + 'px', width: X1 - X0 + 'px', height: Y1 - Y0 + 'px', background: '#fff', border: '3px solid #5a5a60', borderRadius: '10px' } }, st);
    const svg = C.svg(st);
    for (let i = 1; i < 5; i++) C.s('line', { x1: X0 + cw * i, x2: X0 + cw * i, y1: Y0, y2: Y1, stroke: '#5a5a60', 'stroke-width': 2.5 }, svg);
    C.s('line', { x1: X0, x2: X1, y1: YH, y2: YH, stroke: '#5a5a60', 'stroke-width': 2.5 }, svg);
    C.s('line', { x1: X0, x2: X1, y1: base, y2: base, stroke: '#9a9aa0', 'stroke-width': 2, 'stroke-dasharray': '8 8' }, svg);
    C.s('text', { x: X0 - 12, y: base + 8, class: 'axis', 'text-anchor': 'end', 'font-size': 26, fill: INK }, svg).textContent = '$0';
    const heads = names.map((n, i) => {
      const h = C.place(C.h('div', { style: { width: cw - 16 + 'px', textAlign: 'center', fontSize: '30px', fontWeight: 800, lineHeight: 1.1, color: INK, whiteSpace: 'pre-line' } }, st, n), X0 + cw * (i + 0.5), (Y0 + YH) / 2);
      return h;
    });
    (p.markHeads || []).forEach((at, i) => at != null && ctx.mark(heads[i], at, 0.4));
    const curve = (pts, color, label, lx, ly) => {
      const d = pts.map(([u, v], i) => (i ? 'L' : 'M') + (X0 + u * (X1 - X0)).toFixed(1) + ',' + (base - v).toFixed(1)).join('');
      C.s('path', { d, fill: 'none', stroke: color, 'stroke-width': 6, 'stroke-dasharray': '1 13', 'stroke-linecap': 'round', 'clip-path': 'url(#ph-clip)' }, svg);
      C.s('text', { x: lx, y: ly, 'font-size': 24, 'font-weight': 700, fill: color, 'font-family': 'Inter', 'clip-path': 'url(#ph-clip)' }, svg).textContent = label;
    };
    const clip = C.s('rect', { x: X0, y: Y0, height: Y1 - Y0, width: 0 }, C.s('clipPath', { id: 'ph-clip' }, C.s('defs', {}, svg)));
    curve([[0, 6], [0.1, 14], [0.2, 40], [0.3, 105], [0.4, 175], [0.5, 220], [0.6, 250], [0.7, 262], [0.8, 262], [0.88, 245], [0.95, 205], [1, 170]], GREEN, p.revenueLabel || 'Umsatz', X0 + cw * 2.2, base - 275);
    curve([[0, -8], [0.08, -50], [0.18, -85], [0.28, -70], [0.36, -25], [0.42, 12], [0.5, 60], [0.6, 120], [0.7, 160], [0.78, 168], [0.86, 140], [0.94, 70], [1, 10]], RED, p.profitLabel || 'Gewinn', X0 + cw * 0.45, base + 125);
    const steps = (p.steps || []).map((sp, i) => {
      const cx = X0 + cw * (sp.col - 0.5);
      const fill = C.h('div', { style: { position: 'absolute', left: X0 + cw * (sp.col - 1) + 4 + 'px', top: YH + 3 + 'px', width: cw - 8 + 'px', height: Y1 - YH - 6 + 'px', background: 'rgba(246,255,40,.35)', mixBlendMode: 'multiply', transformOrigin: '50% 0' } }, st);
      ctx.mark(heads[sp.col - 1], sp.at, 0.5);
      const tag = C.place(C.h('div', { class: 'badge', style: { background: sp.color ? C.color(sp.color) : GREEN, fontSize: '28px', padding: '6px 16px', borderRadius: '10px' } }, st, sp.tag || 'AMZN'), cx, Y1 - 50);
      const x = C.s('path', { d: `M${cx - 60},${YH + 60} L${cx + 60},${Y1 - 110} M${cx + 60},${YH + 60} L${cx - 60},${Y1 - 110}`, stroke: RED, 'stroke-width': 9, 'stroke-linecap': 'round', fill: 'none', pathLength: 100 }, svg);
      ctx.cue('pop', sp.at + 0.5);
      if (sp.crossAt != null) ctx.cue('error', sp.crossAt, 0.7);
      return { sp, fill, tag, x };
    });
    const drawAt = p.drawAt ?? 0.3, drawDur = p.drawDur ?? 1.4;
    ctx.cue('paper', 0, 0.8); ctx.cue('whoosh', drawAt, 0.4);
    heads.forEach((_, i) => ctx.cue('tick', 0.15 + i * 0.1, 0.5));
    return (t) => {
      box.style.opacity = C.k(t, 0, 0.25);
      svg.style.opacity = C.k(t, 0, 0.25);
      heads.forEach((h, i) => C.rise(h, t, 0.15 + i * 0.1, 0.35, 20));
      clip.setAttribute('width', (X1 - X0) * C.k(t, drawAt, drawDur, 'inOut'));
      steps.forEach((s) => {
        const k = C.k(t, s.sp.at + 0.1, 0.4, 'out');
        s.fill.style.transform = `scaleY(${k})`;
        s.fill.style.opacity = s.sp.crossAt != null ? 1 - C.k(t, s.sp.crossAt, 0.4) * 0.6 : 1;
        C.pop(s.tag, t, s.sp.at + 0.5);
        s.x.setAttribute('stroke-dasharray', `${s.sp.crossAt != null ? C.k(t, s.sp.crossAt, 0.35) * 100 : 0} 100`);
      });
    };
  };

  // Yes/no checklist with green answers, plus small revenue/profit lines.
  S.checklist = (st, p, ctx) => {
    const card = C.h('div', { style: { position: 'absolute', left: '60px', top: '20px', width: '960px', background: '#fff', border: '2px solid #e5e5ea', borderRadius: '20px', padding: '10px 34px' } }, st);
    const rows = (p.items || []).map((it, i) => {
      const r = C.h('div', { class: 'ctr', style: { justifyContent: 'space-between', padding: '20px 0', borderTop: i ? '2px solid #efeff2' : '0' } }, card);
      const txt = C.h('div', {}, r);
      C.h('div', { style: { fontSize: '40px', fontWeight: 800, color: INK } }, txt, it.q);
      const sub = C.h('div', { style: { fontSize: '30px', fontWeight: 500, color: '#6d6d75', marginTop: '6px', display: 'inline-block' } }, txt);
      markup(sub, it.sub || '', ctx, [it.markAt ?? (it.at ?? 0.3 + i * 0.7) + 0.5]);
      const ans = C.h('div', { class: 'badge', style: { background: it.no ? RED : GREEN, fontSize: '30px', padding: '8px 22px', borderRadius: '30px' } }, r, it.ans || '✓ Ja');
      const at = it.at ?? 0.3 + i * 0.7;
      ctx.cue('pop', at + 0.25); ctx.cue('ping', at + 0.3, 0.5);
      return { r, ans, at };
    });
    const series = p.series || [];
    const X0 = 120, X1 = 960, svg = C.svg(st);
    const lines = series.map((se, j) => {
      const yTop = 560 + j * 150, yBot = yTop + 70;
      const lo = Math.min(...se.values), hi = Math.max(...se.values);
      const pts = se.values.map((v, i) => [X0 + ((X1 - X0) * i) / (se.values.length - 1), yBot - ((v - lo) / (hi - lo || 1)) * (yBot - yTop)]);
      const path = C.s('path', { d: pts.map((q, i) => (i ? 'L' : 'M') + q.join(',')).join(''), fill: 'none', stroke: se.color ? C.color(se.color) : j ? GREEN : '#55555c', 'stroke-width': 5, pathLength: 100 }, svg);
      const labs = se.values.map((v, i) => C.place(C.h('div', { style: { fontSize: '26px', fontWeight: 700, color: INK } }, st, se.fmt ? se.fmt.replace('#', String(v).replace('.', ',')) : v), pts[i][0], pts[i][1] - 32));
      const name = C.place(C.h('div', { class: 'label muted', style: { fontSize: '22px' } }, st, se.label || ''), X0 + 40, yTop - 46);
      return { path, labs, name };
    });
    const xl = (p.xLabels || []).map((l, i, a) => C.place(C.h('div', { class: 'axis-dom' }, st, l), X0 + ((X1 - X0) * i) / (a.length - 1), 860));
    const chartAt = p.chartAt ?? 2.4;
    ctx.cue('paper', 0, 0.8); if (lines.length) ctx.cue('whoosh', chartAt, 0.4);
    return (t) => {
      card.style.opacity = C.k(t, 0, 0.25);
      rows.forEach((r) => { r.ans.style.transform = `scale(${Math.max(0, C.k(t, r.at + 0.25, 0.38, 'back'))})`; r.r.style.opacity = C.k(t, r.at, 0.3); });
      lines.forEach((l, j) => {
        const k = C.k(t, chartAt + j * 0.2, 1.1, 'inOut');
        l.path.setAttribute('stroke-dasharray', `${k * 100} 100`);
        l.labs.forEach((lb, i) => (lb.style.opacity = C.k(t, chartAt + j * 0.2 + (i / l.labs.length) * 1.1, 0.25)));
        l.name.style.opacity = C.k(t, chartAt, 0.3);
      });
      xl.forEach((x) => (x.style.opacity = C.k(t, chartAt, 0.3)));
    };
  };

  // Metric tiles; bad ones get a red hand-drawn strike and a note.
  S.tiles = (st, p, ctx) => {
    const items = p.items || [];
    const tiles = items.map((it, i) => {
      const x = 300 + (i % 2) * 480, y = 150 + Math.floor(i / 2) * 230;
      const d = C.place(C.h('div', { style: { width: '440px', height: '190px', background: '#fff', border: '2px solid #e5e5ea', borderRadius: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 34px' } }, st), x, y);
      C.h('div', { style: { fontSize: '32px', fontWeight: 700, color: '#6d6d75' } }, d, it.label);
      const v = C.h('div', { style: { fontSize: '54px', fontWeight: 900, color: INK, position: 'relative' } }, d, it.value);
      let strike, note;
      if (it.bad) {
        strike = C.s('path', { d: 'M-8,40 C40,30 90,48 140,34 S220,30 260,38', stroke: RED, 'stroke-width': 8, fill: 'none', 'stroke-linecap': 'round', pathLength: 100 }, C.svg(v, 250, 80));
        strike.parentNode.style.left = '-6px'; strike.parentNode.style.top = '0';
        note = C.place(C.h('div', { style: { fontSize: '34px', fontWeight: 800, color: RED, fontFamily: "'Comic Sans MS','Segoe Print',cursive" } }, st, it.note || 'nutzlos!'), x + 120, y + 112);
      }
      const at = 0.15 + i * 0.12, badAt = it.badAt ?? (p.badAt ?? 1.4) + i * 0.35;
      ctx.cue('pop', at, 0.7);
      if (it.bad) { ctx.cue('marker', badAt); ctx.cue('error', badAt + 0.3, 0.5); }
      if (it.mark) ctx.mark(v, it.markAt ?? 2.2, 0.4);
      return { it, d, strike, note, at, badAt };
    });
    const stampUp = addStamp(st, p, ctx, { y: 650, color: 'red' });
    ctx.cue('paper', 0, 0.8);
    return (t) => {
      stampUp(t);
      tiles.forEach((tl, i) => {
        C.pop(tl.d, t, tl.at, 0.38, { y: Math.sin(t * 1.5 + i) * 3 });
        if (tl.strike) {
          tl.strike.setAttribute('stroke-dasharray', `${C.k(t, tl.badAt, 0.3) * 100} 100`);
          C.tf(tl.note, { r: -6, s: Math.max(0, C.k(t, tl.badAt + 0.25, 0.3, 'back')), o: C.k(t, tl.badAt + 0.25, 0.15) });
        }
      });
    };
  };

  // Valuation: P/OCF history with expensive / fair / cheap bands and prices.
  S.valuation = (st, p, ctx) => {
    const ratings = p.ratings || ['Sehr teuer', 'Teuer', 'Fair', 'Attraktiv', 'Sehr attraktiv'];
    const scale = C.h('div', { class: 'ctr', style: { position: 'absolute', left: '60px', top: '0', width: '960px', height: '120px', background: '#fff', border: '2px solid #e5e5ea', borderRadius: '18px', gap: '0', justifyContent: 'space-around' } }, st);
    const rDots = ratings.map((r, i) => {
      const c = C.h('div', { class: 'ctr', style: { flexDirection: 'column', gap: '6px', width: '180px' } }, scale);
      const dot = C.h('div', { class: 'ctr', style: { width: '46px', height: '46px', borderRadius: '50%', background: '#ececf0', color: '#8b8b93', fontWeight: 800, fontSize: '22px' } }, c, String(i + 1));
      const lab = C.h('div', { style: { fontSize: '22px', color: '#8b8b93', fontWeight: 600 } }, c, r);
      return { dot, lab };
    });
    const pts = p.points || [30, 33, 31, 38, 42, 30, 28, 40, 36, 27, 22, 20, 21, 19, 23, 20, 18, 21, 19, 17, 20, 21, 18, 20, 19, 17, 18, 20, 18, 17];
    const data = [];
    for (let i = 0; i < (pts.length - 1) * 5; i++) {
      const a = pts[Math.floor(i / 5)], b = pts[Math.floor(i / 5) + 1];
      data.push(C.lerp(a, b, (i % 5) / 5) + (C.rand(i * 1.7) - 0.5) * 1.6);
    }
    data.push(pts[pts.length - 1]);
    const lo = 8, hi = 44, X0 = 150, X1 = 770, Y0 = 200, Y1 = 700;
    const xAt = (i) => X0 + ((X1 - X0) * i) / (data.length - 1), yAt = (v) => Y1 - ((v - lo) / (hi - lo)) * (Y1 - Y0);
    const svg = C.svg(st);
    const bands = p.bands || { expensive: 25.6, cheap: 17.5 };
    C.s('rect', { x: X0, y: Y0, width: X1 - X0, height: yAt(bands.expensive) - Y0, fill: 'rgba(225,110,110,.13)' }, svg);
    C.s('rect', { x: X0, y: yAt(bands.expensive), width: X1 - X0, height: yAt(bands.cheap) - yAt(bands.expensive), fill: 'rgba(240,200,70,.16)' }, svg);
    C.s('rect', { x: X0, y: yAt(bands.cheap), width: X1 - X0, height: Y1 - yAt(bands.cheap), fill: 'rgba(90,170,90,.13)' }, svg);
    [8, 14, 20, 26, 32, 38, 44].forEach((v) => (C.s('text', { x: X0 - 14, y: yAt(v) + 8, class: 'axis', 'text-anchor': 'end' }, svg).textContent = v + '×'));
    (p.xLabels || ['2022', '2023', '2024', '2025', '2026']).forEach((l, i, a) => (C.s('text', { x: X0 + ((X1 - X0) * (i + 0.3)) / a.length, y: Y1 + 40, class: 'axis' }, svg).textContent = l));
    const avg = p.average ?? 21;
    const avgLine = C.s('line', { x1: X0, x2: X1, y1: yAt(avg), y2: yAt(avg), stroke: INK, 'stroke-width': 3, 'stroke-dasharray': '10 8' }, svg);
    const line = C.s('path', { fill: 'none', stroke: INK, 'stroke-width': 3.5, 'stroke-linejoin': 'round' }, svg);
    const dot = C.s('circle', { r: 11, fill: '#e2a03f', stroke: '#fff', 'stroke-width': 3 }, svg);
    const levels = (p.levels || [{ price: '$384', label: 'Teuer', at: bands.expensive }, { price: '$322', label: 'Schnitt', at: avg }, { price: '$260', label: 'Günstig', at: 17 }]).map((lv, i) => {
      const d = C.place(C.h('div', { style: { display: 'flex', alignItems: 'baseline', gap: '10px', width: '240px' } }, st), X1 + 140, yAt(lv.at));
      const pr = C.h('div', { style: { fontSize: '36px', fontWeight: 900, color: INK, display: 'inline-block' } }, d, lv.price);
      C.h('div', { style: { fontSize: '22px', fontWeight: 700, color: ['#c0504d', '#8b8b93', GREEN][i] || '#8b8b93' } }, d, lv.label);
      if (lv.markAt != null) ctx.mark(pr, lv.markAt, 0.4);
      return d;
    });
    const nowTag = C.place(C.h('div', { class: 'badge', style: { background: '#e2a03f', fontSize: '28px', padding: '6px 16px', borderRadius: '10px' } }, st, p.nowLabel || 'heute ≈ 17×'), X1 - 120, yAt(data[data.length - 1]) + 70);
    const avgTag = C.place(C.h('div', { style: { fontSize: '28px', fontWeight: 800, color: INK, background: '#fff', padding: '2px 10px', borderRadius: '8px' } }, st, p.avgLabel || 'Ø 21×'), X0 + 90, yAt(avg) - 30);
    const drawAt = p.drawAt ?? 0.3, drawDur = p.drawDur ?? 1.4, avgAt = p.avgAt ?? drawAt + drawDur + 0.1, nowAt = p.nowAt ?? avgAt + 0.8;
    ctx.mark(avgTag, avgAt + 0.2, 0.4);
    ctx.mark(nowTag, nowAt + 0.25, 0.4);
    ctx.cue('paper', 0, 0.8); ctx.cue('whoosh', drawAt, 0.4); ctx.cue('pop', nowAt); ctx.cue('ping', p.ratingAt ?? 0.4, 0.5);
    return (t) => {
      scale.style.opacity = C.k(t, 0, 0.25);
      rDots.forEach((r, i) => {
        const on = i === (p.rating ?? 2) && t > (p.ratingAt ?? 0.4);
        r.dot.style.background = on ? '#8a6a3b' : '#ececf0'; r.dot.style.color = on ? '#fff' : '#8b8b93';
        r.dot.style.transform = `scale(${on ? 1 + 0.25 * Math.sin(C.clamp((t - (p.ratingAt ?? 0.4)) / 0.3) * Math.PI) + 0.15 : 1})`;
        r.lab.style.color = on ? INK : '#8b8b93'; r.lab.style.fontWeight = on ? 800 : 600;
      });
      svg.style.opacity = C.k(t, 0.1, 0.3);
      const n = Math.max(1, Math.floor(C.k(t, drawAt, drawDur, 'inOut') * (data.length - 1)) + 1);
      line.setAttribute('d', data.slice(0, n).map((v, i) => (i ? 'L' : 'M') + xAt(i).toFixed(1) + ',' + yAt(v).toFixed(1)).join(''));
      dot.setAttribute('cx', xAt(n - 1)); dot.setAttribute('cy', yAt(data[n - 1]));
      dot.setAttribute('r', 11 + Math.sin(t * 4) * 1.5);
      avgLine.style.opacity = C.k(t, avgAt, 0.3);
      avgTag.style.opacity = C.k(t, avgAt, 0.3);
      levels.forEach((l, i) => C.rise(l, t, avgAt + i * 0.12, 0.35, 16));
      C.pop(nowTag, t, nowAt);
    };
  };

  // ---------------------------------------------------------------- list ---
  // Numbered points sliding in on their beats ("3 reasons ...").
  S.list = (st, p, ctx) => {
    const items = p.items || [];
    const rowH = Math.min(150, 760 / items.length);
    const rows = items.map((it, i) => {
      const top = Math.max(40, (820 - rowH * items.length) / 2);
      const r = C.place(C.h('div', { class: 'panel ctr', style: { width: '860px', height: rowH - 22 + 'px', justifyContent: 'flex-start', gap: '26px', padding: '0 28px' } }, st), 540, top + rowH * i + rowH / 2);
      const col = C.color(it.color || 'cyan');
      C.h('div', { class: 'ctr', style: { width: '74px', height: '74px', borderRadius: '18px', fontSize: '36px', fontWeight: 900, color: col, border: `3px solid ${col}`, boxShadow: `0 0 20px ${col}55`, flex: 'none' } }, r, it.icon || String(i + 1));
      if (it.ticker) C.chip(it.ticker, 66, r);
      C.h('div', { style: { fontSize: '38px', fontWeight: 800, lineHeight: 1.15 } }, r, it.text || '');
      if (it.value) C.h('div', { style: { marginLeft: 'auto', fontSize: '40px', fontWeight: 900, color: col } }, r, it.value);
      return { r, it };
    });
    rows.forEach((rw, i) => { const at = rw.it.at ?? 0.15 + i * 0.3; ctx.cue('whoosh', at, 0.6); ctx.cue('pop', at + 0.15, 0.6); });
    return (t) => rows.forEach((rw, i) => {
      const k = C.k(t, rw.it.at ?? 0.15 + i * 0.3, 0.4, 'back');
      C.tf(rw.r, { x: (1 - k) * 300, o: C.k(t, rw.it.at ?? 0.15 + i * 0.3, 0.2) });
    });
  };

  // ----------------------------------------------------------------- cta ---
  // Laurel medal + stats, for the channel/product call to action.
  S.cta = (st, p, ctx) => {
    const svg = C.svg(st);
    const defs = C.s('defs', {}, svg);
    const gold = C.s('linearGradient', { id: 'cta-gold', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    [['0', '#fff1a8'], ['.5', '#f5c542'], ['1', '#a8730f']].forEach(([o, c]) => C.s('stop', { offset: o, 'stop-color': c }, gold));
    const cx = 540, cy = 270;
    const leaves = [];
    [-1, 1].forEach((side) => {
      for (let i = 0; i < 9; i++) {
        const a = (110 + i * 17) * (Math.PI / 180);
        const x = cx + side * Math.cos(a) * -200, y = cy + Math.sin(a) * 190 - 20;
        const rot = side * (i * 17 - 60) + (side > 0 ? 0 : 180);
        leaves.push({ i, el: C.s('ellipse', { cx: x, cy: y, rx: 34, ry: 15, fill: 'url(#cta-gold)', transform: `rotate(${rot} ${x} ${y})`, filter: 'url(#glow-sm)' }, svg) });
      }
    });
    C.s('circle', { cx, cy, r: 140, fill: 'url(#cta-gold)', filter: 'url(#glow)' }, svg);
    C.s('circle', { cx, cy, r: 118, fill: '#101317', stroke: '#6b5310', 'stroke-width': 4 }, svg);
    const medal = C.place(C.h('div', { style: { fontSize: '120px', fontWeight: 900, color: '#fff' } }, st, p.glyph || '🐼'), cx, cy);
    const brand = C.place(C.h('div', { style: { fontSize: '54px', fontWeight: 900, letterSpacing: '3px' } }, st, p.brand || ''), cx, 480);
    const stats = (p.stats || []).map((s, i) => {
      const d = C.place(C.h('div', { class: 'ctr', style: { flexDirection: 'column', width: '500px', padding: '10px', borderRadius: '14px', border: '3px solid #c99a2e', background: 'linear-gradient(180deg,#22252b,#0f1114)' } }, st), cx, 580 + i * 120);
      const v = C.h('div', { style: { fontSize: '50px', fontWeight: 900, color: '#ffe08a', lineHeight: 1 } }, d, s.value);
      C.h('div', { class: 'label', style: { fontSize: '22px', color: '#fff', marginTop: '6px' } }, d, s.label || '');
      return { d, v, s };
    });
    ctx.cue('shine', 0.1); ctx.cue('pop', 0.1);
    stats.forEach((_, i) => ctx.cue('ding', 0.9 + i * 0.3, 0.8));
    return (t) => {
      leaves.forEach((l) => (l.el.style.opacity = C.k(t, 0.2 + l.i * 0.05, 0.25)));
      C.pop(medal, t, 0.1, 0.5);
      svg.style.opacity = C.k(t, 0, 0.3);
      C.rise(brand, t, 0.6);
      stats.forEach((s, i) => { C.pop(s.d, t, 0.9 + i * 0.3); s.v.textContent = C.count(s.s.value, C.k(t, 0.9 + i * 0.3, 0.9)); });
    };
  };
})();
