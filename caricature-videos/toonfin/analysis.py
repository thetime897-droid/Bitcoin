"""Stock-analysis videos from ONE config file: script sections + ticker data + emotions -> finished video.

    python -m toonfin.analysis examples/aktienanalyse_nvda.json out/nvda.mp4 [--stills 1,5,9]

Config (JSON):
  ticker, name, date, chips[], audio (your voice, optional - else a TTS placeholder voice is made),
  music {bpm, rel_db, duck_db}, sections[]: {
     text, emotion (key of tokens.json "emotions"), then (emotion after a short reaction),
     zone (stage | chartwall | table | panel_left | panel_right), camera (push | dolly | orbit | pullback | crane),
     trans (cut | zoom | whip | leak | glitch), mood (up | down | null), intensity (0..1 music),
     cards [ {type, ..., at_word: "Billion"} ]   # a card appears when that word is spoken
  }
Each section becomes one shot; its start/end come from the word timings of the voice.
"""
import json
import math
import re
import subprocess
import sys
from difflib import SequenceMatcher
from pathlib import Path

HERE = Path(__file__).parent
TOK = json.loads((HERE / "tokens.json").read_text())

# camera presets per set zone (dark studio coordinates; the panda stands on the stage at x=0, z=4)
STAGE = (0.0, 4.0)
ZONES = {
    "stage": dict(pos=[0, 1.45, -2.4], target=[0, 2.35, 4.0], fov=48),
    "chartwall": dict(pos=[0, 4.6, 12.0], target=[0, 6.2, 30.0], fov=50),
    "table": dict(pos=[4.2, 2.7, -7.2], target=[7.2, 0.85, -2.8], fov=48),
    "panel_left": dict(pos=[-3.0, 4.2, 4.0], target=[-13.0, 5.0, 16.0], fov=50),
    "panel_right": dict(pos=[3.0, 4.2, 4.0], target=[13.0, 5.0, 16.0], fov=50),
}


def _v(a, b, k):
    return [x + (y - x) * k for x, y in zip(a, b)]


def zone_cam(zone, move):
    """Camera from/to for a zone and a motivated move."""
    z = ZONES[zone]
    p, t, f = z["pos"], z["target"], z["fov"]
    d = [t[i] - p[i] for i in range(3)]
    if move == "push":          # dolly-in on the key statement
        a, b = _v(p, t, -0.18), _v(p, t, 0.16)
        return {"from": {"pos": a, "target": t, "fov": f + 2}, "to": {"pos": b, "target": t, "fov": f - 4}, "ease": "out"}
    if move == "pullback":      # overview
        a, b = _v(p, t, 0.14), _v(p, t, -0.22)
        return {"from": {"pos": a, "target": t, "fov": f - 3}, "to": {"pos": b, "target": t, "fov": f + 3}}
    if move == "orbit":         # slow orbit around the subject
        r = math.hypot(d[0], d[2])
        ang0 = math.atan2(-d[0], -d[2])
        out = []
        for da in (-0.22, 0.22):
            a = ang0 + da
            out.append([t[0] + math.sin(a) * r, p[1], t[2] + math.cos(a) * r])
        return {"from": {"pos": out[0], "target": t, "fov": f}, "to": {"pos": out[1], "target": t, "fov": f}}
    if move == "crane":         # tilt/crane over the set
        a = [p[0], p[1] + 2.5, p[2] - 1.5]
        return {"from": {"pos": a, "target": [t[0], t[1] - 0.6, t[2]], "fov": f + 2},
                "to": {"pos": p, "target": t, "fov": f}}
    # dolly: lateral slide
    a, b = [p[0] - 0.9, p[1], p[2]], [p[0] + 0.9, p[1], p[2]]
    return {"from": {"pos": a, "target": [t[0] - 0.3, t[1], t[2]], "fov": f},
            "to": {"pos": b, "target": [t[0] + 0.3, t[1], t[2]], "fov": f}}


def _norm(w):
    return re.sub(r"[^\wäöüß%+]", "", w.lower())


def tts(text, out_wav, length_scale=0.88):
    """Placeholder voice (Piper, Thorsten) when no own recording is given."""
    model = Path("/tmp/claude-0/piper/de-thorsten-low.onnx")
    raw = Path(out_wav).with_suffix(".raw.wav")
    subprocess.run(["piper", "-m", str(model), "--length_scale", str(length_scale), "--sentence_silence", "0.18", "-f", str(raw)],
                   input=text.encode(), check=True, capture_output=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(raw), "-af",
                    "highpass=f=70,equalizer=f=250:t=q:w=1:g=-1.5,equalizer=f=3200:t=q:w=1.2:g=2,"
                    "acompressor=threshold=0.12:ratio=2.2:attack=6:release=100", "-ar", "44100", "-ac", "1",
                    str(out_wav)], check=True)
    raw.unlink()


def transcribe(wav, prompt=""):
    import numpy as np
    from faster_whisper import WhisperModel
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", str(wav), "-ar", "16000", "-ac", "1", "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    m = WhisperModel("/tmp/claude-0/wm/model", device="cpu", compute_type="int8")
    segs, _ = m.transcribe(np.frombuffer(pcm, np.float32), language="de", word_timestamps=True, beam_size=5,
                           initial_prompt=prompt)
    return [dict(w=x.word.strip(), s=round(x.start, 2), e=round(x.end, 2)) for s in segs for x in s.words]


def align(script_words, heard):
    """Give every script word a time from the recognised words (script spelling wins for the captions)."""
    a = [_norm(w) for w in script_words]
    b = [_norm(x["w"]) for x in heard]
    times = [None] * len(a)
    for blk in SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks():
        for k in range(blk.size):
            times[blk.a + k] = (heard[blk.b + k]["s"], heard[blk.b + k]["e"])
    # fill gaps by interpolation
    known = [i for i, t in enumerate(times) if t]
    for i in range(len(times)):
        if times[i] is None:
            lo = max([k for k in known if k < i], default=None)
            hi = min([k for k in known if k > i], default=None)
            if lo is not None and hi is not None:
                s0, s1 = times[lo][1], times[hi][0]
                f = (i - lo) / (hi - lo)
                st = s0 + (s1 - s0) * f
                times[i] = (st, st + 0.25)
            elif lo is not None:
                times[i] = (times[lo][1] + 0.05 * (i - lo), times[lo][1] + 0.05 * (i - lo) + 0.25)
            else:
                times[i] = (0.0, 0.25)
    return [dict(w=w, s=round(t[0], 2), e=round(t[1], 2)) for w, t in zip(script_words, times)]


def build(cfg, workdir):
    workdir = Path(workdir)
    workdir.mkdir(parents=True, exist_ok=True)
    secs = cfg["sections"]
    text = " ".join(s["text"] for s in secs)
    voice = cfg.get("audio")
    if not voice:
        voice = str(workdir / "voice.wav")
        if not Path(voice).exists():
            tts(text, voice)
    wj = workdir / "words.json"
    if wj.exists():
        words = json.loads(wj.read_text())
    else:
        heard = transcribe(voice, prompt=cfg.get("prompt", cfg.get("name", "")))
        words = align(text.split(), heard)
        wj.write_text(json.dumps(words, ensure_ascii=False))
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", voice],
                               capture_output=True, text=True).stdout) + cfg.get("tail", 0.35)
    # section boundaries from the word index
    idx, bounds = 0, []
    for s in secs:
        n = len(s["text"].split())
        bounds.append((idx, idx + n))
        idx += n
    emo = TOK["emotions"]
    shots, cues, inten = [], [], []
    for k, (s, (a, b)) in enumerate(zip(secs, bounds)):
        start = 0.0 if k == 0 else round(words[a]["s"] - 0.12, 3)
        end = dur if k == len(secs) - 1 else round(words[bounds[k + 1][0]]["s"] - 0.12, 3)
        e = emo[s.get("emotion", "selbstsicher")]
        zone = s.get("zone", "stage")
        move = s.get("camera", e["camera"])
        cam = zone_cam(zone, move)
        panda = None
        if zone == "stage" or s.get("panda_frame"):
            pose, talk = e["pose"], e["talk"]
            panda = dict(pose=pose, talk=talk, gesture=e["motion"], gesture_at=0.05, seed=k * 0.7)
            if zone == "stage" and not s.get("panda_frame"):
                panda["world"] = [STAGE[0], STAGE[1], 2.3]
                panda["y0"] = 0.25
            else:
                panda["frame"] = s["panda_frame"]
            if s.get("then"):
                e2 = emo[s["then"]]
                panda["swap"] = [[s.get("react", 0.85), e2["pose"], e2["talk"], e2["motion"]]]
        cards = []
        for c in s.get("cards", []):
            c = dict(c)
            if "at_word" in c:
                target = _norm(c.pop("at_word"))
                hit = next((w for w in words[a:b] if _norm(w["w"]).startswith(target)), words[a])
                c["at"] = round(max(0.05, hit["s"] - start - 0.12), 3)
            cards.append(c)
        shot = dict(start=start, end=end, set="darkstudio", set_args=[cfg["ticker"], cfg.get("change", "")],
                    cam=cam, trans=s.get("trans", "zoom" if k else "cut"), mood=s.get("mood"), cards=cards,
                    blur=s.get("blur", 1.2 if zone == "stage" else 0.6))
        if panda:
            shot["panda"] = panda
        shots.append(shot)
        if e.get("sfx"):
            cues.append([start + 0.06, e["sfx"], 0.7])
        if k and shot["trans"] != "cut":
            cues.append([start - 0.18, "air" if shot["trans"] in ("zoom", "leak") else "air_short", 0.75])
        if shot["trans"] == "glitch":
            cues.append([start, "click", 0.5])
        inten.append([start, s.get("intensity", 0.5)])
        for c in cards:
            if c["type"] in ("kpi", "logo", "metrics"):
                cues.append([start + c.get("at", 0) + 0.05, "click", 0.4])
    au = TOK["audio"]
    music = dict(cfg.get("music", {}))
    music.setdefault("bpm", au["bpm"])
    music.setdefault("rel_db", au["music_rel_db"])
    music.setdefault("duck_db", au["music_duck_db"])
    music["intensity"] = inten + [[dur, inten[-1][1]]]
    spec = dict(audio=voice, duration=round(dur, 2), words=words, theme="dark", atmos=True, shots=shots,
                cues=cues + [[0.0, "riser2", 0.5]], no_riser=True, music=music, sfx_rel=au["sfx_rel"],
                master_lufs=au["lufs"], cap_y=cfg.get("cap_y", 880), cap_size=40,
                brand=cfg.get("brand", "PANDA_INVESTIERT"), chips=cfg.get("chips", []))
    return spec


def main(argv=None):
    argv = argv or sys.argv[1:]
    cfg = json.loads(Path(argv[0]).read_text(encoding="utf-8"))
    out = Path(argv[1])
    work = out.parent / (out.stem + "_work")
    spec = build(cfg, work)
    (work / "spec.json").write_text(json.dumps(spec, ensure_ascii=False, indent=1))
    from . import studio
    if len(argv) > 2 and argv[2] == "--stills":
        st = studio.Studio(spec)
        for tt in argv[3].split(","):
            st.frame(int(float(tt) * studio.FPS)).save(work / f"still_{tt}.png")
        return
    studio.render(spec, out)


if __name__ == "__main__":
    main()
