"""Synthesises the sound effects into public/sfx/*.wav (no external assets needed).

Designed to sound natural rather than "synthy": pink-noise air movement,
real-room reverb, soft transients and wood/marimba-like UI tones.
Requires numpy + scipy.  Run with: python3 scripts/generate-sfx.py
"""
import os

import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "sfx")
rng = np.random.default_rng(7)


def t_axis(sec):
    return np.arange(int(SR * sec)) / SR


def pink(n):
    white = rng.standard_normal(n)
    spec = np.fft.rfft(white)
    f = np.fft.rfftfreq(n, 1 / SR)
    spec[1:] /= np.sqrt(f[1:])
    spec[0] = 0
    x = np.fft.irfft(spec, n)
    return x / np.max(np.abs(x))


def filt(x, kind, freq, order=2):
    sos = signal.butter(order, freq, btype=kind, fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def sweep_bandpass(x, freqs, q=1.1, block=256):
    """Band-pass with a centre frequency that moves over time (block-wise)."""
    out = np.zeros_like(x)
    zi = None
    for i in range(0, len(x), block):
        f = float(np.clip(freqs[min(i, len(freqs) - 1)], 60, SR / 2.3))
        bw = f / q
        lo, hi = max(30.0, f - bw / 2), min(SR / 2.2, f + bw / 2)
        sos = signal.butter(2, [lo, hi], btype="band", fs=SR, output="sos")
        if zi is None:
            zi = signal.sosfilt_zi(sos) * 0
        seg, zi = signal.sosfilt(sos, x[i : i + block], zi=zi)
        out[i : i + block] = seg
    return out


def reverb_ir(seconds, damping=6000, early=True):
    n = int(SR * seconds)
    t = np.arange(n) / SR
    ir = np.zeros((n, 2))
    decay = np.exp(-6.9 * t / seconds)
    for ch in range(2):
        tail = rng.standard_normal(n) * decay
        tail = filt(tail, "low", damping)
        ir[:, ch] = tail * 0.35
        if early:
            for d, g in [(0.011, 0.5), (0.019, 0.38), (0.027, 0.3), (0.041, 0.22), (0.057, 0.15)]:
                k = int((d + ch * 0.0023) * SR)
                ir[k, ch] += g
    return ir / np.max(np.abs(ir))


def with_reverb(dry, seconds, wet, damping=6000):
    if dry.ndim == 1:
        dry = np.stack([dry, dry], axis=1)
    ir = reverb_ir(seconds, damping)
    pad = np.zeros((int(SR * seconds), 2))
    x = np.vstack([dry, pad])
    rev = np.stack([signal.fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], axis=1)
    rev /= max(1e-9, np.max(np.abs(rev)))
    return x * (1 - wet) + rev * wet * np.max(np.abs(dry))


def env(n, attack, release, curve=2.0):
    e = np.ones(n)
    a = int(SR * attack)
    r = int(SR * release)
    if a:
        e[:a] = np.linspace(0, 1, a) ** curve
    if r:
        e[-r:] *= np.linspace(1, 0, r) ** curve
    return e


def pan_stereo(mono, start=-0.6, end=0.6):
    p = np.linspace(start, end, len(mono))
    left = mono * np.cos((p + 1) * np.pi / 4)
    right = mono * np.sin((p + 1) * np.pi / 4)
    return np.stack([left, right], axis=1)


def write(name, x, peak_db=-1.0):
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    # Tiny fades avoid clicks at the file edges.
    f = int(SR * 0.004)
    x[:f] *= np.linspace(0, 1, f)[:, None]
    x[-f:] *= np.linspace(1, 0, f)[:, None]
    x = x / max(1e-9, np.max(np.abs(x))) * 10 ** (peak_db / 20)
    os.makedirs(OUT, exist_ok=True)
    wavfile.write(os.path.join(OUT, name), SR, (x * 32767).astype(np.int16))


# --- Camera flights: air rush that passes by -------------------------------------------
def whoosh(sec, lo, hi, peak_at=0.55):
    n = int(SR * sec)
    t = np.linspace(0, 1, n)
    shape = np.where(t < peak_at, (t / peak_at) ** 2.2, ((1 - t) / (1 - peak_at)) ** 1.4)
    freqs = lo + (hi - lo) * shape
    body = sweep_bandpass(pink(n), freqs, q=0.9)
    air = sweep_bandpass(pink(n), freqs * 2.4, q=1.6) * 0.35
    rumble = filt(pink(n), "low", 140) * 0.5
    mono = (body + air + rumble * shape) * shape
    stereo = pan_stereo(mono, -0.7, 0.7)
    # Haas delay on the trailing side for width.
    d = int(0.012 * SR)
    stereo[d:, 1] = 0.85 * stereo[d:, 1] + 0.15 * stereo[:-d, 0]
    return with_reverb(stereo, 1.6, 0.22, damping=5000)


write("whoosh-long.wav", whoosh(2.7, 180, 1700))
write("whoosh-short.wav", whoosh(1.5, 260, 2200, 0.5), peak_db=-2)

# --- Hook impact: cinematic sub drop + body + transient, big hall --------------------------
t = t_axis(2.2)
sub_f = 32 + 28 * np.exp(-t * 3)
sub = np.sin(2 * np.pi * np.cumsum(sub_f) / SR) * np.exp(-t * 1.6)
body = filt(rng.standard_normal(len(t)), "low", 260) * np.exp(-t * 14)
click = filt(rng.standard_normal(len(t)), "band", [1800, 5200]) * np.exp(-t * 180)
impact = np.tanh((sub * 1.0 + body * 0.9 + click * 0.35) * 1.4)
write("impact.wav", with_reverb(impact, 3.0, 0.3, damping=4000))

# --- Flag drop: soft felt thump -------------------------------------------------------------
t = t_axis(0.6)
f = 55 + 70 * np.exp(-t * 28)
thump = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11)
thump += filt(rng.standard_normal(len(t)), "low", 900) * np.exp(-t * 60) * 0.4
write("thump.wav", with_reverb(np.tanh(thump * 1.3), 0.7, 0.15), peak_db=-2)

# --- UI tap (cards, badges): wooden "tock" --------------------------------------------------
t = t_axis(0.35)
tap = np.sin(2 * np.pi * 1180 * t) * np.exp(-t * 55) + 0.5 * np.sin(2 * np.pi * 2350 * t) * np.exp(-t * 90)
tap += filt(rng.standard_normal(len(t)), "band", [2500, 7000]) * np.exp(-t * 400) * 0.35
write("pop.wav", with_reverb(tap, 0.45, 0.14), peak_db=-3)

# --- Pin: two-note marimba "blip-bloop" ----------------------------------------------------
t = t_axis(1.2)


def marimba(freq, delay):
    tt = np.clip(t - delay, 0, None)
    on = (t >= delay).astype(float)
    tone = np.sin(2 * np.pi * freq * tt) * np.exp(-tt * 7) + 0.25 * np.sin(2 * np.pi * freq * 3.93 * tt) * np.exp(-tt * 22)
    return tone * on


pin = marimba(784, 0.0) * 0.8 + marimba(1175, 0.085)
write("ding.wav", with_reverb(pin, 1.2, 0.22), peak_db=-3)

# --- State lift: airy swell ---------------------------------------------------------------
n = int(SR * 0.75)
tt = np.linspace(0, 1, n)
lift = sweep_bandpass(pink(n), 500 + 2600 * tt**1.5, q=1.3) * np.sin(np.pi * tt) ** 1.5
write("lift.wav", with_reverb(pan_stereo(lift, 0.2, -0.2), 0.9, 0.25), peak_db=-4)

# --- Intro sting: reverse swell into a soft hit with shimmer ------------------------------
n_sw = int(SR * 0.55)
sw = sweep_bandpass(pink(n_sw), 300 + 4000 * np.linspace(0, 1, n_sw) ** 2, q=1.0) * np.linspace(0, 1, n_sw) ** 2.5
t = t_axis(1.6)
hit = np.sin(2 * np.pi * np.cumsum(48 + 40 * np.exp(-t * 20)) / SR) * np.exp(-t * 5)
shimmer = sum(np.sin(2 * np.pi * fq * t) * np.exp(-t * 3.5) for fq in (1568, 2093, 2637)) * 0.12
sting = np.concatenate([sw * 0.8, np.tanh(hit * 1.2) + shimmer])
write("riser.wav", with_reverb(sting, 1.8, 0.28))

# --- Follow button: soft mouse click + gentle chime ---------------------------------------
t = t_axis(0.12)
clk = filt(rng.standard_normal(len(t)), "band", [1800, 6000]) * (np.exp(-t * 700) + 0.6 * np.exp(-np.clip(t - 0.035, 0, None) * 900) * (t > 0.035))
write("click.wav", with_reverb(clk, 0.3, 0.1), peak_db=-4)
t = t_axis(1.4)
chime = sum(
    np.sin(2 * np.pi * fq * np.clip(t - d, 0, None)) * np.exp(-np.clip(t - d, 0, None) * 5) * (t >= d)
    for fq, d in ((1318.5, 0.0), (1760, 0.07), (2637, 0.14))
)
write("sparkle.wav", with_reverb(chime, 1.4, 0.3), peak_db=-5)

# Legacy name kept so older episodes still resolve.
write("tick.wav", with_reverb(tap * 0.5, 0.3, 0.1), peak_db=-8)

print("SFX written to", os.path.abspath(OUT))
