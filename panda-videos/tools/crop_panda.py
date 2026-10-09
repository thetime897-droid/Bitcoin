"""Schneidet das Panda-Referenzblatt in einzelne Assets mit transparentem Hintergrund."""
import sys, numpy as np
from PIL import Image
from scipy import ndimage

SRC, OUT = sys.argv[1], sys.argv[2]
sheet = Image.open(SRC).convert("RGB")

def cutout(box, name):
    im = sheet.crop(box)
    a = np.asarray(im).astype(int)
    # Hintergrund = fast weiss, zusammenhaengend mit dem Rand (Flood-Fill), damit weisses Fell bleibt
    near_white = (a.min(axis=2) > 235)
    lab, _ = ndimage.label(near_white)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(edge))
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    alpha = ndimage.binary_opening(alpha > 0, iterations=1).astype(np.uint8) * 255
    rgba = np.dstack([a.astype(np.uint8), alpha])
    out = Image.fromarray(rgba, "RGBA")
    bbox = out.getchannel("A").getbbox()
    if bbox: out = out.crop(bbox)
    out.save(f"{OUT}/{name}.png")

cols = [(770, 915), (925, 1080), (1085, 1235)]
rows = [(60, 200), (228, 372), (398, 548)]
emo = ["freundlich","begeistert","nachdenklich","ueberrascht","cool","augenzwinkern","ernst","traurig","jubelnd"]
for i, n in enumerate(emo):
    r, c = divmod(i, 3)
    cutout((cols[c][0], rows[r][0], cols[c][1], rows[r][1]), f"emotions/{n}")

poses = [("zeigen",(15,620,245,870)),("praesentieren",(245,620,425,870)),("selbstbewusst",(425,620,610,870)),
         ("analysieren",(630,620,865,870)),("tipp_geben",(850,620,1055,870)),("entspannt",(1060,620,1240,870))]
for n, b in poses: cutout(b, f"poses/{n}")

views = [("vorne",(25,965,170,1200)),("seite",(205,965,335,1200)),("hinten",(365,965,510,1200)),("3_4",(550,965,690,1200))]
for n, b in views: cutout(b, f"views/{n}")

cutout((15, 0, 422, 575), "hero_daumen")
