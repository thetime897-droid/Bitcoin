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

from . import audio, scene3d, pandaface
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

# poses whose drawn mouth is replaced cleanly by the talking mouth (checked one by one)
TALK = {"mikrofon", "zeigen", "selbstbewusst", "cool", "hoodie_daumen", "kaffee", "entspannt", "zeigen_tablet",
        "zeigestock"}

# shot sizes: centre x, feet y and height of the panda. The head always stays below y~930, so the card zone
# (y 110..780) and the small caption line (y~860) are never covered.
FRAMES = {"wide": (540, 1620, 560), "medium": (540, 2010, 1060), "close": (560, 2520, 1560),
          "wide_left": (300, 1640, 600), "wide_right": (790, 1640, 600), "medium_left": (330, 2010, 1060),
          "medium_right": (760, 2010, 1060)}


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


@lru_cache(maxsize=900)
def panda_sprite(pose, h, kq, flip=False):
    """Pose at height h. Poses that can talk always use the redrawn mouth (state kq, 0 = closed), so the
    mouth never changes style inside a shot and the original drawn mouth never shows underneath."""
    if pose in TALK:
        im = pandaface.talking(pose, int(kq))
    else:
        im = Image.open(HERE / "panda" / f"{pose}.png").convert("RGBA")
    im = im.resize((max(1, int(im.width * h / im.height)), int(h)), Image.LANCZOS)
    if h > 900:
        im = im.filter(ImageFilter.UnsharpMask(2, 50, 2))
    if flip:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    return im


@lru_cache(maxsize=8)
def shadow_sprite(w):
    im = Image.new("RGBA", (int(w * 1.6), int(w * 0.5)), (0, 0, 0, 0))
    ImageDraw.Draw(im).ellipse([w * 0.3, w * 0.15, w * 1.3, w * 0.35], fill=(40, 44, 60, 70))
    return im.filter(ImageFilter.GaussianBlur(w * 0.06))


def _chunks(words, max_chars=24):
    """Group words into short subtitle phrases (break at punctuation or length)."""
    out, cur = [], []
    for w in words:
        cur.append(w)
        txt = " ".join(x["w"] for x in cur)
        if len(txt) >= max_chars - 6 and (w["w"][-1] in ",.?!:" or len(txt) >= max_chars) or w["w"][-1] in ".?!":
            out.append(cur)
            cur = []
    if cur:
        out.append(cur)
    res = []
    for i, c in enumerate(out):
        end = out[i + 1][0]["s"] if i + 1 < len(out) else c[-1]["e"] + 0.6
        res.append((c[0]["s"] - 0.05, min(end, c[-1]["e"] + 0.8), c))
    return res


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
    elif ty == "coins":
        T(ink, 0, -h / 2 + 46, c.get("kicker", ""), 28, TXT2, "montb")
        coins = c["coins"]          # [[label, colour, at], ...]
        n_ = len(coins)
        for i, (lbl, col, at) in enumerate(coins):
            if t < at:
                continue
            k = ease_out_back(seg(t, at, at + 0.35), 2.0)
            cx = -w / 2 + w * (i + 0.5) / n_
            with ink.at(cx, 18, 0, max(0.05, k)):
                ink.circle(4, 8, 62, fill=(30, 34, 48, 40), outline=None, wob=0)
                ink.circle(0, 0, 62, fill=tuple(col), outline=WHITE, w=6, wob=0)
                ink.circle(-14, -18, 22, fill=mix(tuple(col), WHITE, 0.35), outline=None, wob=0)
                T(ink, 0, 2, lbl[0], 54, WHITE)
                T(ink, 0, 92, lbl, 26, DARK, "mont")
    elif ty == "strike":
        T(ink, 0, -h / 2 + 46, c.get("kicker", ""), 28, RED, "mont")
        size = fit(ink, c["text"], 92, w - 80)
        T(ink, 0, 14, c["text"], size, DARK)
        sa = c.get("strike_at", 99)
        if t > sa:
            k = smooth(seg(t, sa, sa + 0.35))
            tw = ink.text_w(c["text"], size, "mont")
            ink.line([(-tw / 2 - 16, 26), (-tw / 2 - 16 + (tw + 32) * k, 2)], RED, 14, wob=0)
        if c.get("sub") and t > c.get("sub_at", sa + 0.3):
            k = smooth(seg(t, c["sub_at"], c["sub_at"] + 0.35))
            T(ink, 0, h / 2 - 40, c["sub"], 30, mix(WHITE, TXT2, k), "montb")
    elif ty == "reasons":
        T(ink, -w / 2 + 40, -h / 2 + 48, c.get("title", ""), fit(ink, c.get("title", ""), 44, w - 80), DARK, "mont", "lm")
        for i, (txt, at) in enumerate(c["items"]):
            yy = -h / 2 + 128 + i * 84
            if t < at:
                ink.rect(-w / 2 + 40, yy - 30, w / 2 - 40, yy + 30, fill=(244, 245, 249), outline=None, wob=0, r=14)
                continue
            k = smooth(seg(t, at, at + 0.35))
            with ink.at(30 * (1 - k), yy):
                ink.rect(-w / 2 + 40, -30, w / 2 - 40, 30, fill=(250, 238, 240), outline=None, wob=0, r=14)
                ink.circle(-w / 2 + 78, 0, 20, fill=RED, outline=None, wob=0)
                ink.line([(-w / 2 + 70, -8), (-w / 2 + 86, 8)], WHITE, 6, wob=0)
                ink.line([(-w / 2 + 86, -8), (-w / 2 + 70, 8)], WHITE, 6, wob=0)
                T(ink, -w / 2 + 116, 2, txt, fit(ink, txt, 34, w - 190), DARK, "mont", "lm")
    elif ty == "vote":
        T(ink, -w / 2 + 40, -h / 2 + 48, c.get("title", ""), 40, DARK, "mont", "lm")
        T(ink, w / 2 - 40, -h / 2 + 48, c.get("sub", ""), 24, TXT2, "montb", "rm")
        rows = c["rows"]           # [[label, value, colour, at], ...]
        vmax = max(r[1] for r in rows)
        for i, (lbl, val, col, at) in enumerate(rows):
            yy = -h / 2 + 130 + i * 92
            T(ink, -w / 2 + 40, yy - 26, lbl, 28, DARK, "montb", "lm")
            k = ease_out(seg(t, at, at + 0.8))
            x0, x1 = -w / 2 + 40, w / 2 - 150
            ink.rect(x0, yy, x1, yy + 26, fill=(238, 240, 246), outline=None, wob=0, r=13)
            if k > 0.01:
                ink.rect(x0, yy, x0 + (x1 - x0) * val / vmax * k, yy + 26, fill=tuple(col), outline=None, wob=0, r=13)
            T(ink, w / 2 - 44, yy + 12, de(val * k), 46, tuple(col), "mont", "rm")
    elif ty == "rule":
        T(ink, 0, -h / 2 + 46, c.get("title", ""), 40, DARK)
        for i, (head, body, col, at) in enumerate(c["boxes"]):
            if t < at:
                continue
            k = ease_out_back(seg(t, at, at + 0.4), 1.5)
            bx = -w / 4 + i * w / 2
            with ink.at(bx, 40, 0, max(0.05, k)):
                bw, bh = w / 2 - 40, h - 130
                ink.rect(-bw / 2, -bh / 2, bw / 2, bh / 2, fill=mix(tuple(col), WHITE, 0.88), outline=tuple(col), w=4,
                         wob=0, r=20)
                T(ink, 0, -bh / 2 + 40, head, fit(ink, head, 28, bw - 30), TXT2, "montb")
                for j, ln in enumerate(body.split("\n")):
                    T(ink, 0, -6 + j * 50, ln, fit(ink, ln, 44 if j == 0 else 28, bw - 30), tuple(col) if j == 0 else DARK,
                      "mont" if j == 0 else "montb")
    elif ty == "calc":
        T(ink, -w / 2 + 40, -h / 2 + 46, c.get("kicker", ""), 28, TXT2, "montb", "lm")
        T(ink, -w / 2 + 40, -h / 2 + 108, c["gain_label"], 34, DARK, "montb", "lm")
        T(ink, w / 2 - 40, -h / 2 + 108, c["gain"], 46, GREEN, "mont", "rm")
        ink.line([(-w / 2 + 40, -h / 2 + 150), (w / 2 - 40, -h / 2 + 150)], (230, 232, 238), 3, wob=0)
        ca, ce = c.get("count_at", 0.4), c.get("count_end", 1.3)
        if t > ca:
            k = ease_out(seg(t, ca, ce))
            T(ink, -w / 2 + 40, -h / 2 + 206, c["tax_label"], 34, DARK, "montb", "lm")
            T(ink, w / 2 - 40, -h / 2 + 206, "−" + de(c["tax"] * k) + " €", 62, RED, "mont", "rm")
        if c.get("plus") and t > c.get("plus_at", 99):
            kb = ease_out_back(seg(t, c["plus_at"], c["plus_at"] + 0.4), 1.7)
            with ink.at(w / 2 - 120, h / 2 - 34, -4, max(0.05, kb)):
                pill(ink, 0, 0, c["plus"], 30, RED)
    elif ty == "warn":
        with ink.at(-w / 2 + 92, 0):
            ink.shape([(0, -60), (58, 46), (-58, 46)], fill=RED, outline=None, wob=0)
            T(ink, 0, 12, "!", 64, WHITE)
        T(ink, -w / 2 + 180, -h / 2 + 46, c.get("kicker", ""), 28, RED, "mont", "lm")
        for j, ln in enumerate(c["lines"]):
            T(ink, -w / 2 + 180, -h / 2 + 106 + j * 54, ln, fit(ink, ln, 44, w - 220), DARK, "mont", "lm")
        if c.get("sub"):
            T(ink, -w / 2 + 180, h / 2 - 36, c["sub"], fit(ink, c["sub"], 24, w - 220), TXT2, "montb", "lm")
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
        self.mouth = pandaface.mouth_track(v, audio.SR, self.n, FPS)
        self.chunks = _chunks(self.words)

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
        kq = int(self.mouth[min(gi, self.n - 1)]) if p.get("talk", True) and pose in TALK else 0
        hq = int(round(h * (1 - squash) / 6)) * 6
        sp = panda_sprite(pose, hq, kq, p.get("flip", False))
        feet = fy + (fy - H * 0.5) * (z - 1) * 0.2
        if p.get("frame", "medium").startswith("wide"):
            # contact shadow, falling slightly to the right/back like the buildings' shadows
            sh = shadow_sprite(int(sp.width * 0.8))
            comp(img, sh, fx + dx - sh.width / 2 + sp.width * 0.1, feet - sh.height * 0.62)
        comp(img, sp, fx + dx - sp.width / 2, feet - hq + bob)
        return feet - hq + bob

    def draw_shot(self, i, t, gi):
        s = self.shots[i]
        lt = t - s["start"]
        dur = s["end"] - s["start"]
        cam = _cam(s["cam"], clamp(lt / dur)) if s.get("cam") else scene3d.Camera((0, 1.6, -6), (0, 1.2, 10), 45)
        bg = scene3d.get_set(s.get("set", "studio"), *s.get("set_args", [])).render(cam, W, H, ss=1.25, blur=s.get("blur", 0.0))
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
        """Small phrase subtitles in a soft dark pill at a fixed height between the cards and the panda;
        the spoken word lights up yellow."""
        cur = next((c for c in self.chunks if c[0] <= t < c[1]), None)
        if not cur:
            return
        s_, e_, ws = cur
        ink = Ink(img, affine(0, 0, 0, 1), 0, 1)
        size = self.spec.get("cap_size", 40)
        texts = [w["w"] for w in ws]
        sp = size * 0.3
        widths = [ink.text_w(x, size, "mont") for x in texts]
        total = sum(widths) + sp * (len(widths) - 1)
        y = self.spec.get("cap_y", 862)
        k = smooth(seg(t, s_, s_ + 0.12))
        a_ = int(150 * k)
        lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ImageDraw.Draw(lay).rounded_rectangle([540 - total / 2 - 26, y - size * 0.95, 540 + total / 2 + 26,
                                               y + size * 0.85], radius=size, fill=(18, 20, 28, a_))
        img.alpha_composite(lay)
        x = 540 - total / 2
        for w, wd, tx in zip(ws, widths, texts):
            on = w["s"] <= t < max(w["e"], w["s"] + 0.1)
            col = YELLOW if on else (255, 255, 255)
            col = tuple(int(c * k + 40 * (1 - k)) for c in col)
            ink.text(x + wd / 2, y, tx, size, "mont", fill=col, stroke=None)
            x += wd + sp

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
                # old shot rushes in, hard switch at the midpoint, new shot settles out of a zoom: no ghosting
                if u < 0.5:
                    k = smooth(u * 2)
                    src, zo = prev, 1 + 0.45 * k * k
                else:
                    k = smooth((u - 0.5) * 2)
                    src, zo = img, 1.3 - 0.3 * k
                big = src.resize((int(W * zo), int(H * zo)), Image.BILINEAR)
                x0, y0 = (big.width - W) // 2, (big.height - H) // 2
                frame_ = big.crop((x0, y0, x0 + W, y0 + H))
                img = frame_.filter(ImageFilter.GaussianBlur(9 * (1 - abs(2 * u - 1)) + 0.01))
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
            if c.get("at", 0) < 0:
                continue
            out.append((a + 0.02, "pop", 0.55))
            if c["type"] == "coins":
                out += [(st + c.get("at", 0) + x[2], "pop", 0.5) for x in c["coins"]]
            if c["type"] == "strike" and c.get("strike_at") is not None:
                out.append((a + c["strike_at"], "swish", 0.5))
            if c["type"] == "reasons":
                out += [(a + x[1], "pop", 0.5) for x in c["items"]]
            if c["type"] == "vote":
                out += [(a + x[3] + 0.8, "pop", 0.5) for x in c["rows"]]
            if c["type"] == "rule":
                out += [(a + x[3], "pop", 0.55) for x in c["boxes"]]
            if c["type"] == "calc":
                out.append((a + c.get("count_end", 1.3), "cash", 0.5))
                if c.get("plus_at") is not None:
                    out.append((a + c["plus_at"], "pop", 0.5))
            if c["type"] == "kpi":
                out.append((st + c.get("at", 0) + c.get("count_end", 1.2), "cash" if "$" in c.get("fmt", "") or "€" in c.get("fmt", "") else "pop", 0.5))
            for key in ("badge_at",):
                if c.get(key) is not None:
                    out.append((a + c[key] + 0.02, "pop", 0.6))
            out += [(a + x, n, g) for x, n, g in c.get("sfx", [])]
        out += [(st + x, n, g) for x, n, g in s.get("sfx", [])]
    return sorted(out)


def mix_sfx(spec, out_wav):
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
    mix_sfx(spec, wav)
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
