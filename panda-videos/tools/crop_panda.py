"""Schneidet das Panda-Referenzblatt (v2, Ganzkoerper) in freigestellte PNG-Assets."""
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage

SRC, OUT = sys.argv[1], sys.argv[2]
sheet = Image.open(SRC).convert("RGB")

def cutout(box, path):
    a = np.asarray(sheet.crop(box)).astype(int)
    mx, mn = a.max(axis=2), a.min(axis=2)
    # Hintergrund/Schatten: hell und unbunt (Fell ist cremig = bunter, bleibt erhalten)
    bgish = (mn > 185) & ((mx - mn) < 14)
    lab, _ = ndimage.label(bgish)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    fg = ~np.isin(lab, list(edge))
    fg = ndimage.binary_opening(fg, iterations=1)
    # kleine Fremdstuecke (Beschriftung, Nachbar-Reste) entfernen, Funken bleiben
    cl, n = ndimage.label(fg)
    sizes = ndimage.sum(fg, cl, range(1, n + 1))
    keep = [i + 1 for i, s in enumerate(sizes) if s >= 40]
    fg = np.isin(cl, keep)
    fg = ndimage.binary_fill_holes(fg)  # Fell-Highlights nicht durchsichtig
    alpha = (fg * 255).astype(np.uint8)
    alpha = np.asarray(Image.fromarray(alpha).filter(__import__("PIL.ImageFilter", fromlist=["x"]).GaussianBlur(0.8)))
    out = Image.fromarray(np.dstack([a.astype(np.uint8), alpha]), "RGBA")
    bb = out.getchannel("A").point(lambda v: 255 if v > 40 else 0).getbbox()
    if bb: out = out.crop(bb)
    os.makedirs(os.path.dirname(f"{OUT}/{path}.png"), exist_ok=True)
    out.save(f"{OUT}/{path}.png")

emo = [("freundlich",(620,55,770,238)),("begeistert",(770,50,930,238)),("nachdenklich",(930,50,1085,238)),("ueberrascht",(1085,50,1240,238)),
       ("cool",(625,270,765,468)),("wuetend",(775,270,925,468)),("traurig",(935,270,1085,468)),("augenzwinkern",(1090,270,1240,468))]
for n,b in emo: cutout(b, f"emotions/{n}")

poses = [("zeigen",(40,534,245,755)),("praesentieren",(250,508,470,755)),("selbstbewusst",(475,508,650,755)),
         ("analysieren",(665,508,855,755)),("tipp_geben",(875,508,1040,755)),("entspannt",(1075,508,1225,755))]
for n,b in poses: cutout(b, f"poses/{n}")

views = [("vorne",(40,830,165,1042)),("seite_rechts",(185,830,305,1042)),("hinten",(310,830,425,1042)),
         ("seite_links",(435,830,550,1042)),("dreiviertel",(560,830,670,1042))]
for n,b in views: cutout(b, f"views/{n}")

outfits = [("mit_laptop",(730,830,880,1042)),("mit_kaffeetasse",(905,830,1035,1042)),("mit_hoodie",(1080,830,1220,1042))]
for n,b in outfits: cutout(b, f"outfits/{n}")

acc = [("laptop",(30,1110,135,1205)),("kaffeetasse",(138,1110,208,1205)),("mikrofon",(212,1110,270,1205)),("tablet",(275,1110,350,1205)),
       ("smartphone",(378,1110,438,1205)),("chart_whiteboard",(452,1110,550,1205)),("rucksack",(552,1110,640,1205)),("brille",(645,1110,740,1205))]
for n,b in acc: cutout(b, f"accessories/{n}")
