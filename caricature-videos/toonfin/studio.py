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


BLINK = {"mikrofon", "selbstbewusst", "kaffee", "hoodie_daumen", "zeigestock"}


@lru_cache(maxsize=48)
def panda_sprite(pose, h, kq, flip=False, blink=False):
    """Pose at height h. Poses that can talk always use the redrawn mouth (state kq, 0 = closed), so the
    mouth never changes style inside a shot and the original drawn mouth never shows underneath."""
    if pose in TALK:
        im = pandaface.talking(pose, int(kq))
    else:
        im = Image.open(HERE / "panda" / f"{pose}.png").convert("RGBA")
    if blink and pose in BLINK:
        im = pandaface.blink(im, pose, 1.0)
    im = im.resize((max(1, int(im.width * h / im.height)), int(h)), Image.LANCZOS)
    if h > 900:
        im = im.filter(ImageFilter.UnsharpMask(2, 50, 2))
    if flip:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    return im


def body_motion(sp, t, talk, seed=0.0, amp=1.0, lean=0.0, gesture="idle", gt=99.0):
    """Organic motion on a still pose. Idle: weight shift, breathing, a small nod while speaking (feet stay
    planted). Gestures, ``gt`` seconds after they start: nod (yes), shake (no / sceptical), jolt (shock: a
    quick recoil), hop (joy), slow (calm, thoughtful)."""
    import cv2
    h, w = sp.height, sp.width
    a = np.asarray(sp)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    up = np.clip(1 - yy / h, 0, 1)
    head = np.clip((up - 0.62) / 0.38, 0, 1)
    sp_ = 0.6 if gesture == "slow" else 1.0
    sway = (math.sin(t * 2 * math.pi / 3.1 * sp_ + seed) * 0.012 + math.sin(t * 2 * math.pi / 1.7 * sp_ + seed * 2) * 0.004)
    sway = sway * amp + lean
    nod = talk * 0.010 * math.sin(t * 2 * math.pi / 0.62 + seed)
    breath = 0.008 * math.sin(t * 2 * math.pi / 3.4 + seed)
    hx, hy, lift = 0.0, 0.0, 0.0
    env = math.exp(-gt * 2.2) if gt >= 0 else 0.0
    if gesture == "nod" and gt >= 0:
        hy += 0.022 * math.sin(gt * 2 * math.pi / 0.42) * env
    elif gesture == "shake" and gt >= 0:
        hx += 0.026 * math.sin(gt * 2 * math.pi / 0.38) * env
    elif gesture == "jolt" and 0 <= gt < 0.6:
        k = math.sin(math.pi * min(1, gt / 0.18)) if gt < 0.18 else math.exp(-(gt - 0.18) * 8)
        sway += -0.02 * k
        hy += -0.03 * k
    elif gesture == "hop" and 0 <= gt < 0.7:
        lift = abs(math.sin(gt / 0.7 * 2 * math.pi)) * 0.05 * (1 - gt / 0.7)
    dx = -(sway * h) * up ** 1.6 - (hx * h) * head
    dy = -(breath * h) * up - (nod * h + hy * h) * head
    mx = (xx + dx).astype(np.float32)
    my = (yy + dy).astype(np.float32)
    out = cv2.remap(a, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    im = Image.fromarray(out, "RGBA")
    im.info["lift"] = lift * h
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

THEME = {"dark": False}
TOK = json.loads((HERE / "tokens.json").read_text()) if (HERE / "tokens.json").exists() else {}


def hexc(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in range(0, len(h), 2))


def tcol(name):
    return hexc(TOK["color"][name])[:3]


def set_theme(dark):
    """Dark theme: glass cards are deep navy, text is white; semantic colours come from tokens.json."""
    global GREEN, RED, BLUE, GOLD, YELLOW
    THEME["dark"] = bool(dark)
    if dark and TOK:
        GREEN, RED, BLUE, GOLD, YELLOW = tcol("up"), tcol("down"), tcol("info"), tcol("gold"), tcol("gold")


def glass_base(w, h, glow=("pink", "blue")):
    glow = tuple(tuple(g) if isinstance(g, list) else g for g in glow)
    if THEME["dark"]:
        return glass_dark(w, h, glow)
    return glass_light(w, h, glow)


@lru_cache(maxsize=64)
def glass_dark(w, h, glow):
    pad = 140
    im = Image.new("RGBA", (w + 2 * pad, h + 2 * pad), (0, 0, 0, 0))
    cols = {"pink": (255, 80, 160), "blue": tcol("info"), "mint": (60, 230, 190), "gold": tcol("gold"),
            "red": tcol("down"), "green": tcol("up")}
    g = Image.new("RGBA", im.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(g)
    gd.rounded_rectangle([pad - 6, pad - 6, pad + w + 6, pad + h + 6], 40, outline=cols.get(glow[0], (56, 189, 248)) + (150,),
                         width=14)
    im.alpha_composite(g.filter(ImageFilter.GaussianBlur(18)))
    sh = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle([pad + 8, pad + 30, pad + w - 8, pad + h + 26], 36, fill=(0, 0, 0, 120))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(28)))
    panel = Image.new("RGBA", im.size, (0, 0, 0, 0))
    pd = ImageDraw.Draw(panel)
    pd.rounded_rectangle([pad, pad, pad + w, pad + h], 34, fill=(14, 20, 36, 226))
    # soft top sheen + accent edge
    for i in range(int(h * 0.45)):
        a = int(26 * (1 - i / (h * 0.45)))
        pd.line([(pad + 30, pad + i), (pad + w - 30, pad + i)], fill=(255, 255, 255, a))
    pd.rounded_rectangle([pad, pad, pad + w, pad + h], 34, outline=cols.get(glow[0], (56, 189, 248)) + (210,), width=3)
    im.alpha_composite(panel)
    return im, pad


@lru_cache(maxsize=64)
def glass_light(w, h, glow=("pink", "blue")):
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
    if THEME["dark"]:
        if fill == DARK:
            fill = (255, 255, 255)
        elif fill == TXT2:
            fill = tcol("text2")
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
        ce = c.get("count_end", 1.2)
        snap = 1 + 0.12 * math.exp(-max(0.0, t - ce) * 9) if t >= ce else 1.0
        colk = c.get("col") and tuple(c["col"]) or DARK
        with ink.at(0, 22, 0, snap):
            T(ink, 0, 0, s, fit(ink, s, 104, w - 70), colk)
        if t >= ce and t < ce + 0.5:
            q = (t - ce) / 0.5
            ink.rect(-w / 2 + 10 - 20 * q, -h / 2 + 10 - 20 * q, w / 2 - 10 + 20 * q, h / 2 - 10 + 20 * q, fill=None,
                     outline=mix(colk, (14, 20, 36) if THEME["dark"] else (255, 255, 255), q), w=6 * (1 - q) + 1, wob=0, r=34)
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
                ink.rect(-w / 2 + 40, yy - 30, w / 2 - 40, yy + 30, fill=(28, 36, 58) if THEME["dark"] else (244, 245, 249),
                         outline=None, wob=0, r=14)
                continue
            k = smooth(seg(t, at, at + 0.35))
            with ink.at(30 * (1 - k), yy):
                ink.rect(-w / 2 + 40, -30, w / 2 - 40, 30, fill=(70, 24, 36) if THEME["dark"] else (250, 238, 240),
                         outline=None, wob=0, r=14)
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
    elif ty == "calendar":
        k = smooth(seg(t, 0.1, 0.5))
        bw_ = min(w * 0.32, h - 60)
        x0 = -w / 2 + 40
        ink.rect(x0, -h / 2 + 30, x0 + bw_, h / 2 - 30, fill=(240, 242, 248), outline=None, wob=0, r=22)
        ink.rect(x0, -h / 2 + 30, x0 + bw_, -h / 2 + 30 + bw_ * 0.28, fill=RED, outline=None, wob=0, r=22)
        ink.text(x0 + bw_ / 2, -h / 2 + 30 + bw_ * 0.15, c.get("month", "DEZ"), bw_ * 0.16, "mont", fill=(255, 255, 255),
                 stroke=None)
        ink.text(x0 + bw_ / 2, 30, c.get("day", "1"), bw_ * 0.62, "bebas", fill=(20, 24, 34), stroke=None)
        tx = x0 + bw_ + 40
        with ink.at(30 * (1 - k), 0):
            T(ink, tx, -40, c.get("title", ""), fit(ink, c.get("title", ""), 50, w / 2 + w / 2 - tx - 40), DARK, "mont", "lm")
            T(ink, tx, 26, c.get("sub", ""), fit(ink, c.get("sub", ""), 32, w - tx - w / 2 - 40 + w / 2), TXT2, "montb", "lm")
    elif ty == "logo":
        # ticker monogram hologram (real logos are trademarks -> neutral fallback, see CLAUDE.md)
        r = min(w, h) * 0.34
        cx = -w / 2 + r + 40
        spin = math.cos(min(1.0, t / 0.6) * math.pi * 2) if t < 0.6 else 1.0
        with ink.at(cx, 0, 0, 1, max(0.05, abs(spin))):
            ink.circle(0, 0, r, fill=(20, 32, 58), outline=tcol("info") if THEME["dark"] else BLUE, w=6, wob=0)
            if c.get("logo") and (HERE / "logos" / f"{c['logo']}.svg").exists():
                lg = logo_img(c["logo"], int(r * 1.3 * ink.scale()), c.get("logo_col", "#76B900"))
                X_, Y_ = ink.P(0, 0)
                ink.img.alpha_composite(lg, (int(X_ - lg.width / 2), int(Y_ - lg.height / 2)))
            else:                                            # fallback: ticker monogram
                T(ink, 0, 4, c.get("mono", c.get("ticker", "?")[:1]), r * 1.1, tcol("info") if THEME["dark"] else BLUE)
        T(ink, cx + r + 34, -24, c.get("name", ""), fit(ink, c.get("name", ""), 58, w - 2 * r - 120), DARK, "mont", "lm")
        T(ink, cx + r + 34, 34, c.get("sub", ""), 28, TXT2, "montb", "lm")
    elif ty == "candles":
        T(ink, -w / 2 + 40, -h / 2 + 44, c.get("title", ""), 32, DARK, "mont", "lm")
        T(ink, w / 2 - 40, -h / 2 + 44, c.get("sub", ""), 22, TXT2, "montb", "rm")
        data = c["ohlc"]
        lo = min(x[2] for x in data)
        hi = max(x[1] for x in data)
        x0, x1, y0, y1 = -w / 2 + 40, w / 2 - 40, h / 2 - 88, -h / 2 + 110
        Y = lambda v: lerp(y0, y1, (v - lo) / (hi - lo + 1e-9))
        for gi in range(4):
            gy = lerp(y0, y1, gi / 3)
            ink.line([(x0, gy), (x1, gy)], (40, 52, 80) if THEME["dark"] else (232, 234, 240), 2, wob=0)
        n = len(data)
        k = seg(t, c.get("draw_at", 0.2), c.get("draw_end", 1.6)) * n
        bw = (x1 - x0) / n * 0.62
        for i, (o, hh, ll, cl) in enumerate(data):
            if i >= k:
                break
            ki = clamp(k - i)
            cx = x0 + (i + 0.5) * (x1 - x0) / n
            col = GREEN if cl >= o else RED
            ink.line([(cx, Y(ll)), (cx, Y(hh))], col, 3, wob=0)
            top, bot = Y(max(o, cl)), Y(min(o, cl))
            mid = (top + bot) / 2
            ink.rect(cx - bw / 2, lerp(mid, top, ki) - 1, cx + bw / 2, lerp(mid, bot, ki) + 1, fill=col, outline=None, wob=0, r=2)
        for m in c.get("markers", []):          # [index, label, colour, at]
            if t < m[3]:
                continue
            km = ease_out_back(seg(t, m[3], m[3] + 0.4), 1.8)
            i = m[0]
            cx = x0 + (i + 0.5) * (x1 - x0) / n
            o, hh, ll, cl = data[i]
            up_ = m[2] == "up"
            py = Y(hh) - 18 if up_ else Y(ll) + 18
            col = GREEN if up_ else RED
            ink.circle(cx, py, 9 * km, fill=col, outline=None, wob=0)
            lx = cx - (ink.text_w(m[1], 24, "mont") / 2 + 30 if up_ else 0)
            with ink.at(lx, py + (-10 if up_ else 44), 0, max(0.05, km)):
                pill(ink, 0, 0, m[1], 24, col)
    elif ty == "versus":
        k1 = smooth(seg(t, 0.0, 0.45))
        k2 = smooth(seg(t, c.get("b_at", 0.5), c.get("b_at", 0.5) + 0.45))
        for side, (lab, val, sub, col, kk) in enumerate(((c["a"][0], c["a"][1], c["a"][2], c["a"][3], k1),
                                                       (c["b"][0], c["b"][1], c["b"][2], c["b"][3], k2))):
            if kk <= 0.01:
                continue
            cx = -w / 4 + side * w / 2
            colr = GREEN if col == "up" else (RED if col == "down" else BLUE)
            with ink.at(cx + (1 - kk) * (-80 if side == 0 else 80), 0):
                ink.rect(-w / 4 + 16, -h / 2 + 20, w / 4 - 16, h / 2 - 20, fill=None, outline=colr, w=4, wob=0, r=22)
                T(ink, 0, -h / 2 + 64, lab, fit(ink, lab, 30, w / 2 - 60), TXT2, "montb")
                T(ink, 0, 10, val, fit(ink, val, 76, w / 2 - 120), colr)
                T(ink, 0, h / 2 - 60, sub, fit(ink, sub, 24, w / 2 - 60), TXT2, "montb")
        kv = ease_out_back(seg(t, c.get("b_at", 0.5) + 0.2, c.get("b_at", 0.5) + 0.6), 2.0)
        if kv > 0.02:
            with ink.at(0, 0, 0, kv):
                ink.circle(0, 0, 32, fill=tcol("gold") if THEME["dark"] else GOLD, outline=None, wob=0)
                ink.text(0, 2, "VS", 24, "mont", fill=(14, 20, 36), stroke=None)
    elif ty == "metrics":
        T(ink, -w / 2 + 40, -h / 2 + 46, c.get("title", ""), 30, TXT2, "montb", "lm")
        rows = c["rows"]            # [[label, value, semantic, at]]
        for i, (lab, val, sem, at) in enumerate(rows):
            if t < at:
                continue
            kk = smooth(seg(t, at, at + 0.35))
            yy = -h / 2 + 116 + i * 72
            colr = GREEN if sem == "up" else (RED if sem == "down" else (GOLD if sem == "gold" else BLUE))
            with ink.at(24 * (1 - kk), yy):
                T(ink, -w / 2 + 40, 0, lab, 32, DARK, "montb", "lm")
                T(ink, w / 2 - 40, 0, val, 40, colr, "mont", "rm")
    elif ty == "logo_dummy":
        pass
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


@lru_cache(maxsize=64)
def emoji_img(name, px):
    im = Image.open(HERE / "emoji3d" / f"{name}_3d.png").convert("RGBA")
    return im.resize((px, px), Image.LANCZOS)


@lru_cache(maxsize=16)
def logo_img(name, px, col="#76B900"):
    import cairosvg
    import io
    svg = (HERE / "logos" / f"{name}.svg").read_text().replace("<path ", f'<path fill="{col}" ')
    png = cairosvg.svg2png(bytestring=svg.encode(), output_width=px, output_height=px)
    return Image.open(io.BytesIO(png)).convert("RGBA")


def soft_shadow(im, blur=18, op=70, dy=14):
    a = im.getchannel("A").point(lambda v: v * op // 255)
    sh = Image.new("RGBA", (im.width + 2 * blur * 2, im.height + 2 * blur * 2), (0, 0, 0, 0))
    blk = Image.new("RGBA", im.size, (40, 44, 60, 255))
    blk.putalpha(a)
    sh.alpha_composite(blk, (blur * 2, blur * 2 + dy))
    return sh.filter(ImageFilter.GaussianBlur(blur)), blur * 2


def draw_overlay(img, c, ct, x, y):
    """'Real' overlays drawn straight on the frame (no glass box): headline, emoji, logo, stockchart."""
    ty = c["type"]
    ink = Ink(img, affine(0, 0, 0, 1), 0, 1)
    k = ease_out_back(seg(ct, 0, 0.45), 1.6)
    fade = smooth(seg(ct, 0, 0.25))
    if c.get("until") is not None and ct > c["until"] - c.get("at", 0):
        q = smooth(seg(ct, c["until"] - c.get("at", 0), c["until"] - c.get("at", 0) + 0.3))
        fade *= 1 - q
    if fade <= 0.01:
        return
    lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    li = Ink(lay, affine(0, 0, 0, 1), 0, 1)
    if ty in NEWS:
        news_clip(lay, c, ct, x, y)
    elif ty in CLIPS:
        draw_clip(lay, c, ct, x, y)
    elif ty == "headline":
        col = {"up": GREEN, "down": RED, "gold": (226, 160, 20), "info": BLUE}.get(c.get("tone", "up"), GREEN)
        size = c.get("size", 120)
        txt = c["text"]
        size = min(size, size * 900 / max(1, li.text_w(txt, size, "bebas")))
        rise = 40 * (1 - smooth(seg(ct, 0, 0.4)))
        sc = lerp(0.9, 1.0, smooth(seg(ct, 0, 0.4)))
        with li.at(x, y + rise, 0, sc):
            li.text(3, 5, txt, size, "bebas", fill=(0, 0, 0, 40), stroke=None)
            li.text(0, 0, txt, size, "bebas", fill=col, stroke=None)
        if c.get("sub"):
            ks = smooth(seg(ct, 0.25, 0.6))
            with li.at(x, y + size * 0.62 + 18 * (1 - ks)):
                li.text(0, 0, c["sub"], c.get("sub_size", 34), "montb", fill=(60, 64, 76, int(255 * ks)), stroke=None)
    elif ty == "emoji":
        px = c.get("px", 260)
        e = emoji_img(c["emoji"], px)
        float_ = math.sin(ct * 2.4) * 8
        s_ = max(0.05, k)
        em = e.resize((max(1, int(px * s_)), max(1, int(px * s_))), Image.LANCZOS)
        rot = c.get("tilt", 0) * (1 - smooth(seg(ct, 0, 0.5)))
        if rot:
            em = em.rotate(rot, Image.BICUBIC, expand=True)
        sh, pad = soft_shadow(em, 16, 60, 18)
        comp(lay, sh, x - sh.width / 2, y - sh.height / 2 + float_ + 6)
        comp(lay, em, x - em.width / 2, y - em.height / 2 + float_)
    elif ty == "logo":
        px = c.get("px", 240)
        lg = logo_img(c["logo"], px, c.get("col", "#76B900"))
        s_ = max(0.05, k)
        lw = max(1, int(lg.width * s_))
        lg2 = lg.resize((lw, lw), Image.LANCZOS)
        comp(lay, lg2, x - lw / 2, y - lw / 2 - px * 0.2)
        if c.get("word"):
            kw = smooth(seg(ct, 0.2, 0.55))
            li.text(x, y + px * 0.48, c["word"], c.get("word_size", 96), "mont", fill=(20, 22, 28, int(255 * kw)),
                    stroke=None)
    elif ty == "stockchart":
        w, h = c.get("w", 860), c.get("h", 560)
        base, pad = glass_light(w, h, ("blue", "blue"))
        card = base.copy()
        ci = Ink(card, affine(pad + w / 2, pad + h / 2, 0, 1), 0, 1)
        ci.text(-w / 2 + 44, -h / 2 + 58, c.get("title", ""), 52, "mont", fill=(22, 24, 32), stroke=None, anchor="lm")
        ci.text(-w / 2 + 44, -h / 2 + 104, c.get("sub", ""), 24, "montb", fill=(130, 134, 146), stroke=None, anchor="lm")
        if c.get("logo"):
            lg = logo_img(c["logo"], 120, c.get("logo_col", "#76B900"))
            card.alpha_composite(lg, (int(pad + w - 44 - 120), int(pad + 18)))
        pts = c["points"]
        x0, x1, y0, y1 = -w / 2 + 50, w / 2 - 60, h / 2 - 90, -h / 2 + 170
        for gi in range(4):
            gy = lerp(y0, y1, gi / 3)
            ci.line([(x0, gy), (x1, gy)], (232, 234, 240), 2, wob=0)
        kd = ease_in_out(seg(ct, c.get("draw_at", 0.25), c.get("draw_end", 1.6)))
        n = 1 + (len(pts) - 1) * kd
        P = [(lerp(x0, x1, i / (len(pts) - 1)), lerp(y0, y1, v)) for i, v in enumerate(pts)]
        shown = P[:int(n)]
        if int(n) < len(P):
            f_ = n - int(n)
            a_, b_ = P[int(n) - 1], P[int(n)]
            shown.append((lerp(a_[0], b_[0], f_), lerp(a_[1], b_[1], f_)))
        lc = {"up": GREEN, "down": RED}.get(c.get("tone", "down"), RED)
        if len(shown) > 1:
            area = Image.new("RGBA", card.size, (0, 0, 0, 0))
            ai = Ink(area, affine(pad + w / 2, pad + h / 2, 0, 1), 0, 1)
            ai.shape(shown + [(shown[-1][0], y0), (shown[0][0], y0)], fill=lc + (60,), outline=None, wob=0)
            g = np.linspace(1, 0, card.height)[:, None]
            A = np.asarray(area.getchannel("A"), float) * g
            area.putalpha(Image.fromarray(A.astype(np.uint8)))
            card.alpha_composite(area)
            ci.line(shown, lc, 7, wob=0)
            if c.get("end_tone") and kd > 0.92:
                ex, ey = shown[-1]
                ci.line([(ex, ey), (ex + 26, ey - 60)], GREEN if c["end_tone"] == "up" else RED, 7, wob=0)
        for j, lb in enumerate(c.get("xlabels", [])):
            ci.text(lerp(x0, x1, j / max(1, len(c["xlabels"]) - 1)), y0 + 34, lb, 22, "montb", fill=(140, 144, 156),
                    stroke=None)
        if c.get("tag") and kd > 0.95:
            kt = ease_out_back(seg(ct, c.get("draw_end", 1.6), c.get("draw_end", 1.6) + 0.35), 1.8)
            ex, ey = P[-1]
            with ci.at(ex - 70, ey + 40, 0, max(0.05, kt)):
                pill(ci, 0, 0, c["tag"], 24, lc)
        sc = lerp(0.85, 1.0, smooth(seg(ct, 0, 0.45)))
        card2 = card.resize((int(card.width * sc), int(card.height * sc)), Image.LANCZOS)
        comp(lay, card2, x - card2.width / 2, y - card2.height / 2)
    if fade < 0.999:
        A = np.asarray(lay.getchannel("A"), float) * fade
        lay.putalpha(Image.fromarray(A.astype(np.uint8)))
    img.alpha_composite(lay)


POP = {"green": (34, 197, 94), "red": (255, 77, 94), "gold": (255, 190, 40), "blue": (56, 170, 248),
       "violet": (139, 92, 246), "pink": (255, 92, 170), "peach": (255, 150, 100), "mint": (45, 212, 191)}
POP_DARK = {"green": (21, 128, 61), "red": (190, 24, 60), "gold": (214, 120, 0), "blue": (14, 116, 200),
            "violet": (100, 50, 200), "pink": (200, 40, 120), "peach": (220, 100, 50), "mint": (13, 148, 136)}


def _grad_panel(w, h, c1, c2, r):
    """Rounded panel with a diagonal gradient c1 -> c2, soft inner top highlight."""
    g = np.zeros((h, w, 3), float)
    xx, yy = np.meshgrid(np.linspace(0, 1, w), np.linspace(0, 1, h))
    k = np.clip(xx * 0.55 + yy * 0.45, 0, 1)[..., None]
    g[:] = np.array(c1, float) * (1 - k) + np.array(c2, float) * k
    hi = np.clip(1 - yy / 0.5, 0, 1)[..., None] * 0.18
    g = g + (255 - g) * hi
    im = Image.fromarray(g.astype(np.uint8)).convert("RGBA")
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, w - 1, h - 1], r, fill=255)
    im.putalpha(m)
    return im


def burst(lay, x, y, ct, t0, cols, r=220, n=22, life=0.9, seed=0):
    """Colourful confetti + ray burst when something lands."""
    if ct < t0 or ct > t0 + life:
        return
    k = (ct - t0) / life
    d = ImageDraw.Draw(lay)
    rng = np.random.default_rng(seed)
    for i in range(n):
        a = 2 * math.pi * i / n + rng.uniform(-0.2, 0.2)
        sp = rng.uniform(0.6, 1.2)
        rr = r * (0.3 + 1.1 * (1 - (1 - k) ** 3)) * sp
        px, py = x + math.cos(a) * rr, y + math.sin(a) * rr + 120 * k * k
        col = cols[i % len(cols)]
        al = int(255 * (1 - k))
        if i % 3 == 0:
            r0 = rr * 0.7
            d.line([(x + math.cos(a) * r0, y + math.sin(a) * r0), (px, py)], fill=col + (al,), width=max(1, int(8 * (1 - k))))
        else:
            sz = 9 * (1 - k * 0.6)
            ang = a + ct * 8
            pts = [(px + math.cos(ang + q * math.pi / 2) * sz, py + math.sin(ang + q * math.pi / 2) * sz * 0.6) for q in range(4)]
            d.polygon(pts, fill=col + (al,))


def draw_clip(lay, c, ct, x, y):
    """Stylish overlay clips: bigstat (colour badge + rolling number + confetti), marker headline,
    emoji with colour disc and rays, chartclip (colour header, glowing line), versus2."""
    ty = c["type"]
    li = Ink(lay, affine(0, 0, 0, 1), 0, 1)
    col = POP.get(c.get("color", "green"), POP["green"])
    dcol = POP_DARK.get(c.get("color", "green"), POP_DARK["green"])
    if ty == "bigstat":
        k = ease_out_back(seg(ct, 0, 0.45), 1.7)
        ca, ce = c.get("count_at", 0.1), c.get("count_end", 0.75)
        kc = ease_out(seg(ct, ca, ce))
        v = lerp(c.get("from", 0), c.get("to", 0), kc)
        txt = c.get("fmt", "{}").replace("{}", de(v, c.get("dec", 0))) if "to" in c else c["text"]
        full = c.get("fmt", "{}").replace("{}", de(c.get("to", 0), c.get("dec", 0))) if "to" in c else c["text"]
        size = c.get("size", 190)
        tw = li.text_w(full, size, "bebas")
        w = int(min(980, tw + 120))
        size = size * min(1.0, (w - 120) / max(1, tw))
        h = int(size * 1.08 + 40)
        panel = _grad_panel(w, h, col, dcol, int(h * 0.28))
        pi = Ink(panel, affine(w / 2, h / 2 + size * 0.06, 0, 1), 0, 1)
        roll = (1 - kc) * size * 0.25 * math.sin(ct * 40) if kc < 1 else 0
        pi.text(4, 6 + roll, txt, size, "bebas", fill=(0, 0, 0, 60), stroke=None)
        pi.text(0, roll, txt, size, "bebas", fill=(255, 255, 255), stroke=None)
        sc = max(0.05, k) * (1 + 0.08 * math.exp(-max(0, ct - ce) * 10) if ct >= ce else 1)
        rot = c.get("rot", -3) * (1 - smooth(seg(ct, 0, 0.5))) * 3 + c.get("rot", -3)
        pw = panel.resize((max(1, int(w * sc)), max(1, int(h * sc))), Image.LANCZOS).rotate(rot, Image.BICUBIC, expand=True)
        sh, _ = soft_shadow(pw, 22, 90, 22)
        comp(lay, sh, x - sh.width / 2, y - sh.height / 2 + 10)
        comp(lay, pw, x - pw.width / 2, y - pw.height / 2)
        burst(lay, x, y, ct, ce, [POP["gold"], POP["pink"], POP["blue"], col, POP["mint"]], r=w * 0.42, seed=len(full))
        if c.get("sub"):
            ks = smooth(seg(ct, 0.3, 0.6))
            sw = li.text_w(c["sub"], 34, "montb") + 50
            sy = y + h * sc / 2 + 44 + 16 * (1 - ks)
            d = ImageDraw.Draw(lay)
            d.rounded_rectangle([x - sw / 2, sy - 30, x + sw / 2, sy + 30], 30, fill=(255, 255, 255, int(240 * ks)),
                                outline=col + (int(255 * ks),), width=3)
            li.text(x, sy + 1, c["sub"], 34, "montb", fill=(30, 32, 40, int(255 * ks)), stroke=None)
    elif ty == "marker":
        size = c.get("size", 120)
        txt = c["text"]
        size = min(size, size * 900 / max(1, li.text_w(txt, size, "bebas")))
        tw = li.text_w(txt, size, "bebas")
        km = smooth(seg(ct, 0.05, 0.4))
        d = ImageDraw.Draw(lay)
        bx0 = x - tw / 2 - 26
        d.rounded_rectangle([bx0, y - size * 0.28, bx0 + (tw + 52) * km, y + size * 0.44], 16, fill=col + (235,))
        kt = smooth(seg(ct, 0.15, 0.45))
        li.text(x, y + 6 + 30 * (1 - kt), txt, size, "bebas", fill=(255, 255, 255, int(255 * kt)), stroke=None)
        if c.get("sub"):
            ks = smooth(seg(ct, 0.35, 0.65))
            li.text(x, y + size * 0.78, c["sub"], 34, "montb", fill=dcol + (int(255 * ks),), stroke=None)
    elif ty == "emoji2":
        px = c.get("px", 240)
        k = ease_out_back(seg(ct, 0, 0.45), 1.8)
        R = px * 0.62 * max(0.05, k)
        d = ImageDraw.Draw(lay)
        for i in range(12):                                   # rotating soft rays
            a = 2 * math.pi * i / 12 + ct * 0.8
            a2 = a + 0.13
            d.polygon([(x, y), (x + math.cos(a) * R * 1.7, y + math.sin(a) * R * 1.7),
                       (x + math.cos(a2) * R * 1.7, y + math.sin(a2) * R * 1.7)], fill=col + (40,))
        d.ellipse([x - R, y - R, x + R, y + R], fill=col + (255,))
        d.ellipse([x - R * 0.82, y - R * 0.82, x + R * 0.82, y + R * 0.82], fill=tuple(min(255, v + 40) for v in col) + (255,))
        e = emoji_img(c["emoji"], px)
        s_ = max(0.05, k)
        em = e.resize((max(1, int(px * s_)), max(1, int(px * s_))), Image.LANCZOS)
        if c.get("tilt"):
            em = em.rotate(c["tilt"] * (1 - smooth(seg(ct, 0, 0.5))) + math.sin(ct * 3) * 4, Image.BICUBIC, expand=True)
        fl = math.sin(ct * 2.6) * 6
        comp(lay, em, x - em.width / 2, y - em.height / 2 + fl)
    elif ty == "chartclip":
        w, h = c.get("w", 900), c.get("h", 560)
        k = smooth(seg(ct, 0, 0.4))
        card = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        m = Image.new("L", (w, h), 0)
        ImageDraw.Draw(m).rounded_rectangle([0, 0, w - 1, h - 1], 36, fill=255)
        bgc = Image.new("RGBA", (w, h), (255, 255, 255, 255))
        hdr = _grad_panel(w, 120, col, dcol, 0)
        bgc.alpha_composite(hdr, (0, 0))
        bgc.putalpha(m)
        card.alpha_composite(bgc)
        ci = Ink(card, affine(0, 0, 0, 1), 0, 1)
        ci.text(40, 60, c.get("title", ""), 64, "bebas", fill=(255, 255, 255), stroke=None, anchor="lm")
        ci.text(w - 40, 60, c.get("tag", ""), 52, "bebas", fill=(255, 255, 255), stroke=None, anchor="rm")
        if c.get("logo"):
            lg = logo_img(c["logo"], 86, "#FFFFFF")
            card.alpha_composite(lg, (int(40 + li.text_w(c.get("title", ""), 64, "bebas") + 20), 17))
        pts = c["points"]
        x0, x1, y0, y1 = 50, w - 70, h - 70, 170
        for gi in range(4):
            gy = lerp(y0, y1, gi / 3)
            ci.line([(x0, gy), (x1, gy)], (236, 238, 243), 2, wob=0)
        kd = ease_in_out(seg(ct, c.get("draw_at", 0.25), c.get("draw_end", 1.3)))
        n = 1 + (len(pts) - 1) * kd
        P = [(lerp(x0, x1, i / (len(pts) - 1)), lerp(y0, y1, v)) for i, v in enumerate(pts)]
        shown = P[:int(n)]
        if int(n) < len(P):
            f_ = n - int(n)
            a_, b_ = P[int(n) - 1], P[int(n)]
            shown.append((lerp(a_[0], b_[0], f_), lerp(a_[1], b_[1], f_)))
        if len(shown) > 1:
            area = Image.new("RGBA", card.size, (0, 0, 0, 0))
            ImageDraw.Draw(area).polygon(shown + [(shown[-1][0], y0), (shown[0][0], y0)], fill=col + (90,))
            g = np.clip(np.linspace(1.3, 0, h), 0, 1)[:, None]
            A = np.asarray(area.getchannel("A"), float) * g
            area.putalpha(Image.fromarray(A.astype(np.uint8)))
            card.alpha_composite(area)
            gl = Image.new("RGBA", card.size, (0, 0, 0, 0))
            ImageDraw.Draw(gl).line(shown, fill=col + (200,), width=18, joint="curve")
            card.alpha_composite(gl.filter(ImageFilter.GaussianBlur(9)))
            ImageDraw.Draw(card).line(shown, fill=dcol + (255,), width=8, joint="curve")
            ex, ey = shown[-1]
            pr = 12 + 4 * math.sin(ct * 10)
            ImageDraw.Draw(card).ellipse([ex - pr - 8, ey - pr - 8, ex + pr + 8, ey + pr + 8], fill=col + (90,))
            ImageDraw.Draw(card).ellipse([ex - 10, ey - 10, ex + 10, ey + 10], fill=(255, 255, 255, 255), outline=dcol + (255,), width=4)
        sc = lerp(0.82, 1.0, k)
        cw = card.resize((int(w * sc), int(h * sc)), Image.LANCZOS)
        sh, _ = soft_shadow(cw, 24, 80, 22)
        comp(lay, sh, x - sh.width / 2, y - sh.height / 2 + 10)
        comp(lay, cw, x - cw.width / 2, y - cw.height / 2)



NAVY = (14, 22, 40)
INKC = (18, 22, 32)
GREY = (120, 128, 142)
LINEC = (226, 230, 236)
UPC = (22, 163, 74)
DNC = (220, 38, 38)


def _font(key, px):
    return font(key, int(px))


def _card(w, h, r=26, fill=(255, 255, 255, 250)):
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(im).rounded_rectangle([0, 0, w - 1, h - 1], r, fill=fill, outline=(220, 224, 232, 255), width=2)
    return im


def _place(lay, card, x, y, ct, mode="rise"):
    """Clean news-style entrance: quick rise + fade (or slide from the side), soft drop shadow."""
    k = smooth(seg(ct, 0, 0.38))
    if mode == "slide":
        dx, dy = -120 * (1 - k), 0
    else:
        dx, dy = 0, 46 * (1 - k)
    A = np.asarray(card.getchannel("A"), float) * k
    c2 = card.copy()
    c2.putalpha(Image.fromarray(A.astype(np.uint8)))
    sh, _ = soft_shadow(c2, 22, 70, 16)
    comp(lay, sh, x - sh.width / 2 + dx, y - sh.height / 2 + dy + 6)
    comp(lay, c2, x - card.width / 2 + dx, y - card.height / 2 + dy)


def news_clip(lay, c, ct, x, y):
    ty = c["type"]
    if ty == "breaking":
        w, h = c.get("w", 960), 150
        card = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        d = ImageDraw.Draw(card)
        kw = smooth(seg(ct, 0.05, 0.45))
        d.rounded_rectangle([0, 0, w - 1, h - 1], 20, fill=(255, 255, 255, 252), outline=(220, 224, 232, 255), width=2)
        tf = _font("mont", 30)
        tagw = int(max(200, tf.getlength(c.get("tag", "EILMELDUNG")) + 90))
        d.rounded_rectangle([0, 0, tagw, h - 1], 20, fill=DNC + (255,))
        d.rectangle([tagw - 22, 0, tagw, h - 1], fill=DNC + (255,))
        on = (ct * 2) % 1 < 0.6
        d.ellipse([28, h / 2 - 9, 46, h / 2 + 9], fill=(255, 255, 255, 255 if on else 120))
        d.text((60, h / 2 - 16), c.get("tag", "EILMELDUNG"), font=_font("mont", 30), fill=(255, 255, 255), anchor="lm")
        d.text((60, h / 2 + 22), c.get("time", ""), font=_font("montb", 22), fill=(255, 220, 220), anchor="lm")
        txt = c["text"]
        f = _font("mont", 46)
        while f.getlength(txt) > w - tagw - 60 and f.size > 24:
            f = _font("mont", f.size - 2)
        m = Image.new("L", (w, h), 0)
        ImageDraw.Draw(m).rectangle([tagw, 0, tagw + (w - tagw) * kw, h], fill=255)
        tl = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        ImageDraw.Draw(tl).text((tagw + 30, h / 2 - 14), txt, font=f, fill=INKC + (255,), anchor="lm")
        fs = _font("montb", 24)
        while fs.getlength(c.get("sub", "")) > w - tagw - 60 and fs.size > 16:
            fs = _font("montb", fs.size - 1)
        ImageDraw.Draw(tl).text((tagw + 30, h / 2 + 30), c.get("sub", ""), font=fs, fill=GREY + (255,), anchor="lm")
        tl.putalpha(Image.fromarray(np.minimum(np.asarray(tl.getchannel("A")), np.asarray(m))))
        card.alpha_composite(tl)
        _place(lay, card, x, y, ct, "slide")
    elif ty == "ticker":
        w, h = c.get("w", 900), 300
        card = _card(w, h)
        d = ImageDraw.Draw(card)
        lg = logo_img(c["logo"], 92, c.get("logo_col", "#76B900"))
        d.rounded_rectangle([36, 36, 152, 152], 24, fill=(244, 246, 249, 255))
        card.alpha_composite(lg, (48, 48))
        d.text((178, 70), c.get("name", ""), font=_font("mont", 46), fill=INKC, anchor="lm")
        d.text((178, 122), c.get("exch", ""), font=_font("montb", 26), fill=GREY, anchor="lm")
        kc = ease_out(seg(ct, c.get("count_at", 0.3), c.get("count_end", 1.1)))
        up = c.get("change", 0) >= 0
        col = UPC if up else DNC
        val = c.get("change", 0) * kc
        txt = ("+" if up else "−") + de(abs(val), 2) + " %"
        d.line([(36, 186), (w - 36, 186)], fill=LINEC, width=2)
        d.text((36, 244), txt, font=_font("mont", 86), fill=col, anchor="lm")
        tw = _font("mont", 86).getlength(txt)
        ax = 36 + tw + 40
        if up:
            d.polygon([(ax, 270), (ax + 44, 270), (ax + 22, 226)], fill=col)
        else:
            d.polygon([(ax, 226), (ax + 44, 226), (ax + 22, 270)], fill=col)
        d.text((w - 36, 222), c.get("note", ""), font=_font("montb", 26), fill=GREY, anchor="rm")
        d.text((w - 36, 262), c.get("note2", ""), font=_font("mont", 30), fill=INKC, anchor="rm")
        if ct > c.get("count_end", 1.1):
            q = seg(ct, c.get("count_end", 1.1), c.get("count_end", 1.1) + 0.5)
            d.rounded_rectangle([3, 3, w - 4, h - 4], 24, outline=col + (int(255 * (1 - q)),), width=6)
        _place(lay, card, x, y, ct)
    elif ty == "pricechart":
        w, h = c.get("w", 960), c.get("h", 760)
        dk = c.get("dark", False)
        INKC_, GREY_, GRID_ = ((236, 240, 248), (150, 162, 184), (34, 44, 68)) if dk else (INKC, GREY, (238, 240, 244))
        card = _card(w, h, fill=(10, 16, 30, 236) if dk else (255, 255, 255, 250))
        d = ImageDraw.Draw(card)
        lg = logo_img(c["logo"], 54, c.get("logo_col", "#76B900"))
        card.alpha_composite(lg, (36, 30))
        d.text((104, 58), c.get("title", ""), font=_font("mont", 38), fill=INKC_, anchor="lm")
        d.text((w - 36, 58), c.get("range", "1M"), font=_font("montb", 26), fill=GREY_, anchor="rm")
        data = c["prices"]
        vol = c.get("volume", [1] * len(data))
        lo, hi = min(data), max(data)
        pad_ = (hi - lo) * 0.12
        lo, hi = lo - pad_, hi + pad_
        x0, x1, y0, y1 = 40, w - 140, h - 200, 120
        vy0, vy1 = h - 70, h - 170
        for gi in range(5):
            gy = lerp(y0, y1, gi / 4)
            d.line([(x0, gy), (x1, gy)], fill=GRID_, width=2)
            d.text((x1 + 18, gy), de(lerp(lo, hi, gi / 4), 0) + " $", font=_font("montb", 22), fill=GREY_, anchor="lm")
        n = len(data)
        X = lambda i: lerp(x0, x1, i / (n - 1))
        Y = lambda v: lerp(y0, y1, (v - lo) / (hi - lo))
        kd = ease_in_out(seg(ct, c.get("draw_at", 0.3), c.get("draw_end", 1.8)))
        m = n * kd
        vmax = max(vol)
        for i in range(n):
            if i > m:
                break
            up = i == 0 or data[i] >= data[i - 1]
            bh = (vy0 - vy1) * vol[i] / vmax
            d.rectangle([X(i) - (x1 - x0) / n * 0.32, vy0 - bh, X(i) + (x1 - x0) / n * 0.32, vy0],
                        fill=(UPC if up else DNC) + (110,))
        pts = [(X(i), Y(v)) for i, v in enumerate(data)][:max(2, int(m) + 1)]
        if int(m) + 1 < n and int(m) >= 1:
            f_ = m - int(m)
            a_, b_ = (X(int(m)), Y(data[int(m)])), (X(int(m) + 1), Y(data[int(m) + 1]))
            pts = pts[:int(m) + 1] + [(lerp(a_[0], b_[0], f_), lerp(a_[1], b_[1], f_))]
        lc = UPC if data[-1] >= data[0] or c.get("tone") == "up" else DNC
        lc = {"up": UPC, "down": DNC}.get(c.get("tone"), lc)
        area = Image.new("RGBA", card.size, (0, 0, 0, 0))
        ImageDraw.Draw(area).polygon(pts + [(pts[-1][0], y0), (pts[0][0], y0)], fill=lc + (70,))
        g = np.clip(np.linspace(1.6, -0.2, h), 0, 1)[:, None]
        Aa = np.asarray(area.getchannel("A"), float) * g
        area.putalpha(Image.fromarray(Aa.astype(np.uint8)))
        card.alpha_composite(area)
        d = ImageDraw.Draw(card)
        d.line(pts, fill=lc, width=6, joint="curve")
        ex, ey = pts[-1]
        d.ellipse([ex - 9, ey - 9, ex + 9, ey + 9], fill=(255, 255, 255), outline=lc, width=4)
        for j, lb in enumerate(c.get("xlabels", [])):
            d.text((lerp(x0, x1, j / max(1, len(c["xlabels"]) - 1)), h - 40), lb, font=_font("montb", 22), fill=GREY_,
                   anchor="mm")
        for mk in c.get("markers", []):                    # [index, label, "up"/"down", at]
            if ct < mk[3]:
                continue
            km = ease_out_back(seg(ct, mk[3], mk[3] + 0.35), 1.6)
            i = mk[0]
            colm = {"up": UPC, "down": DNC, "gold": (232, 168, 20)}.get(mk[2], UPC)
            mx, my = X(i), Y(data[i])
            for yy in range(int(y1), int(y0), 14):
                d.line([(mx, yy), (mx, yy + 7)], fill=colm + (140,), width=2)
            f = _font("mont", 26)
            tw = f.getlength(mk[1]) + 30
            ty_ = my - 52 if mk[2] in ("up", "gold") else my + 52
            bx = min(max(mx, x0 + tw / 2), x1 - tw / 2)
            sc = max(0.05, km)
            d.rounded_rectangle([bx - tw / 2 * sc, ty_ - 22 * sc, bx + tw / 2 * sc, ty_ + 22 * sc], 22 * sc,
                                fill=colm + (255,))
            if km > 0.6:
                d.text((bx, ty_), mk[1], font=f, fill=(255, 255, 255), anchor="mm")
            d.ellipse([mx - 8, my - 8, mx + 8, my + 8], fill=colm)
        if kd > 0.98 and c.get("last"):
            d.rounded_rectangle([x1 + 6, ey - 20, w - 14, ey + 20], 8, fill=lc)
            d.text(((x1 + w - 8) / 2, ey), c["last"], font=_font("mont", 22), fill=(255, 255, 255), anchor="mm")
        _place(lay, card, x, y, ct)
    elif ty == "mcap":
        w, h = c.get("w", 900), 330
        card = _card(w, h)
        d = ImageDraw.Draw(card)
        d.text((36, 52), c.get("title", "MARKTKAPITALISIERUNG"), font=_font("montb", 26), fill=GREY, anchor="lm")
        rows = c["rows"]                                   # [label, value, num]
        vmax = max(r[2] for r in rows)
        for i, (lab, val, num) in enumerate(rows):
            yy = 120 + i * 90
            k = ease_out(seg(ct, 0.3 + i * 0.5, 1.0 + i * 0.5))
            col = UPC if i == len(rows) - 1 else (150, 158, 172)
            d.text((36, yy), lab, font=_font("montb", 28), fill=INKC, anchor="lm")
            bx0, bx1 = 200, w - 270
            d.rounded_rectangle([bx0, yy - 20, bx1, yy + 20], 20, fill=(240, 242, 246))
            if k > 0.02:
                d.rounded_rectangle([bx0, yy - 20, bx0 + (bx1 - bx0) * num / vmax * k, yy + 20], 20, fill=col)
            d.text((w - 36, yy), val, font=_font("mont", 40), fill=col if i else INKC, anchor="rm")
        if ct > 1.6 and c.get("delta"):
            kb = ease_out_back(seg(ct, 1.6, 1.95), 1.8)
            f = _font("mont", 34)
            tw = f.getlength(c["delta"]) + 40
            cx_, cy_ = w - 36 - tw / 2, h - 46
            d.rounded_rectangle([cx_ - tw / 2 * kb, cy_ - 26 * kb, cx_ + tw / 2 * kb, cy_ + 26 * kb], 26 * kb, fill=UPC)
            if kb > 0.6:
                d.text((cx_, cy_), c["delta"], font=f, fill=(255, 255, 255), anchor="mm")
        _place(lay, card, x, y, ct)
    elif ty == "vote":
        w, h = c.get("w", 860), 300
        card = _card(w, h)
        d = ImageDraw.Draw(card)
        d.text((36, 52), c.get("title", "VERWALTUNGSRAT"), font=_font("montb", 26), fill=GREY, anchor="lm")
        d.text((36, 118), c.get("text", "EINSTIMMIG"), font=_font("bebas", 96), fill=UPC, anchor="lm")
        k = ease_out(seg(ct, 0.35, 1.2))
        d.rounded_rectangle([36, 190, w - 36, 226], 18, fill=(240, 242, 246))
        d.rounded_rectangle([36, 190, 36 + (w - 72) * k, 226], 18, fill=UPC)
        d.text((36, 260), c.get("sub", ""), font=_font("montb", 26), fill=INKC, anchor="lm")
        d.text((w - 36, 260), de(100 * k) + " % dafür", font=_font("mont", 30), fill=UPC, anchor="rm")
        if k > 0.98:
            kk = ease_out_back(seg(ct, 1.2, 1.55), 2.0)
            r = 44 * kk
            d.ellipse([w - 96 - r, 96 - r, w - 96 + r, 96 + r], fill=UPC)
            if kk > 0.5:
                d.line([(w - 116, 96), (w - 100, 114), (w - 74, 80)], fill=(255, 255, 255), width=9)
        _place(lay, card, x, y, ct)
    elif ty == "dateblock":
        w, h = c.get("w", 900), 260
        card = _card(w, h)
        d = ImageDraw.Draw(card)
        d.rounded_rectangle([36, 36, 220, 224], 22, fill=(255, 255, 255), outline=(220, 224, 232), width=2)
        d.rounded_rectangle([36, 36, 220, 92], 22, fill=DNC)
        d.rectangle([36, 70, 220, 92], fill=DNC)
        d.text((128, 64), c.get("month", "DEZ"), font=_font("mont", 30), fill=(255, 255, 255), anchor="mm")
        d.text((128, 160), c.get("day", "1"), font=_font("bebas", 110), fill=INKC, anchor="mm")
        ft = _font("mont", 42)
        maxw = w - 256 - (180 if c.get("emoji") else 40)
        while ft.getlength(c.get("title", "")) > maxw and ft.size > 22:
            ft = _font("mont", ft.size - 2)
        d.text((256, 100), c.get("title", ""), font=ft, fill=INKC, anchor="lm")
        d.text((256, 160), c.get("sub", ""), font=_font("montb", 28), fill=GREY, anchor="lm")
        if c.get("emoji"):
            em = emoji_img(c["emoji"], 120)
            card.alpha_composite(em, (w - 150, 70))
        _place(lay, card, x, y, ct)


NEWS = {"breaking", "ticker", "pricechart", "mcap", "vote", "dateblock"}

CLIPS = {"bigstat", "marker", "emoji2", "chartclip"}
OVERLAYS = {"headline", "emoji", "logo", "stockchart"} | CLIPS | NEWS


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


def _cr(p0, p1, p2, p3, t):
    """Hermite segment p1->p2 with Catmull-Rom tangents clamped to the neighbouring segment lengths, so a
    long flight into a short hold never overshoots (no flying through walls)."""
    d = np.linalg.norm(p2 - p1)

    def tan(a, b, near):
        m = (b - a) / 2
        n = np.linalg.norm(m)
        lim = 1.2 * min(d, near) if near > 0 else 0.0
        return m * (lim / n) if n > lim and n > 0 else m
    m1 = tan(p0, p2, np.linalg.norm(p1 - p0))
    m2 = tan(p1, p3, np.linalg.norm(p3 - p2))
    t2, t3 = t * t, t * t * t
    return ((2 * t3 - 3 * t2 + 1) * p1 + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2 + (t3 - t2) * m2)


def path_cam(keys, t, shake=0.0):
    """Smooth camera through keyframes [{t, pos, target, fov, ease}] (Catmull-Rom, eased per segment)."""
    ts = [k["t"] for k in keys]
    if t <= ts[0]:
        i, u = 0, 0.0
    elif t >= ts[-1]:
        i, u = len(keys) - 2, 1.0
    else:
        i = max(j for j in range(len(ts) - 1) if ts[j] <= t)
        u = (t - ts[i]) / (ts[i + 1] - ts[i])
    e = keys[i + 1].get("ease", "inout")
    u = ease_in_out(u) if e == "inout" else (ease_out(u) if e == "out" else u)

    def get(name):
        P = [np.array(k[name], float) for k in keys]
        a, b = P[max(0, i - 1)], P[i]
        c, d = P[i + 1], P[min(len(P) - 1, i + 2)]
        return _cr(a, b, c, d, u)
    pos, tgt = get("pos"), get("target")
    fov = lerp(keys[i].get("fov", 50), keys[i + 1].get("fov", 50), u)
    if shake:
        pos = pos + shake * np.array([math.sin(t * 1.3) * 0.6 + math.sin(t * 3.1) * 0.25,
                                      math.sin(t * 1.7 + 1) * 0.35, 0])
        tgt = tgt + shake * np.array([math.sin(t * 0.9 + 2) * 0.5, math.sin(t * 1.1) * 0.3, 0])
    return scene3d.Camera(pos, tgt, fov)


@lru_cache(maxsize=32)
def _wash_layer(c1, c2, strength):
    xx, yy = np.meshgrid(np.linspace(0, 1, W // 4), np.linspace(0, 1, H // 4))
    a = np.exp(-(((xx - 0.05) / 0.55) ** 2 + ((yy - 0.15) / 0.45) ** 2))
    b = np.exp(-(((xx - 0.95) / 0.55) ** 2 + ((yy - 0.75) / 0.5) ** 2))
    col = (np.array(c1, float)[None, None] * a[..., None] + np.array(c2, float)[None, None] * b[..., None]) / \
        np.maximum(a + b, 1e-6)[..., None]
    al = np.clip((a + b) * strength, 0, strength)
    im = Image.fromarray(np.concatenate([col, al[..., None] * 255], 2).astype(np.uint8), "RGBA")
    return im.resize((W, H), Image.BILINEAR)


def colour_wash(bg, wash, t):
    """Soft coloured light pools over the bright set (multiply-ish tint, whites stay airy)."""
    c1 = POP.get(wash[0], wash[0]) if isinstance(wash[0], str) else tuple(wash[0])
    c2 = POP.get(wash[1], wash[1]) if isinstance(wash[1], str) else tuple(wash[1])
    lay = _wash_layer(tuple(c1), tuple(c2), float(wash[2]) if len(wash) > 2 else 0.42)
    a = np.asarray(bg.convert("RGB"), float)
    L = np.asarray(lay, float)
    al = L[..., 3:4] / 255
    tint = a * (L[..., :3] / 255)                      # multiply: colours the light greys of the set
    out = a * (1 - al) + np.clip(tint * 0.55 + L[..., :3] * 0.45, 0, 255) * al
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


@lru_cache(maxsize=8)
def _rim_kernel(r):
    return r


def light_match(sp, cfg):
    """Match the 2D panda to the set light: key from one side (a soft brightness gradient), the set's ambient
    colour in the shadows, and a coloured rim light along the silhouette on the back-light side."""
    a = np.asarray(sp, float)
    h, w = a.shape[:2]
    A = a[..., 3:4] / 255
    xx = np.linspace(0, 1, w)[None, :, None]
    side = cfg.get("key_side", 1)                              # +1 key from the right
    key = 0.82 + 0.26 * (xx if side > 0 else 1 - xx)
    amb = np.array(cfg.get("ambient", [70, 84, 120]), float)
    rgb = a[..., :3] * key
    rgb = rgb * (1 - cfg.get("ambient_mix", 0.12)) + amb * cfg.get("ambient_mix", 0.12)
    # rim: alpha edge, shifted towards the back-light side, tinted with the accent colour
    al = sp.getchannel("A")
    er = al.filter(ImageFilter.MinFilter(max(3, int(w / 90) | 1)))
    edge = np.asarray(al, float) - np.asarray(er, float)
    edge = np.asarray(Image.fromarray(np.clip(edge, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(w / 220)),
                      float) / 255
    rimside = (1 - xx[..., 0]) if side > 0 else xx[..., 0]
    rim = (edge * np.clip(rimside * 1.6 - 0.2, 0, 1))[..., None] * cfg.get("rim_strength", 0.9)
    rc = np.array(cfg.get("rim", [56, 189, 248]), float)
    rgb = rgb + (rc - rgb) * np.clip(rim, 0, 1)
    out = np.concatenate([np.clip(rgb, 0, 255), a[..., 3:4]], 2).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def cast_shadow(img, sp, fx, feet, tx, ty):
    """Long soft shadow on the floor from the feet towards (tx, ty) (screen), following the key light."""
    al = sp.getchannel("A").resize((max(1, sp.width // 3), max(1, sp.height // 3)))
    sh = Image.new("RGBA", al.size, (0, 0, 0, 0))
    blk = Image.new("RGBA", al.size, (0, 0, 0, 150))
    sh.paste(blk, (0, 0), al)
    w_, h_ = sh.size
    # map the sprite (feet at its bottom-centre) so the head lands at the shadow tip, squashed onto the floor
    src = [(0, 0), (w_, 0), (w_, h_), (0, h_)]
    dx, dy = tx - fx, ty - feet
    half = sp.width * 0.5
    dst = [(fx - half + dx, feet + dy), (fx + half + dx, feet + dy), (fx + half, feet), (fx - half, feet)]
    xs, ys = [q[0] for q in dst], [q[1] for q in dst]
    bx0, by0 = int(min(xs)), int(min(ys))
    bw, bh = int(max(xs) - bx0) + 2, int(max(ys) - by0) + 2
    if bw < 4 or bh < 4 or bw > 1.6 * W or bh > 1.2 * H:
        return                                   # degenerate projection (camera looking up / grazing): skip
    co = scene3d._perspective_coeffs(src, [(q[0] - bx0, q[1] - by0) for q in dst])
    wp = sh.transform((bw, bh), Image.PERSPECTIVE, co, Image.BILINEAR).filter(ImageFilter.GaussianBlur(8))
    comp(img, wp, bx0, by0)


@lru_cache(maxsize=4)
def _vignette(strength):
    xx, yy = np.meshgrid(np.linspace(-1, 1, W), np.linspace(-1, 1, H))
    r = np.sqrt(xx ** 2 * 1.0 + yy ** 2 * 0.7)
    return (1 - strength * np.clip(r - 0.35, 0, 1) ** 1.6)[..., None]


def film_look(img, gi, cfg):
    """Subtle film look: grade (lifted blacks, gentle S-curve), vignette, minimal chromatic aberration, grain."""
    a = np.asarray(img.convert("RGB"), float) / 255
    a = a * (1 - cfg.get("lift", 0.03)) + cfg.get("lift", 0.03) * np.array(cfg.get("lift_col", [0.1, 0.14, 0.24]))
    c = cfg.get("contrast", 0.12)
    a = a + c * (a - 0.5) * (1 - np.abs(a - 0.5) * 2) * 2
    a = a * _vignette(cfg.get("vignette", 0.35))
    ca = cfg.get("aberration", 1)
    if ca:
        a[..., 0] = np.roll(a[..., 0], ca, axis=1)
        a[..., 2] = np.roll(a[..., 2], -ca, axis=1)
    g = cfg.get("grain", 0.025)
    if g:
        rng = np.random.default_rng(gi)
        a = a + rng.normal(0, g, (H // 2, W // 2, 1)).repeat(2, 0).repeat(2, 1)
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).convert("RGBA")


SAFE_TOP = 140          # nothing above this (TikTok top UI)


def keep_off(base, lay, pbox, gap=26):
    """Composite one graphic layer onto base so it NEVER covers the panda (pbox = x0, y0, x1, y1 incl. the
    caption line above the head): slide it up above the head; if there is not enough room, also shrink it."""
    bb = lay.getbbox()
    if bb and pbox:
        x0, y0, x1, y1 = bb
        px0, py0, px1, py1 = pbox
        if x0 < px1 and x1 > px0 and y0 < py1 and y1 > py0 - gap:
            room = py0 - gap - SAFE_TOP
            h = y1 - y0
            k = min(1.0, max(0.25, room / max(h, 1)))
            crop = lay.crop(bb)
            if k < 1.0:
                crop = crop.resize((max(1, int(crop.width * k)), max(1, int(crop.height * k))), Image.LANCZOS)
            ny = int(min(y0, py0 - gap - crop.height))
            nx = int((x0 + x1) / 2 - crop.width / 2)
            base.alpha_composite(crop, (max(0, min(base.width - crop.width, nx)), max(0, ny)))
            return base
    base.alpha_composite(lay)
    return base

class Studio:
    def __init__(self, spec):
        global FPS
        FPS = spec.get("fps", 60)
        set_theme(spec.get("theme") == "dark")
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

    def panda_layer(self, img, s, lt, gi, cam=None):
        p = s.get("panda")
        if not p:
            return None
        pose = p["pose"]
        since = lt
        talk_on = p.get("talk", True)
        for sw in p.get("swap", []):
            if lt >= sw[0]:
                pose, since = sw[1], lt - sw[0]
                talk_on = sw[2] if len(sw) > 2 else talk_on
                if len(sw) > 3:
                    p = dict(p, gesture=sw[3], gesture_at=sw[0])
        t_abs = gi / FPS
        kq = int(self.mouth[min(gi, self.n - 1)]) if talk_on and pose in TALK else 0
        talk = kq / 4
        if p.get("world") and cam is not None:
            # standing in the 3D world: feet on the ground at (x, z), real size and perspective
            x, z, hm = p["world"]
            if p.get("walk_to"):
                wx, wz, a0, a1 = p["walk_to"]
                k = ease_in_out(seg(lt, a0, a1))
                x, z = lerp(x, wx, k), lerp(z, wz, k)
                walking = 0 < k < 1
            else:
                walking = False
            y0 = p.get("y0", 0.0)
            f = scene3d.project(cam, W, H, (x, y0, z))
            hd = scene3d.project(cam, W, H, (x, y0 + hm, z))
            if not f or not hd:
                return None
            fx, feet = f[0], f[1]
            hq = int(round((feet - hd[1]) / 4)) * 4
            if hq < 40 or hq > 2.4 * H:
                return None                        # too small, or the camera is right on top of the panda
            step = abs(math.sin(lt * math.pi * 2.2)) * hq * 0.025 if walking else 0.0
            if p.get("exit_at") is not None:            # leaves the frame so the key info owns the screen
                fx += 1100 * smooth(seg(lt, p["exit_at"], p["exit_at"] + 0.45)) ** 1.5 * p.get("exit_dir", 1)
            if p.get("enter_at") is not None:
                fx += 1100 * (1 - smooth(seg(lt, p["enter_at"], p["enter_at"] + 0.5))) * p.get("enter_dir", -1)
            if self.spec.get("min_head") and feet - hq < self.spec["min_head"]:
                feet += self.spec["min_head"] - (feet - hq)   # never let the head reach the info zone
            bl = (t_abs + p.get("seed", 0.0)) % 3.3 < 0.11            # blink every ~3.3 s
            sp = panda_sprite(pose, hq, kq, p.get("flip", False), bl)
            lean = 0.018 if walking else 0.0
            sp = body_motion(sp, t_abs, talk, p.get("seed", 0.0), 1.0, lean, p.get("gesture", "idle"),
                             lt - p.get("gesture_at", 0.0))
            if self.spec.get("integrate"):
                sp = light_match(sp, self.spec["integrate"])
                st_ = scene3d.get_set(s.get("set", "studio"), *s.get("set_args", []))
                # shadow cast away from the key light, contact shadow under the feet
                L = scene3d.LIGHT
                tip = scene3d.project(cam, W, H, (x - L[0] / L[1] * hm * 0.5, y0, z - L[2] / L[1] * hm * 0.5))
                if tip:
                    cast_shadow(img, sp, fx, feet, tip[0], tip[1])
                sh = shadow_sprite(max(8, int(sp.width * 0.7)))
                comp(img, sh, fx - sh.width / 2, feet - sh.height * 0.55)
                if st_.reflect:
                    refl = sp.transpose(Image.FLIP_TOP_BOTTOM)
                    g = np.linspace(st_.reflect * 0.75, 0, refl.height) ** 1.3
                    A = np.asarray(refl.getchannel("A"), float) * g[:, None]
                    refl.putalpha(Image.fromarray(A.astype(np.uint8)))
                    refl = refl.filter(ImageFilter.GaussianBlur(3))
                    comp(img, refl, fx - refl.width / 2, feet + 2)
            else:
                sh = shadow_sprite(max(8, int(sp.width * 0.8)))
                comp(img, sh, fx - sh.width / 2 + sp.width * 0.12, feet - sh.height * 0.6)
            comp(img, sp, fx - sp.width / 2, feet - hq - step - sp.info.get("lift", 0))
            self._set_pbox(sp, fx - sp.width / 2, feet - hq - step - sp.info.get("lift", 0))
            if fx + sp.width * 0.35 < 0 or fx - sp.width * 0.35 > W:
                return None                       # off screen: captions go back to their own line
            return feet - hq
        fx, fy, fh = FRAMES[p.get("frame", "medium")]
        fx, fy, fh = p.get("x", fx), p.get("y", fy), p.get("h", fh)
        dur = s["end"] - s["start"]
        z = 1 + p.get("push", 0.05) * ease_in_out(clamp(lt / max(dur, 0.01)))
        enter = p.get("enter", "pop")
        k_in, dx = 1.0, 0.0
        if enter == "pop":
            k_in = lerp(0.86, 1.0, ease_out_back(seg(lt, 0, 0.36), 1.5))
        elif enter == "slide":
            dx = -700 * (1 - smooth(seg(lt, 0, 0.55)))
        squash = 0.05 * math.sin(math.pi * min(1, since / 0.22)) if since < 0.22 and since != lt else 0.0
        h = fh * z * k_in
        hq = int(round(h * (1 - squash) / 6)) * 6
        sp = panda_sprite(pose, hq, kq, p.get("flip", False))
        sp = body_motion(sp, t_abs, talk, p.get("seed", 0.0), 1.0, 0.0, p.get("gesture", "idle"),
                         lt - p.get("gesture_at", 0.0))
        feet = fy + (fy - H * 0.5) * (z - 1) * 0.2
        if p.get("frame", "medium").startswith("wide"):
            sh = shadow_sprite(int(sp.width * 0.8))
            comp(img, sh, fx + dx - sh.width / 2 + sp.width * 0.1, feet - sh.height * 0.62)
        comp(img, sp, fx + dx - sp.width / 2, feet - hq - sp.info.get("lift", 0))
        self._set_pbox(sp, fx + dx - sp.width / 2, feet - hq - sp.info.get("lift", 0))
        return feet - hq

    def _set_pbox(self, sp, x, y):
        """Screen box the panda occupies (plus the caption word above the head): graphics must stay out of it."""
        bb = sp.getchannel("A").point(lambda a: 255 if a > 40 else 0).getbbox()
        if not bb:
            return
        x0, y0, x1, y1 = x + bb[0], y + bb[1], x + bb[2], y + bb[3]
        if x1 < 0 or x0 > W:
            return
        if self.spec.get("cap_style") == "word":
            y0 -= 34 + self.spec.get("cap_size", 46) * 1.25
        self._pbox = (x0 - 12, y0, x1 + 12, y1)

    def cam_at(self, s, t):
        if self.spec.get("campath") and not s.get("cam"):
            keys = self.spec["campath"]
            if self.spec.get("shot_cams"):
                # each shot only uses its own keys: clean cuts between zones, never a visible flight
                own = [k for k in keys if s["start"] - 1e-6 <= k["t"] < s["end"] - 1e-6]   # next shot's key excluded
                if len(own) >= 2:
                    keys = own
                t = min(max(t, s["start"]), s["end"])
            return path_cam(keys, t, self.spec.get("shake", 0.0))
        lt, dur = t - s["start"], s["end"] - s["start"]
        return _cam(s["cam"], clamp(lt / dur)) if s.get("cam") else scene3d.Camera((0, 1.6, -6), (0, 1.2, 10), 45)

    def draw_shot(self, i, t, gi):
        s = self.shots[i]
        lt = t - s["start"]
        cam = self.cam_at(s, t)
        blur = s.get("blur", 0.0)
        if self.spec.get("campath") and not s.get("cam"):
            # motion blur from camera speed (fast flights smear, slow moves stay crisp)
            c2 = self.cam_at(s, t + 1 / FPS)
            speed = float(np.linalg.norm(c2.pos - cam.pos) + 3 * np.linalg.norm(c2.target - cam.target) / 10)
            blur = max(blur, min(6.0, speed * 1.4))
        st = scene3d.get_set(s.get("set", "studio"), *s.get("set_args", []))
        if s.get("props"):
            extra = []
            for pr in s["props"]:
                pt = lt - pr.get("at", 0.0)
                if pt < 0:
                    continue
                if pr["type"] == "money":
                    extra += scene3d.money_faces(pr["pos"][0], pr["pos"][1], pt, pr.get("cols", 5), pr.get("rows", 3),
                                                 pr.get("layers", 9), pr.get("dur", 2.4))
                elif pr["type"] == "columns":
                    extra += scene3d.columns_faces(tuple(pr["pos"]), pt, pr["values"], dur=pr.get("dur", 1.4),
                                                   gap=pr.get("gap", 2.6), scale=pr.get("scale", 1.6),
                                                   glow=pr.get("glow", True))
                elif pr["type"] == "chairlights":
                    extra += scene3d.chairlight_faces(pt, pr.get("step", 0.18), tuple(pr.get("x_sides", (26.5, 33.5))),
                                                      pr.get("zs"), pr.get("glow", True), pr.get("mid", 30.0))
                elif pr["type"] == "gpu":
                    extra += scene3d.gpu_faces(tuple(pr["pos"]), pt, pr.get("explode_at", 0.3), pr.get("dur", 1.4),
                                               pr.get("yaw", -28.0), pr.get("glow", True))
            st = st.with_extra(extra)
        bg = st.render(cam, W, H, ss=1.25, blur=blur)
        if s.get("wash"):
            bg = colour_wash(bg, s["wash"], t)
        img = bg.convert("RGBA")
        vis = [c for c in s.get("cards", [])
               if not (lt < c.get("at", 0) or (c.get("until") is not None and lt > c["until"] + 0.3))]
        # pass 1: content that lives IN the 3D world (wall screens, holo panels) sits behind the panda
        for c in vis:
            ct = lt - c.get("at", 0)
            if c.get("holo"):
                self.draw_holo(img, c, ct, cam, lt)
                continue
            if c.get("screen"):
                # placed ON a surface of the 3D set (e.g. the wall screen): moves with the camera
                pts = [scene3d.project(cam, W, H, q) for q in c["screen"]]
                if all(pts):
                    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
                    sw, sh_ = c.get("w", 900), c.get("h", 560)
                    face = Image.new("RGBA", (sw, sh_), tuple(c.get("bg", (250, 251, 253))) + (255,))
                    draw_overlay(face, dict(c, x=sw / 2, y=sh_ / 2, screen=None, at=0, until=None), ct, sw / 2, sh_ / 2)
                    dst = [(p_[0], p_[1]) for p_ in pts]
                    xs, ys = [q[0] for q in dst], [q[1] for q in dst]
                    bx0, by0 = int(max(0, min(xs))), int(max(0, min(ys)))
                    bx1, by1 = int(min(W, max(xs))) + 1, int(min(H, max(ys))) + 1
                    if bx1 - bx0 > 2 and by1 - by0 > 2:
                        co = scene3d._perspective_coeffs([(0, 0), (sw, 0), (sw, sh_), (0, sh_)],
                                                         [(q[0] - bx0, q[1] - by0) for q in dst])
                        wp = face.transform((bx1 - bx0, by1 - by0), Image.PERSPECTIVE, co, Image.BICUBIC)
                        fd = smooth(seg(ct, 0, 0.35))
                        A = np.asarray(wp.getchannel("A"), float) * fd
                        wp.putalpha(Image.fromarray(A.astype(np.uint8)))
                        img.alpha_composite(wp, (bx0, by0))
        self._pbox = None
        top = self.panda_layer(img, s, lt, gi, cam)
        pbox = self._pbox
        # pass 2: screen-space graphics, each on its own layer so it can be kept off the panda
        for c in vis:
            if c.get("holo") or c.get("screen"):
                continue
            ct = lt - c.get("at", 0)
            out = img
            img = Image.new("RGBA", out.size, (0, 0, 0, 0))
            if c["type"] in OVERLAYS:
                draw_overlay(img, c, ct, c.get("x", 540), c.get("y", 520))
                img = keep_off(out, img, pbox)
                continue
            sp = render_card(c, ct)
            k = ease_out_back(seg(ct, 0, 0.42), 1.5)
            ang = (1 - smooth(seg(ct, 0, 0.5))) * c.get("spin", 70)
            sc = lerp(0.6, 1.0, k) * (1 + 0.012 * math.sin(ct * 2.2))
            if c.get("until") is not None and lt > c["until"]:
                q = seg(lt, c["until"], c["until"] + 0.3)
                sc *= 1 - 0.4 * q
                ang = -80 * q * q
            fl = math.sin(ct * 1.8 + c.get("y", 500) * 0.01) * 6
            cx, cy = c.get("x", 540), c.get("y", 520) + fl
            if c.get("anchor"):
                # call-out: a line from the card down to a point in the 3D world, with a pulsing dot
                pt = scene3d.project(cam, W, H, c["anchor"])
                if pt:
                    kl = smooth(seg(ct, 0.15, 0.55))
                    lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
                    d = ImageDraw.Draw(lay)
                    sx, sy = cx, cy + c.get("h", 220) / 2 * sc - 10
                    ex, ey = sx + (pt[0] - sx) * kl, sy + (pt[1] - sy) * kl
                    col = tuple(c.get("line_col", (255, 255, 255)))
                    d.line([(sx, sy), (ex, ey)], fill=col + (230,), width=4)
                    if kl > 0.98:
                        r = 11 + 3 * math.sin(ct * 6)
                        d.ellipse([pt[0] - r - 9, pt[1] - r - 9, pt[0] + r + 9, pt[1] + r + 9], outline=col + (120,), width=3)
                        d.ellipse([pt[0] - r * 0.6, pt[1] - r * 0.6, pt[0] + r * 0.6, pt[1] + r * 0.6], fill=col + (255,))
                    img.alpha_composite(lay)
            sp2, ox, oy = rot_y(sp, ang, sc)
            comp(img, sp2, cx - sp2.width / 2, cy - sp2.height / 2)
            img = keep_off(out, img, pbox)
        return img, top

    def word_colour(self, w):
        kw = TOK.get("keywords", {})
        lw = w.lower().strip(",.:;!?–")
        if any(ch.isdigit() for ch in lw):
            return GREEN if w.startswith("+") else (RED if w.startswith(("-", "−")) else GOLD)
        for sem, col in (("up", GREEN), ("down", RED), ("gold", GOLD)):
            if lw in kw.get(sem, []):
                return col
        return None

    def draw_holo(self, img, c, ct, cam, lt):
        """Glass hologram panel standing IN the room: perspective, gentle float, parallax, own entrance per type."""
        sp = render_card(c, ct)                              # dark glass card (theme dark)
        pos = np.array(c["holo"], float)
        wm = c.get("wm", 3.2)                                # width of the card face in metres
        pad_frac = (sp.width - c.get("w", 760)) / 2 / c.get("w", 760)
        hm = wm * sp.height / sp.width * (1 + 2 * pad_frac) / (1 + 2 * pad_frac)
        Wm = wm * (1 + 2 * pad_frac)
        Hm = Wm * sp.height / sp.width
        ty = c["type"]
        k = smooth(seg(ct, 0, 0.55))
        out = 0.0
        if c.get("until") is not None:
            out = smooth(seg(lt, c["until"], c["until"] + 0.4))
        yaw = math.radians(c.get("yaw", 0.0))
        bob = 0.06 * math.sin(ct * 1.7 + pos[0])
        sc = 1.0
        if ty in ("kpi", "logo"):                            # pop forward
            sc = lerp(0.55, 1.0, ease_out_back(seg(ct, 0, 0.5), 1.6))
        elif ty in ("versus", "metrics"):                    # slide in sideways
            pos = pos + np.array([math.cos(yaw), 0, -math.sin(yaw)]) * (1 - k) * -2.5
        elif ty == "vote":                                   # rise from below
            pos = pos + np.array([0, -1.5 * (1 - k), 0])
        elif ty == "calendar":                               # flip in; on exit the page tears off towards camera
            yaw += (1 - k) * 1.4
            if out:
                fwd = cam.target - cam.pos
                fwd = fwd / np.linalg.norm(fwd)
                pos = pos - fwd * 6.5 * out ** 1.4 + np.array([0.6 * out, 0.4 * out, 0])
                yaw += out * 0.9
        elif ty == "warn":                                   # drop + shake
            pos = pos + np.array([0.08 * math.sin(ct * 40) * math.exp(-ct * 5), 1.2 * (1 - k), 0])
        if out and ty != "calendar":
            pos = pos + np.array([0, 0.8 * out, 0])
            sc *= 1 - 0.3 * out
        r = np.array([math.cos(yaw), 0, -math.sin(yaw)]) * Wm / 2 * sc
        u = np.array([0, 1, 0]) * Hm / 2 * sc
        ctr = pos + np.array([0, bob, 0])
        corners = [ctr - r + u, ctr + r + u, ctr + r - u, ctr - r - u]
        pts = [scene3d.project(cam, W, H, q) for q in corners]
        if not all(pts):
            return
        dst = [(q[0], q[1]) for q in pts]
        xs, ys = [q[0] for q in dst], [q[1] for q in dst]
        bx0, by0 = int(max(-200, min(xs))), int(max(-200, min(ys)))
        bx1, by1 = int(min(W + 200, max(xs))) + 1, int(min(H + 200, max(ys))) + 1
        if bx1 - bx0 < 4 or by1 - by0 < 4:
            return
        co = scene3d._perspective_coeffs([(0, 0), (sp.width, 0), (sp.width, sp.height), (0, sp.height)],
                                         [(q[0] - bx0, q[1] - by0) for q in dst])
        wp = sp.transform((bx1 - bx0, by1 - by0), Image.PERSPECTIVE, co, Image.BICUBIC)
        fade = k * (1 - out) if ty != "calendar" else k * (1 - max(0.0, out - 0.6) / 0.4)
        if fade < 0.999:
            A = np.asarray(wp.getchannel("A"), float) * fade
            wp.putalpha(Image.fromarray(A.astype(np.uint8)))
        comp(img, wp, bx0, by0)
        # counters lock in with particles: green rising, red falling
        if ty == "kpi" and ct >= c.get("count_end", 1.2):
            lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
            colk = tuple(c.get("col", (34, 197, 94)))
            up = colk[1] > colk[0]
            cx_, cy_ = sum(xs) / 4, sum(ys) / 4
            q = ct - c.get("count_end", 1.2)
            if q < 1.0:
                d = ImageDraw.Draw(lay)
                rng = np.random.default_rng(3)
                for i in range(26):
                    px = cx_ + rng.uniform(-1, 1) * (max(xs) - min(xs)) * 0.5
                    py = cy_ + rng.uniform(-0.3, 0.3) * (max(ys) - min(ys)) + (-1 if up else 1) * q * rng.uniform(150, 420)
                    r_ = rng.uniform(3, 7) * (1 - q)
                    d.ellipse([px - r_, py - r_, px + r_, py + r_], fill=colk + (int(255 * (1 - q)),))
                img.alpha_composite(lay)

    def caption(self, img, t, top):
        if self.spec.get("cap_style") == "lower":
            return self.caption_lower(img, t)
        if self.spec.get("cap_style") == "word":
            return self.caption_word(img, t, top)
        return self.caption_phrase(img, t, top)

    def caption_lower(self, img, t):
        """White bold phrase in the lower third (above TikTok's bottom UI), key words coloured, soft pop-in per word."""
        cur = next((c for c in self.chunks if c[0] <= t < c[1]), None)
        if not cur:
            return
        s_, e_, ws = cur
        ink = Ink(img, affine(0, 0, 0, 1), 0, 1)
        size = self.spec.get("cap_size", 54)
        texts = [w["w"] for w in ws]
        sp = size * 0.28
        widths = [ink.text_w(x, size, "mont") for x in texts]
        total = sum(widths) + sp * (len(widths) - 1)
        if total > 960:
            size *= 960 / total
            widths = [ink.text_w(x, size, "mont") for x in texts]
            sp = size * 0.28
            total = sum(widths) + sp * (len(widths) - 1)
        y = self.spec.get("cap_y", 1470)
        x = 540 - total / 2
        lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
        li = Ink(lay, affine(0, 0, 0, 1), 0, 1)
        if self.spec.get("cap_bg"):
            kb = smooth(seg(t, s_, s_ + 0.15))
            ImageDraw.Draw(lay).rounded_rectangle([540 - total / 2 - 28, y - size * 0.82, 540 + total / 2 + 28,
                                                   y + size * 0.78], radius=size * 0.8, fill=(14, 18, 28, int(175 * kb)))
        for w, wd, tx in zip(ws, widths, texts):
            if t < w["s"] - 0.02:
                x += wd + sp
                continue
            kk = smooth(seg(t, w["s"] - 0.02, w["s"] + 0.14))
            sem = self.word_colour(tx)
            col = sem or (255, 255, 255)
            sc = lerp(0.7, 1.0, ease_out_back(kk, 1.8))
            with li.at(x + wd / 2, y + 10 * (1 - kk), 0, sc):
                li.text(2, 4, tx, size, "mont", fill=(0, 0, 0, int(150 * kk)), stroke=None)
                li.text(0, 0, tx, size, "mont", fill=col + (int(255 * kk),), stroke=(0, 0, 0, int(120 * kk)), sw=0.06)
            x += wd + sp
        img.alpha_composite(lay)

    def caption_word(self, img, t, top):
        """Reference style: the spoken word alone, small, yellow with a dark outline, above the panda."""
        cur = None
        for j, w in enumerate(self.words):
            nxt = self.words[j + 1]["s"] if j + 1 < len(self.words) else w["e"] + 0.4
            if w["s"] <= t < max(w["e"] + 0.1, min(nxt, w["s"] + 0.9)):
                cur = w
        if not cur:
            return
        ink = Ink(img, affine(0, 0, 0, 1), 0, 1)
        txt = cur["w"].upper().strip(",.:;!?–")
        if not txt:
            return
        k = 1 + 0.14 * math.exp(-(t - cur["s"]) * 14)
        y = self.spec.get("cap_y", 1020)
        if top is not None:                      # just above the panda's head, like the reference
            y = min(max(top - 34, 760), 1160)
        with ink.at(540, y, 0, k):
            ink.text(0, 0, txt, self.spec.get("cap_size", 46), "caption", fill=(255, 214, 0), stroke=(20, 20, 24), sw=0.16)

    def caption_phrase(self, img, t, top):
        """Small phrase subtitles in a soft dark pill; the spoken word lights up (karaoke), key words keep
        their semantic colour (green up, red down, gold key facts)."""
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
        a_ = int(170 * k)
        lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ImageDraw.Draw(lay).rounded_rectangle([540 - total / 2 - 26, y - size * 0.95, 540 + total / 2 + 26,
                                               y + size * 0.85], radius=size, fill=(8, 12, 22, a_))
        img.alpha_composite(lay)
        x = 540 - total / 2
        for w, wd, tx in zip(ws, widths, texts):
            on = w["s"] <= t < max(w["e"], w["s"] + 0.1)
            sem = self.word_colour(tx)
            col = sem or (255, 255, 255)
            if on and not sem:
                col = YELLOW
            if not on and sem and t < w["s"]:
                col = (255, 255, 255)
            col = tuple(int(c * k + 40 * (1 - k)) for c in col)
            sc = 1 + 0.1 * math.exp(-(t - w["s"]) * 12) if on else 1.0
            with ink.at(x + wd / 2, y, 0, sc):
                ink.text(0, 0, tx, size, "mont", fill=col, stroke=None)
            x += wd + sp

    def header(self, img):
        if self.spec.get("header_style") == "none":
            return
        ink = Ink(img, affine(0, 0, 0, 1), 0, 1)
        if self.spec.get("header_style") == "bar":
            lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
            d = ImageDraw.Draw(lay)
            y0, y1 = 150, 212
            d.rectangle([0, y0, W, y1], fill=(255, 252, 245, 225))
            d.line([(0, y1), (W, y1)], fill=(230, 226, 214, 255), width=2)
            img.alpha_composite(lay)
            ink.circle(52, (y0 + y1) / 2, 17, fill=(30, 32, 40), outline=None, wob=0)
            ink.text(52, (y0 + y1) / 2 + 1, "P", 20, "mont", fill=(255, 255, 255), stroke=None)
            ink.text(82, (y0 + y1) / 2, self.spec.get("brand", "panda_investiert"), 26, "montb", fill=(30, 32, 40),
                     stroke=None, anchor="lm")
            right = self.spec.get("header", "")
            ink.text(W - 40, (y0 + y1) / 2, right, 24, "montb", fill=(120, 124, 136), stroke=None, anchor="rm")
            if self.spec.get("header_tag"):
                tw = ink.text_w(right, 24, "montb")
                ink.text(W - 52 - tw, (y0 + y1) / 2, self.spec["header_tag"], 24, "mont", fill=(30, 32, 40), stroke=None,
                         anchor="rm")
            return
        if THEME["dark"]:
            y = TOK["space"]["safe_top"] + 22
            lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
            d = ImageDraw.Draw(lay)
            f = font("montb", 22)
            chips = [self.spec.get("brand", "PANDA_INVESTIERT")] + self.spec.get("chips", [])
            x = 48
            for j, ch in enumerate(chips):
                tw = f.getlength(ch)
                d.rounded_rectangle([x, y - 17, x + tw + 30, y + 17], 17, fill=(8, 12, 22, 170),
                                    outline=(56, 189, 248, 120) if j == 0 else (255, 255, 255, 50), width=2)
                d.text((x + 15, y), ch, font=f, fill=(255, 255, 255, 230) if j == 0 else (190, 200, 220, 230), anchor="lm")
                x += tw + 42
            img.alpha_composite(lay)
            return
        ink.rect(0, 0, W, 92, fill=(255, 255, 255), outline=None, wob=0)
        ink.rect(0, 90, W, 94, fill=(236, 236, 242), outline=None, wob=0)
        ink.circle(48, 46, 14, fill=GREEN, outline=None, wob=0)
        T(ink, 74, 47, self.spec.get("brand", "PANDA_INVESTIERT"), 28, DARK, "mont", "lm")
        T(ink, W - 36, 47, self.spec.get("header", ""), 26, TXT2, "montb", "rm")

    def vis_time(self, t):
        """Speed ramps: inside a slow-motion window visual time runs at ``f``; it then catches up smoothly."""
        for a, b, f in self.spec.get("slowmo", []):
            catch = 0.45
            lost = (b - a) * (1 - f)
            if a <= t < b:
                return a + (t - a) * f
            if b <= t < b + catch:
                u = (t - b) / catch
                return t - lost * (1 - (3 * u * u - 2 * u * u * u))
        return t

    def frame(self, gi):
        t_audio = gi / FPS
        t = self.vis_time(t_audio)
        i = self.shot_at(t)
        s = self.shots[i]
        lt = t - s["start"]
        img, top = self.draw_shot(i, t, gi)
        TD = {"wipe": 0.36, "match": 0.5, "objwipe": 0.45}.get(s.get("trans"), 0.24)
        if i > 0 and lt < TD and s.get("trans", "zoom") != "cut":
            prev, _ = self.draw_shot(i - 1, s["start"] - 1e-3, gi)
            u = lt / TD
            e = smooth(u)
            mode = s.get("trans", "zoom")
            if mode == "match":
                # match cut: zoom deep into a point of the old shot, land on the same screen point in the new one
                fxp, fyp = s.get("match_at", [540, 960])
                if u < 0.5:
                    kk = smooth(u * 2)
                    src, zo = prev, 1 + 2.2 * kk * kk
                else:
                    kk = smooth((u - 0.5) * 2)
                    src, zo = img, 2.4 - 1.4 * kk
                big = src.resize((int(W * zo), int(H * zo)), Image.BILINEAR)
                x0, y0 = int(fxp * zo - fxp), int(fyp * zo - fyp)
                x0 = min(max(0, x0), big.width - W)
                y0 = min(max(0, y0), big.height - H)
                img = big.crop((x0, y0, x0 + W, y0 + H)).filter(ImageFilter.GaussianBlur(6 * (1 - abs(2 * u - 1)) + 0.01))
            elif mode == "objwipe":
                # a dark studio wall panel slides through the frame and carries the new scene in behind it
                pw = int(W * 0.5)
                xw = int(lerp(-pw, W, smooth(u)))
                out = prev.copy()
                out.paste(img.crop((0, 0, max(0, xw), H)), (0, 0)) if xw > 0 else None
                panel = Image.new("RGBA", (pw, H), (16, 20, 34, 255))
                pd = ImageDraw.Draw(panel)
                for gx in range(0, pw, 48):
                    pd.line([(gx, 0), (gx, H)], fill=(30, 36, 56, 255), width=2)
                pd.rectangle([pw - 8, 0, pw, H], fill=(56, 189, 248, 255))
                comp(out, panel.filter(ImageFilter.BoxBlur(6)), xw - pw, 0)
                img = out
            elif mode == "zoom":
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
            elif mode == "leak":
                # warm light-leak flash: old shot burns out, new shot burns in
                src = prev if u < 0.5 else img
                a = np.asarray(src.convert("RGB"), float)
                k = 1 - abs(2 * u - 1)
                xx = np.linspace(0, 1, W)[None, :, None]
                band = np.exp(-((xx - u) / 0.35) ** 2)
                warm = np.array([255, 190, 120], float)
                a = a + (warm - a) * np.clip(band * k * 1.1, 0, 0.92)
                img = Image.fromarray(a.astype(np.uint8)).convert("RGBA")
            elif mode == "wipe":
                # diagonal bands in the brand colours sweep over, the new scene is revealed behind them
                src = prev if u < 0.5 else img
                out = src.convert("RGBA").copy()
                lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
                d = ImageDraw.Draw(lay)
                cols = [POP[k] for k in self.spec.get("wipe_cols", ["gold", "pink", "blue", "green"])]
                span = W + H * 0.6
                for j, c_ in enumerate(cols):
                    off = (u * 1.5 - j * 0.12) * (span + 600) - 600
                    bw = 260
                    d.polygon([(off, 0), (off + bw, 0), (off + bw - H * 0.6, H), (off - H * 0.6, H)], fill=c_ + (255,))
                out.alpha_composite(lay)
                img = out
            elif mode == "glitch":
                src = prev if u < 0.5 else img
                a = np.asarray(src.convert("RGB")).copy()
                k = 1 - abs(2 * u - 1)
                sh = int(26 * k)
                a[..., 0] = np.roll(a[..., 0], sh, axis=1)
                a[..., 2] = np.roll(a[..., 2], -sh, axis=1)
                rng = np.random.default_rng(int(u * 1000))
                for _ in range(int(8 * k)):
                    y0 = rng.integers(0, H - 60)
                    hh = rng.integers(8, 60)
                    a[y0:y0 + hh] = np.roll(a[y0:y0 + hh], rng.integers(-60, 60), axis=1)
                img = Image.fromarray(a).convert("RGBA")
            else:  # whip
                off = int(W * e)
                both = Image.new("RGBA", (W * 2, H))
                both.paste(prev, (0, 0))
                both.paste(img, (W, 0))
                view = both.crop((off, 0, off + W, H))
                img = view.filter(ImageFilter.BoxBlur(int(28 * (1 - abs(2 * u - 1))) + 1))
        img = self.post(img, i, t)
        if s.get("dutch"):
            ang = s["dutch"] * smooth(seg(lt, 0, 0.6))
            big = img.rotate(ang, Image.BICUBIC, expand=False)
            z_ = 1 + abs(math.sin(math.radians(ang))) * 1.9
            bw_, bh_ = int(W * z_), int(H * z_)
            big = big.resize((bw_, bh_), Image.BICUBIC)
            img = big.crop(((bw_ - W) // 2, (bh_ - H) // 2, (bw_ - W) // 2 + W, (bh_ - H) // 2 + H))
        if self.spec.get("film"):
            img = film_look(img, gi, self.spec["film"])
        self.caption(img, t_audio, top)
        self.header(img)
        return img.convert("RGB")

    def mood_at(self, i, t):
        """Lighting mood (-1 red/cool .. +1 green/warm), eased between shots."""
        val = {"up": 1.0, "down": -1.0}
        mk = self.shots[i].get("mood_keys")
        if mk:                                               # [[local t, -1..1], ...] inside one shot
            lt = t - self.shots[i]["start"]
            ts_, vs_ = zip(*mk)
            return float(np.interp(lt, ts_, vs_))
        cur = val.get(self.shots[i].get("mood"), 0.0)
        if i > 0:
            prev = val.get(self.shots[i - 1].get("mood"), 0.0)
            cur = lerp(prev, cur, smooth(seg(t, self.shots[i]["start"], self.shots[i]["start"] + 0.8)))
        return cur

    def post(self, img, i, t):
        if not self.spec.get("atmos"):
            return img
        a = np.asarray(img.convert("RGB"), float)
        m = self.mood_at(i, t)
        if abs(m) > 0.01:
            # subtle grade: lift the shadows/mids towards the mood colour, keep whites clean
            tint = np.array([60, 255, 160], float) if m > 0 else np.array([255, 70, 90], float)
            lum = a.mean(2, keepdims=True) / 255
            a = a + (tint - a) * (0.10 * abs(m)) * (1 - lum) ** 1.5
            if m < 0:
                a[..., 2] += 6 * abs(m)
        # volumetric beams from the ceiling lights (static per shot, slowly breathing)
        if self.spec.get("beams", True):
            xx = np.linspace(-1, 1, W)[None, :]
            yy = np.linspace(0, 1, H)[:, None]
            beam = np.zeros((H, W))
            for k, x0 in enumerate((-0.55, 0.05, 0.6)):
                cx = x0 + 0.18 * (yy) * (1 if k % 2 else -1)
                beam += np.exp(-((xx - cx) / (0.10 + 0.18 * yy)) ** 2) * (1 - yy) ** 1.2
            br = 0.06 + 0.015 * math.sin(t * 0.9)
            a = a + (np.array([150, 190, 255], float) - a) * np.clip(beam * br, 0, 0.3)[..., None]
        out = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")
        # floating dust particles (depth: small/dim far, big/soft near)
        lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(lay)
        rng = np.random.default_rng(7)
        for k in range(70):
            z = rng.uniform(0.2, 1.0)
            x = (rng.uniform(0, W) + t * 14 * z + math.sin(t * 0.7 + k) * 20) % W
            y = (rng.uniform(0, H) - t * 22 * z) % H
            r = 1 + 2.6 * z
            al = int(40 + 90 * z * (0.6 + 0.4 * math.sin(t * 2 + k)))
            d.ellipse([x - r, y - r, x + r, y + r], fill=(190, 220, 255, al))
        out.alpha_composite(lay.filter(ImageFilter.GaussianBlur(0.8)))
        return out


# -- sound ------------------------------------------------------------------------------------

@lru_cache(maxsize=None)
def air_whoosh(dur=1.1, f0=380.0, f1=1700.0, peak=0.55, seed=0, bright=1.0):
    """Synthesised soft air whoosh (own sound, free to use commercially): noise shaped by a band that
    glides like a passing object (doppler-ish sweep up then down), smooth swell and tail, gentle stereo-less body."""
    from scipy.signal import stft, istft
    sr = audio.SR
    n = int(dur * sr)
    rng = np.random.default_rng(seed)
    x = rng.normal(0, 1, n)
    f, tt, Z = stft(x, sr, nperseg=1024)
    u = tt / dur
    centre = np.where(u < peak, f0 + (f1 - f0) * (u / peak) ** 1.4, f1 - (f1 - f0) * 0.75 * ((u - peak) / (1 - peak)))
    width = 0.55 + 0.35 * np.sin(np.pi * np.clip(u, 0, 1))
    lf = np.log2(np.maximum(f[:, None], 20) / centre[None, :])
    mask = np.exp(-(lf / width[None, :]) ** 2) + 0.12 * bright * np.exp(-(lf - 1.6) ** 2 / 0.5)
    Z = Z * mask
    _, y = istft(Z, sr, nperseg=1024)
    y = y[:n]
    tq = np.arange(len(y)) / sr / dur
    env = np.where(tq < peak, (tq / peak) ** 2.2, np.exp(-((tq - peak) / (1 - peak)) * 3.2))
    y = y * env
    return y / (np.max(np.abs(y)) + 1e-9)


def _env(n, a, d):
    sr = audio.SR
    t = np.arange(n) / sr
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d)


@lru_cache(maxsize=None)
def synth(name):
    """Own synthesised effects (free to use commercially, documented in sfx/SOURCES.md)."""
    sr = audio.SR
    rng = np.random.default_rng(len(name))
    if name == "impact":          # deep cinematic hit: pitch-dropping sine + sub + short noise crack
        n = int(1.6 * sr)
        t = np.arange(n) / sr
        f = 30 + 60 * np.exp(-t * 7)
        body = np.sin(2 * np.pi * np.cumsum(f) / sr) * _env(n, 0.004, 0.55)
        crack = rng.normal(0, 1, n) * _env(n, 0.001, 0.035)
        from scipy.signal import butter, sosfilt
        crack = sosfilt(butter(2, [400, 4000], "bandpass", fs=sr, output="sos"), crack)
        x = body * 1.0 + crack * 0.5
    elif name in ("ping_up", "ping_down"):   # bright rising / dull falling two-tone
        n = int(0.7 * sr)
        t = np.arange(n) / sr
        if name == "ping_up":
            f = np.where(t < 0.09, 880, 1318.5)
            x = (np.sin(2 * np.pi * np.cumsum(f) / sr) + 0.3 * np.sin(4 * np.pi * np.cumsum(f) / sr)) * _env(n, 0.003, 0.22)
        else:
            f = 520 * np.exp(-t * 1.6)
            x = np.sin(2 * np.pi * np.cumsum(f) / sr) * _env(n, 0.004, 0.3)
            from scipy.signal import butter, sosfilt
            x = sosfilt(butter(2, 1400, "lowpass", fs=sr, output="sos"), x)
    elif name == "click":         # soft UI tick for numbers / logos
        n = int(0.12 * sr)
        t = np.arange(n) / sr
        x = np.sin(2 * np.pi * 2200 * t) * _env(n, 0.0008, 0.018) + 0.4 * np.sin(2 * np.pi * 3300 * t) * _env(n, 0.0005, 0.01)
    elif name == "riser2":        # filtered noise riser into the hook
        n = int(1.2 * sr)
        t = np.arange(n) / sr
        x = rng.normal(0, 1, n) * (t / t[-1]) ** 2.5
        from scipy.signal import butter, sosfilt
        x = sosfilt(butter(2, [600, 6000], "bandpass", fs=sr, output="sos"), x)
        x[-int(0.02 * sr):] *= np.linspace(1, 0, int(0.02 * sr))
    else:
        raise KeyError(name)
    return x / (np.max(np.abs(x)) + 1e-9)


def music_bed(dur, bpm=96, intensity=((0, 0.6),), seed=3):
    """Own modern cinematic-electronic bed: soft pad chords (Am-F-C-G), sub bass, a gentle kick and hats.
    ``intensity`` [(t, 0..1)] raises drums/brightness at the climaxes."""
    from scipy.signal import butter, sosfilt
    sr = audio.SR
    n = int(dur * sr)
    t = np.arange(n) / sr
    beat = 60 / bpm
    bar = beat * 4
    chords = [(57, 60, 64), (53, 57, 60), (48, 52, 55), (55, 59, 62)]   # Am F C G (MIDI)
    hz = lambda m: 440 * 2 ** ((m - 69) / 12)
    ti, iv = zip(*intensity)
    inten = np.interp(t, ti, iv)
    pad = np.zeros(n)
    bass = np.zeros(n)
    for b in range(int(dur / bar) + 1):
        ch = chords[b % 4]
        a, e = int(b * bar * sr), min(n, int((b + 1) * bar * sr))
        if a >= n:
            break
        tt = t[a:e] - b * bar
        env = np.minimum(1, tt / 0.4) * np.minimum(1, (bar - tt) / 0.3)
        for m in ch:
            for det in (-0.08, 0.08):
                pad[a:e] += np.sin(2 * np.pi * hz(m + 12) * (1 + det / 100) * tt + det) * env
        bass[a:e] += np.sin(2 * np.pi * hz(ch[0] - 12) * tt) * env
    pad = sosfilt(butter(2, 1800, "lowpass", fs=sr, output="sos"), pad) / 6
    kick = np.zeros(n)
    hats = np.zeros(n)
    rng = np.random.default_rng(seed)
    hp = butter(2, 7000, "highpass", fs=sr, output="sos")
    for k in range(int(dur / beat) + 1):
        a = int(k * beat * sr)
        if a >= n:
            break
        L = min(n - a, int(0.35 * sr))
        tt = np.arange(L) / sr
        if k % 2 == 0:
            kick[a:a + L] += np.sin(2 * np.pi * np.cumsum(45 + 90 * np.exp(-tt * 30)) / sr) * np.exp(-tt * 9)
        h2 = int(k * beat * sr + beat * sr / 2)
        if h2 < n:
            L2 = min(n - h2, int(0.06 * sr))
            hats[h2:h2 + L2] += rng.normal(0, 1, L2) * np.exp(-np.arange(L2) / sr * 60)
    hats = sosfilt(hp, hats)
    x = pad * 1.0 + bass * 0.35 + (kick * 0.55 + hats * 0.18) * np.clip(inten * 1.3 - 0.2, 0, 1)
    x *= 0.7 + 0.3 * inten
    x *= np.minimum(1, t / 0.8) * np.minimum(1, (dur - t) / 1.5)
    return x / (np.max(np.abs(x)) + 1e-9)


def _variant(name):
    from .pandanews import sample, _resample, _lowpass
    if name in ("impact", "ping_up", "ping_down", "click", "riser2"):
        return synth(name)
    if name == "air":
        return air_whoosh(1.2, 300, 1500, 0.55, 1)
    if name == "air_long":
        return air_whoosh(1.9, 220, 1300, 0.6, 2, 0.7)
    if name == "air_short":
        return air_whoosh(0.55, 600, 2600, 0.45, 3, 1.2)
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
    out = [] if spec.get("no_riser") else [(0.0, "riser", 0.5)]
    out += [tuple(c) for c in spec.get("cues", [])]          # named cue list [t, sound, gain]
    alt = ["whoosh", "swish", "whoosh_lo"]
    for k in spec.get("campath", []):
        if k.get("whoosh"):
            out.append((k["t"] + k.get("whoosh_at", 0.0), k["whoosh"], k.get("gain", 0.75)))
    for i, s in enumerate(spec["shots"]):
        st = s["start"]
        if i and s.get("trans", "zoom") != "cut" and not spec.get("cues"):
            out.append((st - 0.12, alt[i % 3], 0.85))
        if s.get("cam") and s["cam"].get("whoosh"):
            out.append((st + 0.05, "whoosh_lo", 0.6))
        p = s.get("panda") or {}
        if p.get("enter") == "slide":
            out.append((st + 0.02, "swish", 0.55))
        for sw in p.get("swap", []):
            out.append((st + sw[0], "pop", 0.35))
        for c in s.get("cards", []):
            a = st + c.get("at", 0)
            if c.get("at", 0) < 0:
                continue
            out.append((a - 0.04, "air_short", 0.4))
            out.append((a + 0.05, "pop", 0.45))
            if c.get("until") is not None:
                out.append((st + c["until"] - 0.02, "air_short", 0.3))
            if c["type"] == "coins":
                out += [(st + c.get("at", 0) + x[2], "pop", 0.5) for x in c["coins"]]
            if c["type"] == "strike" and c.get("strike_at") is not None:
                out.append((a + c["strike_at"], "swish", 0.5))
            if c["type"] == "reasons":
                out += [(a + x[1], "pop", 0.5) for x in c["items"]]
            if c["type"] == "vote":
                out += [(a + x[3] + 0.8, "pop", 0.5) for x in c.get("rows", [])]
            if c["type"] == "rule":
                out += [(a + x[3], "pop", 0.55) for x in c.get("boxes", [])]
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
    gaps = {"pop": 0.18, "cash": 1.0, "air_short": 0.2}
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
    mb = spec.get("music")
    if mb:
        from .pandanews import _active_rms as ar
        mus = music_bed(spec["duration"], mb.get("bpm", 96), tuple(map(tuple, mb.get("intensity", [[0, 0.6]]))))
        mus = mus[:n] / (ar(mus) + 1e-9) * vr * 10 ** (mb.get("rel_db", -20) / 20)
        hop = int(0.05 * audio.SR)
        venv = np.array([np.sqrt(np.mean(v[i:i + hop] ** 2)) if i < len(v) else 0 for i in range(0, n, hop)])
        speak = np.clip(venv / (vr + 1e-9) * 2.5, 0, 1)
        sm = np.convolve(speak, np.ones(6) / 6, mode="same")
        duck = 10 ** (mb.get("duck_db", -7) * np.repeat(sm, hop)[:n] / 20)
        out[:len(mus)] += mus * duck[:len(mus)]
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
    global FPS
    FPS = spec.get("fps", 60)
    out_path = Path(out_path)
    wav = out_path.with_suffix(".mix.wav")
    if spec.get("mix") == "cine":
        from .cine import mix as cine_mix
        cine_mix(spec, wav)
    else:
        mix_sfx(spec, wav)
    n = int(math.ceil(spec["duration"] * FPS))
    cmd = ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
           "-i", "-", "-i", str(wav), "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "medium", "-crf", "17",
           "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "256k", "-shortest", "-movflags", "+faststart", str(out_path)]
    if spec.get("mix") == "cine":
        cmd[cmd.index("-crf") + 1] = "20"
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    t0 = time.time()
    workers = workers or spec.get("workers") or (3 if spec.get("mix") == "cine" else mp.cpu_count())
    with mp.Pool(workers, initializer=_init, initargs=(spec,), maxtasksperchild=400) as pool:
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
