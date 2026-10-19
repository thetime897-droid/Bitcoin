// SpaceX – Musk will jedem US-Kind eine SpaceX-Aktie schenken – Short (62 s). Clean-Stil, ruhiger Einstieg, farbige Grafiken, natürliche SFX.
// Fakten: 70 Mio. × 146 $ ≈ 10,2 Mrd. $; Juli 2026: Gwynne Shotwell sagt SpaceX-Aktien (~320 Mio. $) über „Trump Accounts“ für > 2 Mio. Kinder zu (Quellen: TNW, 247wallst).
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

  const { panda, pandaSeq, doc, magnifier } = K;
  const SPX = '#94A3B8', XB = '#0F172A';
  const captions = [[0.0, 1.25, "Breaking News bei SpaceX,"], [1.25, 2.75, "Elon Musk möchte jetzt"], [2.75, 4.5, "jedem US-Kind eine SpaceX-"], [4.5, 5.25, "Aktie schenken."], [5.25, 6.5, "Und wie das funktionieren"], [6.5, 7.5, "soll, erklär ich euch jetzt."], [7.5, 8.75, "Über 70 Millionen Kinder,"], [8.75, 10.0, "und keiner weiß, wie das"], [10.0, 10.25, "laufen soll."], [10.25, 11.5, "Die größte Frage steckt"], [11.5, 13.0, "hinter einem einzigen Wort."], [13.0, 14.25, "Musk schrieb nämlich auf X:"], [14.25, 15.75, "„Nächstes Jahr bekommt jedes"], [15.75, 16.5, "Kind in Amerika eine seiner"], [16.5, 17.25, "SpaceX-Aktien.“"], [17.5, 19.25, "Eine Aktie kostete am"], [19.25, 21.25, "Freitag zum Schluss 146 Dollar."], [21.25, 23.0, "Mal über 70 Millionen"], [23.0, 24.6, "Kinder: gut 10 Milliarden Dollar."], [24.75, 25.25, "Zum Vergleich:"], [25.25, 27.0, "Im Juli kündigte Gwynne"], [27.0, 28.5, "Shotwell SpaceX-Aktien"], [28.5, 30.0, "für 2 Millionen Kinder an."], [30.0, 31.0, "Musk will mehr als"], [31.0, 32.75, "30-mal so viele erreichen,"], [32.75, 34.0, "und das Versprechen gilt für"], [34.0, 34.5, "nächstes Jahr."], [34.5, 35.5, "1 Datum nennt er"], [35.5, 36.75, "dabei aber nicht. Der Haken:"], [36.75, 37.75, "Fast alles ist offen."], [38.0, 39.0, "Wer ist 1 Kind?"], [39.0, 40.5, "Alle unter 18, auch"], [40.5, 42.0, "Kinder ohne US-Pass?"], [42.0, 43.0, "Keine Ahnung, wie die"], [43.0, 44.75, "Aktien dann übertragen werden sollen,"], [44.75, 45.75, "sagt er natürlich auch."], [45.75, 46.5, "Ich bin hier ganz"], [46.5, 47.5, "gespannt darauf, wie"], [47.5, 48.0, "entschieden wird,"], [48.0, 49.0, "wer eine Aktie am"], [49.0, 50.0, "Ende des Tages bekommt."], [50.0, 51.0, "Und es heißt für dich:"], [51.0, 52.0, "Es ist bisher nur"], [52.0, 53.75, "1 Versprechen auf X und"], [53.75, 54.25, "keine Regelung."], [54.25, 55.25, "Falls du noch jünger"], [55.25, 56.0, "bist und 1 US-"], [56.0, 57.0, "Pass hast, kriegst du"], [57.0, 57.75, "vielleicht ja auch eine"], [57.75, 58.5, "Aktie geschenkt."], [58.5, 59.5, "Oder vielleicht auch nur,"], [59.5, 60.0, "wenn du in den"], [60.0, 60.75, "USA lebst."], [60.75, 61.5, "Aber mich würde interessieren,"], [61.5, 62.0, "was ihr davon haltet."]];
  const TS = (dir, extra = {}) => ({ trans: dir, transDur: 0.6, punchAmt: 0.03, flashAmt: 0.0, zoom: 0.03, ...extra });
  const F = { x: 640, y: 980 };
  function gift(ctx, x, y, s, t, col = ROSE) { if (s <= 0.001) return; E.withT(ctx, x, y, s, Math.sin(t * 2) * 0.04, () => {
    ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 30; E.rr(ctx, -110, -60, 220, 170, 18); ctx.fillStyle = col; ctx.fill(); ctx.restore();
    E.rr(ctx, -125, -100, 250, 56, 14); ctx.fillStyle = E.shade(col, 0.15); ctx.fill(); ctx.fillStyle = GOLD; ctx.fillRect(-16, -100, 32, 210);
    ctx.beginPath(); ctx.ellipse(-36, -112, 34, 20, -0.5, 0, 7); ctx.ellipse(36, -112, 34, 20, 0.5, 0, 7); ctx.lineWidth = 12; ctx.strokeStyle = GOLD; ctx.stroke(); }); }
  function kids(ctx, x, y, lt, at, n, cols, s = 1) { for (let i = 0; i < n; i++) { const k = pop(lt, at + i * 0.03, 0.3); if (k <= 0) continue; const px = x + (i % cols - (cols - 1) / 2) * 70 * s, py = y + Math.floor(i / cols) * 86 * s;
    E.withT(ctx, px, py, k * s, 0, () => { ctx.fillStyle = [SKY, ROSE, AMBER, TEAL, PURP][i % 5]; ctx.beginPath(); ctx.arc(0, -22, 14, 0, 7); ctx.fill(); E.rr(ctx, -16, -4, 32, 36, 12); ctx.fill(); }); } }
  function xpost(ctx, x, y, w, s, lt, at, txt, hl) { if (s <= 0.001) return; E.withT(ctx, x, y, s, 0, () => {
    ctx.save(); ctx.shadowColor = 'rgba(2,6,23,0.6)'; ctx.shadowBlur = 40; E.rr(ctx, -w / 2, -170, w, 340, 30); ctx.fillStyle = '#0B0F19'; ctx.fill(); ctx.restore();
    E.rr(ctx, -w / 2, -170, w, 340, 30); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.stroke();
    ctx.beginPath(); ctx.arc(-w / 2 + 70, -110, 34, 0, 7); ctx.fillStyle = '#334155'; ctx.fill(); E.plainText(ctx, 'Elon Musk', -w / 2 + 120, -122, 30, C.white, { weight: 900, align: 'left' }); E.plainText(ctx, '@elonmusk · X', -w / 2 + 120, -90, 22, 'rgba(255,255,255,0.5)', { weight: 700, align: 'left' });
    E.plainText(ctx, '𝕏', w / 2 - 50, -110, 40, C.white, { weight: 900 });
    const n = Math.floor(txt.length * Math.min(1, Math.max(0, (lt - at) / 2.2))), shown = txt.slice(0, n), words = shown.split(' '); let line = '', ly = -20; ctx.font = `800 34px ${E.FONT_BOLD}`;
    const lines = []; words.forEach((wd) => { const tl = line ? line + ' ' + wd : wd; if (ctx.measureText(tl).width > w - 80) { lines.push(line); line = wd; } else line = tl; }); lines.push(line);
    lines.forEach((l, i) => { let xx = -w / 2 + 40; l.split(' ').forEach((wd) => { const isH = hl && wd.toLowerCase().includes(hl); if (isH) { const ww = ctx.measureText(wd).width; E.rr(ctx, xx - 6, ly + i * 50 - 24, ww + 12, 46, 8); ctx.fillStyle = 'rgba(245,158,11,0.35)'; ctx.fill(); }
      E.plainText(ctx, wd, xx, ly + i * 50, 34, isH ? GOLD : C.white, { weight: 800, align: 'left' }); xx += ctx.measureText(wd + ' ').width; }); }); }); }
  function qrow(ctx, txt, w, col = AMBER) { E.rr(ctx, -w / 2, -42, w, 84, 24); ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = col; ctx.stroke();
    E.withT(ctx, -w / 2 + 50, 0, 1, 0, () => { ctx.beginPath(); ctx.arc(0, 0, 24, 0, 7); ctx.fillStyle = col; ctx.fill(); E.plainText(ctx, '?', 0, 2, 30, C.white, { weight: 900 }); }); E.plainText(ctx, txt, -w / 2 + 94, 2, 30, C.white, { weight: 900, align: 'left' }); }

  const scenes = [
    { // 0–5,25: Breaking – Musk will jedem US-Kind eine SpaceX-Aktie schenken
      start: 0, mood: 'blue', poses: ['emotions/ueberrascht'], punch: false, noBrand: true, zoom: 0.03, focus: F,
      sfx: [[0.1, 'swell', 0.3, 0], [0.35, 'ding', 0.3, 0], [0.8, 'rocket', 0.18, 0.2], ...flySfx(2.8, 0.3, 0.3), [4.6, 'pop', 0.35, 0.2], [4.7, 'ping', 0.3, 0.2]],
      draw(ctx, lt, t) {
        E.liveBar(ctx, lt, 'SPACEX  •  MUSK: JEDES US-KIND SOLL EINE AKTIE BEKOMMEN  •  70 MIO. KINDER  •  ≈ 10 MRD. $  •  ');
        H(ctx, lt, [[0, [{ t: 'BREAKING NEWS', c: C.white, size: 120, ribbon: RED }, { t: 'BEI SPACEX', c: C.white, size: 130 }], { y: 480, delay: 0.1 }], [2.75, [{ t: 'JEDEM US-KIND', c: C.white, size: 120 }, { t: 'EINE AKTIE?', c: GOLD, size: 130 }], { y: 480 }]]);
        const up = eInOut(prog(lt, 0.6, 2.2)); if (lt < 3.0) P.rocket(ctx, 720, lerp(1250, 950, up), 340, t, { label: 'SPACEX', rot: 0.04 });
        if (lt > 2.7) { gift(ctx, 560, 1070, pop(lt, 2.8, 0.5), t); P.flagUS(ctx, 760, 960, 200 * pop(lt, 3.2, 0.5), t); }
        if (lt > 4.6) tag(ctx, 'GESCHENKT', 560, 1240, ROSE, pop(lt, 4.6, 0.4));
        panda(ctx, 'emotions/ueberrascht', lt, t, { x: 160, h: 440 });
      } },
    { // 5,25–10,25: Wie soll das funktionieren? 70 Mio. Kinder
      start: 5.25, mood: 'dark', poses: ['poses/tipp_geben', 'emotions/nachdenklich'], ...TS('right'), focus: F,
      sfx: [WS(), [0.4, 'pop', 0.3, 0], ...ticks(2.3, 3.4, 8, 0.3, 0.2), [3.5, 'ding', 0.35, 0.2], [4.0, 'pop', 0.3, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'WIE SOLL DAS', c: C.white, size: 125 }, { t: 'FUNKTIONIEREN?', c: C.white, size: 120, ribbon: VIO }]], [2.25, [{ t: 'ÜBER 70 MIO.', c: C.white, size: 135, ribbon: TEAL }, { t: 'KINDER', c: C.white, size: 130 }]]]);
        panel(ctx, 700, 1000, 620, 460, pop(lt, 0.2, 0.5), { title: 'US-KINDER UNTER 18', body: () => {} });
        kids(ctx, 700, 870, lt, 0.4, 24, 8);
        if (lt > 2.3) bigNum(ctx, Math.round(lerp(0, 70, eOut(prog(lt, 2.3, 1.1)))) + ' MIO.', 700, 1160, 70, TEAL);
        if (lt > 4.0) tag(ctx, 'UND KEINER WEISS WIE', 700, 1290, '#334155', pop(lt, 4.0, 0.4));
        pandaSeq(ctx, [[0, 'poses/tipp_geben'], [3.5, 'emotions/nachdenklich']], lt, t, { x: 150, h: 420 });
      } },
    { // 10,25–17,5: Die größte Frage – ein einziges Wort; Musks Post auf X
      start: 10.25, mood: 'dark', poses: ['poses/analysieren', 'poses/zeigen'], ...TS('up'), focus: F,
      sfx: [WS(), [0.4, 'pop', 0.3, 0], ...flySfx(2.8, 0.2, 0.3), ...ticks(3.2, 5.4, 10, 0.18, 0.2), [5.9, 'ding', 0.35, 0.2], [6.2, 'pop', 0.3, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DIE GRÖSSTE FRAGE:', c: C.white, size: 110 }, { t: '1 EINZIGES WORT', c: C.white, size: 115, ribbon: AMBER }]], [2.75, [{ t: 'MUSK AUF X:', c: C.white, size: 135 }]]]);
        if (lt < 2.75) { E.withT(ctx, 700, 1000, pop(lt, 0.3, 0.45), 0, () => { pulseRings(ctx, 0, 0, t, AMBER, 3, 200); bigNum(ctx, '?', 0, 30, 220, AMBER); }); }
        else fly(ctx, 690, 1000, lt, 2.8, 'up', () => xpost(ctx, 0, 0, 640, 1, lt, 3.2, 'Nächstes Jahr bekommt jedes Kind in Amerika eine SpaceX-Aktie.', 'nächstes'));
        if (lt > 6.2) tag(ctx, '„NÄCHSTES JAHR“ = KEIN DATUM', 700, 1240, AMBER, pop(lt, 6.2, 0.4));
        pandaSeq(ctx, [[0, 'poses/analysieren'], [2.75, 'poses/zeigen']], lt, t, { x: 150, h: 420 });
      } },
    { // 17,5–24,75: 146 $ × 70 Mio. ≈ 10 Mrd. $
      start: 17.5, mood: 'good', poses: ['poses/praesentieren', 'emotions/ueberrascht'], ...TS('left'), focus: F,
      sfx: [WS(), ...flySfx(0.3, -0.3, 0.3), [1.8, 'cash', 0.35, -0.3], ...flySfx(3.8, 0.3, 0.3), [5.3, 'swell', 0.3, 0], ...ticks(5.5, 6.8, 8, 0.3, 0), [6.9, 'cash', 0.45, 0], [7.0, 'ding', 0.35, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: '1 AKTIE AM FREITAG:', c: C.white, size: 105 }, { t: '146 $', c: '#4ADE80', size: 160 }]], [3.75, [{ t: '× 70 MIO. KINDER', c: C.white, size: 115, ribbon: TEAL }]], [5.5, [{ t: '≈ 10 MRD. $', c: GOLD, size: 150 }, { t: 'GESCHENKT?', c: C.white, size: 120 }]]]);
        fly(ctx, 700, 870, lt, 0.3, 'left', () => panel(ctx, 0, 0, 460, 200, 1, { accent: SPX, title: 'SPACEX · SCHLUSSKURS', body: () => bigNum(ctx, '146 $', 0, 20, 80, C.white) }));
        fly(ctx, 700, 1080, lt, 3.8, 'right', () => chip(ctx, '× 70.000.000', 0, 0, TEAL, 1, 46));
        if (lt > 5.5) { const v = lerp(0, 10.2, eOut(prog(lt, 5.5, 1.3))); panel(ctx, 700, 1250, 520, 160, pop(lt, 5.4, 0.45), { accent: GOLD, body: () => bigNum(ctx, '≈ ' + v.toFixed(1).replace('.', ',') + ' MRD. $', 0, 6, 64, GOLD) }); }
        sparks(ctx, 700, 1250, lt, 6.9, 22, GOLD);
        pandaSeq(ctx, [[0, 'poses/praesentieren'], [5.5, 'emotions/ueberrascht']], lt, t, { x: 150, h: 420 });
      } },
    { // 24,75–30: Zum Vergleich – Juli: Shotwell für 2 Mio. Kinder
      start: 24.75, mood: 'blue', poses: ['poses/analysieren'], ...TS('right'), focus: F,
      sfx: [WS(), [0.4, 'paper', 0.25, 0], [0.9, 'pop', 0.35, -0.3], ...ticks(1.0, 2.2, 7, 0.28, -0.3), [3.8, 'pop', 0.35, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'ZUM VERGLEICH:', c: C.white, size: 120 }, { t: 'JULI 2026', c: C.white, size: 130, ribbon: BLUE }]], [2.5, [{ t: 'SHOTWELL:', c: C.white, size: 130 }, { t: '2 MIO. KINDER', c: C.white, size: 120, ribbon: SKY }]]]);
        panel(ctx, 700, 1000, 620, 500, pop(lt, 0.2, 0.5), { title: 'SPACEX-AKTIEN FÜR KINDER', body: () => {} });
        const bh = 300, by = 1180, p1 = eOut(prog(lt, 1.0, 1.0));
        const bar = (x, v, max, col, lab, txt, p) => { const h = bh * v / max * p; const g = ctx.createLinearGradient(0, by - h, 0, by); g.addColorStop(0, col); g.addColorStop(1, E.shade(col, -0.45)); ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 20; E.rr(ctx, x - 70, by - h, 140, Math.max(2, h), 14); ctx.fillStyle = g; ctx.fill(); ctx.restore(); label(ctx, lab, x, by + 34, 22); if (p > 0.3) bigNum(ctx, txt, x, by - h - 34, 36, C.white); };
        bar(580, 2, 70, SKY, 'JULI · SHOTWELL', '2 MIO.', p1);
        if (lt > 3.8) bar(820, 70, 70, GOLD, 'MUSK · GEPLANT', '70 MIO.', eOut(prog(lt, 3.8, 1.0)));
        if (lt > 1.4) tag(ctx, 'ÜBER „TRUMP ACCOUNTS“', 700, 1290, '#334155', pop(lt, 1.4, 0.4));
        panda(ctx, 'poses/analysieren', lt, t, { x: 150, h: 420 });
      } },
    { // 30–34,5: mehr als 30-mal so viele – Versprechen für nächstes Jahr
      start: 30.0, mood: 'good', poses: ['emotions/begeistert'], ...TS('up'), focus: F,
      sfx: [WS(), [0.4, 'pop', 0.35, 0], ...ticks(1.0, 2.2, 8, 0.3, 0.2), [2.3, 'ding', 0.4, 0.2], ...flySfx(2.9, 0.3, 0.3)],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'MEHR ALS', c: C.white, size: 130 }, { t: '30-MAL SO VIELE', c: C.white, size: 115, ribbon: GRN }]], [2.75, [{ t: 'VERSPRECHEN FÜR', c: C.white, size: 115 }, { t: 'NÄCHSTES JAHR', c: GOLD, size: 125 }]]]);
        if (lt < 2.75) chip(ctx, '× ' + Math.round(lerp(1, 35, eOut(prog(lt, 1.0, 1.3)))), 700, 1000, GRN, pop(lt, 0.3, 0.45), 90);
        else fly(ctx, 700, 1010, lt, 2.9, 'up', () => P.calendar(ctx, 0, 0, 1.0, 'NÄCHSTES JAHR', '2027'), { rot: 0.3 });
        panda(ctx, 'emotions/begeistert', lt, t, { x: 150, h: 420 });
      } },
    { // 34,5–38: kein Datum – der Haken: fast alles offen
      start: 34.5, mood: 'bad', poses: ['emotions/nachdenklich'], ...TS('left'), focus: F,
      sfx: [WS(), [0.4, 'pop', 0.3, 0], [1.2, 'down', 0.25, 0.2], [2.3, 'stamp', 0.35, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'EIN DATUM?', c: C.white, size: 140 }, { t: 'NENNT ER NICHT', c: C.white, size: 115, ribbon: RED }]], [2.25, [{ t: 'DER HAKEN:', c: C.white, size: 135 }, { t: 'FAST ALLES OFFEN', c: C.white, size: 110, ribbon: RED }]]]);
        E.withT(ctx, 700, 1010, pop(lt, 0.3, 0.45), -0.05, () => { P.calendar(ctx, 0, 0, 1.0, '20??', '??'); });
        E.stamp(ctx, 'KEIN DATUM', 720, 1060, lt, 2.25, { size: 56, rot: -0.14 });
        panda(ctx, 'emotions/nachdenklich', lt, t, { x: 150, h: 420 });
      } },
    { // 38–45,75: Offene Fragen
      start: 38.0, mood: 'dark', poses: ['poses/analysieren'], ...TS('up'), focus: F,
      sfx: [WS(), ...flySfx(0.2, 0.3, 0.3), ...flySfx(1.2, -0.3, 0.3), ...flySfx(2.6, 0.3, 0.3), ...flySfx(4.2, -0.3, 0.3)],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DIE OFFENEN', c: C.white, size: 130 }, { t: 'FRAGEN', c: C.white, size: 140, ribbon: AMBER }]]]);
        panel(ctx, 700, 1010, 640, 560, pop(lt, 0.1, 0.5), { title: 'NOCH UNGEKLÄRT', body: (w, h) => {
          [['WER ZÄHLT ALS KIND?', 0.2, 'right'], ['ALLE UNTER 18?', 1.2, 'left'], ['AUCH OHNE US-PASS?', 2.6, 'right'], ['WIE KOMMT DIE AKTIE AN?', 4.2, 'left']].forEach(([txt, at, from], i) =>
            fly(ctx, 0, -h / 2 + 130 + i * 110, lt, at, from, () => qrow(ctx, txt, w - 60, [AMBER, ROSE, SKY, PURP][i]), { dist: 800, rot: 0.1 })); } });
        panda(ctx, 'poses/analysieren', lt, t, { x: 150, h: 420 });
      } },
    { // 45,75–50: gespannt, wer am Ende eine Aktie bekommt
      start: 45.75, mood: 'blue', poses: ['emotions/cool'], ...TS('right'), focus: F,
      sfx: [WS(), [0.4, 'pop', 0.3, 0], [1.6, 'swish', 0.25, 0.2], [3.2, 'ding', 0.3, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'WER BEKOMMT', c: C.white, size: 130 }, { t: 'AM ENDE EINE?', c: C.white, size: 120, ribbon: VIO }]]]);
        kids(ctx, 700, 880, lt, 0.3, 15, 5, 1.2);
        if (lt > 1.6) magnifier(ctx, lerp(560, 840, (Math.sin(t * 1.2) + 1) / 2), 960, 0.9 * pop(lt, 1.6, 0.4), t);
        panda(ctx, 'emotions/cool', lt, t, { x: 150, h: 420 });
      } },
    { // 50–54,25: Für dich – nur ein Versprechen auf X, keine Regelung
      start: 50.0, mood: 'bad', poses: ['poses/tipp_geben'], ...TS('zoom'), focus: F,
      sfx: [WS(), ...flySfx(0.4, -0.3, 0.3), ...flySfx(1.9, 0.3, 0.3), [3.75, 'stamp', 0.35, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'HEISST FÜR DICH:', c: C.white, size: 115 }, { t: 'NUR 1 VERSPRECHEN', c: C.white, size: 105, ribbon: AMBER }]], [3.75, [{ t: 'KEINE', c: C.white, size: 140 }, { t: 'REGELUNG', c: C.white, size: 135, ribbon: RED }]]]);
        fly(ctx, 560, 1000, lt, 0.4, 'left', () => panel(ctx, 0, 0, 280, 340, 1, { accent: SPX, title: 'POST AUF X', body: () => { bigNum(ctx, '𝕏', 0, 10, 130, C.white); } }));
        fly(ctx, 860, 1000, lt, 1.9, 'right', () => doc(ctx, 0, 0, 0.62, { title: 'REGELUNG', sign: 0 }));
        E.stamp(ctx, 'FEHLT', 850, 1020, lt, 3.7, { size: 40, rot: -0.14 });
        panda(ctx, 'poses/tipp_geben', lt, t, { x: 150, h: 420 });
      } },
    { // 54,25–60,75: jünger + US-Pass → vielleicht; oder nur mit Wohnsitz USA
      start: 54.25, mood: 'good', poses: ['emotions/augenzwinkern', 'poses/zeigen'], ...TS('up'), focus: F,
      sfx: [WS(), ...flySfx(0.4, -0.3, 0.3), ...flySfx(1.9, 0.3, 0.3), [3.3, 'pop', 0.35, 0], [3.5, 'ding', 0.3, 0], ...flySfx(4.4, 0.3, 0.3)],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'JÜNGER + US-PASS?', c: C.white, size: 115, ribbon: SKY }, { t: 'VIELLEICHT 1 AKTIE', c: C.white, size: 105 }]], [4.25, [{ t: 'ODER NUR MIT', c: C.white, size: 125 }, { t: 'WOHNSITZ USA?', c: C.white, size: 120, ribbon: ROSE }]]]);
        fly(ctx, 560, 960, lt, 0.4, 'left', () => panel(ctx, 0, 0, 280, 300, 1, { accent: SKY, title: 'UNTER 18', body: () => kids(ctx, 0, 30, 9, 0, 1, 1, 1.6) }));
        fly(ctx, 860, 960, lt, 1.9, 'right', () => panel(ctx, 0, 0, 280, 300, 1, { accent: BLUE, title: 'US-PASS', body: () => P.flagUS(ctx, -70, 0, 140, t) }));
        if (lt > 3.3 && lt < 4.4) gift(ctx, 710, 1250, 0.7 * pop(lt, 3.3, 0.45), t);
        if (lt > 4.4) fly(ctx, 710, 1250, lt, 4.4, 'up', () => chip(ctx, '🏠 WOHNSITZ USA?', 0, 0, ROSE, 1, 36));
        pandaSeq(ctx, [[0, 'emotions/augenzwinkern'], [4.25, 'poses/zeigen']], lt, t, { x: 150, h: 420 });
      } },
    { // 60,75–Ende: Was haltet ihr davon?
      start: 60.75, mood: 'blue', poses: ['emotions/freundlich'], ...TS('zoom', { transDur: 0.45 }), focus: F,
      sfx: [WS(-0.15, 0.28), [0.25, 'pop', 0.35, 0.2], [0.6, 'pop', 0.3, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'WAS HALTET', c: C.white, size: 130 }, { t: 'IHR DAVON?', c: C.white, size: 135, ribbon: TEAL }]]]);
        bubble(ctx, 700, 960, 560, 220, pop(lt, 0.1, 0.4), [['SCHREIB ES', '#0F172A', 42], ['IN DIE KOMMENTARE', '#0D9488', 44]]);
        panda(ctx, 'emotions/freundlich', lt, t, { x: 150, h: 420 });
      } },
  ];
  const music = { bpm: 94, chords: [['D', 'm'], ['B', 'b'], ['F', ''], ['C', '']], level: 0.45, abs: 0.09,
    sections: [[0, 'tension'], [5.25, 'pulse'], [17.5, 'full'], [24.75, 'pulse'], [34.5, 'tension'], [45.75, 'pulse'], [54.25, 'full']], drops: [] };
  window.VIDEO = { name: 'spacex-kinder-aktie', style: 'clean', fps: 30, duration: 61.98, scenes, captions, xfade: 0.35, grain: 0.03, bokeh: false, endFade: false, pandaFixed: true, music };
})();
