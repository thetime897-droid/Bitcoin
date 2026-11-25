"""Talking mouth for the Panda poses.

The drawn mouth of each pose is removed first (its ink and tongue pixels are found automatically
around a hand-measured mouth position and painted over with the surrounding fur colour), then one
consistent mouth is drawn in five openings. So there is never a second mouth underneath, and every
pose talks with the same shapes.
"""
import math
from functools import lru_cache
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

HERE = Path(__file__).parent

# mouth centre (x, y) and width in the native pose images, measured by hand
MOUTH = {"mikrofon": (352, 380, 70), "zeigen": (322, 308, 55), "tipp_geben": (270, 322, 60),
         "selbstbewusst": (292, 316, 70), "nachdenklich": (290, 280, 55), "cool": (253, 294, 60),
         "wuetend": (246, 320, 55), "augenzwinkern": (251, 303, 55), "arme_verschraenkt": (393, 390, 60),
         "zeigestock": (293, 314, 45), "hoodie_daumen": (292, 285, 72), "kaffee": (350, 368, 80),
         "laptop": (365, 322, 58), "winken": (277, 312, 70), "entspannt": (295, 308, 60),
         "zeigen_tablet": (415, 372, 60)}
STATES = 5  # 0 closed .. 4 wide open


def _ink_mask(a):
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    lum = (r + g + b) / 3
    dark = lum < 150
    red = (r > 150) & (r - g > 55) & (r - b > 55)          # tongue / mouth interior
    return (dark | red) & (a[..., 3] > 128)


# erase ellipse per pose (centre dx/dy and radii as multiples of the mouth width); default fits most poses
ERASE = {"hoodie_daumen": (-0.05, 0.1, 1.0, 0.45), "cool": (0, 0.12, 1.05, 0.5), "selbstbewusst": (0, 0.12, 1.05, 0.5),
         "zeigestock": (0.22, 0.2, 1.5, 0.72), "tipp_geben": (0, 0.15, 1.3, 0.6), "kaffee": (0, 0.1, 1.0, 0.5),
         "arme_verschraenkt": (0.15, 0.1, 1.5, 0.55), "zeigen": (0.05, 0.15, 1.35, 0.6),
         "winken": (0, 0.15, 1.15, 0.6), "augenzwinkern": (0.05, 0.12, 1.25, 0.55),
         "zeigen_tablet": (-0.05, 0.12, 1.45, 0.6), "mikrofon": (0, 0.15, 1.2, 0.6)}


@lru_cache(maxsize=None)
def clean_face(pose):
    """Pose image with its drawn mouth painted out, plus the x of the nose-to-mouth line."""
    im = Image.open(HERE / "panda" / f"{pose}.png").convert("RGBA")
    a = np.asarray(im).copy()
    x, y, w = MOUTH[pose]
    dx, dy, rx, ry = ERASE.get(pose, (0, 0.15, 1.1, 0.55))
    cx, cy, rx, ry = x + dx * w, y + dy * w, rx * w, ry * w
    H_, W_ = a.shape[:2]
    yy, xx = np.mgrid[0:H_, 0:W_]
    ell = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1
    allink = _ink_mask(a)
    big = ((xx - cx) / (rx * 1.35)) ** 2 + ((yy - cy) / (ry * 1.35)) ** 2 <= 1
    # everything inked inside the ellipse goes, except long strokes that continue far outside it
    # (face outline, glasses, suit, hands, microphone)
    lab, n = ndimage.label(allink & big, structure=np.ones((3, 3)))
    ink = np.zeros_like(ell)
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        ys, xs = sl
        if (xs.stop - xs.start) > 2.6 * w or (ys.stop - ys.start) > 2.0 * w:
            continue
        ink[sl] |= (lab[sl] == i) & ell[sl]
    # nose: the biggest dark blob just above the mouth, near the mouth centre
    near = allink & (yy < y - 0.1 * w) & (yy > y - 1.3 * w) & (np.abs(xx - x) < 0.6 * w)
    lab, n = ndimage.label(near)
    nose, best = None, 0
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        ys, xs = sl
        if (xs.stop - xs.start) > 1.3 * w or xs.start == 0 or ys.start == 0:
            continue
        area = int((lab[sl] == i).sum())
        if area > best:
            best, nose = area, (lab == i)
    if nose is not None:
        ink &= ~ndimage.binary_dilation(nose, iterations=2)
        nys, nxs = np.nonzero(nose)
        bottom = nys > nys.max() - max(3, w * 0.06)
        px, nose_bottom = int(np.median(nxs[bottom])), int(nys.max())
    else:
        px, nose_bottom = x, int(y - 0.3 * w)
    mask = ndimage.binary_dilation(ink, iterations=max(3, int(w / 14)))
    rgb = cv2.inpaint(np.ascontiguousarray(a[..., :3][..., ::-1]), mask.astype(np.uint8) * 255, 7,
                      cv2.INPAINT_TELEA)[..., ::-1]
    a[..., :3] = rgb
    return Image.fromarray(a, "RGBA"), (px, nose_bottom)


def _mouth_layer(size, x, y, w, nose, k, S=4):
    """One mouth (opening k in 0..1) on a transparent layer the size of a local crop."""
    lay = Image.new("RGBA", (size[0] * S, size[1] * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    lw = max(3.0, w / 13)
    ink = (26, 22, 26, 255)
    ow = w * (0.9 - 0.14 * k)            # a talking mouth is a little narrower than the resting smile
    sag = w * (0.16 - 0.05 * k)

    def top(u):                           # smile line: corners up, middle down
        return y - sag + sag * 1.0 * (1 - (2 * u - 1) ** 2)

    P = [((x - ow / 2 + ow * i / 16) * S, top(i / 16) * S) for i in range(17)]
    if k > 0.02:
        depth = w * (0.12 + 0.62 * k)
        B = []
        for i in range(1, 24):
            ang = math.pi * i / 24
            B.append(((x + ow / 2 * math.cos(ang)) * S, (y - sag * 0.2 + depth * math.sin(ang)) * S))
        poly = P + B
        mask = Image.new("L", lay.size, 0)
        ImageDraw.Draw(mask).polygon(poly, fill=255)
        d.polygon(poly, fill=(104, 26, 34, 255))
        tongue = Image.new("RGBA", lay.size, (0, 0, 0, 0))
        ImageDraw.Draw(tongue).ellipse([(x - ow * 0.32) * S, (y + depth * 0.45) * S, (x + ow * 0.32) * S,
                                        (y + depth * 1.3) * S], fill=(240, 104, 84, 255))
        tongue.putalpha(Image.fromarray(np.minimum(np.asarray(tongue.getchannel("A")), np.asarray(mask))))
        lay.alpha_composite(tongue)
        d = ImageDraw.Draw(lay)
        d.line(poly + [poly[0]], fill=ink, width=int(lw * S), joint="curve")
    else:
        d.line(P, fill=ink, width=int(lw * S), joint="curve")
        r = lw * S / 2
        for qx, qy in (P[0], P[-1]):
            d.ellipse([qx - r, qy - r, qx + r, qy + r], fill=ink)
    # nose-to-mouth line down to the middle of the lip
    px, ny = nose
    if top(0.5) - ny > lw:
        d.line([(px * S, (ny - 1) * S), (px * S, top(0.5) * S)], fill=ink, width=int(lw * S))
    return lay.resize(size, Image.LANCZOS)


@lru_cache(maxsize=None)
def talking(pose, state):
    """Native-size pose image with mouth opening ``state`` (0..STATES-1)."""
    base, (px, ny) = clean_face(pose)
    _, y, w = MOUTH[pose]
    x = px
    im = base.copy()
    bx0, by0 = int(x - 1.2 * w), int(y - 0.6 * w)
    bw, bh = int(2.4 * w), int(1.8 * w)
    lay = _mouth_layer((bw, bh), x - bx0, y - by0, w, (px - bx0, ny - by0), state / (STATES - 1))
    im.alpha_composite(lay, (bx0, by0))
    return im


def mouth_track(voice, sr, n, fps, hold=4):
    """Mouth state per video frame from the voice loudness, held for ``hold`` frames (lip-flap on
    'fours' like drawn animation - no flicker), closed in pauses."""
    hop = sr / fps
    db = np.full(n, -90.0)
    for i in range(n):
        a = voice[int(i * hop): int((i + 1) * hop)]
        if len(a):
            db[i] = 20 * math.log10(math.sqrt(float(np.mean(a * a))) + 1e-6)
    peak = np.percentile(db, 97)
    k = np.clip((db - (peak - 27)) / 21, 0, 1)
    out = np.zeros(n, int)
    prev = 0
    for i in range(0, n, hold):
        v = float(np.max(k[i:i + hold]) * 0.6 + np.mean(k[i:i + hold]) * 0.4)
        s = int(round(v * (STATES - 1)))
        if s == prev and 0 < s < STATES - 1:        # keep the lips moving while speaking
            s += 1 if (i // hold) % 2 else -1
        out[i:i + hold] = s
        prev = s
    return out


@lru_cache(maxsize=None)
def eye_regions(pose):
    """The two eye whites of a pose (masks), found automatically: the two largest near-white blobs in the upper head,
    side by side. Used for blinking."""
    im = np.asarray(Image.open(HERE / "panda" / f"{pose}.png").convert("RGBA"))
    h, w = im.shape[:2]
    _, my, mw = MOUTH.get(pose, (0, int(h * 0.3), 60))
    white = (im[..., :3].min(2) > 222) & (im[..., 3] > 200)
    white[int(my - 0.1 * mw):] = False
    white[:int(my - 3.5 * mw)] = False
    lab, n = ndimage.label(white)
    comps = []
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        area = int((lab[sl] == i).sum())
        ys, xs = sl
        hh, ww = ys.stop - ys.start, xs.stop - xs.start
        if area < (0.2 * mw) ** 2 or area > (1.6 * mw) ** 2 or hh > 2.4 * ww or ww > 2.6 * hh:
            continue
        comp = np.zeros((h, w), bool)
        comp[sl] = lab[sl] == i
        ring = ndimage.binary_dilation(comp, iterations=max(4, int(mw / 10))) & ~comp
        lum = im[..., :3].mean(2)
        if ring.sum() == 0 or (lum[ring] < 110).mean() < 0.55:
            continue                                  # an eye white sits inside the dark eye patch / iris
        box = lum[sl]
        if (box < 90).mean() < 0.08:
            continue                                  # ... and holds a dark pupil
        comps.append((area, i, sl))
    comps.sort(reverse=True)
    best = None
    for a in range(len(comps)):
        for b in range(a + 1, len(comps)):
            sa, sb = comps[a][2], comps[b][2]
            ca = ((sa[0].start + sa[0].stop) / 2, (sa[1].start + sa[1].stop) / 2)
            cb = ((sb[0].start + sb[0].stop) / 2, (sb[1].start + sb[1].stop) / 2)
            if abs(ca[0] - cb[0]) < 0.9 * mw and abs(ca[1] - cb[1]) > 0.9 * mw:
                best = (comps[a], comps[b])
                break
        if best:
            break
    if not best:
        return []
    out = []
    for _, i, sl in best:
        m = np.zeros((h, w), bool)
        m[sl] = lab[sl] == i
        out.append(m)
    return out


def blink(im, pose, k=1.0):
    """Close the eyes (k=1) by covering the eye whites + pupils with face colour and drawing a lid line."""
    eyes = eye_regions(pose)
    if not eyes or k <= 0:
        return im
    a = np.asarray(im).copy()
    for m in eyes:
        ys, xs = np.nonzero(m)
        y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
        cy = (y0 + y1) / 2
        ry, rx = (y1 - y0) / 2 * 1.08, (x1 - x0) / 2 * 1.08
        yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
        ell = ((yy - cy) / ry) ** 2 + ((xx - (x0 + x1) / 2) / rx) ** 2 <= 1
        top = yy < y0 + (y1 - y0) * k * 1.04
        cover = ell & top
        ring = ndimage.binary_dilation(ell, iterations=6) & ~ndimage.binary_dilation(ell, iterations=2)
        dark = ring & (a[..., :3].max(2) < 90)
        patch = np.median(a[dark][:, :3], axis=0) if dark.any() else np.array([22, 20, 24])
        a[cover, :3] = patch                          # the lid takes the colour of the dark eye patch
        lid = Image.fromarray(a)
        d = ImageDraw.Draw(lid)
        ly = y0 + (y1 - y0) * min(1.0, k) * 0.95
        d.arc([x0 + rx * 0.15, ly - ry * 0.75, x1 - rx * 0.15, ly + ry * 0.25], 15, 165, fill=(214, 216, 222, 255),
              width=max(3, int(rx / 6)))
        a = np.asarray(lid).copy()
    return Image.fromarray(a, "RGBA")
