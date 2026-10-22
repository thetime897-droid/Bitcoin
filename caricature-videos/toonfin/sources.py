"""Where the words come from: a script (TTS voice), or your own audio/video.

All functions return (voice_wav_path, words, forced) where ``words`` is a list
of {"w", "s", "e"} with times in seconds and ``forced`` maps a sentence index
to a scene template chosen with a ``[template]`` tag in the script.
"""
import re
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np

from . import audio

TAG_RE = re.compile(r"^\s*\[(\w+)\]\s*")


def parse_script(text):
    """Lines -> sentences. ``[crash] Text`` forces a scene for that line."""
    sents, forced = [], {}
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        m = TAG_RE.match(line)
        if m:
            forced[len(sents)] = m.group(1).lower()
            sents.append(line[m.end():].strip())
            continue
        parts = re.split(r"(?<=[.!?…])\s+", line)
        sents += [p.strip() for p in parts if p.strip()]
    return sents, forced


def _voice(lang):
    voices = subprocess.run(["espeak-ng", "--voices=" + lang], capture_output=True, text=True).stdout
    prefs = {"de": ["mb-de2", "mb-de1", "de"], "en": ["mb-us1", "mb-en1", "en-us"]}.get(lang, [lang])
    for v in prefs:
        name = v.split("-", 1)[1] if v.startswith("mb-") else None
        if v.startswith("mb-") and (f"mb/{v}" in voices or f"mb-{name}" in voices) and \
                Path(f"/usr/share/mbrola/{name}").exists():
            return v
    return prefs[-1]


def _synth(text, out, lang, voice_model, speed, voice):
    if voice_model:
        # Piper neural TTS, e.g. the CC0 "Thorsten" German voice
        subprocess.run([sys.executable, "-m", "piper", "-m", str(voice_model), "-f", str(out),
                        "--length-scale", f"{168 / speed:.3f}"], input=text, text=True, check=True,
                       capture_output=True)
        return
    spoken = text.replace("€", " Euro").replace("%", " Prozent") if lang == "de" else text
    subprocess.run(["espeak-ng", "-v", voice, "-s", str(speed), "-p", "48", "-w", str(out), spoken],
                   check=True, capture_output=True)


def tts_script(script_path, workdir, lang="de", speed=168, voice_model=None):
    if not voice_model and not shutil.which("espeak-ng"):
        raise SystemExit("Need a voice: --voice model.onnx (Piper) or espeak-ng (apt install espeak-ng mbrola-de2)")
    sents, forced = parse_script(Path(script_path).read_text(encoding="utf-8"))
    workdir = Path(workdir)
    workdir.mkdir(parents=True, exist_ok=True)
    voice = None if voice_model else _voice(lang)
    gap = 0.28
    pieces, words, t = [np.zeros(int(0.25 * audio.SR))], [], 0.25
    for si, s in enumerate(sents):
        tmp = workdir / f"_tts_{si}.wav"
        _synth(s, tmp, lang, voice_model, speed, voice)
        x = audio.load(tmp)
        tmp.unlink()
        nz = np.where(np.abs(x) > 0.02)[0]
        if len(nz):
            x = x[max(0, nz[0] - 400):nz[-1] + 1200]
        d = len(x) / audio.SR
        toks = s.split()
        weights = [len(re.sub(r"\W", "", w)) + 2 for w in toks]
        tot = sum(weights)
        acc = 0.0
        for w, wt in zip(toks, weights):
            ws = t + d * acc / tot
            acc += wt
            words.append(dict(w=w, s=ws, e=t + d * acc / tot - 0.02, sid=si))
        pieces.append(x)
        pieces.append(np.zeros(int(gap * audio.SR)))
        t += d + gap
    wav = workdir / "voice.wav"
    audio.save(wav, np.concatenate(pieces))
    return wav, words, forced


def extract_audio(media, workdir):
    workdir = Path(workdir)
    workdir.mkdir(parents=True, exist_ok=True)
    wav = workdir / "voice.wav"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(media), "-vn", "-ac", "1", "-ar", str(audio.SR),
                    str(wav)], check=True)
    return wav


def srt_words(srt_path):
    def sec(ts):
        h, m, s = ts.replace(",", ".").split(":")
        return int(h) * 3600 + int(m) * 60 + float(s)

    words = []
    blocks = re.split(r"\n\s*\n", Path(srt_path).read_text(encoding="utf-8-sig").strip())
    for b in blocks:
        lines = [l for l in b.strip().splitlines() if l.strip()]
        tl = next((i for i, l in enumerate(lines) if "-->" in l), None)
        if tl is None:
            continue
        a, z = [sec(x.strip().split()[0]) for x in lines[tl].split("-->")]
        toks = " ".join(lines[tl + 1:]).split()
        weights = [len(w) + 2 for w in toks]
        tot = sum(weights) or 1
        acc = 0
        for w, wt in zip(toks, weights):
            s = a + (z - a) * acc / tot
            acc += wt
            words.append(dict(w=re.sub(r"<[^>]+>", "", w), s=s, e=a + (z - a) * acc / tot))
    return words


def whisper_words(wav, lang=None, model="small"):
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        raise SystemExit("Transcription needs faster-whisper (pip install faster-whisper) - or pass --srt subs.srt")
    m = WhisperModel(model, device="auto", compute_type="int8")
    segs, _ = m.transcribe(str(wav), language=lang, word_timestamps=True, vad_filter=True)
    words = []
    for seg in segs:
        for w in seg.words or []:
            words.append(dict(w=w.word.strip(), s=float(w.start), e=float(w.end)))
    return [w for w in words if w["w"]]


def from_media(media, workdir, lang="de", srt=None, model="small"):
    wav = extract_audio(media, workdir)
    words = srt_words(srt) if srt else whisper_words(wav, lang, model)
    if not words:
        raise SystemExit("No words found in the transcript.")
    return wav, words, {}
