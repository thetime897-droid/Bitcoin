"""Cut + clean + Real-ESRGAN (numpy) the chosen poses into high-quality PNGs."""
import os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from esrgan_np import load_pth, upscale_rgb
from scipy import ndimage


def clean(path):
    im = Image.open(path).convert('RGBA')
    a = np.asarray(im)
    fg = a[:, :, 3] > 40
    lab, n = ndimage.label(fg)
    if n > 1:
        sizes = ndimage.sum(fg, lab, range(1, n + 1))
        big = sizes.max()
        objs = ndimage.find_objects(lab)
        H = fg.shape[0]
        keep = np.zeros_like(fg)
        for i, sl in enumerate(objs):
            # drop leftover label letters: small pieces sitting in the bottom part of the crop
            if sizes[i] < big * 0.03 and sl[0].start > H * 0.72:
                continue
            keep |= lab == i + 1
        a = a.copy(); a[:, :, 3] = np.where(keep, a[:, :, 3], 0)
    im = Image.fromarray(a, 'RGBA')
    bb = im.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
    return im.crop(bb) if bb else im


SEG = os.environ.get('SEG_DIR', 'seg')
OUT = sys.argv[1]
JOBS = [
 # big sources (~180-250 px): one 4x pass
 ('B_09', 'zeigen', 1), ('B_10', 'zeigestock', 1), ('B_11', 'selbstbewusst', 1), ('B_12', 'laptop', 1),
 ('B_13', 'tipp_geben', 1), ('B_14', 'entspannt', 1), ('C_10', 'zeigen_tablet', 1), ('C_11', 'mikrofon', 1),
 ('C_12', 'arme_verschraenkt', 1), ('C_15', 'kaffee', 1), ('B_01', 'winken', 1), ('B_02', 'begeistert', 1),
 ('B_03', 'nachdenklich', 1), ('B_04', 'ueberrascht', 1), ('B_05', 'cool', 1), ('B_06', 'wuetend', 1),
 ('B_07', 'traurig', 1), ('B_08', 'augenzwinkern', 1), ('B_17', 'hoodie_daumen', 1), ('HERO_daumen', 'daumen_hoch_gross', 1),
 # small sources (~100-140 px): two passes, then scaled down
 ('D_35', 'mit_bitcoin', 2), ('A_74', 'mit_geld', 2), ('D_04', 'daumen_hoch', 2), ('D_21', 'springen', 2),
 ('A_58', 'idee', 2), ('D_13', 'telefon', 2),
]
only = sys.argv[2].split(',') if len(sys.argv) > 2 else None
def keep_largest(im):
    """Keep only the figure (largest blob plus pieces touching it), drop stray section headers."""
    a = np.asarray(im).copy()
    fg = a[:, :, 3] > 40
    lab, n = ndimage.label(ndimage.binary_dilation(fg, iterations=2))
    if n > 1:
        sizes = ndimage.sum(fg, lab, range(1, n + 1))
        big = int(np.argmax(sizes)) + 1
        objs = ndimage.find_objects(lab)
        bsl = objs[big - 1]
        keep = lab == big
        for i, sl in enumerate(objs):
            # small accents (sparks, "!") near the head stay; wide flat blocks (headers) go
            h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
            if i + 1 != big and sizes[i] < sizes[big - 1] * 0.05 and w < 3 * h and sl[0].start > bsl[0].start - 40:
                keep |= lab == i + 1
        a[:, :, 3] = np.where(keep, a[:, :, 3], 0)
    im = Image.fromarray(a, 'RGBA')
    return im.crop(im.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox())


P = load_pth(os.environ.get('ESRGAN_WEIGHTS', 'RealESRGAN_x4plus_anime_6B.pth'))
os.makedirs(OUT, exist_ok=True)
for key, name, passes in JOBS:
    if only and name not in only:
        continue
    if os.path.exists(f'{OUT}/{name}.png'):
        continue
    im = clean(f'{SEG}/{key}.png')
    im = keep_largest(im)
    a = im.getchannel('A')
    flat = Image.new('RGB', im.size, (255, 255, 255)); flat.paste(im, mask=a)
    rgb = np.asarray(flat)
    for _ in range(passes):
        rgb = upscale_rgb(rgb, P)
    big = Image.fromarray(rgb)
    A = a.resize(big.size, Image.LANCZOS)
    A = Image.fromarray(np.clip((np.asarray(A).astype(np.float32) - 100) * 255 / 60, 0, 255).astype(np.uint8))
    from PIL import ImageFilter
    A = A.filter(ImageFilter.GaussianBlur(big.width / im.width * 0.35))
    res = big.convert('RGBA'); res.putalpha(A)
    if res.height > 1500:
        res = res.resize((int(res.width * 1500 / res.height), 1500), Image.LANCZOS)
    res.save(f'{OUT}/{name}.png')
    print(name, res.size, flush=True)
