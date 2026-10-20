// Rheinmetall × Rock Tech Lithium – YouTube-Longform 1920×1080 (62,9 s), ohne Untertitel. Eigenes Querformat-Layout: Panda unten links, Grafik-Bühne x 540–1880 / y 300–1040.
// Zusatzfakten: Werk Guben geplant ~24.000 t LiOH/Jahr, ~680 Mio. € (nach Kürzung um 50 Mio. €); 3,25 von ~6 Mio. CAD vom strategischen Investor; unbestätigt.
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

  const { doc, magnifier } = K;
  const RHM = '#3B82F6', RT = '#10B981', LI = '#A3E635';
  const captions = [[0.0, 1.25, "Breaking News bei Rheinmetall,"], [1.25, 2.25, "sie sollen heimlich in"], [2.25, 3.75, "Lithium eingestiegen sein."], [3.75, 4.75, "Diese News sind so neu,"], [4.75, 5.5, "dass sie noch nicht"], [5.5, 7.25, "mal wirklich bestätigt worden sind."], [7.25, 8.5, "Laut Bloomberg ist Rheinmetall"], [8.5, 10.5, "der bisher unbekannte Geldgeber"], [10.5, 11.75, "bei Lithium."], [11.75, 13.0, "Das ist eine kleine deutsch-"], [13.0, 15.0, "kanadische Rohstofffirma und Rock Tech"], [15.0, 16.75, "sammelte rund 6 Millionen"], [16.75, 17.75, "kanadische Dollar."], [17.75, 18.5, "Wir sprechen hier also von"], [18.5, 19.5, "keiner Riesensumme,"], [19.5, 21.0, "aber trotzdem eine wirklich"], [21.0, 22.0, "interessante Maßnahme."], [22.25, 23.5, "Gut die Hälfte davon"], [23.5, 25.25, "kam von einem strategischen Investor."], [25.25, 27.0, "Das Ganze ist keine Anlageberatung,"], [27.0, 28.0, "aber genau dieser soll"], [28.0, 29.75, "auch beim geplanten Lithiumwerk"], [29.75, 30.75, "in Guben mitmachen."], [30.75, 31.75, "Aber warum positioniert sich"], [31.75, 33.75, "Rheinmetall eventuell genau bei Lithium?"], [33.75, 34.5, "Weil es in vielen"], [34.5, 35.0, "Akkus steckt."], [35.0, 37.0, "Das Werk in Guben ist schon genehmigt,"], [37.0, 38.0, "gebaut ist es aber noch"], [38.0, 39.0, "nicht, und die Beteiligung"], [39.0, 40.75, "von Rheinmetall gilt jedoch als klein."], [41.0, 41.75, "Aber hier gibt es auch"], [41.75, 42.25, "einen Haken."], [42.25, 42.75, "Es ist nur 1"], [42.75, 44.5, "Bericht aus informierten Kreisen."], [44.75, 46.25, "Rheinmetall und Rock Tech wollen"], [46.25, 47.75, "bislang noch nichts dazu sagen."], [47.75, 48.75, "Aus Sicht von Optimisten"], [48.75, 49.75, "ist das 1 Schritt in"], [49.75, 50.75, "die Lieferkette,"], [50.75, 52.0, "aus Sicht von Skeptikern"], [52.0, 53.25, "1 kleiner Check, mehr nicht."], [53.25, 54.0, "Das heißt, speicher dir"], [54.0, 54.75, "das Video auf jeden"], [54.75, 55.75, "Fall ab und warte auf"], [55.75, 56.75, "eine Meldung,"], [56.75, 58.0, "ob das hier wirklich so"], [58.0, 58.5, "passiert ist."], [58.5, 59.75, "Beobachte vor allen Dingen auch"], [59.75, 60.25, "ganz genau,"], [60.25, 61.5, "was Bloomberg in der"], [61.5, 62.85, "nächsten Zeit hier posten sollte."]];
  function badge(ctx, txt, col, sub, w = 300) { ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 30; E.rr(ctx, -w / 2, -70, w, 140, 30); const g = ctx.createLinearGradient(0, -70, 0, 70); g.addColorStop(0, col); g.addColorStop(1, E.shade(col, -0.4)); ctx.fillStyle = g; ctx.fill(); ctx.restore();
    E.plainText(ctx, txt, 0, sub ? -12 : 2, txt.length > 9 ? 34 : 44, C.white, { weight: 900 }); if (sub) E.plainText(ctx, sub, 0, 34, 22, 'rgba(255,255,255,0.8)', { weight: 800 }); }
  function liTile(ctx, x, y, s, t) { if (s <= 0.001) return; E.withT(ctx, x, y, s, Math.sin(t * 1.3) * 0.03, () => { // Periodensystem-Kachel Lithium
    ctx.save(); ctx.shadowColor = LI; ctx.shadowBlur = 50; E.rr(ctx, -130, -150, 260, 300, 26); const g = ctx.createLinearGradient(0, -150, 0, 150); g.addColorStop(0, '#365314'); g.addColorStop(1, '#1A2E05'); ctx.fillStyle = g; ctx.fill(); ctx.restore();
    E.rr(ctx, -130, -150, 260, 300, 26); ctx.lineWidth = 4; ctx.strokeStyle = LI; ctx.stroke();
    E.plainText(ctx, '3', -95, -112, 34, LI, { weight: 900, align: 'left' }); E.plainText(ctx, '6,94', 95, -112, 26, 'rgba(255,255,255,0.6)', { weight: 800, align: 'right' });
    E.plainText(ctx, 'Li', 0, 10, 150, C.white, { weight: 900 }); E.plainText(ctx, 'LITHIUM', 0, 112, 30, LI, { weight: 900 }); }); }
  function flagDE(ctx, x, y, w) { const h = w * 0.6; ['#111827', '#DC2626', '#FACC15'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(x - w / 2, y - h / 2 + i * h / 3, w, h / 3 + 0.5); }); ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2; ctx.strokeRect(x - w / 2, y - h / 2, w, h); }
  function flagCA(ctx, x, y, w) { const h = w * 0.5; ctx.fillStyle = '#DC2626'; ctx.fillRect(x - w / 2, y - h / 2, w / 4, h); ctx.fillRect(x + w / 4, y - h / 2, w / 4, h); ctx.fillStyle = '#F8FAFC'; ctx.fillRect(x - w / 4, y - h / 2, w / 2, h);
    ctx.fillStyle = '#DC2626'; ctx.beginPath(); const r = h * 0.36; for (let i = 0; i < 22; i++) { const a = -Math.PI / 2 + i / 22 * Math.PI * 2, rr = i % 2 ? r * 0.5 : r * (i % 4 === 0 ? 1 : 0.8); ctx.lineTo(x + Math.cos(a) * rr, y - 2 + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); ctx.fillRect(x - 2, y + r * 0.4, 4, r * 0.55); }
  function battery(ctx, x, y, s, lvl, t) { if (s <= 0.001) return; E.withT(ctx, x, y, s, 0, () => {
    ctx.save(); ctx.shadowColor = LI; ctx.shadowBlur = 40; E.rr(ctx, -90, -150, 180, 300, 28); ctx.fillStyle = '#0B1220'; ctx.fill(); ctx.restore();
    E.rr(ctx, -90, -150, 180, 300, 28); ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.stroke(); E.rr(ctx, -36, -176, 72, 26, 8); ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fill();
    const h = 268 * lvl, g = ctx.createLinearGradient(0, 134 - h, 0, 134); g.addColorStop(0, LI); g.addColorStop(1, '#16A34A'); E.rr(ctx, -74, 134 - h, 148, Math.max(1, h), 18); ctx.fillStyle = g; ctx.fill();
    E.plainText(ctx, 'Li', 0, 0, 80, C.white, { weight: 900 }); }); }
  function plant(ctx, x, y, s, t, built = 1) { if (s <= 0.001) return; E.withT(ctx, x, y, s, 0, () => { // Lithium-Konverterwerk
    ctx.save(); ctx.globalAlpha = built; ctx.shadowColor = 'rgba(2,6,23,0.6)'; ctx.shadowBlur = 30;
    const g = ctx.createLinearGradient(0, -120, 0, 120); g.addColorStop(0, '#E2E8F0'); g.addColorStop(1, '#94A3B8');
    E.rr(ctx, -230, -40, 300, 160, 14); ctx.fillStyle = g; ctx.fill(); ctx.restore(); ctx.save(); ctx.globalAlpha = built;
    ctx.beginPath(); ctx.moveTo(-230, -40); for (let i = 0; i < 4; i++) { ctx.lineTo(-230 + i * 75 + 75, -100); ctx.lineTo(-230 + i * 75 + 75, -40); } ctx.closePath(); ctx.fillStyle = '#CBD5E1'; ctx.fill();
    [[110, 0], [190, 0]].forEach(([tx], i) => { E.rr(ctx, tx - 34, -110, 68, 230, 32); ctx.fillStyle = i ? '#64748B' : '#94A3B8'; ctx.fill(); });
    E.rr(ctx, -210, 10, 260, 40, 10); ctx.fillStyle = RT; ctx.fill(); E.plainText(ctx, 'LiOH-KONVERTER', -80, 31, 22, C.white, { weight: 900 });
    for (let k = 0; k < 3; k++) { const ph = (t * 0.5 + k / 3) % 1; ctx.globalAlpha = 0.45 * (1 - ph) * built; ctx.beginPath(); ctx.arc(150 + Math.sin(ph * 6) * 12, -130 - ph * 110, 14 + ph * 18, 0, 7); ctx.fillStyle = '#E2E8F0'; ctx.fill(); }
    ctx.restore();
    if (built < 1) { ctx.setLineDash([14, 10]); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.6)'; E.rr(ctx, -250, -150, 480, 290, 18); ctx.stroke(); ctx.setLineDash([]); }
  }); }
  function pin(ctx, x, y, s, col) { if (s <= 0.001) return; E.withT(ctx, x, y, s, 0, () => { ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 24; ctx.beginPath(); ctx.arc(0, -60, 38, Math.PI * 0.85, Math.PI * 0.15); ctx.lineTo(0, 0); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.restore(); ctx.beginPath(); ctx.arc(0, -60, 15, 0, 7); ctx.fillStyle = C.white; ctx.fill(); }); }
  function chain(ctx, x, y, s, lt, at, col) { for (let i = 0; i < 3; i++) { const k = pop(lt, at + i * 0.25, 0.4); if (k <= 0) continue; E.withT(ctx, x + (i - 1) * 110 * s, y, k * s, 0, () => {
    ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 20; ctx.lineWidth = 18; ctx.strokeStyle = i === 1 ? LI : col; ctx.beginPath(); ctx.ellipse(0, 0, 70, 42, 0, 0, 7); ctx.stroke(); ctx.restore(); }); } }
  function noComment(ctx, x, y, s, name, col) { if (s <= 0.001) return; E.withT(ctx, x, y, s, 0, () => { badge(ctx, name, col, null, 280);
    ctx.save(); ctx.shadowColor = 'rgba(2,6,23,0.5)'; ctx.shadowBlur = 20; E.rr(ctx, -170, 100, 340, 80, 24); ctx.fillStyle = '#F8FAFC'; ctx.fill(); ctx.beginPath(); ctx.moveTo(-20, 102); ctx.lineTo(0, 76); ctx.lineTo(20, 102); ctx.fill(); ctx.restore();
    E.plainText(ctx, '„KEIN KOMMENTAR“', 0, 142, 25, '#0F172A', { weight: 900 }); }); }
  function newsCard(ctx, x, y, w, s, lt, at, src, lines, col) { if (s <= 0.001) return; E.withT(ctx, x, y, s, -0.02, () => {
    const h = 120 + lines.length * 62; ctx.save(); ctx.shadowColor = 'rgba(2,6,23,0.6)'; ctx.shadowBlur = 40; E.rr(ctx, -w / 2, -h / 2, w, h, 26); ctx.fillStyle = '#F8FAFC'; ctx.fill(); ctx.restore();
    E.rr(ctx, -w / 2, -h / 2, w, 14, 7); ctx.fillStyle = col; ctx.fill();
    E.plainText(ctx, src, -w / 2 + 34, -h / 2 + 52, 24, '#64748B', { weight: 900, align: 'left' });
    lines.forEach(([txt, c], i) => { const k = pop(lt, at + i * 0.35, 0.4); if (k <= 0) return; ctx.globalAlpha = Math.min(1, k); E.plainText(ctx, txt, -w / 2 + 34, -h / 2 + 112 + i * 62, 36, c || '#0F172A', { weight: 900, align: 'left' }); ctx.globalAlpha = 1; }); }); }
  function bell(ctx, x, y, s, t) { if (s <= 0.001) return; E.withT(ctx, x, y, s, Math.sin(t * 9) * 0.12 * Math.max(0, Math.sin(t * 1.5)), () => {
    ctx.save(); ctx.shadowColor = GOLD; ctx.shadowBlur = 30; ctx.beginPath(); ctx.moveTo(-60, 40); ctx.quadraticCurveTo(-55, -70, 0, -72); ctx.quadraticCurveTo(55, -70, 60, 40); ctx.lineTo(74, 56); ctx.lineTo(-74, 56); ctx.closePath(); ctx.fillStyle = GOLD; ctx.fill(); ctx.restore();
    ctx.beginPath(); ctx.arc(0, 66, 16, 0, 7); ctx.fillStyle = GOLD; ctx.fill(); ctx.beginPath(); ctx.arc(0, -80, 10, 0, 7); ctx.fill(); }); }
  function bookmark(ctx, x, y, s, col) { if (s <= 0.001) return; E.withT(ctx, x, y, s, 0, () => { ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 30; ctx.beginPath(); ctx.moveTo(-70, -100); ctx.lineTo(70, -100); ctx.lineTo(70, 110); ctx.lineTo(0, 60); ctx.lineTo(-70, 110); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.restore();
    E.plainText(ctx, '✓', 0, -10, 70, C.white, { weight: 900 }); }); }
  function chk(ctx, txt, ok, w, col) { E.rr(ctx, -w / 2, -46, w, 92, 24); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = col; ctx.stroke();
    E.withT(ctx, -w / 2 + 54, 0, 1, 0, () => { ctx.beginPath(); ctx.arc(0, 0, 28, 0, 7); ctx.fillStyle = col; ctx.fill(); E.plainText(ctx, ok ? '✓' : '✕', 0, 2, 32, C.white, { weight: 900 }); }); E.plainText(ctx, txt, -w / 2 + 104, 2, 36, C.white, { weight: 900, align: 'left' }); }

  const PX = { x: 255, y: 1060, h: 610 };
  const panda = (ctx, pose, lt, t, o = {}) => K.panda(ctx, pose, lt, t, { ...o, ...PX });
  const pandaSeq = (ctx, seq, lt, t, o = {}) => K.pandaSeq(ctx, seq, lt, t, { ...o, ...PX });
  const TS = (dir, extra = {}) => ({ trans: dir, transDur: 0.65, punchAmt: 0.02, flashAmt: 0.0, zoom: 0.02, ...extra });
  const F = { x: 1210, y: 660 };
  const H1 = (t, c, ribbon, size) => { if (!t.includes('|')) return [{ t, c: c || C.white, size: 130, ribbon }]; const [a, b] = t.split('|'); return [{ t: a, c: C.white, size: 115 }, { t: b, c: c || C.white, size: 125, ribbon }]; };
  function stat(ctx, x, y, w, s, title, val, col, sub) { panel(ctx, x, y, w, 170, s, { accent: col, title, body: () => { E.plainText(ctx, val, -w / 2 + 36, 26, 40, C.white, { weight: 900, align: 'left' }); if (sub) E.plainText(ctx, sub, -w / 2 + 36, 62, 20, 'rgba(255,255,255,0.6)', { weight: 800, align: 'left' }); } }); }
  function statusRow(ctx, txt, st, w) { const col = st === 'ok' ? '#22C55E' : st === 'no' ? RED : AMBER; E.rr(ctx, -w / 2, -36, w, 72, 20); ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fill();
    E.plainText(ctx, txt, -w / 2 + 28, 2, 28, C.white, { weight: 900, align: 'left' }); E.withT(ctx, w / 2 - 44, 0, 1, 0, () => { ctx.beginPath(); ctx.arc(0, 0, 22, 0, 7); ctx.fillStyle = col; ctx.fill(); E.plainText(ctx, st === 'ok' ? '✓' : st === 'no' ? '✕' : '?', 0, 2, 26, C.white, { weight: 900 }); }); }

  const scenes = [
    { // 0–3,75: Breaking – Rheinmetall heimlich in Lithium?
      start: 0, mood: 'blue', poses: ['emotions/ueberrascht'], punch: false, noBrand: true, zoom: 0.02, focus: F,
      sfx: [[0.1, 'swell', 0.3, 0], [0.35, 'ding', 0.3, 0], ...flySfx(0.5, -0.1, 0.3), [1.6, 'pop', 0.3, 0.1], ...flySfx(2.0, 0.5, 0.3), [2.9, 'ping', 0.3, 0.3]],
      draw(ctx, lt, t) {
        E.liveBar(ctx, lt, 'RHEINMETALL  •  BLOOMBERG: EINSTIEG BEI ROCK TECH LITHIUM  •  6 MIO. CAD  •  WERK GUBEN  •  ');
        H(ctx, lt, [[0, H1('BREAKING NEWS|BEI RHEINMETALL', C.white, RED, 100), { y: 480, delay: 0.1 }], [1.25, H1('HEIMLICH IN|LITHIUM EINGESTIEGEN?', C.white, '#4D7C0F', 98), { y: 480 }]]);
        fly(ctx, 860, 680, lt, 0.5, 'left', () => E.withT(ctx, 0, 0, 1.5, 0, () => badge(ctx, 'RHEINMETALL', RHM, 'RÜSTUNG · DEUTSCHLAND')));
        if (lt > 1.6) E.withT(ctx, 1215, 680, pop(lt, 1.6, 0.4), 0, () => E.plainText(ctx, '+', 0, 0, 110, C.white, { weight: 900 }));
        fly(ctx, 1560, 680, lt, 2.0, 'right', () => liTile(ctx, 0, 0, 1.15, t));
        if (lt > 2.9) tag(ctx, 'LAUT BLOOMBERG', 1215, 960, '#334155', pop(lt, 2.9, 0.4));
        panda(ctx, 'emotions/ueberrascht', lt, t);
      } },
    { // 3,75–7,25: so neu – noch nicht bestätigt
      start: 3.75, mood: 'dark', poses: ['emotions/nachdenklich'], ...TS('right'), focus: F,
      sfx: [WS(), ...flySfx(0.3, -0.1, 0.3), [0.8, 'paper', 0.25, 0], ...flySfx(1.4, 0.5, 0.3), [1.8, 'pop', 0.28, 0.5], [2.1, 'pop', 0.28, 0.5], [2.4, 'stamp', 0.38, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, H1('SO NEU, DASS …', C.white, null, 110)], [1.75, H1('… NOCH NICHT|BESTÄTIGT', C.white, AMBER, 100)]]);
        fly(ctx, 930, 660, lt, 0.3, 'up', () => newsCard(ctx, 0, 0, 680, 1.05, lt, 0.6, 'BLOOMBERG · BERICHT', [['Rheinmetall soll bei', null], ['Rock Tech Lithium', RT], ['eingestiegen sein', null]], AMBER));
        fly(ctx, 1620, 660, lt, 1.4, 'right', () => panel(ctx, 0, 0, 440, 380, 1, { accent: AMBER, title: 'STATUS', body: (w) => {
          [['BLOOMBERG', 'ok', 1.5], ['RHEINMETALL', 'q', 1.8], ['ROCK TECH', 'q', 2.1]].forEach(([s2, st, at], i) => { const k = pop(lt, at, 0.35); if (k > 0) E.withT(ctx, 0, -50 + i * 90, k, 0, () => statusRow(ctx, s2, st, w - 60)); }); } }));
        E.stamp(ctx, 'UNBESTÄTIGT', 930, 900, lt, 2.35, { size: 56, rot: -0.1 });
        panda(ctx, 'emotions/nachdenklich', lt, t);
      } },
    { // 7,25–11,75: laut Bloomberg – der unbekannte Geldgeber
      start: 7.25, mood: 'blue', poses: ['poses/analysieren', 'poses/zeigen'], ...TS('up'), focus: F,
      sfx: [WS(), [0.4, 'pop', 0.3, -0.1], [1.3, 'swell', 0.28, 0], [2.7, 'impact', 0.3, 0], [2.8, 'ding', 0.3, 0], ...flySfx(3.2, 0.5, 0.3), [3.8, 'pop', 0.28, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, H1('LAUT BLOOMBERG:', C.white, null, 112)], [1.25, H1('DER UNBEKANNTE|GELDGEBER', C.white, RHM, 96)], [3.25, H1('… BEI ROCK TECH|LITHIUM', C.white, '#047857', 100)]]);
        const rev = eOut(prog(lt, 2.7, 0.5));
        E.withT(ctx, 900, 650, pop(lt, 0.3, 0.45), 0, () => {
          if (rev < 1) { ctx.globalAlpha = 1 - rev; ctx.save(); ctx.shadowColor = VIO; ctx.shadowBlur = 40; ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(0, -70, 80, 0, 7); ctx.fill(); E.rr(ctx, -125, 20, 250, 160, 70); ctx.fill(); ctx.restore(); E.plainText(ctx, '?', 0, -66, 100, C.white, { weight: 900 }); ctx.globalAlpha = 1; }
          if (rev > 0) E.withT(ctx, 0, 0, (0.6 + 0.4 * rev) * 1.35, 0, () => { ctx.globalAlpha = rev; badge(ctx, 'RHEINMETALL', RHM, 'STRATEGISCHER INVESTOR', 380); ctx.globalAlpha = 1; });
        });
        sparks(ctx, 900, 650, lt, 2.75, 22, RHM);
        fly(ctx, 1580, 650, lt, 3.2, 'right', () => panel(ctx, 0, 0, 500, 330, 1, { accent: RT, title: 'ROCK TECH LITHIUM', body: () => { liTile(ctx, -130, 30, 0.6, t); label(ctx, 'LITHIUM-', 90, 0, 30, C.white); label(ctx, 'VERARBEITUNG', 90, 40, 30, C.white); } }));
        if (lt > 3.8) tag(ctx, 'QUELLE: INFORMIERTE KREISE', 1215, 960, '#334155', pop(lt, 3.8, 0.4));
        pandaSeq(ctx, [[0, 'poses/analysieren'], [2.75, 'poses/zeigen']], lt, t);
      } },
    { // 11,75–17,75: kleine deutsch-kanadische Rohstofffirma – 6 Mio. CAD
      start: 11.75, mood: 'good', poses: ['poses/praesentieren'], ...TS('left'), focus: F,
      sfx: [WS(), ...flySfx(0.3, -0.1, 0.3), [1.0, 'pop', 0.3, -0.2], [1.5, 'pop', 0.3, 0], ...flySfx(3.3, 0.5, 0.3), ...ticks(3.6, 4.8, 8, 0.3, 0.5), [4.9, 'cash', 0.42, 0.5], [5.2, 'pop', 0.28, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, H1('DEUTSCH-KANADISCHE|ROHSTOFFFIRMA', C.white, '#047857', 88)], [3.25, H1('SAMMELTE RUND|6 MIO. CAD', C.white, '#15803D', 88)]]);
        fly(ctx, 880, 640, lt, 0.3, 'left', () => panel(ctx, 0, 0, 560, 400, 1, { accent: RT, title: 'ROCK TECH LITHIUM', body: () => {
          E.withT(ctx, -130, 0, pop(lt, 1.0, 0.4), 0, () => { flagDE(ctx, 0, 0, 150); label(ctx, 'DEUTSCHLAND', 0, 80, 22); }); E.withT(ctx, 130, 0, pop(lt, 1.5, 0.4), 0, () => { flagCA(ctx, 0, 0, 160); label(ctx, 'KANADA', 0, 80, 22); });
          E.plainText(ctx, '+', 0, 0, 56, C.white, { weight: 900 }); } }));
        fly(ctx, 1560, 640, lt, 3.3, 'right', () => panel(ctx, 0, 0, 560, 400, 1, { accent: '#4ADE80', title: 'KAPITALERHÖHUNG · OKT. 2026', body: () => { bigNum(ctx, '≈ ' + lerp(0, 6, eOut(prog(lt, 3.6, 1.2))).toFixed(1).replace('.', ',') + ' MIO.', 0, -10, 76, '#4ADE80'); label(ctx, 'KANADISCHE DOLLAR (CAD)', 0, 70, 24); } }));
        if (lt > 5.2) tag(ctx, '≈ 3,7 MIO. €', 1560, 950, '#334155', pop(lt, 5.2, 0.4));
        panda(ctx, 'poses/praesentieren', lt, t);
      } },
    { // 17,75–22,25: keine Riesensumme – aber interessant (Vergleich mit Werk-Kosten)
      start: 17.75, mood: 'dark', poses: ['emotions/cool', 'emotions/begeistert'], ...TS('right'), focus: F,
      sfx: [WS(), [0.3, 'pop', 0.3, -0.1], ...ticks(0.6, 1.4, 6, 0.25, -0.1), [1.0, 'down', 0.2, 0], ...flySfx(1.9, 0.5, 0.3), [3.3, 'ding', 0.35, 0.5]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, H1('KEINE|RIESENSUMME …', C.white, '#475569', 104)], [1.75, H1('… ABER WIRKLICH|INTERESSANT', GOLD, null, 104)]]);
        panel(ctx, 900, 660, 640, 470, pop(lt, 0.2, 0.5), { title: 'GRÖSSENORDNUNG', body: (w, h) => {
          const p = eOut(prog(lt, 0.6, 1.0)), bw = w - 120, x0 = -w / 2 + 60;
          [['KAPITALERHÖHUNG', '≈ 3,7 MIO. €', 3.7, '#4ADE80', -60], ['WERK GUBEN (PLAN)', '≈ 680 MIO. €', 680, '#64748B', 110]].forEach(([n2, v, val, col, y]) => {
            E.plainText(ctx, n2, x0, y - 36, 22, 'rgba(255,255,255,0.65)', { weight: 800, align: 'left' }); E.plainText(ctx, v, w / 2 - 60, y - 36, 26, col, { weight: 900, align: 'right' });
            E.rr(ctx, x0, y - 10, bw, 34, 17); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill(); E.rr(ctx, x0, y - 10, Math.max(34, bw * val / 680 * p), 34, 17); ctx.fillStyle = col; ctx.fill(); }); } });
        fly(ctx, 1580, 620, lt, 1.9, 'up', () => { pulseRings(ctx, 0, 0, t, GOLD, 3, 220); magnifier(ctx, 0, 0, 1.15, t); });
        if (lt > 3.3) tag(ctx, 'RÜSTUNG TRIFFT ROHSTOFFE', 1580, 930, AMBER, pop(lt, 3.3, 0.4));
        pandaSeq(ctx, [[0, 'emotions/cool'], [1.75, 'emotions/begeistert']], lt, t);
      } },
    { // 22,25–25,25: gut die Hälfte vom strategischen Investor
      start: 22.25, mood: 'blue', poses: ['poses/analysieren'], ...TS('up'), focus: F,
      sfx: [WS(), [0.3, 'pop', 0.3, 0], ...ticks(0.6, 1.8, 8, 0.28, 0), [1.9, 'ding', 0.38, 0], ...flySfx(2.0, 0.5, 0.3), ...flySfx(2.3, 0.5, 0.3)],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, H1('GUT DIE HÄLFTE VOM|STRATEGISCHEN INVESTOR', C.white, VIO, 86)]]);
        panel(ctx, 1215, 660, 1100, 500, pop(lt, 0.1, 0.5), { title: 'KAPITALERHÖHUNG ≈ 6 MIO. CAD · WER HAT GEZAHLT?', body: () => {
          const p = eOut(prog(lt, 0.6, 1.3)), fr = 3.25 / 6, r = 170, cx = -260, cy = 30;
          ctx.save(); ctx.shadowColor = RHM; ctx.shadowBlur = 24; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fillStyle = '#334155'; ctx.fill();
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fr * p); ctx.closePath(); ctx.fillStyle = RHM; ctx.fill(); ctx.restore();
          ctx.beginPath(); ctx.arc(cx, cy, r * 0.55, 0, 7); ctx.fillStyle = '#0F172A'; ctx.fill(); bigNum(ctx, Math.round(54 * p) + ' %', cx, cy + 4, 52, C.white);
          fly(ctx, 200, -40, lt, 2.0, 'right', () => stat(ctx, 0, 0, 440, 1, 'STRATEGISCHER INVESTOR', '3,25 MIO. CAD', RHM, 'LAUT BLOOMBERG: RHEINMETALL'));
          fly(ctx, 200, 150, lt, 2.3, 'right', () => stat(ctx, 0, 0, 440, 1, 'ÜBRIGE INVESTOREN', '≈ 2,75 MIO. CAD', '#94A3B8')); } });
        panda(ctx, 'poses/analysieren', lt, t);
      } },
    { // 25,25–30,75: keine Anlageberatung – auch beim Lithiumwerk in Guben
      start: 25.25, mood: 'good', poses: ['poses/tipp_geben', 'poses/zeigen'], ...TS('left'), focus: F,
      sfx: [WS(), [0.3, 'pop', 0.3, 0], ...flySfx(1.9, -0.1, 0.3), ...flySfx(2.6, 0.1, 0.3), ...flySfx(3.3, 0.5, 0.3), ...flySfx(3.9, 0.5, 0.3), ...flySfx(4.5, 0.5, 0.3)],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, H1('DAS GANZE IST|KEINE ANLAGEBERATUNG', C.white, '#475569', 104)], [1.75, H1('AUCH BEIM WERK|IN GUBEN?', C.white, '#047857', 92)]]);
        if (lt < 1.75) E.withT(ctx, 1215, 640, pop(lt, 0.3, 0.45), 0, () => K.shield(ctx, 0, 0, 1.1, '#475569', 'INFO', 'KEINE BERATUNG'));
        else { fly(ctx, 950, 700, lt, 1.9, 'left', () => plant(ctx, 0, 0, 1.25, t)); fly(ctx, 1160, 470, lt, 2.6, 'up', () => pin(ctx, 0, 0, 1.1, ROSE));
          if (lt > 2.9) tag(ctx, 'GUBEN · BRANDENBURG', 950, 950, ROSE, pop(lt, 2.9, 0.4));
          [['KAPAZITÄT (PLAN)', '≈ 24.000 T / JAHR', '#4ADE80', 'BATTERIEFÄHIGES LITHIUMHYDROXID', 3.3], ['INVESTITION (PLAN)', '≈ 680 MIO. €', AMBER, 'NACH KÜRZUNG UM 50 MIO. €', 3.9], ['RHEINMETALL', 'CO-INVESTOR?', RHM, 'NICHT BESTÄTIGT', 4.5]].forEach(([tt, v, col, sub, at], i) =>
            fly(ctx, 1620, 440 + i * 200, lt, at, 'right', () => stat(ctx, 0, 0, 480, 1, tt, v, col, sub))); }
        pandaSeq(ctx, [[0, 'poses/tipp_geben'], [1.75, 'poses/zeigen']], lt, t);
      } },
    { // 30,75–35: Warum Lithium? – steckt in vielen Akkus
      start: 30.75, mood: 'dark', poses: ['emotions/nachdenklich', 'poses/praesentieren'], ...TS('up'), focus: F,
      sfx: [WS(), [0.4, 'pop', 0.3, 0], [2.6, 'swell', 0.25, 0], ...flySfx(3.0, -0.1, 0.3), [3.4, 'riser', 0.15, 0], [3.6, 'pop', 0.28, 0.5], [3.85, 'pop', 0.28, 0.5], [4.1, 'pop', 0.28, 0.5]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, H1('WARUM GENAU|LITHIUM?', C.white, null, 80)], [3.0, H1('STECKT IN|VIELEN AKKUS', C.white, '#15803D', 96)]]);
        if (lt < 3.0) E.withT(ctx, 1215, 660, pop(lt, 0.3, 0.45), 0, () => { pulseRings(ctx, 0, 0, t, LI, 3, 220); bigNum(ctx, '?', 0, 30, 240, LI); });
        else { fly(ctx, 960, 690, lt, 3.0, 'up', () => battery(ctx, 0, 0, 1.2, eOut(prog(lt, 3.3, 1.0)), t));
          [['E-AUTOS', SKY], ['DROHNEN', PURP], ['MILITÄRFAHRZEUGE', AMBER]].forEach(([s2, col], i) => { const k = pop(lt, 3.6 + i * 0.25, 0.35); if (k > 0) E.withT(ctx, 1520, 500 + i * 150, k, 0, () => chip(ctx, s2, 0, 0, col, 1, 40)); }); }
        pandaSeq(ctx, [[0, 'emotions/nachdenklich'], [3.0, 'poses/praesentieren']], lt, t);
      } },
    { // 35–38: Werk genehmigt, aber noch nicht gebaut
      start: 35.0, mood: 'blue', poses: ['poses/analysieren'], ...TS('right'), focus: F,
      sfx: [WS(), ...flySfx(0.3, 0.5, 0.3), [0.7, 'ding', 0.32, 0.5], ...flySfx(2.0, 0.5, 0.3), [2.4, 'down', 0.25, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, H1('WERK GUBEN:|GENEHMIGT', C.white, '#15803D', 98)], [2.0, H1('GEBAUT?|NOCH NICHT', C.white, RED, 104)]]);
        plant(ctx, 930, 680, 1.15 * pop(lt, 0.1, 0.45), t, lt > 2.0 ? lerp(1, 0.25, eOut(prog(lt, 2.0, 0.6))) : 1);
        fly(ctx, 1590, 580, lt, 0.3, 'right', () => chk(ctx, 'GENEHMIGT', true, 520, '#16A34A'));
        fly(ctx, 1590, 720, lt, 2.0, 'right', () => chk(ctx, 'GEBAUT', false, 520, RED));
        panda(ctx, 'poses/analysieren', lt, t);
      } },
    { // 38–41: Beteiligung gilt als klein
      start: 38.0, mood: 'dark', poses: ['emotions/cool'], ...TS('zoom'), focus: F,
      sfx: [WS(), ...flySfx(0.3, -0.1, 0.3), ...flySfx(1.4, 0.5, 0.3), [2.0, 'tick', 0.3, 0.5]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, H1('DIE BETEILIGUNG|VON RHEINMETALL …', C.white, null, 92)], [1.25, H1('… GILT JEDOCH|ALS KLEIN', C.white, '#475569', 100)]]);
        fly(ctx, 900, 660, lt, 0.3, 'up', () => E.withT(ctx, 0, 0, 1.4, 0, () => badge(ctx, 'RHEINMETALL', RHM, 'AN ROCK TECH', 340)));
        fly(ctx, 1580, 660, lt, 1.4, 'right', () => panel(ctx, 0, 0, 520, 300, 1, { accent: RHM, title: 'ANTEIL', body: (w) => { E.rr(ctx, -w / 2 + 50, 0, w - 100, 44, 22); ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fill(); E.rr(ctx, -w / 2 + 50, 0, Math.max(44, (w - 100) * 0.12 * eOut(prog(lt, 1.8, 0.6))), 44, 22); ctx.fillStyle = RHM; ctx.fill(); label(ctx, 'KLEIN', 0, 90, 34, C.white); } }));
        panda(ctx, 'emotions/cool', lt, t);
      } },
    { // 41–44,75: der Haken – nur ein Bericht aus informierten Kreisen
      start: 41.0, mood: 'bad', poses: ['emotions/nachdenklich', 'poses/tipp_geben'], ...TS('left'), focus: F,
      sfx: [WS(), [0.3, 'swish', 0.3, 0], [0.9, 'impact', 0.25, 0], ...flySfx(1.4, 0.3, 0.3), [1.8, 'paper', 0.25, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, H1('ABER:|DER HAKEN', C.white, RED, 104)], [1.25, H1('NUR 1 BERICHT AUS|INFORMIERTEN KREISEN', C.white, '#B45309', 86)]]);
        if (lt < 1.35) P.hook(ctx, 1260, 620, eOut(prog(lt, 0.2, 0.7)), t);
        else { fly(ctx, 1010, 670, lt, 1.4, 'left', () => newsCard(ctx, 0, 0, 640, 1.05, lt, 1.7, 'BLOOMBERG · ANONYME QUELLEN', [['„Mit der Sache', null], ['vertraute Personen“', null], ['Offiziell: nichts', RED]], RED));
          if (lt > 2.2) E.withT(ctx, 1620, 640, pop(lt, 2.2, 0.4), 0, () => K.warn(ctx, 0, 0, 1.1, t)); }
        pandaSeq(ctx, [[0, 'emotions/nachdenklich'], [1.25, 'poses/tipp_geben']], lt, t);
      } },
    { // 44,75–47,75: beide schweigen
      start: 44.75, mood: 'dark', poses: ['emotions/nachdenklich'], ...TS('up'), focus: F,
      sfx: [WS(), ...flySfx(0.3, -0.1, 0.3), ...flySfx(0.9, 0.5, 0.3), [1.8, 'pop', 0.3, -0.1], [2.1, 'pop', 0.3, 0.5]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, H1('BEIDE SAGEN|BISLANG NICHTS', C.white, '#475569', 82)]]);
        fly(ctx, 920, 600, lt, 0.3, 'left', () => E.withT(ctx, 0, 0, 1.25, 0, () => noComment(ctx, 0, 0, 1, 'RHEINMETALL', RHM)));
        fly(ctx, 1560, 600, lt, 0.9, 'right', () => E.withT(ctx, 0, 0, 1.25, 0, () => noComment(ctx, 0, 0, 1, 'ROCK TECH', RT)));
        panda(ctx, 'emotions/nachdenklich', lt, t);
      } },
    { // 47,75–53,25: Optimisten vs. Skeptiker
      start: 47.75, mood: 'good', poses: ['emotions/begeistert', 'emotions/nachdenklich'], ...TS('right'), focus: F,
      sfx: [WS(), ...flySfx(0.3, -0.1, 0.3), [1.2, 'snap', 0.3, -0.3], [1.45, 'snap', 0.3, -0.2], [1.7, 'snap', 0.3, -0.1], [2.0, 'ding', 0.3, 0], ...flySfx(3.0, 0.5, 0.3), [4.3, 'tick', 0.3, 0.5]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, H1('OPTIMISTEN:|SCHRITT IN DIE LIEFERKETTE', C.white, '#15803D', 88)], [3.0, H1('SKEPTIKER:|1 KLEINER CHECK', C.white, RED, 88)]]);
        const dim = lt > 3.0 ? lerp(1, 0.55, eOut(prog(lt, 3.0, 0.5))) : 1;
        fly(ctx, 900, 660, lt, 0.3, 'left', () => { ctx.globalAlpha = dim; panel(ctx, 0, 0, 600, 440, 1, { accent: '#4ADE80', title: 'OPTIMISTEN', body: () => { chain(ctx, 0, -10, 1.1, lt, 1.2, '#4ADE80'); label(ctx, 'ROHSTOFF → AKKU → FAHRZEUG', 0, 120, 24, '#4ADE80'); } }); ctx.globalAlpha = 1; });
        fly(ctx, 1540, 660, lt, 3.0, 'right', () => panel(ctx, 0, 0, 600, 440, 1, { accent: '#F87171', title: 'SKEPTIKER', body: () => { coins(ctx, -120, 80, 2, 1.6); E.plainText(ctx, 'KLEINER', 80, -20, 44, C.white, { weight: 900 }); E.plainText(ctx, 'CHECK', 80, 36, 44, '#F87171', { weight: 900 }); label(ctx, '≈ 3,25 MIO. CAD', 0, 140, 24); } }));
        pandaSeq(ctx, [[0, 'emotions/begeistert'], [3.0, 'emotions/nachdenklich']], lt, t);
      } },
    { // 53,25–58,5: Video speichern & auf Meldung warten
      start: 53.25, mood: 'blue', poses: ['poses/tipp_geben', 'emotions/augenzwinkern'], ...TS('zoom'), focus: F,
      sfx: [WS(), ...flySfx(0.3, -0.1, 0.3), [0.9, 'snap', 0.3, -0.1], ...flySfx(2.6, 0.5, 0.3), [3.0, 'ping', 0.35, 0.5], [3.6, 'ding', 0.3, 0.5]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, H1('SPEICHER DIR|DAS VIDEO AB', C.white, TEAL, 100)], [2.5, H1('UND WARTE AUF|DIE MELDUNG', C.white, '#B45309', 100)]]);
        fly(ctx, 880, 660, lt, 0.3, 'up', () => bookmark(ctx, 0, 0, 1.4, TEAL));
        if (lt > 2.6) { fly(ctx, 1500, 600, lt, 2.6, 'right', () => panel(ctx, 0, 0, 660, 220, 1, { accent: AMBER, title: 'MELDUNG', body: () => { bell(ctx, -240, 30, 0.6, t); E.plainText(ctx, 'Rheinmetall bestätigt…?', 50, 30, 34, C.white, { weight: 900 }); } }));
          if (lt > 3.6) tag(ctx, 'OFFIZIELLE BESTÄTIGUNG ABWARTEN', 1500, 800, '#334155', pop(lt, 3.6, 0.4)); }
        pandaSeq(ctx, [[0, 'poses/tipp_geben'], [2.5, 'emotions/augenzwinkern']], lt, t);
      } },
    { // 58,5–Ende: Bloomberg genau beobachten
      start: 58.5, mood: 'dark', poses: ['poses/analysieren', 'emotions/freundlich'], ...TS('left', { transDur: 0.5 }), focus: F,
      sfx: [WS(), ...flySfx(0.3, 0, 0.3), [1.2, 'swish', 0.25, 0.3], ...flySfx(1.9, 0.5, 0.3)],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, H1('GANZ GENAU|BEOBACHTEN', C.white, VIO, 104)], [1.75, H1('WAS POSTET|BLOOMBERG?', GOLD, null, 92)]]);
        fly(ctx, 1000, 680, lt, 0.3, 'left', () => newsCard(ctx, 0, 0, 660, 1.05, lt, 0.6, 'BLOOMBERG · NÄCHSTER BERICHT', [['Rheinmetall', RHM], ['Rock Tech Lithium', RT], ['Werk Guben …', null]], VIO));
        if (lt > 1.2) magnifier(ctx, lerp(820, 1180, (Math.sin(t * 1.1) + 1) / 2), 760, 0.9 * pop(lt, 1.2, 0.4), t);
        fly(ctx, 1620, 640, lt, 1.9, 'right', () => panel(ctx, 0, 0, 420, 360, 1, { accent: VIO, title: 'WATCHLIST', body: (w) => {
          [['BESTÄTIGUNG', 'q'], ['GUBEN-DEAL', 'q'], ['BAUSTART', 'q']].forEach(([s2, st], i) => E.withT(ctx, 0, -50 + i * 90, pop(lt, 2.3 + i * 0.25, 0.35), 0, () => statusRow(ctx, s2, st, w - 50))); } }));
        pandaSeq(ctx, [[0, 'poses/analysieren'], [2.0, 'emotions/freundlich']], lt, t);
      } },
  ];
  const music = { bpm: 92, chords: [['A', 'm'], ['F', ''], ['C', ''], ['G', '']], level: 0.45, abs: 0.09,
    sections: [[0, 'tension'], [7.25, 'pulse'], [11.75, 'full'], [22.25, 'pulse'], [30.75, 'full'], [41.0, 'tension'], [47.75, 'pulse'], [53.25, 'full']], drops: [] };
  window.VIDEO = { format: 'landscape', noCaptions: true, name: 'rheinmetall-rocktech-yt', style: 'clean', fps: 30, duration: 62.85, scenes, captions, xfade: 0.35, grain: 0.03, bokeh: false, endFade: false, pandaFixed: true, music };
})();
