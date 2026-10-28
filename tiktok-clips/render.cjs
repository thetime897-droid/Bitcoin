#!/usr/bin/env node
// Renders every scene of a storyboard to its own 1080x1920 video clip.
//
//   node render.cjs storyboards/beispiel.json            -> out/<name>/<id>.mp4
//   node render.cjs storyboards/beispiel.json --alpha    -> transparent .mov (ProRes 4444)
//   node render.cjs storyboards/beispiel.json --only 03,05
//   node render.cjs storyboards/beispiel.json --stills   -> one PNG per scene (quick check)
//   node render.cjs storyboards/beispiel.json --preview  -> out/<name>/preview.html (browser)
//   node render.cjs storyboards/beispiel.json --concat   -> also _alle_szenen.mp4
//
// Needs Node 18+, ffmpeg on PATH and Playwright (npm install in this folder).
const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');
const { pathToFileURL } = require('url');

const args = process.argv.slice(2);
const flag = (n) => args.includes('--' + n);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const sbPath = args.find((a) => a.endsWith('.json'));
if (!sbPath) { console.error('Usage: node render.cjs <storyboard.json> [--alpha] [--only ids] [--stills] [--preview] [--concat]'); process.exit(1); }

const sb = JSON.parse(fs.readFileSync(sbPath, 'utf8'));
const sbDir = path.dirname(path.resolve(sbPath));
const name = sb.name || path.basename(sbPath, '.json');
const outDir = path.resolve(opt('out', path.join(__dirname, 'out', name)));
fs.mkdirSync(outDir, { recursive: true });
const engine = path.join(__dirname, 'engine');
const fps = +(opt('fps', sb.fps || 30));
const alpha = flag('alpha');

// Logo paths in the storyboard are relative to the storyboard file.
const fixLogos = (o) => {
  if (Array.isArray(o)) return o.forEach(fixLogos);
  if (o && typeof o === 'object') for (const k in o) {
    if (k === 'logo' && typeof o[k] === 'string' && !/^(https?|file|data):/.test(o[k])) o[k] = pathToFileURL(path.resolve(sbDir, o[k])).href;
    else fixLogos(o[k]);
  }
};
fixLogos(sb);
sb.scenes.forEach((s, i) => (s.id = s.id || String(i + 1).padStart(2, '0')));

if (flag('preview')) {
  const rel = (f) => pathToFileURL(path.join(engine, f)).href;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${name}</title><link rel="stylesheet" href="${rel('style.css')}"></head><body>
<script>window.__STORYBOARD__=${JSON.stringify(sb)}</script>
<script src="${rel('core.js')}"></script><script src="${rel('scenes.js')}"></script><script src="${rel('player.js')}"></script></body></html>`;
  const f = path.join(outDir, 'preview.html');
  fs.writeFileSync(f, html);
  console.log('Preview:', f);
  process.exit(0);
}

const only = opt('only', '').split(',').filter(Boolean);
const scenes = sb.scenes.map((s, i) => ({ s, i })).filter(({ s }) => !only.length || only.includes(s.id));

(async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('  Seitenfehler:', e.message));
  await page.goto(pathToFileURL(path.join(engine, 'player.html')).href + '?render=1' + (alpha ? '&alpha=1' : ''));
  const files = [];
  for (const { s, i } of scenes) {
    const dur = await page.evaluate(([sb, i]) => window.Clip.load(sb, i), [sb, i]);
    const base = `${s.id}-${s.type}`;
    if (flag('stills')) {
      const at = s.stillAt ?? dur - 0.05;
      await page.evaluate((t) => window.Clip.seek(t), at);
      await page.screenshot({ path: path.join(outDir, base + '.png'), omitBackground: alpha });
      console.log('✓', base + '.png');
      continue;
    }
    const file = path.join(outDir, base + (alpha ? '.mov' : '.mp4'));
    const enc = alpha
      ? ['-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le', '-vendor', 'apl0']
      : ['-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', alpha ? 'png' : 'mjpeg', '-i', '-', ...enc, '-r', String(fps), file], { stdio: ['pipe', 'inherit', 'inherit'] });
    const frames = Math.round(dur * fps);
    for (let f = 0; f < frames; f++) {
      await page.evaluate((t) => window.Clip.seek(t), f / fps);
      const buf = await page.screenshot(alpha ? { type: 'png', omitBackground: true } : { type: 'jpeg', quality: 95 });
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    }
    ff.stdin.end();
    await new Promise((r, j) => ff.on('close', (c) => (c ? j(new Error('ffmpeg ' + c)) : r())));
    files.push(file);
    console.log(`✓ ${path.basename(file)}  (${dur}s)`);
  }
  await browser.close();
  if (flag('concat') && files.length && !alpha) {
    const list = path.join(outDir, '_list.txt');
    fs.writeFileSync(list, files.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n'));
    const all = path.join(outDir, '_alle_szenen.mp4');
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', all]);
    fs.unlinkSync(list);
    console.log('✓', path.basename(all));
  }
  console.log('Fertig →', outDir);
})().catch((e) => { console.error(e); process.exit(1); });
