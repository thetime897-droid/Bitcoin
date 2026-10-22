"""Hand-drawn ink primitives on top of Pillow.

Every shape is drawn with a slightly wobbly outline. The wobble is seeded by
the current "boil" step (the frame number divided by 3), so lines shimmer the
way hand-drawn animation does when it is redrawn on twos/threes, but stay
stable between boil steps.

Coordinates go through an affine transform stack: scenes draw in "stage
units" (the stage is ~1000 units across its short side), characters and props
push their own local transforms with ``ink.at(...)``.
"""
import math
import random
from contextlib import contextmanager
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

FONT_DIR = Path(__file__).parent / "fonts"
FONTS = {
    "caption": "LuckiestGuy-Regular.ttf",
    "comic": "Bangers-Regular.ttf",
    "hand": "PatrickHand-Regular.ttf",
    "marker": "PermanentMarker-Regular.ttf",
}

# Palette
PAPER = (248, 243, 232)
INK = (26, 24, 30)
WHITE = (255, 255, 255)
GREEN = (38, 186, 112)
DKGREEN = (22, 120, 72)
RED = (232, 54, 72)
DKRED = (150, 28, 40)
GOLD = (255, 198, 26)
ORANGE = (255, 138, 30)
BLUE = (60, 132, 255)
SKY = (150, 205, 255)
NAVY = (22, 28, 64)
PINK = (255, 150, 172)
GREY = (170, 170, 176)
LTGREY = (222, 220, 214)
TAN = (214, 170, 112)
BROWN = (130, 86, 52)


@lru_cache(maxsize=512)
def font(key, px):
    return ImageFont.truetype(str(FONT_DIR / FONTS[key]), max(4, int(px)))


def mul(m, n):
    """Compose affines: the result applies ``n`` first, then ``m``."""
    a, b, c, d, e, f = m
    A, B, C, D, E, F = n
    return (a * A + b * D, a * B + b * E, a * C + b * F + c,
            d * A + e * D, d * B + e * E, d * C + e * F + f)


def affine(tx=0.0, ty=0.0, rot=0.0, sx=1.0, sy=None):
    sy = sx if sy is None else sy
    cr, sr = math.cos(math.radians(rot)), math.sin(math.radians(rot))
    return (cr * sx, -sr * sy, tx, sr * sx, cr * sy, ty)


def mix(c1, c2, k):
    k = max(0.0, min(1.0, k))
    return tuple(int(a + (b - a) * k) for a, b in zip(c1, c2))


def catmull(pts, steps=8):
    """Smooth a polyline through its points."""
    if len(pts) < 3:
        return list(pts)
    out = []
    p = [pts[0]] + list(pts) + [pts[-1]]
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = p[i - 1], p[i], p[i + 1], p[i + 2]
        for j in range(steps):
            t = j / steps
            t2, t3 = t * t, t * t * t
            out.append(tuple(
                0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t
                       + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2
                       + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)
                for k in range(2)))
    out.append(pts[-1])
    return out


class Ink:
    def __init__(self, img, base, boil, ss):
        self.img = img
        self.d = ImageDraw.Draw(img)
        self.stack = [base]
        self.boil = boil
        self.k = 0
        self.ss = ss
        self.ref = math.sqrt(abs(base[0] * base[4] - base[1] * base[3]))

    # -- transforms -------------------------------------------------------
    @property
    def m(self):
        return self.stack[-1]

    @contextmanager
    def at(self, x=0.0, y=0.0, rot=0.0, s=1.0, sy=None):
        self.stack.append(mul(self.m, affine(x, y, rot, s, sy)))
        try:
            yield self
        finally:
            self.stack.pop()

    def P(self, x, y):
        a, b, c, d, e, f = self.m
        return (a * x + b * y + c, d * x + e * y + f)

    def scale(self):
        a, b, _, d, e, _ = self.m
        return math.sqrt(abs(a * e - b * d))

    def angle(self):
        return math.degrees(math.atan2(self.m[3], self.m[0]))

    def _rng(self):
        self.k += 1
        return random.Random(self.boil * 1000003 + self.k * 7919)

    # -- wobble -----------------------------------------------------------
    def _wobble(self, pts, amp, closed, rng):
        if closed:
            pts = list(pts) + [pts[0]]
        lens = [0.0]
        for i in range(1, len(pts)):
            lens.append(lens[-1] + math.dist(pts[i - 1], pts[i]))
        total = lens[-1]
        if total < 1 or amp <= 0:
            return list(pts)
        waves = []
        for lam, w in ((230, 0.6), (95, 0.3), (42, 0.12)):
            lam *= self.ss
            if closed:
                lam = total / max(1, round(total / lam))
            waves.append((2 * math.pi / lam, rng.uniform(0, 2 * math.pi), w * amp))
        step = 12 * self.ss
        out = []
        for i in range(len(pts) - 1):
            (x0, y0), (x1, y1) = pts[i], pts[i + 1]
            seg = lens[i + 1] - lens[i]
            if seg < 1e-6:
                continue
            nx, ny = -(y1 - y0) / seg, (x1 - x0) / seg
            n = max(1, int(seg / step))
            for j in range(n):
                t = j / n
                s = lens[i] + seg * t
                o = sum(w * math.sin(k * s + ph) for k, ph, w in waves)
                out.append((x0 + (x1 - x0) * t + nx * o, y0 + (y1 - y0) * t + ny * o))
        s = total
        (x0, y0), (x1, y1) = pts[-2], pts[-1]
        seg = max(1e-6, math.dist(pts[-2], pts[-1]))
        o = sum(w * math.sin(k * s + ph) for k, ph, w in waves)
        out.append((x1 - (y1 - y0) / seg * o, y1 + (x1 - x0) / seg * o))
        return out

    def _amp(self, wob):
        rel = max(0.4, min(1.6, self.scale() / self.ref))
        return wob * 1.5 * self.ss * rel

    # -- primitives -------------------------------------------------------
    def line(self, pts, color=INK, w=7, wob=1.0, closed=False, cap=True, smooth=False):
        if smooth:
            pts = catmull(pts)
        px = [self.P(*p) for p in pts]
        if len(px) < 2:
            return
        wp = max(1.0, w * self.scale())
        px = self._wobble(px, self._amp(wob), closed, self._rng())
        if closed:
            px.append(px[0])
        self.d.line(px, fill=color, width=int(round(wp)), joint="curve")
        if cap and not closed and wp > 3:
            r = wp / 2 - 0.5
            for x, y in (px[0], px[-1]):
                self.d.ellipse((x - r, y - r, x + r, y + r), fill=color)

    def shape(self, pts, fill=None, outline=INK, w=7, wob=1.0, smooth=False):
        if smooth:
            pts = catmull(list(pts) + [pts[0]])[:-1]
        if fill is not None:
            px = [self.P(*p) for p in pts]
            px = self._wobble(px, self._amp(wob) * 0.8, True, self._rng())
            if len(px) >= 3:
                self.d.polygon(px, fill=fill)
        if outline is not None and w > 0:
            self.line(pts, outline, w, wob, closed=True)

    def _ellipse_pts(self, x, y, rx, ry, rot=0.0, a0=0.0, a1=360.0):
        circ = math.pi * (rx + ry) * self.scale()
        n = int(max(14, min(140, circ / (9 * self.ss) * (a1 - a0) / 360)))
        cr, sr = math.cos(math.radians(rot)), math.sin(math.radians(rot))
        pts = []
        for i in range(n + 1):
            a = math.radians(a0 + (a1 - a0) * i / n)
            ex, ey = rx * math.cos(a), ry * math.sin(a)
            pts.append((x + ex * cr - ey * sr, y + ex * sr + ey * cr))
        return pts

    def ellipse(self, x, y, rx, ry, fill=None, outline=INK, w=7, wob=1.0, rot=0.0):
        pts = self._ellipse_pts(x, y, rx, ry, rot)[:-1]
        self.shape(pts, fill, outline, w, wob)

    def circle(self, x, y, r, fill=None, outline=INK, w=7, wob=1.0):
        self.ellipse(x, y, r, r, fill, outline, w, wob)

    def arc(self, x, y, rx, ry, a0, a1, color=INK, w=7, wob=1.0, rot=0.0):
        """Angles in degrees, 0 = +x, increasing clockwise on screen."""
        self.line(self._ellipse_pts(x, y, rx, ry, rot, a0, a1), color, w, wob)

    def pie(self, x, y, r, a0, a1, fill, outline=INK, w=6, wob=1.0):
        pts = [(x, y)] + self._ellipse_pts(x, y, r, r, 0, a0, a1)
        self.shape(pts, fill, outline, w, wob)

    def rect(self, x0, y0, x1, y1, fill=None, outline=INK, w=7, wob=1.0, r=0):
        if r <= 0:
            pts = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
        else:
            r = min(r, abs(x1 - x0) / 2, abs(y1 - y0) / 2)
            pts = (self._ellipse_pts(x1 - r, y0 + r, r, r, 0, -90, 0)
                   + self._ellipse_pts(x1 - r, y1 - r, r, r, 0, 0, 90)
                   + self._ellipse_pts(x0 + r, y1 - r, r, r, 0, 90, 180)
                   + self._ellipse_pts(x0 + r, y0 + r, r, r, 0, 180, 270))
        self.shape(pts, fill, outline, w, wob)

    def dot(self, x, y, r, color=INK):
        X, Y = self.P(x, y)
        R = max(1.0, r * self.scale())
        self.d.ellipse((X - R, Y - R, X + R, Y + R), fill=color)

    # -- text -------------------------------------------------------------
    def text_w(self, s, size, key="caption"):
        sc = self.scale()
        px = max(4, int(size * sc))
        return font(key, px).getlength(s) / sc * (size * sc / px)

    def text(self, x, y, s, size, key="caption", fill=WHITE, stroke=INK, sw=0.1,
             rot=0.0, shadow=0.0, anchor="mm"):
        if not s:
            return
        sc = self.scale()
        px = int(size * sc)
        if px < 5:
            return
        f = font(key, px)
        X, Y = self.P(x, y)
        swp = int(px * sw) if stroke is not None else 0
        r = self.angle() + rot
        if abs(r) < 0.6:
            if shadow:
                o = px * shadow
                self.d.text((X + o * 0.5, Y + o), s, font=f, fill=INK, anchor=anchor,
                            stroke_width=swp, stroke_fill=INK)
            self.d.text((X, Y), s, font=f, fill=fill, anchor=anchor,
                        stroke_width=swp, stroke_fill=stroke)
            return
        x0, y0, x1, y1 = f.getbbox(s, stroke_width=swp)
        pad = swp + int(px * (shadow + 0.1))
        tw, th = int(x1 - x0) + 2 * pad, int(y1 - y0) + 2 * pad
        tmp = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
        td = ImageDraw.Draw(tmp)
        cx, cy = tw / 2, th / 2
        if shadow:
            o = px * shadow
            td.text((cx + o * 0.5, cy + o), s, font=f, fill=INK, anchor="mm",
                    stroke_width=swp, stroke_fill=INK)
        td.text((cx, cy), s, font=f, fill=fill, anchor="mm", stroke_width=swp,
                stroke_fill=stroke if stroke is not None else fill)
        tmp = tmp.rotate(-r, resample=Image.BICUBIC, expand=True)
        self.img.paste(tmp, (int(X - tmp.width / 2), int(Y - tmp.height / 2)), tmp)
