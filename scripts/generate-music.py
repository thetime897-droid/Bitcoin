"""Composes a royalty-free "market news" background bed (original synthesis, no samples).

Usage: python3 scripts/generate-music.py [seconds] [out.wav]
Default: 75 s -> public/music/newsbed.wav
96 BPM, D minor (Dm - Bb - F - C), pulsing arp, bass, soft drums, sidechain pump.
"""
import os
import sys

import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 44100
SECONDS = float(sys.argv[1]) if len(sys.argv) > 1 else 75.0
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), "..", "public", "music", "newsbed.wav")
BPM = 96
BEAT = 60 / BPM
BAR = BEAT * 4
rng = np.random.default_rng(11)

N = int(SR * (SECONDS + 1.5))
t_all = np.arange(N) / SR


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def lp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, "low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi):
    return signal.sosfilt(signal.butter(2, [lo, hi], "band", fs=SR, output="sos"), x)


def saw(freq, n, phase=0.0):
    t = np.arange(n) / SR
    return 2 * ((freq * t + phase) % 1.0) - 1


def add(buf, start_s, x, gain=1.0):
    # Short fades on every note: abrupt starts/ends would click.
    x = np.array(x, dtype=float)
    a, r = min(len(x), int(SR * 0.004)), min(len(x), int(SR * 0.025))
    x[:a] *= np.linspace(0, 1, a)
    x[-r:] *= np.linspace(1, 0, r)
    i = int(start_s * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(x))
    buf[i:j] += x[: j - i] * gain


CHORDS = [  # (bass root, chord tones) as MIDI notes
    (38, [50, 53, 57, 62]),  # Dm
    (34, [46, 50, 53, 58]),  # Bb
    (41, [53, 57, 60, 65]),  # F
    (36, [48, 52, 55, 60]),  # C
]
bars = int(np.ceil(SECONDS / BAR)) + 1
chord_at = lambda bar: CHORDS[(bar // 2) % 4]  # noqa: E731

pad = np.zeros(N)
arp = np.zeros(N)
bass = np.zeros(N)
kick = np.zeros(N)
snare = np.zeros(N)
hats = np.zeros(N)
kick_times = []

last_bar = int(SECONDS / BAR) - 1
for bar in range(bars):
    b0 = bar * BAR
    root, tones = chord_at(bar)
    # Pad: detuned saw stack, 2-bar chords with overlapping fades.
    if bar % 2 == 0:
        n = int(SR * (BAR * 2 + 1.0))
        e = np.minimum(1, np.arange(n) / (SR * 0.8)) * np.minimum(1, (n - np.arange(n)) / (SR * 1.0))
        voice = sum(saw(mtof(m + d), n, rng.random()) for m in tones for d in (-0.11, 0.0, 0.12))
        add(pad, b0, lp(voice, 1400) * e, 0.035)
    # Arp from bar 1: sixteenth plucks over chord tones.
    if bar >= 1 and bar <= last_bar:
        pattern = [0, 2, 3, 1, 2, 3, 0, 2]
        for s in range(16):
            m = tones[pattern[s % 8]] + 12
            n = int(SR * 0.22)
            tt = np.arange(n) / SR
            note = saw(mtof(m), n) * np.exp(-tt * 22)
            cutoff = 1500 + 2200 * min(1, bar / 6)
            add(arp, b0 + s * BEAT / 4, lp(note, cutoff), 0.10 if s % 4 == 0 else 0.07)
    # Bass from bar 2: eighth notes.
    if 2 <= bar <= last_bar:
        for s in range(8):
            n = int(SR * BEAT / 2)
            tt = np.arange(n) / SR
            f = mtof(root)
            tone = np.tanh(3 * np.sin(2 * np.pi * f * tt)) * np.exp(-tt * 5)
            add(bass, b0 + s * BEAT / 2, lp(tone, 380, 4), 0.28)
    # Drums from bar 2, dropping out on the last bar.
    if 2 <= bar < last_bar:
        for beat in range(4):
            bt = b0 + beat * BEAT
            if beat in (0, 2):
                n = int(SR * 0.4)
                tt = np.arange(n) / SR
                k = np.sin(2 * np.pi * np.cumsum(48 + 110 * np.exp(-tt * 35)) / SR) * np.exp(-tt * 9)
                add(kick, bt, k, 0.55)
                kick_times.append(bt)
            if beat in (1, 3):
                n = int(SR * 0.35)
                tt = np.arange(n) / SR
                sn = bp(rng.standard_normal(n), 1400, 6000) * np.exp(-tt * 16) + np.sin(2 * np.pi * 190 * tt) * np.exp(-tt * 25) * 0.6
                add(snare, bt, sn, 0.16)
            for h in (0.5,) if bar < 6 else (0.25, 0.5, 0.75):
                n = int(SR * 0.06)
                tt = np.arange(n) / SR
                add(hats, bt + h * BEAT, hp(rng.standard_normal(n), 7500) * np.exp(-tt * 70), 0.05)

# Sidechain pump on the melodic layers.
duck = np.ones(N)
for kt in kick_times:
    i = int(kt * SR)
    n = min(N - i, int(SR * 0.5))
    duck[i : i + n] = np.minimum(duck[i : i + n], 1 - 0.4 * np.exp(-np.arange(n) / SR * 9))
melodic = (pad + arp + bass * 0.9) * duck

# Small hall on pad/arp/snare.
ir_n = int(SR * 1.8)
ir = rng.standard_normal(ir_n) * np.exp(-np.arange(ir_n) / SR * 3.8)
ir = lp(ir, 5500)
ir /= np.sum(np.abs(ir)) / 40
wet_src = pad + arp * 0.8 + snare
wet = signal.fftconvolve(wet_src, ir)[:N]
wet = wet / max(1e-9, np.max(np.abs(wet))) * np.max(np.abs(wet_src)) * 0.35

mix_l = melodic + kick + snare + hats + wet
# Stereo: arp slightly right, hats left, reverb decorrelated.
mix_r = melodic + kick + snare + hats * 0.7 + np.roll(wet, int(SR * 0.013))
mix_l += arp * 0.25 * duck
mix = np.stack([mix_l, mix_r], axis=1)

# Final soft hit on the last downbeat.
end_t = (last_bar + 1) * BAR
n = int(SR * 2.5)
tt = np.arange(n) / SR
hit = np.sin(2 * np.pi * np.cumsum(45 + 60 * np.exp(-tt * 25)) / SR) * np.exp(-tt * 3)
hit += sum(np.sin(2 * np.pi * mtof(m) * tt) for m in (62, 65, 69)) * np.exp(-tt * 1.6) * 0.08
for c in range(2):
    add(mix[:, c], end_t, hit, 0.6)

mix = np.tanh(mix * 1.2)
mix = mix[: int(SR * SECONDS)]
fade = int(SR * 2.0)
mix[-fade:] *= np.linspace(1, 0, fade)[:, None] ** 1.5
mix[: int(SR * 0.05)] *= np.linspace(0, 1, int(SR * 0.05))[:, None]
mix = mix / np.max(np.abs(mix)) * 0.89

os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
wavfile.write(OUT, SR, (mix * 32767).astype(np.int16))
print("wrote", os.path.abspath(OUT), f"{SECONDS:.1f}s")
