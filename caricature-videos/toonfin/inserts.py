"""Short animated inserts (cards, motion-graphic clips, panda stickers) to lay over your own video.

Each insert is rendered on a transparent 1080x1920 canvas and exported twice:
``<id>_key.mp4`` (pure magenta #FF00FF background, for CapCut / any chroma key) and ``<id>_alpha.webm``
(VP9 with real transparency; ``--alpha mov`` writes a much larger PNG-codec .mov for Premiere / Final Cut).
Both carry the insert's own whoosh / pop / cash sounds, levelled ~33 % under a -16.8 LUFS voice.

Spec JSON: {"inserts": [{"id", "dur", "panda": pose?, "elements": [...]}, ...]}. Every element
glides in at ``at`` and flies out to the left at ``until`` (default: shortly before the end).

    python -m toonfin.inserts examples/european_lithium_inserts.json --out out/inserts [--only C3,U01]
"""
import argparse
import json
import math
import multiprocessing as mp
import subprocess
import time
from pathlib import Path

import numpy as np
from PIL import Image

from . import audio
from .anim import seg, lerp, ease_out, ease_in_out, ease_out_back
from .ink import Ink, affine, mix, WHITE
from .pandanews import (T, pill, fit_size, smooth, fly, sparks, lucide, panda_img, comp_at, sample, SOUNDS,
                        SFX_TRIM, MIN_GAP, EXIT, DARK, TXT2, LINE, GREEN, RED, BLUE, YELLOW, GOLD)

W, H, FPS = 1080, 1920, 60
CY = 640                      # graphics sit in the upper part, clear of TikTok's buttons and captions
KEY = (255, 0, 255)            # magenta: far from every colour in the graphics (green would be keyed out too)
V_RMS = 0.14                  # loudness of a voice mastered to about -16.8 LUFS
SFX_REL = 0.665               # effects ~33 % under the voice (as in the approved videos)
COL = {"gelb": (YELLOW, DARK), "blau": (BLUE, WHITE), "gruen": (GREEN, WHITE), "rot": (RED, WHITE),
       "weiss": (WHITE, DARK)}


def de_num(v, dec=0):
    s = f"{v:,.{dec}f}"
    return s.replace(",", "X").replace(".", ",").replace("X", ".")


def lerp_fmt(a, b, k, template):
    """'{}' in template filled with a German number between a and b (decimals taken from b)."""
    dec = len(b.split(",")[1]) if "," in b else 0
    de = lambda v: float(v.replace(".", "").replace(",", "."))  # German notation: 5.000 / 0,045
    return template.replace("{}", de_num(lerp(de(a), de(b), k), dec))


def sticker(ink, w, h, fill, r=34, line=DARK):
    """Flat card with a solid offset shadow (keys cleanly, no soft semi-transparent edge)."""
    ink.rect(-w / 2 + 10, -h / 2 + 14, w / 2 + 10, h / 2 + 14, fill=DARK, outline=None, wob=0, r=r)
    ink.rect(-w / 2, -h / 2, w / 2, h / 2, fill=fill, outline=line, w=6, wob=0, r=r)


def ico(ink, name, x, y, px, col):
    im = lucide(name, max(8, int(px * ink.scale())), tuple(col))
    X, Y = ink.P(x, y)
    ink.img.alpha_composite(im, (int(X - im.width / 2), int(Y - im.height / 2)))


# -- elements ------------------------------------------------------------------------------

def el_card(ink, t, e):
    """Colour card: small label, title line(s), big value (optionally counting), sub line, icon, badge."""
    bg, fg = COL[e.get("color", "weiss")]
    x, y = e.get("x", 540), e.get("y", CY)
    w = e.get("w", 900)
    lines = e.get("title", "").split("\n") if e.get("title") else []
    has_val = bool(e.get("value"))
    h = e.get("h") or (90 + 76 * len(lines) + (150 if has_val else 0) + (60 if e.get("sub") else 0) + 40)
    c = fly(ink, x, y, t, e["at"], e.get("from", "right"), until=e.get("until"))
    if not c:
        return
    with c, ink.at(0, 0, e.get("tilt", -2)):
        sticker(ink, w, h, bg)
        sub_col = mix(fg, bg, 0.3)
        yy = -h / 2 + 62
        lx = -w / 2 + 50
        if e.get("icon"):
            ico(ink, e["icon"], w / 2 - 80, -h / 2 + 80, 96, fg)
        if e.get("label"):
            T(ink, lx, yy, e["label"], 36, sub_col, "montb", "lm")
            yy += 70
        tw = w - 100 - (120 if e.get("icon") else 0)
        for ln in lines:
            T(ink, lx, yy, ln, fit_size(ink, ln, 66, tw), fg, "mont", "lm")
            yy += 76
        if has_val:
            ca, ce = e.get("count_at", e["at"] + 0.35), e.get("count_end", e["at"] + 1.3)
            k = ease_out(seg(t, ca, ce))
            val = e["value"]
            if e.get("count_from") is not None:
                txt = lerp_fmt(e["count_from"], e["count_to"], k, val)
            else:
                txt = val
            vcol = tuple(e["value_col"]) if e.get("value_col") else fg
            size = fit_size(ink, val.replace("{}", e.get("count_to", "")), 130, w - 100)
            T(ink, lx, yy + 62, txt, size, vcol, "mont", "lm")
            if e.get("count_from") is not None:
                sparks(ink, lx + ink.text_w(txt, size, "mont") / 2, yy + 62, t, ce, r=size * 1.5)
            yy += 150
        if e.get("sub"):
            T(ink, lx, yy + 4, e["sub"], fit_size(ink, e["sub"], 36, w - 100), sub_col, "montb", "lm")
        if e.get("badge") and t >= e.get("badge_at", 1e9):
            kb = lerp(0.5, 1.0, ease_out_back(seg(t, e["badge_at"], e["badge_at"] + 0.45), 1.6))
            bx = w / 2 - e.get("badge_dx", 110)
            with ink.at(bx, h / 2 - 10, 7, max(0.01, kb)):
                bcol = COL[e.get("badge_color", "rot")]
                bw = ink.text_w(e["badge"], 52, "mont") + 64
                ink.rect(-bw / 2 + 6, -38 + 8, bw / 2 + 6, 38 + 8, fill=DARK, outline=None, wob=0, r=38)
                ink.rect(-bw / 2, -38, bw / 2, 38, fill=bcol[0], outline=DARK, w=5, wob=0, r=38)
                T(ink, 0, 3, e["badge"], 52, bcol[1])
            sparks(ink, bx, h / 2 - 10, t, e["badge_at"], r=120)


def el_pill(ink, t, e):
    """Big caption pill (the clips' 'Pille'), pops in."""
    if t < e["at"] or (e.get("until") is not None and t >= e["until"] + EXIT):
        return
    k = lerp(0.4, 1.0, ease_out_back(seg(t, e["at"], e["at"] + 0.45), 1.7))
    q = seg(t, e["until"], e["until"] + EXIT) ** 2 if e.get("until") is not None and t >= e["until"] else 0
    bg, fg = COL[e.get("color", "gelb")]
    size = fit_size(ink, e["text"], e.get("size", 54), 900, "mont")
    with ink.at(e.get("x", 540) - 1400 * q, e.get("y", CY + 470), e.get("tilt", -2), max(0.01, k)):
        w = ink.text_w(e["text"], size, "mont") + size * 1.3
        hh = size * 1.7
        ink.rect(-w / 2 + 8, -hh / 2 + 10, w / 2 + 8, hh / 2 + 10, fill=DARK, outline=None, wob=0, r=hh / 2)
        ink.rect(-w / 2, -hh / 2, w / 2, hh / 2, fill=bg, outline=DARK, w=5, wob=0, r=hh / 2)
        T(ink, 0, size * 0.05, e["text"], size, fg)


def el_counter(ink, t, e):
    """Depot value counting from ``from`` down/up to ``to`` with arrow and a delta badge."""
    x, y, w, h = e.get("x", 540), e.get("y", CY), e.get("w", 860), e.get("h", 470)
    c = fly(ink, x, y, t, e["at"], until=e.get("until"))
    if not c:
        return
    with c:
        sticker(ink, w, h, WHITE)
        ink.rect(-w / 2 + 3, -h / 2 + 3, w / 2 - 3, -h / 2 + 22, fill=RED, outline=None, wob=0, r=10)
        T(ink, -w / 2 + 50, -h / 2 + 76, e.get("title", "DEPOTWERT"), 38, TXT2, "montb", "lm")
        ico(ink, "wallet", w / 2 - 80, -h / 2 + 84, 84, DARK)
        ca, ce = e.get("count_at", e["at"] + 0.4), e.get("count_end", e["at"] + 1.7)
        k = ease_in_out(seg(t, ca, ce))
        txt = lerp_fmt(e["from"], e["to"], k, "{} €")
        col = mix(DARK, RED, min(1, k * 1.5))
        T(ink, -w / 2 + 50, 10, txt, 150, col, "mont", "lm")
        ka = smooth(seg(t, ca, ce))
        if ka > 0.02:
            with ink.at(w / 2 - 110, 10 + 30 * ka, 0, max(0.05, ka)):
                ink.shape([(-30, -90), (30, -90), (30, 10), (70, 10), (0, 90), (-70, 10), (-30, 10)],
                          fill=RED, outline=DARK, w=5, wob=0)
        T(ink, -w / 2 + 50, h / 2 - 70, e.get("sub", ""), 34, TXT2, "montb", "lm")
        if t >= ce:
            kb = lerp(0.5, 1.0, ease_out_back(seg(t, ce, ce + 0.45), 1.6))
            with ink.at(w / 2 - 150, h / 2 - 70, 6, max(0.01, kb)):
                bw = ink.text_w(e["badge"], 52, "mont") + 64
                ink.rect(-bw / 2, -38, bw / 2, 38, fill=RED, outline=DARK, w=5, wob=0, r=38)
                T(ink, 0, 3, e["badge"], 52, WHITE)
            sparks(ink, w / 2 - 150, h / 2 - 70, t, ce, cols=(RED, GOLD, (255, 120, 60)), r=120)


def el_ring(ink, t, e):
    """Vote ring filling to ``value`` percent, counter in the middle, check mark when done."""
    x, y, w, h = e.get("x", 540), e.get("y", CY), e.get("w", 820), e.get("h", 800)
    c = fly(ink, x, y, t, e["at"], frm="pop", until=e.get("until"))
    if not c:
        return
    with c:
        sticker(ink, w, h, WHITE)
        T(ink, 0, -h / 2 + 70, e.get("title", "ABSTIMMUNG 22.10."), 40, TXT2, "montb")
        cy, R = 20, 230
        ink.arc(0, cy, R, R, 0, 360, (236, 238, 242), 54, wob=0)
        fa, fe = e.get("fill_at", e["at"] + 0.35), e.get("fill_end", e["at"] + 2.2)
        k = ease_in_out(seg(t, fa, fe))
        v = float(e.get("value", 99.96))
        if k > 0.002:
            ink.arc(0, cy, R, R, -90, -90 + 360 * v / 100 * k, GREEN, 54, wob=0)
        T(ink, 0, cy - 10, de_num(v * k, 2) + " %", 104, DARK)
        T(ink, 0, cy + 78, e.get("label", "JA-STIMMEN"), 38, GREEN, "mont")
        if t >= fe:
            kk = ease_out_back(seg(t, fe, fe + 0.4), 2.0)
            with ink.at(R * 0.72, cy - R * 0.72, 0, max(0.05, kk)):
                ink.circle(0, 0, 66, fill=GREEN, outline=DARK, w=6, wob=0)
                ink.line([(-30, 0), (-8, 26), (32, -26)], WHITE, 16, wob=0)
            sparks(ink, 0, cy, t, fe, r=330, n=18, life=0.9)
        if e.get("sub") and t >= e.get("sub_at", fe + 0.3):
            ks = smooth(seg(t, e["sub_at"], e["sub_at"] + 0.4))
            with ink.at(0, h / 2 - 68 + 20 * (1 - ks)):
                T(ink, 0, 0, e["sub"], 38, mix(WHITE, DARK, ks), "montb")


def el_priceline(ink, t, e):
    """Price path between dated points, dashed entry line, loss zone shaded, end price label."""
    x, y, w, h = e.get("x", 540), e.get("y", CY), e.get("w", 920), e.get("h", 720)
    c = fly(ink, x, y, t, e["at"], until=e.get("until"))
    if not c:
        return
    with c:
        sticker(ink, w, h, WHITE)
        T(ink, -w / 2 + 44, -h / 2 + 62, e.get("title", ""), 36, TXT2, "montb", "lm")
        pts = e["points"]  # [[label, price], ...]
        lo, hi = e.get("lo", 0.20), e.get("hi", 0.26)
        x0, x1 = -w / 2 + 70, w / 2 - 190
        y0, y1 = h / 2 - 110, -h / 2 + 150
        Y = lambda p: lerp(y0, y1, (p - lo) / (hi - lo))
        for g in range(4):
            gy = lerp(y0, y1, g / 3)
            ink.line([(x0, gy), (x1 + 20, gy)], (240, 241, 244), 3, wob=0)
            T(ink, x1 + 34, gy, de_num(lerp(lo, hi, g / 3), 2), 26, TXT2, "montb", "lm")
        days = [q[2] if len(q) > 2 else i for i, q in enumerate(pts)]
        P = [(lerp(x0, x1, d / days[-1]), Y(q[1])) for d, q in zip(days, pts)]
        for (lbl, *_), (px, _) in zip(pts, P):
            if lbl:
                T(ink, px, y0 + 40, lbl, 26, TXT2, "montb")
        ey = Y(e["entry"])
        da, de_ = e.get("draw_at", e["at"] + 0.45), e.get("draw_end", e["at"] + 2.0)
        k = ease_in_out(seg(t, da, de_))
        n = 1 + (len(P) - 1) * k
        shown = P[:int(n)]
        if int(n) < len(P):
            f = n - int(n)
            a, b = P[int(n) - 1], P[int(n)]
            shown.append((lerp(a[0], b[0], f), lerp(a[1], b[1], f)))
        if len(shown) > 1:
            ink.shape(shown + [(shown[-1][0], ey), (shown[0][0], ey)], fill=(253, 226, 228), outline=None, wob=0)
        # dashed entry line
        xx = x0
        while xx < x1:
            ink.line([(xx, ey), (min(x1, xx + 26), ey)], DARK, 4, wob=0)
            xx += 44
        pill(ink, x0 + 150, ey - 40, e.get("entry_label", "Einstieg"), 26, DARK)
        if len(shown) > 1:
            ink.line(shown, RED, 10, wob=0)
            hx, hy = shown[-1]
            ink.circle(hx, hy, 15, fill=RED, outline=WHITE, w=5, wob=0)
        if t >= de_:
            kn = lerp(0.5, 1.0, ease_out_back(seg(t, de_, de_ + 0.45), 1.6))
            with ink.at(P[-1][0] + 20, P[-1][1] + 70, 0, max(0.01, kn)):
                pill(ink, 0, 0, e.get("end_label", ""), 40, RED)
        if e.get("badge") and t >= e.get("badge_at", 1e9):
            kb = lerp(0.5, 1.0, ease_out_back(seg(t, e["badge_at"], e["badge_at"] + 0.45), 1.6))
            with ink.at(w / 2 - 150, -h / 2 + 70, 6, max(0.01, kb)):
                bw = ink.text_w(e["badge"], 50, "mont") + 60
                ink.rect(-bw / 2, -36, bw / 2, 36, fill=RED, outline=DARK, w=5, wob=0, r=36)
                T(ink, 0, 3, e["badge"], 50, WHITE)
            sparks(ink, w / 2 - 150, -h / 2 + 70, t, e["badge_at"], cols=(RED, GOLD, (255, 120, 60)), r=120)


def el_swap(ink, t, e):
    """Share exchange: tokens fly from the left card into the right one, counters run, ratio in the middle."""
    x, y = e.get("x", 540), e.get("y", CY)
    c = fly(ink, x, y, t, e["at"], until=e.get("until"))
    if not c:
        return
    sa, se = e.get("swap_at", e["at"] + 0.6), e.get("swap_end", e["at"] + 2.6)
    k = ease_in_out(seg(t, sa, se))
    with c:
        for side, (name, venue, a, b, col) in enumerate(((e["left"], e["left_venue"], e["left_n"], "0", BLUE),
                                                        (e["right"], e["right_venue"], "0", e["right_n"], GREEN))):
            cx = -235 + side * 470
            done = side == 0 and k >= 0.999
            fill = mix(WHITE, (232, 233, 237), 1.0 if done else 0.0)
            with ink.at(cx, 0, -2 if side == 0 else 2):
                sticker(ink, 400, 470, fill)
                ink.rect(-197, -232, 197, -150, fill=col if not done else (190, 192, 198), outline=None, wob=0, r=30)
                ink.rect(-197, -180, 197, -150, fill=col if not done else (190, 192, 198), outline=None, wob=0)
                T(ink, 0, -191, name, fit_size(ink, name, 36, 360), WHITE)
                kk = k if side == 0 else ease_out(seg(t, sa + 0.2, se))
                txt = lerp_fmt(a, b, kk, "{}") if side == 0 else lerp_fmt(a, b, kk, "≈ {}")
                if side == 0 and k >= 0.999:
                    txt = e["left_n"]
                T(ink, 0, -10, txt, fit_size(ink, "≈ " + b if side else a, 96, 350), DARK if not done else TXT2)
                T(ink, 0, 70, "AKTIEN", 36, TXT2, "montb")
                pill(ink, 0, 160, venue, 30, DARK if not done else (170, 172, 180))
                if done:
                    with ink.at(0, -10, -14):
                        ink.rect(-172, -40, 172, 40, fill=WHITE, outline=RED, w=8, wob=0, r=8)
                        T(ink, 0, 3, e.get("left_stamp", "UMGETAUSCHT"), 34, RED)
        # tokens on an arc
        if 0 < k < 1:
            for i in range(9):
                u = (k * 2.2 - i * 0.13)
                if 0 < u < 1:
                    px = lerp(-200, 200, u)
                    py = -60 - math.sin(math.pi * u) * 190
                    ink.circle(px, py, 24, fill=GOLD, outline=DARK, w=5, wob=0)
                    T(ink, px, py + 2, "A", 26, DARK)
        with ink.at(0, 300, 0, max(0.05, ease_out_back(seg(t, e["at"] + 0.3, e["at"] + 0.7), 1.8))):
            pill(ink, 0, 0, e.get("ratio", "× 0,045"), 56, DARK)
        if t >= se:
            sparks(ink, 235, -10, t, se, r=180)


def el_timeline(ink, t, e):
    """Vertical roadmap: the line draws down, each stop pops in; the first one pulses."""
    x, y, w, h = e.get("x", 540), e.get("y", CY), e.get("w", 900), e.get("h", 840)
    c = fly(ink, x, y, t, e["at"], until=e.get("until"))
    if not c:
        return
    stops = e["stops"]  # [[date, text, icon], ...]
    with c:
        sticker(ink, w, h, WHITE)
        T(ink, -w / 2 + 44, -h / 2 + 62, e.get("title", "FAHRPLAN"), 38, TXT2, "montb", "lm")
        lx = -w / 2 + 110
        top, bot = -h / 2 + 170, h / 2 - 110
        da = e.get("draw_at", e["at"] + 0.4)
        step = e.get("step", 0.55)
        n = len(stops)
        ys = [lerp(top, bot, i / (n - 1)) for i in range(n)]
        kline = smooth(seg(t, da, da + step * (n - 1) + 0.2))
        ink.line([(lx, top), (lx, bot)], (236, 238, 242), 12, wob=0)
        if kline > 0.01:
            ink.line([(lx, top), (lx, lerp(top, bot, kline))], DARK, 12, wob=0)
        for i, (date, text, icon_) in enumerate(stops):
            at = da + i * step
            if t < at:
                continue
            kk = ease_out_back(seg(t, at, at + 0.4), 1.8)
            hot = i == 0
            col = RED if hot else (GREEN if i == n - 1 else BLUE)
            if hot:
                for j in range(2):
                    q = ((t - at) * 1.2 + j / 2) % 1
                    ink.circle(lx, ys[i], 34 + 40 * q, fill=None, outline=mix(RED, WHITE, 0.4 + 0.6 * q),
                               w=8 * (1 - q) + 1, wob=0)
            with ink.at(lx, ys[i], 0, max(0.05, kk)):
                ink.circle(0, 0, 34, fill=col, outline=DARK, w=6, wob=0)
            with ink.at(lx + 70 + 40 * (1 - smooth(seg(t, at, at + 0.4))), ys[i]):
                pill(ink, ink.text_w(date, 40, "mont") / 2 + 22, -26, date, 40, col)
                T(ink, 0, 40, text, fit_size(ink, text, 40, w - 330), DARK, "montb", "lm")
                ico(ink, icon_, w - 300, 0, 80, DARK)


def el_illus(ink, t, e):
    from .illus import KINDS
    c = fly(ink, e.get("x", 540), e.get("y", CY), t, e["at"], e.get("from", "right"), until=e.get("until"))
    if not c:
        return
    with c, ink.at(0, 0, 0, e.get("s", 1.0)):
        KINDS[e["kind"]](ink, t - e["at"], e)


def el_title(ink, t, e):
    """Bold headline above an illustration (dark text on a yellow marker stripe)."""
    c = fly(ink, e.get("x", 540), e.get("y", CY - 420), t, e["at"], "left", until=e.get("until"))
    if not c:
        return
    with c, ink.at(0, 0, -2):
        size = fit_size(ink, e["text"], 70, 860)
        w = ink.text_w(e["text"], size, "mont") + 60
        ink.rect(-w / 2 + 8, -size * 0.75 + 10, w / 2 + 8, size * 0.75 + 10, fill=DARK, outline=None, wob=0, r=14)
        ink.rect(-w / 2, -size * 0.75, w / 2, size * 0.75, fill=COL[e.get("color", "gelb")][0], outline=DARK,
                 w=5, wob=0, r=14)
        T(ink, 0, 3, e["text"], size, COL[e.get("color", "gelb")][1])


def el_banner(ink, t, e):
    """Fixed top banner for the whole video: tag, name, live price chip, disclaimer line."""
    k = smooth(seg(t, e["at"], e["at"] + 0.6))
    q = seg(t, e["until"], e["until"] + EXIT) ** 2 if e.get("until") is not None and t >= e["until"] else 0
    if k <= 0 or q >= 1:
        return
    with ink.at(540 - 1400 * q, e.get("y", 250) - 160 * (1 - k)):
        ink.rect(-500 + 8, -62 + 10, 500 + 8, 62 + 10, fill=DARK, outline=None, wob=0, r=24)
        ink.rect(-500, -62, 500, 62, fill=WHITE, outline=DARK, w=5, wob=0, r=24)
        ink.rect(-497, -59, -270, 59, fill=RED, outline=None, wob=0, r=22)
        ink.rect(-300, -59, -270, 59, fill=RED, outline=None, wob=0)
        T(ink, -383, 2, e.get("tag", "UPDATE 2"), 40, WHITE)
        T(ink, -240, -16, e.get("name", ""), 34, DARK, "mont", "lm")
        T(ink, -240, 28, e.get("sub", ""), 26, TXT2, "montb", "lm")
        on = (t * 1.2) % 1 < 0.6
        ink.circle(300, 0, 10, fill=RED if on else (255, 170, 170), outline=None, wob=0)
        T(ink, 320, -14, e.get("price", ""), 34, DARK, "mont", "lm")
        T(ink, 320, 26, e.get("change", ""), 30, RED, "mont", "lm")
        T(ink, 0, 92, e.get("note", "Keine Anlageberatung"), 24, WHITE, "montb")


ELEMENTS = {"card": el_card, "pill": el_pill, "counter": el_counter, "ring": el_ring, "priceline": el_priceline,
            "swap": el_swap, "timeline": el_timeline, "illus": el_illus, "title": el_title, "banner": el_banner}


# -- rendering ---------------------------------------------------------------------------

def _prep(spec):
    dur = spec["dur"]
    for e in spec["elements"]:
        e.setdefault("at", 0.05)
        if "until" not in e:
            e["until"] = dur - 0.48
    return spec


def _panda(img, spec, t, ss):
    p = spec.get("panda")
    if not p:
        return
    pose = p if isinstance(p, str) else p["pose"]
    pos = {} if isinstance(p, str) else p
    x, feet, h = pos.get("x", 215) * ss, pos.get("y", CY + 380) * ss, pos.get("h", 560) * ss
    at, out = pos.get("at", 0.0), spec["dur"] - 0.5
    if t < at or t > out + 0.35:
        return
    k_in = ease_out_back(seg(t, at, at + 0.4), 1.5)
    k_out = seg(t, out, out + 0.35) ** 2
    hop = math.sin(math.pi * seg(t, at + 0.15, at + 0.6)) * 26 * ss
    breath = 0.006 * math.sin(t * 2 * math.pi / 3.4)
    sc = max(0.05, k_in * (1 + breath))
    hh = int(round(h * sc / 8)) * 8
    if hh < 16:
        return
    sp = panda_img(pose, hh)
    comp_at(img, sp, x - sp.width / 2 - 1400 * ss * k_out, feet - hh - hop)


def frame(spec, i, ss=2):
    t = i / FPS
    img = Image.new("RGBA", (W * ss, H * ss), (0, 0, 0, 0))
    base = affine(0, 0, 0, ss)
    _panda(img, spec, t, ss)
    for e in spec["elements"]:
        at, until = e["at"], e.get("until")
        a_in = smooth(seg(t, at, at + 0.25)) if at > 0 else 1.0
        a_out = 1 - seg(t, until, until + EXIT * 0.9) if until is not None else 1.0
        alpha = a_in * a_out
        if alpha <= 0:
            continue
        layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ELEMENTS[e["type"]](Ink(layer, base, i // 2, ss), t, e)
        if alpha < 0.999:
            A = np.asarray(layer.getchannel("A")).astype(np.float32) * alpha
            layer.putalpha(Image.fromarray(A.astype(np.uint8)))
        img.alpha_composite(layer)
    # premultiplied downsample: no dark fringes around the edges
    a = np.asarray(img, np.float32)
    al = a[..., 3:4] / 255
    a[..., :3] *= al
    a = a.reshape(H, ss, W, ss, 4).mean(axis=(1, 3))
    rgb = a[..., :3] / np.maximum(a[..., 3:4] / 255, 1e-6)
    out = np.concatenate([np.clip(rgb, 0, 255), a[..., 3:4]], axis=2)
    return out.astype(np.uint8)


def cues(spec):
    out = []
    for e in spec["elements"]:
        ty, at = e["type"], e["at"]
        if ty in ("card", "counter", "ring", "priceline", "swap", "timeline", "illus", "title"):
            out.append((at - 0.05, "whoosh", 0.5))
            out.append((e["until"] - 0.03, "whoosh", 0.4))
        if ty == "banner":
            out.append((at - 0.05, "whoosh", 0.45))
        if ty == "pill":
            out.append((at + 0.02, "pop", 0.55))
        if ty == "card" and e.get("count_from") is not None:
            money = "€" in e.get("value", "") or "$" in e.get("value", "")
            out.append((e.get("count_end", at + 1.3) - 0.03, "cash" if money else "pop", 0.5))
        if ty == "card" and e.get("value") and e.get("count_from") is None and not e.get("badge"):
            out.append((at + 0.4, "pop", 0.5))
        if e.get("badge_at") is not None:
            out.append((e["badge_at"] + 0.02, "pop", 0.6))
        if ty == "counter":
            out.append((e.get("count_end", at + 1.7) - 0.03, "cash", 0.5))
        if ty == "ring":
            out.append((e.get("fill_end", at + 2.2), "pop", 0.65))
            out.append((e.get("fill_end", at + 2.2) + 0.05, "shimmer", 0.3))
        if ty == "priceline":
            out.append((e.get("draw_end", at + 2.0), "pop", 0.55))
        if ty == "swap":
            out.append((e.get("swap_end", at + 2.6), "cash", 0.5))
        if ty == "timeline":
            da, step = e.get("draw_at", at + 0.4), e.get("step", 0.55)
            out += [(da + j * step + 0.02, "pop", 0.45) for j in range(len(e["stops"]))]
        if ty == "illus":
            k = e["kind"]
            if k == "gavel":
                out.append((at + e.get("slam_at", 0.7), "crack", 0.6))
            if k == "battery":
                out.append((at + e.get("drain_end", 1.6) + 0.02, "pop", 0.6))
            if k == "choice":
                out.append((at + 0.12, "pop", 0.45))
        out += [(a, n, g) for a, n, g in e.get("sfx", [])]
    p = spec.get("panda")
    if p:
        out.append(((0 if isinstance(p, str) else p.get("at", 0)) + 0.05, "pop", 0.45))
    return sorted(out)


def sfx_track(spec):
    n = int(spec["dur"] * audio.SR)
    fx = np.zeros(n)
    last = {}
    for t, name, gain in cues(spec):
        if t - last.get(name, -99) < MIN_GAP.get(name, 0.2):
            continue
        last[name] = t
        s = sample(SOUNDS.get(name, name))
        from .pandanews import _active_rms
        s = s / _active_rms(s, top=1) * SFX_REL * V_RMS * SFX_TRIM.get(name, 1.0) * min(1.0, gain / 0.6)
        a = int(max(0, t) * audio.SR)
        if a >= n:
            continue
        e = min(n, a + len(s))
        fx[a:e] += s[:e - a]
    peak = np.max(np.abs(fx)) + 1e-9
    if peak > 0.9:
        fx *= 0.9 / peak
    return fx


_S = None


def _init(spec, ss):
    global _S
    _S = (spec, ss)


def _work(i):
    return frame(_S[0], i, _S[1]).tobytes()


def render_one(spec, out_dir, ss=2, workers=None, alpha="webm", log=print):
    spec = _prep(spec)
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    n = int(math.ceil(spec["dur"] * FPS))
    wav = out_dir / f"{spec['id']}.sfx.wav"
    audio.save(wav, sfx_track(spec))
    green, alt = out_dir / f"{spec['id']}_key.mp4", out_dir / f"{spec['id']}_alpha.{alpha}"
    fc = (f"color=c=0x{KEY[0]:02X}{KEY[1]:02X}{KEY[2]:02X}:s={W}x{H}:r={FPS}[g];"
          + ("[0:v]split[a][b];[g][a]overlay=shortest=1:format=auto,format=yuv420p[gv]" if alpha
             else "[g][0:v]overlay=shortest=1:format=auto,format=yuv420p[gv]"))
    cmd = ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}", "-r", str(FPS),
           "-i", "-", "-i", str(wav), "-filter_complex", fc,
           "-map", "[gv]", "-map", "1:a", "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-c:a", "aac",
           "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(green)]
    if alpha:
        if alpha == "mov":
            cmd += ["-map", "[b]", "-map", "1:a", "-c:v", "png", "-pix_fmt", "rgba", "-c:a", "pcm_s16le"]
        else:
            cmd += ["-map", "[b]", "-map", "1:a", "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "30",
                    "-deadline", "realtime", "-cpu-used", "8", "-row-mt", "1", "-auto-alt-ref", "0", "-c:a", "libopus"]
        cmd += ["-shortest", str(alt)]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    t0 = time.time()
    with mp.Pool(workers or mp.cpu_count(), initializer=_init, initargs=(spec, ss)) as pool:
        for buf in pool.imap(_work, range(n), chunksize=4):
            proc.stdin.write(buf)
    proc.stdin.close()
    if proc.wait() != 0:
        raise SystemExit("ffmpeg failed")
    wav.unlink(missing_ok=True)
    log(f"  {spec['id']}: {n} frames in {time.time() - t0:.0f}s")


def main(argv=None):
    ap = argparse.ArgumentParser(prog="toonfin.inserts")
    ap.add_argument("spec")
    ap.add_argument("--out", default="out/inserts")
    ap.add_argument("--only", default=None, help="comma-separated ids")
    ap.add_argument("--ss", type=int, default=2)
    ap.add_argument("--alpha", default="webm", choices=["webm", "mov", "none"])
    ap.add_argument("--still", default=None, help="write PNG stills at these seconds (e.g. 1.5,3) instead")
    a = ap.parse_args(argv)
    specs = json.loads(Path(a.spec).read_text(encoding="utf-8"))["inserts"]
    if a.only:
        ids = set(a.only.split(","))
        specs = [s for s in specs if s["id"] in ids]
    for s in specs:
        if a.still:
            s = _prep(s)
            Path(a.out).mkdir(parents=True, exist_ok=True)
            for sec in a.still.split(","):
                im = Image.fromarray(frame(s, int(float(sec) * FPS), a.ss), "RGBA")
                bg = Image.new("RGBA", im.size, (40, 44, 52, 255))
                bg.alpha_composite(im)
                bg.convert("RGB").save(Path(a.out) / f"{s['id']}_{sec}.png")
            continue
        render_one(s, a.out, a.ss, alpha=None if a.alpha == "none" else a.alpha)


if __name__ == "__main__":
    main()
