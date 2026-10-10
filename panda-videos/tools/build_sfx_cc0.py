"""Baut sfx/lib aus echten CC0-Aufnahmen (sfx/cc0, Quelle: Sonic Pi / freesound.org, siehe sfx/cc0/SOURCES.md).
Mehrere Varianten je Typ (<typ>.wav, <typ>_2.wav, ...) – der Mixer waehlt pro Einsatz zufaellig, damit nichts repetitiv klingt.
Bearbeitung wie im Sounddesign ueblich: trimmen, Fades, Rueckwaerts-Becken als Riser, Layering, leichter Raum.
"""
import os, glob, subprocess
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SRC, LIB = os.path.join(ROOT, "sfx", "cc0"), os.path.join(ROOT, "sfx", "lib")


def load(name):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(SRC, name + ".flac"), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)
    return x / (np.max(np.abs(x)) + 1e-9)


def trim(x, start=0.0, dur=None, fade_in=0.002, fade_out=0.05):
    x = x[int(start * SR):]
    if dur: x = x[: int(dur * SR)]
    x = x.copy(); fi, fo = int(fade_in * SR), min(len(x) // 2, int(fade_out * SR))
    if fi: x[:fi] *= np.linspace(0, 1, fi)[:, None]
    if fo: x[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 1.5
    return x


def gate_start(x, thr=0.02):  # Stille am Anfang entfernen
    i = np.argmax(np.max(np.abs(x), axis=1) > thr); return x[max(0, i - 48):]


def mix(*layers):
    n = max(int(s * SR) + len(a) for a, s, g in layers); out = np.zeros((n, 2))
    for a, s, g in layers: out[int(s * SR):int(s * SR) + len(a)] += a * g
    return out


def pitch(x, f):
    return signal.resample(x, int(len(x) / f), axis=0)


def lp(x, f):
    b, a = signal.butter(2, f / (SR / 2), "low"); return signal.lfilter(b, a, x, axis=0)


def hp(x, f):
    b, a = signal.butter(2, f / (SR / 2), "high"); return signal.lfilter(b, a, x, axis=0)


def room(x, rt=0.5, wet=0.1, seed=1):
    r = np.random.default_rng(seed); n = int(rt * SR); t = np.arange(n) / SR
    irs = [np.convolve(r.standard_normal(n) * np.exp(-6.9 * t / rt), [0.5, 0.5])[:n] for _ in range(2)]
    irs = [ir / np.sqrt(np.sum(ir ** 2)) for ir in irs]
    w = np.stack([signal.fftconvolve(x[:, c], lp(irs[c][:, None], 7000)[:, 0])[: len(x) + n] for c in range(2)], axis=1)
    return np.concatenate([x, np.zeros((len(w) - len(x), 2))]) + wet * w


def save(x, name):
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.89
    os.makedirs(LIB, exist_ok=True)
    wavfile.write(os.path.join(LIB, name + ".wav"), SR, (x * 32767).astype(np.int16))


def reverse_riser(name, dur, extra=None):
    x = trim(gate_start(load(name)), 0, dur, fade_out=0.01)[::-1].copy()
    x *= np.linspace(0.15, 1, len(x))[:, None] ** 1.5
    if extra is not None: x = mix((x, 0, 1.0), (extra[-len(x):] if len(extra) > len(x) else extra, max(0, (len(x) - len(extra)) / SR), 0.6))
    f = int(0.006 * SR); x[-f:] *= np.linspace(1, 0, f)[:, None]
    return x


def build():
    for f in glob.glob(os.path.join(LIB, "*.wav")): os.remove(f)
    V = {}
    V["pop"] = [room(trim(gate_start(load("elec_pop")), 0, 0.12)), room(trim(gate_start(load("elec_plip")), 0, 0.2)), room(mix((trim(gate_start(load("perc_snap2")), 0, 0.17), 0, 0.7), (trim(gate_start(load("elec_pop")), 0, 0.1), 0, 0.6)))]
    V["snap"] = [room(trim(gate_start(load("perc_snap")), 0, 0.3), 0.4, 0.15), room(trim(gate_start(load("perc_snap2")), 0, 0.17), 0.4, 0.15)]
    V["ping"] = [room(mix((trim(gate_start(load("elec_ping")), 0, 0.21), 0, 1.0), (trim(gate_start(load("elec_triangle")), 0, 0.22), 0.0, 0.5)), 0.8, 0.2),
                 room(trim(gate_start(load("elec_chime")), 0, 1.2, fade_out=0.5), 0.8, 0.12)]
    V["ding"] = [trim(gate_start(load("perc_bell")), 0, 2.2, fade_out=1.2), trim(gate_start(load("perc_bell2")), 0, 2.0, fade_out=1.0)]
    V["cash"] = [trim(gate_start(load("perc_till")), 0, 2.0, fade_out=0.6)]
    V["whoosh"] = [trim(gate_start(load("perc_swoosh")), 0, 0.62), trim(gate_start(load("perc_swash")), 0, 0.32), trim(load("ambi_swoosh"), 0.2, 1.1, fade_in=0.05, fade_out=0.3)]
    V["boom"] = [trim(gate_start(load("perc_impact1")), 0, 1.1, fade_out=0.4), trim(gate_start(load("perc_impact2")), 0, 0.86, fade_out=0.3),
                 mix((trim(gate_start(load("bd_boom")), 0, 1.4, fade_out=0.5), 0, 0.9), (trim(gate_start(load("perc_impact2")), 0, 0.5), 0, 0.5))]
    V["impact"] = [trim(gate_start(load("misc_cineboom")), 0, 3.2, fade_out=1.4)]
    V["stamp"] = [room(mix((trim(gate_start(load("drum_heavy_kick")), 0, 0.27), 0, 1.0), (trim(gate_start(load("perc_snap")), 0, 0.3), 0.0, 0.6)), 0.35, 0.12)]
    V["tick"] = [trim(gate_start(load("elec_tick")), 0, 0.02, fade_out=0.005), trim(gate_start(load("hat_tap")), 0, 0.12)]
    V["riser"] = [reverse_riser("drum_cymbal_open", 1.6), reverse_riser("drum_splash_hard", 1.8)]
    V["swell"] = [reverse_riser("perc_bell2", 1.4), reverse_riser("drum_splash_soft", 1.5)]
    V["roll"] = [trim(gate_start(load("drum_roll")), 0.3, 1.6, fade_in=0.4, fade_out=0.02) * np.linspace(0.2, 1, int(1.6 * SR))[:, None] ** 1.2]
    V["sub"] = [mix((trim(gate_start(load("bass_drop_c")), 0, 1.8, fade_out=0.6), 0, 0.9), (trim(gate_start(load("bd_808")), 0, 0.56), 0, 0.7))]
    V["glitch"] = [trim(gate_start(load("glitch_perc1")), 0, 0.6), trim(gate_start(load("glitch_perc3")), 0, 0.6), trim(gate_start(load("glitch_perc5")), 0, 0.6)]
    V["signal"] = [trim(gate_start(load(n)), 0, 1.0, fade_out=0.3) for n in ("mehackit_phone1", "mehackit_phone2", "mehackit_phone4")]
    V["down"] = [room(pitch(trim(gate_start(load("elec_bong")), 0, 0.35), 0.75), 0.6, 0.15), room(trim(gate_start(load("elec_blup")), 0, 0.66), 0.5, 0.1)]
    V["rocket"] = [mix((trim(load("ambi_lunar_land"), 0.0, 3.0, fade_in=0.15, fade_out=1.2), 0, 1.0), (trim(gate_start(load("misc_cineboom")), 0, 1.5, fade_out=0.8), 0, 0.5))]
    V["door"] = [trim(gate_start(load("perc_door")), 0, 1.4, fade_out=0.5)]
    for k, vs in V.items():
        for i, x in enumerate(vs): save(x, k if i == 0 else f"{k}_{i + 1}")
        print(f"{k:8s} {len(vs)} Variante(n)")
    # paper aus uisfx (CC0) uebernehmen
    from build_sfx import make_paper, finish
    finish(make_paper(), "paper")


if __name__ == "__main__":
    import sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    build()
