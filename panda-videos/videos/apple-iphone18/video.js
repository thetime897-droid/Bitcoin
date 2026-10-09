// Apple / iPhone 18 – Short (erste ~33 s). Zeiten in Sekunden = Voice-Over-Zeitachse des Originals.
(() => {
  const E = window.E, C = E.C;
  const { pop, prog, eOut, eBack, eInOut, lerp, clamp } = E;

  // Panda unten links/rechts/mittig. enter: nur bei neuem Auftritt reinfliegen.
  const panda = (ctx, pose, lt, t, o = {}) => E.drawPanda(ctx, pose, { x: o.x ?? 245, y: o.y ?? 1405, h: o.h ?? 560, lt, t, enter: o.enter ?? true, from: o.from || (o.x > 540 ? 'right' : 'left'), flip: o.flip, swapAt: o.swapAt, enterAt: o.enterAt });

  const captions = [
    [0.0, 1.0, 'Breaking News bei Apple,'],
    [1.0, 2.0, 'die Aktie fällt, denn'],
    [2.0, 3.75, 'sie bestellen weniger iPhones,'],
    [3.75, 5.75, 'mindestens 15 Prozent weniger.'],
    [5.75, 7.0, 'Warum ausgerechnet das teure'],
    [7.0, 8.25, 'Topmodell schwächelt und was'],
    [8.25, 9.25, 'KI damit zu tun hat,'],
    [9.4, 10.0, 'erfährst du jetzt.'],
    [10.0, 11.6, 'Laut Nikkei Asia hat'],
    [11.6, 12.5, 'Apple bei Zulieferern die'],
    [12.5, 13.5, 'Bestellung für das iPhone'],
    [13.5, 14.75, '18 Pro und Pro'],
    [14.75, 15.5, 'Max gekürzt.'],
    [15.5, 17.0, 'Im Oktober um mindestens'],
    [17.0, 19.0, '15 Prozent weniger als geplant.'],
    [19.0, 20.0, 'Der Grund natürlich,'],
    [20.0, 21.0, 'die Nachfrage ist schwächer'],
    [21.0, 21.9, 'als erwartet. Und das'],
    [21.9, 23.0, 'hat auch mit dem Preis'],
    [23.0, 23.3, 'zu tun.'],
    [23.3, 24.4, 'Das Pro kostet circa'],
    [24.4, 26.2, '1.200 Dollar, das Pro Max'],
    [26.2, 27.4, 'knapp 1.300.'],
    [27.5, 28.7, 'Jeweils 100 Dollar mehr als'],
    [28.7, 29.45, 'beim Vorgänger.'],
    [29.5, 31.2, 'Denn KI-Rechenzentren kaufen'],
    [31.2, 32.6, 'den Markt für Speicherchips leer.'],
  ];

  const scenes = [
    { // 0 Breaking News
      start: 0, mood: 'bad', poses: ['emotions/ueberrascht'], punch: false, flash: false, noBrand: true, pops: [0.15],
      draw(ctx, lt, t) {
        E.liveBar(ctx, lt, 'BREAKING  •  APPLE  -2,16 %  •  iPHONE 18 PRO: WENIGER BESTELLUNGEN  •  ');
        E.headline(ctx, [{ t: 'BREAKING', c: C.yellow, size: 150 }, { t: 'NEWS!', c: C.white, size: 150 }], lt, { y: 480, delay: 0.12 });
        const s = pop(lt, 0.25, 0.4);
        E.withT(ctx, 680, 960, s, Math.sin(lt * 3) * 0.05, () => {
          E.burst(ctx, 0, 0, 200, 290, 14, C.yellow, lt * 0.4, 9);
          E.apple(ctx, 0, 10, 170, C.red);
          E.comicText(ctx, '!', 190, -170, { size: 170, fill: C.red, rot: 0.2, scale: pop(lt, 0.5) });
        });
        panda(ctx, 'emotions/ueberrascht', lt, t, { x: 250, h: 600 });
      },
    },
    { // 1 Aktie faellt
      start: 1.0, mood: 'bad', poses: ['poses/zeigen'], shake: [0.62], focus: { x: 700, y: 860 },
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'AKTIE', c: C.white }, { t: 'FÄLLT!', c: C.red, size: 150 }], lt);
        E.whiteboard(ctx, 650, 900, 720, 520);
        E.apple(ctx, 370, 720, 46, C.red); E.plainText(ctx, 'APPLE', 470, 722, 44, C.ink, { weight: 900, align: 'left' });
        const pts = [[0.05, 0.25], [0.18, 0.2], [0.28, 0.42], [0.4, 0.33], [0.52, 0.6], [0.63, 0.5], [0.76, 0.78], [0.9, 0.9]];
        const e = E.lineChart(ctx, 320, 760, 660, 330, pts, eOut(prog(lt, 0.05, 0.6)), C.red, { area: true });
        E.explosion(ctx, e[0], e[1], lt, 0.62, { size: 0.8, seed: 3 });
        E.pill(ctx, '-2,16 %', 820, 735, 52, C.red, C.white, pop(lt, 0.55), 0.06);
        panda(ctx, 'poses/zeigen', lt, t, { x: 215, h: 560 });
      },
    },
    { // 2 weniger iPhones
      start: 2.0, mood: 'neutral', poses: ['emotions/nachdenklich'], pops: [0.1, 0.2, 0.3],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'WENIGER', c: C.red, size: 140 }, { t: 'iPHONES', c: C.white }], lt);
        const gone = [1, 3, 5, 8];
        for (let i = 0; i < 9; i++) {
          const gx = 470 + (i % 3) * 190, gy = 720 + Math.floor(i / 3) * 250;
          const sIn = pop(lt, 0.05 + i * 0.05, 0.3);
          const gi = gone.indexOf(i), tg = 0.85 + gi * 0.16;
          if (gi >= 0 && lt > tg) {
            const p = prog(lt, tg, 0.3);
            ctx.save(); ctx.globalAlpha = 1 - p; E.iphone(ctx, gx, gy, 210 * (1 - p * 0.6), { label: '18 PRO' }); ctx.restore();
            E.explosion(ctx, gx, gy, lt, tg, { size: 0.45, seed: i + 1, c1: C.greyD, c2: C.white });
            ctx.save(); ctx.globalAlpha = clamp(p * 3); E.comicText(ctx, 'X', gx, gy, { size: 170, fill: C.red, scale: pop(lt, tg + 0.05) }); ctx.restore();
          } else E.withT(ctx, gx, gy, sIn, Math.sin(t * 3 + i) * 0.04, () => E.iphone(ctx, 0, 0, 210, { label: '18 PRO' }));
        }
        panda(ctx, 'emotions/nachdenklich', lt, t, { x: 200, h: 540 });
      },
    },
    { // 3 -15 %
      start: 3.75, mood: 'bad', poses: ['emotions/wuetend'], shake: [0.78], focus: { x: 600, y: 900 },
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'MINDESTENS', c: C.white, size: 120 }], lt);
        // Balken "Bestellungen" laeuft von 100 % auf 85 %
        const p = eInOut(prog(lt, 0.1, 0.65)), val = lerp(1, 0.85, p);
        E.plainText(ctx, 'iPHONE-BESTELLUNGEN', 400, 1105, 40, C.ink, { weight: 900 });
        E.rr(ctx, 110, 1140, 580, 80, 40); E.ink(ctx, C.white, 8);
        E.rr(ctx, 120, 1150, 560 * val, 60, 30); E.ink(ctx, p < 0.5 ? C.green : C.red, 0);
        E.plainText(ctx, Math.round(val * 100) + ' %', 400, 1182, 44, C.ink, { weight: 900 });
        // Rote Pfeile regnen
        for (let i = 0; i < 4; i++) { const ph = (lt * 0.9 + i * 0.27) % 1; E.arrowDown(ctx, 260 + i * 200 + (i % 2) * 40, lerp(520, 1050, ph), 0.6 * pop(lt, 0.78), C.red); }
        E.explosion(ctx, 520, 820, lt, 0.78, { size: 1.5, seed: 5, dur: 0.9 });
        const s = pop(lt, 0.78, 0.4);
        E.comicText(ctx, '-15 %', 520, 820, { size: 300, fill: C.red, scale: s * (1 + Math.sin(lt * 7) * 0.015), rot: -0.06, lw: 46 });
        panda(ctx, 'emotions/wuetend', lt, t, { x: 840, h: 520, from: 'right' });
      },
    },
    { // 4 Warum das Topmodell? / KI?
      start: 5.75, mood: 'dark', poses: ['emotions/nachdenklich'], focus: { x: 620, y: 850 }, zoom: 0.1, pops: [2.5],
      draw(ctx, lt, t) {
        const second = lt >= 2.5;
        if (!second) E.headline(ctx, [{ t: 'WARUM DAS', c: C.white, size: 120 }, { t: 'TOPMODELL?', c: C.yellow, size: 140 }], lt);
        else E.headline(ctx, [{ t: 'UND WAS HAT', c: C.white, size: 115 }, { t: 'KI DAMIT ZU TUN?', c: C.cyan, size: 120 }], lt - 2.5);
        // Spotlight
        const g = ctx.createRadialGradient(620, 1000, 40, 620, 900, 520); g.addColorStop(0, 'rgba(255,240,190,0.45)'); g.addColorStop(1, 'rgba(255,240,190,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(470, 380); ctx.lineTo(770, 380); ctx.lineTo(980, 1240); ctx.lineTo(260, 1240); ctx.closePath(); ctx.fill();
        // Podest
        ctx.beginPath(); ctx.ellipse(620, 1200, 260, 50, 0, 0, 7); E.ink(ctx, '#3B4150', 8);
        E.rr(ctx, 360, 1130, 520, 70, 10); E.ink(ctx, '#4C5468', 8);
        ctx.beginPath(); ctx.ellipse(620, 1130, 260, 50, 0, 0, 7); E.ink(ctx, '#646E86', 8);
        const weak = prog(lt, 1.4, 0.6);
        E.withT(ctx, 620, 860 + weak * 20, pop(lt, 0.1, 0.4), -weak * 0.08, () => E.iphone(ctx, 0, 0, 480, { label: 'iPHONE 18 PRO', c1: '#C9B79C', c2: '#8E7D63', crack: weak > 0.5 }));
        // Krone rutscht ab
        E.withT(ctx, 620 + weak * 140, 590 + weak * weak * 160, pop(lt, 0.35), weak * 0.7, () => {
          ctx.beginPath(); ctx.moveTo(-90, 40); ctx.lineTo(-100, -40); ctx.lineTo(-50, 0); ctx.lineTo(0, -60); ctx.lineTo(50, 0); ctx.lineTo(100, -40); ctx.lineTo(90, 40); ctx.closePath(); E.ink(ctx, C.gold, 8);
        });
        if (weak > 0) E.arrowDown(ctx, 880, 1000 + Math.sin(lt * 6) * 10, 0.8 * pop(lt, 1.5), C.red);
        if (second) {
          const lt2 = lt - 2.5;
          E.withT(ctx, 870 - (1 - eOut(prog(lt2, 0, 0.4))) * -400, 600, pop(lt2, 0, 0.45), 0, () => {
            E.chip(ctx, 0, 0, 190, 'KI', { glow: 0.8 + Math.sin(lt * 8) * 0.2 });
          });
          for (let i = 0; i < 3; i++) { const a = lt * 6 + i * 2.1; ctx.strokeStyle = C.cyan; ctx.lineWidth = 7; ctx.beginPath();
            ctx.moveTo(870 + Math.cos(a) * 130, 600 + Math.sin(a) * 130); ctx.lineTo(870 + Math.cos(a) * 170 + 15, 600 + Math.sin(a) * 170); ctx.lineTo(870 + Math.cos(a) * 200, 600 + Math.sin(a) * 200 + 15); ctx.globalAlpha = 0.8 * pop(lt2, 0.1); ctx.stroke(); ctx.globalAlpha = 1; }
          E.questionMarks(ctx, 860, 900, lt2, 3, C.yellow);
        }
        panda(ctx, 'emotions/nachdenklich', lt, t, { x: 215, h: 520 });
      },
    },
    { // 5 JETZT
      start: 9.25, mood: 'good', poses: ['poses/tipp_geben'], pops: [0.05], focus: { x: 540, y: 800 },
      draw(ctx, lt, t) {
        E.speedLines(ctx, 540, 760, t);
        E.burst(ctx, 540, 640, 230, 330, 16, C.yellow, lt * 0.8, 9);
        E.comicText(ctx, 'JETZT!', 540, 640, { size: 230, fill: C.green, scale: pop(lt, 0.03, 0.3), rot: -0.07, lw: 38 });
        E.comicText(ctx, 'ERFÄHRST DU ES', 540, 400, { size: 95, fill: C.white, scale: pop(lt, 0.1), rot: -0.03 });
        panda(ctx, 'poses/tipp_geben', lt, t, { x: 540, h: 620, enter: false, swapAt: 0 });
      },
    },
    { // 6 Laut Nikkei Asia
      start: 10.0, mood: 'blue', poses: ['poses/praesentieren'], focus: { x: 640, y: 880 }, pops: [0.1],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'LAUT', c: C.white, size: 110 }, { t: 'NIKKEI ASIA', c: C.yellow, size: 140 }], lt);
        const p = eOut(prog(lt, 0.05, 0.5));
        E.withT(ctx, 660, 930, lerp(0.05, 1, p), lerp(Math.PI * 4, -0.06, p), () => E.newspaper(ctx, 0, 0, 580, {
          masthead: 'NIKKEI ASIA', headline: ['APPLE KÜRZT', 'iPHONE-ORDERS'],
          picture: (x, y, w, h) => { E.iphone(ctx, x + w * 0.4, y + h * 0.5, h * 0.8, {}); E.arrowDown(ctx, x + w * 0.78, y + h * 0.45, 0.45, C.red); },
        }));
        // Globus
        E.withT(ctx, 900, 640, pop(lt, 0.45), Math.sin(lt * 2) * 0.1, () => {
          ctx.beginPath(); ctx.arc(0, 0, 70, 0, 7); E.ink(ctx, '#4FA3F7', 7);
          ctx.fillStyle = C.green; ctx.beginPath(); ctx.ellipse(-15, -10, 30, 22, 0.4, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(25, 25, 18, 12, -0.3, 0, 7); ctx.fill();
          ctx.beginPath(); ctx.arc(0, 0, 70, 0, 7); E.ink(ctx, null, 7);
        });
        panda(ctx, 'poses/praesentieren', lt, t, { x: 230, h: 560 });
      },
    },
    { // 7 Zulieferer
      start: 11.6, mood: 'neutral', poses: ['poses/zeigen'], focus: { x: 620, y: 950 },
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'ZULIEFERER', c: C.white, size: 140 }], lt);
        E.factory(ctx, 640, 1130, 720, lt, { sign: 'iPHONE-FABRIK', signScale: pop(lt, 0.15) });
        // Foerderband
        E.rr(ctx, 260, 1150, 760, 46, 23); E.ink(ctx, '#4A4F57', 8);
        for (let i = 0; i < 4; i++) { const x = 300 + ((lt * 260 + i * 200) % 760); if (x < 980) E.iphone(ctx, x, 1095, 110, {}); }
        panda(ctx, 'poses/zeigen', lt, t, { x: 205, h: 520 });
      },
    },
    { // 8 Bestellung gekuerzt
      start: 12.5, mood: 'neutral', poses: ['poses/analysieren'], shake: [2.33], focus: { x: 640, y: 900 }, zoom: 0.09,
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'BESTELLUNG', c: C.white, size: 130 }, { t: 'iPHONE 18 PRO & MAX', c: C.yellow, size: 92 }], lt);
        const cut = lt >= 2.33;
        E.withT(ctx, 660, 920, pop(lt, 0.05, 0.4), -0.03, () => {
          E.clipboard(ctx, 0, 0, 560, 640);
          E.plainText(ctx, 'BESTELLUNG', 0, -210, 54, C.ink, { weight: 900 });
          ctx.fillStyle = C.ink; ctx.fillRect(-200, -172, 400, 6);
          const rows = [['iPHONE 18 PRO', 0.85], ['iPHONE 18 PRO MAX', 1.7]];
          rows.forEach(([name, at], i) => {
            const s = pop(lt, at, 0.3), y = -90 + i * 170; if (s <= 0) return;
            E.withT(ctx, 0, y, s, 0, () => {
              E.iphone(ctx, -175, 20, 110, {});
              E.plainText(ctx, name, 40, -10, 34, C.ink, { weight: 900 });
              E.plainText(ctx, cut ? '85 %' : '100 %', 40, 40, 46, cut ? C.red : C.greenD, { weight: 900 });
              if (cut) { ctx.strokeStyle = C.red; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-60, -10); ctx.lineTo(160, -10); ctx.stroke(); }
            });
          });
        });
        E.stamp(ctx, 'GEKÜRZT!', 640, 1185, lt, 2.33, { size: 120, rot: -0.22 });
        panda(ctx, 'poses/analysieren', lt, t, { x: 215, h: 520 });
      },
    },
    { // 9 Oktober -15 % weniger als geplant
      start: 15.5, mood: 'bad', poses: ['poses/zeigen'], shake: [1.6], focus: { x: 470, y: 900 }, pops: [1.6],
      draw(ctx, lt, t) {
        if (lt < 1.5) E.headline(ctx, [{ t: 'IM OKTOBER', c: C.white, size: 135 }], lt);
        else E.headline(ctx, [{ t: 'WENIGER ALS', c: C.white, size: 110 }, { t: 'GEPLANT!', c: C.red, size: 150 }], lt - 1.5);
        E.whiteboard(ctx, 460, 900, 660, 600);
        // Kalenderblatt
        E.withT(ctx, 230, 680, pop(lt, 0.1), -0.08, () => { E.rr(ctx, -70, -70, 140, 150, 14); E.ink(ctx, C.white, 7); E.rr(ctx, -70, -70, 140, 45, 14); E.ink(ctx, C.red, 7); E.plainText(ctx, 'OKT', 0, -46, 30, C.white, { weight: 900 }); E.plainText(ctx, '10', 0, 25, 64, C.ink, { weight: 900 }); });
        const base = 1130, maxH = 380;
        const h1 = maxH * eOut(prog(lt, 0.2, 0.5)), h2 = maxH * lerp(0, 0.85, eOut(prog(lt, 0.8, 0.6)));
        E.rr(ctx, 300, base - h1, 140, Math.max(h1, 1), 10); E.ink(ctx, C.green, 7);
        E.rr(ctx, 520, base - h2, 140, Math.max(h2, 1), 10); E.ink(ctx, C.red, 7);
        E.plainText(ctx, 'GEPLANT', 370, base + 40, 32, C.ink, { weight: 900 }); E.plainText(ctx, 'NEU', 590, base + 40, 32, C.ink, { weight: 900 });
        if (h1 > 40) E.plainText(ctx, '100 %', 370, base - h1 + 35, 34, C.white, { weight: 900 });
        if (h2 > 40) E.plainText(ctx, '85 %', 590, base - h2 + 35, 34, C.white, { weight: 900 });
        // Luecke markieren
        if (lt > 1.5) { ctx.setLineDash([16, 12]); ctx.strokeStyle = C.red; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(510, base - maxH); ctx.lineTo(680, base - maxH); ctx.stroke(); ctx.setLineDash([]);
          E.rr(ctx, 520, base - maxH, 140, maxH * 0.15, 6); ctx.fillStyle = 'rgba(240,54,43,0.25)'; ctx.fill(); }
        E.pill(ctx, '-15 %', 690, base - maxH - 50, 64, C.red, C.white, pop(lt, 1.6), 0.08);
        panda(ctx, 'poses/zeigen', lt, t, { x: 880, h: 500, flip: true, from: 'right' });
      },
    },
    { // 10 Nachfrage schwaecher als erwartet
      start: 19.0, mood: 'bad', poses: ['emotions/traurig'], focus: { x: 520, y: 900 }, shake: [1.55],
      draw(ctx, lt, t) {
        if (lt < 1.0) E.headline(ctx, [{ t: 'DER GRUND?', c: C.white, size: 140 }], lt);
        else E.headline(ctx, [{ t: 'NACHFRAGE', c: C.white, size: 130 }, { t: 'SCHWÄCHER!', c: C.red, size: 140 }], lt - 1.0);
        const exp = 0.8;
        const v = lt < 1.2 ? exp + Math.sin(lt * 9) * 0.02 : lerp(exp, 0.16, E.eElastic(prog(lt, 1.2, 0.9)));
        E.withT(ctx, 470, 980, pop(lt, 0.05, 0.4), 0, () => E.gauge(ctx, 0, 0, 290, v, { label: 'NACHFRAGE', ghost: lt > 1.2 ? exp : null, ghostAlpha: 0.9 }));
        if (lt > 2.0) E.pill(ctx, 'ERWARTET', 470 + Math.cos(Math.PI + exp * Math.PI) * 360 + 30, 980 + Math.sin(Math.PI + exp * Math.PI) * 360 - 20, 40, C.greenD, C.white, pop(lt, 2.0), 0.1);
        if (lt > 1.6) E.arrowDown(ctx, 160, 700 + Math.sin(lt * 6) * 12, 0.7 * pop(lt, 1.6), C.red);
        panda(ctx, 'emotions/traurig', lt, t, { x: 905, h: 470, from: 'right' });
      },
    },
    { // 11 Der Preis
      start: 21.9, mood: 'neutral', poses: ['emotions/nachdenklich'], focus: { x: 640, y: 860 }, pops: [0.1],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'UND DER', c: C.white, size: 110 }, { t: 'PREIS!', c: C.yellow, size: 160 }], lt);
        const sw = Math.sin(lt * 3.2) * 0.25 * Math.exp(-lt * 0.6);
        E.withT(ctx, 680, 640, 1, sw, () => E.priceTag(ctx, 0, 330, 560, '$$$', { color: C.yellow, scale: pop(lt, 0.05, 0.45), rot: 0.0 }));
        ctx.beginPath(); ctx.arc(680, 640, 14, 0, 7); E.ink(ctx, C.greyD, 6);
        E.moneyRain(ctx, lt, 0.3, { x: 700, y: 900, n: 10, seed: 4 });
        panda(ctx, 'emotions/nachdenklich', lt, t, { x: 220, h: 520 });
      },
    },
    { // 12 Preise Pro / Pro Max
      start: 23.3, mood: 'neutral', poses: ['poses/zeigen'], focus: { x: 640, y: 880 }, pops: [1.1, 2.3], shake: [3.0],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'SO TEUER', c: C.white, size: 120 }, { t: 'IST DAS iPHONE 18', c: C.yellow, size: 90 }], lt);
        E.withT(ctx, 520, 820, pop(lt, 0.05, 0.4), -0.05, () => E.iphone(ctx, 0, 0, 380, { label: 'PRO', c1: '#C9B79C', c2: '#8E7D63' }));
        E.withT(ctx, 840, 800, pop(lt, 0.2, 0.4), 0.05, () => E.iphone(ctx, 0, 0, 440, { label: 'PRO MAX', c1: '#9AA6B8', c2: '#5D6B80' }));
        E.priceTag(ctx, 520, 1100, 300, '1.199 $', { color: C.yellow, scale: pop(lt, 1.1, 0.35), rot: Math.sin(lt * 4) * 0.05 - 0.05 });
        if (lt > 3) E.burst(ctx, 850, 1120, 150, 230, 14, C.yellow, lt * 0.6, 7);
        E.priceTag(ctx, 850, 1120, 320, '1.299 $', { color: C.orange, scale: pop(lt, 2.3, 0.35) * (lt > 3 ? 1.12 + Math.sin(lt * 10) * 0.02 : 1), rot: Math.sin(lt * 4 + 1) * 0.05 + 0.04 });
                if (lt > 3) E.comicText(ctx, 'FAST 1.300 $!', 700, 1260, { size: 80, fill: C.red, scale: pop(lt, 3.0), rot: -0.05 });
        panda(ctx, 'poses/zeigen', lt, t, { x: 180, h: 460 });
      },
    },
    { // 13 +100 $ mehr als Vorgaenger
      start: 27.45, mood: 'bad', poses: ['emotions/ueberrascht'], shake: [0.25], focus: { x: 600, y: 880 },
      draw(ctx, lt, t) {
        E.moneyRain(ctx, lt, 0.2, { x: 600, n: 10, seed: 21, spread: 900, fall: true });
        E.headline(ctx, [{ t: '+100 $', c: C.red, size: 170 }, { t: 'TEURER ALS VORHER', c: C.white, size: 88 }], lt);
        // alt -> neu
        E.withT(ctx, 400, 880, pop(lt, 0.05), 0, () => { ctx.globalAlpha = 0.75; E.iphone(ctx, 0, 0, 330, { label: '17 PRO', c1: '#B0B4BC', c2: '#7A7F88' }); ctx.globalAlpha = 1; });
        E.withT(ctx, 800, 860, pop(lt, 0.15), 0, () => E.iphone(ctx, 0, 0, 380, { label: '18 PRO', c1: '#C9B79C', c2: '#8E7D63' }));
        E.priceTag(ctx, 400, 1120, 280, '1.099 $', { color: C.white, scale: pop(lt, 0.1) });
        if (lt > 0.3) { ctx.strokeStyle = C.red; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(300, 1150 - 30 * eOut(prog(lt, 0.3, 0.2))); ctx.lineTo(300 + 210 * eOut(prog(lt, 0.3, 0.2)), 1095); ctx.stroke(); }
        E.priceTag(ctx, 800, 1140, 300, '1.199 $', { color: C.yellow, scale: pop(lt, 0.25) });
        // Pfeil
        E.withT(ctx, 600, 870, pop(lt, 0.2), 0, () => { ctx.beginPath(); ctx.moveTo(-60, -22); ctx.lineTo(20, -22); ctx.lineTo(20, -50); ctx.lineTo(70, 0); ctx.lineTo(20, 50); ctx.lineTo(20, 22); ctx.lineTo(-60, 22); ctx.closePath(); E.ink(ctx, C.red, 7); });
        if (lt > 1.25) E.pill(ctx, 'VORGÄNGER', 400, 640, 40, C.greyD, C.white, pop(lt, 1.25), -0.06);
        panda(ctx, 'emotions/ueberrascht', lt, t, { x: 170, h: 430 });
      },
    },
    { // 14 KI-Rechenzentren kaufen
      start: 29.45, mood: 'dark', poses: ['emotions/cool'], focus: { x: 640, y: 880 }, pops: [0.9],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'KI-RECHENZENTREN', c: C.cyan, size: 110 }, { t: 'KAUFEN ALLES!', c: C.white, size: 115 }], lt);
        for (let i = 0; i < 3; i++) E.withT(ctx, 0, (1 - eOut(prog(lt, i * 0.08, 0.4))) * 900, 1, 0, () => E.serverRack(ctx, 330 + i * 230, 760, 200, 470, t, i + 2));
        E.withT(ctx, 640, 640, pop(lt, 0.2), 0, () => E.chip(ctx, 0, 0, 170, 'KI', { glow: 0.9 + Math.sin(lt * 7) * 0.1 }));
        // Wagen voller Chips faehrt rein
        const cx = lerp(1300, 760, eOut(prog(lt, 0.8, 0.6)));
        E.cart(ctx, cx, 1300, 300, lt);
        for (let i = 0; i < 5; i++) E.ramStick(ctx, cx - 110 + (i % 3) * 100, 1130 - Math.floor(i / 3) * 45, 120, (i - 2) * 0.15);
        panda(ctx, 'emotions/cool', lt, t, { x: 200, h: 500 });
      },
    },
    { // 15 Speicherchips leer gekauft
      start: 31.2, mood: 'bad', poses: ['emotions/ueberrascht'], shake: [0.95], focus: { x: 620, y: 900 },
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'SPEICHERCHIPS', c: C.white, size: 120 }, { t: 'AUSVERKAUFT!', c: C.red, size: 130 }], lt);
        // Regal
        const sx = 330, sw = 600;
        E.rr(ctx, sx, 640, sw, 560, 12); E.ink(ctx, '#C89A6A', 9);
        for (let r = 0; r < 3; r++) { E.rr(ctx, sx + 20, 820 + r * 170, sw - 40, 18, 4); E.ink(ctx, '#8F633A', 5); }
        E.plainText(ctx, 'SPEICHERCHIPS', sx + sw / 2, 690, 40, C.ink, { weight: 900 });
        for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) {
          const i = r * 4 + k, tg = 0.05 + i * 0.06, p = prog(lt, tg, 0.35);
          const x = sx + 95 + k * 135 + p * (700 + i * 20), y = 780 + r * 170 - Math.sin(p * Math.PI) * 120;
          if (p < 1) E.ramStick(ctx, x, y, 115, -0.6 * p);
        }
        E.stamp(ctx, 'LEER!', 630, 1000, lt, 0.95, { size: 150, rot: -0.18 });
        panda(ctx, 'emotions/ueberrascht', lt, t, { x: 200, h: 480 });
      },
    },
  ];

  window.VIDEO = { name: 'apple-iphone18', fps: 30, duration: 32.85, audioStart: 0, scenes, captions };
})();
