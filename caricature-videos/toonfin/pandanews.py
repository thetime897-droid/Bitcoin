"""Panda news style: clean finance graphics, every picture flies in already filled.

- Panda_investiert is the original artwork (``toonfin/panda/*.png`` full-body poses,
  ``toonfin/panda/react/*.png`` chest-up reactions, cut from the character sheets), shown
  still - one pose per picture, poses cross-fade when they change, no lip flap.
- Each picture (``panel``) arrives complete and pushes the previous one out with depth.
- Inside a picture only the reveals move: counters, growing bars, chart lines, badges,
  reaction bubbles - all with smooth easing (rendered at 60 fps).
- Sound: only a soft whoosh on picture changes (plus any explicit ``sfx`` in the plan).
- Big subtitles at the bottom without a box, spoken word highlighted.

A plan is JSON with ``style: "pandanews"`` and ``panels`` (start, end, panda, push,
elements[]). Element types are the functions in ``ELEMENTS``. An element with ``at`` <= 0
is part of the picture from the start; a later ``at`` makes it glide in.
"""
import math
import multiprocessing as mp
import random
import re
import subprocess
import sys
import time
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image

from . import audio
from .anim import clamp, lerp, seg, ease_out, ease_in_out, ease_out_back
from .ink import Ink, affine, mix, WHITE
from .render import caption_chunks
from .scenes import count_fmt, parse_num

HERE = Path(__file__).parent
DARK = (20, 22, 28)
TXT2 = (110, 114, 124)
LINE = (226, 228, 234)
SHADOW = (236, 237, 241)
GREEN = (46, 178, 84)
RED = (226, 58, 64)
GOLD = (255, 196, 0)
BLUE = (52, 120, 246)
GREYBAR = (196, 200, 208)
YELLOW = (255, 214, 0)
TONE = {"good": GREEN, "bad": RED, "dark": DARK, "blue": BLUE, "gold": (232, 160, 0)}

CX = 650  # centre of the graphics stage (right of the panda)
# frame layout; the Renderer overrides it from the plan (portrait defaults, see LANDSCAPE in the plan)
LAYOUT = dict(W=1080, H=1920, head_x=540, head_w=980, cap_x=540, cap_w=960, cap_y=1545, cap_size=76, clip_top=400)


# -- drawing helpers ---------------------------------------------------------------

def T(ink, x, y, text, size, fill=DARK, key="mont", anchor="mm"):
    ink.text(x, y, text, size, key, fill=fill, stroke=None, anchor=anchor)


def card(ink, x, y, w, h, r=30, fill=WHITE, accent=None):
    ink.rect(x - w / 2 + 6, y - h / 2 + 16, x + w / 2 + 6, y + h / 2 + 16, fill=SHADOW, outline=None, wob=0, r=r)
    ink.rect(x - w / 2, y - h / 2, x + w / 2, y + h / 2, fill=fill, outline=LINE, w=4, wob=0, r=r)
    if accent:
        ink.rect(x - w / 2 + 2, y - h / 2 + 2, x + w / 2 - 2, y - h / 2 + 16, fill=accent, outline=None, wob=0, r=8)


def pill(ink, x, y, text, size, bg, fg=WHITE, key="mont"):
    w = ink.text_w(text, size, key) + size * 1.1
    h = size * 1.55
    ink.rect(x - w / 2, y - h / 2, x + w / 2, y + h / 2, fill=bg, outline=None, wob=0, r=h / 2)
    T(ink, x, y + size * 0.04, text, size, fg, key)
    return w


def fit_size(ink, text, size, max_w, key="mont"):
    return min(size, size * max_w / max(1.0, ink.text_w(text, size, key)))


def smooth(k):
    """Quintic ease-out: fast start, long soft landing, no bounce."""
    return 1 - (1 - clamp(k)) ** 5


EXIT = 0.38


def fly(ink, x, y, t, at, frm="right", dur=0.55, dist=300, until=None):
    """Transform for an element at (x, y): glides in from ``frm`` at ``at`` (quintic ease, a touch
    of rotation that settles) and, if ``until`` is set, flies out the other way. None while hidden."""
    if t < at or (until is not None and t >= until + EXIT):
        return None
    k = smooth(seg(t, at, at + dur)) if at > 0 else 1.0
    q = seg(t, until, until + EXIT) ** 2 if until is not None and t >= until else 0.0
    if frm == "pop" or frm == "zoom":
        sc = lerp(0.6 if frm == "pop" else 0.82, 1.0, k)
        return ink.at(x - 1400 * q, y, -8 * q, max(0.01, sc))
    dx, dy = {"right": (1, 0), "left": (-1, 0), "up": (0, -1), "down": (0, 1)}[frm]
    off = dist * (1 - k)
    # leaving always whooshes out to the left, whatever direction it came from
    return ink.at(x + dx * off - 1400 * q, y + dy * off, dx * 7 * (1 - k) - 8 * q, lerp(0.9, 1.0, k))


def sparks(ink, x, y, t, t0, cols=None, r=150, n=14, life=0.7):
    """Colourful burst when a number lands: rays and dots shooting outwards and shrinking."""
    if t < t0 or t > t0 + life:
        return
    k = (t - t0) / life
    cols = cols or (GREEN, GOLD, BLUE, (255, 120, 60))
    for i in range(n):
        a = 2 * math.pi * i / n + 0.3
        c = cols[i % len(cols)]
        r0, r1 = r * (0.35 + 0.7 * smooth(k)), r * (0.55 + 0.95 * smooth(k))
        w = 10 * (1 - k)
        if w > 0.6:
            if i % 2 == 0:
                ink.line([(x + math.cos(a) * r0, y + math.sin(a) * r0), (x + math.cos(a) * r1, y + math.sin(a) * r1)],
                         c, w, wob=0)
            else:
                ink.circle(x + math.cos(a) * r1, y + math.sin(a) * r1, w * 0.9, fill=c, outline=None, wob=0)


def num(v):
    m = re.search(r"\d[\d.,]*", str(v))
    return parse_num(m.group(0)) if m else 0.0


def fly_sfx(at, land="pop"):
    return [(at - 0.05, "swish", 0.7), (at + 0.38, land, 0.8)]


# -- elements ------------------------------------------------------------------------
# Each element: draw(ink, t, e) where e is its dict from the plan; cues(e) -> [(t, sound, gain)].

def el_headline(ink, t, e):
    lines = e["text"]
    y = e.get("y", 210)
    c = fly(ink, e.get("x", LAYOUT["head_x"]), y, t, e["at"], e.get("from", "up"), 0.55, 160, until=e.get("until"))
    if not c:
        return
    with c:
        top = lines[0]
        size = fit_size(ink, top, e.get("size", 96), LAYOUT["head_w"])
        words = top.split()
        if e["at"] > 0 and len(words) > 1:
            sp = ink.text_w(" ", size, "mont")
            ws = [ink.text_w(w_, size, "mont") for w_ in words]
            xx = -(sum(ws) + sp * (len(ws) - 1)) / 2
            for j, (w_, ww) in enumerate(zip(words, ws)):
                kj = smooth(seg(t, e["at"] + 0.07 * j, e["at"] + 0.07 * j + 0.4))
                if kj > 0.01:
                    with ink.at(xx + ww / 2, 40 * (1 - kj), 0, lerp(0.85, 1.0, kj)):
                        T(ink, 0, 0, w_, size, DARK)
                xx += ww + sp
        else:
            T(ink, 0, 0, top, size, WHITE if e.get("light") else DARK)
        if len(lines) > 1:
            k = 1.0 if e["at"] <= 0 else lerp(0.8, 1.0, ease_out_back(seg(t, e["at"] + 0.1, e["at"] + 0.55), 1.2))
            if k > 0.01:
                with ink.at(0, 128, -2, k):
                    s2 = fit_size(ink, lines[1], e.get("size2", 78), LAYOUT["head_w"] - 80)
                    pill(ink, 0, 0, lines[1], s2, TONE.get(e.get("tone", "good"), GREEN))


def cues_headline(e):
    return []



def el_live(ink, t, e):
    c = fly(ink, 120, 70, t, e["at"], "left", 0.4, 300, until=e.get("until"))
    if c:
        with c:
            on = (t * 1.4) % 1 < 0.7
            ink.rect(-80, -26, 80, 26, fill=RED, outline=None, wob=0, r=26)
            ink.circle(-50, 0, 9, fill=WHITE if on else (255, 160, 160), outline=None, wob=0)
            T(ink, 12, 2, "LIVE", 30, WHITE)


def el_kpi(ink, t, e):
    x, y = e.get("x", CX), e.get("y", 720)
    w, h = e.get("w", 700), e.get("h", 330)
    c = fly(ink, x, y, t, e["at"], e.get("from", "right"), until=e.get("until"))
    if not c:
        return
    with c:
        card(ink, 0, 0, w, h, accent=TONE.get(e.get("tone", "good"), GREEN))
        T(ink, -w / 2 + 44, -h / 2 + 62, e.get("title", ""), 34, TXT2, "montb", "lm")
        k = ease_out(seg(t, e.get("count_at", e["at"] + 0.4), e.get("count_end", e["at"] + 1.6)))
        val = e["value"]
        txt = count_fmt(val, k) if e.get("count", True) else val
        col = TONE.get(e.get("tone", "good"), GREEN)
        pre = e.get("prefix", "")
        size = fit_size(ink, pre + txt, 120, w - 90)
        T(ink, -w / 2 + 44, 34, pre + txt, size, col, "mont", "lm")
        sparks(ink, -w / 2 + 44 + ink.text_w(pre + txt, size, "mont") / 2, 34, t, e.get("count_end", 1e9),
               r=size * 1.6)
        if e.get("badge") and t >= e.get("badge_at", 1e9):
            kb = lerp(0.6, 1.0, ease_out_back(seg(t, e["badge_at"], e["badge_at"] + 0.5), 1.3))
            with ink.at(w / 2 - 110, -h / 2 + 10, 6, max(0.01, kb)):
                pill(ink, 0, 0, e["badge"], 44, col)


def cues_kpi(e):
    return []



def el_bars(ink, t, e):
    x, y = e.get("x", CX), e.get("y", 760)
    w, h = e.get("w", 700), e.get("h", 620)
    c = fly(ink, x, y, t, e["at"], e.get("from", "right"), until=e.get("until"))
    if not c:
        return
    with c:
        card(ink, 0, 0, w, h, accent=TONE.get(e.get("tone", "good"), GREEN))
        T(ink, -w / 2 + 44, -h / 2 + 60, e.get("title", ""), 32, TXT2, "montb", "lm")
        items = e["items"]
        vmax = max(num(v) for _, v, _ in items) or 1
        base = h / 2 - 96
        top = -h / 2 + 150
        bw = min(170, (w - 160) / len(items) - 40)
        gap = (w - 120 - bw * len(items)) / max(1, len(items) - 1) if len(items) > 1 else 0
        for i, (lbl, v, tone) in enumerate(items):
            at = e.get("bar_at", [e["at"] + 0.4 + 0.5 * j for j in range(len(items))])[i]
            k = smooth(seg(t, at, at + 0.9))
            bh = (base - top) * num(v) / vmax * k
            bx = -w / 2 + 60 + i * (bw + gap)
            col = TONE.get(tone, GREEN) if tone else TONE.get(e.get("tone", "good"), GREEN)
            if bh > 1:
                ink.rect(bx, base - bh, bx + bw, base, fill=col, outline=None, wob=0, r=min(18, bh / 2))
                ink.rect(bx, base - bh, bx + bw * 0.42, base, fill=mix(col, WHITE, 0.22), outline=None, wob=0,
                         r=min(18, bh / 2))
            T(ink, bx + bw / 2, base + 44, lbl, 30, TXT2, "montb")
            if k > 0.6:
                T(ink, bx + bw / 2, base - bh - 40, str(v), 44, DARK)
        ink.line([(-w / 2 + 40, base), (w / 2 - 40, base)], LINE, 4, wob=0)
        if e.get("badge") and t >= e.get("badge_at", 1e9):
            kb = lerp(0.6, 1.0, ease_out_back(seg(t, e["badge_at"], e["badge_at"] + 0.5), 1.3))
            with ink.at(w / 2 - 120, -h / 2 + 140, 8, max(0.01, kb)):
                pill(ink, 0, 0, e["badge"], 54, TONE.get(e.get("tone", "good"), GREEN))
        if e.get("badge"):
            sparks(ink, w / 2 - 120, -h / 2 + 140, t, e["badge_at"], r=130)


def cues_bars(e):
    return []



def el_hbars(ink, t, e):
    x, y = e.get("x", CX), e.get("y", 1050)
    w, h = e.get("w", 700), e.get("h", 300)
    c = fly(ink, x, y, t, e["at"], e.get("from", "down"), until=e.get("until"))
    if not c:
        return
    with c:
        card(ink, 0, 0, w, h)
        T(ink, -w / 2 + 44, -h / 2 + 50, e.get("title", ""), 30, TXT2, "montb", "lm")
        items = e["items"]
        vmax = max(num(v) for _, v, _ in items) or 1
        for i, (lbl, v, tone) in enumerate(items):
            at = e["at"] + 0.4 + 0.45 * i
            k = ease_out(seg(t, at, at + 0.7))
            yy = -h / 2 + 120 + i * 92
            full = w - 265
            bw = full * num(v) / vmax * k
            T(ink, -w / 2 + 40, yy, lbl, 28, DARK, "montb", "lm")
            x0 = -w / 2 + 225
            ink.rect(x0, yy - 22, x0 + full, yy + 22, fill=(242, 243, 246), outline=None, wob=0, r=22)
            if bw > 4:
                ink.rect(x0, yy - 22, x0 + bw, yy + 22, fill=TONE.get(tone, GREYBAR) if tone else GREYBAR,
                         outline=None, wob=0, r=22)
            if k > 0.5:
                if bw > ink.text_w(str(v), 30, "mont") + 30:
                    T(ink, x0 + bw - 12, yy + 2, str(v), 30, WHITE, "mont", "rm")
                else:  # short bar: value sits right next to it
                    T(ink, x0 + bw + 12, yy + 2, str(v), 30, DARK, "mont", "lm")


def cues_hbars(e):
    return []



def el_line(ink, t, e):
    x, y = e.get("x", CX), e.get("y", 760)
    w, h = e.get("w", 700), e.get("h", 560)
    c = fly(ink, x, y, t, e["at"], e.get("from", "right"), until=e.get("until"))
    if not c:
        return
    with c:
        card(ink, 0, 0, w, h)
        T(ink, -w / 2 + 44, -h / 2 + 54, e.get("title", ""), 32, TXT2, "montb", "lm")
        pts = e["points"]
        x0, x1 = -w / 2 + 60, w / 2 - 60
        y0, y1 = h / 2 - 70, -h / 2 + 140
        for g in range(4):
            gy = lerp(y0, y1, g / 3)
            ink.line([(x0, gy), (x1, gy)], (240, 241, 244), 3, wob=0)
        P = [(lerp(x0, x1, i / (len(pts) - 1)), lerp(y0, y1, v)) for i, v in enumerate(pts)]
        k = ease_in_out(seg(t, e.get("draw_at", e["at"] + 0.4), e.get("draw_end", e["at"] + 1.8)))
        n = 1 + (len(P) - 1) * k
        shown = P[:int(n)]
        if int(n) < len(P):
            f = n - int(n)
            a, b = P[int(n) - 1], P[int(n)]
            shown.append((lerp(a[0], b[0], f), lerp(a[1], b[1], f)))
        col = TONE.get(e.get("tone", "good"), GREEN)
        if len(shown) > 1:
            ink.shape(shown + [(shown[-1][0], y0), (shown[0][0], y0)], fill=mix(col, WHITE, 0.85), outline=None, wob=0)
            ink.line(shown, col, 10, wob=0)
            hx, hy = shown[-1]
            ink.circle(hx, hy, 15, fill=col, outline=WHITE, w=5, wob=0)
        note = e.get("note")
        if note and t >= e.get("note_at", 1e9):
            kn = lerp(0.6, 1.0, ease_out_back(seg(t, e["note_at"], e["note_at"] + 0.5), 1.3))
            with ink.at(e.get("note_x", w / 2 - 150), e.get("note_y", -h / 2 + 140), -4, max(0.01, kn)):
                pill(ink, 0, 0, note, 40, col)


def cues_line(e):
    return []



def el_minichart(ink, t, e):
    x, y = e.get("x", CX), e.get("y", 600)
    w, h = e.get("w", 660), e.get("h", 250)
    c = fly(ink, x, y, t, e["at"], e.get("from", "right"), until=e.get("until"))
    if not c:
        return
    with c:
        card(ink, 0, 0, w, h)
        up = e.get("up", True)
        col = GREEN if up else RED
        T(ink, -w / 2 + 44, -h / 2 + 50, e.get("title", ""), 40, DARK, "mont", "lm")
        pts = e.get("points") or ([0.2, 0.3, 0.25, 0.45, 0.4, 0.6, 0.55, 0.8, 0.95] if up else
                                   [0.9, 0.85, 0.88, 0.7, 0.72, 0.5, 0.42, 0.25, 0.1])
        x0, x1, y0, y1 = -w / 2 + 44, w / 2 - 170, h / 2 - 34, -h / 2 + 96
        da = e.get("draw_at", max(0, e["at"]) + 0.3)
        k = ease_in_out(seg(t, da, da + 1.1))
        n = max(2, int(len(pts) * k) + 1)
        P = [(lerp(x0, x1, i / (len(pts) - 1)), lerp(y0, y1, v)) for i, v in enumerate(pts[:n])]
        ink.line(P, col, 9, wob=0)
        if k > 0.9:
            ka = smooth(seg(t, da + 0.9, da + 1.4))
            with ink.at(w / 2 - 90, 10, 0, max(0.01, ka)):
                ink.shape([(-46, 26), (0, -36), (46, 26)] if up else [(-46, -26), (0, 36), (46, -26)], fill=col,
                          outline=None, wob=0)


def cues_minichart(e):
    return []



def el_stamp(ink, t, e):
    until = e.get("until")
    if t < e["at"] or (until is not None and t >= until + EXIT):
        return
    k = seg(t, e["at"], e["at"] + 0.35)
    s = 1.0 if e["at"] <= 0 else lerp(1.5, 1.0, smooth(k))
    q = seg(t, until, until + EXIT) ** 2 if until is not None and t >= until else 0.0
    col = TONE.get(e.get("tone", "bad"), RED)
    with ink.at(e.get("x", CX) - 1200 * q, e.get("y", 700), e.get("rot", -10) - 20 * q, s):
        w = ink.text_w(e["text"], e.get("size", 70), "mont") + 70
        ink.rect(-w / 2, -60, w / 2, 60, fill=None, outline=col, w=12, wob=0.6, r=14)
        T(ink, 0, 4, e["text"], e.get("size", 70), col)
        if e.get("strike_at") and t >= e["strike_at"]:
            kk = ease_out(seg(t, e["strike_at"], e["strike_at"] + 0.25))
            ink.line([(-w / 2 - 20, 30), (-w / 2 - 20 + (w + 40) * kk, -30)], DARK, 14, wob=0.3)


def cues_stamp(e):
    return []



ICON_COL = {"cloud": BLUE, "trending-up": GREEN, "trending-down": RED, "calendar-clock": (232, 120, 0),
            "eye": DARK, "search": BLUE, "banknote": GREEN, "badge-euro": (232, 160, 0), "users": BLUE,
            "package": (196, 128, 52), "shopping-cart": DARK, "landmark": DARK, "rocket": (232, 80, 60),
            "chart-candlestick": GREEN, "chart-column-increasing": GREEN, "circle-alert": RED, "target": RED}


@lru_cache(maxsize=128)
def lucide(name, px, col):
    """Render a Lucide icon (ISC licence, toonfin/icons) to an RGBA image of px x px."""
    import cairosvg
    svg = (HERE / "icons" / f"{name}.svg").read_text()
    svg = svg.replace('stroke="currentColor"', 'stroke="#%02x%02x%02x"' % col).replace('stroke-width="2"', 'stroke-width="2.2"')
    import io
    png = cairosvg.svg2png(bytestring=svg.encode(), output_width=px, output_height=px)
    return Image.open(io.BytesIO(png)).convert("RGBA")


def icon(ink, name, s=1.0, col=DARK):
    if (HERE / "icons" / f"{name}.svg").exists():
        px = max(8, int(110 * s * ink.scale()))
        im = lucide(name, px, tuple(ICON_COL.get(name, col)))
        X, Y = ink.P(0, 0)
        ink.img.alpha_composite(im, (int(X - px / 2), int(Y - px / 2)))
        return
    with ink.at(0, 0, 0, s):
        if name == "euro":
            ink.circle(0, 0, 40, fill=GOLD, outline=DARK, w=6, wob=0)
            T(ink, 0, 3, "€", 46, DARK)
        elif name == "box":
            ink.rect(-40, -30, 40, 36, fill=(214, 170, 112), outline=DARK, w=6, wob=0, r=4)
            ink.line([(-40, -6), (40, -6)], DARK, 5, wob=0)
        elif name == "person":
            ink.circle(0, -18, 20, fill=BLUE, outline=DARK, w=6, wob=0)
            ink.shape([(-36, 40), (-30, 10), (30, 10), (36, 40)], fill=BLUE, w=6, wob=0)
        elif name == "cart":
            ink.line([(-44, -30), (-30, -30), (-18, 20), (32, 20), (42, -14), (-24, -14)], DARK, 7, wob=0)
            ink.circle(-12, 34, 8, fill=DARK, outline=None, wob=0)
            ink.circle(26, 34, 8, fill=DARK, outline=None, wob=0)
        elif name == "cloud":
            for bx, by, r in ((-34, 8, 28), (-6, -14, 36), (30, 0, 30), (6, 16, 26)):
                ink.circle(bx, by, r, fill=(120, 170, 255), outline=None, wob=0)
            ink.rect(-60, 4, 58, 40, fill=(120, 170, 255), outline=None, wob=0, r=18)
        elif name == "calendar":
            ink.rect(-46, -40, 46, 46, fill=WHITE, outline=DARK, w=6, wob=0, r=8)
            ink.rect(-46, -40, 46, -14, fill=RED, outline=DARK, w=6, wob=0, r=8)
        elif name == "eye":
            ink.ellipse(0, 0, 50, 28, fill=WHITE, outline=DARK, w=6, wob=0)
            ink.circle(0, 0, 18, fill=DARK, outline=None, wob=0)
            ink.circle(-6, -6, 6, fill=WHITE, outline=None, wob=0)
        elif name == "question":
            ink.circle(-10, -10, 52, fill=WHITE, outline=DARK, w=10, wob=0)
            ink.line([(26, 26), (66, 66)], DARK, 18, wob=0)
            T(ink, -10, -6, "?", 70, BLUE)


def el_tiles(ink, t, e):
    items = e["items"]
    x, y = e.get("x", CX), e.get("y", 800)
    cols = 2
    tw, th = 320, 190
    for i, (name, lbl) in enumerate(items):
        at = e["at"] + i * e.get("step", 0.3)
        tx = x + (i % cols - 0.5) * (tw + 30)
        ty = y + (i // cols - 0.5) * (th + 30)
        c = fly(ink, tx, ty, t, at, ["left", "right", "left", "right"][i % 4], 0.55, 220, until=e.get("until"))
        if c:
            with c:
                card(ink, 0, 0, tw, th, r=26)
                with ink.at(0, -24):
                    icon(ink, name, 0.95)
                T(ink, 0, 60, lbl, 32, DARK, "montb")


def cues_tiles(e):
    return []



def el_iconcard(ink, t, e):
    x, y = e.get("x", CX + 50), e.get("y", 760)
    w, h = e.get("w", 520), e.get("h", 420)
    c = fly(ink, x, y, t, e["at"], e.get("from", "zoom"), until=e.get("until"))
    if not c:
        return
    with c:
        card(ink, 0, 0, w, h)
        pul = 1 + 0.04 * math.sin(t * 5)
        with ink.at(0, -40, 0, pul):
            icon(ink, e["icon"], e.get("scale", 2.2))
        if e.get("label"):
            T(ink, 0, h / 2 - 70, e["label"], fit_size(ink, e["label"], 50, w - 60), e.get("color", DARK), "mont")
        if e.get("arrow"):
            k = smooth(seg(t, max(0, e["at"]) + 0.5, max(0, e["at"]) + 1.0))
            with ink.at(w / 2 - 70, -h / 2 + 80, 0, max(0.01, k)):
                ink.shape([(-34, 20), (0, -34), (34, 20)], fill=GREEN, outline=None, wob=0)


def cues_iconcard(e):
    return []



def el_range(ink, t, e):
    x, y = e.get("x", CX), e.get("y", 1040)
    w, h = e.get("w", 700), e.get("h", 340)
    c = fly(ink, x, y, t, e["at"], e.get("from", "down"), until=e.get("until"))
    if not c:
        return
    with c:
        card(ink, 0, 0, w, h)
        T(ink, -w / 2 + 44, -h / 2 + 50, e.get("title", ""), fit_size(ink, e.get("title", ""), 30, w - 90, "montb"),
          TXT2, "montb", "lm")
        x0, x1 = -w / 2 + 60, w / 2 - 60
        yy = 45
        ink.rect(x0, yy - 20, x1, yy + 20, fill=(242, 243, 246), outline=None, wob=0, r=20)
        lo, hi = e.get("lo", 0.15), e.get("hi", 0.85)
        k = ease_out(seg(t, e.get("fill_at", e["at"] + 0.4), e.get("fill_at", e["at"] + 0.4) + 0.8))
        ink.rect(lerp(x0, x1, lo), yy - 20, lerp(x0, x1, lerp(lo, hi, k)) + 1, yy + 20,
                 fill=mix(GREEN, WHITE, 0.25), outline=None, wob=0, r=20)
        T(ink, lerp(x0, x1, lo), yy + 62, e.get("lo_label", ""), 36, DARK, "mont")
        T(ink, lerp(x0, x1, hi), yy + 62, e.get("hi_label", ""), 36, DARK, "mont")
        if "marker" in e and t >= e.get("marker_at", 0):
            km = smooth(seg(t, e["marker_at"], e["marker_at"] + 1.2))
            mx = lerp(x0, x1, lerp(lo, e["marker"], km))
            ink.shape([(mx - 24, yy - 62), (mx + 24, yy - 62), (mx, yy - 26)], fill=DARK, outline=None, wob=0)
            if e.get("marker_label") and km > 0.9:
                pill(ink, mx, yy - 92, e["marker_label"], 30, GREEN)


def cues_range(e):
    return []



def ohlc(seed, n, segments, start=100.0):
    """Realistic daily candles: drift per segment, volatility clustering, gaps, wicks, volume."""
    rng = np.random.default_rng(seed)
    drift = []
    for frac, d in segments:
        drift += [d] * max(1, int(round(n * frac)))
    drift = (drift + [segments[-1][1]] * n)[:n]
    vol, c, out = 0.012, start, []
    for i in range(n):
        vol = 0.0035 + 0.86 * vol + 0.12 * abs(rng.normal(0, 0.012))
        o = c * (1 + rng.normal(0, vol * 0.25))
        r = drift[i] + rng.normal(0, vol)
        c = o * math.exp(r)
        h = max(o, c) * (1 + abs(rng.normal(0, vol * 0.55)))
        l = min(o, c) * (1 - abs(rng.normal(0, vol * 0.55)))
        v = math.exp(rng.normal(0, 0.35)) * (1 + 18 * abs(r))
        out.append((o, h, l, c, v))
    return out


def de(x, dec=2):
    return f"{x:,.{dec}f}".replace(",", "X").replace(".", ",").replace("X", ".")


@lru_cache(maxsize=16)
def _series(seed, n, segs, start, end):
    data = ohlc(seed, n, [tuple(sg) for sg in segs], start)
    k = end / data[-1][3] if end else 1.0
    return [(o * k, h * k, l * k, c * k, v) for o, h, l, c, v in data]


def el_candles(ink, t, e):
    """Trading chart card: candles drawn one by one, volume, grid + price axis, moving average,
    live price line and tag, big last price with change pill."""
    x, y = e.get("x", CX), e.get("y", 760)
    w, h = e.get("w", 720), e.get("h", 620)
    c = fly(ink, x, y, t, e["at"], e.get("from", "right"), until=e.get("until"))
    if not c:
        return
    n = e.get("n", 46)
    data = _series(e.get("seed", 7), n, tuple(tuple(sg) for sg in e.get("segments", [[1.0, 0.004]])),
                   e.get("start", 100.0), e.get("end", 0))
    ra, rb = e.get("reveal_at", max(0, e["at"]) + 0.2), e.get("reveal_end", max(0, e["at"]) + 2.4)
    prog = n * (0.12 + 0.88 * ease_in_out(seg(t, ra, rb)))
    full, frac = int(prog), prog - int(prog)
    up_col, dn_col = GREEN, RED
    with c:
        card(ink, 0, 0, w, h, r=28)
        x0, x1 = -w / 2 + 34, w / 2 - 120
        top, vol_top, bot = -h / 2 + 150, h / 2 - 120, h / 2 - 40
        lo = min(d[2] for d in data)
        hi = max(d[1] for d in data)
        pad = (hi - lo) * 0.08
        lo, hi = lo - pad, hi + pad
        Y = lambda p: lerp(vol_top - 14, top, (p - lo) / (hi - lo))
        # grid + axis labels
        for g in range(5):
            pv = lerp(lo, hi, g / 4)
            gy = Y(pv)
            ink.line([(x0, gy), (x1, gy)], (238, 239, 243), 3, wob=0)
            T(ink, x1 + 14, gy, de(pv), 24, TXT2, "montb", "lm")
        slot = (x1 - x0) / n
        bw = slot * 0.62
        vmax = max(d[4] for d in data)
        shown = []
        for i in range(min(n, full + 1)):
            o, hh, ll, cc, v = data[i]
            if i == full:  # the live candle grows from open towards its close
                if frac <= 0.02:
                    break
                cc = o + (cc - o) * smooth(frac)
                hh = max(o, cc) + (hh - max(o, data[i][3])) * frac
                ll = min(o, cc) - (min(o, data[i][3]) - ll) * frac
            col = up_col if cc >= o else dn_col
            cx = x0 + slot * (i + 0.5)
            ink.rect(cx - bw / 2, vol_top + (bot - vol_top) * (1 - v / vmax * 0.9), cx + bw / 2, bot,
                     fill=mix(col, WHITE, 0.72), outline=None, wob=0)
            ink.line([(cx, Y(hh)), (cx, Y(ll))], col, max(2.5, slot * 0.12), wob=0, cap=False)
            yb0, yb1 = sorted((Y(o), Y(cc)))
            ink.rect(cx - bw / 2, yb0, cx + bw / 2, max(yb1, yb0 + 3), fill=col, outline=None, wob=0, r=2)
            shown.append((cx, cc))
        # 10-period moving average
        if e.get("ma", True) and len(shown) > 10:
            cl = [d[3] for d in data[:len(shown)]]
            pts = [(shown[i][0], Y(sum(cl[i - 9:i + 1]) / 10)) for i in range(9, len(shown))]
            ink.line(pts, (255, 170, 0), 4, wob=0)
        if shown:
            lx, lc = shown[-1]
            first = data[0][3]
            col = up_col if lc >= first else dn_col
            ly = Y(lc)
            for k in range(int((x1 - lx) / 22)):
                xa = lx + 14 + k * 22
                ink.line([(xa, ly), (xa + 10, ly)], col, 3, wob=0, cap=False)
            ink.rect(x1 + 4, ly - 20, w / 2 - 10, ly + 20, fill=col, outline=None, wob=0, r=6)
            T(ink, (x1 + w / 2) / 2 - 3, ly + 1, de(lc), 24, WHITE, "mont")
            pul = 0.5 + 0.5 * math.sin(t * 6)
            ink.circle(lx, ly, 10 + 8 * pul, fill=mix(col, WHITE, 0.6 + 0.3 * pul), outline=None, wob=0)
            ink.circle(lx, ly, 8, fill=col, outline=WHITE, w=3, wob=0)
            # header: name, venue, live price, change
            T(ink, -w / 2 + 40, -h / 2 + 52, e.get("title", ""), 40, DARK, "mont", "lm")
            T(ink, -w / 2 + 40, -h / 2 + 96, e.get("sub", "1D · Kerzen"), 24, TXT2, "montb", "lm")
            T(ink, w / 2 - 40, -h / 2 + 54, de(lc) + e.get("unit", " €"), 44, DARK, "mont", "rm")
            ch = (lc / first - 1) * 100
            txt = ("+" if ch >= 0 else "") + de(ch) + " %"
            pw = ink.text_w(txt, 28, "mont") + 30
            ink.rect(w / 2 - 40 - pw, -h / 2 + 80, w / 2 - 40, -h / 2 + 116, fill=mix(col, WHITE, 0.85), outline=None,
                     wob=0, r=18)
            T(ink, w / 2 - 40 - pw / 2, -h / 2 + 99, txt, 28, col, "mont")
        if e.get("glow_at") is not None:
            sparks(ink, shown[-1][0] if shown else 0, Y(shown[-1][1]) if shown else 0, t, e["glow_at"], r=60, n=10)


def el_tape(ink, t, e):
    """Scrolling ticker tape across the top."""
    if t < e.get("at", 0) or (e.get("until") is not None and t >= e["until"]):
        return
    y = e.get("y", 40)
    W = LAYOUT["W"]
    ink.rect(-10, y - 30, W + 10, y + 30, fill=(244, 245, 248), outline=None, wob=0)
    ink.line([(-10, y + 30), (W + 10, y + 30)], LINE, 3, wob=0)
    items = e["items"]
    texts = []
    for it in items:
        name, val = (it.split("|") + [""])[:2]
        texts.append((name, val))
    gap = 60
    widths = [ink.text_w(nm + " ", 28, "mont") + ink.text_w(v, 28, "mont") + gap for nm, v in texts]
    total = sum(widths)
    off = (t * e.get("speed", 110)) % total
    xx = -off
    while xx < W + 10:
        for (nm, v), wd in zip(texts, widths):
            if xx + wd > -50 and xx < W + 20:
                T(ink, xx, y + 2, nm, 28, DARK, "mont", "lm")
                col = GREEN if v.startswith("+") else RED if v.startswith("-") else TXT2
                T(ink, xx + ink.text_w(nm + " ", 28, "mont"), y + 2, v, 28, col, "mont", "lm")
            xx += wd


def el_circle(ink, t, e):
    """Hand-drawn marker circle drawn around something (e.g. a key number)."""
    if t < e["at"] or (e.get("until") is not None and t >= e["until"]):
        return
    k = smooth(seg(t, e["at"], e["at"] + e.get("dur", 0.55)))
    a1 = 15 + 380 * k
    ink.arc(e["x"], e["y"], e["rx"], e["ry"], 15, a1, TONE.get(e.get("tone", "gold"), GOLD), e.get("w", 12),
            wob=0.6, rot=e.get("rot", -4))


def el_info(ink, t, e):
    """Small explainer card: icon + 'Was heißt das?' + one or two lines of plain explanation."""
    x, y = e.get("x", CX + 40), e.get("y", 1080)
    w, h = e.get("w", 640), e.get("h", 230)
    c = fly(ink, x, y, t, e["at"], e.get("from", "right"), until=e.get("until"))
    if not c:
        return
    with c:
        card(ink, 0, 0, w, h, r=26, accent=BLUE)
        with ink.at(-w / 2 + 70, -10):
            icon(ink, e.get("icon", "search"), 0.7)
        T(ink, -w / 2 + 130, -h / 2 + 62, e.get("title", "WAS HEISST DAS?"), 30, BLUE, "mont", "lm")
        for i, line in enumerate(e.get("lines", [])):
            T(ink, -w / 2 + 130, -h / 2 + 112 + i * 46, line, 32, DARK, "montb", "lm")


def el_illus(ink, t, e):
    """Big frame-filling illustration (see illus.py); local time starts at ``at``."""
    from .illus import KINDS
    c = fly(ink, e.get("x", 640), e.get("y", 800), t, e["at"], e.get("from", "right"), until=e.get("until"))
    if not c:
        return
    with c, ink.at(0, 0, 0, e.get("s", 1.0)):
        clip = e.get("clip_top", LAYOUT["clip_top"])
        if clip is None:
            KINDS[e["kind"]](ink, t - max(0, e["at"]), e)
            return
        # draw on its own layer and cut everything above the headline zone, so nothing runs into the text
        layer = Image.new("RGBA", ink.img.size, (0, 0, 0, 0))
        KINDS[e["kind"]](Ink(layer, ink.m, ink.boil, ink.ss), t - max(0, e["at"]), e)
        cy = int(clip * ink.ss)
        if cy > 0:
            layer.paste((0, 0, 0, 0), (0, 0, layer.width, min(layer.height, cy)))
        ink.img.alpha_composite(layer)


def el_breaking(ink, t, e):
    """'BREAKING NEWS' motion graphic: two red bands sweep in from both sides, the title punches in,
    alert lights pulse, then everything flies out to the left at ``until``."""
    until = e.get("until")
    if t < e.get("at", 0) or (until is not None and t >= until + EXIT):
        return
    lt = t - e.get("at", 0)
    q = seg(t, until, until + EXIT) ** 2 if until is not None and t >= until else 0.0
    y = e.get("y", 760)
    cx, W = e.get("x", LAYOUT["W"] / 2), LAYOUT["W"]
    span = W + 120
    with ink.at(-1400 * q, 0):
        # pulse rings behind
        for i in range(3):
            k = (lt * 1.4 + i / 3) % 1
            ink.circle(cx, y, 160 + 420 * k, fill=None, outline=mix(RED, WHITE, 0.55 + 0.45 * k), w=10 * (1 - k) + 1, wob=0)
        k1 = smooth(seg(lt, 0.0, 0.35))
        k2 = smooth(seg(lt, 0.08, 0.45))
        xa = -span + span * k1
        ink.shape([(xa - 60, y - 120), (xa + span, y - 120), (xa + span - 40, y - 20), (xa - 100, y - 20)],
                  fill=RED, outline=None, wob=0)
        xb = W + span - span * k2
        ink.shape([(xb + 60, y + 10), (xb - span, y + 10), (xb - span + 40, y + 110), (xb + 100, y + 110)],
                  fill=DARK, outline=None, wob=0)
        kt = ease_out_back(seg(lt, 0.3, 0.6), 1.6)
        if kt > 0.02:
            with ink.at(cx, y - 70, -3, max(0.05, kt)):
                ttl = e.get("title", "BREAKING NEWS")
                T(ink, 0, 0, ttl, fit_size(ink, ttl, 92, min(LAYOUT["W"] - 140, 2 * (LAYOUT["W"] - cx) - 100)), WHITE)
        ks = smooth(seg(lt, 0.45, 0.8))
        if ks > 0.02:
            T(ink, cx - 60 * (1 - ks), y + 60, e.get("sub", "+++ EILMELDUNG +++"), 46, mix(WHITE, DARK, 1 - ks))
        on = (lt * 3) % 1 < 0.55
        for x in (cx - 390, cx + 390):
            ink.circle(x, y - 230, 46, fill=RED if on else mix(RED, WHITE, 0.6), outline=DARK, w=6, wob=0)
            ink.rect(x - 56, y - 196, x + 56, y - 176, fill=DARK, outline=None, wob=0, r=6)
            if on:
                for a in range(6):
                    aa = math.radians(-160 + a * 28)
                    ink.line([(x + math.cos(aa) * 62, y - 230 + math.sin(aa) * 62),
                              (x + math.cos(aa) * 92, y - 230 + math.sin(aa) * 92)], RED, 7, wob=0)


ELEMENTS = {
    "headline": (el_headline, cues_headline), "live": (el_live, lambda e: []),
    "kpi": (el_kpi, cues_kpi), "bars": (el_bars, cues_bars), "hbars": (el_hbars, cues_hbars),
    "line": (el_line, cues_line), "minichart": (el_minichart, cues_minichart), "stamp": (el_stamp, cues_stamp),
    "tiles": (el_tiles, cues_tiles), "iconcard": (el_iconcard, cues_iconcard), "range": (el_range, cues_range),
    "candles": (el_candles, lambda e: []), "tape": (el_tape, lambda e: []),
    "circle": (el_circle, lambda e: []), "info": (el_info, lambda e: []), "illus": (el_illus, lambda e: []),
    "breaking": (el_breaking, lambda e: []),
}


# -- panda sprites ---------------------------------------------------------------------

# poses cut at the hips/knees fade out softly at the bottom instead of ending on a hard edge
CUT_POSES = {"daumen_hoch_gross"}


@lru_cache(maxsize=48)
def panda_img(pose, h, alpha=255):
    path = HERE / "panda" / f"{pose}.png"
    im = Image.open(path).convert("RGBA")
    im = im.resize((max(1, int(im.width * h / im.height)), int(h)), Image.LANCZOS)
    if pose in CUT_POSES:
        a = np.asarray(im.getchannel("A")).astype(np.float32)
        n = int(im.height * 0.16)
        a[-n:] *= np.linspace(1, 0, n)[:, None]
        im.putalpha(Image.fromarray(a.astype(np.uint8)))
    if alpha < 255:
        a = np.asarray(im.getchannel("A")).astype(np.float32) * alpha / 255
        im.putalpha(Image.fromarray(a.astype(np.uint8)))
    return im


def paste_panda(img, pose, x, feet_y, h, alpha=255):
    sp = panda_img(pose, int(h), int(alpha))
    img.alpha_composite(sp, (int(x - sp.width / 2), int(feet_y - sp.height)))


def comp_at(base, im, x, y):
    """alpha_composite that accepts negative / overflowing offsets."""
    x, y = int(x), int(y)
    l, t = max(0, -x), max(0, -y)
    r, b = min(im.width, base.width - x), min(im.height, base.height - y)
    if r > l and b > t:
        base.alpha_composite(im.crop((l, t, r, b)), (x + l, y + t))


# -- renderer ------------------------------------------------------------------------

INSERT_TYPES = ("card", "pill", "counter", "ring", "priceline", "swap", "timeline", "flow", "title")


def _register_inserts():
    """The sticker-style elements of inserts.py (colour cards, calculation chains, ...) work in plans too."""
    from . import inserts
    for k in INSERT_TYPES:
        ELEMENTS.setdefault(k, (inserts.ELEMENTS[k], lambda e: []))


class Renderer:
    def __init__(self, plan, ss=2):
        _register_inserts()
        self.plan, self.ss = plan, ss
        self.W, self.H, self.fps = plan["width"], plan["height"], plan["fps"]
        self.words = plan["words"]
        self.chunks = caption_chunks(self.words, dict(cap_words=plan.get("cap_words", 3),
                                                      cap_chars=plan.get("cap_chars", 18)))
        LAYOUT.update(W=self.W, H=self.H, head_x=self.W / 2, cap_x=self.W / 2)
        LAYOUT.update(plan.get("layout", {}))

    def panel_at(self, t):
        ps = self.plan["panels"]
        for i, p in enumerate(ps):
            if p["start"] <= t < p["end"]:
                return i, p
        return len(ps) - 1, ps[-1]

    def draw_panel(self, idx, lt, frame_i, heads=True, only_heads=False):
        p = self.plan["panels"][idx]
        ss = self.ss
        img = Image.new("RGBA", (self.W * ss, self.H * ss), (255, 255, 255, 0 if only_heads else 255))
        base = affine(0, 0, 0, ss)
        els = p.get("elements", [])
        order = ([] if only_heads else [e for e in els if e["type"] != "headline"]) + \
            ([e for e in els if e["type"] == "headline"] if heads else [])
        for e in order:
            at, until = e.get("at", 0), e.get("until")
            a_in = smooth(seg(lt, at, at + 0.32)) if at > 0 else 1.0
            a_out = 1 - seg(lt, until, until + EXIT * 0.9) if until is not None else 1.0
            alpha = a_in * a_out
            if alpha <= 0:
                continue
            if alpha >= 0.999:
                ELEMENTS[e["type"]][0](Ink(img, base, frame_i // 2 + idx * 17, ss), lt, e)
            else:
                # fade on its own layer so it blends in softly while it flies
                layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
                ELEMENTS[e["type"]][0](Ink(layer, base, frame_i // 2 + idx * 17, ss), lt, e)
                A = np.asarray(layer.getchannel("A")).astype(np.float32) * alpha
                layer.putalpha(Image.fromarray(A.astype(np.uint8)))
                img.alpha_composite(layer)
        return img

    def zoom_at(self, t):
        """Zoom factor and focus for global time t from plan['zooms']: [{at, hold, scale, x, y}]."""
        for zm in self.plan.get("zooms", []):
            a, h = zm["at"], zm.get("hold", 1.2)
            if a <= t < a + 0.35 + h + 0.35:
                k_in = smooth(seg(t, a, a + 0.35))
                k_out = seg(t, a + 0.35 + h, a + 0.7 + h)
                k_out = k_out * k_out * (3 - 2 * k_out)
                z = 1 + (zm.get("scale", 1.25) - 1) * k_in * (1 - k_out)
                return z, zm.get("x", LAYOUT["W"] / 2), zm.get("y", 800)
        return 1.0, 0, 0

    def pose_at(self, t):
        """(pose, previous pose, seconds since the change) for the panda at global time t."""
        seq = []
        for p in self.plan["panels"]:
            pd = p.get("panda") or {}
            if "pose" in pd:
                seq.append((p["start"], pd["pose"]))
            for at, ps in pd.get("swap", []):
                seq.append((p["start"] + at, ps))
        seq.sort()
        cur, prev, since = seq[0][1], seq[0][1], t - seq[0][0]
        for st, ps in seq:
            if st > t:
                break
            if ps != cur:
                prev, cur, since = cur, ps, t - st
        return cur, prev, since

    def draw_panda(self, img, t):
        """Panda stays on its spot across picture changes; a new pose comes in with a quick squash
        and a small hop, in between it breathes very slightly."""
        ss = self.ss
        pos = self.plan.get("panda_pos", {})
        x, y, h = pos.get("x", 225) * ss, pos.get("y", 1440) * ss, pos.get("h", 600) * ss
        cur, prev, since = self.pose_at(t)
        # pose change: a quick squash hides the swap (no see-through cross-fade), then a soft hop
        hop, squash = 0.0, 0.0
        if since < 0.6 and prev != cur:
            squash = 0.08 * math.sin(math.pi * min(1.0, since / 0.22))
            q = seg(since, 0.1, 0.6)
            hop = math.sin(math.pi * q) * 24 * ss * (1 - 0.3 * q)
        pose = prev if (prev != cur and since < 0.11) else cur
        breath = 0.006 * math.sin(t * 2 * math.pi / 3.4)
        hh = int(round(h * (1 + breath - squash) / 8)) * 8
        sp = panda_img(pose, hh)
        comp_at(img, sp, x - sp.width / 2, y - hh - hop)

    def frame(self, i):
        t = i / self.fps
        idx, p = self.panel_at(t)
        lt = t - p["start"]
        dur = p.get("push_dur", 0.6)
        z, fx_, fy_ = self.zoom_at(t)
        zooming = z > 1.0005 and not (idx > 0 and lt < dur)
        img = self.draw_panel(idx, lt, i, heads=not zooming)
        if idx > 0 and lt < dur:
            # the new picture glides in complete; the old one drifts back and softly fades
            prev = self.plan["panels"][idx - 1]
            pimg = self.draw_panel(idx - 1, prev["end"] - prev["start"], i)
            u = lt / dur
            e = 1 - (1 - u) ** 4
            mode = p.get("push", "right")
            Wp, Hp = img.size
            dx, dy = {"right": (1, 0), "left": (-1, 0), "up": (0, -1), "down": (0, 1)}[mode]
            comp = Image.new("RGBA", img.size, (255, 255, 255, 255))
            s_ = 1 - 0.06 * e
            small = pimg.resize((int(Wp * s_), int(Hp * s_)), Image.BILINEAR)
            ox_o = int(-dx * Wp * 0.28 * e + (Wp - small.width) / 2)
            oy_o = int(-dy * Hp * 0.28 * e + (Hp - small.height) / 2)
            A = np.asarray(small.getchannel("A")).astype(np.float32) * (1 - 0.85 * e)
            small.putalpha(Image.fromarray(A.astype(np.uint8)))
            comp_at(comp, small, ox_o, oy_o)
            ox, oy = int(dx * Wp * (1 - e)), int(dy * Hp * (1 - e))
            shadow = Image.new("RGBA", (Wp, Hp), (20, 22, 28, int(28 * (1 - e))))
            comp_at(comp, shadow, ox + dx * 14 * self.ss, oy + dy * 14 * self.ss)
            # motion blur: average a few copies along the direction of travel, strongest mid-move
            speed = 4 * (1 - u) ** 3 / dur * Wp / self.fps
            taps = 4 if speed > 6 * self.ss else 1
            if taps > 1:
                acc = np.zeros((Hp, Wp, 4), np.float32)
                for k_ in range(taps):
                    sh = int(-dx * speed * k_ / taps * 0.8)
                    lay = comp.copy()
                    lay.paste(img, (ox + sh, oy))
                    acc += np.asarray(lay, np.float32)
                comp = Image.fromarray((acc / taps).astype(np.uint8), "RGBA")
            else:
                comp.paste(img, (ox, oy))
            img = comp
        if zooming:
            # punch-in on the graphics only; headline, panda and captions stay exactly where they are.
            # The zoom grows the content around its own centre and is capped so the enlarged content
            # always stays inside the free stage (never into the panda, the headline or the captions).
            ss = self.ss
            Wp, Hp = img.size
            a = np.asarray(img.convert("L"))
            ys, xs = np.nonzero(a < 248)
            if len(xs):
                bx0, bx1, by0, by1 = xs.min(), xs.max(), ys.min(), ys.max()
                st = self.plan.get("stage", LAYOUT.get("stage", [455, 400, 1066, 1465]))
                X0, Y0, X1, Y1 = (v * ss for v in st)
                cx, cy = (bx0 + bx1) / 2, (by0 + by1) / 2
                cx = min(max(cx, X0 + 1), X1 - 1)
                cy = min(max(cy, Y0 + 1), Y1 - 1)
                lim = [z]
                if bx0 < cx: lim.append((cx - X0) / (cx - bx0))
                if bx1 > cx: lim.append((X1 - cx) / (bx1 - cx))
                if by0 < cy: lim.append((cy - Y0) / (cy - by0))
                if by1 > cy: lim.append((Y1 - cy) / (by1 - cy))
                ze = max(1.0, min(lim))
                if ze > 1.002:
                    l, t_ = cx - cx / ze, cy - cy / ze
                    img = img.resize((Wp, Hp), Image.BICUBIC, box=(l, t_, l + Wp / ze, t_ + Hp / ze))
            img.alpha_composite(self.draw_panel(idx, lt, i, only_heads=True))
        self.draw_panda(img, t)
        self._captions(img, t, i)
        img = img.convert("RGB")
        if self.ss != 1:
            img = img.reduce(self.ss)
        return img

    def _captions(self, img, t, i):
        cur = next(((s, e, c) for s, e, c in self.chunks if s <= t < e), None)
        if not cur:
            return
        s_, e_, c = cur
        ov = Ink(img, affine(0, 0, 0, self.ss), i, self.ss)
        size = self.plan.get("cap_size", LAYOUT["cap_size"])
        words = [self.words[j] for j in c]
        texts = [w["w"].upper().strip(",;:") for w in words]
        space = size * 0.32
        widths = [ov.text_w(tx, size, "mont") for tx in texts]
        lines, line, lw = [], [], 0.0
        for j, wd in enumerate(widths):
            if line and lw + space + wd > LAYOUT["cap_w"]:
                lines.append(line)
                line, lw = [], 0.0
            lw += (space if line else 0) + wd
            line.append(j)
        lines.append(line)
        k = 0.92 + 0.08 * smooth(seg(t, s_, s_ + 0.18))
        y0 = self.plan.get("cap_y", LAYOUT["cap_y"]) - (len(lines) - 1) * size * 0.6
        with ov.at(LAYOUT["cap_x"], y0, 0, k):
            for li, ln in enumerate(lines):
                total = sum(widths[j] for j in ln) + space * (len(ln) - 1)
                x = -total / 2
                for j in ln:
                    w = words[j]
                    active = w["s"] <= t < max(w["e"], w["s"] + 0.08)
                    sc = 1 + 0.08 * math.exp(-(t - w["s"]) * 9) if active else 1.0
                    with ov.at(x + widths[j] / 2, li * size * 1.15, 0, sc):
                        ov.text(0, 0, texts[j], size, "mont", fill=YELLOW if active else WHITE, stroke=DARK, sw=0.17)
                    x += widths[j] + space


# -- sound -------------------------------------------------------------------------------

SOUNDS = {"whoosh": "whoosh", "pop": "pop", "cash": "cash", "riser": "riser", "crack": "crack", "bell": "bell",
          "shimmer": "drum_splash_soft"}
# minimum gap between two hits of the same sound, so it never turns into sound-engineering
# per-sound trims so every effect feels equally loud next to the voice (riser and long cash register sit lower)
SFX_TRIM = {"riser": 0.6, "cash": 0.88, "shimmer": 0.8, "crack": 0.9, "bell": 0.85, "whoosh": 1.0, "pop": 1.0}
MIN_GAP = {"whoosh": 0.9, "pop": 0.3, "cash": 1.2, "crack": 1.0, "bell": 1.0, "shimmer": 1.5, "riser": 3.0}


def _custom(name):
    for ext in ("wav", "mp3", "flac", "ogg"):
        f = HERE / "sfx" / "custom" / f"{name}.{ext}"
        if f.exists():
            x = audio.load(f)
            return x / (np.max(np.abs(x)) + 1e-9)
    return None


def _lowpass(x, cutoff):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / audio.SR)
    X *= 1 / (1 + (f / cutoff) ** 4)
    return np.fft.irfft(X, len(x))


def _resample(x, ratio):
    """Play back at ``ratio`` speed (pitch shifts with it)."""
    idx = np.arange(0, len(x) - 1, ratio)
    return np.interp(idx, np.arange(len(x)), x)


@lru_cache(maxsize=None)
def sample(name):
    c = _custom(name)
    if c is not None:
        return c
    if name == "whoosh":
        # real CC0 air recording (qubodup, freesound 60009 via Sonic Pi), plus the same take a fifth
        # lower underneath for body, gentle top roll-off so it sounds airy, not hissy
        x = audio.load(HERE / "sfx" / "perc_swash.flac")
        x = x / (np.max(np.abs(x)) + 1e-9)
        body = _resample(x, 0.66)
        out = np.zeros(len(body) + 200)
        out[:len(body)] += 0.55 * body
        out[120:120 + len(x)] += x
        out = _lowpass(out, 7500)
        n = len(out)
        out *= np.minimum(1, np.arange(n) / (0.02 * audio.SR)) * np.minimum(1, (n - np.arange(n)) / (0.08 * audio.SR))
        return out / (np.max(np.abs(out)) + 1e-9)
    if name == "pop":
        # real finger-on-drumhead hit (CC0) with a short rising bubble resonance: a round, clean pop
        x = audio.load(HERE / "sfx" / "tabla_ke1.flac")
        x = _resample(x / (np.max(np.abs(x)) + 1e-9), 1.25)
        n = int(0.075 * audio.SR)
        t = np.arange(n) / audio.SR
        f = 380 + 900 * (t / t[-1]) ** 0.6
        blip = np.sin(2 * np.pi * np.cumsum(f) / audio.SR) * np.exp(-t * 55)
        out = np.zeros(max(n, len(x)))
        out[:len(x)] += 0.7 * x
        out[:n] += 0.8 * blip
        out = _lowpass(out, 9000)
        return out / (np.max(np.abs(out)) + 1e-9)
    if name == "cash":
        x = audio.load(HERE / "sfx" / "perc_till.flac")
        return x / (np.max(np.abs(x)) + 1e-9)
    if name == "crack":
        x = audio.load(HERE / "sfx" / "perc_snap2.flac")
        return x / (np.max(np.abs(x)) + 1e-9)
    if name == "bell":
        x = audio.load(HERE / "sfx" / "perc_bell.flac")
        x = x[:int(1.4 * audio.SR)]
        x *= np.linspace(1, 0, len(x)) ** 1.5
        return x / (np.max(np.abs(x)) + 1e-9)
    if name == "riser":
        x = audio.load(HERE / "sfx" / "drum_cymbal_open.flac")[::-1].copy()
        x = x[-int(1.6 * audio.SR):]
        x *= np.linspace(0, 1, len(x)) ** 2
        return x / (np.max(np.abs(x)) + 1e-9)
    x = audio.load(HERE / "sfx" / f"{name}.flac")
    return x / (np.max(np.abs(x)) + 1e-9)


MONEY_RE = re.compile(r"[€$]|mrd|mio|euro|dollar", re.I)


def cues(plan):
    """One consistent whoosh for page changes and fly-ins/outs, a clean pop when a figure or badge
    appears, the cash register when a money amount lands. Nothing else."""
    out = []
    for i, p in enumerate(plan["panels"]):
        st = p["start"]
        if i and p.get("whoosh", True):
            out.append((st - 0.08, "whoosh", 0.8))
        for e in p.get("elements", []):
            at, ty = e.get("at", 0), e["type"]
            big = ty in ("illus", "candles", "bars", "kpi", "line", "iconcard", "info", "hbars", "range", "tiles")
            if at > 0 and big:
                out.append((st + at - 0.05, "whoosh", 0.38))
            if e.get("until") is not None and big:
                out.append((st + e["until"] - 0.03, "whoosh", 0.38))
            money = bool(MONEY_RE.search(" ".join(str(e.get(k, "")) for k in ("value", "title", "lo_label"))))
            if ty == "kpi" and e.get("count", True):
                out.append((st + e.get("count_end", at + 1.6) - 0.03, "cash" if money else "pop", 0.5 if money else 0.6))
            if ty == "bars":
                ats = e.get("bar_at") or [at + 0.4 + 0.5 * j for j in range(len(e["items"]))]
                out.append((st + ats[-1] + 0.55, "cash" if money else "pop", 0.45 if money else 0.55))
            if ty == "range" and e.get("cash"):
                out.append((st + e.get("fill_at", at + 0.4) + 0.75, "cash", 0.45))
            for key in ("badge_at", "note_at"):
                if e.get(key) is not None:
                    out.append((st + e[key] + 0.02, "pop", 0.65))
            if ty == "range" and "marker" in e:
                out.append((st + e["marker_at"] + 1.0, "pop", 0.6))
            if ty == "stamp":
                out.append((st + at + 0.12, "pop", 0.7))
            if ty == "circle":
                out.append((st + at + 0.5, "pop", 0.45))
            if ty == "illus":
                k = e["kind"]
                if k == "trophy":
                    out.append((st + at + e.get("count_end", 2.0), "cash", 0.5))
                if k == "tombstone":
                    out.append((st + at + e.get("crack_at", 0.7), "crack", 0.55))
                    out.append((st + at + e.get("burst_at", 1.5), "shimmer", 0.35))
                if k == "calendar":
                    out.append((st + at + e.get("circle_at", 0.5) + 0.3, "bell", 0.35))
                if k == "target":
                    out.append((st + at + e.get("hit_at", 0.6), "pop", 0.7))
                if k == "gauge":
                    out.append((st + at + e.get("settle", 1.3), "pop", 0.65))
                if k == "car":
                    out.append((st + at + 0.05, "whoosh", 0.5))
                if k == "stack":
                    out.append((st + at + e.get("build", 2.4), "pop", 0.6))
            if ty in INSERT_TYPES:
                from . import inserts
                e2 = dict(e, sfx=[])
                out += [(st + a, n, g) for a, n, g in inserts.cues({"elements": [e2]})]
            out += [(st + a, n, g) for a, n, g in e.get("sfx", [])]
        out += [(st + a, n, g) for a, n, g in p.get("sfx", [])]
    for zm in plan.get("zooms", []):
        out.append((zm["at"] - 0.05, "whoosh", 0.6))
        out.append((zm["at"] + 0.35 + zm.get("hold", 1.2) - 0.05, "whoosh", 0.45))
    return sorted(out)


def _active_rms(x, win=0.05, top=None):
    """RMS over the loud part of a signal (frames within 20 dB of its peak frame)."""
    f = max(1, int(win * audio.SR))
    m = len(x) // f
    if m == 0:
        return float(np.sqrt(np.mean(x * x)) + 1e-9)
    r = np.sqrt(np.mean(x[:m * f].reshape(m, f) ** 2, axis=1))
    if top:
        return float(np.mean(np.sort(r)[-top:]) + 1e-9)
    return float(np.sqrt(np.mean(r[r > r.max() * 0.1] ** 2)) + 1e-9)


def music_bed(path, duration, voice, env, fps, rel_db=-17.0, duck_db=-5.0, fade_in=0.6, fade_out=2.0):
    """Background music under the voice: level set relative to the voice, ducked further while speaking,
    soft fades. Loops if the track is shorter than the video."""
    m = audio.load(path)
    n = int(duration * audio.SR)
    if len(m) < n:
        m = np.concatenate([m] * int(np.ceil(n / max(1, len(m)))))
    m = m[:n]
    m = m / (_active_rms(m) + 1e-9) * _active_rms(voice) * 10 ** (rel_db / 20)
    d = np.interp(np.arange(n) / audio.SR * fps, np.arange(len(env)), env) if len(env) else np.zeros(n)
    d = np.convolve(np.clip(d * 2.5, 0, 1), np.ones(int(0.25 * audio.SR)) / int(0.25 * audio.SR), mode="same")
    m *= 10 ** (duck_db * d / 20)
    t = np.arange(n) / audio.SR
    m *= np.clip(t / fade_in, 0, 1) * np.clip((duration - t) / fade_out, 0, 1)
    return m


def mix_audio(voice, duration, cue_list, env, fps, master=0.3, sfx_rel=None, music=None):
    n = int(duration * audio.SR)
    out = np.zeros(n)
    v = audio.normalize(voice)[:n]
    out[:len(v)] += v
    if music:
        out += music_bed(music["file"], duration, v, env, fps, music.get("rel_db", -17.0), music.get("duck_db", -5.0))
    duck = np.interp(np.arange(n) / audio.SR * fps, np.arange(len(env)), env) if len(env) else np.zeros(n)
    rng = random.Random(4)
    fx = np.zeros(n)
    v_rms = _active_rms(v)
    last = {}
    for t, name, gain in cue_list:
        if t - last.get(name, -99) < MIN_GAP.get(name, 0.2):
            continue
        last[name] = t
        s = sample(SOUNDS.get(name, name))
        if sfx_rel:
            # every effect at a fixed loudness relative to the voice (e.g. 0.75 = 25 % below), gain only trims
            s = s / _active_rms(s, top=1) * sfx_rel * v_rms * SFX_TRIM.get(name, 1.0) * min(1.0, gain / 0.6) / max(gain, 1e-3)
        a = int(max(0, t) * audio.SR)
        if a >= n:
            continue
        e = min(n, a + len(s))
        fx[a:e] += gain * rng.uniform(0.85, 1.05) * s[:e - a]
    if sfx_rel:
        fx *= 1.0
    else:
        fx *= master * (1 - 0.35 * np.clip(duck, 0, 1))
    out += fx
    peak = np.max(np.abs(out)) + 1e-9
    if peak > 0.95:
        out = out * (0.95 / peak)  # linear trim instead of soft-clipping, keeps the voice clean
    return out


def master_wav(wav, lufs, tp=-1.5):
    """Two-pass *linear* loudness normalisation: one clean gain change, no compressor, no limiter
    (stacked compression lifted room noise and squashed the voice). A gentle peak limiter only acts
    if the gain would push peaks above the true-peak target."""
    import json as _json
    r = subprocess.run(["ffmpeg", "-v", "info", "-i", str(wav), "-af", f"loudnorm=I={lufs}:TP={tp}:LRA=11:print_format=json",
                        "-f", "null", "-"], capture_output=True, text=True).stderr
    m = _json.loads(r[r.rindex("{"):r.rindex("}") + 1])
    gain = lufs - float(m["input_i"])
    peak_after = float(m["input_tp"]) + gain
    chain = f"volume={gain:.2f}dB"
    if peak_after > tp:
        chain += f",alimiter=limit={10 ** (tp / 20):.3f}:attack=5:release=60:level=disabled"
    out = Path(wav).with_suffix(".master.wav")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(wav), "-af", chain, "-ar", str(audio.SR), str(out)], check=True)
    out.replace(wav)


_R = None


def _init(plan, ss):
    global _R
    _R = Renderer(plan, ss)


def _work(i):
    return _R.frame(i).tobytes()


def render(plan, out_path, ss=2, workers=None, log=print):
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fps, dur = plan["fps"], plan["duration"]
    n = int(math.ceil(dur * fps))
    voice = audio.load(plan["audio"])
    env = audio.envelope(voice, fps, n)
    wav = out_path.with_suffix(".mix.wav")
    audio.save(wav, mix_audio(voice, dur, cues(plan), env, fps, sfx_rel=plan.get("sfx_rel"), music=plan.get("music_bed")))
    if plan.get("master_lufs"):
        master_wav(wav, plan["master_lufs"])
    cmd = ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{plan['width']}x{plan['height']}",
           "-r", str(fps), "-i", "-", "-i", str(wav), "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "medium",
           "-crf", "18", "-tune", "animation", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest",
           "-movflags", "+faststart", str(out_path)]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    t0 = time.time()
    with mp.Pool(workers or mp.cpu_count(), initializer=_init, initargs=(plan, ss)) as pool:
        for k, buf in enumerate(pool.imap(_work, range(n), chunksize=4)):
            proc.stdin.write(buf)
            if k % (fps * 10) == 0:
                log(f"  frame {k}/{n} ({time.time() - t0:.0f}s)")
    proc.stdin.close()
    if proc.wait() != 0:
        sys.exit("ffmpeg failed")
    wav.unlink(missing_ok=True)
    log(f"  wrote {out_path} ({n} frames in {time.time() - t0:.0f}s)")
