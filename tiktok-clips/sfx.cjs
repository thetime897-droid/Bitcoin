#!/usr/bin/env node
// Sound-effect library for the clips. Every effect is synthesized here, so
// there is nothing to license. To use a downloaded effect instead (Pixabay,
// Mixkit, ...), drop it into sfx/<name>.mp3|.wav|.ogg - it then wins over the
// synthesized version everywhere.
//
//   node sfx.cjs            -> writes the synthesized set to sfx/generiert/*.wav
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SR = 48000;
const TAU = Math.PI * 2;

let seed = 7;
const noise = () => { seed = (seed * 16807) % 2147483647; return (seed / 2147483647) * 2 - 1; };
const buf = (sec) => new Float32Array(Math.round(sec * SR));

// RBJ biquad, coefficients recomputed per sample so the cutoff can sweep.
function filter(x, type, freqAt, q = 0.8) {
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const f = Math.min(SR * 0.45, Math.max(20, typeof freqAt === 'function' ? freqAt(i / SR) : freqAt));
    const w = (TAU * f) / SR, cw = Math.cos(w), al = Math.sin(w) / (2 * q);
    let b0, b1, b2;
    if (type === 'lp') { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0; }
    else if (type === 'hp') { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; }
    else { b0 = al; b1 = 0; b2 = -al; }
    const a0 = 1 + al, a1 = -2 * cw, a2 = 1 - al;
    const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}
const noiseBuf = (sec) => { const b = buf(sec); for (let i = 0; i < b.length; i++) b[i] = noise(); return b; };
const add = (dst, src, at = 0, gain = 1) => {
  const o = Math.round(at * SR);
  for (let i = 0; i < src.length && o + i < dst.length; i++) dst[o + i] += src[i] * gain;
  return dst;
};
const shape = (b, fn) => { for (let i = 0; i < b.length; i++) b[i] *= fn(i / SR); return b; };
// Sine with a frequency curve (phase-integrated, so sweeps stay clean).
const tone = (sec, freqAt, envAt, wave = Math.sin) => {
  const b = buf(sec); let ph = 0;
  for (let i = 0; i < b.length; i++) { const t = i / SR; ph += (TAU * freqAt(t)) / SR; b[i] = wave(ph) * envAt(t); }
  return b;
};
const bell = (sec, f, decay = 0.5, partials = [[1, 1], [2.76, 0.35], [5.4, 0.15]]) => {
  const b = buf(sec);
  partials.forEach(([m, a], k) => add(b, tone(sec, () => f * m, (t) => a * Math.min(1, t / 0.002) * Math.exp(-t / (decay / (1 + k * 0.8))))));
  return b;
};
const soft = (ph) => Math.tanh(Math.sin(ph) * 3) / Math.tanh(3);
const normalize = (b, peak = 0.9) => {
  let m = 0; for (const v of b) m = Math.max(m, Math.abs(v));
  if (m > 0) for (let i = 0; i < b.length; i++) b[i] *= peak / m;
  return b;
};

const SYNTH = {
  // Two band-pass stages so the sweep is clearly audible as air moving past.
  whoosh: () => { const f = (t) => 350 * Math.pow(8, t / 0.55); return shape(filter(filter(noiseBuf(0.55), 'bp', f, 2), 'bp', f, 2), (t) => Math.pow(Math.sin(Math.PI * Math.pow(t / 0.55, 0.7)), 2)); },
  'whoosh-down': () => { const f = (t) => 3000 * Math.pow(1 / 8, t / 0.55); return shape(filter(filter(noiseBuf(0.55), 'bp', f, 2), 'bp', f, 2), (t) => Math.pow(Math.sin(Math.PI * Math.pow(t / 0.55, 0.7)), 2)); },
  pop: () => {
    const b = tone(0.14, (t) => 180 + 900 * Math.exp(-t * 40), (t) => Math.exp(-t / 0.045));
    return add(b, shape(filter(noiseBuf(0.01), 'hp', 2000), (t) => 1 - t / 0.01), 0, 0.3);
  },
  ping: () => bell(1.0, 1568, 0.45),
  ding: () => add(add(buf(1.2), bell(1.0, 1046.5, 0.4)), bell(1.0, 1568, 0.5), 0.1),
  cash: () => {
    const b = buf(1.3);
    [0, 0.055].forEach((at) => add(b, shape(filter(noiseBuf(0.025), 'bp', 2500, 1.5), (t) => Math.exp(-t / 0.006)), at, 0.9));
    add(b, shape(filter(noiseBuf(0.25), 'bp', 900, 0.9), (t) => Math.sin((Math.PI * t) / 0.25) * 0.5), 0.08);
    add(b, bell(1.1, 2637, 0.55, [[1, 1], [1.5, 0.6], [2.01, 0.45], [2.52, 0.3], [1.006, 0.6]]), 0.13, 0.8);
    for (let k = 0; k < 9; k++) add(b, bell(0.15, 3200 + Math.abs(noise()) * 3000, 0.05, [[1, 1], [2.3, 0.3]]), 0.18 + Math.abs(noise()) * 0.45, 0.35);
    return b;
  },
  coins: () => {
    const b = buf(0.9);
    for (let k = 0; k < 14; k++) add(b, bell(0.15, 3000 + Math.abs(noise()) * 3500, 0.05, [[1, 1], [2.3, 0.3]]), Math.abs(noise()) * 0.7, 0.5);
    return b;
  },
  stamp: () => {
    const b = tone(0.5, (t) => 45 + 50 * Math.exp(-t * 25), (t) => Math.exp(-t / 0.12));
    add(b, shape(filter(noiseBuf(0.08), 'lp', 1800), (t) => Math.exp(-t / 0.015)), 0, 0.9);
    return add(b, tone(0.12, () => 190, (t) => Math.exp(-t / 0.03)), 0, 0.5);
  },
  impact: () => {
    const b = tone(1.4, (t) => 28 + 55 * Math.exp(-t * 6), (t) => Math.min(1, t / 0.004) * Math.exp(-t / 0.45));
    add(b, shape(filter(noiseBuf(1.0), 'lp', (t) => 3000 * Math.exp(-t * 6) + 200), (t) => Math.exp(-t / 0.22)), 0, 0.8);
    return add(b, shape(filter(noiseBuf(0.01), 'hp', 1500), (t) => 1 - t / 0.01), 0, 0.4);
  },
  riser: () => {
    const d = 1.1;
    const b = shape(filter(noiseBuf(d), 'bp', (t) => 400 * Math.pow(12, t / d), 2), (t) => Math.pow(t / d, 2));
    return add(b, tone(d, (t) => 220 * Math.pow(4, t / d), (t) => 0.25 * Math.pow(t / d, 2.5)));
  },
  downer: () => {
    const b = tone(0.8, (t) => 90 + 800 * Math.exp(-t * 4) + Math.sin(t * 40) * 12, (t) => Math.min(1, t / 0.01) * (1 - t / 0.8), soft);
    return filter(b, 'lp', 2500);
  },
  error: () => {
    const b = buf(0.4);
    add(b, tone(0.12, () => 196, (t) => Math.min(1, t / 0.005) * (1 - t / 0.12), soft), 0);
    add(b, tone(0.18, () => 165, (t) => Math.min(1, t / 0.005) * (1 - t / 0.18), soft), 0.15);
    return filter(b, 'lp', 1800);
  },
  success: () => {
    const b = buf(1.0);
    [784, 988, 1175, 1568].forEach((f, i) => add(b, bell(0.7, f, 0.25, [[1, 1], [2, 0.2]]), i * 0.075, 0.7));
    return b;
  },
  alert: () => {
    const b = buf(1.0);
    for (let k = 0; k < 4; k++) add(b, tone(0.12, () => (k % 2 ? 660 : 880), (t) => Math.min(1, t / 0.005) * (1 - t / 0.12) * (1 - k * 0.15), soft), k * 0.13);
    return filter(b, 'lp', 3000);
  },
  tick: () => add(shape(filter(noiseBuf(0.004), 'hp', 3000), () => 1), tone(0.03, () => 4200, (t) => Math.exp(-t / 0.006)), 0, 0.6),
  blip: () => add(tone(0.07, () => 1400, (t) => Math.sin((Math.PI * t) / 0.07)), tone(0.07, () => 2100, (t) => 0.3 * Math.sin((Math.PI * t) / 0.07))),
  crack: () => {
    const b = buf(0.6);
    for (let k = 0; k < 60; k++) { const at = Math.pow(Math.abs(noise()), 2) * 0.45; add(b, shape(filter(noiseBuf(0.006), 'hp', 2500), (t) => 1 - t / 0.006), at, 1 - at * 1.8); }
    add(b, tone(0.3, (t) => 70 + 60 * Math.exp(-t * 20), (t) => Math.exp(-t / 0.08)), 0, 0.8);
    return add(b, bell(0.5, 3800, 0.12, [[1, 1], [1.37, 0.6], [2.1, 0.4]]), 0.01, 0.35);
  },
  lock: () => {
    const b = buf(0.5);
    add(b, shape(filter(noiseBuf(0.008), 'bp', 3500, 2), (t) => 1 - t / 0.008), 0, 0.8);
    add(b, bell(0.3, 2200, 0.06, [[1, 1], [1.5, 0.7], [2.2, 0.4]]), 0.07, 0.8);
    return add(b, tone(0.15, () => 110, (t) => Math.exp(-t / 0.04)), 0.07, 0.7);
  },
  shine: () => {
    const b = buf(1.0);
    for (let k = 0; k < 10; k++) add(b, bell(0.4, 2000 * Math.pow(3, k / 10), 0.12, [[1, 1], [2, 0.2]]), k * 0.045, 0.35);
    return b;
  },
};
const GAIN = { whoosh: 0.55, 'whoosh-down': 0.55, pop: 0.55, tick: 0.35, blip: 0.4, coins: 0.6, shine: 0.55, riser: 0.6, ping: 0.7, ding: 0.7 };

const DIR = path.join(__dirname, 'sfx');
const cache = {};
// Returns mono float samples at 48 kHz: user file from sfx/ if present, else synth.
function get(name) {
  if (cache[name]) return cache[name];
  const file = ['mp3', 'wav', 'ogg', 'm4a'].map((e) => path.join(DIR, `${name}.${e}`)).find((f) => fs.existsSync(f));
  let b;
  if (file) {
    const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 28 });
    b = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
  } else if (SYNTH[name]) {
    seed = 7 + name.length;
    b = normalize(SYNTH[name](), 0.9 * (GAIN[name] ?? 0.8));
  } else {
    console.warn(`  Unbekannter Sound "${name}" – übersprungen`);
    b = new Float32Array(0);
  }
  return (cache[name] = b);
}

// Mixes cue list [{name, at, gain}] into one buffer of `dur` seconds.
function mix(cues, dur, volume = 1) {
  const out = buf(dur);
  for (const c of cues) add(out, get(c.name), c.at, (c.gain ?? 1) * volume);
  for (let i = 0; i < out.length; i++) out[i] = Math.tanh(out[i] * 1.1);
  const fade = Math.round(0.04 * SR);
  for (let i = 0; i < fade && i < out.length; i++) out[out.length - 1 - i] *= i / fade;
  return out;
}

function wav(samples) {
  const pcm = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) => pcm.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(v * 32767))), i * 2));
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

module.exports = { SR, get, mix, names: Object.keys(SYNTH) };

if (require.main === module) {
  const out = path.join(DIR, 'generiert');
  fs.mkdirSync(out, { recursive: true });
  for (const n of Object.keys(SYNTH)) { fs.writeFileSync(path.join(out, n + '.wav'), wav(get(n))); console.log('✓', n + '.wav'); }
}
