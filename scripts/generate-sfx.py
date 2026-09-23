"""Synthesises the sound effects into public/sfx/*.wav (no external assets needed).

Run with: python3 scripts/generate-sfx.py
"""
import math
import os
import random
import struct
import wave

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "sfx")
random.seed(7)


def write(name, left, right=None, gain=0.9):
    right = right if right is not None else left
    peak = max(1e-9, max(max(abs(x) for x in left), max(abs(x) for x in right)))
    scale = gain / peak
    os.makedirs(OUT, exist_ok=True)
    with wave.open(os.path.join(OUT, name), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        frames = bytearray()
        for l, r in zip(left, right):
            frames += struct.pack("<hh", int(max(-1, min(1, l * scale)) * 32767), int(max(-1, min(1, r * scale)) * 32767))
        w.writeframes(bytes(frames))


def svf_bandpass(signal, freqs, q=0.7):
    """State-variable band-pass filter with a per-sample centre frequency."""
    low = band = 0.0
    out = []
    damp = 1.0 / q
    for x, f in zip(signal, freqs):
        c = 2 * math.sin(math.pi * min(f, SR / 6) / SR)
        high = x - low - damp * band
        band += c * high
        low += c * band
        out.append(band)
    return out


def noise(n):
    return [random.uniform(-1, 1) for _ in range(n)]


def whoosh(seconds, lo, hi):
    n = int(SR * seconds)
    t = [i / n for i in range(n)]
    freqs = [lo + (hi - lo) * math.sin(math.pi * x) ** 1.5 for x in t]
    body = svf_bandpass(noise(n), freqs, q=1.4)
    air = svf_bandpass(noise(n), [f * 2.6 for f in freqs], q=2.0)
    env = [math.sin(math.pi * x) ** 2 * (0.6 + 0.4 * x) for x in t]
    mono = [(b + 0.35 * a) * e for b, a, e in zip(body, air, env)]
    # Pan left -> right to sell the camera movement.
    left = [m * math.cos(x * math.pi / 2 * 0.8 + 0.1) for m, x in zip(mono, t)]
    right = [m * math.sin(x * math.pi / 2 * 0.8 + 0.1) for m, x in zip(mono, t)]
    return left, right


def sine_sweep(seconds, f0, f1, decay, curve=1.0):
    n = int(SR * seconds)
    out, phase = [], 0.0
    for i in range(n):
        x = i / n
        f = f0 * (f1 / f0) ** (x ** curve)
        phase += 2 * math.pi * f / SR
        out.append(math.sin(phase) * math.exp(-decay * x))
    return out


def fade_in(sig, ms):
    k = int(SR * ms / 1000)
    return [s * min(1.0, i / max(1, k)) for i, s in enumerate(sig)]


# Flights
l, r = whoosh(2.4, 250, 2400)
write("whoosh-long.wav", l, r, 0.85)
l, r = whoosh(1.4, 350, 2800)
write("whoosh-short.wav", l, r, 0.8)

# UI pop (cards, stats)
pop = sine_sweep(0.14, 950, 320, 9)
click = [v * math.exp(-i / 90) for i, v in enumerate(noise(int(SR * 0.14)))]
write("pop.wav", fade_in([p + 0.25 * c for p, c in zip(pop, click)], 2), gain=0.7)

# Flag drop / thump
thump = sine_sweep(0.45, 150, 55, 6)
hit = svf_bandpass(noise(len(thump)), [900] * len(thump), 0.9)
write("thump.wav", fade_in([a + 0.5 * b * math.exp(-i / 1500) for i, (a, b) in enumerate(zip(thump, hit))], 1), gain=0.85)

# Pin ding
n = int(SR * 1.3)
ding = []
for i in range(n):
    x = i / SR
    v = (math.sin(2 * math.pi * 1318.5 * x) * 0.6 + math.sin(2 * math.pi * 1977 * x) * 0.3 + math.sin(2 * math.pi * 2637 * x) * 0.15)
    ding.append(v * math.exp(-x * 4.2))
write("ding.wav", fade_in(ding, 3), gain=0.6)

# State lift (soft upward sweep)
lift = sine_sweep(0.55, 280, 900, 2.5, 0.8)
lift = [v * math.sin(math.pi * i / len(lift)) for i, v in enumerate(lift)]
write("lift.wav", lift, gain=0.5)

# Hook impact
n = int(SR * 1.8)
boom = sine_sweep(1.8, 95, 38, 3.2, 0.5)
crack = svf_bandpass(noise(n), [1200 - 900 * i / n for i in range(n)], 0.8)
impact = [b + 0.6 * c * math.exp(-i / 2500) for i, (b, c) in enumerate(zip(boom, crack))]
write("impact.wav", fade_in(impact, 1), gain=0.95)

# Intro riser
n = int(SR * 1.4)
t = [i / n for i in range(n)]
rise_noise = svf_bandpass(noise(n), [300 + 5000 * x ** 2 for x in t], 1.2)
tone = sine_sweep(1.4, 180, 720, 0, 1.3)
riser = [(0.8 * a + 0.35 * b) * x ** 1.6 for a, b, x in zip(rise_noise, tone, t)]
write("riser.wav", riser, gain=0.75)

# Follow tap + sparkle
write("click.wav", fade_in([v * math.exp(-i / 160) for i, v in enumerate(noise(int(SR * 0.08)))], 0.5), gain=0.6)
n = int(SR * 0.9)
spark = [0.0] * n
for k in range(9):
    start = int(random.uniform(0, 0.45) * SR)
    f = random.uniform(2200, 4200)
    for i in range(start, n):
        x = (i - start) / SR
        spark[i] += math.sin(2 * math.pi * f * x) * math.exp(-x * 11) * 0.4
write("sparkle.wav", spark, gain=0.5)

# Counter tick
write("tick.wav", [v * math.exp(-i / 60) for i, v in enumerate(svf_bandpass(noise(int(SR * 0.04)), [5000] * int(SR * 0.04), 1))], gain=0.5)

print("SFX written to", os.path.abspath(OUT))
