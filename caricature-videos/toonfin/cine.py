"""Cinematic news videos from ONE config file (script + data + camera + cards + emotions + sound cues).

    python -m toonfin.cine examples/nvidia_cinematic.json out/nvidia.mp4            # final (60 fps)
    python -m toonfin.cine examples/nvidia_cinematic.json out/nvidia.mp4 --preview  # fast check (30 fps, lighter)
    python -m toonfin.cine examples/nvidia_cinematic.json out/x --stills 1,5,9       # stills only

Config keys: voice (optional recording, else placeholder TTS), sections[] {text, panda, cards, props, camera keys
(section-local t), trans, mood, dutch, slowmo}, look {...}, sound {cues file, music}. Each section becomes one shot;
its timing comes from the word timings of the voice. All sounds are synthesised here (free for commercial use).
"""
import json
import math
import subprocess
import sys
from functools import lru_cache
from pathlib import Path

import numpy as np

from . import audio
from .analysis import tts, transcribe, align, _norm

SR = audio.SR
HERE = Path(__file__).parent


# -- synthesised sound library (all generated here; documented in sfx/SOURCES.md) --------------------------

def _env(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d)


def _bp(x, lo, hi, order=2):
    from scipy.signal import butter, sosfilt
    return sosfilt(butter(order, [lo, hi], "bandpass", fs=SR, output="sos"), x)


def _lp(x, f, order=2):
    from scipy.signal import butter, sosfilt
    return sosfilt(butter(order, f, "lowpass", fs=SR, output="sos"), x)


def _norm1(x):
    return x / (np.max(np.abs(x)) + 1e-9)


@lru_cache(maxsize=None)
def cue_sound(name):
    """Mono sound for a named cue."""
    rng = np.random.default_rng(abs(hash(name)) % 2 ** 32)
    if name == "sub_drop":
        n = int(1.6 * SR)
        t = np.arange(n) / SR
        f = 26 + 70 * np.exp(-t * 3)
        return _norm1(np.sin(2 * np.pi * np.cumsum(f) / SR) * _env(n, 0.01, 0.9))
    if name in ("riser_up", "riser_into_loop"):
        n = int((1.5 if name == "riser_up" else 1.2) * SR)
        t = np.arange(n) / SR
        u = t / t[-1]
        noise = _bp(rng.normal(0, 1, n), 500, 7000) * u ** 2.2
        tone = np.sin(2 * np.pi * np.cumsum(180 + 900 * u ** 2) / SR) * u ** 3 * 0.35
        x = noise + tone
        x[-int(0.015 * SR):] *= np.linspace(1, 0, int(0.015 * SR))
        return _norm1(x)
    if name == "impact_hit":
        n = int(1.8 * SR)
        t = np.arange(n) / SR
        body = np.sin(2 * np.pi * np.cumsum(32 + 70 * np.exp(-t * 8)) / SR) * _env(n, 0.003, 0.7)
        crack = _bp(rng.normal(0, 1, n), 300, 5000) * _env(n, 0.001, 0.05)
        tail = _lp(rng.normal(0, 1, n), 900) * _env(n, 0.02, 0.6) * 0.25
        return _norm1(body + crack * 0.6 + tail)
    if name in ("alert_card_whoosh", "whoosh_doppler", "wall_zoom_whoosh", "whoosh"):
        from .studio import air_whoosh
        return {"alert_card_whoosh": air_whoosh(0.6, 700, 3000, 0.45, 5, 1.3),
                "whoosh_doppler": air_whoosh(1.1, 250, 2200, 0.5, 6, 1.0),
                "wall_zoom_whoosh": air_whoosh(0.9, 300, 1800, 0.62, 7, 0.9),
                "whoosh": air_whoosh(0.8, 400, 2000, 0.5, 8, 1.0)}[name]
    if name == "ticker_tick":
        n = int(0.05 * SR)
        t = np.arange(n) / SR
        return _norm1(np.sin(2 * np.pi * 3100 * t) * _env(n, 0.0005, 0.008))
    if name == "counter_lock_ding":
        n = int(1.2 * SR)
        t = np.arange(n) / SR
        ding = sum(np.sin(2 * np.pi * f * t) * a for f, a in ((1760, 1), (2637, 0.5), (3520, 0.25))) * _env(n, 0.002, 0.35)
        pump = np.sin(2 * np.pi * np.cumsum(55 + 40 * np.exp(-t * 18)) / SR) * _env(n, 0.003, 0.18)
        return _norm1(ding * 0.6 + pump)
    if name == "vote_click":
        n = int(0.09 * SR)
        t = np.arange(n) / SR
        return _norm1(_bp(rng.normal(0, 1, n), 1500, 6000) * _env(n, 0.0005, 0.012) +
                      np.sin(2 * np.pi * 1200 * t) * _env(n, 0.0005, 0.02) * 0.5)
    if name == "success_chime":
        n = int(1.4 * SR)
        t = np.arange(n) / SR
        x = np.zeros(n)
        for j, f in enumerate((1046.5, 1318.5, 1568.0, 2093.0)):
            a = int(j * 0.07 * SR)
            x[a:] += np.sin(2 * np.pi * f * t[:n - a]) * _env(n - a, 0.003, 0.4)
        return _norm1(x)
    if name == "pitch_down_fall":
        n = int(1.0 * SR)
        t = np.arange(n) / SR
        f = 700 * np.exp(-t * 2.2) + 60
        return _norm1(_lp(np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)),
                          1800) * _env(n, 0.005, 0.5))
    if name == "warning_ping":
        n = int(0.45 * SR)
        t = np.arange(n) / SR
        return _norm1((np.sin(2 * np.pi * 988 * t) + 0.4 * np.sin(2 * np.pi * 1976 * t)) * _env(n, 0.002, 0.12))
    if name == "heartbeat":
        n = int(0.8 * SR)
        t = np.arange(n) / SR
        x = np.zeros(n)
        for a in (0.0, 0.22):
            i = int(a * SR)
            tt = t[:n - i]
            x[i:] += np.sin(2 * np.pi * np.cumsum(40 + 30 * np.exp(-tt * 30)) / SR) * np.exp(-tt * 14)
        return _norm1(_lp(x, 300))
    if name == "paper_rip":
        n = int(0.5 * SR)
        x = _bp(rng.normal(0, 1, n), 1200, 9000) * _env(n, 0.01, 0.12)
        x *= 0.6 + 0.4 * np.abs(np.sin(np.arange(n) / SR * 2 * np.pi * 37))
        return _norm1(x)
    if name == "gong_hit":
        n = int(2.6 * SR)
        t = np.arange(n) / SR
        x = sum(np.sin(2 * np.pi * f * t + p) * a * np.exp(-t * d)
                for f, a, d, p in ((98, 1, 1.2, 0), (196.5, 0.6, 1.6, 1), (261, 0.4, 2.2, 2), (347, 0.3, 2.8, 3)))
        return _norm1(x * _env(n, 0.004, 3.0))
    if name == "pop":
        from .studio import _variant
        return _norm1(_variant("pop"))
    return np.zeros(int(0.1 * SR))


# where a cue sits in the stereo field (pan -1 left .. +1 right) and how it moves
PAN = {"whoosh_doppler": (-0.8, 0.8), "wall_zoom_whoosh": (0.6, -0.6), "alert_card_whoosh": (-0.5, 0.3),
       "whoosh": (-0.7, 0.7), "paper_rip": (0.3, 0.6), "vote_click": (-0.3, 0.3), "ticker_tick": (0.25, 0.25)}


def place(x, pan0=0.0, pan1=None):
    """Mono -> stereo with an (optionally moving) constant-power pan."""
    pan1 = pan0 if pan1 is None else pan1
    p = np.linspace(pan0, pan1, len(x))
    a = (p + 1) * math.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], 1)


# -- music ----------------------------------------------------------------------------------------------------

def score(dur, sections, bpm=100, intensity=((0, 0.6),), seed=4):
    """Cinematic-electronic bed in stereo. ``sections`` [(t, mode)] with mode major | minor | resolve | off.
    Major: C-G-Am-F, driving; minor: Am-F-Dm-E, darker; resolve: F-G-C. Pad (detuned, wide), sub bass,
    kick on 1/3, offbeat hats, a soft arp in major parts."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    beat = 60 / bpm
    bar = beat * 4
    prog = {"major": [(60, 64, 67), (55, 59, 62), (57, 60, 64), (53, 57, 60)],
            "minor": [(57, 60, 64), (53, 57, 60), (50, 53, 57), (52, 56, 59)],
            "resolve": [(53, 57, 60), (55, 59, 62), (48, 52, 55), (48, 52, 55)]}
    hz = lambda m: 440 * 2 ** ((m - 69) / 12)
    ti, iv = zip(*intensity)
    inten = np.interp(t, ti, iv)
    secs = sorted(sections)

    def mode_at(x):
        m = "major"
        for a, mm in secs:
            if x >= a:
                m = mm
        return m
    L = np.zeros(n)
    Rr = np.zeros(n)
    bass = np.zeros(n)
    arp = np.zeros(n)
    for b in range(int(dur / bar) + 1):
        a, e = int(b * bar * SR), min(n, int((b + 1) * bar * SR))
        if a >= n:
            break
        m = mode_at(b * bar)
        if m == "off":
            continue
        ch = prog[m][b % 4]
        tt = t[a:e] - b * bar
        env = np.minimum(1, tt / 0.5) * np.minimum(1, (bar - tt) / 0.3)
        for k, note in enumerate(ch):
            f = hz(note + 12)
            L[a:e] += np.sin(2 * np.pi * f * 0.997 * tt + k) * env
            Rr[a:e] += np.sin(2 * np.pi * f * 1.003 * tt + k * 2) * env
        bass[a:e] += np.sin(2 * np.pi * hz(ch[0] - 24) * tt) * env
        if m == "major":
            step = beat / 2
            for j in range(8):
                s0 = a + int(j * step * SR)
                s1 = min(e, s0 + int(step * SR))
                if s0 >= e:
                    break
                ttt = np.arange(s1 - s0) / SR
                arp[s0:s1] += np.sin(2 * np.pi * hz(ch[j % 3] + 24) * ttt) * np.exp(-ttt * 9)
    L, Rr = _lp(L, 2200) / 5, _lp(Rr, 2200) / 5
    kick = np.zeros(n)
    hats = np.zeros(n)
    rng = np.random.default_rng(seed)
    for k in range(int(dur / beat) + 1):
        a = int(k * beat * SR)
        if a >= n:
            break
        if mode_at(k * beat) == "off":
            continue
        Lk = min(n - a, int(0.35 * SR))
        tt = np.arange(Lk) / SR
        if k % 2 == 0:
            kick[a:a + Lk] += np.sin(2 * np.pi * np.cumsum(46 + 95 * np.exp(-tt * 32)) / SR) * np.exp(-tt * 9)
        h2 = int((k + 0.5) * beat * SR)
        if h2 < n:
            L2 = min(n - h2, int(0.05 * SR))
            hats[h2:h2 + L2] += rng.normal(0, 1, L2) * np.exp(-np.arange(L2) / SR * 70)
    from scipy.signal import butter, sosfilt
    hats = sosfilt(butter(2, 7500, "highpass", fs=SR, output="sos"), hats)
    drums = (kick * 0.6 + hats * 0.16) * np.clip(inten * 1.4 - 0.25, 0, 1)
    mid = bass * 0.4 + drums + arp * 0.08 * inten
    out = np.stack([L + mid, Rr + mid], 1)
    out *= (0.7 + 0.3 * inten)[:, None]
    out *= (np.minimum(1, t / 0.6) * np.minimum(1, (dur - t) / 0.8))[:, None]
    return out / (np.max(np.abs(out)) + 1e-9)


# -- mix --------------------------------------------------------------------------------------------------------

def process_voice(src, dst):
    """Voice first: high-pass, gentle compression, de-esser, a little studio room (short early reflections)."""
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-af",
                    "highpass=f=75,acompressor=threshold=0.1:ratio=2.5:attack=6:release=110:makeup=1.5,"
                    "deesser=i=0.5,aecho=0.85:0.5:23|37:0.18|0.12", "-ar", str(SR), "-ac", "1", str(dst)], check=True)


def mix(spec, out_wav):
    snd = spec["sound"]
    n = int(spec["duration"] * SR)
    vw = Path(out_wav).with_suffix(".voice.wav")
    process_voice(spec["audio"], vw)
    v = audio.normalize(audio.load(vw))[:n]
    vw.unlink()
    from .pandanews import _active_rms
    vr = _active_rms(v)
    voice = np.zeros((n, 2))
    voice[:len(v)] = place(v, 0.0)
    # music, ducked under the voice by duck_db
    mu = score(spec["duration"], [tuple(x) for x in snd.get("music_sections", [[0, "major"]])], snd.get("bpm", 100),
               tuple(tuple(x) for x in snd.get("intensity", [[0, 0.6]])))[:n]
    mu = mu / (np.sqrt(np.mean(mu ** 2)) + 1e-9) * vr * 10 ** (snd.get("music_rel_db", -18) / 20)
    hop = int(0.04 * SR)
    venv = np.array([np.sqrt(np.mean(v[i:i + hop] ** 2)) if i < len(v) else 0.0 for i in range(0, n, hop)])
    speak = np.clip(venv / (vr + 1e-9) * 2.2, 0, 1)
    speak = np.convolve(speak, np.ones(7) / 7, mode="same")
    duck = 10 ** (snd.get("duck_db", -9) * np.repeat(speak, hop)[:n] / 20)
    music = mu * duck[:, None]
    fx = np.zeros((n, 2))
    gaps = []
    for c in spec["cues"]:
        name, t0 = c["cue"], c["t"]
        if name == "silence_gap":
            gaps.append((t0, c.get("dur", 0.15)))
            continue
        if name in ("room_reverb_on", "music_bed_start", "music_to_minor", "music_resolve"):
            continue                                       # handled by the score / voice chain
        reps = {"vote_click_x5": ("vote_click", 5, 0.16), "warning_ping_x2": ("warning_ping", 2, 0.28),
                "ticker_ticks": ("ticker_tick", 14, None), "heartbeat_pulse_loop": ("heartbeat", int(c.get("dur", 6) / 0.85), 0.85)}
        base, count, step = reps.get(name, (name, 1, 0))
        x = cue_sound(base)
        g = c.get("gain", 1.0) * 10 ** (snd.get("sfx_rel_db", -7) / 20) * vr / (_active_rms(x, top=1) + 1e-9)
        pan = PAN.get(base, (0.0, 0.0))
        tt = t0
        for j in range(count):
            if step is None:                               # accelerating ticks (with the counter)
                tt = t0 + 1.6 * (1 - (1 - j / count) ** 1.8)
            st = place(x * g, *pan)
            a = int(tt * SR)
            if a < n:
                e = min(n, a + len(st))
                fx[a:e] += st[:e - a]
            if step:
                tt += step
    mixed = voice + music + fx
    # silence gaps before big impacts: music and effects dip almost to zero for a breath
    for g0, gd in gaps:
        a, e = int(g0 * SR), int((g0 + gd) * SR)
        if a < n:
            ramp = int(0.03 * SR)
            env = np.ones(n)
            env[a:e] = 0.08
            env[max(0, a - ramp):a] = np.linspace(1, 0.08, a - max(0, a - ramp))
            mixed = voice + (mixed - voice) * env[:, None]
    pk = np.max(np.abs(mixed)) + 1e-9
    if pk > 0.95:
        mixed *= 0.95 / pk
    import soundfile as sf
    sf.write(str(out_wav), mixed, SR)
    lufs, tp = snd.get("lufs", -14.0), snd.get("true_peak", -1.2)
    from .pandanews import master_wav
    master_wav(out_wav, lufs, tp)


# -- config -> studio spec --------------------------------------------------------------------------------------

def build(cfg, work):
    work = Path(work)
    work.mkdir(parents=True, exist_ok=True)
    secs = cfg["sections"]
    text = " ".join(s["text"] for s in secs)
    voice = cfg.get("voice")
    if not voice:
        voice = str(work / "voice.wav")
        if not Path(voice).exists():
            tts(text.replace("...", ",").replace("…", ","), voice)
    wj = work / "words.json"
    if wj.exists():
        words = json.loads(wj.read_text())
    else:
        words = align(text.split(), transcribe(voice, cfg.get("prompt", "")))
        wj.write_text(json.dumps(words, ensure_ascii=False))
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", voice],
                               capture_output=True, text=True).stdout) + cfg.get("tail", 0.5)
    idx, bounds = 0, []
    for s in secs:
        k = len(s["text"].split())
        bounds.append((idx, idx + k))
        idx += k
    shots, campath, slowmo = [], [], []
    starts = [0.0] + [round(words[b[0]]["s"] - 0.12, 3) for b in bounds[1:]]
    for k, (s, (a, b)) in enumerate(zip(secs, bounds)):
        st = starts[k]
        en = dur if k == len(secs) - 1 else starts[k + 1]
        rel = lambda word: next((w["s"] for w in words[a:b] if _norm(w["w"]).startswith(_norm(word))), words[a]["s"]) - st
        cards = []
        for c in s.get("cards", []):
            c = dict(c)
            if "at_word" in c:
                c["at"] = round(max(0.0, rel(c.pop("at_word")) - 0.1), 3)
            if "until_word" in c:
                c["until"] = round(max(0.0, rel(c.pop("until_word")) - 0.35), 3)
            cards.append(c)
        panda = dict(s["panda"]) if s.get("panda") else None
        if panda and "swap_word" in panda:
            sw = panda.pop("swap_word")
            panda["swap"] = [[round(rel(w_) - 0.1, 3)] + list(rest) for w_, *rest in sw]
        shot = dict(start=st, end=en, set=cfg.get("set", "newsroom"), set_args=cfg.get("set_args", []),
                    trans=s.get("trans", "cut"), mood=s.get("mood"), cards=cards, props=s.get("props", []),
                    blur=s.get("blur", 0.0))
        for key in ("dutch", "match_at", "mood_keys"):
            if key in s:
                shot[key] = s[key]
        if panda:
            shot["panda"] = panda
        shots.append(shot)
        for kk in s.get("camera", []):
            kk = dict(kk)
            kk["t"] = round(st + kk["t"] if kk["t"] >= 0 else en + kk["t"], 3)
            campath.append(kk)
        for sm in s.get("slowmo", []):
            slowmo.append([st + sm[0], st + sm[1], sm[2]])
    if cfg.get("loop"):
        # last frame = first frame: append a short tail that returns to the hook framing (match cut in)
        lp = cfg["loop"]
        st = dur
        dur = dur + lp.get("dur", 0.7)
        first = secs[0]
        shots.append(dict(start=round(st, 3), end=round(dur, 3), set=cfg.get("set", "newsroom"),
                          set_args=cfg.get("set_args", []), trans=lp.get("trans", "match"), match_at=[540, 960],
                          mood=first.get("mood"), cards=[], props=lp.get("props", first.get("props", [])), blur=0.0))
        k0 = dict(first["camera"][0])
        campath.append(dict(k0, t=round(st + 0.02, 3)))
        campath.append(dict(k0, t=round(dur, 3)))
    campath.sort(key=lambda x: x["t"])
    # sound cues: from the cue file (absolute script times are rescaled to this voice) + section-local cues
    cues = []
    for s, stt in zip(secs, starts):
        for c in s.get("cues", []):
            c = dict(c)
            c["t"] = round(stt + c["t"], 3)
            cues.append(c)
    snd = dict(cfg.get("sound", {}))
    snd["music_sections"] = [[starts[k], s.get("music", "major")] for k, s in enumerate(secs)]
    snd["intensity"] = [[starts[k], s.get("intensity", 0.6)] for k, s in enumerate(secs)] + [[dur, secs[-1].get("intensity", 0.6)]]
    look = cfg.get("look", {})
    spec = dict(audio=voice, duration=round(dur, 2), words=words, shots=shots, campath=campath, slowmo=slowmo,
                theme="dark", atmos=look.get("atmos", True), beams=look.get("beams", True), film=look.get("film"),
                integrate=look.get("panda_light"), header_style="none", cap_style="lower",
                cap_y=look.get("cap_y", 1470), cap_size=look.get("cap_size", 54), min_head=look.get("min_head", 900),
                cues=cues, sound=snd, mix="cine", shake=0.0, fps=cfg.get("fps", 60))
    return spec


def main(argv=None):
    argv = argv or sys.argv[1:]
    cfg = json.loads(Path(argv[0]).read_text(encoding="utf-8"))
    out = Path(argv[1])
    preview = "--preview" in argv
    if preview:
        cfg["fps"] = 30
    work = out.parent / (out.stem + "_work")
    spec = build(cfg, work)
    (work / "spec.json").write_text(json.dumps(spec, ensure_ascii=False, indent=1))
    from . import studio
    if "--stills" in argv:
        st = studio.Studio(spec)
        for tt in argv[argv.index("--stills") + 1].split(","):
            st.frame(int(float(tt) * studio.FPS)).convert("RGB").save(work / f"still_{tt}.png")
        return
    studio.render(spec, out)


if __name__ == "__main__":
    main()
