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

  const captions = [[0.2, 1.49, "Kryptos steuerfrei verkaufen,"], [1.49, 3.13, "auch vor Ablauf der 1-Jahresfrist,"], [3.13, 4.66, "das klingt nach einem Steuertrick,"], [4.66, 5.42, "der zu gut ist,"], [5.42, 6.22, "um wahr zu sein,"], [6.22, 7.2, "ist er aber nicht."], [7.2, 8.53, "Du kannst nämlich Kryptogewinne"], [8.53, 9.82, "komplett steuerfrei behalten,"], [9.82, 10.97, "ohne ein Jahr dafür warten"], [10.97, 11.6, "zu müssen."], [11.6, 13.2, "Es gibt nämlich eine Freigrenze:"], [13.2, 14.41, "Bleibt dein gesamter Gewinn"], [14.41, 15.55, "aus privaten Verkäufen im"], [15.55, 16.62, "Jahr unter 1.000 €,"], [16.62, 17.47, "zahlst du nichts,"], [17.47, 18.79, "null, auch wenn du erst vor"], [18.79, 20.29, "2 Monaten investiert hast."], [20.29, 21.24, "Und jetzt der Teil,"], [21.24, 22.58, "bei dem ich beim ersten Lesen"], [22.58, 23.99, "ehrlich gesagt zweimal hingucken"], [23.99, 25.62, "musste. Das ist nämlich eine"], [25.62, 26.31, "Freigrenze,"], [26.31, 27.39, "kein Freibetrag."], [27.39, 28.71, "Riesiger Unterschied:"], [28.71, 30.37, "Bei 999 € Gewinn nichts zu"], [30.37, 32.4, "zahlen, bei 1.001 € der komplette"], [32.4, 33.96, "Betrag wird steuerpflichtig,"], [33.96, 35.53, "nicht der eine Euro drüber,"], [35.53, 36.39, "sondern alles,"], [36.39, 37.88, "und das wird versteuert mit"], [37.88, 40.2, "deinem persönlichen Einkommenssteuersatz."], [40.2, 41.44, "Kurz zum Mitschreiben:"], [41.44, 42.73, "Nach einem Jahr gehalten,"], [42.73, 43.62, "immer steuerfrei,"], [43.62, 44.51, "egal wie viel;"], [44.51, 45.36, "vorher verkauft,"], [45.36, 46.6, "unter 1.000 € Gewinn,"], [46.6, 47.56, "auch steuerfrei;"], [47.56, 48.94, "vorher verkauft und drüber,"], [48.94, 50.4, "der ganze Betrag ist dran."], [50.4, 51.33, "Heißt für dich:"], [51.33, 52.64, "Verkaufst du ab und zu mal"], [52.64, 53.4, "etwas Kleines,"], [53.4, 54.99, "kannst du das bewusst nutzen;"], [54.99, 55.95, "handelst du öfter,"], [55.95, 57.28, "würde ich mich nicht darauf"], [57.28, 57.85, "verlassen,"], [57.85, 59.24, "lieber sauber dokumentieren,"], [59.24, 60.46, "zumal das Finanzamt durch"], [60.46, 61.66, "die neue EU-Meldepflichten"], [61.66, 62.84, "seit diesem Jahr sowieso"], [62.84, 63.4, "mitkriegt,"], [63.4, 64.6, "dass gehandelt wurde."]];

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


  // ===== Neu-Timing v2 (Nutzer: Untertitel hingen nach) =====
  // Die Tonspur enthält nach dem Transkript noch Reform-Teil + Outro (ab ~65 s, laut Original-Folien). Der Transkript-Text
  // läuft daher nur bis ~64,6 s; Anker = Folienwechsel des Originals (12 / 25 / 41 / 65 s) → gleichmäßig ~20 Zeichen/s.
  // Szenen werden per Zeit-Warp auf die neue Achse gesetzt; ts = Zeitfaktor, damit Animationen/SFX in der Szene mitlaufen.
  const WARP = [[0, 0], [17.2, 11.6], [35.8, 24.5], [55.25, 40.2], [86.8, 64.6]];
  const warp = (x) => { for (let i = 1; i < WARP.length; i++) { const [a, A] = WARP[i - 1], [b, B] = WARP[i]; if (x <= b) return A + (x - a) * (B - A) / (b - a); } return WARP[WARP.length - 1][1]; };
  const OLD_END = 87.17;
  scenes.forEach((sc, i) => { const os = sc.start, oe = i + 1 < scenes.length ? scenes[i + 1].start : OLD_END; sc._ns = warp(os); sc._ne = i + 1 < scenes.length ? warp(oe) : 64.6; sc.ts = (oe - os) / (sc._ne - sc._ns); });
  scenes.forEach((sc) => { sc.start = sc._ns; });
  music.sections = music.sections.map(([x, k]) => [warp(x), k]); music.drops = music.drops.map(warp);
  music.sections.push([64.6, 'tension'], [79.2, 'full']);

  scenes.push(
    { // 64,6–79,25: Reform geplant (noch kein Gesetz) – 25 % + Soli statt persönlichem Satz (lt. Original-Folie: Haushaltsentwurf 3. Juli 2026)
      start: 64.6, mood: 'dark', poses: ['emotions/nachdenklich', 'poses/analysieren'], ...TS('up'), focus: { x: 640, y: 930 },
      sfx: [SW(), [0.4, 'swell', 0.35, 0], [0.5, 'ding', 0.4, 0.2], ...flySfx(1.5, 0.3), [3.0, 'paper', 0.35, 0.3], [5.0, 'pop', 0.4, -0.2], ...ticks(5.3, 6.6, 8, 0.35, -0.2), [7.4, 'pop', 0.4, 0.2], ...ticks(7.7, 8.8, 7, 0.35, 0.2), [8.9, 'impact', 0.35, 0.2], [11.5, 'ping', 0.4, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'REFORM GEPLANT', c: C.white, size: 125, ribbon: '#F59E0B' }, { t: '(NOCH KEIN GESETZ)', c: C.white, size: 95 }]], [4.8, [{ t: 'PERSÖNLICHER SATZ', c: C.white, size: 105 }, { t: '→ 25 % + SOLI?', c: GOLD, size: 125 }]]]);
        if (lt < 4.8) { fly(ctx, 700, 1000, lt, 1.5, 'up', () => doc(ctx, 0, 0, 0.9, { title: 'ENTWURF', sign: 0 }), { rot: 0.2 }); if (lt > 2.4) tag(ctx, '3. JULI 2026', 700, 1300, '#334155', pop(lt, 2.4, 0.4)); }
        else bars(ctx, 650, 1230, [['HEUTE', 45, '#22C55E', '14–45 %', 5.0], ['GEPLANT', 26.4, '#F59E0B', '25 % + SOLI', 7.4]], lt, 5.0, { max: 50, h: 440 });
        if (lt > 11.5) tag(ctx, 'NOCH NICHT BESCHLOSSEN', 650, 640, RED, pop(lt, 11.5, 0.4));
        pandaSeq(ctx, [[0, 'emotions/nachdenklich'], [4.8, 'poses/analysieren']], lt, t, { x: 150, h: 420 });
      } },
    { // 79,25–Ende: Outro – nächste Woche Haltefrist im Detail
      start: 79.25, mood: 'good', poses: ['emotions/freundlich'], ...TS('zoom'), focus: { x: 640, y: 930 },
      sfx: [SW(), [0.3, 'swell', 0.35, 0], [0.4, 'ding', 0.45, 0.2], ...flySfx(1.2, 0.3), [2.4, 'pop', 0.45, 0.3], [3.2, 'ping', 0.4, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'NÄCHSTE WOCHE:', c: C.white, size: 120 }, { t: 'HALTEFRIST IM DETAIL', c: C.white, size: 100, ribbon: GRN }]]]);
        fly(ctx, 700, 960, lt, 1.2, 'up', () => P.calendar(ctx, 0, 0, 1.0, 'HALTEFRIST', '12 M.'), { rot: 0.3 });
        P.heart(ctx, 900, 760, 1.1 * pop(lt, 2.4, 0.4) * (1 + Math.sin(t * 6) * 0.05)); tag(ctx, '+ ABONNIEREN', 700, 1270, '#FF3B5C', 1.3 * pop(lt, 3.2, 0.45));
        panda(ctx, 'emotions/freundlich', lt, t, { x: 150, h: 420 });
      } });

  window.VIDEO = { name: 'krypto-freigrenze', style: 'clean', fps: 30, duration: 87.17, scenes, captions, xfade: 0.35, grain: 0.035, bokeh: false, endFade: false, pandaFixed: true, music };
})();
