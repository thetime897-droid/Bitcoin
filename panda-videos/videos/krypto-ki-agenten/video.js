// Krypto & KI-Agenten / Eric Trump – Short (61,98 s). Zeiten = Voice-Over-Zeitachse des Originals.
// Vorlage: spacex-telekom v2 (schneller Hook mit Jump-Cuts, danach ruhig, CC0-SFX, Musikbett, kein Outro).
(() => {
  const E = window.E, C = E.C, P = E.P;
  const { pop, prog, eOut, eInOut, lerp } = E;
  const BTC = '#F7931A', ETH = '#627EEA', AI = '#8B5CF6', WLF = '#C9A227';
  const panda = (ctx, pose, lt, t, o = {}) => E.drawPanda(ctx, pose, { x: o.x ?? 200, y: o.y ?? 1405, h: o.h ?? 500, lt, t, enter: o.enter ?? true, from: o.from || ((o.x ?? 200) > 540 ? 'right' : 'left'), flip: o.flip, swapAt: o.swapAt, enterAt: o.enterAt });
  const pandaSeq = (ctx, seq, lt, t, o = {}) => { let k = 0; seq.forEach(([at], i) => { if (lt >= at) k = i; }); const [at, pose] = seq[k]; panda(ctx, pose, lt, t, k === 0 ? o : { ...o, enter: false, swapAt: at }); };
  const H = (ctx, lt, states) => { let k = 0; states.forEach(([at], i) => { if (lt >= at) k = i; }); E.headline(ctx, states[k][1], lt - states[k][0], states[k][2] || {}); };
  const ticks = (from, to, n, gain = 0.6, pan = 0) => Array.from({ length: n }, (_, i) => [from + (to - from) * Math.pow(i / (n - 1), 0.8), 'tick', gain, pan]);

  // ---------- eigene Requisiten ----------
  function cryptoCoin(ctx, x, y, r, sym, col, rot = 0) {
    E.withT(ctx, x, y, 1, rot, () => {
      ctx.beginPath(); ctx.arc(6, 10, r, 0, 7); ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); E.ink(ctx, col, Math.max(5, r * 0.08));
      ctx.beginPath(); ctx.arc(0, 0, r * 0.78, 0, 7); ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = r * 0.06; ctx.stroke();
      E.comicText(ctx, sym, 0, r * 0.06, { size: r * (sym.length > 2 ? 0.55 : 0.95), fill: C.white, shadow: false, lw: r * 0.1 });
      ctx.beginPath(); ctx.ellipse(-r * 0.4, -r * 0.45, r * 0.22, r * 0.12, -0.6, 0, 7); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fill();
    });
  }
  function robot(ctx, x, y, s, t, o = {}) {
    const bob = Math.sin(t * 3) * 8;
    E.withT(ctx, x, y + bob, s, Math.sin(t * 1.5) * 0.04, () => {
      ctx.strokeStyle = C.ink; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(0, -150); ctx.lineTo(0, -195); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -205, 16, 0, 7); E.ink(ctx, Math.sin(t * 6) > 0 ? C.cyan : AI, 6);
      E.rr(ctx, -110, -150, 220, 150, 40); E.ink(ctx, '#E5E7EB', 9);
      E.rr(ctx, -84, -124, 168, 98, 26); E.ink(ctx, '#111827', 6);
      const blink = (t % 3) < 0.12 ? 0.15 : 1;
      [-38, 38].forEach((ex) => { ctx.save(); ctx.translate(ex, -76); ctx.scale(1, blink); ctx.beginPath(); ctx.arc(0, 0, 16, 0, 7); ctx.fillStyle = C.cyan; ctx.fill(); ctx.restore(); });
      ctx.strokeStyle = C.cyan; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, -56, 22, 0.2, Math.PI - 0.2); ctx.stroke();
      E.rr(ctx, -90, 10, 180, 170, 34); E.ink(ctx, '#D1D5DB', 9);
      E.rr(ctx, -50, 50, 100, 60, 14); E.ink(ctx, AI, 6); E.plainText(ctx, 'KI', 0, 82, 40, C.white, { weight: 900 });
      const wave = o.wave ? Math.sin(t * 7) * 0.5 : 0;
      [-1, 1].forEach((d) => { E.withT(ctx, d * 100, 40, 1, d * (0.3 + (d > 0 ? wave : 0)), () => { E.rr(ctx, -18, 0, 36, 120, 18); E.ink(ctx, '#9CA3AF', 7); ctx.beginPath(); ctx.arc(0, 128, 24, 0, 7); E.ink(ctx, '#E5E7EB', 7); }); });
      if (o.hold) E.withT(ctx, 150, 140, 1, 0.2, () => o.hold());
    });
  }
  function plane(ctx, x, y, s, rot = 0) {
    E.withT(ctx, x, y, s, rot, () => {
      ctx.beginPath(); ctx.ellipse(0, 0, 150, 32, 0, 0, 7); E.ink(ctx, C.white, 8);
      ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(-80, 110); ctx.lineTo(-40, 110); ctx.lineTo(50, 0); ctx.closePath(); E.ink(ctx, '#60A5FA', 7);
      ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(-80, -100); ctx.lineTo(-45, -100); ctx.lineTo(40, 0); ctx.closePath(); E.ink(ctx, '#3B82F6', 7);
      ctx.beginPath(); ctx.moveTo(-120, -10); ctx.lineTo(-160, -70); ctx.lineTo(-130, -70); ctx.lineTo(-95, -15); ctx.closePath(); E.ink(ctx, '#3B82F6', 6);
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(-40 + i * 32, -6, 8, 0, 7); E.ink(ctx, '#7CC4F5', 3); }
      ctx.beginPath(); ctx.ellipse(130, -4, 20, 14, 0, 0, 7); E.ink(ctx, '#7CC4F5', 4);
    });
  }
  function bank(ctx, x, by, w, crossed) {
    const h = w * 0.85;
    P.softShadow(ctx, x, by, w * 0.6);
    ctx.beginPath(); ctx.moveTo(x - w * 0.58, by - h * 0.72); ctx.lineTo(x, by - h); ctx.lineTo(x + w * 0.58, by - h * 0.72); ctx.closePath(); E.ink(ctx, '#E5E7EB', 8);
    E.rr(ctx, x - w * 0.55, by - h * 0.72, w * 1.1, 30, 6); E.ink(ctx, '#D1D5DB', 7);
    for (let i = 0; i < 4; i++) { E.rr(ctx, x - w * 0.45 + i * w * 0.27, by - h * 0.62, w * 0.12, h * 0.5, 6); E.ink(ctx, '#F3F4F6', 6); }
    E.rr(ctx, x - w * 0.6, by - h * 0.12, w * 1.2, h * 0.12, 6); E.ink(ctx, '#D1D5DB', 7);
    E.plainText(ctx, 'BANK', x, by - h * 0.84, w * 0.11, C.ink, { weight: 900 });
    if (crossed > 0) { ctx.strokeStyle = C.red; ctx.lineWidth = 26; ctx.lineCap = 'round'; const p = crossed;
      ctx.beginPath(); ctx.moveTo(x - w * 0.6, by - h); ctx.lineTo(x - w * 0.6 + w * 1.2 * Math.min(1, p * 2), by - h + h * Math.min(1, p * 2)); ctx.stroke();
      if (p > 0.5) { ctx.beginPath(); ctx.moveTo(x + w * 0.6, by - h); ctx.lineTo(x + w * 0.6 - w * 1.2 * (p - 0.5) * 2, by - h + h * (p - 0.5) * 2); ctx.stroke(); } }
  }
  function megaphone(ctx, x, y, s, t) {
    E.withT(ctx, x, y, s, -0.3 + Math.sin(t * 8) * 0.03, () => {
      ctx.beginPath(); ctx.moveTo(-60, -30); ctx.lineTo(80, -90); ctx.lineTo(80, 90); ctx.lineTo(-60, 30); ctx.closePath(); E.ink(ctx, C.red, 8);
      E.rr(ctx, -110, -36, 56, 72, 12); E.ink(ctx, '#F3F4F6', 7); E.rr(ctx, -90, 30, 26, 70, 8); E.ink(ctx, C.ink, 0);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 7; ctx.lineCap = 'round';
      for (let k = 0; k < 3; k++) { const ph = (t * 1.5 + k / 3) % 1; ctx.globalAlpha = 1 - ph; ctx.beginPath(); ctx.arc(80, 0, 40 + ph * 90, -0.6, 0.6); ctx.stroke(); } ctx.globalAlpha = 1;
    });
  }
  function stage(ctx, lt, t, banner) {
    ctx.fillStyle = '#1E1B4B'; E.rr(ctx, 240, 560, 760, 420, 20); ctx.fill();
    E.rr(ctx, 240, 560, 760, 420, 20); E.ink(ctx, null, 8);
    for (let i = 0; i < 6; i++) { const g = ctx.createRadialGradient(330 + i * 120, 600, 5, 330 + i * 120, 600, 80); g.addColorStop(0, `rgba(255,214,10,${0.5 + 0.3 * Math.sin(t * 3 + i)})`); g.addColorStop(1, 'rgba(255,214,10,0)'); ctx.fillStyle = g; ctx.fillRect(250 + i * 120, 560, 160, 160); }
    E.rr(ctx, 300, 640, 640, 110, 16); E.ink(ctx, AI, 7);
    E.comicText(ctx, banner, 620, 698, { size: 56, fill: C.white, shadow: false, lw: 9 });
    E.plainText(ctx, 'SINGAPUR', 620, 800, 44, C.yellow, { weight: 900 });
    E.rr(ctx, 200, 980, 840, 40, 10); E.ink(ctx, '#4B5563', 7);
  }

  const captions = [
    [0.0, 1.75, 'Kryptowährungen haben jetzt massives'],
    [1.75, 3.6, 'Potenzial durch Einsatz von KI-'],
    [3.6, 4.75, 'Agenten und mehr Liquidität'],
    [4.75, 5.25, 'im Markt,'],
    [5.25, 6.25, 'und das solltest du jetzt'],
    [6.25, 6.75, 'hier beachten.'],
    [6.75, 8.25, "Jetzt wird's extrem interessant,"],
    [8.25, 9.5, 'und warum ausgerechnet Eric'],
    [9.5, 10.75, 'Trump jubelt und welchen'],
    [10.75, 11.75, 'Haken du kennen solltest,'],
    [11.75, 12.5, 'erfährst du jetzt.'],
    [12.5, 13.5, 'Eric Trump hat nämlich'],
    [13.5, 15.0, 'auf der Kryptokonferenz Token'],
    [15.0, 17.0, '2049 in Singapur gesagt,'],
    [17.0, 18.75, 'der schnellste Wachstumstreiber für'],
    [18.75, 19.6, 'Krypto ist…'],
    [19.6, 21.4, 'Sein Beispiel waren KI-Agenten,'],
    [21.4, 22.5, 'die deinen Urlaub selbst'],
    [22.5, 23.75, 'buchen und mit einer Crypto-'],
    [23.75, 25.0, 'Wallet bezahlen, ohne Bank.'],
    [25.0, 26.25, 'Der Hintergrund kommt jetzt,'],
    [26.25, 26.75, 'das Ganze ist natürlich'],
    [26.75, 27.75, 'keine Anlageberatung.'],
    [27.75, 28.25, 'Über 1 Like und'],
    [28.25, 29.25, '1 Follow würde ich mich freuen.'],
    [29.25, 30.0, 'Vor einem Jahr stand'],
    [30.0, 31.0, 'der Bitcoin noch bei rund'],
    [31.0, 32.25, '126.000 Dollar,'],
    [32.25, 35.0, 'jetzt rund 82.000, 1/3 weniger.'],
    [35.0, 36.0, 'Der Grund laut Trump:'],
    [36.0, 37.0, 'Anleger haben das Geld'],
    [37.0, 38.6, 'aus Krypto abgezogen und in'],
    [38.6, 39.9, 'die KI-Aktien gesteckt.'],
    [39.9, 40.75, 'Jetzt soll das Geld'],
    [40.75, 41.5, 'aber zurückfließen.'],
    [41.5, 42.25, 'Und hier erstmal der'],
    [42.25, 43.2, 'Haken, denn für mich'],
    [43.2, 43.75, 'ist das eine sehr'],
    [43.75, 44.25, 'große Vision.'],
    [44.25, 45.25, 'Eric Trump ist nämlich'],
    [45.25, 46.75, 'Mitgründer von World Liberty Financial,'],
    [46.75, 48.6, 'dem Krypto-Unternehmen seiner Familie.'],
    [48.6, 49.2, 'Dessen'],
    [49.2, 50.25, 'Stablecoin USD1'],
    [50.25, 51.25, 'hat laut Firma über'],
    [51.25, 52.5, '4 Milliarden Dollar'],
    [52.5, 53.0, 'im Umlauf.'],
    [53.0, 53.5, 'Aus Sicht von vielen'],
    [53.5, 54.75, 'Skeptikern ist das natürlich'],
    [54.75, 56.0, 'Werbung in eigener Sache.'],
    [56.0, 56.75, 'Also, wie schon so oft:'],
    [56.75, 57.5, 'Siehst du in diesem'],
    [57.5, 58.5, 'AI-Agent-Case 1'],
    [58.5, 59.5, 'wirkliches Potenzial'],
    [59.5, 60.0, 'oder ist es für'],
    [60.0, 61.0, 'dich nur eine Vision?'],
    [61.0, 61.98, "Schreib's mal in die Kommentare."],
  ];

  // ---------- Szenen ----------
  const HC = { hard: true, punchAmt: 0.1, flashAmt: 0.3 }; // Hook-Cut
  const scenes = [
    // ===== HOOK 0–12,5 s: Schnitt alle ~1–1,5 s =====
    { start: 0, mood: 'dark', poses: ['emotions/begeistert'], punch: false, noBrand: true, ...HC, focus: { x: 640, y: 950 },
      sfx: [[0.0, 'impact', 0.55, 0], [0.05, 'ping', 0.5, 0], [0.35, 'pop', 0.45, -0.2], [0.55, 'pop', 0.45, 0.2], [0.75, 'pop', 0.45, 0]],
      draw(ctx, lt, t) {
        E.liveBar(ctx, lt, 'BREAKING  •  KI-AGENTEN ALS KRYPTO-TREIBER?  •  BITCOIN –35 % VOM REKORD  •  USD1 > 4 MRD. $  •  ');
        E.headline(ctx, [{ t: 'KRYPTO:', c: C.yellow, size: 150 }, { t: 'MASSIVES', c: C.white, size: 140 }], lt, { y: 480, delay: 0.05 });
        cryptoCoin(ctx, 600, 980, 150 * pop(lt, 0.3, 0.4), 'B', BTC, Math.sin(t * 2) * 0.1);
        cryptoCoin(ctx, 830, 860, 100 * pop(lt, 0.5, 0.4), 'E', ETH, -0.1);
        cryptoCoin(ctx, 860, 1130, 80 * pop(lt, 0.7, 0.4), '$1', C.greenD, 0.1);
        panda(ctx, 'emotions/begeistert', lt, t, { x: 200, h: 520 });
      } },
    { start: 1.75, mood: 'dark', poses: ['emotions/begeistert'], noBrand: true, ...HC, baseZoom: 1.08, focus: { x: 640, y: 1150 },
      sfx: [[-0.06, 'whoosh', 0.45, 0.3], [0.1, 'snap', 0.5, 0], [0.4, 'signal', 0.4, 0.3], [1.3, 'riser', 0.35, 0]],
      draw(ctx, lt, t) {
        E.liveBar(ctx, lt + 1.75, 'BREAKING  •  KI-AGENTEN ALS KRYPTO-TREIBER?  •  BITCOIN –35 % VOM REKORD  •  USD1 > 4 MRD. $  •  ');
        E.headline(ctx, [{ t: 'POTENZIAL', c: C.white, size: 140, ribbon: C.greenD }, { t: 'DURCH KI!', c: C.cyan, size: 140 }], lt, { y: 480 });
        robot(ctx, 700, 1030, 1.15 * pop(lt, 0.05, 0.45), t, { wave: true });
        panda(ctx, 'emotions/begeistert', lt, t, { x: 200, h: 520, enter: false });
      } },
    { start: 3.6, mood: 'good', poses: ['poses/zeigen'], ...HC, focus: { x: 640, y: 1000 },
      sfx: [[-0.06, 'whoosh', 0.45, -0.3], ...ticks(0.2, 0.9, 6, 0.45, 0.2), [1.0, 'cash', 0.5, 0.2]],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'MEHR', c: C.white, size: 130 }, { t: 'LIQUIDITÄT!', c: C.white, size: 140, ribbon: C.greenD }], lt);
        E.withT(ctx, 640, 1000, pop(lt, 0.0, 0.4), 0, () => { ctx.translate(-640, -1000);
          const lv = eOut(prog(lt, 0.15, 1.2));
          E.rr(ctx, 470, 760, 340, 460, 30); E.ink(ctx, 'rgba(220,240,255,0.7)', 9);
          ctx.save(); E.rr(ctx, 470, 760, 340, 460, 30); ctx.clip(); ctx.fillStyle = '#34D399'; const y = 1220 - 440 * lv; ctx.beginPath(); ctx.moveTo(470, y);
          for (let x = 470; x <= 810; x += 10) ctx.lineTo(x, y + Math.sin(x * 0.05 + t * 5) * 10); ctx.lineTo(810, 1220); ctx.lineTo(470, 1220); ctx.fill(); ctx.restore();
          E.rr(ctx, 470, 760, 340, 460, 30); E.ink(ctx, null, 9);
          for (let i = 0; i < 6; i++) { const p = ((lt * 0.9 + i / 6) % 1); cryptoCoin(ctx, 540 + (i % 3) * 100, lerp(1180, 820, p), 28, '$', C.gold); }
        });
        panda(ctx, 'poses/zeigen', lt, t, { x: 190, h: 480 });
      } },
    { start: 5.25, mood: 'dark', poses: ['poses/tipp_geben'], ...HC, baseZoom: 1.06, focus: { x: 640, y: 1150 },
      sfx: [[-0.06, 'whoosh', 0.4, 0.2], [0.05, 'snap', 0.5, 0], [1.0, 'ding', 0.45, 0]],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'DAS SOLLTEST', c: C.white, size: 120 }, { t: 'DU BEACHTEN!', c: C.white, size: 125, ribbon: C.red }], lt);
        E.burst(ctx, 700, 960, 180, 260, 14, C.yellow, lt * 0.5, 8);
        E.comicText(ctx, '!', 700, 975, { size: 300, fill: C.red, scale: pop(lt, 0.1, 0.4), rot: Math.sin(lt * 4) * 0.06, lw: 44 });
        panda(ctx, 'poses/tipp_geben', lt, t, { x: 200, h: 520 });
      } },
    { start: 6.75, mood: 'bad', poses: ['emotions/ueberrascht'], ...HC, focus: { x: 640, y: 1000 },
      sfx: [[-0.06, 'whoosh', 0.45, -0.3], [0.05, 'impact', 0.45, 0], [0.4, 'pop', 0.4, 0.3]],
      draw(ctx, lt, t) {
        E.headline(ctx, [{ t: 'JETZT WIRD’S', c: C.white, size: 125 }, { t: 'EXTREM', c: C.white, size: 150, ribbon: C.red }], lt);
        E.withT(ctx, 680, 980, pop(lt, 0.05, 0.4), 0, () => P.podium(ctx, 0, 300, 260, 'USA'));
        P.flagUS(ctx, 860, 640, 150, t);
        E.withT(ctx, 680, 700, pop(lt, 0.4, 0.4), 0, () => P.bubble(ctx, 0, 0, 380, 120, ['ERIC TRUMP'], { tail: -0.1, size: 50 }));
        panda(ctx, 'emotions/ueberrascht', lt, t, { x: 190, h: 480 });
      } },
    { start: 8.25, mood: 'good', poses: ['emotions/ueberrascht'], ...HC, baseZoom: 1.08, focus: { x: 640, y: 1150 },
      sfx: [[-0.06, 'whoosh', 0.4, 0.3], [0.1, 'cash', 0.45, 0.2], [1.35, 'snap', 0.45, 0]],
      draw(ctx, lt, t) {
        E.moneyRain(ctx, lt, 0.05, { x: 680, n: 12, seed: 3, spread: 700, fall: true });
        H(ctx, lt, [[0, [{ t: 'WARUM', c: C.white, size: 130 }, { t: 'JUBELT ER?', c: C.white, size: 140, ribbon: C.greenD }]]]);
        E.withT(ctx, 680, 980, 1, 0, () => P.podium(ctx, 0, 300, 260, 'USA'));
        for (let i = 0; i < 4; i++) { const p = ((lt * 0.8 + i / 4) % 1); E.comicText(ctx, '★', 560 + i * 80, 760 - p * 120, { size: 60, fill: C.yellow, scale: 1 - p }); }
        panda(ctx, 'emotions/ueberrascht', lt, t, { x: 190, h: 480, enter: false });
      } },
    { start: 10.75, mood: 'dark', poses: ['emotions/nachdenklich', 'poses/tipp_geben'], ...HC, focus: { x: 640, y: 1000 },
      sfx: [[-0.06, 'whoosh', 0.4, 0], [0.05, 'door', 0.35, 0.3], [1.0, 'roll', 0.4, 0], [1.0, 'ding', 0.5, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'UND DER', c: C.white, size: 120 }, { t: 'HAKEN?', c: C.yellow, size: 170 }]],
          [1.0, [{ t: 'ERFÄHRST', c: C.white, size: 125 }, { t: 'DU JETZT!', c: C.white, size: 140, ribbon: C.greenD }]]]);
        P.hook(ctx, 760, lerp(300, 760, eOut(prog(lt, 0.0, 0.6))), 1.15, t, 'ERIC TRUMP');
        pandaSeq(ctx, [[0, 'emotions/nachdenklich'], [1.0, 'poses/tipp_geben']], lt, t, { x: 190, h: 480 });
      } },

    // ===== Ab hier ruhiges Tempo mit Ueberblendungen =====
    { // 12,5–17: Konferenz Token2049 Singapur
      start: 12.5, mood: 'blue', poses: ['poses/praesentieren'], focus: { x: 620, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [1.0, 'pop', 0.4, 0.1], [2.5, 'paper', 0.35, 0.2], [2.6, 'ding', 0.35, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'ERIC TRUMP', c: C.white, size: 130, ribbon: '#1F3A93' }, { t: 'AUF DER BÜHNE', c: C.white, size: 105 }]],
          [1.0, [{ t: 'TOKEN2049', c: C.yellow, size: 150 }, { t: 'IN SINGAPUR', c: C.white, size: 115 }]]]);
        E.withT(ctx, 620, 790, pop(lt, 0.05, 0.5), 0, () => { ctx.translate(-620, -790); stage(ctx, lt, t, 'TOKEN2049'); });
        E.withT(ctx, 620, 1000, pop(lt, 0.4, 0.5), 0, () => P.podium(ctx, 0, 230, 180, 'ERIC'));
        if (lt > 2.4) P.bubble(ctx, 820, 1120, 380, 110, ['KI + KRYPTO!'], { scale: pop(lt, 2.5, 0.45), tail: -0.2, size: 48 });
        panda(ctx, 'poses/praesentieren', lt, t, { x: 170, h: 460 });
      } },
    { // 17–19,6: schnellster Wachstumstreiber
      start: 17.0, mood: 'good', poses: ['emotions/begeistert'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [0.2, 'riser', 0.35, 0], [1.75, 'impact', 0.4, 0], [1.8, 'cash', 0.35, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DER SCHNELLSTE', c: C.white, size: 115 }, { t: 'WACHSTUMS-', c: C.white, size: 130, ribbon: C.greenD }, { t: 'TREIBER!', c: C.yellow, size: 130 }]]]);
        E.whiteboard(ctx, 650, 990, 640, 440);
        const e = E.lineChart(ctx, 370, 830, 560, 300, [[0, 0.9], [0.2, 0.85], [0.4, 0.72], [0.6, 0.55], [0.8, 0.28], [1, 0.02]], eOut(prog(lt, 0.2, 1.5)), C.green, { area: true });
        if (lt > 1.75) { E.burst(ctx, e[0], e[1], 30, 70, 8, C.yellow, lt, 4); robot(ctx, 880, 820, 0.45 * pop(lt, 1.75, 0.45), t); }
        panda(ctx, 'emotions/begeistert', lt, t, { x: 170, h: 460 });
      } },
    { // 19,6–25: KI-Agent bucht Urlaub, zahlt per Wallet ohne Bank
      start: 19.6, mood: 'blue', poses: ['poses/zeigen', 'emotions/cool'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [0.15, 'signal', 0.4, 0.2], [1.9, 'whoosh', 0.4, 0.4], [2.4, 'pop', 0.4, 0.2], [3.3, 'cash', 0.5, 0.2], [4.3, 'stamp', 0.45, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'SEIN BEISPIEL:', c: C.white, size: 120 }, { t: 'KI-AGENTEN', c: C.white, size: 140, ribbon: AI }]],
          [1.8, [{ t: 'BUCHEN DEINEN', c: C.white, size: 115 }, { t: 'URLAUB!', c: C.yellow, size: 150 }]],
          [3.2, [{ t: 'ZAHLEN PER', c: C.white, size: 120 }, { t: 'KRYPTO-WALLET', c: C.white, size: 120, ribbon: BTC }]],
          [4.2, [{ t: 'OHNE BANK!', c: C.white, size: 150, ribbon: C.red }]]]);
        robot(ctx, 560, 1010, 1.0 * pop(lt, 0.05, 0.45), t, { wave: lt < 1.8, hold: lt > 3.2 ? () => cryptoCoin(ctx, 0, 0, 60, 'B', BTC) : null });
        if (lt > 1.8) plane(ctx, lerp(1300, 860, eOut(prog(lt, 1.8, 0.8))), 620 - Math.sin(lt) * 10, 0.8, -0.15);
        if (lt > 4.2) bank(ctx, 880, 1240, 230, eOut(prog(lt, 4.3, 0.6)));
        pandaSeq(ctx, [[0, 'poses/zeigen'], [3.2, 'emotions/cool']], lt, t, { x: 170, h: 450 });
      } },
    { // 25–29,25: Hintergrund + keine Anlageberatung + Like/Follow
      start: 25.0, mood: 'good', poses: ['emotions/augenzwinkern', 'emotions/freundlich'], focus: { x: 600, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [1.25, 'paper', 0.35, 0.2], [2.85, 'pop', 0.5, 0.2], [3.3, 'ding', 0.35, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DER', c: C.white, size: 120 }, { t: 'HINTERGRUND…', c: C.yellow, size: 140 }]],
          [1.25, [{ t: 'KEINE', c: C.white, size: 130 }, { t: 'ANLAGEBERATUNG!', c: C.white, size: 105, ribbon: '#2D7FF9' }]],
          [2.75, [{ t: 'LIKE + FOLLOW', c: C.white, size: 120, ribbon: '#FF3B5C' }, { t: 'FREUEN MICH!', c: C.white, size: 115 }]]]);
        if (lt < 1.4) { ctx.save(); ctx.globalAlpha = 1 - prog(lt, 1.1, 0.3); P.card(ctx, 680, 960, 420, 320, 'HINTERGRUND', { head: C.ink }); E.questionMarks(ctx, 680, 1000, lt, 3, C.yellow); ctx.restore(); }
        else { E.withT(ctx, 690, 940, pop(lt, 1.3, 0.5), 0.03, () => { P.card(ctx, 0, 0, 440, 360, 'HINWEIS', { head: '#2D7FF9' });
          E.plainText(ctx, 'NUR INFO', 0, -30, 46, C.ink, { weight: 900 }); E.plainText(ctx, 'KEINE KAUF-', 0, 40, 40, C.greyD, { weight: 900 }); E.plainText(ctx, 'EMPFEHLUNG', 0, 90, 40, C.greyD, { weight: 900 }); }); }
        if (lt > 2.75) { P.heart(ctx, 830, 760, 1.4 * pop(lt, 2.85, 0.4) * (1 + Math.sin(t * 6) * 0.05)); E.pill(ctx, '+ FOLGEN', 820, 1180, 44, '#FF3B5C', C.white, pop(lt, 3.3, 0.45)); }
        pandaSeq(ctx, [[0, 'emotions/augenzwinkern'], [2.75, 'emotions/freundlich']], lt, t, { x: 200, h: 520 });
      } },
    { // 29,25–35: Bitcoin 126.000 -> 82.000, 1/3 weniger
      start: 29.25, mood: 'bad', poses: ['poses/analysieren', 'emotions/traurig'], focus: { x: 640, y: 930 }, shake: [3.75], shakeSfx: 'sub',
      sfx: [[-0.12, 'whoosh', 0.25, 0], ...ticks(1.0, 1.95, 7, 0.45, 0), [2.0, 'ding', 0.45, 0], [2.6, 'riser', 0.35, 0], [3.0, 'down', 0.45, 0.2], [3.75, 'glitch', 0.4, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'VOR 1 JAHR:', c: C.white, size: 125 }, { t: 'BITCOIN BEI', c: C.white, size: 120, ribbon: BTC }]],
          [3.0, [{ t: 'JETZT 82.000 $', c: C.white, size: 120, ribbon: C.red }, { t: '1/3 WENIGER!', c: C.yellow, size: 125 }]]]);
        const top = Math.round(lerp(0, 126, eOut(prog(lt, 1.0, 1.0))));
        E.whiteboard(ctx, 650, 1000, 660, 460);
        const pts = [[0.04, 0.85], [0.16, 0.55], [0.26, 0.12], [0.36, 0.2], [0.5, 0.35], [0.64, 0.48], [0.78, 0.62], [0.94, 0.66]];
        const p = lt < 2.9 ? 0.32 * eOut(prog(lt, 0.3, 1.6)) : lerp(0.32, 1, eOut(prog(lt, 2.9, 1.2)));
        const e = E.lineChart(ctx, 360, 830, 580, 320, pts, p, lt > 2.9 ? C.red : C.green, { area: true, lw: 14 });
        if (lt > 1.0) E.pill(ctx, `${top}.000 $`, 470, 840, 40, C.greenD, C.white, pop(lt, 1.0), -0.05);
        if (lt > 3.6) E.pill(ctx, '82.000 $', e[0] - 20, e[1] - 70, 40, C.red, C.white, pop(lt, 3.7), 0.05);
        E.stamp(ctx, '–35 %', 760, 1250, lt, 3.75, { size: 110, rot: -0.15 });
        cryptoCoin(ctx, 900, 720, 60 * pop(lt, 0.2), 'B', BTC);
        pandaSeq(ctx, [[0, 'poses/analysieren'], [3.0, 'emotions/traurig']], lt, t, { x: 170, h: 450 });
      } },
    { // 35–41,5: Grund laut Trump – Geld von Krypto in KI-Aktien, soll zurueck
      start: 35.0, mood: 'blue', poses: ['poses/praesentieren'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [0.1, 'snap', 0.35, 0], [2.1, 'whoosh', 0.4, 0.5], [2.5, 'cash', 0.35, 0.4], [5.0, 'whoosh', 0.4, -0.5], [5.4, 'ding', 0.45, -0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DER GRUND', c: C.white, size: 120 }, { t: 'LAUT TRUMP:', c: C.yellow, size: 125 }]],
          [2.0, [{ t: 'GELD FLOSS IN', c: C.white, size: 115 }, { t: 'KI-AKTIEN!', c: C.white, size: 140, ribbon: AI }]],
          [4.9, [{ t: 'JETZT SOLL ES', c: C.white, size: 115 }, { t: 'ZURÜCK!', c: C.white, size: 150, ribbon: C.greenD }]]]);
        E.withT(ctx, 420, 1000, pop(lt, 0.1, 0.5), -0.04, () => { P.card(ctx, 0, 0, 280, 320, 'KRYPTO', { head: BTC }); cryptoCoin(ctx, 0, 50, 80, 'B', BTC); });
        E.withT(ctx, 860, 1000, pop(lt, 0.3, 0.5), 0.04, () => { P.card(ctx, 0, 0, 280, 320, 'KI-AKTIEN', { head: AI }); E.lineChart(ctx, -100, -20, 200, 160, [[0, 0.9], [0.5, 0.6], [1, 0.05]], 1, C.green, { lw: 10 }); });
        const back = lt > 4.9;
        for (let i = 0; i < 5; i++) {
          const p = ((lt * 0.7 + i / 5) % 1); if (lt < 1.9) continue;
          const x = back ? lerp(800, 480, p) : lerp(480, 800, p), y = 760 - Math.sin(p * Math.PI) * 130;
          ctx.globalAlpha = Math.sin(p * Math.PI); E.moneyBill(ctx, x, y, 90, back ? -0.2 : 0.2); ctx.globalAlpha = 1;
        }
        panda(ctx, 'poses/praesentieren', lt, t, { x: 170, h: 450 });
      } },
    { // 41,5–44,25: der Haken – grosse Vision
      start: 41.5, mood: 'dark', poses: ['emotions/nachdenklich'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [0.75, 'tick', 0.9, 0], [0.8, 'down', 0.35, 0.2], [2.25, 'ding', 0.35, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'UND HIER', c: C.white, size: 120 }, { t: 'DER HAKEN:', c: C.yellow, size: 150 }]],
          [1.7, [{ t: 'EINE SEHR', c: C.white, size: 120 }, { t: 'GROSSE VISION', c: C.white, size: 125, ribbon: AI }]]]);
        P.hook(ctx, 760, lerp(300, 740, eOut(prog(lt, 0.05, 0.7))), 1.15, t, 'VISION');
        if (lt > 1.7) for (let i = 0; i < 6; i++) { const a = i * 1.05 + lt, s = 0.5 + 0.5 * Math.sin(lt * 5 + i * 1.7); E.burst(ctx, 700 + Math.cos(a) * 280, 980 + Math.sin(a) * 200, 8 * s, 30 * s, 4, C.yellow, 0, 4); }
        panda(ctx, 'emotions/nachdenklich', lt, t, { x: 190, h: 480 });
      } },
    { // 44,25–48,6: Mitgruender World Liberty Financial – Familienunternehmen
      start: 44.25, mood: 'neutral', poses: ['poses/zeigen'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [0.2, 'snap', 0.35, 0], [1.1, 'stamp', 0.45, 0.2], [2.6, 'pop', 0.4, 0.3], [2.85, 'pop', 0.4, -0.1]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'ERIC TRUMP IST', c: C.white, size: 115 }, { t: 'MITGRÜNDER', c: C.white, size: 130, ribbon: WLF }]],
          [2.5, [{ t: 'KRYPTO-FIRMA', c: C.white, size: 125, ribbon: '#1F3A93' }, { t: 'SEINER FAMILIE!', c: C.white, size: 115 }]]]);
        E.withT(ctx, 660, 950, pop(lt, 1.0, 0.5), -0.02, () => {
          P.softShadow(ctx, 0, 300, 260);
          E.rr(ctx, -250, -220, 500, 500, 30); E.ink(ctx, '#F8FAFC', 9);
          ctx.beginPath(); ctx.arc(0, -40, 120, 0, 7); E.ink(ctx, WLF, 9); ctx.beginPath(); ctx.arc(0, -40, 92, 0, 7); E.ink(ctx, '#FDE68A', 5);
          E.comicText(ctx, 'WLF', 0, -34, { size: 80, fill: C.white, shadow: false, lw: 12 });
          E.plainText(ctx, 'WORLD LIBERTY', 0, 140, 40, C.ink, { weight: 900 }); E.plainText(ctx, 'FINANCIAL', 0, 190, 40, C.ink, { weight: 900 });
        });
        if (lt > 2.5) { E.withT(ctx, 900, 700, pop(lt, 2.6, 0.45), 0.1, () => { E.rr(ctx, -80, -60, 160, 140, 12); E.ink(ctx, C.white, 7); ctx.beginPath(); ctx.moveTo(-100, -50); ctx.lineTo(0, -130); ctx.lineTo(100, -50); ctx.closePath(); E.ink(ctx, C.red, 7); E.rr(ctx, -25, 20, 50, 60, 6); E.ink(ctx, '#8B5A2B', 5); });
          E.pill(ctx, 'FAMILIE TRUMP', 900, 830, 30, C.ink, C.white, pop(lt, 2.85)); }
        panda(ctx, 'poses/zeigen', lt, t, { x: 170, h: 450 });
      } },
    { // 48,6–53: Stablecoin USD1 > 4 Mrd. $ im Umlauf
      start: 48.6, mood: 'good', poses: ['emotions/ueberrascht'], focus: { x: 640, y: 930 }, shake: [3.0], shakeSfx: 'sub',
      sfx: [[-0.12, 'whoosh', 0.25, 0], [0.7, 'pop', 0.45, 0], ...ticks(2.0, 2.95, 8, 0.45, 0), [3.0, 'cash', 0.55, 0], [3.05, 'impact', 0.35, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'STABLECOIN', c: C.white, size: 130 }, { t: 'USD1', c: C.white, size: 160, ribbon: C.greenD }]],
          [2.9, [{ t: 'ÜBER 4 MRD. $', c: C.white, size: 130, ribbon: C.greenD }, { t: 'IM UMLAUF!', c: C.yellow, size: 125 }]]]);
        cryptoCoin(ctx, 660, 900, 170 * pop(lt, 0.6, 0.5), 'USD1', C.greenD, Math.sin(t * 1.5) * 0.08);
        if (lt > 1.9) { const v = lerp(0, 4, eOut(prog(lt, 2.0, 1.0))); E.burst(ctx, 660, 1180, 120, 180, 14, C.yellow, lt * 0.3, 7);
          P.counter(ctx, 660, 1180, `> ${v.toFixed(1).replace('.', ',')} MRD. $`, { size: 80, fill: C.greenD, scale: pop(lt, 2.0, 0.45) }); }
        if (lt > 3.0) for (let i = 0; i < 6; i++) { const a = i * 1.05, r = lerp(0, 290, eOut(prog(lt, 3.0, 0.6))); cryptoCoin(ctx, 660 + Math.cos(a) * r, 900 + Math.sin(a) * r * 0.8, 36, '$', C.greenD); }
        panda(ctx, 'emotions/ueberrascht', lt, t, { x: 170, h: 450 });
      } },
    { // 53–56: Skeptiker – Werbung in eigener Sache
      start: 53.0, mood: 'bad', poses: ['emotions/augenzwinkern'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [0.4, 'snap', 0.35, -0.2], [1.75, 'stamp', 0.5, 0.2], [1.8, 'glitch', 0.3, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'FÜR SKEPTIKER:', c: C.white, size: 120 }]],
          [1.7, [{ t: 'WERBUNG IN', c: C.white, size: 120, ribbon: C.red }, { t: 'EIGENER SACHE!', c: C.white, size: 115 }]]]);
        megaphone(ctx, 700, 920, 1.5 * pop(lt, 0.3, 0.5), t);
        E.stamp(ctx, 'WERBUNG?', 690, 1200, lt, 1.75, { size: 100, rot: -0.15 });
        panda(ctx, 'emotions/augenzwinkern', lt, t, { x: 180, h: 480 });
      } },
    { // 56–Ende: echtes Potenzial oder nur Vision?
      start: 56.0, mood: 'blue', poses: ['emotions/nachdenklich', 'poses/tipp_geben'], focus: { x: 620, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [1.5, 'pop', 0.45, -0.35], [3.6, 'pop', 0.45, 0.35], [3.7, 'swell', 0.35, 0], [5.0, 'ding', 0.35, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'KI-AGENTEN', c: C.white, size: 130, ribbon: AI }, { t: '+ KRYPTO…', c: C.white, size: 120 }]],
          [2.5, [{ t: 'ECHTES POTENZIAL', c: C.white, size: 105, ribbon: C.greenD }, { t: 'ODER VISION?', c: C.white, size: 115, ribbon: C.red }]]]);
        E.withT(ctx, 430, 960, pop(lt, 1.5, 0.5), -0.05, () => { P.card(ctx, 0, 0, 320, 420, 'POTENZIAL', { head: C.greenD }); robot(ctx, 0, 80, 0.55, t); });
        E.withT(ctx, 810, 960, pop(lt, 3.6, 0.5), 0.05, () => { P.card(ctx, 0, 0, 320, 420, 'NUR VISION', { head: C.red }); E.comicText(ctx, '?', 0, 50, { size: 200, fill: C.yellow, rot: Math.sin(t * 2) * 0.1 }); });
        if (lt > 3.6) E.comicText(ctx, 'VS', 620, 960, { size: 90, fill: C.yellow, scale: pop(lt, 3.7) });
        E.pill(ctx, 'Schreib’s in die Kommentare ↓', 600, 1260, 38, C.white, C.ink, pop(lt, 5.0, 0.5));
        pandaSeq(ctx, [[0, 'emotions/nachdenklich'], [3.6, 'poses/tipp_geben']], lt, t, { x: 160, h: 430 });
      } },
  ];

  const music = {
    bpm: 96, chords: [['D', 'm'], ['A#', ''], ['F', ''], ['C', '']], level: 0.5, abs: 0.1,
    sections: [[0, 'tension'], [12.5, 'full'], [25.0, 'pulse'], [29.25, 'tension'], [35.0, 'full'], [41.5, 'tension'], [44.25, 'pulse'], [48.6, 'full'], [53.0, 'tension'], [56.0, 'pulse']],
    drops: [12.0, 31.0, 51.6],
  };

  window.VIDEO = { name: 'krypto-ki-agenten', fps: 30, duration: 61.976, scenes, captions, xfade: 0.3, grain: 0.06, bokeh: true, endFade: false, music };
})();
