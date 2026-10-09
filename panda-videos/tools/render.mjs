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

// ---- Soundeffekte synthetisieren (deterministisch) ----
const SR = 48000, len = Math.ceil((to - from) * SR), sfx = new Float32Array(len);
let seed = 1; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
function add(t, fn, dur) { const s0 = Math.floor((t - from) * SR); for (let i = 0; i < dur * SR; i++) { const k = s0 + i; if (k >= 0 && k < len) sfx[k] += fn(i / SR); } }
for (const c of meta.sfx) {
  if (c.type === 'whoosh') { let lp = 0; add(c.t, (x) => { const d = 0.32, e = Math.sin(Math.PI * Math.min(1, x / d)) ** 2; const a = 0.05 + 0.25 * (x / d); lp += a * (rnd() - lp); return lp * e * 0.55; }, 0.32); }
  if (c.type === 'boom') add(c.t, (x) => { const f = 110 * Math.exp(-x * 9) + 38; return (Math.sin(2 * Math.PI * f * x) * 0.9 + rnd() * 0.25 * Math.exp(-x * 25)) * Math.exp(-x * 6) * 0.7; }, 0.6);
  if (c.type === 'pop') add(c.t, (x) => Math.sin(2 * Math.PI * (500 + 900 * x * 10) * x) * Math.exp(-x * 30) * 0.35, 0.12);
}
const sfxWav = outFile.replace(/\.mp4$/, '_sfx.wav');
const buf = Buffer.alloc(44 + len * 2);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + len * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(len * 2, 40);
for (let i = 0; i < len; i++) buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(sfx[i] * 32767))), 44 + i * 2);
fs.writeFileSync(sfxWav, buf);

// ---- Mischen: Voice-Over + SFX ----
const dur = to - from;
const inputs = audio ? ['-ss', String(from), '-t', String(dur), '-i', audio] : [];
const filter = audio
  ? `[1:a]aresample=48000,afade=t=out:st=${dur - 0.3}:d=0.3[v];[2:a]volume=0.35[s];[v][s]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]`
  : `[1:a]volume=0.35[a]`;
const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', silent, ...inputs, '-i', sfxWav, '-filter_complex', filter, '-map', '0:v', '-map', '[a]',
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', outFile], { stdio: 'inherit' });
if (r.status !== 0) process.exit(r.status);
fs.unlinkSync(silent); fs.unlinkSync(sfxWav);
console.log('Fertig:', outFile);
