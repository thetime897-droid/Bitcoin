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


# ---------- POP: Mund-/Blasen-Pop mit Gummi-Tap ----------
def make_pop():
    t = t_axis(0.12)
    f = 380 + 1500 * np.exp(-t / 0.011)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t / 0.028) * np.minimum(1, t / 0.0008)
    click = hp(rng.standard_normal(len(t)), 2500) * np.exp(-t / 0.0015) * 0.35
    x = st(body + click)
    return room(mix((x, 0, 1.0), (ui("rubber/press"), 0.0, 0.55)), rt=0.35, wet=0.08)


# ---------- PING: helle Glocke ----------
def make_ping():
    b = bell(1975, [1, 2.76, 5.40, 8.93], [1, 0.45, 0.22, 0.1], [0.55, 0.28, 0.12, 0.06], 1.0, beat=1.8)
    return room(mix((st(b, -0.1), 0, 0.6), (ui("glass/notification"), 0, 0.8)), rt=0.8, wet=0.16)


# ---------- CASH: Registrierkasse (Mechanik + "Ching" + Muenzen) ----------
def make_cash():
    t = t_axis(0.12)
    thunk = np.sin(2 * np.pi * (140 * np.exp(-t / 0.05) + 70) * t) * np.exp(-t / 0.03)
    rattle = np.zeros(len(t))
    for k in range(6):  # Ratsche der Lade
        i = int((0.004 + k * 0.013) * SR)
        n = int(0.006 * SR)
        rattle[i:i + n] += bp(rng.standard_normal(n), 1800, 5200) * np.exp(-np.arange(n) / (0.0012 * SR)) * (0.9 - k * 0.1)
    mech = st(thunk * 0.7 + rattle * 0.8, 0.15)
    ching = bell(2350, [1, 1.47, 2.09, 2.56, 3.30, 4.1], [1, 0.7, 0.5, 0.35, 0.22, 0.12], [0.9, 0.7, 0.5, 0.35, 0.22, 0.15], 1.4, beat=3.1)
    ching = st(ching, -0.05)
    coins = np.zeros((int(0.9 * SR), 2))
    for k in range(16):  # Muenzen klimpern
        start = 0.02 + rng.gamma(1.6, 0.07)
        dur = 0.18
        tt = t_axis(dur)
        hit = sum(np.sin(2 * np.pi * rng.uniform(3000, 8200) * tt + rng.uniform(0, 6)) for _ in range(3))
        hit *= np.exp(-tt / rng.uniform(0.02, 0.06)) * rng.uniform(0.15, 0.5)
        i = int(start * SR)
        if i + len(tt) < len(coins):
            coins[i:i + len(tt)] += st(hit, rng.uniform(-0.6, 0.6))
    x = mix((mech, 0, 1.0), (ching, 0.085, 0.75), (coins, 0.11, 0.55), (ui("glass/purchase"), 0.085, 0.6))
    return room(x, rt=0.7, wet=0.15)


# ---------- WHOOSH: Luftzug mit Stereo-Bewegung ----------
def make_whoosh():
    d = 0.42
    n = int(d * SR)
    noise = rng.standard_normal(n)
    pink = signal.lfilter([0.049922, -0.095993, 0.050613, -0.004408], [1, -2.494956, 2.017265, -0.522189], noise)
    out = np.zeros(n)
    blk = 256
    zi = None
    for s in range(0, n, blk):
        p = s / n
        fc = 350 + 2600 * np.sin(np.pi * min(1, p / 0.75)) ** 2  # Tonhoehe steigt und faellt (Doppler)
        b, a = signal.butter(2, [fc * 0.55 / (SR / 2), min(0.99, fc * 1.8 / (SR / 2))], "band")
        if zi is None:
            zi = signal.lfilter_zi(b, a) * 0
        out[s:s + blk], zi = signal.lfilter(b, a, pink[s:s + blk], zi=zi)
    tt = np.arange(n) / n
    env = np.where(tt < 0.68, (tt / 0.68) ** 2.2, np.exp(-(tt - 0.68) / 0.07))
    out *= env
    pan = np.linspace(-0.7, 0.7, n)
    stereo = np.stack([out * np.cos((pan + 1) * np.pi / 4), out * np.sin((pan + 1) * np.pi / 4)], axis=1) * 1.414
    return room(mix((stereo, 0, 1.0), (ui("cinematic/swipe"), 0.06, 0.45)), rt=0.5, wet=0.1)


# ---------- BOOM: Impact mit Sub ----------
def make_boom():
    t = t_axis(0.9)
    sub = np.sin(2 * np.pi * np.cumsum(38 + 60 * np.exp(-t / 0.06)) / SR) * np.exp(-t / 0.32)
    body = np.sin(2 * np.pi * 95 * t) * np.exp(-t / 0.08) * 0.5
    crack = lp(rng.standard_normal(len(t)), 3500) * np.exp(-t / 0.018) * 0.8
    rumble = lp(rng.standard_normal(len(t)), 220) * np.exp(-t / 0.25) * 1.4
    x = st(np.tanh(1.8 * (sub + body)) + crack + rumble)
    return room(mix((x, 0, 1.0), (ui("cinematic/drop"), 0, 0.7)), rt=0.9, wet=0.12)


# ---------- STAMP: Stempel-Schlag auf Papier ----------
def make_stamp():
    t = t_axis(0.35)
    thud = np.sin(2 * np.pi * (75 + 90 * np.exp(-t / 0.015)) * t) * np.exp(-t / 0.06)
    slap = bp(rng.standard_normal(len(t)), 700, 5500) * np.exp(-t / 0.012) * 0.9
    wood = bell(420, [1, 2.3, 3.9], [0.4, 0.2, 0.1], [0.05, 0.03, 0.02], 0.35, beat=0)
    x = st(np.tanh(2 * thud) + slap + wood)
    return room(mix((x, 0, 1.0), (ui("mechanical/snap"), 0, 0.5)), rt=0.45, wet=0.12)


# ---------- PAPER: Zeitung flattert / dreht sich ----------
def make_paper():
    d = 0.5
    t = t_axis(d)
    flutter = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * (14 + 10 * t) * t + rng.uniform(0, 1, len(t)) * 0.4))
    x = bp(rng.standard_normal(len(t)), 900, 7000) * lp(flutter, 400)
    env = np.sin(np.pi * np.minimum(1, t / d)) ** 1.5
    return room(mix((st(x * env, 0.2), 0, 0.8), (ui("organic/swipe"), 0.05, 0.5)), rt=0.4, wet=0.1)


# ---------- DOWN: kurzer negativer Akzent (fallender Ton) ----------
def make_down():
    t = t_axis(0.45)
    f = 520 * np.exp(-t / 0.35) + 140
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.18) * 0.6
    x += np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR) * np.exp(-t / 0.12) * 0.25
    return room(mix((st(lp(x, 2500)), 0, 1.0), (ui("cinematic/error"), 0, 0.55)), rt=0.6, wet=0.12)


if __name__ == "__main__":
    for name, fn in [("pop", make_pop), ("ping", make_ping), ("cash", make_cash), ("whoosh", make_whoosh),
                     ("boom", make_boom), ("stamp", make_stamp), ("paper", make_paper), ("down", make_down)]:
        finish(fn(), name)
