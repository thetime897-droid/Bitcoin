// Trade Republic – Zinsen-Abmahnung – YouTube-Querformat 1920×1080 (65,25 s). Szenen aus tr-zinsen-abmahnung, Inhalt per Transform ins Querformat gesetzt.
// Fakten geprüft: Abmahnung VZ BW 15.10.2026; 2,5 % auf Cash nur nach „Aktivieren“; TR: Hinweis in App/Website klar; 2024 bereits Unterlassungserklärung.
(() => {
  const E = window.E, C = E.C, P = E.P, K = E.K;
  const { pop, prog, eOut, eInOut, lerp } = E;
  const { H, ticks, de, sparks, glass, bigNum, label, tag, bars, doc, pulseRings, timeline, fly, flySfx, warn, appPhone, magnifier } = K;
  const { GOLD, GRN, BLUE, CYAN, VIO, RED, TR } = K.COL;
  const VZ = '#0EA5E9';
  // Querformat: Panda unten links (größer), Inhalt rechts daneben
  const PX = { x: 250, y: 1055, h: 600 };
  const panda = (ctx, pose, lt, t, o = {}) => K.panda(ctx, pose, lt, t, { ...o, ...PX });
  const pandaSeq = (ctx, seq, lt, t, o = {}) => K.pandaSeq(ctx, seq, lt, t, { ...o, ...PX });

  function toggle(ctx, x, y, s, on, glow = 0) { // iOS-artiger Schalter
    if (s <= 0.001) return;
    E.withT(ctx, x, y, s, 0, () => {
      const col = on > 0.5 ? '#22C55E' : '#475569';
      ctx.save(); if (glow) { ctx.shadowColor = on > 0.5 ? '#22C55E' : GOLD; ctx.shadowBlur = 40 * glow; }
      E.rr(ctx, -110, -60, 220, 120, 60); ctx.fillStyle = col; ctx.fill(); ctx.restore();
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(lerp(-50, 50, on), 0, 48, 0, 7); ctx.fillStyle = C.white; ctx.fill(); ctx.restore();
    });
  }
  function badge(ctx, txt, col, sub) { E.rr(ctx, -170, -70, 340, 140, 30); ctx.fillStyle = col; ctx.fill(); E.plainText(ctx, txt, 0, sub ? -12 : 2, txt.length > 10 ? 32 : 44, C.white, { weight: 900 }); if (sub) E.plainText(ctx, sub, 0, 34, 22, 'rgba(255,255,255,0.85)', { weight: 800 }); }
  function people(ctx, x, y, lt, at, n = 24, cols = 6) { for (let i = 0; i < n; i++) { const s = pop(lt, at + i * 0.04, 0.3); if (s <= 0) continue; const px = x + (i % cols - (cols - 1) / 2) * 120, py = y + Math.floor(i / cols) * 150, off = i % 3 !== 0;
    E.withT(ctx, px, py, s, 0, () => { ctx.fillStyle = '#CBD5E1'; ctx.beginPath(); ctx.arc(0, -28, 16, 0, 7); ctx.fill(); E.rr(ctx, -22, -8, 44, 44, 16); ctx.fill(); toggle(ctx, 0, 62, 0.3, off ? 0 : 1); }); } }

  const captions = [
    [0.0, 1.5, 'Breaking News bei Trade Republic.'], [1.5, 2.75, 'Sie wurden wieder abgemahnt,'], [2.75, 3.5, 'und es ist wirklich'], [3.5, 5.0, '1 einziger kleiner Knopf,'],
    [5.0, 5.75, 'den du drücken musst,'], [5.75, 7.25, 'sonst bekommst du keine Zinsen.'], [7.25, 8.25, 'Deswegen pass jetzt auf,'], [8.25, 9.0, 'es geht hier nämlich'],
    [9.0, 9.5, 'um die 2,'], [9.5, 10.75, '5 Prozent Zinsen auf'], [10.75, 11.5, 'deinen Cash,'], [11.5, 12.0, 'denn ich hab schon'],
    [12.0, 13.0, 'so oft Leute gesehen,'], [13.0, 14.75, 'die das nicht aktiviert haben,'], [14.75, 15.5, 'und genau deshalb hat'], [15.5, 17.75, 'die Verbraucherzentrale Baden-Württemberg Trade'],
    [17.75, 19.25, 'Republic schon wieder abgemahnt.'], [19.25, 20.5, 'Der Vorwurf hier ganz klar:'], [20.5, 21.5, 'Du musst die Zinsen'], [21.5, 23.0, 'erst in der App aktivieren,'],
    [23.0, 24.0, 'sonst gibt es nichts,'], [24.0, 24.75, 'und der Hinweis'], [25.0, 27.0, 'dazu steht laut Verbraucherzentrale'], [27.0, 28.5, 'blassgrau und erst nach der'],
    [28.5, 29.25, 'Einzahlung dort.'], [29.25, 30.5, 'Bei 10.000 Euro wären'], [30.5, 32.0, '2,5 Prozent Zinsen'], [32.0, 32.25, 'im Jahr'],
    [32.25, 34.5, '250 Euro, ohne Aktivierung 0.'], [34.5, 35.25, 'Und das hab ich'], [35.25, 36.5, 'hier schon wirklich häufig gesehen,'], [36.5, 37.5, 'dass das einfach 2'],
    [37.5, 38.5, 'Jahre nicht gemacht wurde.'], [38.75, 39.75, 'Und das Geld liegt'], [39.75, 41.25, 'dabei teils bei Partnerbanken,'], [41.5, 43.0, 'teils in Geldmarktfonds, und'],
    [43.0, 44.75, 'die sind nicht einlagengesichert.'], [44.75, 45.5, 'Wichtig ist natürlich auch,'], [45.5, 47.0, 'die Seite von Trade Republic'], [47.0, 47.25, 'zu sehen:'],
    [47.25, 48.0, 'Das ist eine Abmahnung'], [48.0, 49.0, 'und noch kein Urteil.'], [49.0, 49.75, 'Und Trade'], [49.75, 50.5, 'Republic hält den Hinweis'],
    [50.5, 51.5, 'laut WiWo'], [51.5, 52.5, 'für klar erkennbar.'], [52.5, 54.25, 'Dazu kritisiert die Verbraucherzentrale'], [54.25, 55.0, 'eine Klausel:'],
    [55.0, 56.5, 'Trade Republic darf Zahlungen'], [56.5, 57.25, 'Dritter behalten.'], [57.25, 58.75, 'Aus Sicht der Verbraucherschützer'], [59.0, 60.0, 'irreführend, aus Sicht von'],
    [60.0, 60.75, 'Trade Republic'], [60.75, 61.25, 'klar in der App.'], [61.25, 61.75, 'Heißt für dich: Wenn'], [61.75, 62.25, 'du es noch nicht'],
    [62.25, 62.75, 'getan hast,'], [62.75, 64.0, 'bitte einfach diesen Knopf'], [64.0, 65.25, 'zum Aktivieren der Zinsen drücken.'],
  ];

  const HC = { hard: true, punchAmt: 0.06, flashAmt: 0.14 };
  const TS = (dir, extra = {}) => ({ trans: dir, transDur: 0.5, punchAmt: 0.05, flashAmt: 0.0, ...extra });
  const scenes = [
    // ===== HOOK 0–14,75 s: 6 Schnitte à ~2–3 s =====
    { start: 0, mood: 'bad', poses: ['emotions/ueberrascht'], punch: false, noBrand: true, ...HC, focus: { x: 540, y: 1000 },
      sfx: [[0.0, 'impact', 0.45, 0], [0.05, 'ping', 0.45, 0], [0.25, 'whoosh', 0.35, 0.3], [0.7, 'paper', 0.35, 0.2], [1.1, 'pop', 0.4, 0.3]],
      draw(ctx, lt, t) {
        E.liveBar(ctx, lt, 'TRADE REPUBLIC  •  ABMAHNUNG DER VERBRAUCHERZENTRALE BW  •  2,5 % ZINSEN NUR NACH AKTIVIERUNG  •  ');
        E.headline(ctx, [{ t: 'BREAKING', c: C.white, size: 140, ribbon: RED }, { t: 'NEWS!', c: C.white, size: 140 }], lt, { y: 480, delay: 0.05 });
        const p = eOut(prog(lt, 0.25, 0.7));
        E.withT(ctx, 700, 1080, lerp(0.1, 0.85, p), lerp(Math.PI * 2, -0.06, p), () => E.newspaper(ctx, 0, 0, 500, { masthead: 'BÖRSE', headline: ['TRADE REPUBLIC', 'ABGEMAHNT'] }));
        if (lt > 1.1) tag(ctx, 'TRADE REPUBLIC', 860, 760, TR, pop(lt, 1.1, 0.35));
        panda(ctx, 'emotions/ueberrascht', lt, t, { x: 170, h: 460 });
      } },
    { start: 1.5, mood: 'bad', poses: ['emotions/nachdenklich'], ...TS('zoom'), focus: { x: 640, y: 1000 }, shake: [1.0], shakeSfx: 'stamp',
      sfx: [[-0.18, 'whoosh', 0.4, 0], ...flySfx(0.15, 0.2), [1.5, 'pop', 0.4, 0.3]],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'SCHON WIEDER', c: C.white, size: 125 }, { t: 'ABGEMAHNT!', c: C.white, size: 135, ribbon: RED }], lt);
        fly(ctx, 700, 1010, lt, 0.15, 'up', () => doc(ctx, 0, 0, 0.9, { title: 'ABMAHNUNG', sign: 1 }), { rot: 0.2 });
        E.stamp(ctx, 'ABGEMAHNT', 700, 1040, lt, 0.95, { size: 54, rot: -0.16 });
        if (lt > 1.5) tag(ctx, '2024 SCHON MAL', 700, 1320, '#334155', pop(lt, 1.5, 0.4));
        panda(ctx, 'emotions/nachdenklich', lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },
    { start: 3.5, mood: 'dark', poses: ['poses/zeigen', 'emotions/ueberrascht'], ...TS('right'), focus: { x: 640, y: 1000 },
      sfx: [[-0.18, 'whoosh', 0.4, 0.3], ...flySfx(0.2, 0.3), [1.0, 'ping', 0.45, 0.2], [2.3, 'snap', 0.35, 0.2], [2.4, 'glitch', 0.3, 0.2], [2.5, 'down', 0.3, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: '1 EINZIGER', c: C.white, size: 130 }, { t: 'KLEINER KNOPF', c: C.white, size: 115, ribbon: GOLD }]], [2.25, [{ t: 'SONST:', c: C.white, size: 140 }, { t: 'KEINE ZINSEN', c: C.white, size: 120, ribbon: RED }]]]);
        fly(ctx, 700, 1010, lt, 0.2, 'right', () => appPhone(ctx, 0, 0, 640, t, { title: 'CASH · ZINSEN', value: lt > 2.25 ? '0,00 % p. a.' : '2,50 % p. a.', chart: 0, body: (w, h) => { toggle(ctx, 0, h * 0.18, 0.9, 0, lt < 2.25 ? 0.6 + 0.4 * Math.sin(t * 6) : 0); if (lt > 1.0 && lt < 2.25) { E.withT(ctx, 0, h * 0.18, 1, 0, () => pulseRings(ctx, 0, 0, t, GOLD, 2, 120)); } } }));
        pandaSeq(ctx, [[0, 'poses/zeigen'], [2.25, 'emotions/ueberrascht']], lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },
    { start: 7.25, mood: 'good', poses: ['poses/tipp_geben'], ...TS('up'), focus: { x: 640, y: 1000 },
      sfx: [[-0.18, 'whoosh', 0.4, 0], [0.2, 'impact', 0.3, 0], [0.25, 'ping', 0.45, 0.2], [1.75, 'pop', 0.4, 0.2], ...ticks(1.9, 3.2, 9, 0.4, 0.2), [3.25, 'cash', 0.5, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'PASS JETZT', c: C.white, size: 135 }, { t: 'AUF!', c: GOLD, size: 170 }]], [1.75, [{ t: '2,5 % ZINSEN', c: C.white, size: 130, ribbon: GRN }, { t: 'AUF DEIN CASH', c: C.white, size: 115 }]]]);
        if (lt < 1.75) { pulseRings(ctx, 700, 1000, t, GOLD, 3, 240); warn(ctx, 700, 1000, pop(lt, 0.2, 0.45) * (1 - eInOut(prog(lt, 1.5, 0.25))), t); }
        else { const v = lerp(0, 2.5, eOut(prog(lt, 1.9, 1.3))); glass(ctx, 700, 1000, 520, 380, { scale: pop(lt, 1.75, 0.45), accent: GRN, title: 'ZINSEN AUF CASH', body: () => { bigNum(ctx, `${de(v, 1)} %`, 0, 10, 180, '#4ADE80'); label(ctx, 'PRO JAHR', 0, 120, 30); } }); }
        sparks(ctx, 700, 1000, lt, 3.25, 22, '#4ADE80');
        panda(ctx, 'poses/tipp_geben', lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },
    { start: 11.5, mood: 'dark', poses: ['emotions/nachdenklich'], ...TS('left'), focus: { x: 640, y: 1000 },
      sfx: [[-0.18, 'whoosh', 0.4, -0.3], ...Array.from({ length: 8 }, (_, i) => [0.3 + i * 0.16, 'pop', 0.32, (i % 4) / 2 - 0.6]), [1.9, 'glitch', 0.25, 0.2], [2.0, 'ping', 0.4, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'SO VIELE', c: C.white, size: 140 }, { t: 'HABEN\'S NICHT AN', c: C.white, size: 105, ribbon: RED }]]]);
        people(ctx, 700, 800, lt, 0.3, 15, 5);
        if (lt > 2.0) tag(ctx, 'ZINSEN AUS', 700, 1250, RED, pop(lt, 2.0, 0.4));
        panda(ctx, 'emotions/nachdenklich', lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },
    { start: 14.75, mood: 'blue', poses: ['poses/praesentieren'], ...TS('zoom'), focus: { x: 640, y: 1000 },
      sfx: [[-0.18, 'whoosh', 0.4, 0], ...flySfx(0.3, -0.3), ...flySfx(1.2, 0.3), [3.3, 'stamp', 0.4, 0.2], [3.4, 'impact', 0.3, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'VERBRAUCHER-', c: C.white, size: 130 }, { t: 'ZENTRALE BW', c: C.white, size: 130, ribbon: VZ }]], [3.25, [{ t: 'MAHNT TRADE', c: C.white, size: 125 }, { t: 'REPUBLIC AB', c: C.white, size: 125, ribbon: RED }]]]);
        fly(ctx, 700, 900, lt, 0.3, 'left', () => badge(ctx, 'VERBRAUCHERZENTRALE', VZ, 'BADEN-WÜRTTEMBERG'));
        fly(ctx, 700, 1130, lt, 1.2, 'right', () => tag(ctx, '15.10.2026', 0, 0, '#334155', 1.3));
        if (lt > 3.3) bigNum(ctx, '⚠', 920, 760, 120 * pop(lt, 3.3, 0.35), GOLD);
        panda(ctx, 'poses/praesentieren', lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },

    // ===== Ruhiger Teil =====
    { // 19,25–24: Vorwurf – erst aktivieren, sonst nichts
      start: 19.25, mood: 'bad', poses: ['poses/analysieren'], ...TS('right'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0.3], ...flySfx(0.3, 0.3), [2.3, 'snap', 0.4, 0.2], [2.4, 'ding', 0.4, 0.2], [3.8, 'down', 0.3, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DER VORWURF:', c: C.white, size: 125, ribbon: RED }]], [1.25, [{ t: 'ERST IN DER APP', c: C.white, size: 110 }, { t: 'AKTIVIEREN', c: C.white, size: 130, ribbon: GOLD }]], [3.75, [{ t: 'SONST GIBT\'S', c: C.white, size: 125 }, { t: 'NICHTS!', c: C.white, size: 150, ribbon: RED }]]]);
        const on = eInOut(prog(lt, 2.3, 0.35)) * (1 - eInOut(prog(lt, 3.7, 0.3)));
        fly(ctx, 700, 1000, lt, 0.3, 'right', () => appPhone(ctx, 0, 0, 640, t, { title: 'ZINSEN', value: on > 0.5 ? '2,50 % ✓' : '0,00 %', chart: 0, body: (w, h) => toggle(ctx, 0, h * 0.18, 0.9, on, 0.5) }));
        panda(ctx, 'poses/analysieren', lt, t, { x: 160, h: 440 });
      } },
    { // 24–29,25: Hinweis blassgrau und erst nach Einzahlung
      start: 24.0, mood: 'dark', poses: ['emotions/nachdenklich'], ...TS('up'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0], ...flySfx(0.4, 0.2), [2.6, 'pop', 0.4, 0.3], [3.2, 'tick', 0.4, 0.2], [4.5, 'pop', 0.4, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DER HINWEIS:', c: C.white, size: 130 }, { t: 'BLASSGRAU', c: '#94A3B8', size: 145 }]], [3.0, [{ t: 'ERST NACH DER', c: C.white, size: 120 }, { t: 'EINZAHLUNG', c: C.white, size: 130, ribbon: VIO }]]]);
        fly(ctx, 700, 1000, lt, 0.4, 'up', () => glass(ctx, 0, 0, 560, 400, { title: 'APP · CASH', body: () => {
          E.plainText(ctx, '2,50 % ZINSEN', 0, -50, 60, C.white, { weight: 900 });
          E.plainText(ctx, 'Zinsen aktivieren, um sie zu erhalten', 0, 40, 26, 'rgba(148,163,184,0.45)', { weight: 600 });
          if (lt > 2.6) magnifier(ctx, 120, 50, 0.75 * pop(lt, 2.6, 0.4), t); } }));
        if (lt > 3.2) timeline(ctx, 700, 1330, 560, [['1.', 'EINZAHLEN', GRN, 3.2], ['2.', 'HINWEIS', '#94A3B8', 4.5]], lt);
        panda(ctx, 'emotions/nachdenklich', lt, t, { x: 160, h: 440 });
      } },
    { // 29,25–34,5: 10.000 € → 250 €/Jahr vs. 0 €
      start: 29.25, mood: 'good', poses: ['poses/praesentieren', 'emotions/ueberrascht'], ...TS('zoom'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0], [0.3, 'pop', 0.4, 0], ...ticks(1.3, 2.9, 10, 0.4, -0.2), [3.0, 'cash', 0.5, -0.2], [3.6, 'pop', 0.4, 0.3], [3.7, 'down', 0.3, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'BEI 10.000 €:', c: C.white, size: 130, ribbon: BLUE }]], [3.0, [{ t: '250 € IM JAHR', c: C.white, size: 120, ribbon: GRN }, { t: 'ODER 0 €', c: '#F87171', size: 140 }]]]);
        bars(ctx, 650, 1230, [['AKTIVIERT', 250, '#22C55E', `${Math.round(lerp(0, 250, eOut(prog(lt, 1.3, 1.6))))} €`, 1.3], ['NICHT AKTIV', 2, '#EF4444', '0 €', 3.6]], lt, 1.3, { max: 280, h: 460 });
        if (lt > 0.3 && lt < 3.0) tag(ctx, '× 2,5 %', 650, 640, GRN, pop(lt, 0.3, 0.4));
        pandaSeq(ctx, [[0, 'poses/praesentieren'], [3.6, 'emotions/ueberrascht']], lt, t, { x: 150, h: 420 });
      } },
    { // 34,5–38,75: häufig gesehen – 2 Jahre nicht aktiviert (≈ 500 € verschenkt)
      start: 34.5, mood: 'bad', poses: ['emotions/traurig'], ...TS('left'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, -0.3], ...flySfx(0.3, -0.3), ...flySfx(1.9, 0.3), ...ticks(2.4, 3.4, 7, 0.4, 0.2), [3.45, 'down', 0.35, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'HÄUFIG GESEHEN:', c: C.white, size: 110 }, { t: '2 JAHRE NICHTS', c: C.white, size: 115, ribbon: RED }]], [2.25, [{ t: '≈ 500 €', c: '#F87171', size: 170 }, { t: 'VERSCHENKT', c: C.white, size: 120 }]]]);
        fly(ctx, 540, 1000, lt, 0.3, 'left', () => P.calendar(ctx, 0, 0, 0.75, '2 JAHRE', '24'));
        const v = lerp(0, 500, eOut(prog(lt, 2.4, 1.0)));
        fly(ctx, 870, 1000, lt, 1.9, 'right', () => glass(ctx, 0, 0, 300, 300, { accent: RED, title: 'ENTGANGEN', body: () => { bigNum(ctx, `–${Math.round(v)} €`, 0, 20, 70, '#F87171'); label(ctx, 'BEI 10.000 €', 0, 90, 22); } }));
        panda(ctx, 'emotions/traurig', lt, t, { x: 150, h: 420 });
      } },
    { // 38,75–44,75: Partnerbanken / Geldmarktfonds – nicht einlagengesichert
      start: 38.75, mood: 'blue', poses: ['poses/analysieren', 'poses/tipp_geben'], ...TS('right'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0.3], ...flySfx(1.0, -0.3), [1.6, 'ding', 0.35, -0.3], ...flySfx(2.75, 0.3), [4.4, 'impact', 0.3, 0.3], [4.45, 'ping', 0.45, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'WO LIEGT', c: C.white, size: 135 }, { t: 'DEIN GELD?', c: C.white, size: 135, ribbon: BLUE }]], [4.25, [{ t: 'GELDMARKTFONDS:', c: C.white, size: 105 }, { t: 'KEINE EINLAGEN-', c: C.white, size: 100, ribbon: RED }, { t: 'SICHERUNG', c: C.white, size: 100 }]]]);
        fly(ctx, 520, 1020, lt, 1.0, 'left', () => glass(ctx, 0, 0, 310, 400, { accent: GRN, title: 'PARTNERBANKEN', body: () => { bigNum(ctx, '🏦', 0, -30, 90, C.white); label(ctx, 'EINLAGENSICHERUNG', 0, 70, 20, C.white); label(ctx, 'BIS 100.000 € JE BANK', 0, 105, 18); } }));
        fly(ctx, 870, 1020, lt, 2.75, 'right', () => glass(ctx, 0, 0, 310, 400, { accent: RED, title: 'GELDMARKTFONDS', body: () => { E.lineChart(ctx, -110, -90, 220, 110, [[0, 0.7], [0.3, 0.6], [0.6, 0.5], [1, 0.35]], eOut(prog(lt, 3.0, 0.7)), '#60A5FA', { lw: 7, area: true }); if (lt > 4.4) E.withT(ctx, 0, 90, pop(lt, 4.4, 0.35), 0, () => { E.rr(ctx, -120, -30, 240, 60, 30); ctx.fillStyle = RED; ctx.fill(); E.plainText(ctx, '✕ NICHT GESICHERT', 0, 2, 22, C.white, { weight: 900 }); }); } }));
        pandaSeq(ctx, [[0, 'poses/analysieren'], [4.25, 'poses/tipp_geben']], lt, t, { x: 150, h: 420 });
      } },
    { // 44,75–49: Seite von TR – Abmahnung ≠ Urteil
      start: 44.75, mood: 'neutral', poses: ['poses/tipp_geben'], ...TS('down'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0], [0.4, 'pop', 0.4, 0.2], [2.6, 'impact', 0.4, 0.1], [2.7, 'ping', 0.4, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'FAIR BLEIBEN:', c: C.white, size: 125 }, { t: 'DIE ANDERE SEITE', c: C.white, size: 100, ribbon: TR }]], [2.5, [{ t: 'ABMAHNUNG', c: C.white, size: 135 }, { t: '≠ URTEIL', c: C.white, size: 140, ribbon: BLUE }]]]);
        P.gavel(ctx, 700, 980, 1.1 * pop(lt, 0.3, 0.45), t, 2.6, lt);
        if (lt > 2.7) tag(ctx, 'NOCH KEIN GERICHT', 700, 1290, '#334155', pop(lt, 2.7, 0.4));
        panda(ctx, 'poses/tipp_geben', lt, t, { x: 150, h: 420 });
      } },
    { // 49–52,5: TR hält den Hinweis für klar erkennbar
      start: 49.0, mood: 'blue', poses: ['poses/praesentieren'], ...TS('left'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, -0.3], ...flySfx(0.3, -0.3), [1.6, 'snap', 0.4, 0.2], [2.5, 'ding', 0.45, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'TRADE REPUBLIC:', c: C.white, size: 115, ribbon: TR }, { t: '„KLAR ERKENNBAR“', c: C.white, size: 110 }]]]);
        fly(ctx, 700, 1000, lt, 0.3, 'left', () => appPhone(ctx, 0, 0, 600, t, { title: 'ZINSEN', value: '2,50 % ✓', chart: 0, body: (w, h) => toggle(ctx, 0, h * 0.18, 0.85, eInOut(prog(lt, 1.6, 0.35)), 0.6) }));
        if (lt > 2.5) tag(ctx, 'APP + WEBSITE', 900, 760, GRN, pop(lt, 2.5, 0.4));
        panda(ctx, 'poses/praesentieren', lt, t, { x: 150, h: 420 });
      } },
    { // 52,5–57,25: Klausel – Zahlungen Dritter behalten
      start: 52.5, mood: 'bad', poses: ['emotions/nachdenklich'], ...TS('zoom'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0], ...flySfx(0.3, 0.2), [1.6, 'pop', 0.4, 0.3], [2.6, 'paper', 0.3, 0.2], [3.9, 'down', 0.3, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DAZU KRITISIERT:', c: C.white, size: 110 }, { t: 'EINE KLAUSEL', c: C.white, size: 125, ribbon: RED }]], [2.5, [{ t: 'ZAHLUNGEN', c: C.white, size: 135 }, { t: 'DRITTER BEHALTEN', c: C.white, size: 100, ribbon: RED }]]]);
        fly(ctx, 680, 1010, lt, 0.3, 'up', () => doc(ctx, 0, 0, 0.9, { title: 'AGB', sign: 0 }), { rot: 0.15 });
        if (lt > 1.6) magnifier(ctx, 800, 960, 0.9 * pop(lt, 1.6, 0.4), t);
        if (lt > 3.9) tag(ctx, 'ERTRÄGE EINBEHALTEN?', 700, 1330, RED, pop(lt, 3.9, 0.4));
        panda(ctx, 'emotions/nachdenklich', lt, t, { x: 150, h: 420 });
      } },
    { // 57,25–61,25: irreführend vs. klar in der App
      start: 57.25, mood: 'dark', poses: ['poses/zeigen', 'emotions/augenzwinkern'], ...TS('right'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0.3], ...flySfx(0.3, -0.3), [1.0, 'down', 0.3, -0.3], ...flySfx(2.6, 0.3), [3.1, 'ding', 0.4, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'VERBRAUCHER-', c: C.white, size: 125 }, { t: 'SCHÜTZER: IRREFÜHREND', c: C.white, size: 82, ribbon: VZ }]], [2.75, [{ t: 'TRADE REPUBLIC:', c: C.white, size: 115 }, { t: 'KLAR IN DER APP', c: C.white, size: 110, ribbon: TR }]]]);
        fly(ctx, 520, 1000, lt, 0.3, 'left', () => glass(ctx, 0, 0, 300, 380, { accent: VZ, title: 'VZ BW', body: () => { bigNum(ctx, '✕', 0, 0, 140, '#F87171'); label(ctx, 'IRREFÜHREND', 0, 120, 26, C.white); } }));
        fly(ctx, 870, 1000, lt, 2.6, 'right', () => glass(ctx, 0, 0, 300, 380, { accent: TR, title: 'TR', body: () => { bigNum(ctx, '✓', 0, 0, 140, '#4ADE80'); label(ctx, 'KLAR ERKENNBAR', 0, 120, 26, C.white); } }));
        pandaSeq(ctx, [[0, 'poses/zeigen'], [2.75, 'emotions/augenzwinkern']], lt, t, { x: 150, h: 420 });
      } },
    { // 61,25–Ende: Heißt für dich – Knopf drücken!
      start: 61.25, mood: 'good', poses: ['poses/tipp_geben', 'emotions/begeistert'], ...TS('zoom'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0], ...flySfx(0.2, 0.2), [1.5, 'pop', 0.4, 0.2], [2.8, 'snap', 0.45, 0.2], [2.85, 'cash', 0.5, 0.2], [2.9, 'ping', 0.45, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'HEISST FÜR DICH:', c: C.white, size: 115 }, { t: 'KNOPF DRÜCKEN!', c: C.white, size: 120, ribbon: GRN }]], [2.8, [{ t: 'ZINSEN', c: C.white, size: 140 }, { t: 'AKTIVIERT ✓', c: '#4ADE80', size: 140 }]]]);
        const on = eInOut(prog(lt, 2.8, 0.35));
        fly(ctx, 700, 1000, lt, 0.2, 'down', () => appPhone(ctx, 0, 0, 640, t, { title: 'CASH · ZINSEN', value: on > 0.5 ? '2,50 % ✓' : '0,00 %', chart: 0, body: (w, h) => { toggle(ctx, 0, h * 0.18, 1.0, on, 0.8); if (lt > 1.5 && lt < 2.9) { const tp = prog(lt, 1.5, 1.2); E.withT(ctx, lerp(160, 50, eOut(tp)), h * 0.18 + lerp(160, 40, eOut(tp)), 1, 0, () => { ctx.beginPath(); ctx.arc(0, 0, 30 * (lt > 2.7 ? 0.8 : 1), 0, 7); ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fill(); }); } } }));
        sparks(ctx, 700, 1080, lt, 2.85, 26, '#4ADE80');
        pandaSeq(ctx, [[0, 'poses/tipp_geben'], [2.8, 'emotions/begeistert']], lt, t, { x: 150, h: 420 });
      } },
  ];

  const music = {
    bpm: 98, chords: [['D', 'm'], ['B', 'b'], ['F', ''], ['C', '']], level: 0.5, abs: 0.1,
    sections: [[0, 'tension'], [3.5, 'pulse'], [7.25, 'full'], [11.5, 'tension'], [14.75, 'full'], [24.0, 'tension'], [29.25, 'full'], [34.5, 'tension'], [38.75, 'pulse'], [44.75, 'tension'], [49.0, 'pulse'], [61.25, 'full']],
    drops: [32.0],
  };

  // Inhalt (Hochformat-Koordinaten ~x 420–1060, y 640–1350) in den Querformat-Bereich rechts vom Panda setzen
  const S = 0.88, TX = 1190 - 740 * S, TY = 280 - 640 * S;
  scenes.forEach((sc) => { const d = sc.draw; sc.focus = { x: 1190, y: 620 }; sc.draw = (ctx, lt, t, dur) => { ctx.save(); ctx.translate(TX, TY); ctx.scale(S, S); d(ctx, lt, t, dur); ctx.restore(); }; });

  window.VIDEO = { format: 'landscape', capX: 1190, name: 'tr-zinsen-abmahnung-yt', style: 'clean', fps: 30, duration: 65.25, scenes, captions, xfade: 0.35, grain: 0.035, bokeh: false, endFade: false, pandaFixed: true, music };
})();
