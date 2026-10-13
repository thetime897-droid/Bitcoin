// ASML & TSMC – Chip-Woche – Short (61,17 s). Zeiten = Voice-Over-Zeitachse des Originals.
// NEU: style 'clean' – dunkler Premium-Look, moderne Schrift, feine Konturen, weiche Schatten, ruhige Animationen.
(() => {
  const E = window.E, C = E.C, P = E.P;
  const { pop, prog, eOut, eInOut, lerp } = E;
  const ASML = '#2563EB', TSMC = '#DC2626', CHIP = '#22D3EE', GOLD = '#FACC15';
  const panda = (ctx, pose, lt, t, o = {}) => E.drawPanda(ctx, pose, { x: o.x ?? 190, y: o.y ?? 1405, h: o.h ?? 470, lt, t, enter: o.enter ?? true, from: o.from || ((o.x ?? 190) > 540 ? 'right' : 'left'), flip: o.flip, swapAt: o.swapAt, enterAt: o.enterAt });
  const pandaSeq = (ctx, seq, lt, t, o = {}) => { let k = 0; seq.forEach(([at], i) => { if (lt >= at) k = i; }); const [at, pose] = seq[k]; panda(ctx, pose, lt, t, k === 0 ? o : { ...o, enter: false, swapAt: at }); };
  const H = (ctx, lt, states) => { let k = 0; states.forEach(([at], i) => { if (lt >= at) k = i; }); E.headline(ctx, states[k][1], lt - states[k][0], states[k][2] || {}); };
  const ticks = (from, to, n, gain = 0.6, pan = 0) => Array.from({ length: n }, (_, i) => [from + (to - from) * Math.pow(i / (n - 1), 0.8), 'tick', gain, pan]);
  const de = (v, d = 0) => v.toFixed(d).replace('.', ',');

  // ---------- Clean-Bausteine ----------
  // Glas-Karte: halbtransparent, feiner Rand, weicher Schatten
  function glass(ctx, x, y, w, h, o = {}) {
    E.withT(ctx, x, y, o.scale ?? 1, o.rot || 0, () => {
      ctx.save(); ctx.shadowColor = 'rgba(2,6,23,0.5)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
      E.rr(ctx, -w / 2, -h / 2, w, h, o.r ?? 34); ctx.fillStyle = o.fill || 'rgba(255,255,255,0.08)'; ctx.fill(); ctx.restore();
      E.rr(ctx, -w / 2, -h / 2, w, h, o.r ?? 34); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.stroke();
      if (o.accent) { E.rr(ctx, -w / 2, -h / 2, w, 10, 5); ctx.fillStyle = o.accent; ctx.fill(); }
      if (o.title) E.plainText(ctx, o.title, -w / 2 + 36, -h / 2 + 52, 28, 'rgba(255,255,255,0.65)', { weight: 800, align: 'left' });
      if (o.body) o.body(w, h);
    });
  }
  function bigNum(ctx, txt, x, y, size, col = C.white, s = 1) { E.comicText(ctx, txt, x, y, { size, fill: col, scale: s }); }
  function label(ctx, txt, x, y, size = 30, col = 'rgba(255,255,255,0.7)', align = 'center') { E.plainText(ctx, txt, x, y, size, col, { weight: 800, align }); }
  function tag(ctx, txt, x, y, col, s = 1) { // Pill-Tag
    if (s <= 0.001) return;
    E.withT(ctx, x, y, s, 0, () => { ctx.font = `900 30px ${E.FONT_BOLD}`; const w = ctx.measureText(txt).width + 44;
      E.rr(ctx, -w / 2, -26, w, 52, 26); ctx.fillStyle = col; ctx.fill(); E.plainText(ctx, txt, 0, 2, 30, C.white, { weight: 900 }); });
  }
  function chip(ctx, x, y, s, col, txt, t) { // stilisierter Wafer-Chip mit Leuchtbahnen
    E.withT(ctx, x, y, s, 0, () => {
      const g = ctx.createRadialGradient(0, 0, 20, 0, 0, 260); g.addColorStop(0, col + '55'); g.addColorStop(1, col + '00'); ctx.fillStyle = g; ctx.fillRect(-260, -260, 520, 520);
      ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) { const o = -100 + i * 40; [[o, -130, o, -170], [o, 130, o, 170], [-130, o, -170, o], [130, o, 170, o]].forEach(([a, b, c, d]) => { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); }); }
      ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 30; E.rr(ctx, -130, -130, 260, 260, 26); ctx.fillStyle = '#0F172A'; ctx.fill(); ctx.restore();
      E.rr(ctx, -130, -130, 260, 260, 26); ctx.lineWidth = 3; ctx.strokeStyle = col; ctx.stroke();
      E.rr(ctx, -90, -90, 180, 180, 16); ctx.fillStyle = '#1E293B'; ctx.fill();
      const p = (t * 0.6) % 1; ctx.strokeStyle = col; ctx.globalAlpha = 0.9; ctx.lineWidth = 4;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(-70, -50 + k * 50); ctx.lineTo(lerp(-70, 70, (p + k * 0.3) % 1), -50 + k * 50); ctx.stroke(); } ctx.globalAlpha = 1;
      if (txt) bigNum(ctx, txt, 0, 4, 64, C.white);
    });
  }
  function machine(ctx, x, by, w, t) { // EUV-Lithografie-Maschine (abstrakt)
    const h = w * 0.62;
    ctx.save(); ctx.shadowColor = 'rgba(2,6,23,0.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 20;
    E.rr(ctx, x - w / 2, by - h, w, h, 30); ctx.fillStyle = '#E2E8F0'; ctx.fill(); ctx.restore();
    E.rr(ctx, x - w / 2, by - h, w, h * 0.22, 30); ctx.fillStyle = ASML; ctx.fill();
    E.plainText(ctx, 'EUV', x - w / 2 + 50, by - h + h * 0.11, 34, C.white, { weight: 900, align: 'left' });
    E.rr(ctx, x - w * 0.36, by - h * 0.66, w * 0.42, h * 0.46, 18); ctx.fillStyle = '#0F172A'; ctx.fill();
    const g = ctx.createLinearGradient(x - w * 0.3, 0, x + w * 0.05, 0); g.addColorStop(0, 'rgba(167,139,250,0)'); g.addColorStop(0.5 + 0.4 * Math.sin(t * 3), 'rgba(167,139,250,0.9)'); g.addColorStop(1, 'rgba(167,139,250,0)');
    ctx.fillStyle = g; ctx.fillRect(x - w * 0.34, by - h * 0.45, w * 0.38, 8);
    for (let i = 0; i < 3; i++) { E.rr(ctx, x + w * 0.12, by - h * 0.66 + i * h * 0.16, w * 0.28, h * 0.1, 8); ctx.fillStyle = i === 1 ? '#94A3B8' : '#CBD5E1'; ctx.fill(); }
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(x + w * 0.15 + i * 26, by - h * 0.12, 7, 0, 7); ctx.fillStyle = Math.sin(t * 5 + i) > 0 ? C.green : '#334155'; ctx.fill(); }
  }
  function factory(ctx, x, by, w, t) { // Chipfabrik (abstrakt)
    const h = w * 0.5;
    ctx.save(); ctx.shadowColor = 'rgba(2,6,23,0.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 20;
    E.rr(ctx, x - w / 2, by - h, w, h, 20); ctx.fillStyle = '#E2E8F0'; ctx.fill(); ctx.restore();
    E.rr(ctx, x - w * 0.38, by - h - 90, w * 0.14, 110, 10); ctx.fillStyle = '#CBD5E1'; ctx.fill();
    for (let k = 0; k < 3; k++) { const ph = (t * 0.4 + k / 3) % 1; ctx.globalAlpha = 0.6 * (1 - ph); ctx.beginPath(); ctx.arc(x - w * 0.31 + ph * 40, by - h - 110 - ph * 120, 22 + ph * 30, 0, 7); ctx.fillStyle = '#E2E8F0'; ctx.fill(); } ctx.globalAlpha = 1;
    E.rr(ctx, x - w / 2, by - h, w, 60, 20); ctx.fillStyle = TSMC; ctx.fill();
    E.plainText(ctx, 'FAB', x, by - h + 32, 32, C.white, { weight: 900 });
    for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) { E.rr(ctx, x - w / 2 + 34 + c * (w - 68) / 5, by - h + 90 + r * 80, (w - 68) / 5 - 18, 50, 8); ctx.fillStyle = Math.sin(t * 2 + r + c) > 0.4 ? '#7DD3FC' : '#94A3B8'; ctx.fill(); }
  }
  function bars(ctx, x, by, items, lt, t0, o = {}) { // Balkendiagramm sauber
    const bw = o.bw || 170, gap = o.gap || 70, max = o.max, hmax = o.h || 420, n = items.length, x0 = x - ((n - 1) * (bw + gap)) / 2;
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x - (n * (bw + gap)) / 2, by, n * (bw + gap), 3);
    if (o.line != null) { const yy = by - hmax * o.line / max; ctx.setLineDash([12, 10]); ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - (n * (bw + gap)) / 2, yy); ctx.lineTo(x + (n * (bw + gap)) / 2, yy); ctx.stroke(); ctx.setLineDash([]); if (o.lineLabel) label(ctx, o.lineLabel, x + (n * (bw + gap)) / 2 - 10, yy - 22, 24, 'rgba(255,255,255,0.7)', 'right'); }
    items.forEach(([lab, v, col, txt, at], i) => {
      const p = eOut(prog(lt, at ?? t0 + i * 0.25, 0.8)), h = hmax * v / max * p, bx = x0 + i * (bw + gap);
      const g = ctx.createLinearGradient(0, by - h, 0, by); g.addColorStop(0, col); g.addColorStop(1, E.shade(col, -0.45));
      ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 24 * p; E.rr(ctx, bx - bw / 2, by - h, bw, Math.max(1, h), 18); ctx.fillStyle = g; ctx.fill(); ctx.restore();
      label(ctx, lab, bx, by + 40, 28);
      if (p > 0.3) bigNum(ctx, txt, bx, by - h - 46, 54, C.white, Math.min(1, (p - 0.3) / 0.4));
    });
  }
  function calRow(ctx, x, y, items, lt) { // Termin-Karten nebeneinander
    items.forEach(([day, date, who, col, at], i) => {
      const s = pop(lt, at, 0.5); if (s <= 0) return;
      glass(ctx, x + (i - (items.length - 1) / 2) * 360, y, 330, 380, { scale: s, accent: col, body: () => {
        label(ctx, day, 0, -95, 30); bigNum(ctx, date, 0, -10, 96, C.white); E.rr(ctx, -90, 70, 180, 56, 28); ctx.fillStyle = col; ctx.fill(); E.plainText(ctx, who, 0, 99, 32, C.white, { weight: 900 }); } });
    });
  }
  function poll(ctx, x, y, w, lt, t0, opts) {
    glass(ctx, x, y, w, 120 + opts.length * 110, { scale: pop(lt, t0, 0.5), title: 'WAS DENKST DU?', body: (ww, hh) => {
      opts.forEach(([txt, col], i) => { const s = pop(lt, t0 + 0.3 + i * 0.25, 0.4); if (s <= 0) return; E.withT(ctx, 0, -hh / 2 + 140 + i * 110, s, 0, () => {
        E.rr(ctx, -ww / 2 + 36, -40, ww - 72, 80, 40); ctx.fillStyle = col + '33'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = col; ctx.stroke();
        ctx.beginPath(); ctx.arc(-ww / 2 + 86, 0, 16, 0, 7); ctx.lineWidth = 4; ctx.stroke(); E.plainText(ctx, txt, -ww / 2 + 124, 2, 36, C.white, { weight: 900, align: 'left' }); }); });
    } });
  }

  const captions = [
    [0.0, 1.5, 'Genau diese 2 Aktien'],
    [1.5, 2.6, 'verraten diese Woche, ob'],
    [2.6, 3.25, 'der KI-Boom bei'],
    [3.25, 4.0, 'Chips weiterläuft,'],
    [4.0, 5.1, 'und eine der wichtigsten'],
    [5.1, 6.0, 'Kennzahlen kennt man schon'],
    [6.0, 7.25, 'vorher. Und welche das ist,'],
    [7.25, 8.4, 'erfährst du gleich am Mittwoch.'],
    [8.4, 10.1, 'Vor Börsenstart legt ASML die'],
    [10.1, 10.6, 'Zahlen vor.'],
    [10.6, 12.1, 'Der Konzern baut Maschinen,'],
    [12.1, 13.6, 'ohne die kein moderner'],
    [13.6, 14.25, 'Chip entsteht.'],
    [14.25, 15.25, 'Am Donnerstag folgt dann'],
    [15.25, 16.6, 'TSMC, die Fabrik hinter'],
    [16.6, 17.5, 'der KI.'],
    [17.5, 18.75, 'Die Börse sieht in'],
    [18.75, 19.9, 'ASML zum Beispiel einen'],
    [19.9, 21.75, 'Frühindikator der gesamten Branche.'],
    [21.75, 23.25, 'ASML selbst peilt für'],
    [23.25, 24.4, 'dieses Quartal 11 bis'],
    [24.4, 26.1, '12 Milliarden Euro Umsatz an.'],
    [26.1, 27.25, 'Im Quartal davor waren'],
    [27.25, 28.25, 'es 9,3,'],
    [28.25, 29.75, 'also fast 18 Prozent'],
    [29.75, 30.75, 'mehr. Das Ganze natürlich'],
    [30.75, 32.0, 'keine Anlageberatung,'],
    [32.0, 33.25, 'aber TSMC hat jetzt'],
    [33.25, 34.1, 'schon verraten:'],
    [34.1, 35.9, '46,7 Milliarden Dollar'],
    [35.9, 37.6, 'Umsatz im 3. Quartal,'],
    [37.6, 38.5, 'mehr als die eigene'],
    [38.5, 40.5, 'Prognose von höchstens 45,'],
    [40.5, 41.0, '8.'],
    [41.0, 42.25, 'Und genau deshalb liegt die'],
    [42.25, 43.1, 'Messlatte hoch.'],
    [43.1, 45.25, 'TSMCs Umsatz ist bekannt,'],
    [45.25, 47.0, 'im September plus 54,'],
    [47.0, 48.0, '6 Prozent.'],
    [48.0, 49.0, 'Neu ist am Donnerstag'],
    [49.0, 50.5, 'nur der Ausblick. Und bei'],
    [50.5, 51.1, 'ASML zählt,'],
    [51.1, 52.25, 'ob die Jahresprognose'],
    [52.25, 54.4, '43–45 Milliarden'],
    [54.4, 55.0, 'Euro halten.'],
    [55.0, 56.0, 'Das heißt für dich:'],
    [56.0, 57.25, 'Halte die beiden Unternehmen und'],
    [57.25, 58.6, 'die Zahlen ganz genau im Auge,'],
    [58.6, 59.5, 'für diese Woche,'],
    [59.5, 60.25, 'denn das hier wird'],
    [60.25, 61.17, 'richtig interessant.'],
  ];

  const HC = { hard: true, punchAmt: 0.06, flashAmt: 0.18 };
  const scenes = [
    // ===== HOOK 0–14,25 s =====
    { start: 0, mood: 'dark', poses: ['poses/zeigen'], punch: false, noBrand: true, ...HC, focus: { x: 540, y: 1000 },
      sfx: [[0.0, 'impact', 0.45, 0], [0.05, 'ping', 0.45, 0], [0.4, 'pop', 0.4, -0.2], [0.65, 'pop', 0.4, 0.3], [1.5, 'snap', 0.4, 0]],
      draw(ctx, lt, t) {
        E.liveBar(ctx, lt, 'CHIP-WOCHE  •  MI 14.10. ASML  •  DO 15.10. TSMC  •  KI-BOOM: WEITER ODER PAUSE?  •  ');
        H(ctx, lt, [[0, [{ t: 'DIESE 2 AKTIEN', c: C.white, size: 120 }, { t: 'ENTSCHEIDEN', c: GOLD, size: 130 }], { y: 480, delay: 0.05 }],
          [1.5, [{ t: 'LÄUFT DER', c: C.white, size: 120 }, { t: 'KI-BOOM WEITER?', c: C.white, size: 105, ribbon: '#7C3AED' }], { y: 480 }]]);
        glass(ctx, 560, 960, 320, 240, { scale: pop(lt, 0.35), accent: ASML, body: () => bigNum(ctx, 'ASML', 0, 10, 80, C.white) });
        glass(ctx, 880, 960, 320, 240, { scale: pop(lt, 0.6), accent: TSMC, body: () => bigNum(ctx, 'TSMC', 0, 10, 80, C.white) });
        panda(ctx, 'poses/zeigen', lt, t, { x: 170, h: 460 });
      } },
    { start: 2.6, mood: 'dark', poses: ['emotions/cool'], ...HC, focus: { x: 640, y: 1000 },
      sfx: [[-0.06, 'whoosh', 0.4, 0.3], [0.2, 'signal', 0.35, 0.2], [1.3, 'riser', 0.3, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'KI-BOOM', c: C.white, size: 140, ribbon: '#7C3AED' }, { t: 'BEI CHIPS', c: CHIP, size: 125 }]],
          [1.4, [{ t: 'EINE ZAHL', c: C.white, size: 130 }, { t: 'IST SCHON BEKANNT', c: GOLD, size: 95 }]]]);
        chip(ctx, 700, 960, 1.15 * pop(lt, 0.05, 0.5), CHIP, 'KI', t);
        panda(ctx, 'emotions/cool', lt, t, { x: 170, h: 460 });
      } },
    { start: 6.0, mood: 'blue', poses: ['poses/tipp_geben'], ...HC, focus: { x: 640, y: 1000 },
      sfx: [[-0.06, 'whoosh', 0.4, -0.3], [0.1, 'snap', 0.4, 0], [1.25, 'roll', 0.35, 0], [1.3, 'ding', 0.45, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'WELCHE?', c: GOLD, size: 150 }]], [1.25, [{ t: 'ERFÄHRST DU', c: C.white, size: 120 }, { t: 'GLEICH!', c: C.white, size: 140, ribbon: '#16A34A' }]]]);
        glass(ctx, 700, 960, 480, 480, { scale: pop(lt, 0.05, 0.5), body: () => { bigNum(ctx, '?', 0, 20, 300, GOLD); } });
        panda(ctx, 'poses/tipp_geben', lt, t, { x: 170, h: 470 });
      } },
    { start: 8.4, mood: 'blue', poses: ['poses/praesentieren'], ...HC, focus: { x: 640, y: 1000 },
      sfx: [[-0.06, 'whoosh', 0.4, 0.2], [0.1, 'pop', 0.4, 0.2], [2.2, 'snap', 0.35, 0.2], [2.6, 'signal', 0.3, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'MITTWOCH:', c: GOLD, size: 130 }, { t: 'ASML-ZAHLEN', c: C.white, size: 120, ribbon: ASML }]],
          [2.2, [{ t: 'BAUT DIE', c: C.white, size: 125 }, { t: 'CHIP-MASCHINEN', c: C.white, size: 110, ribbon: ASML }]]]);
        if (lt < 2.2) glass(ctx, 700, 960, 500, 440, { scale: pop(lt, 0.05, 0.5), accent: ASML, title: 'VOR BÖRSENSTART', body: () => { bigNum(ctx, 'MI 14.10.', 0, 10, 100, C.white); label(ctx, 'ASML · QUARTALSZAHLEN', 0, 110, 26); } });
        else E.withT(ctx, 0, 0, 1, 0, () => { ctx.save(); ctx.globalAlpha = prog(lt, 2.2, 0.4); machine(ctx, 700, 1210, 560, t); ctx.restore(); });
        panda(ctx, 'poses/praesentieren', lt, t, { x: 170, h: 460 });
      } },
    { start: 12.1, mood: 'dark', poses: ['emotions/cool'], ...HC, focus: { x: 640, y: 1000 },
      sfx: [[-0.06, 'whoosh', 0.35, 0.3], [0.8, 'impact', 0.35, 0], [1.6, 'ding', 0.35, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'OHNE ASML', c: C.white, size: 130 }, { t: 'KEIN MODERNER CHIP', c: C.white, size: 92, ribbon: ASML }]]]);
        machine(ctx, 560, 1180, 420, t);
        const p = eOut(prog(lt, 0.4, 0.8)); ctx.strokeStyle = CHIP; ctx.lineWidth = 6; ctx.setLineDash([14, 12]); ctx.beginPath(); ctx.moveTo(780, 1020); ctx.lineTo(780 + 80 * p, 960); ctx.stroke(); ctx.setLineDash([]);
        chip(ctx, 900, 900, 0.55 * pop(lt, 0.8, 0.5), CHIP, '', t);
        panda(ctx, 'emotions/cool', lt, t, { x: 160, h: 440 });
      } },

    // ===== Ruhiger Teil =====
    { // 14,25–17,5: Donnerstag TSMC – Fabrik hinter der KI
      start: 14.25, mood: 'bad', poses: ['poses/zeigen'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [0.2, 'pop', 0.4, 0.2], [1.6, 'snap', 0.35, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DONNERSTAG:', c: GOLD, size: 125 }, { t: 'TSMC', c: C.white, size: 150, ribbon: TSMC }]],
          [1.5, [{ t: 'DIE FABRIK', c: C.white, size: 130 }, { t: 'HINTER DER KI', c: C.white, size: 115, ribbon: TSMC }]]]);
        factory(ctx, 680, 1210, 540, t);
        if (lt > 1.5) chip(ctx, 880, 760, 0.42 * pop(lt, 1.6, 0.5), CHIP, 'KI', t);
        panda(ctx, 'poses/zeigen', lt, t, { x: 160, h: 440 });
      } },
    { // 17,5–21,75: ASML als Fruehindikator
      start: 17.5, mood: 'blue', poses: ['poses/analysieren'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [0.5, 'signal', 0.35, 0.2], [2.4, 'ding', 0.4, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'ASML GILT ALS', c: C.white, size: 120 }, { t: 'FRÜHINDIKATOR', c: C.white, size: 120, ribbon: ASML }]],
          [2.4, [{ t: 'FÜR DIE GESAMTE', c: C.white, size: 110 }, { t: 'CHIPBRANCHE', c: CHIP, size: 130 }]]]);
        glass(ctx, 660, 960, 620, 480, { scale: pop(lt, 0.05, 0.5), title: 'SIGNALKETTE', body: (w, h) => {
          const nodes = [['ASML', ASML, -200], ['FABRIKEN', TSMC, 0], ['KI-CHIPS', '#7C3AED', 200]];
          nodes.forEach(([n, c, dx], i) => { const s = pop(lt, 0.4 + i * 0.5, 0.45); if (s <= 0) return;
            E.withT(ctx, dx, 30, s, 0, () => { ctx.beginPath(); ctx.arc(0, 0, 70, 0, 7); ctx.fillStyle = c; ctx.fill(); label(ctx, n, 0, 115, 26, C.white); }); });
          for (let i = 0; i < 2; i++) { const p = eOut(prog(lt, 0.8 + i * 0.5, 0.4)); if (p <= 0) continue; ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-200 + i * 200 + 80, 30); ctx.lineTo(-200 + i * 200 + 80 + 40 * p, 30); ctx.stroke(); }
          const q = (t * 0.7) % 1; ctx.beginPath(); ctx.arc(lerp(-200, 200, q), 30, 12, 0, 7); ctx.fillStyle = GOLD; ctx.globalAlpha = Math.sin(q * Math.PI); ctx.fill(); ctx.globalAlpha = 1;
        } });
        panda(ctx, 'poses/analysieren', lt, t, { x: 160, h: 440 });
      } },
    { // 21,75–29,75: ASML-Prognose 11–12 Mrd. € vs. 9,3 Mrd. € -> ~+18 %
      start: 21.75, mood: 'good', poses: ['poses/praesentieren', 'emotions/begeistert'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [1.0, 'pop', 0.35, -0.2], ...ticks(2.4, 3.6, 8, 0.35, 0.2), [3.65, 'cash', 0.45, 0.2], [6.4, 'riser', 0.3, 0], [6.5, 'ding', 0.45, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'ASML PLANT', c: C.white, size: 125 }, { t: 'MEHR UMSATZ', c: C.white, size: 120, ribbon: '#16A34A' }]],
          [6.4, [{ t: '≈ +18 %', c: C.white, size: 160, ribbon: '#16A34A' }, { t: 'VS. VORQUARTAL', c: C.white, size: 100 }]]]);
        bars(ctx, 650, 1230, [['Q2 (REAL)', 9.3, '#64748B', '9,3 MRD. €', 1.0], ['Q3 (PROGNOSE)', 11.5, '#22C55E', '11–12 MRD. €', 2.4]], lt, 1.0, { max: 12.5, h: 480, line: 9.3 });
        if (lt > 6.4) tag(ctx, '+18 %', 820, 640, '#16A34A', pop(lt, 6.5));
        pandaSeq(ctx, [[0, 'poses/praesentieren'], [6.4, 'emotions/begeistert']], lt, t, { x: 150, h: 420 });
      } },
    { // 29,75–32: keine Anlageberatung
      start: 29.75, mood: 'neutral', poses: ['emotions/augenzwinkern'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [0.4, 'paper', 0.3, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'KEINE', c: C.white, size: 130 }, { t: 'ANLAGEBERATUNG', c: C.white, size: 110, ribbon: '#2563EB' }]]]);
        glass(ctx, 680, 960, 560, 360, { scale: pop(lt, 0.1, 0.5), accent: '#2563EB', title: 'HINWEIS', body: () => { label(ctx, 'NUR INFORMATION', 0, -5, 48, C.white); label(ctx, 'KEINE KAUFEMPFEHLUNG', 0, 65, 32); } });
        panda(ctx, 'emotions/augenzwinkern', lt, t, { x: 170, h: 460 });
      } },
    { // 32–41: TSMC hat verraten 46,7 Mrd. $ > Prognose 45,8
      start: 32.0, mood: 'good', poses: ['emotions/ueberrascht', 'emotions/begeistert'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [1.25, 'snap', 0.35, 0], ...ticks(2.1, 3.4, 9, 0.4, 0.2), [3.45, 'cash', 0.5, 0.2], [6.5, 'riser', 0.3, 0], [7.0, 'impact', 0.4, 0], [7.05, 'ding', 0.4, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'TSMC HAT', c: C.white, size: 130 }, { t: 'SCHON VERRATEN', c: C.white, size: 115, ribbon: TSMC }]],
          [2.1, [{ t: '46,7 MRD. $', c: C.white, size: 140, ribbon: '#16A34A' }, { t: 'UMSATZ IM Q3', c: C.white, size: 105 }]],
          [6.9, [{ t: 'ÜBER DER', c: C.white, size: 125 }, { t: 'EIGENEN PROGNOSE!', c: GOLD, size: 105 }]]]);
        bars(ctx, 650, 1230, [['Q2', 40.2, '#64748B', '40,2', 1.4], ['Q3', 46.7, '#22C55E', '46,7', 2.1]], lt, 1.4, { max: 50, h: 480, line: 45.8, lineLabel: lt > 6.5 ? 'PROGNOSE 45,8' : '' });
        if (lt > 6.9) tag(ctx, 'BEAT ✓', 850, 650, '#16A34A', pop(lt, 7.0));
        pandaSeq(ctx, [[0, 'emotions/ueberrascht'], [6.9, 'emotions/begeistert']], lt, t, { x: 150, h: 420 });
      } },
    { // 41–48: Messlatte hoch – September +54,6 %
      start: 41.0, mood: 'blue', poses: ['poses/zeigen'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [0.4, 'pop', 0.4, 0.2], [1.2, 'stamp', 0.35, 0.2], ...ticks(4.3, 5.6, 9, 0.4, 0.2), [5.65, 'ding', 0.45, 0.2]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DIE MESSLATTE', c: C.white, size: 125 }, { t: 'LIEGT HOCH', c: C.white, size: 130, ribbon: TSMC }]],
          [4.25, [{ t: 'SEPTEMBER:', c: C.white, size: 125 }, { t: '+54,6 %', c: C.white, size: 150, ribbon: '#16A34A' }]]]);
        const y = lerp(1200, 760, eOut(prog(lt, 0.3, 1.2)));
        ctx.strokeStyle = GOLD; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(420, y); ctx.lineTo(960, y); ctx.stroke();
        ctx.fillStyle = 'rgba(250,204,21,0.12)'; ctx.fillRect(420, y, 540, 1240 - y);
        label(ctx, 'ERWARTUNG', 690, y - 30, 30, GOLD);
        if (lt > 4.25) { const v = lerp(0, 54.6, eOut(prog(lt, 4.3, 1.3))); glass(ctx, 690, 1040, 520, 300, { scale: pop(lt, 4.25, 0.5), accent: '#16A34A', title: 'TSMC · UMSATZ SEPT.', body: () => bigNum(ctx, `+${de(v, 1)} %`, 0, 30, 130, '#4ADE80') }); }
        panda(ctx, 'poses/zeigen', lt, t, { x: 160, h: 440 });
      } },
    { // 48–55: Neu nur der Ausblick; ASML-Jahresprognose 43–45 Mrd. €
      start: 48.0, mood: 'dark', poses: ['emotions/nachdenklich', 'poses/analysieren'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [0.3, 'signal', 0.3, 0.2], [3.1, 'pop', 0.4, 0.2], [4.3, 'riser', 0.3, 0], [4.35, 'impact', 0.35, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'NEU AM DONNERSTAG:', c: C.white, size: 105 }, { t: 'NUR DER AUSBLICK', c: C.white, size: 110, ribbon: TSMC }]],
          [3.1, [{ t: 'ASML: HÄLT DIE', c: C.white, size: 115 }, { t: 'JAHRESPROGNOSE?', c: GOLD, size: 115 }]]]);
        if (lt < 3.1) glass(ctx, 680, 960, 540, 440, { scale: pop(lt, 0.1, 0.5), accent: TSMC, title: 'DO 15.10. · TSMC', body: () => { bigNum(ctx, 'AUSBLICK', 0, 0, 100, C.white); label(ctx, 'Q4-PROGNOSE', 0, 100, 32); } });
        else glass(ctx, 680, 960, 600, 460, { scale: pop(lt, 3.1, 0.5), accent: ASML, title: 'ASML · JAHR 2026', body: () => { bigNum(ctx, '43–45', 0, -10, 160, C.white); label(ctx, 'MRD. € UMSATZ', 0, 90, 34); if (lt > 4.35) tag(ctx, 'HALTEN?', 0, 160, '#F59E0B', pop(lt, 4.35)); } });
        pandaSeq(ctx, [[0, 'emotions/nachdenklich'], [3.1, 'poses/analysieren']], lt, t, { x: 160, h: 440 });
      } },
    { // 55–58,6: Fuer dich: beide Unternehmen im Auge behalten
      start: 55.0, mood: 'good', poses: ['poses/tipp_geben'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [0.2, 'snap', 0.35, 0], [1.2, 'pop', 0.4, -0.2], [1.45, 'pop', 0.4, 0.3]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DAS HEISST', c: C.white, size: 125 }, { t: 'FÜR DICH:', c: C.white, size: 130, ribbon: '#16A34A' }]],
          [1.0, [{ t: 'ZAHLEN GENAU', c: C.white, size: 120 }, { t: 'IM AUGE BEHALTEN', c: GOLD, size: 100 }]]]);
        calRow(ctx, 690, 980, [['MITTWOCH', '14.10.', 'ASML', ASML, 1.2], ['DONNERSTAG', '15.10.', 'TSMC', TSMC, 1.45]], lt);
        panda(ctx, 'poses/tipp_geben', lt, t, { x: 150, h: 420 });
      } },
    { // 58,6–Ende: diese Woche wird es interessant – Umfrage
      start: 58.6, mood: 'blue', poses: ['emotions/cool'], focus: { x: 640, y: 930 },
      sfx: [[-0.12, 'whoosh', 0.25, 0], [0.4, 'pop', 0.4, 0.2], [0.7, 'pop', 0.4, 0.2], [1.6, 'swell', 0.3, 0], [1.65, 'ding', 0.35, 0]],
      draw(ctx, lt, t) {
        H(ctx, lt, [[0, [{ t: 'DIESE WOCHE', c: C.white, size: 125 }, { t: 'WIRD’S SPANNEND', c: C.white, size: 110, ribbon: '#7C3AED' }]]]);
        poll(ctx, 680, 990, 660, lt, 0.1, [['Boom geht weiter', '#22C55E'], ['Erstmal Pause', '#EF4444']]);
        panda(ctx, 'emotions/cool', lt, t, { x: 150, h: 420 });
      } },
  ];

  const music = {
    bpm: 94, chords: [['E', 'm'], ['C', ''], ['G', ''], ['D', '']], level: 0.5, abs: 0.1,
    sections: [[0, 'tension'], [8.4, 'pulse'], [14.25, 'full'], [29.75, 'pulse'], [32.0, 'full'], [48.0, 'tension'], [55.0, 'full']],
    drops: [7.2, 28.1, 38.8],
  };

  window.VIDEO = { name: 'asml-tsmc', style: 'clean', fps: 30, duration: 61.17, scenes, captions, xfade: 0.35, grain: 0.035, bokeh: false, endFade: false, pandaFixed: true, music };
})();
