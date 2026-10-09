import sys
from PIL import Image
fs = sys.argv[2:]; out = sys.argv[1]
tw, th = 540, 960; cols = 4; rows = (len(fs) + cols - 1) // cols
s = Image.new('RGB', (cols * tw, rows * th), (0, 0, 0))
for i, f in enumerate(fs):
    im = Image.open(f).resize((tw, th)); s.paste(im, ((i % cols) * tw, (i // cols) * th))
s.save(out, quality=88)
