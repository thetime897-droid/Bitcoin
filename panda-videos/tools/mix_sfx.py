"""Mischt die SFX-Spur eines Videos: python3 tools/mix_sfx.py cues.json dauer out.wav

cues.json: [{"t": Sekunden, "type": "pop"|"cash"|..., "gain": optional}]
Quelle je Typ: sfx/custom/<typ>.(wav|mp3|ogg) falls vorhanden (z. B. eigene Pixabay-Sounds), sonst sfx/lib/<typ>.wav.
Jede Wiederholung wird leicht in Tonhoehe und Lautstaerke variiert, damit nichts mechanisch klingt.
"""
import json, os, subprocess, sys
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
GAIN = {"whoosh": 0.35, "pop": 0.5, "ping": 0.45, "cash": 0.6, "boom": 0.6, "stamp": 0.7, "paper": 0.5, "down": 0.45}
MASTER = 0.15  # deutlich unter der Stimme


def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"],
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
    return cache[kind]


def main(cues_path, dur, out):
    cues = json.load(open(cues_path))
    n = int(float(dur) * SR)
    bus = np.zeros((n + SR * 2, 2))
    rng = np.random.default_rng(7)
    for c in cues:
        x = source(c["type"])
        pitch = rng.uniform(0.965, 1.035)
        x = signal.resample(x, int(len(x) / pitch), axis=0)
        g = GAIN.get(c["type"], 0.5) * c.get("gain", 1) * 10 ** (rng.uniform(-1.5, 1.5) / 20)
        i = max(0, int(c["t"] * SR))
        if i >= len(bus):
            continue
        bus[i:i + len(x)] += x[: len(bus) - i] * g
    bus = np.tanh(bus[:n] * MASTER * 1.3) / 1.3
    wavfile.write(out, SR, (bus * 32767).astype(np.int16))


if __name__ == "__main__":
    main(*sys.argv[1:4])
