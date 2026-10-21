// Midterms 2026 – YouTube-Longform 1920×1080 (61,9 s), ohne Untertitel. Querformat-Layout: Panda unten links, Grafik-Bühne x 540–1880 / y 300–1040.
// Zusatzfakten: BofA – Midterm-Jahre seit 1970 Ø +0,58 %; Capital Group – 12 Monate nach Midterms seit 1950 Ø +15,4 %.
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

  const { magnifier, gov, warn } = K;
  const UP = '#22C55E', DN = '#EF4444';
  const captions = [[0.0, 1.0, "Das wird jetzt am"], [1.0, 2.5, "Aktienmarkt passieren, und wenn du"], [2.5, 3.0, "Aktien hältst,"], [3.0, 3.75, "solltest du das Video"], [3.75, 4.25, "hier sehen,"], [4.25, 5.0, "denn es stehen die"], [5.0, 6.0, "Midterms an, und das ist"], [6.0, 7.0, "nicht unwichtig."], [7.0, 8.0, "Und was die Börse"], [8.0, 8.5, "danach im Schnitt macht,"], [8.5, 9.0, "erklär ich."], [9.0, 10.25, "Am 3.11. sind in"], [10.25, 12.75, "den USA Zwischenwahlen. 2018"], [12.75, 14.25, "verlor der S&P 500"], [14.25, 16.5, "rund 4 Prozent, 2022 und"], [16.5, 17.25, "gut 18."], [17.25, 18.5, "Aus 10.000 Euro wurden"], [18.5, 19.75, "somit 2022"], [19.75, 21.75, "8.200, und beides waren"], [21.75, 22.75, "Midterm-Jahre."], [22.75, 24.0, "Aber wichtig ist, was"], [24.0, 24.5, "danach passiert."], [24.5, 26.0, "6 Monate nach einer"], [26.0, 26.5, "Midterm-Wahl"], [26.5, 28.0, "lag der S&P 500"], [28.0, 29.5, "seit 1970 im Schnitt"], [29.5, 31.0, "bei plus 14 Prozent."], [31.0, 32.5, "In Jahren ohne Midterms"], [32.5, 33.0, "gut 5,7."], [33.0, 33.5, "Schaut man noch weiter"], [33.5, 34.5, "in die Vergangenheit, sind"], [34.5, 36.5, "es circa 10 Prozent Rendite."], [36.5, 38.0, "Das Ganze ist keine Anlageberatung."], [38.0, 39.0, "Jetzt wird's noch mal wichtig."], [39.0, 40.0, "Dieses Jahr hatten wir"], [40.0, 41.0, "bis Ende August rund plus"], [41.0, 42.0, "13 Prozent."], [42.0, 43.0, "Das heißt für dich:"], [43.0, 44.0, "1 Muster ist noch"], [44.0, 45.5, "keine Prognose, und 1 starkes"], [45.5, 46.0, "Jahr bis"], [46.0, 47.0, "August sagt noch nichts"], [47.0, 47.75, "über den Rest aus."], [47.75, 49.0, "Allerdings gehe ich gerade"], [49.0, 51.0, "eher von einer kurzen Zinspause"], [51.0, 51.5, "aus, und"], [51.5, 52.0, "deshalb denke ich,"], [52.0, 53.0, "dass wir immer noch"], [53.0, 55.0, "eine Endjahresrally bekommen können,"], [55.0, 56.0, "auch wenn gerade viel Lärm"], [56.0, 56.5, "am Markt ist."], [56.5, 57.5, "Lasst euch davon nicht"], [57.5, 58.5, "unbedingt beirren und bleibt"], [58.5, 60.0, "einfach konstant und nutzt"], [60.0, 61.85, "attraktive Einkaufsmöglichkeiten."]];
  // Linienchart (normierte Punkte 0..1), sichtbar bis p
  function lineChart(ctx, x, y, w, h, pts, p, col, o = {}) {
    const n = pts.length - 1, X = (i) => x - w / 2 + w * i / n, Y = (v) => y + h / 2 - h * v, k = Math.max(0.001, p) * n, last = Math.floor(k), fr = k - last;
    const pt = (i) => (i <= last ? [X(i), Y(pts[i])] : [X(last) + (X(last + 1) - X(last)) * fr, Y(pts[last]) + (Y(pts[Math.min(n, last + 1)]) - Y(pts[last])) * fr]);
    const path = () => { ctx.beginPath(); for (let i = 0; i <= Math.min(n, last + 1); i++) { const [px, py] = pt(i); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } };
    ctx.save(); path(); const [ex] = pt(Math.min(n, last + 1)); ctx.lineTo(ex, y + h / 2); ctx.lineTo(X(0), y + h / 2); ctx.closePath();
    const g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2); g.addColorStop(0, col + '66'); g.addColorStop(1, col + '00'); ctx.fillStyle = g; ctx.fill();
    path(); ctx.shadowColor = col; ctx.shadowBlur = 16; ctx.strokeStyle = col; ctx.lineWidth = o.lw || 7; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); ctx.restore();
    const [lx, ly] = pt(Math.min(n, last + 1)); ctx.beginPath(); ctx.arc(lx, ly, 10, 0, 7); ctx.fillStyle = C.white; ctx.fill();
  }
  // Balken (auch negativ) ab Grundlinie by
  function vbar(ctx, x, by, w, scale, val, p, col, top, bot) {
    const h = Math.abs(val) * scale * p, up = val >= 0, y0 = up ? by - h : by;
    ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 22; const g = ctx.createLinearGradient(0, y0, 0, y0 + h); g.addColorStop(0, up ? col : E.shade(col, -0.35)); g.addColorStop(1, up ? E.shade(col, -0.35) : col);
    E.rr(ctx, x - w / 2, y0, w, Math.max(2, h), 14); ctx.fillStyle = g; ctx.fill(); ctx.restore();
    if (p > 0.4 && top) bigNum(ctx, top, x, up ? by - h - 36 : by + h + 40, 40, C.white);
    if (bot) label(ctx, bot, x, up ? by + 34 : by - 30, 24, 'rgba(255,255,255,0.75)');
  }
  function pauseIcon(ctx, x, y, s, col) { if (s <= 0.001) return; E.withT(ctx, x, y, s, 0, () => { ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 40; ctx.beginPath(); ctx.arc(0, 0, 110, 0, 7); ctx.fillStyle = col; ctx.fill(); ctx.restore(); ctx.fillStyle = C.white; E.rr(ctx, -45, -55, 30, 110, 8); ctx.fill(); E.rr(ctx, 15, -55, 30, 110, 8); ctx.fill(); }); }
  function noise(ctx, x, y, s, t) { if (s <= 0.001) return; E.withT(ctx, x, y, s, 0, () => { // Lärm: Schallwellen + Ausrufe
    for (let i = 0; i < 4; i++) { const ph = (t * 0.8 + i / 4) % 1; ctx.globalAlpha = 1 - ph; ctx.strokeStyle = ROSE; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(-60, 0, 40 + ph * 160, -0.7, 0.7); ctx.stroke(); } ctx.globalAlpha = 1;
    ctx.save(); ctx.shadowColor = ROSE; ctx.shadowBlur = 24; ctx.fillStyle = '#E2E8F0'; ctx.beginPath(); ctx.moveTo(-170, -40); ctx.lineTo(-110, -40); ctx.lineTo(-40, -95); ctx.lineTo(-40, 95); ctx.lineTo(-110, 40); ctx.lineTo(-170, 40); ctx.closePath(); ctx.fill(); ctx.restore(); }); }
  function cart(ctx, x, y, s, t) { if (s <= 0.001) return; E.withT(ctx, x, y, s, Math.sin(t * 2) * 0.03, () => {
    ctx.save(); ctx.shadowColor = UP; ctx.shadowBlur = 30; ctx.strokeStyle = C.white; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-170, -110); ctx.lineTo(-120, -110); ctx.lineTo(-80, 50); ctx.lineTo(120, 50); ctx.lineTo(150, -60); ctx.lineTo(-100, -60); ctx.stroke(); ctx.restore();
    ctx.fillStyle = C.white; [-60, 100].forEach((wx) => { ctx.beginPath(); ctx.arc(wx, 90, 20, 0, 7); ctx.fill(); });
    [[-40, -90, TEAL], [20, -110, SKY], [80, -95, AMBER]].forEach(([bx, by, c]) => { E.rr(ctx, bx - 26, by, 52, 70, 10); ctx.fillStyle = c; ctx.fill(); }); }); }
  function stockCard(ctx, x, y, s, val, chg, up) { panel(ctx, x, y, 560, 220, s, { accent: up ? UP : DN, title: 'S&P 500', body: () => { E.plainText(ctx, val, -244, 30, 60, C.white, { weight: 900, align: 'left' }); chip(ctx, chg, 160, 30, up ? '#16A34A' : '#DC2626', 1, 34); } }); }
  function capitol(ctx, x, by, s, t) { E.withT(ctx, x, by, s, 0, () => { // US-Kapitol (Kuppel + Säulen)
    ctx.save(); ctx.shadowColor = 'rgba(2,6,23,0.6)'; ctx.shadowBlur = 40; const g = ctx.createLinearGradient(0, -330, 0, 0); g.addColorStop(0, '#F8FAFC'); g.addColorStop(1, '#CBD5E1'); ctx.fillStyle = g;
    E.rr(ctx, -240, -110, 480, 110, 8); ctx.fill(); ctx.restore(); ctx.fillStyle = g;
    ctx.fillRect(-90, -170, 180, 60); ctx.beginPath(); ctx.ellipse(0, -170, 90, 100, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(-12, -300, 24, 40); ctx.beginPath(); ctx.arc(0, -305, 14, 0, 7); ctx.fill();
    ctx.fillStyle = '#94A3B8'; for (let i = 0; i < 9; i++) ctx.fillRect(-210 + i * 52, -95, 14, 80); for (let i = 0; i < 5; i++) ctx.fillRect(-72 + i * 36, -160, 10, 44);
    ctx.fillStyle = '#E2E8F0'; E.rr(ctx, -260, -8, 520, 22, 6); ctx.fill(); }); }
  const RAND = [0.30, 0.42, 0.36, 0.55, 0.47, 0.62, 0.50, 0.68, 0.58, 0.74, 0.66, 0.80];

  const PX = { x: 255, y: 1060, h: 610 };
  const panda = (ctx, pose, lt, t, o = {}) => K.panda(ctx, pose, lt, t, { ...o, ...PX });
  const pandaSeq = (ctx, seq, lt, t, o = {}) => K.pandaSeq(ctx, seq, lt, t, { ...o, ...PX });
  const TS = (dir, extra = {}) => ({ trans: dir, transDur: 0.65, punchAmt: 0.02, flashAmt: 0.0, zoom: 0.02, ...extra });
  const F = { x: 1210, y: 660 };
  const H1 = (t, c, ribbon) => { if (!t.includes('|')) return [{ t, c: c || C.white, size: 130, ribbon }]; const [a, b] = t.split('|'); return [{ t: a, c: C.white, size: 115 }, { t: b, c: c || C.white, size: 125, ribbon }]; };
  function stat(ctx, x, y, w, s, title, val, col, sub) { panel(ctx, x, y, w, 170, s, { accent: col, title, body: () => { E.plainText(ctx, val, -w / 2 + 36, 26, 40, C.white, { weight: 900, align: 'left' }); if (sub) E.plainText(ctx, sub, -w / 2 + 36, 62, 20, 'rgba(255,255,255,0.6)', { weight: 800, align: 'left' }); } }); }
  const YTD = [0.15, 0.25, 0.18, 0.08, 0.2, 0.35, 0.45, 0.5, 0.62, 0.7, 0.82];

  const scenes = [
    { // 0–4,25
      start: 0, mood: 'blue', poses: ['emotions/ueberrascht', 'poses/zeigen'], punch: false, noBrand: true, zoom: 0.02, focus: F,
      sfx: [[0.1, 'swell', 0.3, 0], [0.35, 'ding', 0.3, 0], [0.5, 'pop', 0.3, 0.1], ...flySfx(2.5, 0.5, 0.3), [3.1, 'ping', 0.3, 0.5]],
      draw(ctx, lt, t) {
        E.liveBar(ctx, lt, 'MIDTERMS  •  3. NOV. 2026  •  S&P 500 NACH ZWISCHENWAHLEN  •  Ø +14,1 % NACH 6 MONATEN  •  ');
        H(ctx, lt, [[0, H1('DAS PASSIERT JETZT|AM AKTIENMARKT', null, BLUE), { y: 480, delay: 0.1 }], [2.5, H1('DU HAST AKTIEN?|SCHAU HIN!', GOLD), { y: 480 }]]);
        panel(ctx, 980, 660, 820, 460, pop(lt, 0.3, 0.5), { accent: SKY, title: 'S&P 500 · USA', body: () => lineChart(ctx, 0, 30, 700, 280, RAND, eOut(prog(lt, 0.6, 1.8)), SKY) });
        fly(ctx, 1640, 660, lt, 2.5, 'right', () => stat(ctx, 0, 0, 380, 1, 'TERMIN', '3. NOV. 2026', AMBER, 'US-MIDTERMS'));
        pandaSeq(ctx, [[0, 'emotions/ueberrascht'], [2.5, 'poses/zeigen']], lt, t);
      } },
    { // 4,25–7
      start: 4.25, mood: 'dark', poses: ['poses/tipp_geben'], ...TS('right'), focus: F,
      sfx: [WS(), ...flySfx(0.3, -0.1, 0.3), [0.9, 'pop', 0.3, 0.2], ...flySfx(1.9, 0.5, 0.3)],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, H1('DIE MIDTERMS|STEHEN AN', null, RED)], [1.75, H1('UND DAS IST|NICHT UNWICHTIG', GOLD)]]);
        fly(ctx, 960, 870, lt, 0.3, 'up', () => capitol(ctx, 0, 0, 1.25, t));
        P.flagUS(ctx, 1160, 470, 190 * pop(lt, 0.9, 0.45), t);
        fly(ctx, 1630, 660, lt, 1.9, 'right', () => panel(ctx, 0, 0, 420, 330, 1, { accent: RED, title: 'GEWÄHLT WIRD', body: () => { label(ctx, 'ALLE 435 SITZE', 0, -10, 30, C.white); label(ctx, 'REPRÄSENTANTENHAUS', 0, 26, 20); label(ctx, '+ ⅓ DES SENATS', 0, 90, 30, C.white); } }));
        panda(ctx, 'poses/tipp_geben', lt, t);
      } },
    { // 7–9
      start: 7.0, mood: 'dark', poses: ['emotions/nachdenklich'], ...TS('up'), focus: F,
      sfx: [WS(), [0.3, 'pop', 0.3, 0], [1.0, 'swish', 0.25, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, H1('WAS MACHT DIE|BÖRSE DANACH?', null, VIO)]]);
        E.withT(ctx, 1210, 660, pop(lt, 0.3, 0.45), 0, () => { pulseRings(ctx, 0, 0, t, PURP, 3, 230); bigNum(ctx, '?', 0, 30, 240, PURP); });
        if (lt > 1.0) magnifier(ctx, lerp(1360, 1420, Math.sin(t * 1.5)), 800, 0.7 * pop(lt, 1.0, 0.4), t);
        panda(ctx, 'emotions/nachdenklich', lt, t);
      } },
    { // 9–12,75
      start: 9.0, mood: 'blue', poses: ['poses/praesentieren'], ...TS('left'), focus: F,
      sfx: [WS(), ...flySfx(0.3, -0.1, 0.3), [1.0, 'stamp', 0.3, 0], ...flySfx(1.6, 0.3, 0.3), ...flySfx(2.2, 0.5, 0.3)],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, H1('AM 3. NOVEMBER|ZWISCHENWAHLEN', null, BLUE)], [1.5, H1('US-MIDTERMS|2026', GOLD)]]);
        fly(ctx, 860, 680, lt, 0.3, 'up', () => P.calendar(ctx, 0, 0, 1.1, 'NOVEMBER', '3'), { rot: 0.3 });
        if (lt > 1.6) fly(ctx, 1200, 640, lt, 1.6, 'right', () => P.flagUS(ctx, 0, 0, 200, t));
        fly(ctx, 1630, 660, lt, 2.2, 'right', () => panel(ctx, 0, 0, 420, 330, 1, { accent: BLUE, title: 'MIDTERMS', body: () => { label(ctx, 'MITTE DER AMTSZEIT', 0, -10, 26, C.white); label(ctx, 'DES PRÄSIDENTEN', 0, 26, 26, C.white); label(ctx, 'ALLE 4 JAHRE', 0, 90, 24, SKY); } }));
        panda(ctx, 'poses/praesentieren', lt, t);
      } },
    { // 12,75–17,25
      start: 12.75, mood: 'bad', poses: ['emotions/ueberrascht'], ...TS('right'), focus: F,
      sfx: [WS(), [0.3, 'pop', 0.3, 0], [0.9, 'down', 0.28, -0.1], [2.4, 'down', 0.32, 0.2], [2.6, 'impact', 0.28, 0.2], ...flySfx(3.2, 0.5, 0.3)],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, H1('S&P 500 IN|MIDTERM-JAHREN', null, RED)]]);
        panel(ctx, 1000, 670, 800, 600, pop(lt, 0.1, 0.5), { title: 'JAHRESRENDITE INKL. DIVIDENDEN', body: () => {
          const by = -150; ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-320, by, 640, 3);
          vbar(ctx, -150, by, 190, 17, -4.4, eOut(prog(lt, 0.9, 0.8)), DN, '≈ −4 %', '2018');
          vbar(ctx, 150, by, 190, 17, -18.1, eOut(prog(lt, 2.4, 1.0)), DN, '≈ −18 %', '2022'); } });
        fly(ctx, 1650, 660, lt, 3.2, 'right', () => panel(ctx, 0, 0, 380, 420, 1, { accent: AMBER, title: 'MIDTERM-JAHRE', body: () => { label(ctx, 'OFT SCHWACH', 0, -60, 30, C.white); label(ctx, 'UNSICHERHEIT', 0, -10, 24); label(ctx, 'VOR DER WAHL', 0, 22, 24); bigNum(ctx, 'Ø +0,6 %', 0, 110, 44, AMBER); label(ctx, 'SEIT 1970 · BOFA', 0, 160, 18); } }));
        panda(ctx, 'emotions/ueberrascht', lt, t);
      } },
    { // 17,25–22,75
      start: 17.25, mood: 'bad', poses: ['emotions/traurig', 'poses/analysieren'], ...TS('up'), focus: F,
      sfx: [WS(), ...flySfx(0.3, -0.1, 0.3), [0.9, 'cash', 0.35, -0.1], ...ticks(2.5, 3.5, 8, 0.28, 0.4), [3.6, 'down', 0.3, 0.4], [4.7, 'stamp', 0.35, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, H1('2022 AUS|10.000 €', null, '#475569')], [2.5, H1('WURDEN|≈ 8.200 €', '#F87171')]]);
        fly(ctx, 880, 640, lt, 0.3, 'left', () => panel(ctx, 0, 0, 560, 300, 1, { accent: '#94A3B8', title: 'DEPOT · JANUAR 2022', body: () => bigNum(ctx, '10.000 €', 0, 30, 80, C.white) }));
        if (lt > 2.2) { const p = eOut(prog(lt, 2.2, 0.6)); ctx.save(); ctx.globalAlpha = p; ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 8; ctx.setLineDash([16, 12]); ctx.beginPath(); ctx.moveTo(1180, 640); ctx.lineTo(1180 + 90 * p, 640); ctx.stroke(); ctx.setLineDash([]); ctx.restore(); }
        if (lt > 2.4) { const v = lerp(10000, 8190, eOut(prog(lt, 2.5, 1.1))); panel(ctx, 1560, 640, 560, 300, pop(lt, 2.4, 0.45), { accent: DN, title: 'DEPOT · DEZEMBER 2022', body: () => bigNum(ctx, prog(lt, 2.5, 1.1) >= 1 ? '≈ 8.200 €' : eur(v), 0, 30, 80, '#F87171') }); }
        if (lt > 4.5) tag(ctx, 'BEIDES MIDTERM-JAHRE', 1220, 900, RED, 1.2 * pop(lt, 4.5, 0.4));
        pandaSeq(ctx, [[0, 'emotions/traurig'], [4.5, 'poses/analysieren']], lt, t);
      } },
    { // 22,75–24,5
      start: 22.75, mood: 'good', poses: ['poses/tipp_geben'], ...TS('zoom'), focus: F,
      sfx: [WS(), [0.3, 'pop', 0.3, 0], [0.9, 'riser', 0.15, 0], [1.3, 'ding', 0.3, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, H1('WICHTIG IST,|WAS DANACH KOMMT', null, '#16A34A')]]);
        panel(ctx, 1210, 660, 1100, 520, pop(lt, 0.2, 0.5), { accent: UP, title: 'S&P 500 · VOR UND NACH DER WAHL (SCHEMA)', body: () => { lineChart(ctx, 0, 40, 980, 330, [0.2, 0.12, 0.18, 0.1, 0.3, 0.42, 0.5, 0.62, 0.7, 0.86], eOut(prog(lt, 0.4, 1.3)), UP);
          ctx.setLineDash([8, 8]); ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-98, -140); ctx.lineTo(-98, 210); ctx.stroke(); ctx.setLineDash([]); label(ctx, 'WAHLTAG', -98, -160, 22); } });
        panda(ctx, 'poses/tipp_geben', lt, t);
      } },
    { // 24,5–31
      start: 24.5, mood: 'good', poses: ['poses/praesentieren', 'emotions/begeistert'], ...TS('left'), focus: F,
      sfx: [WS(), ...flySfx(0.3, -0.1, 0.3), [3.4, 'swell', 0.3, 0], ...ticks(3.6, 4.9, 9, 0.3, 0), [5.0, 'cash', 0.42, 0], [5.05, 'ding', 0.35, 0], ...flySfx(5.4, 0.5, 0.3)],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, H1('6 MONATE NACH|DEN MIDTERMS', null, TEAL)], [3.5, H1('SEIT 1970 IM SCHNITT|+14 %', '#4ADE80')]]);
        if (lt < 3.5) fly(ctx, 1210, 660, lt, 0.3, 'up', () => P.calendar(ctx, 0, 0, 1.0, 'MONATE', '+6'), { rot: 0.2 });
        if (lt > 3.4) { const v = lerp(0, 14.1, eOut(prog(lt, 3.6, 1.3))); panel(ctx, 1020, 660, 600, 360, pop(lt, 3.4, 0.45), { accent: UP, title: 'S&P 500 · Ø 6 MONATE DANACH', body: () => { bigNum(ctx, '+' + v.toFixed(1).replace('.', ',') + ' %', 0, 20, 110, '#4ADE80'); label(ctx, 'SEIT 1970', 0, 110, 24); } }); }
        sparks(ctx, 1020, 660, lt, 5.0, 26, '#4ADE80');
        if (lt > 5.4) fly(ctx, 1600, 660, lt, 5.4, 'right', () => stat(ctx, 0, 0, 420, 1, '12 MONATE DANACH', 'Ø +15,4 %', TEAL, 'SEIT 1950 · CAPITAL GROUP'));
        pandaSeq(ctx, [[0, 'poses/praesentieren'], [5.0, 'emotions/begeistert']], lt, t);
      } },
    { // 31–36,5
      start: 31.0, mood: 'blue', poses: ['poses/analysieren'], ...TS('right'), focus: F,
      sfx: [WS(), [0.3, 'pop', 0.3, 0], [0.6, 'pop', 0.3, -0.1], [1.2, 'pop', 0.3, 0.1], [3.5, 'pop', 0.3, 0.3], [4.0, 'ding', 0.3, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, H1('OHNE MIDTERMS:|NUR +5,7 %', null, AMBER)], [2.5, H1('LANGFRISTIG:|≈ 10 % RENDITE', null, BLUE)]]);
        panel(ctx, 1210, 670, 1100, 600, pop(lt, 0.1, 0.5), { title: 'S&P 500 · DURCHSCHNITTLICHE RENDITE', body: () => {
          const by = 220; ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-420, by, 840, 3);
          vbar(ctx, -280, by, 190, 24, 14.1, eOut(prog(lt, 0.6, 0.8)), UP, '+14,1 %', '6 MON. NACH MIDTERMS');
          vbar(ctx, 0, by, 190, 24, 5.7, eOut(prog(lt, 1.2, 0.8)), AMBER, '+5,7 %', 'OHNE MIDTERMS');
          vbar(ctx, 280, by, 190, 24, 10, eOut(prog(lt, 3.5, 0.8)), SKY, '≈ 10 %', 'P. A. SEIT 1874'); } });
        panda(ctx, 'poses/analysieren', lt, t);
      } },
    { // 36,5–38
      start: 36.5, mood: 'dark', poses: ['emotions/freundlich'], ...TS('zoom', { transDur: 0.5 }), focus: F,
      sfx: [WS(), [0.3, 'pop', 0.3, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, H1('KEINE|ANLAGEBERATUNG', null, '#475569')]]);
        E.withT(ctx, 1210, 640, pop(lt, 0.2, 0.45), 0, () => K.shield(ctx, 0, 0, 1.1, '#475569', 'INFO', 'NUR BILDUNG'));
        panda(ctx, 'emotions/freundlich', lt, t);
      } },
    { // 38–42
      start: 38.0, mood: 'good', poses: ['emotions/begeistert'], ...TS('up'), focus: F,
      sfx: [WS(), [0.3, 'ping', 0.3, 0], ...flySfx(1.1, 0, 0.3), ...ticks(2.0, 2.9, 7, 0.28, 0.4), [3.0, 'cash', 0.4, 0.4]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, H1('JETZT WIRD\'S|WICHTIG', GOLD)], [1.0, H1('BIS ENDE AUGUST|+13 %', '#4ADE80')]]);
        fly(ctx, 1210, 670, lt, 1.1, 'up', () => panel(ctx, 0, 0, 1100, 560, 1, { accent: UP, title: 'S&P 500 · 2026 BIS ENDE AUGUST', body: () => {
          lineChart(ctx, 0, 50, 980, 360, YTD, eOut(prog(lt, 1.4, 1.5)), UP);
          ['JAN', 'MÄR', 'MAI', 'JUL', 'AUG'].forEach((m, i) => label(ctx, m, -490 + i * 245, 250, 20));
          if (lt > 2.0) chip(ctx, '+' + Math.round(lerp(0, 13, eOut(prog(lt, 2.0, 0.9)))) + ' %', 360, -170, '#16A34A', pop(lt, 2.0, 0.4), 44); } }));
        panda(ctx, 'emotions/begeistert', lt, t);
      } },
    { // 42–47,75
      start: 42.0, mood: 'dark', poses: ['poses/tipp_geben', 'emotions/nachdenklich'], ...TS('left'), focus: F,
      sfx: [WS(), [0.3, 'pop', 0.3, 0], [1.1, 'pop', 0.3, -0.1], [1.6, 'stamp', 0.32, 0], ...flySfx(4.2, 0.4, 0.3)],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, H1('DAS HEISST|FÜR DICH:')], [1.0, H1('1 MUSTER IST|KEINE PROGNOSE', null, RED)], [4.0, H1('AUGUST SAGT|NICHTS ÜBER DEN REST', null, '#475569')]]);
        const mv = eInOut(prog(lt, 4.0, 0.6));
        E.withT(ctx, lerp(1210, 880, mv), 670, lerp(1, 0.75, mv), 0, () => { panel(ctx, 0, 0, 800, 480, pop(lt, 1.1, 0.45), { accent: '#94A3B8', title: 'MUSTER AUS DER VERGANGENHEIT', body: () => lineChart(ctx, 0, 30, 700, 300, RAND, 1, '#94A3B8', { lw: 5 }) });
          E.stamp(ctx, '≠ PROGNOSE', 20, 20, lt, 1.6, { size: 70, rot: -0.1 }); });
        if (lt > 4.2) fly(ctx, 1560, 670, lt, 4.2, 'right', () => panel(ctx, 0, 0, 560, 420, 1, { accent: AMBER, title: 'S&P 500 · 2026', body: () => { lineChart(ctx, -90, 30, 320, 240, YTD, 1, UP);
          ctx.setLineDash([10, 10]); ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 4; ctx.strokeRect(90, -90, 170, 240); ctx.setLineDash([]); bigNum(ctx, '?', 175, 30, 120, AMBER); label(ctx, 'SEPT.–DEZ.', 175, 175, 20); } }));
        pandaSeq(ctx, [[0, 'poses/tipp_geben'], [4.0, 'emotions/nachdenklich']], lt, t);
      } },
    { // 47,75–51,5
      start: 47.75, mood: 'blue', poses: ['poses/analysieren'], ...TS('right'), focus: F,
      sfx: [WS(), [0.3, 'pop', 0.3, 0], ...flySfx(1.3, 0.4, 0.3), [2.2, 'ping', 0.3, 0.5]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, H1('MEINE MEINUNG:|KURZE ZINSPAUSE', null, SKY)]]);
        panel(ctx, 950, 670, 760, 520, pop(lt, 0.2, 0.5), { accent: SKY, title: 'US-LEITZINS (SCHEMATISCH)', body: () => {
          const pts = [0.85, 0.85, 0.75, 0.65, 0.55, 0.55, 0.55], p = eOut(prog(lt, 0.4, 1.4));
          ctx.save(); ctx.beginPath(); ctx.rect(-330, -220, 20 + 660 * p, 440); ctx.clip(); ctx.strokeStyle = SKY; ctx.lineWidth = 9; ctx.shadowColor = SKY; ctx.shadowBlur = 16; ctx.beginPath(); const n = pts.length; pts.forEach((v, i) => { const x1 = -320 + 640 * i / n, x2 = -320 + 640 * (i + 1) / n, yy = 150 - 280 * v; i ? ctx.lineTo(x1, yy) : ctx.moveTo(x1, yy); ctx.lineTo(x2, yy); }); ctx.stroke(); ctx.restore();
          if (lt > 1.3) pauseIcon(ctx, 220, 60, 0.6 * pop(lt, 1.3, 0.45), SKY); } });
        fly(ctx, 1600, 670, lt, 1.3, 'right', () => panel(ctx, 0, 0, 440, 400, 1, { accent: AMBER, title: 'ERWARTUNG', body: () => { label(ctx, 'ERST', 0, -80, 26); label(ctx, 'ZINSPAUSE', 0, -40, 36, C.white); label(ctx, 'DANN NUR', 0, 30, 26); label(ctx, 'LANGSAME SCHRITTE', 0, 70, 30, C.white); } }));
        if (lt > 2.2) tag(ctx, 'PERSÖNLICHE EINSCHÄTZUNG', 1210, 990, '#334155', pop(lt, 2.2, 0.4));
        panda(ctx, 'poses/analysieren', lt, t);
      } },
    { // 51,5–56,5
      start: 51.5, mood: 'good', poses: ['emotions/begeistert', 'emotions/cool'], ...TS('up'), focus: F,
      sfx: [WS(), [0.4, 'pop', 0.3, -0.1], [1.5, 'rocket', 0.2, -0.1], [2.4, 'ding', 0.32, 0], ...flySfx(3.5, 0.5, 0.3), [3.9, 'glitch', 0.15, 0.5]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, H1('TROTZDEM MÖGLICH:|JAHRESENDRALLY', null, '#16A34A')], [3.5, H1('AUCH WENN GERADE|VIEL LÄRM IST', null, ROSE)]]);
        const up = eInOut(prog(lt, 1.4, 1.6)); const mv = eInOut(prog(lt, 3.3, 0.6));
        P.rocket(ctx, lerp(1210, 880, mv), lerp(860, 560, up), 380 * pop(lt, 0.3, 0.45), t, { label: 'RALLY', rot: 0.05 });
        if (lt > 2.4) tag(ctx, 'NOV. – DEZ.', lerp(1210, 880, mv), 940, '#16A34A', pop(lt, 2.4, 0.4));
        if (lt > 3.5) fly(ctx, 1600, 660, lt, 3.5, 'right', () => noise(ctx, 0, 0, 1.2, t));
        pandaSeq(ctx, [[0, 'emotions/begeistert'], [3.5, 'emotions/cool']], lt, t);
      } },
    { // 56,5–Ende
      start: 56.5, mood: 'good', poses: ['poses/zeigen', 'emotions/augenzwinkern'], ...TS('left', { transDur: 0.5 }), focus: F,
      sfx: [WS(), ...flySfx(0.3, -0.1, 0.3), [1.0, 'pop', 0.3, -0.1], ...flySfx(3.5, 0.5, 0.3), [4.1, 'cash', 0.4, 0.5]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, H1('NICHT BEIRREN,|KONSTANT BLEIBEN', null, TEAL)], [3.5, H1('ATTRAKTIVE|EINKAUFSCHANCEN', null, '#16A34A')]]);
        fly(ctx, 900, 660, lt, 0.3, 'up', () => panel(ctx, 0, 0, 640, 420, 1, { accent: TEAL, title: 'SPARPLAN · JEDEN MONAT', body: () => { for (let i = 0; i < 6; i++) { const k = pop(lt, 1.0 + i * 0.2, 0.35); if (k > 0) E.withT(ctx, -240 + i * 96, 30, k, 0, () => { ctx.beginPath(); ctx.arc(0, 0, 36, 0, 7); ctx.fillStyle = [TEAL, SKY, LIME, AMBER, PURP, ROSE][i]; ctx.fill(); E.plainText(ctx, '✓', 0, 2, 36, C.white, { weight: 900 }); }); } label(ctx, 'EINFACH WEITERMACHEN', 0, 140, 26, C.white); } }));
        if (lt > 3.5) { fly(ctx, 1580, 630, lt, 3.5, 'right', () => cart(ctx, 0, 0, 1.2, t)); if (lt > 4.1) chip(ctx, 'RÜCKSETZER = CHANCE', 1580, 900, '#16A34A', pop(lt, 4.1, 0.4), 34); }
        pandaSeq(ctx, [[0, 'poses/zeigen'], [3.5, 'emotions/augenzwinkern']], lt, t);
      } },
  ];
  const music = { bpm: 94, chords: [['C', ''], ['A', 'm'], ['F', ''], ['G', '']], level: 0.45, abs: 0.09,
    sections: [[0, 'tension'], [9.0, 'pulse'], [12.75, 'tension'], [22.75, 'pulse'], [24.5, 'full'], [36.5, 'pulse'], [38.0, 'full'], [42.0, 'tension'], [47.75, 'pulse'], [51.5, 'full']], drops: [] };
  window.VIDEO = { format: 'landscape', noCaptions: true, name: 'midterms-boerse-yt', style: 'clean', fps: 30, duration: 61.85, scenes, captions, xfade: 0.35, grain: 0.03, bokeh: false, endFade: false, pandaFixed: true, music };
})();
