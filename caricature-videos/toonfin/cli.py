import argparse
import json
from pathlib import Path

from . import audio, planner, render, sources


def main(argv=None):
    ap = argparse.ArgumentParser(prog="toonfin", description="Finance caricature videos from voice + transcript")
    sub = ap.add_subparsers(dest="cmd", required=True)

    mk = sub.add_parser("make", help="script or media -> plan -> video")
    src = mk.add_mutually_exclusive_group(required=True)
    src.add_argument("--script", help="text script; a TTS placeholder voice reads it")
    src.add_argument("--media", help="your own video/audio file (voice is kept)")
    mk.add_argument("--srt", help="subtitles for --media instead of auto-transcription")
    mk.add_argument("--format", choices=["short", "long", "both"], default="short")
    mk.add_argument("--lang", default="de")
    mk.add_argument("--out", default="out/video", help="output path prefix")
    mk.add_argument("--pip", action="store_true", help="show the original video as a round picture-in-picture")
    mk.add_argument("--music", default="auto", help="auto | funny | serious | none | path/to/track.mp3")
    mk.add_argument("--model", default="small", help="faster-whisper model size")
    mk.add_argument("--plan-only", action="store_true", help="only write the editable plan JSON")
    mk.add_argument("--ss", type=int, default=2, help="supersampling (1 = fast preview)")
    mk.add_argument("--fps", type=int, default=30)
    mk.add_argument("--workers", type=int, default=None)

    rd = sub.add_parser("render", help="render an (edited) plan JSON")
    rd.add_argument("plan")
    rd.add_argument("--out", default=None)
    rd.add_argument("--ss", type=int, default=2)
    rd.add_argument("--workers", type=int, default=None)
    rd.add_argument("--music-file", default=None)

    a = ap.parse_args(argv)
    if a.cmd == "render":
        plan = json.loads(Path(a.plan).read_text(encoding="utf-8"))
        out = Path(a.out) if a.out else Path(a.plan).with_suffix(".mp4")
        render.render(plan, out, a.ss, a.workers, a.music_file)
        render.write_srt(plan, out.with_suffix(".srt"))
        return

    out = Path(a.out)
    work = out.parent / (out.name + "_work")
    if a.script:
        wav, words, forced = sources.tts_script(a.script, work, a.lang)
    else:
        wav, words, forced = sources.from_media(a.media, work, a.lang, a.srt, a.model)
    music_file = None
    music = a.music
    if a.music not in ("auto", "funny", "serious", "none"):
        music_file, music = a.music, "file"
    fmts = ["short", "long"] if a.format == "both" else [a.format]
    for fmt in fmts:
        # your own media keeps its full length; a TTS script ends shortly after the last word
        dur = len(audio.load(wav)) / audio.SR if a.media else None
        plan = planner.build(words, fmt, a.lang, a.fps, wav.resolve(), dur, forced=forced, music=music)
        if a.pip and a.media:
            plan["pip"] = str(Path(a.media).resolve())
        base = out.parent / f"{out.name}_{fmt}"
        base.parent.mkdir(parents=True, exist_ok=True)
        pj = base.with_suffix(".plan.json")
        pj.write_text(json.dumps(plan, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"plan: {pj}")
        for sc in plan["scenes"]:
            print(f"  {sc['start']:6.2f}-{sc['end']:6.2f}  {sc['template']:<9} {sc['variant']:<6} "
                  f"{sc['headline'][:22]:<22} | {sc['text'][:60]}")
        if a.plan_only:
            continue
        mp4 = base.with_suffix(".mp4")
        render.render(plan, mp4, a.ss, a.workers, music_file)
        render.write_srt(plan, base.with_suffix(".srt"))


if __name__ == "__main__":
    main()
