// Northrop Grumman – Q3 2026: Rekord-Auftragsbestand, Prognose angehoben – Short (63,6 s). Clean-Stil.
// Fakten (Q3-Release 8-K): Umsatz 11,1 Mrd. $ (+7 %), Book-to-Bill 1,5, Auftragsbestand 110 Mrd. $, EPS-Prognose +0,70 $ (Mitte).
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

  function lineChart(ctx, x, y, w, h, pts, p, col, o = {}) {
    const n = pts.length - 1, X = (i) => x - w / 2 + w * i / n, Y = (v) => y + h / 2 - h * v, k = Math.max(0.001, p) * n, last = Math.floor(k), fr = k - last;
    const pt = (i) => (i <= last ? [X(i), Y(pts[i])] : [X(last) + (X(last + 1) - X(last)) * fr, Y(pts[last]) + (Y(pts[Math.min(n, last + 1)]) - Y(pts[last])) * fr]);
    const path = () => { ctx.beginPath(); for (let i = 0; i <= Math.min(n, last + 1); i++) { const [px, py] = pt(i); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } };
    ctx.save(); path(); const [ex] = pt(Math.min(n, last + 1)); ctx.lineTo(ex, y + h / 2); ctx.lineTo(X(0), y + h / 2); ctx.closePath();
    const g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2); g.addColorStop(0, col + '66'); g.addColorStop(1, col + '00'); ctx.fillStyle = g; ctx.fill();
    path(); ctx.shadowColor = col; ctx.shadowBlur = 16; ctx.strokeStyle = col; ctx.lineWidth = o.lw || 7; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); ctx.restore();
    const [lx, ly] = pt(Math.min(n, last + 1)); ctx.beginPath(); ctx.arc(lx, ly, 10, 0, 7); ctx.fillStyle = C.white; ctx.fill();
  }
  function vbar(ctx, x, by, w, scale, val, p, col, top, bot) {
    const h = Math.abs(val) * scale * p, up = val >= 0, y0 = up ? by - h : by;
    ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 22; const g = ctx.createLinearGradient(0, y0, 0, y0 + h); g.addColorStop(0, up ? col : E.shade(col, -0.35)); g.addColorStop(1, up ? E.shade(col, -0.35) : col);
    E.rr(ctx, x - w / 2, y0, w, Math.max(2, h), 14); ctx.fillStyle = g; ctx.fill(); ctx.restore();
    if (p > 0.4 && top) bigNum(ctx, top, x, up ? by - h - 36 : by + h + 40, 40, C.white);
    if (bot) label(ctx, bot, x, up ? by + 34 : by - 30, 24, 'rgba(255,255,255,0.75)');
  }
  function chk(ctx, txt, ok, w, col) { E.rr(ctx, -w / 2, -46, w, 92, 24); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = col; ctx.stroke();
    E.withT(ctx, -w / 2 + 54, 0, 1, 0, () => { ctx.beginPath(); ctx.arc(0, 0, 28, 0, 7); ctx.fillStyle = col; ctx.fill(); E.plainText(ctx, ok ? '✓' : '✕', 0, 2, 32, C.white, { weight: 900 }); }); E.plainText(ctx, txt, -w / 2 + 104, 2, 36, C.white, { weight: 900, align: 'left' }); }
  function badge(ctx, txt, col, sub, w = 300) { ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 30; E.rr(ctx, -w / 2, -70, w, 140, 30); const g = ctx.createLinearGradient(0, -70, 0, 70); g.addColorStop(0, col); g.addColorStop(1, E.shade(col, -0.4)); ctx.fillStyle = g; ctx.fill(); ctx.restore();
    E.plainText(ctx, txt, 0, sub ? -12 : 2, txt.length > 9 ? 34 : 44, C.white, { weight: 900 }); if (sub) E.plainText(ctx, sub, 0, 34, 22, 'rgba(255,255,255,0.8)', { weight: 800 }); }

  const { panda, pandaSeq, magnifier } = K;
  const UP = '#22C55E', DN = '#EF4444', NOC = '#3B82F6', RHM = '#64748B';
  const captions = [[0.0, 1.5, "Genau dieses Rüstungsunternehmen hat"], [1.5, 3.75, "jetzt wieder massives Erholungspotenzial,"], [3.75, 5.0, "seitdem wir letzte Woche drüber"], [5.0, 5.5, "geredet haben."], [5.5, 7.5, "Über 12 Prozent Kursanstieg,"], [7.5, 9.0, "und jetzt geht's noch weiter."], [9.0, 10.0, "Sie haben nämlich einen neuen"], [10.0, 10.5, "Rekord erreicht,"], [10.5, 12.5, "über 110 Milliarden Dollar"], [12.5, 13.0, "an Aufträgen."], [13.0, 14.0, "Und jetzt wird's"], [14.0, 14.5, "extrem wichtig."], [14.5, 16.0, "Das Ganze ist keine Anlageberatung."], [16.0, 18.0, "Der US-Rüstungskonzern baut"], [18.0, 19.5, "unter anderem den B-21-"], [19.5, 20.5, "Bomber, und im 3."], [20.5, 22.5, "Quartal lag der Umsatz"], [22.5, 24.0, "bei 11,1 Milliarden Dollar,"], [24.0, 25.0, "plus 7 Prozent."], [25.0, 26.0, "Neue Aufträge gab es"], [26.0, 27.0, "dabei im Wert von"], [27.0, 28.5, "16,4 Milliarden."], [28.5, 30.0, "Auf jeden Dollar Umsatz"], [30.0, 31.0, "kommen also 1 Dollar"], [31.0, 33.0, "50 an neuen Bestellungen."], [33.0, 34.5, "Dadurch stieg der Auftragsbestand"], [34.5, 35.5, "auf rund 110 Milliarden"], [35.5, 36.5, "Dollar, und das ist 1"], [36.5, 38.5, "Rekord, und zum Jahresanfang"], [38.5, 39.0, "waren es hier noch"], [39.0, 40.5, "rund 96."], [40.5, 41.0, "Dadurch hat die Firma"], [41.0, 43.0, "ihre Prognose auch angehoben."], [43.0, 44.0, "Der Gewinn je Aktie"], [44.0, 45.0, "2026 jetzt"], [45.0, 47.0, "bei 29,35 Dollar bis"], [47.0, 49.0, "29,75 Dollar."], [49.0, 50.0, "Vorher lag dieser noch"], [50.0, 51.5, "bei knapp 28 bis"], [51.5, 52.5, "29 Dollar."], [52.5, 54.5, "Mal abgesehen von Rheinmetall"], [54.5, 55.5, "ist das hier vielleicht auch"], [55.5, 56.0, "mal ne interessante"], [56.0, 57.0, "Einstiegsmöglichkeit für den einen"], [57.0, 58.0, "oder anderen von euch."], [58.0, 58.5, "Man muss aber sagen,"], [58.5, 59.5, "der Umsatz wächst um"], [59.5, 60.5, "7 Prozent,"], [60.5, 61.5, "und der Gewinn hier"], [61.5, 62.0, "je Aktie nur um 3,"], [62.0, 63.0, "und 1 Auftrag ist noch"], [63.0, 63.6, "kein Gewinn."]];
  const TS = (dir, extra = {}) => ({ trans: dir, transDur: 0.6, punchAmt: 0.03, flashAmt: 0.0, zoom: 0.03, ...extra });
  const F = { x: 640, y: 980 };
  const RECOV = [0.55, 0.42, 0.3, 0.22, 0.18, 0.25, 0.38, 0.5, 0.62, 0.72, 0.82];
  function bomber(ctx, x, y, s, t) { E.withT(ctx, x, y, s, 0, () => { ctx.save(); ctx.shadowColor = SKY; ctx.shadowBlur = 20; ctx.fillStyle = '#94A3B8'; ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(110, 30); ctx.lineTo(80, 40); ctx.lineTo(55, 26); ctx.lineTo(28, 40); ctx.lineTo(0, 26); ctx.lineTo(-28, 40); ctx.lineTo(-55, 26); ctx.lineTo(-80, 40); ctx.lineTo(-110, 30); ctx.closePath(); ctx.fill(); ctx.restore(); ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.ellipse(0, -14, 14, 8, 0, 0, 7); ctx.fill(); }); }
  function missile(ctx, x, y, s) { E.withT(ctx, x, y, s, 0, () => { ctx.fillStyle = '#E2E8F0'; E.rr(ctx, -16, -70, 32, 130, 10); ctx.fill(); ctx.beginPath(); ctx.moveTo(-16, -66); ctx.lineTo(0, -100); ctx.lineTo(16, -66); ctx.fill(); ctx.fillStyle = '#64748B'; ctx.beginPath(); ctx.moveTo(-16, 40); ctx.lineTo(-36, 64); ctx.lineTo(-16, 60); ctx.moveTo(16, 40); ctx.lineTo(36, 64); ctx.lineTo(16, 60); ctx.fill(); }); }
  function sub(ctx, x, y, s) { E.withT(ctx, x, y, s, 0, () => { ctx.fillStyle = '#64748B'; ctx.beginPath(); ctx.ellipse(0, 10, 110, 30, 0, 0, 7); ctx.fill(); E.rr(ctx, -20, -40, 50, 40, 10); ctx.fill(); ctx.fillStyle = '#38BDF8'; [-60, -30, 30, 60].forEach((px) => { ctx.beginPath(); ctx.arc(px, 10, 6, 0, 7); ctx.fill(); }); }); }
  function tile(ctx, x, y, s, title, col, fn) { if (s <= 0.001) return; panel(ctx, x, y, 290, 230, s, { accent: col, body: () => { fn(); E.plainText(ctx, title, 0, 82, 24, C.white, { weight: 900 }); } }); }
  function range(ctx, x, y, w, lo, hi, min, max, col, lab, p) { const X = (v) => x - w / 2 + w * (v - min) / (max - min);
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; E.rr(ctx, x - w / 2, y - 18, w, 36, 18); ctx.fill();
    ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 20; ctx.fillStyle = col; E.rr(ctx, X(lo), y - 18, Math.max(36, (X(hi) - X(lo)) * p), 36, 18); ctx.fill(); ctx.restore();
    E.plainText(ctx, lab, x - w / 2, y - 44, 22, 'rgba(255,255,255,0.7)', { weight: 800, align: 'left' }); }

  const scenes = [
    { // 0–3,75: dieses Rüstungsunternehmen – massives Erholungspotenzial
      start: 0, mood: 'blue', poses: ['poses/zeigen'], punch: false, noBrand: true, zoom: 0.03, focus: F,
      sfx: [[0.1, 'swell', 0.3, 0], [0.35, 'ding', 0.3, 0], ...flySfx(0.5, 0.2, 0.3), [1.8, 'riser', 0.15, 0.2], [2.6, 'ping', 0.3, 0.2]],
      draw(ctx, lt, t) {
        E.liveBar(ctx, lt, 'NORTHROP GRUMMAN  •  Q3 2026: UMSATZ 11,1 MRD. $ (+7 %)  •  AUFTRAGSBESTAND REKORD 110 MRD. $  •  PROGNOSE ANGEHOBEN  •  ');
        H(ctx, lt, [[0, [{ t: 'DIESER', c: C.white, size: 130 }, { t: 'RÜSTUNGSKONZERN', c: C.white, size: 105, ribbon: NOC }], { y: 480, delay: 0.1 }], [1.5, [{ t: 'MASSIVES', c: C.white, size: 130 }, { t: 'ERHOLUNGSPOTENZIAL', c: '#4ADE80', size: 92 }], { y: 480 }]]);
        fly(ctx, 700, 990, lt, 0.5, 'up', () => panel(ctx, 0, 0, 620, 420, 1, { accent: UP, title: 'NORTHROP GRUMMAN · USA', body: () => { lineChart(ctx, 0, 40, 540, 250, RECOV, eOut(prog(lt, 0.8, 2.0)), UP); bomber(ctx, 170, -80, 0.7, t); } }));
        panda(ctx, 'poses/zeigen', lt, t, { x: 160, h: 440 });
      } },
    { // 3,75–9: seit letzter Woche +12 % – und es geht weiter
      start: 3.75, mood: 'good', poses: ['emotions/begeistert'], ...TS('right'), focus: F,
      sfx: [WS(), [0.3, 'pop', 0.3, 0], [1.6, 'swell', 0.28, 0], ...ticks(1.8, 2.9, 8, 0.28, 0.2), [3.0, 'cash', 0.42, 0.2], [3.8, 'whoosh', 0.25, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'SEIT LETZTER', c: C.white, size: 125 }, { t: 'WOCHE', c: C.white, size: 135, ribbon: TEAL }]], [1.75, [{ t: 'ÜBER', c: C.white, size: 120 }, { t: '+12 %', c: '#4ADE80', size: 170 }]], [3.75, [{ t: 'UND ES GEHT', c: C.white, size: 125 }, { t: 'NOCH WEITER', c: C.white, size: 120, ribbon: '#16A34A' }]]]);
        panel(ctx, 700, 990, 620, 420, pop(lt, 0.2, 0.5), { accent: UP, title: 'KURS · LETZTE TAGE', body: () => { lineChart(ctx, 0, 40, 540, 250, [0.1, 0.15, 0.12, 0.3, 0.42, 0.5, 0.62, 0.7, 0.8], eOut(prog(lt, 0.4, 2.4)), UP);
          if (lt > 1.8) chip(ctx, '+' + Math.round(lerp(0, 12, eOut(prog(lt, 1.8, 1.1)))) + ' %', 170, -110, '#16A34A', pop(lt, 1.8, 0.4), 40); } });
        panda(ctx, 'emotions/begeistert', lt, t, { x: 150, h: 420 });
      } },
    { // 9–13: neuer Rekord – über 110 Mrd. $ Aufträge
      start: 9.0, mood: 'good', poses: ['emotions/ueberrascht'], ...TS('up'), focus: F,
      sfx: [WS(), [0.3, 'pop', 0.3, 0], [1.2, 'swell', 0.3, 0], ...ticks(1.4, 2.8, 10, 0.3, 0.2), [2.9, 'cash', 0.45, 0.2], [2.95, 'ding', 0.35, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'NEUER', c: C.white, size: 135 }, { t: 'REKORD', c: C.white, size: 140, ribbon: GOLD }]], [1.5, [{ t: 'ÜBER 110 MRD. $', c: GOLD, size: 115 }, { t: 'AN AUFTRÄGEN', c: C.white, size: 115 }]]]);
        E.withT(ctx, 700, 990, pop(lt, 0.3, 0.45), 0, () => { panel(ctx, 0, 0, 560, 300, 1, { accent: GOLD, title: 'AUFTRAGSBESTAND', body: () => { bigNum(ctx, Math.round(lerp(0, 110, eOut(prog(lt, 1.4, 1.5)))) + ' MRD. $', 0, 30, 84, GOLD); } }); });
        sparks(ctx, 700, 990, lt, 2.9, 26, GOLD);
        panda(ctx, 'emotions/ueberrascht', lt, t, { x: 150, h: 420 });
      } },
    { // 13–16: extrem wichtig – keine Anlageberatung
      start: 13.0, mood: 'dark', poses: ['poses/tipp_geben'], ...TS('zoom', { transDur: 0.5 }), focus: F,
      sfx: [WS(), [0.3, 'ping', 0.3, 0], [1.6, 'pop', 0.3, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'JETZT WIRD\'S', c: C.white, size: 130 }, { t: 'EXTREM WICHTIG', c: GOLD, size: 115 }]], [1.5, [{ t: 'KEINE', c: C.white, size: 135 }, { t: 'ANLAGEBERATUNG', c: C.white, size: 110, ribbon: '#475569' }]]]);
        if (lt < 1.5) E.withT(ctx, 700, 990, pop(lt, 0.3, 0.45), 0, () => { pulseRings(ctx, 0, 0, t, AMBER, 3, 200); bigNum(ctx, '!', 0, 30, 230, AMBER); });
        else E.withT(ctx, 700, 990, pop(lt, 1.6, 0.45), 0, () => K.shield(ctx, 0, 0, 1, '#475569', 'INFO', 'NUR BILDUNG'));
        panda(ctx, 'poses/tipp_geben', lt, t, { x: 150, h: 420 });
      } },
    { // 16–20,5: was baut Northrop – B-21 u. a.
      start: 16.0, mood: 'blue', poses: ['poses/praesentieren'], ...TS('left'), focus: F,
      sfx: [WS(), ...flySfx(0.3, -0.2, 0.3), ...flySfx(1.9, 0.3, 0.3), ...flySfx(2.5, -0.2, 0.3), ...flySfx(3.1, 0.3, 0.3)],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'US-RÜSTUNGSKONZERN', c: C.white, size: 100 }, { t: 'BAUT U. A.', c: C.white, size: 125, ribbon: NOC }]]]);
        fly(ctx, 555, 880, lt, 0.3, 'left', () => tile(ctx, 0, 0, 1, 'B-21-BOMBER', SKY, () => bomber(ctx, 0, -10, 0.95, t)));
        fly(ctx, 860, 880, lt, 1.9, 'right', () => tile(ctx, 0, 0, 1, 'SENTINEL-RAKETE', ROSE, () => E.withT(ctx, 0, -10, 1, Math.PI / 2, () => missile(ctx, 0, 0, 0.8))));
        fly(ctx, 555, 1130, lt, 2.5, 'left', () => tile(ctx, 0, 0, 1, 'SATELLITEN', PURP, () => P.satellite(ctx, 0, -20, 0.55, t)));
        fly(ctx, 860, 1130, lt, 3.1, 'right', () => tile(ctx, 0, 0, 1, 'U-BOOT-TEILE', TEAL, () => sub(ctx, 0, -14, 0.95)));
        panda(ctx, 'poses/praesentieren', lt, t, { x: 150, h: 420 });
      } },
    { // 20,5–25: Q3: Umsatz 11,1 Mrd. $, +7 %
      start: 20.5, mood: 'good', poses: ['poses/analysieren'], ...TS('up'), focus: F,
      sfx: [WS(), [0.3, 'pop', 0.3, 0], ...ticks(1.6, 2.9, 9, 0.28, 0), [3.0, 'cash', 0.4, 0], ...flySfx(3.5, 0.3, 0.3)],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: '3. QUARTAL', c: C.white, size: 135 }, { t: 'UMSATZ', c: C.white, size: 130, ribbon: BLUE }]], [2.0, [{ t: '11,1 MRD. $', c: '#4ADE80', size: 140 }, { t: '+7 %', c: C.white, size: 120, ribbon: '#16A34A' }]]]);
        panel(ctx, 700, 1010, 600, 520, pop(lt, 0.2, 0.5), { title: 'UMSATZ Q3 (MRD. $)', body: () => { const by = 190; ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-240, by, 480, 3);
          vbar(ctx, -110, by, 150, 26, 10.4, eOut(prog(lt, 0.6, 0.8)), '#94A3B8', '≈ 10,4', 'Q3 2025'); vbar(ctx, 110, by, 150, 26, 11.1, eOut(prog(lt, 1.6, 1.0)), UP, '11,1', 'Q3 2026'); } });
        if (lt > 3.5) fly(ctx, 860, 690, lt, 3.5, 'right', () => chip(ctx, '+7 %', 0, 0, '#16A34A', 1, 40));
        panda(ctx, 'poses/analysieren', lt, t, { x: 150, h: 420 });
      } },
    { // 25–33: neue Aufträge 16,4 Mrd. – Book-to-Bill 1,5
      start: 25.0, mood: 'blue', poses: ['poses/zeigen', 'emotions/begeistert'], ...TS('right'), focus: F,
      sfx: [WS(), ...flySfx(0.3, 0.2, 0.3), ...ticks(0.8, 2.2, 9, 0.28, 0.2), [2.3, 'cash', 0.4, 0.2], ...flySfx(3.6, -0.2, 0.3), [4.4, 'pop', 0.3, -0.2], ...flySfx(5.2, 0.3, 0.3), [6.0, 'ding', 0.35, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'NEUE AUFTRÄGE', c: C.white, size: 115 }, { t: '16,4 MRD. $', c: GOLD, size: 140 }]], [3.5, [{ t: 'JE 1 $ UMSATZ', c: C.white, size: 115 }, { t: '1,50 $ BESTELLT', c: C.white, size: 110, ribbon: TEAL }]]]);
        if (lt < 3.5) fly(ctx, 700, 990, lt, 0.3, 'up', () => panel(ctx, 0, 0, 580, 300, 1, { accent: GOLD, title: 'NEUE AUFTRÄGE · Q3', body: () => bigNum(ctx, lerp(0, 16.4, eOut(prog(lt, 0.8, 1.4))).toFixed(1).replace('.', ',') + ' MRD. $', 0, 30, 76, GOLD) }));
        else { fly(ctx, 560, 960, lt, 3.6, 'left', () => panel(ctx, 0, 0, 270, 320, 1, { accent: '#94A3B8', title: 'UMSATZ', body: () => { coins(ctx, 0, 90, 4, 1.5); bigNum(ctx, '1 $', 0, -40, 60, C.white); } }));
          fly(ctx, 860, 960, lt, 5.2, 'right', () => panel(ctx, 0, 0, 270, 320, 1, { accent: TEAL, title: 'BESTELLT', body: () => { coins(ctx, -40, 90, 4, 1.5); coins(ctx, 40, 90, 2, 1.5); bigNum(ctx, '1,50 $', 0, -40, 56, '#4ADE80'); } }));
          if (lt > 4.4) E.plainText(ctx, '→', 710, 960, 60, C.white, { weight: 900 });
          if (lt > 6.0) tag(ctx, 'BOOK-TO-BILL: 1,5', 710, 1180, TEAL, pop(lt, 6.0, 0.4)); }
        pandaSeq(ctx, [[0, 'poses/zeigen'], [6.0, 'emotions/begeistert']], lt, t, { x: 150, h: 420 });
      } },
    { // 33–40,5: Auftragsbestand 110 Mrd. – Rekord, Jahresanfang 96
      start: 33.0, mood: 'good', poses: ['poses/praesentieren'], ...TS('up'), focus: F,
      sfx: [WS(), [0.3, 'pop', 0.3, 0], [1.6, 'pop', 0.3, -0.2], ...ticks(1.8, 3.0, 8, 0.28, 0.2), [3.1, 'ding', 0.38, 0.2], [3.6, 'stamp', 0.32, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'AUFTRAGSBESTAND', c: C.white, size: 105 }, { t: '≈ 110 MRD. $', c: GOLD, size: 135 }]], [3.5, [{ t: 'REKORD!', c: C.white, size: 140, ribbon: GOLD }, { t: 'JAHRESANFANG: 96', c: C.white, size: 105 }]]]);
        panel(ctx, 700, 1010, 600, 520, pop(lt, 0.1, 0.5), { title: 'AUFTRAGSBESTAND (MRD. $)', body: () => { const by = 190; ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-240, by, 480, 3);
          vbar(ctx, -110, by, 150, 2.6, 96, eOut(prog(lt, 1.6, 0.8)), '#94A3B8', '≈ 96', 'JAN. 2026'); vbar(ctx, 110, by, 150, 2.6, 110, eOut(prog(lt, 1.8, 1.2)), GOLD, '≈ 110', 'SEPT. 2026'); } });
        E.stamp(ctx, 'REKORD', 720, 690, lt, 3.6, { size: 56, rot: -0.1 });
        panda(ctx, 'poses/praesentieren', lt, t, { x: 150, h: 420 });
      } },
    { // 40,5–49: Prognose angehoben – EPS 29,35–29,75 $
      start: 40.5, mood: 'good', poses: ['emotions/begeistert'], ...TS('left'), focus: F,
      sfx: [WS(), [0.3, 'pop', 0.3, 0], [1.0, 'whoosh', 0.25, 0.2], [2.6, 'swell', 0.28, 0], ...flySfx(4.4, 0.2, 0.3), [5.0, 'cash', 0.4, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'PROGNOSE', c: C.white, size: 135 }, { t: 'ANGEHOBEN', c: C.white, size: 130, ribbon: '#16A34A' }]], [2.5, [{ t: 'GEWINN JE AKTIE', c: C.white, size: 110 }, { t: '29,35–29,75 $', c: '#4ADE80', size: 115 }]]]);
        E.withT(ctx, 700, 980, pop(lt, 0.3, 0.45), 0, () => { ctx.save(); ctx.shadowColor = UP; ctx.shadowBlur = 40; ctx.strokeStyle = '#4ADE80'; ctx.lineWidth = 26; ctx.lineCap = 'round'; const p = eOut(prog(lt, 0.4, 0.8));
          ctx.beginPath(); ctx.moveTo(-160, 120); ctx.lineTo(-160 + 320 * p, 120 - 240 * p); ctx.stroke(); if (p > 0.95) { ctx.beginPath(); ctx.moveTo(160, -120); ctx.lineTo(60, -120); ctx.moveTo(160, -120); ctx.lineTo(160, -20); ctx.stroke(); } ctx.restore(); });
        if (lt > 4.4) fly(ctx, 700, 1260, lt, 4.4, 'up', () => chip(ctx, 'EPS 2026 (BEREINIGT)', 0, 0, '#16A34A', 1, 34));
        panda(ctx, 'emotions/begeistert', lt, t, { x: 150, h: 420 });
      } },
    { // 49–52,5: vorher 28,60–29,10 $
      start: 49.0, mood: 'blue', poses: ['poses/analysieren'], ...TS('up'), focus: F,
      sfx: [WS(), [0.3, 'pop', 0.3, 0], [0.8, 'swish', 0.25, -0.1], [1.8, 'swish', 0.25, 0.2], [2.6, 'ding', 0.3, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'VORHER', c: C.white, size: 135 }, { t: '28,60–29,10 $', c: C.white, size: 115, ribbon: '#475569' }]]]);
        panel(ctx, 700, 1000, 620, 420, pop(lt, 0.2, 0.5), { title: 'EPS-PROGNOSE 2026 ($)', body: (w) => {
          range(ctx, 0, -40, w - 100, 28.6, 29.1, 28.4, 30, '#94A3B8', 'VORHER · 28,60–29,10', eOut(prog(lt, 0.8, 0.6)));
          range(ctx, 0, 90, w - 100, 29.35, 29.75, 28.4, 30, '#4ADE80', 'JETZT · 29,35–29,75', eOut(prog(lt, 1.8, 0.6)));
          if (lt > 2.6) chip(ctx, '+0,70 $ MITTE', 0, 170, '#16A34A', pop(lt, 2.6, 0.4), 30); } });
        panda(ctx, 'poses/analysieren', lt, t, { x: 150, h: 420 });
      } },
    { // 52,5–58: neben Rheinmetall – interessante Einstiegsmöglichkeit?
      start: 52.5, mood: 'dark', poses: ['emotions/augenzwinkern'], ...TS('right'), focus: F,
      sfx: [WS(), ...flySfx(0.3, -0.2, 0.3), ...flySfx(1.3, 0.3, 0.3), [3.6, 'ping', 0.3, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'NICHT NUR', c: C.white, size: 130 }, { t: 'RHEINMETALL', c: C.white, size: 120, ribbon: RHM }]], [3.5, [{ t: 'INTERESSANTE', c: C.white, size: 115 }, { t: 'EINSTIEGSCHANCE?', c: GOLD, size: 105 }]]]);
        const mv = eInOut(prog(lt, 1.2, 0.6));
        fly(ctx, 700, lerp(1000, 880, mv), lt, 0.3, 'left', () => E.withT(ctx, 0, 0, lerp(1.2, 0.85, mv), 0, () => { ctx.globalAlpha = lerp(1, 0.55, mv); badge(ctx, 'RHEINMETALL', RHM, 'DEUTSCHLAND'); ctx.globalAlpha = 1; }));
        fly(ctx, 700, 1090, lt, 1.3, 'right', () => E.withT(ctx, 0, 0, 1.1, 0, () => badge(ctx, 'NORTHROP GRUMMAN', NOC, 'USA', 470)));
        if (lt > 3.6) magnifier(ctx, 920, 1230, 0.6 * pop(lt, 3.6, 0.4), t);
        panda(ctx, 'emotions/augenzwinkern', lt, t, { x: 150, h: 420 });
      } },
    { // 58–Ende: aber Umsatz +7 %, EPS nur +3 % – Auftrag ≠ Gewinn
      start: 58.0, mood: 'bad', poses: ['poses/tipp_geben'], ...TS('zoom', { transDur: 0.5 }), focus: F,
      sfx: [WS(), [0.3, 'pop', 0.3, -0.2], [1.6, 'pop', 0.3, 0.2], [2.6, 'down', 0.28, 0.2], [4.2, 'stamp', 0.35, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'ABER:', c: C.white, size: 135 }, { t: 'UMSATZ ≠ GEWINN', c: C.white, size: 115, ribbon: RED }]], [4.0, [{ t: '1 AUFTRAG IST', c: C.white, size: 120 }, { t: 'NOCH KEIN GEWINN', c: C.white, size: 105, ribbon: RED }]]]);
        panel(ctx, 700, 1010, 600, 520, pop(lt, 0.1, 0.5), { title: 'WACHSTUM Q3 · J/J', body: () => { const by = 190; ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-240, by, 480, 3);
          vbar(ctx, -110, by, 150, 32, 7, eOut(prog(lt, 0.6, 0.8)), UP, '+7 %', 'UMSATZ'); vbar(ctx, 110, by, 150, 32, 3, eOut(prog(lt, 2.6, 0.8)), AMBER, '+3 %', 'GEWINN/AKTIE'); } });
        E.stamp(ctx, 'AUFTRAG ≠ GEWINN', 700, 690, lt, 4.2, { size: 46, rot: -0.08 });
        panda(ctx, 'poses/tipp_geben', lt, t, { x: 150, h: 420 });
      } },
  ];
  const music = { bpm: 96, chords: [['G', ''], ['E', 'm'], ['C', ''], ['D', '']], level: 0.45, abs: 0.09,
    sections: [[0, 'tension'], [3.75, 'pulse'], [9.0, 'full'], [13.0, 'tension'], [16.0, 'pulse'], [25.0, 'full'], [40.5, 'full'], [49.0, 'pulse'], [58.0, 'tension']], drops: [] };
  window.VIDEO = { name: 'northrop-grumman', style: 'clean', fps: 30, duration: 63.6, scenes, captions, xfade: 0.35, grain: 0.03, bokeh: false, endFade: false, pandaFixed: true, music };
})();
