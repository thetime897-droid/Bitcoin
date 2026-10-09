// Iran / Wahlkampf / Spritpreise – Short (62,1 s). Zeiten = Voice-Over-Zeitachse des Originals.
// Tempo wie apple-iphone18 v3 (Szenen ~2,5–5,5 s, weiche Wechsel innerhalb der Szenen), ohne Outro: endet mit dem Ton.
(() => {
  const E = window.E, C = E.C, P = E.P;
  const { pop, prog, eOut, eInOut, lerp, clamp } = E;
  const panda = (ctx, pose, lt, t, o = {}) => E.drawPanda(ctx, pose, { x: o.x ?? 200, y: o.y ?? 1405, h: o.h ?? 500, lt, t, enter: o.enter ?? true, from: o.from || ((o.x ?? 200) > 540 ? 'right' : 'left'), flip: o.flip, swapAt: o.swapAt, enterAt: o.enterAt });
  // Pose wechselt innerhalb einer Szene: [[ab, pose], ...]
  const pandaSeq = (ctx, seq, lt, t, o = {}) => { let k = 0; seq.forEach(([at], i) => { if (lt >= at) k = i; }); const [at, pose] = seq[k]; panda(ctx, pose, lt, t, k === 0 ? o : { ...o, enter: false, swapAt: at }); };
  const H = (ctx, lt, states) => { let k = 0; states.forEach(([at], i) => { if (lt >= at) k = i; }); E.headline(ctx, states[k][1], lt - states[k][0], states[k][2] || {}); };
  const price = (v) => v.toFixed(2).replace('.', ',') + ' $';
  const ticks = (from, to, n, gain = 0.8, pan = 0) => Array.from({ length: n }, (_, i) => [from + (to - from) * Math.pow(i / (n - 1), 0.8), 'tick', gain, pan]);

  const captions = [
    [0.0, 1.5, 'Trump sagt jetzt keine'],
    [1.5, 2.5, 'Angriffe auf den Iran,'],
    [2.5, 4.4, 'aber nur bis zum 03.11.'],
    [4.4, 5.6, 'Warum genau dieses Datum'],
    [5.6, 7.0, 'und warum dein Sprit trotzdem'],
    [7.0, 7.6, 'teuer bleibt,'],
    [7.6, 8.6, 'erfährst du jetzt.'],
    [8.6, 9.5, 'Trump hatte angekündigt,'],
    [9.5, 10.6, 'vor den Zwischenwahlen am'],
    [10.6, 12.2, '03.11. greife die USA'],
    [12.2, 13.2, 'den Iran nicht an.'],
    [13.2, 14.0, 'Doch noch am Vortag'],
    [14.0, 16.0, 'hatte er neue Angriffe erwogen.'],
    [16.0, 17.5, 'Der Ölpreis gab sofort nach,'],
    [17.5, 18.8, 'bleibt aber über 100 Dollar'],
    [18.8, 19.2, 'pro Barrel.'],
    [19.2, 20.3, 'Benzin kostet in'],
    [20.3, 21.2, 'den USA im Schnitt'],
    [21.2, 22.7, '4,36 Dollar pro Gallone.'],
    [22.7, 23.5, 'Vor dem Krieg waren'],
    [23.5, 25.0, 'es 2,98,'],
    [25.0, 26.2, 'fast 50 Prozent mehr.'],
    [26.2, 27.7, 'Und ein einziger Supertanker'],
    [27.7, 29.0, 'von den USA nach'],
    [29.0, 31.2, 'Asien kostet inzwischen 77'],
    [31.2, 32.7, 'Millionen Dollar pro Fahrt.'],
    [32.7, 33.2, 'Das ist 8-mal'],
    [33.2, 34.3, 'so viel wie letztes Jahr.'],
    [34.4, 35.7, 'Der Haken: Das Versprechen'],
    [35.7, 37.0, 'gilt nur bis zur Wahl.'],
    [37.0, 38.4, 'Gleichzeitig schicken die USA'],
    [38.4, 39.2, 'einen dritten'],
    [39.2, 41.0, 'Flugzeugträger und rund 9.000'],
    [41.0, 42.2, 'Soldaten in die Region.'],
    [42.2, 43.7, 'Die Seeblockade bleibt. Aus Sicht'],
    [43.7, 44.2, 'der Börse'],
    [44.2, 45.2, 'ist das eine Entwarnung.'],
    [45.2, 46.7, 'Aus Sicht von Trumps Beratern?'],
    [46.7, 47.7, 'Angriffe nach der Wahl'],
    [47.7, 49.0, 'bleiben hier eine Option.'],
    [49.0, 50.2, 'Das heißt für dich selbst:'],
    [50.2, 51.2, 'Wenn es ruhig bleibt,'],
    [51.2, 52.7, 'stecken die teuren Frachtraten'],
    [52.7, 54.0, 'weiter im Ölpreis und'],
    [54.0, 55.4, 'damit auch an der Zapfsäule.'],
    [55.4, 56.25, 'Ich geh wirklich bald'],
    [56.25, 57.4, 'pleite bei diesen Spritpreisen.'],
    [57.4, 58.2, 'Mich würde interessieren,'],
    [58.2, 59.0, 'ob das für dich'],
    [59.0, 60.0, 'einfach nur Wahlkampf ist'],
    [60.0, 61.2, 'oder vielleicht ein wirklicher'],
    [61.2, 62.1, 'Schritt in Richtung Frieden?'],
  ];

  const scenes = [
    { // 1 0–4,4: Breaking – keine Angriffe, aber nur bis 3.11.
      start: 0, mood: 'bad', poses: ['emotions/ueberrascht'], punch: false, noBrand: true, focus: { x: 640, y: 950 }, shake: [2.6], shakeSfx: 'stamp',
      sfx: [[0.0, 'ping', 0.7, 0], [1.55, 'pop', 0.6, 0.1], [2.6, 'swell', 0.6, 0]],
      draw(ctx, lt, t) {
        E.liveBar(ctx, lt, 'BREAKING  •  USA: KEINE ANGRIFFE AUF DEN IRAN – NUR BIS ZUM 3.11.  •  ÖL ÜBER 100 $  •  ');
        H(ctx, lt, [[0, [{ t: 'BREAKING', c: C.yellow, size: 150 }, { t: 'NEWS!', c: C.white, size: 150 }], { y: 480, delay: 0.1 }],
          [1.5, [{ t: 'KEINE ANGRIFFE', c: C.white, size: 115 }, { t: 'AUF DEN IRAN', c: C.white, size: 105, ribbon: '#1F3A93' }], { y: 480 }],
          [2.5, [{ t: 'ABER NUR BIS', c: C.white, size: 115 }, { t: 'ZUM 3.11.!', c: C.white, size: 140, ribbon: C.red }], { y: 480 }]]);
        const away = eInOut(prog(lt, 2.35, 0.5));
        ctx.save(); ctx.globalAlpha = 1 - away * 0.92;
        P.flagUS(ctx, 820, 760, 210, t);
        E.withT(ctx, 690, 1300, pop(lt, 0.15, 0.5), 0, () => P.podium(ctx, 0, 0, 290));
        ctx.restore();
        if (lt > 1.5 && lt < 2.6) P.bubble(ctx, 560, 840, 440, 130, ['KEINE ANGRIFFE!'], { scale: pop(lt, 1.5, 0.45) * (1 - prog(lt, 2.35, 0.25)), tail: 0.25, size: 48 });
        if (lt > 2.5) {
          P.calendar(ctx, 650, 990, 0.85 * pop(lt, 2.5, 0.4), 'NOVEMBER', '03');
          if (lt > 2.9) { const p = eOut(prog(lt, 2.9, 0.6)); ctx.strokeStyle = C.red; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.beginPath(); ctx.ellipse(650, 1040, 150, 105, -0.1, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2.1); ctx.stroke(); }
        }
        panda(ctx, 'emotions/ueberrascht', lt, t, { x: 200, h: 520 });
      },
    },
    { // 2 4,4–8,6: Warum dieses Datum? Warum Sprit teuer? -> jetzt
      start: 4.4, mood: 'dark', poses: ['emotions/nachdenklich', 'poses/tipp_geben'], focus: { x: 620, y: 900 },
      sfx: [[1.25, 'pop', 0.5, 0.35], ...ticks(1.5, 3.0, 6, 0.5, 0.35), [3.2, 'swell', 0.5, 0], [3.2, 'ping', 0.6, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'WARUM GENAU', c: C.white, size: 115 }, { t: 'DIESES DATUM?', c: C.yellow, size: 125 }]],
          [1.2, [{ t: 'UND WARUM BLEIBT', c: C.white, size: 105 }, { t: 'DEIN SPRIT TEUER?', c: C.red, size: 115 }]],
          [3.2, [{ t: 'DAS ERFÄHRST', c: C.white, size: 115 }, { t: 'DU JETZT!', c: C.white, size: 140, ribbon: C.green }]]]);
        const g = ctx.createRadialGradient(560, 1050, 40, 560, 950, 560); g.addColorStop(0, 'rgba(255,240,190,0.4)'); g.addColorStop(1, 'rgba(255,240,190,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(420, 420); ctx.lineTo(700, 420); ctx.lineTo(1000, 1300); ctx.lineTo(160, 1300); ctx.closePath(); ctx.fill();
        P.calendar(ctx, 460, 900, 0.62 * pop(lt, 0.1, 0.5), 'NOVEMBER', '03', -0.08);
        E.comicText(ctx, '?', 600, 700, { size: 150, fill: C.yellow, scale: pop(lt, 0.4), rot: 0.2 + Math.sin(lt * 2) * 0.1 });
        if (lt > 1.1) {
          const x = lerp(1250, 800, eOut(prog(lt, 1.1, 0.6)));
          const roll = lt < 3.1 ? (2 + ((Math.floor(lt * 9) * 37) % 300) / 100) : 4.36;
          P.gasPump(ctx, x, 1300, 600, lt < 3.1 ? price(roll) : 'TEUER!', { priceColor: lt < 3.1 ? C.yellow : C.red });
        }
        if (lt > 1.4 && lt < 3.2) E.questionMarks(ctx, 820, 640, lt - 1.4, 3, C.yellow);
        pandaSeq(ctx, [[0, 'emotions/nachdenklich'], [3.2, 'poses/tipp_geben']], lt, t, { x: 190, h: 500 });
      },
    },
    { // 3 8,6–13,2: Angekuendigt – vor den Zwischenwahlen kein Angriff
      start: 8.6, mood: 'blue', poses: ['poses/zeigen'], focus: { x: 640, y: 950 },
      sfx: [[1.0, 'paper', 0.6, 0.15], [1.55, 'pop', 0.4, 0.15], [2.1, 'pop', 0.5, -0.1]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'TRUMP HATTE', c: C.white, size: 120 }, { t: 'ANGEKÜNDIGT:', c: C.yellow, size: 125 }]],
          [0.9, [{ t: 'VOR DEN', c: C.white, size: 110 }, { t: 'ZWISCHENWAHLEN', c: C.yellow, size: 120 }]],
          [2.0, [{ t: 'BIS 3.11. KEIN', c: C.white, size: 115 }, { t: 'ANGRIFF!', c: C.white, size: 140, ribbon: C.green }]]]);
        P.flagUS(ctx, 830, 700, 170, t);
        E.withT(ctx, 660, 1270, pop(lt, 0.1, 0.5), 0, () => P.ballotBox(ctx, 0, 0, 330, lt, 0.9));
        if (lt > 2.0) P.bubble(ctx, 560, 780, 470, 140, ['KEIN ANGRIFF', 'VOR DER WAHL!'], { scale: pop(lt, 2.05, 0.45), tail: 0.2, size: 40 });
        panda(ctx, 'poses/zeigen', lt, t, { x: 190, h: 480 });
      },
    },
    { // 4 13,2–16: Doch am Vortag neue Angriffe erwogen
      start: 13.2, mood: 'bad', poses: ['emotions/ueberrascht'], focus: { x: 640, y: 930 }, shake: [0.85], shakeSfx: 'boom',
      sfx: [[0.85, 'swell', 0.45, 0], [1.5, 'down', 0.4, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DOCH NOCH', c: C.white, size: 120 }, { t: 'AM VORTAG…', c: C.yellow, size: 130 }]],
          [0.8, [{ t: 'NEUE ANGRIFFE', c: C.white, size: 115 }, { t: 'ERWOGEN!', c: C.white, size: 140, ribbon: C.red }]]]);
        E.withT(ctx, 640, 960, pop(lt, 0.05, 0.5), -0.02, () => {
          ctx.translate(-640, -960);
          P.card(ctx, 640, 960, 660, 540, 'LAGEKARTE', { fill: '#E8EEF5', head: '#1F2937' });
          ctx.save(); E.rr(ctx, 340, 760, 600, 420, 18); ctx.clip();
          ctx.fillStyle = '#B9D7F0'; ctx.fillRect(310, 740, 660, 460);
          ctx.beginPath(); ctx.ellipse(700, 990, 210, 150, -0.3, 0, 7); E.ink(ctx, '#E6D3A3', 6, '#9C8455');
          ctx.beginPath(); ctx.ellipse(420, 1090, 110, 70, 0.2, 0, 7); E.ink(ctx, '#E6D3A3', 6, '#9C8455');
          ctx.restore();
          E.pill(ctx, 'IRAN', 720, 1100, 34, C.ink, C.white);
        });
        if (lt > 0.8) { P.crosshair(ctx, 720, 980, 70 * pop(lt, 0.8, 0.45), t); P.crosshair(ctx, 610, 900, 40 * pop(lt, 1.0, 0.45), t + 1); }
        if (lt > 0.9) { const a = 0.18 + 0.12 * Math.sin(lt * 8); ctx.fillStyle = `rgba(240,54,43,${a})`; ctx.fillRect(0, 0, 1080, 1920); }
        panda(ctx, 'emotions/ueberrascht', lt, t, { x: 190, h: 480 });
      },
    },
    { // 5 16–19,2: Oelpreis gibt nach, bleibt ueber 100 $
      start: 16.0, mood: 'neutral', poses: ['poses/analysieren'], focus: { x: 640, y: 900 },
      sfx: [[0.4, 'pop', 0.35, 0.1], [1.6, 'ping', 0.5, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'ÖLPREIS', c: C.white, size: 130 }, { t: 'GIBT NACH', c: C.white, size: 120, ribbon: C.green }]],
          [1.5, [{ t: 'ABER ÜBER', c: C.white, size: 115 }, { t: '100 $ / BARREL!', c: C.white, size: 115, ribbon: C.red }]]]);
        E.whiteboard(ctx, 640, 900, 660, 470);
        const by = 720 + 0.62 * 340;
        ctx.setLineDash([16, 12]); ctx.strokeStyle = C.red; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(340, by); ctx.lineTo(940, by); ctx.stroke(); ctx.setLineDash([]);
        E.plainText(ctx, '100 $', 905, by - 24, 30, C.red, { weight: 900 });
        const pts = [[0.03, 0.08], [0.15, 0.12], [0.26, 0.05], [0.38, 0.3], [0.5, 0.45], [0.62, 0.5], [0.74, 0.47], [0.86, 0.52], [0.95, 0.5]];
        E.lineChart(ctx, 340, 720, 600, 340, pts, eOut(prog(lt, 0.15, 1.2)), C.orange, { area: true, lw: 14 });
        P.barrel(ctx, 880, 1180, 230, { label: 'ÖL' });
        E.pill(ctx, '> 100 $', 650, 1225, 52, C.red, C.white, pop(lt, 1.6, 0.45), -0.05);
        panda(ctx, 'poses/analysieren', lt, t, { x: 180, h: 470 });
      },
    },
    { // 6 19,2–22,7: Benzin in den USA: 4,36 $ pro Gallone
      start: 19.2, mood: 'neutral', poses: ['poses/zeigen'], focus: { x: 620, y: 920 },
      sfx: [...ticks(0.95, 2.25, 10, 0.55, 0.15), [2.35, 'cash', 0.7, 0.15]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'BENZIN', c: C.white, size: 130 }, { t: 'IN DEN USA', c: C.yellow, size: 120 }]],
          [2.3, [{ t: '4,36 $', c: C.white, size: 150, ribbon: C.red }, { t: 'PRO GALLONE', c: C.white, size: 100 }]]]);
        const v = lerp(0, 4.36, eOut(prog(lt, 0.9, 1.4)));
        E.withT(ctx, 640, 1300, pop(lt, 0.05, 0.5), 0, () => P.gasPump(ctx, 0, 0, 660, price(v), { priceColor: lt > 2.3 ? '#FF6B6B' : C.yellow }));
        if (lt > 2.3) E.burst(ctx, 640, 860, 40, 80, 8, C.yellow, lt, 4);
        P.flagUS(ctx, 930, 560, 120, t);
        panda(ctx, 'poses/zeigen', lt, t, { x: 180, h: 470 });
      },
    },
    { // 7 22,7–26,2: Vor dem Krieg 2,98 $ -> fast +50 %
      start: 22.7, mood: 'bad', poses: ['emotions/traurig', 'emotions/wuetend'], focus: { x: 620, y: 920 }, shake: [2.35], shakeSfx: 'stamp',
      sfx: [[0.9, 'pop', 0.35, -0.1], [1.5, 'pop', 0.35, 0.3], [2.35, 'swell', 0.45, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'VOR DEM KRIEG:', c: C.white, size: 115 }, { t: 'NUR 2,98 $', c: C.white, size: 130, ribbon: C.green }]],
          [2.3, [{ t: 'FAST +50 %', c: C.white, size: 140, ribbon: C.red }, { t: 'TEURER!', c: C.white, size: 120 }]]]);
        const base = 1220, sc = 120;
        const h1 = 2.98 * sc * eOut(prog(lt, 0.3, 0.8)), h2 = 4.36 * sc * eOut(prog(lt, 1.1, 0.9));
        E.rr(ctx, 380, base - h1, 170, Math.max(1, h1), 14); E.ink(ctx, C.green, 8);
        E.rr(ctx, 650, base - h2, 170, Math.max(1, h2), 14); E.ink(ctx, C.red, 8);
        E.rr(ctx, 330, base, 540, 14, 6); E.ink(ctx, C.ink, 0);
        if (h1 > 60) E.plainText(ctx, '2,98 $', 465, base - h1 + 40, 40, C.white, { weight: 900 });
        if (h2 > 60) E.plainText(ctx, '4,36 $', 735, base - h2 + 40, 40, C.white, { weight: 900 });
        E.plainText(ctx, 'VORHER', 465, base + 45, 32, C.ink, { weight: 900 }); E.plainText(ctx, 'HEUTE', 735, base + 45, 32, C.ink, { weight: 900 });
        E.stamp(ctx, '+46 %', 735, base - 4.36 * sc - 90, lt, 2.35, { size: 110, rot: -0.12 });
        pandaSeq(ctx, [[0, 'emotions/traurig'], [2.3, 'emotions/wuetend']], lt, t, { x: 180, h: 460 });
      },
    },
    { // 8 26,2–29: Supertanker USA -> Asien
      start: 26.2, mood: 'blue', poses: ['poses/praesentieren'], focus: { x: 640, y: 930 },
      sfx: [[0.45, 'horn', 0.55, -0.3], [0.6, 'whoosh', 0.3, -0.4]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'EIN EINZIGER', c: C.white, size: 115 }, { t: 'SUPERTANKER', c: C.yellow, size: 130 }]],
          [1.5, [{ t: 'USA → ASIEN', c: C.white, size: 130, ribbon: '#1F3A93' }]]]);
        E.withT(ctx, 640, 960, pop(lt, 0.05, 0.5), 0, () => { ctx.translate(-640, -960); P.routeMap(ctx, 640, 960, 720, 520, eInOut(prog(lt, 0.4, 2.3)), t, { from: 'USA', to: 'ASIEN' }); });
        panda(ctx, 'poses/praesentieren', lt, t, { x: 170, h: 470 });
      },
    },
    { // 9 29–34,4: 77 Mio. $ pro Fahrt, 8-mal so viel
      start: 29.0, mood: 'bad', poses: ['emotions/ueberrascht'], focus: { x: 620, y: 900 }, shake: [1.75],
      sfx: [...ticks(0.45, 1.35, 9, 0.5, 0), [1.45, 'cash', 0.7, 0], [1.75, 'swell', 0.6, 0], [3.75, 'pop', 0.4, -0.2], [4.0, 'pop', 0.45, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'KOSTEN', c: C.white, size: 120 }, { t: 'PRO FAHRT', c: C.yellow, size: 125 }]],
          [3.7, [{ t: '8× SO VIEL', c: C.white, size: 135, ribbon: C.red }, { t: 'WIE LETZTES JAHR!', c: C.white, size: 95 }]]]);
        const v = Math.round(lerp(60, 77, eOut(prog(lt, 0.4, 1.0))));
        const up = eInOut(prog(lt, 3.5, 0.6));
        const ks = lerp(1, 0.72, up);
        E.burst(ctx, 600, 820, 210 * ks, 300 * ks, 16, C.yellow, lt * 0.25, 8);
        P.counter(ctx, 600, 820, `${v} MIO. $`, { size: lerp(150, 115, up), scale: pop(lt, 0.2, 0.5) });
        if (lt > 1.75) E.withT(ctx, lerp(900, 850, up), lerp(670, 700, up), pop(lt, 1.75, 0.45) * lerp(1, 0.8, up), 0.12, () => { ctx.beginPath(); ctx.arc(0, 0, 70, 0, 7); E.ink(ctx, C.yellow, 8); E.comicText(ctx, '×8', 0, 4, { size: 80, fill: C.ink, shadow: false, lw: 0.01 }); });
        if (lt > 3.6) {
          P.coinStack(ctx, 470, 1230, 46, Math.min(2, Math.floor(prog(lt, 3.7, 0.3) * 3)));
          P.coinStack(ctx, 760, 1230, 46, Math.min(16, Math.floor(prog(lt, 3.9, 0.9) * 17)));
          E.pill(ctx, '9,2 MIO.', 470, 1300, 30, C.greyD, C.white, pop(lt, 3.75));
          E.pill(ctx, '77 MIO.', 760, 1300, 30, C.red, C.white, pop(lt, 4.0));
        }
        panda(ctx, 'emotions/ueberrascht', lt, t, { x: 170, h: 450 });
      },
    },
    { // 10 34,4–37: Der Haken – gilt nur bis zur Wahl
      start: 34.4, mood: 'dark', poses: ['emotions/nachdenklich'], focus: { x: 640, y: 880 },
      sfx: [[0.1, 'whoosh', 0.35, 0], [0.6, 'tick', 0.9, 0], [1.4, 'down', 0.45, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DER HAKEN:', c: C.yellow, size: 150 }]],
          [1.3, [{ t: 'GILT NUR BIS', c: C.white, size: 115 }, { t: 'ZUR WAHL!', c: C.white, size: 140, ribbon: C.red }]]]);
        const drop = eOut(prog(lt, 0.05, 0.7));
        P.hook(ctx, 780, lerp(300, 720, drop), 1.25, t, 'VERSPRECHEN');
        if (lt > 1.35) {
          P.calendar(ctx, 850, 1130, 0.45 * pop(lt, 1.35, 0.45), 'NOVEMBER', '03', 0.08);
          const p = eOut(prog(lt, 1.6, 0.5)); ctx.strokeStyle = C.red; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.ellipse(850, 1150, 80, 60, -0.1, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2.1); ctx.stroke();
        }
        panda(ctx, 'emotions/nachdenklich', lt, t, { x: 190, h: 480 });
      },
    },
    { // 11 37–42,2: dritter Flugzeugtraeger + 9.000 Soldaten
      start: 37.0, mood: 'bad', poses: ['emotions/ueberrascht'], focus: { x: 640, y: 920 },
      sfx: [[1.6, 'horn', 0.5, 0.4], [1.4, 'whoosh', 0.3, 0.5], [4.0, 'boom', 0.4, 0], ...[0, 1, 2].map((i) => [4.1 + i * 0.12, 'tick', 0.6, -0.2 + i * 0.2])],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'GLEICHZEITIG', c: C.white, size: 125 }, { t: 'SCHICKEN DIE USA…', c: C.yellow, size: 100 }]],
          [1.4, [{ t: 'DEN 3.', c: C.white, size: 120 }, { t: 'FLUGZEUGTRÄGER', c: C.white, size: 110, ribbon: '#374151' }]],
          [4.0, [{ t: '+ 9.000', c: C.white, size: 150, ribbon: C.red }, { t: 'SOLDATEN', c: C.white, size: 120 }]]]);
        P.waves(ctx, 1150, t, { color: '#2E6FD8' });
        if (lt > 1.2) P.carrier(ctx, lerp(1500, 640, eOut(prog(lt, 1.2, 1.6))), 1135, 640, t, '3');
        if (lt > 3.9) {
          P.counter(ctx, 640, 760, '9.000', { size: 150, fill: C.white, scale: pop(lt, 4.0, 0.45) });
          for (let r = 0; r < 2; r++) for (let k = 0; k < 7; k++) P.helmet(ctx, 340 + k * 100 + (r % 2) * 50, 880 + r * 70, 0.8 * pop(lt, 4.1 + (r * 7 + k) * 0.035, 0.35));
        }
        panda(ctx, 'emotions/ueberrascht', lt, t, { x: 170, h: 440 });
      },
    },
    { // 12 42,2–45,2: Seeblockade bleibt – Boerse: Entwarnung?
      start: 42.2, mood: 'blue', poses: ['emotions/nachdenklich', 'poses/zeigen'], focus: { x: 640, y: 940 },
      sfx: [[0.35, 'stamp', 0.3, -0.1], [1.6, 'ping', 0.5, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'SEEBLOCKADE', c: C.white, size: 125 }, { t: 'BLEIBT!', c: C.white, size: 140, ribbon: C.red }]],
          [1.5, [{ t: 'BÖRSE:', c: C.white, size: 120 }, { t: 'ENTWARNUNG?', c: C.white, size: 125, ribbon: C.green }]]]);
        P.waves(ctx, 1080, t, { color: '#2E6FD8' });
        // Bojen-Kette
        const k = eOut(prog(lt, 0.2, 0.6));
        ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath();
        for (let i = 0; i < 6; i++) { const x = 470 + i * 14, y = 1090 + i * 45; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.globalAlpha = k; ctx.stroke();
        for (let i = 0; i < 6; i++) { const x = 470 + i * 14, y = 1090 + i * 45 + Math.sin(t * 2 + i) * 4; ctx.beginPath(); ctx.arc(x, y, 18, 0, 7); E.ink(ctx, i % 2 ? C.white : C.red, 5); }
        ctx.globalAlpha = 1;
        P.tanker(ctx, 780, 1110, 360, t * 0.6, {});
        if (lt > 1.4) E.withT(ctx, 700, 760, pop(lt, 1.5, 0.5), -0.03, () => {
          P.card(ctx, 0, 0, 420, 270, 'BÖRSE', { head: C.greenD });
          E.lineChart(ctx, -170, -40, 340, 150, [[0, 0.9], [0.3, 0.7], [0.55, 0.75], [0.8, 0.35], [1, 0.2]], eOut(prog(lt, 1.7, 0.8)), C.green, { lw: 12 });
          E.comicText(ctx, '?', 160, -50, { size: 80, fill: C.yellow, scale: pop(lt, 2.2) });
        });
        pandaSeq(ctx, [[0, 'emotions/nachdenklich'], [1.5, 'poses/zeigen']], lt, t, { x: 170, h: 450 });
      },
    },
    { // 13 45,2–49: Berater: Angriffe nach der Wahl bleiben Option
      start: 45.2, mood: 'dark', poses: ['emotions/nachdenklich'], focus: { x: 640, y: 930 },
      sfx: [[0.05, 'paper', 0.55, 0.1], [1.6, 'pop', 0.4, 0.1], [2.6, 'stamp', 0.4, 0.2], [2.7, 'down', 0.35, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'UND TRUMPS', c: C.white, size: 120 }, { t: 'BERATER?', c: C.yellow, size: 140 }]],
          [1.5, [{ t: 'ANGRIFFE NACH', c: C.white, size: 115 }, { t: 'DER WAHL?', c: C.white, size: 130, ribbon: C.red }]],
          [2.6, [{ t: 'BLEIBEN', c: C.white, size: 120 }, { t: 'EINE OPTION!', c: C.white, size: 125, ribbon: C.red }]]]);
        E.withT(ctx, 660, 960, pop(lt, 0.05, 0.5), 0.02, () => {
          P.card(ctx, 0, 0, 600, 480, 'OPTIONEN', { fill: '#FFF8E7', head: '#1F2937' });
          P.checkRow(ctx, -230, -80, 'FRIEDEN', 'q', pop(lt, 0.6, 0.4));
          P.checkRow(ctx, -230, 30, 'ANGRIFFE VOR 3.11.', 'no', pop(lt, 1.0, 0.4));
          P.checkRow(ctx, -230, 140, 'ANGRIFFE DANACH', lt > 2.6 ? 'yes' : '', pop(lt, 1.6, 0.4));
        });
        if (lt > 2.6) E.stamp(ctx, 'OPTION', 780, 1270, lt, 2.6, { size: 90, rot: -0.15 });
        panda(ctx, 'emotions/nachdenklich', lt, t, { x: 180, h: 460 });
      },
    },
    { // 14 49–51,2: Fuer dich – wenn es ruhig bleibt
      start: 49.0, mood: 'good', poses: ['poses/zeigen', 'emotions/freundlich'], focus: { x: 600, y: 880 },
      sfx: [[0.15, 'pop', 0.5, 0.2], [1.2, 'whoosh', 0.3, 0.4]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DAS HEISST', c: C.white, size: 115 }, { t: 'FÜR DICH:', c: C.white, size: 140, ribbon: C.green }]],
          [1.2, [{ t: 'WENN ES', c: C.white, size: 115 }, { t: 'RUHIG BLEIBT…', c: C.white, size: 130, ribbon: '#2D7FF9' }]]]);
        if (lt < 1.4) { ctx.save(); ctx.globalAlpha = 1 - prog(lt, 1.1, 0.3); E.speedLines(ctx, 700, 820, t, 'rgba(0,80,20,0.10)'); E.comicText(ctx, 'DU!', 720, 820, { size: 240, fill: C.green, scale: pop(lt, 0.1, 0.5), rot: -0.08, lw: 40 }); ctx.restore(); }
        if (lt > 1.1) P.dove(ctx, lerp(1250, 720, eOut(prog(lt, 1.1, 0.8))), 860 + Math.sin(t * 2) * 20, 1.3, t);
        pandaSeq(ctx, [[0, 'poses/zeigen'], [1.2, 'emotions/freundlich']], lt, t, { x: 240, h: 560 });
      },
    },
    { // 15 51,2–55,4: Fracht -> Oelpreis -> Zapfsaeule
      start: 51.2, mood: 'bad', poses: ['poses/analysieren'], focus: { x: 640, y: 940 },
      sfx: [[0.15, 'pop', 0.4, -0.3], [1.55, 'pop', 0.4, 0], [2.85, 'cash', 0.6, 0.35]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'TEURE FRACHT', c: C.white, size: 120 }, { t: 'BLEIBT…', c: C.yellow, size: 130 }]],
          [1.5, [{ t: '…IM ÖLPREIS', c: C.white, size: 130, ribbon: C.orange }]],
          [2.8, [{ t: '…UND AN DER', c: C.white, size: 110 }, { t: 'ZAPFSÄULE!', c: C.white, size: 135, ribbon: C.red }]]]);
        const arrow = (x1, y1, x2, y2, p) => { if (p <= 0) return; const x = lerp(x1, x2, p), y = lerp(y1, y2, p); ctx.strokeStyle = C.ink; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x, y); ctx.stroke(); ctx.strokeStyle = C.yellow; ctx.lineWidth = 7; ctx.stroke();
          const a = Math.atan2(y2 - y1, x2 - x1); E.withT(ctx, x, y, 1, a, () => { ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(-18, -22); ctx.lineTo(-18, 22); ctx.closePath(); E.ink(ctx, C.yellow, 6); }); };
        E.withT(ctx, 400, 760, pop(lt, 0.05, 0.5), 0, () => P.tanker(ctx, 0, 0, 300, t, {}));
        arrow(500, 840, 600, 940, eOut(prog(lt, 1.2, 0.4)));
        if (lt > 1.4) E.withT(ctx, 660, 1050, pop(lt, 1.5, 0.45), 0, () => P.barrel(ctx, 0, 0, 220));
        arrow(760, 1000, 830, 940, eOut(prog(lt, 2.5, 0.4)));
        if (lt > 2.7) E.withT(ctx, 900, 1240, pop(lt, 2.8, 0.45), 0, () => P.gasPump(ctx, 0, 0, 420, '4,36 $', { priceColor: '#FF6B6B' }));
        for (let i = 0; i < 4; i++) { const p = ((lt * 0.6 + i * 0.25) % 1); if (lt > 0.6) E.plainText(ctx, '$', lerp(430, 900, p), lerp(800, 900, p) - Math.sin(p * Math.PI) * 120, 46, C.greenD, { weight: 900, alpha: Math.sin(p * Math.PI) }); }
        panda(ctx, 'poses/analysieren', lt, t, { x: 160, h: 430 });
      },
    },
    { // 16 55,4–57,4: Ich geh bald pleite
      start: 55.4, mood: 'bad', poses: ['emotions/traurig'], focus: { x: 620, y: 920 },
      sfx: [[0.9, 'down', 0.45, 0.2], [0.3, 'paper', 0.35, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'ICH GEH', c: C.white, size: 120 }, { t: 'BALD PLEITE!', c: C.white, size: 135, ribbon: C.red }]]]);
        E.withT(ctx, 680, 980, pop(lt, 0.05, 0.5), Math.sin(lt * 2) * 0.03, () => P.wallet(ctx, 0, 0, 400, t));
        // Kassenzettel rollt raus
        const r = eOut(prog(lt, 0.3, 1.2));
        E.withT(ctx, 840, 1080, 1, 0.12, () => { E.rr(ctx, -70, 0, 140, 40 + r * 260, 6); E.ink(ctx, C.white, 5); for (let i = 0; i < Math.floor(r * 8); i++) { ctx.fillStyle = '#9CA3AF'; ctx.fillRect(-50, 20 + i * 30, 70, 8); E.plainText(ctx, '$', 40, 24 + i * 30, 22, C.red, { weight: 900 }); } });
        panda(ctx, 'emotions/traurig', lt, t, { x: 190, h: 480 });
      },
    },
    { // 17 57,4–Ende: Wahlkampf oder Frieden?
      start: 57.4, mood: 'blue', poses: ['emotions/nachdenklich', 'poses/tipp_geben'], focus: { x: 620, y: 920 },
      sfx: [[1.65, 'pop', 0.45, -0.35], [2.65, 'pop', 0.45, 0.35], [2.7, 'ping', 0.4, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'WAS DENKST', c: C.white, size: 120 }, { t: 'DU?', c: C.yellow, size: 160 }]],
          [1.6, [{ t: 'NUR WAHLKAMPF', c: C.white, size: 115, ribbon: C.red }, { t: 'ODER FRIEDEN?', c: C.white, size: 115, ribbon: C.green }]]]);
        if (lt < 1.9) { ctx.save(); ctx.globalAlpha = 1 - prog(lt, 1.5, 0.4); E.burst(ctx, 640, 880, 180, 260, 14, C.yellow, lt * 0.3, 8); E.comicText(ctx, '?', 640, 890, { size: 300, fill: C.white, scale: pop(lt, 0.1, 0.5), rot: Math.sin(lt * 2) * 0.08, lw: 44 }); ctx.restore(); }
        E.withT(ctx, 420, 900, pop(lt, 1.6, 0.5), -0.05, () => { P.card(ctx, 0, 0, 330, 420, 'WAHLKAMPF', { head: C.red }); P.ballotBox(ctx, 0, 170, 180, lt, 2.2); });
        E.withT(ctx, 800, 900, pop(lt, 2.6, 0.5), 0.05, () => { P.card(ctx, 0, 0, 330, 420, 'FRIEDEN', { head: C.greenD }); P.dove(ctx, -10, 40, 0.75, t); });
        if (lt > 2.6) E.comicText(ctx, 'VS', 610, 900, { size: 90, fill: C.yellow, scale: pop(lt, 2.7) });
        E.pill(ctx, 'Schreib’s in die Kommentare ↓', 600, 1250, 38, C.white, C.ink, pop(lt, 2.7, 0.5));
        pandaSeq(ctx, [[0, 'emotions/nachdenklich'], [1.6, 'poses/tipp_geben']], lt, t, { x: 170, h: 440 });
      },
    },
  ];

  window.VIDEO = { name: 'iran-wahlkampf', fps: 30, duration: 62.137, scenes, captions, xfade: 0.3, grain: 0.06, bokeh: true, endFade: false };
})();
