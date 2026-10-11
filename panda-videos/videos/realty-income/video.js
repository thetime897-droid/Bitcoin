// Realty Income – Dividendenaktie – Short (61,14 s). Zeiten = Voice-Over-Zeitachse des Originals.
// Vorlage: krypto-ki-agenten (schneller Hook, danach ruhig, CC0-SFX, Musikbett, kein Outro).
// pandaFixed: Panda wird ausserhalb des Kamera-Zooms gezeichnet und bleibt immer komplett im Bild.
(() => {
  const E = window.E, C = E.C, P = E.P;
  const { pop, prog, eOut, eInOut, lerp } = E;
  const RI = '#2563EB', DIV = '#16A34A';
  const panda = (ctx, pose, lt, t, o = {}) => E.drawPanda(ctx, pose, { x: o.x ?? 190, y: o.y ?? 1405, h: o.h ?? 480, lt, t, enter: o.enter ?? true, from: o.from || ((o.x ?? 190) > 540 ? 'right' : 'left'), flip: o.flip, swapAt: o.swapAt, enterAt: o.enterAt });
  const pandaSeq = (ctx, seq, lt, t, o = {}) => { let k = 0; seq.forEach(([at], i) => { if (lt >= at) k = i; }); const [at, pose] = seq[k]; panda(ctx, pose, lt, t, k === 0 ? o : { ...o, enter: false, swapAt: at }); };
  const H = (ctx, lt, states) => { let k = 0; states.forEach(([at], i) => { if (lt >= at) k = i; }); E.headline(ctx, states[k][1], lt - states[k][0], states[k][2] || {}); };
  const ticks = (from, to, n, gain = 0.6, pan = 0) => Array.from({ length: n }, (_, i) => [from + (to - from) * Math.pow(i / (n - 1), 0.8), 'tick', gain, pan]);
  const de = (v, d = 0) => v.toFixed(d).replace('.', ',');

  // ---------- eigene Requisiten ----------
  function store(ctx, x, by, w, o = {}) { // Ladengeschaeft (Mieter)
    const h = w * 0.8;
    E.withT(ctx, x, by, o.scale ?? 1, 0, () => {
      P.softShadow(ctx, 0, 0, w * 0.55, 16);
      E.rr(ctx, -w / 2, -h, w, h, 10); E.ink(ctx, o.empty ? '#E5E7EB' : '#FFF7ED', 7);
      const n = 5;
      for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.moveTo(-w / 2 + (w / n) * i, -h); ctx.lineTo(-w / 2 + (w / n) * (i + 1), -h); ctx.lineTo(-w / 2 + (w / n) * (i + 0.5), -h + h * 0.22); ctx.closePath(); E.ink(ctx, o.empty ? '#9CA3AF' : (i % 2 ? C.white : (o.color || C.red)), 4); }
      E.rr(ctx, -w * 0.4, -h * 0.62, w * 0.42, h * 0.45, 6); E.ink(ctx, o.empty ? '#D1D5DB' : '#7FC4F5', 5);
      E.rr(ctx, w * 0.08, -h * 0.62, w * 0.3, h * 0.62, 6); E.ink(ctx, o.empty ? '#9CA3AF' : '#8B5A2B', 5);
      if (o.empty) { E.rr(ctx, -w * 0.35, -h * 0.5, w * 0.7, h * 0.22, 6); E.ink(ctx, C.yellow, 4); E.plainText(ctx, 'LEER', 0, -h * 0.39, w * 0.14, C.ink, { weight: 900 }); }
    });
  }
  function building(ctx, x, by, w, h, col) {
    P.softShadow(ctx, x, by, w * 0.6, 18);
    E.rr(ctx, x - w / 2, by - h, w, h, 10); E.ink(ctx, col, 8);
    const cols = Math.max(2, Math.round(w / 60)), rows = Math.max(2, Math.round(h / 70));
    for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols; c++) { E.rr(ctx, x - w / 2 + 16 + c * ((w - 32) / cols), by - h + 18 + r * ((h - 30) / rows), (w - 32) / cols - 12, (h - 30) / rows - 18, 4); E.ink(ctx, '#BFDBFE', 3); }
  }
  function monthStrip(ctx, x, y, w, lt, t0) { // 12 Monate, jeder mit Muenze
    const m = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    const cw = w / 12;
    m.forEach((l, i) => {
      const s = pop(lt, t0 + i * 0.12, 0.4); if (s <= 0) return;
      E.withT(ctx, x - w / 2 + cw * (i + 0.5), y, s, 0, () => {
        E.rr(ctx, -cw * 0.44, -50, cw * 0.88, 100, 12); E.ink(ctx, C.white, 5);
        E.rr(ctx, -cw * 0.44, -50, cw * 0.88, 28, 12); E.ink(ctx, C.red, 5);
        E.plainText(ctx, l, 0, -35, 20, C.white, { weight: 900 });
        P.coin(ctx, 0, 15, cw * 0.3);
      });
    });
  }
  function bigCoinStack(ctx, x, by, n, r = 50) { for (let i = 0; i < n; i++) P.coin(ctx, x, by - i * r * 0.32, r); }

  const captions = [
    [0.0, 2.0, 'Genau diese Dividendenaktie wird jetzt'],
    [2.0, 2.75, 'wieder richtig'],
    [2.75, 4.0, 'interessant, und ich habe investiert.'],
    [4.0, 5.75, 'Über 1.200 Euro stecken'],
    [5.75, 6.9, 'jetzt in Realty Income,'],
    [6.9, 7.75, 'und warum, erklär ich dir jetzt.'],
    [7.75, 8.25, 'Das Ganze ist'],
    [8.25, 9.6, 'natürlich keine Anlageberatung. Über'],
    [9.6, 10.0, "'n Like und 1"],
    [10.0, 10.75, 'Follow würd ich mich freuen.'],
    [10.75, 12.1, 'Zu Realty Income gehören'],
    [12.1, 14.1, 'über 15.500 Gebäude, vor allem'],
    [14.1, 14.5, 'Läden.'],
    [14.5, 15.9, '98,8 Prozent sind'],
    [15.9, 16.6, 'hier vermietet.'],
    [16.6, 17.5, 'Bei 100 Läden steht'],
    [17.5, 18.6, 'quasi nur einer leer,'],
    [18.6, 19.6, 'und daraus zahlt die'],
    [19.6, 21.6, 'Firma jeden Monat Dividende,'],
    [21.6, 23.0, 'seit über 30 Jahren immer'],
    [23.0, 24.1, 'wieder erhöht.'],
    [24.1, 25.0, 'Die Aktie ist letzten'],
    [25.0, 25.4, 'Monat rund'],
    [25.4, 26.6, '10 Prozent gefallen und'],
    [26.6, 27.75, 'steht enorm unter Druck.'],
    [27.75, 28.75, 'Der Grund: Die Fed'],
    [28.75, 29.75, 'hat die Zinsen erhöht,'],
    [29.75, 30.75, 'und die zehnjährigen US-'],
    [30.75, 32.0, 'Staatsanleihen bringen über 5'],
    [32.0, 32.7, 'Prozent Rendite,'],
    [32.7, 34.1, 'so viel wie seit 2002'],
    [34.1, 34.6, 'nicht mehr.'],
    [34.6, 35.9, 'Dadurch steigt die Dividenden-'],
    [35.9, 37.0, 'rendite von Realty'],
    [37.0, 38.2, 'Income auf rund 6 Prozent.'],
    [38.2, 39.5, 'Bei den 1.200 Euro'],
    [39.5, 40.1, 'sind das im Monat etwa'],
    [40.1, 41.0, '6 Euro.'],
    [41.0, 43.0, 'Vor Steuern. Aus Sicht von Anleihenkäufern'],
    [43.0, 44.0, 'macht das wenig Sinn.'],
    [44.0, 45.25, 'Der Staat zahlt 5,'],
    [45.25, 47.6, '3 Prozent, praktisch ohne Risiko,'],
    [47.6, 48.6, 'Realty Income rund 6,'],
    [48.6, 49.75, 'nicht mal 1 Prozent'],
    [49.75, 50.75, 'Aufschlag für alle Risiken.'],
    [50.75, 52.4, 'Warum ich hier trotzdem kaufe:'],
    [52.4, 53.6, 'Fitch gibt hier 1 A-'],
    [53.6, 54.4, 'Rating, und von 100'],
    [54.4, 55.5, 'Dollar Cashflow gehen nur'],
    [55.5, 57.5, 'rund 73 als Dividende raus.'],
    [57.5, 58.6, 'Mein Plan: über einen'],
    [58.6, 59.6, 'langen Zeitraum halten und'],
    [59.6, 60.4, 'nicht nur für 1'],
    [60.4, 61.14, 'paar Wochen.'],
  ];

  const HC = { hard: true, punchAmt: 0.1, flashAmt: 0.3 };
  const scenes = [
    // ===== HOOK 0–10,75 s: Schnitt alle ~1–1,5 s =====
    { start: 0, mood: 'good', poses: ['emotions/begeistert'], punch: false, noBrand: true, ...HC, focus: { x: 640, y: 950 },
      sfx: [[0.0, 'impact', 0.5, 0], [0.05, 'ping', 0.5, 0], [0.4, 'pop', 0.45, 0.2], [0.8, 'cash', 0.45, 0.3]],
      draw(ctx, lt, t) {
        E.liveBar(ctx, lt, 'DIVIDENDE  •  REALTY INCOME: 6 % RENDITE  •  JEDEN MONAT AUSSCHÜTTUNG  •  30 JAHRE ERHÖHT  •  ');
        E.headline(ctx, [{ t: 'DIESE', c: C.white, size: 140 }, { t: 'DIVIDENDENAKTIE', c: C.white, size: 110, ribbon: DIV }], lt, { y: 480, delay: 0.05 });
        E.withT(ctx, 700, 1000, pop(lt, 0.2, 0.45), 0, () => P.brandBadge(ctx, 0, -40, 400, 'REALTY INCOME', RI));
        E.moneyRain(ctx, lt, 0.7, { x: 700, n: 8, seed: 5, spread: 600, fall: true });
        panda(ctx, 'emotions/begeistert', lt, t, { x: 190, h: 500 });
      } },
    { start: 2.0, mood: 'good', poses: ['emotions/begeistert', 'poses/selbstbewusst'], noBrand: true, ...HC, baseZoom: 1.06, focus: { x: 540, y: 1400 },
      sfx: [[-0.06, 'whoosh', 0.45, 0.3], [0.1, 'snap', 0.5, 0], [0.75, 'ding', 0.45, 0.2], [1.6, 'stamp', 0.45, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'WIEDER RICHTIG', c: C.white, size: 120 }, { t: 'INTERESSANT!', c: C.white, size: 135, ribbon: C.greenD }]],
          [1.5, [{ t: 'ICH HABE', c: C.white, size: 130 }, { t: 'INVESTIERT!', c: C.yellow, size: 150 }]]]);
        E.whiteboard(ctx, 690, 1000, 560, 380);
        E.lineChart(ctx, 460, 870, 460, 240, [[0, 0.3], [0.3, 0.6], [0.55, 0.9], [0.75, 0.7], [1, 0.1]], eOut(prog(lt, 0.1, 1.2)), C.green, { lw: 14 });
        E.stamp(ctx, 'GEKAUFT', 700, 1230, lt, 1.6, { size: 90, rot: -0.12, color: C.greenD });
        pandaSeq(ctx, [[0, 'emotions/begeistert'], [1.5, 'poses/selbstbewusst']], lt, t, { x: 190, h: 500, enter: false });
      } },
    { start: 4.0, mood: 'good', poses: ['poses/zeigen'], ...HC, focus: { x: 660, y: 1000 },
      sfx: [[-0.06, 'whoosh', 0.45, -0.3], ...ticks(0.1, 1.0, 8, 0.45, 0.2), [1.05, 'cash', 0.55, 0.2], [1.8, 'snap', 0.4, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'ÜBER 1.200 €', c: C.white, size: 135, ribbon: C.greenD }, { t: 'INVESTIERT', c: C.white, size: 120 }]]]);
        const v = Math.round(lerp(0, 1200, eOut(prog(lt, 0.05, 1.0))));
        E.burst(ctx, 680, 880, 180, 260, 14, C.yellow, lt * 0.4, 8);
        P.counter(ctx, 680, 880, `${v.toLocaleString('de-DE')} €`, { size: 130, fill: C.greenD, scale: pop(lt, 0.0, 0.4) });
        bigCoinStack(ctx, 600, 1240, Math.min(9, Math.floor(prog(lt, 0.1, 1.0) * 10)), 48);
        bigCoinStack(ctx, 760, 1240, Math.min(6, Math.floor(prog(lt, 0.3, 1.0) * 7)), 48);
        if (lt > 1.75) E.pill(ctx, 'REALTY INCOME', 680, 1080, 40, RI, C.white, pop(lt, 1.75, 0.4));
        panda(ctx, 'poses/zeigen', lt, t, { x: 190, h: 480 });
      } },
    { start: 6.9, mood: 'dark', poses: ['poses/tipp_geben'], ...HC, baseZoom: 1.05, focus: { x: 540, y: 1400 },
      sfx: [[-0.06, 'whoosh', 0.4, 0.2], [0.05, 'roll', 0.35, 0], [0.85, 'ding', 0.5, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'UND WARUM?', c: C.yellow, size: 125 }]], [0.6, [{ t: 'ERKLÄR ICH', c: C.white, size: 125 }, { t: 'DIR JETZT!', c: C.white, size: 140, ribbon: C.greenD }]]]);
        E.burst(ctx, 700, 960, 180, 260, 14, C.yellow, lt * 0.5, 8);
        E.comicText(ctx, '?', 700, 975, { size: 300, fill: C.white, scale: pop(lt, 0.05, 0.4), rot: Math.sin(lt * 4) * 0.06, lw: 44 });
        panda(ctx, 'poses/tipp_geben', lt, t, { x: 190, h: 500 });
      } },
    { start: 7.75, mood: 'good', poses: ['emotions/augenzwinkern', 'emotions/freundlich'], ...HC, focus: { x: 660, y: 1000 },
      sfx: [[-0.06, 'whoosh', 0.4, -0.3], [0.2, 'paper', 0.35, 0.2], [1.85, 'pop', 0.5, 0.3], [2.3, 'ding', 0.35, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'KEINE', c: C.white, size: 130 }, { t: 'ANLAGEBERATUNG!', c: C.white, size: 105, ribbon: '#2D7FF9' }]],
          [1.85, [{ t: 'LIKE + FOLLOW', c: C.white, size: 120, ribbon: '#FF3B5C' }, { t: 'FREUEN MICH!', c: C.white, size: 115 }]]]);
        E.withT(ctx, 690, 940, pop(lt, 0.05, 0.45), 0.03, () => { P.card(ctx, 0, 0, 440, 360, 'HINWEIS', { head: '#2D7FF9' });
          E.plainText(ctx, 'NUR INFO', 0, -30, 46, C.ink, { weight: 900 }); E.plainText(ctx, 'KEINE KAUF-', 0, 40, 40, C.greyD, { weight: 900 }); E.plainText(ctx, 'EMPFEHLUNG', 0, 90, 40, C.greyD, { weight: 900 }); });
        if (lt > 1.85) { P.heart(ctx, 830, 760, 1.4 * pop(lt, 1.9, 0.4) * (1 + Math.sin(t * 6) * 0.05)); E.pill(ctx, '+ FOLGEN', 820, 1180, 44, '#FF3B5C', C.white, pop(lt, 2.3, 0.45)); }
        pandaSeq(ctx, [[0, 'emotions/augenzwinkern'], [1.85, 'emotions/freundlich']], lt, t, { x: 190, h: 500 });
      } },

    // ===== Ab hier ruhig mit Ueberblendungen =====
    { // 10,75–16,6: 15.500 Gebaeude, vor allem Laeden, 98,8 % vermietet
      start: 10.75, mood: 'blue', poses: ['poses/praesentieren'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], ...ticks(1.4, 2.6, 9, 0.4, 0.1), [2.7, 'ding', 0.4, 0.1], [3.4, 'pop', 0.35, 0.2], [4.3, 'snap', 0.35, 0], [4.9, 'cash', 0.4, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'REALTY INCOME', c: C.white, size: 120, ribbon: RI }, { t: 'BESITZT…', c: C.white, size: 115 }]],
          [1.35, [{ t: '15.500+', c: C.yellow, size: 160 }, { t: 'GEBÄUDE!', c: C.white, size: 125 }]],
          [3.75, [{ t: '98,8 %', c: C.white, size: 160, ribbon: C.greenD }, { t: 'VERMIETET!', c: C.white, size: 125 }]]]);
        const v = Math.round(lerp(0, 15500, eOut(prog(lt, 1.4, 1.2))));
        const cols = ['#93C5FD', '#FCA5A5', '#FDE68A', '#A7F3D0', '#C4B5FD'];
        for (let i = 0; i < 5; i++) { const s = pop(lt, 0.2 + i * 0.12, 0.45); if (s > 0) E.withT(ctx, 400 + i * 130, 1230, s, 0, () => building(ctx, 0, 0, 110, 200 + (i % 3) * 90, cols[i])); }
        if (lt > 3.2) for (let i = 0; i < 3; i++) store(ctx, 460 + i * 170, 1260, 150, { scale: pop(lt, 3.3 + i * 0.1, 0.4), color: [C.red, '#2563EB', C.greenD][i] });
        if (lt > 1.35 && lt < 3.9) P.counter(ctx, 650, 820, v.toLocaleString('de-DE'), { size: 110, fill: C.white, scale: pop(lt, 1.35) });
        if (lt > 3.75) P.pie(ctx, 650, 780, 150, 0.988, eOut(prog(lt, 3.8, 0.9)), [C.greenD, '#E5E7EB'], { label: de(98.8 * eOut(prog(lt, 3.8, 0.9)), 1) + ' %', labelScale: 0.7 });
        panda(ctx, 'poses/praesentieren', lt, t, { x: 170, h: 450 });
      } },
    { // 16,6–18,6: von 100 Laeden steht 1 leer
      start: 16.6, mood: 'good', poses: ['poses/zeigen'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], ...ticks(0.15, 0.95, 10, 0.3, 0.1), [1.1, 'down', 0.3, 0.3], [1.15, 'snap', 0.4, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'VON 100 LÄDEN', c: C.white, size: 120 }, { t: 'NUR 1 LEER!', c: C.white, size: 135, ribbon: C.greenD }]]]);
        for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) {
          const i = r * 10 + c, s = pop(lt, 0.1 + i * 0.008, 0.3); if (s <= 0) continue;
          const empty = i === 77 && lt > 1.1, x = 400 + c * 56, y = 640 + r * 62;
          E.withT(ctx, x, y, s * (empty ? 1 + 0.15 * Math.sin(lt * 8) : 1), 0, () => { E.rr(ctx, -22, -22, 44, 44, 8); E.ink(ctx, empty ? '#E5E7EB' : DIV, 3); if (empty) E.plainText(ctx, '!', 0, 2, 28, C.red, { weight: 900 }); });
        }
        if (lt > 1.1) E.pill(ctx, 'LEER', 400 + 7 * 56, 640 + 7 * 62 - 60, 30, C.red, C.white, pop(lt, 1.15));
        panda(ctx, 'poses/zeigen', lt, t, { x: 170, h: 450 });
      } },
    { // 18,6–24,1: jeden Monat Dividende, 30 Jahre erhoeht
      start: 18.6, mood: 'good', poses: ['emotions/begeistert'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], ...Array.from({ length: 12 }, (_, i) => [1.0 + i * 0.12, 'tick', 0.45, -0.5 + i / 11]), [2.5, 'cash', 0.5, 0], [3.1, 'riser', 0.35, 0], [4.4, 'impact', 0.4, 0], [4.45, 'ding', 0.45, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'JEDEN MONAT', c: C.white, size: 130, ribbon: DIV }, { t: 'DIVIDENDE!', c: C.yellow, size: 140 }]],
          [3.0, [{ t: 'SEIT 30+ JAHREN', c: C.white, size: 115 }, { t: 'IMMER ERHÖHT!', c: C.white, size: 125, ribbon: C.greenD }]]]);
        const up = eInOut(prog(lt, 2.9, 0.5));
        E.withT(ctx, 0, -up * 200, 1, 0, () => monthStrip(ctx, 640, 860, 760, lt, 1.0));
        if (lt > 2.9) {
          const n = 12, p = eOut(prog(lt, 3.1, 1.3));
          for (let i = 0; i < n; i++) { const h = (40 + i * 22) * Math.min(1, Math.max(0, p * n - i)); E.rr(ctx, 330 + i * 54, 1240 - h, 40, Math.max(1, h), 6); E.ink(ctx, i === n - 1 ? C.yellow : C.green, 4); }
          E.arrowUp(ctx, 980, 900 + Math.sin(lt * 3) * 8, 0.6 * pop(lt, 4.4), C.green);
          if (lt > 4.4) E.pill(ctx, '30+ JAHRE', 640, 1290, 38, C.ink, C.white, pop(lt, 4.45));
        }
        panda(ctx, 'emotions/begeistert', lt, t, { x: 170, h: 450 });
      } },
    { // 24,1–27,75: Aktie -10 %, unter Druck
      start: 24.1, mood: 'bad', poses: ['emotions/ueberrascht', 'emotions/traurig'], focus: { x: 640, y: 930 }, shake: [1.4], shakeSfx: 'sub',
      sfx: [[-0.12, 'whoosh', 0.25, 0], [0.4, 'riser', 0.3, 0], [1.4, 'glitch', 0.35, 0.3], [1.45, 'down', 0.45, 0.3], [2.6, 'boom', 0.3, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'LETZTER MONAT:', c: C.white, size: 120 }, { t: '–10 %!', c: C.white, size: 160, ribbon: C.red }]],
          [2.5, [{ t: 'ENORM', c: C.white, size: 130 }, { t: 'UNTER DRUCK!', c: C.white, size: 125, ribbon: C.red }]]]);
        E.whiteboard(ctx, 640, 970, 660, 440);
        E.plainText(ctx, 'REALTY INCOME', 420, 805, 34, RI, { weight: 900, align: 'left' });
        const e = E.lineChart(ctx, 350, 820, 580, 300, [[0, 0.2], [0.2, 0.15], [0.35, 0.25], [0.5, 0.2], [0.65, 0.5], [0.8, 0.7], [0.95, 0.85]], eOut(prog(lt, 0.2, 1.3)), C.red, { area: true, lw: 14 });
        E.stamp(ctx, '–10 %', 760, 1240, lt, 1.4, { size: 110, rot: -0.15 });
        if (lt > 2.5) { const k = 0.5 + 0.5 * Math.sin(lt * 6); ctx.fillStyle = `rgba(240,54,43,${0.08 + 0.08 * k})`; ctx.fillRect(0, 0, 1080, 1920); }
        pandaSeq(ctx, [[0, 'emotions/ueberrascht'], [1.4, 'emotions/traurig']], lt, t, { x: 170, h: 450 });
      } },
    { // 27,75–34,6: Fed erhoeht Zinsen, 10J-Anleihen > 5 %, hoechste seit 2002
      start: 27.75, mood: 'blue', poses: ['poses/analysieren'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [0.15, 'door', 0.3, 0.2], [1.0, 'stamp', 0.45, 0.2], [2.1, 'paper', 0.35, -0.2], ...ticks(3.1, 4.2, 8, 0.4, 0), [4.25, 'ding', 0.45, 0], [5.0, 'impact', 0.4, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DER GRUND:', c: C.yellow, size: 130 }, { t: 'DIE FED!', c: C.white, size: 140, ribbon: '#1F3A93' }]],
          [1.0, [{ t: 'ZINSEN', c: C.white, size: 130 }, { t: 'ERHÖHT!', c: C.white, size: 140, ribbon: C.red }]],
          [2.0, [{ t: 'US-ANLEIHEN', c: C.white, size: 125, ribbon: '#1F3A93' }, { t: 'ÜBER 5 %!', c: C.yellow, size: 145 }]],
          [4.95, [{ t: 'SO HOCH WIE', c: C.white, size: 120 }, { t: 'SEIT 2002 NICHT!', c: C.white, size: 115, ribbon: C.red }]]]);
        if (lt < 2.0) {
          E.withT(ctx, 660, 950, pop(lt, 0.1, 0.5), 0, () => { building(ctx, 0, 260, 420, 300, '#E5E7EB'); ctx.beginPath(); ctx.moveTo(-250, -40); ctx.lineTo(0, -170); ctx.lineTo(250, -40); ctx.closePath(); E.ink(ctx, '#D1D5DB', 8); E.plainText(ctx, 'FED', 0, -80, 60, '#1F3A93', { weight: 900 }); });
          if (lt > 1.0) { E.arrowUp(ctx, 920, 820 + Math.sin(lt * 4) * 8, 0.8 * pop(lt, 1.0), C.red); E.pill(ctx, 'ZINS ↑', 920, 980, 40, C.red, C.white, pop(lt, 1.05)); }
        } else {
          const v = lerp(0, 5.3, eOut(prog(lt, 3.1, 1.1)));
          E.withT(ctx, 660, 960, pop(lt, 2.0, 0.5), 0, () => { P.card(ctx, 0, 0, 480, 460, 'US-STAATSANLEIHE', { head: '#1F3A93', fill: '#FFFBEB' });
            E.plainText(ctx, '10 JAHRE', 0, -80, 44, C.greyD, { weight: 900 }); P.counter(ctx, 0, 40, `${de(v, 1)} %`, { size: 130, fill: C.greenD, rot: 0 });
            if (lt > 4.95) E.pill(ctx, 'HÖCHSTER STAND SEIT 2002', 0, 170, 28, C.red, C.white, pop(lt, 5.0)); });
        }
        panda(ctx, 'poses/analysieren', lt, t, { x: 170, h: 450 });
      } },
    { // 34,6–41: Dividendenrendite steigt auf 6 % -> bei 1.200 € ca. 6 € im Monat
      start: 34.6, mood: 'good', poses: ['poses/zeigen', 'poses/tipp_geben'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [0.3, 'riser', 0.3, 0], ...ticks(1.5, 2.55, 7, 0.4, 0), [2.6, 'ding', 0.5, 0], [3.6, 'paper', 0.3, 0.2], [5.5, 'cash', 0.55, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DIVIDENDEN-', c: C.white, size: 130 }, { t: 'RENDITE STEIGT', c: C.white, size: 115, ribbon: C.greenD }]],
          [2.5, [{ t: 'AUF RUND', c: C.white, size: 120 }, { t: '6 %!', c: C.yellow, size: 170 }]],
          [3.6, [{ t: 'MEINE 1.200 €', c: C.white, size: 125, ribbon: RI }, { t: '≈ 6 € IM MONAT', c: C.white, size: 110 }]]]);
        if (lt < 3.6) {
          const v = lerp(4.5, 6.0, eOut(prog(lt, 1.5, 1.1)));
          E.withT(ctx, 660, 960, pop(lt, 0.1, 0.5), 0, () => E.gauge(ctx, 0, 0, 280, prog(v, 3, 4), { label: 'DIV.-RENDITE' }));
          P.counter(ctx, 660, 1180, `${de(v, 1)} %`, { size: 110, fill: C.greenD, scale: pop(lt, 1.4) });
        } else {
          E.withT(ctx, 660, 960, pop(lt, 3.6, 0.5), 0, () => { P.card(ctx, 0, 0, 480, 440, 'RECHENBEISPIEL', { head: RI });
            E.plainText(ctx, '1.200 € × 6 %', 0, -70, 46, C.ink, { weight: 900 }); E.plainText(ctx, '÷ 12 MONATE', 0, -10, 40, C.greyD, { weight: 900 });
            P.counter(ctx, 0, 90, '≈ 6 €', { size: 110, fill: C.greenD, scale: pop(lt, 5.4, 0.45), rot: 0 });
            E.pill(ctx, 'VOR STEUERN · KEINE GARANTIE', 0, 185, 22, C.yellow, C.ink, pop(lt, 5.6)); });
        }
        pandaSeq(ctx, [[0, 'poses/zeigen'], [3.6, 'poses/tipp_geben']], lt, t, { x: 170, h: 450 });
      } },
    { // 41–50,75: Anleihenkaeufer – Staat 5,3 % ohne Risiko vs. 6 % – < 1 Pkt. Aufschlag
      start: 41.0, mood: 'neutral', poses: ['emotions/nachdenklich', 'poses/analysieren'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [0.6, 'pop', 0.35, -0.2], [3.0, 'snap', 0.4, -0.3], [3.3, 'pop', 0.4, -0.3], [6.6, 'pop', 0.45, 0.3], [7.7, 'riser', 0.3, 0], [7.75, 'down', 0.4, 0], [7.8, 'stamp', 0.45, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'FÜR ANLEIHEN-', c: C.white, size: 115 }, { t: 'KÄUFER:', c: C.white, size: 125 }]],
          [2.0, [{ t: 'WENIG SINN!', c: C.white, size: 140, ribbon: C.red }]],
          [3.0, [{ t: 'STAAT: 5,3 %', c: C.white, size: 125, ribbon: '#1F3A93' }, { t: 'OHNE RISIKO', c: C.white, size: 110 }]],
          [6.6, [{ t: 'REALTY: 6 %', c: C.white, size: 125, ribbon: RI }, { t: '< 1 % AUFSCHLAG!', c: C.yellow, size: 110 }]]]);
        const base = 1250, sc = 95;
        const h1 = 5.3 * sc * eOut(prog(lt, 3.1, 0.9)), h2 = 6.0 * sc * eOut(prog(lt, 6.6, 0.9));
        E.rr(ctx, 360, base - h1, 180, Math.max(1, h1), 14); E.ink(ctx, '#1F3A93', 8);
        E.rr(ctx, 650, base - h2, 180, Math.max(1, h2), 14); E.ink(ctx, C.yellow, 8);
        E.rr(ctx, 320, base, 560, 14, 6); E.ink(ctx, C.ink, 0);
        E.plainText(ctx, 'US-STAAT', 450, base + 42, 32, C.ink, { weight: 900 }); E.plainText(ctx, 'REALTY INC.', 740, base + 42, 32, C.ink, { weight: 900 });
        if (h1 > 60) E.plainText(ctx, '5,3 %', 450, base - h1 + 40, 40, C.white, { weight: 900 });
        if (h2 > 60) E.plainText(ctx, '6 %', 740, base - h2 + 40, 40, C.ink, { weight: 900 });
        if (lt > 7.7) { ctx.setLineDash([14, 10]); ctx.strokeStyle = C.red; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(540, base - 5.3 * sc); ctx.lineTo(650, base - 5.3 * sc); ctx.stroke(); ctx.setLineDash([]);
          E.stamp(ctx, '< 1 PKT.', 640, base - 6.0 * sc - 90, lt, 7.8, { size: 80, rot: -0.1 }); }
        if (lt < 3.0) E.withT(ctx, 640, 960, pop(lt, 0.5, 0.45), 0, () => { P.card(ctx, 0, 0, 420, 300, 'ANLEIHEN-KÄUFER', { head: C.greyD }); E.comicText(ctx, '?', 0, 50, { size: 150, fill: C.yellow }); });
        pandaSeq(ctx, [[0, 'emotions/nachdenklich'], [3.0, 'poses/analysieren']], lt, t, { x: 160, h: 430 });
      } },
    { // 50,75–57,5: Warum ich trotzdem kaufe – Fitch A, 73 % Ausschuettungsquote
      start: 50.75, mood: 'good', poses: ['poses/selbstbewusst', 'poses/praesentieren'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [0.2, 'snap', 0.4, 0], [1.65, 'stamp', 0.5, 0.2], [1.7, 'ding', 0.4, 0.2], ...ticks(4.0, 5.0, 8, 0.4, 0.1), [5.1, 'cash', 0.45, 0.1], [5.6, 'pop', 0.45, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'WARUM ICH', c: C.white, size: 125 }, { t: 'TROTZDEM KAUFE:', c: C.white, size: 115, ribbon: C.greenD }]],
          [1.65, [{ t: 'FITCH-RATING:', c: C.white, size: 125 }, { t: 'A', c: C.yellow, size: 180 }]],
          [3.65, [{ t: 'VON 100 $ CASHFLOW', c: C.white, size: 95 }, { t: 'NUR 73 $ DIVIDENDE', c: C.white, size: 100, ribbon: C.greenD }]]]);
        if (lt < 3.65) {
          E.withT(ctx, 660, 960, pop(lt, 0.2, 0.5), 0, () => { P.card(ctx, 0, 0, 440, 420, 'RATING', { head: C.ink });
            ['AAA', 'AA', 'A', 'BBB'].forEach((r, i) => { const on = r === 'A' && lt > 1.65; E.rr(ctx, -150, -100 + i * 72, 300, 58, 12); E.ink(ctx, on ? C.green : '#F3F4F6', 4); E.plainText(ctx, r, 0, -70 + i * 72, 36, on ? C.white : C.greyD, { weight: 900 }); }); });
        } else {
          const p = eOut(prog(lt, 4.0, 1.0));
          P.pie(ctx, 660, 950, 230, 0.73, p, [DIV, '#BFDBFE'], { label: Math.round(73 * p) + ' $', labelScale: pop(lt, 4.0) });
          if (lt > 5.5) { E.pill(ctx, 'PUFFER: 27 $', 900, 760, 34, RI, C.white, pop(lt, 5.6), 0.08); }
        }
        pandaSeq(ctx, [[0, 'poses/selbstbewusst'], [3.65, 'poses/praesentieren']], lt, t, { x: 170, h: 460 });
      } },
    { // 57,5–Ende: mein Plan – lange halten
      start: 57.5, mood: 'good', poses: ['emotions/cool'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [0.3, 'pop', 0.4, 0.2], [2.1, 'snap', 0.4, 0.2], [2.9, 'swell', 0.3, 0], [2.9, 'ding', 0.35, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'MEIN PLAN:', c: C.yellow, size: 140 }, { t: 'LANGE HALTEN!', c: C.white, size: 125, ribbon: C.greenD }]],
          [2.1, [{ t: 'NICHT NUR', c: C.white, size: 125 }, { t: 'PAAR WOCHEN!', c: C.white, size: 125, ribbon: RI }]]]);
        E.withT(ctx, 660, 960, pop(lt, 0.2, 0.5), 0, () => { P.card(ctx, 0, 0, 480, 440, 'BUY & HOLD', { head: C.greenD });
          const yrs = Math.round(lerp(2026, 2046, eOut(prog(lt, 0.5, 2.2))));
          P.counter(ctx, 0, -40, String(yrs), { size: 110, fill: C.greenD, rot: 0 });
          bigCoinStack(ctx, -110, 170, Math.min(7, Math.floor(prog(lt, 0.6, 2.0) * 8)), 40);
          bigCoinStack(ctx, 0, 170, Math.min(9, Math.floor(prog(lt, 0.9, 2.0) * 10)), 40);
          bigCoinStack(ctx, 110, 170, Math.min(11, Math.floor(prog(lt, 1.2, 2.0) * 12)), 40); });
        if (lt > 2.1) P.hourglass(ctx, 930, 760, 200 * pop(lt, 2.1, 0.45), t);
        panda(ctx, 'emotions/cool', lt, t, { x: 170, h: 460 });
      } },
  ];

  const music = {
    bpm: 90, chords: [['C', ''], ['G', ''], ['A', 'm'], ['F', '']], level: 0.5, abs: 0.1,
    sections: [[0, 'pulse'], [4.0, 'full'], [7.75, 'pulse'], [10.75, 'full'], [24.1, 'tension'], [34.6, 'pulse'], [41.0, 'tension'], [50.75, 'full']],
    drops: [6.9, 25.4, 38.0],
  };

  window.VIDEO = { name: 'realty-income', fps: 30, duration: 61.138, scenes, captions, xfade: 0.3, grain: 0.06, bokeh: true, endFade: false, pandaFixed: true, music };
})();
