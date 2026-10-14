// Gemeinsame Clean-Bausteine für alle Clean-Videos (aus asml-tsmc / fermi-amd / trade-republic-avd extrahiert).
// Nutzung im Video: const K = E.K; const { panda, glass, fly, ... } = K;
(() => {
  const E = window.E, C = E.C, P = E.P;
  const { pop, prog, eOut, eInOut, lerp } = E;
  const TR = '#F43F5E', GOLD = '#FACC15', GRN = '#16A34A', BLUE = '#2563EB', CYAN = '#22D3EE', VIO = '#7C3AED', RED = '#DC2626';
  const panda = (ctx, pose, lt, t, o = {}) => E.drawPanda(ctx, pose, { x: o.x ?? 190, y: o.y ?? 1405, h: o.h ?? 470, lt, t, enter: o.enter ?? true, from: o.from || ((o.x ?? 190) > 540 ? 'right' : 'left'), flip: o.flip, swapAt: o.swapAt, enterAt: o.enterAt });
  const pandaSeq = (ctx, seq, lt, t, o = {}) => { let k = 0; seq.forEach(([at], i) => { if (lt >= at) k = i; }); const [at, pose] = seq[k]; panda(ctx, pose, lt, t, k === 0 ? o : { ...o, enter: false, swapAt: at }); };
  const H = (ctx, lt, states) => { let k = 0; states.forEach(([at], i) => { if (lt >= at) k = i; }); E.headline(ctx, states[k][1], lt - states[k][0], states[k][2] || {}); };
  const ticks = (from, to, n, gain = 0.6, pan = 0) => Array.from({ length: n }, (_, i) => [from + (to - from) * Math.pow(i / (n - 1), 0.8), 'tick', gain, pan]);
  const de = (v, d = 0) => v.toFixed(d).replace('.', ',');

  // ---------- Clean-Bausteine ----------
  // Funken: kleine Leuchtpartikel, die bei einem Ereignis radial ausbrechen
  function sparks(ctx, x, y, lt, t0, n = 16, col = '#FACC15') {
    const p = (lt - t0) / 0.9; if (p < 0 || p > 1) return;
    const r = E.rng(Math.round(x * 7 + y * 3 + t0 * 100));
    ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 14; ctx.fillStyle = col;
    for (let i = 0; i < n; i++) { const a = r() * 6.28, d = eOut(p) * (120 + r() * 220), s = (1 - p) * (5 + r() * 7);
      ctx.globalAlpha = 1 - p; ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d + p * p * 60, s, 0, 7); ctx.fill(); }
    ctx.restore();
  }

  // Glas-Karte: halbtransparent, feiner Rand, weicher Schatten
  function glass(ctx, x, y, w, h, o = {}) {
    E.withT(ctx, x, y, o.scale ?? 1, o.rot || 0, () => {
      ctx.save(); ctx.shadowColor = 'rgba(2,6,23,0.5)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
      E.rr(ctx, -w / 2, -h / 2, w, h, o.r ?? 34); ctx.fillStyle = o.fill || 'rgba(255,255,255,0.08)'; ctx.fill(); ctx.restore();
      E.rr(ctx, -w / 2, -h / 2, w, h, o.r ?? 34); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.stroke();
      if (o.accent) { E.rr(ctx, -w / 2, -h / 2, w, 10, 5); ctx.fillStyle = o.accent; ctx.fill(); }
      if (o.title) E.plainText(ctx, o.title, -w / 2 + 36, -h / 2 + 52, 28, 'rgba(255,255,255,0.65)', { weight: 800, align: 'left' });
      if (o.body) o.body(w, h);
    });
  }
  function bigNum(ctx, txt, x, y, size, col = C.white, s = 1) { E.comicText(ctx, txt, x, y, { size, fill: col, scale: s }); }
  function label(ctx, txt, x, y, size = 30, col = 'rgba(255,255,255,0.7)', align = 'center') { E.plainText(ctx, txt, x, y, size, col, { weight: 800, align }); }
  function tag(ctx, txt, x, y, col, s = 1) { // Pill-Tag
    if (s <= 0.001) return;
    E.withT(ctx, x, y, s, 0, () => { ctx.font = `900 30px ${E.FONT_BOLD}`; const w = ctx.measureText(txt).width + 44;
      E.rr(ctx, -w / 2, -26, w, 52, 26); ctx.fillStyle = col; ctx.fill(); E.plainText(ctx, txt, 0, 2, 30, C.white, { weight: 900 }); });
  }
  function bars(ctx, x, by, items, lt, t0, o = {}) { // Balkendiagramm sauber
    const bw = o.bw || 170, gap = o.gap || 70, max = o.max, hmax = o.h || 420, n = items.length, x0 = x - ((n - 1) * (bw + gap)) / 2;
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x - (n * (bw + gap)) / 2, by, n * (bw + gap), 3);
    if (o.line != null) { const yy = by - hmax * o.line / max; ctx.setLineDash([12, 10]); ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - (n * (bw + gap)) / 2, yy); ctx.lineTo(x + (n * (bw + gap)) / 2, yy); ctx.stroke(); ctx.setLineDash([]); if (o.lineLabel) label(ctx, o.lineLabel, x + (n * (bw + gap)) / 2 - 10, yy - 22, 24, 'rgba(255,255,255,0.7)', 'right'); }
    items.forEach(([lab, v, col, txt, at], i) => {
      const p = eOut(prog(lt, at ?? t0 + i * 0.25, 0.8)), h = hmax * v / max * p, bx = x0 + i * (bw + gap);
      const g = ctx.createLinearGradient(0, by - h, 0, by); g.addColorStop(0, col); g.addColorStop(1, E.shade(col, -0.45));
      ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 24 * p; E.rr(ctx, bx - bw / 2, by - h, bw, Math.max(1, h), 18); ctx.fillStyle = g; ctx.fill(); ctx.restore();
      label(ctx, lab, bx, by + 40, 28);
      if (p > 0.3) bigNum(ctx, txt, bx, by - h - 46, 54, C.white, Math.min(1, (p - 0.3) / 0.4));
    });
  }
  function calRow(ctx, x, y, items, lt) { // Termin-Karten nebeneinander
    items.forEach(([day, date, who, col, at], i) => {
      const s = pop(lt, at, 0.5); if (s <= 0) return;
      glass(ctx, x + (i - (items.length - 1) / 2) * 360, y, 330, 380, { scale: s, accent: col, body: () => {
        label(ctx, day, 0, -95, 30); bigNum(ctx, date, 0, -10, 96, C.white); E.rr(ctx, -90, 70, 180, 56, 28); ctx.fillStyle = col; ctx.fill(); E.plainText(ctx, who, 0, 99, 32, C.white, { weight: 900 }); } });
    });
  }
  function poll(ctx, x, y, w, lt, t0, opts) {
    glass(ctx, x, y, w, 120 + opts.length * 110, { scale: pop(lt, t0, 0.5), title: 'WAS DENKST DU?', body: (ww, hh) => {
      opts.forEach(([txt, col], i) => { const s = pop(lt, t0 + 0.3 + i * 0.25, 0.4); if (s <= 0) return; E.withT(ctx, 0, -hh / 2 + 140 + i * 110, s, 0, () => {
        E.rr(ctx, -ww / 2 + 36, -40, ww - 72, 80, 40); ctx.fillStyle = col + '33'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = col; ctx.stroke();
        ctx.beginPath(); ctx.arc(-ww / 2 + 86, 0, 16, 0, 7); ctx.lineWidth = 4; ctx.stroke(); E.plainText(ctx, txt, -ww / 2 + 124, 2, 36, C.white, { weight: 900, align: 'left' }); }); });
    } });
  }

  // ---------- Fermi-Bausteine ----------
  function shield(ctx, x, y, s, col, txt, sub) { // Absicherungs-Schild
    if (s <= 0.001) return;
    E.withT(ctx, x, y, s, 0, () => {
      const g = ctx.createRadialGradient(0, 0, 20, 0, 0, 280); g.addColorStop(0, col + '55'); g.addColorStop(1, col + '00'); ctx.fillStyle = g; ctx.fillRect(-280, -280, 560, 560);
      const path = () => { ctx.beginPath(); ctx.moveTo(0, -170); ctx.quadraticCurveTo(80, -130, 150, -135); ctx.quadraticCurveTo(160, 60, 0, 180); ctx.quadraticCurveTo(-160, 60, -150, -135); ctx.quadraticCurveTo(-80, -130, 0, -170); ctx.closePath(); };
      ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 30; path(); const gg = ctx.createLinearGradient(0, -170, 0, 180); gg.addColorStop(0, col); gg.addColorStop(1, E.shade(col, -0.45)); ctx.fillStyle = gg; ctx.fill(); ctx.restore();
      path(); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.stroke();
      if (txt) bigNum(ctx, txt, 0, -10, 72, C.white);
      if (sub) label(ctx, sub, 0, 70, 26, 'rgba(255,255,255,0.85)');
    });
  }
  function doc(ctx, x, y, s, o = {}) { // Vertrag
    if (s <= 0.001) return;
    E.withT(ctx, x, y, s, o.rot ?? -0.04, () => {
      ctx.save(); ctx.shadowColor = 'rgba(2,6,23,0.5)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18; E.rr(ctx, -190, -250, 380, 500, 22); ctx.fillStyle = '#F8FAFC'; ctx.fill(); ctx.restore();
      E.plainText(ctx, o.title || 'VERTRAG', 0, -195, 40, '#0F172A', { weight: 900 });
      for (let i = 0; i < 7; i++) { ctx.fillStyle = '#CBD5E1'; E.rr(ctx, -140, -130 + i * 38, i % 3 === 2 ? 180 : 280, 14, 7); ctx.fill(); }
      ctx.strokeStyle = '#64748B'; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.moveTo(-140, 190); ctx.lineTo(140, 190); ctx.stroke(); ctx.setLineDash([]);
      E.plainText(ctx, 'UNTERSCHRIFT', 0, 220, 20, '#94A3B8', { weight: 800 });
      if (o.sign != null && o.sign > 0) { ctx.strokeStyle = '#1D4ED8'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath();
        for (let i = 0; i <= 40 * o.sign; i++) { const u = i / 40, px = -120 + u * 240, py = 170 - Math.sin(u * 14) * 18 * (1 - u * 0.5); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); }
    });
  }
  function bolt(ctx, x, y, s, col = GOLD) { // Strom-Blitz
    if (s <= 0.001) return;
    E.withT(ctx, x, y, s, 0.1, () => { ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 24; ctx.beginPath(); ctx.moveTo(20, -90); ctx.lineTo(-45, 10); ctx.lineTo(-2, 10); ctx.lineTo(-22, 90); ctx.lineTo(48, -15); ctx.lineTo(4, -15); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.restore(); });
  }
  function pulseRings(ctx, x, y, t, col, n = 3, r = 260) {
    for (let i = 0; i < n; i++) { const q = (t * 0.7 + i / n) % 1; ctx.globalAlpha = 0.7 * (1 - q); ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x, y, 60 + q * r, 0, 7); ctx.stroke(); } ctx.globalAlpha = 1;
  }
  function timeline(ctx, x, y, w, items, lt) { // horizontale Zeitleiste
    const p = eOut(prog(lt, items[0][3] - 0.2, 0.8));
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; E.rr(ctx, x - w / 2, y - 4, w * p, 8, 4); ctx.fill();
    items.forEach(([date, txt, col, at], i) => { const s = pop(lt, at, 0.45); if (s <= 0) return; const px = x - w / 2 + (i + 0.5) * w / items.length;
      E.withT(ctx, px, y, s, 0, () => { ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 20; ctx.beginPath(); ctx.arc(0, 0, 22, 0, 7); ctx.fillStyle = col; ctx.fill(); ctx.restore();
        label(ctx, date, 0, -60, 34, C.white); label(ctx, txt, 0, 70, 26, 'rgba(255,255,255,0.75)'); }); });
  }

  // ---------- Einflug-Bausteine (Nutzerwunsch: Bilder neu einfliegen lassen) ----------
  const DIRS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
  // fly: Element fliegt mit Überschwinger, Drehung und Speed-Streifen aus Richtung `from` an seine Position
  function fly(ctx, x, y, lt, at, from, fn, o = {}) {
    if (lt < at) return; const d = o.dur || 0.68, p = Math.min(1, (lt - at) / d), k = E.eBack ? E.eBack(p) : eOut(p), [dx, dy] = DIRS[from] || [1, 0];
    const dist = o.dist || 900, ox = dx * dist * (1 - k), oy = dy * dist * (1 - k), rot = (o.rot ?? 0.35) * (1 - eOut(p)) * (dx || dy);
    if (p < 1) { ctx.save(); ctx.globalAlpha = 0.5 * (1 - p); ctx.strokeStyle = o.streak || 'rgba(255,255,255,0.9)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      for (let i = -2; i <= 2; i++) { const px = x + ox + (dy ? i * 50 : 0), py = y + oy + (dx ? i * 40 : 0), len = 160 + 120 * (1 - p);
        ctx.beginPath(); ctx.moveTo(px + dx * 140, py + dy * 140); ctx.lineTo(px + dx * (140 + len), py + dy * (140 + len)); ctx.stroke(); } ctx.restore(); }
    E.withT(ctx, x + ox, y + oy, o.scale ?? 1, rot + (o.baseRot || 0), () => fn());
  }
  const flySfx = (at, pan = 0.2, g = 0.32) => [[at - 0.04, 'whoosh', g, pan], [at + 0.48, 'pop', 0.45, pan]];

  function appPhone(ctx, x, y, h, t, o = {}) { // stilisiertes Depot-Handy
    const w = h * 0.5;
    E.withT(ctx, x, y, o.scale ?? 1, o.rot || 0, () => {
      ctx.save(); ctx.shadowColor = 'rgba(2,6,23,0.6)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20; E.rr(ctx, -w / 2, -h / 2, w, h, h * 0.09); ctx.fillStyle = '#0B0F19'; ctx.fill(); ctx.restore();
      E.rr(ctx, -w / 2, -h / 2, w, h, h * 0.09); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.stroke();
      E.rr(ctx, -w * 0.15, -h / 2 + 16, w * 0.3, 16, 8); ctx.fillStyle = '#1F2937'; ctx.fill();
      E.plainText(ctx, o.title || 'DEPOT', -w / 2 + 30, -h / 2 + 70, h * 0.045, 'rgba(255,255,255,0.7)', { weight: 800, align: 'left' });
      E.plainText(ctx, o.value || '9.015,80 €', -w / 2 + 30, -h / 2 + 125, h * 0.07, C.white, { weight: 900, align: 'left' });
      E.lineChart(ctx, -w / 2 + 24, -h * 0.18, w - 48, h * 0.28, [[0, 0.7], [0.2, 0.55], [0.35, 0.62], [0.5, 0.4], [0.7, 0.45], [0.85, 0.2], [1, 0.1]], o.chart ?? 1, '#22C55E', { lw: 7, area: true });
      if (o.body) o.body(w, h);
    });
  }
  function warn(ctx, x, y, s, t) { // Warndreieck
    if (s <= 0.001) return;
    E.withT(ctx, x, y, s * (1 + 0.04 * Math.sin(t * 8)), 0, () => {
      ctx.save(); ctx.shadowColor = GOLD; ctx.shadowBlur = 40; ctx.beginPath(); ctx.moveTo(0, -170); ctx.lineTo(180, 140); ctx.lineTo(-180, 140); ctx.closePath(); ctx.lineJoin = 'round'; ctx.lineWidth = 30; ctx.strokeStyle = GOLD; ctx.stroke(); ctx.fillStyle = GOLD; ctx.fill(); ctx.restore();
      bigNum(ctx, '!', 0, 50, 200, '#0F172A');
    });
  }
  function gov(ctx, x, by, w, t) { // Staat: Säulengebäude
    const h = w * 0.7;
    ctx.save(); ctx.shadowColor = 'rgba(2,6,23,0.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 20;
    ctx.beginPath(); ctx.moveTo(x - w / 2 - 20, by - h * 0.72); ctx.lineTo(x, by - h); ctx.lineTo(x + w / 2 + 20, by - h * 0.72); ctx.closePath(); ctx.fillStyle = '#E2E8F0'; ctx.fill(); ctx.restore();
    E.rr(ctx, x - w / 2, by - h * 0.72, w, 30, 6); ctx.fillStyle = '#CBD5E1'; ctx.fill();
    for (let i = 0; i < 5; i++) { E.rr(ctx, x - w / 2 + 20 + i * (w - 40) / 4.6, by - h * 0.66, 40, h * 0.56, 8); ctx.fillStyle = '#F1F5F9'; ctx.fill(); }
    E.rr(ctx, x - w / 2 - 20, by - h * 0.12, w + 40, h * 0.12, 8); ctx.fillStyle = '#CBD5E1'; ctx.fill();
    E.plainText(ctx, 'STAAT', x, by - h * 0.79, w * 0.07, '#0F172A', { weight: 900 });
    E.withT(ctx, x, by - h * 1.02, 1, 0, () => { ctx.fillStyle = '#94A3B8'; ctx.fillRect(-3, -70, 6, 70); const wv = Math.sin(t * 4) * 6;
      [['#111827', 0], ['#DC2626', 1], ['#FACC15', 2]].forEach(([c, i]) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(3, -70 + i * 16); ctx.quadraticCurveTo(40, -70 + i * 16 + wv, 80, -70 + i * 16); ctx.lineTo(80, -54 + i * 16); ctx.quadraticCurveTo(40, -54 + i * 16 + wv, 3, -54 + i * 16); ctx.fill(); }); });
  }
  function magnifier(ctx, x, y, s, t) { // Lupe
    E.withT(ctx, x, y, s, -0.5 + Math.sin(t * 2) * 0.08, () => {
      ctx.lineCap = 'round'; ctx.strokeStyle = '#94A3B8'; ctx.lineWidth = 28; ctx.beginPath(); ctx.moveTo(0, 90); ctx.lineTo(0, 200); ctx.stroke();
      ctx.save(); ctx.shadowColor = CYAN; ctx.shadowBlur = 24; ctx.beginPath(); ctx.arc(0, 0, 90, 0, 7); ctx.lineWidth = 16; ctx.strokeStyle = '#E2E8F0'; ctx.stroke(); ctx.restore();
      ctx.beginPath(); ctx.arc(0, 0, 82, 0, 7); ctx.fillStyle = 'rgba(34,211,238,0.15)'; ctx.fill();
    });
  }
  function row(ctx, txt, val, w, col, ok = true) { // Kosten-Zeile mit Toggle
    E.rr(ctx, -w / 2, -40, w, 80, 22); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill();
    E.plainText(ctx, txt, -w / 2 + 30, 2, 34, C.white, { weight: 900, align: 'left' });
    E.plainText(ctx, val, w / 2 - 130, 2, 38, ok ? '#4ADE80' : '#F87171', { weight: 900, align: 'right' });
    E.rr(ctx, w / 2 - 110, -22, 80, 44, 22); ctx.fillStyle = col; ctx.fill(); ctx.beginPath(); ctx.arc(ok ? w / 2 - 52 : w / 2 - 88, 0, 17, 0, 7); ctx.fillStyle = C.white; ctx.fill();
  }

  E.K = { COL: { TR, GOLD, GRN, BLUE, CYAN, VIO, RED }, panda, pandaSeq, H, ticks, de, sparks, glass, bigNum, label, tag, bars, calRow, poll, shield, doc, bolt, pulseRings, timeline, fly, flySfx, appPhone, warn, gov, magnifier, row, DIRS };
})();
