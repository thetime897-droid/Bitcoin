"""Scene templates.

Each scene is a pure function of its local time ``s.t`` that draws one shot.
``cues(s)`` returns the timed events the renderer and mixer need for that
shot: ("sfx", t, name), ("shake", t, strength) and ("flash", t, rgb).
"""
import math
import random
import re

from .anim import clamp, lerp, seg, ease_out, ease_in, ease_in_out, ease_out_back, pop, wiggle, decay
from .characters import figure
from .ink import (INK, WHITE, GREEN, DKGREEN, RED, DKRED, GOLD, ORANGE, BLUE, SKY, NAVY, PINK, GREY,
                  LTGREY, TAN, PAPER, mix)
from . import props

SCENES = {}


def scene(name, cues=None, own_headline=False):
    def deco(fn):
        SCENES[name] = dict(draw=fn, cues=cues or (lambda s: []), own_headline=own_headline)
        return fn
    return deco


class Shot:
    """Everything a scene needs to know about itself at one moment."""

    def __init__(self, info, t, talk, layout):
        self.__dict__.update(info)
        self.t = t
        self.p = clamp(t / max(0.01, self.dur))
        self.talk = talk
        self.W2 = layout["W2"]
        self.G = layout["G"]
        self.short = layout["short"]


# -- helpers ----------------------------------------------------------------

def wrap(text, max_chars):
    words, lines, cur = text.split(), [], ""
    for w in words:
        if cur and len(cur) + 1 + len(w) > max_chars:
            lines.append(cur)
            cur = w
        else:
            cur = (cur + " " + w).strip()
    if cur:
        lines.append(cur)
    return lines


def fit(ink, lines, max_w, size, key="caption"):
    widest = max((ink.text_w(l, 100, key) for l in lines), default=1)
    return min(size, 100 * max_w / max(1.0, widest))


def parse_num(raw):
    raw = raw.strip(".,")
    if "," in raw and "." in raw:
        raw = raw.replace(".", "").replace(",", ".") if raw.rfind(",") > raw.rfind(".") else raw.replace(",", "")
    elif "," in raw:
        head, tail = raw.rsplit(",", 1)
        raw = raw.replace(",", "") if len(tail) == 3 and head.isdigit() else raw.replace(",", ".")
    elif raw.count(".") >= 1:
        head, tail = raw.rsplit(".", 1)
        if len(tail) == 3:
            raw = raw.replace(".", "")
    try:
        return float(raw)
    except ValueError:
        return 0.0


def count_fmt(numstr, k):
    """Render ``numstr`` (e.g. "100.000 €") with its number scaled by k."""
    m = re.search(r"\d[\d.,]*", numstr)
    if not m:
        return numstr
    raw = m.group(0).strip(".,")
    val = parse_num(raw)
    dec = 0
    if "," in raw and len(raw.rsplit(",", 1)[1]) != 3:
        dec = len(raw.rsplit(",", 1)[1])
    txt = f"{val * k:,.{dec}f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return numstr[:m.start()] + txt + numstr[m.start() + len(raw):]


def ground(ink, s, color=INK):
    ink.line([(-s.W2 * 1.8, s.G), (s.W2 * 1.8, s.G)], mix(color, PAPER, 0.25), 5, wob=1.4)


def shadow(ink, x, y, rx, dark=False):
    ink.ellipse(x, y + 4, rx, rx * 0.16, fill=mix(PAPER, INK, 0.25 if dark else 0.12), outline=None)


def hero(ink, s, x, pose, face, sc=1.0, flip=False, talk=True, kind="hero", **kw):
    shadow(ink, x, s.G, 70 * sc)
    return figure(ink, x, s.G, pose, s.t, face, sc, flip, kind, s.talk if talk else None,
                  seed=s.seed % 7, **kw)


def mood_face(s, happy="happy"):
    return happy if s.sentiment >= 0 else "worried"


def big_text(ink, lines, x, y, size, colors=(WHITE, GOLD), rot=-4.0, scale=1.0, key="caption"):
    lh = size * 1.02
    y0 = y - lh * (len(lines) - 1) / 2
    with ink.at(x, y, rot, scale):
        for i, line in enumerate(lines):
            ink.text(0, y0 - y + i * lh, line, size, key, fill=colors[i % len(colors)],
                     stroke=INK, sw=0.11, shadow=0.07)


# -- scenes -----------------------------------------------------------------

def _hook_cues(s):
    return [("sfx", 0.0, "whoosh"), ("sfx", 0.22, "impact"), ("shake", 0.22, 16), ("sfx", 0.55, "pop")]


@scene("hook", _hook_cues, own_headline=True)
def hook(ink, s):
    t = s.t
    c1, c2 = (mix(PAPER, GOLD, 0.25), mix(PAPER, GOLD, 0.55)) if s.sentiment >= 0 else \
             (mix(PAPER, RED, 0.12), mix(PAPER, RED, 0.3))
    props.sunburst(ink, 0, -80, c1, c2, rot=t * 14)
    ground(ink, s)
    k = pop(t, 0.1, 0.4)
    if k > 0:
        o = hero(ink, s, 0, "shock" if t < 1.4 else "point_up", "shock" if t < 1.4 else "idea",
                 sc=1.1 * k)
        hx, hy = o["head"]
        for i, (dx, rot) in enumerate(((-95, -18), (95, 16))):
            kk = pop(t, 0.5 + i * 0.08, 0.3)
            if kk > 0:
                ink.text(hx + dx, hy - 40, "!", 110 * kk, "comic", fill=RED, rot=rot, sw=0.12)
    head = s.hook_text or s.headline
    lines = wrap(head.upper(), 13 if s.short else 22)
    size = fit(ink, lines, s.W2 * 1.8, 112 if s.short else 120)
    size = min(size, (330 if s.short else 270) / max(1, len(lines)) / 1.02)
    sl = seg(t, 0.0, 0.22)
    scale = 1 + 2.4 * (1 - ease_out(sl))
    if t > 0.22:
        scale = 1 + 0.06 * math.sin((t - 0.22) * 9) * math.exp(-(t - 0.22) * 4) + 0.02 * s.p
    big_text(ink, lines, 0, -330 if s.short else -250, size, scale=scale)


def _explain_cues(s):
    if s.variant == "stat":
        cues = [("sfx", 0.1, "whoosh")]
        cues += [("sfx", 0.15 + i * 0.09, "tick") for i in range(8)]
        return cues + [("sfx", 0.95, "ding"), ("shake", 0.95, 8)]
    if s.variant == "board":
        return [("sfx", 0.25 + i * 0.12, "tick") for i in range(min(6, len(s.headline)))]
    return [("sfx", 0.15, "pop")]


@scene("explain", _explain_cues, own_headline=False)
def explain(ink, s):
    t = s.t
    ground(ink, s)
    if s.variant == "stat" and s.number:
        k = ease_out(seg(t, 0.15, 0.95))
        txt = count_fmt(s.number, k).upper()
        col = GREEN if s.sentiment >= 0 else RED
        size = fit(ink, [txt], s.W2 * 1.6, 230)
        sc = 1 + 0.25 * decay(t, 0.95, 0.4) * math.sin((t - 0.95) * 20)
        with ink.at(0, -200, -3, sc):
            ink.text(0, 0, txt, size, "caption", fill=col, sw=0.1, shadow=0.07)
            sub = s.sub.upper() if s.sub else ""
            if sub:
                ink.text(0, size * 0.75, sub, min(70, fit(ink, [sub], s.W2 * 1.3, 70, "marker")), "marker",
                         fill=INK, stroke=None)
        if t > 0.95:
            for i in range(6):
                a = i * 60 + t * 40
                r = 260 + 30 * math.sin(t * 5 + i)
                props.sparkle(ink, math.cos(math.radians(a)) * r * 1.4, -200 + math.sin(math.radians(a)) * r * 0.6,
                              16 * pop(t, 0.95 + i * 0.05, 0.3), GOLD)
        ax = s.W2 * 0.62
        props.arrow(ink, ax, s.G - 130 + math.sin(t * 6) * 12, 0.9 * pop(t, 0.3), 0 if s.sentiment >= 0 else 180,
                    col)
        hero(ink, s, -s.W2 * 0.55, "point_up" if t < 1.6 else "talk", "shock" if t < 0.95 else mood_face(s, "grin"))
        return
    if s.variant == "board":
        bw = min(560, s.W2 * 1.05)
        bx = s.W2 * 0.27
        top = s.G - 520
        props.board(ink, bx, top, bw, 340)
        lines = wrap(s.headline.upper(), 12 if s.short else 16)[:3]
        size = fit(ink, lines, bw * 0.84, 92, "marker")
        total = sum(len(l) for l in lines)
        shown = int(total * seg(t, 0.25, 0.25 + 0.06 * total))
        y = top + 170 - (len(lines) - 1) * size * 0.55
        for line in lines:
            part = line[:max(0, shown)]
            shown -= len(line)
            if part:
                ink.text(bx, y, part, size, "marker", fill=INK if s.sentiment >= 0 else DKRED, stroke=None)
            y += size * 1.1
        u = seg(t, 0.3 + 0.06 * total, 0.6 + 0.06 * total)
        if u > 0:
            ink.line([(bx - bw * 0.36, y - size * 0.35), (bx - bw * 0.36 + bw * 0.72 * u, y - size * 0.45)],
                     RED, 9)
        hero(ink, s, -s.W2 * 0.62, "point" if t < s.dur * 0.6 else "talk", "happy")
        return
    # speech bubble
    k = pop(t, 0.12, 0.4)
    hx = -s.W2 * 0.5
    o = hero(ink, s, hx, "talk", mood_face(s))
    if k > 0:
        bw, bh = min(620, s.W2 * 1.15), 300
        cx, cy = s.W2 * 0.25, s.G - 560
        hx2, hy2 = o["head"]
        with ink.at(cx, cy, -2, k):
            props.speech(ink, 0, 0, bw, bh, (hx2 + 60 - cx) / k, (hy2 - 20 - cy) / k)
            lines = wrap(s.headline.upper(), 11 if s.short else 15)[:3]
            size = fit(ink, lines, bw * 0.72, 80)
            for i, line in enumerate(lines):
                ink.text(0, (i - (len(lines) - 1) / 2) * size * 1.05, line, size, "caption",
                         fill=GOLD if i % 2 else WHITE, sw=0.12)


def _think_t(s):
    return min(max(0.9, s.dur * 0.55), 2.0)


@scene("think", lambda s: [("sfx", 0.05, "pop"), ("sfx", _think_t(s), "ding"), ("shake", _think_t(s), 6)])
def think(ink, s):
    t, ts = s.t, _think_t(s)
    ground(ink, s)
    idea = t >= ts
    hero(ink, s, -s.W2 * 0.42, "point_up" if idea else "think", "idea" if idea else "neutral",
         talk=not idea or s.talk > 0.1)
    k = pop(t, 0.05, 0.4)
    if k <= 0:
        return
    bx, by = s.W2 * 0.3, s.G - 600
    with ink.at(bx, by, 0, k):
        props.thought(ink, 0, 0, 1.0)
        if not idea:
            b = math.sin(t * 7) * 10
            ink.text(0, b, "?", 170, "caption", fill=GOLD, rot=wiggle(t, 0.8) * 10, sw=0.08, shadow=0.05)
        else:
            props.lightbulb(ink, 0, 10, 1.15 * pop(t, ts, 0.35), 1.0, t)


def _infl_steps(s):
    n = 4
    t0, t1 = 0.35, max(0.9, s.dur * 0.85)
    return [t0 + (t1 - t0) * i / (n - 1) for i in range(n)]


@scene("inflation", lambda s: [("sfx", ts, "boing" if i % 2 == 0 else "pop") for i, ts in enumerate(_infl_steps(s))])
def inflation(ink, s):
    t = s.t
    ground(ink, s)
    steps = _infl_steps(s)
    done = sum(1 for ts in steps if t >= ts)
    rate = 0.25
    if s.number and "%" in s.number:
        rate = max(0.05, min(0.6, parse_num(re.search(r"\d[\d.,]*", s.number).group(0)) / 100 * 3))
    price = 1.0 * (1 + rate) ** done
    shrink = ease_in_out(seg(t, 0.3, max(1.0, s.dur * 0.9)))
    face = "happy" if done == 0 else ("worried" if done < 3 else "shock")
    o = hero(ink, s, -s.W2 * 0.5, "hold", face)
    (lx, ly), (rx, ry) = o["hands"]["l"], o["hands"]["r"]
    props.bill(ink, (lx + rx) / 2, (ly + ry) / 2 - 10, 1.05 * (1 - 0.6 * shrink), wiggle(t, 0.7) * 6,
               color=mix(GREEN, GREY, shrink))
    tx = s.W2 * 0.42
    ink.line([(tx - 170, s.G - 120), (tx + 170, s.G - 120)], INK, 8)
    ink.line([(tx - 140, s.G - 120), (tx - 140, s.G)], INK, 7)
    ink.line([(tx + 140, s.G - 120), (tx + 140, s.G)], INK, 7)
    props.bread(ink, tx, s.G - 165, 1.0 + 0.08 * decay(t, steps[min(done, 3)] if done else 99, 0.3))
    last = steps[done - 1] if done else -9
    swing = 16 * math.sin((t - last) * 12) * math.exp(-(t - last) * 4) if done else 3 * math.sin(t * 2)
    price_txt = f"{price:.2f}€".replace(".", ",")
    props.tag(ink, tx + 40, s.G - 400, price_txt, 1.0 + 0.2 * decay(t, last, 0.25), swing,
              fill=WHITE if done < 2 else mix(WHITE, RED, 0.25), color=INK if done < 2 else DKRED)
    if s.number and "%" in s.number and done:
        k = pop(t, steps[0], 0.35)
        props.arrow(ink, tx - 150, s.G - 440, 0.55 * k, 0, RED)
        ink.text(tx - 150, s.G - 560, "+" + s.number.replace(" ", ""), 64 * k, "caption", fill=RED, sw=0.12)


def _crash_t(s):
    return min(1.3, max(0.6, s.dur * 0.4))


@scene("crash", lambda s: [("sfx", _crash_t(s) - 0.05, "slide_down"), ("sfx", _crash_t(s) + 0.45, "impact"),
                           ("shake", _crash_t(s) + 0.45, 22), ("flash", _crash_t(s) + 0.45, RED)])
def crash(ink, s):
    t, tc = s.t, _crash_t(s)
    rng = random.Random(s.seed)
    x0, x1 = (-s.W2 * 0.86, s.W2 * 0.86) if s.short else (-s.W2 * 0.38, s.W2 * 0.86)
    top, base = (-400, -40) if s.short else (-330, 160)
    ground(ink, s)
    n_up = 8
    pts = []
    for i in range(n_up + 1):
        k = i / n_up
        y = lerp(base - 60, top + 30, k ** 1.2) + (rng.uniform(-40, 40) if 0 < i < n_up else 0)
        pts.append((lerp(x0, x0 + (x1 - x0) * 0.7, k), y))
    pts.append((x0 + (x1 - x0) * 0.78, base - 120))
    pts.append((x0 + (x1 - x0) * 0.86, base + 10))
    pts.append((x1, base + 30))
    rise_len = sum(math.dist(pts[i], pts[i + 1]) for i in range(n_up))
    tot = rise_len + sum(math.dist(pts[i], pts[i + 1]) for i in range(n_up, len(pts) - 1))
    fp = rise_len / tot
    prog = fp * seg(t, 0, tc) if t < tc else fp + (1 - fp) * ease_in(seg(t, tc, tc + 0.45))
    crashed = t >= tc
    props.axes(ink, x0 - 20, top - 60, x1 + 10, base + 40)
    head = props.chart(ink, pts, prog, RED if crashed else GREEN, 13, area=base + 40)
    th = tc + 0.45
    if t > tc:
        for i in range(4):
            kx = rng.uniform(-90, 90)
            dt = t - tc - i * 0.08
            if dt > 0:
                props.coin(ink, pts[n_up][0] + kx + dt * kx, pts[n_up][1] + 900 * dt * dt - 200 * dt, 30, "€",
                           rot=dt * 300, flip=math.cos(dt * 14))
    o = hero(ink, s, -s.W2 * (0.45 if s.short else 0.66), "cheer" if not crashed else "panic",
             "grin" if not crashed else "shock", talk=not crashed)
    if t >= th:
        k = pop(t, th, 0.35)
        bx, by = x0 + (x1 - x0) * 0.82, base - (100 if s.short else 170)
        label = "CRASH!" if s.lang == "de" else "CRASH!"
        props.burst(ink, bx - (40 if s.short else 0), by, min(190, s.W2 * 0.42), label, k * (1 + 0.04 * math.sin(t * 20)), -8, GOLD, RED, s.seed)


@scene("moon", lambda s: [("sfx", 0.1, "rise"), ("sfx", max(0.6, s.dur * 0.8), "ding")], own_headline=False)
def moon(ink, s):
    t = s.t
    rng = random.Random(s.seed)
    ink.rect(-3000, -3000, 3000, 3000, fill=NAVY, outline=None, wob=0)
    for i in range(46):
        x, y = rng.uniform(-s.W2 * 1.4, s.W2 * 1.4), rng.uniform(-1000, 600)
        r = rng.uniform(4, 11) * (0.6 + 0.4 * math.sin(t * rng.uniform(2, 6) + i))
        props.sparkle(ink, x, y, r, mix(WHITE, GOLD, rng.random()))
    mx, my = s.W2 * 0.58, -470 if s.short else -290
    ink.circle(mx, my, 95, fill=(255, 236, 170), outline=None)
    for cx, cy, r in ((-30, -20, 18), (25, 10, 24), (-10, 40, 12)):
        ink.circle(mx + cx, my + cy, r, fill=(236, 210, 140), outline=None)
    k = ease_in_out(seg(t, 0.05, max(0.8, s.dur * 0.9)))
    sx, sy = -s.W2 * 0.55, s.G + 320
    ex, ey = s.W2 * 0.2, -330 if s.short else -140
    cx, cy = lerp(sx, ex, k) + math.sin(k * 7) * 40, lerp(sy, ey, k)
    trail = []
    for i in range(40):
        kk = k * i / 39
        trail.append((lerp(sx, ex, kk) + math.sin(kk * 7) * 40 + (18 if i % 3 == 0 else -14) * (i < 38),
                      lerp(sy, ey, kk) + 120))
    if len(trail) > 1:
        props.chart(ink, trail, 1.0, GREEN, 12, dot=False)
    k2 = min(1.0, k + 0.02)
    nx = lerp(sx, ex, k2) + math.sin(k2 * 7) * 40 - cx
    ny = lerp(sy, ey, k2) - cy
    ang = math.degrees(math.atan2(nx, -ny)) if abs(nx) + abs(ny) > 0.01 else 0
    with ink.at(cx, cy, ang * 0.7 + math.sin(t * 18) * 1.5, 1.05 if s.short else 1.3):
        props.rocket(ink, 0, 0, 1.0, 0, t)
        figure(ink, 0, 45, "cheer", t, "money", 0.55, talk=s.talk, seed=1)
    if s.number:
        kk = pop(t, 0.6, 0.4)
        ink.text(-s.W2 * 0.42, -230, s.number.upper(), 120 * kk, "caption", fill=GOLD, rot=-6, sw=0.1, shadow=0.07)


def _bb_cues(s):
    return [("sfx", 0.1, "impact"), ("shake", 0.1, 10), ("sfx", 0.7, "boing"), ("sfx", max(1.0, s.dur * 0.7), "boing")]


@scene("bullbear", _bb_cues)
def bullbear(ink, s):
    t = s.t
    ground(ink, s)
    d = s.sentiment if s.sentiment else (1 if s.seed % 2 else -1)
    xc = d * s.W2 * 0.22 * ease_in_out(seg(t, 0.5, s.dur)) + wiggle(t, 1.3, s.seed) * 18
    sc = 0.85 if s.short else 1.0
    shadow(ink, xc - 130 * sc, s.G, 140 * sc)
    shadow(ink, xc + 130 * sc, s.G, 140 * sc)
    props.bull(ink, xc - 150 * sc, s.G, sc, t, 1.0)
    props.bear(ink, xc + 150 * sc, s.G, sc, t, 1.0)
    rng = random.Random(s.seed)
    for i in range(6):
        ph = (t * 1.4 + i / 6) % 1
        side = -1 if i % 2 else 1
        x = xc + side * (200 + ph * 160) * sc
        ink.circle(x, s.G - 20 - ph * 50, (14 + 26 * ph) * (1 - ph * 0.5),
                   fill=mix(PAPER, GREY, 0.6 * (1 - ph)), outline=None)
    k = pop(t, 0.1, 0.35) * (1 - ease_in(seg(t, 1.1, 1.4)))
    if k > 0.01:
        props.burst(ink, xc, s.G - 470, 120, "VS", k, 6, GOLD, RED, s.seed + 3)
    if t > s.dur * 0.7 and s.sentiment:
        k = pop(t, s.dur * 0.7, 0.35)
        ink.text(xc + d * 260 * sc, s.G - 450, "BULLEN!" if d > 0 and s.lang == "de" else
                 ("BULLS!" if d > 0 else ("BÄREN!" if s.lang == "de" else "BEARS!")),
                 90 * k, "caption", fill=GREEN if d > 0 else RED, rot=-d * 6, shadow=0.06)


def _save_coins(s):
    n = int(clamp((s.dur - 0.5) / 0.5, 2, 5))
    return [0.25 + i * 0.5 for i in range(n)]


@scene("save", lambda s: [("sfx", ti + 0.38, "kaching" if i in (0, len(_save_coins(s)) - 1) else "coin")
                          for i, ti in enumerate(_save_coins(s))])
def save(ink, s):
    t = s.t
    ground(ink, s)
    times = _save_coins(s)
    px, py = s.W2 * 0.3, s.G - 82
    landed = [ti + 0.38 for ti in times if t >= ti + 0.38]
    sq = max((decay(t, lt, 0.25) for lt in landed), default=0.0)
    shadow(ink, px, s.G, 140)
    props.piggy(ink, px, py, 0.95, wiggle(t, 0.4) * 2, squash=sq * math.sin((t - (landed[-1] if landed else 0)) * 25))
    for ti in times:
        if ti <= t < ti + 0.38:
            k = ease_in(seg(t, ti, ti + 0.38))
            props.coin(ink, px - 5, lerp(-760, py - 90, k), 34, "€", flip=math.cos(t * 16))
    step_txt = s.number if (s.number and "€" in s.number) else ("10 €" if s.lang == "de" else "$10")
    n = len(landed)
    if n:
        total = count_fmt(step_txt, n)
        k = 1 + 0.25 * decay(t, landed[-1], 0.25)
        ink.text(px, py - 250, "+" + total.replace(" ", ""), 84 * k, "caption", fill=GREEN, rot=-4, shadow=0.06)
    hero(ink, s, -s.W2 * 0.52, "thumbs" if n else "talk", "grin" if n > 1 else "happy")


@scene("compound", lambda s: [("sfx", 0.0, "rumble"), ("sfx", max(0.8, s.dur * 0.85), "ding")])
def compound(ink, s):
    t = s.t
    ground(ink, s)
    k = seg(t, 0.0, s.dur)
    r = 34 * math.exp(1.55 * k)
    bx = lerp(-s.W2 * 1.15, s.W2 * 0.2, ease_out(k))
    props.speedlines(ink, -s.W2 * 1.4, bx - r, [s.G - 30, s.G - 90, s.G - 160], t, mix(INK, PAPER, 0.4), s.seed)
    shadow(ink, bx, s.G, r * 1.1)
    props.snowball(ink, bx, s.G - r, r, rot=(bx + s.W2) / max(10, r) * 57)
    hx = max(bx + r + 110, s.W2 * 0.62)
    hero(ink, s, hx, "run", "shock" if s.p > 0.5 else "grin", flip=False)
    gx0, gx1, gy0, gy1 = -s.W2 * 0.85, -s.W2 * 0.05, s.G - 760, s.G - 470
    props.axes(ink, gx0, gy0, gx1, gy1)
    curve = [(lerp(gx0 + 10, gx1 - 20, i / 20), gy1 - 10 - (gy1 - gy0 - 40) * (math.exp(3 * i / 20) - 1) / (math.e ** 3 - 1))
             for i in range(21)]
    props.chart(ink, curve, k, GREEN, 10)
    if s.number:
        ink.text((gx0 + gx1) / 2, gy0 - 50, count_fmt(s.number, ease_in(k)).upper(), 70, "caption", fill=GREEN,
                 rot=-3, sw=0.12)


def _debt_cues(s):
    return [("sfx", 0.2, "sad" if s.mood == "funny" else "clank"), ("sfx", 0.9, "clank"),
            ("sfx", max(1.4, s.dur * 0.75), "clank")]


@scene("debt", _debt_cues)
def debt(ink, s):
    t = s.t
    ground(ink, s)
    for i in range(8):
        x = ((i * 220 + t * 120) % (s.W2 * 3)) - s.W2 * 1.5
        ink.line([(x, s.G + 30), (x + 50, s.G + 30)], mix(INK, PAPER, 0.5), 5)
    hx = s.W2 * 0.18
    o = hero(ink, s, hx, "walk", "sad", talk=True)
    bxx = hx - 300
    props.ball_chain(ink, hx - 30, s.G - 20, bxx, s.G - 70, (s.number or ("SCHULDEN" if s.lang == "de" else "DEBT")).upper())
    cx, cy = hx + 10, s.G - 470 + math.sin(t * 2) * 6
    for i in range(7):
        rx = cx - 90 + i * 30
        ry = cy + 40 + ((t * 600 + i * 47) % 160)
        ink.line([(rx, ry), (rx - 6, ry + 26)], BLUE, 5, wob=0.3)
    props.cloud(ink, cx, cy, 0.9, fill=(150, 152, 165))
    for i in range(2):
        k = ((t * 0.45 + i * 0.5) % 1.0)
        wx, wy = hx - 120 - k * s.W2 * 1.2, s.G - 320 - k * 420 + math.sin(t * 6 + i) * 20
        flap = math.sin(t * 22 + i) * 30
        for sgn in (-1, 1):
            ink.shape([(wx, wy - 10), (wx + sgn * 70, wy - 40 - flap), (wx + sgn * 60, wy + 5)], fill=WHITE, w=5)
        props.bill(ink, wx, wy, 0.5, math.sin(t * 5 + i) * 12)


@scene("fomo", lambda s: [("sfx", 0.0, "rumble"), ("sfx", 0.3, "whoosh")])
def fomo(ink, s):
    t = s.t
    ground(ink, s)
    cx, cy = s.W2 * 0.72, s.G - 280 + math.sin(t * 3) * 14
    for i in range(12):
        a = math.radians(i * 30 + t * 50)
        ink.line([(cx + math.cos(a) * 130, cy + math.sin(a) * 130), (cx + math.cos(a) * 185, cy + math.sin(a) * 185)],
                 GOLD, 9)
    props.coin(ink, cx, cy, 110, s.coin_sym, flip=math.cos(t * 3))
    props.speedlines(ink, -s.W2 * 1.4, s.W2 * 0.3, [s.G - 60 - i * 70 for i in range(5)], t, mix(INK, PAPER, 0.4), 7)
    n = 6 if s.short else 9
    for i in range(n):
        x = -s.W2 * 1.0 + i * (s.W2 * 1.0 / n) + math.sin(t * 2 + i) * 20
        sc = 0.55 + 0.08 * (i % 2)
        shadow(ink, x, s.G - 10 * (i % 2), 40)
        figure(ink, x, s.G - 10 * (i % 2), "run", t + i * 0.13, "neutral", sc, kind="crowd", seed=i)
    hero(ink, s, -s.W2 * 0.02, "run", "money", 1.05)
    k = pop(t, 0.4, 0.3)
    if k > 0:
        ink.text(-s.W2 * 0.5, s.G - 420, "!!", 120 * k, "comic", fill=RED, rot=-12, sw=0.1)


def _bank_coins(s):
    n = int(clamp((s.dur - 0.6) / 0.45, 2, 5))
    return [0.3 + i * 0.45 for i in range(n)]


@scene("bank", lambda s: [("sfx", ti + 0.55, "coin") for ti in _bank_coins(s)] +
       [("sfx", _bank_coins(s)[-1] + 0.7, "kaching")])
def bank(ink, s):
    t = s.t
    ground(ink, s)
    label = s.bank_label
    props.bank(ink, s.W2 * 0.5, s.G, 0.8 if s.short else 0.95, label)
    o_b = hero(ink, s, s.W2 * 0.12, "hold", "smug", 1.0, flip=True, talk=False, kind="banker")
    o_h = hero(ink, s, -s.W2 * 0.62, "shrug", "worried")
    ax, ay = o_h["hands"]["r"]
    bx, by = o_b["hands"]["l"]
    for ti in _bank_coins(s):
        if ti <= t < ti + 0.55:
            k = seg(t, ti, ti + 0.55)
            x = lerp(ax, bx, k)
            y = lerp(ay, by, k) - math.sin(k * math.pi) * 240
            props.coin(ink, x, y, 30, "€", rot=k * 360, flip=math.cos(t * 15))


@scene("tax", lambda s: [("sfx", 0.7, "whoosh"), ("sfx", 1.2, "kaching")])
def tax(ink, s):
    t = s.t
    ground(ink, s)
    frac = 0.42
    if s.number and "%" in s.number:
        frac = clamp(parse_num(re.search(r"\d[\d.,]*", s.number).group(0)) / 100, 0.05, 0.9)
    px, py, r = -s.W2 * 0.12, s.G - 500, 165
    tx = s.W2 * 0.6
    o_t = hero(ink, s, tx, "hold", "smug", 1.0, flip=True, talk=False, kind="banker")
    with ink.at(tx, s.G - 470, 3):
        ink.rect(-120, -36, 120, 36, fill=WHITE, w=6, r=8)
        ink.text(0, 2, "FINANZAMT" if s.lang == "de" else "TAX OFFICE", 34, "comic", fill=INK, stroke=None)
    a = 360 * frac
    ink.pie(px, py, r, -90 + a, 270, GOLD, w=7)
    k = ease_in_out(seg(t, 0.7, 1.2))
    hx, hy = o_t["hands"]["l"]
    mid = math.radians(-90 + a / 2)
    sx, sy = px + math.cos(mid) * 20, py + math.sin(mid) * 20
    ox, oy = lerp(sx, hx - math.cos(mid) * r * 0.4, k), lerp(sy, hy - 60 - math.sin(mid) * r * 0.4, k)
    sc = 1 - 0.5 * k
    with ink.at(ox, oy, k * 40, sc):
        ink.pie(0, 0, r, -90, -90 + a, RED, w=7)
        ink.text(math.cos(mid) * r * 0.55, math.sin(mid) * r * 0.55, f"{int(round(frac * 100))}%", 54, "caption",
                 fill=WHITE, sw=0.12)
    hero(ink, s, -s.W2 * 0.68, "shock" if t > 0.8 else "talk", "angry" if t > 0.8 else "happy")


@scene("moneyrain", lambda s: [("sfx", 0.1, "kaching"), ("sfx", 0.45, "tada")])
def moneyrain(ink, s):
    t = s.t
    props.sunburst(ink, 0, -120, mix(PAPER, GREEN, 0.15), mix(PAPER, GREEN, 0.35), rot=-t * 12)
    ground(ink, s)
    rng = random.Random(s.seed)
    if not s.short:
        props.moneybag(ink, -s.W2 * 0.58, s.G - 72, 1.0, wiggle(t, 0.5) * 5)
        hero(ink, s, s.W2 * 0.55, "dance", "cool", 0.95, talk=False, kind="bro")
    hero(ink, s, 0, "dance", "money")
    for i in range(14):
        x = rng.uniform(-s.W2 * 1.1, s.W2 * 1.1)
        sp = rng.uniform(260, 420)
        y = -1000 + ((t * sp + rng.uniform(0, 1600)) % 1600)
        if i % 3 == 0:
            props.coin(ink, x, y, 26, "€", flip=math.cos(t * 10 + i))
        else:
            props.bill(ink, x + math.sin(t * 3 + i) * 40, y, 0.55, math.sin(t * 2.5 + i) * 35 + i * 20)


@scene("outro", lambda s: [("sfx", 0.3, "pop"), ("sfx", 0.65, "ding")], own_headline=True)
def outro(ink, s):
    t = s.t
    ground(ink, s)
    for i in range(6):
        k = ((t * 0.5 + i / 6) % 1.0)
        props.heart(ink, -s.W2 * 0.7 + i * s.W2 * 0.28, s.G - 100 - k * 800, 26 * (1 - k * 0.4), fill=RED)
    hero(ink, s, -s.W2 * 0.45, "wave", "grin")
    k = pop(t, 0.3, 0.45)
    if k > 0:
        pul = 1 + 0.05 * math.sin(t * 8)
        bx, by = s.W2 * 0.32, s.G - 520
        with ink.at(bx, by, -4, k * pul):
            ink.rect(-220, -80, 220, 80, fill=RED, w=8, r=60)
            ink.text(0, 6, s.cta, 96, "caption", fill=WHITE, sw=0.1, shadow=0.06)
        props.curly_arrow(ink, (bx - 250, by + 260), (bx - 120, by + 95), 70, seg(t, 0.6, 0.9))
