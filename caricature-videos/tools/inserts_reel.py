"""Preview reel: lay the rendered inserts (alpha .webm) over a placeholder background at their script times.

    python3 tools/inserts_reel.py out/inserts demo/european_lithium_vorschau.mp4 70 \
        F1_Banner@0+hold U01_Deal_durch@0 C2_Depotwert@3 ...

``@t`` = start second, ``+hold`` = freeze the last frame until the end (fixed overlays like the banner).
"""
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

FONT = Path(__file__).resolve().parent.parent / "toonfin" / "fonts" / "Montserrat.ttf"


def background(path):
    im = Image.new("RGB", (1080, 1920))
    d = ImageDraw.Draw(im)
    for y in range(1920):
        k = y / 1919
        d.line([(0, y), (1080, y)], fill=(int(70 - 30 * k), int(78 - 34 * k), int(96 - 40 * k)))
    d.ellipse((290, 1050, 790, 1550), fill=(96, 104, 124))
    d.rounded_rectangle((190, 1480, 890, 1920), radius=200, fill=(96, 104, 124))
    f = ImageFont.truetype(str(FONT), 54)
    f.set_variation_by_name("Black")
    d.text((540, 1350), "DEIN VIDEO", font=f, fill=(150, 158, 176), anchor="mm")
    im.save(path)


def main(src, out, dur, items):
    src, out = Path(src), Path(out)
    bg = out.with_suffix(".bg.png")
    background(bg)
    cmd = ["ffmpeg", "-y", "-v", "error", "-loop", "1", "-framerate", "60", "-t", str(dur), "-i", str(bg)]
    fc, chain, amix = [], "[0:v]", []
    for i, it in enumerate(items, 1):
        name, rest = it.split("@")
        hold = rest.endswith("+hold")
        t = float(rest.replace("+hold", ""))
        cmd += ["-c:v", "libvpx-vp9", "-i", str(src / f"{name}_alpha.webm")]
        pad = f",tpad=stop_mode=clone:stop_duration={dur}" if hold else ""
        fc.append(f"[{i}:v]format=rgba{pad},setpts=PTS-STARTPTS+{t}/TB[v{i}]")
        fc.append(f"{chain}[v{i}]overlay=eof_action=pass:format=auto[o{i}]")
        chain = f"[o{i}]"
        ms = int(t * 1000)
        fc.append(f"[{i}:a]adelay={ms}|{ms}[a{i}]")
        amix.append(f"[a{i}]")
    fc.append(f"{''.join(amix)}amix=inputs={len(amix)}:normalize=0,apad[aout]")
    fc.append(f"{chain}format=yuv420p[vout]")
    cmd += ["-filter_complex", ";".join(fc), "-map", "[vout]", "-map", "[aout]", "-t", str(dur),
            "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-c:a", "aac", "-b:a", "192k",
            "-movflags", "+faststart", str(out)]
    subprocess.run(cmd, check=True)
    bg.unlink()


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4:])
