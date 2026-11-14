"""Tiny software 3D renderer for clean, bright "studio" sets (white towers, boardroom, office).

Boxes and textured quads in world space (y up, metres), a pinhole camera that can dolly, crane and
orbit, flat shading from one soft key light, distance fog to the background colour and painter's
ordering. Everything is drawn with Pillow at a supersampled size and reduced, so edges are smooth.
"""
import math
from functools import lru_cache

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from .ink import FONT_DIR

BG = (243, 243, 247)
FLOOR = (234, 235, 240)
WHITE = (250, 250, 252)
LIGHT = np.array([-0.45, 0.75, -0.5]) / np.linalg.norm([-0.45, 0.75, -0.5])


def _norm(v):
    return v / (np.linalg.norm(v) + 1e-9)


class Camera:
    def __init__(self, pos, target, fov=50.0):
        self.pos, self.target, self.fov = np.array(pos, float), np.array(target, float), fov

    def basis(self):
        f = _norm(self.target - self.pos)
        r = _norm(np.cross([0, 1, 0], f))
        u = np.cross(f, r)
        return r, u, f


class Scene:
    def __init__(self, bg=BG, floor=FLOOR, fog=90.0):
        self.faces = []      # (pts[4x3], colour, kind, texture)
        self.bg, self.floor, self.fog = bg, floor, fog

    def box(self, x0, x1, y0, y1, z0, z1, col=WHITE, bands=0.0, mull=0.0, band_col=None, bias=0.0, shadow=True):
        if shadow and y0 <= 0.01 and y1 > 0.3:
            self.ground_shadow(x0, x1, z0, z1, y1)
        self._box(x0, x1, y0, y1, z0, z1, col, bands, mull, band_col, bias)

    def ground_shadow(self, x0, x1, z0, z1, h):
        """Soft-coloured shadow on the floor, cast away from the key light (convex hull of the footprint
        and the footprint shifted by the light direction times the height)."""
        L = -LIGHT / LIGHT[1]
        dx, dz = L[0] * h * 0.55, L[2] * h * 0.55
        pts = [(x0, z0), (x1, z0), (x1, z1), (x0, z1), (x0 + dx, z0 + dz), (x1 + dx, z0 + dz), (x1 + dx, z1 + dz),
               (x0 + dx, z1 + dz)]
        hull = _hull(pts)
        col = tuple(int(c * 0.93) for c in self.floor)
        self.faces.append(dict(p=np.array([[x, 0.02, z] for x, z in hull], float), col=col, double=True,
                               bias=5000.0, poly=True))

    def _box(self, x0, x1, y0, y1, z0, z1, col=WHITE, bands=0.0, mull=0.0, band_col=None, bias=0.0):
        """Axis-aligned box. ``bands``/``mull``: spacing of floor lines / window mullions on the sides."""
        P = np.array([[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
                      [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], float)
        quads = [(0, 1, 2, 3), (5, 4, 7, 6), (4, 0, 3, 7), (1, 5, 6, 2), (3, 2, 6, 7), (4, 5, 1, 0)]
        normals = [(0, 0, -1), (0, 0, 1), (-1, 0, 0), (1, 0, 0), (0, 1, 0), (0, -1, 0)]
        for qi, q in enumerate(quads):
            side = qi < 4
            self.faces.append(dict(p=P[list(q)], col=col, bands=bands if side else 0, mull=mull if side else 0,
                                   band_col=band_col, nout=np.array(normals[qi], float), bias=bias))

    def quad(self, pts, col=WHITE, tex=None, double=True, bias=0.0):
        """``bias`` (metres) pulls a decal (sign, screen, road marking) in front of the surface it sits on."""
        if tex is not None and not bias:
            bias = -3.0
        self.faces.append(dict(p=np.array(pts, float), col=col, tex=tex, double=double, bias=bias))

    def plane(self, x0, x1, z0, z1, y=0.0, col=None):
        self.quad([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], col or self.floor, bias=10000.0)

    def flat(self, x0, x1, z0, z1, col, y=0.015, bias=4000.0):
        """Ground decal (road, lawn, plaza tiles) drawn right after the floor."""
        self.quad([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], col, bias=bias)

    def tree(self, x, z, h=6.0):
        self.box(x - 0.18, x + 0.18, 0, h * 0.45, z - 0.18, z + 0.18, col=(176, 150, 122))
        r = h * 0.3
        self._box(x - r, x + r, h * 0.38, h * 0.95, z - r, z + r, col=(176, 214, 160))
        self._box(x - r * 0.7, x + r * 0.7, h * 0.95, h * 1.15, z - r * 0.7, z + r * 0.7, col=(188, 222, 172))
        self.ground_shadow(x - r, x + r, z - r, z + r, h * 0.7)

    def lamp(self, x, z, h=5.5, side=1):
        self._box(x - 0.08, x + 0.08, 0, h, z - 0.08, z + 0.08, col=(120, 124, 136))
        self._box(min(x, x - side * 1.0), max(x, x - side * 1.0), h - 0.1, h + 0.05, z - 0.08, z + 0.08,
                  col=(120, 124, 136))
        self._box(x - side * 1.0 - 0.25, x - side * 1.0 + 0.25, h - 0.3, h - 0.1, z - 0.2, z + 0.2, col=(250, 246, 220))

    def windows(self, x0, x1, y0, y1, z, rows, cols, col=(204, 214, 232), frame=0.25, facing=-1):
        """Window grid on a facade at depth z (facing -z by default)."""
        w = (x1 - x0) / cols
        h = (y1 - y0) / rows
        zz = z + facing * 0.03
        for r in range(rows):
            for c in range(cols):
                a, b = x0 + c * w + frame, x0 + (c + 1) * w - frame
                lo, hi = y0 + r * h + frame * 1.2, y0 + (r + 1) * h - frame * 0.6
                self.quad([[a, lo, zz], [b, lo, zz], [b, hi, zz], [a, hi, zz]], col, bias=-0.6)

    # -- rendering -------------------------------------------------------------------
    def render(self, cam, W, H, ss=1.5, blur=0.0):
        Wp, Hp = int(W * ss), int(H * ss)
        img = Image.new("RGB", (Wp, Hp), self.bg)
        # soft vertical gradient: sky slightly cooler at the top, floor haze near the horizon
        g = np.linspace(0, 1, Hp)[:, None]
        top = np.array([226, 232, 243], float)
        bot = np.array(self.bg, float)
        grad = (top * (1 - g) + bot * g)[:, None, :].repeat(Wp, 1)
        img = Image.fromarray(np.broadcast_to(grad, (Hp, Wp, 3)).astype(np.uint8).copy())
        d = ImageDraw.Draw(img)
        r, u, f = cam.basis()
        fpx = (Hp / 2) / math.tan(math.radians(cam.fov) / 2)
        drawn = []
        for face in self.faces:
            P = face["p"] - cam.pos
            C = np.stack([P @ r, P @ u, P @ f], 1)
            centre = face["p"].mean(0)
            if "nout" in face:
                n = face["nout"]
                if np.dot(n, cam.pos - centre) <= 0:      # back face of a box
                    continue
            else:
                n = _norm(np.cross(face["p"][1] - face["p"][0], face["p"][-1] - face["p"][0]))
                if np.dot(n, cam.pos - centre) < 0:
                    n = -n
            poly = _clip_near(C, 0.15)
            if len(poly) < 3:
                continue
            depth = np.linalg.norm(centre - cam.pos)
            drawn.append((depth + face.get("bias", 0.0), face, poly, n))
        drawn.sort(key=lambda x: -x[0])

        def proj(c):
            return (Wp / 2 + c[0] / c[2] * fpx, Hp / 2 - c[1] / c[2] * fpx)

        for depth, face, poly, n in drawn:
            depth = np.linalg.norm(face["p"].mean(0) - cam.pos)
            pts = [proj(c) for c in poly]
            fog = 1 - math.exp(-depth / self.fog)
            if face.get("tex") is None and face.get("poly"):
                shade_col = np.array(face["col"], float)
                shade_col = shade_col * (1 - fog) + np.array(self.bg, float) * fog
                d.polygon(pts, fill=tuple(int(c) for c in shade_col))
                continue
            if face.get("tex") is not None:
                _draw_tex(img, face, cam, r, u, f, fpx, Wp, Hp, fog, self.bg)
                d = ImageDraw.Draw(img)
                continue
            shade = 0.82 + 0.18 * max(0.0, float(np.dot(n, LIGHT)))
            if n[1] > 0.9:
                shade = 1.0
            col = np.array(face["col"], float) * shade
            col = col * (1 - fog) + np.array(self.bg, float) * fog
            edge = tuple(int(c) for c in col * 0.93)
            d.polygon(pts, fill=tuple(int(c) for c in col), outline=edge if "nout" in face else None)
            if face.get("bands") or face.get("mull"):
                _draw_lines(d, face, cam, r, u, f, fpx, Wp, Hp, col, fog, self.bg)
        if blur:
            img = img.filter(ImageFilter.GaussianBlur(blur * ss))
        return img.resize((W, H), Image.LANCZOS)


def _hull(pts):
    pts = sorted(set(pts))
    if len(pts) < 3:
        return pts

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo, hi = [], []
    for p in pts:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0:
            lo.pop()
        lo.append(p)
    for p in reversed(pts):
        while len(hi) >= 2 and cross(hi[-2], hi[-1], p) <= 0:
            hi.pop()
        hi.append(p)
    return lo[:-1] + hi[:-1]


def _clip_near(C, near):
    out = []
    n = len(C)
    for i in range(n):
        a, b = C[i], C[(i + 1) % n]
        ia, ib = a[2] >= near, b[2] >= near
        if ia:
            out.append(a)
        if ia != ib:
            t = (near - a[2]) / (b[2] - a[2])
            out.append(a + (b - a) * t)
    return out


def _to_screen(p, cam, r, u, f, fpx, Wp, Hp):
    c = p - cam.pos
    z = c @ f
    if z < 0.15:
        return None
    return (Wp / 2 + (c @ r) / z * fpx, Hp / 2 - (c @ u) / z * fpx)


def _draw_lines(d, face, cam, r, u, f, fpx, Wp, Hp, col, fog, bg):
    """Floor bands (horizontal) and mullions (vertical) on a building side, slightly darker."""
    p = face["p"]
    base = np.array(face.get("band_col") or (col * 0.9), float)
    lc = tuple(int(c) for c in (base * (1 - fog) + np.array(bg, float) * fog))
    h = p[3][1] - p[0][1]
    width = np.linalg.norm(p[1] - p[0])
    lw = max(1, int(fpx * 0.06 / max(1.0, np.linalg.norm(p.mean(0) - cam.pos))))
    if face.get("bands"):
        k = face["bands"]
        y = k
        while y < h - 0.2:
            a = _to_screen(p[0] + np.array([0, y, 0]), cam, r, u, f, fpx, Wp, Hp)
            b = _to_screen(p[1] + np.array([0, y, 0]), cam, r, u, f, fpx, Wp, Hp)
            if a and b:
                d.line([a, b], fill=lc, width=lw)
            y += k
    if face.get("mull"):
        k = face["mull"]
        s = k
        dirv = (p[1] - p[0]) / max(width, 1e-6)
        while s < width - 0.2:
            a = _to_screen(p[0] + dirv * s, cam, r, u, f, fpx, Wp, Hp)
            b = _to_screen(p[3] + dirv * s, cam, r, u, f, fpx, Wp, Hp)
            if a and b:
                d.line([a, b], fill=lc, width=max(1, lw - 1))
            s += k


def _perspective_coeffs(src, dst):
    """Coefficients for Image.transform(PERSPECTIVE) mapping dst quad -> src quad."""
    A, B = [], []
    for (x, y), (X, Y) in zip(dst, src):
        A.append([x, y, 1, 0, 0, 0, -X * x, -X * y]); B.append(X)
        A.append([0, 0, 0, x, y, 1, -Y * x, -Y * y]); B.append(Y)
    return np.linalg.solve(np.array(A, float), np.array(B, float)).tolist()


def _draw_tex(img, face, cam, r, u, f, fpx, Wp, Hp, fog, bg):
    tex = face["tex"]
    pts = [_to_screen(p, cam, r, u, f, fpx, Wp, Hp) for p in face["p"]]
    if any(p is None for p in pts):
        return
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    x0, y0 = int(max(0, min(xs))), int(max(0, min(ys)))
    x1, y1 = int(min(Wp, max(xs))) + 1, int(min(Hp, max(ys))) + 1
    if x1 - x0 < 2 or y1 - y0 < 2:
        return
    tw, th = tex.size
    src = [(0, 0), (tw, 0), (tw, th), (0, th)]
    dst = [(p[0] - x0, p[1] - y0) for p in pts]
    try:
        co = _perspective_coeffs(src, dst)
    except np.linalg.LinAlgError:
        return
    warped = tex.transform((x1 - x0, y1 - y0), Image.PERSPECTIVE, co, Image.BICUBIC)
    if fog > 0.01:
        a = warped.getchannel("A")
        fogl = Image.new("RGBA", warped.size, bg + (0,))
        warped = Image.blend(warped, Image.merge("RGBA", (*fogl.split()[:3], a)), fog)
    img.paste(warped, (x0, y0), warped)


@lru_cache(maxsize=64)
def text_tex(text, w=1200, h=320, fg=(30, 32, 38), bg=(250, 250, 252, 255), size=None, font="Montserrat.ttf",
             variation="Black", sub=None, accent=None):
    """A sign / screen texture: big text (optionally with a sub line and an accent stripe)."""
    im = Image.new("RGBA", (w, h), bg)
    d = ImageDraw.Draw(im)
    def mk(px):
        f_ = ImageFont.truetype(str(FONT_DIR / font), px)
        try:
            f_.set_variation_by_name(variation)
        except Exception:
            pass
        return f_
    px = size or int(h * (0.42 if sub else 0.55))
    fnt = mk(px)
    if fnt.getlength(text) > w * 0.88:
        fnt = mk(int(px * w * 0.88 / fnt.getlength(text)))
    if accent:
        d.rectangle([0, h - h * 0.08, w, h], fill=accent)
    y = h * (0.42 if sub else 0.5)
    d.text((w / 2, y), text, font=fnt, fill=fg, anchor="mm")
    if sub:
        f2 = ImageFont.truetype(str(FONT_DIR / font), int(h * 0.16))
        try:
            f2.set_variation_by_name("Bold")
        except Exception:
            pass
        d.text((w / 2, h * 0.8), sub, font=f2, fill=tuple(int(c * 0.6 + 100) for c in fg[:3]), anchor="mm")
    return im


# -- sets -------------------------------------------------------------------------------

def hq_set(sign="NVIDIA"):
    s = Scene(fog=320)
    s.plane(-120, 120, -40, 200)
    # plaza tiles
    for i in range(-6, 7):
        s.quad([[i * 6 - 0.04, 0.01, 0], [i * 6 + 0.04, 0.01, 0], [i * 6 + 0.04, 0.01, 60], [i * 6 - 0.04, 0.01, 60]],
               col=(226, 228, 234))
    # main building with a set-back crown
    s.box(-18, 18, 0, 22, 40, 62, bands=3.2, mull=2.4)
    s.box(-12, 12, 22, 30, 44, 60, bands=2.6, mull=2.4)
    s.box(-26, -18, 0, 12, 44, 60, bands=3.0, mull=3.0)
    s.box(18, 26, 0, 12, 44, 60, bands=3.0, mull=3.0)
    # sign slab in front of the facade
    s.box(-11, 11, 13.5, 19.5, 39.2, 39.8, col=(252, 252, 253))
    s.quad([[-10.6, 18.9, 39.15], [10.6, 18.9, 39.15], [10.6, 14.1, 39.15], [-10.6, 14.1, 39.15]],
           tex=text_tex(sign, 1400, 320, accent=(118, 185, 0)))
    # flanking towers further back
    for x, z, h in ((-48, 80, 44), (46, 78, 50), (-70, 110, 60), (72, 105, 56), (-34, 120, 70), (30, 125, 64)):
        s.box(x - 7, x + 7, 0, h, z - 7, z + 7, bands=3.4, mull=2.8)
    # low planters
    for x in (-14, -7, 7, 14):
        s.box(x - 1.6, x + 1.6, 0, 0.9, 30, 33.2, col=(238, 239, 243))
    return s


def avenue_set(sign="DIENSTAG", sub="QUARTALSZAHLEN"):
    s = Scene(fog=260)
    s.plane(-80, 80, -20, 260)
    s.quad([[-5, 0.01, -20], [5, 0.01, -20], [5, 0.01, 260], [-5, 0.01, 260]], col=(226, 227, 233))
    for z in range(0, 240, 12):
        s.quad([[-0.12, 0.02, z], [0.12, 0.02, z], [0.12, 0.02, z + 5], [-0.12, 0.02, z + 5]], col=(250, 250, 252))
    rng = np.random.default_rng(7)
    for side in (-1, 1):
        z = 4.0
        while z < 230:
            dz = rng.uniform(9, 15)
            h = rng.uniform(18, 46)
            x0 = side * 9.0
            x1 = side * (9.0 + rng.uniform(10, 16))
            s.box(min(x0, x1), max(x0, x1), 0, h, z, z + dz - 1.4, bands=3.0, mull=rng.choice([1.8, 2.4, 3.0]))
            z += dz
    for z in range(10, 140, 18):
        s.lamp(-6.2, z, side=-1)
        s.lamp(6.2, z, side=1)
        s.tree(-7.6, z + 9, 5.5)
        s.tree(7.6, z + 9, 5.5)
    # billboard at the end of the avenue
    s.box(-0.4, 0.4, 0, 9, 150, 150.8, col=(236, 237, 242))
    s.box(-9, 9, 9, 19, 149.6, 150.4, col=(252, 252, 253))
    s.quad([[-8.5, 18.5, 149.55], [8.5, 18.5, 149.55], [8.5, 9.5, 149.55], [-8.5, 9.5, 149.55]],
           tex=text_tex(sign, 1200, 640, sub=sub, accent=(52, 120, 246)))
    return s


def boardroom_set(screen="BOARD-MEETING", sub="Zukunft des CEO"):
    s = Scene(bg=(244, 244, 248), floor=(232, 232, 236), fog=60)
    s.plane(-12, 12, -6, 30)
    # back wall with tall windows
    s.quad([[-12, 0, 26], [12, 0, 26], [12, 7, 26], [-12, 7, 26]], col=(247, 247, 250))
    for x in np.arange(-11, 11, 2.2):
        s.quad([[x + 0.15, 0.6, 25.95], [x + 1.95, 0.6, 25.95], [x + 1.95, 6.4, 25.95], [x + 0.15, 6.4, 25.95]],
               col=(226, 232, 244))
    # side walls
    s.quad([[-12, 0, -6], [-12, 0, 26], [-12, 7, 26], [-12, 7, -6]], col=(240, 240, 244))
    s.quad([[12, 0, 26], [12, 0, -6], [12, 7, -6], [12, 7, 26]], col=(240, 240, 244))
    # screen on the left wall
    s.quad([[-11.9, 1.6, 8], [-11.9, 1.6, 18], [-11.9, 5.4, 18], [-11.9, 5.4, 8]][::-1],
           tex=text_tex(screen, 1200, 460, fg=(240, 242, 248), bg=(28, 30, 38, 255), sub=sub, accent=(226, 58, 64)))
    # long table and chairs
    s.box(-2.2, 2.2, 0.72, 0.84, 2, 22, col=(250, 250, 252))
    s.box(-0.3, 0.3, 0, 0.72, 4, 20, col=(236, 237, 241))
    for z in np.arange(3.5, 21, 2.4):
        for side in (-1, 1):
            x = side * 3.0
            s.box(x - 0.45, x + 0.45, 0.42, 0.52, z - 0.45, z + 0.45, col=(60, 62, 70))
            bx = x + side * 0.4
            s.box(min(bx, bx + side * 0.12), max(bx, bx + side * 0.12), 0.52, 1.35, z - 0.45, z + 0.45, col=(52, 54, 62))
    return s


def office_set():
    s = Scene(bg=(244, 245, 248), floor=(233, 234, 238), fog=55)
    s.plane(-20, 20, -6, 50)
    s.quad([[-20, 0, 40], [20, 0, 40], [20, 6, 40], [-20, 6, 40]], col=(247, 247, 250))
    for x in np.arange(-19, 19, 2.6):
        s.quad([[x + 0.2, 0.8, 39.95], [x + 2.4, 0.8, 39.95], [x + 2.4, 5.2, 39.95], [x + 0.2, 5.2, 39.95]],
               col=(226, 232, 244))
    for row in range(5):
        z = 6 + row * 6
        for x in (-9, -4.5, 0, 4.5, 9):
            s.box(x - 1.8, x + 1.8, 0.74, 0.8, z, z + 1.6, col=(250, 250, 252))
            s.box(x - 1.7, x - 1.6, 0, 0.74, z + 0.1, z + 1.5, col=(230, 231, 236))
            s.box(x + 1.6, x + 1.7, 0, 0.74, z + 0.1, z + 1.5, col=(230, 231, 236))
            for mx in (-0.75, 0.75):
                s.box(x + mx - 0.6, x + mx + 0.6, 0.95, 1.65, z + 1.25, z + 1.3, col=(40, 42, 50))
                s.box(x + mx - 0.05, x + mx + 0.05, 0.8, 0.95, z + 1.3, z + 1.35, col=(200, 202, 208))
    return s


def studio_set():
    """Plain cyclorama for close-ups: floor fades into the wall."""
    s = Scene(bg=(242, 242, 246), floor=(236, 236, 241), fog=40)
    s.plane(-30, 30, -10, 40)
    return s


def reichstag_set():
    """Parliament: wide plaza, colonnade, pediment with inscription, glass dome, flags, lawn."""
    s = Scene(fog=380)
    s.plane(-160, 160, -60, 260)
    s.flat(-60, 60, -10, 34, (214, 228, 200))                 # lawn
    s.flat(-6, 6, -40, 40, (236, 236, 240), bias=3900.0)       # path
    for z in range(-30, 34, 6):
        s.flat(-6, 6, z, z + 0.15, (226, 226, 232), bias=3800.0)
    s.box(-46, 46, 0, 18, 40, 76, bands=4.5)
    s.windows(-44, -16, 2, 16, 40, 3, 7)
    s.windows(16, 44, 2, 16, 40, 3, 7)
    for x in (-46, 46):                                        # corner towers
        s.box(x - 7, x + 7, 0, 25, 36, 50, bands=5.0)
        s.windows(x - 6, x + 6, 3, 22, 36, 4, 3)
    s.box(-16, 16, 0, 1.6, 34, 40, col=(238, 238, 242))       # steps
    s.box(-15, 15, 1.6, 2.4, 35.5, 40, col=(244, 244, 247))
    for i in range(6):                                         # colonnade
        x = -12.5 + i * 5
        s.box(x - 0.8, x + 0.8, 2.4, 16, 36.6, 38.2)
    s.box(-16, 16, 16, 18.5, 36, 40)
    tri = [[-16, 18.5, 35.95], [16, 18.5, 35.95], [0, 24.5, 35.95]]
    s.faces.append(dict(p=np.array(tri, float), col=(248, 248, 251), double=True, bias=-0.5, poly=True))
    s.quad([[-12, 18.2, 35.9], [12, 18.2, 35.9], [12, 16.3, 35.9], [-12, 16.3, 35.9]],
           tex=text_tex("DEM DEUTSCHEN VOLKE", 1600, 140, fg=(80, 84, 96), bg=(246, 246, 249, 255)), bias=-1.0)
    # glass dome: hemisphere from stacked glass rings with ribs, on a drum
    s._box(-10, 10, 18, 20.5, 42, 62, col=(240, 240, 244), bands=0, mull=2.5)
    n = 11
    for k in range(n):
        a0, a1 = math.pi / 2 * k / n, math.pi / 2 * (k + 1) / n
        r = 9.4 * math.cos((a0 + a1) / 2)
        y0, y1 = 20.5 + 11 * math.sin(a0), 20.5 + 11 * math.sin(a1)
        s._box(-r, r, y0, y1, 52 - r, 52 + r, col=(208, 222, 240), bands=0, mull=1.4, band_col=(170, 186, 210))
    # flags
    for x in (-11, 11):
        s._box(x - 0.15, x + 0.15, 0, 13, 27, 27.3, col=(150, 154, 164))
        for j, c in enumerate(((30, 30, 34), (220, 40, 46), (255, 204, 0))):
            s.quad([[x + 0.15, 12.6 - j * 0.8, 27.1], [x + 3.6, 12.6 - j * 0.8, 27.1], [x + 3.6, 11.8 - j * 0.8, 27.1],
                    [x + 0.15, 11.8 - j * 0.8, 27.1]], c, bias=-0.3)
    for x, z in ((-16, 14), (16, 14), (-16, 2), (16, 2), (-16, -10), (16, -10)):
        s.tree(x, z, 6.5)
    for z in (-24, -12, 0, 12):
        s.lamp(-7.5, z, side=-1)
        s.lamp(7.5, z, side=1)
    for x, z, h in ((-90, 120, 44), (88, 118, 50), (-120, 150, 60), (120, 150, 56)):
        s.box(x - 9, x + 9, 0, h, z - 9, z + 9, bands=3.4, mull=2.8)
    return s


def ministry_set(sign="FINANZMINISTERIUM"):
    """Long ministry block with a regular window grid, entrance portal, sign, trees and lamps."""
    s = Scene(fog=300)
    s.plane(-160, 160, -60, 260)
    s.flat(-80, 80, -20, 18, (238, 238, 242))
    for x in range(-78, 80, 4):
        s.flat(x, x + 0.08, -20, 18, (228, 228, 234), bias=3900.0)
    s.box(-55, 55, 0, 24, 20, 44, bands=0)
    s.windows(-53, -8, 1.5, 22, 20, 6, 12)
    s.windows(8, 53, 1.5, 22, 20, 6, 12)
    s.box(-8, 8, 0, 26, 18.5, 22)                             # portal block
    s.box(-4, 4, 0, 7, 18.2, 18.6, col=(120, 128, 146))       # door
    s.box(-8.5, 8.5, 0, 0.8, 16, 18.5, col=(236, 236, 240))
    s.quad([[-7.6, 13, 18.4], [7.6, 13, 18.4], [7.6, 9.6, 18.4], [-7.6, 9.6, 18.4]],
           tex=text_tex(sign, 1400, 300, accent=(226, 58, 64)), bias=-1.0)
    for x in (-40, -26, 26, 40):
        s.tree(x, 10, 6.5)
    for x in (-14, 14):
        s.lamp(x, 8, side=-1 if x < 0 else 1)
    for x, z, h in ((-95, 100, 40), (92, 96, 46), (0, 140, 70)):
        s.box(x - 10, x + 10, 0, h, z - 10, z + 10, bands=3.4, mull=2.8)
    return s


@lru_cache(maxsize=8)
def chart_tex(seed, up=True, w=640, h=380, label="BTC"):
    rng = np.random.default_rng(abs(int(seed)))
    im = Image.new("RGBA", (w, h), (24, 26, 34, 255))
    d = ImageDraw.Draw(im)
    for gy in range(4):
        d.line([(20, 60 + gy * 80), (w - 20, 60 + gy * 80)], fill=(48, 52, 64), width=2)
    v = np.cumsum(rng.normal(0.4 if up else -0.4, 2.2, 40))
    v = (v - v.min()) / (np.ptp(v) + 1e-9)
    pts = [(20 + i * (w - 40) / 39, h - 40 - v[i] * (h - 120)) for i in range(40)]
    d.line(pts, fill=(60, 214, 120) if up else (240, 80, 90), width=6, joint="curve")
    f = ImageFont.truetype(str(FONT_DIR / "Montserrat.ttf"), 46)
    try:
        f.set_variation_by_name("Black")
    except Exception:
        pass
    d.text((28, 16), label, font=f, fill=(236, 238, 244))
    return im


def trading_set():
    """Bright trading floor: rows of desks with dark monitors showing crypto charts, video wall."""
    s = Scene(bg=(244, 245, 248), floor=(232, 233, 238), fog=70)
    s.plane(-20, 20, -6, 50)
    s.quad([[-20, 0, 40], [20, 0, 40], [20, 7, 40], [-20, 7, 40]], col=(247, 247, 250))
    labels = ["BTC", "ETH", "XRP", "SOL", "BTC", "ETH"]
    for i, x in enumerate(np.arange(-15, 16, 6)):
        s.quad([[x - 2.6, 2.2, 39.9], [x + 2.6, 2.2, 39.9], [x + 2.6, 5.4, 39.9], [x - 2.6, 5.4, 39.9]],
               tex=chart_tex(i, i % 3 != 1, label=labels[i]), bias=-1.0)
    for row in range(4):
        z = 6 + row * 7
        for x in (-9, -4.5, 0, 4.5, 9):
            s.box(x - 1.8, x + 1.8, 0.74, 0.8, z, z + 1.6, col=(250, 250, 252), shadow=False)
            s.ground_shadow(x - 1.8, x + 1.8, z, z + 1.6, 1.2)
            s._box(x - 1.7, x - 1.6, 0, 0.74, z + 0.1, z + 1.5, col=(230, 231, 236))
            s._box(x + 1.6, x + 1.7, 0, 0.74, z + 0.1, z + 1.5, col=(230, 231, 236))
            for j, mx in enumerate((-0.75, 0.75)):
                s._box(x + mx - 0.62, x + mx + 0.62, 0.92, 1.7, z + 1.28, z + 1.34, col=(36, 38, 46))
                s.quad([[x + mx - 0.56, 0.98, z + 1.26], [x + mx + 0.56, 0.98, z + 1.26], [x + mx + 0.56, 1.64, z + 1.26],
                        [x + mx - 0.56, 1.64, z + 1.26]], tex=chart_tex(row * 10 + j + int(x), (row + j) % 2 == 0,
                                                                          label=labels[(row + j) % 4]), bias=-0.2)
                s._box(x + mx - 0.05, x + mx + 0.05, 0.8, 0.92, z + 1.32, z + 1.38, col=(200, 202, 208))
    return s


SETS = {"reichstag": reichstag_set, "ministry": ministry_set, "trading": trading_set, "hq": hq_set, "avenue": avenue_set, "boardroom": boardroom_set, "office": office_set, "studio": studio_set}


@lru_cache(maxsize=16)
def get_set(name, *args):
    return SETS[name](*args)
