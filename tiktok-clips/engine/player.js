// Mounts one storyboard scene into the 1080x1920 frame and exposes
// Clip.seek(t) for the renderer. Without ?render=1 it also runs a small
// preview UI (scene picker, play/pause, scrubber).
(function () {
  const C = window.Clip;
  const params = new URLSearchParams(location.search);
  const RENDER = params.has('render');
  const ALPHA = params.has('alpha');
  document.body.classList.toggle('render', RENDER);
  document.body.classList.toggle('alpha', ALPHA);

  // Shared SVG defs: glow filters and arrow heads used by several scenes.
  document.body.insertAdjacentHTML('afterbegin', `
  <svg width="0" height="0" style="position:absolute"><defs>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="glow-sm" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <marker id="arrow-g" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#2ee86a"/></marker>
    <marker id="arrow-r" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#ff3b3b"/></marker>
  </defs></svg>`);

  const frame = C.h('div', { id: 'frame' }, document.body);
  let strokes = [];
  let update = () => {}, cues = [], dur = 3, flashEl, tintEl, flashOp = 0, flashCol = '', tintOp = 0;

  const ctx = {
    frame,
    // Short bright pulse at `at` (impact beats); the strongest one per frame wins.
    flash(t, at, color) {
      const d = t - at;
      if (d < 0 || d > 0.5) return;
      const o = d < 0.06 ? d / 0.06 : 1 - (d - 0.06) / 0.44;
      if (o > flashOp) { flashOp = o; flashCol = color; }
    },
    // Highlighter stroke over `el` (sweeps left to right, a pen follows the tip).
    mark(el, at, dur = 0.45) {
      el.classList.add('hlm');
      strokes.push({ el, at, dur });
      cues.push({ name: 'marker', at, gain: 1 });
    },
    // Sound cue: scenes register which effect plays at which second.
    cue(name, at, gain = 1) { if (Number.isFinite(at) && at >= 0) cues.push({ name, at, gain }); },
    // Persistent mood tint (e.g. the scene turns red after a crash).
    tint(k, color) { tintOp = Math.max(tintOp, k); tintEl.dataset.c = color; },
  };

  function mount(sb, index) {
    const sc = sb.scenes[index];
    const theme = sc.theme || sb.theme || 'dark';
    const layout = sc.layout || sb.layout || 'full';
    frame.className = `theme-${theme} layout-${layout}` + (sc.grid ?? sb.grid ? ' grid-on' : '');
    frame.innerHTML = '<div id="bg"></div><div id="tint"></div><div id="flash"></div><div id="chrome"><div id="title"></div><div id="pill"></div></div><div id="stage"></div>';
    flashEl = frame.querySelector('#flash');
    tintEl = frame.querySelector('#tint');
    Object.assign(tintEl.style, { position: 'absolute', inset: 0, opacity: 0, zIndex: 1, background: 'radial-gradient(ellipse 80% 55% at 50% 30%, rgba(150,10,10,.75) 0%, rgba(60,0,0,.5) 50%, rgba(0,0,0,0) 100%)' });
    if (ALPHA) tintEl.style.display = 'none';
    const title = frame.querySelector('#title'), pill = frame.querySelector('#pill');
    title.textContent = sc.title || '';
    pill.textContent = sc.pill || '';
    dur = sc.duration || 3;
    const fn = C.scenes[sc.type];
    if (!fn) throw new Error('Unknown scene type: ' + sc.type);
    cues = []; strokes = [];
    const paper = theme === 'paper';
    if (paper) {
      frame.querySelector('#bg').innerHTML = `<svg width="1080" height="1920" style="position:absolute;inset:0"><defs>
        <filter id="wood" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.004 0.11" numOctaves="4" seed="7"/>
        <feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.24  0 0 0 0 0.07  1.4 0 0 0 -0.45"/></filter>
        <radialGradient id="vig" cx="50%" cy="45%" r="75%"><stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#2a1200" stop-opacity=".45"/></radialGradient></defs>
        <rect width="1080" height="1920" fill="#d0924c"/><rect width="1080" height="1920" filter="url(#wood)"/><rect width="1080" height="1920" fill="url(#vig)"/></svg>`;
      frame.querySelector('#bg').after(C.h('div', { id: 'paper' }));
    }
    const sceneUpdate = fn(frame.querySelector('#stage'), sc.params || {}, { ...ctx, dur, theme });
    // Clean edges: content sharpens in over the first 0.3 s and zooms/blurs out
    // over the last 0.4 s, so every clip can be cut in and out without a jump.
    // The background stays put. "exit": false on a scene keeps the last frame.
    const exitAt = sc.exit === false ? Infinity : dur - 0.4;
    if (sc.exit !== false) cues.push({ name: 'whoosh', at: exitAt - 0.05, gain: 0.35 });
    const layers = () => [...frame.children].filter((el) => el.id !== 'bg' && el.id !== 'dust');
    // Never fully still: floating dust in the background and a slow camera
    // push-in with a gentle sway on the stage, even after every beat has landed.
    const dust = C.h('div', { id: 'dust', style: { position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' } });
    frame.querySelector('#bg').after(dust);
    const motes = [...Array(ALPHA ? 0 : 34)].map((_, i) => ({
      x: C.rand(i * 3.1) * 1080, y: C.rand(i * 7.7) * 1920, r: 2 + C.rand(i * 5.3) * 5,
      v: 18 + C.rand(i * 9.1) * 40, ph: C.rand(i * 2.2) * 6,
      el: C.h('div', { style: { position: 'absolute', borderRadius: '50%', background: 'var(--accent)', filter: 'blur(1.5px)' } }, dust),
    }));
    const stageEl = frame.querySelector('#stage'), chromeEl = frame.querySelector('#chrome');
    const paperEl = frame.querySelector('#paper');
    const still = sc.drift === false;
    if (paper) motes.forEach((m) => (m.el.style.display = 'none'));
    // On paper the sheet, its title and the content move together like a
    // handheld shot of a desk, around one shared origin.
    if (paper) [paperEl, stageEl, chromeEl].forEach((el) => (el.style.transformOrigin = '540px 960px'));
    if (paper) { chromeEl.style.position = 'absolute'; chromeEl.style.height = '1920px'; stageEl.style.transformOrigin = '540px 430px'; }
    strokes.sort((a, b) => a.at - b.at);
    const pen = strokes.length ? C.h('div', { id: 'pen', style: { position: 'absolute', left: 0, top: 0, width: '420px', height: '74px', zIndex: 20, transformOrigin: '0 50%', filter: 'drop-shadow(14px 22px 14px rgba(40,20,0,.35))' } }, frame,
      `<svg width="420" height="74" viewBox="0 0 420 74"><polygon points="0,37 28,20 28,54" fill="#c9c400"/><rect x="26" y="14" width="50" height="46" rx="6" fill="#e9e52a"/>
       <rect x="70" y="8" width="350" height="58" rx="26" fill="#f4f13a"/><rect x="70" y="8" width="350" height="18" rx="9" fill="#fffb8a" opacity=".7"/>
       <text x="190" y="47" font-family="Georgia,serif" font-style="italic" font-weight="700" font-size="30" fill="#2c2a10" opacity=".75">Highlight</text></svg>`) : null;
    update = (t) => {
      flashOp = 0; tintOp = 0;
      const kin = C.k(t, 0, 0.3), kout = C.k(t, exitAt, 0.4, 'in');
      layers().forEach((el) => {
        el.style.filter = kin < 1 || kout > 0 ? `blur(${(1 - kin) * 10 + kout * 16}px)` : '';
        const hand = paper && (el === paperEl || el === stageEl || el === chromeEl);
        const push = still || (el !== stageEl && !hand) ? 1 : 1 + 0.03 * (t / dur);
        el.style.scale = String((1 - kout * 0.06) * push);
        if (!still && hand) {
          el.style.translate = `${Math.sin(t * 0.9) * 7 + Math.sin(t * 2.3) * 2}px ${Math.sin(t * 1.3 + 1) * 8 + Math.sin(t * 3.1) * 1.5}px`;
          el.style.rotate = `${-0.8 + Math.sin(t * 0.6) * 0.45}deg`;
        } else if (!still && (el === stageEl || el === chromeEl)) {
          el.style.translate = `${Math.sin(t * 0.7) * (el === stageEl ? 6 : 2)}px ${Math.sin(t * 1.1 + 1) * (el === stageEl ? 7 : 3)}px`;
          if (el === stageEl) el.style.rotate = `${Math.sin(t * 0.5) * 0.35}deg`;
        }
        el.style.opacity = String(Math.min(kin * 1.5, 1) * (1 - kout));
      });
      const k = C.k(t, 0, 0.35);
      title.style.opacity = k;
      title.style.transform = `translateY(${(1 - k) * -16}px)`;
      title.style.setProperty('--ul', C.k(t, 0.15, 0.4));
      pill.style.opacity = C.k(t, 0.2, 0.3);
      sceneUpdate(t);
      strokes.forEach((st) => (st.el.style.backgroundSize = `${C.k(t, st.at, st.dur, 'inOut') * 100}% 64%`));
      if (pen) {
        const fr = frame.getBoundingClientRect(), sc = fr.width / 1080;
        const at = (st, k) => {
          const r = st.el.getBoundingClientRect();
          return [(r.left - fr.left) / sc + (r.width / sc) * k, (r.top - fr.top) / sc + (r.height / sc) * 0.66];
        };
        const cur = strokes.find((st) => t >= st.at && t <= st.at + st.dur);
        const next = strokes.find((st) => st.at > t);
        const prev = [...strokes].reverse().find((st) => st.at + st.dur < t);
        let x, y;
        if (cur) [x, y] = at(cur, C.k(t, cur.at, cur.dur, 'inOut'));
        else if (prev && next) {
          const a = at(prev, 1), b = at(next, 0), e = prev.at + prev.dur, k = C.k(t, e, next.at - e, 'inOut');
          x = C.lerp(a[0], b[0], k); y = C.lerp(a[1], b[1], k) - Math.sin(k * Math.PI) * 45;
        } else if (next) {
          const b = at(next, 0), k = C.k(t, next.at - 0.55, 0.55, 'out');
          x = b[0] + (1 - k) * 700; y = b[1] + (1 - k) * 520;
        } else {
          const a = at(prev, 1), k = C.k(t, prev.at + prev.dur + 0.5, 0.7, 'in');
          x = a[0] + 40 + k * 700; y = a[1] + 20 + k * 560;
        }
        x += Math.sin(t * 3.1) * 3; y += Math.cos(t * 2.4) * 3;
        pen.style.transform = `translate(${x}px, ${y - 37}px) rotate(-34deg)`;
      }
      const fade = Math.min(kin * 1.5, 1) * (1 - kout);
      motes.forEach((m) => {
        const y = (((m.y - t * m.v) % 1920) + 1920) % 1920;
        m.el.style.width = m.el.style.height = m.r + 'px';
        m.el.style.left = m.x + Math.sin(t * 0.8 + m.ph) * 24 + 'px';
        m.el.style.top = y + 'px';
        m.el.style.opacity = (0.12 + 0.18 * (0.5 + 0.5 * Math.sin(t * 1.5 + m.ph))) * Math.min(1, kin * 2);
      });
      flashEl.style.opacity = flashOp * fade;
      flashEl.style.background = `radial-gradient(ellipse 70% 45% at 50% 32%, ${flashCol} 0%, rgba(0,0,0,0) 75%)`;
      tintEl.style.opacity = tintOp * fade;
    };
    update(0);
  }

  C.load = async (sb, index) => {
    mount(sb, index);
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => (i.onload = i.onerror = r)))));
    return dur;
  };
  C.seek = (t) => update(t);
  C.cues = () => cues.filter((c) => c.at < dur);

  if (RENDER) return;

  // ------------------------------------------------------------ preview ---
  const sb = window.__STORYBOARD__;
  const ui = C.h('div', { id: 'ui' }, document.body);
  if (!sb) { ui.textContent = 'Kein Storyboard geladen. Mit "node render.cjs <storyboard.json> --preview" öffnen.'; return; }
  ui.innerHTML = `<b>${sb.name || 'Storyboard'}</b><select id="sel"></select>
    <button id="play">⏸ Pause</button><input id="scrub" type="range" min="0" max="1000" value="0"><div id="time"></div><div class="script" id="script"></div>`;
  const sel = ui.querySelector('#sel');
  sb.scenes.forEach((s, i) => sel.add(new Option(`${s.id || i + 1} · ${s.type} · ${s.title || ''}`, i)));
  let playing = true, t = 0, last = performance.now();
  const fit = () => { const s = Math.min((innerHeight - 8) / 1920, (innerWidth - 360) / 1080); frame.style.transform = `scale(${s})`; };
  addEventListener('resize', fit); fit();
  const go = (i) => { C.load(sb, i); t = 0; ui.querySelector('#script').textContent = sb.scenes[i].script || ''; };
  sel.onchange = () => go(+sel.value);
  ui.querySelector('#play').onclick = (e) => { playing = !playing; e.target.textContent = playing ? '⏸ Pause' : '▶ Play'; };
  const scrub = ui.querySelector('#scrub');
  scrub.oninput = () => { t = (scrub.value / 1000) * dur; playing = false; C.seek(t); };
  go(0);
  (function loop(now) {
    const dt = (now - last) / 1000; last = now;
    if (playing) { t += dt; if (t > dur + 0.8) t = 0; C.seek(Math.min(t, dur)); scrub.value = (Math.min(t, dur) / dur) * 1000; }
    ui.querySelector('#time').textContent = `${Math.min(t, dur).toFixed(2)}s / ${dur}s`;
    requestAnimationFrame(loop);
  })(last);
})();
