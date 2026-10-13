// Fermi & AMD – Kreditabsicherung Projekt Matador – Short (65,09 s). Clean-Stil, dichter Hook (9 Schnitte bis 14,1 s).
(() => {
  const E = window.E, C = E.C, P = E.P;
  const { pop, prog, eOut, eInOut, lerp } = E;
  const AMD = '#E11D48', FER = '#F97316', CHIP = '#22D3EE', GOLD = '#FACC15', GRN = '#16A34A', ASML = '#2563EB', TSMC = '#DC2626';
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
  function chip(ctx, x, y, s, col, txt, t) { // stilisierter Wafer-Chip mit Leuchtbahnen
    E.withT(ctx, x, y, s, 0, () => {
      const g = ctx.createRadialGradient(0, 0, 20, 0, 0, 260); g.addColorStop(0, col + '55'); g.addColorStop(1, col + '00'); ctx.fillStyle = g; ctx.fillRect(-260, -260, 520, 520);
      ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) { const o = -100 + i * 40; [[o, -130, o, -170], [o, 130, o, 170], [-130, o, -170, o], [130, o, 170, o]].forEach(([a, b, c, d]) => { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); }); }
      ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 30; E.rr(ctx, -130, -130, 260, 260, 26); ctx.fillStyle = '#0F172A'; ctx.fill(); ctx.restore();
      E.rr(ctx, -130, -130, 260, 260, 26); ctx.lineWidth = 3; ctx.strokeStyle = col; ctx.stroke();
      E.rr(ctx, -90, -90, 180, 180, 16); ctx.fillStyle = '#1E293B'; ctx.fill();
      const p = (t * 0.6) % 1; ctx.strokeStyle = col; ctx.globalAlpha = 0.9; ctx.lineWidth = 4;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(-70, -50 + k * 50); ctx.lineTo(lerp(-70, 70, (p + k * 0.3) % 1), -50 + k * 50); ctx.stroke(); } ctx.globalAlpha = 1;
      if (txt) bigNum(ctx, txt, 0, 4, 64, C.white);
    });
  }
  function machine(ctx, x, by, w, t) { // EUV-Lithografie-Maschine (abstrakt)
    const h = w * 0.62;
    ctx.save(); ctx.shadowColor = 'rgba(2,6,23,0.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 20;
    E.rr(ctx, x - w / 2, by - h, w, h, 30); ctx.fillStyle = '#E2E8F0'; ctx.fill(); ctx.restore();
    E.rr(ctx, x - w / 2, by - h, w, h * 0.22, 30); ctx.fillStyle = ASML; ctx.fill();
    E.plainText(ctx, 'EUV', x - w / 2 + 50, by - h + h * 0.11, 34, C.white, { weight: 900, align: 'left' });
    E.rr(ctx, x - w * 0.36, by - h * 0.66, w * 0.42, h * 0.46, 18); ctx.fillStyle = '#0F172A'; ctx.fill();
    const g = ctx.createLinearGradient(x - w * 0.3, 0, x + w * 0.05, 0); g.addColorStop(0, 'rgba(167,139,250,0)'); g.addColorStop(0.5 + 0.4 * Math.sin(t * 3), 'rgba(167,139,250,0.9)'); g.addColorStop(1, 'rgba(167,139,250,0)');
    ctx.fillStyle = g; ctx.fillRect(x - w * 0.34, by - h * 0.45, w * 0.38, 8);
    for (let i = 0; i < 3; i++) { E.rr(ctx, x + w * 0.12, by - h * 0.66 + i * h * 0.16, w * 0.28, h * 0.1, 8); ctx.fillStyle = i === 1 ? '#94A3B8' : '#CBD5E1'; ctx.fill(); }
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(x + w * 0.15 + i * 26, by - h * 0.12, 7, 0, 7); ctx.fillStyle = Math.sin(t * 5 + i) > 0 ? C.green : '#334155'; ctx.fill(); }
  }
  function factory(ctx, x, by, w, t) { // Chipfabrik (abstrakt)
    const h = w * 0.5;
    ctx.save(); ctx.shadowColor = 'rgba(2,6,23,0.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 20;
    E.rr(ctx, x - w / 2, by - h, w, h, 20); ctx.fillStyle = '#E2E8F0'; ctx.fill(); ctx.restore();
    E.rr(ctx, x - w * 0.38, by - h - 90, w * 0.14, 110, 10); ctx.fillStyle = '#CBD5E1'; ctx.fill();
    for (let k = 0; k < 3; k++) { const ph = (t * 0.4 + k / 3) % 1; ctx.globalAlpha = 0.6 * (1 - ph); ctx.beginPath(); ctx.arc(x - w * 0.31 + ph * 40, by - h - 110 - ph * 120, 22 + ph * 30, 0, 7); ctx.fillStyle = '#E2E8F0'; ctx.fill(); } ctx.globalAlpha = 1;
    E.rr(ctx, x - w / 2, by - h, w, 60, 20); ctx.fillStyle = TSMC; ctx.fill();
    E.plainText(ctx, 'FAB', x, by - h + 32, 32, C.white, { weight: 900 });
    for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) { E.rr(ctx, x - w / 2 + 34 + c * (w - 68) / 5, by - h + 90 + r * 80, (w - 68) / 5 - 18, 50, 8); ctx.fillStyle = Math.sin(t * 2 + r + c) > 0.4 ? '#7DD3FC' : '#94A3B8'; ctx.fill(); }
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
  function datacenter(ctx, x, by, w, t, o = {}) { // KI-Rechenzentrum: Serverschränke mit Leuchtdioden
    const n = o.n || 4, rw = w / n - 16, h = o.h || w * 0.62;
    ctx.save(); ctx.shadowColor = 'rgba(2,6,23,0.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 20;
    E.rr(ctx, x - w / 2 - 20, by - h - 40, w + 40, h + 40, 24); ctx.fillStyle = '#1E293B'; ctx.fill(); ctx.restore();
    E.rr(ctx, x - w / 2 - 20, by - h - 40, w + 40, 44, 22); ctx.fillStyle = o.col || FER; ctx.fill();
    E.plainText(ctx, o.title || 'KI-RECHENZENTRUM', x, by - h - 17, 26, C.white, { weight: 900 });
    for (let i = 0; i < n; i++) { const rx = x - w / 2 + 8 + i * (rw + 16);
      E.rr(ctx, rx, by - h + 20, rw, h - 40, 10); ctx.fillStyle = '#0F172A'; ctx.fill();
      for (let k = 0; k < 7; k++) { const yy = by - h + 40 + k * (h - 80) / 7;
        E.rr(ctx, rx + 10, yy, rw - 20, (h - 80) / 7 - 10, 4); ctx.fillStyle = '#334155'; ctx.fill();
        for (let d = 0; d < 3; d++) { const on = Math.sin(t * (4 + d) + i * 1.7 + k * 2.3) > 0.2; ctx.beginPath(); ctx.arc(rx + 22 + d * 14, yy + 10, 4, 0, 7); ctx.fillStyle = on ? (d === 2 ? CHIP : '#4ADE80') : '#1E293B'; ctx.fill(); } } }
  }
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
  function texas(ctx, x, y, w, col, p = 1) { // stark vereinfachter Umriss von Texas
    const pts = [[0.25, 0], [0.45, 0], [0.45, 0.3], [0.75, 0.35], [0.95, 0.38], [1, 0.55], [0.95, 0.7], [0.75, 0.82], [0.62, 1], [0.5, 0.92], [0.42, 0.72], [0.3, 0.6], [0.18, 0.64], [0, 0.45], [0.25, 0.45]];
    const h = w * 0.95; ctx.save(); ctx.globalAlpha = p; ctx.beginPath(); pts.forEach(([a, b], i) => { const px = x - w / 2 + a * w, py = y - h / 2 + b * h; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.closePath();
    ctx.shadowColor = col; ctx.shadowBlur = 30; ctx.fillStyle = col + '40'; ctx.fill(); ctx.shadowBlur = 0; ctx.lineWidth = 5; ctx.strokeStyle = col; ctx.stroke(); ctx.restore();
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

  const captions = [
    [0, 1.75, 'Genau diese Aktie könnte'], [1.75, 2.75, 'eine der größten Chancen'], [2.75, 4.0, 'der nächsten Jahre werden.'], [4.0, 5.0, 'AMD ist jetzt gerade'], [5.0, 6.6, 'eingesprungen und gibt Sicherheit,'],
    [6.6, 7.75, 'und jetzt wird\'s richtig'], [7.75, 8.75, 'interessant. Die Aktie springt'], [8.75, 10.75, 'nach Monaten mal wieder zweistellig'], [10.75, 11.25, 'nach oben,'], [11.25, 13.0, 'aber 1 entscheidendes Stück fehlt'],
    [13.0, 13.25, 'hier noch.'], [13.25, 14.1, 'Also genau zuhören.'], [14.1, 15.6, 'Das Ganze ist keine Anlageberatung.'], [15.6, 16.5, 'Über 1 Like und'], [16.5, 17.25, '1 Follow würde ich'],
    [17.25, 18.0, 'mich freuen, und speicher'], [18.0, 18.6, 'dir das Video ab.'], [18.6, 19.75, 'Fermi baut nämlich in'], [19.75, 21.9, 'Texas 1 riesiges KI-Rechenzentrum,'], [21.9, 23.0, 'Projekt Matador, und der'],
    [23.0, 24.4, '1. Mietvertrag kam im'], [24.4, 27.0, 'August mit 222 Megawatt.'], [27.0, 28.6, 'Heute hat AMD dafür eine'], [28.6, 30.6, 'Kreditabsicherung zugesichert.'], [30.6, 31.75, 'Dazu kann ein Rahmen-'],
    [31.75, 33.75, 'abkommen bis zu 650'], [33.75, 35.9, 'Megawatt. Erweiterungen sind möglich.'], [35.9, 36.6, 'Das ist aber nur'], [36.6, 37.4, '1 Rahmen und kein'], [37.4, 38.9, 'unterschriebener Vertrag.'],
    [38.9, 39.6, 'Mehr als 1,'], [39.6, 40.75, '5 Milliarden Dollar hat'], [40.75, 41.6, 'Fermi laut'], [41.6, 43.3, 'eigener Angabe schon investiert.'], [43.3, 45.6, 'Der Haken: Die Projektfinanzierung steht'],
    [45.6, 46.0, 'noch nicht.'], [46.0, 47.0, 'Fermi nennt aber die'], [47.0, 48.9, 'Absicherung einen Meilenstein auf'], [48.9, 49.6, 'dem Weg dorthin.'], [49.6, 51.1, 'Zur Höhe sagt Fermi'],
    [51.1, 51.6, 'keine Zahl.'], [51.6, 52.4, 'Auch der Abschluss des'], [52.4, 53.8, 'Mietvertrages steht laut Fermi'], [53.8, 54.3, 'noch aus,'], [54.3, 55.1, 'und die langfristig'],
    [55.1, 56.5, 'genannten 17 Gigawatt gibt'], [56.5, 58.6, 'es nur mit bindenden Kundenverträgen.'], [58.6, 59.3, 'Für Fermi ist das'], [59.3, 60.9, 'hier erstmal 1 Riesen-Meilenstein,'], [60.9, 61.8, 'und natürlich ist es'],
    [61.8, 62.8, 'eine starke Wette auf'], [62.8, 63.5, 'die Zukunft.'], [63.5, 65.08, 'Mich würde eure Meinung interessieren.'],
  ];

  const HC = { hard: true, punchAmt: 0.06, flashAmt: 0.18 };
  const scenes = [
    // ===== HOOK 0–14,1 s: 9 Schnitte, gestaffelte Animationen, Pop/Ping auf jeder Bewegung =====
    { start: 0, mood: 'dark', poses: ['poses/zeigen'], punch: false, noBrand: true, ...HC, focus: { x: 540, y: 1000 },
      sfx: [[0.0, 'impact', 0.45, 0], [0.05, 'ping', 0.5, 0], [0.15, 'pop', 0.45, -0.1], [0.3, 'pop', 0.4, 0.1], [0.45, 'pop', 0.5, 0.2], [0.9, 'pop', 0.45, 0.3], [1.2, 'ping', 0.45, 0.3]],
      draw(ctx, lt, t) {
        E.liveBar(ctx, lt, 'FERMI  •  AMD SICHERT KREDIT AB  •  +13 % VORBÖRSLICH  •  PROJEKT MATADOR TEXAS  •  ');
        E.headline(ctx, [{ t: 'DIESE AKTIE', c: C.white, size: 125 }, { t: 'FERMI', c: C.white, size: 150, ribbon: FER }], lt, { y: 480, delay: 0.05 });
        glass(ctx, 690, 1000, 560, 400, { scale: pop(lt, 0.4, 0.45), accent: FER, title: 'FRMI · AKTIE', body: () => {
          E.lineChart(ctx, -220, -80, 440, 200, [[0, 0.6], [0.2, 0.7], [0.4, 0.62], [0.6, 0.75], [0.8, 0.7], [0.9, 0.35], [1, 0.05]], eOut(prog(lt, 0.5, 0.9)), '#22C55E', { lw: 10, area: true });
          if (lt > 1.2) tag(ctx, 'CHANCE?', 120, 150, GRN, pop(lt, 1.2, 0.35)); } });
        sparks(ctx, 900, 820, lt, 1.2, 16, '#4ADE80');
        panda(ctx, 'poses/zeigen', lt, t, { x: 170, h: 460 });
      } },
    { start: 1.75, mood: 'good', poses: ['emotions/begeistert'], ...HC, focus: { x: 640, y: 1000 },
      sfx: [[-0.06, 'whoosh', 0.4, 0.3], [0.05, 'pop', 0.45, 0], [0.3, 'pop', 0.4, 0.3], [0.5, 'ping', 0.5, 0.3], [0.7, 'pop', 0.4, 0.1]],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'EINE DER', c: C.white, size: 120 }, { t: 'GRÖSSTEN CHANCEN?', c: C.white, size: 92, ribbon: GRN }], lt);
        const s = pop(lt, 0.0, 0.45); E.withT(ctx, 690, 1000, s, 0, () => { pulseRings(ctx, 0, 0, t, '#4ADE80'); E.arrowUp(ctx, 0, 40, 1.4, C.green); });
        [[520, 760, 0.3], [880, 800, 0.5], [860, 1180, 0.7]].forEach(([x, y, at]) => { const k = pop(lt, at, 0.35); if (k > 0) E.withT(ctx, x, y, k, 0, () => P.coin(ctx, 0, 0, 46)); });
        sparks(ctx, 690, 940, lt, 0.5, 18, GOLD);
        panda(ctx, 'emotions/begeistert', lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },
    { start: 2.75, mood: 'blue', poses: ['poses/tipp_geben'], ...HC, focus: { x: 640, y: 1000 },
      sfx: [[-0.06, 'whoosh', 0.4, -0.3], [0.05, 'pop', 0.45, 0], ...ticks(0.2, 1.0, 5, 0.4, 0.2), [1.05, 'ping', 0.45, 0.2]],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'DER NÄCHSTEN', c: C.white, size: 120 }, { t: 'JAHRE', c: GOLD, size: 150 }], lt);
        const yr = Math.min(2031, 2026 + Math.floor(prog(lt, 0.2, 0.85) * 5.99));
        glass(ctx, 690, 1000, 440, 420, { scale: pop(lt, 0.0, 0.4), accent: GOLD, title: 'ZEITHORIZONT', body: () => { bigNum(ctx, String(yr), 0, 10, 150, C.white); label(ctx, '2026 → 2031', 0, 120, 30); } });
        sparks(ctx, 690, 1000, lt, 1.05, 16, GOLD);
        panda(ctx, 'poses/tipp_geben', lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },
    { start: 4.0, mood: 'dark', poses: ['emotions/ueberrascht', 'poses/praesentieren'], ...HC, focus: { x: 640, y: 1000 },
      sfx: [[-0.06, 'whoosh', 0.4, 0.3], [0.05, 'impact', 0.35, 0], [0.1, 'pop', 0.45, 0.2], [0.4, 'pop', 0.4, 0.3], [1.0, 'snap', 0.4, 0.2], [1.3, 'ding', 0.45, 0.2], [1.6, 'pop', 0.4, 0.3], [1.9, 'ping', 0.45, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'AMD SPRINGT', c: C.white, size: 125 }, { t: 'EIN!', c: C.white, size: 150, ribbon: AMD }]],
          [1.0, [{ t: 'UND GIBT', c: C.white, size: 125 }, { t: 'SICHERHEIT', c: C.white, size: 130, ribbon: GRN }]]]);
        const mv = eInOut(prog(lt, 1.0, 0.5));
        chip(ctx, lerp(690, 560, mv), 1000, lerp(1.05, 0.7, mv) * pop(lt, 0.05, 0.45), AMD, 'AMD', t);
        if (lt > 1.0) shield(ctx, 860, 1000, 0.75 * pop(lt, 1.3, 0.45), GRN, '✓', 'ABGESICHERT');
        sparks(ctx, 860, 1000, lt, 1.3, 20, '#4ADE80');
        pandaSeq(ctx, [[0, 'emotions/ueberrascht'], [1.0, 'poses/praesentieren']], lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },
    { start: 6.6, mood: 'dark', poses: ['emotions/cool'], ...HC, focus: { x: 640, y: 1000 },
      sfx: [[-0.06, 'whoosh', 0.4, -0.3], [0.05, 'pop', 0.5, 0], [0.3, 'pop', 0.35, -0.3], [0.45, 'pop', 0.35, 0.3], [0.6, 'pop', 0.35, 0], [0.8, 'ping', 0.4, 0.2]],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'JETZT WIRD\'S', c: C.white, size: 125 }, { t: 'INTERESSANT', c: GOLD, size: 125 }], lt);
        glass(ctx, 700, 980, 440, 440, { scale: pop(lt, 0.0, 0.4), body: () => { bigNum(ctx, '!', 0, 20, 300 * (1 + 0.05 * Math.sin(lt * 7)), GOLD); } });
        for (let i = 0; i < 3; i++) { const s = pop(lt, 0.3 + i * 0.15, 0.3); const a = t * 1.6 + i * 2.1; ctx.save(); ctx.shadowColor = GOLD; ctx.shadowBlur = 16; ctx.beginPath(); ctx.arc(700 + Math.cos(a) * 290, 980 + Math.sin(a) * 290, 14 * s, 0, 7); ctx.fillStyle = GOLD; ctx.fill(); ctx.restore(); }
        panda(ctx, 'emotions/cool', lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },
    { start: 7.75, mood: 'good', poses: ['emotions/begeistert'], ...HC, focus: { x: 640, y: 1000 },
      sfx: [[-0.06, 'whoosh', 0.4, 0.3], [0.05, 'pop', 0.45, 0], [0.3, 'roll', 0.3, 0.2], [0.95, 'impact', 0.4, 0.2], [1.0, 'ping', 0.5, 0.3], [1.3, 'pop', 0.4, 0.3]],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'DIE AKTIE', c: C.white, size: 125 }, { t: 'SPRINGT!', c: C.white, size: 140, ribbon: GRN }], lt);
        glass(ctx, 690, 1000, 600, 440, { scale: pop(lt, 0.0, 0.4), title: 'FRMI · KURS', body: () => {
          const e = E.lineChart(ctx, -240, -100, 480, 240, [[0, 0.72], [0.15, 0.78], [0.3, 0.75], [0.45, 0.82], [0.6, 0.8], [0.75, 0.85], [0.85, 0.82], [0.93, 0.2], [1, 0.1]], eOut(prog(lt, 0.15, 0.9)), '#22C55E', { lw: 11, area: true });
          if (lt > 0.95) tag(ctx, 'NACH MONATEN', -110, -150, '#334155', pop(lt, 1.3, 0.35));
          if (lt > 0.95 && e) { ctx.save(); ctx.shadowColor = '#4ADE80'; ctx.shadowBlur = 20; ctx.beginPath(); ctx.arc(e[0], e[1], 14 * pop(lt, 0.95, 0.3), 0, 7); ctx.fillStyle = '#4ADE80'; ctx.fill(); ctx.restore(); } } });
        sparks(ctx, 900, 820, lt, 1.0, 20, '#4ADE80');
        panda(ctx, 'emotions/begeistert', lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },
    { start: 9.4, mood: 'good', poses: ['poses/zeigen'], ...HC, focus: { x: 640, y: 1000 },
      sfx: [[-0.06, 'whoosh', 0.4, -0.3], [0.05, 'pop', 0.45, 0.2], ...ticks(0.2, 1.0, 8, 0.4, 0.2), [1.05, 'cash', 0.45, 0.2], [1.1, 'ping', 0.45, 0.3], [1.4, 'pop', 0.4, 0.3]],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'ZWEISTELLIG', c: C.white, size: 130 }, { t: 'NACH OBEN', c: C.white, size: 130, ribbon: GRN }], lt);
        const v = lerp(0, 13, eOut(prog(lt, 0.2, 0.85)));
        glass(ctx, 690, 1000, 540, 400, { scale: pop(lt, 0.0, 0.4), accent: GRN, title: 'VORBÖRSLICH · 13.10.', body: () => { bigNum(ctx, `+${de(v)} %`, 0, 20, 170, '#4ADE80'); } });
        E.withT(ctx, 900, 790, pop(lt, 1.05, 0.4), 0, () => E.arrowUp(ctx, 0, 0, 0.7, C.green));
        sparks(ctx, 690, 1000, lt, 1.05, 22, '#4ADE80');
        panda(ctx, 'poses/zeigen', lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },
    { start: 11.25, mood: 'bad', poses: ['emotions/nachdenklich'], ...HC, focus: { x: 640, y: 1000 },
      sfx: [[-0.06, 'whoosh', 0.4, 0.3], [0.05, 'pop', 0.45, -0.1], [0.2, 'pop', 0.4, 0.2], [0.35, 'pop', 0.4, 0.1], [0.9, 'down', 0.35, 0.2], [1.0, 'glitch', 0.3, 0.2], [1.3, 'ping', 0.4, 0.2]],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'ABER 1 STÜCK', c: C.white, size: 120 }, { t: 'FEHLT NOCH', c: C.white, size: 130, ribbon: '#DC2626' }], lt);
        [['AMD', AMD, 560, 860, 0.05], ['TEXAS', FER, 800, 860, 0.2], ['STROM', '#2563EB', 560, 1100, 0.35]].forEach(([lab, col, x, y, at]) => P.puzzle(ctx, x, y, 1.1 * pop(lt, at, 0.4), col, { label: lab, size: 34 }));
        if (lt > 0.6) { ctx.save(); ctx.setLineDash([16, 12]); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 6; E.rr(ctx, 800 - 110, 1100 - 110, 220, 220, 10); ctx.stroke(); ctx.restore(); bigNum(ctx, '?', 800, 1110, 130 * pop(lt, 0.9, 0.4), '#F87171'); }
        panda(ctx, 'emotions/nachdenklich', lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },
    { start: 13.25, mood: 'dark', poses: ['poses/tipp_geben'], ...HC, focus: { x: 640, y: 1000 },
      sfx: [[-0.06, 'whoosh', 0.4, -0.3], [0.05, 'pop', 0.45, 0], [0.25, 'ping', 0.45, 0.2], [0.5, 'pop', 0.35, 0.3]],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'ALSO GENAU', c: C.white, size: 125 }, { t: 'ZUHÖREN!', c: C.white, size: 140, ribbon: '#7C3AED' }], lt);
        E.withT(ctx, 700, 1000, pop(lt, 0.0, 0.4), 0, () => { pulseRings(ctx, 0, 0, t, '#A78BFA', 4, 300);
          ctx.save(); ctx.shadowColor = '#A78BFA'; ctx.shadowBlur = 30; ctx.beginPath(); ctx.arc(0, 0, 90, 0, 7); ctx.fillStyle = '#7C3AED'; ctx.fill(); ctx.restore();
          for (let i = 0; i < 5; i++) { const h = 30 + 50 * Math.abs(Math.sin(t * 8 + i * 1.3)); E.rr(ctx, -56 + i * 24, -h / 2, 14, h, 7); ctx.fillStyle = C.white; ctx.fill(); } });
        panda(ctx, 'poses/tipp_geben', lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },

    // ===== Ruhiger Teil =====
    { // 14,1–18,6: keine Anlageberatung + Like/Follow/Speichern
      start: 14.1, mood: 'neutral', poses: ['emotions/augenzwinkern', 'emotions/freundlich'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [0.3, 'paper', 0.3, 0.2], [1.6, 'pop', 0.4, 0.3], [2.1, 'pop', 0.4, 0.3], [3.4, 'ping', 0.4, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'KEINE', c: C.white, size: 130 }, { t: 'ANLAGEBERATUNG', c: C.white, size: 110, ribbon: '#2563EB' }]],
          [1.5, [{ t: 'LIKE & FOLLOW', c: C.white, size: 115, ribbon: '#FF3B5C' }, { t: '+ SPEICHERN', c: GOLD, size: 110 }]]]);
        if (lt < 1.5) glass(ctx, 680, 960, 560, 360, { scale: pop(lt, 0.1, 0.5), accent: '#2563EB', title: 'HINWEIS', body: () => { label(ctx, 'NUR INFORMATION', 0, -5, 48, C.white); label(ctx, 'KEINE KAUFEMPFEHLUNG', 0, 65, 32); } });
        else { P.heart(ctx, 820, 800, 1.4 * pop(lt, 1.6, 0.4) * (1 + Math.sin(t * 6) * 0.05)); E.pill(ctx, '+ FOLGEN', 820, 1060, 44, '#FF3B5C', C.white, pop(lt, 2.1, 0.45)); tag(ctx, 'SPEICHERN', 820, 1180, '#334155', pop(lt, 3.4, 0.45)); }
        pandaSeq(ctx, [[0, 'emotions/augenzwinkern'], [1.5, 'emotions/freundlich']], lt, t, { x: 170, h: 460 });
      } },
    { // 18,6–23,0: Fermi baut in Texas KI-Rechenzentrum – Projekt Matador
      start: 18.6, mood: 'blue', poses: ['poses/praesentieren'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [0.4, 'pop', 0.4, 0.2], [1.3, 'pop', 0.4, 0.2], [3.3, 'swell', 0.3, 0], [3.35, 'ding', 0.4, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'FERMI BAUT IN', c: C.white, size: 120 }, { t: 'TEXAS', c: C.white, size: 150, ribbon: FER }]],
          [1.2, [{ t: 'RIESIGES', c: C.white, size: 125 }, { t: 'KI-RECHENZENTRUM', c: CHIP, size: 100 }]],
          [3.3, [{ t: 'PROJEKT', c: C.white, size: 125 }, { t: 'MATADOR', c: C.white, size: 140, ribbon: FER }]]]);
        if (lt < 1.2) { texas(ctx, 680, 980, 520 * pop(lt, 0.3, 0.5), FER); if (lt > 0.4) { pulseRings(ctx, 640, 1000, t, FER, 2, 120); } }
        else { const k = eOut(prog(lt, 1.2, 0.7)); ctx.save(); ctx.translate(0, (1 - k) * 200); ctx.globalAlpha = k; datacenter(ctx, 680, 1230, 560, t, { title: lt > 3.3 ? 'PROJEKT MATADOR' : 'KI-RECHENZENTRUM' }); ctx.restore();
          [['GAS', 0.0], ['ATOM', 0.25], ['SOLAR', 0.5]].forEach(([n, d], i) => tag(ctx, n, 470 + i * 210, 700, '#334155', pop(lt, 1.6 + d, 0.35))); }
        panda(ctx, 'poses/praesentieren', lt, t, { x: 160, h: 440 });
      } },
    { // 23,0–27,0: 1. Mietvertrag im August – 222 MW
      start: 23.0, mood: 'good', poses: ['poses/zeigen'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [0.3, 'paper', 0.3, 0.2], [1.0, 'pop', 0.4, 0.2], ...ticks(1.6, 2.9, 9, 0.4, 0.2), [2.95, 'ding', 0.45, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: '1. MIETVERTRAG', c: C.white, size: 115 }, { t: 'IM AUGUST', c: C.white, size: 125, ribbon: GRN }]],
          [1.5, [{ t: 'PHASE 1:', c: C.white, size: 120 }, { t: '222 MEGAWATT', c: GOLD, size: 115 }]]]);
        const v = lerp(0, 222, eOut(prog(lt, 1.6, 1.3)));
        glass(ctx, 690, 980, 560, 440, { scale: pop(lt, 0.1, 0.5), accent: GRN, title: 'MIETVERTRAG · 10. AUG.', body: () => {
          bolt(ctx, -170, 10, pop(lt, 1.0, 0.4)); bigNum(ctx, String(Math.round(v)), 60, -10, 150, C.white); label(ctx, 'MEGAWATT', 60, 90, 34); } });
        sparks(ctx, 750, 960, lt, 2.95, 18, GOLD);
        panda(ctx, 'poses/zeigen', lt, t, { x: 160, h: 440 });
      } },
    { // 27,0–30,6: Heute AMD Kreditabsicherung
      start: 27.0, mood: 'dark', poses: ['poses/praesentieren', 'emotions/begeistert'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [0.3, 'pop', 0.4, 0.2], [1.5, 'riser', 0.3, 0], [1.6, 'impact', 0.35, 0.1], [1.65, 'ping', 0.45, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'HEUTE: AMD', c: C.white, size: 125, ribbon: AMD }, { t: 'SICHERT AB', c: C.white, size: 125 }]],
          [1.6, [{ t: 'KREDIT-', c: C.white, size: 130 }, { t: 'ABSICHERUNG', c: C.white, size: 120, ribbon: GRN }]]]);
        chip(ctx, 520, 950, 0.65 * pop(lt, 0.2, 0.45), AMD, 'AMD', t);
        const b = eOut(prog(lt, 0.8, 0.6)); if (b > 0) P.beam(ctx, 610, 950, lerp(610, 760, b), 950, t, 1, AMD);
        shield(ctx, 840, 960, 0.8 * pop(lt, 1.6, 0.45), GRN, 'KREDIT', 'ABGESICHERT');
        if (lt > 2.0) tag(ctx, '13. OKTOBER', 690, 1230, '#334155', pop(lt, 2.0, 0.4));
        sparks(ctx, 840, 960, lt, 1.6, 22, '#4ADE80');
        pandaSeq(ctx, [[0, 'poses/praesentieren'], [1.6, 'emotions/begeistert']], lt, t, { x: 150, h: 420 });
      } },
    { // 30,6–35,9: Rahmenabkommen bis 650 MW, Erweiterungen moeglich
      start: 30.6, mood: 'good', poses: ['poses/analysieren', 'emotions/begeistert'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [0.5, 'pop', 0.35, -0.2], ...ticks(1.7, 3.0, 9, 0.4, 0.2), [3.05, 'sub', 0.3, 0], [3.1, 'ding', 0.45, 0.2], [4.0, 'pop', 0.4, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'RAHMENABKOMMEN', c: C.white, size: 105 }, { t: 'BIS ZU 650 MW', c: C.white, size: 120, ribbon: GRN }]],
          [3.3, [{ t: 'ERWEITERUNGEN', c: C.white, size: 110 }, { t: 'MÖGLICH', c: GOLD, size: 140 }]]]);
        bars(ctx, 650, 1230, [['PHASE 1', 222, '#64748B', '222 MW', 0.5], ['RAHMEN', 650, '#22C55E', '650 MW', 1.7]], lt, 0.5, { max: 700, h: 480 });
        if (lt > 3.9) tag(ctx, '+ MEHR?', 870, 680, GRN, pop(lt, 4.0));
        pandaSeq(ctx, [[0, 'poses/analysieren'], [3.3, 'emotions/begeistert']], lt, t, { x: 150, h: 420 });
      } },
    { // 35,9–38,9: Nur Rahmen, kein unterschriebener Vertrag
      start: 35.9, mood: 'bad', poses: ['emotions/nachdenklich'], focus: { x: 640, y: 930 }, shake: [1.55], shakeSfx: false,
      sfx: [[-0.12, 'whoosh', 0.25, 0], [0.2, 'paper', 0.35, 0.2], [1.55, 'stamp', 0.45, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'NUR 1 RAHMEN', c: C.white, size: 120 }, { t: 'KEIN VERTRAG', c: C.white, size: 125, ribbon: '#DC2626' }]]]);
        doc(ctx, 700, 1000, 0.95 * pop(lt, 0.15, 0.5), { title: 'RAHMEN', sign: 0 });
        E.stamp(ctx, 'NICHT UNTERSCHRIEBEN', 700, 1080, lt, 1.5, { size: 54, rot: -0.16 });
        panda(ctx, 'emotions/nachdenklich', lt, t, { x: 160, h: 440 });
      } },
    { // 38,9–43,3: >1,5 Mrd. $ investiert
      start: 38.9, mood: 'good', poses: ['emotions/ueberrascht'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [0.3, 'pop', 0.4, 0.2], ...ticks(0.7, 2.0, 10, 0.4, 0.2), [2.05, 'cash', 0.5, 0.2], [2.8, 'pop', 0.4, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'SCHON INVESTIERT:', c: C.white, size: 105 }, { t: '> 1,5 MRD. $', c: C.white, size: 130, ribbon: GRN }]]]);
        const v = lerp(0, 1.5, eOut(prog(lt, 0.7, 1.3)));
        glass(ctx, 700, 920, 560, 340, { scale: pop(lt, 0.2, 0.5), accent: GRN, title: 'FERMI · INVESTIERT', body: () => { bigNum(ctx, `${de(v, 1)} MRD. $`, 0, 25, 110, '#4ADE80'); } });
        for (let i = 0; i < 6; i++) { const s = pop(lt, 2.05 + i * 0.08, 0.3); if (s > 0) E.withT(ctx, 560 + (i % 3) * 140, 1200 - Math.floor(i / 3) * 30, s, 0, () => P.coinStack(ctx, 0, 0, 40, 4 + (i % 3))); }
        if (lt > 2.8) tag(ctx, 'LAUT FERMI', 700, 1300, '#334155', pop(lt, 2.8, 0.4));
        panda(ctx, 'emotions/ueberrascht', lt, t, { x: 160, h: 440 });
      } },
    { // 43,3–49,6: Der Haken – Projektfinanzierung steht nicht; aber Meilenstein
      start: 43.3, mood: 'bad', poses: ['emotions/nachdenklich', 'poses/tipp_geben'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [0.15, 'impact', 0.35, 0], [0.2, 'down', 0.3, 0.2], [1.2, 'pop', 0.4, 0.2], [2.7, 'pop', 0.4, 0.2], [3.9, 'ping', 0.45, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DER HAKEN:', c: C.white, size: 135, ribbon: '#DC2626' }, { t: 'FINANZIERUNG OFFEN', c: C.white, size: 92 }]],
          [2.7, [{ t: 'ABER: EIN', c: C.white, size: 120 }, { t: 'MEILENSTEIN', c: C.white, size: 130, ribbon: GRN }]]]);
        const steps = [['GRUNDSTÜCK', 'yes', 1.0], ['MIETER (PHASE 1)', 'yes', 1.2], ['AMD-ABSICHERUNG', 'yes', 2.8], ['FINANZIERUNG', 'q', 1.4]];
        glass(ctx, 690, 1000, 620, 480, { scale: pop(lt, 0.3, 0.5), title: 'WEG ZUR FINANZIERUNG', body: (w, h) => {
          steps.forEach(([txt, st, at], i) => { const s = pop(lt, at, 0.4); if (s <= 0) return; E.withT(ctx, -w / 2 + 70, -h / 2 + 130 + i * 85, s, 0, () => {
            E.rr(ctx, -22, -22, 44, 44, 10); ctx.fillStyle = st === 'yes' ? GRN : '#F59E0B'; ctx.fill();
            E.plainText(ctx, st === 'yes' ? '✓' : '?', 0, 2, 30, C.white, { weight: 900 }); E.plainText(ctx, txt, 44, 2, 34, C.white, { weight: 900, align: 'left' }); }); });
          if (lt > 3.9) { ctx.save(); ctx.shadowColor = GOLD; ctx.shadowBlur = 20; E.withT(ctx, 220, -h / 2 + 130 + 3 * 85, pop(lt, 3.9, 0.4), 0, () => { ctx.fillStyle = GOLD; ctx.fillRect(-4, -40, 8, 60); ctx.beginPath(); ctx.moveTo(4, -40); ctx.lineTo(50, -26); ctx.lineTo(4, -12); ctx.fill(); }); ctx.restore(); } } });
        pandaSeq(ctx, [[0, 'emotions/nachdenklich'], [2.7, 'poses/tipp_geben']], lt, t, { x: 150, h: 420 });
      } },
    { // 49,6–54,3: Keine Zahl zur Hoehe, Mietvertrag-Abschluss steht aus
      start: 49.6, mood: 'dark', poses: ['poses/analysieren'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [0.4, 'pop', 0.4, 0.2], [1.6, 'glitch', 0.3, 0.2], [2.2, 'pop', 0.4, 0.2], [3.0, 'tick', 0.4, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'HÖHE DER', c: C.white, size: 125 }, { t: 'ABSICHERUNG?', c: GOLD, size: 115 }]],
          [2.0, [{ t: 'MIETVERTRAG', c: C.white, size: 120 }, { t: 'NOCH NICHT FIX', c: C.white, size: 110, ribbon: '#F59E0B' }]]]);
        glass(ctx, 560, 980, 380, 340, { scale: pop(lt, 0.3, 0.45), accent: AMD, title: 'BETRAG', body: () => { ctx.save(); ctx.filter = 'blur(12px)'; bigNum(ctx, '$ ???', 0, 20, 90, C.white); ctx.restore(); if (lt > 1.5) tag(ctx, 'KEINE ZAHL', 0, 110, '#DC2626', pop(lt, 1.6, 0.4)); } });
        glass(ctx, 900, 1000, 300, 340, { scale: pop(lt, 2.2, 0.45), accent: '#F59E0B', title: 'VERTRAG', body: () => { P.hourglass(ctx, 0, 30, 170, t); } });
        panda(ctx, 'poses/analysieren', lt, t, { x: 150, h: 420 });
      } },
    { // 54,3–58,6: 17 GW nur mit bindenden Kundenvertraegen
      start: 54.3, mood: 'blue', poses: ['poses/zeigen'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [0.3, 'pop', 0.4, 0.2], ...ticks(0.6, 1.9, 9, 0.4, 0.2), [1.95, 'sub', 0.3, 0], [2.0, 'ding', 0.4, 0.2], [2.4, 'stamp', 0.35, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'VISION:', c: C.white, size: 125 }, { t: '17 GIGAWATT', c: C.white, size: 125, ribbon: '#2563EB' }]],
          [2.3, [{ t: 'NUR MIT', c: C.white, size: 125 }, { t: 'KUNDENVERTRÄGEN', c: GOLD, size: 100 }]]]);
        const v = lerp(0, 17, eOut(prog(lt, 0.6, 1.3)));
        glass(ctx, 690, 960, 560, 420, { scale: pop(lt, 0.2, 0.5), accent: '#2563EB', title: 'LANGFRISTIG', body: () => {
          bolt(ctx, -180, 0, pop(lt, 0.4, 0.4)); bigNum(ctx, `${Math.round(v)} GW`, 50, -10, 140, C.white);
          if (lt > 2.3) E.withT(ctx, 0, 120, pop(lt, 2.4, 0.4), 0, () => { E.rr(ctx, -200, -32, 400, 64, 32); ctx.fillStyle = '#F59E0B'; ctx.fill(); E.plainText(ctx, '⚠ BEDINGUNG', 0, 2, 32, C.white, { weight: 900 }); }); } });
        panda(ctx, 'poses/zeigen', lt, t, { x: 150, h: 420 });
      } },
    { // 58,6–63,5: Riesen-Meilenstein – starke Wette auf die Zukunft
      start: 58.6, mood: 'good', poses: ['emotions/begeistert', 'emotions/cool'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [0.4, 'pop', 0.4, 0.2], [0.9, 'ding', 0.4, 0.2], [3.0, 'rocket', 0.25, 0.2], [3.4, 'ping', 0.4, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'RIESEN-', c: C.white, size: 135 }, { t: 'MEILENSTEIN', c: C.white, size: 130, ribbon: GRN }]],
          [2.9, [{ t: 'STARKE WETTE', c: C.white, size: 120 }, { t: 'AUF DIE ZUKUNFT', c: GOLD, size: 105 }]]]);
        if (lt < 2.9) { E.withT(ctx, 700, 1050, pop(lt, 0.3, 0.5), 0, () => { pulseRings(ctx, 0, -60, t, '#4ADE80', 3, 200);
            ctx.save(); ctx.shadowColor = GOLD; ctx.shadowBlur = 24; ctx.fillStyle = '#E2E8F0'; ctx.fillRect(-6, -260, 12, 300); ctx.fillStyle = GOLD; ctx.beginPath(); ctx.moveTo(6, -260); ctx.lineTo(170 + Math.sin(t * 5) * 10, -210); ctx.lineTo(6, -160); ctx.fill(); ctx.restore();
            E.rr(ctx, -140, 30, 280, 40, 20); ctx.fillStyle = '#334155'; ctx.fill(); });
          sparks(ctx, 760, 850, lt, 0.9, 20, GOLD); }
        else { const up = eInOut(prog(lt, 3.0, 2.0)); P.rocket(ctx, 720, lerp(1180, 820, up), 360, t, { label: 'FERMI', flame: true }); }
        pandaSeq(ctx, [[0, 'emotions/begeistert'], [2.9, 'emotions/cool']], lt, t, { x: 150, h: 420 });
      } },
    { // 63,5–Ende: Umfrage
      start: 63.5, mood: 'blue', poses: ['emotions/freundlich'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [0.2, 'pop', 0.4, 0.2], [0.5, 'pop', 0.4, 0.2], [0.75, 'pop', 0.4, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'EURE MEINUNG?', c: C.white, size: 115, ribbon: '#7C3AED' }]]]);
        poll(ctx, 680, 990, 660, lt, 0.1, [['Fermi liefert', '#22C55E'], ['Erst beweisen', '#EF4444']]);
        panda(ctx, 'emotions/freundlich', lt, t, { x: 150, h: 420 });
      } },
  ];

  const music = {
    bpm: 96, chords: [['A', 'm'], ['F', ''], ['C', ''], ['G', '']], level: 0.5, abs: 0.1,
    sections: [[0, 'tension'], [4.0, 'pulse'], [7.75, 'full'], [14.1, 'pulse'], [18.6, 'full'], [35.9, 'tension'], [38.9, 'full'], [43.3, 'tension'], [54.3, 'pulse'], [58.6, 'full']],
    drops: [7.2, 33.1],
  };

  window.VIDEO = { name: 'fermi-amd', style: 'clean', fps: 30, duration: 65.085, scenes, captions, xfade: 0.35, grain: 0.035, bokeh: false, endFade: false, pandaFixed: true, music };
})();
