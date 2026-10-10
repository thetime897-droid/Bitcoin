"""Dezentes Spannungs-Musikbett unter dem Voice-Over (synthetisch, lizenzfrei).

spec = {"bpm": 92, "chords": [["A",'m'],...], "sections": [[t, "pulse"|"full"|"tension"|"off"], ...],
        "drops": [t, ...]  # 0,5 s Stille vor einer Enthuellung (Musik setzt danach wieder ein)
        "level": 0.5}
Bausteine: warmer Pad-Akkord (verstimmte Saegezaehne, Tiefpass mit langsamem LFO), weicher Herzschlag-Kick,
leise Off-Beat-Shaker, Pluck-Arpeggio in "full". Absichtlich zurueckhaltend – es soll tragen, nicht auffallen.
"""
import numpy as np
from scipy import signal

SR = 48000
NOTE = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}


def midi_hz(m):
    return 440 * 2 ** ((m - 69) / 12)


def chord_notes(root, q):
    r = 48 + NOTE[root]
    third = 3 if q == "m" else 4
    return [r - 12, r, r + third, r + 7, r + 12 + (2 if q == "m" else 0)]


def saw(f, n, ph=0.0):
    t = np.arange(n) / SR
    return 2 * ((f * t + ph) % 1) - 1


def lp_var(x, fc):  # zeitvarianter Tiefpass in Bloecken
    out = np.zeros_like(x); blk = 1024; zi = None
    for s in range(0, len(x), blk):
        b, a = signal.butter(2, min(0.45, fc[min(s, len(fc) - 1)] / (SR / 2)), "low")
        if zi is None: zi = signal.lfilter_zi(b, a) * 0
        out[s:s + blk], zi = signal.lfilter(b, a, x[s:s + blk], zi=zi)
    return out


def generate(dur, spec):
    rng = np.random.default_rng(3)
    n = int(dur * SR); t = np.arange(n) / SR
    bpm = spec.get("bpm", 92); beat = 60 / bpm; bar = beat * 4
    chords = spec.get("chords", [["A", "m"], ["F", ""], ["C", ""], ["G", ""]])
    sections = sorted(spec.get("sections", [[0, "full"]]))
    mode = np.empty(n, dtype=object)
    for i, (st0, m) in enumerate(sections):
        en = sections[i + 1][0] if i + 1 < len(sections) else dur
        mode[int(st0 * SR):int(en * SR)] = m
    is_ = lambda *ms: np.isin(mode, ms).astype(float)

    # --- Pad ---
    pad = np.zeros(n)
    bars_per_chord = 2
    seg = bar * bars_per_chord
    for k in range(int(dur / seg) + 2):
        root, q = chords[k % len(chords)]
        s0, s1 = int(k * seg * SR), min(n, int((k + 1) * seg * SR + 0.4 * SR))
        if s0 >= n: break
        L = s1 - s0; tt = np.arange(L) / SR
        env = np.minimum(1, tt / 0.6) * np.minimum(1, np.maximum(0, (L / SR - tt)) / 0.4)
        v = sum(saw(midi_hz(m) * (1 + d), L, rng.random()) for m in chord_notes(root, q)[1:] for d in (-0.004, 0.004)) / 8
        pad[s0:s1] += v * env
    fc = 700 + 500 * np.sin(2 * np.pi * t / (bar * 2)) + 900 * is_("full")
    pad = lp_var(pad, fc) * (0.55 * is_("full", "pulse") + 0.75 * is_("tension"))

    # --- Bass-Drone (Grundton) ---
    bass = np.zeros(n)
    for k in range(int(dur / seg) + 2):
        root, q = chords[k % len(chords)]
        s0, s1 = int(k * seg * SR), min(n, int((k + 1) * seg * SR))
        if s0 >= n: break
        tt = np.arange(s1 - s0) / SR
        bass[s0:s1] = np.sin(2 * np.pi * midi_hz(36 + NOTE[root]) * tt) * np.minimum(1, tt / 0.05)
    bass *= 0.5 * is_("full", "pulse", "tension")

    # --- Herzschlag-Kick auf 1 und 3 (in tension: Viertel) ---
    kick = np.zeros(n); kl = int(0.35 * SR); kt = np.arange(kl) / SR
    ksmp = np.sin(2 * np.pi * np.cumsum(45 + 70 * np.exp(-kt / 0.03)) / SR) * np.exp(-kt / 0.12)
    for b in range(int(dur / beat) + 1):
        i = int(b * beat * SR)
        if i >= n: break
        m = mode[i]
        if m in ("pulse", "full") and b % 2 == 0 or m == "tension":
            e = min(n, i + kl); kick[i:e] += ksmp[: e - i] * (0.9 if b % 4 == 0 else 0.65)

    # --- Shaker auf Off-Beats (nur full) ---
    shk = np.zeros(n); sl = int(0.06 * SR)
    noise = signal.lfilter(*signal.butter(2, 5000 / (SR / 2), "high"), rng.standard_normal(sl)) * np.exp(-np.arange(sl) / (0.015 * SR))
    for b in range(int(dur / (beat / 2)) + 1):
        i = int(b * beat / 2 * SR)
        if i >= n: break
        if mode[i] == "full" and b % 2 == 1:
            e = min(n, i + sl); shk[i:e] += noise[: e - i] * rng.uniform(0.15, 0.25)

    # --- Pluck-Arpeggio (nur full) ---
    arp = np.zeros(n); al = int(0.3 * SR); at = np.arange(al) / SR
    for b in range(int(dur / (beat / 2)) + 1):
        i = int(b * beat / 2 * SR)
        if i >= n: break
        if mode[i] != "full": continue
        root, q = chords[int(b * beat / 2 / seg) % len(chords)]
        notes = chord_notes(root, q)[1:]
        m = notes[[0, 2, 1, 3, 2, 1, 3, 2][b % 8]] + 12
        tone = (np.sin(2 * np.pi * midi_hz(m) * at) + 0.3 * np.sin(4 * np.pi * midi_hz(m) * at)) * np.exp(-at / 0.09)
        e = min(n, i + al); arp[i:e] += tone[: e - i] * 0.18

    mono = pad * 0.5 + bass * 0.45 + kick * 0.8 + arp
    # Stereo: Pad/Arp breit, Kick/Bass mittig
    d = int(0.012 * SR)
    wide = pad * 0.5 + arp
    L = mono + 0.25 * np.concatenate([np.zeros(d), wide[:-d]]); R = mono + 0.25 * np.concatenate([wide[d:], np.zeros(d)])
    L += shk * 0.7; R += np.concatenate([np.zeros(200), shk[:-200]]) * 0.7
    out = np.stack([L, R], axis=1)

    # Drops: Stille kurz vor einer Enthuellung
    gain = np.ones(n)
    for dt in spec.get("drops", []):
        a, b = int((dt - 0.55) * SR), int(dt * SR)
        if 0 <= a < n:
            fade = min(int(0.08 * SR), b - a)
            gain[a:a + fade] = np.minimum(gain[a:a + fade], np.linspace(1, 0, fade))
            gain[a + fade:b] = 0
    # Ausklingen am Ende
    f = int(0.4 * SR); gain[-f:] *= np.linspace(1, 0, f)
    out *= gain[:, None]
    out /= np.max(np.abs(out)) + 1e-9
    return out * spec.get("level", 0.5)
