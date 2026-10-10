// Wiederverwendbare Comic-Requisiten (zusaetzlich zu engine.js). Zugriff: E.P.<name>(ctx, ...)
(() => {
  const E = window.E, C = E.C;
  const { rr, ink, withT, plainText, comicText, lerp, clamp, eOut, prog, pop } = E;

  const softShadow = (ctx, x, y, w, h = 26) => { ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.beginPath(); ctx.ellipse(x, y, w, h, 0, 0, 7); ctx.fill(); ctx.restore(); };

  function coin(ctx, x, y, r) {
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.18, r, r * 0.42, 0, 0, 7); ink(ctx, '#C98F00', 5);
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.42, 0, 0, 7); ink(ctx, C.gold, 5);
    plainText(ctx, '$', x, y + 2, r * 0.55, '#8A5A00', { weight: 900 });
  }
  const coinStack = (ctx, x, by, r, n) => { for (let i = 0; i < n; i++) coin(ctx, x, by - i * r * 0.32, r); };

  function calendar(ctx, x, y, s, top, big, rot = -0.05) {
    withT(ctx, x, y, s, rot, () => {
      rr(ctx, -180 + 10, -170 + 16, 360, 360, 30); ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fill();
      rr(ctx, -180, -170, 360, 360, 30); ink(ctx, C.white, 9); rr(ctx, -180, -170, 360, 100, 30); ink(ctx, C.red, 9);
      plainText(ctx, top, 0, -118, 44, C.white, { weight: 900 }); plainText(ctx, big, 0, 60, 170, C.ink, { weight: 900 });
      for (const rx of [-110, 110]) { rr(ctx, rx - 12, -200, 24, 70, 12); ink(ctx, C.greyD, 6); }
    });
  }

  // US-Flagge, weht im Wind
  function flagUS(ctx, x, y, w, t) {
    const h = w * 0.55, n = 26;
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = C.ink; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(x, y - 20); ctx.lineTo(x, y + h * 2.2); ctx.stroke();
    ctx.strokeStyle = '#B8BEC8'; ctx.lineWidth = 8; ctx.stroke();
    const wave = (u, v) => [x + u * w, y + v * h + Math.sin(t * 3.2 - u * 5) * 14 * u];
    for (let k = 0; k < 13; k++) {
      ctx.beginPath();
      for (let i = 0; i <= n; i++) { const [px, py] = wave(i / n, k / 13); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      for (let i = n; i >= 0; i--) { const [px, py] = wave(i / n, (k + 1) / 13); ctx.lineTo(px, py); }
      ctx.closePath(); ctx.fillStyle = k % 2 ? C.white : '#D7263D'; ctx.fill();
    }
    ctx.beginPath();
    for (let i = 0; i <= n * 0.42; i++) { const [px, py] = wave(i / n, 0); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    for (let i = Math.floor(n * 0.42); i >= 0; i--) { const [px, py] = wave(i / n, 7 / 13); ctx.lineTo(px, py); }
    ctx.closePath(); ctx.fillStyle = '#1F3A93'; ctx.fill();
    ctx.fillStyle = C.white;
    for (let a = 0; a < 4; a++) for (let b = 0; b < 5; b++) { const [px, py] = wave(0.05 + b * 0.075, 0.08 + a * 0.13); ctx.beginPath(); ctx.arc(px, py, 4.5, 0, 7); ctx.fill(); }
    // Umriss
    ctx.beginPath();
    for (let i = 0; i <= n; i++) { const [px, py] = wave(i / n, 0); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    for (let i = n; i >= 0; i--) { const [px, py] = wave(i / n, 1); ctx.lineTo(px, py); }
    ctx.closePath(); ctx.lineWidth = 6; ctx.strokeStyle = C.ink; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.restore();
  }

  function podium(ctx, x, by, w, label = 'USA') {
    const h = w * 0.95;
    softShadow(ctx, x, by, w * 0.7);
    ctx.beginPath(); ctx.moveTo(x - w * 0.5, by - h); ctx.lineTo(x + w * 0.5, by - h); ctx.lineTo(x + w * 0.4, by); ctx.lineTo(x - w * 0.4, by); ctx.closePath(); ink(ctx, '#2A4C9C', 9);
    rr(ctx, x - w * 0.56, by - h - 30, w * 1.12, 40, 10); ink(ctx, '#1E3A7A', 8);
    ctx.beginPath(); ctx.arc(x, by - h * 0.55, w * 0.2, 0, 7); ink(ctx, C.gold, 7);
    ctx.beginPath(); ctx.arc(x, by - h * 0.55, w * 0.14, 0, 7); ink(ctx, '#F7D774', 4);
    plainText(ctx, label, x, by - h * 0.55, w * 0.11, '#1E3A7A', { weight: 900 });
    [-0.16, 0.16].forEach((dx) => {
      ctx.strokeStyle = C.ink; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x + dx * w, by - h - 30); ctx.quadraticCurveTo(x + dx * w * 1.6, by - h - 120, x + dx * w * 1.1, by - h - 170); ctx.stroke();
      withT(ctx, x + dx * w * 1.1, by - h - 180, 1, dx * 2, () => { rr(ctx, -16, -34, 32, 50, 14); ink(ctx, '#3A3F48', 6); });
    });
  }

  function bubble(ctx, x, y, w, h, lines, o = {}) {
    withT(ctx, x, y, o.scale ?? 1, o.rot || 0, () => {
      rr(ctx, -w / 2 + 10, -h / 2 + 14, w, h, 34); ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fill();
      ctx.beginPath(); rr(ctx, -w / 2, -h / 2, w, h, 34); ink(ctx, o.fill || C.white, 8);
      const tx = o.tail ?? -0.25;
      ctx.beginPath(); ctx.moveTo(w * tx - 30, h / 2 - 4); ctx.lineTo(w * tx - 70, h / 2 + 70); ctx.lineTo(w * tx + 30, h / 2 - 4); ctx.closePath(); ink(ctx, o.fill || C.white, 8);
      ctx.fillStyle = o.fill || C.white; ctx.fillRect(w * tx - 26, h / 2 - 14, 52, 14);
      lines.forEach((ln, i) => plainText(ctx, ln, 0, -((lines.length - 1) * 30) + i * 60, o.size || 46, o.color || C.ink, { weight: 900 }));
    });
  }

  // Zapfsaeule mit Preis-Display
  function gasPump(ctx, x, by, h, price, o = {}) {
    const w = h * 0.48, top = by - h;
    softShadow(ctx, x, by, w * 0.85);
    rr(ctx, x - w / 2 - 20, by - 40, w + 40, 40, 10); ink(ctx, '#5B6270', 7);
    rr(ctx, x - w / 2, top, w, h - 30, 26); ink(ctx, o.color || '#E63946', 9);
    rr(ctx, x - w / 2 + 10, top + 10, w - 20, 50, 16); ink(ctx, 'rgba(255,255,255,0.22)', 0);
    rr(ctx, x - w * 0.36, top + h * 0.12, w * 0.72, h * 0.3, 14); ink(ctx, '#11151C', 7);
    plainText(ctx, o.unit || 'BENZIN · $ / GALLONE', x, top + h * 0.17, h * 0.032, '#8BE9A6', { weight: 800 });
    plainText(ctx, price, x, top + h * 0.3, E.fitSize(ctx, price, h * 0.11, w * 0.64, E.FONT_BOLD), o.priceColor || C.yellow, { weight: 900 });
    rr(ctx, x - w * 0.3, top + h * 0.5, w * 0.6, h * 0.16, 12); ink(ctx, C.white, 6);
    plainText(ctx, o.label || 'SUPER', x, top + h * 0.58, h * 0.05, C.ink, { weight: 900 });
    // Schlauch + Zapfpistole
    ctx.strokeStyle = C.ink; ctx.lineWidth = 22; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + w / 2, top + h * 0.72);
    ctx.bezierCurveTo(x + w * 1.1, top + h * 0.95, x + w * 1.05, top + h * 0.2, x + w * 0.62, top + h * 0.28); ctx.stroke();
    ctx.strokeStyle = '#3A3F48'; ctx.lineWidth = 12; ctx.stroke();
    withT(ctx, x + w * 0.6, top + h * 0.3, 1, -0.3, () => { rr(ctx, -20, -30, 60, 70, 12); ink(ctx, '#2A2F3A', 6); rr(ctx, 30, -26, 60, 18, 6); ink(ctx, '#C0C6CF', 5); });
  }

  function barrel(ctx, x, y, h, o = {}) {
    const w = h * 0.68;
    softShadow(ctx, x, y + h / 2, w * 0.62, 22);
    rr(ctx, x - w / 2, y - h / 2, w, h, 26); ink(ctx, o.color || '#1F2937', 9);
    [0.22, 0.78].forEach((v) => { ctx.beginPath(); ctx.moveTo(x - w / 2, y - h / 2 + h * v); ctx.lineTo(x + w / 2, y - h / 2 + h * v); ctx.lineWidth = 9; ctx.strokeStyle = C.ink; ctx.stroke(); });
    ctx.beginPath(); ctx.ellipse(x, y - h / 2 + 6, w / 2 - 4, 22, 0, 0, 7); ink(ctx, '#374151', 7);
    rr(ctx, x - w / 2 + 8, y - h * 0.18, w - 16, h * 0.36, 8); ink(ctx, C.yellow, 6);
    // Tropfen-Logo
    withT(ctx, x - w * 0.22, y, 1, 0, () => { ctx.beginPath(); ctx.moveTo(0, -30); ctx.bezierCurveTo(22, -4, 22, 24, 0, 24); ctx.bezierCurveTo(-22, 24, -22, -4, 0, -30); ink(ctx, C.ink, 0); });
    plainText(ctx, o.label || 'ÖL', x + w * 0.1, y + 2, h * 0.15, C.ink, { weight: 900 });
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; rr(ctx, x - w / 2 + 16, y - h / 2 + 30, 18, h - 60, 9); ctx.fill();
  }

  function waves(ctx, y, t, o = {}) {
    const col = o.color || '#3B82F6';
    ctx.save();
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-50, 2000);
    for (let x = -50; x <= 1130; x += 20) ctx.lineTo(x, y + Math.sin(x * 0.02 + t * 2) * 10 + Math.sin(x * 0.007 - t) * 8);
    ctx.lineTo(1130, 2000); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    for (let k = 0; k < 9; k++) { const x = ((k * 137 + t * 40) % 1200) - 60, yy = y + 60 + (k % 3) * 70; ctx.beginPath(); ctx.moveTo(x, yy); ctx.quadraticCurveTo(x + 25, yy - 10, x + 50, yy); ctx.stroke(); }
    ctx.restore();
  }

  function tanker(ctx, x, y, w, t, o = {}) {
    const h = w * 0.2, bob = Math.sin(t * 2.2) * 4;
    withT(ctx, x, y + bob, 1, Math.sin(t * 1.7) * 0.012, () => {
      // Rumpf
      ctx.beginPath(); ctx.moveTo(-w / 2, -h * 0.2); ctx.lineTo(w / 2 + h * 0.4, -h * 0.2); ctx.lineTo(w / 2, h * 0.7); ctx.lineTo(-w / 2 + h * 0.2, h * 0.7); ctx.closePath(); ink(ctx, o.hull || '#1F2937', 8);
      ctx.beginPath(); ctx.moveTo(-w / 2 + h * 0.08, h * 0.35); ctx.lineTo(w / 2 + h * 0.12, h * 0.35); ctx.lineTo(w / 2, h * 0.7); ctx.lineTo(-w / 2 + h * 0.2, h * 0.7); ctx.closePath(); ink(ctx, '#C0392B', 0);
      ctx.beginPath(); ctx.moveTo(-w / 2, -h * 0.2); ctx.lineTo(w / 2 + h * 0.4, -h * 0.2); ctx.lineTo(w / 2, h * 0.7); ctx.lineTo(-w / 2 + h * 0.2, h * 0.7); ctx.closePath(); ink(ctx, null, 8);
      // Deck mit Rohren und Tanks
      rr(ctx, -w * 0.32, -h * 0.5, w * 0.7, h * 0.3, 8); ink(ctx, '#9CA3AF', 6);
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(-w * 0.25 + i * w * 0.13, -h * 0.5, w * 0.045, h * 0.12, 0, Math.PI, 0); ink(ctx, '#D1D5DB', 5); }
      // Bruecke am Heck
      rr(ctx, -w * 0.48, -h * 1.25, w * 0.14, h * 1.05, 6); ink(ctx, C.white, 7);
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) { rr(ctx, -w * 0.465 + c * w * 0.04, -h * 1.12 + r * h * 0.3, w * 0.028, h * 0.16, 3); ink(ctx, '#60A5FA', 3); }
      rr(ctx, -w * 0.43, -h * 1.6, w * 0.035, h * 0.36, 4); ink(ctx, '#C0392B', 5);
      if (o.label) plainText(ctx, o.label, w * 0.1, h * 0.1, h * 0.32, C.white, { weight: 900 });
    });
    // Bugwelle
    ctx.save(); ctx.globalAlpha = 0.8; ctx.fillStyle = C.white;
    for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(x + w / 2 + 10 - k * 18, y + h * 0.75 + bob + Math.sin(t * 6 + k) * 3, 14 - k, 0, 7); ctx.fill(); }
    ctx.restore();
  }

  function carrier(ctx, x, y, w, t, num = '3') {
    const h = w * 0.16, bob = Math.sin(t * 1.8) * 4;
    withT(ctx, x, y + bob, 1, 0, () => {
      ctx.beginPath(); ctx.moveTo(-w / 2, -h * 0.1); ctx.lineTo(w / 2 + h * 0.6, -h * 0.35); ctx.lineTo(w / 2, h * 0.8); ctx.lineTo(-w / 2 + h * 0.3, h * 0.8); ctx.closePath(); ink(ctx, '#6B7280', 8);
      ctx.beginPath(); ctx.moveTo(-w / 2 - h * 0.2, -h * 0.1); ctx.lineTo(w / 2 + h * 0.7, -h * 0.38); ctx.lineTo(w / 2 + h * 0.6, -h * 0.55); ctx.lineTo(-w / 2 - h * 0.1, -h * 0.3); ctx.closePath(); ink(ctx, '#4B5563', 7);
      ctx.setLineDash([24, 18]); ctx.strokeStyle = C.white; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-w * 0.4, -h * 0.22); ctx.lineTo(w * 0.5, -h * 0.45); ctx.stroke(); ctx.setLineDash([]);
      rr(ctx, w * 0.12, -h * 1.15, w * 0.1, h * 0.72, 6); ink(ctx, '#9CA3AF', 6);
      rr(ctx, w * 0.14, -h * 1.0, w * 0.06, h * 0.14, 3); ink(ctx, '#60A5FA', 3);
      plainText(ctx, num, -w * 0.3, h * 0.35, h * 0.55, C.white, { weight: 900 });
    });
  }

  function helmet(ctx, x, y, s) {
    withT(ctx, x, y, s, 0, () => {
      ctx.beginPath(); ctx.arc(0, 0, 40, Math.PI, 0); ctx.lineTo(48, 6); ctx.lineTo(-48, 6); ctx.closePath(); ink(ctx, '#4D6B3C', 6);
      ctx.beginPath(); ctx.arc(-12, -18, 8, 0, 7); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fill();
    });
  }

  // Angelhaken mit Etikett ("Der Haken")
  function hook(ctx, x, y, s, t, tag) {
    const sw = Math.sin(t * 1.6) * 0.08;
    withT(ctx, x, -50, 1, sw, () => {
      ctx.strokeStyle = '#E5E7EB'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, y + 50 - 120 * s); ctx.stroke();
      withT(ctx, 0, y + 50, s, 0, () => {
        ctx.lineCap = 'round'; ctx.lineWidth = 26; ctx.strokeStyle = C.ink;
        const path = () => { ctx.beginPath(); ctx.moveTo(0, -120); ctx.lineTo(0, 40); ctx.arc(-50, 40, 50, 0, Math.PI * 0.95); ctx.lineTo(-108, 0); };
        path(); ctx.stroke(); ctx.lineWidth = 14; ctx.strokeStyle = '#C0C6CF'; path(); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, -132, 16, 0, 7); ctx.lineWidth = 8; ctx.strokeStyle = C.ink; ctx.stroke();
        if (tag) { ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-60, 92); ctx.lineTo(-60, 150); ctx.stroke();
          rr(ctx, -260, 150, 400, 100, 20); ink(ctx, C.yellow, 8); plainText(ctx, tag, -60, 202, 46, C.ink, { weight: 900 }); }
      });
    });
  }

  function ballotBox(ctx, x, by, w, lt, t0 = 0.3) {
    const h = w * 0.8;
    softShadow(ctx, x, by, w * 0.6);
    // Stimmzettel faellt rein
    const p = prog(lt, t0, 0.6), py = lerp(by - h - 260, by - h + 30, eOut(p));
    if (p < 1) withT(ctx, x, py, 1, Math.sin(lt * 4) * 0.15 * (1 - p), () => { rr(ctx, -70, -90, 140, 180, 8); ink(ctx, C.white, 6); ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-40, -20); ctx.lineTo(-20, 0); ctx.lineTo(25, -45); ctx.stroke(); for (let i = 0; i < 3; i++) { ctx.fillStyle = '#9CA3AF'; ctx.fillRect(-45, 25 + i * 20, 90, 7); } });
    rr(ctx, x - w / 2, by - h, w, h, 18); ink(ctx, '#F3F4F6', 9);
    rr(ctx, x - w / 2 - 14, by - h - 22, w + 28, 40, 10); ink(ctx, '#2A4C9C', 8);
    rr(ctx, x - w * 0.28, by - h - 8, w * 0.56, 14, 7); ink(ctx, C.ink, 0);
    plainText(ctx, 'WAHL', x, by - h * 0.5, w * 0.18, '#2A4C9C', { weight: 900 });
    ctx.fillStyle = '#D7263D'; ctx.fillRect(x - w * 0.35, by - h * 0.28, w * 0.7, 10);
  }

  // stilisierte Weltkarte mit Route
  function routeMap(ctx, x, y, w, h, p, t, o = {}) {
    rr(ctx, x - w / 2 + 12, y - h / 2 + 16, w, h, 30); ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fill();
    rr(ctx, x - w / 2, y - h / 2, w, h, 30); ink(ctx, '#7CC4F5', 9);
    ctx.save(); rr(ctx, x - w / 2, y - h / 2, w, h, 30); ctx.clip();
    const land = (cx, cy, rx, ry, rot) => { ctx.beginPath(); ctx.ellipse(x + cx * w, y + cy * h, rx * w, ry * h, rot, 0, 7); ink(ctx, '#86D19A', 6, '#2F7A45'); };
    land(-0.3, -0.12, 0.17, 0.2, 0.3); land(-0.22, 0.25, 0.07, 0.16, -0.2); land(0.08, -0.15, 0.08, 0.14, 0); land(0.3, -0.08, 0.2, 0.22, -0.2); land(0.38, 0.3, 0.08, 0.08, 0);
    ctx.restore();
    const A = [x - 0.3 * w, y - 0.08 * h], B = [x + 0.3 * w, y - 0.02 * h], Cc = [x, y + 0.45 * h];
    const q = (u) => [(1 - u) ** 2 * A[0] + 2 * (1 - u) * u * Cc[0] + u * u * B[0], (1 - u) ** 2 * A[1] + 2 * (1 - u) * u * Cc[1] + u * u * B[1]];
    ctx.setLineDash([18, 14]); ctx.strokeStyle = C.white; ctx.lineWidth = 8; ctx.beginPath();
    for (let i = 0; i <= 40 * p; i++) { const [px, py] = q(i / 40); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); ctx.setLineDash([]);
    const pin = (px, py, label, col) => { withT(ctx, px, py, 1, 0, () => { ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-34, -40, -30, -84, 0, -84); ctx.bezierCurveTo(30, -84, 34, -40, 0, 0); ink(ctx, col, 6); ctx.beginPath(); ctx.arc(0, -56, 12, 0, 7); ink(ctx, C.white, 0); }); E.pill(ctx, label, px, py + 34, 30, C.ink, C.white); };
    pin(A[0], A[1], o.from || 'USA', '#1F3A93'); pin(B[0], B[1], o.to || 'ASIEN', C.red);
    if (p > 0.02) { const [sx, sy] = q(Math.min(p, 0.999)); withT(ctx, sx, sy, 1, 0, () => tanker(ctx, 0, -10, 150, t, {})); }
  }

  function crosshair(ctx, x, y, r, t, col = C.red) {
    const k = 1 + Math.sin(t * 5) * 0.06;
    withT(ctx, x, y, k, t * 0.4, () => {
      ctx.strokeStyle = col; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r * 0.45, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-r * 1.3, 0); ctx.lineTo(-r * 0.6, 0); ctx.moveTo(r * 0.6, 0); ctx.lineTo(r * 1.3, 0); ctx.moveTo(0, -r * 1.3); ctx.lineTo(0, -r * 0.6); ctx.moveTo(0, r * 0.6); ctx.lineTo(0, r * 1.3); ctx.stroke();
    });
  }

  function wallet(ctx, x, y, w, t) {
    const h = w * 0.62;
    softShadow(ctx, x, y + h / 2 + 10, w * 0.5);
    rr(ctx, x - w / 2, y - h / 2, w, h, 26); ink(ctx, '#8B5A2B', 9);
    rr(ctx, x - w / 2 + 16, y - h / 2 - 50, w - 32, 80, 16); ink(ctx, '#A0703D', 8);
    rr(ctx, x + w * 0.18, y - h * 0.12, w * 0.36, h * 0.3, 14); ink(ctx, '#6E4520', 7);
    ctx.beginPath(); ctx.arc(x + w * 0.3, y + h * 0.03, 10, 0, 7); ink(ctx, C.gold, 4);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.setLineDash([10, 10]); ctx.lineWidth = 4; rr(ctx, x - w / 2 + 14, y - h / 2 + 14, w - 28, h - 28, 18); ctx.stroke(); ctx.setLineDash([]);
    for (let k = 0; k < 3; k++) { // Motten
      const ph = (t * 0.35 + k * 0.33) % 1, mx = x - 60 + k * 70 + Math.sin(t * 3 + k) * 40, my = y - h / 2 - 40 - ph * 260;
      ctx.globalAlpha = 1 - ph; const f = Math.abs(Math.sin(t * 18 + k)) * 0.8 + 0.2;
      withT(ctx, mx, my, 1, 0, () => { [-1, 1].forEach((d) => { ctx.beginPath(); ctx.ellipse(d * 16, 0, 18, 12 * f, d * 0.4, 0, 7); ink(ctx, '#B8B1A3', 4); }); ctx.beginPath(); ctx.ellipse(0, 0, 6, 14, 0, 0, 7); ink(ctx, '#6B6355', 3); });
      ctx.globalAlpha = 1;
    }
  }

  function dove(ctx, x, y, s, t) {
    const f = Math.sin(t * 7) * 0.5;
    withT(ctx, x, y, s, -0.1, () => {
      ctx.beginPath(); ctx.ellipse(0, 0, 80, 44, 0, 0, 7); ink(ctx, C.white, 7);
      ctx.beginPath(); ctx.arc(70, -30, 30, 0, 7); ink(ctx, C.white, 7);
      ctx.beginPath(); ctx.moveTo(96, -34); ctx.lineTo(128, -26); ctx.lineTo(96, -20); ctx.closePath(); ink(ctx, C.orange, 5);
      ctx.beginPath(); ctx.arc(78, -38, 5, 0, 7); ctx.fillStyle = C.ink; ctx.fill();
      ctx.beginPath(); ctx.moveTo(-60, 0); ctx.lineTo(-130, -30); ctx.lineTo(-120, 20); ctx.closePath(); ink(ctx, C.white, 7);
      ctx.beginPath(); ctx.moveTo(-10, -20); ctx.quadraticCurveTo(-40, -110 - f * 60, 40, -130 - f * 50); ctx.quadraticCurveTo(30, -60, 30, -20); ctx.closePath(); ink(ctx, '#F3F4F6', 7);
      ctx.strokeStyle = '#2F7A45'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(112, -22); ctx.quadraticCurveTo(150, 0, 170, 30); ctx.stroke();
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(130 + i * 16, -4 + i * 12, 14, 7, 0.8, 0, 7); ink(ctx, C.green, 4, '#2F7A45'); }
    });
  }

  function card(ctx, x, y, w, h, title, o = {}) {
    rr(ctx, x - w / 2 + 12, y - h / 2 + 16, w, h, 26); ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fill();
    rr(ctx, x - w / 2, y - h / 2, w, h, 26); ink(ctx, o.fill || C.paper, 8);
    if (title) { rr(ctx, x - w / 2, y - h / 2, w, 86, 26); ink(ctx, o.head || C.ink, 8); plainText(ctx, title, x, y - h / 2 + 45, Math.min(42, w * 0.075), C.white, { weight: 900 }); }
  }

  function checkRow(ctx, x, y, text, state, s = 1) {
    if (s <= 0.001) return;
    withT(ctx, x, y, s, 0, () => {
      rr(ctx, -22, -22, 44, 44, 10); ink(ctx, C.white, 6);
      ctx.lineWidth = 8; ctx.lineCap = 'round';
      if (state === 'yes') { ctx.strokeStyle = C.greenD; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-2, 12); ctx.lineTo(16, -14); ctx.stroke(); }
      if (state === 'no') { ctx.strokeStyle = C.red; ctx.beginPath(); ctx.moveTo(-12, -12); ctx.lineTo(12, 12); ctx.moveTo(12, -12); ctx.lineTo(-12, 12); ctx.stroke(); }
      if (state === 'q') plainText(ctx, '?', 0, 3, 36, C.orange, { weight: 900 });
      plainText(ctx, text, 44, 3, 40, C.ink, { weight: 900, align: 'left' });
    });
  }

  function counter(ctx, x, y, value, o = {}) {
    comicText(ctx, value, x, y, { size: o.size || 170, fill: o.fill || C.red, scale: o.scale ?? 1, rot: o.rot ?? -0.04, lw: (o.size || 170) * 0.17, gradient: o.gradient });
  }

  E.P = { softShadow, coin, coinStack, calendar, flagUS, podium, bubble, gasPump, barrel, waves, tanker, carrier, helmet, hook, ballotBox, routeMap, crosshair, wallet, dove, card, checkRow, counter };

  // ================= Requisiten Teil 3 (SpaceX / Telekom) =================
  function rocket(ctx, x, y, h, t, o = {}) {
    const w = h * 0.26;
    withT(ctx, x, y, 1, o.rot || 0, () => {
      if (o.flame !== false) { // Flamme + Rauch
        const fl = 1 + Math.sin(t * 40) * 0.12 + Math.sin(t * 23) * 0.08;
        ctx.beginPath(); ctx.moveTo(-w * 0.32, h * 0.42); ctx.quadraticCurveTo(0, h * (0.42 + 0.55 * fl), w * 0.32, h * 0.42); ctx.closePath(); ink(ctx, C.orange, 6);
        ctx.beginPath(); ctx.moveTo(-w * 0.18, h * 0.42); ctx.quadraticCurveTo(0, h * (0.42 + 0.32 * fl), w * 0.18, h * 0.42); ctx.closePath(); ink(ctx, C.yellow, 0);
      }
      [-1, 1].forEach((d) => { ctx.beginPath(); ctx.moveTo(d * w * 0.45, h * 0.12); ctx.lineTo(d * w * 0.95, h * 0.45); ctx.lineTo(d * w * 0.45, h * 0.4); ctx.closePath(); ink(ctx, o.fin || C.red, 7); });
      ctx.beginPath(); ctx.moveTo(0, -h * 0.5); ctx.bezierCurveTo(w * 0.75, -h * 0.25, w * 0.55, h * 0.3, w * 0.45, h * 0.42); ctx.lineTo(-w * 0.45, h * 0.42); ctx.bezierCurveTo(-w * 0.55, h * 0.3, -w * 0.75, -h * 0.25, 0, -h * 0.5); ink(ctx, '#F1F5F9', 8);
      ctx.beginPath(); ctx.moveTo(0, -h * 0.5); ctx.bezierCurveTo(w * 0.35, -h * 0.42, w * 0.48, -h * 0.32, w * 0.53, -h * 0.25); ctx.lineTo(-w * 0.53, -h * 0.25); ctx.bezierCurveTo(-w * 0.48, -h * 0.32, -w * 0.35, -h * 0.42, 0, -h * 0.5); ink(ctx, o.fin || C.red, 6);
      ctx.beginPath(); ctx.arc(0, -h * 0.06, w * 0.24, 0, 7); ink(ctx, '#7CC4F5', 7); ctx.beginPath(); ctx.arc(-w * 0.07, -h * 0.09, w * 0.07, 0, 7); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fill();
      if (o.label) plainText(ctx, o.label, 0, h * 0.24, w * 0.2, C.ink, { weight: 900 });
    });
  }
  function smoke(ctx, x, y, t, n = 9, s = 1) {
    for (let i = 0; i < n; i++) { const ph = (t * 0.7 + i / n) % 1, a = i * 2.4;
      ctx.globalAlpha = 0.85 * (1 - ph); ctx.beginPath(); ctx.arc(x + Math.cos(a) * ph * 160 * s, y + ph * 120 * s, (30 + ph * 60) * s, 0, 7); ink(ctx, '#E5E7EB', 5, '#9CA3AF'); }
    ctx.globalAlpha = 1;
  }
  function satellite(ctx, x, y, s, t) {
    withT(ctx, x, y, s, Math.sin(t * 0.8) * 0.1 - 0.3, () => {
      [-1, 1].forEach((d) => { rr(ctx, d > 0 ? 70 : -230, -45, 160, 90, 8); ink(ctx, '#1E3A8A', 7);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3; for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo((d > 0 ? 70 : -230) + k * 40, -45); ctx.lineTo((d > 0 ? 70 : -230) + k * 40, 45); ctx.stroke(); }
        ctx.strokeStyle = C.ink; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(d * 45, 0); ctx.lineTo(d * 70, 0); ctx.stroke(); });
      rr(ctx, -50, -60, 100, 120, 14); ink(ctx, '#E5E7EB', 8);
      ctx.beginPath(); ctx.ellipse(0, 78, 34, 14, 0, 0, 7); ink(ctx, '#9CA3AF', 6); ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 60); ctx.lineTo(0, 78); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -10, 14, 0, 7); ink(ctx, Math.sin(t * 6) > 0 ? C.green : '#14532D', 4);
    });
  }
  function beam(ctx, x1, y1, x2, y2, t, p = 1, col = '#22D3EE') {
    if (p <= 0) return;
    const ex = lerp(x1, x2, p), ey = lerp(y1, y2, p), a = Math.atan2(ey - y1, ex - x1), L = Math.hypot(ex - x1, ey - y1);
    withT(ctx, x1, y1, 1, a, () => {
      const g = ctx.createLinearGradient(0, 0, L, 0); g.addColorStop(0, col + 'CC'); g.addColorStop(1, col + '22');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(L, -60); ctx.lineTo(L, 60); ctx.lineTo(0, 10); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = C.white; ctx.lineWidth = 5; ctx.lineCap = 'round';
      for (let k = 0; k < 4; k++) { const d = ((t * 0.9 + k / 4) % 1) * L; ctx.globalAlpha = Math.sin((d / L) * Math.PI); ctx.beginPath(); ctx.arc(d, 0, 18 + d * 0.06, -0.6, 0.6); ctx.stroke(); }
      ctx.globalAlpha = 1;
    });
  }
  function phone(ctx, cx, cy, h, o = {}) {
    const w = h * 0.5;
    withT(ctx, cx, cy, o.scale ?? 1, o.rot || 0, () => {
      rr(ctx, -w / 2 + 12, -h / 2 + 16, w, h, h * 0.09); ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fill();
      rr(ctx, -w / 2, -h / 2, w, h, h * 0.09); ink(ctx, '#111827', 8);
      rr(ctx, -w / 2 + 12, -h / 2 + 12, w - 24, h - 24, h * 0.07); ink(ctx, o.screen || '#F8FAFC', 0);
      rr(ctx, -w * 0.16, -h / 2 + 18, w * 0.32, 18, 9); ctx.fillStyle = '#111827'; ctx.fill();
      const bars = o.bars ?? 4; // Netzbalken
      for (let i = 0; i < 4; i++) { rr(ctx, -w / 2 + 34 + i * 18, -h / 2 + 70 - (i + 1) * 10, 12, (i + 1) * 10, 3); ink(ctx, i < bars ? C.ink : '#CBD5E1', 0); }
      if (o.label) plainText(ctx, o.label, 0, -h / 2 + 62, h * 0.04, bars ? C.ink : C.red, { weight: 900, align: 'center' });
      if (o.icon) o.icon(0, 0, w, h);
    });
  }
  function tower(ctx, x, by, h, t, o = {}) {
    softShadow(ctx, x, by, h * 0.25, 18);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 10; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x - h * 0.18, by); ctx.lineTo(x, by - h); ctx.lineTo(x + h * 0.18, by); ctx.stroke();
    ctx.strokeStyle = o.color || '#E20074'; ctx.lineWidth = 5; ctx.stroke();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 6; for (let k = 1; k < 5; k++) { const yy = by - k * h * 0.2, hw = h * 0.18 * (1 - k * 0.2); ctx.beginPath(); ctx.moveTo(x - hw, yy); ctx.lineTo(x + hw, yy + h * 0.1); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(x, by - h, 14, 0, 7); ink(ctx, o.color || '#E20074', 6);
    if (o.waves !== false) { ctx.strokeStyle = o.color || '#E20074'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      for (let k = 0; k < 3; k++) { const ph = (t * 0.8 + k / 3) % 1; ctx.globalAlpha = 1 - ph; [-1, 1].forEach((d) => { ctx.beginPath(); ctx.arc(x, by - h, 30 + ph * 110, d > 0 ? -0.6 : Math.PI - 0.6 + 0, d > 0 ? 0.6 : Math.PI + 0.6); ctx.stroke(); }); }
      ctx.globalAlpha = 1; }
  }
  function puzzle(ctx, x, y, s, col, o = {}) {
    withT(ctx, x, y, s, o.rot || 0, () => {
      const u = 100;
      ctx.beginPath(); ctx.moveTo(-u, -u); ctx.lineTo(-u * 0.25, -u); ctx.arc(0, -u, u * 0.25, Math.PI, 0, false); ctx.lineTo(u, -u);
      ctx.lineTo(u, -u * 0.25); ctx.arc(u, 0, u * 0.25, -Math.PI / 2, Math.PI / 2, false); ctx.lineTo(u, u);
      ctx.lineTo(u * 0.25, u); ctx.arc(0, u, u * 0.25, 0, Math.PI, true); ctx.lineTo(-u, u);
      ctx.lineTo(-u, u * 0.25); ctx.arc(-u, 0, u * 0.25, Math.PI / 2, -Math.PI / 2, true); ctx.closePath(); ink(ctx, col, 9);
      ctx.beginPath(); ctx.ellipse(-u * 0.45, -u * 0.5, u * 0.18, u * 0.1, -0.5, 0, 7); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();
      if (o.label) comicText(ctx, o.label, 0, 6, { size: o.size || 54, fill: C.white, shadow: false, lw: 9 });
    });
  }
  function pie(ctx, x, y, r, frac, p, cols, o = {}) {
    softShadow(ctx, x, y + r + 20, r * 0.8, 20);
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ink(ctx, cols[1], 9);
    const a1 = -Math.PI / 2 + Math.PI * 2 * frac * p;
    if (p > 0) { ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r, -Math.PI / 2, a1); ctx.closePath(); ink(ctx, cols[0], 9); }
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ink(ctx, null, 9);
    if (o.label) comicText(ctx, o.label, x - r * 0.05 + Math.cos(-Math.PI / 2 + Math.PI * frac) * r * 0.5, y + Math.sin(-Math.PI / 2 + Math.PI * frac) * r * 0.5, { size: r * 0.42, fill: C.white, scale: o.labelScale ?? 1, lw: r * 0.07 });
  }
  function hourglass(ctx, x, y, h, t) {
    const w = h * 0.55, p = (t * 0.25) % 1;
    withT(ctx, x, y, 1, Math.sin(t * 0.8) * 0.06, () => {
      rr(ctx, -w * 0.6, -h / 2 - 20, w * 1.2, 30, 10); ink(ctx, '#8B5A2B', 7); rr(ctx, -w * 0.6, h / 2 - 10, w * 1.2, 30, 10); ink(ctx, '#8B5A2B', 7);
      const glass = () => { ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2 + 10); ctx.lineTo(w / 2, -h / 2 + 10); ctx.quadraticCurveTo(w / 2, -h * 0.05, 8, 0); ctx.quadraticCurveTo(w / 2, h * 0.05, w / 2, h / 2 - 10); ctx.lineTo(-w / 2, h / 2 - 10); ctx.quadraticCurveTo(-w / 2, h * 0.05, -8, 0); ctx.quadraticCurveTo(-w / 2, -h * 0.05, -w / 2, -h / 2 + 10); ctx.closePath(); };
      glass(); ctx.fillStyle = 'rgba(220,240,255,0.7)'; ctx.fill();
      ctx.save(); glass(); ctx.clip(); ctx.fillStyle = C.gold;
      ctx.fillRect(-w / 2, -h * 0.45 * (1 - p) + -h * 0.0, w, h * 0.45 * (1 - p)); ctx.fillRect(-w / 2, h / 2 - 10 - h * 0.4 * p, w, h * 0.4 * p); ctx.fillRect(-3, 0, 6, h / 2); ctx.restore();
      glass(); ink(ctx, null, 8);
    });
  }
  function gavel(ctx, x, y, s, t, hitAt, lt) {
    const sw = lt < hitAt ? -0.9 * eOut(prog(lt, 0, hitAt * 0.6)) + 0.9 * prog(lt, hitAt * 0.7, hitAt * 0.3) * 1 : 0;
    withT(ctx, x, y, s, sw - 0.2, () => {
      rr(ctx, -10, -20, 260, 30, 12); ink(ctx, '#A0703D', 7);
      rr(ctx, -70, -70, 90, 130, 18); ink(ctx, '#8B5A2B', 8);
      rr(ctx, -78, -52, 106, 18, 6); ink(ctx, C.gold, 5); rr(ctx, -78, 22, 106, 18, 6); ink(ctx, C.gold, 5);
    });
  }
  function brandBadge(ctx, x, y, w, name, col, o = {}) { // neutrale Marken-Plakette (kein Logo)
    withT(ctx, x, y, o.scale ?? 1, o.rot || 0, () => {
      rr(ctx, -w / 2 + 10, -w * 0.18 + 14, w, w * 0.36, w * 0.08); ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fill();
      rr(ctx, -w / 2, -w * 0.18, w, w * 0.36, w * 0.08); ink(ctx, col, 8);
      const size = E.fitSize(ctx, name, w * 0.15, w * 0.86); comicText(ctx, name, 0, 4, { size, fill: C.white, shadow: false, lw: size * 0.16 });
    });
  }
  function heart(ctx, x, y, s, col = '#FF3B5C') {
    withT(ctx, x, y, s, 0, () => { ctx.beginPath(); ctx.moveTo(0, 30); ctx.bezierCurveTo(-70, -10, -40, -70, 0, -35); ctx.bezierCurveTo(40, -70, 70, -10, 0, 30); ink(ctx, col, 6); });
  }
  Object.assign(E.P, { rocket, smoke, satellite, beam, phone, tower, puzzle, pie, hourglass, gavel, brandBadge, heart });

})();
