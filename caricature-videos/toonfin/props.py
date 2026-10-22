"""Finance props and comic effects, all drawn in local coordinates."""
import math
import random

from .ink import (INK, WHITE, GREEN, DKGREEN, RED, GOLD, ORANGE, BLUE, SKY, NAVY, PINK,
                  GREY, LTGREY, TAN, BROWN, PAPER, mix)


def bill(ink, x, y, s=1.0, rot=0.0, label="€", color=GREEN):
    with ink.at(x, y, rot, s):
        ink.rect(-90, -46, 90, 46, fill=mix(color, WHITE, 0.35), w=6, r=6)
        ink.rect(-76, -34, 76, 34, fill=None, outline=mix(color, INK, 0.3), w=3, r=4)
        ink.ellipse(0, 0, 28, 28, fill=mix(color, WHITE, 0.7), outline=mix(color, INK, 0.3), w=3)
        ink.text(0, 2, label, 40, "comic", fill=mix(color, INK, 0.45), stroke=None)
        ink.text(-60, -18, "100", 16, "comic", fill=mix(color, INK, 0.45), stroke=None)


def coin(ink, x, y, r=40, sym="€", rot=0.0, flip=1.0, color=GOLD):
    with ink.at(x, y, rot, 1.0, 1.0):
        with ink.at(0, 0, 0, max(0.08, abs(flip)), 1.0):
            ink.circle(0, 0, r, fill=color, w=max(3, r * 0.14))
            ink.circle(0, 0, r * 0.72, fill=None, outline=mix(color, INK, 0.35), w=max(2, r * 0.06))
        if abs(flip) > 0.35:
            _symbol(ink, sym, r)


def _symbol(ink, sym, r):
    c = mix(GOLD, INK, 0.55)
    if sym == "₿":
        ink.text(0, r * 0.06, "B", r * 1.0, "comic", fill=c, stroke=None)
        for dx in (-r * 0.12, r * 0.12):
            ink.line([(dx, -r * 0.55), (dx, -r * 0.4)], c, max(2, r * 0.08), wob=0)
            ink.line([(dx, r * 0.4), (dx, r * 0.55)], c, max(2, r * 0.08), wob=0)
    else:
        ink.text(0, r * 0.06, sym, r * 1.0, "comic", fill=c, stroke=None)


def moneybag(ink, x, y, s=1.0, rot=0.0, label="€"):
    with ink.at(x, y, rot, s):
        body = [(-30, -70), (-70, -20), (-80, 30), (-50, 70), (50, 70), (80, 30), (70, -20), (30, -70)]
        ink.shape(body, fill=TAN, w=7, smooth=True)
        ink.shape([(-30, -70), (-40, -100), (0, -88), (40, -100), (30, -70)], fill=TAN, w=6, smooth=True)
        ink.line([(-32, -70), (32, -70)], BROWN, 8)
        ink.text(0, 12, label, 70, "comic", fill=DKGREEN, stroke=None)


def piggy(ink, x, y, s=1.0, rot=0.0, squash=0.0):
    with ink.at(x, y, rot, s * (1 + squash * 0.08), s * (1 - squash * 0.1)):
        for lx in (-55, -20, 25, 58):
            ink.rect(lx - 12, 40, lx + 12, 80, fill=PINK, w=6)
        ink.line([(-120, -10), (-140, -30), (-130, -45), (-118, -30), (-140, -18)], INK, 5, smooth=True)
        ink.ellipse(0, 0, 120, 82, fill=PINK, w=7)
        ink.shape([(40, -60), (62, -100), (80, -55)], fill=PINK, w=6)
        ink.ellipse(118, 8, 24, 30, fill=mix(PINK, RED, 0.25), w=6)
        ink.dot(112, 0, 5)
        ink.dot(126, 16, 5)
        ink.dot(72, -24, 7)
        ink.line([(-30, -76), (20, -78)], INK, 9)


def chart(ink, pts, prog=1.0, color=GREEN, w=12, dot=True, area=None):
    """Polyline revealed up to ``prog`` (0..1). Returns the head position."""
    if len(pts) < 2:
        return pts[0]
    lens = [0.0]
    for i in range(1, len(pts)):
        lens.append(lens[-1] + math.dist(pts[i - 1], pts[i]))
    target = lens[-1] * max(0.0, min(1.0, prog))
    shown = [pts[0]]
    head = pts[0]
    for i in range(1, len(pts)):
        if lens[i] <= target:
            shown.append(pts[i])
            head = pts[i]
        else:
            k = (target - lens[i - 1]) / max(1e-6, lens[i] - lens[i - 1])
            head = (pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k,
                    pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k)
            shown.append(head)
            break
    if area is not None and len(shown) > 1:
        base = area
        ink.shape(shown + [(shown[-1][0], base), (shown[0][0], base)],
                  fill=mix(color, PAPER, 0.75), outline=None)
    if len(shown) > 1:
        ink.line(shown, INK, w + 8, wob=0.6)
        ink.line(shown, color, w, wob=0.6)
    if dot:
        ink.circle(head[0], head[1], w * 1.1, fill=color, w=5)
    return head


def axes(ink, x0, y0, x1, y1):
    ink.line([(x0, y0), (x0, y1), (x1, y1)], INK, 6)
    ink.line([(x0 - 12, y0 + 18), (x0, y0), (x0 + 12, y0 + 18)], INK, 6)
    ink.line([(x1 - 18, y1 - 12), (x1, y1), (x1 - 18, y1 + 12)], INK, 6)


def arrow(ink, x, y, s=1.0, rot=0.0, color=GREEN):
    """Fat arrow pointing up (rot=180 points down)."""
    with ink.at(x, y, rot, s):
        ink.shape([(-28, 70), (-28, -10), (-60, -10), (0, -80), (60, -10), (28, -10), (28, 70)],
                  fill=color, w=7)


def rocket(ink, x, y, s=1.0, rot=0.0, t=0.0):
    with ink.at(x, y, rot, s):
        fl = 1 + 0.25 * math.sin(t * 40) + 0.1 * math.sin(t * 73)
        flame(ink, 0, 95, 1.1 * fl, t)
        ink.shape([(-38, 40), (-70, 95), (-30, 80)], fill=RED, w=6)
        ink.shape([(38, 40), (70, 95), (30, 80)], fill=RED, w=6)
        ink.shape([(-38, 85), (-42, -20), (-25, -80), (0, -115), (25, -80), (42, -20), (38, 85)],
                  fill=WHITE, w=7, smooth=True)
        ink.shape([(-26, -78), (0, -115), (26, -78)], fill=RED, w=6)
        ink.circle(0, -20, 20, fill=SKY, w=6)
        ink.line([(-36, 70), (36, 70)], INK, 5)


def flame(ink, x, y, s=1.0, t=0.0):
    with ink.at(x, y, 0, s):
        wv = math.sin(t * 31) * 6
        ink.shape([(-30, -10), (-24, 30), (wv, 90), (24, 30), (30, -10)], fill=ORANGE, w=5, smooth=True)
        ink.shape([(-15, -10), (-12, 20), (wv * 0.6, 55), (12, 20), (15, -10)], fill=GOLD, outline=None,
                  smooth=True)


def bull(ink, x, y, s=1.0, t=0.0, push=0.0, flip=False):
    """Caricature bull, standing on y=0, facing right (or left with flip)."""
    fx = -1 if flip else 1
    with ink.at(x, y, 0, s * fx, s):
        bob = math.sin(t * 9) * 3
        for lx, ph in ((-70, 0), (-40, 1.6), (30, 3.1), (60, 4.7)):
            k = math.sin(t * 9 + ph) * 8 * push
            ink.line([(lx, -60), (lx + k, -4)], INK, 12)
            ink.ellipse(lx + k + 4, -4, 13, 7, fill=INK, outline=None)
        ink.line([(-100, -100), (-128, -80), (-122, -50)], INK, 6, smooth=True)
        ink.ellipse(-10, -100 + bob, 105, 60, fill=GREEN, w=7)
        hx, hy = 92, -132 + bob
        ink.shape([(hx - 18, hy - 40), (hx - 50, hy - 76), (hx - 70, hy - 66), (hx - 34, hy - 26)],
                  fill=WHITE, w=5, smooth=True)
        ink.shape([(hx + 18, hy - 40), (hx + 40, hy - 82), (hx + 60, hy - 74), (hx + 32, hy - 26)],
                  fill=WHITE, w=5, smooth=True)
        ink.ellipse(hx, hy, 50, 44, fill=GREEN, w=7)
        ink.ellipse(hx + 26, hy + 22, 34, 24, fill=mix(GREEN, PINK, 0.55), w=6)
        ink.dot(hx + 18, hy + 22, 5)
        ink.dot(hx + 36, hy + 22, 5)
        ink.arc(hx + 27, hy + 38, 12, 10, -20, 200, GOLD, 5)
        ink.dot(hx - 4, hy - 12, 6)
        ink.dot(hx + 20, hy - 14, 6)
        ink.line([(hx - 14, hy - 30), (hx + 2, hy - 22)], INK, 6)
        ink.line([(hx + 30, hy - 30), (hx + 14, hy - 22)], INK, 6)


def bear(ink, x, y, s=1.0, t=0.0, push=0.0, flip=False):
    """Caricature bear, standing on y=0, facing left (or right with flip)."""
    fx = 1 if flip else -1
    with ink.at(x, y, 0, s * fx, s):
        bob = math.sin(t * 9 + 1) * 3
        for lx, ph in ((-60, 0.5), (-30, 2.1), (30, 3.6), (58, 5.2)):
            k = math.sin(t * 9 + ph) * 8 * push
            ink.line([(lx, -60), (lx + k, -4)], INK, 14)
            ink.ellipse(lx + k + 4, -4, 14, 7, fill=INK, outline=None)
        ink.ellipse(-10, -100 + bob, 100, 64, fill=RED, w=7)
        hx, hy = 88, -136 + bob
        ink.circle(hx - 32, hy - 40, 20, fill=RED, w=6)
        ink.circle(hx + 30, hy - 42, 20, fill=RED, w=6)
        ink.circle(hx, hy, 52, fill=RED, w=7)
        ink.ellipse(hx + 24, hy + 18, 28, 20, fill=mix(RED, WHITE, 0.55), w=5)
        ink.dot(hx + 36, hy + 12, 8)
        ink.arc(hx + 22, hy + 30, 12, 8, 200, 340, INK, 4)
        ink.dot(hx - 6, hy - 10, 6)
        ink.dot(hx + 22, hy - 12, 6)
        ink.line([(hx - 18, hy - 30), (hx + 2, hy - 22)], INK, 6)
        ink.line([(hx + 34, hy - 30), (hx + 16, hy - 22)], INK, 6)


def burst(ink, x, y, r, text="", s=1.0, rot=0.0, fill=GOLD, color=RED, seed=1, spikes=12, size=None):
    rng = random.Random(seed)
    with ink.at(x, y, rot, s):
        pts = []
        for i in range(spikes * 2):
            a = math.pi * 2 * i / (spikes * 2)
            rr = r * (1.0 if i % 2 == 0 else 0.62) * rng.uniform(0.86, 1.1)
            pts.append((math.cos(a) * rr, math.sin(a) * rr))
        ink.shape(pts, fill=fill, w=8)
        if text:
            fs = size or r * 0.55
            ink.text(0, 4, text, fs, "comic", fill=color, stroke=INK, sw=0.1, shadow=0.06)


def sunburst(ink, x, y, c1, c2, rot=0.0, rays=16, r=2600):
    with ink.at(x, y, rot):
        ink.circle(0, 0, 60, fill=c1, outline=None, wob=0)
        for i in range(rays):
            a0 = 360 * i / rays
            a1 = a0 + 360 / rays / 2
            ink.shape([(0, 0), (math.cos(math.radians(a0)) * r, math.sin(math.radians(a0)) * r),
                       (math.cos(math.radians(a1)) * r, math.sin(math.radians(a1)) * r)],
                      fill=c2, outline=None, wob=0)


def cloud(ink, x, y, s=1.0, fill=WHITE, w=7, dark=False):
    blobs = [(-60, 10, 42), (-20, -20, 52), (30, -18, 46), (66, 12, 38), (0, 22, 46)]
    with ink.at(x, y, 0, s):
        for bx, by, r in blobs:
            ink.circle(bx, by, r, fill=INK, outline=INK, w=w * 2)
        for bx, by, r in blobs:
            ink.circle(bx, by, r - w * 0.4, fill=fill, outline=None)


def thought(ink, x, y, s=1.0, tail=(-1, 1)):
    with ink.at(x, y, 0, s):
        cloud(ink, 0, 0, 1.55)
        tx, ty = tail
        for i, r in enumerate((22, 15, 9)):
            ink.circle(tx * (110 + i * 42), ty * (90 + i * 46), r, fill=WHITE, w=5)


def speech(ink, x, y, w, h, tail_x, tail_y, s=1.0):
    with ink.at(x, y, 0, s):
        ink.shape([(-w * 0.16, h * 0.4), (tail_x, tail_y), (w * 0.12, h * 0.4)], fill=WHITE, w=7)
        ink.ellipse(0, 0, w / 2, h / 2, fill=WHITE, w=7)
        ink.ellipse(0, h * 0.34, w * 0.13, h * 0.12, fill=WHITE, outline=None)


def board(ink, x, y, w, h, s=1.0):
    """Flipchart on an easel; (x, y) is the top-centre of the board."""
    with ink.at(x, y, 0, s):
        ink.line([(-w * 0.35, h), (-w * 0.45, h + 160)], BROWN, 10)
        ink.line([(w * 0.35, h), (w * 0.45, h + 160)], BROWN, 10)
        ink.line([(0, h), (0, h + 140)], BROWN, 10)
        ink.rect(-w / 2, 0, w / 2, h, fill=WHITE, w=8, r=8)
        ink.rect(-w / 2 - 10, -16, w / 2 + 10, 6, fill=BROWN, w=6, r=4)


def sweat(ink, x, y, s=1.0):
    with ink.at(x, y, 0, s):
        ink.shape([(0, -22), (-10, 0), (10, 0)], fill=SKY, w=4)
        ink.circle(0, 4, 11, fill=SKY, w=4)


def star(ink, x, y, r, fill=GOLD, rot=0.0):
    with ink.at(x, y, rot):
        pts = []
        for i in range(10):
            a = math.radians(-90 + 36 * i)
            rr = r if i % 2 == 0 else r * 0.45
            pts.append((math.cos(a) * rr, math.sin(a) * rr))
        ink.shape(pts, fill=fill, w=max(3, r * 0.14))


def sparkle(ink, x, y, r, color=GOLD):
    ink.line([(x - r, y), (x + r, y)], color, max(3, r * 0.25), wob=0.3)
    ink.line([(x, y - r), (x, y + r)], color, max(3, r * 0.25), wob=0.3)


def bread(ink, x, y, s=1.0):
    with ink.at(x, y, 0, s):
        ink.shape([(-80, 30), (-90, -10), (-60, -45), (0, -55), (60, -45), (90, -10), (80, 30)],
                  fill=TAN, w=7, smooth=True)
        for dx in (-40, 0, 40):
            ink.line([(dx - 12, -30), (dx + 12, -10)], BROWN, 6)


def tag(ink, x, y, text, s=1.0, rot=0.0, fill=WHITE, color=INK):
    with ink.at(x, y, rot, s):
        ink.line([(0, -120), (0, -50)], INK, 4)
        ink.shape([(-70, -50), (70, -50), (90, 0), (70, 50), (-70, 50)], fill=fill, w=7)
        ink.circle(-48, 0, 8, fill=PAPER, w=4)
        ink.text(14, 4, text, 46, "comic", fill=color, stroke=None)


def ball_chain(ink, x0, y0, x1, y1, label="", t=0.0):
    """Chain from (x0, y0) to an iron ball centred at (x1, y1)."""
    n = 7
    for i in range(n):
        k = (i + 0.5) / n
        cx, cy = x0 + (x1 - x0) * k, y0 + (y1 - y0) * k + math.sin(k * math.pi) * 22
        ink.ellipse(cx, cy, 14, 8, fill=None, outline=GREY, w=6,
                    rot=math.degrees(math.atan2(y1 - y0, x1 - x0)) + (90 if i % 2 else 0))
    ink.circle(x1, y1, 70, fill=(52, 52, 62), w=7)
    ink.arc(x1 - 18, y1 - 20, 30, 30, 200, 260, (130, 130, 150), 7)
    if label:
        ink.text(x1, y1 + 4, label, 38 if len(label) < 7 else 26, "comic", fill=WHITE, stroke=None)


def bank(ink, x, y, s=1.0, label="BANK"):
    """Bank building standing on y."""
    with ink.at(x, y, 0, s):
        ink.rect(-170, -40, 170, 0, fill=LTGREY, w=7)
        ink.rect(-150, -70, 150, -40, fill=LTGREY, w=6)
        for cx in (-110, -40, 40, 110):
            ink.rect(cx - 18, -270, cx + 18, -70, fill=WHITE, w=6)
        ink.rect(-170, -300, 170, -270, fill=LTGREY, w=6)
        ink.shape([(-190, -300), (0, -400), (190, -300)], fill=WHITE, w=7)
        ink.text(0, -330, label, 42, "comic", fill=INK, stroke=None)


def lightbulb(ink, x, y, s=1.0, glow=1.0, t=0.0):
    with ink.at(x, y, 0, s):
        if glow > 0:
            for i in range(8):
                a = math.radians(i * 45 + t * 30)
                r0, r1 = 70, 70 + 30 * glow
                ink.line([(math.cos(a) * r0, -20 + math.sin(a) * r0),
                          (math.cos(a) * r1, -20 + math.sin(a) * r1)], GOLD, 7)
        ink.circle(0, -20, 52, fill=mix(WHITE, GOLD, 0.8 * glow + 0.2), w=7)
        ink.rect(-24, 26, 24, 62, fill=GREY, w=6, r=4)
        ink.line([(-24, 40), (24, 40)], INK, 4)
        ink.line([(-24, 52), (24, 52)], INK, 4)


def pie_chart(ink, x, y, r, frac, out=0.0, c1=GOLD, c2=RED):
    """Pie with a slice of ``frac`` pulled out by ``out`` units."""
    a_sl = 360 * frac
    ink.pie(x, y, r, -90 + a_sl, 270, c1, w=7)
    mid = math.radians(-90 + a_sl / 2)
    ox, oy = math.cos(mid) * out, math.sin(mid) * out
    ink.pie(x + ox, y + oy, r, -90, -90 + a_sl, c2, w=7)
    return (x + ox + math.cos(mid) * r * 0.55, y + oy + math.sin(mid) * r * 0.55)


def speedlines(ink, x0, x1, ys, t, color=INK, seed=0):
    rng = random.Random(seed)
    for y in ys:
        L = rng.uniform(80, 220)
        off = ((t * 1800 + rng.uniform(0, 2000)) % (abs(x1 - x0) + L))
        xa = x1 - off
        ink.line([(xa, y), (xa + L, y)], color, rng.uniform(3, 6), wob=0.3)


def snowball(ink, x, y, r, rot=0.0):
    with ink.at(x, y, rot):
        ink.circle(0, 0, r, fill=WHITE, w=max(5, r * 0.06))
        for a in (0, 120, 240):
            ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a))
            ink.arc(ca * r * 0.4, sa * r * 0.4, r * 0.35, r * 0.25, a, a + 120, SKY, max(3, r * 0.05))
        ink.text(0, 4, "€", r * 0.9, "comic", fill=mix(SKY, BLUE, 0.6), stroke=None)


def creditcard(ink, x, y, s=1.0, rot=0.0):
    with ink.at(x, y, rot, s):
        ink.rect(-80, -50, 80, 50, fill=BLUE, w=6, r=10)
        ink.rect(-80, -30, 80, -12, fill=INK, outline=None)
        ink.rect(-60, 4, -24, 28, fill=GOLD, w=4, r=4)


def heart(ink, x, y, r, fill=RED):
    pts = []
    for i in range(40):
        a = 2 * math.pi * i / 40
        hx = 16 * math.sin(a) ** 3
        hy = -(13 * math.cos(a) - 5 * math.cos(2 * a) - 2 * math.cos(3 * a) - math.cos(4 * a))
        pts.append((x + hx * r / 16, y + hy * r / 16))
    ink.shape(pts, fill=fill, w=max(3, r * 0.12))


def curly_arrow(ink, p0, p1, bend=60.0, prog=1.0, color=INK, w=9):
    """Hand-drawn arrow from p0 to p1 bowed sideways by ``bend``, drawn up to ``prog``."""
    if prog <= 0:
        return
    (x0, y0), (x1, y1) = p0, p1
    dx, dy = x1 - x0, y1 - y0
    L = math.hypot(dx, dy) or 1
    nx, ny = -dy / L, dx / L
    pts = []
    for i in range(int(24 * prog) + 1):
        k = i / 24
        b = math.sin(k * math.pi) * bend
        pts.append((x0 + dx * k + nx * b, y0 + dy * k + ny * b))
    if len(pts) < 2:
        return
    ink.line(pts, color, w)
    if prog >= 0.98:
        (ax, ay), (bx, by) = pts[-3], pts[-1]
        a = math.atan2(by - ay, bx - ax)
        for da in (2.5, -2.5):
            ink.line([(bx + math.cos(a + da) * 34, by + math.sin(a + da) * 34), (bx, by)], color, w)
