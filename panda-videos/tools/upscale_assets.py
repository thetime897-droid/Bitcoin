"""Skaliert die freigestellten Panda-Assets 4x hoch (Lanczos + Schaerfen) fuer 1080x1920-Videos."""
import sys, glob, os
from PIL import Image, ImageFilter

SRC, OUT, F = sys.argv[1], sys.argv[2], 4
for f in glob.glob(f"{SRC}/*/*.png"):
    im = Image.open(f).convert("RGBA")
    big = im.resize((im.width * F, im.height * F), Image.LANCZOS)
    rgb = big.convert("RGB").filter(ImageFilter.UnsharpMask(radius=3, percent=120, threshold=2))
    a = big.getchannel("A").filter(ImageFilter.GaussianBlur(1.2)).point(lambda v: 0 if v < 70 else (255 if v > 185 else int((v - 70) * 255 / 115)))
    rgb.putalpha(a)
    dst = f.replace(SRC, OUT, 1)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    rgb.save(dst)
