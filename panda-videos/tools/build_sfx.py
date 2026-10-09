"""Baut die Soundeffekt-Bibliothek sfx/lib/*.wav (48 kHz, Stereo).

Jeder Effekt = physikalisch modellierte Schichten (Glocken-Moden, Muenzen, Mechanik, Luft)
+ eine CC0-Schicht aus dem uisfx-Paket (sfx/uisfx, Lizenz: sfx/uisfx/LICENSE-AUDIO)
+ etwas Raumhall, damit es natuerlich klingt. Eigene Dateien in sfx/custom/ haben beim Mischen Vorrang.
"""
import os, subprocess, sys
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
LIB = os.path.join(ROOT, "sfx", "lib")
UI = os.path.join(ROOT, "sfx", "uisfx")
rng = np.random.default_rng(42)


def t_axis(d):
    return np.arange(int(d * SR)) / SR


def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


def ui(name):
    return load(os.path.join(UI, name + ".mp3"))


def st(x, pan=0.0):
    """Mono -> Stereo mit Panorama (-1 links .. 1 rechts)."""
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    return np.stack([x * l * 1.414, x * r * 1.414], axis=1)


def mix(*layers):
    """layers: (stereo_array, start_sec, gain)"""
    n = max(int(s * SR) + len(a) for a, s, g in layers)
    out = np.zeros((n, 2))
    for a, s, g in layers:
        i = int(s * SR)
        out[i:i + len(a)] += a * g
    return out


def bp(x, lo, hi, order=2):
    b, a = signal.butter(order, [lo / (SR / 2), hi / (SR / 2)], "band")
    return signal.lfilter(b, a, x)


def lp(x, f, order=2):
    b, a = signal.butter(order, f / (SR / 2), "low")
    return signal.lfilter(b, a, x)


def hp(x, f, order=2):
    b, a = signal.butter(order, f / (SR / 2), "high")
    return signal.lfilter(b, a, x)


def bell(f0, ratios, amps, decays, dur, beat=2.5):
    t = t_axis(dur)
    out = np.zeros_like(t)
    for r, a, d in zip(ratios, amps, decays):
        f = f0 * r
        out += a * np.exp(-t / d) * (np.sin(2 * np.pi * f * t) + 0.6 * np.sin(2 * np.pi * (f + beat * r) * t + 1.3))
    att = np.minimum(1, t / 0.0015)
    return out * att


def room(x, rt=0.55, wet=0.14, seed=1):
    """kleiner, heller Raum: dekorrelierter Rauschhall"""
    r = np.random.default_rng(seed)
    n = int(rt * SR)
    t = np.arange(n) / SR
    env = np.exp(-6.9 * t / rt)
    irs = [lp(r.standard_normal(n) * env, 6500) for _ in range(2)]
    irs = [ir / np.sqrt(np.sum(ir ** 2)) for ir in irs]
    pre = int(0.012 * SR)
    wetsig = np.stack([np.concatenate([np.zeros(pre), signal.fftconvolve(x[:, c], irs[c])])[:len(x) + n] for c in range(2)], axis=1)
    dry = np.concatenate([x, np.zeros((len(wetsig) - len(x), 2))])
    return dry + wet * wetsig


def finish(x, name, peak_db=-1.0, tail_db=-60):
    x = np.tanh(x * 1.2) / 1.2  # weiche Saettigung statt harter Kanten
    x /= np.max(np.abs(x)) + 1e-9
    x *= 10 ** (peak_db / 20)
    # Stille am Ende abschneiden + kurzer Fade
    mag = np.max(np.abs(x), axis=1)
    idx = np.where(mag > 10 ** (tail_db / 20))[0]
    x = x[: idx[-1] + 1] if len(idx) else x
    f = min(len(x), int(0.02 * SR))
    x[-f:] *= np.linspace(1, 0, f)[:, None]
    os.makedirs(LIB, exist_ok=True)
    wavfile.write(os.path.join(LIB, name + ".wav"), SR, (x * 32767).astype(np.int16))
    print(f"{name:8s} {len(x) / SR:.2f}s")


# ---------- POP: weicher Holz-/Filz-Tap (kein Synth-Sweep) ----------
def make_pop():
    return room(mix((ui("organic/select"), 0, 0.9), (ui("soft/press"), 0.0, 0.5)), rt=0.3, wet=0.06)


# ---------- PING: organische Glocke ----------
def make_ping():
    return room(mix((ui("organic/notification"), 0, 1.0),), rt=0.6, wet=0.1)


# ---------- CASH: Muenzen + kleine Glocke + Lade (gedaempft) ----------
def make_cash():
    t = t_axis(0.12)
    thunk = np.sin(2 * np.pi * (140 * np.exp(-t / 0.05) + 70) * t) * np.exp(-t / 0.03)
    rattle = np.zeros(len(t))
    for k in range(5):
        i = int((0.004 + k * 0.014) * SR); n = int(0.006 * SR)
        rattle[i:i + n] += bp(rng.standard_normal(n), 1500, 4500) * np.exp(-np.arange(n) / (0.0012 * SR)) * (0.8 - k * 0.1)
    mech = st(thunk * 0.6 + rattle * 0.6, 0.15)
    ching = bell(1850, [1, 1.47, 2.09, 2.56], [1, 0.55, 0.3, 0.15], [0.6, 0.45, 0.3, 0.2], 1.0, beat=2.2)
    ching = st(lp(ching, 5000), -0.05)
    coins = np.zeros((int(0.9 * SR), 2))
    for k in range(18):
        start = 0.02 + rng.gamma(1.6, 0.07); tt = t_axis(0.15)
        hit = sum(np.sin(2 * np.pi * rng.uniform(2800, 7000) * tt + rng.uniform(0, 6)) for _ in range(3))
        hit *= np.exp(-tt / rng.uniform(0.015, 0.05)) * rng.uniform(0.15, 0.5)
        i = int(start * SR)
        if i + len(tt) < len(coins): coins[i:i + len(tt)] += st(lp(hit, 7500), rng.uniform(-0.6, 0.6))
    x = mix((mech, 0, 0.8), (coins, 0.06, 0.8), (ching, 0.09, 0.3), (ui("organic/purchase"), 0.05, 0.6))
    return room(x, rt=0.5, wet=0.1)


# ---------- WHOOSH: Atem-Luftzug ----------
def make_whoosh():
    d = 0.4; n = int(d * SR); tt = np.arange(n) / n
    air = lp(hp(rng.standard_normal(n), 300), 3000) * np.sin(np.pi * tt) ** 2 * 0.4
    return room(mix((st(air), 0, 0.6), (ui("organic/swipe"), 0, 0.9)), rt=0.4, wet=0.08)


# ---------- BOOM: dumpfer Schlag (kein Kino-Sub) ----------
def make_boom():
    t = t_axis(0.5)
    thud = np.sin(2 * np.pi * (60 + 70 * np.exp(-t / 0.03)) * t) * np.exp(-t / 0.12)
    x = st(np.tanh(1.5 * thud) * 0.8 + lp(rng.standard_normal(len(t)), 900) * np.exp(-t / 0.04) * 0.4)
    return room(mix((x, 0, 1.0), (ui("organic/drop"), 0, 0.8)), rt=0.5, wet=0.08)


# ---------- STAMP: Stempel-Schlag auf Papier ----------
def make_stamp():
    t = t_axis(0.35)
    thud = np.sin(2 * np.pi * (75 + 90 * np.exp(-t / 0.015)) * t) * np.exp(-t / 0.06)
    slap = bp(rng.standard_normal(len(t)), 700, 5000) * np.exp(-t / 0.012) * 0.8
    x = st(np.tanh(2 * thud) + slap)
    return room(mix((x, 0, 1.0), (ui("soft/drop"), 0, 0.5)), rt=0.4, wet=0.08)


# ---------- PAPER: Zeitung flattert ----------
def make_paper():
    d = 0.5; t = t_axis(d)
    flutter = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * (14 + 10 * t) * t + rng.uniform(0, 1, len(t)) * 0.4))
    x = bp(rng.standard_normal(len(t)), 900, 6000) * lp(flutter, 400)
    env = np.sin(np.pi * np.minimum(1, t / d)) ** 1.5
    return room(mix((st(x * env, 0.2), 0, 0.8), (ui("organic/swipe"), 0.05, 0.4)), rt=0.35, wet=0.08)


# ---------- DOWN: weicher negativer Akzent ----------
def make_down():
    return room(mix((ui("organic/error"), 0, 1.0),), rt=0.5, wet=0.1)


if __name__ == "__main__":
    for name, fn in [("pop", make_pop), ("ping", make_ping), ("cash", make_cash), ("whoosh", make_whoosh),
                     ("boom", make_boom), ("stamp", make_stamp), ("paper", make_paper), ("down", make_down)]:
        finish(fn(), name)
