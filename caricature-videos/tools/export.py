import sys, os, numpy as np
from PIL import Image
from scipy import ndimage
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hd_panda import upscale

SEG = sys.argv[2] if len(sys.argv) > 2 else 'seg'
OUT = sys.argv[1]
FULL = {
 'daumen_hoch': 'D_04', 'arme_verschraenkt': 'D_05', 'winken': 'D_06', 'zeigefinger': 'D_07',
 'laptop_halten': 'D_12', 'telefon_am_ohr': 'D_13', 'hand_huefte': 'D_14', 'ok_zeichen': 'D_15',
 'laufen': 'D_20', 'springen': 'D_21', 'zeigt_auf_box': 'D_23', 'mit_tablet': 'D_33', 'mit_bitcoin': 'D_35',
 'chart_praesentieren': 'A_32', 'telefonieren': 'A_31', 'kaffee': 'A_35', 'reisen': 'A_45', 'idee': 'A_58',
 'notizen': 'A_59', 'mit_geld': 'A_74', 'smartphone': 'A_75', 'aktenkoffer': 'A_82', 'stark': 'A_43',
 'stolz': 'D_17', 'lesen': 'A_57',
}
HALF = {
 'jubel': 'A_14', 'schockiert': 'A_15', 'heulen': 'A_16', 'lachen_traenen': 'A_17', 'ueberrascht': 'A_00',
 'verliebt': 'A_01', 'genervt': 'A_26', 'verwirrt': 'A_25', 'aufgeregt': 'A_13', 'daumen_runter': 'A_06',
 'grinsen': 'A_29', 'verlegen': 'A_02', 'wuetend': 'D_08', 'traurig': 'D_09', 'lachend': 'D_19',
 'gruebeln': 'D_02', 'schockiert2': 'D_11', 'muede': 'D_16', 'peace': 'A_09', 'ok': 'A_07',
}

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

os.makedirs('src_cut/full', exist_ok=True)
os.makedirs('src_cut/react', exist_ok=True)
for group, table in (('full', FULL), ('react', HALF)):
    for name, key in table.items():
        p = f'src_cut/{group}/{name}.png'
        clean(f'{SEG}/{key}.png').save(p)
        upscale(p, f'{OUT}/{group}/{name}.png', 6)
        print(group, name, Image.open(f'{OUT}/{group}/{name}.png').size)
