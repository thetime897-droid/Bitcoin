// TEST (nicht veröffentlichen): Tabaksteuer-Panne – Short (82 s) auf fremder/KI-Audio, nur zur Stil-Erprobung.
(() => {
  const E = window.E, C = E.C, P = E.P, K = E.K;
  const { pop, prog, eOut, eInOut, lerp } = E;
  const { H, ticks, sparks, glass, bigNum, label, tag, fly, flySfx, pulseRings } = K;
  const { GOLD, GRN, BLUE, CYAN, VIO, RED } = K.COL;
  // Farbpalette Finanzen (professionell, farbig)
  const TEAL = '#14B8A6', SKY = '#38BDF8', AMBER = '#F59E0B', ROSE = '#FB7185', LIME = '#84CC16', PURP = '#A78BFA';
  const R = 0.07 / 12, RATE = 150;
  const fv = (y) => RATE * ((1 + R) ** (12 * y) - 1) / R; // Depotwert nach y Jahren (7 % p. a. real, monatlich)
  const inv = (y) => RATE * 12 * y;
  const eur = (v) => Math.round(v).toLocaleString('de-DE') + ' €';
  const WS = (t = -0.18, g = 0.32) => [t, 'whoosh', g, 0]; // natürlicher Szenenwechsel

  function panel(ctx, x, y, w, h, s, o = {}) { glass(ctx, x, y, w, h, { scale: s, r: 28, ...o }); }
  function kpi(ctx, x, y, w, h, s, title, val, col, sub) {
    panel(ctx, x, y, w, h, s, { accent: col, title, body: () => { bigNum(ctx, val, 0, 8, Math.min(100, w * 0.2), C.white); if (sub) label(ctx, sub, 0, h / 2 - 36, 22, col); } });
  }
  // Wachstums-Chart: Depotwert (Fläche, Verlauf) vs. Einzahlungen (gestrichelt), Jahre 0..Y, sichtbar bis yr
  function growth(ctx, x0, y0, w, h, Y, yr, o = {}) {
    const maxV = o.maxV || fv(Y) * 1.05, X = (y) => x0 + w * y / Y, Yv = (v) => y0 - h * v / maxV;
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 2;
    for (let i = 0; i <= 4; i++) { const yy = y0 - h * i / 4; ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x0 + w, yy); ctx.stroke(); if (o.yLabels !== false) E.plainText(ctx, Math.round(maxV * i / 4 / 1000) + 'k', x0 - 14, yy, 20, 'rgba(255,255,255,0.45)', { weight: 800, align: 'right' }); }
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + w, y0); ctx.stroke();
    (o.ticks || [0, 5, 10, 15, 20, 23]).filter((v) => v <= Y).forEach((v) => E.plainText(ctx, v + ' J.', X(v), y0 + 30, 20, 'rgba(255,255,255,0.55)', { weight: 800 }));
    const n = 80, yy = Math.max(0.001, yr);
    // Fläche Depotwert
    const g = ctx.createLinearGradient(0, y0 - h, 0, y0); g.addColorStop(0, 'rgba(20,184,166,0.55)'); g.addColorStop(1, 'rgba(56,189,248,0.04)');
    ctx.beginPath(); ctx.moveTo(X(0), y0); for (let i = 0; i <= n; i++) { const y = yy * i / n; ctx.lineTo(X(y), Yv(fv(y))); } ctx.lineTo(X(yy), y0); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
    // Einzahlungen
    ctx.setLineDash([12, 10]); ctx.strokeStyle = AMBER; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(X(0), Yv(0)); ctx.lineTo(X(yy), Yv(inv(yy))); ctx.stroke(); ctx.setLineDash([]);
    // Linie Depotwert
    const lg = ctx.createLinearGradient(x0, 0, x0 + w, 0); lg.addColorStop(0, SKY); lg.addColorStop(1, '#4ADE80');
    ctx.shadowColor = TEAL; ctx.shadowBlur = 18; ctx.strokeStyle = lg; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath();
    for (let i = 0; i <= n; i++) { const y = yy * i / n; i ? ctx.lineTo(X(y), Yv(fv(y))) : ctx.moveTo(X(y), Yv(fv(y))); } ctx.stroke(); ctx.shadowBlur = 0;
    (o.marks || []).forEach(([y, col]) => { if (yr < y) return; ctx.setLineDash([6, 8]); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X(y), y0); ctx.lineTo(X(y), Yv(fv(y))); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(X(y), Yv(fv(y)), 12, 0, 7); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = C.white; ctx.stroke(); });
    ctx.beginPath(); ctx.arc(X(yy), Yv(fv(yy)), 10, 0, 7); ctx.fillStyle = C.white; ctx.fill();
    ctx.restore();
    return { X, Yv };
  }
  function legend(ctx, x, y, s = 1) { E.withT(ctx, x, y, s, 0, () => {
    ctx.fillStyle = TEAL; E.rr(ctx, 0, -8, 36, 16, 8); ctx.fill(); E.plainText(ctx, 'DEPOTWERT', 48, 0, 22, C.white, { weight: 900, align: 'left' });
    ctx.setLineDash([8, 6]); ctx.strokeStyle = AMBER; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(230, 0); ctx.lineTo(266, 0); ctx.stroke(); ctx.setLineDash([]); E.plainText(ctx, 'EINGEZAHLT', 278, 0, 22, C.white, { weight: 900, align: 'left' }); }); }
  // gestapelter Balken: eingezahlt vs. Zinseszins
  function stack(ctx, x, by, w, h, y, p, o = {}) {
    const tot = fv(y), a = inv(y), hT = h * p, hA = hT * a / tot;
    ctx.save(); ctx.shadowColor = 'rgba(2,6,23,0.6)'; ctx.shadowBlur = 24;
    let g = ctx.createLinearGradient(0, by - hA, 0, by); g.addColorStop(0, AMBER); g.addColorStop(1, '#B45309'); E.rr(ctx, x - w / 2, by - hA, w, Math.max(1, hA), 12); ctx.fillStyle = g; ctx.fill();
    g = ctx.createLinearGradient(0, by - hT, 0, by - hA); g.addColorStop(0, '#4ADE80'); g.addColorStop(1, TEAL); E.rr(ctx, x - w / 2, by - hT, w, Math.max(1, hT - hA - 4), 12); ctx.fillStyle = g; ctx.fill(); ctx.restore();
    if (p > 0.6) { const k = Math.min(1, (p - 0.6) / 0.3); ctx.globalAlpha = k;
      E.plainText(ctx, eur(a), x + w / 2 + 20, by - hA / 2, o.fs || 28, AMBER, { weight: 900, align: 'left' }); E.plainText(ctx, 'EINGEZAHLT', x + w / 2 + 20, by - hA / 2 + 30, 18, 'rgba(255,255,255,0.6)', { weight: 800, align: 'left' });
      E.plainText(ctx, eur(tot - a), x + w / 2 + 20, by - hT + (hT - hA) / 2, o.fs || 28, '#4ADE80', { weight: 900, align: 'left' }); E.plainText(ctx, 'ZINSESZINS', x + w / 2 + 20, by - hT + (hT - hA) / 2 + 30, 18, 'rgba(255,255,255,0.6)', { weight: 800, align: 'left' }); ctx.globalAlpha = 1; }
    if (o.label) E.plainText(ctx, o.label, x, by + 32, 22, 'rgba(255,255,255,0.7)', { weight: 800 });
  }
  function globe(ctx, x, y, r, t) {
    ctx.save(); const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.2, x, y, r); g.addColorStop(0, '#1E40AF'); g.addColorStop(1, '#0B1430'); ctx.shadowColor = SKY; ctx.shadowBlur = 40; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = g; ctx.fill(); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.clip(); ctx.strokeStyle = 'rgba(125,211,252,0.4)'; ctx.lineWidth = 2;
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.ellipse(x, y, r, Math.abs(i) * r / 3.2 + 1, 0, 0, 7); ctx.stroke(); }
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI + t * 0.3; ctx.beginPath(); ctx.ellipse(x, y, Math.abs(Math.cos(a)) * r, r, 0, 0, 7); ctx.stroke(); } ctx.restore();
  }
  function coins(ctx, x, by, n, s = 1, t = 0) { E.withT(ctx, x, by, s, 0, () => P.coinStack(ctx, 0, 0, 34, n)); }
  function chip(ctx, txt, x, y, col, s = 1, fs = 44) { if (s <= 0.001) return; E.withT(ctx, x, y, s, 0, () => { ctx.font = `900 ${fs}px ${E.FONT_BOLD}`; const w = ctx.measureText(txt).width + 60;
    ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 24; E.rr(ctx, -w / 2, -fs * 0.9, w, fs * 1.8, fs * 0.9); const g = ctx.createLinearGradient(0, -fs, 0, fs); g.addColorStop(0, col); g.addColorStop(1, E.shade(col, -0.35)); ctx.fillStyle = g; ctx.fill(); ctx.restore();
    E.plainText(ctx, txt, 0, 2, fs, C.white, { weight: 900 }); }); }
  function bubble(ctx, x, y, w, h, s, lines) { if (s <= 0.001) return; E.withT(ctx, x, y, s, 0, () => {
    ctx.save(); ctx.shadowColor = 'rgba(2,6,23,0.5)'; ctx.shadowBlur = 30; E.rr(ctx, -w / 2, -h / 2, w, h, 40); ctx.fillStyle = '#F8FAFC'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(-w / 2 + 70, h / 2 - 4); ctx.lineTo(-w / 2 + 40, h / 2 + 50); ctx.lineTo(-w / 2 + 130, h / 2 - 4); ctx.fill(); ctx.restore();
    lines.forEach(([txt, col, fs], i) => E.plainText(ctx, txt, 0, -((lines.length - 1) * 30) + i * 60, fs || 40, col || '#0F172A', { weight: 900 })); }); }

  function vbar(ctx, x, by, w, scale, val, p, col, top, bot) {
    const h = Math.abs(val) * scale * p, up = val >= 0, y0 = up ? by - h : by;
    ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 22; const g = ctx.createLinearGradient(0, y0, 0, y0 + h); g.addColorStop(0, up ? col : E.shade(col, -0.35)); g.addColorStop(1, up ? E.shade(col, -0.35) : col);
    E.rr(ctx, x - w / 2, y0, w, Math.max(2, h), 14); ctx.fillStyle = g; ctx.fill(); ctx.restore();
    if (p > 0.4 && top) bigNum(ctx, top, x, up ? by - h - 36 : by + h + 40, 40, C.white);
    if (bot) label(ctx, bot, x, up ? by + 34 : by - 30, 24, 'rgba(255,255,255,0.75)');
  }

  const { panda, pandaSeq, magnifier, gov, warn, doc } = K;
  const UP = '#22C55E', DN = '#EF4444', TAB = '#B45309';
  const captions = [[0.4, 2.6, "Mega-Panne!"], [2.6, 5.0, "Die höhere Tabaksteuer"], [5.0, 5.6, "gilt schon"], [5.6, 6.4, "ab morgen!"], [6.4, 7.4, "Nicht mal ein Datum"], [7.4, 8.3, "kriegen sie hin!"], [8.4, 9.8, "Die Steuererhöhung"], [9.8, 11.0, "war eigentlich für Januar"], [11.0, 11.8, "geplant,"], [11.8, 12.8, "doch wegen eines"], [12.8, 13.4, "Fehlers"], [13.4, 14.2, "soll sie plötzlich"], [14.2, 15.8, "vorzeitig gelten,"], [15.8, 16.8, "was nach einem schlechten"], [16.8, 17.8, "Witz klingt."], [17.8, 18.6, "Steht tatsächlich"], [18.6, 19.6, "im Gesetz:"], [19.6, 20.6, "Der Entwurf kommt aus"], [20.6, 21.8, "dem Finanzministerium"], [21.8, 23.3, "von Lars Klingbeil."], [23.4, 24.2, "Die entscheidende"], [24.2, 25.0, "Formulierung:"], [25.0, 25.8, "gültig am"], [25.8, 26.6, "Tag nach der"], [26.6, 27.6, "Veröffentlichung."], [27.6, 28.8, "Und dieser Fehler"], [28.8, 29.8, "rutscht durch das"], [29.8, 31.4, "gesamte Gesetzgebungsverfahren."], [31.6, 32.6, "Jetzt droht den betroffenen"], [32.6, 33.6, "Tabakherstellern"], [33.6, 35.0, "ein Produktionschaos:"], [35.2, 36.2, "neue Steuertarife,"], [36.2, 37.0, "aber keine passenden"], [37.0, 38.2, "Steuerbanderolen."], [38.2, 39.4, "Der Tabakverband"], [39.4, 40.6, "warnt: Nach dem Gesetz"], [40.6, 41.8, "dürften seine betroffenen"], [41.8, 42.6, "Mitglieder"], [42.6, 43.8, "nicht mehr produzieren."], [44.0, 45.0, "Maschinen stoppen,"], [45.0, 46.0, "weil Berlin ein Datum"], [46.0, 47.0, "verpatzt!?"], [47.0, 48.0, "Das Ministerium spricht"], [48.0, 49.2, "laut Bericht von einem"], [49.2, 50.6, "technischen Fehler,"], [50.6, 51.8, "eine Berichtigung"], [51.8, 52.8, "sei angestoßen."], [52.8, 53.8, "Der Zoll informiert,"], [53.8, 55.2, "die neuen Regeln"], [55.2, 56.4, "sollen vorerst nicht"], [56.4, 57.0, "durchgesetzt werden."], [57.0, 58.2, "Das Gesetz gilt aber,"], [58.2, 59.0, "die Umsetzung wird"], [59.0, 59.9, "ausgebremst."], [60.0, 61.0, "Und der eigentliche"], [61.0, 62.6, "Preishammer kommt noch:"], [62.6, 63.6, "Bis 2030"], [63.6, 64.6, "soll die Tabaksteuer"], [64.6, 65.8, "stufenweise um sage"], [65.8, 66.6, "und schreibe"], [66.6, 68.6, "mehr als 50 % steigen."], [68.8, 69.6, "Eine Zwanziger-"], [69.6, 70.4, "Packung könnte laut"], [70.4, 71.8, "Bericht dann gut 12"], [71.8, 72.6, "Euro kosten."], [73.2, 74.4, "Wer kontrolliert"], [74.4, 75.4, "Gesetze, bevor"], [75.4, 76.6, "daraus ein Chaos für"], [76.6, 77.8, "ganze Betriebe wird?"], [78.0, 79.2, "Schreib jetzt deine Meinung"], [79.2, 80.2, "und bleib dran für"], [80.2, 81.4, "weitere Updates!"]];
  const TS = (dir, extra = {}) => ({ trans: dir, transDur: 0.6, punchAmt: 0.03, flashAmt: 0.0, zoom: 0.03, ...extra });
  const F = { x: 640, y: 980 };
  function pack(ctx, x, y, s, t, price) { if (s <= 0.001) return; E.withT(ctx, x, y, s, Math.sin(t * 1.4) * 0.03, () => { // Zigarettenschachtel (neutral)
    ctx.save(); ctx.shadowColor = 'rgba(2,6,23,0.6)'; ctx.shadowBlur = 40; E.rr(ctx, -110, -150, 220, 300, 16); const g = ctx.createLinearGradient(-110, 0, 110, 0); g.addColorStop(0, '#F8FAFC'); g.addColorStop(1, '#CBD5E1'); ctx.fillStyle = g; ctx.fill(); ctx.restore();
    E.rr(ctx, -110, -150, 220, 90, 16); ctx.fillStyle = '#B91C1C'; ctx.fill(); ctx.fillStyle = '#F8FAFC'; for (let i = 0; i < 5; i++) { E.rr(ctx, -84 + i * 36, -200, 26, 70, 6); ctx.fill(); ctx.fillStyle = '#F59E0B'; E.rr(ctx, -84 + i * 36, -200, 26, 22, 6); ctx.fill(); ctx.fillStyle = '#F8FAFC'; }
    E.rr(ctx, -110, -150, 220, 90, 16); ctx.fillStyle = '#B91C1C'; ctx.fill();
    E.rr(ctx, -90, 20, 180, 100, 10); ctx.fillStyle = '#111827'; ctx.fill(); E.plainText(ctx, 'RAUCHEN', 0, 50, 22, C.white, { weight: 900 }); E.plainText(ctx, 'SCHADET', 0, 82, 22, C.white, { weight: 900 });
    E.rr(ctx, -40, -150, 80, 26, 6); ctx.fillStyle = '#16A34A'; ctx.fill(); // Banderole
    if (price) { E.withT(ctx, 120, -40, 1, 0.12, () => { ctx.save(); ctx.shadowColor = GOLD; ctx.shadowBlur = 20; E.rr(ctx, -10, -40, 200, 80, 14); ctx.fillStyle = GOLD; ctx.fill(); ctx.restore(); E.plainText(ctx, price, 90, 2, 40, '#111827', { weight: 900 }); }); } }); }
  function gear(ctx, x, y, r, rot, col) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = col; ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, rr = i % 2 ? r : r * 1.22; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.arc(0, 0, r * 0.4, 0, 7); ctx.fillStyle = '#0F172A'; ctx.fill(); ctx.restore(); }
  function factory(ctx, x, y, s, t, run = 1) { if (s <= 0.001) return; E.withT(ctx, x, y, s, 0, () => {
    ctx.save(); ctx.shadowColor = 'rgba(2,6,23,0.6)'; ctx.shadowBlur = 30; const g = ctx.createLinearGradient(0, -120, 0, 120); g.addColorStop(0, '#E2E8F0'); g.addColorStop(1, '#94A3B8');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-240, 120); ctx.lineTo(-240, -40); for (let i = 0; i < 4; i++) { ctx.lineTo(-240 + i * 120 + 120, -110); ctx.lineTo(-240 + i * 120 + 120, -40); } ctx.lineTo(240, 120); ctx.closePath(); ctx.fill(); ctx.restore();
    gear(ctx, -110, 40, 46, t * 2 * run, '#64748B'); gear(ctx, -30, 60, 30, -t * 3 * run, '#475569'); E.rr(ctx, 40, 10, 170, 80, 10); ctx.fillStyle = '#334155'; ctx.fill(); E.plainText(ctx, 'PRODUKTION', 125, 50, 22, C.white, { weight: 900 }); }); }
  function stepRow(ctx, items, x, y, lt, at, bad) { const n = items.length, w = 150; items.forEach((s2, i) => { const k = pop(lt, at + i * 0.3, 0.35); if (k <= 0) return; const px = x + (i - (n - 1) / 2) * w;
    E.withT(ctx, px, y, k, 0, () => { ctx.beginPath(); ctx.arc(0, 0, 50, 0, 7); ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#94A3B8'; ctx.stroke(); E.plainText(ctx, String(i + 1), 0, 2, 34, C.white, { weight: 900 }); label(ctx, s2, 0, 82, 19, 'rgba(255,255,255,0.8)'); });
    if (i < n - 1 && k >= 1) { ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(px + 52, y - 2, w - 104, 4); } });
    if (bad) { const p = prog(lt, bad, (n - 1) * 0.6), px = x - (n - 1) / 2 * w + p * (n - 1) * w; if (lt > bad) { ctx.save(); ctx.shadowColor = DN; ctx.shadowBlur = 24; ctx.beginPath(); ctx.arc(px, y - 70, 18, 0, 7); ctx.fillStyle = DN; ctx.fill(); ctx.restore(); E.plainText(ctx, '!', px, y - 68, 24, C.white, { weight: 900 }); } } }
  function chk(ctx, txt, ok, w, col) { E.rr(ctx, -w / 2, -46, w, 92, 24); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = col; ctx.stroke();
    E.withT(ctx, -w / 2 + 54, 0, 1, 0, () => { ctx.beginPath(); ctx.arc(0, 0, 28, 0, 7); ctx.fillStyle = col; ctx.fill(); E.plainText(ctx, ok === 'p' ? 'II' : ok ? '✓' : '✕', 0, 2, 30, C.white, { weight: 900 }); }); E.plainText(ctx, txt, -w / 2 + 104, 2, 34, C.white, { weight: 900, align: 'left' }); }
  function quote(ctx, x, y, w, s, src, lines, col) { if (s <= 0.001) return; E.withT(ctx, x, y, s, -0.02, () => { const h = 130 + lines.length * 58;
    ctx.save(); ctx.shadowColor = 'rgba(2,6,23,0.6)'; ctx.shadowBlur = 40; E.rr(ctx, -w / 2, -h / 2, w, h, 26); ctx.fillStyle = '#F8FAFC'; ctx.fill(); ctx.restore(); E.rr(ctx, -w / 2, -h / 2, w, 14, 7); ctx.fillStyle = col; ctx.fill();
    E.plainText(ctx, src, -w / 2 + 34, -h / 2 + 54, 24, '#64748B', { weight: 900, align: 'left' }); lines.forEach(([tx, c], i) => E.plainText(ctx, tx, -w / 2 + 34, -h / 2 + 114 + i * 58, 34, c || '#0F172A', { weight: 900, align: 'left' })); }); }

  const scenes = [
    { // 0–5: Mega-Panne – höhere Tabaksteuer
      start: 0, mood: 'bad', poses: ['emotions/ueberrascht'], punch: false, noBrand: true, zoom: 0.03, focus: F,
      sfx: [[0.1, 'swell', 0.3, 0], [0.4, 'impact', 0.28, 0], ...flySfx(1.0, 0.2, 0.3), [2.6, 'pop', 0.3, 0.2], [3.0, 'cash', 0.35, 0.3]],
      draw(ctx, lt, t) {
        E.liveBar(ctx, lt, 'TABAKSTEUER  •  GESETZ TRITT VERSEHENTLICH FRÜHER IN KRAFT  •  „TECHNISCHER FEHLER“  •  BIS 2030 TEURER  •  ');
        H(ctx, lt, [[0, [{ t: 'MEGA-PANNE!', c: C.white, size: 135, ribbon: RED }], { y: 480, delay: 0.1 }], [2.6, [{ t: 'HÖHERE', c: C.white, size: 125 }, { t: 'TABAKSTEUER', c: GOLD, size: 130 }], { y: 480 }]]);
        fly(ctx, 620, 1020, lt, 1.0, 'up', () => pack(ctx, 0, 0, 1.15, t, lt > 3.0 ? '€ ↑' : null));
        sparks(ctx, 760, 900, lt, 3.0, 18, GOLD);
        panda(ctx, 'emotions/ueberrascht', lt, t, { x: 160, h: 440 });
      } },
    { // 5–8,4: gilt schon ab morgen – nicht mal ein Datum
      start: 5.0, mood: 'dark', poses: ['emotions/wuetend'], ...TS('right'), focus: F,
      sfx: [WS(), ...flySfx(0.3, 0.2, 0.3), [0.7, 'ding', 0.3, 0.2], [2.4, 'stamp', 0.38, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'GILT SCHON', c: C.white, size: 130 }, { t: 'AB MORGEN!', c: C.white, size: 130, ribbon: RED }]], [1.4, [{ t: 'NICHT MAL', c: C.white, size: 125 }, { t: 'EIN DATUM!', c: GOLD, size: 135 }]]]);
        fly(ctx, 700, 1000, lt, 0.3, 'up', () => P.calendar(ctx, 0, 0, 1.05, 'OKTOBER 2026', '21'), { rot: 0.3 });
        E.stamp(ctx, 'FEHLER', 720, 1080, lt, 2.4, { size: 64, rot: -0.14 });
        panda(ctx, 'emotions/wuetend', lt, t, { x: 150, h: 420 });
      } },
    { // 8,4–11,8: eigentlich für Januar geplant
      start: 8.4, mood: 'blue', poses: ['poses/analysieren'], ...TS('up'), focus: F,
      sfx: [WS(), ...flySfx(0.3, -0.2, 0.3), [1.6, 'ding', 0.3, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'EIGENTLICH', c: C.white, size: 130 }, { t: 'GEPLANT FÜR', c: C.white, size: 120, ribbon: BLUE }]], [1.5, [{ t: '1. JANUAR', c: C.white, size: 130 }, { t: '2027', c: GOLD, size: 150 }]]]);
        fly(ctx, 700, 1000, lt, 0.3, 'left', () => P.calendar(ctx, 0, 0, 1.05, 'JANUAR 2027', '1'), { rot: 0.3 });
        if (lt > 1.6) chip(ctx, '✓ SO WAR DER PLAN', 720, 1270, '#16A34A', pop(lt, 1.6, 0.4), 34);
        panda(ctx, 'poses/analysieren', lt, t, { x: 150, h: 420 });
      } },
    { // 11,8–17,8: wegen eines Fehlers vorzeitig – klingt wie ein Witz
      start: 11.8, mood: 'bad', poses: ['emotions/nachdenklich', 'emotions/ueberrascht'], ...TS('left'), focus: F,
      sfx: [WS(), [0.3, 'pop', 0.3, -0.2], [0.6, 'pop', 0.3, 0.3], [1.6, 'swish', 0.3, 0], [2.4, 'impact', 0.28, -0.2], [4.2, 'pop', 0.3, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'WEGEN EINES', c: C.white, size: 125 }, { t: 'FEHLERS', c: C.white, size: 135, ribbon: RED }]], [2.4, [{ t: 'PLÖTZLICH', c: C.white, size: 130 }, { t: 'VORZEITIG', c: GOLD, size: 135 }]]]);
        E.withT(ctx, 560, 980, pop(lt, 0.3, 0.45), 0, () => P.calendar(ctx, 0, 0, 0.7, 'OKT. 2026', '21'));
        E.withT(ctx, 870, 980, pop(lt, 0.6, 0.45), 0, () => { ctx.globalAlpha = lt > 2.4 ? 0.45 : 1; P.calendar(ctx, 0, 0, 0.7, 'JAN. 2027', '1'); ctx.globalAlpha = 1; });
        if (lt > 1.6) { const p = eOut(prog(lt, 1.6, 0.8)); ctx.save(); ctx.strokeStyle = DN; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(800, 1140); ctx.quadraticCurveTo(715, 1230, lerp(800, 630, p), 1140 + (p < 1 ? 0 : 0)); ctx.stroke(); ctx.restore(); if (p >= 1) label(ctx, '≈ 2,5 MONATE ZU FRÜH', 715, 1265, 26, '#F87171'); }
        if (lt > 4.2) tag(ctx, 'KLINGT WIE EIN WITZ', 715, 760, '#475569', pop(lt, 4.2, 0.4));
        pandaSeq(ctx, [[0, 'emotions/nachdenklich'], [2.4, 'emotions/ueberrascht']], lt, t, { x: 150, h: 420 });
      } },
    { // 17,8–23,4: steht im Gesetz – Entwurf aus dem Finanzministerium
      start: 17.8, mood: 'blue', poses: ['poses/praesentieren'], ...TS('right'), focus: F,
      sfx: [WS(), [0.3, 'paper', 0.28, 0.2], ...flySfx(1.8, 0.2, 0.3), [4.0, 'pop', 0.3, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'STEHT SO', c: C.white, size: 130 }, { t: 'IM GESETZ', c: C.white, size: 130, ribbon: BLUE }]], [1.8, [{ t: 'ENTWURF AUS DEM', c: C.white, size: 110 }, { t: 'FINANZMINISTERIUM', c: C.white, size: 100, ribbon: '#475569' }]]]);
        if (lt < 1.8) E.withT(ctx, 700, 1000, pop(lt, 0.3, 0.45), 0, () => doc(ctx, 0, 0, 0.8, { title: '§ TABAKSTEUER' }));
        else { fly(ctx, 700, 1120, lt, 1.8, 'up', () => gov(ctx, 0, 0, 400, t)); if (lt > 4.0) tag(ctx, 'BMF · LARS KLINGBEIL (SPD)', 700, 1240, '#334155', pop(lt, 4.0, 0.4)); }
        panda(ctx, 'poses/praesentieren', lt, t, { x: 150, h: 420 });
      } },
    { // 23,4–27,6: die entscheidende Formulierung
      start: 23.4, mood: 'dark', poses: ['poses/analysieren'], ...TS('up'), focus: F,
      sfx: [WS(), ...flySfx(0.3, 0.2, 0.3), [1.6, 'swish', 0.25, 0.2], [2.4, 'ding', 0.32, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DIE ENTSCHEIDENDE', c: C.white, size: 105 }, { t: 'FORMULIERUNG', c: C.white, size: 120, ribbon: AMBER }]]]);
        fly(ctx, 700, 1000, lt, 0.3, 'up', () => quote(ctx, 0, 0, 620, 1, '§ INKRAFTTRETEN', [['Dieses Gesetz tritt', null], ['am Tag nach der', null], ['Verkündung in Kraft.', null]], AMBER));
        if (lt > 1.6) { const p = eOut(prog(lt, 1.6, 0.7)); ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = GOLD; E.rr(ctx, 410, 1010, 520 * p, 50, 8); ctx.fill(); E.rr(ctx, 410, 1068, 420 * p, 50, 8); ctx.fill(); ctx.restore(); }
        if (lt > 2.4) tag(ctx, 'STATT: 1. JANUAR 2027', 720, 1260, RED, pop(lt, 2.4, 0.4));
        panda(ctx, 'poses/analysieren', lt, t, { x: 150, h: 420 });
      } },
    { // 27,6–31,6: Fehler rutscht durchs ganze Verfahren
      start: 27.6, mood: 'bad', poses: ['emotions/nachdenklich'], ...TS('left'), focus: F,
      sfx: [WS(), [0.3, 'pop', 0.3, -0.3], [0.6, 'pop', 0.3, -0.1], [0.9, 'pop', 0.3, 0.1], [1.2, 'pop', 0.3, 0.3], [1.6, 'roll', 0.2, 0], [3.4, 'impact', 0.25, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DER FEHLER', c: C.white, size: 130 }, { t: 'RUTSCHT DURCH', c: C.white, size: 115, ribbon: RED }]]]);
        panel(ctx, 700, 1000, 640, 420, pop(lt, 0.1, 0.5), { title: 'GESETZGEBUNGSVERFAHREN', body: () => stepRow(ctx, ['MINISTERIUM', 'BUNDESTAG', 'BUNDESRAT', 'VERKÜNDUNG'], 0, 20, lt, 0.3, 1.6) });
        if (lt > 3.4) tag(ctx, 'NIEMAND HAT\'S BEMERKT', 700, 1260, RED, pop(lt, 3.4, 0.4));
        panda(ctx, 'emotions/nachdenklich', lt, t, { x: 150, h: 420 });
      } },
    { // 31,6–38,2: Produktionschaos – Tarife ja, Banderolen nein
      start: 31.6, mood: 'bad', poses: ['emotions/ueberrascht', 'poses/analysieren'], ...TS('up'), focus: F,
      sfx: [WS(), ...flySfx(0.3, 0.2, 0.3), [2.2, 'glitch', 0.18, 0.2], ...flySfx(3.6, -0.2, 0.3), [4.0, 'ding', 0.3, 0], ...flySfx(5.4, 0.2, 0.3), [5.8, 'down', 0.3, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'TABAKHERSTELLER:', c: C.white, size: 110 }, { t: 'PRODUKTIONSCHAOS', c: C.white, size: 100, ribbon: RED }]], [3.6, [{ t: 'NEUE TARIFE –', c: C.white, size: 120 }, { t: 'KEINE BANDEROLEN', c: C.white, size: 105, ribbon: AMBER }]]]);
        const mv = eInOut(prog(lt, 3.4, 0.6));
        factory(ctx, 700, lerp(1000, 830, mv), lerp(1.2, 0.85, mv) * pop(lt, 0.3, 0.45), t, lt > 2.2 ? Math.max(0, 1 - (lt - 2.2)) : 1);
        if (lt > 3.6) fly(ctx, 700, 1050, lt, 3.6, 'left', () => chk(ctx, 'NEUE STEUERTARIFE', true, 560, '#16A34A'));
        if (lt > 5.4) fly(ctx, 700, 1160, lt, 5.4, 'right', () => chk(ctx, 'PASSENDE BANDEROLEN', false, 560, DN));
        pandaSeq(ctx, [[0, 'emotions/ueberrascht'], [3.6, 'poses/analysieren']], lt, t, { x: 150, h: 420 });
      } },
    { // 38,2–44: Tabakverband warnt
      start: 38.2, mood: 'dark', poses: ['emotions/nachdenklich'], ...TS('right'), focus: F,
      sfx: [WS(), ...flySfx(0.3, 0.2, 0.3), [0.8, 'paper', 0.25, 0.2], [4.4, 'down', 0.28, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DER TABAKVERBAND', c: C.white, size: 110 }, { t: 'WARNT', c: C.white, size: 135, ribbon: AMBER }]]]);
        fly(ctx, 700, 990, lt, 0.3, 'up', () => quote(ctx, 0, 0, 620, 1, 'TABAKVERBAND', [['Betroffene Mitglieder', null], ['dürften nach dem Gesetz', null], ['nicht mehr produzieren', DN]], AMBER));
        if (lt > 4.4) tag(ctx, 'OHNE NEUE BANDEROLEN', 700, 1230, '#334155', pop(lt, 4.4, 0.4));
        panda(ctx, 'emotions/nachdenklich', lt, t, { x: 150, h: 420 });
      } },
    { // 44–47: Maschinen stoppen – Berlin verpatzt Datum
      start: 44.0, mood: 'bad', poses: ['emotions/wuetend'], ...TS('zoom'), focus: F,
      sfx: [WS(), [0.3, 'down', 0.3, 0], [0.9, 'stamp', 0.35, 0.2], [1.6, 'pop', 0.3, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'MASCHINEN', c: C.white, size: 135 }, { t: 'STOPPEN', c: C.white, size: 135, ribbon: RED }]], [1.0, [{ t: 'WEIL BERLIN', c: C.white, size: 125 }, { t: 'EIN DATUM VERPATZT', c: GOLD, size: 98 }]]]);
        factory(ctx, 700, 980, 1.2 * pop(lt, 0.1, 0.45), t, 0);
        E.stamp(ctx, 'STOPP', 720, 1000, lt, 0.9, { size: 80, rot: -0.12 });
        if (lt > 1.6) tag(ctx, '?!', 940, 820, RED, 1.4 * pop(lt, 1.6, 0.4));
        panda(ctx, 'emotions/wuetend', lt, t, { x: 150, h: 420 });
      } },
    { // 47–52,8: Ministerium: technischer Fehler – Berichtigung angestoßen
      start: 47.0, mood: 'blue', poses: ['poses/tipp_geben'], ...TS('left'), focus: F,
      sfx: [WS(), ...flySfx(0.3, -0.2, 0.3), [2.2, 'pop', 0.3, 0.2], ...flySfx(3.8, 0.2, 0.3), [4.6, 'ding', 0.32, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'MINISTERIUM:', c: C.white, size: 125 }, { t: '„TECHNISCHER FEHLER“', c: C.white, size: 95, ribbon: '#475569' }]], [3.8, [{ t: 'BERICHTIGUNG', c: C.white, size: 120 }, { t: 'ANGESTOSSEN', c: C.white, size: 120, ribbon: BLUE }]]]);
        if (lt < 3.8) fly(ctx, 700, 1000, lt, 0.3, 'left', () => quote(ctx, 0, 0, 620, 1, 'BUNDESFINANZMINISTERIUM', [['Technischer Fehler', null], ['beim Datum des', null], ['Inkrafttretens', null]], '#475569'));
        else fly(ctx, 700, 1000, lt, 3.8, 'up', () => { doc(ctx, 0, 0, 0.75, { title: 'BERICHTIGUNG', sign: eOut(prog(lt, 4.3, 0.8)) }); });
        panda(ctx, 'poses/tipp_geben', lt, t, { x: 150, h: 420 });
      } },
    { // 52,8–60: Zoll – vorerst nicht durchgesetzt; Gesetz gilt, Umsetzung gebremst
      start: 52.8, mood: 'dark', poses: ['poses/analysieren', 'emotions/cool'], ...TS('up'), focus: F,
      sfx: [WS(), [0.3, 'pop', 0.3, 0.2], [1.6, 'ding', 0.3, 0.2], ...flySfx(4.2, -0.2, 0.3), ...flySfx(5.4, 0.2, 0.3)],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DER ZOLL:', c: C.white, size: 130 }, { t: 'VORERST NICHT', c: C.white, size: 115, ribbon: TEAL }]], [4.2, [{ t: 'GESETZ GILT –', c: C.white, size: 120 }, { t: 'UMSETZUNG GEBREMST', c: C.white, size: 95, ribbon: AMBER }]]]);
        if (lt < 4.2) E.withT(ctx, 700, 1000, pop(lt, 0.3, 0.45), 0, () => { K.shield(ctx, 0, 0, 1, TEAL, 'ZOLL', 'NICHT DURCHSETZEN'); });
        else { fly(ctx, 700, 960, lt, 4.2, 'left', () => chk(ctx, 'GESETZ GILT', true, 560, '#16A34A')); fly(ctx, 700, 1080, lt, 5.4, 'right', () => chk(ctx, 'UMSETZUNG PAUSIERT', 'p', 560, AMBER)); }
        pandaSeq(ctx, [[0, 'poses/analysieren'], [4.2, 'emotions/cool']], lt, t, { x: 150, h: 420 });
      } },
    { // 60–68,8: der eigentliche Preishammer – bis 2030 > 50 %
      start: 60.0, mood: 'bad', poses: ['emotions/ueberrascht', 'poses/praesentieren'], ...TS('right'), focus: F,
      sfx: [WS(), [0.4, 'impact', 0.3, 0], [2.6, 'pop', 0.3, -0.2], [3.0, 'pop', 0.3, -0.1], [3.4, 'pop', 0.3, 0.1], [3.8, 'pop', 0.3, 0.3], [6.0, 'riser', 0.15, 0], [6.6, 'cash', 0.42, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DER EIGENTLICHE', c: C.white, size: 110 }, { t: 'PREISHAMMER', c: C.white, size: 125, ribbon: RED }]], [2.6, [{ t: 'BIS 2030', c: C.white, size: 135 }, { t: 'STUFENWEISE HOCH', c: C.white, size: 100, ribbon: AMBER }]], [6.6, [{ t: 'TABAKSTEUER', c: C.white, size: 120 }, { t: '+ ÜBER 50 %', c: '#F87171', size: 140 }]]]);
        panel(ctx, 700, 1010, 640, 520, pop(lt, 0.2, 0.5), { title: 'STEUERSTUFEN (LAUT BERICHT)', body: () => {
          const by = 190; ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-280, by, 560, 3);
          [['2026', 1.0], ['2027', 1.12], ['2028', 1.25], ['2029', 1.38], ['2030', 1.52]].forEach(([y, v], i) => { const p = eOut(prog(lt, 2.6 + i * 0.4, 0.6)); vbar(ctx, -224 + i * 112, by, 80, 180, v, p, i ? DN : '#94A3B8', null, y); });
          if (lt > 6.6) chip(ctx, '> +50 %', 150, -140, '#DC2626', pop(lt, 6.6, 0.4), 40); } });
        pandaSeq(ctx, [[0, 'emotions/ueberrascht'], [2.6, 'poses/praesentieren']], lt, t, { x: 150, h: 420 });
      } },
    { // 68,8–73,2: Zwanziger-Packung gut 12 €
      start: 68.8, mood: 'bad', poses: ['emotions/ueberrascht'], ...TS('up'), focus: F,
      sfx: [WS(), ...flySfx(0.3, 0.2, 0.3), [1.6, 'swell', 0.28, 0], ...ticks(1.8, 2.8, 8, 0.28, 0.3), [2.9, 'cash', 0.45, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: '20ER-PACKUNG', c: C.white, size: 125 }, { t: 'GUT 12 €?', c: GOLD, size: 150 }]]]);
        const v = lerp(8, 12, eOut(prog(lt, 1.8, 1.0)));
        fly(ctx, 640, 1010, lt, 0.3, 'up', () => pack(ctx, 0, 0, 1.1, t, lt > 1.8 ? v.toFixed(2).replace('.', ',') + ' €' : '≈ 8 €'));
        if (lt > 2.9) tag(ctx, 'LAUT BERICHT', 700, 1260, '#334155', pop(lt, 2.9, 0.4));
        sparks(ctx, 860, 970, lt, 2.9, 18, GOLD);
        panda(ctx, 'emotions/ueberrascht', lt, t, { x: 150, h: 420 });
      } },
    { // 73,2–78: Wer kontrolliert Gesetze?
      start: 73.2, mood: 'dark', poses: ['emotions/nachdenklich'], ...TS('left'), focus: F,
      sfx: [WS(), [0.3, 'paper', 0.25, 0.2], [1.2, 'swish', 0.25, 0.2], [3.4, 'pop', 0.3, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'WER KONTROLLIERT', c: C.white, size: 105 }, { t: 'DIE GESETZE?', c: C.white, size: 125, ribbon: VIO }]], [2.2, [{ t: 'BEVOR DARAUS', c: C.white, size: 120 }, { t: 'CHAOS WIRD?', c: GOLD, size: 135 }]]]);
        E.withT(ctx, 700, 1000, pop(lt, 0.3, 0.45), 0, () => doc(ctx, 0, 0, 0.8, { title: '§ GESETZ' }));
        if (lt > 1.2) magnifier(ctx, lerp(600, 820, (Math.sin(t * 1.2) + 1) / 2), 980, 0.8 * pop(lt, 1.2, 0.4), t);
        if (lt > 3.4) tag(ctx, 'GANZE BETRIEBE BETROFFEN', 700, 1270, RED, pop(lt, 3.4, 0.4));
        panda(ctx, 'emotions/nachdenklich', lt, t, { x: 150, h: 420 });
      } },
    { // 78–Ende: Meinung + dranbleiben
      start: 78.0, mood: 'blue', poses: ['emotions/freundlich'], ...TS('zoom', { transDur: 0.45 }), focus: F,
      sfx: [WS(-0.15, 0.28), [0.25, 'pop', 0.35, 0.2], [1.4, 'ping', 0.3, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'SCHREIB DEINE', c: C.white, size: 125 }, { t: 'MEINUNG', c: C.white, size: 135, ribbon: TEAL }]]]);
        bubble(ctx, 700, 960, 560, 220, pop(lt, 0.1, 0.4), [['WAS SAGST DU', '#0F172A', 42], ['ZU DER PANNE?', '#0D9488', 44]]);
        if (lt > 1.4) tag(ctx, 'UPDATES FOLGEN', 700, 1200, '#334155', pop(lt, 1.4, 0.4));
        panda(ctx, 'emotions/freundlich', lt, t, { x: 150, h: 420 });
      } },
  ];
  const music = { bpm: 96, chords: [['D', 'm'], ['B', 'b'], ['F', ''], ['C', '']], level: 0.45, abs: 0.09,
    sections: [[0, 'tension'], [8.4, 'pulse'], [17.8, 'pulse'], [31.6, 'full'], [47.0, 'pulse'], [60.0, 'full'], [73.2, 'tension']], drops: [] };
  window.VIDEO = { name: 'tabaksteuer-panne-test', style: 'clean', fps: 30, duration: 82.1, scenes, captions, xfade: 0.35, grain: 0.03, bokeh: false, endFade: false, pandaFixed: true, music };
})();
