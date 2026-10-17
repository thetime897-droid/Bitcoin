// Krypto-Steuern: 1.000-€-Freigrenze (§ 23 EStG) – Short (87,2 s). Clean-Stil, Einflüge, SFX v3 (swish/sweep, MASTER 0.30).
// Audio: 16:9-Upload ohne Untertitel; Timing aus Nutzer-Transkript, anhand Sprechpausen verankert.
// Fakten: Haltefrist 1 Jahr; Freigrenze 1.000 € seit 2024 (vorher 600 €), Alles-oder-nichts; persönlicher Steuersatz; DAC8 seit 1.1.2026.
(() => {
  const E = window.E, C = E.C, P = E.P, K = E.K;
  const { pop, prog, eOut, eInOut, lerp } = E;
  const { panda, pandaSeq, H, ticks, de, sparks, glass, bigNum, label, tag, bars, doc, pulseRings, timeline, fly, flySfx, warn, gov, magnifier } = K;
  const { GOLD, GRN, BLUE, CYAN, VIO, RED } = K.COL;
  const BTC = '#F7931A', EUB = '#1D4ED8';
  const SW = (t = -0.2, g = 0.5) => [t, 'sweep', g, 0];

  function btc(ctx, x, y, s, t) { // Bitcoin-Münze (Symbol, kein Logo eines Unternehmens)
    if (s <= 0.001) return;
    E.withT(ctx, x, y, s, Math.sin(t * 1.5) * 0.08, () => {
      ctx.save(); ctx.shadowColor = BTC; ctx.shadowBlur = 50; ctx.beginPath(); ctx.arc(0, 0, 150, 0, 7);
      const g = ctx.createRadialGradient(-50, -50, 20, 0, 0, 160); g.addColorStop(0, '#FFD08A'); g.addColorStop(1, '#C26A00'); ctx.fillStyle = g; ctx.fill(); ctx.restore();
      ctx.beginPath(); ctx.arc(0, 0, 122, 0, 7); ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.stroke();
      E.plainText(ctx, '₿', 0, 10, 170, C.white, { weight: 900 });
    });
  }
  function hourglass(ctx, x, y, s, t, crossed) { E.withT(ctx, x, y, s, 0, () => { P.hourglass(ctx, 0, 0, 240, t); if (crossed) { ctx.save(); ctx.globalAlpha = crossed; ctx.strokeStyle = RED; ctx.lineWidth = 18; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-120, -140); ctx.lineTo(120, 140); ctx.stroke(); ctx.restore(); } }); }
  function rowCheck(ctx, txt, res, ok, w) { E.rr(ctx, -w / 2, -48, w, 96, 26); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = ok ? '#22C55E' : '#EF4444'; ctx.stroke();
    E.withT(ctx, -w / 2 + 52, 0, 1, 0, () => { ctx.beginPath(); ctx.arc(0, 0, 26, 0, 7); ctx.fillStyle = ok ? '#16A34A' : '#DC2626'; ctx.fill(); E.plainText(ctx, ok ? '✓' : '✕', 0, 2, 30, C.white, { weight: 900 }); });
    E.plainText(ctx, txt, -w / 2 + 100, 2, 30, C.white, { weight: 900, align: 'left' }); E.plainText(ctx, res, w / 2 - 26, 2, 28, ok ? '#4ADE80' : '#F87171', { weight: 900, align: 'right' }); }
  function stars(ctx, x, y, r, t, s = 1) { for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + t * 0.2; E.withT(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, s * 0.7, 0, () => { ctx.beginPath(); for (let k = 0; k < 10; k++) { const rr = k % 2 ? 9 : 22, aa = k * Math.PI / 5 - Math.PI / 2; ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } ctx.closePath(); ctx.fillStyle = GOLD; ctx.fill(); }); } }

  const captions = [[0.25, 2.17, "Kryptos steuerfrei verkaufen,"], [2.17, 4.61, "auch vor Ablauf der 1-Jahresfrist,"], [4.61, 6.88, "das klingt nach einem Steuertrick,"], [6.88, 8.01, "der zu gut ist,"], [8.01, 9.2, "um wahr zu sein,"], [9.2, 10.66, "ist er aber nicht."], [10.66, 12.64, "Du kannst nämlich Kryptogewinne"], [12.64, 14.55, "komplett steuerfrei behalten,"], [14.55, 16.27, "ohne ein Jahr dafür warten"], [16.27, 17.2, "zu müssen."], [17.2, 19.68, "Es gibt nämlich eine Freigrenze:"], [19.68, 21.56, "Bleibt dein gesamter Gewinn"], [21.56, 23.31, "aus privaten Verkäufen im"], [23.31, 24.98, "Jahr unter 1.000 €,"], [24.98, 26.29, "zahlst du nichts,"], [26.29, 28.33, "null, auch wenn du erst vor"], [28.33, 30.65, "2 Monaten investiert hast."], [30.65, 31.89, "Und jetzt der Teil,"], [31.89, 33.64, "bei dem ich beim ersten Lesen"], [33.64, 35.49, "ehrlich gesagt zweimal hingucken"], [35.49, 37.37, "musste. Das ist nämlich eine"], [37.37, 38.11, "Freigrenze,"], [38.11, 39.27, "kein Freibetrag."], [39.27, 40.7, "Riesiger Unterschied:"], [40.7, 42.81, "Bei 999 € Gewinn nichts zu"], [42.81, 45.37, "zahlen, bei 1.001 € der komplette"], [45.37, 47.36, "Betrag wird steuerpflichtig,"], [47.36, 49.34, "nicht der eine Euro drüber,"], [49.34, 50.42, "sondern alles,"], [50.42, 52.31, "und das wird versteuert mit"], [52.31, 55.25, "deinem persönlichen Einkommenssteuersatz."], [55.25, 56.74, "Kurz zum Mitschreiben:"], [56.74, 58.29, "Nach einem Jahr gehalten,"], [58.29, 59.36, "immer steuerfrei,"], [59.36, 60.43, "egal wie viel;"], [60.43, 61.45, "vorher verkauft,"], [61.45, 62.95, "unter 1.000 € Gewinn,"], [62.95, 64.1, "auch steuerfrei;"], [64.1, 65.75, "vorher verkauft und drüber,"], [65.75, 67.5, "der ganze Betrag ist dran."], [67.5, 68.9, "Heißt für dich:"], [68.9, 70.86, "Verkaufst du ab und zu mal"], [70.86, 72.0, "etwas Kleines,"], [72.0, 74.2, "kannst du das bewusst nutzen;"], [74.2, 75.43, "handelst du öfter,"], [75.43, 77.12, "würde ich mich nicht darauf"], [77.12, 77.85, "verlassen,"], [77.85, 79.63, "lieber sauber dokumentieren,"], [79.63, 81.19, "zumal das Finanzamt durch"], [81.19, 82.72, "die neue EU-Meldepflichten"], [82.72, 84.23, "seit diesem Jahr sowieso"], [84.23, 84.95, "mitkriegt,"], [84.95, 86.8, "dass gehandelt wurde."]];

  const HC = { hard: true, punchAmt: 0.06, flashAmt: 0.14 };
  const TS = (dir, extra = {}) => ({ trans: dir, transDur: 0.5, punchAmt: 0.05, flashAmt: 0.0, ...extra });
  const scenes = [
    // ===== HOOK 0–17,2 s: 6 Schnitte =====
    { start: 0, mood: 'good', poses: ['emotions/begeistert'], punch: false, noBrand: true, ...HC, focus: { x: 540, y: 1000 },
      sfx: [[0.0, 'impact', 0.45, 0], [0.05, 'ping', 0.45, 0], ...flySfx(0.2, 0.3), [0.9, 'cash', 0.45, 0.3], [1.3, 'pop', 0.4, 0.3]],
      draw(ctx, lt, t) {
        E.liveBar(ctx, lt, 'KRYPTO & STEUERN  •  1.000 € FREIGRENZE  •  § 23 ESTG  •  ALLES ODER NICHTS  •  ');
        E.headline(ctx, [{ t: 'KRYPTO', c: C.white, size: 140, ribbon: BTC }, { t: 'STEUERFREI?', c: '#4ADE80', size: 130 }], lt, { y: 480, delay: 0.05 });
        fly(ctx, 700, 1010, lt, 0.2, 'up', () => btc(ctx, 0, 0, 1, t), { rot: 0.8 });
        sparks(ctx, 700, 1010, lt, 0.9, 22, GOLD);
        if (lt > 1.3) tag(ctx, '0 € STEUER?', 700, 1260, GRN, pop(lt, 1.3, 0.35));
        panda(ctx, 'emotions/begeistert', lt, t, { x: 170, h: 460 });
      } },
    { start: 2.17, mood: 'blue', poses: ['poses/zeigen'], ...TS('left'), focus: { x: 640, y: 1000 },
      sfx: [SW(), ...flySfx(0.2, -0.3), [1.0, 'snap', 0.45, 0.2], [1.1, 'pop', 0.4, 0.2]],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'AUCH VOR', c: C.white, size: 130 }, { t: '1 JAHR?', c: C.white, size: 150, ribbon: BLUE }], lt);
        fly(ctx, 700, 1010, lt, 0.2, 'left', () => P.calendar(ctx, 0, 0, 1.0, 'HALTEFRIST', '1 J.'), { rot: 0.4 });
        if (lt > 1.0) bigNum(ctx, '?', 920, 820, 150 * pop(lt, 1.0, 0.35), GOLD);
        panda(ctx, 'poses/zeigen', lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },
    { start: 4.61, mood: 'dark', poses: ['emotions/augenzwinkern'], ...TS('zoom'), focus: { x: 640, y: 1000 },
      sfx: [SW(), [0.3, 'swell', 0.35, 0], [0.4, 'ding', 0.4, 0.2], [1.3, 'pop', 0.4, -0.3], [1.6, 'pop', 0.4, 0.3], [2.4, 'glitch', 0.25, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'KLINGT NACH', c: C.white, size: 130 }, { t: 'STEUERTRICK', c: C.white, size: 130, ribbon: VIO }]], [2.3, [{ t: 'ZU GUT, UM', c: C.white, size: 130 }, { t: 'WAHR ZU SEIN?', c: GOLD, size: 120 }]]]);
        E.withT(ctx, 700, 1010, pop(lt, 0.2, 0.45), 0, () => { pulseRings(ctx, 0, 0, t, '#A78BFA', 3, 240); bigNum(ctx, '✨', 0, 20, 220, GOLD); });
        if (lt > 1.3) { tag(ctx, 'TRICK?', 520, 820, VIO, pop(lt, 1.3, 0.35)); tag(ctx, 'LEGAL?', 880, 1220, VIO, pop(lt, 1.6, 0.35)); }
        panda(ctx, 'emotions/augenzwinkern', lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },
    { start: 8.01, mood: 'good', poses: ['poses/tipp_geben'], ...TS('right'), focus: { x: 640, y: 1000 }, shake: [1.25], shakeSfx: 'stamp',
      sfx: [SW(), ...flySfx(0.15, 0.3), [1.35, 'ding', 0.45, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'IST ER', c: C.white, size: 140 }, { t: 'ABER NICHT!', c: C.white, size: 135, ribbon: GRN }]]]);
        fly(ctx, 700, 1010, lt, 0.15, 'right', () => doc(ctx, 0, 0, 0.9, { title: '§ 23 ESTG', sign: 1 }), { rot: 0.3 });
        E.stamp(ctx, 'GESETZ ✓', 700, 1040, lt, 1.2, { size: 64, rot: -0.14, color: '#16A34A' });
        panda(ctx, 'poses/tipp_geben', lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },
    { start: 10.66, mood: 'good', poses: ['emotions/begeistert'], ...TS('up'), focus: { x: 640, y: 1000 },
      sfx: [SW(), ...flySfx(0.2, -0.3), ...ticks(1.0, 2.6, 9, 0.4, 0.2), [2.65, 'cash', 0.5, 0.2], [3.1, 'pop', 0.4, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'GEWINNE', c: C.white, size: 140 }, { t: 'KOMPLETT', c: C.white, size: 130, ribbon: GRN }]], [2.0, [{ t: 'STEUERFREI', c: '#4ADE80', size: 140 }, { t: 'BEHALTEN', c: C.white, size: 130 }]]]);
        const v = lerp(0, 999, eOut(prog(lt, 1.0, 1.6)));
        fly(ctx, 700, 1000, lt, 0.2, 'left', () => glass(ctx, 0, 0, 540, 380, { accent: GRN, title: 'DEIN KRYPTO-GEWINN', body: () => { bigNum(ctx, `+${Math.round(v)} €`, 0, 0, 140, '#4ADE80'); label(ctx, 'STEUER: 0 €', 0, 110, 32, C.white); } }));
        sparks(ctx, 700, 1000, lt, 2.65, 22, '#4ADE80');
        panda(ctx, 'emotions/begeistert', lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },
    { start: 14.55, mood: 'blue', poses: ['emotions/cool'], ...TS('zoom'), focus: { x: 640, y: 1000 },
      sfx: [SW(), [0.3, 'pop', 0.4, 0.2], [1.3, 'snap', 0.45, 0.2], [1.35, 'glitch', 0.25, 0.2]],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'OHNE 1 JAHR', c: C.white, size: 130 }, { t: 'ZU WARTEN', c: C.white, size: 135, ribbon: BLUE }], lt);
        hourglass(ctx, 700, 1000, pop(lt, 0.2, 0.45), t, eOut(prog(lt, 1.3, 0.3)));
        panda(ctx, 'emotions/cool', lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },

    // ===== Erklärteil =====
    { // 17,2–24,98: Freigrenze – Gewinn privater Verkäufe pro Jahr < 1.000 € (seit 2024, vorher 600 €)
      start: 17.2, mood: 'blue', poses: ['poses/praesentieren'], ...TS('right'), focus: { x: 640, y: 930 },
      sfx: [SW(), [0.4, 'swell', 0.35, 0], [0.5, 'ding', 0.4, 0.2], [2.6, 'pop', 0.4, -0.2], ...ticks(3.2, 4.4, 8, 0.4, 0.2), [4.45, 'cash', 0.5, 0.2], [5.2, 'pop', 0.4, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DIE', c: C.white, size: 130 }, { t: 'FREIGRENZE', c: C.white, size: 140, ribbon: GRN }]], [2.5, [{ t: 'GEWINN PRO JAHR', c: C.white, size: 110 }, { t: 'UNTER 1.000 €', c: C.white, size: 125, ribbon: GRN }]]]);
        bars(ctx, 650, 1230, [['BIS 2023', 600, '#64748B', '600 €', 2.6], ['SEIT 2024', 1000, '#22C55E', '1.000 €', 3.2]], lt, 2.6, { max: 1100, h: 460 });
        if (lt > 5.2) tag(ctx, 'ALLE VERKÄUFE ZUSAMMEN', 650, 650, BLUE, pop(lt, 5.2, 0.4));
        panda(ctx, 'poses/praesentieren', lt, t, { x: 160, h: 440 });
      } },
    { // 24,98–30,65: zahlst nichts – auch nach 2 Monaten
      start: 24.98, mood: 'good', poses: ['emotions/begeistert'], ...TS('left'), focus: { x: 640, y: 930 },
      sfx: [SW(), [0.2, 'impact', 0.35, 0], [0.3, 'ping', 0.5, 0.2], ...flySfx(2.6, 0.3), [3.3, 'snap', 0.4, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DU ZAHLST:', c: C.white, size: 135 }, { t: '0 €', c: '#4ADE80', size: 190 }]], [2.5, [{ t: 'AUCH NACH NUR', c: C.white, size: 120 }, { t: '2 MONATEN', c: C.white, size: 135, ribbon: BLUE }]]]);
        if (lt < 2.5) glass(ctx, 700, 1000, 500, 380, { scale: pop(lt, 0.15, 0.45), accent: GRN, title: 'STEUER', body: () => bigNum(ctx, '0 €', 0, 20, 200, '#4ADE80') });
        else fly(ctx, 700, 1010, lt, 2.6, 'right', () => P.calendar(ctx, 0, 0, 1.0, 'GEHALTEN', '2 M.'), { rot: 0.4 });
        if (lt > 3.3) tag(ctx, 'TROTZDEM STEUERFREI', 700, 1300, GRN, pop(lt, 3.3, 0.4));
        sparks(ctx, 700, 1000, lt, 0.3, 22, '#4ADE80');
        panda(ctx, 'emotions/begeistert', lt, t, { x: 160, h: 440 });
      } },
    { // 30,65–37,37: zweimal hingucken
      start: 30.65, mood: 'dark', poses: ['emotions/ueberrascht'], ...TS('zoom'), focus: { x: 640, y: 930 },
      sfx: [SW(), ...flySfx(0.3, 0.2), [2.2, 'swish', 0.4, 0.3], [2.6, 'pop', 0.4, 0.3], [3.6, 'swish', 0.4, -0.3], [4.0, 'pop', 0.4, -0.3], [5.4, 'ping', 0.45, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'JETZT DER TEIL,', c: C.white, size: 115 }, { t: 'DER ÜBERRASCHT', c: C.white, size: 110, ribbon: VIO }]], [3.0, [{ t: 'ZWEIMAL', c: C.white, size: 140 }, { t: 'HINSCHAUEN!', c: GOLD, size: 130 }]]]);
        fly(ctx, 680, 1010, lt, 0.3, 'up', () => doc(ctx, 0, 0, 0.9, { title: 'KLEINGEDRUCKT', sign: 0 }), { rot: 0.2 });
        const mx = lt < 3.6 ? lerp(560, 800, eInOut(prog(lt, 2.2, 0.6))) : lerp(800, 600, eInOut(prog(lt, 3.6, 0.6)));
        if (lt > 2.2) magnifier(ctx, mx, 960, 0.95 * pop(lt, 2.2, 0.35), t);
        if (lt > 5.4) tag(ctx, '2×', 900, 760, VIO, pop(lt, 5.4, 0.35));
        panda(ctx, 'emotions/ueberrascht', lt, t, { x: 160, h: 440 });
      } },
    { // 37,37–40,7: Freigrenze ≠ Freibetrag
      start: 37.37, mood: 'bad', poses: ['poses/tipp_geben'], ...TS('up'), focus: { x: 640, y: 930 },
      sfx: [SW(), ...flySfx(0.1, -0.3), ...flySfx(0.85, 0.3), [1.6, 'impact', 0.4, 0], [1.65, 'snap', 0.45, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'FREIGRENZE', c: C.white, size: 130, ribbon: GRN }, { t: '≠ FREIBETRAG', c: C.white, size: 125, ribbon: RED }]], [1.75, [{ t: 'RIESIGER', c: C.white, size: 140 }, { t: 'UNTERSCHIED!', c: GOLD, size: 130 }]]]);
        fly(ctx, 520, 1000, lt, 0.1, 'left', () => glass(ctx, 0, 0, 300, 360, { accent: GRN, title: 'FREIGRENZE', body: () => { label(ctx, 'ALLES', 0, -30, 40, C.white); label(ctx, 'ODER NICHTS', 0, 30, 34, C.white); } }));
        fly(ctx, 870, 1000, lt, 0.85, 'right', () => glass(ctx, 0, 0, 300, 360, { accent: '#64748B', title: 'FREIBETRAG', body: () => { label(ctx, 'NUR DER REST', 0, -30, 32, C.white); label(ctx, 'WIRD BESTEUERT', 0, 30, 28); } }));
        if (lt > 1.6) bigNum(ctx, '≠', 695, 1000, 120 * pop(lt, 1.6, 0.3), '#F87171');
        panda(ctx, 'poses/tipp_geben', lt, t, { x: 150, h: 420 });
      } },
    { // 40,7–47,36: 999 € → 0 € | 1.001 € → kompletter Betrag steuerpflichtig
      start: 40.7, mood: 'bad', poses: ['poses/analysieren', 'emotions/ueberrascht'], ...TS('right'), focus: { x: 640, y: 930 }, shake: [4.5], shakeSfx: 'stamp',
      sfx: [SW(), [0.3, 'pop', 0.4, -0.3], ...ticks(0.5, 1.7, 8, 0.4, -0.3), [1.75, 'ding', 0.4, -0.3], [2.6, 'riser', 0.35, 0.3], [3.0, 'pop', 0.45, 0.3], [3.05, 'sub', 0.35, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: '999 € GEWINN:', c: C.white, size: 120 }, { t: '0 € STEUER', c: C.white, size: 130, ribbon: GRN }]], [2.9, [{ t: '1.001 €:', c: C.white, size: 140 }, { t: 'ALLES STEUERPFLICHTIG', c: C.white, size: 82, ribbon: RED }]]]);
        bars(ctx, 650, 1230, [['999 € GEWINN', 999, '#22C55E', '0 €', 0.3], ['1.001 € GEWINN', 1001, '#EF4444', 'ALLES', 3.0]], lt, 0.3, { max: 1150, h: 420, line: 1000, bw: 180, gap: 130 });
        E.stamp(ctx, 'STEUERPFLICHTIG', 790, 980, lt, 4.45, { size: 46, rot: -0.14 });
        pandaSeq(ctx, [[0, 'poses/analysieren'], [2.9, 'emotions/ueberrascht']], lt, t, { x: 150, h: 420 });
      } },
    { // 47,36–55,25: nicht der 1 € drüber, sondern alles – persönlicher Steuersatz
      start: 47.36, mood: 'dark', poses: ['poses/zeigen', 'poses/analysieren'], ...TS('zoom'), focus: { x: 640, y: 930 },
      sfx: [SW(), ...flySfx(0.2, -0.3), [1.0, 'snap', 0.35, -0.3], [2.0, 'impact', 0.4, 0.2], [2.05, 'cash', 0.45, 0.2], [3.1, 'swell', 0.3, 0], ...ticks(3.6, 5.2, 9, 0.35, 0.2), [5.3, 'ding', 0.45, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'NICHT NUR', c: C.white, size: 135 }, { t: 'DER 1 € DRÜBER', c: C.white, size: 115, ribbon: GOLD }]], [2.0, [{ t: 'SONDERN', c: C.white, size: 135 }, { t: 'ALLES!', c: C.white, size: 160, ribbon: RED }]], [3.1, [{ t: 'MIT DEINEM', c: C.white, size: 125 }, { t: 'STEUERSATZ', c: C.white, size: 135, ribbon: VIO }]]]);
        if (lt < 3.1) fly(ctx, 700, 1000, lt, 0.2, 'left', () => glass(ctx, 0, 0, 560, 380, { accent: RED, title: 'STEUERPFLICHTIG', body: () => {
          const all = eOut(prog(lt, 2.0, 0.5)); E.rr(ctx, -230, -40, 460 * (all > 0 ? all : 0) + (all > 0 ? 0 : 18), 80, 16); ctx.fillStyle = '#EF4444'; ctx.fill();
          if (all <= 0) { E.rr(ctx, -230, -40, 460, 80, 16); ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 3; ctx.stroke(); label(ctx, '1 €', -150, 80, 30, '#F87171'); }
          bigNum(ctx, all > 0.5 ? '1.001 €' : '1 €?', 0, 0, 70, C.white); } }));
        else { const v = lerp(0, 45, eOut(prog(lt, 3.6, 1.6))); glass(ctx, 700, 1000, 520, 380, { scale: pop(lt, 3.1, 0.45), accent: VIO, title: 'EINKOMMENSTEUER', body: () => { bigNum(ctx, `14–${Math.round(lerp(14, 45, v / 45))} %`, 0, 0, 120, C.white); label(ctx, 'PERSÖNLICHER SATZ', 0, 100, 28); } }); }
        pandaSeq(ctx, [[0, 'poses/zeigen'], [3.1, 'poses/analysieren']], lt, t, { x: 150, h: 420 });
      } },
    { // 55,25–67,5: zum Mitschreiben – 3-Punkte-Check
      start: 55.25, mood: 'blue', poses: ['poses/praesentieren', 'poses/tipp_geben'], ...TS('up', { transDur: 0.55 }), focus: { x: 640, y: 930 },
      sfx: [SW(), [0.3, 'paper', 0.35, 0.2], ...flySfx(1.5, 0.3), [3.1, 'ding', 0.4, 0.3], ...flySfx(5.2, -0.3), [6.8, 'ding', 0.4, -0.3], ...flySfx(8.85, 0.3), [10.6, 'stamp', 0.45, 0.3], [10.65, 'down', 0.3, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'ZUM', c: C.white, size: 130 }, { t: 'MITSCHREIBEN', c: C.white, size: 125, ribbon: BLUE }]], [1.5, [{ t: '1. NACH 1 JAHR:', c: C.white, size: 110 }, { t: 'IMMER FREI', c: '#4ADE80', size: 130 }]], [5.2, [{ t: '2. VORHER < 1.000 €:', c: C.white, size: 92 }, { t: 'AUCH FREI', c: '#4ADE80', size: 130 }]], [8.85, [{ t: '3. VORHER > 1.000 €:', c: C.white, size: 92 }, { t: 'ALLES DRAN', c: C.white, size: 130, ribbon: RED }]]]);
        glass(ctx, 690, 1010, 640, 520, { scale: pop(lt, 0.2, 0.5), title: 'STEUER-CHECK KRYPTO', body: (w, h) => {
          [['NACH 1 JAHR', 'STEUERFREI', true, 1.5, 'right'], ['VORHER · < 1.000 €', 'STEUERFREI', true, 5.2, 'left'], ['VORHER · > 1.000 €', 'ALLES', false, 8.85, 'right']].forEach(([txt, res, ok, at, from], i) =>
            fly(ctx, 0, -h / 2 + 150 + i * 125, lt, at, from, () => rowCheck(ctx, txt, res, ok, w - 60), { dist: 700, rot: 0.12 }));
        } });
        pandaSeq(ctx, [[0, 'poses/praesentieren'], [8.85, 'poses/tipp_geben']], lt, t, { x: 150, h: 420 });
      } },
    { // 67,5–74,2: ab und zu klein verkaufen – bewusst nutzen
      start: 67.5, mood: 'good', poses: ['poses/tipp_geben', 'emotions/augenzwinkern'], ...TS('left'), focus: { x: 640, y: 930 },
      sfx: [SW(), [0.3, 'pop', 0.4, 0.2], ...flySfx(1.6, -0.3), ...flySfx(2.3, 0.1), ...flySfx(3.0, 0.4), [4.6, 'ding', 0.45, 0.2], [4.65, 'cash', 0.4, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'HEISST FÜR DICH:', c: C.white, size: 115 }, { t: 'KLEINE VERKÄUFE', c: C.white, size: 110, ribbon: GRN }]], [4.5, [{ t: 'BEWUSST', c: C.white, size: 140 }, { t: 'NUTZEN', c: '#4ADE80', size: 150 }]]]);
        [[520, 1.6, 'left', '+250 €'], [700, 2.3, 'up', '+300 €'], [880, 3.0, 'right', '+400 €']].forEach(([x, at, from, v]) => fly(ctx, x, 980, lt, at, from, () => { btc(ctx, 0, -40, 0.42, t); tag(ctx, v, 0, 90, GRN, 0.95); }));
        if (lt > 4.5) glass(ctx, 700, 1250, 520, 130, { scale: pop(lt, 4.5, 0.4), accent: GRN, body: () => E.plainText(ctx, '= 950 € → STEUERFREI ✓', 0, 4, 38, '#4ADE80', { weight: 900 }) });
        pandaSeq(ctx, [[0, 'poses/tipp_geben'], [4.5, 'emotions/augenzwinkern']], lt, t, { x: 150, h: 420 });
      } },
    { // 74,2–79,63: öfter handeln – nicht darauf verlassen, sauber dokumentieren
      start: 74.2, mood: 'neutral', poses: ['poses/analysieren'], ...TS('right'), focus: { x: 640, y: 930 },
      sfx: [SW(), [0.3, 'glitch', 0.25, 0.2], [0.5, 'pop', 0.4, 0.2], ...flySfx(3.65, 0.3), [4.0, 'paper', 0.35, 0.3], [4.4, 'tick', 0.4, 0.3], [4.7, 'tick', 0.4, 0.3], [5.0, 'tick', 0.4, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'HANDELST DU', c: C.white, size: 130 }, { t: 'ÖFTER?', c: C.white, size: 150, ribbon: '#F59E0B' }]], [3.6, [{ t: 'SAUBER', c: C.white, size: 140 }, { t: 'DOKUMENTIEREN', c: C.white, size: 115, ribbon: BLUE }]]]);
        if (lt < 3.6) { warn(ctx, 700, 1000, pop(lt, 0.4, 0.45) * 0.85, t); }
        else fly(ctx, 700, 1010, lt, 3.65, 'right', () => glass(ctx, 0, 0, 560, 440, { accent: BLUE, title: 'TRADE-LISTE', body: (w, h) => {
          ['KAUF · DATUM · PREIS', 'VERKAUF · DATUM · PREIS', 'GEWINN / VERLUST'].forEach((r, i) => { const s = pop(lt, 4.3 + i * 0.3, 0.3); if (s <= 0) return; E.withT(ctx, 0, -60 + i * 90, s, 0, () => { E.rr(ctx, -w / 2 + 30, -32, w - 60, 64, 16); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill(); E.plainText(ctx, '✓ ' + r, -w / 2 + 56, 2, 28, C.white, { weight: 900, align: 'left' }); }); }); } }));
        panda(ctx, 'poses/analysieren', lt, t, { x: 150, h: 420 });
      } },
    { // 79,63–Ende: Finanzamt erfährt es durch neue EU-Meldepflicht (DAC8, seit 2026)
      start: 79.63, mood: 'blue', poses: ['emotions/nachdenklich', 'poses/tipp_geben'], ...TS('zoom'), focus: { x: 640, y: 930 },
      sfx: [SW(), ...flySfx(0.3, 0.2), [1.6, 'swell', 0.35, 0], [1.7, 'ding', 0.4, -0.3], [2.6, 'signal', 0.3, 0.2], [4.4, 'stamp', 0.4, 0.2], [5.4, 'pop', 0.4, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DAS FINANZAMT', c: C.white, size: 120 }, { t: 'WEISS BESCHEID', c: C.white, size: 115, ribbon: EUB }]], [3.1, [{ t: 'EU-MELDEPFLICHT', c: C.white, size: 105, ribbon: EUB }, { t: 'SEIT 2026', c: GOLD, size: 130 }]]]);
        fly(ctx, 560, 1180, lt, 0.3, 'down', () => gov(ctx, 0, 0, 360, t), { rot: 0, dist: 1000 });
        if (lt > 1.6) stars(ctx, 880, 880, 120, t, pop(lt, 1.6, 0.5));
        if (lt > 2.6) P.beam(ctx, 820, 920, 640, 980, t, eOut(prog(lt, 2.6, 0.6)), GOLD);
        if (lt > 4.4) tag(ctx, 'DAC8 · BÖRSEN MELDEN', 700, 1320, EUB, pop(lt, 4.4, 0.4));
        pandaSeq(ctx, [[0, 'emotions/nachdenklich'], [3.1, 'poses/tipp_geben']], lt, t, { x: 150, h: 420 });
      } },
  ];

  const music = {
    bpm: 100, chords: [['C', ''], ['G', ''], ['A', 'm'], ['F', '']], level: 0.5, abs: 0.1,
    sections: [[0, 'pulse'], [4.61, 'tension'], [8.01, 'full'], [17.2, 'pulse'], [24.98, 'full'], [30.65, 'tension'], [40.7, 'full'], [55.25, 'pulse'], [67.5, 'full'], [74.2, 'tension'], [79.63, 'pulse']],
    drops: [43.2],
  };

  window.VIDEO = { name: 'krypto-freigrenze', style: 'clean', fps: 30, duration: 87.17, scenes, captions, xfade: 0.35, grain: 0.035, bokeh: false, endFade: false, pandaFixed: true, music };
})();
