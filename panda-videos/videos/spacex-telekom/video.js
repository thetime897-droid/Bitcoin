// SpaceX greift Telekom an – Short (62,66 s). Zeiten = Voice-Over-Zeitachse des Originals.
// Stil/Tempo wie iran-wahlkampf; neu: Musikbett mit Spannungsbogen, Riser/Sub-Drops, Stille vor Enthuellungen.
(() => {
  const E = window.E, C = E.C, P = E.P;
  const { pop, prog, eOut, eInOut, lerp } = E;
  const MAG = '#E20074', SPX = '#1F2937';
  const panda = (ctx, pose, lt, t, o = {}) => E.drawPanda(ctx, pose, { x: o.x ?? 200, y: o.y ?? 1405, h: o.h ?? 500, lt, t, enter: o.enter ?? true, from: o.from || ((o.x ?? 200) > 540 ? 'right' : 'left'), flip: o.flip, swapAt: o.swapAt, enterAt: o.enterAt });
  const pandaSeq = (ctx, seq, lt, t, o = {}) => { let k = 0; seq.forEach(([at], i) => { if (lt >= at) k = i; }); const [at, pose] = seq[k]; panda(ctx, pose, lt, t, k === 0 ? o : { ...o, enter: false, swapAt: at }); };
  const H = (ctx, lt, states) => { let k = 0; states.forEach(([at], i) => { if (lt >= at) k = i; }); E.headline(ctx, states[k][1], lt - states[k][0], states[k][2] || {}); };
  const ticks = (from, to, n, gain = 0.6, pan = 0) => Array.from({ length: n }, (_, i) => [from + (to - from) * Math.pow(i / (n - 1), 0.8), 'tick', gain, pan]);
  const pct = (v) => v.toFixed(0) + ' %';

  const captions = [
    [0.0, 1.5, 'Breaking News bei SpaceX.'],
    [1.5, 2.25, 'Sie haben jetzt massives'],
    [2.25, 3.6, 'Kurspotenzial und greifen einen'],
    [3.6, 5.5, 'deutschen Konzern in Milliarden-'],
    [5.5, 6.3, 'höhe an.'],
    [6.3, 6.8, 'Laut Elon Musk ist'],
    [6.8, 8.0, 'das das fehlende Puzzleteil'],
    [8.0, 8.75, 'seines perfekten Plans.'],
    [8.75, 9.75, 'Und warum 1 Deal'],
    [9.75, 11.25, 'in Amerika die Telekom'],
    [11.25, 12.0, 'jetzt so hart trifft'],
    [12.0, 12.75, 'und ob das erst der'],
    [12.75, 13.25, 'Anfang ist,'],
    [13.25, 13.75, 'erfährst du jetzt.'],
    [13.75, 15.6, 'Das Ganze ist keine Anlageberatung.'],
    [15.6, 16.0, 'Über Like und 1'],
    [16.0, 16.6, 'Follow würde ich mich freuen.'],
    [16.75, 18.2, 'SpaceX kauft nämlich in'],
    [18.2, 18.6, 'den USA'],
    [18.6, 21.1, 'Mobilfunkfrequenzen im 800-Megahertz-Band,'],
    [21.1, 22.0, 'landesweit nutzbar.'],
    [22.0, 23.2, 'Klingt erstmal langweilig, aber'],
    [23.25, 24.0, 'das Ziel:'],
    [24.0, 25.3, 'Starlink Mobile soll 1'],
    [25.3, 27.75, 'großer US-Mobilfunkanbieter werden,'],
    [27.75, 29.0, 'direkt gegen T-'],
    [29.0, 30.0, 'Mobile US. Und T-'],
    [30.0, 30.9, 'Mobile US gehört zu'],
    [30.9, 32.75, '54 Prozent der Telekom.'],
    [32.75, 34.0, 'Die US-Tochter verloren'],
    [34.0, 35.5, 'am Freitag rund 13 Prozent.'],
    [35.5, 36.75, 'An der Börse fällt die Telekom-'],
    [36.75, 37.75, 'Aktie fast 8 Prozent.'],
    [37.75, 38.6, 'Das sind rund 10'],
    [38.6, 40.0, 'Milliarden Dollar Börsenwert.'],
    [40.0, 41.25, 'Das Bekannte daran ist,'],
    [41.25, 43.0, 'SpaceX ist zurzeit noch Partner'],
    [43.0, 43.5, 'von T-'],
    [43.5, 45.0, 'Mobile für Empfang per Satellit'],
    [45.0, 45.75, 'in Funklöchern.'],
    [45.75, 46.75, 'Aus dem US-Partner'],
    [46.75, 48.1, 'könnte jetzt 1 Konkurrent werden.'],
    [48.2, 49.0, 'Und aus Sicht der'],
    [49.0, 50.0, 'Börse ist das eine'],
    [50.0, 50.75, 'echte Gefahr.'],
    [50.75, 51.6, 'Aus Sicht von den Analysten:'],
    [51.75, 53.0, 'Ohne Roaming-Partner braucht'],
    [53.0, 54.4, 'SpaceX noch Jahre für'],
    [54.4, 55.6, '1 gutes Angebot und'],
    [55.6, 56.0, 'die US-'],
    [56.0, 57.1, 'Aufsicht muss den Deal'],
    [57.1, 58.1, 'erst genehmigen.'],
    [58.1, 59.0, 'Kann SpaceX sich also'],
    [59.0, 60.6, 'in diesem Geschäftsfeld durchsetzen'],
    [60.6, 61.25, 'oder ist der Abverkauf'],
    [61.25, 62.66, 'bei der Telekom übertrieben?'],
  ];

  const scenes = [
    { // 1 0–3,6: Breaking – Rakete, massives Kurspotenzial
      start: 0, mood: 'dark', poses: ['emotions/begeistert'], punch: false, noBrand: true, focus: { x: 640, y: 950 },
      sfx: [[0.0, 'ping', 0.6, 0], [0.3, 'rocket', 0.6, 0.3], [2.25, 'riser', 0.35, 0], [2.3, 'sub', 0.5, 0]],
      draw(ctx, lt, t) {
        E.liveBar(ctx, lt, 'BREAKING  •  SPACEX GREIFT DEN MOBILFUNK AN  •  T-MOBILE US –13 %  •  TELEKOM –8 %  •  ');
        H(ctx, lt, [[0, [{ t: 'BREAKING', c: C.yellow, size: 150 }, { t: 'SPACEX!', c: C.white, size: 150 }], { y: 480, delay: 0.1 }],
          [1.5, [{ t: 'MASSIVES', c: C.white, size: 120 }, { t: 'KURSPOTENZIAL!', c: C.white, size: 120, ribbon: C.greenD }], { y: 480 }]]);
        const up = eInOut(prog(lt, 0.3, 3.0));
        P.smoke(ctx, 760, 1330, t, 9, 1.1);
        P.rocket(ctx, 760, lerp(1150, 860, up), 400, t, { label: 'SPACEX', rot: 0.04 });
        if (lt > 2.2) { E.lineChart(ctx, 330, 900, 300, 260, [[0, 1], [0.35, 0.75], [0.6, 0.6], [1, 0]], eOut(prog(lt, 2.3, 0.8)), C.green, { lw: 14 }); }
        panda(ctx, 'emotions/begeistert', lt, t, { x: 200, h: 520 });
      },
    },
    { // 2 3,6–6,3: greift DAX-Konzern in Milliardenhoehe an
      start: 3.6, mood: 'bad', poses: ['emotions/ueberrascht'], focus: { x: 640, y: 950 }, shake: [1.55],
      sfx: [[0.1, 'whoosh', 0.35, -0.4], [1.0, 'riser', 0.3, 0.3], [1.55, 'boom', 0.55, 0.3], [1.6, 'cash', 0.35, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'ANGRIFF AUF', c: C.white, size: 120 }, { t: 'DEUTSCHEN KONZERN!', c: C.white, size: 100, ribbon: C.red }]],
          [1.5, [{ t: 'IN MILLIARDEN-', c: C.white, size: 120 }, { t: 'HÖHE!', c: C.yellow, size: 160 }]]]);
        // Konzern-Turm in Schwarz-Rot-Gold
        const bx = 790, by = 1300;
        E.withT(ctx, bx, by, pop(lt, 0.1, 0.5), 0, () => {
          P.softShadow(ctx, 0, 0, 170);
          E.rr(ctx, -130, -560, 260, 560, 14); E.ink(ctx, '#E5E7EB', 9);
          [['#111827', 0], ['#DD0000', 1], ['#FFCE00', 2]].forEach(([c, i]) => { E.rr(ctx, -130, -560 + i * 40, 260, 40, i ? 0 : 14); E.ink(ctx, c, 0); });
          E.rr(ctx, -130, -560, 260, 560, 14); E.ink(ctx, null, 9);
          for (let r = 0; r < 7; r++) for (let k = 0; k < 3; k++) { E.rr(ctx, -100 + k * 72, -420 + r * 56, 52, 36, 6); E.ink(ctx, '#7FC4F5', 4); }
          E.pill(ctx, 'DAX-KONZERN', 0, -600, 34, C.ink, C.white);
        });
        const fly = eInOut(prog(lt, 0.2, 1.35));
        if (lt < 1.6) P.rocket(ctx, lerp(260, 700, fly), lerp(700, 900, fly), 220, t, { rot: 1.8, label: '' });
        P.crosshair(ctx, bx, 950, 70 * pop(lt, 0.4, 0.4), t);
        E.explosion(ctx, bx - 40, 920, lt, 1.55, { size: 1.0, seed: 4 });
        if (lt > 1.6) E.moneyRain(ctx, lt, 1.6, { x: 800, y: 900, n: 9, seed: 6 });
        panda(ctx, 'emotions/ueberrascht', lt, t, { x: 190, h: 480 });
      },
    },
    { // 3 6,3–8,75: Elon Musk – das fehlende Puzzleteil
      start: 6.3, mood: 'blue', poses: ['poses/praesentieren'], focus: { x: 640, y: 930 },
      sfx: [[0.1, 'pop', 0.4, 0.2], [1.75, 'stamp', 0.4, 0.15], [1.8, 'ping', 0.45, 0.15]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'LAUT ELON MUSK:', c: C.white, size: 115 }, { t: 'DAS FEHLENDE', c: C.yellow, size: 125 }]],
          [1.7, [{ t: 'PUZZLETEIL', c: C.white, size: 140, ribbon: '#2D7FF9' }, { t: 'SEINES PLANS!', c: C.white, size: 105 }]]]);
        const pieces = [['RAKETEN', C.red, 540, 820], ['SATELLITEN', '#2D7FF9', 780, 820], ['INTERNET', C.greenD, 540, 1060]];
        pieces.forEach(([lab, col, x, y], i) => P.puzzle(ctx, x, y, 1.15 * pop(lt, 0.1 + i * 0.15, 0.45), col, { label: lab, size: 34 }));
        const fit = eOut(prog(lt, 0.8, 0.95));
        if (lt < 1.75) { ctx.save(); ctx.setLineDash([16, 12]); ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 6; E.rr(ctx, 780 - 115, 1060 - 115, 230, 230, 10); ctx.stroke(); ctx.restore(); }
        P.puzzle(ctx, lerp(1000, 780, fit), lerp(1350, 1060, fit), 1.15, MAG, { label: 'MOBILFUNK', size: 30, rot: (1 - fit) * 0.6 });
        if (lt > 1.75) { const a = 0.6 * (1 - prog(lt, 1.75, 0.6)); ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.beginPath(); ctx.arc(780, 1060, 200, 0, 7); ctx.fill(); }
        panda(ctx, 'poses/praesentieren', lt, t, { x: 180, h: 470 });
      },
    },
    { // 4 8,75–13,75: 1 Deal trifft Telekom hart – nur der Anfang? -> erfaehrst du jetzt
      start: 8.75, mood: 'bad', poses: ['emotions/nachdenklich', 'poses/tipp_geben'], focus: { x: 640, y: 930 }, shake: [2.55],
      shakeSfx: 'sub', music: true,
      sfx: [[0.2, 'paper', 0.45, 0.2], [1.6, 'riser', 0.3, 0.2], [2.55, 'glitch', 0.4, 0.25], [3.3, 'pop', 0.35, 0], [4.5, 'swell', 0.45, 0], [4.5, 'ping', 0.5, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'WARUM 1 DEAL', c: C.white, size: 120 }, { t: 'IN AMERIKA…', c: C.yellow, size: 125 }]],
          [1.0, [{ t: '…DIE TELEKOM', c: C.white, size: 120 }, { t: 'HART TRIFFT!', c: C.white, size: 130, ribbon: C.red }]],
          [3.25, [{ t: 'NUR DER', c: C.white, size: 120 }, { t: 'ANFANG?', c: C.yellow, size: 160 }]],
          [4.5, [{ t: 'DAS ERFÄHRST', c: C.white, size: 115 }, { t: 'DU JETZT!', c: C.white, size: 140, ribbon: C.greenD }]]]);
        E.withT(ctx, 520, 820, pop(lt, 0.1, 0.5), -0.06, () => { P.card(ctx, 0, 0, 380, 260, 'DEAL', { head: SPX }); P.flagUS(ctx, -120, -60, 110, t); E.plainText(ctx, 'USA', 60, 40, 60, C.ink, { weight: 900 }); });
        const hit = lt > 2.55;
        E.withT(ctx, 820, 1110, pop(lt, 1.0, 0.5), hit ? 0.12 * Math.min(1, (lt - 2.55) * 4) : 0.04, () => P.brandBadge(ctx, 0, 0, 340, 'TELEKOM', MAG));
        if (hit) { ctx.strokeStyle = C.ink; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(760, 1060); ctx.lineTo(800, 1100); ctx.lineTo(780, 1130); ctx.lineTo(830, 1170); ctx.stroke(); }
        if (lt > 1.4) { const p = eOut(prog(lt, 1.4, 1.1)); ctx.strokeStyle = C.red; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(600, 920); ctx.lineTo(lerp(600, 760, p), lerp(920, 1050, p)); ctx.stroke(); }
        E.explosion(ctx, 790, 1080, lt, 2.55, { size: 0.8, seed: 9, c1: MAG });
        if (lt > 3.25 && lt < 4.6) E.questionMarks(ctx, 860, 860, lt - 3.25, 3, C.yellow);
        pandaSeq(ctx, [[0, 'emotions/nachdenklich'], [4.5, 'poses/tipp_geben']], lt, t, { x: 180, h: 470 });
      },
    },
    { // 5 13,75–16,75: Keine Anlageberatung – Like & Follow
      start: 13.75, mood: 'good', poses: ['emotions/augenzwinkern', 'emotions/freundlich'], focus: { x: 600, y: 930 },
      sfx: [[0.15, 'paper', 0.35, 0.2], [1.95, 'pop', 0.5, 0.2], [2.35, 'pop', 0.45, 0.4]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'KEINE', c: C.white, size: 130 }, { t: 'ANLAGEBERATUNG!', c: C.white, size: 105, ribbon: '#2D7FF9' }]],
          [1.85, [{ t: 'LIKE + FOLLOW', c: C.white, size: 120, ribbon: '#FF3B5C' }, { t: 'FREUEN MICH!', c: C.white, size: 115 }]]]);
        E.withT(ctx, 690, 940, pop(lt, 0.1, 0.5), 0.03, () => { P.card(ctx, 0, 0, 440, 360, 'HINWEIS', { head: '#2D7FF9' });
          E.plainText(ctx, 'NUR INFO', 0, -30, 46, C.ink, { weight: 900 }); E.plainText(ctx, 'KEINE KAUF-', 0, 40, 40, C.greyD, { weight: 900 }); E.plainText(ctx, 'EMPFEHLUNG', 0, 90, 40, C.greyD, { weight: 900 }); });
        if (lt > 1.85) { P.heart(ctx, 820, 760, 1.4 * pop(lt, 1.95, 0.4) * (1 + Math.sin(t * 6) * 0.05)); E.pill(ctx, '+ FOLGEN', 820, 1180, 44, '#FF3B5C', C.white, pop(lt, 2.35, 0.45)); }
        pandaSeq(ctx, [[0, 'emotions/augenzwinkern'], [1.85, 'emotions/freundlich']], lt, t, { x: 200, h: 520 });
      },
    },
    { // 6 16,75–22: SpaceX kauft 800-MHz-Frequenzen, landesweit
      start: 16.75, mood: 'blue', poses: ['poses/zeigen'], focus: { x: 640, y: 930 },
      sfx: [[0.1, 'whoosh', 0.3, 0.2], [0.35, 'cash', 0.45, 0.3], ...ticks(1.9, 3.3, 9, 0.45, 0.2), [3.4, 'signal', 0.5, 0.2], [4.4, 'pop', 0.4, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'SPACEX KAUFT', c: C.white, size: 120 }, { t: 'FREQUENZEN!', c: C.yellow, size: 135 }]],
          [1.85, [{ t: '800 MHZ', c: C.white, size: 150, ribbon: '#2D7FF9' }, { t: 'MOBILFUNK-BAND', c: C.white, size: 100 }]],
          [4.35, [{ t: 'LANDESWEIT', c: C.white, size: 135, ribbon: C.greenD }, { t: 'NUTZBAR!', c: C.white, size: 120 }]]]);
        E.withT(ctx, 640, 950, pop(lt, 0.05, 0.5), 0, () => { P.card(ctx, 0, 0, 680, 480, 'USA', { head: '#1F3A93', fill: '#EAF2FF' }); });
        // Welle
        const amp = eOut(prog(lt, 1.9, 1.2)), mhz = Math.round(lerp(0, 800, eOut(prog(lt, 1.9, 1.4))));
        ctx.save(); ctx.strokeStyle = '#2D7FF9'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath();
        for (let x = 330; x <= 950; x += 6) { const y = 960 + Math.sin((x - 330) * 0.045 - t * 6) * 70 * amp; x === 330 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.restore();
        if (lt > 1.9) E.pill(ctx, `${mhz} MHZ`, 640, 1120, 44, C.ink, C.white, pop(lt, 1.9));
        if (lt > 4.35) { for (let k = 0; k < 5; k++) { const ph = ((lt - 4.35) * 0.8 + k * 0.2) % 1; ctx.globalAlpha = 1 - ph; ctx.strokeStyle = C.greenD; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(640, 960, 60 + ph * 300, 0, 7); ctx.stroke(); } ctx.globalAlpha = 1; }
        P.flagUS(ctx, 860, 640, 110, t);
        panda(ctx, 'poses/zeigen', lt, t, { x: 170, h: 460 });
      },
    },
    { // 7 22–25,3: Klingt langweilig, aber das Ziel: Starlink Mobile
      start: 22.0, mood: 'dark', poses: ['emotions/cool'], focus: { x: 640, y: 930 },
      sfx: [[1.1, 'riser', 0.35, 0], [1.25, 'sub', 0.55, 0], [1.3, 'signal', 0.45, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'KLINGT', c: C.white, size: 120 }, { t: 'LANGWEILIG…', c: '#9CA3AF', size: 135 }]],
          [1.25, [{ t: 'DAS ZIEL:', c: C.yellow, size: 125 }, { t: 'STARLINK MOBILE', c: C.white, size: 110, ribbon: '#2D7FF9' }]]]);
        if (lt < 1.35) { ctx.save(); ctx.globalAlpha = 1 - prog(lt, 1.1, 0.25); E.comicText(ctx, 'Z z z', 720, 900, { size: 120, fill: '#9CA3AF', rot: -0.1 + Math.sin(lt * 2) * 0.05, scale: pop(lt, 0.2) }); ctx.restore(); }
        if (lt > 1.2) {
          P.satellite(ctx, 820, 640, 0.9 * pop(lt, 1.2, 0.5), t);
          P.beam(ctx, 790, 700, 640, 1000, t, eOut(prog(lt, 1.4, 0.6)));
          P.phone(ctx, 640, 1060, 300, { bars: 4, label: 'STARLINK', scale: pop(lt, 1.35, 0.5) });
        }
        panda(ctx, 'emotions/cool', lt, t, { x: 190, h: 480 });
      },
    },
    { // 8 25,3–29,75: grosser US-Anbieter – direkt gegen T-Mobile US
      start: 25.3, mood: 'neutral', poses: ['poses/selbstbewusst'], focus: { x: 640, y: 940 },
      sfx: [[0.1, 'pop', 0.4, -0.2], [2.45, 'whoosh', 0.35, 0.3], [2.55, 'stamp', 0.45, 0], [2.6, 'boom', 0.3, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'GROSSER US-', c: C.white, size: 120 }, { t: 'MOBILFUNKER!', c: C.yellow, size: 125 }]],
          [2.45, [{ t: 'DIREKT GEGEN', c: C.white, size: 120 }, { t: 'T-MOBILE US!', c: C.white, size: 130, ribbon: MAG }]]]);
        const vs = eOut(prog(lt, 2.45, 0.5));
        E.withT(ctx, lerp(640, 470, vs), 960, pop(lt, 0.1, 0.5), -0.05, () => { P.brandBadge(ctx, 0, -70, 300, 'STARLINK', SPX); P.rocket(ctx, 0, 120, 180, t, { flame: true }); });
        if (lt > 2.45) {
          E.withT(ctx, lerp(1300, 820, vs), 960, 1, 0.05, () => { P.brandBadge(ctx, 0, -70, 300, 'T-MOBILE US', MAG); P.tower(ctx, 0, 220, 230, t); });
          E.burst(ctx, 645, 950, 50, 100, 10, C.yellow, lt, 6);
          E.comicText(ctx, 'VS', 645, 950, { size: 110, fill: C.red, scale: pop(lt, 2.55, 0.4), rot: -0.1 });
        }
        panda(ctx, 'poses/selbstbewusst', lt, t, { x: 170, h: 460 });
      },
    },
    { // 9 29,75–32,75: T-Mobile US gehoert zu 54 % der Telekom
      start: 29.75, mood: 'neutral', poses: ['poses/analysieren'], focus: { x: 620, y: 930 },
      sfx: [...ticks(1.2, 2.25, 8, 0.45, 0.1), [2.3, 'pop', 0.5, 0.1]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'T-MOBILE US', c: C.white, size: 125, ribbon: MAG }, { t: 'GEHÖRT ZU…', c: C.white, size: 110 }]],
          [2.2, [{ t: '54 %', c: C.white, size: 160, ribbon: MAG }, { t: 'DER TELEKOM!', c: C.white, size: 120 }]]]);
        const p = eOut(prog(lt, 1.2, 1.1));
        P.pie(ctx, 660, 960, 230, 0.54, p, [MAG, '#E5E7EB'], { label: pct(54 * p), labelScale: pop(lt, 1.2) });
        E.pill(ctx, 'TELEKOM', 660, 1260, 40, MAG, C.white, pop(lt, 2.3));
        panda(ctx, 'poses/analysieren', lt, t, { x: 170, h: 450 });
      },
    },
    { // 10 32,75–35,5: US-Tochter -13 % am Freitag
      start: 32.75, mood: 'bad', poses: ['emotions/ueberrascht'], focus: { x: 640, y: 930 }, shake: [2.25], shakeSfx: 'sub',
      sfx: [[0.15, 'glitch', 0.35, 0.2], [1.3, 'riser', 0.35, 0], [2.3, 'down', 0.45, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'US-TOCHTER', c: C.white, size: 130 }, { t: 'AM FREITAG:', c: C.yellow, size: 120 }]],
          [2.2, [{ t: '–13 %!', c: C.white, size: 170, ribbon: C.red }]]]);
        E.whiteboard(ctx, 640, 930, 660, 460);
        E.plainText(ctx, 'T-MOBILE US', 420, 755, 38, MAG, { weight: 900, align: 'left' });
        const pts = [[0.03, 0.15], [0.15, 0.12], [0.28, 0.2], [0.42, 0.16], [0.55, 0.22], [0.66, 0.55], [0.78, 0.75], [0.92, 0.85]];
        const e = E.lineChart(ctx, 340, 760, 600, 320, pts, eOut(prog(lt, 0.2, 2.0)), C.red, { area: true, lw: 14 });
        E.explosion(ctx, e[0], e[1], lt, 2.25, { size: 0.7, seed: 7 });
        E.stamp(ctx, '–13 %', 760, 1240, lt, 2.25, { size: 110, rot: -0.15 });
        panda(ctx, 'emotions/ueberrascht', lt, t, { x: 170, h: 450 });
      },
    },
    { // 11 35,5–40: Telekom-Aktie -8 % -> rund 10 Mrd. $ Boersenwert weg
      start: 35.5, mood: 'bad', poses: ['emotions/traurig', 'emotions/wuetend'], focus: { x: 640, y: 930 }, shake: [3.1], shakeSfx: 'sub',
      sfx: [...ticks(0.5, 1.5, 7, 0.4, 0.15), [1.6, 'down', 0.45, 0.15], ...ticks(2.4, 3.05, 6, 0.45, 0), [3.1, 'cash', 0.45, 0], [3.15, 'boom', 0.35, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'TELEKOM-AKTIE', c: C.white, size: 120, ribbon: MAG }, { t: 'FAST –8 %', c: C.white, size: 130 }]],
          [2.3, [{ t: '≈ 10 MRD. $', c: C.white, size: 140, ribbon: C.red }, { t: 'BÖRSENWERT WEG!', c: C.white, size: 100 }]]]);
        const v = lerp(0, 8, eOut(prog(lt, 0.5, 1.1)));
        const up = eInOut(prog(lt, 2.2, 0.5));
        E.withT(ctx, 640, lerp(930, 700, up), lerp(1, 0.65, up), 0, () => { P.brandBadge(ctx, 0, -60, 360, 'TELEKOM', MAG); P.counter(ctx, 0, 110, `–${v.toFixed(1).replace('.', ',')} %`, { size: 140, scale: pop(lt, 0.3) }); });
        if (lt > 2.3) {
          const m = Math.round(lerp(0, 10, eOut(prog(lt, 2.4, 0.7))));
          E.burst(ctx, 640, 1010, 170, 250, 14, C.yellow, lt * 0.3, 8);
          P.counter(ctx, 640, 1010, `${m} MRD. $`, { size: 110, scale: pop(lt, 2.35, 0.45) });
          for (let i = 0; i < 6; i++) { const p = prog(lt, 3.1 + i * 0.08, 0.9); if (p > 0 && p < 1) { ctx.globalAlpha = 1 - p; E.moneyBill(ctx, 640 + (i - 2.5) * 70 + p * (i - 2.5) * 80, 1160 + p * 260, 100, p * (i - 2.5)); ctx.globalAlpha = 1; } }
        }
        pandaSeq(ctx, [[0, 'emotions/traurig'], [2.3, 'emotions/wuetend']], lt, t, { x: 170, h: 450 });
      },
    },
    { // 12 40–45,75: SpaceX ist noch Partner – Satellit gegen Funkloecher
      start: 40.0, mood: 'blue', poses: ['poses/praesentieren'], focus: { x: 640, y: 950 },
      sfx: [[0.1, 'pop', 0.4, 0.2], [2.95, 'glitch', 0.3, 0.2], [4.0, 'signal', 0.5, 0.2], [4.2, 'ping', 0.4, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DAS BRISANTE:', c: C.yellow, size: 125 }]],
          [1.25, [{ t: 'SPACEX IST NOCH', c: C.white, size: 110 }, { t: 'PARTNER!', c: C.white, size: 140, ribbon: C.greenD }]],
          [3.0, [{ t: 'EMPFANG PER', c: C.white, size: 115 }, { t: 'SATELLIT!', c: C.white, size: 135, ribbon: '#2D7FF9' }]]]);
        if (lt < 3.0) {
          E.withT(ctx, 640, 950, pop(lt, 1.25, 0.5), 0, () => { P.brandBadge(ctx, -140, -40, 270, 'SPACEX', SPX); P.brandBadge(ctx, 140, 80, 270, 'T-MOBILE', MAG);
            E.comicText(ctx, '+', 0, 20, { size: 110, fill: C.greenD, scale: pop(lt, 1.5) }); });
        } else {
          const ok = lt > 4.0;
          P.satellite(ctx, 840, 640, 0.85 * pop(lt, 3.0, 0.5), t);
          if (ok) P.beam(ctx, 810, 700, 600, 990, t, eOut(prog(lt, 4.0, 0.5)));
          P.phone(ctx, 580, 1080, 320, { bars: ok ? 4 : 0, label: ok ? 'SATELLIT' : 'KEIN NETZ', scale: pop(lt, 3.0, 0.5), icon: ok ? null : () => { ctx.strokeStyle = C.red; ctx.lineWidth = 18; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-45, -15); ctx.lineTo(45, 75); ctx.moveTo(45, -15); ctx.lineTo(-45, 75); ctx.stroke(); } });
        }
        panda(ctx, 'poses/praesentieren', lt, t, { x: 170, h: 460 });
      },
    },
    { // 13 45,75–48,2: aus Partner wird Konkurrent
      start: 45.75, mood: 'bad', poses: ['emotions/wuetend'], focus: { x: 640, y: 950 }, shake: [1.05], shakeSfx: 'stamp',
      sfx: [[0.95, 'riser', 0.3, 0], [1.05, 'glitch', 0.35, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'AUS PARTNER', c: C.white, size: 125, ribbon: C.greenD }]],
          [1.0, [{ t: 'WIRD', c: C.white, size: 110 }, { t: 'KONKURRENT!', c: C.white, size: 135, ribbon: C.red }]]]);
        const split = eOut(prog(lt, 1.05, 0.6));
        E.withT(ctx, 640 - 160 - split * 60, 960, 1, -split * 0.15, () => P.brandBadge(ctx, 0, 0, 270, 'SPACEX', SPX));
        E.withT(ctx, 640 + 160 + split * 60, 960, 1, split * 0.15, () => P.brandBadge(ctx, 0, 0, 270, 'T-MOBILE', MAG));
        if (lt < 1.05) E.comicText(ctx, '+', 640, 960, { size: 120, fill: C.greenD, scale: pop(lt, 0.1) });
        else { E.explosion(ctx, 640, 960, lt, 1.05, { size: 0.6, seed: 2 }); E.burst(ctx, 640, 960, 40, 90, 8, C.yellow, lt, 6); E.comicText(ctx, 'VS', 640, 962, { size: 80, fill: C.red, scale: pop(lt, 1.1) }); }
        panda(ctx, 'emotions/wuetend', lt, t, { x: 170, h: 450 });
      },
    },
    { // 14 48,2–51,7: Boerse: echte Gefahr – Analysten
      start: 48.2, mood: 'dark', poses: ['emotions/nachdenklich'], focus: { x: 620, y: 930 },
      sfx: [[1.0, 'riser', 0.3, 0], [1.8, 'down', 0.45, 0], [2.6, 'paper', 0.35, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'FÜR DIE BÖRSE:', c: C.white, size: 120 }, { t: 'ECHTE GEFAHR!', c: C.white, size: 125, ribbon: C.red }]],
          [2.55, [{ t: 'UND DIE', c: C.white, size: 110 }, { t: 'ANALYSTEN?', c: C.yellow, size: 140 }]]]);
        const v = lt < 1.8 ? 0.4 + Math.sin(lt * 4) * 0.03 : lerp(0.4, 0.06, eInOut(prog(lt, 1.8, 0.7)));
        E.withT(ctx, 640, 1010, pop(lt, 0.05, 0.5) * (lt > 2.55 ? lerp(1, 0.7, eOut(prog(lt, 2.55, 0.4))) : 1), 0, () => E.gauge(ctx, 0, 0, 270, 1 - v, { label: 'RISIKO' }));
        if (lt > 2.55) E.withT(ctx, 860, 720, pop(lt, 2.6, 0.45), 0.1, () => { P.card(ctx, 0, 0, 220, 200, 'STUDIE', { head: C.greyD }); for (let i = 0; i < 3; i++) { ctx.fillStyle = '#9CA3AF'; ctx.fillRect(-80, -10 + i * 30, 160 - i * 30, 10); } });
        panda(ctx, 'emotions/nachdenklich', lt, t, { x: 180, h: 460 });
      },
    },
    { // 15 51,7–55,6: ohne Roaming-Partner Jahre fuer gutes Angebot
      start: 51.7, mood: 'neutral', poses: ['poses/tipp_geben'], focus: { x: 640, y: 940 },
      sfx: [[0.1, 'pop', 0.35, 0.2], ...ticks(1.4, 2.6, 8, 0.35, 0.25), [2.75, 'ping', 0.45, 0.25]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'OHNE ROAMING-', c: C.white, size: 120 }, { t: 'PARTNER…', c: C.yellow, size: 135 }]],
          [1.3, [{ t: 'NOCH JAHRE', c: C.white, size: 135, ribbon: C.orange }, { t: 'BIS ZUM ANGEBOT!', c: C.white, size: 100 }]]]);
        P.phone(ctx, 520, 1000, 330, { bars: 1, label: 'STARLINK', scale: pop(lt, 0.05, 0.5) });
        if (lt > 1.3) { P.hourglass(ctx, 830, 960, 300 * pop(lt, 1.3, 0.5), t * 1.5);
          const y = Math.round(lerp(2026, 2029, eOut(prog(lt, 1.4, 1.3)))); E.pill(ctx, `${y}?`, 830, 1180, 44, C.ink, C.white, pop(lt, 1.4)); }
        panda(ctx, 'poses/tipp_geben', lt, t, { x: 170, h: 460 });
      },
    },
    { // 16 55,6–58,1: US-Aufsicht muss genehmigen
      start: 55.6, mood: 'blue', poses: ['emotions/nachdenklich'], focus: { x: 640, y: 950 },
      sfx: [[0.1, 'paper', 0.45, 0.1], [1.5, 'stamp', 0.6, 0.2], [1.55, 'boom', 0.3, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'US-AUFSICHT', c: C.white, size: 125, ribbon: '#1F3A93' }, { t: 'MUSS ERST…', c: C.white, size: 115 }]],
          [1.45, [{ t: '…GENEHMIGEN!', c: C.yellow, size: 140 }]]]);
        E.withT(ctx, 640, 980, pop(lt, 0.05, 0.5), -0.03, () => { P.card(ctx, 0, 0, 480, 520, 'ANTRAG', { head: '#1F3A93' });
          for (let i = 0; i < 5; i++) { ctx.fillStyle = '#9CA3AF'; ctx.fillRect(-180, -150 + i * 46, 360 - (i % 2) * 90, 12); }
          E.plainText(ctx, 'FREQUENZ-DEAL', 0, 150, 38, C.ink, { weight: 900 }); });
        P.gavel(ctx, 860, 720, 0.9, t, 1.5, lt);
        E.stamp(ctx, 'GEPRÜFT?', 650, 1080, lt, 1.5, { size: 100, rot: -0.15, color: '#1F3A93' });
        panda(ctx, 'emotions/nachdenklich', lt, t, { x: 170, h: 460 });
      },
    },
    { // 17 58,1–Ende: durchsetzen oder Abverkauf uebertrieben?
      start: 58.1, mood: 'blue', poses: ['poses/zeigen', 'poses/tipp_geben'], focus: { x: 620, y: 930 },
      sfx: [[0.2, 'rocket', 0.35, -0.3], [2.5, 'pop', 0.45, 0.35], [2.6, 'swell', 0.35, 0], [3.2, 'ping', 0.35, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'SETZT SICH', c: C.white, size: 120 }, { t: 'SPACEX DURCH?', c: C.white, size: 120, ribbon: SPX }]],
          [2.5, [{ t: 'ODER IST DER', c: C.white, size: 110 }, { t: 'ABVERKAUF', c: C.white, size: 130, ribbon: MAG }, { t: 'ÜBERTRIEBEN?', c: C.yellow, size: 110 }]]]);
        E.withT(ctx, 430, 960, pop(lt, 0.1, 0.5), -0.05, () => { P.card(ctx, 0, 0, 320, 420, 'DURCHSETZEN', { head: SPX }); P.rocket(ctx, 0, 60, 230, t); });
        E.withT(ctx, 810, 960, pop(lt, 2.5, 0.5), 0.05, () => { P.card(ctx, 0, 0, 320, 420, 'ÜBERTRIEBEN', { head: MAG }); E.lineChart(ctx, -120, -20, 240, 200, [[0, 0.1], [0.4, 0.8], [0.7, 0.6], [1, 0.15]], eOut(prog(lt, 2.7, 0.8)), C.green, { lw: 12 }); });
        if (lt > 2.6) E.comicText(ctx, 'VS', 620, 960, { size: 90, fill: C.yellow, scale: pop(lt, 2.7) });
        E.pill(ctx, 'Schreib’s in die Kommentare ↓', 600, 1260, 38, C.white, C.ink, pop(lt, 3.2, 0.5));
        pandaSeq(ctx, [[0, 'poses/zeigen'], [2.5, 'poses/tipp_geben']], lt, t, { x: 160, h: 430 });
      },
    },
  ];

  // Musikbett: Spannungsbogen (Hook gespannt -> Info ruhig -> Story treibt -> Crash gespannt -> Ausklang)
  const music = {
    bpm: 92, chords: [['A', 'm'], ['F', ''], ['C', ''], ['G', '']], level: 0.5, abs: 0.1,
    sections: [[0, 'tension'], [13.75, 'pulse'], [16.75, 'full'], [32.75, 'tension'], [40.0, 'full'], [48.2, 'tension'], [51.7, 'pulse'], [58.1, 'full']],
    drops: [13.25, 35.0, 38.6, 46.8],
  };

  window.VIDEO = { name: 'spacex-telekom', fps: 30, duration: 62.66, scenes, captions, xfade: 0.3, grain: 0.06, bokeh: true, endFade: false, music };
})();
