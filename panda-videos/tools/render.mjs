// Rendert ein Panda-Video: node tools/render.mjs <video> --audio <voice.wav|mp4> [--out out/x.mp4] [--stills 0.5,3,7] [--from 0 --to 10]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const video = args[0];
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const outFile = path.resolve(opt('out', `out/${video}.mp4`));
const audio = opt('audio');
const stills = opt('stills');
fs.mkdirSync(path.dirname(outFile), { recursive: true });

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
}).listen(0, '127.0.0.1');
await new Promise((r) => server.on('listening', r));
const port = server.address().port;

const browser = await chromium.launch({ args: ['--disable-gpu-vsync'] });
const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
page.on('pageerror', (e) => { console.error('Seitenfehler:', e.message); process.exit(1); });
page.on('console', (m) => m.type() === 'error' && console.error('console:', m.text()));
await page.goto(`http://127.0.0.1:${port}/engine/index.html?video=${video}`);
await page.waitForFunction(() => window.READY === true, null, { timeout: 30000 });
const meta = await page.evaluate(() => window.META);

if (stills) {
  for (const t of stills.split(',').map(Number)) {
    const data = await page.evaluate((t) => E.frameJpeg(t, 0.9), t);
    const f = outFile.replace(/\.mp4$/, `_${t.toFixed(2)}.jpg`);
    fs.writeFileSync(f, Buffer.from(data.split(',')[1], 'base64')); console.log(f);
  }
  await browser.close(); server.close(); process.exit(0);
}

const fps = meta.fps, from = Number(opt('from', 0)), to = Number(opt('to', meta.duration));
const n = Math.round((to - from) * fps);
const silent = outFile.replace(/\.mp4$/, '_silent.mp4');
const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', silent], { stdio: ['pipe', 'inherit', 'inherit'] });
const t0 = Date.now();
for (let i = 0; i < n; i++) {
  const t = from + i / fps;
  const data = await page.evaluate((t) => E.frameJpeg(t, 0.95), t);
  if (!ff.stdin.write(Buffer.from(data.split(',')[1], 'base64'))) await new Promise((r) => ff.stdin.once('drain', r));
  if (i % 60 === 0) process.stdout.write(`\rFrame ${i}/${n}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
ff.stdin.end(); await new Promise((r) => ff.on('close', r));
console.log(`\nVideo fertig in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
await browser.close(); server.close();

// ---- Soundeffekte: Bibliothek (sfx/lib bzw. sfx/custom) an den Cue-Zeiten mischen ----
const sfxWav = outFile.replace(/\.mp4$/, '_sfx.wav'), cuesJson = outFile.replace(/\.mp4$/, '_cues.json');
fs.writeFileSync(cuesJson, JSON.stringify(meta.sfx.map((c) => ({ ...c, t: c.t - from }))));
const mixr = spawnSync('python3', [path.join(ROOT, 'tools/mix_sfx.py'), cuesJson, String(to - from), sfxWav], { stdio: 'inherit' });
if (mixr.status !== 0) process.exit(mixr.status);
fs.unlinkSync(cuesJson);

// ---- Mischen: Voice-Over + SFX ----
const dur = to - from;
const inputs = audio ? ['-ss', String(from), '-t', String(dur), '-i', audio] : [];
const filter = audio
  ? `[1:a]aresample=48000,apad=whole_dur=${dur},afade=t=out:st=${dur - 0.3}:d=0.3[v];[2:a]anull[s];[v][s]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]`
  : `[1:a]anull[a]`;
const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', silent, ...inputs, '-i', sfxWav, '-filter_complex', filter, '-map', '0:v', '-map', '[a]',
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', String(dur), outFile], { stdio: 'inherit' });
if (r.status !== 0) process.exit(r.status);
fs.unlinkSync(silent); fs.unlinkSync(sfxWav);
console.log('Fertig:', outFile);
