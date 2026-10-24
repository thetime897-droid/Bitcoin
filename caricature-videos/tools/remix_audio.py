"""Swap in a new voice mix without re-rendering the picture.

    python3 tools/remix_audio.py plan.json rendered.mp4 out.mp4 [new_voice.wav]

Mixes voice + effects (+ music bed) exactly like ``render`` does, masters it and muxes it onto the
existing video stream (copied, no re-encode).
"""
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from toonfin import audio, pandanews  # noqa: E402


def main(plan_path, video, out, voice=None):
    plan = json.loads(Path(plan_path).read_text(encoding="utf-8"))
    if voice:
        plan["audio"] = voice
    pandanews._register_inserts()
    fps, dur = plan["fps"], plan["duration"]
    n = int(dur * fps + 0.999)
    v = audio.load(plan["audio"])
    env = audio.envelope(v, fps, n)
    wav = Path(out).with_suffix(".mix.wav")
    audio.save(wav, pandanews.mix_audio(v, dur, pandanews.cues(plan), env, fps, sfx_rel=plan.get("sfx_rel"),
                                        music=plan.get("music_bed")))
    if plan.get("master_lufs"):
        pandanews.master_wav(wav, plan["master_lufs"])
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(video), "-i", str(wav), "-map", "0:v", "-map", "1:a",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(out)],
                   check=True)
    wav.unlink()


if __name__ == "__main__":
    main(*sys.argv[1:])
