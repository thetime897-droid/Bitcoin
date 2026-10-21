// Meta Platforms – Q3 2026: +26 % Umsatz, Sonderlast, Capex-Boom – Short (62,9 s). Clean-Stil mit Profi-Bühne (bg: 'pro'), dichtere SFX.
// Zahlen laut Voice-Over/Einblendungen des Nutzers (Q3-Release vom 21.10.2026).
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
  const UP = '#22C55E', DN = '#EF4444', META = '#2563EB';
  const captions = [[0.0, 1.0, "Breaking News bei der"], [1.0, 2.0, "Meta-Aktie."], [2.0, 2.75, "Sie springt über 6"], [2.75, 4.0, "Prozent nach oben nach den"], [4.0, 5.0, "Quartalszahlen."], [5.0, 5.75, "Und hier gibt's jetzt"], [5.75, 6.5, "alle Infos."], [6.5, 7.5, "Der Gewinn hier je Aktie"], [7.5, 8.5, "beträgt nur 3 Dollar"], [8.5, 10.0, "83, und trotzdem Party an"], [10.0, 11.0, "der Börse."], [11.0, 12.5, "Warum gleich? Meta hat die"], [12.5, 13.5, "Zahlen geliefert."], [13.5, 14.5, "Das Ganze ist natürlich"], [14.5, 15.5, "keine Anlageberatung,"], [15.5, 16.5, "aber der Umsatz plus"], [16.5, 17.5, "26 Prozent auf"], [17.5, 19.0, "64,6 Milliarden Dollar."], [19.0, 20.5, "Fast 10 Milliarden ging"], [20.5, 22.0, "für eine Rechtsbelastung drauf."], [22.0, 23.0, "Ohne die wären es"], [23.0, 24.5, "7 Dollar 40 je Aktie gewesen,"], [24.5, 25.5, "fast doppelt so viel."], [25.5, 26.5, "Und genau diesen Punkt"], [26.5, 28.0, "haben viele an der Börse"], [28.0, 29.0, "nicht verstanden."], [29.0, 30.0, "Und jetzt zum großen Geld."], [30.0, 31.0, "Meta steckt alleine im"], [31.0, 33.0, "Quartal rund 35 Milliarden Dollar"], [33.0, 34.0, "in Investitionen."], [34.0, 35.5, "Dieses Jahr sollen es"], [35.5, 38.0, "135 bis 145 Milliarden werden."], [38.0, 40.0, "Das ist wie Black Friday,"], [40.0, 40.5, "nur mit Rechenzentren."], [40.5, 41.0, "Aber auch hier gibt"], [41.0, 42.0, "es einen kleinen Haken."], [42.0, 43.0, "Der freie Cashflow"], [43.0, 44.0, "ist im Minus mit"], [44.0, 45.75, "2,1 Milliarden."], [45.75, 47.0, "Meta macht Gewinn, aber"], [47.0, 48.5, "das Konto wird nicht voller."], [48.5, 49.5, "Aus Sicht von Optimisten"], [49.5, 50.5, "ist das: Geschäft wächst um"], [50.5, 52.0, "26 Prozent."], [52.0, 53.5, "Aus Sicht von Skeptikern:"], [53.5, 54.5, "Wer so viel ausgibt, muss"], [54.5, 55.0, "auch liefern."], [55.0, 55.5, "Ich bin selber noch"], [55.5, 56.0, "gut in"], [56.0, 57.0, "Meta investiert und freue"], [57.0, 58.0, "mich über den Kurssprung und"], [58.0, 59.0, "fürs 4."], [59.0, 60.0, "Quartal peilt Meta"], [60.0, 62.5, "73 bis 76 Milliarden Dollar"], [62.5, 62.88, "Umsatz an."]];
  const TS = (dir, extra = {}) => ({ trans: dir, transDur: 0.55, punchAmt: 0.03, flashAmt: 0.0, zoom: 0.03, ...extra });
  const F = { x: 640, y: 980 };
  const JUMP = [0.35, 0.3, 0.33, 0.28, 0.31, 0.27, 0.3, 0.29, 0.62, 0.7, 0.68];
  const SW = (t = -0.18, g = 0.34) => [[t, 'whoosh', g, 0], [t + 0.05, 'sweep', g * 0.6, 0]]; // satter Szenenwechsel
  function rack(ctx, x, y, s, t, col = SKY) { E.withT(ctx, x, y, s, 0, () => { ctx.save(); ctx.shadowColor = 'rgba(2,6,23,0.6)'; ctx.shadowBlur = 24; E.rr(ctx, -55, -120, 110, 240, 10); ctx.fillStyle = '#1E293B'; ctx.fill(); ctx.restore();
    for (let i = 0; i < 8; i++) { E.rr(ctx, -44, -108 + i * 28, 88, 20, 4); ctx.fillStyle = '#334155'; ctx.fill(); ctx.fillStyle = Math.sin(t * 6 + i * 1.7 + x) > 0.2 ? col : '#475569'; ctx.beginPath(); ctx.arc(30, -98 + i * 28, 4, 0, 7); ctx.fill(); } }); }
  function confetti(ctx, x, y, lt, at, n = 36) { if (lt < at) return; const p = lt - at; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + i, v = 260 + (i * 37) % 200, px = x + Math.cos(a) * v * Math.min(1, p * 1.6), py = y + Math.sin(a) * v * Math.min(1, p * 1.6) + p * p * 260;
    ctx.globalAlpha = Math.max(0, 1 - p / 2.4); ctx.fillStyle = [GOLD, ROSE, SKY, '#4ADE80', PURP][i % 5]; ctx.save(); ctx.translate(px, py); ctx.rotate(p * 6 + i); ctx.fillRect(-7, -4, 14, 8); ctx.restore(); } ctx.globalAlpha = 1; }
  function gavel(ctx, x, y, s, lt, at) { const hit = lt > at ? Math.max(0, 1 - (lt - at) * 4) : 1; E.withT(ctx, x, y, s, -0.35 - 0.5 * hit, () => { ctx.save(); ctx.shadowColor = 'rgba(2,6,23,0.6)'; ctx.shadowBlur = 20;
    ctx.fillStyle = '#92400E'; E.rr(ctx, -14, -10, 28, 210, 10); ctx.fill(); E.rr(ctx, -110, -80, 220, 80, 20); ctx.fillStyle = '#B45309'; ctx.fill(); ctx.fillStyle = '#FCD34D'; ctx.fillRect(-70, -80, 14, 80); ctx.fillRect(56, -80, 14, 80); ctx.restore(); });
    E.rr(ctx, x - 230 * s, y + 10 * s, 170 * s, 44 * s, 12); ctx.fillStyle = '#78350F'; ctx.fill(); }

  const scenes = [
    { // 0–6,5: Breaking – Meta springt +6 % – alle Infos
      start: 0, mood: 'blue', poses: ['emotions/ueberrascht', 'poses/zeigen'], punch: false, noBrand: true, zoom: 0.03, focus: F,
      sfx: [[0.1, 'swell', 0.3, 0], [0.35, 'ding', 0.32, 0], ...flySfx(0.5, 0.2, 0.32), [1.9, 'riser', 0.16, 0.2], [2.6, 'impact', 0.3, 0.2], [2.7, 'cash', 0.38, 0.2], [2.9, 'pop', 0.32, 0.3], ...flySfx(5.0, -0.3, 0.3), ...flySfx(5.35, 0, 0.3), ...flySfx(5.7, 0.3, 0.3)],
      draw(ctx, lt, t) {
        E.liveBar(ctx, lt, 'META PLATFORMS  •  Q3 2026: UMSATZ 64,6 MRD. $ (+26 %)  •  EPS 3,83 $ (OHNE SONDERLAST 7,40 $)  •  AKTIE +6 %  •  ');
        H(ctx, lt, [[0, [{ t: 'BREAKING NEWS', c: C.white, size: 120, ribbon: RED }, { t: 'META-AKTIE', c: C.white, size: 125 }], { y: 480, delay: 0.1 }], [2.6, [{ t: 'SPRINGT ÜBER', c: C.white, size: 120 }, { t: '+6 %', c: '#4ADE80', size: 170 }], { y: 480 }], [5.0, [{ t: 'HIER ALLE', c: C.white, size: 125 }, { t: 'INFOS', c: C.white, size: 135, ribbon: META }], { y: 480 }]]);
        if (lt < 5.0) { fly(ctx, 700, 990, lt, 0.5, 'up', () => panel(ctx, 0, 0, 620, 420, 1, { accent: META, title: 'META PLATFORMS · NACHBÖRSLICH', body: () => { lineChart(ctx, 0, 40, 540, 250, JUMP, eOut(prog(lt, 0.8, 2.0)), lt > 2.6 ? UP : SKY);
          if (lt > 2.6) chip(ctx, '+6 %', 170, -110, '#16A34A', pop(lt, 2.6, 0.4), 44); } })); sparks(ctx, 870, 880, lt, 2.6, 22, '#4ADE80'); }
        else [['UMSATZ', SKY], ['GEWINN', GOLD], ['INVEST', PURP]].forEach(([s2, col], i) => fly(ctx, 700, 830 + i * 170, lt, 5.0 + i * 0.35, i % 2 ? 'right' : 'left', () => chip(ctx, s2, 0, 0, col, 1, 44)));
        pandaSeq(ctx, [[0, 'emotions/ueberrascht'], [2.6, 'poses/zeigen']], lt, t, { x: 160, h: 440 });
      } },
    { // 6,5–11: Gewinn je Aktie nur 3,83 $ – trotzdem Party
      start: 6.5, mood: 'dark', poses: ['emotions/nachdenklich', 'emotions/begeistert'], ...TS('right'), focus: F,
      sfx: [...SW(), [0.3, 'pop', 0.32, 0], ...ticks(0.9, 1.9, 8, 0.28, 0.1), [2.0, 'down', 0.28, 0], [3.0, 'snap', 0.3, 0], [3.2, 'boom', 0.18, 0], [3.25, 'cash', 0.35, 0.2], [3.4, 'pop', 0.3, -0.3], [3.6, 'pop', 0.3, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'GEWINN JE AKTIE', c: C.white, size: 110 }, { t: 'NUR 3,83 $', c: '#F87171', size: 140 }]], [3.0, [{ t: 'TROTZDEM', c: C.white, size: 130 }, { t: 'PARTY!', c: GOLD, size: 160 }]]]);
        panel(ctx, 700, 990, 560, 300, pop(lt, 0.2, 0.5), { accent: lt > 3.0 ? UP : DN, title: 'EPS · Q3 2026', body: () => bigNum(ctx, lerp(0, 3.83, eOut(prog(lt, 0.9, 1.0))).toFixed(2).replace('.', ',') + ' $', 0, 30, 100, lt > 3.0 ? '#4ADE80' : '#F87171') });
        confetti(ctx, 700, 900, lt, 3.1);
        pandaSeq(ctx, [[0, 'emotions/nachdenklich'], [3.0, 'emotions/begeistert']], lt, t, { x: 150, h: 420 });
      } },
    { // 11–13,5: Warum? Meta hat geliefert
      start: 11.0, mood: 'good', poses: ['poses/praesentieren'], ...TS('up'), focus: F,
      sfx: [...SW(), [0.4, 'pop', 0.3, 0], [1.4, 'ding', 0.38, 0.2], [1.5, 'swish', 0.25, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'WARUM?', c: C.white, size: 150 }]], [1.4, [{ t: 'META HAT', c: C.white, size: 130 }, { t: 'GELIEFERT', c: C.white, size: 130, ribbon: '#16A34A' }]]]);
        E.withT(ctx, 700, 990, pop(lt, 0.3, 0.45), 0, () => { pulseRings(ctx, 0, 0, t, lt > 1.4 ? UP : PURP, 3, 220); if (lt < 1.4) bigNum(ctx, '?', 0, 30, 230, PURP); else E.withT(ctx, 0, 0, pop(lt, 1.4, 0.4), 0, () => { ctx.beginPath(); ctx.arc(0, 0, 130, 0, 7); ctx.fillStyle = '#16A34A'; ctx.fill(); E.plainText(ctx, '✓', 0, 8, 150, C.white, { weight: 900 }); }); });
        panda(ctx, 'poses/praesentieren', lt, t, { x: 150, h: 420 });
      } },
    { // 13,5–15,5: keine Anlageberatung
      start: 13.5, mood: 'dark', poses: ['emotions/freundlich'], ...TS('zoom', { transDur: 0.45 }), focus: F,
      sfx: [...SW(-0.15, 0.28), [0.3, 'pop', 0.3, 0], [0.5, 'tick', 0.22, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'KEINE', c: C.white, size: 135 }, { t: 'ANLAGEBERATUNG', c: C.white, size: 110, ribbon: '#475569' }]]]);
        E.withT(ctx, 700, 990, pop(lt, 0.2, 0.45), 0, () => K.shield(ctx, 0, 0, 1, '#475569', 'INFO', 'NUR BILDUNG'));
        panda(ctx, 'emotions/freundlich', lt, t, { x: 150, h: 420 });
      } },
    { // 15,5–19: Umsatz +26 % auf 64,6 Mrd. $
      start: 15.5, mood: 'good', poses: ['poses/analysieren'], ...TS('left'), focus: F,
      sfx: [...SW(), [0.3, 'pop', 0.3, 0], [0.7, 'pop', 0.28, -0.2], ...ticks(1.2, 2.4, 9, 0.28, 0.2), [2.5, 'cash', 0.45, 0.2], [2.55, 'ding', 0.32, 0.2], ...flySfx(2.8, 0.3, 0.3)],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'UMSATZ', c: C.white, size: 140 }, { t: '+26 %', c: C.white, size: 140, ribbon: '#16A34A' }]], [2.0, [{ t: 'AUF', c: C.white, size: 120 }, { t: '64,6 MRD. $', c: '#4ADE80', size: 140 }]]]);
        panel(ctx, 700, 1010, 600, 520, pop(lt, 0.1, 0.5), { title: 'UMSATZ Q3 (MRD. $)', body: () => { const by = 190; ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-240, by, 480, 3);
          vbar(ctx, -110, by, 150, 4.6, 51.2, eOut(prog(lt, 0.7, 0.8)), '#94A3B8', '51,2', 'Q3 2025'); vbar(ctx, 110, by, 150, 4.6, 64.6, eOut(prog(lt, 1.2, 1.2)), UP, '64,6', 'Q3 2026'); } });
        if (lt > 2.8) fly(ctx, 860, 690, lt, 2.8, 'right', () => chip(ctx, '+26 %', 0, 0, '#16A34A', 1, 42));
        panda(ctx, 'poses/analysieren', lt, t, { x: 150, h: 420 });
      } },
    { // 19–25,5: fast 10 Mrd. Rechtsbelastung – ohne: 7,40 $, fast doppelt
      start: 19.0, mood: 'bad', poses: ['emotions/ueberrascht', 'poses/zeigen'], ...TS('right'), focus: F,
      sfx: [...SW(), ...flySfx(0.2, 0.2, 0.3), [1.0, 'impact', 0.35, 0.1], [1.05, 'stamp', 0.25, 0.1], [1.3, 'down', 0.25, 0], [3.0, 'pop', 0.3, -0.2], [3.4, 'swell', 0.25, 0.2], ...ticks(3.6, 4.4, 6, 0.28, 0.2), [4.5, 'cash', 0.42, 0.2], [5.5, 'ding', 0.35, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'FAST 10 MRD. $', c: '#F87171', size: 130 }, { t: 'RECHTSBELASTUNG', c: C.white, size: 105, ribbon: RED }]], [3.0, [{ t: 'OHNE SIE:', c: C.white, size: 125 }, { t: '7,40 $ JE AKTIE', c: '#4ADE80', size: 115 }]], [5.5, [{ t: 'FAST', c: C.white, size: 130 }, { t: 'DOPPELT SO VIEL', c: C.white, size: 115, ribbon: '#16A34A' }]]]);
        if (lt < 3.0) { fly(ctx, 700, 960, lt, 0.2, 'up', () => gavel(ctx, 0, 0, 1.2, lt - 0.2, 0.8)); if (lt > 1.1) tag(ctx, 'SONDERLAST ≈ 9,89 MRD. $', 700, 1240, RED, pop(lt, 1.1, 0.4)); }
        else panel(ctx, 700, 1010, 600, 520, pop(lt, 3.0, 0.45), { title: 'GEWINN JE AKTIE ($)', body: () => { const by = 190; ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-240, by, 480, 3);
          vbar(ctx, -110, by, 150, 40, 3.83, eOut(prog(lt, 3.1, 0.6)), DN, '3,83', 'BERICHTET'); vbar(ctx, 110, by, 150, 40, 7.40, eOut(prog(lt, 3.6, 0.9)), UP, '7,40', 'OHNE SONDERLAST'); } });
        if (lt > 5.5) chip(ctx, '≈ ×2', 860, 690, '#16A34A', pop(lt, 5.5, 0.4), 42);
        pandaSeq(ctx, [[0, 'emotions/ueberrascht'], [3.0, 'poses/zeigen']], lt, t, { x: 150, h: 420 });
      } },
    { // 25,5–29: viele haben's nicht verstanden
      start: 25.5, mood: 'dark', poses: ['poses/tipp_geben'], ...TS('up'), focus: F,
      sfx: [...SW(), [0.3, 'pop', 0.3, 0.2], [1.0, 'swish', 0.28, 0.2], [2.5, 'glitch', 0.16, 0.2], [2.6, 'pop', 0.28, -0.2], [2.8, 'pop', 0.28, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'GENAU DAS', c: C.white, size: 135 }, { t: 'NICHT VERSTANDEN', c: C.white, size: 105, ribbon: VIO }]]]);
        panel(ctx, 700, 990, 600, 340, pop(lt, 0.2, 0.5), { accent: GOLD, title: 'DER EINE PUNKT', body: () => { E.plainText(ctx, '3,83 $', -130, 30, 64, '#F87171', { weight: 900 }); E.plainText(ctx, '≠', 10, 30, 64, C.white, { weight: 900 }); E.plainText(ctx, '7,40 $', 150, 30, 64, '#4ADE80', { weight: 900 }); label(ctx, 'EINMALEFFEKT', 0, 120, 24); } });
        if (lt > 1.0) magnifier(ctx, lerp(560, 840, (Math.sin(t * 1.3) + 1) / 2), 1010, 0.7 * pop(lt, 1.0, 0.4), t);
        ['?', '?', '?'].forEach((q, i) => { if (lt > 2.5 + i * 0.2) bigNum(ctx, q, [520, 880, 940][i], [760, 740, 1220][i], 80 * pop(lt, 2.5 + i * 0.2, 0.35), PURP); });
        panda(ctx, 'poses/tipp_geben', lt, t, { x: 150, h: 420 });
      } },
    { // 29–38: das große Geld – 35 Mrd. im Quartal, 135–145 Mrd. im Jahr
      start: 29.0, mood: 'blue', poses: ['poses/praesentieren', 'emotions/ueberrascht'], ...TS('left'), focus: F,
      sfx: [...SW(), [0.3, 'cash', 0.4, 0], ...flySfx(1.0, -0.3, 0.3), ...flySfx(1.3, 0, 0.3), ...flySfx(1.6, 0.3, 0.3), ...ticks(2.2, 3.6, 10, 0.28, 0.2), [3.7, 'cash', 0.45, 0.2], [5.0, 'riser', 0.16, 0], ...ticks(6.6, 8.0, 10, 0.28, 0.2), [8.1, 'impact', 0.3, 0.2], [8.15, 'cash', 0.45, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DAS GROSSE', c: C.white, size: 135 }, { t: 'GELD', c: GOLD, size: 160 }]], [2.0, [{ t: '≈ 35 MRD. $', c: GOLD, size: 135 }, { t: 'IN 1 QUARTAL', c: C.white, size: 115, ribbon: META }]], [5.0, [{ t: '2026 GESAMT', c: C.white, size: 125 }, { t: '135–145 MRD. $', c: GOLD, size: 120 }]]]);
        [560, 700, 840].forEach((rx, i) => fly(ctx, rx, 900, lt, 1.0 + i * 0.3, 'up', () => rack(ctx, 0, 0, 1.05, t, [SKY, PURP, TEAL][i])));
        if (lt > 2.0 && lt < 5.0) panel(ctx, 700, 1170, 560, 170, pop(lt, 2.0, 0.45), { accent: GOLD, title: 'CAPEX Q3', body: () => bigNum(ctx, '≈ ' + Math.round(lerp(0, 35, eOut(prog(lt, 2.2, 1.4)))) + ' MRD. $', 0, 22, 62, GOLD) });
        if (lt > 5.0) panel(ctx, 700, 1170, 560, 170, pop(lt, 5.0, 0.45), { accent: GOLD, title: 'CAPEX 2026 (PLAN)', body: () => { const v = lerp(35, 145, eOut(prog(lt, 6.6, 1.4))); bigNum(ctx, prog(lt, 6.6, 1.4) >= 1 ? '135–145 MRD. $' : Math.round(v) + ' MRD. $', 0, 22, 60, GOLD); } });
        sparks(ctx, 700, 1170, lt, 8.1, 24, GOLD);
        pandaSeq(ctx, [[0, 'poses/praesentieren'], [8.1, 'emotions/ueberrascht']], lt, t, { x: 150, h: 420 });
      } },
    { // 38–40,5: wie Black Friday – nur mit Rechenzentren
      start: 38.0, mood: 'dark', poses: ['emotions/augenzwinkern'], ...TS('zoom', { transDur: 0.45 }), focus: F,
      sfx: [...SW(-0.15, 0.3), [0.3, 'stamp', 0.3, 0.2], [0.5, 'cash', 0.42, 0.2], ...flySfx(1.0, -0.2, 0.3), ...flySfx(1.3, 0.2, 0.3), [2.0, 'pop', 0.3, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'BLACK FRIDAY', c: C.white, size: 120, ribbon: '#111827' }, { t: 'FÜR RECHENZENTREN', c: GOLD, size: 95 }]]]);
        E.withT(ctx, 700, 830, pop(lt, 0.3, 0.45), -0.08, () => { ctx.save(); ctx.shadowColor = RED; ctx.shadowBlur = 30; E.rr(ctx, -200, -60, 400, 120, 20); ctx.fillStyle = '#DC2626'; ctx.fill(); ctx.restore(); E.plainText(ctx, 'SALE', 0, 4, 80, C.white, { weight: 900 }); });
        fly(ctx, 600, 1120, lt, 1.0, 'left', () => rack(ctx, 0, 0, 1.1, t, SKY)); fly(ctx, 800, 1120, lt, 1.3, 'right', () => rack(ctx, 0, 0, 1.1, t, PURP));
        panda(ctx, 'emotions/augenzwinkern', lt, t, { x: 150, h: 420 });
      } },
    { // 40,5–45,75: der Haken – freier Cashflow −2,1 Mrd.
      start: 40.5, mood: 'bad', poses: ['emotions/nachdenklich', 'poses/tipp_geben'], ...TS('right'), focus: F,
      sfx: [...SW(), [0.2, 'swish', 0.3, 0.2], [0.9, 'impact', 0.25, 0.2], [1.6, 'pop', 0.3, 0], [2.6, 'down', 0.32, 0], ...ticks(2.8, 3.8, 7, 0.26, 0), [3.9, 'glitch', 0.16, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'ABER:', c: C.white, size: 135 }, { t: 'DER HAKEN', c: C.white, size: 135, ribbon: RED }]], [1.5, [{ t: 'FREIER CASHFLOW', c: C.white, size: 110 }, { t: '−2,1 MRD. $', c: '#F87171', size: 140 }]]]);
        if (lt < 1.5) P.hook(ctx, 760, 1000, eOut(prog(lt, 0.1, 0.7)), t);
        else panel(ctx, 700, 1010, 600, 520, pop(lt, 1.5, 0.45), { title: 'FREIER CASHFLOW Q3 (MRD. $)', body: () => { const by = -20; ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-240, by, 480, 3);
          vbar(ctx, 0, by, 180, 70, -2.1, eOut(prog(lt, 2.6, 1.2)), DN, '−' + lerp(0, 2.1, eOut(prog(lt, 2.8, 1.0))).toFixed(1).replace('.', ','), 'Q3 2026'); } });
        pandaSeq(ctx, [[0, 'emotions/nachdenklich'], [1.5, 'poses/tipp_geben']], lt, t, { x: 150, h: 420 });
      } },
    { // 45,75–48,5: Gewinn ja – Konto wird nicht voller
      start: 45.75, mood: 'dark', poses: ['poses/analysieren'], ...TS('up'), focus: F,
      sfx: [...SW(), ...flySfx(0.3, -0.2, 0.3), [0.7, 'ding', 0.3, -0.2], ...flySfx(1.3, 0.3, 0.3), [1.8, 'down', 0.25, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'GEWINN JA –', c: C.white, size: 130 }, { t: 'KONTO NICHT VOLLER', c: C.white, size: 95, ribbon: AMBER }]]]);
        fly(ctx, 700, 940, lt, 0.3, 'left', () => chk(ctx, 'GEWINN · 9,9 MRD. $', true, 580, '#16A34A'));
        fly(ctx, 700, 1060, lt, 1.3, 'right', () => chk(ctx, 'CASH · −2,1 MRD. $', false, 580, DN));
        panda(ctx, 'poses/analysieren', lt, t, { x: 150, h: 420 });
      } },
    { // 48,5–52: Optimisten – Geschäft wächst +26 %
      start: 48.5, mood: 'good', poses: ['emotions/begeistert'], ...TS('left'), focus: F,
      sfx: [...SW(), [0.3, 'pop', 0.3, 0], [1.0, 'riser', 0.15, 0.2], [2.0, 'ding', 0.38, 0.2], [2.05, 'cash', 0.35, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'OPTIMISTEN:', c: '#4ADE80', size: 130 }, { t: 'WACHSTUM +26 %', c: C.white, size: 110, ribbon: '#16A34A' }]]]);
        panel(ctx, 700, 990, 600, 400, pop(lt, 0.2, 0.5), { accent: UP, title: 'UMSATZWACHSTUM J/J', body: () => { lineChart(ctx, 0, 40, 520, 230, [0.1, 0.2, 0.28, 0.4, 0.5, 0.62, 0.75, 0.88], eOut(prog(lt, 0.4, 1.6)), UP); if (lt > 2.0) chip(ctx, '+26 %', 160, -100, '#16A34A', pop(lt, 2.0, 0.4), 40); } });
        panda(ctx, 'emotions/begeistert', lt, t, { x: 150, h: 420 });
      } },
    { // 52–55: Skeptiker – wer so viel ausgibt, muss liefern
      start: 52.0, mood: 'bad', poses: ['emotions/nachdenklich'], ...TS('right'), focus: F,
      sfx: [...SW(), [0.3, 'cash', 0.35, -0.2], ...flySfx(1.4, 0.3, 0.3), [2.2, 'stamp', 0.32, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'SKEPTIKER:', c: '#F87171', size: 135 }, { t: 'MUSS LIEFERN', c: C.white, size: 120, ribbon: RED }]]]);
        panel(ctx, 700, 990, 600, 380, pop(lt, 0.2, 0.5), { accent: DN, title: 'AUSGABEN VS. ERTRAG', body: () => { E.plainText(ctx, '135–145 MRD. $', 0, -30, 54, GOLD, { weight: 900 }); label(ctx, 'CAPEX 2026', 0, 20, 22); if (lt > 1.4) E.plainText(ctx, '→ RENDITE?', 0, 100, 48, C.white, { weight: 900 }); } });
        E.stamp(ctx, 'BEWEIS FEHLT', 720, 1220, lt, 2.2, { size: 46, rot: -0.1 });
        panda(ctx, 'emotions/nachdenklich', lt, t, { x: 150, h: 420 });
      } },
    { // 55–58: selbst investiert – freue mich über den Kurssprung
      start: 55.0, mood: 'good', poses: ['emotions/augenzwinkern'], ...TS('up'), focus: F,
      sfx: [...SW(), ...flySfx(0.3, 0.2, 0.3), [1.2, 'cash', 0.42, 0.2], [1.3, 'pop', 0.3, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'ICH BIN SELBST', c: C.white, size: 115 }, { t: 'INVESTIERT', c: C.white, size: 130, ribbon: TEAL }]]]);
        fly(ctx, 700, 990, lt, 0.3, 'up', () => panel(ctx, 0, 0, 580, 300, 1, { accent: UP, title: 'MEIN DEPOT · META', body: () => { lineChart(ctx, -60, 40, 400, 180, JUMP, 1, UP); if (lt > 1.2) chip(ctx, '+6 %', 200, 30, '#16A34A', pop(lt, 1.2, 0.4), 40); } }));
        sparks(ctx, 900, 1010, lt, 1.2, 20, '#4ADE80');
        panda(ctx, 'emotions/augenzwinkern', lt, t, { x: 150, h: 420 });
      } },
    { // 58–Ende: Q4-Ausblick 73–76 Mrd. $ Umsatz
      start: 58.0, mood: 'blue', poses: ['poses/zeigen'], ...TS('zoom', { transDur: 0.45 }), focus: F,
      sfx: [...SW(-0.15, 0.3), [0.3, 'pop', 0.3, 0], [1.5, 'swell', 0.28, 0], ...ticks(2.0, 3.2, 9, 0.28, 0.2), [3.3, 'cash', 0.45, 0.2], [3.35, 'ding', 0.35, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'AUSBLICK Q4', c: C.white, size: 135, ribbon: META }]], [2.0, [{ t: '73–76 MRD. $', c: '#4ADE80', size: 130 }, { t: 'UMSATZ', c: C.white, size: 130 }]]]);
        panel(ctx, 700, 1010, 600, 520, pop(lt, 0.1, 0.5), { title: 'UMSATZ (MRD. $)', body: () => { const by = 190; ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-240, by, 480, 3);
          vbar(ctx, -110, by, 150, 4.2, 64.6, eOut(prog(lt, 0.4, 0.8)), '#94A3B8', '64,6', 'Q3 2026'); vbar(ctx, 110, by, 150, 4.2, 74.5, eOut(prog(lt, 2.0, 1.2)), UP, '73–76', 'Q4 (PLAN)'); } });
        sparks(ctx, 810, 820, lt, 3.3, 24, '#4ADE80');
        panda(ctx, 'poses/zeigen', lt, t, { x: 150, h: 420 });
      } },
  ];
  const music = { bpm: 98, chords: [['A', 'm'], ['F', ''], ['C', ''], ['G', '']], level: 0.45, abs: 0.09,
    sections: [[0, 'tension'], [6.5, 'pulse'], [11.0, 'full'], [19.0, 'pulse'], [29.0, 'full'], [40.5, 'tension'], [48.5, 'pulse'], [55.0, 'full']], drops: [] };
  window.VIDEO = { name: 'meta-q3-2026', style: 'clean', bg: 'pro', fps: 30, duration: 62.88, scenes, captions, xfade: 0.35, grain: 0.025, bokeh: false, endFade: false, pandaFixed: true, music };
})();
