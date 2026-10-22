"""Audio: loading, lip-sync envelope, synthesized SFX, a music bed and the mix.

Everything is generated with numpy, so there is nothing to license.
"""
import subprocess
import wave
from functools import lru_cache

import numpy as np

SR = 44100


def load(path, sr=SR):
    out = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", str(sr), "-"],
                         check=True, capture_output=True).stdout
    return np.frombuffer(out, dtype=np.float32).copy()


def save(path, x, sr=SR):
    x = np.clip(x, -1, 1)
    pcm = (x * 32767).astype(np.int16)
    if pcm.ndim == 2:
        ch, pcm = pcm.shape[1], pcm.reshape(-1)
    else:
        ch = 1
    with wave.open(str(path), "wb") as w:
        w.setnchannels(ch)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())


def envelope(x, fps, n_frames):
    """Per-video-frame mouth openness 0..1 from the voice track."""
    hop = SR / fps
    env = np.zeros(n_frames, dtype=np.float32)
    for i in range(n_frames):
        a, b = int(i * hop), int((i + 1) * hop)
        if a < len(x):
            seg = x[a:min(b, len(x))]
            env[i] = np.sqrt(np.mean(seg * seg)) if len(seg) else 0
    ref = np.percentile(env[env > 0], 95) if np.any(env > 0) else 1.0
    env = np.clip(env / max(ref, 1e-6), 0, 1.2)
    env = np.where(env < 0.12, 0, env)
    out = np.zeros_like(env)
    for i in range(n_frames):
        prev = out[i - 1] if i else 0
        k = 0.7 if env[i] > prev else 0.45
        out[i] = prev + (env[i] - prev) * k
    return np.clip(out, 0, 1)


def normalize(x, target_db=-17.0):
    rms = np.sqrt(np.mean(x * x)) if len(x) else 0
    if rms < 1e-6:
        return x
    return x * (10 ** (target_db / 20) / rms)


# -- synthesis helpers --------------------------------------------------------

def _t(dur):
    return np.arange(int(dur * SR)) / SR


def _tone(freq, dur, harmonics=(1.0,)):
    """Sine (plus harmonics) with a frequency curve: freq can be array or float."""
    n = int(dur * SR)
    f = np.broadcast_to(np.asarray(freq, dtype=np.float64), (n,))
    ph = 2 * np.pi * np.cumsum(f) / SR
    return sum(a * np.sin(ph * (i + 1)) for i, a in enumerate(harmonics))


def _shaped_noise(dur, center, width, rng):
    """Noise whose spectrum is a moving gaussian band (center/width: fn of 0..1)."""
    n = int(dur * SR)
    N, hop = 1024, 256
    win = np.hanning(N)
    out = np.zeros(n + N)
    freqs = np.fft.rfftfreq(N, 1 / SR)
    for start in range(0, n, hop):
        k = start / max(1, n)
        band = np.exp(-0.5 * ((freqs - center(k)) / max(30.0, width(k))) ** 2)
        spec = band * np.exp(1j * rng.uniform(0, 2 * np.pi, len(freqs)))
        out[start:start + N] += np.fft.irfft(spec, N) * win
    out = out[:n]
    return out / (np.max(np.abs(out)) + 1e-9)


def _adsr(n, a=0.005, d=0.1, s_level=0.0, r=0.0):
    env = np.ones(n)
    na, nd = int(a * SR), int(d * SR)
    env[:na] = np.linspace(0, 1, na) if na else 1
    if nd:
        env[na:na + nd] = np.linspace(1, s_level, len(env[na:na + nd]))
    env[na + nd:] = s_level
    if r and s_level:
        nr = int(r * SR)
        env[-nr:] *= np.linspace(1, 0, len(env[-nr:]))
    return env


def _exp(n, rate):
    return np.exp(-np.arange(n) / SR * rate)


def _bell(freqs_amps, dur, rate):
    t = _t(dur)
    return sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * rate * (1 + i * 0.6))
               for i, (f, a) in enumerate(freqs_amps))


@lru_cache(maxsize=64)
def _pluck(freq, dur=0.9, decay=0.996, seed=0):
    n = int(dur * SR)
    N = max(2, int(SR / freq))
    rng = np.random.default_rng(seed)
    y = np.zeros(n + N + 1)
    y[:N] = rng.uniform(-1, 1, N)
    k = N
    while k < n:
        e = min(n, k + N)
        idx = np.arange(k, e)
        y[k:e] = decay * 0.5 * (y[idx - N] + y[idx - N - 1])
        k = e
    out = y[:n]
    return out / (np.max(np.abs(out)) + 1e-9)


def sfx(name, seed=0):
    rng = np.random.default_rng(seed)
    if name == "whoosh":
        d = 0.42
        x = _shaped_noise(d, lambda k: 400 + 2600 * np.sin(np.pi * k) ** 2, lambda k: 500 + 900 * k, rng)
        return 0.55 * x * np.sin(np.pi * np.linspace(0, 1, len(x))) ** 1.5
    if name == "pop":
        d = 0.09
        t = _t(d)
        x = np.sin(2 * np.pi * np.cumsum(900 * np.exp(-t * 30) + 200) / SR)
        return 0.6 * x * _exp(len(t), 40)
    if name == "boing":
        d = 0.55
        t = _t(d)
        f = 170 + 160 * t / d + 70 * np.sin(2 * np.pi * 13 * t) * np.exp(-t * 4)
        return 0.5 * _tone(f, d, (1.0, 0.35, 0.1)) * _exp(len(t), 5.5)
    if name == "coin":
        return 0.35 * _bell([(2637, 1.0), (3951, 0.6), (5274, 0.3)], 0.35, 10)
    if name == "kaching":
        d = 0.8
        x = np.zeros(int(d * SR))
        click = rng.uniform(-1, 1, int(0.02 * SR)) * _exp(int(0.02 * SR), 200)
        x[:len(click)] += 0.5 * click
        b1 = _bell([(2093, 1.0), (3136, 0.7), (4186, 0.4)], 0.6, 6)
        b2 = _bell([(2637, 1.0), (3951, 0.7), (5274, 0.4)], 0.65, 5)
        o1, o2 = int(0.03 * SR), int(0.13 * SR)
        x[o1:o1 + len(b1)] += 0.4 * b1[:len(x) - o1]
        x[o2:o2 + len(b2)] += 0.45 * b2[:len(x) - o2]
        return x
    if name == "impact":
        d = 0.8
        t = _t(d)
        low = np.sin(2 * np.pi * np.cumsum(30 + 70 * np.exp(-t * 6)) / SR) * _exp(len(t), 4)
        nz = _shaped_noise(d, lambda k: 250, lambda k: 600, rng) * _exp(len(t), 12)
        return 0.9 * np.tanh(1.8 * (low + 0.7 * nz))
    if name == "slide_down":
        d = 0.85
        t = _t(d)
        f = 1300 * (220 / 1300) ** (t / d) * (1 + 0.03 * np.sin(2 * np.pi * 6 * t))
        env = np.minimum(1, t / 0.04) * np.minimum(1, (d - t) / 0.08)
        return 0.4 * _tone(f, d, (1.0, 0.25)) * env
    if name == "rise":
        d = 1.5
        t = _t(d)
        f = 180 * (5.0 ** (t / d))
        tone = _tone(f, d, (1.0, 0.5, 0.33, 0.25))
        nz = _shaped_noise(d, lambda k: 500 + 3000 * k, lambda k: 700, rng)
        env = np.minimum(1, t / 0.2) * np.minimum(1, (d - t) / 0.3)
        return 0.32 * (0.5 * tone + nz) * env
    if name == "clank":
        d = 0.5
        hit = _bell([(523, 1.0), (1187, 0.8), (1873, 0.6), (2711, 0.4)], d, 9)
        x = hit.copy()
        o = int(0.07 * SR)
        x[o:] += 0.6 * hit[:len(x) - o]
        return 0.35 * x
    if name == "tick":
        d = 0.03
        t = _t(d)
        return 0.25 * np.sin(2 * np.pi * 2200 * t) * _exp(len(t), 160)
    if name == "ding":
        return 0.4 * _bell([(1760, 1.0), (3520, 0.4), (5280, 0.15)], 1.1, 3.5)
    if name == "rumble":
        d = 1.6
        w = rng.normal(0, 1, int(d * SR))
        br = np.cumsum(w)
        br -= np.convolve(br, np.ones(800) / 800, mode="same")
        br /= np.max(np.abs(br)) + 1e-9
        t = _t(d)
        env = np.minimum(1, t / 0.2) * np.minimum(1, (d - t) / 0.5) * (0.8 + 0.2 * np.sin(2 * np.pi * 7 * t))
        return 0.5 * br * env
    if name == "sad":
        notes = [(233.1, 0.36), (220.0, 0.36), (207.7, 0.36), (196.0, 1.1)]
        parts = []
        for i, (f, d) in enumerate(notes):
            t = _t(d)
            vib = 1 + (0.012 * np.sin(2 * np.pi * 5.5 * t) * np.minimum(1, t / 0.3) if i == 3 else 0)
            bright = np.sin(np.pi * np.minimum(1, t / d)) ** 0.7
            harm = [1.0 / (h ** 1.2) for h in range(1, 10)]
            tone = sum(a * (0.3 + 0.7 * bright ** (h * 0.4)) * np.sin(2 * np.pi * f * (h + 1) * np.cumsum(vib) / SR)
                       for h, a in enumerate(harm))
            env = np.minimum(1, t / 0.03) * np.minimum(1, (d - t) / 0.06)
            parts.append(tone * env)
        x = np.concatenate(parts)
        return 0.18 * x / (np.max(np.abs(x)) + 1e-9) * 2
    if name == "vroom":
        d = 1.2
        t = _t(d)
        f = 55 + 70 * np.sin(np.pi * np.minimum(1, t / d * 1.2)) ** 2
        eng = _tone(f, d, tuple(1 / (h ** 0.8) for h in range(1, 12)))
        eng *= 1 + 0.35 * np.sin(2 * np.pi * f * np.arange(len(t)) / SR / 2)
        nz = _shaped_noise(d, lambda k: 300 + 500 * k, lambda k: 400, rng)
        env = np.minimum(1, t / 0.08) * np.minimum(1, (d - t) / 0.35)
        x = np.tanh(1.5 * (eng / (np.max(np.abs(eng)) + 1e-9) + 0.4 * nz))
        return 0.45 * x * env
    if name == "tada":
        x = np.zeros(int(1.3 * SR))
        for i, f in enumerate((523.3, 659.3, 784.0, 1046.5)):
            p = _pluck(round(f, 1), 1.0, 0.997, i)
            o = int(i * 0.07 * SR)
            x[o:o + len(p)] += 0.35 * p[:len(x) - o]
        return x
    raise KeyError(name)


# -- music --------------------------------------------------------------------

NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def _hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def music(duration, mood="funny", seed=0):
    rng = np.random.default_rng(seed)
    n = int((duration + 1) * SR)
    out = np.zeros(n)
    if mood == "funny":
        bpm = 104
        chords = [(60, 64, 67), (55, 59, 62), (57, 60, 64), (53, 57, 60)]  # C G Am F
    else:
        bpm = 84
        chords = [(57, 60, 64), (53, 57, 60), (48, 52, 55), (55, 59, 62)]  # Am F C G
    beat = 60 / bpm
    bar = 4 * beat
    kick_t = _t(0.35)
    kick = np.sin(2 * np.pi * np.cumsum(45 + 90 * np.exp(-kick_t * 25)) / SR) * _exp(len(kick_t), 9)
    hat = _shaped_noise(0.05, lambda k: 9000, lambda k: 2500, rng) * _exp(int(0.05 * SR), 80)

    def add(sig, at, gain):
        i = int(at * SR)
        if i >= n:
            return
        e = min(n, i + len(sig))
        out[i:e] += gain * sig[:e - i]

    b = 0
    while b * bar < duration + 1:
        ch = chords[b % len(chords)]
        t0 = b * bar
        if mood == "funny":
            pattern = [0, 1, 2, 1, 0, 2, 1, 2]
            for k, idx in enumerate(pattern):
                midi = ch[idx] + (12 if k in (2, 5) else 0)
                add(_pluck(round(_hz(midi), 2), 0.7, 0.995, k % 3), t0 + k * beat / 2, 0.16)
            for k in (0, 2):
                add(_tone(_hz(ch[0] - 24), beat * 0.9, (1.0, 0.3)) * _adsr(int(beat * 0.9 * SR), 0.01, 0.5, 0.3, 0.1),
                    t0 + k * beat, 0.22)
                add(kick, t0 + k * beat, 0.35)
            for k in range(4):
                add(hat, t0 + k * beat + beat / 2, 0.08)
        else:
            d = bar + 0.6
            t = _t(d)
            pad = sum(np.sin(2 * np.pi * _hz(m - 12) * (1 + det) * t)
                      for m in ch for det in (-0.003, 0.0, 0.003))
            env = np.minimum(1, t / 0.8) * np.minimum(1, (d - t) / 0.8)
            add(pad * env / 9, t0, 0.35)
            for k in range(8):
                add(_tone(_hz(ch[0] - 24), beat * 0.4, (1.0, 0.2)) * _exp(int(beat * 0.4 * SR), 8), t0 + k * beat / 2,
                    0.18)
            add(kick, t0, 0.4)
            add(kick, t0 + beat * 0.35, 0.25)
        b += 1
    out = out[:int(duration * SR)]
    fade = int(1.2 * SR)
    out[-fade:] *= np.linspace(1, 0, len(out[-fade:]))
    return out / (np.max(np.abs(out)) + 1e-9) * 0.5


def mix(voice, duration, cues, music_track, env, fps, music_gain=0.16, sfx_gain=0.75):
    """Voice + SFX cues [(time, name)] + ducked music."""
    n = int(duration * SR)
    out = np.zeros(n)
    v = normalize(voice)[:n]
    out[:len(v)] += v
    if music_track is not None:
        m = music_track[:n]
        if len(m) < n:
            reps = int(np.ceil(n / max(1, len(m))))
            m = np.tile(m, reps)[:n]
        duck = np.interp(np.arange(n) / SR * fps, np.arange(len(env)), env) if len(env) else np.zeros(n)
        duck = np.convolve(duck, np.ones(4410) / 4410, mode="same")
        out += m * music_gain * (1 - 0.5 * np.clip(duck * 1.5, 0, 1))
    for i, (t, name) in enumerate(cues):
        s = sfx(name, seed=i)
        a = int(t * SR)
        if a >= n or a < 0:
            continue
        e = min(n, a + len(s))
        out[a:e] += sfx_gain * s[:e - a]
    peak = np.max(np.abs(out)) + 1e-9
    if peak > 0.95:
        out = np.tanh(out / peak * 1.2) * 0.95
    return out
