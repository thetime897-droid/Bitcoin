#!/usr/bin/env node
// Sound-effect library for the clips.
//
// Each effect name (whoosh, pop, ping, cash, ...) maps to real recorded CC0
// samples in sfx/lib/ (see sfx/lib/QUELLEN.md); several variants per name are
// rotated so repeated pops or whooshes do not sound identical. Composite
// effects (cash, coins, stamp) are layered from those samples. Anything not
// covered falls back to the synthesized versions below. A file dropped into
// sfx/<name>.mp3|.wav|.ogg (e.g. from Pixabay) always wins.
//
// All samples are loudness-matched, so the mix volume is predictable; clips
// are mixed quietly on purpose (sfxVolume, default 0.35) to sit under a voice.
//
//   node sfx.cjs            -> writes every effect to sfx/vorschau/*.wav
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
const GAIN = {
  whoosh: 0.7, 'whoosh-down': 0.7, pop: 0.55, ping: 0.55, ding: 0.6, tick: 0.3, blip: 0.35,
  cash: 0.9, coins: 0.5, stamp: 0.8, impact: 0.75, riser: 0.45, downer: 0.55, error: 0.5,
  success: 0.55, alert: 0.45, crack: 0.45, lock: 0.55, shine: 0.5, marker: 0.4, paper: 0.35,
};

const DIR = path.join(__dirname, 'sfx');
const EL = 'lib/crafter-elements/', KI = 'lib/kenney-interface/';
// name -> variants; a variant is a file or a list of layers {f, at, gain, rate}.
const LIB = {
  whoosh: [EL + 'whoosh.mp3', EL + 'whoosh-alt1.mp3', EL + 'whoosh-alt2.mp3', EL + 'swoosh.mp3'],
  'whoosh-down': [EL + 'swoosh.mp3', EL + 'whoosh-alt2.mp3'],
  pop: [KI + 'drop_002.wav', KI + 'drop_003.wav', EL + 'pop.mp3', KI + 'pluck_002.wav'],
  ping: [KI + 'glass_001.wav', KI + 'glass_004.wav', KI + 'confirmation_001.wav'],
  ding: [KI + 'confirmation_002.wav', KI + 'confirmation_004.wav'],
  tick: [KI + 'tick_001.wav', KI + 'tick_002.wav', KI + 'tick_004.wav'],
  blip: [KI + 'select_001.wav', KI + 'select_002.wav'],
  impact: [EL + 'boom.mp3'],
  riser: [EL + 'riser.mp3'],
  success: [KI + 'confirmation_003.wav', EL + 'success.mp3'],
  error: [KI + 'error_003.wav', KI + 'error_001.wav'],
  alert: [EL + 'error.mp3', KI + 'question_001.wav'],
  lock: [KI + 'switch_002.wav'],
  crack: [EL + 'glitch.mp3'],
  downer: [KI + 'minimize_001.wav', KI + 'minimize_003.wav'],
  shine: [EL + 'magic-reveal.mp3'],
  // Felt tip dragged over paper.
  marker: [KI + 'scratch_002.wav', KI + 'scratch_004.wav', KI + 'scratch_001.wav', KI + 'scratch_005.wav'],
  paper: [KI + 'scroll_001.wav', KI + 'scroll_002.wav'],
  stamp: [[{ f: EL + 'boom.mp3', gain: 0.7 }, { f: KI + 'drop_004.wav', gain: 0.9, rate: 0.8 }]],
  coins: [[0, 0.07, 0.15, 0.21, 0.3, 0.42].map((at, i) => ({ f: KI + `glass_00${[2, 3, 5, 6][i % 4]}.wav`, at, gain: 1 - i * 0.12, rate: 1.4 + (i % 3) * 0.25 }))],
  // "Ka-ching": drawer clack, bell, then a little coin jingle.
  cash: [[
    { f: KI + 'switch_001.wav', gain: 0.9 },
    { f: KI + 'switch_003.wav', at: 0.05, gain: 0.7, rate: 0.85 },
    { f: KI + 'glass_004.wav', at: 0.11, gain: 1, rate: 1.5 },
    { f: KI + 'glass_001.wav', at: 0.13, gain: 0.7, rate: 2 },
    ...[0.24, 0.31, 0.4, 0.5].map((at, i) => ({ f: KI + `glass_00${[2, 5, 3, 6][i]}.wav`, at, gain: 0.45 - i * 0.06, rate: 1.7 + i * 0.15 })),
  ]],
};

// Decodes a file to mono 48 kHz, trims leading/trailing silence, optional pitch.
const decoded = {};
function decode(file, rate = 1) {
  const key = file + '@' + rate;
  if (decoded[key]) return decoded[key];
  const trim = 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-55dB,areverse';
  const af = (rate !== 1 ? `asetrate=${Math.round(SR * rate)},aresample=${SR},` : '') + trim;
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-af', af, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 28 });
  return (decoded[key] = new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length)));
}
// Loudness match: RMS of the audible part to -20 dBFS, peaks capped.
function level(b) {
  let sum = 0, n = 0, peak = 0;
  for (const v of b) { const a = Math.abs(v); peak = Math.max(peak, a); if (a > 0.01) { sum += v * v; n++; } }
  if (!n) return b;
  const g = Math.min(0.1 / Math.sqrt(sum / n), 0.9 / peak);
  return b.map((v) => v * g);
}
function render(variant) {
  if (typeof variant === 'string') return level(decode(path.join(DIR, variant)));
  const parts = variant.map((l) => ({ ...l, b: decode(path.join(DIR, l.f), l.rate || 1) }));
  const out = buf(Math.max(...parts.map((l) => (l.at || 0) + l.b.length / SR)) + 0.01);
  parts.forEach((l) => add(out, l.b, l.at || 0, l.gain ?? 1));
  return level(out);
}

const cache = {};
// Mono samples for effect `name`; `pick` selects among its variants.
function get(name, pick = 0) {
  const user = ['mp3', 'wav', 'ogg', 'm4a'].map((e) => path.join(DIR, `${name}.${e}`)).find((f) => fs.existsSync(f));
  const variants = user ? [user] : LIB[name];
  const idx = variants ? Math.abs(pick) % variants.length : 0;
  const key = name + '#' + idx;
  if (cache[key]) return cache[key];
  let b;
  if (user) b = level(decode(user));
  else if (variants) b = render(variants[idx]);
  else if (SYNTH[name]) { seed = 7 + name.length; b = level(SYNTH[name]()); }
  else { console.warn(`  Unbekannter Sound "${name}" – übersprungen`); b = new Float32Array(0); }
  for (let i = 0; i < b.length; i++) b[i] *= GAIN[name] ?? 0.6;
  return (cache[key] = b);
}

// Small Schroeder reverb (parallel combs + series allpasses). Run on a send,
// it puts the dry samples into a little room instead of straight in the ear.
function reverb(x, delays, damp = 0.35, fb = 0.78) {
  const y = new Float32Array(x.length);
  for (const d0 of delays.combs) {
    const d = Math.round((d0 / 1000) * SR), line = new Float32Array(d);
    let idx = 0, lp = 0;
    for (let i = 0; i < x.length; i++) {
      const o = line[idx];
      lp = o * (1 - damp) + lp * damp;
      line[idx] = x[i] + lp * fb;
      y[i] += o / delays.combs.length;
      idx = (idx + 1) % d;
    }
  }
  for (const d0 of delays.allpass) {
    const d = Math.round((d0 / 1000) * SR), line = new Float32Array(d);
    let idx = 0;
    for (let i = 0; i < y.length; i++) {
      const b = line[idx], v = y[i] + b * 0.5;
      line[idx] = v; y[i] = b - v * 0.5;
      idx = (idx + 1) % d;
    }
  }
  return y;
}

// Mixes cue list [{name, at, gain}] into interleaved stereo of `dur` seconds.
// Each hit sits slightly left or right, whooshes sweep across the stereo field,
// and a quiet shared reverb glues it together - closer to a produced edit than
// dry mono samples. The same effect twice within 0.12 s plays once.
function mix(cues, dur, volume = 0.35) {
  const L = buf(dur), R = buf(dur), send = buf(dur);
  const last = {}, count = {};
  let n = 0;
  [...cues].sort((a, b) => a.at - b.at).forEach((c) => {
    if (last[c.name] != null && c.at - last[c.name] < 0.12) return;
    last[c.name] = c.at;
    count[c.name] = (count[c.name] || 0) + 1;
    let b = get(c.name, count[c.name] - 1), at = c.at;
    // Scenes cue a riser 1.1 s before its peak; recorded risers are longer, so
    // align the end of the sample to that peak and cut whatever starts too early.
    if (c.name === 'riser') {
      at = c.at + 1.1 - b.length / SR;
      if (at < 0) { b = b.subarray(Math.round(-at * SR)); at = 0; }
    }
    const g = (c.gain ?? 1) * volume;
    const side = n++ % 2 ? 1 : -1;
    const sweep = c.name.startsWith('whoosh');
    const o = Math.round(at * SR);
    for (let i = 0; i < b.length && o + i < L.length; i++) {
      const pan = sweep ? side * (0.7 * (i / b.length) - 0.35) : side * 0.18;
      const v = b[i] * g;
      L[o + i] += v * Math.cos(((pan + 1) * Math.PI) / 4);
      R[o + i] += v * Math.sin(((pan + 1) * Math.PI) / 4);
      send[o + i] += v;
    }
  });
  const wl = reverb(send, { combs: [29.7, 37.1, 41.1, 43.7], allpass: [5, 1.7] });
  const wr = reverb(send, { combs: [31.3, 36.7, 40.3, 45.1], allpass: [5.3, 1.9] });
  const out = new Float32Array(L.length * 2);
  const fade = Math.round(0.04 * SR);
  for (let i = 0; i < L.length; i++) {
    const f = i > L.length - fade ? (L.length - i) / fade : 1;
    out[i * 2] = Math.tanh(L[i] + wl[i] * 0.22) * f;
    out[i * 2 + 1] = Math.tanh(R[i] + wr[i] * 0.22) * f;
  }
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

const names = [...new Set([...Object.keys(LIB), ...Object.keys(SYNTH)])];
module.exports = { SR, get, mix, names };

if (require.main === module) {
  const out = path.join(DIR, 'vorschau');
  fs.mkdirSync(out, { recursive: true });
  for (const n of names) {
    const k = LIB[n] ? LIB[n].length : 1;
    for (let i = 0; i < k; i++) {
      const f = `${n}${k > 1 ? '-' + (i + 1) : ''}.wav`;
      fs.writeFileSync(path.join(out, f), wav(get(n, i)));
      console.log('✓', f);
    }
  }
}
