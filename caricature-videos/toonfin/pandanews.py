"""Panda news style: clean finance graphics on white, every picture flies in.

- Panda_investiert is the original artwork (``toonfin/panda/*.png``, the HD poses from
  the character sheet), shown as a still image - one pose per picture, no lip flap.
- Each picture (``panel``) flies in and pushes the previous one out (right, left, up, or
  out of the depth), with a whoosh.
- Inside a picture the elements fly in one by one: headline, KPI cards with counters,
  bar charts, line charts, ranges, stamps - each with its own sound (swish, pop, ping,
  cash register, impact).
- Big subtitles at the bottom without a box, spoken word highlighted.

A plan is JSON with ``style: "pandanews"`` and ``panels`` (start, end, panda, push,
elements[]). Element types are the functions in ``ELEMENTS``.
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


# -- drawing helpers ---------------------------------------------------------------

def T(ink, x, y, text, size, fill=DARK, key="mont", anchor="mm"):
    ink.text(x, y, text, size, key, fill=fill, stroke=None, anchor=anchor)


def card(ink, x, y, w, h, r=30, fill=WHITE):
    ink.rect(x - w / 2 + 6, y - h / 2 + 16, x + w / 2 + 6, y + h / 2 + 16, fill=SHADOW, outline=None, wob=0, r=r)
    ink.rect(x - w / 2, y - h / 2, x + w / 2, y + h / 2, fill=fill, outline=LINE, w=4, wob=0, r=r)


def pill(ink, x, y, text, size, bg, fg=WHITE, key="mont"):
    w = ink.text_w(text, size, key) + size * 1.1
    h = size * 1.55
    ink.rect(x - w / 2, y - h / 2, x + w / 2, y + h / 2, fill=bg, outline=None, wob=0, r=h / 2)
    T(ink, x, y + size * 0.04, text, size, fg, key)
    return w


def fit_size(ink, text, size, max_w, key="mont"):
    return min(size, size * max_w / max(1.0, ink.text_w(text, size, key)))


def fly(ink, x, y, t, at, frm="right", dur=0.45, dist=620):
    """Transform for an element flying in at ``at`` (None while it is not there yet)."""
    if t < at:
        return None
    k = seg(t, at, at + dur)
    if frm == "pop":
        return ink.at(x, y, 0, max(0.01, ease_out_back(k, 2.0)))
    if frm == "zoom":
        e = ease_out_back(k, 1.3)
        return ink.at(x, y, -10 * (1 - e), max(0.01, lerp(0.15, 1.0, e)))
    dx, dy = {"right": (1, 0), "left": (-1, 0), "up": (0, -1), "down": (0, 1)}[frm]
    e = ease_out_back(k, 1.25)
    return ink.at(x + dx * dist * (1 - e), y + dy * dist * (1 - e), 6 * dx * (1 - ease_out(k)))


def num(v):
    m = re.search(r"\d[\d.,]*", str(v))
    return parse_num(m.group(0)) if m else 0.0


def fly_sfx(at, land="pop"):
    return [(at - 0.05, "swish", 0.7), (at + 0.38, land, 0.8)]


# -- elements ------------------------------------------------------------------------
# Each element: draw(ink, t, e) where e is its dict from the plan; cues(e) -> [(t, sound, gain)].

def el_headline(ink, t, e):
    if t < e["at"] or t >= e.get("until", 1e9):
        return
    lines = e["text"]
    y = e.get("y", 210)
    c = fly(ink, 540, y, t, e["at"], "up", 0.45, 380)
    if not c:
        return
    with c:
        top = lines[0]
        size = fit_size(ink, top, 96, 980)
        T(ink, 0, 0, top, size, DARK)
        if len(lines) > 1:
            k = ease_out_back(seg(t, e["at"] + 0.15, e["at"] + 0.55), 1.8)
            if k > 0.01:
                with ink.at(0, 128, -2, k):
                    s2 = fit_size(ink, lines[1], 78, 900)
                    pill(ink, 0, 0, lines[1], s2, TONE.get(e.get("tone", "good"), GREEN))


def cues_headline(e):
    c = [(e["at"] - 0.05, "swish", 0.6)]
    if len(e["text"]) > 1:
        c.append((e["at"] + 0.4, "pop", 0.8))
    return c


def el_live(ink, t, e):
    c = fly(ink, 120, 70, t, e["at"], "left", 0.4, 300)
    if c:
        with c:
            on = (t * 1.4) % 1 < 0.7
            ink.rect(-80, -26, 80, 26, fill=RED, outline=None, wob=0, r=26)
            ink.circle(-50, 0, 9, fill=WHITE if on else (255, 160, 160), outline=None, wob=0)
            T(ink, 12, 2, "LIVE", 30, WHITE)


def el_kpi(ink, t, e):
    x, y = e.get("x", CX), e.get("y", 720)
    w, h = e.get("w", 700), e.get("h", 330)
    c = fly(ink, x, y, t, e["at"], e.get("from", "right"))
    if not c:
        return
    with c:
        card(ink, 0, 0, w, h)
        T(ink, -w / 2 + 44, -h / 2 + 58, e.get("title", ""), 34, TXT2, "montb", "lm")
        k = ease_out(seg(t, e.get("count_at", e["at"] + 0.4), e.get("count_end", e["at"] + 1.6)))
        val = e["value"]
        txt = count_fmt(val, k) if e.get("count", True) else val
        col = TONE.get(e.get("tone", "good"), GREEN)
        pre = e.get("prefix", "")
        size = fit_size(ink, pre + txt, 120, w - 90)
        T(ink, -w / 2 + 44, 34, pre + txt, size, col, "mont", "lm")
        if e.get("badge") and t >= e.get("badge_at", 1e9):
            kb = ease_out_back(seg(t, e["badge_at"], e["badge_at"] + 0.4), 2.2)
            with ink.at(w / 2 - 110, -h / 2 + 10, 6, max(0.01, kb)):
                pill(ink, 0, 0, e["badge"], 44, col)


def cues_kpi(e):
    c = fly_sfx(e["at"])
    if e.get("count", True):
        a, b = e.get("count_at", e["at"] + 0.4), e.get("count_end", e["at"] + 1.6)
        n = 9
        for i in range(n):
            c.append((a + (b - a) * (1 - (1 - i / n) ** 1.6), "tick", 0.5))
        c.append((b, "cash", 0.9))
    if e.get("badge"):
        c += [(e["badge_at"], "pop", 0.8), (e["badge_at"] + 0.05, "ping", 0.6)]
    return c


def el_bars(ink, t, e):
    x, y = e.get("x", CX), e.get("y", 760)
    w, h = e.get("w", 700), e.get("h", 620)
    c = fly(ink, x, y, t, e["at"], e.get("from", "right"))
    if not c:
        return
    with c:
        card(ink, 0, 0, w, h)
        T(ink, -w / 2 + 44, -h / 2 + 56, e.get("title", ""), 32, TXT2, "montb", "lm")
        items = e["items"]
        vmax = max(num(v) for _, v, _ in items) or 1
        base = h / 2 - 96
        top = -h / 2 + 150
        bw = min(170, (w - 160) / len(items) - 40)
        gap = (w - 120 - bw * len(items)) / max(1, len(items) - 1) if len(items) > 1 else 0
        for i, (lbl, v, tone) in enumerate(items):
            at = e.get("bar_at", [e["at"] + 0.4 + 0.5 * j for j in range(len(items))])[i]
            k = ease_out_back(seg(t, at, at + 0.7), 1.2)
            bh = (base - top) * num(v) / vmax * k
            bx = -w / 2 + 60 + i * (bw + gap)
            col = TONE.get(tone, GREYBAR) if tone else GREYBAR
            if bh > 1:
                ink.rect(bx, base - bh, bx + bw, base, fill=col, outline=None, wob=0, r=min(18, bh / 2))
            T(ink, bx + bw / 2, base + 44, lbl, 30, TXT2, "montb")
            if k > 0.6:
                T(ink, bx + bw / 2, base - bh - 40, str(v), 44, DARK)
        ink.line([(-w / 2 + 40, base), (w / 2 - 40, base)], LINE, 4, wob=0)
        if e.get("badge") and t >= e.get("badge_at", 1e9):
            kb = ease_out_back(seg(t, e["badge_at"], e["badge_at"] + 0.4), 2.2)
            with ink.at(w / 2 - 120, -h / 2 + 140, 8, max(0.01, kb)):
                pill(ink, 0, 0, e["badge"], 54, TONE.get(e.get("tone", "good"), GREEN))


def cues_bars(e):
    c = fly_sfx(e["at"])
    ats = e.get("bar_at", [e["at"] + 0.4 + 0.5 * j for j in range(len(e["items"]))])
    for i, a in enumerate(ats):
        c.append((a, "pop", 0.6))
    c.append((ats[-1] + 0.6, "cash", 0.9))
    if e.get("badge"):
        c += [(e["badge_at"], "pop", 0.8), (e["badge_at"] + 0.05, "ping", 0.7)]
    return c


def el_hbars(ink, t, e):
    x, y = e.get("x", CX), e.get("y", 1050)
    w, h = e.get("w", 700), e.get("h", 300)
    c = fly(ink, x, y, t, e["at"], e.get("from", "down"))
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
                T(ink, x0 + bw - 12, yy + 2, str(v), 30, WHITE, "mont", "rm")


def cues_hbars(e):
    c = fly_sfx(e["at"])
    for i in range(len(e["items"])):
        c.append((e["at"] + 0.4 + 0.45 * i, "pop", 0.6))
    return c


def el_line(ink, t, e):
    x, y = e.get("x", CX), e.get("y", 760)
    w, h = e.get("w", 700), e.get("h", 560)
    c = fly(ink, x, y, t, e["at"], e.get("from", "right"))
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
            kn = ease_out_back(seg(t, e["note_at"], e["note_at"] + 0.4), 2.0)
            with ink.at(e.get("note_x", w / 2 - 150), e.get("note_y", -h / 2 + 140), -4, max(0.01, kn)):
                pill(ink, 0, 0, note, 40, col)


def cues_line(e):
    c = fly_sfx(e["at"])
    c.append((e.get("draw_at", e["at"] + 0.4), "swoosh", 0.5))
    if e.get("note"):
        c += [(e["note_at"], "pop", 0.8), (e["note_at"] + 0.05, "ping", 0.6)]
    return c


def el_minichart(ink, t, e):
    x, y = e.get("x", CX), e.get("y", 600)
    w, h = e.get("w", 660), e.get("h", 250)
    c = fly(ink, x, y, t, e["at"], e.get("from", "right"))
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
        k = ease_in_out(seg(t, e["at"] + 0.3, e["at"] + 1.2))
        n = max(2, int(len(pts) * k) + 1)
        P = [(lerp(x0, x1, i / (len(pts) - 1)), lerp(y0, y1, v)) for i, v in enumerate(pts[:n])]
        ink.line(P, col, 9, wob=0)
        if k > 0.9:
            ka = ease_out_back(seg(t, e["at"] + 1.1, e["at"] + 1.5), 2.0)
            with ink.at(w / 2 - 90, 10, 0, max(0.01, ka)):
                ink.shape([(-46, 26), (0, -36), (46, 26)] if up else [(-46, -26), (0, 36), (46, -26)], fill=col,
                          outline=None, wob=0)


def cues_minichart(e):
    return fly_sfx(e["at"]) + [(e["at"] + 1.1, "ping" if e.get("up", True) else "down", 0.7)]


def el_stamp(ink, t, e):
    if t < e["at"] or t >= e.get("until", 1e9):
        return
    k = seg(t, e["at"], e["at"] + 0.22)
    s = lerp(2.4, 1.0, ease_out(k))
    col = TONE.get(e.get("tone", "bad"), RED)
    with ink.at(e.get("x", CX), e.get("y", 700), e.get("rot", -10), s):
        w = ink.text_w(e["text"], e.get("size", 70)) + 70
        ink.rect(-w / 2, -60, w / 2, 60, fill=None, outline=col, w=12, wob=0.6, r=14)
        T(ink, 0, 4, e["text"], e.get("size", 70), col)
        if e.get("strike_at") and t >= e["strike_at"]:
            kk = ease_out(seg(t, e["strike_at"], e["strike_at"] + 0.25))
            ink.line([(-w / 2 - 20, 30), (-w / 2 - 20 + (w + 40) * kk, -30)], DARK, 14, wob=0.3)


def cues_stamp(e):
    c = [(e["at"] + 0.18, "impact", 0.8)]
    if e.get("strike_at"):
        c.append((e["strike_at"], "swish", 0.6))
    return c


ICONS = {}


def icon(ink, name, s=1.0, col=DARK):
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
        c = fly(ink, tx, ty, t, at, ["left", "right", "left", "right"][i % 4], 0.4, 420)
        if c:
            with c:
                card(ink, 0, 0, tw, th, r=26)
                with ink.at(0, -24):
                    icon(ink, name, 0.95)
                T(ink, 0, 60, lbl, 32, DARK, "montb")


def cues_tiles(e):
    c = []
    for i in range(len(e["items"])):
        at = e["at"] + i * e.get("step", 0.3)
        c += [(at - 0.03, "swish", 0.45), (at + 0.35, "pop", 0.6)]
    return c


def el_iconcard(ink, t, e):
    x, y = e.get("x", CX + 50), e.get("y", 760)
    w, h = e.get("w", 520), e.get("h", 420)
    c = fly(ink, x, y, t, e["at"], e.get("from", "zoom"))
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
            k = ease_out_back(seg(t, e["at"] + 0.5, e["at"] + 0.9), 2.0)
            with ink.at(w / 2 - 70, -h / 2 + 80, 0, max(0.01, k)):
                ink.shape([(-34, 20), (0, -34), (34, 20)], fill=GREEN, outline=None, wob=0)


def cues_iconcard(e):
    return fly_sfx(e["at"], "ping")


def el_range(ink, t, e):
    x, y = e.get("x", CX), e.get("y", 1040)
    w, h = e.get("w", 700), e.get("h", 340)
    c = fly(ink, x, y, t, e["at"], e.get("from", "down"))
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
            km = ease_out_back(seg(t, e["marker_at"], e["marker_at"] + 1.0), 1.4)
            mx = lerp(x0, x1, lerp(lo, e["marker"], km))
            ink.shape([(mx - 24, yy - 62), (mx + 24, yy - 62), (mx, yy - 26)], fill=DARK, outline=None, wob=0)
            if e.get("marker_label") and km > 0.9:
                pill(ink, mx, yy - 92, e["marker_label"], 30, GREEN)


def cues_range(e):
    c = fly_sfx(e["at"]) + [(e.get("fill_at", e["at"] + 0.4), "swoosh", 0.5)]
    if "marker" in e:
        c += [(e["marker_at"] + 0.9, "ping", 0.7)]
    if e.get("cash"):
        c.append((e.get("fill_at", e["at"] + 0.4) + 0.8, "cash", 0.9))
    return c


ELEMENTS = {
    "headline": (el_headline, cues_headline), "live": (el_live, lambda e: fly_sfx(e["at"], "pop")),
    "kpi": (el_kpi, cues_kpi), "bars": (el_bars, cues_bars), "hbars": (el_hbars, cues_hbars),
    "line": (el_line, cues_line), "minichart": (el_minichart, cues_minichart), "stamp": (el_stamp, cues_stamp),
    "tiles": (el_tiles, cues_tiles), "iconcard": (el_iconcard, cues_iconcard), "range": (el_range, cues_range),
}


# -- panda sprite ----------------------------------------------------------------------

@lru_cache(maxsize=64)
def panda_img(pose, h):
    im = Image.open(HERE / "panda" / f"{pose}.png").convert("RGBA")
    return im.resize((max(1, int(im.width * h / im.height)), int(h)), Image.LANCZOS)


def paste_panda(img, pose, x, feet_y, h, scale=1.0):
    sp = panda_img(pose, int(h * scale))
    img.alpha_composite(sp, (int(x - sp.width / 2), int(feet_y - sp.height)))


# -- renderer ------------------------------------------------------------------------

class Renderer:
    def __init__(self, plan, ss=2):
        self.plan, self.ss = plan, ss
        self.W, self.H, self.fps = plan["width"], plan["height"], plan["fps"]
        self.words = plan["words"]
        self.chunks = caption_chunks(self.words, dict(cap_words=3, cap_chars=18))

    def panel_at(self, t):
        ps = self.plan["panels"]
        for i, p in enumerate(ps):
            if p["start"] <= t < p["end"]:
                return i, p
        return len(ps) - 1, ps[-1]

    def draw_panel(self, idx, lt, frame_i):
        p = self.plan["panels"][idx]
        ss = self.ss
        img = Image.new("RGBA", (self.W * ss, self.H * ss), (255, 255, 255, 255))
        ink = Ink(img, affine(0, 0, 0, ss), frame_i // 2 + idx * 17, ss)
        for e in p.get("elements", []):
            if e["type"] != "headline":
                ELEMENTS[e["type"]][0](ink, lt, e)
        pd = p.get("panda")
        if pd:
            pose = pd["pose"]
            for at, ps in pd.get("swap", []):
                if lt >= at:
                    pose = ps
            k = ease_out_back(seg(lt, pd.get("at", 0.1), pd.get("at", 0.1) + 0.45), 1.6)
            if k > 0.01:
                paste_panda(img, pose, pd.get("x", 225) * ss, pd.get("y", 1440) * ss, pd.get("h", 580) * ss,
                            max(0.05, k))
        for e in p.get("elements", []):
            if e["type"] == "headline":
                el_headline(ink, lt, e)
        return img

    def frame(self, i):
        t = i / self.fps
        idx, p = self.panel_at(t)
        lt = t - p["start"]
        img = self.draw_panel(idx, lt, i)
        dur = p.get("push_dur", 0.42)
        if idx > 0 and lt < dur:
            prev = self.plan["panels"][idx - 1]
            pimg = self.draw_panel(idx - 1, prev["end"] - prev["start"], i)
            e = ease_in_out(lt / dur)
            mode = p.get("push", "right")
            Wp, Hp = img.size
            comp = Image.new("RGBA", img.size, (255, 255, 255, 255))
            if mode == "zoom":
                comp.alpha_composite(pimg)
                s = lerp(0.35, 1.0, ease_out_back(lt / dur, 1.2))
                rot = -9 * (1 - e)
                sm = img.resize((max(1, int(Wp * s)), max(1, int(Hp * s))), Image.BILINEAR).rotate(rot, expand=True)
                comp.alpha_composite(sm, (int((Wp - sm.width) / 2), int((Hp - sm.height) / 2)))
            else:
                dx, dy = {"right": (1, 0), "left": (-1, 0), "up": (0, -1), "down": (0, 1)}[mode]
                ox, oy = int(dx * Wp * (1 - e)), int(dy * Hp * (1 - e))
                comp.paste(pimg, (ox - dx * Wp, oy - dy * Hp))
                # soft shadow on the leading edge of the incoming picture
                comp.paste(img, (ox, oy))
                edge = Image.new("RGBA", (28 * self.ss if dx else Wp, Hp if dx else 28 * self.ss), (0, 0, 0, 40))
                if dx > 0:
                    comp.alpha_composite(edge, (max(0, ox - edge.width), 0))
                elif dx < 0:
                    comp.alpha_composite(edge, (min(Wp - edge.width, ox + Wp), 0))
                elif dy < 0:
                    comp.alpha_composite(edge, (0, min(Hp - edge.height, oy + Hp)))
            img = comp
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
        size = self.plan.get("cap_size", 76)
        words = [self.words[j] for j in c]
        texts = [w["w"].upper().strip(",;:") for w in words]
        space = size * 0.32
        widths = [ov.text_w(tx, size, "mont") for tx in texts]
        lines, line, lw = [], [], 0.0
        for j, wd in enumerate(widths):
            if line and lw + space + wd > 960:
                lines.append(line)
                line, lw = [], 0.0
            lw += (space if line else 0) + wd
            line.append(j)
        lines.append(line)
        k = 0.85 + 0.15 * ease_out_back(seg(t, s_, s_ + 0.12), 2.4)
        y0 = self.plan.get("cap_y", 1545) - (len(lines) - 1) * size * 0.6
        with ov.at(540, y0, 0, k):
            for li, ln in enumerate(lines):
                total = sum(widths[j] for j in ln) + space * (len(ln) - 1)
                x = -total / 2
                for j in ln:
                    w = words[j]
                    active = w["s"] <= t < max(w["e"], w["s"] + 0.08)
                    sc = 1 + 0.12 * math.exp(-(t - w["s"]) * 12) if active else 1.0
                    with ov.at(x + widths[j] / 2, li * size * 1.15, 0, sc):
                        ov.text(0, 0, texts[j], size, "mont", fill=YELLOW if active else WHITE, stroke=DARK, sw=0.17)
                    x += widths[j] + space


# -- sound -------------------------------------------------------------------------------

SOUNDS = {
    "swish": ["perc_swash", "perc_swoosh"], "whoosh": ["ambi_swoosh", "perc_swoosh"], "swoosh": ["perc_swoosh"],
    "pop": ["elec_pop", "perc_snap"], "ping": ["elec_ping", "elec_blip"], "cash": ["perc_till"],
    "tick": ["elec_tick"], "impact": ["perc_impact1", "perc_impact2"], "boom": ["bd_boom"], "down": ["perc_impact2"],
    "chime": ["elec_chime"],
}


@lru_cache(maxsize=None)
def sample(name):
    x = audio.load(HERE / "sfx" / f"{name}.flac")
    return x / (np.max(np.abs(x)) + 1e-9)


def cues(plan):
    out = []
    for i, p in enumerate(plan["panels"]):
        if i:
            out.append((p["start"] - 0.15, "whoosh", 0.9))
        pd = p.get("panda")
        if pd:
            out.append((p["start"] + pd.get("at", 0.1) + 0.3, "pop", 0.5))
        for e in p.get("elements", []):
            out += [(p["start"] + a, n, g) for a, n, g in ELEMENTS[e["type"]][1](e)]
    return sorted(out)


def mix_audio(voice, duration, cue_list, env, fps, master=0.32):
    n = int(duration * audio.SR)
    out = np.zeros(n)
    v = audio.normalize(voice)[:n]
    out[:len(v)] += v
    duck = np.interp(np.arange(n) / audio.SR * fps, np.arange(len(env)), env) if len(env) else np.zeros(n)
    rng = random.Random(4)
    fx = np.zeros(n)
    last = {}
    for t, name, gain in cue_list:
        if name == "tick" and t - last.get("tick", -1) < 0.05:
            continue
        last[name] = t
        s = sample(rng.choice(SOUNDS[name]))
        a = int(max(0, t) * audio.SR)
        if a >= n:
            continue
        e = min(n, a + len(s))
        fx[a:e] += gain * rng.uniform(0.85, 1.05) * s[:e - a]
    fx *= master * (1 - 0.35 * np.clip(duck, 0, 1))
    out += fx
    peak = np.max(np.abs(out)) + 1e-9
    if peak > 0.97:
        out = np.tanh(out / peak * 1.15) * 0.97
    return out


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
    audio.save(wav, mix_audio(voice, dur, cues(plan), env, fps))
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
