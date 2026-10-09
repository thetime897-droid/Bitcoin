// Apple / iPhone 18 – Short (erste ~33 s). Zeiten in Sekunden = Voice-Over-Zeitachse des Originals.
(() => {
  const E = window.E, C = E.C;
  const { pop, prog, eOut, eBack, eInOut, lerp, clamp } = E;

  // Panda unten links/rechts/mittig. enter: nur bei neuem Auftritt reinfliegen.
  const panda = (ctx, pose, lt, t, o = {}) => E.drawPanda(ctx, pose, { x: o.x ?? 245, y: o.y ?? 1405, h: o.h ?? 560, lt, t, enter: o.enter ?? true, from: o.from || (o.x > 540 ? 'right' : 'left'), flip: o.flip, swapAt: o.swapAt, enterAt: o.enterAt });

  // ---------- Requisiten Teil 2 ----------
  const coin = (ctx, x, y, r) => { ctx.beginPath(); ctx.ellipse(x, y + r * 0.18, r, r * 0.42, 0, 0, 7); E.ink(ctx, '#C98F00', 5); ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.42, 0, 0, 7); E.ink(ctx, C.gold, 5); E.plainText(ctx, '$', x, y + 2, r * 0.55, '#8A5A00', { weight: 900 }); };
  const coinStack = (ctx, x, by, r, n) => { for (let i = 0; i < n; i++) coin(ctx, x, by - i * r * 0.32, r); };
  const stickman = (ctx, x, y, s, ph, c = C.ink) => {
    E.withT(ctx, x, y, s, 0, () => {
      ctx.strokeStyle = c; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const a = Math.sin(ph) * 0.9, b = Math.sin(ph + Math.PI) * 0.9;
      ctx.beginPath(); ctx.moveTo(0, -60); ctx.lineTo(8, 40); // Koerper (nach vorn geneigt)
      ctx.moveTo(8, 40); ctx.lineTo(8 + Math.sin(a) * 55, 40 + Math.cos(a) * 55); ctx.moveTo(8, 40); ctx.lineTo(8 + Math.sin(b) * 55, 40 + Math.cos(b) * 55);
      ctx.moveTo(2, -30); ctx.lineTo(2 + Math.sin(b) * 45, -30 + Math.cos(b) * 45); ctx.moveTo(2, -30); ctx.lineTo(2 + Math.sin(a) * 45, -30 + Math.cos(a) * 45); ctx.stroke();
      ctx.beginPath(); ctx.arc(-4, -88, 28, 0, 7); E.ink(ctx, C.white, 10, c);
    });
  };
  const padlock = (ctx, x, y, s) => E.withT(ctx, x, y, s, 0, () => {
    ctx.beginPath(); ctx.arc(0, -40, 42, Math.PI, 0); ctx.lineWidth = 22; ctx.strokeStyle = C.ink; ctx.stroke(); ctx.lineWidth = 12; ctx.strokeStyle = '#AEB4BD'; ctx.stroke();
    E.rr(ctx, -65, -40, 130, 105, 16); E.ink(ctx, C.gold, 8); ctx.beginPath(); ctx.arc(0, 0, 13, 0, 7); ctx.fillStyle = C.ink; ctx.fill(); ctx.fillRect(-5, 0, 10, 32);
  });
  const vise = (ctx, x, y, gap, lt) => {
    E.rr(ctx, x - 330, y + 150, 660, 50, 12); E.ink(ctx, '#5B6270', 8);
    [-1, 1].forEach((sd) => { E.rr(ctx, x + sd * gap - (sd < 0 ? 90 : 0), y - 150, 90, 330, 14); E.ink(ctx, '#3D7BD9', 8); E.rr(ctx, x + sd * gap - (sd < 0 ? 20 : 0), y - 130, 20, 280, 4); E.ink(ctx, '#2A2F3A', 4); });
    ctx.strokeStyle = C.ink; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(x + gap + 90, y); ctx.lineTo(x + 360, y); ctx.stroke(); ctx.strokeStyle = '#C0C6CF'; ctx.lineWidth = 8; ctx.stroke();
    E.withT(ctx, x + 380, y, 1, lt * 4, () => { E.rr(ctx, -10, -90, 20, 180, 8); E.ink(ctx, '#C0C6CF', 6); });
  };
  const exchange = (ctx, x, by, w) => {
    const h = w * 0.6;
    E.rr(ctx, x - w / 2 - 20, by - 40, w + 40, 40, 6); E.ink(ctx, '#E7E1D3', 7);
    E.rr(ctx, x - w / 2, by - 70, w, 30, 6); E.ink(ctx, '#EFEADF', 7);
    for (let i = 0; i < 6; i++) { E.rr(ctx, x - w / 2 + 30 + i * (w - 100) / 5, by - 70 - h * 0.62, 40, h * 0.62, 6); E.ink(ctx, '#F7F3EA', 6); }
    E.rr(ctx, x - w / 2 - 10, by - 70 - h * 0.62 - 50, w + 20, 50, 6); E.ink(ctx, '#EFEADF', 7);
    ctx.beginPath(); ctx.moveTo(x - w / 2 - 20, by - 70 - h * 0.62 - 50); ctx.lineTo(x, by - 70 - h - 40); ctx.lineTo(x + w / 2 + 20, by - 70 - h * 0.62 - 50); ctx.closePath(); E.ink(ctx, '#E7E1D3', 7);
    E.plainText(ctx, 'BÖRSE', x, by - 70 - h * 0.62 - 23, 34, C.ink, { weight: 900 });
  };
  const magnifier = (ctx, x, y, r, inner) => {
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.clip(); ctx.fillStyle = 'rgba(220,240,255,0.9)'; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); inner && inner(); ctx.restore();
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.lineWidth = 26; ctx.strokeStyle = C.ink; ctx.stroke(); ctx.lineWidth = 14; ctx.strokeStyle = '#7A5230'; ctx.stroke();
    E.withT(ctx, x + r * 0.72, y + r * 0.72, 1, Math.PI / 4, () => { E.rr(ctx, 0, -24, r * 0.95, 48, 20); E.ink(ctx, '#7A5230', 8); });
  };
  const warn = (ctx, x, y, s) => E.withT(ctx, x, y, s, 0, () => { ctx.beginPath(); ctx.moveTo(0, -42); ctx.lineTo(46, 38); ctx.lineTo(-46, 38); ctx.closePath(); E.ink(ctx, C.yellow, 7); E.plainText(ctx, '!', 0, 10, 50, C.ink, { weight: 900 }); });
  const report = (ctx, x, y, w, h, title) => {
    E.rr(ctx, x - w / 2 + 14, y - h / 2 + 18, w, h, 10); ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fill();
    E.rr(ctx, x - w / 2, y - h / 2, w, h, 10); E.ink(ctx, C.paper, 8);
    E.plainText(ctx, title, x, y - h / 2 + 60, Math.min(46, w * 0.08), C.ink, { weight: 900 }); ctx.fillStyle = C.ink; ctx.fillRect(x - w / 2 + 40, y - h / 2 + 95, w - 80, 5);
  };
  const calendar = (ctx, x, y, s, top, big) => E.withT(ctx, x, y, s, -0.05, () => {
    E.rr(ctx, -180, -170, 360, 360, 30); E.ink(ctx, C.white, 9); E.rr(ctx, -180, -170, 360, 100, 30); E.ink(ctx, C.red, 9);
    E.plainText(ctx, top, 0, -118, 44, C.white, { weight: 900 }); E.plainText(ctx, big, 0, 60, 170, C.ink, { weight: 900 });
    for (const rx of [-110, 110]) { E.rr(ctx, rx - 12, -200, 24, 70, 12); E.ink(ctx, C.greyD, 6); }
  });

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
    [32.75, 33.75, 'Laut TrendForce kostet'],
    [33.75, 35.0, 'die Herstellung des 18'],
    [35.0, 37.25, 'Pro rund 38 Prozent mehr.'],
    [37.25, 38.0, 'Und genau hier steckt'],
    [38.0, 39.2, 'Apple in der Zwickmühle.'],
    [39.25, 40.75, 'Preise rauf, Kunden springen ab,'],
    [40.75, 41.7, 'Preise halten,'],
    [41.75, 42.75, 'die Marge schrumpft und'],
    [42.75, 43.5, 'die Börse?'],
    [43.5, 44.75, 'Die Aktie gab vorbörslich'],
    [44.75, 46.0, 'leicht nach bei knapp'],
    [46.0, 47.5, '5 Billionen Dollar Börsenwert.'],
    [47.5, 48.75, 'Schaut aber jeder genauer hin.'],
    [48.75, 49.5, 'Das heißt für dich,'],
    [49.5, 50.5, 'der KI-Boom macht'],
    [50.5, 51.5, 'nicht nur die Chips teurer,'],
    [51.5, 52.6, 'sondern am Ende auch'],
    [52.6, 53.25, 'dein Handy. Und am'],
    [53.25, 55.0, '02.11. wird’s richtig spannend,'],
    [55.25, 56.5, 'denn dort legt Apple ihre'],
    [56.5, 57.2, 'Zahlen vor,'],
    [57.25, 58.75, 'ob diese Problematiken sich'],
    [58.75, 59.75, 'dann auch in den Quartalszahlen'],
    [59.75, 60.7, 'widerspiegeln werden.'],
    [60.75, 61.7, 'Das werden wir dann sehen.'],
  ];

  const scenes = [
    { // A 0-2 s: Breaking News -> Aktie faellt (eine Szene, weicher Wechsel)
      start: 0, mood: 'bad', poses: ['emotions/ueberrascht'], punch: false, flash: false, noBrand: true, shake: [1.75], focus: { x: 660, y: 900 },
      sfx: [[0.0, 'ping', 0.7]],
      draw(ctx, lt, t) {
        E.liveBar(ctx, lt, 'BREAKING  •  APPLE  -2,16 %  •  iPHONE 18 PRO: WENIGER BESTELLUNGEN  •  ');
        if (lt < 1.0) E.headline(ctx, [{ t: 'BREAKING', c: C.yellow, size: 150 }, { t: 'NEWS!', c: C.white, size: 150 }], lt, { y: 480, delay: 0.1 });
        else E.headline(ctx, [{ t: 'APPLE-AKTIE', c: C.white, size: 125 }, { t: 'FÄLLT!', c: C.red, size: 160 }], lt - 1.0, { y: 480 });
        const out = eOut(prog(lt, 0.85, 0.35));
        if (out < 1) E.withT(ctx, 680, 980, pop(lt, 0.2, 0.5) * (1 - out), Math.sin(lt * 2) * 0.04, () => {
          E.burst(ctx, 0, 0, 200, 290, 14, C.yellow, lt * 0.25, 9);
          E.apple(ctx, 0, 10, 170, C.red);
        });
        if (lt > 0.9) E.withT(ctx, 660, 1010, pop(lt, 0.9, 0.5), 0, () => {
          ctx.translate(-660, -1010);
          E.whiteboard(ctx, 660, 1010, 640, 440);
          const pts = [[0.05, 0.25], [0.2, 0.2], [0.32, 0.42], [0.45, 0.35], [0.58, 0.6], [0.7, 0.52], [0.82, 0.8], [0.94, 0.92]];
          const e = E.lineChart(ctx, 380, 860, 560, 290, pts, eOut(prog(lt, 1.05, 0.7)), C.red, { area: true });
          E.explosion(ctx, e[0], e[1], lt, 1.75, { size: 0.7, seed: 3 });
          E.pill(ctx, '-2,16 %', 820, 845, 46, C.red, C.white, pop(lt, 1.6, 0.4), 0.06);
        });
        panda(ctx, 'emotions/ueberrascht', lt, t, { x: 220, h: 560 });
      },
    },
    { // B 2-5,75 s: weniger iPhones -> mindestens -15 %
      start: 2.0, mood: 'bad', poses: ['emotions/nachdenklich', 'emotions/wuetend'], shake: [2.5], focus: { x: 620, y: 900 }, zoom: 0.05,
      sfx: [[0.95, 'pop', 0.6], [1.35, 'pop', 0.5], [1.75, 'down', 0.6]],
      draw(ctx, lt, t) {
        if (lt < 1.75) E.headline(ctx, [{ t: 'WENIGER', c: C.red, size: 140 }, { t: 'iPHONES', c: C.white }], lt);
        else E.headline(ctx, [{ t: 'MINDESTENS', c: C.white, size: 130 }], lt - 1.75);
        const dim = 1 - 0.65 * eOut(prog(lt, 2.3, 0.4)), gone = [1, 3, 5, 8];
        ctx.save(); ctx.globalAlpha = dim;
        for (let i = 0; i < 9; i++) {
          const gx = 470 + (i % 3) * 190, gy = 720 + Math.floor(i / 3) * 250, gi = gone.indexOf(i), tg = 0.95 + gi * 0.2;
          if (gi >= 0 && lt > tg) {
            const p = prog(lt, tg, 0.45);
            ctx.save(); ctx.globalAlpha *= 1 - p; E.iphone(ctx, gx, gy, 210 * (1 - p * 0.4), { label: '18 PRO' }); ctx.restore();
            E.comicText(ctx, 'X', gx, gy, { size: 160, fill: C.red, scale: pop(lt, tg + 0.05, 0.45) });
          } else E.withT(ctx, gx, gy, pop(lt, 0.05 + i * 0.07, 0.45), Math.sin(t * 2 + i) * 0.03, () => E.iphone(ctx, 0, 0, 210, { label: '18 PRO' }));
        }
        ctx.restore();
        E.explosion(ctx, 600, 860, lt, 2.5, { size: 1.3, seed: 5, dur: 1.0 });
        E.comicText(ctx, '-15 %', 600, 860, { size: 280, fill: C.red, scale: pop(lt, 2.45, 0.5), rot: -0.06, lw: 44 });
        if (lt < 2.5) panda(ctx, 'emotions/nachdenklich', lt, t, { x: 200, h: 520 });
        else panda(ctx, 'emotions/wuetend', lt, t, { x: 200, h: 520, enter: false, swapAt: 2.5 });
      },
    },
    { // C 5,75-10 s: Warum das Topmodell? KI? -> Jetzt!
      start: 5.75, mood: 'dark', poses: ['emotions/nachdenklich', 'poses/tipp_geben'], focus: { x: 620, y: 860 }, zoom: 0.06,
      sfx: [[2.5, 'pop', 0.6], [3.65, 'ping', 0.6]],
      draw(ctx, lt, t) {
        const second = lt >= 2.5, third = lt >= 3.6;
        if (third) E.headline(ctx, [{ t: 'DAS ERFÄHRST', c: C.white, size: 115 }, { t: 'DU JETZT!', c: C.green, size: 150 }], lt - 3.6);
        else if (second) E.headline(ctx, [{ t: 'UND WAS HAT', c: C.white, size: 115 }, { t: 'KI DAMIT ZU TUN?', c: C.cyan, size: 120 }], lt - 2.5);
        else E.headline(ctx, [{ t: 'WARUM DAS', c: C.white, size: 120 }, { t: 'TOPMODELL?', c: C.yellow, size: 140 }], lt);
        const g = ctx.createRadialGradient(620, 1000, 40, 620, 900, 520); g.addColorStop(0, 'rgba(255,240,190,0.45)'); g.addColorStop(1, 'rgba(255,240,190,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(470, 380); ctx.lineTo(770, 380); ctx.lineTo(980, 1240); ctx.lineTo(260, 1240); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.ellipse(620, 1200, 260, 50, 0, 0, 7); E.ink(ctx, '#3B4150', 8);
        E.rr(ctx, 360, 1130, 520, 70, 10); E.ink(ctx, '#4C5468', 8);
        ctx.beginPath(); ctx.ellipse(620, 1130, 260, 50, 0, 0, 7); E.ink(ctx, '#646E86', 8);
        const weak = eInOut(prog(lt, 1.3, 0.9));
        E.withT(ctx, 620, 860 + weak * 20, pop(lt, 0.1, 0.5), -weak * 0.08, () => E.iphone(ctx, 0, 0, 480, { label: 'iPHONE 18 PRO', c1: '#C9B79C', c2: '#8E7D63', crack: weak > 0.5 }));
        E.withT(ctx, 620 + weak * 140, 590 + weak * weak * 160, pop(lt, 0.4, 0.5), weak * 0.7, () => {
          ctx.beginPath(); ctx.moveTo(-90, 40); ctx.lineTo(-100, -40); ctx.lineTo(-50, 0); ctx.lineTo(0, -60); ctx.lineTo(50, 0); ctx.lineTo(100, -40); ctx.lineTo(90, 40); ctx.closePath(); E.ink(ctx, C.gold, 8);
        });
        if (weak > 0) E.arrowDown(ctx, 880, 1000 + Math.sin(lt * 3) * 10, 0.8 * pop(lt, 1.5, 0.5), C.red);
        if (second) {
          const lt2 = lt - 2.5;
          E.withT(ctx, 870, 600, pop(lt2, 0, 0.5), 0, () => E.chip(ctx, 0, 0, 190, 'KI', { glow: 0.85 + Math.sin(lt * 4) * 0.15 }));
          E.questionMarks(ctx, 860, 900, lt2 * 0.7, 3, C.yellow);
        }
        if (!third) panda(ctx, 'emotions/nachdenklich', lt, t, { x: 215, h: 520 });
        else panda(ctx, 'poses/tipp_geben', lt, t, { x: 215, h: 540, enter: false, swapAt: 3.6 });
      },
    },
    { // D 10-12,5 s: Laut Nikkei Asia ... bei Zulieferern
      start: 10.0, mood: 'blue', poses: ['poses/praesentieren'], focus: { x: 640, y: 880 }, sfx: [[0.05, 'paper', 0.8]],
      draw(ctx, lt, t) {
        if (lt < 1.6) E.headline(ctx, [{ t: 'LAUT', c: C.white, size: 110 }, { t: 'NIKKEI ASIA', c: C.yellow, size: 140 }], lt);
        else E.headline(ctx, [{ t: 'APPLE KÜRZT', c: C.white, size: 120 }, { t: 'BEI ZULIEFERERN', c: C.yellow, size: 110 }], lt - 1.6);
        const p = eOut(prog(lt, 0.05, 0.75));
        E.withT(ctx, 660, 930, lerp(0.05, 1, p), lerp(Math.PI * 2, -0.06, p), () => E.newspaper(ctx, 0, 0, 580, {
          masthead: 'NIKKEI ASIA', headline: ['APPLE KÜRZT', 'iPHONE-ORDERS'],
          picture: (x, y, w, h) => { E.iphone(ctx, x + w * 0.4, y + h * 0.5, h * 0.8, {}); E.arrowDown(ctx, x + w * 0.78, y + h * 0.45, 0.45, C.red); },
        }));
        E.withT(ctx, 920, 600, pop(lt, 0.6, 0.5), Math.sin(lt * 1.5) * 0.08, () => {
          ctx.beginPath(); ctx.arc(0, 0, 70, 0, 7); E.ink(ctx, '#4FA3F7', 7);
          ctx.fillStyle = C.green; ctx.beginPath(); ctx.ellipse(-15, -10, 30, 22, 0.4, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(25, 25, 18, 12, -0.3, 0, 7); ctx.fill();
          ctx.beginPath(); ctx.arc(0, 0, 70, 0, 7); E.ink(ctx, null, 7);
        });
        panda(ctx, 'poses/praesentieren', lt, t, { x: 230, h: 560 });
      },
    },
    { // E 12,5-15,5 s: Bestellung gekuerzt
      start: 12.5, mood: 'neutral', poses: ['poses/analysieren'], shake: [2.33], shakeSfx: 'stamp', focus: { x: 640, y: 900 }, zoom: 0.06,
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'BESTELLUNG', c: C.white, size: 130 }, { t: 'iPHONE 18 PRO & MAX', c: C.yellow, size: 92 }], lt);
        const cut = lt >= 2.33;
        E.withT(ctx, 660, 920, pop(lt, 0.05, 0.5), -0.03, () => {
          E.clipboard(ctx, 0, 0, 560, 640);
          E.plainText(ctx, 'BESTELLUNG', 0, -210, 54, C.ink, { weight: 900 });
          ctx.fillStyle = C.ink; ctx.fillRect(-200, -172, 400, 6);
          [['iPHONE 18 PRO', 0.85], ['iPHONE 18 PRO MAX', 1.7]].forEach(([name, at], i) => {
            const s = pop(lt, at, 0.45), y = -90 + i * 170; if (s <= 0) return;
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
    { // F 15,5-19 s: Oktober, 15 % weniger als geplant
      start: 15.5, mood: 'bad', poses: ['poses/zeigen'], focus: { x: 470, y: 900 }, zoom: 0.05, sfx: [[1.6, 'pop', 0.7]],
      draw(ctx, lt, t) {
        if (lt < 1.5) E.headline(ctx, [{ t: 'IM OKTOBER', c: C.white, size: 135 }], lt);
        else E.headline(ctx, [{ t: 'WENIGER ALS', c: C.white, size: 110 }, { t: 'GEPLANT!', c: C.red, size: 150 }], lt - 1.5);
        E.whiteboard(ctx, 460, 900, 660, 600);
        E.withT(ctx, 230, 680, pop(lt, 0.1, 0.45), -0.08, () => { E.rr(ctx, -70, -70, 140, 150, 14); E.ink(ctx, C.white, 7); E.rr(ctx, -70, -70, 140, 45, 14); E.ink(ctx, C.red, 7); E.plainText(ctx, 'OKT', 0, -46, 30, C.white, { weight: 900 }); E.plainText(ctx, '10', 0, 25, 64, C.ink, { weight: 900 }); });
        const base = 1130, maxH = 380;
        const h1 = maxH * eOut(prog(lt, 0.2, 0.7)), h2 = maxH * lerp(0, 0.85, eOut(prog(lt, 0.8, 0.8)));
        E.rr(ctx, 300, base - h1, 140, Math.max(h1, 1), 10); E.ink(ctx, C.green, 7);
        E.rr(ctx, 520, base - h2, 140, Math.max(h2, 1), 10); E.ink(ctx, C.red, 7);
        E.plainText(ctx, 'GEPLANT', 370, base + 40, 32, C.ink, { weight: 900 }); E.plainText(ctx, 'NEU', 590, base + 40, 32, C.ink, { weight: 900 });
        if (h1 > 40) E.plainText(ctx, '100 %', 370, base - h1 + 35, 34, C.white, { weight: 900 });
        if (h2 > 40) E.plainText(ctx, '85 %', 590, base - h2 + 35, 34, C.white, { weight: 900 });
        if (lt > 1.5) { ctx.save(); ctx.globalAlpha = prog(lt, 1.5, 0.4); ctx.setLineDash([16, 12]); ctx.strokeStyle = C.red; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(510, base - maxH); ctx.lineTo(680, base - maxH); ctx.stroke(); ctx.setLineDash([]);
          E.rr(ctx, 520, base - maxH, 140, maxH * 0.15, 6); ctx.fillStyle = 'rgba(240,54,43,0.25)'; ctx.fill(); ctx.restore(); }
        E.pill(ctx, '-15 %', 690, base - maxH - 50, 64, C.red, C.white, pop(lt, 1.6, 0.45), 0.08);
        panda(ctx, 'poses/zeigen', lt, t, { x: 880, h: 500, flip: true, from: 'right' });
      },
    },
    { // G 19-21,9 s: Nachfrage schwaecher als erwartet
      start: 19.0, mood: 'bad', poses: ['emotions/traurig'], focus: { x: 520, y: 900 }, zoom: 0.05, sfx: [[1.2, 'down', 0.6], [2.0, 'pop', 0.6]],
      draw(ctx, lt, t) {
        if (lt < 1.0) E.headline(ctx, [{ t: 'DER GRUND?', c: C.white, size: 140 }], lt);
        else E.headline(ctx, [{ t: 'NACHFRAGE', c: C.white, size: 130 }, { t: 'SCHWÄCHER!', c: C.red, size: 140 }], lt - 1.0);
        const exp = 0.8;
        const v = lt < 1.2 ? exp + Math.sin(lt * 5) * 0.015 : lerp(exp, 0.16, eInOut(prog(lt, 1.2, 1.1)));
        E.withT(ctx, 470, 980, pop(lt, 0.05, 0.5), 0, () => E.gauge(ctx, 0, 0, 290, v, { label: 'NACHFRAGE', ghost: lt > 1.2 ? exp : null, ghostAlpha: 0.9 }));
        if (lt > 2.0) E.pill(ctx, 'ERWARTET', 470 + Math.cos(Math.PI + exp * Math.PI) * 360 + 30, 980 + Math.sin(Math.PI + exp * Math.PI) * 360 - 20, 40, C.greenD, C.white, pop(lt, 2.0, 0.45), 0.1);
        if (lt > 1.6) E.arrowDown(ctx, 160, 700 + Math.sin(lt * 3) * 12, 0.7 * pop(lt, 1.6, 0.5), C.red);
        panda(ctx, 'emotions/traurig', lt, t, { x: 905, h: 470, from: 'right' });
      },
    },
    { // H 21,9-27,45 s: Und der Preis -> Pro 1.199 $ / Pro Max 1.299 $
      start: 21.9, mood: 'neutral', poses: ['emotions/nachdenklich', 'poses/zeigen'], focus: { x: 640, y: 880 }, zoom: 0.06,
      sfx: [[2.55, 'cash', 0.7], [3.75, 'cash', 0.8]],
      draw(ctx, lt, t) {
        const P = 1.4; // ab hier: Preise
        if (lt < P) E.headline(ctx, [{ t: 'UND DER', c: C.white, size: 110 }, { t: 'PREIS!', c: C.yellow, size: 160 }], lt);
        else E.headline(ctx, [{ t: 'SO TEUER', c: C.white, size: 120 }, { t: 'IST DAS iPHONE 18', c: C.yellow, size: 90 }], lt - P);
        const away = eInOut(prog(lt, P - 0.2, 0.5));
        if (away < 1) {
          const sw = Math.sin(lt * 2.4) * 0.22 * Math.exp(-lt * 0.6);
          ctx.save(); ctx.globalAlpha = 1 - away;
          E.withT(ctx, 680, 640 - away * 200, 1, sw, () => E.priceTag(ctx, 0, 330, 560, '$$$', { color: C.yellow, scale: pop(lt, 0.05, 0.55) }));
          ctx.beginPath(); ctx.arc(680, 640 - away * 200, 14, 0, 7); E.ink(ctx, C.greyD, 6); ctx.restore();
        }
        if (lt > P - 0.1) {
          const l2 = lt - P;
          E.withT(ctx, 520, 820, pop(l2, 0.0, 0.5), -0.05, () => E.iphone(ctx, 0, 0, 380, { label: 'PRO', c1: '#C9B79C', c2: '#8E7D63' }));
          E.withT(ctx, 840, 800, pop(l2, 0.2, 0.5), 0.05, () => E.iphone(ctx, 0, 0, 440, { label: 'PRO MAX', c1: '#9AA6B8', c2: '#5D6B80' }));
          E.priceTag(ctx, 520, 1100, 300, '1.199 $', { color: C.yellow, scale: pop(l2, 1.15, 0.45), rot: Math.sin(lt * 2.5) * 0.04 - 0.05 });
          if (l2 > 3.0) E.burst(ctx, 850, 1120, 150, 230, 14, C.yellow, lt * 0.3, 7);
          E.priceTag(ctx, 850, 1120, 320, '1.299 $', { color: C.orange, scale: pop(l2, 2.35, 0.45) * (l2 > 3.0 ? 1.08 : 1), rot: Math.sin(lt * 2.5 + 1) * 0.04 + 0.04 });
          if (l2 > 3.0) E.comicText(ctx, 'FAST 1.300 $!', 700, 1260, { size: 80, fill: C.red, scale: pop(l2, 3.0, 0.45), rot: -0.05 });
        }
        if (lt < P) panda(ctx, 'emotions/nachdenklich', lt, t, { x: 200, h: 500 });
        else panda(ctx, 'poses/zeigen', lt, t, { x: 180, h: 460, enter: false, swapAt: P });
      },
    },
    { // I 27,45-29,45 s: +100 $ mehr als beim Vorgaenger
      start: 27.45, mood: 'bad', poses: ['emotions/ueberrascht'], focus: { x: 600, y: 880 }, zoom: 0.05, sfx: [[0.3, 'cash', 0.8]],
      draw(ctx, lt, t) {
        E.moneyRain(ctx, lt, 0.3, { x: 600, n: 7, seed: 21, spread: 900, fall: true });
        E.headline(ctx, [{ t: '+100 $', c: C.red, size: 170 }, { t: 'TEURER ALS VORHER', c: C.white, size: 88 }], lt);
        E.withT(ctx, 400, 880, pop(lt, 0.05, 0.5), 0, () => { ctx.globalAlpha = 0.75; E.iphone(ctx, 0, 0, 330, { label: '17 PRO', c1: '#B0B4BC', c2: '#7A7F88' }); ctx.globalAlpha = 1; });
        E.withT(ctx, 800, 860, pop(lt, 0.2, 0.5), 0, () => E.iphone(ctx, 0, 0, 380, { label: '18 PRO', c1: '#C9B79C', c2: '#8E7D63' }));
        E.priceTag(ctx, 400, 1120, 280, '1.099 $', { color: C.white, scale: pop(lt, 0.15, 0.45) });
        if (lt > 0.45) { const q = eOut(prog(lt, 0.45, 0.35)); ctx.strokeStyle = C.red; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(300, 1150 - 30 * q); ctx.lineTo(300 + 210 * q, 1095); ctx.stroke(); }
        E.priceTag(ctx, 800, 1140, 300, '1.199 $', { color: C.yellow, scale: pop(lt, 0.35, 0.45) });
        E.withT(ctx, 600, 870, pop(lt, 0.3, 0.45), 0, () => { ctx.beginPath(); ctx.moveTo(-60, -22); ctx.lineTo(20, -22); ctx.lineTo(20, -50); ctx.lineTo(70, 0); ctx.lineTo(20, 50); ctx.lineTo(20, 22); ctx.lineTo(-60, 22); ctx.closePath(); E.ink(ctx, C.red, 7); });
        if (lt > 1.25) E.pill(ctx, 'VORGÄNGER', 400, 640, 40, C.greyD, C.white, pop(lt, 1.25, 0.45), -0.06);
        panda(ctx, 'emotions/ueberrascht', lt, t, { x: 170, h: 430 });
      },
    },
    { // J 29,45-32,85 s: KI-Rechenzentren kaufen Speicherchips leer
      start: 29.45, mood: 'dark', poses: ['emotions/cool', 'emotions/ueberrascht'], shake: [2.75], shakeSfx: 'stamp', focus: { x: 640, y: 880 }, zoom: 0.05,
      draw(ctx, lt, t) {
        if (lt < 1.75) E.headline(ctx, [{ t: 'KI-RECHENZENTREN', c: C.cyan, size: 110 }, { t: 'KAUFEN ALLES!', c: C.white, size: 115 }], lt);
        else E.headline(ctx, [{ t: 'SPEICHERCHIPS', c: C.white, size: 120 }, { t: 'AUSVERKAUFT!', c: C.red, size: 130 }], lt - 1.75);
        for (let i = 0; i < 3; i++) E.withT(ctx, 0, (1 - eOut(prog(lt, i * 0.12, 0.6))) * 900, 1, 0, () => E.serverRack(ctx, 330 + i * 230, 760, 200, 470, t * 0.6, i + 2));
        E.withT(ctx, 640, 640, pop(lt, 0.3, 0.5), 0, () => E.chip(ctx, 0, 0, 170, 'KI', { glow: 0.9 + Math.sin(lt * 4) * 0.1 }));
        const cx = lerp(1300, 760, eOut(prog(lt, 0.8, 0.9)));
        E.cart(ctx, cx, 1300, 300, lt);
        const n = 3 + Math.floor(prog(lt, 1.8, 0.8) * 5);
        for (let i = 0; i < n; i++) E.ramStick(ctx, cx - 110 + (i % 3) * 100, 1130 - Math.floor(i / 3) * 45, 120, (i - 2) * 0.15);
        for (let k = 0; k < 4; k++) { const p = prog(lt, 1.8 + k * 0.2, 0.5); if (p > 0 && p < 1) E.ramStick(ctx, lerp(-100, cx - 50, p), lerp(900, 1100, p) - Math.sin(p * Math.PI) * 160, 115, p * 2); }
        E.stamp(ctx, 'LEER!', 640, 960, lt, 2.75, { size: 150, rot: -0.18 });
        if (lt < 1.75) panda(ctx, 'emotions/cool', lt, t, { x: 200, h: 500 });
        else panda(ctx, 'emotions/ueberrascht', lt, t, { x: 200, h: 480, enter: false, swapAt: 1.75 });
      },
    },
    // ================= Teil 2 =================
    { // 16 Laut TrendForce
      start: 32.7, mood: 'blue', poses: ['poses/analysieren'], focus: { x: 640, y: 880 }, sfx: [[0.0, 'paper']],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'LAUT', c: C.white, size: 110 }, { t: 'TRENDFORCE', c: C.yellow, size: 140 }], lt);
        E.withT(ctx, 660, 930, pop(lt, 0.03, 0.4), -0.04, () => {
          report(ctx, 0, 0, 520, 620, 'KOSTEN-ANALYSE');
          [0.35, 0.5, 0.62, 0.8, 1].forEach((v, i) => { const h = 300 * v * eOut(prog(lt, 0.2 + i * 0.08, 0.35)); E.rr(ctx, -200 + i * 85, 240 - h, 60, Math.max(1, h), 6); E.ink(ctx, i === 4 ? C.red : '#8FB8F2', 5); });
          E.plainText(ctx, 'iPHONE 18 PRO', 0, -120, 34, C.greyD, { weight: 900 });
        });
        magnifier(ctx, 560 + Math.sin(lt * 2.4) * 120, 980 - Math.cos(lt * 2) * 60, 95, null);
        panda(ctx, 'poses/analysieren', lt, t, { x: 210, h: 500 });
      },
    },
    { // 17 Herstellung +38 %
      start: 33.75, mood: 'bad', poses: ['emotions/ueberrascht'], shake: [1.85], focus: { x: 640, y: 880 }, sfx: [[1.5, 'cash', 0.6]],
      draw(ctx, lt, t) {
        if (lt < 1.25) E.headline(ctx, [{ t: 'HERSTELLUNG', c: C.white, size: 130 }, { t: 'iPHONE 18 PRO', c: C.yellow, size: 100 }], lt);
        else E.headline(ctx, [{ t: '+38 %', c: C.red, size: 160 }, { t: 'TEURER!', c: C.white, size: 120 }], lt - 1.25);
        E.withT(ctx, 520, 860, pop(lt, 0.05), -0.04, () => E.iphone(ctx, 0, 0, 430, { label: '18 PRO', c1: '#C9B79C', c2: '#8E7D63' }));
        // Kostenbalken
        const bx = 800, by = 1180, base = 280, v = lerp(1, 1.38, E.eInOut(prog(lt, 1.4, 0.7))), h = base * v * eOut(prog(lt, 0.2, 0.5));
        E.rr(ctx, bx - 70, by - 470, 140, 470, 20); E.ink(ctx, C.white, 8);
        E.rr(ctx, bx - 55, by - 15 - h, 110, Math.max(1, h), 14); E.ink(ctx, v > 1.05 ? C.red : C.orange, 0);
        ctx.setLineDash([14, 10]); ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(bx - 90, by - 15 - base); ctx.lineTo(bx + 90, by - 15 - base); ctx.stroke(); ctx.setLineDash([]);
        E.plainText(ctx, 'KOSTEN', bx, by + 40, 40, C.ink, { weight: 900 });
        E.plainText(ctx, 'VORHER', bx + 150, by - 15 - base, 28, C.greyD, { weight: 900 });
        if (lt > 1.4) E.arrowUp(ctx, bx, by - 15 - h - 90 + Math.sin(lt * 7) * 8, 0.75 * pop(lt, 1.6), C.red);
        coinStack(ctx, 640, 1240, 48, Math.min(9, Math.floor(prog(lt, 1.5, 1.0) * 9)));
        panda(ctx, 'emotions/ueberrascht', lt, t, { x: 190, h: 470 });
      },
    },
    { // 18 Zwickmuehle
      start: 37.25, mood: 'neutral', poses: ['emotions/nachdenklich'], shake: [0.9], focus: { x: 620, y: 880 }, sfx: [[0.2, 'pop']],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'APPLE IN DER', c: C.white, size: 110 }, { t: 'ZWICKMÜHLE!', c: C.red, size: 145 }], lt);
        const sq = 0.5 + 0.5 * Math.sin(Math.max(0, lt - 0.5) * 7);
        const gap = lerp(230, 165, eOut(prog(lt, 0.3, 0.6))) - sq * 10 * (lt > 0.9);
        vise(ctx, 640, 900, gap, lt);
        E.withT(ctx, 640, 905, pop(lt, 0.05), 0, () => { ctx.scale(lerp(1, 0.82, (230 - gap) / 75), lerp(1, 1.1, (230 - gap) / 75)); E.apple(ctx, 0, 0, 150, C.red); });
        for (let i = 0; i < 3; i++) { const ph = (lt * 1.4 + i * 0.33) % 1; ctx.globalAlpha = 1 - ph; ctx.beginPath(); const sx = 640 + (i - 1) * 150, sy = 700 + ph * 80; ctx.moveTo(sx, sy - 26); ctx.quadraticCurveTo(sx + 18, sy, sx, sy + 12); ctx.quadraticCurveTo(sx - 18, sy, sx, sy - 26); E.ink(ctx, '#7CC8FF', 4); ctx.globalAlpha = 1; }
        panda(ctx, 'emotions/nachdenklich', lt, t, { x: 190, h: 480 });
      },
    },
    { // 19 Preise rauf -> Kunden weg
      start: 39.2, mood: 'bad', poses: ['emotions/traurig'], focus: { x: 620, y: 880 }, sfx: [[0.05, 'cash', 0.6], [0.85, 'down', 0.7]],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'PREISE RAUF?', c: C.red, size: 135 }, ...(lt > 0.8 ? [{ t: 'KUNDEN WEG!', c: C.white, size: 120 }] : [])], lt);
        E.withT(ctx, 560, 720, 1, Math.sin(lt * 3) * 0.06, () => E.priceTag(ctx, 0, 0, 360, '1.299 $', { color: C.orange, scale: pop(lt, 0.05) }));
        E.arrowUp(ctx, 830, 700 + Math.sin(lt * 6) * 10, 0.8 * pop(lt, 0.2), C.red);
        for (let i = 0; i < 4; i++) {
          const run = prog(lt, 0.9 + i * 0.1, 1.0), x = lerp(380 + i * 120, 1300 + i * 80, E.eIn(run) * 0.9 + run * 0.1);
          stickman(ctx, x, 1080 + (i % 2) * 70, 1.05, lt * 16 + i, C.ink);
          if (run > 0 && run < 1) { ctx.fillStyle = 'rgba(150,120,90,0.35)'; ctx.beginPath(); ctx.arc(x - 70, 1160 + (i % 2) * 70, 26 + run * 20, 0, 7); ctx.fill(); }
        }
        panda(ctx, 'emotions/traurig', lt, t, { x: 170, h: 440 });
      },
    },
    { // 20 Preise halten -> Marge schrumpft
      start: 40.75, mood: 'neutral', poses: ['emotions/wuetend'], focus: { x: 620, y: 900 }, sfx: [[0.1, 'stamp', 0.5], [1.0, 'down', 0.7]],
      draw(ctx, lt, t) {
        if (lt < 1.0) E.headline(ctx, [{ t: 'PREISE', c: C.white, size: 120 }, { t: 'HALTEN?', c: C.yellow, size: 140 }], lt);
        else E.headline(ctx, [{ t: 'MARGE', c: C.white, size: 130 }, { t: 'SCHRUMPFT!', c: C.red, size: 140 }], lt - 1.0);
        E.withT(ctx, 470, 760, 1, -0.05, () => E.priceTag(ctx, 0, 0, 340, '1.199 $', { color: C.yellow, scale: pop(lt, 0.03) }));
        padlock(ctx, 470, 640, 0.8 * pop(lt, 0.1));
        // Margen-Muenzstapel verliert Muenzen
        const n = 10, gone = Math.floor(prog(lt, 1.0, 0.8) * 5);
        coinStack(ctx, 760, 1180, 60, n - gone);
        for (let k = 0; k < gone; k++) { const tt = lt - (1.0 + k * 0.16); if (tt > 0 && tt < 0.8) { ctx.globalAlpha = 1 - tt / 0.8; coin(ctx, 760 + tt * 420, 1180 - (n - 1 - k) * 19 - tt * 260 + tt * tt * 700, 60); ctx.globalAlpha = 1; } }
        E.pill(ctx, 'MARGE', 760, 1260, 40, C.greyD, C.white, pop(lt, 0.3));
        if (lt > 1.0) E.arrowDown(ctx, 920, 900 + Math.sin(lt * 6) * 10, 0.7 * pop(lt, 1.0), C.red);
        panda(ctx, 'emotions/wuetend', lt, t, { x: 170, h: 440 });
      },
    },
    { // 21 Und die Boerse?
      start: 42.75, mood: 'blue', poses: ['emotions/nachdenklich'], focus: { x: 620, y: 900 }, sfx: [[0.05, 'pop']],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'UND DIE', c: C.white, size: 110 }, { t: 'BÖRSE?', c: C.yellow, size: 160 }], lt);
        E.withT(ctx, 0, (1 - eOut(prog(lt, 0, 0.35))) * 300, 1, 0, () => exchange(ctx, 640, 1200, 620));
        E.questionMarks(ctx, 640, 640, lt, 3, C.blue);
        panda(ctx, 'emotions/nachdenklich', lt, t, { x: 190, h: 460, enter: false });
      },
    },
    { // 22 Vorboerslich leicht nach
      start: 43.5, mood: 'bad', poses: ['poses/zeigen'], focus: { x: 660, y: 880 }, sfx: [[0.9, 'down', 0.5]],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'VORBÖRSLICH', c: C.white, size: 125 }, { t: 'LEICHT IM MINUS', c: C.red, size: 100 }], lt);
        E.whiteboard(ctx, 650, 900, 700, 500);
        E.apple(ctx, 375, 730, 40, C.red); E.plainText(ctx, 'APPLE', 460, 732, 40, C.ink, { weight: 900, align: 'left' });
        const pts = [[0.05, 0.55], [0.18, 0.45], [0.3, 0.5], [0.42, 0.38], [0.55, 0.42], [0.66, 0.35], [0.76, 0.4], [0.88, 0.5]];
        const p = eOut(prog(lt, 0.1, 1.0)), col = p > 0.8 ? C.red : C.green;
        E.lineChart(ctx, 330, 770, 640, 320, pts, p, col, { area: true });
        // Uhr (vor Handelsstart)
        E.withT(ctx, 890, 730, pop(lt, 0.3), 0, () => { ctx.beginPath(); ctx.arc(0, 0, 50, 0, 7); E.ink(ctx, C.white, 7); ctx.strokeStyle = C.ink; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -32); ctx.moveTo(0, 0); ctx.lineTo(-24, 10); ctx.stroke(); });
        E.pill(ctx, 'VOR HANDELSSTART', 650, 1220, 36, C.greyD, C.white, pop(lt, 0.5));
        panda(ctx, 'poses/zeigen', lt, t, { x: 190, h: 460 });
      },
    },
    { // 23 5 Billionen Dollar
      start: 46.0, mood: 'good', poses: ['emotions/begeistert'], focus: { x: 600, y: 860 }, shake: [0.15], shakeSfx: 'cash',
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'BÖRSENWERT', c: C.white, size: 120 }], lt);
        E.burst(ctx, 600, 800, 250, 360, 18, C.yellow, lt * 0.5, 9);
        for (let i = 0; i < 5; i++) coinStack(ctx, 330 + i * 135, 1240 - (i % 2) * 30, 60, Math.min(4 + (i * 3) % 5, Math.floor(prog(lt, 0.1 + i * 0.05, 0.5) * 9)));
        E.comicText(ctx, '5 BIO. $', 600, 790, { size: 190, gradient: ['#FFE680', '#F5B301'], scale: pop(lt, 0.15, 0.4), rot: -0.05, lw: 34 });
        for (let i = 0; i < 8; i++) { const a = i * 0.8 + lt * 2, r = 330 + Math.sin(lt * 3 + i) * 30; const s = 0.5 + 0.5 * Math.sin(lt * 9 + i * 2); E.burst(ctx, 600 + Math.cos(a) * r, 800 + Math.sin(a) * r * 0.6, 6 * s, 24 * s, 4, C.white, 0, 3); }
        E.moneyRain(ctx, lt, 0.1, { x: 600, n: 8, seed: 33, spread: 900, fall: true });
        panda(ctx, 'emotions/begeistert', lt, t, { x: 880, h: 460, from: 'right' });
      },
    },
    { // 24 Genauer hinschauen
      start: 47.5, mood: 'blue', poses: ['poses/tipp_geben'], focus: { x: 620, y: 880 }, sfx: [[0.1, 'ping', 0.7]],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'ABER GENAU', c: C.white, size: 115 }, { t: 'HINSCHAUEN!', c: C.yellow, size: 140 }], lt);
        const mx = lerp(900, 640, eOut(prog(lt, 0, 0.5))), my = 900 + Math.sin(lt * 2) * 20;
        E.withT(ctx, 640, 900, 1, 0, () => { E.apple(ctx, 0, 0, 120, C.red); });
        magnifier(ctx, mx, my, 170, () => { ctx.translate(mx, my); ctx.scale(1.7, 1.7); ctx.translate(-mx, -my); E.apple(ctx, 640, 900, 120, C.red); ctx.setTransform(ctx.getTransform()); warn(ctx, 640 + 50, 900 - 40, 0.6 * pop(lt, 0.6)); });
        panda(ctx, 'poses/tipp_geben', lt, t, { x: 190, h: 480 });
      },
    },
    { // 25 Das heisst fuer dich
      start: 48.75, mood: 'good', poses: ['poses/zeigen'], focus: { x: 540, y: 880 }, sfx: [[0.05, 'pop']],
      draw(ctx, lt, t) {
        E.speedLines(ctx, 700, 800, t, 'rgba(0,80,20,0.10)');
        E.comicText(ctx, 'DAS HEISST', 540, 380, { size: 110, fill: C.white, scale: pop(lt, 0), rot: -0.04 });
        E.comicText(ctx, 'FÜR DICH!', 630, 760, { size: 140, fill: C.green, scale: pop(lt, 0.1, 0.35), rot: -0.06, lw: 30 });
        panda(ctx, 'poses/zeigen', lt, t, { x: 300, h: 640 });
      },
    },
    { // 26 KI-Boom
      start: 49.5, mood: 'dark', poses: ['emotions/cool'], shake: [0.15], focus: { x: 620, y: 860 },
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'DER KI-BOOM', c: C.cyan, size: 140 }], lt);
        E.explosion(ctx, 640, 820, lt, 0.12, { size: 1.6, seed: 12, c1: C.cyan, c2: C.white, dur: 0.9 });
        E.withT(ctx, 640, 820, pop(lt, 0.1, 0.4) * (1 + Math.sin(lt * 9) * 0.02), 0, () => E.chip(ctx, 0, 0, 260, 'KI', { glow: 1 }));
        const e = E.lineChart(ctx, 300, 900, 620, 320, [[0, 1], [0.2, 0.85], [0.4, 0.8], [0.6, 0.5], [0.8, 0.3], [1, 0]], eOut(prog(lt, 0.3, 0.6)), C.green, { lw: 16 });
        panda(ctx, 'emotions/cool', lt, t, { x: 190, h: 460 });
      },
    },
    { // 27 Chips teurer -> am Ende auch
      start: 50.5, mood: 'bad', poses: ['emotions/wuetend'], focus: { x: 640, y: 880 }, sfx: [[0.1, 'cash', 0.6], [1.0, 'whoosh', 0.7]],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'CHIPS', c: C.white, size: 120 }, { t: 'WERDEN TEURER', c: C.red, size: 115 }], lt);
        E.withT(ctx, 470, 860, pop(lt, 0.03), 0, () => E.ramStick(ctx, 0, 0, 300, -0.1));
        E.withT(ctx, 470, 1060, 1, Math.sin(lt * 4) * 0.08, () => E.priceTag(ctx, 0, 0, 260, '$$$', { color: C.orange, scale: pop(lt, 0.15) }));
        for (let i = 0; i < 3; i++) E.arrowUp(ctx, 330 + i * 140, 680 - ((lt * 200 + i * 60) % 120), 0.45 * pop(lt, 0.2 + i * 0.05), C.red);
        if (lt > 1.0) {
          const p = eOut(prog(lt, 1.0, 0.4));
          ctx.strokeStyle = C.ink; ctx.lineWidth = 12; ctx.setLineDash([22, 16]); ctx.beginPath(); ctx.moveTo(620, 860); ctx.lineTo(620 + 170 * p, 860); ctx.stroke(); ctx.setLineDash([]);
          E.withT(ctx, 870, 860, pop(lt, 1.15), 0.06, () => E.iphone(ctx, 0, 0, 330, {}));
        }
        panda(ctx, 'emotions/wuetend', lt, t, { x: 170, h: 420 });
      },
    },
    { // 28 Dein Handy!
      start: 52.6, mood: 'bad', poses: ['emotions/ueberrascht'], shake: [0.1], shakeSfx: 'cash', focus: { x: 620, y: 880 },
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'DEIN HANDY!', c: C.yellow, size: 150 }], lt);
        E.burst(ctx, 640, 860, 260, 360, 16, C.red, lt * 0.6, 9);
        E.withT(ctx, 640, 860, pop(lt, 0), Math.sin(lt * 10) * 0.04, () => E.iphone(ctx, 0, 0, 520, { label: 'iPHONE 18 PRO', c1: '#C9B79C', c2: '#8E7D63' }));
        E.withT(ctx, 760, 1080, 1, -0.12, () => E.priceTag(ctx, 0, 0, 330, '+ $$$', { color: C.yellow, scale: pop(lt, 0.12) }));
        panda(ctx, 'emotions/ueberrascht', lt, t, { x: 180, h: 440 });
      },
    },
    { // 29 Am 2. November wird's spannend
      start: 53.25, mood: 'neutral', poses: ['emotions/cool'], focus: { x: 640, y: 880 }, sfx: [[0.05, 'pop'], [0.7, 'stamp', 0.5]],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'AM 2. NOVEMBER', c: C.white, size: 110 }, { t: 'WIRD’S SPANNEND!', c: C.yellow, size: 110 }], lt);
        calendar(ctx, 650, 900, pop(lt, 0.05, 0.4), 'NOVEMBER', '02');
        if (lt > 0.7) { const p = eOut(prog(lt, 0.7, 0.45)); ctx.strokeStyle = C.red; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.beginPath(); ctx.ellipse(650, 960, 175, 120, -0.1, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2.1); ctx.stroke(); }
        for (let i = 0; i < 6; i++) { const a = i * 1.05 + lt * 1.5, s = 0.5 + 0.5 * Math.sin(lt * 8 + i * 1.7); E.burst(ctx, 650 + Math.cos(a) * 300, 900 + Math.sin(a) * 260, 8 * s, 30 * s, 4, C.yellow, 0, 4); }
        panda(ctx, 'emotions/cool', lt, t, { x: 180, h: 450 });
      },
    },
    { // 30 Quartalszahlen
      start: 55.2, mood: 'blue', poses: ['poses/praesentieren'], focus: { x: 640, y: 880 }, sfx: [[0.0, 'paper']],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'APPLE LEGT', c: C.white, size: 110 }, { t: 'ZAHLEN VOR', c: C.yellow, size: 140 }], lt);
        E.withT(ctx, 680, 920, pop(lt, 0.03, 0.4), 0.03, () => {
          report(ctx, 0, 0, 500, 600, 'QUARTALSZAHLEN');
          E.apple(ctx, -150, -120, 50, C.red);
          [['UMSATZ', 0.7], ['GEWINN', 0.55], ['iPHONE', 0.6]].forEach(([n, v], i) => { const y = -40 + i * 110, w = 300 * v * eOut(prog(lt, 0.4 + i * 0.15, 0.4));
            E.plainText(ctx, n, -200, y, 30, C.ink, { weight: 900, align: 'left' }); E.rr(ctx, -200, y + 22, Math.max(1, w), 34, 8); E.ink(ctx, '#8FB8F2', 4);
            E.plainText(ctx, '?', -200 + w + 30, y + 40, 40, C.greyD, { weight: 900 }); });
        });
        panda(ctx, 'poses/praesentieren', lt, t, { x: 210, h: 520 });
      },
    },
    { // 31 Spiegeln sich die Probleme?
      start: 57.2, mood: 'neutral', poses: ['emotions/nachdenklich'], focus: { x: 640, y: 900 }, pops: [0.35, 1.1, 1.85], sfx: [[2.6, 'ping', 0.6]],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'ZEIGEN SICH', c: C.white, size: 115 }, { t: 'DIE PROBLEME?', c: C.red, size: 120 }], lt);
        E.withT(ctx, 660, 930, pop(lt, 0.02, 0.4), -0.03, () => {
          report(ctx, 0, 0, 560, 620, 'CHECKLISTE');
          [['NACHFRAGE', '▼', C.red], ['KOSTEN +38 %', '▲', C.red], ['MARGE', '▼', C.red]].forEach(([n, arr, c], i) => {
            const s = pop(lt, 0.35 + i * 0.75, 0.3); if (s <= 0) return;
            E.withT(ctx, 0, -80 + i * 140, s, 0, () => { warn(ctx, -200, 0, 0.8); E.plainText(ctx, n, -130, 4, 40, C.ink, { weight: 900, align: 'left' }); E.plainText(ctx, arr, 210, 4, 46, c, { weight: 900 }); });
          });
        });
        if (lt > 2.6) E.questionMarks(ctx, 660, 560, lt - 2.6, 3, C.red);
        panda(ctx, 'emotions/nachdenklich', lt, t, { x: 180, h: 450 });
      },
    },
    { // 32 Outro
      start: 60.7, mood: 'good', poses: ['emotions/freundlich'], focus: { x: 540, y: 900 }, sfx: [[0.95, 'ping'], [1.35, 'pop']],
      draw(ctx, lt, t) {
        if (lt < 0.95) E.headline(ctx, [{ t: 'DAS WERDEN', c: C.white, size: 120 }, { t: 'WIR SEHEN!', c: C.green, size: 150 }], lt);
        else E.headline(ctx, [{ t: 'MEHR', c: C.white, size: 130 }, { t: 'BÖRSENNEWS?', c: C.green, size: 140 }], lt - 0.95);
        panda(ctx, 'emotions/freundlich', lt, t, { x: 540, h: 560, y: 1090, from: 'right' });
        if (lt > 0.95) {
          const s = pop(lt, 0.95, 0.4), tap = lt > 1.35 ? lerp(0.92, 1, eBack(prog(lt, 1.35, 0.25))) : 1;
          E.withT(ctx, 540, 1210, s * tap, 0, () => {
            E.rr(ctx, -330, -70, 660, 140, 70); E.ink(ctx, C.white, 9);
            E.rr(ctx, -310, -55, 110, 110, 55); E.ink(ctx, C.ink, 0);
            E.plainText(ctx, 'PI', -255, 4, 50, C.green, { weight: 900 });
            E.plainText(ctx, 'panda_investiert', -170, -18, 34, C.ink, { weight: 900, align: 'left' });
            E.rr(ctx, -170, 8, 300, 50, 25); E.ink(ctx, C.green, 0); E.plainText(ctx, 'FOLGEN', -20, 35, 32, C.white, { weight: 900 });
          });
          if (lt > 1.35) { const p = prog(lt, 1.35, 0.4); ctx.globalAlpha = 1 - p; ctx.strokeStyle = C.green; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(560, 1245, 30 + p * 60, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
        }
      },
    },
  ];

  window.VIDEO = { name: 'apple-iphone18', fps: 30, duration: 62.6, audioStart: 0, scenes, captions };
})();
