// Eli Lilly – EU-Ausschuss empfiehlt Abnehmpille Foundayo (Orforglipron) – Short (61,7 s). Clean-Stil + Einflüge, ruhiger Hook.
// Fakten geprüft: CHMP-Empfehlung 15.10.2026 (EMA), EU-Kommission entscheidet; Studien >4.740 Erwachsene; Q2: 98 Mio. $ (Wegovy-Pille ≈ 497 Mio. $).
(() => {
  const E = window.E, C = E.C, P = E.P, K = E.K;
  const { pop, prog, eOut, eInOut, lerp } = E;
  const { panda, pandaSeq, H, ticks, de, sparks, glass, bigNum, label, tag, bars, poll, doc, pulseRings, timeline, fly, flySfx, warn } = K;
  const { GOLD, GRN, BLUE, CYAN, VIO, RED } = K.COL;
  const LLY = '#E11D48', NOVO = '#0EA5E9', EUB = '#1D4ED8';

  function pill(ctx, x, y, s, col = LLY, txt = 'F', o = {}) { // runde Filmtablette
    if (s <= 0.001) return;
    E.withT(ctx, x, y, s, o.rot || 0, () => {
      ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 40; ctx.beginPath(); ctx.ellipse(0, 0, 120, 120, 0, 0, 7);
      const g = ctx.createRadialGradient(-40, -40, 10, 0, 0, 130); g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, E.shade(col, 0.55)); ctx.fillStyle = g; ctx.fill(); ctx.restore();
      ctx.beginPath(); ctx.arc(0, 0, 120, 0, 7); ctx.lineWidth = 6; ctx.strokeStyle = col; ctx.stroke();
      ctx.strokeStyle = 'rgba(15,23,42,0.18)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-80, 0); ctx.lineTo(80, 0); ctx.stroke();
      if (txt) E.plainText(ctx, txt, 0, -45, 54, col, { weight: 900 });
    });
  }
  function stars(ctx, x, y, r, t, s = 1) { for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + t * 0.2; E.withT(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, s * 0.7, 0, () => { ctx.beginPath(); for (let k = 0; k < 10; k++) { const rr = k % 2 ? 9 : 22, aa = k * Math.PI / 5 - Math.PI / 2; ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } ctx.closePath(); ctx.fillStyle = GOLD; ctx.fill(); }); } }
  function badge(ctx, txt, col, sub) { E.rr(ctx, -150, -70, 300, 140, 30); ctx.fillStyle = col; ctx.fill(); E.plainText(ctx, txt, 0, sub ? -12 : 2, txt.length > 8 ? 36 : 46, C.white, { weight: 900 }); if (sub) E.plainText(ctx, sub, 0, 34, 22, 'rgba(255,255,255,0.8)', { weight: 800 }); }
  function clock(ctx, x, y, r, h, m, col = C.white) {
    ctx.save(); ctx.shadowColor = 'rgba(2,6,23,0.6)'; ctx.shadowBlur = 30; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = '#0F172A'; ctx.fill(); ctx.restore();
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.stroke();
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.82, y + Math.sin(a) * r * 0.82); ctx.lineTo(x + Math.cos(a) * r * 0.92, y + Math.sin(a) * r * 0.92); ctx.lineWidth = 4; ctx.stroke(); }
    const ah = -Math.PI / 2 + ((h % 12) / 12 + m / 720) * Math.PI * 2, am = -Math.PI / 2 + (m / 60) * Math.PI * 2;
    ctx.lineCap = 'round'; ctx.strokeStyle = col; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ah) * r * 0.5, y + Math.sin(ah) * r * 0.5); ctx.stroke();
    ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(am) * r * 0.75, y + Math.sin(am) * r * 0.75); ctx.stroke();
  }
  function glassWater(ctx, x, y, s) { E.withT(ctx, x, y, s, 0, () => { ctx.beginPath(); ctx.moveTo(-50, -80); ctx.lineTo(50, -80); ctx.lineTo(38, 80); ctx.lineTo(-38, 80); ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.stroke(); ctx.beginPath(); ctx.moveTo(-41, 40); ctx.lineTo(41, 40); ctx.lineTo(38, 80); ctx.lineTo(-38, 80); ctx.closePath(); ctx.fillStyle = 'rgba(56,189,248,0.6)'; ctx.fill(); }); }
  function scale(ctx, x, y, s, kg) { E.withT(ctx, x, y, s, 0, () => {
    ctx.save(); ctx.shadowColor = 'rgba(2,6,23,0.6)'; ctx.shadowBlur = 30; E.rr(ctx, -170, -60, 340, 160, 40); ctx.fillStyle = '#E2E8F0'; ctx.fill(); ctx.restore();
    E.rr(ctx, -110, -40, 220, 80, 18); ctx.fillStyle = '#0F172A'; ctx.fill(); E.plainText(ctx, `${kg.toFixed(0)} KG`, 0, 2, 50, '#4ADE80', { weight: 900 }); }); }
  function people(ctx, x, y, lt, at, n = 30, cols = 10) { for (let i = 0; i < n; i++) { const s = pop(lt, at + i * 0.025, 0.3); if (s <= 0) continue; const px = x + (i % cols - (cols - 1) / 2) * 52, py = y + Math.floor(i / cols) * 70;
    E.withT(ctx, px, py, s, 0, () => { ctx.fillStyle = i % 3 ? '#94A3B8' : '#E2E8F0'; ctx.beginPath(); ctx.arc(0, -18, 12, 0, 7); ctx.fill(); E.rr(ctx, -16, -2, 32, 34, 12); ctx.fill(); }); } }

  const captions = [
    [0.0, 1.5, 'Breaking News bei Eli Lilly,'], [1.5, 3.0, 'EU empfiehlt jetzt Lillys'], [3.0, 5.25, 'Abnehmpille, und muss Novo Nordisk'], [5.25, 6.0, 'hier zittern?'],
    [6.0, 7.0, 'Und 1 Unterschied im'], [7.0, 8.5, 'Alltag könnte den Ausschlag'], [8.5, 9.5, 'geben. Der EU-Ausschuss'], [9.75, 11.25, 'CHMP nämlich empfiehlt die'],
    [11.25, 12.75, 'Zulassung von Foundayo, der'], [12.75, 14.25, 'Abnehmpille von Eli Lilly.'], [14.25, 16.0, 'Der Wirkstoff: Orforglipron,'], [16.0, 17.25, 'einmal täglich als Tablette'],
    [17.5, 18.75, 'für Gewichtsabnahme und Typ-'], [18.75, 19.5, '2-Diabetes'], [19.75, 20.5, 'bei Erwachsenen.'], [20.5, 21.25, 'Wichtig wird\'s jetzt:'],
    [21.25, 22.25, 'Das Ganze ist natürlich'], [22.25, 23.25, 'keine Anlageberatung.'], [23.25, 23.75, 'Über 1 Like und'], [23.75, 24.75, '1 Follow freu ich'],
    [24.75, 25.0, 'mich trotzdem.'], [25.0, 25.75, 'Was man hier sagen'], [25.75, 27.25, 'muss: Das ist eine Empfehlung.'], [27.5, 28.75, 'Die EU-Kommission'],
    [28.75, 29.25, 'entscheidet noch.'], [29.25, 31.25, 'In Studien mit über 4.700'], [31.25, 32.25, 'Erwachsenen verloren'], [32.25, 33.0, 'Teilnehmer bis zu 11'],
    [33.0, 35.0, 'Prozent ihres Gewichts. Bei'], [35.0, 35.25, '100 Kilo,'], [35.25, 36.75, 'also bis zu 11 Kilo.'], [36.75, 38.0, 'In den USA gibt'],
    [38.0, 38.5, 'es die Pille seit'], [38.5, 40.0, 'April, und 98 Millionen'], [40.0, 42.0, 'Dollar Umsatz im 2. Quartal.'], [42.0, 43.25, 'Der Markt soll laut Schätzungen'],
    [43.25, 44.5, 'bis 2030'], [44.5, 45.75, 'über 100 Milliarden Dollar pro'], [45.75, 46.25, 'Jahr erreichen.'], [46.25, 48.0, 'Lilly wirbt hier mit dem Alltag:'],
    [48.0, 48.5, 'Foundayo'], [48.5, 49.5, 'geht zu jeder Tageszeit,'], [49.5, 51.0, 'ohne Essensregeln.'], [51.0, 53.75, 'Die Wegovy-Tablette hingegen morgens'],
    [53.75, 54.5, 'nüchtern mit wenig Wasser.'], [54.5, 56.0, 'Aus Sicht von Lilly: Komfort.'], [56.0, 57.0, 'Aus Sicht von Novo:'], [57.0, 57.25, 'Vorsprung.'],
    [57.25, 58.0, 'Der Kurs von'], [58.0, 59.75, 'Eli Lilly reagiert sehr'], [59.75, 60.5, 'positiv. Der Kurs von'], [60.5, 61.25, 'Novo Nordisk, na ja,'],
    [61.25, 61.7, 'wie immer nicht so gut.'],
  ];

  const HC = { hard: true, punchAmt: 0.06, flashAmt: 0.14 };
  const TS = (dir, extra = {}) => ({ trans: dir, transDur: 0.5, punchAmt: 0.05, flashAmt: 0.0, ...extra });
  const scenes = [
    // ===== HOOK 0–14,25 s: 6 Schnitte à ~2–3 s =====
    { start: 0, mood: 'bad', poses: ['emotions/ueberrascht'], punch: false, noBrand: true, ...HC, focus: { x: 540, y: 1000 },
      sfx: [[0.0, 'impact', 0.45, 0], [0.05, 'ping', 0.45, 0], [0.25, 'whoosh', 0.35, 0.3], [0.7, 'paper', 0.35, 0.2], [1.1, 'pop', 0.4, 0.3]],
      draw(ctx, lt, t) {
        E.liveBar(ctx, lt, 'ELI LILLY  •  EU-AUSSCHUSS EMPFIEHLT FOUNDAYO  •  ABNEHMPILLE  •  NOVO NORDISK UNTER DRUCK  •  ');
        E.headline(ctx, [{ t: 'BREAKING', c: C.white, size: 140, ribbon: RED }, { t: 'NEWS!', c: C.white, size: 140 }], lt, { y: 480, delay: 0.05 });
        const p = eOut(prog(lt, 0.25, 0.7));
        E.withT(ctx, 700, 1080, lerp(0.1, 0.85, p), lerp(Math.PI * 2, -0.06, p), () => E.newspaper(ctx, 0, 0, 500, { masthead: 'BÖRSE', headline: ['ELI LILLY', 'ABNEHMPILLE'] }));
        if (lt > 1.1) tag(ctx, 'ELI LILLY', 880, 760, LLY, pop(lt, 1.1, 0.35));
        panda(ctx, 'emotions/ueberrascht', lt, t, { x: 170, h: 460 });
      } },
    { start: 1.5, mood: 'blue', poses: ['poses/praesentieren'], ...TS('zoom'), focus: { x: 640, y: 1000 },
      sfx: [[-0.18, 'whoosh', 0.4, 0], [0.2, 'swell', 0.3, 0], [0.4, 'ding', 0.4, 0.2], ...flySfx(0.6, 0.3)],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'EU EMPFIEHLT', c: C.white, size: 125, ribbon: EUB }, { t: 'LILLYS PILLE', c: C.white, size: 125 }], lt);
        stars(ctx, 700, 1000, 270, t, pop(lt, 0.1, 0.5));
        fly(ctx, 700, 1000, lt, 0.6, 'up', () => pill(ctx, 0, 0, 1.0, LLY, 'F'), { rot: 0.6 });
        sparks(ctx, 700, 1000, lt, 1.0, 18, GOLD);
        panda(ctx, 'poses/praesentieren', lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },
    { start: 3.0, mood: 'bad', poses: ['emotions/nachdenklich'], ...TS('right'), focus: { x: 640, y: 1000 },
      sfx: [[-0.18, 'whoosh', 0.4, 0.3], ...flySfx(0.3, 0.3), [2.3, 'glitch', 0.3, 0.3], [2.35, 'down', 0.3, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'MUSS NOVO', c: C.white, size: 135, ribbon: NOVO }, { t: 'NORDISK …', c: C.white, size: 130 }]], [2.25, [{ t: '… JETZT', c: C.white, size: 130 }, { t: 'ZITTERN?', c: C.white, size: 140, ribbon: RED }]]]);
        const sh = lt > 2.3 ? Math.sin(t * 40) * 8 * (1 - prog(lt, 2.3, 0.7)) : 0;
        fly(ctx, 700 + sh, 1000, lt, 0.3, 'right', () => E.withT(ctx, 0, 0, 1.35, 0, () => badge(ctx, 'NOVO NORDISK', NOVO, 'WEGOVY')));
        if (lt > 2.3) E.withT(ctx, 890, 870, pop(lt, 2.3, 0.4), 0, () => E.arrowDown(ctx, 0, 0, 0.5, C.red));
        panda(ctx, 'emotions/nachdenklich', lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },
    { start: 6.0, mood: 'dark', poses: ['poses/tipp_geben'], ...TS('up'), focus: { x: 640, y: 1000 },
      sfx: [[-0.18, 'whoosh', 0.4, 0], [0.3, 'pop', 0.4, 0.2], ...ticks(0.6, 2.0, 8, 0.35, 0.2), [2.1, 'ping', 0.45, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: '1 UNTERSCHIED', c: C.white, size: 120 }, { t: 'IM ALLTAG', c: C.white, size: 130, ribbon: VIO }]], [2.0, [{ t: 'KÖNNTE ENT-', c: C.white, size: 125 }, { t: 'SCHEIDEN', c: GOLD, size: 140 }]]]);
        const hh = lerp(7, 21, eInOut(prog(lt, 0.6, 1.5)));
        E.withT(ctx, 700, 1000, pop(lt, 0.2, 0.45), 0, () => clock(ctx, 0, 0, 200, Math.floor(hh), (hh % 1) * 60, GOLD));
        sparks(ctx, 700, 1000, lt, 2.1, 16, GOLD);
        panda(ctx, 'poses/tipp_geben', lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },
    { start: 8.5, mood: 'blue', poses: ['poses/zeigen'], ...TS('left'), focus: { x: 640, y: 1000 },
      sfx: [[-0.18, 'whoosh', 0.4, -0.3], ...flySfx(0.3, -0.3), [1.5, 'paper', 0.3, 0.2], [2.4, 'stamp', 0.4, 0.2], [2.45, 'ding', 0.4, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'EU-AUSSCHUSS', c: C.white, size: 120, ribbon: EUB }, { t: 'CHMP', c: C.white, size: 150 }]], [1.4, [{ t: 'EMPFIEHLT DIE', c: C.white, size: 120 }, { t: 'ZULASSUNG', c: C.white, size: 135, ribbon: GRN }]]]);
        fly(ctx, 700, 1010, lt, 0.3, 'left', () => doc(ctx, 0, 0, 0.9, { title: 'CHMP · EMA', sign: prog(lt, 1.6, 0.7) }), { rot: 0.2 });
        E.stamp(ctx, 'EMPFOHLEN ✓', 700, 1060, lt, 2.35, { size: 44, rot: -0.14, color: '#16A34A' });
        panda(ctx, 'poses/zeigen', lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },
    { start: 11.25, mood: 'good', poses: ['emotions/begeistert'], ...TS('zoom'), focus: { x: 640, y: 1000 },
      sfx: [[-0.18, 'whoosh', 0.4, 0], ...flySfx(0.2, 0.2), [0.75, 'ping', 0.45, 0.2], [1.6, 'pop', 0.4, -0.3], [1.8, 'pop', 0.4, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'FOUNDAYO', c: C.white, size: 150, ribbon: LLY }, { t: 'VON ELI LILLY', c: C.white, size: 110 }]]]);
        fly(ctx, 700, 990, lt, 0.2, 'down', () => glass(ctx, 0, 0, 440, 480, { accent: LLY, title: 'ABNEHMPILLE', body: () => { pill(ctx, 0, 0, 0.9 + 0.03 * Math.sin(t * 3), LLY, 'F'); } }));
        if (lt > 1.6) { tag(ctx, 'TABLETTE', 560, 1290, '#334155', pop(lt, 1.6, 0.35)); tag(ctx, 'KEINE SPRITZE', 850, 1290, GRN, pop(lt, 1.8, 0.35)); }
        sparks(ctx, 700, 990, lt, 0.75, 20, '#F9A8D4');
        panda(ctx, 'emotions/begeistert', lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },

    // ===== Ruhiger Teil =====
    { // 14,25–20,5: Wirkstoff Orforglipron, 1× täglich, Abnahme + Typ-2-Diabetes, Erwachsene
      start: 14.25, mood: 'blue', poses: ['poses/praesentieren'], ...TS('right'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0.3], ...flySfx(0.3, 0.3), ...flySfx(1.9, -0.3), ...flySfx(3.4, 0.3), ...flySfx(4.6, -0.3), ...flySfx(5.6, 0.3)],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'WIRKSTOFF:', c: C.white, size: 130 }, { t: 'ORFORGLIPRON', c: C.white, size: 110, ribbon: LLY }]], [1.75, [{ t: '1× TÄGLICH', c: C.white, size: 140, ribbon: VIO }, { t: 'ALS TABLETTE', c: C.white, size: 115 }]]]);
        fly(ctx, 690, 830, lt, 0.3, 'right', () => glass(ctx, 0, 0, 560, 300, { accent: LLY, title: 'GLP-1 · ORAL', body: () => { pill(ctx, -160, 20, 0.5, LLY, 'F'); E.plainText(ctx, 'ORFORGLIPRON', 70, 0, 40, C.white, { weight: 900 }); label(ctx, 'KEIN PEPTID · TABLETTE', 70, 50, 22); } }));
        [['1× TÄGLICH', 'left', 1110, 1.9, VIO], ['ABNEHMEN', 'right', 1190, 3.4, GRN], ['TYP-2-DIABETES', 'left', 1270, 4.6, BLUE], ['ERWACHSENE', 'right', 1350, 5.6, '#334155']].forEach(([n, from, y, at, col], i) => fly(ctx, i % 2 ? 840 : 580, y - 40, lt, at, from, () => tag(ctx, n, 0, 0, col, 1.1)));
        panda(ctx, 'poses/praesentieren', lt, t, { x: 160, h: 440 });
      } },
    { // 20,5–25: Wichtig + keine Anlageberatung + Like/Follow
      start: 20.5, mood: 'neutral', poses: ['emotions/augenzwinkern', 'emotions/freundlich'], ...TS('down'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0], ...flySfx(0.9, 0.2), [1.1, 'paper', 0.3, 0.2], [3.0, 'pop', 0.45, 0.3], [3.4, 'pop', 0.45, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'WICHTIG:', c: GOLD, size: 150 }]], [0.75, [{ t: 'KEINE', c: C.white, size: 130 }, { t: 'ANLAGEBERATUNG', c: C.white, size: 110, ribbon: BLUE }]], [2.75, [{ t: 'LIKE & FOLLOW', c: C.white, size: 115, ribbon: '#FF3B5C' }]]]);
        if (lt < 0.75) warn(ctx, 700, 1000, pop(lt, 0.1, 0.45) * 0.8, t);
        else if (lt < 2.75) fly(ctx, 680, 960, lt, 0.9, 'up', () => glass(ctx, 0, 0, 540, 320, { accent: BLUE, title: 'HINWEIS', body: () => { label(ctx, 'NUR INFORMATION', 0, -5, 46, C.white); label(ctx, 'KEINE KAUFEMPFEHLUNG', 0, 60, 30); } }), { rot: 0.1 });
        else { P.heart(ctx, 820, 820, 1.4 * pop(lt, 3.0, 0.4) * (1 + Math.sin(t * 6) * 0.05)); tag(ctx, '+ FOLGEN', 820, 1100, '#FF3B5C', 1.4 * pop(lt, 3.4, 0.45)); }
        pandaSeq(ctx, [[0, 'emotions/augenzwinkern'], [2.75, 'emotions/freundlich']], lt, t, { x: 170, h: 460 });
      } },
    { // 25–29,25: Empfehlung ≠ Zulassung – EU-Kommission entscheidet
      start: 25.0, mood: 'dark', poses: ['poses/tipp_geben'], ...TS('zoom'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0], [0.4, 'pop', 0.4, -0.3], [2.6, 'pop', 0.4, 0.3], [3.2, 'tick', 0.4, 0.3], [3.5, 'tick', 0.4, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'ERST MAL NUR', c: C.white, size: 120 }, { t: 'EMPFEHLUNG', c: C.white, size: 125, ribbon: GOLD }]], [2.5, [{ t: 'EU-KOMMISSION', c: C.white, size: 115, ribbon: EUB }, { t: 'ENTSCHEIDET', c: C.white, size: 125 }]]]);
        timeline(ctx, 700, 1000, 640, [['15.10.', 'CHMP ✓', GRN, 0.4], ['EU-KOMM.', 'ENTSCHEIDUNG', EUB, 2.6], ['ZULASSUNG', 'OFFEN', '#F59E0B', 3.4]], lt);
        if (lt > 3.6) tag(ctx, 'MEIST IN WOCHEN', 700, 1200, '#334155', pop(lt, 3.6, 0.4));
        panda(ctx, 'poses/tipp_geben', lt, t, { x: 150, h: 420 });
      } },
    { // 29,25–35: Studien >4.700 Erwachsene, bis 11 % Gewicht
      start: 29.25, mood: 'good', poses: ['poses/analysieren'], ...TS('left'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, -0.3], ...ticks(0.3, 1.8, 10, 0.35, 0.2), [1.85, 'ding', 0.4, 0.2], [3.8, 'down', 0.25, 0.2], [4.3, 'impact', 0.3, 0.2], [4.35, 'ping', 0.45, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'STUDIEN MIT', c: C.white, size: 125 }, { t: '> 4.700', c: C.white, size: 150, ribbon: BLUE }]], [3.75, [{ t: 'BIS ZU', c: C.white, size: 130 }, { t: '–11 % GEWICHT', c: C.white, size: 115, ribbon: GRN }]]]);
        if (lt < 3.75) { people(ctx, 700, 830, lt, 0.2, 40, 8); const v = Math.round(lerp(0, 4740, eOut(prog(lt, 0.3, 1.6)))); if (lt > 0.3) tag(ctx, `${v.toLocaleString('de-DE')} ERWACHSENE`, 700, 1270, BLUE, pop(lt, 0.3, 0.4)); }
        else { const v = lerp(0, 11, eOut(prog(lt, 3.8, 0.8))); glass(ctx, 700, 1000, 480, 360, { scale: pop(lt, 3.75, 0.45), accent: GRN, title: 'GEWICHTSVERLUST', body: () => { bigNum(ctx, `–${Math.round(v)} %`, 0, 10, 170, '#4ADE80'); label(ctx, 'BIS ZU · IN STUDIEN', 0, 120, 26); } }); }
        panda(ctx, 'poses/analysieren', lt, t, { x: 150, h: 420 });
      } },
    { // 35–36,75: 100 kg → bis 89 kg
      start: 35.0, mood: 'good', poses: ['emotions/begeistert'], ...TS('up'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0], ...flySfx(0.1, 0.2), ...ticks(0.6, 1.4, 6, 0.4, 0.2), [1.45, 'ding', 0.45, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: '100 KG →', c: C.white, size: 140 }, { t: 'BIS –11 KG', c: C.white, size: 130, ribbon: GRN }]]]);
        fly(ctx, 700, 1080, lt, 0.1, 'down', () => scale(ctx, 0, 0, 1.3, lerp(100, 89, eInOut(prog(lt, 0.6, 0.85)))), { rot: 0 });
        sparks(ctx, 700, 1050, lt, 1.45, 18, '#4ADE80');
        panda(ctx, 'emotions/begeistert', lt, t, { x: 150, h: 420 });
      } },
    { // 36,75–42: USA seit April, 98 Mio. $ im Q2 (+ Kontext: Wegovy-Pille ≈ 497 Mio. $)
      start: 36.75, mood: 'blue', poses: ['poses/zeigen', 'emotions/nachdenklich'], ...TS('right'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0.3], ...flySfx(0.3, -0.3), ...ticks(1.9, 3.1, 9, 0.4, 0.2), [3.15, 'cash', 0.5, 0.2], [4.2, 'pop', 0.4, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'USA: SEIT APRIL', c: C.white, size: 115 }, { t: 'AUF DEM MARKT', c: C.white, size: 115, ribbon: BLUE }]], [1.75, [{ t: '98 MIO. $', c: C.white, size: 150, ribbon: GRN }, { t: 'UMSATZ IM Q2', c: C.white, size: 115 }]]]);
        bars(ctx, 650, 1230, [['FOUNDAYO', 98, LLY, '98 MIO. $', 1.9], ['WEGOVY-PILLE', 497, NOVO, '≈ 497 MIO. $', 4.1]], lt, 1.9, { max: 540, h: 440 });
        if (lt > 4.2) tag(ctx, 'NOVO 3 MONATE FRÜHER', 650, 650, NOVO, pop(lt, 4.2, 0.4));
        pandaSeq(ctx, [[0, 'poses/zeigen'], [4.1, 'emotions/nachdenklich']], lt, t, { x: 150, h: 420 });
      } },
    { // 42–46,25: Markt bis 2030 > 100 Mrd. $ pro Jahr
      start: 42.0, mood: 'good', poses: ['emotions/ueberrascht'], ...TS('zoom'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0], [0.4, 'pop', 0.35, -0.3], [1.0, 'pop', 0.35, 0], [1.6, 'pop', 0.35, 0.3], [2.4, 'riser', 0.3, 0], [2.5, 'sub', 0.3, 0], [2.55, 'cash', 0.5, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'MARKT BIS 2030:', c: C.white, size: 110 }, { t: '> 100 MRD. $', c: C.white, size: 135, ribbon: GRN }]], [2.5, [{ t: 'PRO JAHR!', c: GOLD, size: 160 }, { t: 'LAUT SCHÄTZUNGEN', c: C.white, size: 90 }]]]);
        bars(ctx, 650, 1230, [['HEUTE', 30, '#64748B', '', 0.4], ['2028', 65, '#22C55E', '', 1.0], ['2030', 100, '#16A34A', '100+ MRD.', 1.6]], lt, 0.4, { max: 110, h: 460, bw: 140, gap: 50 });
        sparks(ctx, 760, 760, lt, 2.55, 22, GOLD);
        panda(ctx, 'emotions/ueberrascht', lt, t, { x: 150, h: 420 });
      } },
    { // 46,25–51: Lilly wirbt mit dem Alltag – jederzeit, ohne Essensregeln
      start: 46.25, mood: 'good', poses: ['poses/praesentieren'], ...TS('left'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, -0.3], ...flySfx(1.75, -0.3), ...ticks(2.3, 3.2, 6, 0.3, -0.2), ...flySfx(3.3, 0.3), [3.8, 'ding', 0.45, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'LILLYS ARGUMENT:', c: C.white, size: 110 }, { t: 'DER ALLTAG', c: C.white, size: 130, ribbon: LLY }]], [2.25, [{ t: 'JEDERZEIT,', c: '#4ADE80', size: 140 }, { t: 'OHNE ESSENSREGELN', c: C.white, size: 92 }]]]);
        const hh = 6 + ((lt * 4) % 18);
        fly(ctx, 540, 1000, lt, 1.75, 'left', () => clock(ctx, 0, 0, 150, Math.floor(hh), (hh % 1) * 60, '#4ADE80'));
        fly(ctx, 860, 1000, lt, 3.3, 'right', () => { pill(ctx, 0, -20, 0.7, LLY, 'F'); tag(ctx, '✓ FOUNDAYO', 0, 150, GRN, 1); });
        panda(ctx, 'poses/praesentieren', lt, t, { x: 150, h: 420 });
      } },
    { // 51–54,5: Wegovy-Tablette morgens nüchtern mit wenig Wasser
      start: 51.0, mood: 'blue', poses: ['emotions/nachdenklich'], ...TS('right'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0.3], ...flySfx(0.3, -0.3), ...flySfx(1.3, 0.3), [2.8, 'pop', 0.4, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'WEGOVY-TABLETTE:', c: C.white, size: 105, ribbon: NOVO }, { t: 'MORGENS NÜCHTERN', c: C.white, size: 100 }]]]);
        fly(ctx, 540, 1000, lt, 0.3, 'left', () => clock(ctx, 0, 0, 150, 7, 0, NOVO));
        fly(ctx, 860, 1010, lt, 1.3, 'right', () => { pill(ctx, -60, 40, 0.45, NOVO, 'W'); glassWater(ctx, 80, 0, 1.1); });
        if (lt > 2.8) tag(ctx, 'WENIG WASSER · NICHTS ESSEN', 700, 1270, '#334155', pop(lt, 2.8, 0.4));
        panda(ctx, 'emotions/nachdenklich', lt, t, { x: 150, h: 420 });
      } },
    { // 54,5–57,25: Lilly Komfort vs. Novo Vorsprung
      start: 54.5, mood: 'dark', poses: ['poses/zeigen', 'emotions/augenzwinkern'], ...TS('up'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0], ...flySfx(0.2, -0.3), [0.75, 'ding', 0.4, -0.3], ...flySfx(1.6, 0.3), [2.1, 'snap', 0.4, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'LILLY:', c: C.white, size: 135 }, { t: 'KOMFORT', c: C.white, size: 135, ribbon: LLY }]], [1.5, [{ t: 'NOVO:', c: C.white, size: 135 }, { t: 'VORSPRUNG', c: C.white, size: 130, ribbon: NOVO }]]]);
        fly(ctx, 520, 1000, lt, 0.2, 'left', () => glass(ctx, 0, 0, 300, 380, { accent: LLY, title: 'ELI LILLY', body: () => { pill(ctx, 0, -10, 0.55, LLY, 'F'); label(ctx, 'JEDERZEIT', 0, 130, 28, C.white); } }));
        fly(ctx, 870, 1000, lt, 1.6, 'right', () => glass(ctx, 0, 0, 300, 380, { accent: NOVO, title: 'NOVO NORDISK', body: () => { bigNum(ctx, '1.', 0, -10, 140, NOVO); label(ctx, 'ALS ERSTER AM MARKT', 0, 130, 22, C.white); } }));
        pandaSeq(ctx, [[0, 'poses/zeigen'], [1.5, 'emotions/augenzwinkern']], lt, t, { x: 150, h: 420 });
      } },
    { // 57,25–Ende: Kurs Lilly sehr positiv, Novo – na ja
      start: 57.25, mood: 'good', poses: ['emotions/begeistert', 'emotions/augenzwinkern'], ...TS('zoom'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0], ...flySfx(0.2, -0.3), [0.9, 'cash', 0.45, -0.3], ...flySfx(2.5, 0.3), [3.1, 'down', 0.3, 0.3], [3.5, 'pop', 0.4, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'LILLY-KURS:', c: C.white, size: 125 }, { t: 'SEHR POSITIV', c: C.white, size: 120, ribbon: GRN }]], [2.5, [{ t: 'NOVO-KURS:', c: C.white, size: 125 }, { t: 'NA JA …', c: C.white, size: 140, ribbon: RED }]]]);
        fly(ctx, 520, 1000, lt, 0.2, 'left', () => glass(ctx, 0, 0, 300, 360, { accent: GRN, title: 'ELI LILLY', body: () => { E.lineChart(ctx, -110, -60, 220, 130, [[0, 0.8], [0.4, 0.7], [0.7, 0.5], [1, 0.05]], eOut(prog(lt, 0.4, 0.7)), '#22C55E', { lw: 8, area: true }); E.arrowUp(ctx, 0, 120, 0.3, C.green); } }));
        fly(ctx, 870, 1000, lt, 2.5, 'right', () => glass(ctx, 0, 0, 300, 360, { accent: RED, title: 'NOVO NORDISK', body: () => { E.lineChart(ctx, -110, -60, 220, 130, [[0, 0.2], [0.4, 0.35], [0.7, 0.6], [1, 0.85]], eOut(prog(lt, 2.7, 0.7)), '#EF4444', { lw: 8, area: true }); E.arrowDown(ctx, 0, 120, 0.3, C.red); } }));
        pandaSeq(ctx, [[0, 'emotions/begeistert'], [2.5, 'emotions/augenzwinkern']], lt, t, { x: 150, h: 420 });
      } },
  ];

  const music = {
    bpm: 98, chords: [['A', 'm'], ['F', ''], ['C', ''], ['G', '']], level: 0.5, abs: 0.1,
    sections: [[0, 'tension'], [1.5, 'pulse'], [3.0, 'tension'], [8.5, 'full'], [20.5, 'pulse'], [29.25, 'full'], [51.0, 'tension'], [54.5, 'pulse'], [57.25, 'full']],
    drops: [38.2, 44.2],
  };

  window.VIDEO = { name: 'lilly-foundayo', style: 'clean', fps: 30, duration: 61.7, scenes, captions, xfade: 0.35, grain: 0.035, bokeh: false, endFade: false, pandaFixed: true, music };
})();
