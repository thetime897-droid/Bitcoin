// Panda-Investiert Video-Engine: zeichnet jedes Frame deterministisch auf ein 1080x1920-Canvas.
// Ein Video (videos/<name>/video.js) beschreibt Szenen + Untertitel; render.mjs ruft E.renderFrame(t) pro Frame auf.
(() => {
  const W = 1080, H = 1920;
  const C = {
    ink: '#16120F', cream: '#FFF4DE', white: '#FFFFFF', green: '#2FCB5B', greenD: '#1A9A40',
    red: '#F0362B', redD: '#A91B14', yellow: '#FFD60A', orange: '#FF8A1F', blue: '#2D7FF9',
    cyan: '#22D3EE', grey: '#9AA0A6', greyD: '#4A4F57', paper: '#FFFDF6', gold: '#F5B301',
  };

  // ---------- Mathe / Easing ----------
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const prog = (t, s, d) => clamp((t - s) / d);
  const eOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
  const eIn = (t) => Math.pow(clamp(t), 3);
  const eInOut = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const eBack = (t) => { t = clamp(t); const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  const eElastic = (t) => { t = clamp(t); if (t === 0 || t === 1) return t; return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1; };
  // Skalierung fuer "Pop-in" (0 vor Start, Ueberschwinger, dann 1)
  const pop = (t, s, d = 0.45) => (t < s ? 0 : eBack(prog(t, s, d)));
  const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };

  // ---------- Grundformen ----------
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  // Comic-Stil: Fuellung + dicke dunkle Kontur (Pfad muss vorher gebaut sein)
  function ink(ctx, fill, lw = 8, stroke = C.ink) {
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
  }
  function withT(ctx, x, y, s, rot, fn) {
    ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); if (s !== 1) ctx.scale(s, s); fn(); ctx.restore();
  }
  function dropShadow(ctx, fn, dx = 0, dy = 14, a = 0.22) {
    ctx.save(); ctx.translate(dx, dy); ctx.globalAlpha *= a; ctx.filter = 'brightness(0)'; fn(); ctx.restore(); fn();
  }

  // ---------- Text ----------
  const FONT_COMIC = '"Luckiest Guy"';
  const FONT_BOLD = 'Montserrat';
  function comicText(ctx, txt, x, y, o = {}) {
    const size = o.size || 120, s = o.scale ?? 1;
    if (s <= 0.001) return;
    ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); ctx.scale(s, s);
    ctx.globalAlpha *= o.alpha ?? 1;
    ctx.font = `${o.weight || ''} ${size}px ${o.font || FONT_COMIC}`;
    ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle';
    const lw = o.lw ?? size * 0.17;
    ctx.lineJoin = 'round'; ctx.miterLimit = 2;
    if (o.shadow !== false) {
      ctx.fillStyle = ctx.strokeStyle = o.shadowColor || C.ink; ctx.lineWidth = lw;
      ctx.strokeText(txt, 0, size * 0.09); ctx.fillText(txt, 0, size * 0.09);
    }
    ctx.lineWidth = lw; ctx.strokeStyle = o.stroke || C.ink; ctx.strokeText(txt, 0, 0);
    if (o.gradient) {
      const g = ctx.createLinearGradient(0, -size / 2, 0, size / 2); g.addColorStop(0, o.gradient[0]); g.addColorStop(1, o.gradient[1]); ctx.fillStyle = g;
    } else ctx.fillStyle = o.fill || C.white;
    ctx.fillText(txt, 0, 0);
    ctx.restore();
  }
  function plainText(ctx, txt, x, y, size, color, o = {}) {
    ctx.save(); ctx.font = `${o.weight || 800} ${size}px ${o.font || FONT_BOLD}`; ctx.fillStyle = color;
    ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle'; if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.fillText(txt, x, y); ctx.restore();
  }
  function fitSize(ctx, txt, size, maxW, font = FONT_COMIC) {
    ctx.save(); ctx.font = `${size}px ${font}`; const w = ctx.measureText(txt).width; ctx.restore();
    return w > maxW ? size * maxW / w : size;
  }

  // Ueberschrift oben: Zeilen poppen gestaffelt rein, leichtes Wackeln
  function headline(ctx, lines, lt, o = {}) {
    let y = o.y ?? 330;
    lines.forEach((ln, i) => {
      const size = fitSize(ctx, ln.t, ln.size || 128, 960);
      const s = pop(lt, (o.delay || 0) + i * 0.12, 0.45);
      const rot = (ln.rot ?? -0.035) + Math.sin(lt * 1.4 + i) * 0.006;
      if (ln.ribbon && s > 0.001) {
        ctx.save(); ctx.font = `${size}px ${FONT_COMIC}`; const tw = ctx.measureText(ln.t).width + size * 0.7, th = size * 1.18;
        ctx.translate(540 + (ln.dx || 0), y + size * 0.02); ctx.rotate(rot); ctx.scale(s, s);
        rr(ctx, -tw / 2 + 10, -th / 2 + 14, tw, th, th * 0.22); ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fill();
        rr(ctx, -tw / 2, -th / 2, tw, th, th * 0.22); ink(ctx, ln.ribbon, 9); ctx.restore();
      }
      comicText(ctx, ln.t, 540 + (ln.dx || 0), y, { size, fill: ln.c || C.white, scale: s, rot, gradient: ln.g, shadow: !ln.ribbon });
      y += size * 1.02;
    });
  }

  // ---------- Hintergrund ----------
  const MOODS = {
    neutral: ['#FFF3DA', '#FFE2A8', 'rgba(120,80,0,0.06)'],
    good: ['#E8FAE5', '#B9EDBB', 'rgba(0,90,20,0.06)'],
    bad: ['#FFEDE7', '#FFC4B8', 'rgba(120,0,0,0.06)'],
    blue: ['#EAF2FF', '#C4DBFF', 'rgba(0,40,120,0.06)'],
    dark: ['#15181E', '#232833', 'rgba(255,255,255,0.035)'],
  };
  let dotPattern = {};
  function getDots(ctx, color) {
    if (!dotPattern[color]) {
      const c = document.createElement('canvas'); c.width = c.height = 26; const g = c.getContext('2d');
      g.fillStyle = color; g.beginPath(); g.arc(6, 6, 3.2, 0, 7); g.arc(19, 19, 3.2, 0, 7); g.fill();
      dotPattern[color] = ctx.createPattern(c, 'repeat');
    }
    return dotPattern[color];
  }
  function background(ctx, mood, t, o = {}) {
    const [bg, ray, dot] = MOODS[mood] || MOODS.neutral;
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const cx = o.cx ?? 540, cy = o.cy ?? 860, n = 22, R = 2400;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.025);
    ctx.fillStyle = ray; ctx.globalAlpha = mood === 'dark' ? 0.55 : 0.75;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = a0 + Math.PI / n;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a0) * R, Math.sin(a0) * R); ctx.lineTo(Math.cos(a1) * R, Math.sin(a1) * R); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    // weicher Lichtkegel in der Mitte + Vignette
    let g = ctx.createRadialGradient(cx, cy, 50, cx, cy, 900);
    g.addColorStop(0, mood === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.75)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = getDots(ctx, dot); ctx.fillRect(0, 0, W, H);
    g = ctx.createRadialGradient(540, 960, 700, 540, 960, 1300);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, mood === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(60,30,0,0.18)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  // ---------- Panda ----------
  const IMG = {};
  function drawPanda(ctx, pose, o) {
    const img = IMG[pose]; if (!img) throw new Error('Pose fehlt: ' + pose);
    const { x, y, h, lt, t } = o;
    let dx = 0, s = 1;
    if (o.enter) { const p = prog(lt, o.enterAt || 0, 0.6); dx = (1 - eBack(p)) * (o.from === 'right' ? 760 : -760); }
    if (o.swapAt != null && lt >= o.swapAt) s = lerp(0.94, 1, eBack(prog(lt, o.swapAt, 0.35)));
    const bob = Math.sin(t * 3.2) * 6, sq = 1 + Math.sin(t * 6.4) * 0.008;
    const w = h * img.width / img.height;
    ctx.save(); ctx.translate(x + dx, y);
    // Bodenschatten
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(0, -6, w * 0.42, 22, 0, 0, 7); ctx.fill();
    ctx.translate(0, bob * 0.3); ctx.rotate(Math.sin(t * 1.7) * 0.012);
    ctx.scale((o.flip ? -1 : 1) * s / sq, s * sq);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, -w / 2, -h + bob, w, h);
    ctx.restore();
  }

  // ---------- Effekte ----------
  function burst(ctx, x, y, r1, r2, n, fill, rot = 0, lw = 8) {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = rot + (i / (n * 2)) * Math.PI * 2, r = i % 2 ? r1 : r2 * (0.85 + 0.15 * Math.sin(i * 7.3));
      i ? ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath(); ink(ctx, fill, lw);
  }
  // Comic-Explosion: Stern + Funken + Rauch
  function explosion(ctx, x, y, lt, t0, o = {}) {
    const p = (lt - t0) / (o.dur || 0.7); if (p < 0 || p > 1) return;
    const sc = o.size || 1, r = rng(o.seed || 7);
    ctx.save(); ctx.globalAlpha = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
    for (let i = 0; i < 7; i++) { // Rauch
      const a = r() * 6.28, d = eOut(p) * (120 + r() * 120) * sc;
      ctx.fillStyle = `rgba(80,80,90,${0.35 * (1 - p)})`; ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, (40 + r() * 40) * sc * (0.6 + p), 0, 7); ctx.fill();
    }
    const s = eBack(prog(p, 0, 0.35));
    burst(ctx, x, y, 70 * sc * s, 190 * sc * s, 12, o.c1 || C.red, p * 0.6, 8);
    burst(ctx, x, y, 40 * sc * s, 115 * sc * s, 10, o.c2 || C.yellow, -p * 0.8, 6);
    for (let i = 0; i < 14; i++) { // Funken
      const a = r() * 6.28, d = eOut(p) * (200 + r() * 220) * sc;
      ctx.fillStyle = i % 2 ? C.yellow : (o.c1 || C.red); ctx.beginPath();
      ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d + p * p * 120, (12 - p * 9) * sc, 0, 7); ctx.fill();
    }
    if (o.word) comicText(ctx, o.word, x, y, { size: 90 * sc, fill: C.white, scale: s, rot: -0.1 });
    ctx.restore();
  }
  function speedLines(ctx, cx, cy, t, color = 'rgba(0,0,0,0.12)') {
    const r = rng(3); ctx.save(); ctx.strokeStyle = color; ctx.lineCap = 'round';
    for (let i = 0; i < 46; i++) {
      const a = r() * 6.28, ph = (t * 3 + r()) % 1, r0 = 380 + ph * 700;
      ctx.lineWidth = 6 + r() * 10; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      ctx.lineTo(cx + Math.cos(a) * (r0 + 160 + r() * 200), cy + Math.sin(a) * (r0 + 160 + r() * 200)); ctx.stroke();
    }
    ctx.restore();
  }
  function moneyBill(ctx, x, y, w, rot) {
    withT(ctx, x, y, 1, rot, () => {
      rr(ctx, -w / 2, -w * 0.25, w, w * 0.5, 8); ink(ctx, '#7BD389', 6);
      ctx.beginPath(); ctx.arc(0, 0, w * 0.16, 0, 7); ink(ctx, '#A9E8B3', 4);
      plainText(ctx, '$', 0, 2, w * 0.22, C.greenD, { weight: 900 });
    });
  }
  function moneyRain(ctx, lt, t0, o = {}) {
    if (lt < t0) return; const r = rng(o.seed || 11), n = o.n || 14;
    for (let i = 0; i < n; i++) {
      const x0 = (o.x ?? 540) + (r() - 0.5) * (o.spread || 900), vx = (r() - 0.5) * 300, vy = -500 - r() * 600, st = r() * (o.fall ? 1.2 : 0.3);
      const tt = lt - t0 - st; if (tt < 0) continue;
      if (o.fall) moneyBill(ctx, x0 + Math.sin(tt * 3 + i) * 60, -80 + tt * (420 + r() * 200), 100, Math.sin(tt * 4 + i) * 0.6);
      else moneyBill(ctx, x0 + vx * tt, (o.y ?? 900) + vy * tt + 900 * tt * tt, 110, tt * (r() * 8 - 4));
    }
  }
  function arrowDown(ctx, x, y, s, color = C.red) {
    withT(ctx, x, y, s, 0, () => {
      ctx.beginPath(); ctx.moveTo(-28, -90); ctx.lineTo(28, -90); ctx.lineTo(28, 0); ctx.lineTo(62, 0); ctx.lineTo(0, 80); ctx.lineTo(-62, 0); ctx.lineTo(-28, 0); ctx.closePath(); ink(ctx, color, 7);
    });
  }
  function arrowUp(ctx, x, y, s, color = C.green) { withT(ctx, x, y, s, Math.PI, () => arrowDown(ctx, 0, 0, 1, color)); }

  // ---------- Requisiten ----------
  function iphone(ctx, cx, cy, h, o = {}) {
    const w = h * 0.49, x = cx - w / 2, y = cy - h / 2;
    ctx.save();
    rr(ctx, x + 10, y + 14, w, h, h * 0.085); ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fill();
    rr(ctx, x, y, w, h, h * 0.085);
    const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, o.c1 || '#8D929C'); g.addColorStop(1, o.c2 || '#50555F');
    ink(ctx, g, Math.max(5, h * 0.016));
    rr(ctx, x + w * 0.08, y + h * 0.035, w * 0.5, w * 0.5, w * 0.12); ink(ctx, o.bump || '#3B3F47', Math.max(4, h * 0.012));
    const L = [[0.23, 0.13], [0.23, 0.33], [0.43, 0.23]];
    L.forEach(([lx, ly]) => { ctx.beginPath(); ctx.arc(x + w * (lx + 0.02), y + w * ly + h * 0.035 - w * 0.03, w * 0.085, 0, 7); ink(ctx, '#111', Math.max(3, h * 0.008), '#777');
      ctx.beginPath(); ctx.arc(x + w * (lx + 0.0), y + w * ly + h * 0.035 - w * 0.05, w * 0.025, 0, 7); ctx.fillStyle = '#5b8cff'; ctx.fill(); });
    if (o.label) plainText(ctx, o.label, cx, y + h * 0.78, h * 0.075, 'rgba(255,255,255,0.85)', { weight: 900 });
    ctx.beginPath(); ctx.moveTo(x + w * 0.88, y + h * 0.1); ctx.lineTo(x + w * 0.88, y + h * 0.45); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = h * 0.02; ctx.stroke();
    if (o.crack) { ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + w * 0.7, y + h * 0.5); ctx.lineTo(x + w * 0.5, y + h * 0.6); ctx.lineTo(x + w * 0.62, y + h * 0.68); ctx.lineTo(x + w * 0.4, y + h * 0.82); ctx.stroke(); }
    ctx.restore();
  }
  // generischer Apfel (Frucht, kein Logo)
  function apple(ctx, cx, cy, r, color = C.red) {
    ctx.save();
    ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.62);
    ctx.bezierCurveTo(cx + r * 0.35, cy - r * 0.95, cx + r * 1.1, cy - r * 0.75, cx + r * 0.98, cy + r * 0.05);
    ctx.bezierCurveTo(cx + r * 0.9, cy + r * 0.75, cx + r * 0.45, cy + r * 1.02, cx, cy + r * 0.82);
    ctx.bezierCurveTo(cx - r * 0.45, cy + r * 1.02, cx - r * 0.9, cy + r * 0.75, cx - r * 0.98, cy + r * 0.05);
    ctx.bezierCurveTo(cx - r * 1.1, cy - r * 0.75, cx - r * 0.35, cy - r * 0.95, cx, cy - r * 0.62);
    ink(ctx, color, r * 0.06);
    ctx.beginPath(); ctx.ellipse(cx - r * 0.45, cy - r * 0.2, r * 0.13, r * 0.28, 0.4, 0, 7); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.6); ctx.quadraticCurveTo(cx + r * 0.05, cy - r * 0.95, cx + r * 0.15, cy - r * 1.1); ctx.lineWidth = r * 0.09; ctx.strokeStyle = '#6B3E1E'; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx + r * 0.38, cy - r * 0.98, r * 0.28, r * 0.13, -0.5, 0, 7); ink(ctx, C.green, r * 0.05);
    ctx.restore();
  }
  function whiteboard(ctx, cx, cy, w, h, o = {}) {
    ctx.save();
    ctx.lineWidth = 12; ctx.strokeStyle = C.ink; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - w * 0.32, cy + h / 2); ctx.lineTo(cx - w * 0.4, cy + h / 2 + 140); ctx.moveTo(cx + w * 0.32, cy + h / 2); ctx.lineTo(cx + w * 0.4, cy + h / 2 + 140); ctx.stroke();
    ctx.strokeStyle = '#8a8f98'; ctx.lineWidth = 8; ctx.stroke();
    rr(ctx, cx - w / 2 + 12, cy - h / 2 + 16, w, h, 18); ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fill();
    rr(ctx, cx - w / 2, cy - h / 2, w, h, 18); ink(ctx, '#C9CDD3', 9);
    rr(ctx, cx - w / 2 + 18, cy - h / 2 + 18, w - 36, h - 36, 8); ink(ctx, o.fill || C.paper, 5);
    ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.lineWidth = 2;
    for (let gx = cx - w / 2 + 60; gx < cx + w / 2 - 20; gx += 60) { ctx.beginPath(); ctx.moveTo(gx, cy - h / 2 + 20); ctx.lineTo(gx, cy + h / 2 - 20); ctx.stroke(); }
    for (let gy = cy - h / 2 + 60; gy < cy + h / 2 - 20; gy += 60) { ctx.beginPath(); ctx.moveTo(cx - w / 2 + 20, gy); ctx.lineTo(cx + w / 2 - 20, gy); ctx.stroke(); }
    ctx.restore();
  }
  // Linienchart mit Fortschritt + Pfeilspitze; pts in 0..1 (x rechts, y unten)
  function lineChart(ctx, x, y, w, h, pts, p, color, o = {}) {
    const P = pts.map(([px, py]) => [x + px * w, y + py * h]);
    const n = P.length - 1, f = clamp(p) * n, k = Math.floor(f), fr = f - k;
    const vis = P.slice(0, k + 1); if (k < n) vis.push([lerp(P[k][0], P[k + 1][0], fr), lerp(P[k][1], P[k + 1][1], fr)]);
    if (vis.length < 2) return vis[0];
    if (o.area) {
      ctx.beginPath(); ctx.moveTo(vis[0][0], y + h); vis.forEach(([a, b]) => ctx.lineTo(a, b)); ctx.lineTo(vis[vis.length - 1][0], y + h); ctx.closePath();
      const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, color + '66'); g.addColorStop(1, color + '00'); ctx.fillStyle = g; ctx.fill();
    }
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); vis.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)));
    ctx.strokeStyle = C.ink; ctx.lineWidth = (o.lw || 18) + 10; ctx.stroke(); ctx.strokeStyle = color; ctx.lineWidth = o.lw || 18; ctx.stroke();
    const e = vis[vis.length - 1], q = vis[vis.length - 2], a = Math.atan2(e[1] - q[1], e[0] - q[0]);
    if (o.head !== false) withT(ctx, e[0], e[1], o.headSize || 1, a, () => { ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(-34, -38); ctx.lineTo(-34, 38); ctx.closePath(); ink(ctx, color, 7); });
    return e;
  }
  function pill(ctx, txt, x, y, size, bg, fg = C.white, s = 1, rot = 0) {
    if (s <= 0.001) return;
    withT(ctx, x, y, s, rot, () => {
      ctx.font = `900 ${size}px ${FONT_BOLD}`; const w = ctx.measureText(txt).width + size * 0.9, h = size * 1.45;
      rr(ctx, -w / 2 + 6, -h / 2 + 9, w, h, h / 2); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fill();
      rr(ctx, -w / 2, -h / 2, w, h, h / 2); ink(ctx, bg, 6);
      plainText(ctx, txt, 0, 2, size, fg, { weight: 900 });
    });
  }
  function stamp(ctx, txt, x, y, lt, t0, o = {}) {
    if (lt < t0) return; const p = prog(lt, t0, 0.16), s = lerp(2.6, 1, eIn(p)) * (o.scale || 1);
    ctx.save(); ctx.globalAlpha = lerp(0, 1, eOut(p * 2));
    withT(ctx, x, y, s, o.rot ?? -0.2, () => {
      ctx.font = `${o.size || 120}px ${FONT_COMIC}`; const w = ctx.measureText(txt).width + 80, h = (o.size || 120) * 1.35, col = o.color || C.red;
      rr(ctx, -w / 2, -h / 2, w, h, 22); ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill(); ctx.lineWidth = 14; ctx.strokeStyle = col; ctx.stroke();
      rr(ctx, -w / 2 + 16, -h / 2 + 16, w - 32, h - 32, 12); ctx.lineWidth = 5; ctx.stroke();
      ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, 0, 8);
    });
    ctx.restore();
  }
  function newspaper(ctx, cx, cy, w, o = {}) {
    const h = w * 1.22, x = cx - w / 2, y = cy - h / 2;
    rr(ctx, x + 14, y + 18, w, h, 6); ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fill();
    rr(ctx, x, y, w, h, 6); ink(ctx, '#F4EFE3', 9);
    plainText(ctx, o.masthead || 'NEWS', cx, y + w * 0.11, w * 0.11, C.ink, { weight: 900, font: 'Georgia, serif' });
    ctx.fillStyle = C.ink; ctx.fillRect(x + 30, y + w * 0.19, w - 60, 6); ctx.fillRect(x + 30, y + w * 0.205, w - 60, 2);
    (o.headline || []).forEach((ln, i) => plainText(ctx, ln, cx, y + w * (0.3 + i * 0.1), w * 0.075, C.ink, { weight: 900 }));
    const by = y + w * (0.3 + (o.headline || []).length * 0.1) + 10;
    rr(ctx, x + 36, by, w * 0.5, w * 0.48, 6); ink(ctx, '#DCD5C4', 5);
    if (o.picture) o.picture(x + 36, by, w * 0.5, w * 0.48);
    ctx.fillStyle = '#B6AE9D';
    for (let i = 0; i < 8; i++) ctx.fillRect(x + w * 0.6, by + 10 + i * w * 0.06, w * 0.33 * (i % 3 === 2 ? 0.7 : 1), 10);
    for (let i = 0; i < 3; i++) ctx.fillRect(x + 36, by + w * 0.54 + i * w * 0.06, (w - 72) * (i === 2 ? 0.6 : 1), 10);
  }
  function factory(ctx, cx, by, w, lt, o = {}) {
    const h = w * 0.52, x = cx - w / 2, y = by - h;
    [[0.68, 0.16], [0.82, 0.22]].forEach(([fx, ch], i) => {
      ctx.beginPath(); rr(ctx, x + w * fx, y - h * ch - h * 0.3, w * 0.08, h * 0.6, 6); ink(ctx, '#B5533C', 7);
      for (let k = 0; k < 4; k++) { const ph = (lt * 0.7 + k * 0.25 + i * 0.13) % 1; ctx.globalAlpha = 1 - ph; ctx.beginPath();
        ctx.arc(x + w * (fx + 0.04) + ph * 60, y - h * ch - h * 0.35 - ph * 220, 30 + ph * 40, 0, 7); ink(ctx, '#DDE1E6', 5); ctx.globalAlpha = 1; }
    });
    ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(x, y);
    const teeth = 4; for (let i = 0; i < teeth; i++) { const sx = x + (w / teeth) * i; ctx.lineTo(sx + w / teeth, y - h * 0.22); ctx.lineTo(sx + w / teeth, y); }
    ctx.lineTo(x + w, by); ctx.closePath(); ink(ctx, '#E9E3D6', 9);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { rr(ctx, x + w * (0.07 + i * 0.235), y + h * (0.12 + j * 0.3), w * 0.14, h * 0.18, 6); ink(ctx, '#7FC4F5', 5); }
    rr(ctx, cx - w * 0.09, by - h * 0.32, w * 0.18, h * 0.32, 6); ink(ctx, '#9C6B3E', 6);
    if (o.sign) { pill(ctx, o.sign, cx, y - h * 0.38, 54, C.blue, C.white, o.signScale ?? 1, -0.02); }
  }
  function clipboard(ctx, cx, cy, w, h) {
    rr(ctx, cx - w / 2 + 14, cy - h / 2 + 18, w, h, 26); ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fill();
    rr(ctx, cx - w / 2, cy - h / 2, w, h, 26); ink(ctx, '#B98352', 9);
    rr(ctx, cx - w / 2 + 30, cy - h / 2 + 50, w - 60, h - 80, 10); ink(ctx, C.paper, 6);
    rr(ctx, cx - 110, cy - h / 2 - 30, 220, 90, 20); ink(ctx, '#9AA0A6', 8);
  }
  function gauge(ctx, cx, cy, r, val, o = {}) {
    // val: 0 (links/rot) .. 1 (rechts/gruen)
    const seg = [[C.red, 0, 0.33], [C.yellow, 0.33, 0.66], [C.green, 0.66, 1]];
    ctx.beginPath(); ctx.arc(cx, cy, r + 26, Math.PI, 0); ctx.lineTo(cx + r + 26, cy + 60); ctx.lineTo(cx - r - 26, cy + 60); ctx.closePath(); ink(ctx, C.white, 10);
    seg.forEach(([c, a, b]) => { ctx.beginPath(); ctx.arc(cx, cy, r - 30, Math.PI + a * Math.PI, Math.PI + b * Math.PI); ctx.lineWidth = 70; ctx.strokeStyle = c; ctx.lineCap = 'butt'; ctx.stroke(); });
    ctx.beginPath(); ctx.arc(cx, cy, r - 30, Math.PI, 0); ctx.lineWidth = 4; ctx.strokeStyle = C.ink;
    ctx.beginPath(); ctx.arc(cx, cy, r + 5, Math.PI, 0); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, r - 65, Math.PI, 0); ctx.stroke();
    if (o.ghost != null) { const a = Math.PI + o.ghost * Math.PI; ctx.setLineDash([18, 14]); ctx.lineWidth = 10; ctx.strokeStyle = C.greenD; ctx.globalAlpha = o.ghostAlpha ?? 1;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * (r - 40), cy + Math.sin(a) * (r - 40)); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
    const a = Math.PI + val * Math.PI;
    withT(ctx, cx, cy, 1, a, () => { ctx.beginPath(); ctx.moveTo(-10, -20); ctx.lineTo(r - 40, 0); ctx.lineTo(-10, 20); ctx.closePath(); ink(ctx, C.ink, 4, C.ink); });
    ctx.beginPath(); ctx.arc(cx, cy, 34, 0, 7); ink(ctx, C.greyD, 7);
    if (o.label) plainText(ctx, o.label, cx, cy + 115, 58, C.ink, { weight: 900 });
  }
  function priceTag(ctx, cx, cy, w, txt, o = {}) {
    const h = w * 0.46;
    withT(ctx, cx, cy, o.scale ?? 1, o.rot || 0, () => {
      ctx.beginPath(); ctx.moveTo(0, -h * 1.3); ctx.lineTo(-w * 0.42 + 10, 0); ctx.lineWidth = 6; ctx.strokeStyle = C.ink; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 2 + h * 0.5, -h / 2); ctx.lineTo(w / 2, -h / 2); ctx.lineTo(w / 2, h / 2); ctx.lineTo(-w / 2 + h * 0.5, h / 2); ctx.closePath();
      ink(ctx, o.color || C.yellow, 8);
      ctx.beginPath(); ctx.arc(-w * 0.42 + 10, 0, 12, 0, 7); ink(ctx, C.white, 5);
      const size = fitSize(ctx, txt, o.size || h * 0.55, w * 0.78, FONT_COMIC);
      comicText(ctx, txt, w * 0.07, 4, { size, fill: o.textColor || C.ink, stroke: C.ink, lw: 0.01, shadow: false });
    });
  }
  function serverRack(ctx, x, y, w, h, lt, seed) {
    const r = rng(seed);
    rr(ctx, x, y, w, h, 14); ink(ctx, '#2A2F3A', 9);
    const n = 7, uh = (h - 40) / n;
    for (let i = 0; i < n; i++) {
      rr(ctx, x + 18, y + 20 + i * uh, w - 36, uh - 12, 6); ink(ctx, '#3C4352', 4, '#11141A');
      for (let k = 0; k < 4; k++) { const on = Math.sin(lt * (6 + r() * 14) + r() * 9) > -0.2;
        ctx.fillStyle = on ? (k % 2 ? C.cyan : C.green) : '#1b1f27'; ctx.beginPath(); ctx.arc(x + 46 + k * 28, y + 20 + i * uh + (uh - 12) / 2, 8, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#596173'; for (let k = 0; k < 5; k++) ctx.fillRect(x + w - 60 - k * 18, y + 30 + i * uh, 8, uh - 32);
    }
  }
  function chip(ctx, cx, cy, s, label, o = {}) {
    ctx.save();
    if (o.glow) { const g = ctx.createRadialGradient(cx, cy, s * 0.2, cx, cy, s * 1.3); g.addColorStop(0, (o.glowColor || 'rgba(34,211,238,') + (0.55 * o.glow) + ')'); g.addColorStop(1, (o.glowColor || 'rgba(34,211,238,') + '0)'); ctx.fillStyle = g; ctx.fillRect(cx - s * 1.5, cy - s * 1.5, s * 3, s * 3); }
    ctx.fillStyle = '#C9A227'; ctx.strokeStyle = C.ink; ctx.lineWidth = 4;
    for (let i = 0; i < 5; i++) { const off = -s * 0.36 + i * s * 0.18;
      [[off, -s * 0.62, 0], [off, s * 0.48, 0], [-s * 0.62, off, 1], [s * 0.48, off, 1]].forEach(([px, py, v]) => { rr(ctx, cx + px - (v ? 0 : 6), cy + py - (v ? 6 : 0), v ? s * 0.14 : 12, v ? 12 : s * 0.14, 3); ctx.fill(); ctx.stroke(); }); }
    rr(ctx, cx - s / 2, cy - s / 2, s, s, s * 0.08); ink(ctx, o.color || '#262B36', 8);
    rr(ctx, cx - s * 0.32, cy - s * 0.32, s * 0.64, s * 0.64, s * 0.05); ink(ctx, o.inner || '#363D4C', 4, '#11141A');
    if (label) comicText(ctx, label, cx, cy + 4, { size: s * 0.3, fill: o.labelColor || C.cyan, shadow: false, lw: s * 0.04 });
    ctx.restore();
  }
  function ramStick(ctx, cx, cy, w, rot = 0) {
    withT(ctx, cx, cy, 1, rot, () => {
      const h = w * 0.28; rr(ctx, -w / 2, -h / 2, w, h, 6); ink(ctx, '#1E8A4C', 6);
      for (let i = 0; i < 4; i++) { rr(ctx, -w / 2 + 14 + i * (w - 28) / 4, -h / 2 + 10, (w - 28) / 4 - 12, h - 32, 3); ink(ctx, '#20242C', 3); }
      ctx.fillStyle = C.gold; for (let i = 0; i < 14; i++) ctx.fillRect(-w / 2 + 10 + i * (w - 20) / 14, h / 2 - 14, (w - 20) / 14 - 5, 10);
    });
  }
  function cart(ctx, cx, by, w, lt) {
    const h = w * 0.55;
    ctx.save(); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(cx - w / 2 - 50, by - h - 30); ctx.lineTo(cx - w / 2, by - h - 30); ctx.lineWidth = 14; ctx.strokeStyle = C.ink; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - w / 2, by - h); ctx.lineTo(cx + w / 2, by - h); ctx.lineTo(cx + w * 0.4, by - h * 0.2); ctx.lineTo(cx - w * 0.4, by - h * 0.2); ctx.closePath(); ink(ctx, '#C0C6CF', 9);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 4;
    for (let i = 1; i < 6; i++) { const fx = cx - w / 2 + (w / 6) * i; ctx.beginPath(); ctx.moveTo(fx, by - h); ctx.lineTo(fx - (fx - cx) * 0.2, by - h * 0.2); ctx.stroke(); }
    [cx - w * 0.3, cx + w * 0.3].forEach((wx) => { ctx.beginPath(); ctx.arc(wx, by - 18, 22, 0, 7); ink(ctx, '#333', 6); });
    ctx.restore();
  }
  function questionMarks(ctx, x, y, lt, n = 3, color = C.yellow) {
    for (let i = 0; i < n; i++) { const ph = lt * 1.3 + i * 1.7;
      comicText(ctx, '?', x + Math.sin(ph) * 30 + (i - 1) * 90, y - ((lt * 60 + i * 70) % 160), { size: 110 - i * 15, fill: color, rot: Math.sin(ph * 1.3) * 0.3, scale: pop(lt, i * 0.12) }); }
  }
  function liveBar(ctx, lt, ticker) {
    const y = lerp(-140, 150, eOut(prog(lt, 0, 0.35)));
    ctx.save();
    rr(ctx, 40, y, 1000, 92, 14); ink(ctx, C.ink, 0);
    rr(ctx, 40, y, 190, 92, 14); ink(ctx, C.red, 0);
    ctx.fillStyle = C.white; ctx.globalAlpha = Math.sin(lt * 9) > 0 ? 1 : 0.35; ctx.beginPath(); ctx.arc(82, y + 46, 13, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    plainText(ctx, 'LIVE', 152, y + 48, 46, C.white, { weight: 900 });
    plainText(ctx, 'PANDA INVESTIERT', 450, y + 48, 40, C.white, { weight: 900 });
    plainText(ctx, 'BÖRSENNEWS', 890, y + 48, 32, C.green, { weight: 900 });
    rr(ctx, 40, y + 100, 1000, 62, 10); ctx.fillStyle = C.yellow; ctx.fill();
    ctx.save(); rr(ctx, 40, y + 100, 1000, 62, 10); ctx.clip();
    ctx.font = `900 34px ${FONT_BOLD}`; const tw = ctx.measureText(ticker).width + 80; const off = (lt * 260) % tw;
    for (let k = 0; k < 3; k++) plainText(ctx, ticker, 1040 - off + k * tw - 1000 + 40, y + 133, 34, C.ink, { weight: 900, align: 'left' });
    ctx.restore(); ctx.restore();
  }
  function brandBug(ctx) {
    ctx.save(); ctx.globalAlpha = 0.9;
    pill(ctx, 'PANDA INVESTIERT', 225, 190, 30, C.ink, C.white);
    ctx.restore();
  }

  // ---------- Untertitel ----------
  function prepCaptions(caps) {
    return caps.map(([s, e, text]) => {
      const words = text.split(' '); const wts = words.map((w) => w.replace(/[^\wÄÖÜäöüß0-9]/g, '').length + 2);
      const tot = wts.reduce((a, b) => a + b, 0); let acc = s;
      return { s, e, words: words.map((w, i) => { const d = (e - s) * wts[i] / tot; const o = { w, s: acc, e: acc + d }; acc += d; return o; }) };
    });
  }
  function captions(ctx, caps, t) {
    let cur = null;
    for (let i = 0; i < caps.length; i++) { const c = caps[i], nx = caps[i + 1]; if (t >= c.s && t < (nx ? Math.min(nx.s, c.e + 0.6) : c.e + 0.6)) cur = c; }
    if (!cur) return;
    const size = 66, maxW = 880, lh = 90, sp = 34;
    ctx.save(); ctx.font = `900 ${size}px ${FONT_BOLD}`;
    const lines = [[]]; let lw = 0;
    cur.words.forEach((w) => { const ww = ctx.measureText(w.w.toUpperCase()).width; if (lw + ww > maxW && lines[lines.length - 1].length) { lines.push([]); lw = 0; } lines[lines.length - 1].push({ ...w, ww }); lw += ww + sp; });
    const s0 = lerp(0.92, 1, eOut(prog(t, cur.s, 0.18)));
    const baseY = 1470 - (lines.length - 1) * lh / 2;
    ctx.translate(540, baseY); ctx.scale(s0, s0);
    lines.forEach((ln, li) => {
      const tw = ln.reduce((a, w) => a + w.ww, 0) + sp * (ln.length - 1); let x = -tw / 2; const y = li * lh;
      ln.forEach((w) => {
        const active = t >= w.s && t < w.e + 0.02, ws = active ? 1.07 : 1;
        ctx.save(); ctx.translate(x + w.ww / 2, y); ctx.scale(ws, ws); ctx.rotate(active ? -0.03 : 0);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
        ctx.lineWidth = 17; ctx.strokeStyle = C.ink; ctx.strokeText(w.w.toUpperCase(), 0, 6); ctx.strokeText(w.w.toUpperCase(), 0, 0);
        ctx.fillStyle = active ? C.yellow : C.white; ctx.fillText(w.w.toUpperCase(), 0, 0);
        ctx.restore(); x += w.ww + sp;
      });
    });
    ctx.restore();
  }

  // ---------- Szenen-Steuerung ----------
  let VIDEO = null, CAPS = null, ctx = null;
  function sceneAt(t) { let s = VIDEO.scenes[0]; for (const sc of VIDEO.scenes) if (t >= sc.start) s = sc; return s; }
  function bokeh(c, t, mood) {
    const r = rng(77), dark = mood === 'dark';
    c.save(); c.globalCompositeOperation = dark ? 'lighter' : 'source-over';
    for (let i = 0; i < 16; i++) {
      const x = (r() * 1300 - 110 + t * (8 + r() * 14)) % 1300 - 110, y = (r() * 2100 - 90 - t * (10 + r() * 18) + 2100) % 2100 - 90, rad = 30 + r() * 90;
      const g = c.createRadialGradient(x, y, 0, x, y, rad), a = (0.06 + r() * 0.1) * (0.6 + 0.4 * Math.sin(t * 0.8 + i));
      const col = dark ? (i % 3 ? '120,220,255' : '255,214,120') : '255,255,255';
      g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    c.restore();
  }
  let grainTiles = null;
  function grain(c, t) {
    if (!grainTiles) {
      grainTiles = []; const r = rng(5);
      for (let k = 0; k < 4; k++) { const g = document.createElement('canvas'); g.width = g.height = 256; const gc = g.getContext('2d'), im = gc.createImageData(256, 256);
        for (let i = 0; i < im.data.length; i += 4) { const v = 128 + (r() - 0.5) * 120; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
        gc.putImageData(im, 0, 0); grainTiles.push(c.createPattern(g, 'repeat')); }
    }
    c.save(); c.globalCompositeOperation = 'overlay'; c.globalAlpha = VIDEO.grain; c.fillStyle = grainTiles[Math.floor(t * 24) % 4]; c.fillRect(0, 0, W, H); c.restore();
  }
  function drawScene(c, sc, t) {
    const idx = VIDEO.scenes.indexOf(sc), next = VIDEO.scenes[idx + 1];
    const lt = t - sc.start, dur = (next ? next.start : VIDEO.duration) - sc.start;
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.filter = 'none';
    const f = sc.focus || { x: 540, y: 880 };
    let z = 1 + (sc.zoom ?? 0.05) * eInOut(lt / dur) + (sc.punch === false ? 0 : 0.06 * (1 - eOut(lt / 0.55)));
    let sx = 0, sy = 0;
    (sc.shake || []).forEach((st) => { if (lt >= st) { const k = Math.max(0, 1 - (lt - st) / 0.4); sx += Math.sin(lt * 70) * 12 * k; sy += Math.cos(lt * 61) * 10 * k; } });
    c.save(); c.translate(sx * 0.5, sy * 0.5); c.translate(540, 960); c.scale(1.04, 1.04); c.translate(-540, -960);
    background(c, sc.mood, t, sc.bg || {}); if (VIDEO.bokeh) bokeh(c, t, sc.mood); c.restore();
    c.save(); c.translate(f.x + sx, f.y + sy); c.scale(z, z); c.translate(-f.x, -f.y);
    sc.draw(c, lt, t, dur);
    c.restore();
  }
  let xfCanvas = null;
  function renderFrame(t) {
    const sc = sceneAt(t), idx = VIDEO.scenes.indexOf(sc), lt = t - sc.start, XF = VIDEO.xfade || 0;
    if (idx > 0 && XF && lt < XF) {
      drawScene(ctx, VIDEO.scenes[idx - 1], t);
      if (!xfCanvas) { xfCanvas = document.createElement('canvas'); xfCanvas.width = W; xfCanvas.height = H; }
      const xc = xfCanvas.getContext('2d'); xc.imageSmoothingQuality = 'high'; drawScene(xc, sc, t);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.save(); ctx.globalAlpha = eInOut(lt / XF); ctx.drawImage(xfCanvas, 0, 0); ctx.restore();
    } else drawScene(ctx, sc, t);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    if (VIDEO.brand !== false && !sc.noBrand) brandBug(ctx);
    captions(ctx, CAPS, t);
    if (VIDEO.grain) grain(ctx, t);
    if (!XF && idx > 0 && sc.flash !== false) { const a = 0.22 * (1 - prog(lt, 0, 0.2)); if (a > 0) { ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fillRect(0, 0, W, H); } }
    if (VIDEO.endFade !== false && t > VIDEO.duration - 0.25) { ctx.fillStyle = `rgba(0,0,0,${prog(t, VIDEO.duration - 0.25, 0.25)})`; ctx.fillRect(0, 0, W, H); }
  }
  function sfxCues() {
    const cues = [];
    VIDEO.scenes.forEach((sc, i) => {
      if (i > 0 && sc.whoosh) cues.push({ t: sc.start - 0.08, type: 'whoosh', gain: sc.whoosh === true ? 1 : sc.whoosh });
      (sc.shake || []).forEach((st) => cues.push({ t: sc.start + st, type: sc.shakeSfx || 'boom' }));
      (sc.pops || []).forEach((st) => cues.push({ t: sc.start + st, type: 'pop' }));
      (sc.sfx || []).forEach(([st, type, gain, pan]) => cues.push({ t: sc.start + st, type, gain, pan }));
    });
    return cues;
  }
  async function init(video) {
    VIDEO = video; CAPS = prepCaptions(video.captions);
    const cv = document.getElementById('c'); cv.width = W; cv.height = H; ctx = cv.getContext('2d'); ctx.imageSmoothingQuality = 'high';
    await Promise.all([document.fonts.load(`100px ${FONT_COMIC}`), document.fonts.load(`900 70px ${FONT_BOLD}`), document.fonts.load(`800 70px ${FONT_BOLD}`)]);
    const poses = new Set(); video.scenes.forEach((s) => (s.poses || []).forEach((p) => poses.add(p)));
    await Promise.all([...poses].map((p) => new Promise((res, rej) => { const im = new Image(); im.onload = () => { IMG[p] = im; res(); }; im.onerror = () => rej(new Error('Bild fehlt: ' + p)); im.src = `../assets_hd/${p}.png`; })));
    return { duration: video.duration, fps: video.fps || 30, sfx: sfxCues(), endFade: video.endFade };
  }
  function frameJpeg(t, q = 0.93) { renderFrame(t); return document.getElementById('c').toDataURL('image/jpeg', q); }

  window.E = { W, H, C, FONT_COMIC, FONT_BOLD, clamp, lerp, prog, eOut, eIn, eInOut, eBack, eElastic, pop, rng, rr, ink, withT, dropShadow, comicText, plainText, fitSize, headline,
    background, drawPanda, burst, explosion, speedLines, moneyBill, moneyRain, arrowDown, arrowUp, iphone, apple, whiteboard, lineChart, pill, stamp,
    newspaper, factory, clipboard, gauge, priceTag, serverRack, chip, ramStick, cart, questionMarks, liveBar, init, renderFrame, frameJpeg };
})();
