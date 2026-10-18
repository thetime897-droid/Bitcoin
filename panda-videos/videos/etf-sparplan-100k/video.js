// ETF-Sparplan: Mit 150 € im Monat zu 100.000 € – Short (65,3 s). Clean-Stil, ruhiger Einstieg, farbige Finanzgrafiken, natürliche SFX.
// Timing: Nutzer-Transkript mit Zeitmarken (0:06 … 1:02) + Sprechpausen. Rechnung geprüft: 150 €/Monat, 7 % p. a. real → 10 J. 25.963 €, 23 J. 102.329 € (eingezahlt 41.400 €).
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

  const { panda, pandaSeq } = K;
  const captions = [[0.15, 2.01, "Mit 150 Euro im Monat zu"], [2.01, 3.37, "100.000 Euro,"], [3.37, 4.95, "und wir berechnen heute,"], [4.95, 6.5, "wie lange das in etwa dauert"], [6.5, 8.15, "und auch wie stark der Zinseszinseffekt"], [8.15, 9.3, "nach den Jahren für dich"], [9.3, 10.63, "arbeitet. Ich denke,"], [10.63, 11.7, "du wirst erstaunt sein,"], [11.7, 13.0, "also legen wir direkt los."], [13.0, 14.75, "Mit 150 Euro pro Monat,"], [14.75, 16.67, "die wir in einen breit gestreuten"], [16.67, 18.22, "ETF wie den MSCI World oder"], [18.22, 19.4, "FTSE All-World investieren,"], [19.4, 21.01, "können wir mit einer ungefähren"], [21.01, 22.7, "Rendite von 9 % rechnen,"], [22.7, 25.41, "was ungefähr 7 % inflationsbereinigt"], [25.41, 26.71, "pro Jahr sind."], [26.71, 27.53, "Das bedeutet,"], [27.53, 28.78, "wir könnten nach ungefähr"], [28.78, 30.33, "10 Jahren mit einer Rendite"], [30.33, 32.37, "insgesamt von 25.963 Euro"], [32.37, 34.39, "rechnen. Das klingt jetzt"], [34.39, 35.95, "vielleicht erstmal nicht"], [35.95, 38.16, "viel für 10 Jahre rein Investment,"], [38.16, 39.67, "aber jetzt ist der Zeitpunkt,"], [39.67, 41.0, "wo der Zinseszinseffekt für"], [41.0, 42.7, "dich richtig stark arbeitet,"], [42.7, 44.5, "und du wirst erstaunt sein,"], [44.5, 46.58, "wie viel nach nur 13 weiteren"], [46.58, 48.85, "Jahren hier für dich rumkommt."], [48.85, 50.48, "Das sind nämlich nochmal"], [50.48, 52.0, "76.366 Euro."], [52.0, 53.01, "Das bedeutet,"], [53.01, 54.95, "du hast nach ungefähr 23"], [54.95, 56.78, "Jahren mit einem Investment"], [56.78, 58.96, "von 150 Euro pro Monat satte"], [58.96, 61.3, "100.000 Euro erwirtschaftet."], [61.3, 63.1, "Wie hoch ist deine Sparrate?"], [63.1, 64.01, "Schreib mir das doch gerne"], [64.01, 64.9, "mal in die Kommentare."]];
  const TS = (dir, extra = {}) => ({ trans: dir, transDur: 0.6, punchAmt: 0.03, flashAmt: 0.0, zoom: 0.03, ...extra });
  const F = { x: 640, y: 980 };
  const scenes = [
    { // 0–4,95: Mit 150 € im Monat zu 100.000 €
      start: 0, mood: 'good', poses: ['poses/praesentieren'], punch: false, noBrand: true, zoom: 0.03, focus: F,
      sfx: [[0.1, 'swell', 0.3, 0], [0.4, 'ding', 0.3, 0], ...flySfx(0.6, -0.2, 0.3), ...flySfx(1.9, 0.3, 0.3), [2.5, 'cash', 0.35, 0.3]],
      draw(ctx, lt, t) {
        E.liveBar(ctx, lt, 'ETF-SPARPLAN  •  150 € IM MONAT  •  7 % P. A. INFLATIONSBEREINIGT  •  ZINSESZINS  •  ');
        E.headline(ctx, [{ t: '150 € IM MONAT', c: C.white, size: 120, ribbon: TEAL }, { t: '→ 100.000 €?', c: '#4ADE80', size: 130 }], lt, { y: 480, delay: 0.1 });
        fly(ctx, 560, 1010, lt, 0.6, 'left', () => panel(ctx, 0, 0, 260, 320, 1, { accent: AMBER, title: 'MONATLICH', body: () => { coins(ctx, 0, 70, 4); bigNum(ctx, '150 €', 0, -50, 58, C.white); } }));
        if (lt > 1.4) { const p = eOut(prog(lt, 1.4, 0.6)); ctx.save(); ctx.globalAlpha = p; ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 6; ctx.setLineDash([14, 10]); ctx.beginPath(); ctx.moveTo(700, 1010); ctx.lineTo(700 + 50 * p, 1010); ctx.stroke(); ctx.setLineDash([]); ctx.restore(); }
        fly(ctx, 880, 1010, lt, 1.9, 'right', () => panel(ctx, 0, 0, 280, 320, 1, { accent: '#22C55E', title: 'ZIEL', body: () => { coins(ctx, -60, 90, 9); coins(ctx, 0, 90, 12); coins(ctx, 60, 90, 7); bigNum(ctx, '100k', 0, -60, 64, '#4ADE80'); } }));
        panda(ctx, 'poses/praesentieren', lt, t, { x: 160, h: 440 });
      } },
    { // 4,95–13: Wie lange dauert das? Wie stark arbeitet der Zinseszins?
      start: 4.95, mood: 'blue', poses: ['emotions/nachdenklich', 'emotions/begeistert'], ...TS('right'), focus: F,
      sfx: [WS(), [0.5, 'tick', 0.3, 0.2], [1.0, 'tick', 0.3, 0.2], [1.5, 'tick', 0.3, 0.2], ...flySfx(2.0, 0.3, 0.3), [4.6, 'pop', 0.35, 0.2], [6.1, 'ding', 0.3, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'WIE LANGE', c: C.white, size: 135 }, { t: 'DAUERT DAS?', c: C.white, size: 125, ribbon: BLUE }]], [1.6, [{ t: 'WIE STARK WIRKT', c: C.white, size: 110 }, { t: 'DER ZINSESZINS?', c: C.white, size: 115, ribbon: TEAL }]], [4.5, [{ t: 'DU WIRST', c: C.white, size: 130 }, { t: 'ERSTAUNT SEIN', c: GOLD, size: 125 }]]]);
        panel(ctx, 700, 1000, 600, 480, pop(lt, 0.1, 0.5), { title: 'ZINSESZINS-EFFEKT', body: () => {} });
        if (lt > 0.4) growth(ctx, 470, 1170, 460, 300, 23, lerp(0, 23, eInOut(prog(lt, 1.6, 3.0))), { yLabels: false, ticks: [0, 10, 23] });
        if (lt > 4.5) tag(ctx, '?', 930, 840, VIO, 1.4 * pop(lt, 4.6, 0.4));
        pandaSeq(ctx, [[0, 'emotions/nachdenklich'], [4.5, 'emotions/begeistert']], lt, t, { x: 160, h: 440 });
      } },
    { // 13–18,2: 150 € pro Monat in breit gestreuten ETF (MSCI World)
      start: 13.0, mood: 'blue', poses: ['poses/zeigen'], ...TS('up'), focus: F,
      sfx: [WS(), ...flySfx(0.3, -0.3, 0.3), [0.8, 'cash', 0.3, -0.3], ...flySfx(2.2, 0.3, 0.3), [2.8, 'ding', 0.3, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: '150 € PRO MONAT', c: C.white, size: 115, ribbon: AMBER }, { t: 'IN EINEN ETF', c: C.white, size: 125 }]], [2.0, [{ t: 'BREIT GESTREUT:', c: C.white, size: 115 }, { t: 'MSCI WORLD', c: C.white, size: 130, ribbon: BLUE }]]]);
        fly(ctx, 700, 870, lt, 0.3, 'left', () => chip(ctx, '150 € / MONAT', 0, 0, AMBER, 1, 46));
        fly(ctx, 700, 1120, lt, 2.2, 'right', () => panel(ctx, 0, 0, 520, 320, 1, { accent: SKY, title: 'ETF · MSCI WORLD', body: () => { globe(ctx, -150, 20, 90, t); label(ctx, '≈ 1.400 FIRMEN', 90, -20, 28, C.white); label(ctx, '23 INDUSTRIELÄNDER', 90, 30, 22); } }));
        panda(ctx, 'poses/zeigen', lt, t, { x: 160, h: 440 });
      } },
    { // 18,2–26,7: oder FTSE All-World; 9 % Rendite ≈ 7 % inflationsbereinigt
      start: 18.22, mood: 'good', poses: ['poses/analysieren', 'poses/tipp_geben'], ...TS('left'), focus: F,
      sfx: [WS(), ...flySfx(0.2, 0.3, 0.3), [2.9, 'pop', 0.35, -0.3], ...ticks(3.0, 3.8, 6, 0.3, -0.3), [4.6, 'pop', 0.35, 0], [5.4, 'pop', 0.35, 0.3], [5.8, 'ding', 0.35, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'ODER', c: C.white, size: 130 }, { t: 'FTSE ALL-WORLD', c: C.white, size: 115, ribbon: VIO }]], [2.8, [{ t: '≈ 9 % RENDITE', c: C.white, size: 125, ribbon: GRN }, { t: '7 % NACH INFLATION', c: C.white, size: 95 }]]]);
        if (lt < 2.8) { fly(ctx, 700, 1000, lt, 0.2, 'right', () => panel(ctx, 0, 0, 520, 360, 1, { accent: PURP, title: 'ETF · FTSE ALL-WORLD', body: () => { globe(ctx, -150, 20, 90, t); label(ctx, '≈ 4.000 FIRMEN', 90, -20, 28, C.white); label(ctx, 'INKL. SCHWELLENLÄNDER', 90, 30, 20); } })); }
        else { const v = lerp(0, 9, eOut(prog(lt, 3.0, 0.8)));
          chip(ctx, Math.round(v) + ' %', 500, 1000, GRN, pop(lt, 2.9, 0.45), 48); chip(ctx, '– 2 %', 700, 1000, ROSE, pop(lt, 4.6, 0.45), 40); chip(ctx, '= 7 %', 900, 1000, TEAL, pop(lt, 5.4, 0.45), 48);
          if (lt > 4.6) label(ctx, 'INFLATION', 700, 1085, 22, ROSE); if (lt > 5.4) label(ctx, 'REAL / JAHR', 900, 1085, 22, TEAL);
          if (lt > 5.8) tag(ctx, 'Ø HISTORISCH · KEINE GARANTIE', 700, 1240, '#334155', pop(lt, 5.8, 0.4)); }
        pandaSeq(ctx, [[0, 'poses/analysieren'], [2.8, 'poses/tipp_geben']], lt, t, { x: 150, h: 420 });
      } },
    { // 26,7–33: nach ~10 Jahren 25.963 €
      start: 26.71, mood: 'blue', poses: ['poses/praesentieren'], ...TS('up'), focus: F,
      sfx: [WS(), [0.3, 'pop', 0.35, 0], ...ticks(1.5, 4.2, 14, 0.3, 0.2), [4.3, 'cash', 0.45, 0.2], [5.3, 'pop', 0.35, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'NACH', c: C.white, size: 130 }, { t: '10 JAHREN', c: C.white, size: 140, ribbon: BLUE }]], [4.3, [{ t: '≈ 25.963 €', c: '#4ADE80', size: 140 }, { t: 'DEPOTWERT', c: C.white, size: 115 }]]]);
        const yr = lerp(0, 10, eInOut(prog(lt, 1.5, 2.8)));
        panel(ctx, 700, 990, 620, 500, pop(lt, 0.2, 0.5), { title: 'SPARPLAN 150 € · 7 % P. A.', body: () => {} });
        growth(ctx, 480, 1170, 470, 300, 10, yr, { maxV: 30000, ticks: [0, 5, 10], marks: [[10, GRN]] });
        if (lt > 1.5) bigNum(ctx, eur(fv(yr)), 820, 830, 44, C.white);
        if (lt > 5.3) legend(ctx, 470, 1290, pop(lt, 5.3, 0.4));
        panda(ctx, 'poses/praesentieren', lt, t, { x: 150, h: 420 });
      } },
    { // 33–44,5: klingt nicht viel (18.000 € eingezahlt) – jetzt arbeitet der Zinseszins
      start: 33.0, mood: 'dark', poses: ['emotions/nachdenklich', 'poses/tipp_geben'], ...TS('right'), focus: F,
      sfx: [WS(), ...flySfx(0.3, -0.3, 0.3), [0.9, 'paper', 0.3, -0.3], ...flySfx(1.6, 0.3, 0.3), [5.3, 'swell', 0.3, 0], [5.4, 'ding', 0.35, 0], [8.0, 'pop', 0.35, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'KLINGT ERSTMAL', c: C.white, size: 115 }, { t: 'NICHT VIEL …', c: C.white, size: 125, ribbon: '#475569' }]], [5.2, [{ t: 'JETZT ARBEITET', c: C.white, size: 120 }, { t: 'DER ZINSESZINS', c: C.white, size: 115, ribbon: TEAL }]]]);
        if (lt < 5.2) {
          fly(ctx, 560, 1000, lt, 0.3, 'left', () => kpi(ctx, 0, 0, 270, 300, 1, 'EINGEZAHLT', '18.000 €', AMBER, '10 × 1.800 €'));
          fly(ctx, 860, 1000, lt, 1.6, 'right', () => kpi(ctx, 0, 0, 270, 300, 1, 'ZINSEN', '7.963 €', GRN, 'NACH 10 J.'));
        } else {
          panel(ctx, 700, 1000, 620, 480, pop(lt, 5.2, 0.5), { title: 'DIE KURVE WIRD STEILER', body: () => {} });
          growth(ctx, 480, 1170, 470, 300, 23, lerp(10, 18, eInOut(prog(lt, 5.6, 5.0))), { maxV: 110000, ticks: [0, 10, 23], marks: [[10, GRN]] });
          if (lt > 8.0) chip(ctx, 'EXPONENTIELL ↗', 700, 1300, TEAL, pop(lt, 8.0, 0.4), 30);
        }
        pandaSeq(ctx, [[0, 'emotions/nachdenklich'], [5.2, 'poses/tipp_geben']], lt, t, { x: 150, h: 420 });
      } },
    { // 44,5–52: nach nur 13 weiteren Jahren – nochmal 76.366 €
      start: 44.5, mood: 'good', poses: ['emotions/ueberrascht', 'emotions/begeistert'], ...TS('zoom'), focus: F,
      sfx: [WS(), [0.3, 'pop', 0.35, 0], ...ticks(1.2, 5.6, 18, 0.28, 0.2), [5.8, 'cash', 0.5, 0.2], [6.0, 'ding', 0.35, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'NUR 13', c: C.white, size: 135 }, { t: 'WEITERE JAHRE', c: C.white, size: 125, ribbon: VIO }]], [5.8, [{ t: 'NOCHMAL', c: C.white, size: 130 }, { t: '+ 76.366 €', c: '#4ADE80', size: 150 }]]]);
        const yr = lerp(10, 23, eInOut(prog(lt, 1.2, 4.4)));
        panel(ctx, 700, 990, 620, 500, pop(lt, 0.1, 0.5), { title: 'JAHR 10 → 23', body: () => {} });
        growth(ctx, 480, 1170, 470, 300, 23, yr, { maxV: 110000, ticks: [0, 10, 23], marks: [[10, GRN], [23, GOLD]] });
        if (lt > 1.2) bigNum(ctx, '+' + eur(fv(yr) - fv(10)), 780, 830, 44, '#4ADE80');
        sparks(ctx, 930, 880, lt, 5.8, 22, GOLD);
        pandaSeq(ctx, [[0, 'emotions/ueberrascht'], [5.8, 'emotions/begeistert']], lt, t, { x: 150, h: 420 });
      } },
    { // 52–61,3: nach ~23 Jahren satte 100.000 €
      start: 52.0, mood: 'good', poses: ['poses/praesentieren', 'emotions/begeistert'], ...TS('up'), focus: F,
      sfx: [WS(), [0.4, 'pop', 0.35, 0], [1.5, 'swell', 0.3, 0], ...ticks(3.6, 6.8, 16, 0.3, 0.2), [7.0, 'cash', 0.5, 0.2], [7.1, 'ding', 0.4, 0], [7.2, 'pop', 0.4, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'NACH ≈ 23 JAHREN', c: C.white, size: 115, ribbon: BLUE }, { t: 'MIT 150 € / MONAT', c: C.white, size: 100 }]], [7.0, [{ t: 'SATTE', c: C.white, size: 130 }, { t: '100.000 €', c: '#4ADE80', size: 160 }]]]);
        const p = eOut(prog(lt, 3.6, 3.3));
        panel(ctx, 700, 990, 620, 520, pop(lt, 0.2, 0.5), { title: 'DEPOTWERT NACH 23 JAHREN', body: () => {} });
        stack(ctx, 560, 1210, 150, 310, 23, p, { label: '23 JAHRE', fs: 30 });
        if (lt > 3.6) bigNum(ctx, eur(fv(23) * p), 560, 1210 - 310 * p - 36, 38, C.white);
        sparks(ctx, 560, 820, lt, 7.0, 26, '#4ADE80');
        pandaSeq(ctx, [[0, 'poses/praesentieren'], [7.0, 'emotions/begeistert']], lt, t, { x: 150, h: 420 });
      } },
    { // 61,3–Ende: Wie hoch ist deine Sparrate?
      start: 61.3, mood: 'blue', poses: ['emotions/freundlich'], ...TS('zoom'), focus: F,
      sfx: [WS(), [0.3, 'pop', 0.35, 0.2], [0.9, 'pop', 0.3, -0.2], [1.2, 'pop', 0.3, 0], [1.5, 'pop', 0.3, 0.3], [2.1, 'ping', 0.35, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DEINE', c: C.white, size: 130 }, { t: 'SPARRATE?', c: C.white, size: 140, ribbon: TEAL }]]]);
        bubble(ctx, 700, 900, 560, 220, pop(lt, 0.2, 0.45), [['WIE HOCH IST', '#0F172A', 40], ['DEINE SPARRATE?', '#0D9488', 46]]);
        [['50 €', 0.9, 520], ['150 €', 1.2, 700], ['300 €+', 1.5, 880]].forEach(([v, at, x]) => chip(ctx, v, x, 1180, [AMBER, TEAL, VIO][[0.9, 1.2, 1.5].indexOf(at)], pop(lt, at, 0.4), 38));
        if (lt > 2.1) tag(ctx, '💬 IN DIE KOMMENTARE', 700, 1310, '#334155', pop(lt, 2.1, 0.4));
        panda(ctx, 'emotions/freundlich', lt, t, { x: 150, h: 420 });
      } },
  ];
  const music = { bpm: 92, chords: [['C', ''], ['A', 'm'], ['F', ''], ['G', '']], level: 0.45, abs: 0.09,
    sections: [[0, 'tension'], [4.95, 'pulse'], [13.0, 'pulse'], [26.71, 'full'], [33.0, 'tension'], [38.2, 'pulse'], [44.5, 'full'], [61.3, 'pulse']], drops: [] };
  window.VIDEO = { name: 'etf-sparplan-100k', style: 'clean', fps: 30, duration: 65.34, scenes, captions, xfade: 0.35, grain: 0.03, bokeh: false, endFade: false, pandaFixed: true, music };
})();
