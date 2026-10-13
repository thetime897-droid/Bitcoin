// Trade Republic Altersvorsorgedepot – Short (63,6 s). Clean-Stil + NEU: Szenen-Einflüge (trans) und einfliegende Elemente (fly).
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
    if (lt < at) return; const d = o.dur || 0.55, p = Math.min(1, (lt - at) / d), k = E.eBack ? E.eBack(p) : eOut(p), [dx, dy] = DIRS[from] || [1, 0];
    const dist = o.dist || 900, ox = dx * dist * (1 - k), oy = dy * dist * (1 - k), rot = (o.rot ?? 0.35) * (1 - eOut(p)) * (dx || dy);
    if (p < 1) { ctx.save(); ctx.globalAlpha = 0.5 * (1 - p); ctx.strokeStyle = o.streak || 'rgba(255,255,255,0.9)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      for (let i = -2; i <= 2; i++) { const px = x + ox + (dy ? i * 50 : 0), py = y + oy + (dx ? i * 40 : 0), len = 160 + 120 * (1 - p);
        ctx.beginPath(); ctx.moveTo(px + dx * 140, py + dy * 140); ctx.lineTo(px + dx * (140 + len), py + dy * (140 + len)); ctx.stroke(); } ctx.restore(); }
    E.withT(ctx, x + ox, y + oy, o.scale ?? 1, rot + (o.baseRot || 0), () => fn());
  }
  const flySfx = (at, pan = 0.2, g = 0.32) => [[at - 0.04, 'whoosh', g, pan], [at + 0.38, 'pop', 0.42, pan]];

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

  const captions = [
    [0.0, 1.25, 'Wenn du Trade Republic'], [1.25, 2.25, 'nutzt, solltest du jetzt'], [2.25, 3.0, 'aufpassen, denn es gibt'], [3.0, 3.75, 'neue News.'],
    [3.75, 5.0, '0 Euro Gebühren für'], [5.0, 6.4, 'deine Altersvorsorge,'], [6.5, 7.25, 'fast, und wo da'], [7.25, 8.25, 'der Haken liegt und'],
    [8.25, 9.5, 'warum du jetzt aufpassen solltest,'], [9.5, 10.0, 'erklär ich dir.'], [10.0, 10.75, 'Sofort speicher dir das'], [10.75, 11.5, 'Video auf jeden Fall'],
    [11.5, 12.0, 'ab und schick es'], [12.0, 12.75, 'deinen Freunden.'], [12.75, 13.5, 'Das Ganze ist keine'], [13.5, 14.25, 'Anlageberatung.'],
    [14.25, 15.5, 'Trade Republic startet nämlich'], [15.5, 17.25, 'sein Altersvorsorgedepot, und das'], [17.25, 18.0, 'Wort kostenlos'], [18.2, 19.0, 'hakt hier 1 bisschen.'],
    [19.0, 20.25, 'Der Start des Altersvorsorge-'], [20.25, 23.25, 'depots ist der 01.01.2027, und'], [23.25, 23.5, 'bei Trade'], [23.75, 24.75, 'Republic kosten hier dann'],
    [24.75, 26.25, 'ETF-Käufe und Sparpläne'], [26.25, 28.25, 'in diesem Depot keine Ausführungsgebühr,'], [28.25, 29.25, 'und das Depot hat'], [29.25, 31.25, 'selbst keine laufende Gebühr.'],
    [31.25, 32.75, 'Zum Vergleich: Gesetzlich dürfen'], [32.75, 34.0, 'Standard-Depots bis zu'], [34.0, 35.25, '1 Prozent im Jahr kosten.'], [35.5, 36.5, 'Das wirklich Interessante ist'],
    [36.5, 37.0, 'der Staat.'], [37.25, 38.5, 'Auf die 1. 360'], [38.5, 39.75, 'Euro, die du einzahlst,'], [39.75, 41.0, 'gibt es 50 Prozent'],
    [41.0, 42.0, 'Zulage, auf'], [42.0, 43.25, 'alles bis 1.800 noch'], [43.25, 45.25, '25, und maximal gibt'], [45.25, 47.0, 'es 540 Euro im Jahr'],
    [47.0, 48.25, 'bei jedem Anbieter.'], [48.25, 49.75, 'Der Haken ist die Ungewissheit.'], [49.75, 50.75, 'Die ETFs selbst sollen'], [50.75, 52.25, 'langfristig möglichst ohne eigene'],
    [52.25, 53.0, 'Kosten sein.'], [53.0, 53.75, 'Aber wie lange und'], [53.75, 55.75, 'unter welchen Bedingungen, ist offen.'], [55.75, 57.2, 'Aus Sicht von Trade Republic kostenfrei,'],
    [57.5, 59.25, 'aus Sicht des Kleingedruckten noch nicht'], [59.25, 59.5, 'ganz, und'], [59.5, 60.25, 'weitere Anbieter'], [60.25, 61.25, 'wollen hier bis zum Start'],
    [61.25, 62.25, 'nachlegen. Schreib mir mal'], [62.25, 63.6, 'deine Meinung in die Kommentare.'],
  ];

  const HC = { hard: true, punchAmt: 0.06, flashAmt: 0.14 };
  const TS = (dir, extra = {}) => ({ trans: dir, transDur: 0.4, punchAmt: 0.05, flashAmt: 0.0, ...extra });
  const scenes = [
    // ===== HOOK 0–14,25 s: 11 Schnitte, Szenen schieben sich rein, Elemente fliegen ein =====
    { start: 0, mood: 'dark', poses: ['poses/zeigen'], punch: false, noBrand: true, ...HC, focus: { x: 540, y: 1000 },
      sfx: [[0.0, 'impact', 0.45, 0], [0.05, 'ping', 0.45, 0], ...flySfx(0.25, 0.4), [0.75, 'pop', 0.4, 0.3], [1.0, 'ping', 0.4, 0.3]],
      draw(ctx, lt, t) {
        E.liveBar(ctx, lt, 'TRADE REPUBLIC  •  ALTERSVORSORGEDEPOT AB 01.01.2027  •  0 € GEBÜHREN?  •  STAATLICHE ZULAGE  •  ');
        E.headline(ctx, [{ t: 'DU NUTZT', c: C.white, size: 125 }, { t: 'TRADE REPUBLIC?', c: C.white, size: 100, ribbon: TR }], lt, { y: 480, delay: 0.05 });
        fly(ctx, 720, 1010, lt, 0.25, 'right', () => appPhone(ctx, 0, 0, 640, t, { chart: eOut(prog(lt, 0.6, 0.8)) }));
        if (lt > 0.75) tag(ctx, 'DEPOT', 890, 760, TR, pop(lt, 0.75, 0.35));
        panda(ctx, 'poses/zeigen', lt, t, { x: 170, h: 460 });
      } },
    { start: 1.25, mood: 'bad', poses: ['emotions/ueberrascht'], ...TS('zoom'), focus: { x: 640, y: 1000 },
      sfx: [[-0.15, 'whoosh', 0.4, 0], [0.3, 'impact', 0.35, 0], [0.32, 'ping', 0.5, 0.2], [0.6, 'pop', 0.4, -0.2], [0.75, 'pop', 0.4, 0.3]],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'JETZT', c: C.white, size: 130 }, { t: 'AUFPASSEN!', c: C.white, size: 140, ribbon: RED }], lt);
        E.withT(ctx, 0, 0, 1, 0, () => pulseRings(ctx, 700, 1000, t, GOLD, 3, 260));
        warn(ctx, 700, 1000, pop(lt, 0.25, 0.4), t);
        E.questionMarks && lt > 0.6 && E.questionMarks(ctx, 900, 760, lt - 0.6, 2, GOLD);
        panda(ctx, 'emotions/ueberrascht', lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },
    { start: 3.0, mood: 'blue', poses: ['poses/praesentieren'], ...TS('left'), focus: { x: 640, y: 1000 },
      sfx: [[-0.15, 'whoosh', 0.4, -0.3], ...flySfx(0.1, 0.2), [0.25, 'paper', 0.35, 0.2], [0.55, 'ping', 0.45, 0.2]],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'NEUE', c: C.white, size: 140 }, { t: 'NEWS!', c: C.white, size: 150, ribbon: BLUE }], lt);
        const p = eOut(prog(lt, 0.05, 0.6));
        E.withT(ctx, 700, 990, lerp(0.1, 1, p), lerp(Math.PI * 3, -0.06, p), () => E.newspaper(ctx, 0, 0, 500, { masthead: 'BÖRSE', headline: ['0 € FÜR', 'DIE RENTE?'] }));
        sparks(ctx, 700, 990, lt, 0.55, 16, '#60A5FA');
        panda(ctx, 'poses/praesentieren', lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },
    { start: 3.75, mood: 'good', poses: ['emotions/begeistert'], ...TS('up'), focus: { x: 640, y: 1000 },
      sfx: [[-0.15, 'whoosh', 0.4, 0], [0.2, 'impact', 0.3, 0], [0.25, 'cash', 0.45, 0.2], ...flySfx(0.5, -0.3, 0.25), ...flySfx(0.7, 0.4, 0.25), [1.0, 'ping', 0.45, 0.3]],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: '0 €', c: '#4ADE80', size: 170 }, { t: 'GEBÜHREN', c: C.white, size: 120, ribbon: GRN }], lt);
        glass(ctx, 700, 1000, 460, 380, { scale: pop(lt, 0.1, 0.4), accent: GRN, body: () => { bigNum(ctx, '0 €', 0, 10, 200, '#4ADE80'); } });
        fly(ctx, 510, 800, lt, 0.5, 'left', () => P.coin(ctx, 0, 0, 55));
        fly(ctx, 900, 820, lt, 0.7, 'right', () => P.coin(ctx, 0, 0, 48));
        sparks(ctx, 700, 1000, lt, 0.25, 22, '#4ADE80');
        panda(ctx, 'emotions/begeistert', lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },
    { start: 5.0, mood: 'blue', poses: ['poses/tipp_geben'], ...TS('right'), focus: { x: 640, y: 1000 },
      sfx: [[-0.15, 'whoosh', 0.4, 0.3], ...flySfx(0.15, 0.3), ...ticks(0.5, 1.2, 6, 0.35, 0.2), [1.25, 'ding', 0.4, 0.2]],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'FÜR DEINE', c: C.white, size: 125 }, { t: 'ALTERSVORSORGE', c: CYAN, size: 105 }], lt);
        fly(ctx, 700, 1000, lt, 0.15, 'right', () => glass(ctx, 0, 0, 520, 440, { accent: CYAN, title: 'DEIN VERMÖGEN', body: () => {
          for (let i = 0; i < 5; i++) { const s = pop(lt, 0.5 + i * 0.14, 0.3); if (s > 0) E.withT(ctx, -160 + i * 80, 140, s, 0, () => P.coinStack(ctx, 0, 0, 30, 2 + i * 2)); }
          if (lt > 1.25) tag(ctx, 'RENTE', 0, -60, CYAN, pop(lt, 1.25, 0.35)); } }));
        panda(ctx, 'poses/tipp_geben', lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },
    { start: 6.5, mood: 'dark', poses: ['emotions/augenzwinkern'], ...TS('zoom'), focus: { x: 640, y: 1000 }, shake: [0.2], shakeSfx: 'stamp',
      sfx: [[-0.15, 'whoosh', 0.4, 0], [0.35, 'pop', 0.4, 0.2]],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: '… FAST!', c: GOLD, size: 160 }], lt);
        glass(ctx, 700, 990, 460, 340, { body: () => { bigNum(ctx, '0 €', 0, 10, 180, '#4ADE80'); } });
        E.stamp(ctx, 'FAST', 720, 990, lt, 0.15, { size: 110, rot: -0.2, color: '#F59E0B' });
        panda(ctx, 'emotions/augenzwinkern', lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },
    { start: 7.25, mood: 'bad', poses: ['emotions/nachdenklich'], ...TS('down'), focus: { x: 640, y: 1000 },
      sfx: [[-0.15, 'whoosh', 0.4, 0], [0.1, 'whoosh', 0.3, 0.3], [0.6, 'impact', 0.3, 0.2], [0.65, 'ping', 0.45, 0.2]],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'WO LIEGT', c: C.white, size: 130 }, { t: 'DER HAKEN?', c: C.white, size: 130, ribbon: RED }], lt);
        P.hook(ctx, 760, lerp(150, 740, E.eBack ? E.eBack(prog(lt, 0.05, 0.6)) : eOut(prog(lt, 0.05, 0.6))), 1.15, t, 'GEBÜHREN?');
        panda(ctx, 'emotions/nachdenklich', lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },
    { start: 8.25, mood: 'dark', poses: ['poses/zeigen'], ...TS('left'), focus: { x: 640, y: 1000 },
      sfx: [[-0.15, 'whoosh', 0.4, -0.3], ...flySfx(0.15, 0.3), ...flySfx(0.45, -0.2, 0.25), ...flySfx(0.75, 0.3, 0.25)],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'WARUM DU', c: C.white, size: 125 }, { t: 'AUFPASSEN SOLLTEST', c: GOLD, size: 92 }], lt);
        [['STARTDATUM', 820, 0.15, 'right', CYAN], ['KOSTEN', 820, 0.45, 'left', TR], ['ZULAGE', 820, 0.75, 'right', GRN]].forEach(([txt, y, at, from, col], i) =>
          fly(ctx, 690, 800 + i * 150, lt, at, from, () => { E.rr(ctx, -230, -55, 460, 110, 30); ctx.fillStyle = col + '33'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = col; ctx.stroke(); E.plainText(ctx, `${i + 1}. ${txt}`, 0, 3, 46, C.white, { weight: 900 }); }));
        panda(ctx, 'poses/zeigen', lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },
    { start: 9.5, mood: 'blue', poses: ['poses/tipp_geben'], ...TS('up'), focus: { x: 640, y: 1000 },
      sfx: [[-0.15, 'whoosh', 0.4, 0], [0.2, 'pop', 0.45, 0.2], [0.45, 'ping', 0.4, 0.2]],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'ERKLÄR', c: C.white, size: 140 }, { t: 'ICH DIR!', c: C.white, size: 140, ribbon: VIO }], lt);
        E.withT(ctx, 700, 1000, pop(lt, 0.1, 0.4), 0, () => { pulseRings(ctx, 0, 0, t, '#A78BFA', 3, 220); ctx.save(); ctx.shadowColor = '#A78BFA'; ctx.shadowBlur = 30; ctx.beginPath(); ctx.arc(0, 0, 100, 0, 7); ctx.fillStyle = VIO; ctx.fill(); ctx.restore(); bigNum(ctx, '!', 0, 20, 140, C.white); });
        panda(ctx, 'poses/tipp_geben', lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },
    { start: 10.0, mood: 'neutral', poses: ['emotions/freundlich'], ...TS('right'), focus: { x: 640, y: 1000 },
      sfx: [[-0.15, 'whoosh', 0.4, 0.3], ...flySfx(0.2, 0.3), [0.9, 'ding', 0.4, 0.3], ...flySfx(1.6, 0.4), [2.1, 'ping', 0.4, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'SPEICHERN', c: C.white, size: 130, ribbon: GOLD }, { t: '& TEILEN!', c: C.white, size: 120 }]]]);
        fly(ctx, 600, 960, lt, 0.2, 'left', () => glass(ctx, 0, 0, 260, 300, { accent: GOLD, body: () => { E.withT(ctx, 0, -10, 1, 0, () => { ctx.beginPath(); ctx.moveTo(-60, -90); ctx.lineTo(60, -90); ctx.lineTo(60, 90); ctx.lineTo(0, 45); ctx.lineTo(-60, 90); ctx.closePath(); ctx.fillStyle = GOLD; ctx.fill(); }); } }));
        fly(ctx, 880, 960, lt, 1.6, 'right', () => glass(ctx, 0, 0, 260, 300, { accent: GRN, body: () => { ctx.save(); ctx.translate(0, -10); ctx.fillStyle = '#4ADE80'; ctx.beginPath(); ctx.moveTo(-70, 60); ctx.quadraticCurveTo(-60, -30, 20, -30); ctx.lineTo(20, -75); ctx.lineTo(85, 0); ctx.lineTo(20, 75); ctx.lineTo(20, 30); ctx.quadraticCurveTo(-30, 25, -70, 60); ctx.fill(); ctx.restore(); } }));
        if (lt > 2.0) tag(ctx, 'AN FREUNDE', 880, 1150, GRN, pop(lt, 2.1, 0.35));
        panda(ctx, 'emotions/freundlich', lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },
    { start: 12.75, mood: 'neutral', poses: ['emotions/augenzwinkern'], ...TS('down'), focus: { x: 640, y: 1000 },
      sfx: [[-0.15, 'whoosh', 0.35, 0], [0.3, 'paper', 0.3, 0.2]],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'KEINE', c: C.white, size: 130 }, { t: 'ANLAGEBERATUNG', c: C.white, size: 110, ribbon: BLUE }], lt);
        fly(ctx, 690, 970, lt, 0.1, 'up', () => glass(ctx, 0, 0, 540, 320, { accent: BLUE, title: 'HINWEIS', body: () => { label(ctx, 'NUR INFORMATION', 0, -5, 46, C.white); label(ctx, 'KEINE KAUFEMPFEHLUNG', 0, 60, 30); } }), { rot: 0.1 });
        panda(ctx, 'emotions/augenzwinkern', lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },

    // ===== Ruhiger Teil: jede Szene fliegt/schiebt sich rein, Elemente fliegen einzeln ein =====
    { // 14,25–17,25: TR startet Altersvorsorgedepot
      start: 14.25, mood: 'blue', poses: ['poses/praesentieren'], ...TS('right', { transDur: 0.5 }), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0.3], ...flySfx(0.3, 0.3), [1.4, 'pop', 0.4, 0.2], [1.7, 'ping', 0.4, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'TRADE REPUBLIC', c: C.white, size: 110, ribbon: TR }, { t: 'STARTET', c: C.white, size: 130 }]],
          [1.25, [{ t: 'ALTERSVORSORGE-', c: C.white, size: 100 }, { t: 'DEPOT', c: C.white, size: 150, ribbon: CYAN }]]]);
        fly(ctx, 720, 1010, lt, 0.3, 'right', () => appPhone(ctx, 0, 0, 620, t, { title: 'ALTERSVORSORGEDEPOT', value: 'NEU', body: (w, h) => { if (lt > 1.4) E.withT(ctx, 0, h * 0.3, pop(lt, 1.4, 0.4), 0, () => { E.rr(ctx, -w / 2 + 30, -40, w - 60, 80, 40); ctx.fillStyle = CYAN; ctx.fill(); E.plainText(ctx, 'ERÖFFNEN', 0, 2, 34, '#0F172A', { weight: 900 }); }); } }));
        panda(ctx, 'poses/praesentieren', lt, t, { x: 160, h: 440 });
      } },
    { // 17,25–19: "kostenlos" hakt ein bisschen
      start: 17.25, mood: 'dark', poses: ['emotions/nachdenklich'], ...TS('zoom'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0], [0.2, 'pop', 0.4, 0.2], [1.0, 'glitch', 0.25, 0.2], [1.05, 'pop', 0.35, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: '„KOSTENLOS“', c: '#4ADE80', size: 140 }, { t: 'HAKT 1 BISSCHEN', c: C.white, size: 100, ribbon: '#F59E0B' }]]]);
        const wob = lt > 1.0 ? Math.sin(lt * 18) * 0.05 * (1 - prog(lt, 1.0, 0.8)) : 0;
        E.withT(ctx, 700, 990, pop(lt, 0.15, 0.45), wob, () => { glass(ctx, 0, 0, 520, 300, { body: () => { bigNum(ctx, 'GRATIS', 0, 10, 110, C.white); } }); });
        if (lt > 1.0) bigNum(ctx, '*', 950, 860, 200 * pop(lt, 1.05, 0.35), '#F59E0B');
        panda(ctx, 'emotions/nachdenklich', lt, t, { x: 160, h: 440 });
      } },
    { // 19–23,25: Start 01.01.2027
      start: 19.0, mood: 'blue', poses: ['poses/tipp_geben'], ...TS('left', { transDur: 0.5 }), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, -0.3], ...flySfx(0.3, 0.3), [1.4, 'snap', 0.35, 0.2], [1.8, 'ding', 0.45, 0.2], [2.4, 'pop', 0.35, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'START:', c: C.white, size: 130 }, { t: '1. JANUAR 2027', c: C.white, size: 110, ribbon: BLUE }]]]);
        const flip = eInOut(prog(lt, 1.4, 0.45));
        fly(ctx, 700, 990, lt, 0.3, 'left', () => glass(ctx, 0, 0, 400, 460, { accent: BLUE, body: () => {
          label(ctx, 'JANUAR', 0, -150, 34); ctx.save(); ctx.scale(1, Math.abs(Math.cos(flip * Math.PI)) || 0.01); bigNum(ctx, flip < 0.5 ? '13' : '1', 0, 0, 190, C.white); ctx.restore(); label(ctx, flip < 0.5 ? '2026' : '2027', 0, 150, 40, flip < 0.5 ? 'rgba(255,255,255,0.7)' : GOLD); } }));
        sparks(ctx, 700, 990, lt, 1.8, 18, '#60A5FA');
        if (lt > 2.4) tag(ctx, 'NOCH 1 JAHR', 700, 1290, '#334155', pop(lt, 2.4, 0.4));
        panda(ctx, 'poses/tipp_geben', lt, t, { x: 160, h: 440 });
      } },
    { // 23,25–31,25: Kosten bei TR – alles 0 €
      start: 23.25, mood: 'good', poses: ['poses/analysieren', 'emotions/begeistert'], ...TS('up', { transDur: 0.5 }), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0], ...flySfx(1.5, 0.3, 0.25), [1.95, 'snap', 0.3, 0.3], ...flySfx(2.3, -0.3, 0.25), [2.75, 'snap', 0.3, 0.3], ...flySfx(3.3, 0.3, 0.25), [3.75, 'snap', 0.3, 0.3], ...flySfx(6.1, -0.3, 0.25), [6.55, 'snap', 0.3, 0.3], [7.0, 'cash', 0.45, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'WAS KOSTET', c: C.white, size: 125 }, { t: 'DAS DEPOT?', c: C.white, size: 125, ribbon: TR }]],
          [3.0, [{ t: 'KEINE', c: C.white, size: 125 }, { t: 'AUSFÜHRUNGSGEBÜHR', c: '#4ADE80', size: 84 }]],
          [6.0, [{ t: 'KEINE LAUFENDE', c: C.white, size: 105 }, { t: 'GEBÜHR', c: C.white, size: 140, ribbon: GRN }]]]);
        glass(ctx, 680, 990, 660, 560, { scale: pop(lt, 0.2, 0.5), title: 'GEBÜHREN-CHECK', body: (w, h) => {
          [['ETF-KÄUFE', 1.5, 'right'], ['SPARPLÄNE', 2.3, 'left'], ['AUSFÜHRUNG', 3.3, 'right'], ['DEPOT (LAUFEND)', 6.1, 'left']].forEach(([txt, at, from], i) =>
            fly(ctx, 0, -h / 2 + 140 + i * 100, lt, at, from, () => row(ctx, txt, '0 €', w - 60, lt > at + 0.45 ? GRN : '#475569'), { dist: 700, rot: 0.15 }));
        } });
        if (lt > 7.0) tag(ctx, 'ALLES 0 €', 680, 1330, GRN, pop(lt, 7.0, 0.4));
        sparks(ctx, 680, 1330, lt, 7.0, 18, '#4ADE80');
        pandaSeq(ctx, [[0, 'poses/analysieren'], [6.0, 'emotions/begeistert']], lt, t, { x: 150, h: 420 });
      } },
    { // 31,25–35,5: Vergleich gesetzlich bis 1 %/Jahr
      start: 31.25, mood: 'bad', poses: ['poses/zeigen'], ...TS('right', { transDur: 0.5 }), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0.3], [0.5, 'pop', 0.35, -0.2], ...ticks(1.6, 2.8, 8, 0.35, 0.2), [2.85, 'down', 0.3, 0.2], [3.0, 'pop', 0.4, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'ZUM VERGLEICH:', c: C.white, size: 115 }, { t: 'STANDARD-DEPOTS', c: C.white, size: 100, ribbon: RED }]],
          [2.75, [{ t: 'BIS ZU 1 %', c: C.white, size: 140, ribbon: RED }, { t: 'IM JAHR', c: C.white, size: 120 }]]]);
        bars(ctx, 650, 1230, [['TR-DEPOT', 0.02, '#22C55E', '0 %', 0.5], ['STANDARD', 1.0, '#EF4444', 'BIS 1 %', 1.6]], lt, 0.5, { max: 1.1, h: 460 });
        if (lt > 3.0) tag(ctx, 'PRO JAHR!', 840, 650, RED, pop(lt, 3.0));
        panda(ctx, 'poses/zeigen', lt, t, { x: 150, h: 420 });
      } },
    { // 35,5–37,25: Das wirklich Interessante: der Staat
      start: 35.5, mood: 'dark', poses: ['emotions/ueberrascht'], ...TS('zoom', { transDur: 0.5 }), focus: { x: 640, y: 930 },
      sfx: [[-0.2, 'whoosh', 0.3, 0], [0.9, 'swell', 0.3, 0], [1.0, 'impact', 0.35, 0], [1.05, 'ding', 0.4, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DAS WIRKLICH', c: C.white, size: 120 }, { t: 'INTERESSANTE:', c: GOLD, size: 115 }]],
          [1.0, [{ t: 'DER STAAT', c: C.white, size: 140, ribbon: BLUE }]]]);
        fly(ctx, 690, 1200, lt, 0.5, 'down', () => gov(ctx, 0, 0, 480, t), { dist: 1100, rot: 0 });
        sparks(ctx, 690, 900, lt, 1.0, 20, GOLD);
        panda(ctx, 'emotions/ueberrascht', lt, t, { x: 150, h: 420 });
      } },
    { // 37,25–42: 50 % Zulage auf die ersten 360 €
      start: 37.25, mood: 'good', poses: ['poses/praesentieren'], ...TS('left'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, -0.3], ...flySfx(0.3, -0.3), ...ticks(2.5, 3.6, 8, 0.35, 0.2), [3.65, 'cash', 0.45, 0.2], ...flySfx(3.7, 0.3, 0.25)],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'AUF DIE ERSTEN', c: C.white, size: 110 }, { t: '360 €', c: C.white, size: 150, ribbon: BLUE }]],
          [2.5, [{ t: '+50 %', c: '#4ADE80', size: 170 }, { t: 'ZULAGE', c: C.white, size: 130, ribbon: GRN }]]]);
        fly(ctx, 530, 1000, lt, 0.3, 'left', () => glass(ctx, 0, 0, 320, 340, { accent: BLUE, title: 'DU ZAHLST', body: () => bigNum(ctx, '360 €', 0, 20, 90, C.white) }));
        const v = lerp(0, 180, eOut(prog(lt, 2.5, 1.1)));
        if (lt > 2.4) glass(ctx, 860, 1000, 300, 340, { scale: pop(lt, 2.4, 0.45), accent: GRN, title: 'STAAT GIBT', body: () => bigNum(ctx, `+${Math.round(v)} €`, 0, 20, 80, '#4ADE80') });
        fly(ctx, 730, 790, lt, 3.7, 'up', () => P.coinStack(ctx, 0, 0, 34, 5));
        panda(ctx, 'poses/praesentieren', lt, t, { x: 150, h: 420 });
      } },
    { // 42–45,25: 25 % auf alles bis 1.800 €
      start: 42.0, mood: 'good', poses: ['poses/analysieren'], ...TS('up'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0], [0.4, 'pop', 0.35, -0.2], [1.4, 'pop', 0.4, 0.3], ...ticks(1.5, 2.6, 8, 0.35, 0.2), [2.65, 'ding', 0.45, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'BIS 1.800 €', c: C.white, size: 130, ribbon: BLUE }, { t: 'NOCH +25 %', c: '#4ADE80', size: 125 }]]]);
        bars(ctx, 650, 1230, [['BIS 360 €', 180, '#22C55E', '+180 €', 0.4], ['360–1.800 €', 360, '#16A34A', '+360 €', 1.4]], lt, 0.4, { max: 400, h: 440 });
        if (lt > 1.4) { tag(ctx, '50 %', 540, 1300, GRN, pop(lt, 0.6, 0.3)); tag(ctx, '25 %', 780, 1300, GRN, pop(lt, 1.5, 0.3)); }
        panda(ctx, 'poses/analysieren', lt, t, { x: 150, h: 420 });
      } },
    { // 45,25–48,25: maximal 540 €/Jahr bei jedem Anbieter
      start: 45.25, mood: 'good', poses: ['emotions/begeistert'], ...TS('zoom'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0], [0.3, 'pop', 0.4, 0.2], ...ticks(0.5, 1.6, 9, 0.4, 0.2), [1.65, 'sub', 0.3, 0], [1.7, 'cash', 0.5, 0.2], ...flySfx(2.0, -0.3, 0.25), ...flySfx(2.2, 0.3, 0.25), ...flySfx(2.4, 0.1, 0.25)],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'MAXIMAL', c: C.white, size: 130 }, { t: '540 € IM JAHR', c: C.white, size: 120, ribbon: GRN }]],
          [1.75, [{ t: 'BEI JEDEM', c: C.white, size: 130 }, { t: 'ANBIETER', c: GOLD, size: 140 }]]]);
        const v = lerp(0, 540, eOut(prog(lt, 0.5, 1.15)));
        glass(ctx, 690, 920, 540, 320, { scale: pop(lt, 0.2, 0.45), accent: GRN, title: 'STAATLICHE ZULAGE · MAX.', body: () => bigNum(ctx, `${Math.round(v)} €`, 0, 25, 140, '#4ADE80') });
        [['A', 'left', 520, 2.0], ['B', 'up', 690, 2.2], ['C', 'right', 860, 2.4]].forEach(([n, from, x, at]) => fly(ctx, x, 1230, lt, at, from, () => { E.rr(ctx, -70, -60, 140, 120, 24); ctx.fillStyle = '#334155'; ctx.fill(); E.plainText(ctx, 'DEPOT ' + n, 0, 2, 28, C.white, { weight: 900 }); }));
        sparks(ctx, 690, 920, lt, 1.7, 22, '#4ADE80');
        panda(ctx, 'emotions/begeistert', lt, t, { x: 150, h: 420 });
      } },
    { // 48,25–49,75: Der Haken = Ungewissheit
      start: 48.25, mood: 'bad', poses: ['emotions/nachdenklich'], ...TS('down'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0], [0.3, 'impact', 0.3, 0], [0.35, 'down', 0.3, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DER HAKEN:', c: C.white, size: 135, ribbon: RED }, { t: 'UNGEWISSHEIT', c: C.white, size: 115 }]]]);
        P.hook(ctx, 760, lerp(150, 720, E.eBack ? E.eBack(prog(lt, 0.0, 0.55)) : eOut(prog(lt, 0.0, 0.55))), 1.15, t, '???');
        panda(ctx, 'emotions/nachdenklich', lt, t, { x: 150, h: 420 });
      } },
    { // 49,75–55,75: ETF-Kosten langfristig 0? Wie lange, welche Bedingungen – offen
      start: 49.75, mood: 'dark', poses: ['poses/analysieren', 'emotions/nachdenklich'], ...TS('right'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0.3], ...flySfx(0.3, 0.3), [1.2, 'pop', 0.35, 0.2], ...flySfx(3.3, -0.3, 0.25), ...flySfx(4.1, 0.3, 0.25), [4.6, 'tick', 0.4, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'ETF-KOSTEN', c: C.white, size: 130 }, { t: '„LANGFRISTIG“ 0', c: C.white, size: 110, ribbon: '#F59E0B' }]],
          [3.25, [{ t: 'WIE LANGE?', c: GOLD, size: 130 }, { t: 'BEDINGUNGEN OFFEN', c: C.white, size: 92, ribbon: RED }]]]);
        fly(ctx, 690, 940, lt, 0.3, 'right', () => glass(ctx, 0, 0, 520, 300, { accent: '#F59E0B', title: 'ETF-KOSTEN (TER)', body: () => { bigNum(ctx, '0 %', -60, 20, 120, C.white); if (lt > 1.2) bigNum(ctx, '*', 140, -10, 140 * pop(lt, 1.2, 0.35), '#F59E0B'); } }), { scale: lt > 3.2 ? lerp(1, 0.8, eOut(prog(lt, 3.2, 0.4))) : 1 });
        fly(ctx, 540, 1250, lt, 3.3, 'left', () => { glass(ctx, 0, 0, 260, 220, { accent: '#F59E0B', body: () => P.hourglass(ctx, 0, 10, 140, t) }); });
        fly(ctx, 840, 1250, lt, 4.1, 'right', () => { glass(ctx, 0, 0, 260, 220, { accent: RED, body: () => bigNum(ctx, '?', 0, 10, 140, '#F87171') }); });
        pandaSeq(ctx, [[0, 'poses/analysieren'], [3.25, 'emotions/nachdenklich']], lt, t, { x: 150, h: 420 });
      } },
    { // 55,75–59,25: TR-Sicht kostenfrei vs. Kleingedrucktes
      start: 55.75, mood: 'blue', poses: ['poses/zeigen', 'emotions/augenzwinkern'], ...TS('left'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, -0.3], ...flySfx(0.3, -0.3), [0.8, 'ding', 0.35, -0.2], ...flySfx(1.9, 0.3), [2.6, 'glitch', 0.25, 0.3], [2.7, 'pop', 0.35, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'LAUT TR:', c: C.white, size: 125 }, { t: 'KOSTENFREI', c: C.white, size: 130, ribbon: GRN }]],
          [1.75, [{ t: 'KLEINGEDRUCKTES:', c: C.white, size: 100 }, { t: 'NOCH NICHT GANZ', c: C.white, size: 100, ribbon: RED }]]]);
        fly(ctx, 540, 1000, lt, 0.3, 'left', () => glass(ctx, 0, 0, 320, 380, { accent: GRN, title: 'WERBUNG', body: () => { bigNum(ctx, '0 €', 0, 0, 110, '#4ADE80'); if (lt > 0.8) tag(ctx, '✓', 0, 110, GRN, pop(lt, 0.8, 0.3)); } }));
        fly(ctx, 880, 1000, lt, 1.9, 'right', () => glass(ctx, 0, 0, 320, 380, { accent: RED, title: 'KLEINGEDRUCKT', body: () => {
          for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(255,255,255,0.25)'; E.rr(ctx, -110, -90 + i * 34, i % 2 ? 160 : 220, 10, 5); ctx.fill(); }
          if (lt > 2.6) magnifier(ctx, 30, 0, 0.7 * pop(lt, 2.6, 0.4), t); } }));
        pandaSeq(ctx, [[0, 'poses/zeigen'], [1.75, 'emotions/augenzwinkern']], lt, t, { x: 150, h: 420 });
      } },
    { // 59,25–62,25: weitere Anbieter wollen nachlegen
      start: 59.25, mood: 'good', poses: ['emotions/cool'], ...TS('up'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0], ...flySfx(0.4, -0.3, 0.25), ...flySfx(0.65, 0.3, 0.25), ...flySfx(0.9, 0.1, 0.25), [1.8, 'ping', 0.4, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'WEITERE ANBIETER', c: C.white, size: 100 }, { t: 'LEGEN NACH', c: C.white, size: 130, ribbon: VIO }]]]);
        [['BANK', 'left', 520, 0.4, BLUE], ['BROKER', 'right', 860, 0.65, VIO], ['APP', 'down', 690, 0.9, TR]].forEach(([n, from, x, at, col], i) =>
          fly(ctx, x, 920 + (i === 2 ? 300 : 0), lt, at, from, () => { glass(ctx, 0, 0, 260, 220, { accent: col, body: () => { bigNum(ctx, n, 0, -10, 60, C.white); E.arrowUp(ctx, 0, 70, 0.3, C.green); } }); }));
        if (lt > 1.8) tag(ctx, 'BIS ZUM START', 690, 700, VIO, pop(lt, 1.8, 0.4));
        panda(ctx, 'emotions/cool', lt, t, { x: 150, h: 420 });
      } },
    { // 62,25–Ende: Meinung in die Kommentare
      start: 62.25, mood: 'blue', poses: ['emotions/freundlich'], ...TS('zoom'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0], [0.2, 'pop', 0.4, 0.2], [0.45, 'pop', 0.4, 0.2], [0.7, 'pop', 0.4, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DEINE MEINUNG?', c: C.white, size: 115, ribbon: VIO }]]]);
        poll(ctx, 680, 990, 660, lt, 0.05, [['Ich wechsle 2027', '#22C55E'], ['Erst abwarten', '#EF4444']]);
        panda(ctx, 'emotions/freundlich', lt, t, { x: 150, h: 420 });
      } },
  ];

  const music = {
    bpm: 98, chords: [['D', 'm'], ['B', 'b'], ['F', ''], ['C', '']], level: 0.5, abs: 0.1,
    sections: [[0, 'tension'], [3.75, 'pulse'], [8.25, 'full'], [12.75, 'pulse'], [14.25, 'full'], [17.25, 'tension'], [19.0, 'full'], [31.25, 'tension'], [35.5, 'full'], [48.25, 'tension'], [55.75, 'pulse'], [59.25, 'full']],
    drops: [3.6, 46.7],
  };

  window.VIDEO = { name: 'trade-republic-avd', style: 'clean', fps: 30, duration: 63.6, scenes, captions, xfade: 0.35, grain: 0.035, bokeh: false, endFade: false, pandaFixed: true, music };
})();
