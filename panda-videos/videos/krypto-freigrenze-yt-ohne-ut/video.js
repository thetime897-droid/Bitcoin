// Krypto-Steuern: 1.000-€-Freigrenze – YouTube-Longform 1920×1080 (87,2 s), nativ fürs Querformat gestaltet.
// Layout: Panda unten links, Inhalts-Bühne rechts (x 560–1840, y 300–900), Untertitel unten (y≈1010), Headline oben mittig.
// Finanzgrafiken: Haltefrist-Zeitstrahl, Freigrenze-Entwicklung, Treppen-Diagramm Freigrenze vs. Freibetrag, Steuersatz-Kurve, Beispielrechnung, 3-Punkte-Tabelle, DAC8-Datenfluss.
(() => {
  const E = window.E, C = E.C, P = E.P, K = E.K;
  const { pop, prog, eOut, eInOut, lerp } = E;
  const { pandaSeq: pSeq, panda: pOne, H, ticks, sparks, glass, bigNum, label, tag, doc, pulseRings, fly, flySfx, warn, gov, magnifier } = K;
  const { GOLD, GRN, BLUE, CYAN, VIO, RED } = K.COL;
  const BTC = '#F7931A', EUB = '#1D4ED8';
  const PX = { x: 255, y: 1060, h: 610 };
  const panda = (ctx, pose, lt, t, o = {}) => pOne(ctx, pose, lt, t, { ...o, ...PX });
  const pandaSeq = (ctx, seq, lt, t, o = {}) => pSeq(ctx, seq, lt, t, { ...o, ...PX });
  const SW = (t = -0.2, g = 0.5) => [t, 'sweep', g, 0];
  const CX = 1200, CY = 610; // Mitte der Inhalts-Bühne

  // ---------- Bausteine ----------
  function btc(ctx, x, y, s, t) {
    if (s <= 0.001) return;
    E.withT(ctx, x, y, s, Math.sin(t * 1.5) * 0.08, () => {
      ctx.save(); ctx.shadowColor = BTC; ctx.shadowBlur = 50; ctx.beginPath(); ctx.arc(0, 0, 150, 0, 7);
      const g = ctx.createRadialGradient(-50, -50, 20, 0, 0, 160); g.addColorStop(0, '#FFD08A'); g.addColorStop(1, '#C26A00'); ctx.fillStyle = g; ctx.fill(); ctx.restore();
      ctx.beginPath(); ctx.arc(0, 0, 122, 0, 7); ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.stroke();
      E.plainText(ctx, '₿', 0, 10, 170, C.white, { weight: 900 });
    });
  }
  function panel(ctx, x, y, w, h, s, o = {}) { glass(ctx, x, y, w, h, { scale: s, r: 30, ...o }); }
  function axis(ctx, x0, y0, w, h, o = {}) { // dezentes Raster + Achsen
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 2;
    for (let i = 0; i <= (o.rows || 4); i++) { const y = y0 - h * i / (o.rows || 4); ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + w, y); ctx.stroke(); if (o.yl) E.plainText(ctx, o.yl[i] ?? '', x0 - 18, y, 22, 'rgba(255,255,255,0.5)', { weight: 800, align: 'right' }); }
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + w, y0); ctx.stroke(); ctx.restore();
  }
  function bar(ctx, x, by, w, h, col, p, txt, lab) {
    const hh = h * p; const g = ctx.createLinearGradient(0, by - hh, 0, by); g.addColorStop(0, col); g.addColorStop(1, E.shade(col, -0.45));
    ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 24 * p; E.rr(ctx, x - w / 2, by - hh, w, Math.max(1, hh), 14); ctx.fillStyle = g; ctx.fill(); ctx.restore();
    if (lab) label(ctx, lab, x, by + 34, 24);
    if (txt && p > 0.3) bigNum(ctx, txt, x, by - hh - 38, 44, C.white, Math.min(1, (p - 0.3) / 0.4));
  }
  function rowCheck(ctx, txt, res, ok, w) { E.rr(ctx, -w / 2, -44, w, 88, 24); ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = ok ? '#22C55E' : '#EF4444'; ctx.stroke();
    E.withT(ctx, -w / 2 + 50, 0, 1, 0, () => { ctx.beginPath(); ctx.arc(0, 0, 24, 0, 7); ctx.fillStyle = ok ? '#16A34A' : '#DC2626'; ctx.fill(); E.plainText(ctx, ok ? '✓' : '✕', 0, 2, 28, C.white, { weight: 900 }); });
    E.plainText(ctx, txt, -w / 2 + 96, 2, 32, C.white, { weight: 900, align: 'left' });
    E.rr(ctx, w / 2 - 250, -28, 226, 56, 28); ctx.fillStyle = ok ? 'rgba(34,197,94,0.22)' : 'rgba(239,68,68,0.22)'; ctx.fill();
    E.plainText(ctx, res, w / 2 - 137, 2, 26, ok ? '#4ADE80' : '#F87171', { weight: 900 }); }
  function stars(ctx, x, y, r, t, s = 1) { for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + t * 0.2; E.withT(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, s * 0.7, 0, () => { ctx.beginPath(); for (let k = 0; k < 10; k++) { const rr = k % 2 ? 9 : 22, aa = k * Math.PI / 5 - Math.PI / 2; ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } ctx.closePath(); ctx.fillStyle = GOLD; ctx.fill(); }); } }
  function kpi(ctx, x, y, w, h, s, title, val, col, sub) { panel(ctx, x, y, w, h, s, { accent: col, title, body: () => { bigNum(ctx, val, 0, 10, Math.min(110, w * 0.26), col === GRN ? '#4ADE80' : col === RED ? '#F87171' : C.white); if (sub) label(ctx, sub, 0, h / 2 - 40, 22); } }); }
  // Haltefrist-Zeitstrahl: 12 Monate, Marker wandert
  function holdLine(ctx, x0, y, w, lt, at, m, o = {}) {
    const p = eOut(prog(lt, at, 0.7)); ctx.save(); ctx.globalAlpha = p;
    E.rr(ctx, x0, y - 10, w, 20, 10); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
    const mp = Math.min(1, m / 12); const g = ctx.createLinearGradient(x0, 0, x0 + w, 0); g.addColorStop(0, '#F59E0B'); g.addColorStop(1, '#22C55E');
    E.rr(ctx, x0, y - 10, w * mp, 20, 10); ctx.fillStyle = g; ctx.fill();
    for (let i = 0; i <= 12; i += 3) { const x = x0 + w * i / 12; ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x - 2, y + 18, 4, 16); label(ctx, i === 12 ? '12 M.' : `${i}`, x, y + 56, 24); }
    E.withT(ctx, x0 + w * mp, y, 1, 0, () => { ctx.save(); ctx.shadowColor = C.white; ctx.shadowBlur = 20; ctx.beginPath(); ctx.arc(0, 0, 22, 0, 7); ctx.fillStyle = C.white; ctx.fill(); ctx.restore(); if (o.flag) tag(ctx, o.flag, 0, -62, o.flagCol || '#334155', 1); });
    ctx.restore();
  }

  const captions = [[0.2, 1.24, "Kryptos steuerfrei verkaufen,"], [1.24, 2.56, "auch vor Ablauf der 1-Jahresfrist,"], [2.56, 3.79, "das klingt nach einem Steuertrick,"], [3.79, 4.4, "der zu gut ist,"], [4.4, 5.21, "um wahr zu sein,"], [5.21, 6.2, "ist er aber nicht."], [6.2, 7.93, "Du kannst nämlich Kryptogewinne"], [7.93, 9.6, "komplett steuerfrei behalten,"], [9.6, 10.9, "ohne ein Jahr dafür warten"], [10.9, 11.6, "zu müssen."], [11.6, 13.2, "Es gibt nämlich eine Freigrenze:"], [13.2, 14.62, "Bleibt dein gesamter Gewinn"], [14.62, 15.95, "aus privaten Verkäufen im"], [15.95, 17.2, "Jahr unter 1.000 €,"], [17.2, 17.9, "zahlst du nichts,"], [17.9, 19.3, "null, auch wenn du erst vor"], [19.3, 20.9, "2 Monaten investiert hast."], [20.9, 22.0, "Und jetzt der Teil,"], [22.0, 23.15, "bei dem ich beim ersten Lesen"], [23.15, 24.37, "ehrlich gesagt zweimal hingucken"], [24.37, 25.92, "musste. Das ist nämlich eine"], [25.92, 26.6, "Freigrenze,"], [26.6, 27.4, "kein Freibetrag."], [27.4, 28.7, "Riesiger Unterschied:"], [28.7, 30.25, "Bei 999 € Gewinn nichts zu"], [30.25, 32.24, "zahlen, bei 1.001 € der komplette"], [32.24, 33.8, "Betrag wird steuerpflichtig,"], [33.8, 35.53, "nicht der eine Euro drüber,"], [35.53, 36.48, "sondern alles,"], [36.48, 38.13, "und das wird versteuert mit"], [38.13, 40.7, "deinem persönlichen Einkommenssteuersatz."], [40.7, 42.22, "Kurz zum Mitschreiben:"], [42.22, 43.8, "Nach einem Jahr gehalten,"], [43.8, 44.6, "immer steuerfrei,"], [44.6, 45.3, "egal wie viel;"], [45.3, 46.22, "vorher verkauft,"], [46.22, 47.56, "unter 1.000 € Gewinn,"], [47.56, 48.6, "auch steuerfrei;"], [48.6, 49.71, "vorher verkauft und drüber,"], [49.71, 50.9, "der ganze Betrag ist dran."], [50.9, 51.74, "Heißt für dich:"], [51.74, 52.9, "Verkaufst du ab und zu mal"], [52.9, 53.58, "etwas Kleines,"], [53.58, 55.0, "kannst du das bewusst nutzen;"], [55.0, 56.01, "handelst du öfter,"], [56.01, 57.4, "würde ich mich nicht darauf"], [57.4, 58.0, "verlassen,"], [58.0, 59.9, "lieber sauber dokumentieren,"], [59.9, 60.99, "zumal das Finanzamt durch"], [60.99, 62.07, "die neue EU-Meldepflichten"], [62.07, 63.12, "seit diesem Jahr sowieso"], [63.12, 63.63, "mitkriegt,"], [63.63, 64.7, "dass gehandelt wurde."]];

  const HC = { hard: true, punchAmt: 0.04, flashAmt: 0.12 };
  const TS = (dir, extra = {}) => ({ trans: dir, transDur: 0.6, punchAmt: 0.03, flashAmt: 0.0, zoom: 0.03, ...extra });
  const F = { x: CX, y: CY };
  const scenes = [
    // ===== Intro 0–17,2 =====
    { start: 0, mood: 'good', poses: ['emotions/begeistert'], punch: false, noBrand: true, ...HC, focus: F,
      sfx: [[0.0, 'impact', 0.45, 0], [0.05, 'ping', 0.45, 0], ...flySfx(0.2, 0.3), [0.9, 'cash', 0.45, 0.3], ...flySfx(1.2, -0.2), ...flySfx(1.45, 0.2), ...flySfx(1.7, 0.5)],
      draw(ctx, lt, t) {
        E.liveBar(ctx, lt, 'KRYPTO & STEUERN  •  1.000 € FREIGRENZE  •  § 23 ESTG  •  HALTEFRIST 1 JAHR  •  DAC8 SEIT 2026  •  ');
        E.headline(ctx, [{ t: 'KRYPTO STEUERFREI?', c: C.white, size: 120, ribbon: BTC }], lt, { y: 480, delay: 0.05 });
        fly(ctx, 830, 640, lt, 0.2, 'up', () => btc(ctx, 0, 0, 1.15, t), { rot: 0.8 });
        sparks(ctx, 830, 640, lt, 0.9, 24, GOLD);
        [['1 JAHR', 'HALTEFRIST', 1.2, BLUE], ['1.000 €', 'FREIGRENZE', 1.45, GRN], ['+1 €', 'GRENZE KIPPT', 1.7, RED]].forEach(([v, s2, at, col], i) =>
          fly(ctx, 1460, 420 + i * 180, lt, at, 'right', () => panel(ctx, 0, 0, 420, 150, 1, { accent: col, body: () => { bigNum(ctx, v, -80, 4, 60, C.white); label(ctx, s2, 110, 4, 24, 'rgba(255,255,255,0.8)'); } })));
        panda(ctx, 'emotions/begeistert', lt, t);
      } },
    { start: 2.17, mood: 'blue', poses: ['poses/zeigen'], ...TS('left'), focus: F,
      sfx: [SW(), [0.4, 'pop', 0.4, 0], ...ticks(0.8, 1.9, 8, 0.35, 0.2), [2.0, 'snap', 0.45, 0.3]],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'AUCH VOR', c: C.white, size: 130 }, { t: 'ABLAUF DER HALTEFRIST?', c: C.white, size: 100, ribbon: BLUE }], lt);
        panel(ctx, CX, 640, 1180, 340, pop(lt, 0.2, 0.5), { title: 'HALTEFRIST · § 23 ESTG', body: () => {} });
        holdLine(ctx, CX - 480, 680, 960, lt, 0.3, lerp(0, 7, eOut(prog(lt, 0.8, 1.2))), { flag: 'VERKAUF NACH 7 M.?', flagCol: '#F59E0B' });
        panda(ctx, 'poses/zeigen', lt, t, { enter: false, swapAt: 0 });
      } },
    { start: 4.61, mood: 'dark', poses: ['emotions/augenzwinkern'], ...TS('zoom'), focus: F,
      sfx: [SW(), [0.3, 'swell', 0.35, 0], [0.4, 'ding', 0.4, 0.2], ...flySfx(1.3, -0.3), ...flySfx(1.7, 0.3), [2.4, 'glitch', 0.25, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'KLINGT NACH', c: C.white, size: 130 }, { t: 'STEUERTRICK', c: C.white, size: 130, ribbon: VIO }]], [2.3, [{ t: 'ZU GUT, UM', c: C.white, size: 130 }, { t: 'WAHR ZU SEIN?', c: GOLD, size: 120 }]]]);
        E.withT(ctx, CX, 620, pop(lt, 0.2, 0.45), 0, () => { pulseRings(ctx, 0, 0, t, '#A78BFA', 3, 220); bigNum(ctx, '✨', 0, 20, 200, GOLD); });
        fly(ctx, CX - 400, 560, lt, 1.3, 'left', () => tag(ctx, 'TRICK?', 0, 0, VIO, 1.5));
        fly(ctx, CX + 400, 700, lt, 1.7, 'right', () => tag(ctx, 'LEGAL?', 0, 0, VIO, 1.5));
        panda(ctx, 'emotions/augenzwinkern', lt, t, { enter: false, swapAt: 0 });
      } },
    { start: 8.01, mood: 'good', poses: ['poses/tipp_geben'], ...TS('right'), focus: F, shake: [1.25], shakeSfx: 'stamp',
      sfx: [SW(), ...flySfx(0.15, 0.3), [1.35, 'ding', 0.45, 0.2], ...flySfx(1.8, 0.4)],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'IST ER', c: C.white, size: 140 }, { t: 'ABER NICHT!', c: C.white, size: 135, ribbon: GRN }]]]);
        fly(ctx, 1000, 640, lt, 0.15, 'right', () => doc(ctx, 0, 0, 0.82, { title: '§ 23 ESTG', sign: 1 }), { rot: 0.3 });
        E.stamp(ctx, 'GESETZ ✓', 1000, 670, lt, 1.2, { size: 58, rot: -0.14, color: '#16A34A' });
        fly(ctx, 1480, 640, lt, 1.8, 'right', () => panel(ctx, 0, 0, 440, 300, 1, { accent: GRN, title: 'PRIVATE VERÄUSSERUNG', body: () => { label(ctx, 'KRYPTO = „ANDERES', 0, -20, 28, C.white); label(ctx, 'WIRTSCHAFTSGUT“', 0, 24, 28, C.white); label(ctx, '§ 23 ABS. 1 NR. 2 ESTG', 0, 90, 20); } }));
        panda(ctx, 'poses/tipp_geben', lt, t, { enter: false, swapAt: 0 });
      } },
    { start: 10.66, mood: 'good', poses: ['emotions/begeistert'], ...TS('up'), focus: F,
      sfx: [SW(), ...flySfx(0.2, -0.3), ...ticks(1.0, 2.6, 9, 0.4, 0.2), [2.65, 'cash', 0.5, 0.2], ...flySfx(2.9, 0.4)],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'GEWINNE KOMPLETT', c: C.white, size: 110 }, { t: 'STEUERFREI', c: C.white, size: 135, ribbon: GRN }]]]);
        const v = lerp(0, 999, eOut(prog(lt, 1.0, 1.6)));
        fly(ctx, 980, 640, lt, 0.2, 'left', () => kpi(ctx, 0, 0, 560, 340, 1, 'DEIN KRYPTO-GEWINN', `+${Math.round(v)} €`, GRN, 'IM KALENDERJAHR'));
        fly(ctx, 1500, 640, lt, 2.9, 'right', () => kpi(ctx, 0, 0, 380, 340, 1, 'STEUER', '0 €', GRN, 'FREIGRENZE GENUTZT'));
        sparks(ctx, 980, 640, lt, 2.65, 24, '#4ADE80');
        panda(ctx, 'emotions/begeistert', lt, t, { enter: false, swapAt: 0 });
      } },
    { start: 14.55, mood: 'blue', poses: ['emotions/cool'], ...TS('zoom'), focus: F,
      sfx: [SW(), [0.3, 'pop', 0.4, 0.2], [1.3, 'snap', 0.45, 0.2], [1.35, 'glitch', 0.25, 0.2]],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'OHNE 1 JAHR', c: C.white, size: 130 }, { t: 'ZU WARTEN', c: C.white, size: 135, ribbon: BLUE }], lt);
        E.withT(ctx, CX, 640, pop(lt, 0.2, 0.45), 0, () => { P.hourglass(ctx, 0, 0, 300, t); const c = eOut(prog(lt, 1.3, 0.3)); if (c > 0) { ctx.save(); ctx.globalAlpha = c; ctx.strokeStyle = RED; ctx.lineWidth = 20; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-150, -170); ctx.lineTo(150, 170); ctx.stroke(); ctx.restore(); } });
        panda(ctx, 'emotions/cool', lt, t, { enter: false, swapAt: 0 });
      } },

    // ===== Erklärteil =====
    { // 17,2–24,98: Freigrenze – Entwicklung 600 € → 1.000 € + „alle Verkäufe zusammen“
      start: 17.2, mood: 'blue', poses: ['poses/praesentieren'], ...TS('right'), focus: F,
      sfx: [SW(), [0.4, 'swell', 0.35, 0], [0.5, 'ding', 0.4, 0.2], [2.6, 'pop', 0.4, -0.2], ...ticks(3.2, 4.4, 8, 0.4, 0.2), [4.45, 'cash', 0.5, 0.2], ...flySfx(5.0, 0.4), ...flySfx(5.4, 0.4), ...flySfx(5.8, 0.4)],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DIE', c: C.white, size: 130 }, { t: 'FREIGRENZE', c: C.white, size: 140, ribbon: GRN }]], [2.5, [{ t: 'GEWINN PRO JAHR', c: C.white, size: 110 }, { t: 'UNTER 1.000 €', c: C.white, size: 125, ribbon: GRN }]]]);
        panel(ctx, 960, 640, 640, 520, pop(lt, 0.2, 0.5), { title: 'FREIGRENZE § 23 ESTG', body: () => {} });
        axis(ctx, 720, 830, 480, 290, { rows: 4, yl: ['0', '250', '500', '750', '1.000'] });
        bar(ctx, 850, 830, 150, 290, '#64748B', 0.6 * eOut(prog(lt, 2.6, 0.8)), '600 €', 'BIS 2023');
        bar(ctx, 1070, 830, 150, 290, '#22C55E', eOut(prog(lt, 3.2, 1.1)), '1.000 €', 'SEIT 2024');
        [['BTC-VERKAUF', '+420 €', 5.0], ['ETH-VERKAUF', '+310 €', 5.4], ['GOLD / ANDERES', '+150 €', 5.8]].forEach(([n, v, at], i) => fly(ctx, 1560, 470 + i * 120, lt, at, 'right', () => { E.rr(ctx, -230, -46, 460, 92, 22); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill(); E.plainText(ctx, n, -205, 2, 26, C.white, { weight: 900, align: 'left' }); E.plainText(ctx, v, 205, 2, 30, '#4ADE80', { weight: 900, align: 'right' }); }));
        if (lt > 6.4) tag(ctx, 'Σ 880 € → ALLE PRIVATEN VERKÄUFE ZUSAMMEN', 1560, 830, BLUE, pop(lt, 6.4, 0.4));
        panda(ctx, 'poses/praesentieren', lt, t);
      } },
    { // 24,98–30,65: 0 € Steuer – Haltedauer egal (2 Monate)
      start: 24.98, mood: 'good', poses: ['emotions/begeistert'], ...TS('left'), focus: F,
      sfx: [SW(), [0.2, 'impact', 0.35, 0], [0.3, 'ping', 0.5, 0.2], [2.6, 'pop', 0.4, 0.3], ...ticks(2.9, 3.8, 6, 0.35, 0.3), [3.9, 'snap', 0.4, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DU ZAHLST:', c: C.white, size: 135 }, { t: '0 €', c: '#4ADE80', size: 190 }]], [2.5, [{ t: 'AUCH NACH NUR', c: C.white, size: 120 }, { t: '2 MONATEN', c: C.white, size: 135, ribbon: BLUE }]]]);
        kpi(ctx, 820, 640, 420, 360, pop(lt, 0.15, 0.45), 'STEUER', '0 €', GRN, 'GEWINN < 1.000 €');
        panel(ctx, 1450, 640, 700, 360, pop(lt, 2.5, 0.5), { title: 'HALTEDAUER', body: () => {} });
        if (lt > 2.5) holdLine(ctx, 1170, 670, 560, lt, 2.6, lerp(0, 2, eOut(prog(lt, 2.9, 0.9))), { flag: '2 M. → TROTZDEM FREI', flagCol: GRN });
        sparks(ctx, 820, 640, lt, 0.3, 22, '#4ADE80');
        panda(ctx, 'emotions/begeistert', lt, t);
      } },
    { // 30,65–37,37: zweimal hinschauen
      start: 30.65, mood: 'dark', poses: ['emotions/ueberrascht'], ...TS('zoom'), focus: F,
      sfx: [SW(), ...flySfx(0.3, 0.2), [2.2, 'swish', 0.45, 0.3], [2.6, 'pop', 0.4, 0.3], [3.6, 'swish', 0.45, -0.3], [4.0, 'pop', 0.4, -0.3], [5.4, 'ping', 0.45, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'JETZT DER TEIL,', c: C.white, size: 115 }, { t: 'DER ÜBERRASCHT', c: C.white, size: 110, ribbon: VIO }]], [3.0, [{ t: 'ZWEIMAL', c: C.white, size: 140 }, { t: 'HINSCHAUEN!', c: GOLD, size: 130 }]]]);
        fly(ctx, CX, 650, lt, 0.3, 'up', () => doc(ctx, 0, 0, 0.85, { title: 'KLEINGEDRUCKT', sign: 0 }), { rot: 0.2 });
        const mx = lt < 3.6 ? lerp(CX - 120, CX + 120, eInOut(prog(lt, 2.2, 0.6))) : lerp(CX + 120, CX - 60, eInOut(prog(lt, 3.6, 0.6)));
        if (lt > 2.2) magnifier(ctx, mx, 600, 0.95 * pop(lt, 2.2, 0.35), t);
        if (lt > 5.4) tag(ctx, '„FREIGRENZE“', CX + 330, 470, VIO, 1.3 * pop(lt, 5.4, 0.35));
        panda(ctx, 'emotions/ueberrascht', lt, t);
      } },
    { // 37,37–40,7: Freigrenze vs. Freibetrag – Treppen-Diagramm
      start: 37.37, mood: 'bad', poses: ['poses/tipp_geben'], ...TS('up'), focus: F,
      sfx: [SW(), ...flySfx(0.1, -0.3), ...flySfx(0.85, 0.3), [1.6, 'impact', 0.4, 0], [1.65, 'snap', 0.45, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'FREIGRENZE', c: C.white, size: 130, ribbon: GRN }, { t: '≠ FREIBETRAG', c: C.white, size: 125, ribbon: RED }]], [1.75, [{ t: 'RIESIGER UNTERSCHIED!', c: GOLD, size: 115 }]]]);
        const draw = (x, title, col, step, at) => fly(ctx, x, 650, lt, at, x < CX ? 'left' : 'right', () => panel(ctx, 0, 0, 600, 460, 1, { accent: col, title, body: () => {
          const x0 = -240, y0 = 170, w = 480, h = 220; axis(ctx, x0, y0, w, h, { rows: 3 });
          label(ctx, 'GEWINN →', x0 + w - 60, y0 + 40, 20); label(ctx, 'STEUERPFL. ↑', x0 + 60, y0 - h - 26, 20);
          const p = eOut(prog(lt, at + 0.4, 0.9)); ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 8; ctx.lineJoin = 'round'; ctx.shadowColor = col; ctx.shadowBlur = 16; ctx.beginPath();
          for (let i = 0; i <= 60 * p; i++) { const u = i / 60, gx = x0 + w * u, g = u * 2000, yv = step ? (g > 1000 ? g : 0) : Math.max(0, g - 1000); const yy = y0 - h * yv / 2000; i ? ctx.lineTo(gx, yy) : ctx.moveTo(gx, yy); } ctx.stroke(); ctx.restore();
          ctx.setLineDash([8, 8]); ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 + w / 2, y0); ctx.lineTo(x0 + w / 2, y0 - h); ctx.stroke(); ctx.setLineDash([]); label(ctx, '1.000 €', x0 + w / 2, y0 + 30, 20);
          label(ctx, step ? 'ÜBER 1.000 € → ALLES' : 'NUR DER TEIL DARÜBER', 0, -135, 24, C.white); } }));
        draw(905, 'FREIGRENZE (KRYPTO)', RED, true, 0.1); draw(1530, 'FREIBETRAG (Z. B. SPARER)', '#64748B', false, 0.85);
        panda(ctx, 'poses/tipp_geben', lt, t);
      } },
    { // 40,7–47,36: 999 € vs. 1.001 €
      start: 40.7, mood: 'bad', poses: ['poses/analysieren', 'emotions/ueberrascht'], ...TS('right'), focus: F, shake: [4.5], shakeSfx: 'stamp',
      sfx: [SW(), [0.3, 'pop', 0.4, -0.3], ...ticks(0.5, 1.7, 8, 0.4, -0.3), [1.75, 'ding', 0.4, -0.3], [2.6, 'riser', 0.35, 0.3], [3.0, 'pop', 0.45, 0.3], [3.05, 'sub', 0.35, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: '999 € GEWINN:', c: C.white, size: 120 }, { t: '0 € STEUER', c: C.white, size: 130, ribbon: GRN }]], [2.9, [{ t: '1.001 €:', c: C.white, size: 140 }, { t: 'ALLES STEUERPFLICHTIG', c: C.white, size: 90, ribbon: RED }]]]);
        panel(ctx, 900, 640, 640, 520, pop(lt, 0.15, 0.5), { title: 'STEUERPFLICHTIGER GEWINN', body: () => {} });
        axis(ctx, 660, 830, 480, 290, { rows: 4, yl: ['0', '250', '500', '750', '1.000'] });
        bar(ctx, 790, 830, 150, 290, '#22C55E', 0.02, '0 €', '999 € GEWINN');
        bar(ctx, 1010, 830, 150, 290, '#EF4444', eOut(prog(lt, 3.0, 0.9)), '1.001 €', '1.001 € GEWINN');
        fly(ctx, 1510, 520, lt, 0.4, 'right', () => kpi(ctx, 0, 0, 440, 190, 1, '999 € GEWINN', '0 €', GRN, 'UNTER DER GRENZE'));
        if (lt > 2.9) fly(ctx, 1510, 760, lt, 3.0, 'right', () => kpi(ctx, 0, 0, 440, 190, 1, '1.001 € GEWINN', '1.001 €', RED, 'KOMPLETT ZU VERSTEUERN'));
        E.stamp(ctx, 'STEUERPFLICHTIG', 1010, 600, lt, 4.45, { size: 44, rot: -0.14 });
        pandaSeq(ctx, [[0, 'poses/analysieren'], [2.9, 'emotions/ueberrascht']], lt, t);
      } },
    { // 47,36–55,25: nicht 1 €, sondern alles – persönlicher Steuersatz + Beispielrechnung
      start: 47.36, mood: 'dark', poses: ['poses/zeigen', 'poses/analysieren'], ...TS('zoom'), focus: F,
      sfx: [SW(), ...flySfx(0.2, -0.3), [2.0, 'impact', 0.4, 0.2], [2.05, 'cash', 0.45, 0.2], [3.1, 'swell', 0.3, 0], ...ticks(3.6, 5.0, 9, 0.35, 0.2), [5.1, 'ding', 0.45, 0.2], ...flySfx(5.6, 0.4), [6.4, 'cash', 0.45, 0.4]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'NICHT NUR DER', c: C.white, size: 125 }, { t: '1 € DRÜBER', c: C.white, size: 130, ribbon: GOLD }]], [2.0, [{ t: 'SONDERN', c: C.white, size: 135 }, { t: 'ALLES!', c: C.white, size: 160, ribbon: RED }]], [3.1, [{ t: 'PERSÖNLICHER', c: C.white, size: 125 }, { t: 'STEUERSATZ', c: C.white, size: 135, ribbon: VIO }]]]);
        if (lt < 3.1) fly(ctx, CX, 640, lt, 0.2, 'left', () => panel(ctx, 0, 0, 900, 340, 1, { accent: RED, title: 'STEUERPFLICHTIG BEI 1.001 € GEWINN', body: () => {
          const all = eOut(prog(lt, 2.0, 0.5)); E.rr(ctx, -380, -40, 760, 80, 18); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill();
          E.rr(ctx, all > 0 ? -380 : 360, -40, all > 0 ? 760 * all : 20, 80, 18); ctx.fillStyle = '#EF4444'; ctx.fill();
          label(ctx, all > 0.5 ? 'ALLE 1.001 €' : 'NUR 1 €?', 0, 100, 34, C.white); } }));
        else {
          panel(ctx, 960, 640, 700, 500, pop(lt, 3.1, 0.5), { title: 'EINKOMMENSTEUER-SATZ', body: () => {} });
          const x0 = 680, y0 = 830, w = 560, h = 320; axis(ctx, x0, y0, w, h, { rows: 3, yl: ['0 %', '15 %', '30 %', '45 %'] });
          const p = eOut(prog(lt, 3.6, 1.4)); ctx.save(); ctx.strokeStyle = VIO; ctx.lineWidth = 7; ctx.shadowColor = VIO; ctx.shadowBlur = 14; ctx.beginPath();
          for (let i = 0; i <= 80 * p; i++) { const u = i / 80; const r = u < 0.08 ? 0 : u < 0.25 ? lerp(14, 24, (u - 0.08) / 0.17) : u < 0.55 ? lerp(24, 42, (u - 0.25) / 0.3) : u < 0.85 ? 42 : 45; const xx = x0 + w * u, yy = y0 - h * r / 45; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); ctx.restore();
          label(ctx, 'ZU VERSTEUERNDES EINKOMMEN →', x0 + w / 2, y0 + 36, 20); label(ctx, '14 %', x0 + w * 0.1, y0 - h * 14 / 45 - 24, 22, C.white); label(ctx, '42 %', x0 + w * 0.6, y0 - h * 42 / 45 - 24, 22, C.white); label(ctx, '45 %', x0 + w * 0.92, y0 - h - 24, 22, C.white);
          fly(ctx, 1560, 640, lt, 5.6, 'right', () => panel(ctx, 0, 0, 440, 420, 1, { accent: GOLD, title: 'BEISPIEL', body: () => {
            [['GEWINN', '1.001 €'], ['STEUERSATZ', '30 %'], ['STEUER ≈', '300 €']].forEach(([a, b], i) => { E.plainText(ctx, a, -180, -80 + i * 80, 28, 'rgba(255,255,255,0.75)', { weight: 800, align: 'left' }); E.plainText(ctx, b, 180, -80 + i * 80, 34, i === 2 ? '#F87171' : C.white, { weight: 900, align: 'right' }); });
            ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(-180, 40, 360, 3); label(ctx, '+ SOLI / KIRCHENSTEUER', 0, 150, 18); } }));
        }
        pandaSeq(ctx, [[0, 'poses/zeigen'], [3.1, 'poses/analysieren']], lt, t);
      } },
    { // 55,25–67,5: zum Mitschreiben – Tabelle
      start: 55.25, mood: 'blue', poses: ['poses/praesentieren', 'poses/tipp_geben'], ...TS('up', { transDur: 0.65 }), focus: F,
      sfx: [SW(), [0.3, 'paper', 0.35, 0.2], ...flySfx(1.5, 0.3), [2.1, 'ding', 0.4, 0.3], ...flySfx(5.2, -0.3), [5.8, 'ding', 0.4, -0.3], ...flySfx(8.85, 0.3), [9.5, 'stamp', 0.45, 0.3], [9.55, 'down', 0.3, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'ZUM MITSCHREIBEN', c: C.white, size: 120, ribbon: BLUE }]], [1.5, [{ t: 'NACH 1 JAHR:', c: C.white, size: 125 }, { t: 'IMMER STEUERFREI', c: '#4ADE80', size: 110 }]], [5.2, [{ t: 'VORHER & < 1.000 €:', c: C.white, size: 105 }, { t: 'AUCH STEUERFREI', c: '#4ADE80', size: 110 }]], [8.85, [{ t: 'VORHER & > 1.000 €:', c: C.white, size: 105 }, { t: 'GANZER BETRAG', c: C.white, size: 120, ribbon: RED }]]]);
        panel(ctx, CX, 650, 1240, 520, pop(lt, 0.2, 0.5), { title: 'KRYPTO-STEUER-CHECK (PRIVAT)', body: (w, h) => {
          E.plainText(ctx, 'SITUATION', -w / 2 + 96, -h / 2 + 96, 22, 'rgba(255,255,255,0.5)', { weight: 800, align: 'left' }); E.plainText(ctx, 'ERGEBNIS', w / 2 - 167, -h / 2 + 96, 22, 'rgba(255,255,255,0.5)', { weight: 800 });
          [['HALTEDAUER ÜBER 1 JAHR · EGAL WIE VIEL', 'STEUERFREI', true, 1.5, 'right'], ['UNTER 1 JAHR · GEWINN UNTER 1.000 €', 'STEUERFREI', true, 5.2, 'left'], ['UNTER 1 JAHR · GEWINN AB 1.000 €', 'GANZER BETRAG', false, 8.85, 'right']].forEach(([txt, res, ok, at, from], i) =>
            fly(ctx, 0, -h / 2 + 170 + i * 115, lt, at, from, () => rowCheck(ctx, txt, res, ok, w - 70), { dist: 900, rot: 0.08 }));
        } });
        pandaSeq(ctx, [[0, 'poses/praesentieren'], [8.85, 'poses/tipp_geben']], lt, t);
      } },
    { // 67,5–74,2: kleine Verkäufe bewusst nutzen
      start: 67.5, mood: 'good', poses: ['poses/tipp_geben', 'emotions/augenzwinkern'], ...TS('left'), focus: F,
      sfx: [SW(), [0.3, 'pop', 0.4, 0.2], ...flySfx(1.6, -0.3), ...flySfx(2.3, 0.1), ...flySfx(3.0, 0.4), ...ticks(3.6, 4.4, 6, 0.35, 0.2), [4.6, 'ding', 0.45, 0.2], [4.65, 'cash', 0.4, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'HEISST FÜR DICH:', c: C.white, size: 115 }, { t: 'KLEINE VERKÄUFE', c: C.white, size: 110, ribbon: GRN }]], [4.5, [{ t: 'BEWUSST', c: C.white, size: 140 }, { t: 'NUTZEN', c: '#4ADE80', size: 150 }]]]);
        [[820, 1.6, 'left', '+250 €', 'MÄRZ'], [1120, 2.3, 'up', '+300 €', 'JULI'], [1420, 3.0, 'right', '+400 €', 'NOV.']].forEach(([x, at, from, v, m]) => fly(ctx, x, 560, lt, at, from, () => panel(ctx, 0, 0, 260, 300, 1, { accent: GRN, title: m, body: () => { btc(ctx, 0, -10, 0.42, t); bigNum(ctx, v, 0, 100, 44, '#4ADE80'); } })));
        const sum = Math.round(lerp(0, 950, eOut(prog(lt, 3.6, 0.9))));
        if (lt > 3.5) panel(ctx, 1120, 830, 860, 120, pop(lt, 3.5, 0.4), { accent: GRN, body: () => E.plainText(ctx, `JAHRESSUMME ${sum} € → STEUERFREI ✓`, 0, 4, 40, '#4ADE80', { weight: 900 }) });
        pandaSeq(ctx, [[0, 'poses/tipp_geben'], [4.5, 'emotions/augenzwinkern']], lt, t);
      } },
    { // 74,2–79,63: öfter handeln – sauber dokumentieren
      start: 74.2, mood: 'neutral', poses: ['poses/analysieren'], ...TS('right'), focus: F,
      sfx: [SW(), [0.3, 'glitch', 0.25, 0.2], [0.5, 'pop', 0.4, 0.2], ...flySfx(3.65, 0.3), [4.0, 'paper', 0.35, 0.3], [4.3, 'tick', 0.4, 0.3], [4.6, 'tick', 0.4, 0.3], [4.9, 'tick', 0.4, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'HANDELST DU', c: C.white, size: 130 }, { t: 'ÖFTER?', c: C.white, size: 150, ribbon: '#F59E0B' }]], [3.6, [{ t: 'SAUBER', c: C.white, size: 140 }, { t: 'DOKUMENTIEREN', c: C.white, size: 115, ribbon: BLUE }]]]);
        if (lt < 3.6) { warn(ctx, CX, 640, pop(lt, 0.4, 0.45) * 0.9, t); }
        else fly(ctx, CX, 650, lt, 3.65, 'right', () => panel(ctx, 0, 0, 1100, 400, 1, { accent: BLUE, title: 'TRADE-PROTOKOLL', body: (w, h) => {
          const cols = ['DATUM', 'COIN', 'KAUF', 'VERKAUF', 'GEWINN']; cols.forEach((c, i) => E.plainText(ctx, c, -w / 2 + 80 + i * 210, -h / 2 + 100, 22, 'rgba(255,255,255,0.55)', { weight: 800, align: 'left' }));
          [['03.02.', 'BTC', '1.200 €', '1.480 €', '+280 €'], ['17.05.', 'ETH', '900 €', '1.050 €', '+150 €'], ['09.09.', 'SOL', '400 €', '360 €', '–40 €']].forEach((r, ri) => { const s = pop(lt, 4.2 + ri * 0.3, 0.3); if (s <= 0) return; E.withT(ctx, 0, -h / 2 + 170 + ri * 78, s, 0, () => { E.rr(ctx, -w / 2 + 40, -30, w - 80, 60, 14); ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fill();
            r.forEach((c, i) => E.plainText(ctx, c, -w / 2 + 80 + i * 210, 2, 28, i === 4 ? (c[0] === '+' ? '#4ADE80' : '#F87171') : C.white, { weight: 900, align: 'left' })); }); });
        } }));
        panda(ctx, 'poses/analysieren', lt, t);
      } },
    { // 79,63–Ende: Finanzamt + DAC8 – Datenfluss Börse → Behörde
      start: 79.63, mood: 'blue', poses: ['emotions/nachdenklich', 'poses/tipp_geben'], ...TS('zoom'), focus: F,
      sfx: [SW(), ...flySfx(0.3, -0.3), ...flySfx(0.9, 0.4), [1.6, 'swell', 0.35, 0], [1.7, 'ding', 0.4, 0], [2.6, 'signal', 0.3, 0.2], [4.4, 'stamp', 0.4, 0.2], [5.4, 'pop', 0.4, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DAS FINANZAMT', c: C.white, size: 120 }, { t: 'WEISS BESCHEID', c: C.white, size: 115, ribbon: EUB }]], [3.1, [{ t: 'EU-MELDEPFLICHT DAC8', c: C.white, size: 100, ribbon: EUB }, { t: 'SEIT 2026', c: GOLD, size: 120 }]]]);
        fly(ctx, 820, 640, lt, 0.3, 'left', () => panel(ctx, 0, 0, 380, 320, 1, { accent: BTC, title: 'KRYPTO-BÖRSE', body: () => { btc(ctx, 0, 10, 0.55, t); } }));
        fly(ctx, 1580, 700, lt, 0.9, 'right', () => gov(ctx, 0, 140, 340, t), { dist: 900 });
        if (lt > 1.6) stars(ctx, 1200, 520, 110, t, pop(lt, 1.6, 0.5));
        if (lt > 2.6) { const p = (t * 0.8) % 1; for (let k = 0; k < 4; k++) { const q = (p + k / 4) % 1; E.withT(ctx, lerp(1020, 1400, q), 640 + Math.sin(q * Math.PI) * -40, 1, 0, () => { E.rr(ctx, -34, -24, 68, 48, 8); ctx.fillStyle = '#E2E8F0'; ctx.fill(); ctx.fillStyle = '#64748B'; ctx.fillRect(-22, -8, 44, 4); ctx.fillRect(-22, 4, 30, 4); }); } }
        if (lt > 4.4) tag(ctx, 'TRANSAKTIONEN WERDEN GEMELDET', CX, 880, EUB, 1.2 * pop(lt, 4.4, 0.4));
        pandaSeq(ctx, [[0, 'emotions/nachdenklich'], [3.1, 'poses/tipp_geben']], lt, t);
      } },
  ];

  const music = {
    bpm: 100, chords: [['C', ''], ['G', ''], ['A', 'm'], ['F', '']], level: 0.5, abs: 0.1,
    sections: [[0, 'pulse'], [4.61, 'tension'], [8.01, 'full'], [17.2, 'pulse'], [24.98, 'full'], [30.65, 'tension'], [40.7, 'full'], [55.25, 'pulse'], [67.5, 'full'], [74.2, 'tension'], [79.63, 'pulse']],
    drops: [43.2],
  };


  // ===== Neu-Timing v2 (Nutzer: Untertitel hingen nach) =====
  // Die Tonspur enthält nach dem Transkript noch Reform-Teil + Outro (ab ~65 s, laut Original-Folien). Der Transkript-Text
  // läuft daher nur bis ~64,6 s; Anker = Folienwechsel des Originals (12 / 25 / 41 / 65 s) → gleichmäßig ~20 Zeichen/s.
  // Szenen werden per Zeit-Warp auf die neue Achse gesetzt; ts = Zeitfaktor, damit Animationen/SFX in der Szene mitlaufen.
  // v3: Wort-genauer Warp alt→neu; neue Zeiten an ~25 erkannten Sprechpausen + Folienwechseln (12/25/41/65 s) verankert
  const WARP = [[0, 0], [0.25, 0.2], [0.744, 0.467], [1.413, 0.829], [2.169, 1.238], [2.489, 1.411], [2.75, 1.553], [3.186, 1.789], [3.448, 1.93], [4.611, 2.56], [4.873, 2.701], [5.309, 2.937], [5.629, 3.11], [6.007, 3.315], [6.879, 3.787], [7.14, 3.928], [7.344, 4.038], [7.606, 4.18], [8.013, 4.4], [8.216, 4.538], [8.536, 4.756], [8.74, 4.895], [9.205, 5.211], [9.466, 5.389], [9.67, 5.527], [9.99, 5.745], [10.658, 6.2], [10.862, 6.378], [11.298, 6.758], [11.792, 7.19], [12.635, 7.925], [13.188, 8.407], [13.857, 8.991], [14.554, 9.6], [14.874, 9.842], [15.136, 10.04], [15.456, 10.281], [15.834, 10.567], [16.27, 10.897], [16.473, 11.051], [17.2, 11.6], [17.419, 11.742], [17.764, 11.965], [18.297, 12.309], [18.642, 12.532], [19.677, 13.2], [20.147, 13.555], [20.492, 13.815], [21.088, 14.265], [21.558, 14.62], [21.84, 14.833], [22.436, 15.283], [23.094, 15.78], [23.314, 15.946], [23.659, 16.206], [24.066, 16.514], [24.662, 16.963], [24.975, 17.2], [25.446, 17.45], [25.665, 17.567], [26.292, 17.9], [26.794, 18.245], [27.139, 18.483], [27.483, 18.72], [27.703, 18.871], [28.048, 19.109], [28.33, 19.303], [28.738, 19.583], [29.271, 19.95], [29.992, 20.447], [30.65, 20.9], [30.888, 21.111], [31.232, 21.415], [31.47, 21.626], [31.893, 22.0], [32.131, 22.157], [32.369, 22.313], [32.607, 22.47], [32.898, 22.661], [33.295, 22.922], [33.639, 23.148], [34.088, 23.443], [34.485, 23.704], [34.934, 24.0], [35.49, 24.365], [36.151, 24.8], [36.389, 25.019], [36.627, 25.238], [37.077, 25.651], [37.368, 25.919], [38.108, 26.6], [38.399, 26.8], [39.272, 27.4], [39.774, 27.857], [40.7, 28.7], [40.979, 28.905], [41.505, 29.291], [41.66, 29.405], [42.124, 29.745], [42.588, 30.086], [42.805, 30.245], [43.424, 30.7], [43.703, 30.92], [44.291, 31.383], [44.446, 31.506], [44.724, 31.725], [45.375, 32.238], [45.839, 32.604], [46.179, 32.872], [47.356, 33.8], [47.758, 34.152], [48.037, 34.395], [48.377, 34.693], [48.718, 34.991], [49.337, 35.532], [49.863, 35.992], [50.421, 36.479], [50.699, 36.722], [50.978, 36.966], [51.318, 37.264], [52.03, 37.886], [52.309, 38.129], [52.773, 38.535], [53.609, 39.266], [55.25, 40.7], [55.538, 40.994], [55.774, 41.234], [56.742, 42.223], [57.03, 42.517], [57.37, 42.865], [57.658, 43.159], [58.286, 43.8], [58.627, 44.054], [59.36, 44.6], [59.647, 44.788], [59.883, 44.941], [60.433, 45.3], [60.825, 45.654], [61.454, 46.219], [61.794, 46.526], [62.291, 46.974], [62.422, 47.091], [62.946, 47.563], [63.233, 47.822], [64.097, 48.6], [64.49, 48.865], [64.987, 49.202], [65.223, 49.361], [65.746, 49.715], [65.982, 49.874], [66.322, 50.104], [66.715, 50.369], [66.95, 50.528], [67.5, 50.9], [67.924, 51.153], [68.217, 51.327], [68.902, 51.736], [69.587, 52.144], [69.815, 52.28], [70.043, 52.416], [70.337, 52.591], [70.565, 52.727], [70.859, 52.901], [71.283, 53.154], [72.0, 53.582], [72.452, 53.873], [72.663, 54.009], [72.934, 54.184], [73.447, 54.514], [74.2, 55.0], [74.729, 55.435], [74.924, 55.595], [75.425, 56.008], [75.787, 56.305], [76.038, 56.511], [76.344, 56.763], [76.706, 57.061], [77.124, 57.405], [77.848, 58.0], [78.266, 58.445], [78.684, 58.891], [79.631, 59.9], [79.993, 60.154], [80.243, 60.329], [80.828, 60.739], [81.19, 60.993], [81.441, 61.168], [81.747, 61.383], [82.722, 62.066], [83.028, 62.28], [83.446, 62.573], [83.752, 62.788], [84.226, 63.12], [84.95, 63.627], [85.32, 63.841], [86.026, 64.251], [86.8, 64.7]];
  const warp = (x) => { for (let i = 1; i < WARP.length; i++) { const [a, A] = WARP[i - 1], [b, B] = WARP[i]; if (x <= b) return A + (x - a) * (B - A) / (b - a); } return WARP[WARP.length - 1][1]; };
  const OLD_END = 87.17;
  scenes.forEach((sc, i) => { const os = sc.start, oe = i + 1 < scenes.length ? scenes[i + 1].start : OLD_END; sc._ns = warp(os); sc._ne = i + 1 < scenes.length ? warp(oe) : 64.7; sc.ts = (oe - os) / (sc._ne - sc._ns); });
  scenes.forEach((sc) => { sc.start = sc._ns; });
  music.sections = music.sections.map(([x, k]) => [warp(x), k]); music.drops = music.drops.map(warp);
  music.sections.push([64.7, 'tension'], [79.2, 'full']);

  scenes.push(
    { // 64,6–79,25: Reform geplant (noch kein Gesetz) – 25 % + Soli statt persönlichem Satz (lt. Original-Folie: Haushaltsentwurf 3. Juli 2026)
      start: 64.7, mood: 'dark', poses: ['emotions/nachdenklich', 'poses/analysieren'], ...TS('up'), focus: F,
      sfx: [SW(), [0.4, 'swell', 0.35, 0], [0.5, 'ding', 0.4, 0.2], ...flySfx(1.5, 0.3), [3.0, 'paper', 0.35, 0.3], [5.0, 'pop', 0.4, -0.2], ...ticks(5.3, 6.6, 8, 0.35, -0.2), [7.4, 'pop', 0.4, 0.2], ...ticks(7.7, 8.8, 7, 0.35, 0.2), [8.9, 'impact', 0.35, 0.2], [11.5, 'ping', 0.4, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'REFORM GEPLANT', c: C.white, size: 125, ribbon: '#F59E0B' }, { t: '(NOCH KEIN GESETZ)', c: C.white, size: 95 }]], [4.8, [{ t: 'PERSÖNLICHER SATZ', c: C.white, size: 105 }, { t: '→ 25 % + SOLI?', c: GOLD, size: 125 }]]]);
        fly(ctx, 860, 640, lt, 1.5, 'left', () => doc(ctx, 0, 0, 0.8, { title: 'ENTWURF', sign: 0 }), { rot: 0.2 });
        if (lt > 2.4) tag(ctx, '3. JULI 2026', 860, 880, '#334155', 1.2 * pop(lt, 2.4, 0.4));
        panel(ctx, 1450, 640, 640, 520, pop(lt, 4.8, 0.5), { title: 'STEUERSATZ: HEUTE VS. GEPLANT', body: () => {} });
        if (lt > 4.8) { axis(ctx, 1210, 830, 480, 290, { rows: 3, yl: ['0 %', '15 %', '30 %', '45 %'] });
          bar(ctx, 1340, 830, 150, 290, '#22C55E', eOut(prog(lt, 5.0, 1.6)) * 45 / 45, '14–45 %', 'HEUTE');
          bar(ctx, 1560, 830, 150, 290, '#F59E0B', eOut(prog(lt, 7.4, 1.4)) * 26.4 / 45, '25 % + SOLI', 'GEPLANT'); }
        if (lt > 11.5) tag(ctx, 'NOCH NICHT BESCHLOSSEN', 1450, 330, RED, 1.1 * pop(lt, 11.5, 0.4));
        pandaSeq(ctx, [[0, 'emotions/nachdenklich'], [4.8, 'poses/analysieren']], lt, t);
      } },
    { // 79,25–Ende: Outro – nächste Woche Haltefrist im Detail
      start: 79.25, mood: 'good', poses: ['emotions/freundlich'], ...TS('zoom'), focus: F,
      sfx: [SW(), [0.3, 'swell', 0.35, 0], [0.4, 'ding', 0.45, 0.2], ...flySfx(1.2, 0.3), [2.4, 'pop', 0.45, 0.3], [3.2, 'ping', 0.4, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'NÄCHSTE WOCHE:', c: C.white, size: 120 }, { t: 'HALTEFRIST IM DETAIL', c: C.white, size: 100, ribbon: GRN }]]]);
        fly(ctx, 1000, 620, lt, 1.2, 'up', () => panel(ctx, 0, 0, 640, 380, 1, { accent: GRN, title: 'NÄCHSTES VIDEO', body: () => {} }));
        if (lt > 1.4) holdLine(ctx, 760, 660, 480, lt, 1.5, lerp(0, 12, eInOut(prog(lt, 1.8, 2.2))), { flag: lt > 4 ? '12 M. → STEUERFREI' : 'HALTEFRIST', flagCol: GRN });
        P.heart(ctx, 1560, 560, 1.3 * pop(lt, 2.4, 0.4) * (1 + Math.sin(t * 6) * 0.05)); tag(ctx, '+ ABONNIEREN', 1560, 780, '#FF3B5C', 1.4 * pop(lt, 3.2, 0.45));
        panda(ctx, 'emotions/freundlich', lt, t);
      } });

  window.VIDEO = { format: 'landscape', capX: 1190, name: 'krypto-freigrenze-yt-ohne-ut', noCaptions: true, style: 'clean', fps: 30, duration: 87.17, scenes, captions, xfade: 0.35, grain: 0.03, bokeh: false, endFade: false, pandaFixed: true, music };
})();
