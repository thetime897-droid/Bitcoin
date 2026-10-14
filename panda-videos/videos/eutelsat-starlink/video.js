// Eutelsat – Starlink-Grenzen in der Ukraine, Europas Starlink-Rivale springt an – Short (65,25 s). Clean-Stil + Einflüge, ruhiger Hook.
(() => {
  const E = window.E, C = E.C, P = E.P, K = E.K;
  const { pop, prog, eOut, eInOut, lerp } = E;
  const { panda, pandaSeq, H, ticks, de, sparks, glass, bigNum, label, tag, bars, poll, pulseRings, fly, flySfx } = K;
  const { GOLD, GRN, BLUE, CYAN, VIO, RED } = K.COL;
  const EUT = '#2563EB', SPX = '#94A3B8', UA1 = '#0057B7', UA2 = '#FFD700', EU = '#1D4ED8';

  function globe(ctx, x, y, r, t, o = {}) { // Erdkugel mit Orbit-Satelliten
    ctx.save(); const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.2, x, y, r); g.addColorStop(0, '#1E3A8A'); g.addColorStop(1, '#0B1430');
    ctx.shadowColor = '#3B82F6'; ctx.shadowBlur = 50; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = g; ctx.fill(); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.clip(); ctx.strokeStyle = 'rgba(96,165,250,0.35)'; ctx.lineWidth = 2;
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.ellipse(x, y, r, Math.abs(i) * r / 3.2 + 1, 0, 0, 7); ctx.stroke(); }
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI + t * 0.3; ctx.beginPath(); ctx.ellipse(x, y, Math.abs(Math.cos(a)) * r, r, 0, 0, 7); ctx.stroke(); }
    ctx.restore();
    const n = o.n ?? 14; for (let i = 0; i < n; i++) { const a = t * (0.4 + (i % 3) * 0.1) + i * 2.4, rr = r * (1.18 + (i % 3) * 0.08), px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.45;
      ctx.beginPath(); ctx.arc(px, py, 5, 0, 7); ctx.fillStyle = o.col || '#E2E8F0'; ctx.fill(); }
  }
  function dish(ctx, x, y, s, t, col = '#E2E8F0') { // Satelliten-Terminal
    E.withT(ctx, x, y, s, 0, () => {
      ctx.fillStyle = '#64748B'; ctx.fillRect(-8, 0, 16, 120); E.rr(ctx, -60, 110, 120, 24, 10); ctx.fill();
      ctx.save(); ctx.rotate(-0.5); ctx.shadowColor = 'rgba(2,6,23,0.6)'; ctx.shadowBlur = 20; E.rr(ctx, -100, -70, 200, 130, 24); ctx.fillStyle = col; ctx.fill(); ctx.restore();
      for (let k = 0; k < 3; k++) { const q = (t * 0.8 + k / 3) % 1; ctx.globalAlpha = 1 - q; ctx.strokeStyle = CYAN; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(40, -80, 30 + q * 90, -1.6, -0.4); ctx.stroke(); } ctx.globalAlpha = 1;
    });
  }
  function uaCard(ctx) { E.rr(ctx, -110, -70, 220, 70, 0); ctx.fillStyle = UA1; ctx.fill(); E.rr(ctx, -110, 0, 220, 70, 0); ctx.fillStyle = UA2; ctx.fill(); }
  function stars(ctx, x, y, r, t, s = 1) { for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + t * 0.2; E.withT(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, s * 0.7, 0, () => { ctx.beginPath(); for (let k = 0; k < 10; k++) { const rr = k % 2 ? 9 : 22, aa = k * Math.PI / 5 - Math.PI / 2; ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } ctx.closePath(); ctx.fillStyle = GOLD; ctx.fill(); }); } }
  function badge(ctx, txt, col, sub) { E.rr(ctx, -150, -70, 300, 140, 30); ctx.fillStyle = col; ctx.fill(); E.plainText(ctx, txt, 0, sub ? -12 : 2, txt.length > 8 ? 36 : 46, C.white, { weight: 900 }); if (sub) E.plainText(ctx, sub, 0, 34, 22, 'rgba(255,255,255,0.8)', { weight: 800 }); }

  const captions = [
    [0.0, 1.25, 'Genau diese Aktie hat'], [1.25, 3.0, 'jetzt wieder massives Potenzial,'], [3.0, 4.5, 'nachdem SpaceX negative News'], [4.5, 5.25, 'gemeldet hat.'],
    [5.25, 6.5, 'Das Projekt Starlink hat nämlich'], [6.5, 8.5, 'erstmals Grenzen gemeldet, und diese'], [8.5, 9.5, 'Aktie reagiert'], [9.5, 10.25, 'extrem darauf.'],
    [10.25, 11.0, 'Es geht nämlich auch um'], [11.0, 11.75, 'die Ukraine,'], [11.75, 13.25, 'denn SpaceX hat hier den'], [13.25, 15.25, 'militärischen Starlink,'],
    [15.25, 16.25, 'den Dienst angeblich eingeschränkt.'], [16.25, 17.5, 'Starlink ist übrigens das'], [17.5, 19.25, 'Satelliten-Internet von SpaceX, und'], [19.5, 21.0, 'Details dieser Meldungen sind'],
    [21.0, 21.75, 'nicht bekannt.'], [21.75, 23.0, 'Der Gewinner am Vormittag'], [23.0, 24.0, 'war aber die Aktie'], [24.0, 24.75, 'Eutelsat.'],
    [24.75, 27.25, 'Europas größter Starlink-Herausforderer,'], [27.25, 28.5, 'und warum das interessant ist,'], [28.5, 29.25, 'erkläre ich dir jetzt.'], [29.25, 30.5, 'Das Ganze ist keine Anlageberatung.'],
    [30.75, 31.25, 'Über \'n Like und 1'], [31.25, 32.0, 'Follow würde ich mich freuen.'], [32.0, 34.25, 'Eutelsat betreibt das OneWeb-Netz,'], [34.25, 35.75, 'mehr als 600 Satelliten.'],
    [36.0, 37.25, 'Konkurrent Starlink hat ein'], [37.25, 39.5, 'Vielfaches davon, mehr als 10.000.'], [39.5, 41.25, 'Auch SES aus Luxemburg'], [41.25, 43.75, 'legt zu, ebenfalls ein Satellitenbetreiber.'],
    [43.75, 44.5, 'Der Kurs der Aktie'], [44.5, 45.75, 'reagiert hier auf eine'], [45.75, 47.25, 'Erwartung, nicht auf einen Vertrag.'], [47.5, 49.0, 'Anleger wetten auf mehr'],
    [49.0, 50.25, 'Spannungen zwischen Washington und Kiew.'], [50.5, 51.75, 'Laut Analysten ist das'], [51.75, 52.75, 'OneWeb eher eine'], [52.75, 54.0, 'Ergänzung als ein Ersatz.'],
    [54.0, 56.0, 'Wer von Starlink wechselt, braucht'], [56.0, 56.75, 'neue Terminals.'], [56.75, 57.75, 'Aus Sicht der Ukraine'], [57.75, 59.0, 'ein Problem, aus Sicht'],
    [59.0, 60.0, 'der Börse eine Chance.'], [60.0, 60.75, 'Das heißt für dich:'], [60.75, 62.25, 'Hinter der Schlagzeile steckt'], [62.25, 63.75, 'Geopolitik und die Erwartung,'],
    [64.0, 65.25, 'dass Europa profitiert.'],
  ];

  const HC = { hard: true, punchAmt: 0.06, flashAmt: 0.14 };
  const TS = (dir, extra = {}) => ({ trans: dir, transDur: 0.5, punchAmt: 0.05, flashAmt: 0.0, ...extra });
  const scenes = [
    // ===== HOOK 0–16,25 s: 6 Schnitte à 2–3 s, Einflüge, Inhalt wechselt in der Szene =====
    { start: 0, mood: 'good', poses: ['poses/zeigen'], punch: false, noBrand: true, ...HC, focus: { x: 540, y: 1000 },
      sfx: [[0.0, 'impact', 0.45, 0], [0.05, 'ping', 0.45, 0], ...flySfx(0.2, 0.4), [1.3, 'signal', 0.3, 0.3], ...ticks(1.4, 2.4, 7, 0.4, 0.3), [2.45, 'cash', 0.45, 0.3]],
      draw(ctx, lt, t) {
        E.liveBar(ctx, lt, 'EUTELSAT  •  STARLINK MELDET GRENZEN  •  UKRAINE  •  EUROPAS STARLINK-RIVALE  •  ');
        H(ctx, lt, [[0, [{ t: 'DIESE AKTIE', c: C.white, size: 125 }, { t: 'EUTELSAT', c: C.white, size: 140, ribbon: EUT }], { y: 480, delay: 0.05 }], [1.25, [{ t: 'MASSIVES', c: C.white, size: 130 }, { t: 'POTENZIAL?', c: '#4ADE80', size: 130 }], { y: 480 }]]);
        fly(ctx, 700, 1000, lt, 0.2, 'right', () => glass(ctx, 0, 0, 560, 420, { accent: EUT, title: 'EUTELSAT · AKTIE', body: () => {
          globe(ctx, -120, 20, 90, t, { n: 8 });
          const v = lerp(0, 16, eOut(prog(lt, 1.4, 1.0))); if (lt > 1.3) bigNum(ctx, `+${Math.round(v)} %`, 120, 20, 90, '#4ADE80'); } }));
        sparks(ctx, 820, 1000, lt, 2.45, 20, '#4ADE80');
        panda(ctx, 'poses/zeigen', lt, t, { x: 170, h: 460 });
      } },
    { start: 3.0, mood: 'bad', poses: ['emotions/ueberrascht'], ...TS('left'), focus: { x: 640, y: 1000 },
      sfx: [[-0.18, 'whoosh', 0.4, -0.3], [0.2, 'rocket', 0.25, 0.2], ...flySfx(1.3, 0.3), [1.75, 'down', 0.3, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'SPACEX:', c: C.white, size: 135 }, { t: 'NEGATIVE NEWS', c: C.white, size: 110, ribbon: RED }]]]);
        const up = eOut(prog(lt, 0.1, 1.6)); P.rocket(ctx, 640, lerp(1250, 900, up), 340, t, { label: 'SPACEX', rot: 0.05 });
        fly(ctx, 880, 820, lt, 1.3, 'right', () => E.arrowDown(ctx, 0, 0, 0.75, C.red));
        panda(ctx, 'emotions/ueberrascht', lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },
    { start: 5.25, mood: 'dark', poses: ['poses/praesentieren'], ...TS('zoom'), focus: { x: 640, y: 1000 },
      sfx: [[-0.18, 'whoosh', 0.4, 0], [0.3, 'signal', 0.3, 0.2], [1.6, 'glitch', 0.3, 0.2], [1.7, 'impact', 0.3, 0.1], [2.2, 'pop', 0.4, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'STARLINK', c: C.white, size: 135, ribbon: SPX }, { t: 'MELDET GRENZEN', c: C.white, size: 105 }]]]);
        const s = pop(lt, 0.1, 0.5); E.withT(ctx, 700, 1010, s, 0, () => { globe(ctx, 0, 0, 200, t, { n: 18 });
          if (lt > 1.6) { const p = eOut(prog(lt, 1.6, 0.4)); ctx.save(); ctx.shadowColor = RED; ctx.shadowBlur = 30; ctx.strokeStyle = RED; ctx.lineWidth = 12; ctx.setLineDash([30, 18]); ctx.beginPath(); ctx.arc(0, 0, 250, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); ctx.stroke(); ctx.restore(); } });
        if (lt > 2.2) tag(ctx, 'LIMIT', 700, 1280, RED, pop(lt, 2.2, 0.4));
        panda(ctx, 'poses/praesentieren', lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },
    { start: 8.5, mood: 'good', poses: ['emotions/begeistert'], ...TS('up'), focus: { x: 640, y: 1000 },
      sfx: [[-0.18, 'whoosh', 0.4, 0], [0.2, 'roll', 0.3, 0.2], [0.85, 'impact', 0.4, 0.2], [0.9, 'ping', 0.5, 0.3], [1.2, 'pop', 0.4, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'AKTIE REAGIERT', c: C.white, size: 115 }, { t: 'EXTREM!', c: C.white, size: 150, ribbon: GRN }]]]);
        glass(ctx, 690, 1000, 600, 440, { scale: pop(lt, 0.0, 0.45), title: 'EUTELSAT · HEUTE', body: () => {
          const e = E.lineChart(ctx, -240, -100, 480, 240, [[0, 0.85], [0.3, 0.82], [0.5, 0.86], [0.7, 0.8], [0.8, 0.3], [0.9, 0.2], [1, 0.05]], eOut(prog(lt, 0.15, 0.8)), '#22C55E', { lw: 11, area: true });
          if (lt > 1.2) tag(ctx, 'ZWEISTELLIG', -90, -150, GRN, pop(lt, 1.2, 0.35)); } });
        sparks(ctx, 900, 820, lt, 0.9, 22, '#4ADE80');
        panda(ctx, 'emotions/begeistert', lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },
    { start: 10.25, mood: 'bad', poses: ['emotions/nachdenklich', 'poses/analysieren'], ...TS('right'), focus: { x: 640, y: 1000 }, shake: [5.1], shakeSfx: 'stamp',
      sfx: [[-0.18, 'whoosh', 0.4, 0.3], ...flySfx(0.75, -0.3), ...flySfx(1.6, 0.3), [3.0, 'signal', 0.3, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'ES GEHT UM', c: C.white, size: 125 }, { t: 'DIE UKRAINE', c: C.white, size: 125, ribbon: UA1 }]], [3.0, [{ t: 'MILITÄRISCHER', c: C.white, size: 110 }, { t: 'STARLINK', c: C.white, size: 140, ribbon: SPX }]], [5.0, [{ t: 'DIENST', c: C.white, size: 135 }, { t: 'EINGESCHRÄNKT?', c: C.white, size: 105, ribbon: RED }]]]);
        fly(ctx, 520, 1000, lt, 0.75, 'left', () => glass(ctx, 0, 0, 280, 260, { body: () => uaCard(ctx) }));
        fly(ctx, 870, 980, lt, 1.6, 'right', () => P.satellite(ctx, 0, 0, 0.75, t));
        if (lt > 3.0) P.beam(ctx, 840, 1040, 560, 1000, t, eOut(prog(lt, 3.0, 0.6)) * (lt > 5.0 ? 0.5 : 1), lt > 5.0 ? RED : CYAN);
        E.stamp(ctx, 'EINGESCHRÄNKT', 700, 1230, lt, 5.05, { size: 56, rot: -0.1 });
        pandaSeq(ctx, [[0, 'emotions/nachdenklich'], [3.0, 'poses/analysieren']], lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },
    { start: 16.25, mood: 'blue', poses: ['poses/tipp_geben'], ...TS('zoom'), focus: { x: 640, y: 1000 },
      sfx: [[-0.18, 'whoosh', 0.4, 0], ...flySfx(0.3, 0.2), [1.3, 'signal', 0.3, 0.2], [3.3, 'glitch', 0.3, 0.2], [3.5, 'pop', 0.4, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'STARLINK =', c: C.white, size: 130 }, { t: 'SATELLITEN-WLAN', c: C.white, size: 100, ribbon: SPX }]], [3.25, [{ t: 'DETAILS?', c: GOLD, size: 140 }, { t: 'NICHT BEKANNT', c: C.white, size: 110 }]]]);
        if (lt < 3.25) { fly(ctx, 760, 1120, lt, 0.3, 'down', () => dish(ctx, 0, 0, 1.2, t)); P.satellite(ctx, 880, 720, 0.6 * pop(lt, 1.2, 0.45), t); }
        else glass(ctx, 700, 1000, 480, 340, { scale: pop(lt, 3.3, 0.45), accent: GOLD, title: 'MELDUNG', body: () => { ctx.save(); ctx.filter = 'blur(10px)'; label(ctx, 'DETAILS ZUR', 0, -20, 44, C.white); label(ctx, 'EINSCHRÄNKUNG', 0, 40, 44, C.white); ctx.restore(); bigNum(ctx, '?', 0, 20, 160 * pop(lt, 3.5, 0.35), GOLD); } });
        panda(ctx, 'poses/tipp_geben', lt, t, { x: 170, h: 460, enter: false, swapAt: 0 });
      } },

    // ===== Ruhiger Teil =====
    { // 21,75–27,25: Gewinner am Vormittag: Eutelsat – Europas größter Starlink-Herausforderer
      start: 21.75, mood: 'good', poses: ['emotions/begeistert'], ...TS('up'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0], ...flySfx(0.4, 0.2), [2.3, 'ding', 0.45, 0.2], [3.1, 'swell', 0.3, 0], [3.2, 'pop', 0.4, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'GEWINNER DES', c: C.white, size: 120 }, { t: 'VORMITTAGS', c: C.white, size: 130, ribbon: GRN }]], [2.25, [{ t: 'EUTELSAT', c: C.white, size: 140, ribbon: EUT }]], [3.0, [{ t: 'EUROPAS STARLINK-', c: C.white, size: 100 }, { t: 'HERAUSFORDERER', c: GOLD, size: 105 }]]]);
        fly(ctx, 700, 1010, lt, 0.4, 'down', () => { E.rr(ctx, -150, 40, 300, 180, 18); ctx.fillStyle = '#E2E8F0'; ctx.fill(); E.plainText(ctx, '1', 0, 135, 110, '#0F172A', { weight: 900 }); badge(ctx, 'EUTELSAT', EUT); }, { rot: 0 });
        if (lt > 3.0) stars(ctx, 700, 1010, 260, t, pop(lt, 3.1, 0.5));
        sparks(ctx, 700, 960, lt, 2.3, 22, GOLD);
        panda(ctx, 'emotions/begeistert', lt, t, { x: 160, h: 440 });
      } },
    { // 27,25–29,25: warum interessant – erklär ich dir
      start: 27.25, mood: 'dark', poses: ['poses/tipp_geben'], ...TS('left'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, -0.3], [0.3, 'pop', 0.4, 0.2], [0.6, 'ping', 0.4, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'WARUM DAS', c: C.white, size: 130 }, { t: 'INTERESSANT IST', c: C.white, size: 110, ribbon: VIO }]]]);
        E.withT(ctx, 700, 1000, pop(lt, 0.2, 0.45), 0, () => { pulseRings(ctx, 0, 0, t, '#A78BFA', 3, 220); ctx.save(); ctx.shadowColor = '#A78BFA'; ctx.shadowBlur = 30; ctx.beginPath(); ctx.arc(0, 0, 100, 0, 7); ctx.fillStyle = VIO; ctx.fill(); ctx.restore(); bigNum(ctx, '!', 0, 20, 140, C.white); });
        panda(ctx, 'poses/tipp_geben', lt, t, { x: 160, h: 440 });
      } },
    { // 29,25–32: keine Anlageberatung + Like/Follow
      start: 29.25, mood: 'neutral', poses: ['emotions/augenzwinkern', 'emotions/freundlich'], ...TS('down'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0], ...flySfx(0.2, 0.2), [0.4, 'paper', 0.3, 0.2], [1.6, 'pop', 0.45, 0.3], [2.1, 'pop', 0.45, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'KEINE', c: C.white, size: 130 }, { t: 'ANLAGEBERATUNG', c: C.white, size: 110, ribbon: BLUE }]], [1.5, [{ t: 'LIKE & FOLLOW', c: C.white, size: 115, ribbon: '#FF3B5C' }]]]);
        if (lt < 1.5) fly(ctx, 680, 960, lt, 0.2, 'up', () => glass(ctx, 0, 0, 540, 320, { accent: BLUE, title: 'HINWEIS', body: () => { label(ctx, 'NUR INFORMATION', 0, -5, 46, C.white); label(ctx, 'KEINE KAUFEMPFEHLUNG', 0, 60, 30); } }), { rot: 0.1 });
        else { P.heart(ctx, 820, 820, 1.4 * pop(lt, 1.6, 0.4) * (1 + Math.sin(t * 6) * 0.05)); tag(ctx, '+ FOLGEN', 820, 1100, '#FF3B5C', 1.4 * pop(lt, 2.1, 0.45)); }
        pandaSeq(ctx, [[0, 'emotions/augenzwinkern'], [1.5, 'emotions/freundlich']], lt, t, { x: 170, h: 460 });
      } },
    { // 32–36: OneWeb – mehr als 600 Satelliten
      start: 32.0, mood: 'blue', poses: ['poses/praesentieren'], ...TS('zoom'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0], [0.3, 'pop', 0.4, 0.2], ...ticks(2.3, 3.4, 8, 0.4, 0.2), [3.45, 'ding', 0.45, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'EUTELSAT BETREIBT', c: C.white, size: 105 }, { t: 'ONEWEB', c: C.white, size: 140, ribbon: EUT }]], [2.25, [{ t: 'MEHR ALS', c: C.white, size: 125 }, { t: '600 SATELLITEN', c: C.white, size: 110, ribbon: EUT }]]]);
        const v = Math.round(lerp(0, 600, eOut(prog(lt, 2.3, 1.1))));
        E.withT(ctx, 700, 1000, pop(lt, 0.2, 0.5), 0, () => globe(ctx, 0, 0, 200, t, { n: Math.max(6, Math.round(v / 25)), col: '#93C5FD' }));
        if (lt > 2.3) tag(ctx, `> ${v}`, 700, 1290, EUT, pop(lt, 2.3, 0.4));
        panda(ctx, 'poses/praesentieren', lt, t, { x: 160, h: 440 });
      } },
    { // 36–39,5: Starlink >10.000 – ein Vielfaches
      start: 36.0, mood: 'dark', poses: ['emotions/ueberrascht'], ...TS('right'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0.3], [0.3, 'pop', 0.35, -0.2], ...ticks(1.3, 2.6, 9, 0.4, 0.2), [2.65, 'sub', 0.3, 0], [2.7, 'impact', 0.35, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'STARLINK HAT', c: C.white, size: 125 }, { t: 'EIN VIELFACHES', c: C.white, size: 110, ribbon: SPX }]], [2.6, [{ t: '> 10.000', c: C.white, size: 160, ribbon: SPX }, { t: 'SATELLITEN', c: C.white, size: 120 }]]]);
        bars(ctx, 650, 1230, [['ONEWEB', 600, EUT, '> 600', 0.3], ['STARLINK', 10000, '#CBD5E1', '> 10.000', 1.3]], lt, 0.3, { max: 10500, h: 480 });
        panda(ctx, 'emotions/ueberrascht', lt, t, { x: 150, h: 420 });
      } },
    { // 39,5–43,75: SES aus Luxemburg legt auch zu
      start: 39.5, mood: 'good', poses: ['poses/zeigen'], ...TS('left'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, -0.3], ...flySfx(0.2, -0.3), ...flySfx(0.9, 0.3), [1.8, 'pop', 0.4, -0.3], [2.1, 'pop', 0.4, 0.3], [2.3, 'ping', 0.4, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'AUCH SES', c: C.white, size: 135, ribbon: VIO }, { t: 'AUS LUXEMBURG', c: C.white, size: 110 }]], [1.75, [{ t: 'LEGT EBENFALLS', c: C.white, size: 115 }, { t: 'ZU!', c: '#4ADE80', size: 160 }]]]);
        fly(ctx, 530, 1000, lt, 0.2, 'left', () => E.withT(ctx, 0, 0, 0.9, 0, () => badge(ctx, 'EUTELSAT', EUT, 'FRANKREICH')));
        fly(ctx, 870, 1000, lt, 0.9, 'right', () => E.withT(ctx, 0, 0, 0.9, 0, () => badge(ctx, 'SES', VIO, 'LUXEMBURG')));
        [[530, 1.8], [870, 2.1]].forEach(([x, at]) => { if (lt > at) E.withT(ctx, x, 820, pop(lt, at, 0.4), 0, () => E.arrowUp(ctx, 0, 0, 0.45, C.green)); });
        panda(ctx, 'poses/zeigen', lt, t, { x: 150, h: 420 });
      } },
    { // 43,75–47,5: Erwartung, nicht Vertrag
      start: 43.75, mood: 'dark', poses: ['poses/analysieren'], ...TS('up'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0], ...flySfx(1.9, -0.3), [2.4, 'ding', 0.4, -0.3], ...flySfx(2.7, 0.3), [3.2, 'down', 0.3, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DER KURS', c: C.white, size: 135 }, { t: 'REAGIERT AUF …', c: C.white, size: 110 }]], [2.0, [{ t: 'ERWARTUNG,', c: GOLD, size: 125 }, { t: 'NICHT VERTRAG', c: C.white, size: 110, ribbon: RED }]]]);
        fly(ctx, 520, 1000, lt, 1.9, 'left', () => glass(ctx, 0, 0, 300, 340, { accent: GOLD, title: 'ERWARTUNG', body: () => { bigNum(ctx, '✓', 0, 20, 150, '#4ADE80'); } }));
        fly(ctx, 870, 1000, lt, 2.7, 'right', () => glass(ctx, 0, 0, 300, 340, { accent: RED, title: 'VERTRAG', body: () => { bigNum(ctx, '✕', 0, 20, 150, '#F87171'); } }));
        if (lt < 1.9) E.withT(ctx, 700, 1000, pop(lt, 0.2, 0.45), 0, () => { pulseRings(ctx, 0, 0, t, GOLD, 3, 200); bigNum(ctx, '?', 0, 30, 200, GOLD); });
        panda(ctx, 'poses/analysieren', lt, t, { x: 150, h: 420 });
      } },
    { // 47,5–50,5: Wetten auf Spannungen Washington – Kiew
      start: 47.5, mood: 'bad', poses: ['emotions/nachdenklich'], ...TS('zoom'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0], ...flySfx(0.4, -0.3), ...flySfx(1.5, 0.3), [2.0, 'impact', 0.35, 0], [2.05, 'glitch', 0.3, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'WETTE AUF', c: C.white, size: 130 }, { t: 'SPANNUNGEN', c: C.white, size: 125, ribbon: RED }]]]);
        fly(ctx, 510, 980, lt, 0.4, 'left', () => E.withT(ctx, 0, 0, 0.8, 0, () => badge(ctx, 'WASHINGTON', '#1E3A8A')));
        fly(ctx, 890, 980, lt, 1.5, 'right', () => E.withT(ctx, 0, 0, 0.8, 0, () => badge(ctx, 'KIEW', UA1)));
        if (lt > 2.0) { const s = pop(lt, 2.0, 0.35); E.withT(ctx, 700, 980, s * (1 + 0.06 * Math.sin(t * 12)), 0.2, () => { ctx.save(); ctx.shadowColor = GOLD; ctx.shadowBlur = 30; ctx.beginPath(); ctx.moveTo(20, -90); ctx.lineTo(-45, 10); ctx.lineTo(-2, 10); ctx.lineTo(-22, 90); ctx.lineTo(48, -15); ctx.lineTo(4, -15); ctx.closePath(); ctx.fillStyle = GOLD; ctx.fill(); ctx.restore(); }); }
        panda(ctx, 'emotions/nachdenklich', lt, t, { x: 150, h: 420 });
      } },
    { // 50,5–54: Analysten – Ergänzung statt Ersatz
      start: 50.5, mood: 'blue', poses: ['poses/praesentieren'], ...TS('left'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, -0.3], [0.3, 'pop', 0.4, -0.2], ...flySfx(1.4, 0.3), [2.25, 'snap', 0.4, 0.2], [2.4, 'ding', 0.4, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'LAUT ANALYSTEN:', c: C.white, size: 110 }, { t: 'ONEWEB IST …', c: C.white, size: 125, ribbon: EUT }]], [2.25, [{ t: 'ERGÄNZUNG,', c: '#4ADE80', size: 125 }, { t: 'KEIN ERSATZ', c: C.white, size: 120, ribbon: VIO }]]]);
        P.puzzle(ctx, 580, 1000, 1.1 * pop(lt, 0.3, 0.45), '#94A3B8', { label: 'STARLINK', size: 30 });
        const fit = eOut(prog(lt, 1.4, 0.9));
        if (lt > 1.4) P.puzzle(ctx, lerp(1050, 810, fit), lerp(1300, 1000, fit), 1.1, EUT, { label: 'ONEWEB', size: 30, rot: (1 - fit) * 0.6 });
        if (lt > 2.25) { const a = 0.6 * (1 - prog(lt, 2.25, 0.6)); ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.beginPath(); ctx.arc(700, 1000, 260, 0, 7); ctx.fill(); }
        panda(ctx, 'poses/praesentieren', lt, t, { x: 150, h: 420 });
      } },
    { // 54–56,75: Wechsel braucht neue Terminals
      start: 54.0, mood: 'dark', poses: ['poses/zeigen'], ...TS('right'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0.3], [0.3, 'pop', 0.4, -0.2], ...flySfx(1.6, 0.3), [2.2, 'cash', 0.4, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'WER WECHSELT,', c: C.white, size: 120 }, { t: 'BRAUCHT NEUE', c: C.white, size: 115 }]], [2.0, [{ t: 'TERMINALS', c: C.white, size: 140, ribbon: GOLD }]]]);
        dish(ctx, 520, 1080, 0.9 * pop(lt, 0.2, 0.45), t, '#94A3B8');
        if (lt > 1.0) { ctx.save(); ctx.globalAlpha = pop(lt, 1.0, 0.3); ctx.strokeStyle = RED; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(420, 900); ctx.lineTo(620, 1120); ctx.stroke(); ctx.restore(); }
        fly(ctx, 870, 1080, lt, 1.6, 'right', () => dish(ctx, 0, 0, 0.9, t, '#BFDBFE'));
        if (lt > 2.2) tag(ctx, 'NEU + KOSTEN', 870, 1290, GOLD, pop(lt, 2.2, 0.4));
        panda(ctx, 'poses/zeigen', lt, t, { x: 150, h: 420 });
      } },
    { // 56,75–60: Ukraine Problem, Börse Chance
      start: 56.75, mood: 'blue', poses: ['emotions/nachdenklich', 'emotions/augenzwinkern'], ...TS('up'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0], ...flySfx(0.2, -0.3), [0.8, 'down', 0.3, -0.3], ...flySfx(2.2, 0.3), [2.7, 'cash', 0.45, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'UKRAINE:', c: C.white, size: 135 }, { t: 'EIN PROBLEM', c: C.white, size: 120, ribbon: RED }]], [2.25, [{ t: 'BÖRSE:', c: C.white, size: 140 }, { t: 'EINE CHANCE', c: C.white, size: 120, ribbon: GRN }]]]);
        fly(ctx, 520, 1000, lt, 0.2, 'left', () => glass(ctx, 0, 0, 300, 380, { accent: RED, title: 'UKRAINE', body: () => { E.withT(ctx, 0, -20, 0.8, 0, () => uaCard(ctx)); E.arrowDown(ctx, 0, 110, 0.32, C.red); } }));
        fly(ctx, 870, 1000, lt, 2.2, 'right', () => glass(ctx, 0, 0, 300, 380, { accent: GRN, title: 'BÖRSE', body: () => { E.lineChart(ctx, -110, -60, 220, 120, [[0, 0.9], [0.5, 0.6], [1, 0.05]], eOut(prog(lt, 2.4, 0.7)), '#22C55E', { lw: 8, area: true }); E.arrowUp(ctx, 0, 120, 0.32, C.green); } }));
        pandaSeq(ctx, [[0, 'emotions/nachdenklich'], [2.25, 'emotions/augenzwinkern']], lt, t, { x: 150, h: 420 });
      } },
    { // 60–Ende: Geopolitik + Erwartung, dass Europa profitiert
      start: 60.0, mood: 'dark', poses: ['poses/tipp_geben', 'emotions/cool'], ...TS('zoom'), focus: { x: 640, y: 930 },
      sfx: [[-0.18, 'whoosh', 0.3, 0], [0.3, 'pop', 0.4, 0.2], [2.25, 'signal', 0.3, 0.2], [3.9, 'swell', 0.3, 0], [4.0, 'ding', 0.45, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'HINTER DER', c: C.white, size: 130 }, { t: 'SCHLAGZEILE:', c: C.white, size: 120 }]], [2.25, [{ t: 'GEOPOLITIK', c: C.white, size: 135, ribbon: VIO }]], [4.0, [{ t: 'PROFITIERT', c: C.white, size: 130 }, { t: 'EUROPA?', c: GOLD, size: 140 }]]]);
        E.withT(ctx, 700, 1000, pop(lt, 0.2, 0.5), 0, () => globe(ctx, 0, 0, 180, t, { n: 16 }));
        if (lt > 4.0) stars(ctx, 700, 1000, 280, t, pop(lt, 4.0, 0.5));
        pandaSeq(ctx, [[0, 'poses/tipp_geben'], [4.0, 'emotions/cool']], lt, t, { x: 150, h: 420 });
      } },
  ];

  const music = {
    bpm: 98, chords: [['E', 'm'], ['C', ''], ['G', ''], ['D', '']], level: 0.5, abs: 0.1,
    sections: [[0, 'pulse'], [3.0, 'tension'], [8.5, 'full'], [10.25, 'tension'], [21.75, 'full'], [29.25, 'pulse'], [32.0, 'full'], [43.75, 'tension'], [50.5, 'pulse'], [60.0, 'full']],
    drops: [38.0],
  };

  window.VIDEO = { name: 'eutelsat-starlink', style: 'clean', fps: 30, duration: 65.25, scenes, captions, xfade: 0.35, grain: 0.035, bokeh: false, endFade: false, pandaFixed: true, music };
})();
