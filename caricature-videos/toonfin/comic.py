"""Comic-news style: full-frame comic panels pushed in one after another,
a panda reporter (Panda_investiert) who always holds something, a one-word
caption in the middle of the picture, a tiny news line and a punchline banner.

A comic plan is JSON with ``style: "comic"``, an optional ``intro`` card and a
list of ``panels`` ({start, end, scene, banner, news, ...scene params}).
"""
import math
import multiprocessing as mp
import subprocess
import sys
import time
from pathlib import Path

import numpy as np
from PIL import Image

from . import audio
from .anim import clamp, lerp, seg, ease_out, ease_in_out, ease_out_back, pop, wiggle, decay
from .characters import get_pose
from .ink import Ink, affine, mix, INK, WHITE, GOLD, RED, GREEN, DKGREEN, SKY, GREY, LTGREY, TAN, BROWN, ORANGE
from . import props

PAPER_W = (255, 255, 255)
BRAND = (62, 190, 72)  # Panda_investiert green
NAVY = (26, 38, 96)
BANNER_EDGE = (238, 112, 40)
FUR = (44, 44, 52)
SUIT = (34, 122, 72)
SUIT_DK = (22, 84, 50)
MONEY = (88, 178, 92)
MONEY_DK = (52, 128, 60)
CREAM = (255, 248, 224)

LW = 9  # comic outline weight in units


# -- the panda ------------------------------------------------------------------
# Modelled on the Panda_investiert character sheet: chibi proportions, fluffy cream
# head, black ears, big round black glasses with brown eyes, black suit, white
# shirt, black tie, black gloves and shoes.

FURC = (255, 246, 234)
BLK = (30, 30, 36)
SLEEVE = (44, 44, 52)
BLK_HI = (96, 96, 108)
LENS = (34, 34, 40)
IRIS = (112, 70, 38)


def _fluffy_head(ink, rx, ry, seed=1):
    """Cream head with fur tufts on the cheeks and crown, smooth chin."""
    pts = []
    n = 44
    for i in range(n):
        a = 2 * math.pi * i / n
        ca, sa = math.cos(a), math.sin(a)
        tuft = 0.0
        if sa < 0.35:  # sides + top get tufts, the chin stays smooth
            tuft = (0.075 if i % 2 == 0 else -0.01) * (1.0 if abs(ca) > 0.45 or sa < -0.8 else 0.5)
        r = 1 + tuft
        pts.append((ca * rx * r, sa * ry * r))
    ink.shape(pts, fill=FURC, w=LW)
    # crown tuft
    ink.shape([(-24, -ry + 8), (-10, -ry - 14), (2, -ry + 2), (16, -ry - 16), (28, -ry + 8)], fill=FURC, outline=None,
              smooth=True)
    ink.line([(-24, -ry + 6), (-10, -ry - 14), (2, -ry + 1), (16, -ry - 16), (28, -ry + 6)], INK, LW * 0.7, smooth=True)


def panda(ink, x, y, s=1.0, pose="idle", t=0.0, face="happy", talk=None, hold=None, flip=False, seed=0.0):
    """Panda_investiert standing on (x, y). ``hold(ink, hx, hy, t)`` draws the item in its right paw."""
    p = get_pose(pose, t, seed)
    fx = -1 if flip else 1
    out = {}
    with ink.at(x, y, 0, s):
        bob = p.get("bob", 0.0) * 0.6 + math.sin(t * 2.2 + seed) * 2.5
        # shoes + short trouser legs
        for side in (-1, 1):
            a = p["ll"][0] if side < 0 else p["rl"][0]
            fxp = side * 34 + math.sin(math.radians(a)) * 30
            ink.rect(side * 34 - 26, -86 + bob, side * 34 + 26, -18, fill=BLK, w=LW * 0.9)
            ink.ellipse(fxp + side * 8, -14, 40, 18, fill=BLK, w=LW * 0.9)
            ink.arc(fxp + side * 8 - 8, -20, 22, 8, 200, 300, BLK_HI, 4)
        with ink.at(0, bob):
            # jacket
            ink.shape([(-92, -246), (92, -246), (108, -120), (100, -78), (-100, -78), (-108, -120)],
                      fill=BLK, w=LW, smooth=True)
            ink.shape([(-30, -250), (30, -250), (0, -160)], fill=WHITE, w=LW * 0.6)
            ink.shape([(-9, -238), (9, -238), (13, -186), (0, -168), (-13, -186)], fill=(10, 10, 12), w=LW * 0.4)
            ink.line([(-9, -238), (9, -238)], BLK_HI, 3)
            for side in (-1, 1):
                ink.line([(side * 32, -250), (side * 48, -196), (side * 6, -150)], BLK_HI, 5)
                ink.line([(side * 66, -150), (side * 92, -150)], BLK_HI, 4)
            ink.line([(0, -160), (0, -84)], BLK_HI, 4)
            ink.dot(-10, -128, 5, BLK_HI)
            ink.dot(-10, -104, 5, BLK_HI)
        # head
        hx, hy = 0, -345 + bob
        tilt = p["tilt"] * 0.6
        with ink.at(hx, hy, tilt):
            for side in (-1, 1):
                ink.circle(side * 98, -82, 44, fill=BLK, w=LW)
                ink.circle(side * 96, -78, 22, fill=(62, 62, 72), outline=None)
            _fluffy_head(ink, 128, 106)
            _panda_face(ink, face, t, seed, talk, fx)
        # arms: black sleeves, white cuffs, black gloves
        hands = {}
        for key, (a1, a2), sx in (("l", p["la"], -1), ("r", p["ra"], 1)):
            sh = (sx * 80, -228 + bob)
            d1 = (math.sin(math.radians(a1)), math.cos(math.radians(a1)))
            d2 = (math.sin(math.radians(a2)), math.cos(math.radians(a2)))
            el = (sh[0] + d1[0] * 66, sh[1] + d1[1] * 66)
            hd = (el[0] + d2[0] * 62, el[1] + d2[1] * 62)
            ink.line([sh, el, hd], INK, 50, wob=0.4)
            ink.line([sh, el, hd], SLEEVE, 38, wob=0.4)
            ink.line([sh, el], BLK_HI, 4, wob=0.3)
            cuff = (el[0] + d2[0] * 44, el[1] + d2[1] * 44)
            ink.circle(cuff[0], cuff[1], 17, fill=WHITE, w=4)
            ink.circle(hd[0], hd[1], 26, fill=BLK, w=LW * 0.8)
            ink.arc(hd[0] - 6, hd[1] - 6, 14, 12, 200, 290, BLK_HI, 4)
            hands[key] = hd
        if pose == "thumbs":
            k = "l" if flip else "r"
            tx, ty = hands[k]
            ink.ellipse(tx + 4, ty - 32, 12, 22, fill=BLK, w=LW * 0.7)
        if hold:
            k = "l" if flip else "r"
            hold(ink, hands[k][0], hands[k][1], t)
    w = lambda pt: (x + pt[0] * s, y + pt[1] * s)
    out["hands"] = {k: w(v) for k, v in hands.items()}
    out["head"] = w((hx, hy))
    return out


def _panda_face(ink, face, t, seed, talk, fx):
    blink = (t + seed) % 3.4 < 0.11
    look = 4 * fx
    ex, ey, gr = 50, -6, 40
    # black eye patches behind the glasses
    for side in (-1, 1):
        ink.ellipse(side * ex, ey + 4, 40, 36, fill=BLK, outline=None, rot=-side * 18)
    # brows
    bro = {"worried": -1, "sad": -1, "shock": -0.6, "angry": 1.2, "smug": 0.5}.get(face, 0)
    for side in (-1, 1):
        inner = (side * 22, -62 + bro * 8)
        outer = (side * 74, -66 - bro * 4)
        ink.line([outer, ((inner[0] + outer[0]) / 2, -72), inner], INK, 8, smooth=True)
    cool = face == "cool"
    for side in (-1, 1):
        cx = side * ex
        ink.circle(cx, ey, gr, fill=LENS if not cool else (14, 14, 16), outline=INK, w=10)
        if cool:
            ink.line([(cx - 20, ey - 22), (cx - 4, ey - 30)], BLK_HI, 5)
            continue
        if face in ("grin", "wink") and (face == "grin" or side > 0):
            ink.arc(cx, ey + 6, 16, 14, 200, 340, WHITE, 7)
        elif blink:
            ink.line([(cx - 16, ey + 2), (cx + 16, ey + 2)], WHITE, 6)
        else:
            r = 19 if face == "shock" else 17
            ink.circle(cx + look * 0.5, ey + 1, r + 9, fill=WHITE, outline=None)
            ink.circle(cx + look, ey + 2, r, fill=IRIS, w=4)
            ink.dot(cx + look, ey + 3, r * 0.5, INK)
            ink.dot(cx + look - 7, ey - 6, 6, WHITE)
            ink.dot(cx + look + 6, ey + 9, 2.5, WHITE)
        ink.arc(cx, ey, gr - 8, gr - 8, 210, 250, (95, 95, 105), 5)
    ink.line([(-ex + gr - 2, ey - 4), (ex - gr + 2, ey - 4)], INK, 10)
    for side in (-1, 1):
        ink.line([(side * (ex + gr - 2), ey - 8), (side * 124, ey - 18)], INK, 7)
    # nose + mouth
    ink.shape([(-15, 30), (15, 30), (0, 46)], fill=INK, w=4, smooth=True)
    ink.dot(-4, 33, 3, BLK_HI)
    my = 56
    if talk is not None and talk > 0.1 and face not in ("shock",):
        o = min(1.0, talk)
        ink.ellipse(0, my + 6, 13 + 4 * o, 5 + 14 * o, fill=(150, 34, 44), w=5)
        if o > 0.4:
            ink.ellipse(0, my + 8 + 9 * o, 8, 4 * o, fill=(255, 130, 140), outline=None)
    elif face == "shock":
        ink.ellipse(0, my + 8, 12, 16, fill=(150, 34, 44), w=5)
    elif face in ("worried", "sad"):
        ink.arc(0, my + 14, 14, 8, 205, 335, INK, 5)
    elif face == "grin":
        pts = [(22 * math.cos(math.radians(a)), my - 4 + 20 * math.sin(math.radians(a))) for a in range(0, 181, 15)]
        ink.shape(pts, fill=(150, 34, 44), w=5)
        ink.ellipse(0, my + 9, 10, 5, fill=(255, 130, 140), outline=None)
    else:
        ink.line([(0, 46), (0, my - 4)], INK, 4)
        ink.arc(-11, my - 6, 11, 9, 10, 170, INK, 5)
        ink.arc(11, my - 6, 11, 9, 10, 170, INK, 5)
    if face in ("worried",):
        k = (t * 1.2) % 1.0
        ink.shape([(132, -50 + 30 * k), (124, -30 + 30 * k), (140, -30 + 30 * k)], fill=SKY, w=3)
        ink.circle(132, -26 + 30 * k, 8, fill=SKY, w=3)


# -- things the panda holds ------------------------------------------------------

def hold_mic(ink, x, y, t):
    with ink.at(x, y, -20):
        ink.rect(-9, -10, 9, 60, fill=(30, 30, 34), w=4, r=4)
        ink.circle(0, -30, 24, fill=GREY, w=5)
        for k in (-10, 0, 10):
            ink.line([(-18, -30 + k), (18, -30 + k)], (110, 110, 118), 2, wob=0)


def hold_coin(ink, x, y, t):
    props.coin(ink, x + 6, y - 30, 40, "₿", flip=math.cos(t * 3))


def hold_phone(ink, x, y, t, color=RED, down=True):
    with ink.at(x + 4, y - 50, -8):
        ink.rect(-34, -64, 34, 64, fill=(30, 30, 36), w=5, r=10)
        ink.rect(-27, -54, 27, 52, fill=WHITE, outline=None)
        pts = [(-22, -30), (-10, -38), (0, -20), (10, -6), (22, 30)] if down else \
              [(-22, 30), (-10, 18), (0, 22), (10, -4), (22, -34)]
        ink.line(pts, color, 5, wob=0.3)


def hold_sign(text, fill=WHITE, color=INK, size=40):
    def fn(ink, x, y, t):
        with ink.at(x, y, 4 + math.sin(t * 2) * 2):
            ink.line([(0, 20), (0, -150)], BROWN, 12)
            ink.rect(-150, -300, 150, -150, fill=fill, w=LW, r=6)
            lines = text.split("\n")
            for i, l in enumerate(lines):
                ink.text(0, -225 + (i - (len(lines) - 1) / 2) * size * 1.1, l, size, "caption", fill=color, stroke=None)
    return fn


def hold_pointer(ink, x, y, t):
    a = -40 + math.sin(t * 3) * 6
    with ink.at(x, y, a):
        ink.line([(0, 0), (0, -190)], BROWN, 8)
        ink.circle(0, -192, 7, fill=RED, outline=None)


def hold_bucket(ink, x, y, t, fill=0.0):
    with ink.at(x, y + 10):
        ink.shape([(-60, -40), (60, -40), (46, 60), (-46, 60)], fill=GREY, w=LW)
        if fill > 0:
            h = 90 * fill
            ink.shape([(-55, 50 - h), (55, 50 - h), (46, 56), (-46, 56)], fill=MONEY, outline=None)
            for i in range(int(4 * fill) + 1):
                props.bill(ink, -30 + i * 18, 40 - h, 0.22, i * 25)
        ink.arc(0, -40, 60, 60, 190, 350, INK, 6)


def hold_flower(ink, x, y, t):
    with ink.at(x, y, -10):
        ink.line([(0, 0), (6, -90)], DKGREEN, 6)
        for k in range(5):
            a = math.radians(k * 72 + t * 20)
            ink.circle(6 + math.cos(a) * 16, -100 + math.sin(a) * 16, 11, fill=(255, 210, 60), w=3)
        ink.circle(6, -100, 9, fill=ORANGE, w=3)


def hold_binoculars(ink, x, y, t):
    pass  # drawn over the eyes by the scene


def hold_calendar(label):
    def fn(ink, x, y, t):
        with ink.at(x + 10, y - 60, 6):
            ink.rect(-70, -80, 70, 80, fill=WHITE, w=LW)
            ink.rect(-70, -80, 70, -40, fill=RED, w=LW)
            ink.text(0, 18, label, 64, "caption", fill=INK, stroke=None)
            for k in (-40, 0, 40):
                ink.line([(k, -92), (k, -68)], INK, 6)
    return fn


HOLD = {"mic": hold_mic, "coin": hold_coin, "phone": hold_phone, "pointer": hold_pointer, "flower": hold_flower}


# -- panel scenes ------------------------------------------------------------------
# Each scene draws the illustration area (y from about -711 to +500 units, x +-400).

def ground_line(ink, y=430):
    ink.line([(-460, y), (460, y)], INK, 6, wob=0.8)


def label(ink, x, y, text, size, fill=WHITE, rot=0.0, key="caption", stroke=INK):
    ink.text(x, y, text, size, key, fill=fill, stroke=stroke, sw=0.12, rot=rot)


def scene_intro(ink, p, t, talk):
    """Title card on white: big two-tone title, panda reporter with a mic, a sign with the story."""
    ground_line(ink)
    k = ease_out_back(seg(t, 0.05, 0.4), 1.8)
    lines = p.get("title", "").split("\n")
    with ink.at(0, -420, -3, max(0.01, k)):
        for i, l in enumerate(lines):
            col = INK if i == 0 else BRAND
            ink.text(0, (i - (len(lines) - 1) / 2) * 112, l, 112, "caption", fill=col,
                     stroke=INK if i else None, sw=0.06)
        u = seg(t, 0.4, 0.7)
        if u > 0:
            ink.line([(-300, 128), (-300 + 600 * u, 116)], BRAND, 16)
    sub = p.get("subtitle", "")
    if sub:
        ink.text(0, -250, sub, 40 * pop(t, 0.5, 0.3), "caption", fill=(90, 90, 96), stroke=None)
    up = p.get("up", True)
    with ink.at(170, 40, 6 + math.sin(t * 2) * 2, pop(t, 0.3, 0.4)):
        ink.line([(0, 70), (0, 390)], BROWN, 14)
        ink.rect(-150, -50, 150, 70, fill=BRAND if up else RED, w=LW, r=6)
        ink.text(0, 14, p.get("sign", ""), 46, "caption", fill=WHITE, stroke=None)
    props.arrow(ink, 300, -90 + math.sin(t * 4) * 10, 1.0 * pop(t, 0.5), 0 if up else 180, BRAND if up else RED)
    panda(ink, -190, 430, 1.05, "present", t, "grin" if up else "shock", talk, hold_mic)


def scene_trophy(ink, p, t, talk):
    ground_line(ink)
    for i in range(46):
        a = (i * 137.5) % 360
        r = (i * 23) % 260
        bx, by = 80 + math.cos(math.radians(a)) * r * 1.2, 300 - abs(math.sin(math.radians(a))) * r * 1.1
        props.bill(ink, bx, by, 0.55, (i * 47) % 180 - 90, color=MONEY)
    with ink.at(60, -80, 0, ease_out_back(seg(t, 0.1, 0.5), 1.6)):
        ink.shape([(-130, -170), (130, -170), (100, 40), (40, 90), (-40, 90), (-100, 40)], fill=GOLD, w=LW, smooth=True)
        ink.arc(-140, -90, 60, 70, 100, 260, INK, 16)
        ink.arc(140, -90, 60, 70, -80, 80, INK, 16)
        ink.rect(-30, 90, 30, 160, fill=GOLD, w=LW)
        ink.rect(-90, 160, 90, 210, fill=(120, 80, 40), w=LW, r=6)
        ink.text(0, -100, p.get("label", "REKORD"), 50, "caption", fill=INK, stroke=None)
        ink.text(0, -30, p.get("value", ""), 66, "caption", fill=INK, stroke=None)
        if t > 0.5:
            for i in range(4):
                props.sparkle(ink, -150 + i * 100, -220 - (i % 2) * 40, 22 * pop(t, 0.5 + i * 0.1), WHITE)
    flag = p.get("flag", "")
    if flag:
        ink.line([(60, -300), (60, -500)], INK, 8)
        wv = math.sin(t * 5) * 8
        ink.shape([(60, -500), (200, -480 + wv), (60, -410)], fill=WHITE, w=LW)
        ink.text(115, -467, flag, 34, "caption", fill=NAVY, stroke=None)
    panda(ink, -222, 455, 0.95, "cheer", t, "grin", talk, hold_coin)


def scene_board(ink, p, t, talk):
    ground_line(ink)
    with ink.at(100, -150):
        ink.line([(-150, 260), (-200, 560)], BROWN, 14)
        ink.line([(150, 260), (200, 560)], BROWN, 14)
        ink.rect(-225, -250, 225, 260, fill=(40, 70, 56), w=LW, r=8)
        ink.rect(-225, -250, 225, 260, fill=None, outline=BROWN, w=16, r=8)
        lines = p.get("text", "").split("\n")
        tot = sum(len(l) for l in lines)
        shown = int(tot * seg(t, 0.2, 0.2 + 0.05 * tot))
        for i, l in enumerate(lines):
            part = l[:max(0, shown)]
            shown -= len(l)
            ink.text(0, (i - (len(lines) - 1) / 2) * 88, part, 72, "hand", fill=WHITE, stroke=None)
    panda(ink, -222, 455, 0.95, "point", t, "happy", talk, hold_pointer)


def scene_tombstone(ink, p, t, talk):
    ground_line(ink, 380)
    ink.ellipse(60, 390, 260, 40, fill=(120, 90, 60), w=LW)
    crack = seg(t, 0.6, 1.0)
    with ink.at(60, 0, -4 * crack):
        ink.shape([(-170, 380), (-170, -180), (-120, -300), (0, -340), (120, -300), (170, -180), (170, 380)],
                  fill=LTGREY, w=LW, smooth=False)
        ink.text(0, -200, "R.I.P.", 70, "caption", fill=(110, 110, 118), stroke=None)
        ink.text(0, -90, p.get("label", ""), 56, "caption", fill=(90, 90, 98), stroke=None)
        if crack > 0:
            ink.line([(-40, -320), (-10, -200), (-50, -60), (10, 80), (-20, 200)][:2 + int(crack * 3)], INK, 7)
    # the "dead" one is very much alive: a laptop pops out of the crack
    k = ease_out_back(seg(t, 1.0, 1.4), 2.0)
    if k > 0:
        with ink.at(215, 60 - 120 * k, 14, k * 0.75):
            ink.rect(-120, -90, 120, 70, fill=(40, 44, 54), w=LW, r=10)
            ink.rect(-102, -74, 102, 54, fill=SKY, outline=None)
            ink.text(0, -10, p.get("pop", ""), 46, "caption", fill=NAVY, stroke=None)
            ink.shape([(-150, 70), (150, 70), (170, 100), (-170, 100)], fill=GREY, w=LW)
        for i in range(3):
            ink.text(300 + i * 34, -200 - i * 50, "!", 80 * pop(t, 1.2 + i * 0.1), "comic", fill=RED, rot=12)
    panda(ink, -222, 455, 0.95, "shrug" if t < 1.2 else "shock", t, "smug" if t < 1.2 else "shock", talk, hold_flower)


def scene_bars(ink, p, t, talk):
    ground_line(ink)
    vals = p.get("values", [0.4, 0.55, 0.7, 1.0])
    base, x0 = 400, -95
    for i, v in enumerate(vals):
        k = ease_out_back(seg(t, 0.15 + i * 0.18, 0.55 + i * 0.18), 1.4)
        h = 620 * v * k
        col = GOLD if i == len(vals) - 1 else (120, 180, 255)
        ink.rect(x0 + i * 110, base - h, x0 + i * 110 + 86, base, fill=col, w=LW)
        lbls = p.get("labels", [])
        if i < len(lbls):
            ink.text(x0 + i * 110 + 43, base + 40, lbls[i], 32, "caption", fill=INK, stroke=None)
    k = pop(t, 0.15 + len(vals) * 0.18 + 0.2)
    if k > 0:
        props.burst(ink, x0 + len(vals) * 110 - 40, base - 620 * vals[-1] - 110, 110, p.get("sticker", ""), k, -8,
                    RED, WHITE, 5, size=58)
    ink.text(110, -505, p.get("value", ""), 84 * pop(t, 0.1), "caption", fill=INK, stroke=None)
    panda(ink, -222, 455, 0.95, "point_up", t, "grin", talk, hold_phone_up)


def hold_phone_up(ink, x, y, t):
    hold_phone(ink, x, y, t, GREEN, down=False)


def scene_cloudrain(ink, p, t, talk):
    ground_line(ink)
    cx, cy = 60, -360
    rng = np.random.default_rng(3)
    for i in range(16):
        x = cx - 220 + (i * 31) % 440
        sp = 300 + (i * 53) % 160
        y = cy + 60 + ((t * sp + i * 97) % 720)
        if y < 330:
            props.bill(ink, x + math.sin(t * 3 + i) * 20, y, 0.42, math.sin(t * 2 + i) * 40 + i * 30, color=MONEY)
    props.cloud(ink, cx, cy, 2.2, fill=WHITE)
    ink.text(cx, cy + 10, p.get("label", "CLOUD"), 72, "caption", fill=NAVY, stroke=None)
    k = pop(t, 0.4)
    if k > 0:
        props.burst(ink, 235, -500, 80, p.get("sticker", ""), k, 8, GREEN, WHITE, 2, size=50)
    fill = clamp(t / 4.0)
    panda(ink, -40, 470, 1.0, "hold", t, "grin", talk,
          lambda ink, x, y, tt: hold_bucket(ink, x - 70, y - 40, tt, fill))


def scene_sign(ink, p, t, talk):
    ground_line(ink)
    k = ease_out_back(seg(t, 0.05, 0.4), 1.6)
    panda(ink, -80, 470, 1.12, "present", t, p.get("face", "smug"), talk,
          hold_sign(p.get("text", ""), p.get("fill", WHITE), p.get("color", INK), p.get("size", 40)))


def scene_stack(ink, p, t, talk):
    ground_line(ink)
    n = 9
    shown = int(n * seg(t, 0.1, 1.6)) + 1
    for i in range(min(n, shown)):
        sway = math.sin(t * 2.4 + i * 0.4) * i * 2.2
        y = 400 - i * 92
        with ink.at(110 + sway, y, sway * 0.4):
            ink.rect(-150, -86, 150, 0, fill=TAN, w=LW)
            ink.line([(-150, -43), (150, -43)], BROWN, 5)
            ink.text(0, -42, p.get("box", "AUFTRAG"), 30, "caption", fill=BROWN, stroke=None)
    k = pop(t, 1.7)
    if k > 0:
        with ink.at(110, -500, -4, k):
            w = ink.text_w(p.get("value", ""), 54) + 50
            ink.rect(-w / 2, -55, w / 2, 55, fill=GOLD, w=LW, r=10)
            ink.text(0, 4, p.get("value", ""), 54, "caption", fill=INK, stroke=None)
    panda(ink, -222, 455, 0.95, "hold", t, "worried" if shown > 6 else "happy", talk,
          lambda ink, x, y, tt: [ink.rect(x - 70 + j * 4, y - 60 - j * 46, x + 70 + j * 4, y - 14 - j * 46,
                                          fill=TAN, w=LW * 0.8) for j in range(3)])


def scene_gauge(ink, p, t, talk):
    ground_line(ink)
    cx, cy, r = 60, -60, 265
    for i, col in enumerate((RED, ORANGE, GOLD, (150, 210, 90), GREEN)):
        ink.pie(cx, cy, r, 180 + i * 36, 180 + (i + 1) * 36, col, w=LW)
    ink.pie(cx, cy, r * 0.55, 180, 360, PAPER_W, w=LW)
    v = p.get("level", 0.9) * ease_out_back(seg(t, 0.3, 1.5), 1.3) + math.sin(t * 9) * 0.01
    a = math.radians(180 + 180 * v)
    ink.line([(cx, cy), (cx + math.cos(a) * r * 0.9, cy + math.sin(a) * r * 0.9)], INK, 14)
    ink.circle(cx, cy, 26, fill=INK)
    ink.text(cx, cy + 90, p.get("label", ""), 52, "caption", fill=INK, stroke=None)
    ink.text(cx, -470, p.get("value", ""), 86 * pop(t, 0.1), "caption", fill=GREEN, sw=0.08)
    panda(ink, -222, 455, 0.95, "thumbs", t, "grin", talk)


def scene_hook(ink, p, t, talk):
    ground_line(ink)
    # chart that flattens out
    pts = [(-120 + i * 50, 200 - 420 * (1 - math.exp(-i / 3.2))) for i in range(11)]
    props.axes(ink, -150, -340, 400, 230)
    props.chart(ink, pts, seg(t, 0.1, 1.6), GOLD, 12)
    # the hook drops in from the top
    hy = lerp(-900, -430, ease_out_back(seg(t, 0.3, 0.9), 1.4)) + math.sin(t * 2) * 8
    hx = 160 + math.sin(t * 1.6) * 14
    ink.line([(hx, -1000), (hx, hy)], INK, 5, wob=0.3)
    ink.arc(hx - 30, hy + 50, 30, 30, -10, 190, (150, 150, 160), 12)
    ink.line([(hx, hy), (hx, hy + 50)], (150, 150, 160), 12)
    with ink.at(hx + 90, hy + 10, 8):
        ink.rect(-70, -30, 70, 30, fill=WHITE, w=6, r=6)
        ink.text(0, 2, p.get("label", "HAKEN"), 34, "caption", fill=RED, stroke=None)
    panda(ink, -222, 455, 0.95, "hold", t, "worried", talk, hold_calendar(p.get("cal", "Q4")))


def scene_rocket(ink, p, t, talk):
    ground_line(ink)
    for i in range(3):
        props.cloud(ink, -260 + i * 260, -420 + (i % 2) * 160 + math.sin(t + i) * 10, 0.7, fill=WHITE)
    k = ease_in_out(seg(t, 0.0, 3.0))
    rx, ry = lerp(-180, 160, k), lerp(380, -360, k)
    trail = [(lerp(-180, 160, k * j / 20) + (14 if j % 2 else -14), lerp(380, -360, k * j / 20) + 120) for j in range(21)]
    props.chart(ink, trail, 1.0, BRAND, 12, dot=False)
    with ink.at(rx, ry, 22, 1.4):
        props.rocket(ink, 0, 0, 1.0, 0, t)
        ink.text(0, 30, p.get("label", ""), 26, "caption", fill=NAVY, stroke=None)
    panda(ink, rx - 10, ry + 30, 0.5, "cheer", t, "grin", talk, hold_coin)
    ink.text(200, -500, p.get("value", ""), 84 * pop(t, 0.3), "caption", fill=GOLD, sw=0.08)


def scene_binoculars(ink, p, t, talk):
    ground_line(ink)
    with ink.at(105, -120, 3):
        ink.line([(0, 250), (0, 560)], BROWN, 14)
        ink.rect(-200, -150, 200, 250, fill=WHITE, w=LW, r=8)
        lines = p.get("text", "").split("\n")
        for i, l in enumerate(lines):
            ink.text(0, 50 + (i - (len(lines) - 1) / 2) * 76, l, 54 if i else 40, "caption",
                     fill=GREEN if i else INK, stroke=None)
    o = panda(ink, -222, 455, 0.95, "hold", t, "happy", talk)
    hx, hy = o["head"]
    with ink.at(hx + 8, hy - 8 * 0.82, math.sin(t * 1.5) * 4, 0.82):
        for side in (-1, 1):
            ink.rect(side * 38 - 24, -40, side * 38 + 24, 30, fill=(30, 30, 36), w=LW, r=10)
            ink.circle(side * 38, -40, 26, fill=SKY, w=LW)
        ink.rect(-14, -20, 14, 6, fill=(30, 30, 36), w=5)
    for i in range(3):
        a = t * 3 + i
        ink.text(-300 + i * 70, -420 - (i % 2) * 40, "?", 90 * pop(t, 0.6 + i * 0.15), "caption", fill=GOLD, rot=a * 5)


SCENES = {
    "intro": scene_intro, "trophy": scene_trophy, "board": scene_board, "tombstone": scene_tombstone,
    "bars": scene_bars, "cloudrain": scene_cloudrain, "sign": scene_sign, "stack": scene_stack,
    "gauge": scene_gauge, "hook": scene_hook, "rocket": scene_rocket, "binoculars": scene_binoculars,
}


# -- renderer ----------------------------------------------------------------------

class ComicRenderer:
    def __init__(self, plan, ss=2, env=None):
        self.plan, self.ss = plan, ss
        self.W, self.H, self.fps = plan["width"], plan["height"], plan["fps"]
        self.u = self.W / 800
        self.env = env if env is not None else np.zeros(int(plan["duration"] * self.fps) + 2)
        self.words = plan["words"]
        Wp, Hp = self.W * ss, self.H * ss
        self.bg = Image.new("RGB", (Wp, Hp), PAPER_W)
        from .render import caption_chunks
        self.chunks = caption_chunks(self.words, dict(cap_words=3, cap_chars=18))

    def panel_at(self, t):
        ps = self.plan["panels"]
        for i, p in enumerate(ps):
            if p["start"] <= t < p["end"]:
                return i, p
        return len(ps) - 1, ps[-1]

    def draw_panel(self, idx, lt, talk, frame_i):
        p = self.plan["panels"][idx]
        img = self.bg.copy()
        u = self.u * self.ss
        ink = Ink(img, affine(self.W * self.ss / 2, self.H * self.ss / 2, 0, u), frame_i // 3 + idx * 31, self.ss)
        # the picture fills the upper ~3/4 of the frame; subtitles live underneath on plain white
        with ink.at(-18, -112, 0, 1.05):
            SCENES[p["scene"]](ink, p, lt, talk)
        return img

    def frame(self, i):
        t = i / self.fps
        idx, p = self.panel_at(t)
        lt = t - p["start"]
        talk = float(self.env[min(i, len(self.env) - 1)])
        img = self.draw_panel(idx, lt, talk, i)
        push = 0.32
        if idx > 0 and lt < push:
            # the new picture is pushed in from the right and shoves the old one out
            prev = self.plan["panels"][idx - 1]
            pimg = self.draw_panel(idx - 1, prev["end"] - prev["start"], 0.0, i)
            e = ease_out(lt / push)
            off = int(img.width * (1 - e))
            comp = self.bg.copy()
            comp.paste(pimg, (off - img.width, 0))
            comp.paste(img, (off, 0))
            img = comp
        self._captions(img, t, i)
        if self.ss != 1:
            img = img.reduce(self.ss)
        return img

    def _captions(self, img, t, i):
        """Big karaoke subtitles at the bottom: no box, white with a fat outline, spoken word in brand green."""
        cur = None
        for s_, e_, c in self.chunks:
            if s_ <= t < e_:
                cur = (s_, e_, c)
                break
        if not cur:
            return
        s_, e_, c = cur
        ov = Ink(img, affine(self.W * self.ss / 2, self.H * self.ss / 2, 0, self.u * self.ss), i // 3, self.ss)
        size = self.plan.get("cap_size", 84)
        words = [self.words[j] for j in c]
        texts = [w["w"].upper().strip(",;:") for w in words]
        space = size * 0.3
        widths = [ov.text_w(tx, size) for tx in texts]
        lines, line, lw = [], [], 0.0
        for j, wd in enumerate(widths):
            if line and lw + space + wd > 740:
                lines.append(line)
                line, lw = [], 0.0
            lw += (space if line else 0) + wd
            line.append(j)
        lines.append(line)
        k = 0.8 + 0.2 * ease_out_back(seg(t, s_, s_ + 0.12), 2.4)
        y0 = self.plan.get("cap_y", 470) - (len(lines) - 1) * size * 0.55
        with ov.at(0, y0, 0, k):
            for li, ln in enumerate(lines):
                total = sum(widths[j] for j in ln) + space * (len(ln) - 1)
                x = -total / 2
                for j in ln:
                    w = words[j]
                    active = w["s"] <= t < max(w["e"], w["s"] + 0.08)
                    sc = 1 + 0.14 * math.exp(-(t - w["s"]) * 12) if active else 1.0
                    with ov.at(x + widths[j] / 2, li * size * 1.08, -2 if active else 0, sc):
                        ov.text(0, 0, texts[j], size, "caption", fill=BRAND if active else WHITE, stroke=INK,
                                sw=0.16, shadow=0.07)
                    x += widths[j] + space


_R = None


def _init(plan, ss, env):
    global _R
    _R = ComicRenderer(plan, ss, env)


def _work(i):
    return _R.frame(i).tobytes()


def render(plan, out_path, ss=2, workers=None, log=print):
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fps, dur = plan["fps"], plan["duration"]
    n = int(math.ceil(dur * fps))
    voice = audio.load(plan["audio"])
    env = audio.envelope(voice, fps, n)
    cues = []
    for i, p in enumerate(plan["panels"]):
        if i:
            cues.append((p["start"], "whoosh"))
        cues.append((p["start"] + 0.18, "pop"))
        cues += [(p["start"] + c[0], c[1]) for c in p.get("sfx", [])]
    mus = None
    if plan.get("music") in ("funny", "serious"):
        mus = audio.music(dur, plan["music"])
    mixed = audio.mix(voice, dur, cues, mus, env, fps, sfx_gain=0.5)
    wav = out_path.with_suffix(".mix.wav")
    audio.save(wav, mixed)
    cmd = ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{plan['width']}x{plan['height']}",
           "-r", str(fps), "-i", "-", "-i", str(wav), "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "medium",
           "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart",
           str(out_path)]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    t0 = time.time()
    with mp.Pool(workers or mp.cpu_count(), initializer=_init, initargs=(plan, ss, env)) as pool:
        for k, buf in enumerate(pool.imap(_work, range(n), chunksize=4)):
            proc.stdin.write(buf)
            if k % (fps * 10) == 0:
                log(f"  frame {k}/{n} ({time.time() - t0:.0f}s)")
    proc.stdin.close()
    if proc.wait() != 0:
        sys.exit("ffmpeg failed")
    wav.unlink(missing_ok=True)
    log(f"  wrote {out_path} ({n} frames in {time.time() - t0:.0f}s)")
