// European Lithium – "KI waehlte eine Aktie" – Short (67,08 s). Zeiten = Voice-Over-Zeitachse des Originals.
// Vorlage: realty-income (schneller Hook, danach ruhig, CC0-SFX, Musikbett, kein Outro, pandaFixed).
(() => {
  const E = window.E, C = E.C, P = E.P;
  const { pop, prog, eOut, eInOut, lerp } = E;
  const LI = '#14B8A6', CM = '#7C3AED', AI = '#D97757';
  const panda = (ctx, pose, lt, t, o = {}) => E.drawPanda(ctx, pose, { x: o.x ?? 190, y: o.y ?? 1405, h: o.h ?? 470, lt, t, enter: o.enter ?? true, from: o.from || ((o.x ?? 190) > 540 ? 'right' : 'left'), flip: o.flip, swapAt: o.swapAt, enterAt: o.enterAt });
  const pandaSeq = (ctx, seq, lt, t, o = {}) => { let k = 0; seq.forEach(([at], i) => { if (lt >= at) k = i; }); const [at, pose] = seq[k]; panda(ctx, pose, lt, t, k === 0 ? o : { ...o, enter: false, swapAt: at }); };
  const H = (ctx, lt, states) => { let k = 0; states.forEach(([at], i) => { if (lt >= at) k = i; }); E.headline(ctx, states[k][1], lt - states[k][0], states[k][2] || {}); };
  const ticks = (from, to, n, gain = 0.6, pan = 0) => Array.from({ length: n }, (_, i) => [from + (to - from) * Math.pow(i / (n - 1), 0.8), 'tick', gain, pan]);
  const de = (v, d = 0) => v.toFixed(d).replace('.', ',');

  // ---------- eigene Requisiten ----------
  function aiBot(ctx, x, y, s, t, o = {}) { // KI-Assistent (neutral, kein Logo)
    E.withT(ctx, x, y + Math.sin(t * 2.5) * 8, s, Math.sin(t * 1.3) * 0.04, () => {
      ctx.beginPath(); ctx.arc(0, 0, 120, 0, 7); E.ink(ctx, AI, 9);
      ctx.beginPath(); ctx.arc(0, 0, 92, 0, 7); E.ink(ctx, '#FDF2EC', 6);
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + t * 0.6; ctx.strokeStyle = AI; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 130, Math.sin(a) * 130); ctx.lineTo(Math.cos(a) * 160, Math.sin(a) * 160); ctx.stroke(); }
      const blink = (t % 3.3) < 0.12 ? 0.15 : 1;
      [-34, 34].forEach((ex) => { ctx.save(); ctx.translate(ex, -14); ctx.scale(1, blink); ctx.beginPath(); ctx.ellipse(0, 0, 13, 18, 0, 0, 7); ctx.fillStyle = C.ink; ctx.fill(); ctx.restore(); });
      ctx.strokeStyle = C.ink; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath();
      if (o.sad) ctx.arc(0, 50, 30, Math.PI + 0.4, -0.4); else ctx.arc(0, 18, 30, 0.3, Math.PI - 0.3); ctx.stroke();
      E.plainText(ctx, 'KI', 0, 140 + 70, 44, C.ink, { weight: 900 });
    });
  }
  function mine(ctx, x, by, w, t) { // Lithium-Mine in den Bergen
    ctx.beginPath(); ctx.moveTo(x - w / 2, by); ctx.lineTo(x - w * 0.2, by - w * 0.55); ctx.lineTo(x, by - w * 0.35); ctx.lineTo(x + w * 0.25, by - w * 0.7); ctx.lineTo(x + w / 2, by); ctx.closePath(); E.ink(ctx, '#9CA3AF', 8);
    ctx.beginPath(); ctx.moveTo(x + w * 0.15, by - w * 0.6); ctx.lineTo(x + w * 0.25, by - w * 0.7); ctx.lineTo(x + w * 0.34, by - w * 0.58); ctx.closePath(); E.ink(ctx, C.white, 5);
    ctx.beginPath(); ctx.arc(x - w * 0.05, by, w * 0.14, Math.PI, 0); ctx.closePath(); E.ink(ctx, '#1F2937', 7);
    for (let i = 0; i < 3; i++) { const p = ((t * 0.3 + i / 3) % 1); const cx = lerp(x - w * 0.05, x + w * 0.45, p); E.rr(ctx, cx - 30, by - 50, 60, 36, 6); E.ink(ctx, '#8B5A2B', 5); ctx.beginPath(); ctx.ellipse(cx, by - 52, 26, 10, 0, Math.PI, 0); E.ink(ctx, LI, 4); }
    E.rr(ctx, x - w / 2 - 10, by, w + 20, 14, 6); E.ink(ctx, '#6B7280', 5);
  }
  function battery(ctx, x, y, s, lvl) {
    E.withT(ctx, x, y, s, 0, () => {
      E.rr(ctx, -60, -110, 120, 220, 18); E.ink(ctx, C.white, 8); E.rr(ctx, -24, -128, 48, 22, 6); E.ink(ctx, '#6B7280', 6);
      const h = 196 * lvl; E.rr(ctx, -48, 98 - h, 96, Math.max(1, h), 10); E.ink(ctx, lvl > 0.3 ? C.green : C.red, 0);
      E.comicText(ctx, 'Li', 0, 0, { size: 70, fill: C.white, shadow: false, lw: 10 });
    });
  }
  function depot(ctx, x, y, w, val, base, o = {}) {
    E.withT(ctx, x, y, o.scale ?? 1, 0, () => {
      P.card(ctx, 0, 0, w, 360, 'MEIN DEPOT', { head: C.ink });
      E.plainText(ctx, 'EUROPEAN LITHIUM', 0, -90, 30, C.greyD, { weight: 900 });
      P.counter(ctx, 0, 0, `${Math.round(val).toLocaleString('de-DE')} €`, { size: 100, fill: val < base ? C.red : C.greenD, rot: 0 });
      const p = Math.min(1, val / base); E.rr(ctx, -w * 0.38, 80, w * 0.76, 26, 13); E.ink(ctx, '#E5E7EB', 0); E.rr(ctx, -w * 0.38, 80, w * 0.76 * p, 26, 13); E.ink(ctx, val < base ? C.red : C.green, 0);
      if (val < base) E.plainText(ctx, `–${Math.round(base - val)} €`, w * 0.3, 140, 32, C.red, { weight: 900 });
    });
  }
  function timeline(ctx, x, y, h, lt, t0, items) {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + h * eOut(prog(lt, t0, 0.8))); ctx.stroke();
    items.forEach(([d, label, at, col], i) => { const s = pop(lt, at, 0.4); if (s <= 0) return; const yy = y + (h / (items.length - 1)) * i;
      E.withT(ctx, x, yy, s, 0, () => { ctx.beginPath(); ctx.arc(0, 0, 24, 0, 7); E.ink(ctx, col, 6); E.comicText(ctx, d, 60, -8, { size: 60, fill: C.white, align: 'left', shadow: false, lw: 9 }); E.plainText(ctx, label, 64, 38, 30, C.greyD, { weight: 900, align: 'left' }); }); });
  }

  const captions = [
    [0.0, 1.0, 'Ich muss euch was'],
    [1.0, 1.75, 'zeigen und es ist'],
    [1.75, 2.25, 'nicht schön.'],
    [2.25, 3.5, 'Meine 5.000 Euro, die'],
    [3.5, 4.25, 'ich vor 2 Wochen'],
    [4.25, 5.6, 'mit Claude investiert habe.'],
    [5.6, 6.6, 'Schaut selbst. Die Aktie:'],
    [6.6, 7.5, 'European Lithium,'],
    [7.5, 9.0, 'eine Lithiummine in'],
    [9.0, 10.6, 'Österreich wurde ausgewählt, und die'],
    [10.6, 11.2, 'Wette war klar:'],
    [11.2, 12.0, 'Die Firma wird für'],
    [12.0, 14.25, '835 Millionen Dollar von Critical'],
    [14.25, 15.25, 'Metals übernommen.'],
    [15.25, 16.6, 'Am 26.09. hat Claude'],
    [16.6, 18.2, 'sich entschieden, hier reinzugehen,'],
    [18.2, 19.5, 'zu 25 Cent, und'],
    [19.5, 20.6, 'ein bisschen, und dann ging'],
    [20.6, 21.6, 'es runter.'],
    [21.6, 23.25, 'Freitagschluss 23,4'],
    [23.25, 24.0, 'Cent. Das'],
    [24.0, 25.0, 'Ganze ist natürlich'],
    [25.0, 26.1, 'keine Anlageberatung.'],
    [26.1, 26.6, 'Über Like und 1'],
    [26.6, 27.6, 'Follow würd ich mich'],
    [27.6, 28.6, 'freuen. Und jetzt zum Ergebnis.'],
    [28.6, 30.25, 'Das sind nämlich –7,'],
    [30.25, 31.0, '7 Prozent.'],
    [31.0, 32.2, 'Aus 5.000 Euro sind'],
    [32.2, 34.25, '4.615 geworden,'],
    [34.25, 35.5, '385 Euro'],
    [35.5, 36.5, 'weg in 2 Wochen.'],
    [36.5, 37.25, 'Es ist bis jetzt'],
    [37.25, 38.25, 'aber nur 1 Zwischenstand,'],
    [38.25, 38.75, 'und die Wette ist noch'],
    [38.75, 39.25, 'nicht vorbei.'],
    [39.25, 40.5, 'Die Firma selbst hat nichts'],
    [40.5, 41.0, 'falsch gemacht.'],
    [41.0, 42.5, 'Der ganze Lithiummarkt ist'],
    [42.5, 44.25, 'eingebrochen: –20 Prozent beim'],
    [44.25, 45.75, 'Lithiumpreis in einem Quartal.'],
    [45.75, 47.0, 'Am 08.10. alleine –6,'],
    [47.0, 48.5, '4 Prozent, und'],
    [48.5, 49.75, 'dazu wurde der Deal'],
    [49.75, 50.75, 'noch geändert.'],
    [50.75, 52.25, 'Ein möglicher Bonus in Form'],
    [52.25, 54.25, 'von zusätzlichen Aktien ist weggefallen.'],
    [54.25, 55.5, 'Der wichtigste Termin kommt'],
    [55.5, 56.0, 'aber noch.'],
    [56.0, 57.0, 'In 12 Tagen fällt nämlich'],
    [57.0, 57.75, 'die Entscheidung.'],
    [57.75, 59.75, 'Am 22.10. stimmen die'],
    [59.75, 60.25, 'Aktionäre ab,'],
    [60.25, 62.5, 'am 26.10. entscheidet'],
    [62.5, 63.0, 'das Gericht.'],
    [63.0, 63.75, 'Geht er dir durch,'],
    [63.75, 64.75, 'schnell das Ding vielleicht'],
    [64.75, 65.75, 'wieder nach oben. Platzt er,'],
    [65.75, 66.5, 'kann es noch deutlich'],
    [66.5, 67.08, 'tiefer gehen.'],
  ];

  const HC = { hard: true, punchAmt: 0.1, flashAmt: 0.3 };
  const FH = { x: 540, y: 1400 }; // Fokus fuer Zoom-Schnitte (Ueberschrift bleibt sichtbar)
  const scenes = [
    // ===== HOOK 0–11,2 s =====
    { start: 0, mood: 'bad', poses: ['emotions/traurig'], punch: false, noBrand: true, ...HC, focus: { x: 640, y: 950 },
      sfx: [[0.0, 'impact', 0.5, 0], [0.05, 'down', 0.45, 0], [1.0, 'snap', 0.45, 0.2], [1.75, 'glitch', 0.4, 0.2]],
      draw(ctx, lt, t) {
        E.liveBar(ctx, lt, 'EXPERIMENT  •  KI WÄHLT EINE AKTIE  •  EUROPEAN LITHIUM  •  –7,7 % IN 2 WOCHEN  •  ');
        H(ctx, lt, [[0, [{ t: 'ICH MUSS EUCH', c: C.white, size: 120 }, { t: 'WAS ZEIGEN…', c: C.yellow, size: 130 }], { y: 480 }],
          [1.75, [{ t: 'UND ES IST', c: C.white, size: 120 }, { t: 'NICHT SCHÖN!', c: C.white, size: 130, ribbon: C.red }], { y: 480 }]]);
        E.withT(ctx, 720, 1010, pop(lt, 0.3, 0.45), 0, () => { P.card(ctx, 0, 0, 320, 260, 'DEPOT', { head: C.ink }); E.comicText(ctx, '?', 0, 40, { size: 130, fill: C.red }); });
        panda(ctx, 'emotions/traurig', lt, t, { x: 190, h: 480 });
      } },
    { start: 2.25, mood: 'neutral', poses: ['poses/zeigen'], ...HC, focus: { x: 640, y: 1000 },
      sfx: [[-0.06, 'whoosh', 0.45, 0.3], ...ticks(0.1, 0.9, 7, 0.45, 0.2), [0.95, 'cash', 0.5, 0.2], [2.0, 'pop', 0.45, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'MEINE 5.000 €', c: C.white, size: 125, ribbon: C.greenD }, { t: 'VOR 2 WOCHEN', c: C.white, size: 115 }]],
          [2.0, [{ t: 'INVESTIERT', c: C.white, size: 120 }, { t: 'MIT KI!', c: C.white, size: 150, ribbon: AI }]]]);
        const v = Math.round(lerp(0, 5000, eOut(prog(lt, 0.05, 0.9))));
        if (lt < 2.0) { E.burst(ctx, 680, 900, 170, 250, 14, C.yellow, lt * 0.4, 8); P.counter(ctx, 680, 900, `${v.toLocaleString('de-DE')} €`, { size: 120, fill: C.greenD, scale: pop(lt, 0, 0.4) }); }
        else aiBot(ctx, 700, 920, 1.0 * pop(lt, 2.0, 0.45), t);
        panda(ctx, 'poses/zeigen', lt, t, { x: 190, h: 480 });
      } },
    { start: 5.6, mood: 'blue', poses: ['poses/praesentieren'], ...HC, focus: { x: 640, y: 1000 },
      sfx: [[-0.06, 'whoosh', 0.45, -0.3], [0.1, 'snap', 0.45, 0], [1.0, 'ding', 0.45, 0.2], [2.0, 'pop', 0.4, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DIE AKTIE:', c: C.yellow, size: 130 }, { t: 'EUROPEAN LITHIUM', c: C.white, size: 100, ribbon: LI }]],
          [1.9, [{ t: 'LITHIUM-MINE', c: C.white, size: 120, ribbon: LI }, { t: 'IN ÖSTERREICH', c: C.white, size: 115 }]]]);
        E.withT(ctx, 680, 1230, pop(lt, 0.1, 0.5), 0, () => mine(ctx, 0, 0, 520, t));
        battery(ctx, 880, 700, 0.8 * pop(lt, 1.0, 0.45), 0.85);
        if (lt > 1.9) E.withT(ctx, 520, 680, pop(lt, 2.0, 0.45), -0.08, () => { E.rr(ctx, -90, -55, 180, 110, 10); E.ink(ctx, C.white, 6); E.rr(ctx, -90, -55, 180, 36, 10); E.ink(ctx, '#ED2939', 0); E.rr(ctx, -90, 19, 180, 36, 10); E.ink(ctx, '#ED2939', 0); E.rr(ctx, -90, -55, 180, 110, 10); E.ink(ctx, null, 6); E.plainText(ctx, 'AT', 0, 2, 30, C.ink, { weight: 900 }); });
        panda(ctx, 'poses/praesentieren', lt, t, { x: 180, h: 470 });
      } },
    { start: 9.0, mood: 'dark', poses: ['emotions/cool'], ...HC, focus: { x: 640, y: 1000 },
      sfx: [[-0.06, 'whoosh', 0.4, 0.2], [1.6, 'riser', 0.35, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'AUSGEWÄHLT!', c: C.white, size: 140, ribbon: AI }]], [1.6, [{ t: 'DIE WETTE', c: C.white, size: 130 }, { t: 'WAR KLAR:', c: C.yellow, size: 140 }]]]);
        aiBot(ctx, 560, 930, 0.9 * pop(lt, 0.05, 0.45), t);
        P.crosshair(ctx, 880, 860, 80 * pop(lt, 0.4, 0.4), t, AI);
        E.withT(ctx, 880, 860, pop(lt, 0.5, 0.4), 0, () => { ctx.beginPath(); ctx.arc(0, 0, 50, 0, 7); E.ink(ctx, LI, 6); E.plainText(ctx, 'Li', 0, 2, 44, C.white, { weight: 900 }); });
        panda(ctx, 'emotions/cool', lt, t, { x: 190, h: 480 });
      } },

    // ===== Ruhiger Teil =====
    { // 11,2–15,25: Uebernahme fuer 835 Mio. $ durch Critical Metals
      start: 11.2, mood: 'good', poses: ['emotions/begeistert'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], ...ticks(0.9, 2.2, 10, 0.45, 0), [2.3, 'cash', 0.55, 0], [2.35, 'impact', 0.35, 0], [3.1, 'stamp', 0.45, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'ÜBERNAHME', c: C.white, size: 140, ribbon: CM }, { t: 'FÜR…', c: C.white, size: 120 }]],
          [2.3, [{ t: '835 MIO. $!', c: C.yellow, size: 160 }]],
          [3.0, [{ t: 'DURCH CRITICAL', c: C.white, size: 115 }, { t: 'METALS', c: C.white, size: 140, ribbon: CM }]]]);
        const v = Math.round(lerp(0, 835, eOut(prog(lt, 0.9, 1.4))));
        E.burst(ctx, 640, 820, 160, 240, 14, C.yellow, lt * 0.3, 8);
        P.counter(ctx, 640, 820, `${v} MIO. $`, { size: 110, fill: C.greenD, scale: pop(lt, 0.8, 0.45) });
        if (lt > 2.9) { const m = eOut(prog(lt, 3.0, 0.6)); P.brandBadge(ctx, lerp(1100, 780, m), 1110, 280, 'CRITICAL METALS', CM); P.brandBadge(ctx, lerp(-100, 470, m), 1110, 280, 'EUROPEAN LITHIUM', LI);
          if (m > 0.95) E.comicText(ctx, '+', 625, 1115, { size: 90, fill: C.greenD, scale: pop(lt, 3.6) }); }
        panda(ctx, 'emotions/begeistert', lt, t, { x: 170, h: 450 });
      } },
    { // 15,25–21,6: 26.09. eingestiegen zu 25 Cent, kurz hoch, dann runter
      start: 15.25, mood: 'blue', poses: ['poses/analysieren', 'emotions/ueberrascht'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [0.2, 'paper', 0.3, 0.2], [1.5, 'snap', 0.4, 0.2], [3.0, 'pop', 0.45, 0.2], [4.3, 'ding', 0.35, 0.2], [5.4, 'down', 0.45, 0.3], [5.45, 'glitch', 0.3, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'AM 26.09.', c: C.yellow, size: 140 }, { t: 'KI STEIGT EIN', c: C.white, size: 120, ribbon: AI }]],
          [2.95, [{ t: 'ZU 25 CENT', c: C.white, size: 135, ribbon: C.greenD }]],
          [4.25, [{ t: 'ERST HOCH…', c: C.white, size: 130, ribbon: C.greenD }]],
          [5.35, [{ t: '…DANN RUNTER!', c: C.white, size: 125, ribbon: C.red }]]]);
        E.whiteboard(ctx, 640, 990, 660, 460);
        E.plainText(ctx, 'EUROPEAN LITHIUM', 400, 805, 32, LI, { weight: 900, align: 'left' });
        const pts = [[0.04, 0.5], [0.2, 0.48], [0.32, 0.3], [0.44, 0.25], [0.56, 0.4], [0.7, 0.6], [0.84, 0.66], [0.96, 0.7]];
        const p = lt < 4.2 ? 0.15 * eOut(prog(lt, 3.0, 0.8)) : lt < 5.3 ? lerp(0.15, 0.45, eOut(prog(lt, 4.2, 0.9))) : lerp(0.45, 1, eOut(prog(lt, 5.3, 1.0)));
        const e = E.lineChart(ctx, 350, 830, 580, 300, pts, p, lt > 5.3 ? C.red : C.green, { area: true, lw: 14 });
        if (lt > 3.0) E.pill(ctx, 'EINSTIEG 0,25 €', 470, 960, 30, C.greenD, C.white, pop(lt, 3.05));
        if (lt > 1.5) P.calendar(ctx, 900, 690, 0.4 * pop(lt, 1.5, 0.45), 'SEPT', '26', 0.06);
        pandaSeq(ctx, [[0, 'poses/analysieren'], [5.35, 'emotions/ueberrascht']], lt, t, { x: 170, h: 450 });
      } },
    { // 21,6–24: Freitagsschluss 23,4 Cent
      start: 21.6, mood: 'bad', poses: ['emotions/traurig'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], ...ticks(0.2, 1.4, 9, 0.4, 0), [1.5, 'down', 0.4, 0], [1.55, 'stamp', 0.4, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'FREITAGSSCHLUSS:', c: C.white, size: 110 }, { t: '23,4 CENT', c: C.white, size: 140, ribbon: C.red }]]]);
        const v = lerp(25, 23.4, eOut(prog(lt, 0.2, 1.3)));
        E.withT(ctx, 640, 960, pop(lt, 0.05, 0.45), 0, () => { P.card(ctx, 0, 0, 480, 380, 'KURS', { head: C.ink }); P.counter(ctx, 0, 10, `${de(v, 1)} CT`, { size: 120, fill: C.red, rot: 0 }); });
        E.stamp(ctx, '–7,7 %', 760, 1210, lt, 1.55, { size: 100, rot: -0.14 });
        panda(ctx, 'emotions/traurig', lt, t, { x: 170, h: 450 });
      } },
    { // 24–28,6: keine Anlageberatung, Like/Follow, jetzt zum Ergebnis
      start: 24.0, mood: 'good', poses: ['emotions/augenzwinkern', 'emotions/freundlich', 'poses/tipp_geben'], focus: { x: 600, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [0.2, 'paper', 0.35, 0.2], [2.1, 'pop', 0.5, 0.3], [2.5, 'ding', 0.35, 0.3], [3.6, 'roll', 0.4, 0], [4.6, 'impact', 0.35, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'KEINE', c: C.white, size: 130 }, { t: 'ANLAGEBERATUNG!', c: C.white, size: 105, ribbon: '#2D7FF9' }]],
          [2.1, [{ t: 'LIKE + FOLLOW', c: C.white, size: 120, ribbon: '#FF3B5C' }, { t: 'FREUEN MICH!', c: C.white, size: 115 }]],
          [3.6, [{ t: 'JETZT ZUM', c: C.white, size: 125 }, { t: 'ERGEBNIS!', c: C.yellow, size: 155 }]]]);
        if (lt < 3.6) { E.withT(ctx, 690, 940, pop(lt, 0.05, 0.45), 0.03, () => { P.card(ctx, 0, 0, 440, 360, 'HINWEIS', { head: '#2D7FF9' });
          E.plainText(ctx, 'NUR INFO', 0, -30, 46, C.ink, { weight: 900 }); E.plainText(ctx, 'KEINE KAUF-', 0, 40, 40, C.greyD, { weight: 900 }); E.plainText(ctx, 'EMPFEHLUNG', 0, 90, 40, C.greyD, { weight: 900 }); });
          if (lt > 2.1) { P.heart(ctx, 830, 760, 1.4 * pop(lt, 2.15, 0.4)); E.pill(ctx, '+ FOLGEN', 820, 1180, 44, '#FF3B5C', C.white, pop(lt, 2.5, 0.45)); } }
        else { E.burst(ctx, 680, 960, 170, 250, 14, C.yellow, lt * 0.5, 8); E.comicText(ctx, '!', 680, 975, { size: 280, fill: C.red, scale: pop(lt, 3.65, 0.4), lw: 42 }); }
        pandaSeq(ctx, [[0, 'emotions/augenzwinkern'], [2.1, 'emotions/freundlich'], [3.6, 'poses/tipp_geben']], lt, t, { x: 190, h: 490 });
      } },
    { // 28,6–36,5: –7,7 %, aus 5.000 € wurden 4.615 €, 385 € weg in 2 Wochen
      start: 28.6, mood: 'bad', poses: ['emotions/ueberrascht', 'emotions/traurig'], focus: { x: 640, y: 930 }, shake: [1.65], shakeSfx: 'sub',
      sfx: [[-0.12, 'whoosh', 0.25, 0], [0.6, 'riser', 0.35, 0], [1.65, 'glitch', 0.35, 0.2], ...ticks(2.5, 3.6, 8, 0.4, 0), [3.65, 'down', 0.45, 0], [5.7, 'stamp', 0.45, 0.2], [5.75, 'cash', 0.3, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DAS ERGEBNIS:', c: C.white, size: 125 }, { t: '–7,7 %', c: C.white, size: 160, ribbon: C.red }]],
          [2.4, [{ t: 'AUS 5.000 €', c: C.white, size: 125 }, { t: 'WURDEN 4.615 €', c: C.white, size: 110, ribbon: C.red }]],
          [5.65, [{ t: '385 € WEG', c: C.white, size: 140, ribbon: C.red }, { t: 'IN 2 WOCHEN!', c: C.yellow, size: 120 }]]]);
        const val = lerp(5000, 4615, eOut(prog(lt, 2.5, 1.1)));
        depot(ctx, 650, 960, 500, val, 5000, { scale: pop(lt, 0.1, 0.5) });
        if (lt > 5.7) for (let i = 0; i < 5; i++) { const p = prog(lt, 5.7 + i * 0.1, 1.2); if (p > 0 && p < 1) { ctx.globalAlpha = 1 - p; E.moneyBill(ctx, 650 + (i - 2) * 80 + p * (i - 2) * 60, 1180 + p * 250, 100, p * (i - 2)); ctx.globalAlpha = 1; } }
        pandaSeq(ctx, [[0, 'emotions/ueberrascht'], [2.4, 'emotions/traurig']], lt, t, { x: 170, h: 450 });
      } },
    { // 36,5–41: nur Zwischenstand, Wette nicht vorbei, Firma hat nichts falsch gemacht
      start: 36.5, mood: 'dark', poses: ['poses/tipp_geben'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [0.75, 'pop', 0.4, 0.2], [1.75, 'tick', 0.8, 0], [2.75, 'ding', 0.45, 0.2], [2.8, 'snap', 0.35, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'NUR EIN', c: C.white, size: 120 }, { t: 'ZWISCHENSTAND!', c: C.white, size: 115, ribbon: '#2D7FF9' }]],
          [1.75, [{ t: 'DIE WETTE IST', c: C.white, size: 115 }, { t: 'NICHT VORBEI!', c: C.yellow, size: 130 }]],
          [2.75, [{ t: 'FIRMA HAT NICHTS', c: C.white, size: 105 }, { t: 'FALSCH GEMACHT', c: C.white, size: 110, ribbon: C.greenD }]]]);
        if (lt < 2.75) P.hourglass(ctx, 680, 960, 360 * pop(lt, 0.1, 0.5), t);
        else E.withT(ctx, 680, 960, pop(lt, 2.75, 0.45), 0, () => { P.brandBadge(ctx, 0, -40, 380, 'EUROPEAN LITHIUM', LI);
          ctx.strokeStyle = C.greenD; ctx.lineWidth = 22; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(-60, 130); ctx.lineTo(-10, 180); ctx.lineTo(80, 80); ctx.stroke(); });
        panda(ctx, 'poses/tipp_geben', lt, t, { x: 180, h: 470 });
      } },
    { // 41–48,5: Lithiummarkt eingebrochen –20 %, am 08.10. –6,4 %
      start: 41.0, mood: 'bad', poses: ['poses/analysieren', 'emotions/ueberrascht'], focus: { x: 640, y: 930 }, shake: [5.75], shakeSfx: 'boom',
      sfx: [[-0.12, 'whoosh', 0.25, 0], [1.5, 'down', 0.45, 0.2], [1.55, 'glitch', 0.3, 0.2], [4.75, 'riser', 0.3, 0], [5.75, 'sub', 0.45, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DER GANZE', c: C.white, size: 125 }, { t: 'LITHIUMMARKT', c: C.white, size: 120, ribbon: LI }]],
          [1.5, [{ t: 'LITHIUMPREIS:', c: C.white, size: 120 }, { t: '–20 %!', c: C.white, size: 160, ribbon: C.red }]],
          [4.75, [{ t: 'AM 08.10.', c: C.yellow, size: 140 }, { t: 'ALLEINE –6,4 %', c: C.white, size: 115, ribbon: C.red }]]]);
        if (lt < 4.75) {
          const lv = lerp(0.85, 0.65, eOut(prog(lt, 1.5, 1.2)));
          battery(ctx, 520, 960, 1.4 * pop(lt, 0.1, 0.5), lv);
          E.withT(ctx, 830, 960, pop(lt, 1.5, 0.45), 0.05, () => { P.card(ctx, 0, 0, 300, 300, '1 QUARTAL', { head: C.red }); P.counter(ctx, 0, 30, `–${Math.round(lerp(0, 20, eOut(prog(lt, 1.6, 1.0))))} %`, { size: 90, fill: C.red, rot: 0 }); });
        } else {
          P.calendar(ctx, 500, 960, 0.6 * pop(lt, 4.75, 0.45), 'OKTOBER', '08', -0.06);
          E.withT(ctx, 830, 960, pop(lt, 5.7, 0.4), 0.06, () => { E.burst(ctx, 0, 0, 120, 180, 14, C.red, lt * 0.3, 8); E.comicText(ctx, '–6,4 %', 0, 6, { size: 74, fill: C.white, rot: 0, lw: 13 }); });
        }
        pandaSeq(ctx, [[0, 'poses/analysieren'], [4.75, 'emotions/ueberrascht']], lt, t, { x: 170, h: 450 });
      } },
    { // 48,5–54,25: Deal geaendert, Bonus (Earnout) weggefallen
      start: 48.5, mood: 'neutral', poses: ['emotions/wuetend'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [0.3, 'paper', 0.4, 0.2], [1.3, 'stamp', 0.45, 0.2], [3.75, 'whoosh', 0.35, 0.5], [3.8, 'down', 0.4, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'UND DANN:', c: C.yellow, size: 130 }, { t: 'DEAL GEÄNDERT!', c: C.white, size: 120, ribbon: C.red }]],
          [2.25, [{ t: 'BONUS-AKTIEN', c: C.white, size: 120, ribbon: CM }, { t: 'WEGGEFALLEN!', c: C.white, size: 120 }]]]);
        E.withT(ctx, 660, 960, pop(lt, 0.05, 0.5), -0.03, () => { P.card(ctx, 0, 0, 500, 520, 'ÜBERNAHME-DEAL', { head: CM });
          [['PREIS: 835 MIO. $', 'yes'], ['BONUS-AKTIEN', lt > 3.75 ? 'no' : 'q']].forEach(([n, st], i) => P.checkRow(ctx, -190, -60 + i * 110, n, st, pop(lt, 0.4 + i * 0.3)));
          if (lt > 3.75) { ctx.strokeStyle = C.red; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-150, 50); ctx.lineTo(170, 50); ctx.stroke(); } });
        E.stamp(ctx, 'GEÄNDERT', 680, 1210, lt, 1.3, { size: 90, rot: -0.12 });
        if (lt > 3.75) for (let i = 0; i < 4; i++) { const p = prog(lt, 3.8 + i * 0.1, 0.9); if (p > 0 && p < 1) { ctx.globalAlpha = 1 - p; E.withT(ctx, 760 + p * 300, 1010 - p * 120 + p * p * 300, 1, p * 3, () => { E.rr(ctx, -40, -26, 80, 52, 8); E.ink(ctx, CM, 4); E.plainText(ctx, 'AKTIE', 0, 2, 16, C.white, { weight: 900 }); }); ctx.globalAlpha = 1; } }
        panda(ctx, 'emotions/wuetend', lt, t, { x: 170, h: 450 });
      } },
    { // 54,25–63: Countdown – 22.10. Abstimmung, 26.10. Gericht
      start: 54.25, mood: 'dark', poses: ['poses/zeigen', 'emotions/nachdenklich'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [0.2, 'riser', 0.3, 0], [1.75, 'ding', 0.45, 0], ...ticks(1.8, 2.7, 6, 0.4, 0.2), [3.5, 'pop', 0.45, 0.2], [6.0, 'stamp', 0.5, 0.2], [6.05, 'impact', 0.35, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DER WICHTIGSTE', c: C.white, size: 115 }, { t: 'TERMIN KOMMT!', c: C.yellow, size: 130 }]],
          [1.75, [{ t: 'IN 12 TAGEN:', c: C.white, size: 130, ribbon: C.red }, { t: 'ENTSCHEIDUNG!', c: C.white, size: 120 }]],
          [3.5, [{ t: '22.10.', c: C.yellow, size: 150 }, { t: 'AKTIONÄRE STIMMEN AB', c: C.white, size: 85 }]],
          [6.0, [{ t: '26.10.', c: C.yellow, size: 150 }, { t: 'GERICHT ENTSCHEIDET', c: C.white, size: 85, ribbon: '#1F3A93' }]]]);
        E.withT(ctx, 700, 960, pop(lt, 0.1, 0.5), 0, () => { P.card(ctx, 0, 0, 480, 600, 'COUNTDOWN', { head: C.red });
          ctx.translate(-700, -960); timeline(ctx, 560, 760, 380, lt, 0.4, [['10.10.', 'HEUTE', 0.5, C.greyD], ['22.10.', 'ABSTIMMUNG', 3.5, C.yellow], ['26.10.', 'GERICHT', 6.0, C.red]]); });
        if (lt > 6.0) P.gavel(ctx, 920, 760, 0.6, t, 6.0, lt);
        const d = Math.round(lerp(0, 12, eOut(prog(lt, 1.8, 0.9))));
        if (lt > 1.75 && lt < 3.5) E.pill(ctx, `T – ${d}`, 900, 720, 44, C.red, C.white, pop(lt, 1.8));
        pandaSeq(ctx, [[0, 'poses/zeigen'], [6.0, 'emotions/nachdenklich']], lt, t, { x: 160, h: 440 });
      } },
    { // 63–Ende: geht er durch -> hoch, platzt er -> tiefer
      start: 63.0, mood: 'blue', poses: ['poses/tipp_geben', 'emotions/ueberrascht'], focus: { x: 620, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [0.4, 'ding', 0.45, -0.3], [1.0, 'rocket', 0.25, -0.3], [2.75, 'glitch', 0.4, 0.3], [2.8, 'down', 0.45, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DEAL KOMMT?', c: C.white, size: 125, ribbon: C.greenD }, { t: 'KURS HOCH!', c: C.white, size: 130 }]],
          [2.75, [{ t: 'DEAL PLATZT?', c: C.white, size: 125, ribbon: C.red }, { t: 'NOCH TIEFER!', c: C.white, size: 130 }]]]);
        E.withT(ctx, 440, 960, pop(lt, 0.1, 0.5), -0.05, () => { P.card(ctx, 0, 0, 320, 420, 'DEAL KOMMT', { head: C.greenD }); E.arrowUp(ctx, 0, 60 - eOut(prog(lt, 0.4, 0.8)) * 40, 1.1, C.green); });
        E.withT(ctx, 820, 960, pop(lt, 2.75, 0.5), 0.05, () => { P.card(ctx, 0, 0, 320, 420, 'DEAL PLATZT', { head: C.red }); E.arrowDown(ctx, 0, 40 + eOut(prog(lt, 2.85, 0.8)) * 40, 1.1, C.red); });
        if (lt > 2.75) E.comicText(ctx, 'VS', 630, 960, { size: 90, fill: C.yellow, scale: pop(lt, 2.85) });
        pandaSeq(ctx, [[0, 'poses/tipp_geben'], [2.75, 'emotions/ueberrascht']], lt, t, { x: 160, h: 430 });
      } },
  ];

  const music = {
    bpm: 92, chords: [['A', 'm'], ['F', ''], ['C', ''], ['E', '']], level: 0.5, abs: 0.1,
    sections: [[0, 'tension'], [5.6, 'pulse'], [11.2, 'full'], [21.6, 'tension'], [24.0, 'pulse'], [28.6, 'tension'], [36.5, 'pulse'], [41.0, 'tension'], [54.25, 'tension'], [63.0, 'pulse']],
    drops: [11.0, 28.4, 46.7],
  };

  window.VIDEO = { name: 'european-lithium', fps: 30, duration: 67.08, scenes, captions, xfade: 0.3, grain: 0.06, bokeh: true, endFade: false, pandaFixed: true, music };
})();
