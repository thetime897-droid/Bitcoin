"""Find every figure on a character sheet, cut it out with transparency, write an indexed contact sheet."""
import sys, os, numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

src, out, tag = sys.argv[1], sys.argv[2], sys.argv[3]
sheet = Image.open(src).convert("RGB")
a = np.asarray(sheet).astype(int)
mx, mn = a.max(axis=2), a.min(axis=2)
bg = (mn > 200) & ((mx - mn) < 16)
fg = ~bg
fg = ndimage.binary_opening(fg, iterations=1)
lab, n = ndimage.label(ndimage.binary_dilation(fg, iterations=3))
objs = ndimage.find_objects(lab)
os.makedirs(out, exist_ok=True)
boxes = []
for i, sl in enumerate(objs):
    h = sl[0].stop - sl[0].start; w = sl[1].stop - sl[1].start
    if h < 90 or w < 50 or h > 700:
        continue
    reg = fg[sl] & (lab[sl] == i + 1)
    fill = reg.mean()
    dark = (mx[sl] < 60)[reg].mean()
    if dark > 0.85:  # section header bars
        continue
    boxes.append((sl[1].start, sl[0].start, sl[1].stop, sl[0].stop))
boxes.sort(key=lambda b: (b[1] // 60, b[0]))
thumbs = []
for k, (x0, y0, x1, y1) in enumerate(boxes):
    pad = 4
    box = (max(0, x0 - pad), max(0, y0 - pad), min(sheet.width, x1 + pad), min(sheet.height, y1 + pad))
    c = np.asarray(sheet.crop(box)).astype(int)
    cmx, cmn = c.max(axis=2), c.min(axis=2)
    bgish = (cmn > 185) & ((cmx - cmn) < 14)
    l2, _ = ndimage.label(bgish)
    edge = set(np.unique(np.concatenate([l2[0], l2[-1], l2[:, 0], l2[:, -1]]))) - {0}
    f2 = ~np.isin(l2, list(edge))
    f2 = ndimage.binary_opening(f2, iterations=1)
    cl, m = ndimage.label(f2)
    if m == 0:
        continue
    sizes = ndimage.sum(f2, cl, range(1, m + 1))
    f2 = np.isin(cl, [j + 1 for j, s in enumerate(sizes) if s >= 40])
    f2 = ndimage.binary_fill_holes(f2)
    alpha = Image.fromarray((f2 * 255).astype(np.uint8))
    im = Image.fromarray(np.dstack([c.astype(np.uint8), np.asarray(alpha)]), "RGBA")
    bb = im.getchannel("A").getbbox()
    if bb: im = im.crop(bb)
    name = f"{tag}_{k:02d}"
    im.save(f"{out}/{name}.png")
    thumbs.append((name, im))
cols = 10; tw, th = 130, 170
cs = Image.new("RGB", (cols * tw, ((len(thumbs) + cols - 1) // cols) * th), "white")
d = ImageDraw.Draw(cs)
for j, (name, im) in enumerate(thumbs):
    s = min((tw - 6) / im.width, (th - 26) / im.height)
    t = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))))
    x, y = (j % cols) * tw, (j // cols) * th
    cs.paste(t, (x + 3, y + 3), t)
    d.text((x + 4, y + th - 20), name, fill=(200, 0, 0))
cs.save(f"{out}/_{tag}_contact.png")
print(len(thumbs))
