"""Mischt die SFX-Spur eines Videos: python3 tools/mix_sfx.py cues.json dauer out.wav [voice.(wav|mp4)]

cues.json: [{"t": Sekunden, "type": "pop"|"cash"|..., "gain": optional, "pan": -1..1 optional}]
Quelle je Typ: sfx/custom/<typ>.(wav|mp3|ogg) falls vorhanden (z. B. eigene Pixabay-Sounds), sonst sfx/lib/<typ>.wav.

Sounddesign-Regeln im Mix:
- Panorama: Effekt sitzt im Stereobild dort, wo das Element im Bild ist (Cue-"pan").
- "swell" endet genau auf dem Cue-Zeitpunkt (Rueckwaerts-Hall laeuft auf die Enthuellung zu).
- Sidechain-Ducking: solange die Stimme spricht, gehen die Effekte bis zu ~6 dB zurueck.
- EQ: Hochpass 70 Hz, Kerbe bei 2,8 kHz (Sprachpraesenz bleibt frei), sanfter Hoehen-Shelf.
- Kleine Variation in Tonhoehe/Lautstaerke je Einsatz, damit Wiederholungen nicht mechanisch klingen.
"""
import json, os, subprocess, sys
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
GAIN = {"whoosh": 0.35, "pop": 0.5, "ping": 0.45, "cash": 0.6, "boom": 0.6, "stamp": 0.7, "paper": 0.5, "down": 0.45,
        "tick": 0.3, "swell": 0.5, "horn": 0.55}
MASTER = 0.15  # deutlich unter der Stimme
SWELL_LEN = 1.1


def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vn", "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)


def source(kind, cache={}):
    if kind not in cache:
        for ext in ("wav", "mp3", "ogg"):
            p = os.path.join(ROOT, "sfx", "custom", f"{kind}.{ext}")
            if os.path.exists(p):
                x = load(p)
                cache[kind] = x / (np.max(np.abs(x)) + 1e-9) * 0.89
                break
        else:
            cache[kind] = load(os.path.join(ROOT, "sfx", "lib", f"{kind}.wav"))
        if kind == "swell":
            x = cache[kind][-int(SWELL_LEN * SR):].copy()
            x *= np.linspace(0, 1, len(x))[:, None] ** 1.2
            cache[kind] = x
    return cache[kind]


def pan(x, p):
    p = float(np.clip(p, -1, 1))
    l, r = np.cos((p + 1) * np.pi / 4) * 1.414, np.sin((p + 1) * np.pi / 4) * 1.414
    mono = x.mean(axis=1)
    # Balance + etwas Mono-Anteil, damit es natuerlich bleibt
    return np.stack([0.5 * x[:, 0] + 0.5 * mono * l, 0.5 * x[:, 1] + 0.5 * mono * r], axis=1)


def peaking(f0, gain_db, q):
    a = 10 ** (gain_db / 40); w = 2 * np.pi * f0 / SR; al = np.sin(w) / (2 * q)
    b = [1 + al * a, -2 * np.cos(w), 1 - al * a]; den = [1 + al / a, -2 * np.cos(w), 1 - al / a]
    return np.array(b) / den[0], np.array(den) / den[0]


def duck_curve(voice, n):
    v = np.abs(voice.mean(axis=1))[:n]
    v = np.concatenate([v, np.zeros(max(0, n - len(v)))])
    env = np.zeros(n); a_att, a_rel = np.exp(-1 / (0.012 * SR)), np.exp(-1 / (0.28 * SR))
    e = 0.0
    step = 48  # pro 1 ms rechnen, dann interpolieren
    blk = v[: n // step * step].reshape(-1, step).max(axis=1)
    out = np.zeros(len(blk))
    aa, ar = a_att ** step, a_rel ** step
    for i, x in enumerate(blk):
        e = aa * e + (1 - aa) * x if x > e else ar * e + (1 - ar) * x
        out[i] = e
    env = np.interp(np.arange(n), np.arange(len(out)) * step, out)
    thr = np.percentile(out, 60) + 1e-6
    return 1 - 0.5 * np.clip(env / thr, 0, 1)  # bis -6 dB


def main(cues_path, dur, out, voice_path=None):
    cues = json.load(open(cues_path))
    n = int(float(dur) * SR)
    bus = np.zeros((n + SR * 4, 2))
    rng = np.random.default_rng(7)
    for c in sorted(cues, key=lambda c: c["t"]):
        x = source(c["type"])
        pitch = rng.uniform(0.98, 1.02)
        x = signal.resample(x, int(len(x) / pitch), axis=0)
        x = pan(x, c.get("pan", 0))
        g = GAIN.get(c["type"], 0.5) * (c.get("gain") if c.get("gain") is not None else 1) * 10 ** (rng.uniform(-1, 1) / 20)
        i = int(c["t"] * SR) - (len(x) if c["type"] == "swell" else 0)
        if i >= n:
            continue
        if i < 0:
            x = x[-i:]; i = 0
        bus[i:i + len(x)] += x[: len(bus) - i] * g
    bus = bus[:n]
    # EQ
    b, a = signal.butter(2, 70 / (SR / 2), "high"); bus = signal.lfilter(b, a, bus, axis=0)
    b, a = peaking(2800, -4.5, 1.1); bus = signal.lfilter(b, a, bus, axis=0)
    b, a = peaking(9000, -2.0, 0.7); bus = signal.lfilter(b, a, bus, axis=0)
    if voice_path:
        bus *= duck_curve(load(voice_path), n)[:, None]
    bus = np.tanh(bus * MASTER * 1.3) / 1.3
    wavfile.write(out, SR, (bus * 32767).astype(np.int16))


if __name__ == "__main__":
    main(*sys.argv[1:5])
