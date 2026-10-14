// Rheinmetall × Nel – Absichtserklärung Kraftstoff vor Ort (Power-to-X) – Short (64,2 s). Clean-Stil + Einflüge, ruhiger Hook.
(() => {
  const E = window.E, C = E.C, P = E.P, K = E.K;
  const { pop, prog, eOut, eInOut, lerp } = E;
  const { panda, pandaSeq, H, ticks, de, sparks, glass, bigNum, label, tag, bars, poll, doc, pulseRings, timeline, fly, flySfx, warn } = K;
  const { GOLD, GRN, BLUE, CYAN, VIO, RED } = K.COL;
  const RHM = '#3B82F6', NEL = '#14B8A6', FUEL = '#F59E0B';

  function can(ctx, x, y, s, col = FUEL) { // Kanister
    E.withT(ctx, x, y, s, -0.08, () => {
      ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 30; E.rr(ctx, -110, -130, 220, 280, 28); const g = ctx.createLinearGradient(0, -130, 0, 150); g.addColorStop(0, col); g.addColorStop(1, E.shade(col, -0.45)); ctx.fillStyle = g; ctx.fill(); ctx.restore();
      E.rr(ctx, -70, -175, 70, 60, 14); ctx.fillStyle = '#334155'; ctx.fill(); E.rr(ctx, 10, -165, 80, 30, 12); ctx.fillStyle = E.shade(col, -0.3); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-70, -60); ctx.lineTo(70, 80); ctx.moveTo(70, -60); ctx.lineTo(-70, 80); ctx.stroke();
    });
  }
  function plant(ctx, x, y, s, t, col = NEL) { // Power-to-X-Anlage (Container mit Tanks)
    E.withT(ctx, x, y, s, 0, () => {
      ctx.save(); ctx.shadowColor = 'rgba(2,6,23,0.6)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12; E.rr(ctx, -200, -60, 260, 150, 14); ctx.fillStyle = '#E2E8F0'; ctx.fill(); ctx.restore();
      for (let i = 0; i < 6; i++) { ctx.fillStyle = '#CBD5E1'; ctx.fillRect(-190 + i * 42, -50, 8, 130); }
      E.rr(ctx, -200, -60, 260, 34, 10); ctx.fillStyle = col; ctx.fill(); E.plainText(ctx, 'PtX', -70, -42, 24, C.white, { weight: 900 });
      [[100, -20], [170, -20]].forEach(([tx, ty], i) => { E.rr(ctx, tx - 28, ty - 70, 56, 160, 28); ctx.fillStyle = i ? '#94A3B8' : '#CBD5E1'; ctx.fill(); });
      for (let k = 0; k < 3; k++) { const ph = (t * 0.6 + k / 3) % 1; ctx.globalAlpha = 0.5 * (1 - ph); ctx.beginPath(); ctx.arc(135 + Math.sin(ph * 6) * 10, -100 - ph * 110, 10 + ph * 16, 0, 7); ctx.fillStyle = '#BAE6FD'; ctx.fill(); } ctx.globalAlpha = 1;
    });
  }
  function badge(ctx, txt, col, sub) { E.rr(ctx, -150, -70, 300, 140, 30); ctx.fillStyle = col; ctx.fill(); E.plainText(ctx, txt, 0, sub ? -12 : 2, txt.length > 8 ? 36 : 46, C.white, { weight: 900 }); if (sub) E.plainText(ctx, sub, 0, 34, 22, 'rgba(255,255,255,0.8)', { weight: 800 }); }
  function h2(ctx, x, y, t, n = 8) { for (let i = 0; i < n; i++) { const ph = (t * 0.5 + i / n) % 1, xx = x + Math.sin(i * 2.3 + t) * 120; ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.8; ctx.beginPath(); ctx.arc(xx, y - ph * 300, 16, 0, 7); ctx.strokeStyle = '#7DD3FC'; ctx.lineWidth = 3; ctx.stroke(); if (i % 3 === 0) E.plainText(ctx, 'H₂', xx, y - ph * 300, 16, '#7DD3FC', { weight: 900 }); } ctx.globalAlpha = 1; }
  function xrow(ctx, txt, w, mark = '✕', col = RED) { E.rr(ctx, -w / 2, -42, w, 84, 24); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = col; ctx.stroke(); E.withT(ctx, -w / 2 + 50, 0, 1, 0, () => { ctx.beginPath(); ctx.arc(0, 0, 24, 0, 7); ctx.fillStyle = col; ctx.fill(); E.plainText(ctx, mark, 0, 2, 28, C.white, { weight: 900 }); }); E.plainText(ctx, txt, -w / 2 + 95, 2, 36, C.white, { weight: 900, align: 'left' }); }

  const captions = [
    [0.0, 1.25, 'Jetzt legt Rheinmetall wieder'], [1.25, 2.0, 'richtig los.'], [2.0, 3.0, 'Die Aktie steigt wegen'], [3.0, 5.0, 'eines Vertrages, der keiner ist.'],
    [5.0, 6.0, 'Es geht nämlich um'], [6.0, 7.5, 'Sprit und um 3'], [7.5, 9.5, 'Angaben, die in der Meldung'], [9.5, 10.25, 'komplett fehlen,'],
    [10.25, 11.0, 'und welche das sind,'], [11.0, 11.4, 'siehst du gleich.'], [11.4, 12.75, 'Diese News sind nämlich brandneu.'], [12.75, 13.75, 'Denn Rheinmetall und das norwegische'],
    [13.75, 16.4, 'Unternehmen Nel haben eine Absichtserklärung'], [16.4, 17.0, 'unterschrieben.'], [17.0, 18.75, 'Das Ziel dabei: Kraftstoff'], [18.75, 20.0, 'direkt dort herstellen, wo er'],
    [20.0, 20.75, 'gebraucht wird,'], [20.75, 22.0, 'zum Beispiel für Armeen und'], [22.0, 23.25, 'kritische Infrastruktur.'], [23.25, 24.75, 'Nel liefert dabei die'],
    [24.75, 27.25, 'Wasserstofftechnik, Rheinmetall das'], [27.25, 28.0, 'Konzept dazu.'], [28.0, 28.5, 'Und denk dran: Das'], [28.5, 29.75, 'Ganze ist keine Anlageberatung.'],
    [29.75, 30.5, 'Über \'n Like und'], [30.5, 31.0, '1 Follow würd ich'], [31.0, 31.25, 'mich freuen.'], [31.25, 32.75, 'Rheinmetall kratzt deswegen'],
    [32.75, 33.5, 'jetzt wieder knapp an'], [33.5, 34.5, 'der 1.000-Euro-Marke, und'], [34.5, 35.25, 'laut Rheinmetalls'], [35.25, 37.25, 'Konzept soll jede Anlage'],
    [37.25, 39.25, '5.000 bis 7.000 Tonnen'], [39.25, 40.75, 'Kraftstoff im Jahr schaffen.'], [41.0, 43.25, 'Langfristig mehrere hunderte Anlagen.'], [43.25, 44.0, 'Es gibt aber auch hier'],
    [44.0, 44.75, 'einen Haken.'], [44.75, 47.0, 'Die Absichtserklärung ist nicht bindend.'], [47.25, 49.0, 'Kein Auftragswert, keine Menge und'], [49.0, 50.0, 'kein Zeitplan.'],
    [50.0, 52.0, 'Erst kommt eine Machbarkeitsstudie,'], [52.0, 54.0, 'und Pilotprojekte sind nur denkbar.'], [54.0, 55.25, 'Aus Sicht von Rheinmetall'], [55.25, 56.5, '1 Startschuss, aus Sicht'],
    [56.5, 58.0, 'der Bilanz noch kein Auftrag.'], [58.25, 59.75, 'Deshalb genau aufpassen, und'], [59.75, 61.0, 'entscheidend wird für Rheinmetall'], [61.0, 62.0, 'der 05.11.'],
    [62.0, 63.0, 'Da legen sie nämlich ihre'], [63.0, 64.2, 'Quartalszahlen vor.'],
  ];

  const HC = { hard: true, punchAmt: 0.06, flashAmt: 0.14 };
  const TS = (dir, extra = {}) => ({ trans: dir, transDur: 0.5, punchAmt: 0.05, flashAmt: 0.0, ...extra });
  const scenes = [
    // ===== HOOK 0–17 s: 6 Schnitte à 2–3 s, Inhalte wechseln in der Szene, Elemente fliegen ein =====
    { start: 0, mood: 'good', poses: ['poses/zeigen'], punch: false, noBrand: true, ...HC, focus: { x: 540, y: 1000 },
      sfx: [[0.0, 'impact', 0.45, 0], [0.05, 'ping', 0.45, 0], ...flySfx(0.2, 0.4), ...ticks(0.6, 1.4, 6, 0.4, 0.3), [1.45, 'cash', 0.45, 0.3]],
      draw(ctx, lt, t) {
        E.liveBar(ctx, lt, 'RHEINMETALL × NEL  •  ABSICHTSERKLÄRUNG  •  KRAFTSTOFF VOR ORT  •  KNAPP UNTER 1.000 €  •  ');
        E.headline(ctx, [{ t: 'RHEINMETALL', c: C.white, size: 120, ribbon: RHM }, { t: 'LEGT LOS!', c: C.white, size: 130 }], lt, { y: 480, delay: 0.05 });
        const v = lerp(930, 989, eOut(prog(lt, 0.6, 0.85)));
        fly(ctx, 700, 1000, lt, 0.2, 'right', () => glass(ctx, 0, 0, 560, 400, { accent: GRN, title: 'RHM · AKTIE', body: () => {
          E.lineChart(ctx, -230, -70, 460, 150, [[0, 0.8], [0.2, 0.7], [0.4, 0.75], [0.6, 0.55], [0.8, 0.45], [1, 0.05]], eOut(prog(lt, 0.5, 0.9)), '#22C55E', { lw: 9, area: true });
          bigNum(ctx, `${Math.round(v)} €`, 0, 140, 70, '#4ADE80'); } }));
        sparks(ctx, 900, 820, lt, 1.45, 18, '#4ADE80');
        panda(ctx, 'poses/zeigen', lt, t, { x: 170, h: 460 });
      } },
    { start: 2.0, mood: 'dark', poses: ['emotions/nachdenklich'], ...TS('zoom'), focus: { x: 640, y: 1000 }, shake: [1.55], shakeSfx: 'stamp',
      sfx: [[-0.18, 'whoosh', 0.4, 0], ...flySfx(0.15, 0.2), [0.9, 'paper', 0.3, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'STEIGT WEGEN', c: C.white, size: 120 }, { t: 'EINES VERTRAGES …', c: C.white, size: 100, ribbon: RHM }]],
          [1.2, [{ t: '… DER', c: C.white, size: 130 }, { t: 'KEINER IST!', c: C.white, size: 130, ribbon: RED }]]]);
        fly(ctx, 700, 1000, lt, 0.15, 'up', () => doc(ctx, 0, 0, 0.9, { title: 'VERTRAG?', sign: 0 }), { rot: 0.2 });
        E.stamp(ctx, 'KEIN VERTRAG', 700, 1040, lt, 1.5, { size: 54, rot: -0.16 });
        panda(ctx, 'emotions/nachdenklich', lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },
    { start: 5.0, mood: 'neutral', poses: ['poses/praesentieren'], ...TS('left'), focus: { x: 640, y: 1000 },
      sfx: [[-0.18, 'whoosh', 0.4, -0.3], ...flySfx(0.9, 0.3), [1.5, 'ping', 0.45, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'ES GEHT UM', c: C.white, size: 125 }, { t: 'SPRIT!', c: FUEL, size: 170 }]]]);
        fly(ctx, 700, 1010, lt, 0.9, 'left', () => can(ctx, 0, 0, 1.15), { rot: 0.5 });
        sparks(ctx, 700, 1000, lt, 1.5, 18, FUEL);
        panda(ctx, 'poses/praesentieren', lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },
    { start: 7.5, mood: 'bad', poses: ['emotions/ueberrascht'], ...TS('right'), focus: { x: 640, y: 1000 },
      sfx: [[-0.18, 'whoosh', 0.4, 0.3], ...flySfx(0.3, -0.3), ...flySfx(0.75, 0.1), ...flySfx(1.2, 0.3), [2.1, 'glitch', 0.3, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: '3 ANGABEN', c: C.white, size: 130 }, { t: 'FEHLEN KOMPLETT', c: C.white, size: 100, ribbon: RED }]]]);
        ['left', 'up', 'right'].forEach((from, i) => fly(ctx, 470 + i * 220, 1000, lt, 0.3 + i * 0.45, from, () => glass(ctx, 0, 0, 190, 240, { accent: RED, body: () => bigNum(ctx, '?', 0, 15, 140 * (1 + 0.05 * Math.sin(t * 5 + i)), '#F87171') })));
        panda(ctx, 'emotions/ueberrascht', lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },
    { start: 10.25, mood: 'blue', poses: ['poses/tipp_geben'], ...TS('up'), focus: { x: 640, y: 1000 },
      sfx: [[-0.18, 'whoosh', 0.4, 0], [0.3, 'pop', 0.4, 0.2], [1.15, 'whoosh', 0.35, 0.2], [1.6, 'paper', 0.35, 0.2], [1.9, 'ping', 0.45, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'WELCHE?', c: GOLD, size: 150 }, { t: 'SIEHST DU GLEICH', c: C.white, size: 100 }]], [1.15, [{ t: 'BRANDNEUE', c: C.white, size: 125 }, { t: 'NEWS!', c: C.white, size: 150, ribbon: BLUE }]]]);
        if (lt < 1.2) E.withT(ctx, 700, 1000, pop(lt, 0.25, 0.4) * (1 - eInOut(prog(lt, 1.0, 0.2))), 0, () => { pulseRings(ctx, 0, 0, t, GOLD, 3, 200); bigNum(ctx, '?', 0, 30, 220, GOLD); });
        const p = eOut(prog(lt, 1.15, 0.7));
        if (lt > 1.15) E.withT(ctx, 700, 990, lerp(0.1, 1, p), lerp(Math.PI * 2, -0.06, p), () => E.newspaper(ctx, 0, 0, 500, { masthead: 'BÖRSE', headline: ['RHEINMETALL', '× NEL'] }));
        sparks(ctx, 700, 990, lt, 1.9, 16, '#60A5FA');
        panda(ctx, 'poses/tipp_geben', lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },
    { start: 12.75, mood: 'blue', poses: ['poses/praesentieren', 'emotions/begeistert'], ...TS('zoom'), focus: { x: 640, y: 1000 },
      sfx: [[-0.18, 'whoosh', 0.4, 0], ...flySfx(0.2, -0.4), ...flySfx(0.9, 0.4), [1.35, 'snap', 0.35, 0], [2.4, 'paper', 0.35, 0.2], [3.6, 'ding', 0.45, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'RHEINMETALL', c: C.white, size: 115, ribbon: RHM }, { t: '× NEL', c: NEL, size: 140 }]], [2.3, [{ t: 'ABSICHTS-', c: C.white, size: 130 }, { t: 'ERKLÄRUNG', c: C.white, size: 125, ribbon: NEL }]]]);
        const mv = eInOut(prog(lt, 2.3, 0.5));
        fly(ctx, lerp(480, 470, mv), lerp(990, 760, mv), lt, 0.2, 'left', () => E.withT(ctx, 0, 0, lerp(1, 0.75, mv), 0, () => badge(ctx, 'RHEINMETALL', RHM, 'DEUTSCHLAND')));
        fly(ctx, lerp(900, 910, mv), lerp(990, 760, mv), lt, 0.9, 'right', () => E.withT(ctx, 0, 0, lerp(1, 0.75, mv), 0, () => badge(ctx, 'NEL', NEL, 'NORWEGEN')));
        if (lt > 1.35 && lt < 2.6) bigNum(ctx, '×', 690, 1000, 110 * pop(lt, 1.35, 0.3) * (1 - mv), GOLD);
        if (lt > 2.3) doc(ctx, 690, 1080, 0.75 * pop(lt, 2.35, 0.45), { title: 'ABSICHT', sign: prog(lt, 2.8, 0.8) });
        sparks(ctx, 690, 1000, lt, 3.6, 18, NEL);
        pandaSeq(ctx, [[0, 'poses/praesentieren'], [2.3, 'emotions/begeistert']], lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },

    // ===== Ruhiger Teil =====
    { // 17–23,25: Ziel – Kraftstoff vor Ort, für Armeen & kritische Infrastruktur
      start: 17.0, mood: 'neutral', poses: ['poses/zeigen'], ...TS('left'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, -0.3], ...flySfx(0.3, 0.3), [1.9, 'pop', 0.4, 0.2], ...flySfx(3.9, -0.3), ...flySfx(4.3, 0.2), ...flySfx(5.1, 0.4)],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DAS ZIEL:', c: C.white, size: 130 }, { t: 'SPRIT VOR ORT', c: C.white, size: 115, ribbon: FUEL }]],
          [3.75, [{ t: 'FÜR ARMEEN &', c: C.white, size: 115 }, { t: 'INFRASTRUKTUR', c: C.white, size: 105, ribbon: RHM }]]]);
        const mv = eInOut(prog(lt, 3.75, 0.5));
        E.withT(ctx, lerp(0, -100, mv), lerp(0, -150, mv), 1, 0, () => {
          fly(ctx, 690, 1050, lt, 0.3, 'right', () => plant(ctx, 0, 0, lerp(1.25, 0.9, mv), t));
          if (lt > 1.9) E.withT(ctx, 690, 820, pop(lt, 1.9, 0.4) * lerp(1, 0.8, mv), 0, () => { ctx.save(); ctx.shadowColor = FUEL; ctx.shadowBlur = 24; ctx.beginPath(); ctx.arc(0, -30, 46, Math.PI, 0); ctx.lineTo(0, 60); ctx.closePath(); ctx.fillStyle = FUEL; ctx.fill(); ctx.restore(); ctx.beginPath(); ctx.arc(0, -30, 18, 0, 7); ctx.fillStyle = '#0F172A'; ctx.fill(); });
        });
        [['ARMEE', 'right', 1040, 3.9], ['STROMNETZ', 'right', 1150, 4.3], ['KLINIKEN', 'right', 1260, 5.1]].forEach(([n, from, y, at]) => fly(ctx, 860, y, lt, at, from, () => tag(ctx, n, 0, 0, '#334155', 1.15)));
        panda(ctx, 'poses/zeigen', lt, t, { x: 160, h: 440 });
      } },
    { // 23,25–28: Nel liefert Wasserstofftechnik, Rheinmetall das Konzept
      start: 23.25, mood: 'blue', poses: ['poses/praesentieren'], ...TS('right'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0.3], ...flySfx(0.3, -0.3), [0.9, 'signal', 0.25, -0.2], ...flySfx(1.8, 0.3), [3.1, 'snap', 0.35, 0], [3.4, 'ding', 0.45, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'NEL: WASSER-', c: C.white, size: 120 }, { t: 'STOFFTECHNIK', c: C.white, size: 115, ribbon: NEL }]], [1.75, [{ t: 'RHEINMETALL:', c: C.white, size: 115 }, { t: 'DAS KONZEPT', c: C.white, size: 120, ribbon: RHM }]]]);
        fly(ctx, 520, 1000, lt, 0.3, 'left', () => glass(ctx, 0, 0, 300, 380, { accent: NEL, title: 'NEL', body: () => { h2(ctx, 0, 140, t, 7); bigNum(ctx, 'H₂', 0, 20, 110, '#7DD3FC'); } }));
        fly(ctx, 870, 1000, lt, 1.8, 'right', () => glass(ctx, 0, 0, 300, 380, { accent: RHM, title: 'RHEINMETALL', body: () => { plant(ctx, -20, 40, 0.55, t, RHM); } }));
        if (lt > 3.1) { bigNum(ctx, '+', 695, 1000, 100 * pop(lt, 3.1, 0.35), GOLD); tag(ctx, '= KRAFTSTOFF', 695, 1280, FUEL, pop(lt, 3.4, 0.4)); }
        panda(ctx, 'poses/praesentieren', lt, t, { x: 160, h: 440 });
      } },
    { // 28–31,25: keine Anlageberatung + Like/Follow
      start: 28.0, mood: 'neutral', poses: ['emotions/augenzwinkern', 'emotions/freundlich'], ...TS('down'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0], ...flySfx(0.3, 0.2), [0.5, 'paper', 0.3, 0.2], [1.9, 'pop', 0.45, 0.3], [2.4, 'pop', 0.45, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'KEINE', c: C.white, size: 130 }, { t: 'ANLAGEBERATUNG', c: C.white, size: 110, ribbon: BLUE }]], [1.75, [{ t: 'LIKE & FOLLOW', c: C.white, size: 115, ribbon: '#FF3B5C' }]]]);
        if (lt < 1.75) fly(ctx, 680, 960, lt, 0.3, 'up', () => glass(ctx, 0, 0, 540, 320, { accent: BLUE, title: 'HINWEIS', body: () => { label(ctx, 'NUR INFORMATION', 0, -5, 46, C.white); label(ctx, 'KEINE KAUFEMPFEHLUNG', 0, 60, 30); } }), { rot: 0.1 });
        else { P.heart(ctx, 820, 820, 1.4 * pop(lt, 1.9, 0.4) * (1 + Math.sin(t * 6) * 0.05)); tag(ctx, '+ FOLGEN', 820, 1100, '#FF3B5C', 1.4 * pop(lt, 2.4, 0.45)); }
        pandaSeq(ctx, [[0, 'emotions/augenzwinkern'], [1.75, 'emotions/freundlich']], lt, t, { x: 170, h: 460 });
      } },
    { // 31,25–34,5: kratzt an der 1.000-€-Marke
      start: 31.25, mood: 'good', poses: ['emotions/begeistert'], ...TS('zoom'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0], [0.4, 'pop', 0.4, -0.2], ...ticks(1.2, 2.2, 8, 0.4, 0.2), [2.25, 'pop', 0.45, 0.3], [2.5, 'ping', 0.45, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'KNAPP AN DER', c: C.white, size: 120 }, { t: '1.000-€-MARKE', c: C.white, size: 115, ribbon: GOLD }]]]);
        bars(ctx, 650, 1230, [['KURS', 989, '#22C55E', '≈ 989 €', 0.4], ['MARKE', 1000, GOLD, '1.000 €', 1.2]], lt, 0.4, { max: 1050, h: 460, line: 1000 });
        if (lt > 2.25) tag(ctx, 'NOCH ≈ 1 %', 650, 640, GRN, pop(lt, 2.25));
        panda(ctx, 'emotions/begeistert', lt, t, { x: 150, h: 420 });
      } },
    { // 34,5–41: jede Anlage 5.000–7.000 t Kraftstoff pro Jahr
      start: 34.5, mood: 'blue', poses: ['poses/analysieren'], ...TS('left'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, -0.3], ...flySfx(0.6, -0.3), ...ticks(2.8, 4.6, 10, 0.4, 0.2), [4.65, 'sub', 0.3, 0], [4.7, 'ding', 0.45, 0.2], [5.0, 'pop', 0.4, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'PRO ANLAGE', c: C.white, size: 125 }, { t: 'UND JAHR:', c: C.white, size: 125, ribbon: RHM }]], [2.75, [{ t: '5.000–7.000 T', c: C.white, size: 120, ribbon: FUEL }, { t: 'KRAFTSTOFF', c: C.white, size: 125 }]]]);
        fly(ctx, 560, 1080, lt, 0.6, 'left', () => plant(ctx, 0, 0, 0.95, t));
        const v = lerp(0, 7000, eOut(prog(lt, 2.8, 1.8)));
        if (lt > 2.7) glass(ctx, 820, 900, 380, 280, { scale: pop(lt, 2.7, 0.45), accent: FUEL, title: 'TONNEN / JAHR', body: () => bigNum(ctx, lt > 4.6 ? '5–7 TSD.' : Math.round(v).toLocaleString('de-DE'), 0, 25, lt > 4.6 ? 76 : 90, C.white) });
        if (lt > 5.0) can(ctx, 900, 1170, 0.45 * pop(lt, 5.0, 0.4));
        panda(ctx, 'poses/analysieren', lt, t, { x: 150, h: 420 });
      } },
    { // 41–43,25: langfristig mehrere hundert Anlagen
      start: 41.0, mood: 'good', poses: ['emotions/ueberrascht'], ...TS('up'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0], ...Array.from({ length: 8 }, (_, i) => [0.2 + i * 0.12, 'pop', 0.35, (i % 4) / 2 - 0.7]), [1.4, 'ping', 0.45, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'LANGFRISTIG:', c: C.white, size: 125 }, { t: 'HUNDERTE ANLAGEN', c: C.white, size: 100, ribbon: GRN }]]]);
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const i = r * 4 + c, s = pop(lt, 0.2 + i * 0.07, 0.35); if (s > 0) plant(ctx, 470 + c * 150, 800 + r * 140, 0.32 * s, t + i); }
        panda(ctx, 'emotions/ueberrascht', lt, t, { x: 150, h: 420 });
      } },
    { // 43,25–47,25: Haken – Absichtserklärung nicht bindend
      start: 43.25, mood: 'bad', poses: ['emotions/nachdenklich'], ...TS('down'), focus: { x: 640, y: 930 }, shake: [2.6], shakeSfx: 'stamp',
      sfx: [[-0.18, 'whoosh', 0.3, 0], [0.2, 'whoosh', 0.3, 0.3], [0.75, 'impact', 0.3, 0.2], [0.8, 'down', 0.3, 0.2], ...flySfx(1.6, 0.2)],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DER HAKEN:', c: C.white, size: 135, ribbon: RED }]], [1.5, [{ t: 'NICHT', c: C.white, size: 140 }, { t: 'BINDEND!', c: C.white, size: 140, ribbon: RED }]]]);
        if (lt < 1.6) P.hook(ctx, 760, lerp(150, 760, E.eBack(prog(lt, 0.2, 0.6))), 1.1, t, 'ABSICHT');
        fly(ctx, 700, 1010, lt, 1.6, 'up', () => doc(ctx, 0, 0, 0.9, { title: 'ABSICHT', sign: 1 }), { rot: 0.2 });
        E.stamp(ctx, 'NICHT BINDEND', 700, 1040, lt, 2.55, { size: 54, rot: -0.16 });
        panda(ctx, 'emotions/nachdenklich', lt, t, { x: 150, h: 420 });
      } },
    { // 47,25–50: kein Auftragswert, keine Menge, kein Zeitplan
      start: 47.25, mood: 'bad', poses: ['poses/analysieren'], ...TS('right'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0.3], ...flySfx(0.2, 0.3), ...flySfx(1.0, -0.3), ...flySfx(1.8, 0.3)],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'WAS FEHLT?', c: C.white, size: 135, ribbon: RED }]]]);
        [['AUFTRAGSWERT', 0.2, 'right'], ['MENGE', 1.0, 'left'], ['ZEITPLAN', 1.8, 'right']].forEach(([txt, at, from], i) => fly(ctx, 690, 820 + i * 150, lt, at, from, () => xrow(ctx, 'KEIN' + (txt === 'MENGE' ? 'E ' : ' ') + txt, 560), { dist: 800 }));
        panda(ctx, 'poses/analysieren', lt, t, { x: 150, h: 420 });
      } },
    { // 50–54: erst Machbarkeitsstudie, Pilotprojekte nur denkbar
      start: 50.0, mood: 'dark', poses: ['poses/zeigen'], ...TS('zoom'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0], [0.3, 'pop', 0.4, -0.4], [1.0, 'pop', 0.4, -0.1], [2.1, 'pop', 0.4, 0.2], [2.8, 'pop', 0.4, 0.4], [3.1, 'tick', 0.4, 0.4]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'ERST KOMMT DIE', c: C.white, size: 110 }, { t: 'MACHBARKEITSSTUDIE', c: C.white, size: 82, ribbon: VIO }]], [2.0, [{ t: 'PILOTPROJEKTE:', c: C.white, size: 115 }, { t: 'NUR DENKBAR', c: GOLD, size: 125 }]]]);
        timeline(ctx, 690, 1000, 700, [['LOI', 'HEUTE ✓', GRN, 0.3], ['STUDIE', 'BALD', VIO, 1.0], ['PILOT', 'DENKBAR', '#F59E0B', 2.1], ['AUFTRAG', 'OFFEN', RED, 2.8]], lt);
        panda(ctx, 'poses/zeigen', lt, t, { x: 150, h: 420 });
      } },
    { // 54–58,25: zwei Sichten – Startschuss vs. noch kein Auftrag
      start: 54.0, mood: 'blue', poses: ['poses/praesentieren', 'emotions/augenzwinkern'], ...TS('left'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, -0.3], ...flySfx(0.3, -0.3), [1.3, 'ding', 0.4, -0.3], ...flySfx(2.5, 0.3), [3.1, 'down', 0.3, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'RHEINMETALL:', c: C.white, size: 120 }, { t: 'STARTSCHUSS', c: C.white, size: 125, ribbon: GRN }]], [2.5, [{ t: 'BILANZ:', c: C.white, size: 130 }, { t: 'KEIN AUFTRAG', c: C.white, size: 125, ribbon: RED }]]]);
        fly(ctx, 520, 1000, lt, 0.3, 'left', () => glass(ctx, 0, 0, 320, 400, { accent: GRN, title: 'RHEINMETALL', body: () => { P.rocket(ctx, 0, 30, 200, t, { label: '' }); } }));
        fly(ctx, 870, 1000, lt, 2.5, 'right', () => glass(ctx, 0, 0, 320, 400, { accent: RED, title: 'BILANZ', body: () => { bigNum(ctx, '0 €', 0, 0, 100, '#F87171'); label(ctx, 'AUFTRAGSWERT', 0, 90, 26); } }));
        pandaSeq(ctx, [[0, 'poses/praesentieren'], [2.5, 'emotions/augenzwinkern']], lt, t, { x: 150, h: 420 });
      } },
    { // 58,25–61: genau aufpassen
      start: 58.25, mood: 'dark', poses: ['poses/tipp_geben'], ...TS('up'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0], [0.3, 'impact', 0.3, 0], [0.35, 'ping', 0.45, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DESHALB:', c: C.white, size: 130 }, { t: 'GENAU AUFPASSEN', c: C.white, size: 100, ribbon: GOLD }]]]);
        pulseRings(ctx, 700, 1000, t, GOLD, 3, 240); warn(ctx, 700, 1000, pop(lt, 0.25, 0.5), t);
        panda(ctx, 'poses/tipp_geben', lt, t, { x: 160, h: 440 });
      } },
    { // 61–Ende: 05.11. Quartalszahlen
      start: 61.0, mood: 'blue', poses: ['emotions/cool'], ...TS('zoom'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0], ...flySfx(0.2, 0.2), [0.9, 'snap', 0.35, 0.2], [1.3, 'ding', 0.45, 0.2], [2.1, 'pop', 0.4, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'ENTSCHEIDEND:', c: C.white, size: 115 }, { t: '5. NOVEMBER', c: C.white, size: 120, ribbon: RHM }]], [2.0, [{ t: 'QUARTALS-', c: C.white, size: 130 }, { t: 'ZAHLEN Q3', c: GOLD, size: 135 }]]]);
        const flip = eInOut(prog(lt, 0.9, 0.45));
        fly(ctx, 700, 990, lt, 0.2, 'down', () => glass(ctx, 0, 0, 400, 460, { accent: RHM, body: () => {
          label(ctx, flip < 0.5 ? 'OKTOBER' : 'NOVEMBER', 0, -150, 34); ctx.save(); ctx.scale(1, Math.abs(Math.cos(flip * Math.PI)) || 0.01); bigNum(ctx, flip < 0.5 ? '14' : '5', 0, 0, 190, C.white); ctx.restore(); if (lt > 2.1) tag(ctx, 'Q3-ZAHLEN', 0, 160, GOLD, pop(lt, 2.1, 0.4)); } }));
        sparks(ctx, 700, 990, lt, 1.3, 18, '#60A5FA');
        panda(ctx, 'emotions/cool', lt, t, { x: 150, h: 420 });
      } },
  ];

  const music = {
    bpm: 96, chords: [['D', 'm'], ['B', 'b'], ['C', ''], ['A', 'm']], level: 0.5, abs: 0.1,
    sections: [[0, 'pulse'], [2.0, 'tension'], [5.0, 'pulse'], [12.75, 'full'], [28.0, 'pulse'], [31.25, 'full'], [43.25, 'tension'], [54.0, 'pulse'], [61.0, 'full']],
    drops: [36.9],
  };

  window.VIDEO = { name: 'rheinmetall-nel', style: 'clean', fps: 30, duration: 64.2, scenes, captions, xfade: 0.35, grain: 0.035, bokeh: false, endFade: false, pandaFixed: true, music };
})();
