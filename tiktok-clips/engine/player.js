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
    cues = [];
    const sceneUpdate = fn(frame.querySelector('#stage'), sc.params || {}, { ...ctx, dur });
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
    const still = sc.drift === false;
    update = (t) => {
      flashOp = 0; tintOp = 0;
      const kin = C.k(t, 0, 0.3), kout = C.k(t, exitAt, 0.4, 'in');
      layers().forEach((el) => {
        el.style.filter = kin < 1 || kout > 0 ? `blur(${(1 - kin) * 10 + kout * 16}px)` : '';
        const push = still || el !== stageEl ? 1 : 1 + 0.035 * (t / dur);
        el.style.scale = String((1 - kout * 0.06) * push);
        if (!still && (el === stageEl || el === chromeEl)) {
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
