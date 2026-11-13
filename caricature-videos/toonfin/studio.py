"""Studio style: bright 3D sets with camera moves, the talking Panda in changing shot sizes,
glassy info cards that spin in, fast cuts with zoom/whip transitions and lots of whooshes.

Spec (JSON or dict): {"audio", "duration", "words", "header", "shots": [
    {"start", "end", "set": "hq|avenue|boardroom|office|studio", "cam": {"from": {pos, target, fov}, "to": {...}},
     "blur": px, "trans": "zoom|whip|cut", "panda": {"pose", "frame": "wide|medium|close|...", "x", "talk",
     "swap": [[t, pose]], "enter": "pop|slide"}, "cards": [{"type", "at", ...}]}]}
Times inside a shot are local (seconds from the shot start).
"""
import json
import math
import multiprocessing as mp
import subprocess
import sys
import time
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from . import audio, scene3d
from .anim import clamp, lerp, seg, ease_out, ease_in_out, ease_out_back
from .ink import Ink, affine, font, mix, WHITE

HERE = Path(__file__).parent
W, H, FPS = 1080, 1920, 60
DARK = (22, 24, 32)
TXT2 = (110, 114, 126)
GREEN = (40, 176, 92)
RED = (228, 56, 66)
BLUE = (52, 120, 246)
GOLD = (255, 196, 0)
YELLOW = (255, 214, 0)

# mouth line centre (x, y) and width in the native pose images (measured by hand)
MOUTH = {"mikrofon": (352, 380, 70), "zeigen": (322, 308, 55), "tipp_geben": (270, 322, 60),
         "selbstbewusst": (292, 316, 70), "nachdenklich": (290, 280, 55), "cool": (253, 294, 60),
         "wuetend": (246, 320, 55), "augenzwinkern": (251, 303, 55), "arme_verschraenkt": (393, 390, 60),
         "zeigestock": (293, 314, 45)}

# shot sizes: centre x, feet y and height of the panda
FRAMES = {"wide": (540, 1600, 560), "medium": (540, 1880, 1060), "close": (560, 2380, 1560),
          "wide_left": (300, 1620, 600), "wide_right": (790, 1620, 600), "medium_left": (330, 1900, 1080),
          "medium_right": (760, 1900, 1080)}


def smooth(k):
    return 1 - (1 - clamp(k)) ** 4


# -- talking panda ------------------------------------------------------------------------

def _draw_mouth(im, pose, k):
    x, y, w = MOUTH[pose]
    ow = w * (0.72 + 0.28 * k)
    depth = w * (0.18 + 0.62 * k)
    pts = []
    for i in range(13):                      # top lip line: a gentle smile
        u = i / 12
        pts.append((x - ow / 2 + ow * u, y - 1 + math.sin(math.pi * u) * ow * 0.06))
    for i in range(1, 24):                   # rounded bottom
        a = math.pi * i / 24
        pts.append((x + ow / 2 * math.cos(a), y + 2 + depth * math.sin(a)))
    S = 4
    lay = Image.new("RGBA", (im.width * S, im.height * S), (0, 0, 0, 0))
    mask = Image.new("L", lay.size, 0)
    P = [(px * S, py * S) for px, py in pts]
    ImageDraw.Draw(mask).polygon(P, fill=255)
    d = ImageDraw.Draw(lay)
    d.polygon(P, fill=(92, 26, 34, 255))
    tongue = Image.new("RGBA", lay.size, (0, 0, 0, 0))
    ImageDraw.Draw(tongue).ellipse([(x - ow * 0.3) * S, (y + depth * 0.52) * S, (x + ow * 0.3) * S,
                                    (y + depth * 1.25) * S], fill=(238, 112, 118, 255))
    tongue.putalpha(Image.fromarray(np.minimum(np.asarray(tongue.getchannel("A")), np.asarray(mask))))
    lay.alpha_composite(tongue)
    d.line(P + [P[0]], fill=(24, 20, 24, 255), width=int(max(2, w / 16) * S), joint="curve")
    lay = lay.resize(im.size, Image.LANCZOS)
    im.alpha_composite(lay)


@lru_cache(maxsize=600)
def panda_sprite(pose, h, kq, flip=False):
    im = Image.open(HERE / "panda" / f"{pose}.png").convert("RGBA")
    if kq > 0 and pose in MOUTH:
        _draw_mouth(im, pose, kq / 4)
    im = im.resize((max(1, int(im.width * h / im.height)), int(h)), Image.LANCZOS)
    if h > 900:
        im = im.filter(ImageFilter.UnsharpMask(2, 60, 2))
    if flip:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    return im


@lru_cache(maxsize=8)
def shadow_sprite(w):
    im = Image.new("RGBA", (int(w * 1.6), int(w * 0.5)), (0, 0, 0, 0))
    ImageDraw.Draw(im).ellipse([w * 0.3, w * 0.15, w * 1.3, w * 0.35], fill=(40, 44, 60, 70))
    return im.filter(ImageFilter.GaussianBlur(w * 0.06))


def mouth_track(voice, n):
    """Mouth opening 0..4 per video frame from the voice loudness (snappy open, softer close)."""
    hop = audio.SR / FPS
    out = np.zeros(n)
    for i in range(n):
        a = voice[int(i * hop): int((i + 1) * hop + hop * 0.5)]
        out[i] = 20 * math.log10(math.sqrt(float(np.mean(a * a))) + 1e-6) if len(a) else -90
    peak = np.percentile(out, 97)
    k = np.clip((out - (peak - 26)) / 22, 0, 1)
    sm = np.zeros(n)
    for i in range(n):
        prev = sm[i - 1] if i else 0
        sm[i] = k[i] if k[i] > prev else prev * 0.55 + k[i] * 0.45
    return np.round(sm * 4).astype(int)


# -- glass cards ----------------------------------------------------------------------------

@lru_cache(maxsize=64)
def glass_base(w, h, glow=("pink", "blue")):
    pad = 140
    im = Image.new("RGBA", (w + 2 * pad, h + 2 * pad), (0, 0, 0, 0))
    cols = {"pink": (255, 150, 190), "blue": (120, 170, 255), "mint": (120, 230, 190), "gold": (255, 210, 120),
            "red": (255, 120, 120), "green": (130, 220, 140)}
    g = Image.new("RGBA", im.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(g)
    spots = [(pad + w * 0.15, pad + h * 0.75), (pad + w * 0.85, pad + h * 0.3), (pad + w * 0.55, pad + h * 1.0)]
    for (cx, cy), c in zip(spots, glow):
        r = min(w, h) * 0.55
        gd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=cols.get(c, c) + (120,))
    g = g.filter(ImageFilter.GaussianBlur(60))
    im.alpha_composite(g)
    sh = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle([pad + 8, pad + 26, pad + w - 8, pad + h + 18], 36, fill=(30, 36, 60, 46))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(26)))
    panel = Image.new("RGBA", im.size, (0, 0, 0, 0))
    pd = ImageDraw.Draw(panel)
    pd.rounded_rectangle([pad, pad, pad + w, pad + h], 34, fill=(255, 255, 255, 228), outline=(255, 255, 255, 255),
                         width=3)
    im.alpha_composite(panel)
    return im, pad


def T(ink, x, y, s, size, fill=DARK, key="mont", anchor="mm"):
    ink.text(x, y, s, size, key, fill=fill, stroke=None, anchor=anchor)


def fit(ink, s, size, maxw, key="mont"):
    return min(size, size * maxw / max(1.0, ink.text_w(s, size, key)))


def pill(ink, x, y, s, size, bg, fg=WHITE):
    w = ink.text_w(s, size, "mont") + size * 1.1
    h = size * 1.6
    ink.rect(x - w / 2, y - h / 2, x + w / 2, y + h / 2, fill=bg, outline=None, wob=0, r=h / 2)
    T(ink, x, y + size * 0.04, s, size, fg)


def de(v, dec=0):
    return f"{v:,.{dec}f}".replace(",", "X").replace(".", ",").replace("X", ".")


def icon3d(ink, kind, s=1.0, t=0.0):
    """Glossy emoji-like icons drawn with simple gradients."""
    with ink.at(0, 0, 0, s):
        if kind == "money":
            for i in range(5):
                y = 40 - i * 22
                ink.rect(-90, y - 16, 90, y + 16, fill=(120, 196, 110), outline=(60, 140, 70), w=5, wob=0, r=6)
                ink.rect(-90, y - 16, -40, y + 16, fill=(150, 214, 140), outline=None, wob=0, r=6)
            ink.circle(0, -48, 26, fill=(255, 210, 60), outline=(200, 150, 0), w=5, wob=0)
            T(ink, 0, -46, "$", 32, (160, 110, 0))
        elif kind == "news":
            ink.rect(-80, -95, 80, 95, fill=WHITE, outline=(40, 42, 50), w=6, wob=0, r=10)
            ink.rect(-62, -76, 62, -46, fill=(40, 42, 50), outline=None, wob=0, r=4)
            for j in range(5):
                ink.rect(-62, -28 + j * 24, 62 - (j % 2) * 30, -18 + j * 24, fill=(200, 203, 212), outline=None, wob=0, r=3)
        elif kind == "calendar":
            ink.rect(-90, -80, 90, 95, fill=WHITE, outline=(40, 42, 50), w=6, wob=0, r=18)
            ink.rect(-90, -80, 90, -30, fill=RED, outline=(40, 42, 50), w=6, wob=0, r=18)
            T(ink, 0, 34, "DI", 72, DARK)
        elif kind == "bell":
            sw = math.sin(t * 9) * 10 * max(0, 1 - t)
            with ink.at(0, -60, sw):
                ink.shape([(-60, 70), (-50, 0), (-30, -40), (0, -52), (30, -40), (50, 0), (60, 70)], fill=GOLD,
                          outline=(180, 130, 0), w=6, wob=0, smooth=True)
                ink.rect(-74, 62, 74, 82, fill=GOLD, outline=(180, 130, 0), w=6, wob=0, r=10)
                ink.circle(0, 96, 16, fill=(180, 130, 0), outline=None, wob=0)
        elif kind == "person":
            ink.circle(0, -42, 44, fill=(205, 208, 218), outline=None, wob=0)
            ink.shape([(-80, 90), (-70, 20), (-30, 0), (30, 0), (70, 20), (80, 90)], fill=(36, 38, 46), outline=None,
                      wob=0, smooth=True)
            ink.shape([(-14, 4), (0, 40), (14, 4)], fill=(205, 208, 218), outline=None, wob=0)


def card_draw(ink, c, t, w, h):
    """Content of a glass card at local time t (card centre is the origin)."""
    ty = c["type"]
    if ty == "title":
        T(ink, 0, -h / 2 + 46, c.get("kicker", ""), 30, TXT2, "montb")
        s = fit(ink, c["text"], 84, w - 70)
        T(ink, 0, 18, c["text"], s, DARK)
    elif ty == "person":
        with ink.at(-w / 2 + 110, 6):
            ink.circle(0, 0, 82, fill=(236, 238, 244), outline=None, wob=0)
            icon3d(ink, "person", 0.8)
        T(ink, -w / 2 + 220, -30, c["name"], fit(ink, c["name"], 52, w - 260), DARK, "mont", "lm")
        T(ink, -w / 2 + 220, 26, c.get("role", ""), 30, TXT2, "montb", "lm")
        if c.get("badge") and t > c.get("badge_at", 0.6):
            k = ease_out_back(seg(t, c.get("badge_at", 0.6), c.get("badge_at", 0.6) + 0.4), 1.6)
            with ink.at(w / 2 - 120, h / 2 - 8, -6, max(0.05, k)):
                pill(ink, 0, 0, c["badge"], 34, RED)
    elif ty == "news":
        with ink.at(-w / 2 + 100, 4):
            icon3d(ink, "news", 0.62)
        T(ink, -w / 2 + 190, -h / 2 + 50, c.get("kicker", ""), 28, TXT2, "montb", "lm")
        for j, ln in enumerate(c["lines"]):
            kj = smooth(seg(t, 0.25 + j * 0.25, 0.65 + j * 0.25))
            if kj > 0.01:
                with ink.at(-w / 2 + 190 + 30 * (1 - kj), -h / 2 + 108 + j * 56):
                    T(ink, 0, 0, ln, fit(ink, ln, 42, w - 230), DARK if j else BLUE, "mont", "lm")
    elif ty == "chart":
        T(ink, -w / 2 + 40, -h / 2 + 44, c.get("title", ""), 30, DARK, "mont", "lm")
        T(ink, w / 2 - 40, -h / 2 + 44, c.get("sub", ""), 22, TXT2, "montb", "rm")
        pts = c["points"]
        x0, x1, y0, y1 = -w / 2 + 40, w / 2 - 120, h / 2 - 60, -h / 2 + 110
        for gi in range(4):
            gy = lerp(y0, y1, gi / 3)
            ink.line([(x0, gy), (x1 + 50, gy)], (232, 234, 240), 3, wob=0)
        drop = c.get("drop_from", len(pts))
        k = ease_in_out(seg(t, c.get("draw_at", 0.2), c.get("draw_end", 1.6)))
        n = 1 + (len(pts) - 1) * k
        P = [(lerp(x0, x1, i / (len(pts) - 1)), lerp(y0, y1, v)) for i, v in enumerate(pts)]
        shown = P[:int(n)]
        if int(n) < len(P):
            f_ = n - int(n)
            a, b = P[int(n) - 1], P[int(n)]
            shown.append((lerp(a[0], b[0], f_), lerp(a[1], b[1], f_)))
        if c.get("after_hours"):
            ax = lerp(x0, x1, (drop - 1) / (len(pts) - 1))
            ink.rect(ax, y1 - 20, x1 + 50, y0, fill=(250, 232, 236), outline=None, wob=0, r=8)
            T(ink, (ax + x1 + 50) / 2, y0 + 30, "nachbörslich", 20, TXT2, "montb")
        if len(shown) > 1:
            g = [p for p in shown[:drop]]
            r_ = shown[drop - 1:] if len(shown) >= drop else []
            if len(g) > 1:
                ink.line(g, GREEN, 9, wob=0)
            if len(r_) > 1:
                ink.line(r_, RED, 9, wob=0)
            hx, hy = shown[-1]
            ink.circle(hx, hy, 13, fill=RED if len(shown) > drop else GREEN, outline=WHITE, w=4, wob=0)
        if c.get("badge") and t > c.get("badge_at", 1.6):
            kb = ease_out_back(seg(t, c["badge_at"], c["badge_at"] + 0.4), 1.7)
            with ink.at(w / 2 - 150, -h / 2 + 120, -5, max(0.05, kb)):
                pill(ink, 0, 0, c["badge"], 44, RED)
    elif ty == "kpi":
        T(ink, 0, -h / 2 + 50, c.get("kicker", ""), 30, TXT2, "montb")
        k = ease_out(seg(t, c.get("count_at", 0.2), c.get("count_end", 1.2)))
        v = lerp(c.get("from", 0), c["to"], k)
        s = c.get("fmt", "{}").replace("{}", de(v, c.get("dec", 0)))
        T(ink, 0, 22, s, fit(ink, s, 104, w - 70), c.get("col") and tuple(c["col"]) or DARK)
        if c.get("sub"):
            T(ink, 0, h / 2 - 44, c["sub"], 26, TXT2, "montb")
    elif ty == "quote":
        T(ink, -w / 2 + 40, -h / 2 + 46, c.get("kicker", ""), 28, TXT2, "montb", "lm")
        T(ink, -w / 2 + 34, -h / 2 + 120, "“", 120, BLUE, "mont", "lm")
        for j, ln in enumerate(c["lines"]):
            kj = smooth(seg(t, 0.2 + j * 0.3, 0.6 + j * 0.3))
            if kj > 0.01:
                with ink.at(30 * (1 - kj), 0):
                    T(ink, -w / 2 + 110, -h / 2 + 130 + j * 58, ln, fit(ink, ln, 44, w - 150), DARK, "mont", "lm")
    elif ty == "shrink":
        T(ink, 0, -h / 2 + 46, c.get("kicker", ""), 28, TXT2, "montb")
        x0, x1 = -w / 2 + 50, w / 2 - 50
        y = 10
        k = ease_in_out(seg(t, c.get("shrink_at", 0.5), c.get("shrink_end", 1.6)))
        full = x1 - x0
        ink.rect(x0, y - 34, x1, y + 34, fill=(238, 240, 246), outline=None, wob=0, r=34)
        cut = c.get("cut", 0.28)
        ink.rect(x0, y - 34, x0 + full * (1 - cut * k), y + 34, fill=BLUE, outline=None, wob=0, r=34)
        if k > 0.02:
            ink.rect(x1 - full * cut * k, y - 34, x1, y + 34, fill=(255, 210, 214), outline=None, wob=0, r=34)
        T(ink, x0 + 24, y + 2, c.get("label", ""), 30, WHITE, "mont", "lm")
        if t > c.get("badge_at", 1.6):
            kb = ease_out_back(seg(t, c["badge_at"], c["badge_at"] + 0.4), 1.7)
            with ink.at(x1 - 120, y + 90, -4, max(0.05, kb)):
                pill(ink, 0, 0, c["badge"], 40, RED)
    elif ty == "stamp":
        k = clamp(ct_ := t / 0.25)
        col = tuple(c.get("col", RED))
        with ink.at(0, 0, c.get("rot", -6), lerp(1.6, 1.0, smooth(k))):
            tw = ink.text_w(c["text"], c.get("size", 80), "mont") + 70
            ink.rect(-tw / 2, -62, tw / 2, 62, fill=(255, 255, 255, 0) if False else None, outline=col, w=12, wob=0.4, r=16)
            T(ink, 0, 4, c["text"], c.get("size", 80), col)
    elif ty == "icon":
        icon3d(ink, c["icon"], c.get("s", 1.0), t)
        if c.get("label"):
            T(ink, 0, h / 2 - 46, c["label"], fit(ink, c["label"], 38, w - 50), DARK)


def render_card(c, t):
    """Card sprite (glass base + content) or None before it appears."""
    w, h = c.get("w", 760), c.get("h", 220)
    glass = c.get("glass", True)
    if glass:
        base, pad = glass_base(w, h, tuple(c.get("glow", ("pink", "blue"))))
        im = base.copy()
    else:
        pad = 60
        im = Image.new("RGBA", (w + 2 * pad, h + 2 * pad), (0, 0, 0, 0))
    ss = 1
    ink = Ink(im, affine(pad + w / 2, pad + h / 2, 0, ss), 0, ss)
    card_draw(ink, c, t, w, h)
    return im


def rot_y(im, ang, k_scale=1.0):
    """Fake 3D: turn a sprite around its vertical axis (perspective)."""
    if abs(ang) < 0.5 and abs(k_scale - 1) < 1e-3:
        return im, 0, 0
    w, h = im.size
    F = 1800.0
    a = math.radians(ang)
    pts = []
    for (x, y) in ((0, 0), (w, 0), (w, h), (0, h)):
        X, Y = (x - w / 2) * k_scale, (y - h / 2) * k_scale
        z = X * math.sin(a)
        X2 = X * math.cos(a)
        sc = F / (F + z)
        pts.append((X2 * sc, Y * sc))
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    ox, oy = min(xs), min(ys)
    ow, oh = int(max(xs) - ox) + 2, int(max(ys) - oy) + 2
    dst = [(p[0] - ox, p[1] - oy) for p in pts]
    co = scene3d._perspective_coeffs([(0, 0), (w, 0), (w, h), (0, h)], dst)
    out = im.transform((max(2, ow), max(2, oh)), Image.PERSPECTIVE, co, Image.BICUBIC)
    return out, ox + w / 2, oy + h / 2


def comp(base, im, x, y):
    x, y = int(round(x)), int(round(y))
    l, t_ = max(0, -x), max(0, -y)
    r, b = min(im.width, base.width - x), min(im.height, base.height - y)
    if r > l and b > t_:
        base.alpha_composite(im.crop((l, t_, r, b)), (x + l, y + t_))


# -- renderer -------------------------------------------------------------------------------------

def _cam(spec, k):
    a, b = spec["from"], spec.get("to", spec["from"])
    e = ease_in_out(k) if spec.get("ease", "inout") == "inout" else ease_out(k)
    pos = [lerp(p, q, e) for p, q in zip(a["pos"], b["pos"])]
    tgt = [lerp(p, q, e) for p, q in zip(a["target"], b["target"])]
    fov = lerp(a.get("fov", 50), b.get("fov", a.get("fov", 50)), e)
    return scene3d.Camera(pos, tgt, fov)


class Studio:
    def __init__(self, spec):
        self.spec = spec
        self.shots = spec["shots"]
        self.words = spec["words"]
        v = audio.load(spec["audio"])
        self.n = int(math.ceil(spec["duration"] * FPS))
        self.mouth = mouth_track(v, self.n)

    def shot_at(self, t):
        for i, s in enumerate(self.shots):
            if s["start"] <= t < s["end"]:
                return i
        return len(self.shots) - 1

    def panda_layer(self, img, s, lt, gi):
        p = s.get("panda")
        if not p:
            return None
        fx, fy, fh = FRAMES[p.get("frame", "medium")]
        fx, fy, fh = p.get("x", fx), p.get("y", fy), p.get("h", fh)
        dur = s["end"] - s["start"]
        # slow push-in on the panda during the shot
        z = 1 + p.get("push", 0.05) * ease_in_out(clamp(lt / max(dur, 0.01)))
        pose = p["pose"]
        since = lt
        for at, ps in p.get("swap", []):
            if lt >= at:
                pose, since = ps, lt - at
        enter = p.get("enter", "pop")
        k_in = 1.0
        dx = 0.0
        if enter == "pop":
            k_in = lerp(0.82, 1.0, ease_out_back(seg(lt, 0, 0.32), 1.8))
        elif enter == "slide":
            dx = -700 * (1 - smooth(seg(lt, 0, 0.5)))
        squash = 0.06 * math.sin(math.pi * min(1, since / 0.2)) if since < 0.2 and since != lt else 0.0
        bob = math.sin(lt * 2 * math.pi / 2.6) * 6
        h = fh * z * k_in
        kq = int(self.mouth[min(gi, self.n - 1)]) if p.get("talk", True) and pose in MOUTH else 0
        hq = int(round(h * (1 - squash) / 6)) * 6
        sp = panda_sprite(pose, hq, kq, p.get("flip", False))
        feet = fy + (fy - H * 0.5) * (z - 1) * 0.2
        if p.get("frame", "medium").startswith("wide"):
            sh = shadow_sprite(int(sp.width * 0.8))
            comp(img, sh, fx + dx - sh.width / 2, feet - sh.height * 0.55)
        comp(img, sp, fx + dx - sp.width / 2, feet - hq + bob)
        return feet - hq + bob

    def draw_shot(self, i, t, gi):
        s = self.shots[i]
        lt = t - s["start"]
        dur = s["end"] - s["start"]
        cam = _cam(s["cam"], clamp(lt / dur)) if s.get("cam") else scene3d.Camera((0, 1.6, -6), (0, 1.2, 10), 45)
        bg = scene3d.get_set(s.get("set", "studio")).render(cam, W, H, ss=1.25, blur=s.get("blur", 0.0))
        img = bg.convert("RGBA")
        top = self.panda_layer(img, s, lt, gi)
        for c in s.get("cards", []):
            if lt < c.get("at", 0):
                continue
            ct = lt - c.get("at", 0)
            sp = render_card(c, ct)
            k = ease_out_back(seg(ct, 0, 0.42), 1.5)
            ang = (1 - smooth(seg(ct, 0, 0.5))) * c.get("spin", 70)
            sc = lerp(0.6, 1.0, k) * (1 + 0.012 * math.sin(ct * 2.2))
            fl = math.sin(ct * 1.8 + c.get("y", 500) * 0.01) * 6
            sp2, ox, oy = rot_y(sp, ang, sc)
            comp(img, sp2, c.get("x", 540) - sp2.width / 2, c.get("y", 520) - sp2.height / 2 + fl)
        return img, top

    def caption(self, img, t, top):
        cur = None
        for j, w in enumerate(self.words):
            nxt = self.words[j + 1]["s"] if j + 1 < len(self.words) else w["e"] + 0.4
            if w["s"] <= t < max(w["e"] + 0.12, min(nxt, w["s"] + 0.9)):
                cur = w
        if not cur:
            return
        y = min(1060, (top or 1200) - 80)
        ink = Ink(img, affine(0, 0, 0, 1), 0, 1)
        k = 1 + 0.18 * math.exp(-(t - cur["s"]) * 14)
        txt = cur["w"].upper().strip(",.:;")
        with ink.at(540, y, 0, k):
            ink.text(0, 0, txt, fit(ink, txt, 62, 900), "mont", fill=YELLOW, stroke=DARK, sw=0.2)

    def header(self, img):
        ink = Ink(img, affine(0, 0, 0, 1), 0, 1)
        ink.rect(0, 0, W, 92, fill=(255, 255, 255), outline=None, wob=0)
        ink.rect(0, 90, W, 94, fill=(236, 236, 242), outline=None, wob=0)
        ink.circle(48, 46, 14, fill=GREEN, outline=None, wob=0)
        T(ink, 74, 47, self.spec.get("brand", "PANDA_INVESTIERT"), 28, DARK, "mont", "lm")
        T(ink, W - 36, 47, self.spec.get("header", ""), 26, TXT2, "montb", "rm")

    def frame(self, gi):
        t = gi / FPS
        i = self.shot_at(t)
        s = self.shots[i]
        lt = t - s["start"]
        img, top = self.draw_shot(i, t, gi)
        TD = 0.24
        if i > 0 and lt < TD and s.get("trans", "zoom") != "cut":
            prev, _ = self.draw_shot(i - 1, s["start"] - 1e-3, gi)
            u = lt / TD
            e = smooth(u)
            mode = s.get("trans", "zoom")
            if mode == "zoom":
                zo = 1 + 0.6 * e
                pv = prev.resize((int(W * zo), int(H * zo)), Image.BILINEAR)
                pv = pv.crop(((pv.width - W) // 2, (pv.height - H) // 2, (pv.width - W) // 2 + W, (pv.height - H) // 2 + H))
                zi = lerp(0.7, 1.0, e)
                cur = img.resize((int(W * zi), int(H * zi)), Image.BILINEAR)
                out = pv.copy()
                if zi < 1:
                    blurbg = img.filter(ImageFilter.GaussianBlur(8))
                    out = Image.blend(pv, blurbg, e)
                    comp(out, cur, (W - cur.width) / 2, (H - cur.height) / 2)
                    out = Image.blend(out, img, e * e)
                else:
                    out = img
                img = Image.blend(out, out.filter(ImageFilter.GaussianBlur(10)), 0.6 * (1 - abs(2 * u - 1)))
            else:  # whip
                off = int(W * e)
                both = Image.new("RGBA", (W * 2, H))
                both.paste(prev, (0, 0))
                both.paste(img, (W, 0))
                view = both.crop((off, 0, off + W, H))
                img = view.filter(ImageFilter.BoxBlur(int(28 * (1 - abs(2 * u - 1))) + 1))
        self.caption(img, t, top)
        self.header(img)
        return img.convert("RGB")


# -- sound ------------------------------------------------------------------------------------

def _variant(name):
    from .pandanews import sample, _resample, _lowpass
    if name == "whoosh_lo":
        return _lowpass(_resample(sample("whoosh"), 0.72), 5000)
    if name == "swish":
        x = _resample(sample("whoosh"), 1.45)
        return x / (np.max(np.abs(x)) + 1e-9)
    if name == "whoosh_rev":
        x = sample("whoosh")[::-1].copy()
        return x
    return sample({"shimmer": "drum_splash_soft"}.get(name, name))


def cues(spec):
    out = [(0.0, "riser", 0.5)]
    alt = ["whoosh", "swish", "whoosh_lo"]
    for i, s in enumerate(spec["shots"]):
        st = s["start"]
        if i:
            out.append((st - 0.12, alt[i % 3], 0.85))
        if s.get("cam") and s["cam"].get("whoosh"):
            out.append((st + 0.05, "whoosh_lo", 0.6))
        p = s.get("panda") or {}
        if p.get("enter") == "slide":
            out.append((st + 0.02, "swish", 0.55))
        for at, _ in p.get("swap", []):
            out.append((st + at, "pop", 0.35))
        for c in s.get("cards", []):
            a = st + c.get("at", 0)
            out.append((a + 0.02, "pop", 0.55))
            if c["type"] == "kpi":
                out.append((st + c.get("at", 0) + c.get("count_end", 1.2), "cash" if "$" in c.get("fmt", "") or "€" in c.get("fmt", "") else "pop", 0.5))
            for key in ("badge_at",):
                if c.get(key) is not None:
                    out.append((a + c[key] + 0.02, "pop", 0.6))
            out += [(a + x, n, g) for x, n, g in c.get("sfx", [])]
        out += [(st + x, n, g) for x, n, g in s.get("sfx", [])]
    return sorted(out)


def mix(spec, out_wav):
    from .pandanews import _active_rms, master_wav, SFX_TRIM
    v = audio.normalize(audio.load(spec["audio"]))
    n = int(spec["duration"] * audio.SR)
    out = np.zeros(n)
    out[:min(n, len(v))] += v[:n]
    vr = _active_rms(v)
    last = {}
    gaps = {"pop": 0.18, "cash": 1.0}
    for t, name, gain in cues(spec):
        if t - last.get(name, -9) < gaps.get(name, 0.25):
            continue
        last[name] = t
        s = _variant(name)
        s = s / _active_rms(s, top=1) * spec.get("sfx_rel", 0.7) * vr * SFX_TRIM.get(name, 1.0) * min(1.0, gain / 0.6)
        a = int(max(0, t) * audio.SR)
        if a >= n:
            continue
        e = min(n, a + len(s))
        out[a:e] += gain * s[:e - a]
    pk = np.max(np.abs(out)) + 1e-9
    if pk > 0.95:
        out *= 0.95 / pk
    audio.save(out_wav, out)
    master_wav(out_wav, spec.get("master_lufs", -16.8))


_S = None


def _init(spec):
    global _S
    _S = Studio(spec)


def _work(i):
    return _S.frame(i).tobytes()


def render(spec, out_path, workers=None, log=print):
    out_path = Path(out_path)
    wav = out_path.with_suffix(".mix.wav")
    mix(spec, wav)
    n = int(math.ceil(spec["duration"] * FPS))
    cmd = ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
           "-i", "-", "-i", str(wav), "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "medium", "-crf", "17",
           "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(out_path)]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    t0 = time.time()
    with mp.Pool(workers or mp.cpu_count(), initializer=_init, initargs=(spec,)) as pool:
        for k, buf in enumerate(pool.imap(_work, range(n), chunksize=2)):
            proc.stdin.write(buf)
            if k % (FPS * 5) == 0:
                log(f"  frame {k}/{n} ({time.time() - t0:.0f}s)")
    proc.stdin.close()
    if proc.wait() != 0:
        sys.exit("ffmpeg failed")
    wav.unlink(missing_ok=True)
    log(f"  wrote {out_path} ({n} frames in {time.time() - t0:.0f}s)")


if __name__ == "__main__":
    spec = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    if len(sys.argv) > 3 and sys.argv[3] == "--stills":
        st = Studio(spec)
        for tt in sys.argv[4].split(","):
            st.frame(int(float(tt) * FPS)).save(Path(sys.argv[2]) / f"still_{tt}.png")
    else:
        render(spec, sys.argv[2])
