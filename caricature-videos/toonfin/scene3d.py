"""Tiny software 3D renderer for clean, bright "studio" sets (white towers, boardroom, office).

Boxes and textured quads in world space (y up, metres), a pinhole camera that can dolly, crane and
orbit, flat shading from one soft key light, distance fog to the background colour and painter's
ordering. Everything is drawn with Pillow at a supersampled size and reduced, so edges are smooth.
"""
import math
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from .ink import FONT_DIR

BG = (243, 243, 247)
FLOOR_KEY = (3, 251, 7)
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
    def __init__(self, bg=BG, floor=FLOOR, fog=90.0, sky=None, light_col=None, shade_col=None):
        self.sky, self.light_col, self.shade_col = sky, light_col, shade_col
        self.reflect = 0.0          # glossy floor: share of the mirrored scene seen in the floor
        self.edge = 0.93            # outline darkness of box edges (lower = more line-art)
        self.ambient = 0.82         # brightness of faces turned away from the key light
        self._mirror = None
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
    def with_extra(self, faces):
        """Shallow copy with extra (animated) faces for one frame."""
        c = Scene.__new__(Scene)
        c.__dict__.update(self.__dict__)
        c.faces = self.faces + faces
        c._mirror = None
        return c

    def mirror_scene(self):
        """The scene mirrored at the floor (y -> -y), used for glossy floor reflections."""
        if self._mirror is None:
            m = Scene(bg=self.floor, floor=self.floor, fog=self.fog * 0.6, light_col=self.light_col,
                      shade_col=self.shade_col)
            for f in self.faces:
                if f.get("floor") or float(np.max(f["p"][:, 1])) < 0.05:
                    continue
                g = dict(f)
                g["p"] = f["p"] * np.array([1, -1, 1])
                if "nout" in f:
                    g["nout"] = f["nout"] * np.array([1, -1, 1])
                g.pop("bands", None)
                g.pop("mull", None)
                m.faces.append(g)
            self._mirror = m
        return self._mirror

    def render(self, cam, W, H, ss=1.5, blur=0.0):
        Wp, Hp = int(W * ss), int(H * ss)
        img = Image.new("RGB", (Wp, Hp), self.bg)
        # soft vertical gradient: sky slightly cooler at the top, floor haze near the horizon
        g = np.linspace(0, 1, Hp)[:, None]
        if self.sky:
            # sky gradient tied to the horizon line, so it moves with the camera tilt
            r_, u_, f_ = cam.basis()
            fpx_ = (Hp / 2) / math.tan(math.radians(cam.fov) / 2)
            hz = Hp / 2 - (f_[1] / max(1e-3, math.hypot(f_[0], f_[2]))) * fpx_
            yy = np.arange(Hp)[:, None].astype(float)
            k = np.clip((yy - (hz - Hp * 0.9)) / (Hp * 0.9), 0, 1)
            cols = [np.array(c, float) for c in self.sky]
            n_ = len(cols) - 1
            idx = np.minimum((k * n_).astype(int), n_ - 1)
            fr = k * n_ - idx
            A = np.stack(cols)[idx[:, 0]]
            B = np.stack(cols)[idx[:, 0] + 1]
            grad = (A * (1 - fr) + B * fr)[:, None, :].repeat(Wp, 1)
        else:
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
        glow = None

        def proj(c):
            return (Wp / 2 + c[0] / c[2] * fpx, Hp / 2 - c[1] / c[2] * fpx)

        for depth, face, poly, n in drawn:
            depth = np.linalg.norm(face["p"].mean(0) - cam.pos)
            pts = [proj(c) for c in poly]
            fog = 1 - math.exp(-depth / self.fog)
            if face.get("floor") and self.reflect:
                d.polygon(pts, fill=FLOOR_KEY)
                continue
            if face.get("tex") is None and face.get("poly"):
                shade_col = np.array(face["col"], float)
                shade_col = shade_col * (1 - fog) + np.array(self.bg, float) * fog
                d.polygon(pts, fill=tuple(int(c) for c in shade_col))
                continue
            if face.get("tex") is not None:
                _draw_tex(img, face, cam, r, u, f, fpx, Wp, Hp, fog, self.bg)
                d = ImageDraw.Draw(img)
                continue
            lam = max(0.0, float(np.dot(n, LIGHT)))
            shade = self.ambient + (1 - self.ambient) * lam
            if n[1] > 0.9:
                shade = 1.0
            col = np.array(face["col"], float) * shade
            if self.light_col and not face.get("emit"):
                tint = np.array(self.light_col, float) * lam + np.array(self.shade_col, float) * (1 - lam)
                if n[1] > 0.9:
                    tint = np.array(self.light_col, float) * 0.6 + np.array(self.shade_col, float) * 0.4
                col = col * tint / 255.0
            if face.get("emit"):
                col = np.array(face["col"], float)
                if glow is None:
                    glow = Image.new("RGB", (Wp, Hp), (0, 0, 0))
                    gd = ImageDraw.Draw(glow)
                gd.polygon(pts, fill=tuple(int(c * (1 - fog * 0.6)) for c in col))
            col = col * (1 - fog) + np.array(self.bg, float) * fog
            edge = tuple(int(c) for c in col * self.edge)
            d.polygon(pts, fill=tuple(int(c) for c in col), outline=edge if "nout" in face else None)
            if face.get("bands") or face.get("mull"):
                _draw_lines(d, face, cam, r, u, f, fpx, Wp, Hp, col, fog, self.bg)
        if self.reflect:
            a = np.asarray(img).copy()
            mask = (a[..., 0] == FLOOR_KEY[0]) & (a[..., 1] == FLOOR_KEY[1]) & (a[..., 2] == FLOOR_KEY[2])
            if mask.any():
                mi = self.mirror_scene().render(cam, W, H, ss=ss * 0.5)
                mi = mi.resize((Wp, Hp), Image.BILINEAR).filter(ImageFilter.GaussianBlur(3 * ss))
                mf = np.asarray(mi, float)
                fl = np.array(self.floor, float)
                # reflections fade with distance from the camera (lower screen = closer = stronger)
                ys = np.linspace(0.6, 1.0, Hp)[:, None, None]
                comp_ = fl * (1 - self.reflect * ys) + mf * self.reflect * ys
                a[mask] = comp_[mask].astype(np.uint8)
            img = Image.fromarray(a)
        if glow is not None:
            g1 = np.asarray(glow.filter(ImageFilter.GaussianBlur(10 * ss)), float)
            g2 = np.asarray(glow.filter(ImageFilter.GaussianBlur(34 * ss)), float)
            a = np.asarray(img, float)
            a = 255 - (255 - a) * (1 - np.clip(g1 * 0.9 + g2 * 0.6, 0, 255) / 255)
            img = Image.fromarray(a.astype(np.uint8))
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


def project(cam, W, H, p):
    """Screen position (x, y) and depth of world point p, or None behind the camera."""
    r, u, f = cam.basis()
    fpx = (H / 2) / math.tan(math.radians(cam.fov) / 2)
    c = np.array(p, float) - cam.pos
    z = c @ f
    if z < 0.2:
        return None
    return W / 2 + (c @ r) / z * fpx, H / 2 - (c @ u) / z * fpx, z


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


# -- GTA-style sunset city ------------------------------------------------------------------

PASTEL = [(250, 176, 196), (164, 226, 210), (255, 206, 168), (196, 182, 240), (250, 232, 176), (170, 212, 250)]
NEON = [(255, 70, 170), (40, 230, 255), (255, 140, 40), (170, 90, 255)]


@lru_cache(maxsize=8)
def sun_tex(w=512):
    im = Image.new("RGBA", (w, w), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for i in range(40, 0, -1):
        r = w / 2 * i / 40
        a = int(255 * (1 - i / 40) ** 0.6) if i > 26 else 255
        c = (255, int(150 + 80 * (1 - i / 40)), int(90 + 60 * (1 - i / 40)), a)
        d.ellipse([w / 2 - r, w / 2 - r, w / 2 + r, w / 2 + r], fill=c)
    return im


@lru_cache(maxsize=16)
def neon_sign_tex(text, col=(255, 70, 170), w=1200, h=300, bg=(26, 20, 44, 255), sub=None):
    im = Image.new("RGBA", (w, h), bg)
    g = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(g)
    f = ImageFont.truetype(str(FONT_DIR / "Montserrat.ttf"), int(h * (0.42 if sub else 0.56)))
    try:
        f.set_variation_by_name("Black")
    except Exception:
        pass
    if f.getlength(text) > w * 0.9:
        f = ImageFont.truetype(str(FONT_DIR / "Montserrat.ttf"), int(h * 0.5 * w * 0.9 / f.getlength(text)))
        f.set_variation_by_name("Black")
    y = h * (0.4 if sub else 0.5)
    d.text((w / 2, y), text, font=f, fill=col + (255,), anchor="mm")
    if sub:
        f2 = ImageFont.truetype(str(FONT_DIR / "Montserrat.ttf"), int(h * 0.2))
        f2.set_variation_by_name("Bold")
        d.text((w / 2, h * 0.8), sub, font=f2, fill=(255, 255, 255, 235), anchor="mm")
    halo = g.filter(ImageFilter.GaussianBlur(h * 0.06))
    im.alpha_composite(halo)
    im.alpha_composite(halo)
    im.alpha_composite(g)
    d2 = ImageDraw.Draw(im)
    d2.rectangle([4, 4, w - 5, h - 5], outline=col + (255,), width=6)
    return im


@lru_cache(maxsize=8)
def led_chart_tex(w=1000, h=620, label="NVDA", change="+30 %"):
    im = Image.new("RGBA", (w, h), (14, 16, 30, 255))
    d = ImageDraw.Draw(im)
    for gy in range(5):
        d.line([(40, 150 + gy * 100), (w - 40, 150 + gy * 100)], fill=(40, 46, 72), width=2)
    rng = np.random.default_rng(3)
    v = list(np.cumsum(rng.normal(-0.35, 1.0, 34)))
    v += [v[-1] + 9.5, v[-1] + 10.6, v[-1] + 10.2, v[-1] + 11.3]
    v = np.array(v)
    v = (v - v.min()) / np.ptp(v)
    pts = [(40 + i * (w - 80) / (len(v) - 1), h - 50 - v[i] * (h - 230)) for i in range(len(v))]
    red, grn = pts[:35], pts[34:]
    d.line(red, fill=(255, 80, 110), width=7, joint="curve")
    d.line(grn, fill=(60, 255, 150), width=9, joint="curve")
    f = ImageFont.truetype(str(FONT_DIR / "Montserrat.ttf"), 78)
    f.set_variation_by_name("Black")
    d.text((44, 30), label, font=f, fill=(240, 240, 255))
    d.text((w - 44, 30), change, font=f, fill=(60, 255, 150), anchor="ra")
    return im


def palm(s, x, z, h=9.0, lean=(0.6, 0.2), seed=0):
    rng = np.random.default_rng(seed)
    segs = 7
    px, pz = x, z
    for i in range(segs):
        k = (i + 1) / segs
        nx, nz = x + lean[0] * k * k * h * 0.25, z + lean[1] * k * k * h * 0.25
        r = 0.26 - 0.08 * k
        s._box(min(px, nx) - r, max(px, nx) + r, h * i / segs, h * (i + 1) / segs, min(pz, nz) - r, max(pz, nz) + r,
               col=(176, 140, 108))
        px, pz = nx, nz
    top = np.array([px, h, pz])
    for j in range(9):
        a = 2 * math.pi * j / 9 + rng.uniform(-0.2, 0.2)
        L = rng.uniform(3.0, 4.2)
        dx, dz = math.cos(a), math.sin(a)
        tip = top + np.array([dx * L, -1.6 - rng.uniform(0, 0.8), dz * L])
        mid = top + np.array([dx * L * 0.55, 0.45, dz * L * 0.55])
        side = np.array([-dz, 0, dx]) * 0.55
        col = (58, 168, 108) if j % 2 else (82, 190, 120)
        s.faces.append(dict(p=np.array([top, mid + side, tip, mid - side]), col=col, double=True, poly=False))
    s.ground_shadow(px - 2.5, px + 2.5, pz - 2.5, pz + 2.5, 3)


def deco_building(s, x0, x1, z0, z1, h, col, neon, sign=None, sign_col=None, seed=0):
    """Art-deco block: pastel body, white floor bands, a stepped top, neon strip along the roof and a sign."""
    s.box(x0, x1, 0, h, z0, z1, col=col, bands=3.0, band_col=tuple(min(255, c + 30) for c in col))
    face_x = x0 if x0 > 0 else x1                  # facade facing the road (x = 0)
    inward = -1 if x0 > 0 else 1
    rows = int(h // 3.0)
    for r in range(rows - 1):
        for zz in np.arange(z0 + 1.2, z1 - 1.0, 2.4):
            y = 1.2 + r * 3.0
            s.quad([[face_x + inward * 0.04, y, zz], [face_x + inward * 0.04, y, zz + 1.4],
                    [face_x + inward * 0.04, y + 1.6, zz + 1.4], [face_x + inward * 0.04, y + 1.6, zz]],
                   (120, 196, 230) if (r + int(zz)) % 3 else (150, 220, 240), bias=-0.4)
    # stepped crown + neon edge
    m = (x1 - x0) * 0.2
    s._box(x0 + m, x1 - m, h, h + 2.2, z0 + m, z1 - m, col=(252, 248, 244))
    s.faces.append(dict(p=np.array([[face_x + inward * 0.06, h - 0.35, z0], [face_x + inward * 0.06, h - 0.35, z1],
                                    [face_x + inward * 0.06, h - 0.05, z1], [face_x + inward * 0.06, h - 0.05, z0]]),
                        col=neon, emit=True, double=True, bias=-0.5))
    s.faces.append(dict(p=np.array([[face_x + inward * 0.06, 0.05, z0 + 0.1], [face_x + inward * 0.06, 0.05, z0 + 0.4],
                                    [face_x + inward * 0.06, h, z0 + 0.4], [face_x + inward * 0.06, h, z0 + 0.1]]),
                        col=neon, emit=True, double=True, bias=-0.5))
    if sign:
        sw = min(z1 - z0 - 2, 9)
        zc = (z0 + z1) / 2
        y0 = h * 0.55
        s.quad([[face_x + inward * 0.1, y0 + 2.6, zc - sw / 2], [face_x + inward * 0.1, y0 + 2.6, zc + sw / 2],
                [face_x + inward * 0.1, y0, zc + sw / 2], [face_x + inward * 0.1, y0, zc - sw / 2]][::(-1 if x0 > 0 else 1)]
               if False else
               [[face_x + inward * 0.1, y0 + 2.6, zc - sw / 2 * inward], [face_x + inward * 0.1, y0 + 2.6, zc + sw / 2 * inward],
                [face_x + inward * 0.1, y0, zc + sw / 2 * inward], [face_x + inward * 0.1, y0, zc - sw / 2 * inward]],
               tex=neon_sign_tex(sign, sign_col or neon), bias=-1.0)


def vicecity_set():
    """Sunset 'Vice City' boulevard: ocean and beach on the left, pastel art-deco hotels with neon on the
    right, palms, a stock-exchange tower with a giant LED chart, skyline in the haze."""
    s = Scene(bg=(255, 196, 170), floor=(236, 214, 200), fog=420,
              sky=[(92, 70, 160), (196, 104, 178), (255, 150, 140), (255, 206, 150)],
              light_col=(255, 232, 205), shade_col=(196, 176, 232))
    s.plane(-400, 400, -100, 700)
    s.flat(-400, -26, -100, 700, (64, 168, 204), bias=4100.0)          # ocean
    s.flat(-26, -9, -100, 700, (246, 222, 184), bias=4000.0)           # beach
    s.flat(-9, -6, -100, 700, (230, 214, 206), bias=3950.0)            # promenade
    s.flat(-6, 6, -100, 700, (78, 80, 104), bias=3900.0)               # Ocean Drive
    for z in range(-90, 690, 10):
        s.flat(-0.12, 0.12, z, z + 4.5, (250, 236, 190), bias=3800.0)
    s.flat(6, 10, -100, 700, (238, 220, 214), bias=3950.0)             # sidewalk
    # waves glints
    for i in range(70):
        x = -40 - (i * 37 % 300)
        z = (i * 53) % 640 - 60
        s.flat(x, x + 6, z, z + 0.25, (150, 220, 240), bias=4050.0)
    # sun low over the sea
    s.quad([[-420, 8, 420], [-420, 8, 520], [-420, 108, 520], [-420, 108, 420]], tex=sun_tex(), bias=900.0)
    # hotels along the boulevard
    names = [("NVIDIA", NEON[1]), ("VICE STOCK EXCHANGE", NEON[0]), (None, None), ("BULL MARKET", NEON[2]),
             (None, None), ("HUANG IS BACK", NEON[0]), (None, None), ("+30 %", NEON[1])]
    z = 4.0
    rng = np.random.default_rng(11)
    for i in range(16):
        w = rng.uniform(16, 24)
        h = rng.uniform(14, 26)
        sign, sc = names[i % len(names)]
        deco_building(s, 11, 11 + rng.uniform(14, 20), z, z + w - 2.5, h, PASTEL[i % len(PASTEL)], NEON[i % 4],
                      sign=sign, sign_col=sc, seed=i)
        z += w
    # stock exchange tower with LED wall, standing at the end of the first block
    s.box(13, 33, 0, 60, 70, 92, col=(64, 60, 104), bands=4.0, mull=2.5, band_col=(90, 84, 140))
    s.quad([[12.9, 54, 90], [12.9, 54, 72], [12.9, 30, 72], [12.9, 30, 90]], tex=led_chart_tex(), bias=-2.0)
    # palms
    for k, z in enumerate(range(-20, 360, 13)):
        palm(s, -7.6, z, h=rng.uniform(8, 11), lean=(-0.8, 0.2), seed=k)
        if k % 2 == 0 and not (0 < z + 6 < 34):          # keep the first block's sidewalk free
            palm(s, 8.4, z + 6, h=rng.uniform(7.5, 9.5), lean=(0.4, -0.2), seed=100 + k)
    for k, z in enumerate(range(0, 300, 34)):
        palm(s, -18 + (k % 3) * 2.5, z + 11, h=rng.uniform(8, 12), lean=(-0.6, 0.4), seed=300 + k)
    # distant skyline
    for i in range(26):
        x = 50 + (i % 6) * 18 + rng.uniform(-4, 4)
        z = 170 + i * 15 + rng.uniform(-6, 6)
        h = rng.uniform(40, 110)
        s.box(x - 7, x + 7, 0, h, z - 7, z + 7, col=(150, 122, 190), bands=3.2, mull=2.6, band_col=(176, 150, 210))
    # sports car on the boulevard
    s.box(2.2, 4.2, 0.25, 0.95, 24, 28.4, col=(255, 70, 150))
    s._box(2.45, 3.95, 0.95, 1.4, 25.3, 27.4, col=(40, 30, 70))
    for zz in (24.8, 27.6):
        for xx in (2.1, 4.3):
            s._box(xx - 0.12, xx + 0.12, 0, 0.55, zz - 0.3, zz + 0.3, col=(30, 30, 40))
    return s


# -- dark finance studio --------------------------------------------------------------------------

def _hexc(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def _tok():
    import json as _j
    return _j.loads((Path(__file__).parent / "tokens.json").read_text())


@lru_cache(maxsize=16)
def holo_tex(kind, a="", b="", w=900, h=560):
    """Hologram screen textures in the token colours: 'chart' (main wall), 'kpi', 'ticker', 'grid'."""
    t = _tok()["color"]
    info, up, down, gold = _hexc(t["info"]), _hexc(t["up"]), _hexc(t["down"]), _hexc(t["gold"])
    im = Image.new("RGBA", (w, h), (12, 20, 40, 150))
    d = ImageDraw.Draw(im)
    for gx in range(0, w, 60):
        d.line([(gx, 0), (gx, h)], fill=info + (26,), width=1)
    for gy in range(0, h, 60):
        d.line([(0, gy), (w, gy)], fill=info + (26,), width=1)
    d.rectangle([2, 2, w - 3, h - 3], outline=info + (200,), width=4)

    def f(px, bold=True):
        fo = ImageFont.truetype(str(FONT_DIR / "Montserrat.ttf"), int(px))
        fo.set_variation_by_name("Black" if bold else "Bold")
        return fo
    if kind == "chart":
        rng = np.random.default_rng(5)
        v = list(np.cumsum(rng.normal(0.25, 1.0, 40)))
        v[28:32] = [v[27] - 3, v[27] - 5, v[27] - 6.5, v[27] - 6]
        v += [v[-1] + 8, v[-1] + 9.5, v[-1] + 9, v[-1] + 10.5]
        v = np.array(v)
        v = (v - v.min()) / np.ptp(v)
        pts = [(50 + i * (w - 100) / (len(v) - 1), h - 60 - v[i] * (h - 210)) for i in range(len(v))]
        glowl = Image.new("RGBA", im.size, (0, 0, 0, 0))
        gd = ImageDraw.Draw(glowl)
        gd.line(pts, fill=up + (255,), width=14, joint="curve")
        im.alpha_composite(glowl.filter(ImageFilter.GaussianBlur(10)))
        d.line(pts, fill=(220, 255, 230, 255), width=5, joint="curve")
        d.text((50, 40), a or "TICKER", font=f(64), fill=(255, 255, 255, 255))
        if b:
            d.text((w - 50, 40), b, font=f(64), fill=up + (255,), anchor="ra")
    elif kind == "kpi":
        d.text((40, 40), a, font=f(40, False), fill=_hexc(t["text2"]) + (255,))
        col = up if b.startswith("+") else (down if b.startswith(("-", "−")) else gold)
        d.text((40, h * 0.58), b, font=f(h * 0.3), fill=col + (255,), anchor="lm")
    elif kind == "ticker":
        d.text((w / 2, h / 2), a, font=f(h * 0.5), fill=info + (255,), anchor="mm")
    elif kind == "standby":
        # stand-by content: soft raster light, a market-data tape and the ticker mark - never an empty screen
        for gy in range(0, h, 24):
            d.line([(0, gy), (w, gy)], fill=info + (14,), width=1)
        d.rectangle([0, h - 70, w, h], fill=(8, 14, 30, 210))
        tape = b or "NVDA  ▲ 29,67 %     NASDAQ  ▲ 1,8 %     S&P 500  ▲ 0,9 %     DAX  ▲ 0,6 %     BTC  ▼ 1,2 %"
        d.text((30, h - 35), tape, font=f(30, False), fill=(200, 220, 240, 230), anchor="lm")
        d.text((w / 2, h * 0.42), a, font=f(h * 0.28), fill=info + (70,), anchor="mm")
    elif kind == "capitol":
        # glowing line drawing of a capitol building
        cx, base = w / 2, h * 0.86
        col = info + (230,)
        d.line([(cx - w * 0.42, base), (cx + w * 0.42, base)], fill=col, width=5)
        d.rectangle([cx - w * 0.38, base - h * 0.22, cx + w * 0.38, base], outline=col, width=4)
        for i in range(13):
            x = cx - w * 0.34 + i * w * 0.68 / 12
            d.line([(x, base - h * 0.2), (x, base - h * 0.02)], fill=col, width=3)
        d.polygon([(cx - w * 0.14, base - h * 0.22), (cx + w * 0.14, base - h * 0.22), (cx, base - h * 0.32)], outline=col)
        d.rectangle([cx - w * 0.1, base - h * 0.42, cx + w * 0.1, base - h * 0.3], outline=col, width=4)
        d.chord([cx - w * 0.12, base - h * 0.66, cx + w * 0.12, base - h * 0.3], 180, 360, outline=col, width=5)
        d.line([(cx, base - h * 0.66), (cx, base - h * 0.76)], fill=col, width=4)
        d.text((cx, h * 0.08), a or "US-KONGRESS", font=f(h * 0.07), fill=(220, 236, 255, 240), anchor="mm")
    return im


# -- animated props (built per frame) ----------------------------------------------------------

def obox(c, size, yaw=0.0, col=(240, 240, 244)):
    """Box faces centred at c with size (sx, sy, sz), turned by ``yaw`` degrees around the vertical axis."""
    cx, cy, cz = c
    sx, sy, sz = size[0] / 2, size[1] / 2, size[2] / 2
    a = math.radians(yaw)
    ca, sa = math.cos(a), math.sin(a)

    def P(x, y, z):
        return [cx + x * ca + z * sa, cy + y, cz - x * sa + z * ca]
    V = [P(-sx, -sy, -sz), P(sx, -sy, -sz), P(sx, sy, -sz), P(-sx, sy, -sz),
         P(-sx, -sy, sz), P(sx, -sy, sz), P(sx, sy, sz), P(-sx, sy, sz)]
    quads = [(0, 1, 2, 3), (5, 4, 7, 6), (4, 0, 3, 7), (1, 5, 6, 2), (3, 2, 6, 7), (4, 5, 1, 0)]
    N = [(0, 0, -1), (0, 0, 1), (-1, 0, 0), (1, 0, 0), (0, 1, 0), (0, -1, 0)]
    out = []
    for q, n in zip(quads, N):
        nn = np.array([n[0] * ca + n[2] * sa, n[1], -n[0] * sa + n[2] * ca], float)
        out.append(dict(p=np.array([V[i] for i in q], float), col=col, nout=nn))
    return out


def money_faces(x0, z0, t, cols=5, rows=3, layers=9, dur=2.4, seed=0):
    """Bundles of banknotes stacking up (drop in with a small bounce), grid cols x rows, ``layers`` high."""
    rng = np.random.default_rng(seed)
    faces = []
    bw, bh, bd = 1.25, 0.28, 0.6
    total = cols * rows * layers
    k = max(0.0, min(1.0, t / dur))
    shown = k * total
    idx = 0
    for L in range(layers):
        for r in range(rows):
            for c in range(cols):
                if idx >= shown:
                    return faces
                f = min(1.0, shown - idx)
                drop = (1 - f) ** 2 * 3.0
                x = x0 + (c - (cols - 1) / 2) * (bw + 0.12) + rng.uniform(-0.04, 0.04)
                z = z0 + r * (bd + 0.1)
                y = L * bh + bh / 2 + drop
                yaw = rng.uniform(-3, 3)
                faces += obox((x, y, z), (bw, bh * 0.96, bd), yaw, (118, 178, 112))
                faces += obox((x, y, z), (0.18, bh * 0.99, bd * 1.01), yaw, (236, 240, 230))
                idx += 1
    return faces


def gpu_faces(c, t, explode_at=0.3, dur=1.4, yaw=-28.0, glow=True):
    """Graphics card lying flat in an exploded view: the layers (backplate, PCB with die and memory,
    heatsink fins, shroud with fans) lift apart vertically while the card slowly turns."""
    k = max(0.0, min(1.0, (t - explode_at) / dur))
    k = 1 - (1 - k) ** 3
    yaw = yaw + t * 7
    a = math.radians(yaw)
    ra = np.array([math.cos(a), 0, -math.sin(a)])            # card length axis
    rb = np.array([math.sin(a), 0, math.cos(a)])             # card width axis
    cx, cy, cz = c
    faces = []

    def lay(level, size, col, local=(0, 0), rim=None):
        p = np.array([cx, cy, cz]) + np.array([0, level * (0.12 + 0.95 * k), 0]) + ra * local[0] + rb * local[1]
        out = obox(tuple(p), size, yaw, col)
        if rim:
            # thin glowing outline on the top edge (green rim light)
            hx, hz = size[0] / 2, size[2] / 2
            y = p[1] + size[1] / 2 + 0.005
            for (u0, v0), (u1, v1) in (((-hx, -hz), (hx, -hz)), ((hx, -hz), (hx, hz)), ((hx, hz), (-hx, hz)),
                                       ((-hx, hz), (-hx, -hz))):
                a0 = p + ra * u0 + rb * v0
                a1 = p + ra * u1 + rb * v1
                nrm = np.cross(a1 - a0, [0, 1, 0])
                nrm = nrm / (np.linalg.norm(nrm) + 1e-9) * 0.035
                out.append(dict(p=np.array([[a0[0] - nrm[0], y, a0[2] - nrm[2]], [a1[0] - nrm[0], y, a1[2] - nrm[2]],
                                            [a1[0] + nrm[0], y, a1[2] + nrm[2]], [a0[0] + nrm[0], y, a0[2] + nrm[2]]]),
                                col=rim, emit=True, double=True, bias=-0.1))
        return out
    G = (118, 255, 60) if glow else None
    faces += lay(-1.0, (4.4, 0.05, 1.9), (60, 62, 68), rim=G)                 # backplate
    faces += lay(0.0, (4.2, 0.07, 1.7), (24, 70, 42), rim=G)                  # PCB
    faces += lay(0.0, (0.9, 0.09, 0.1), (214, 170, 60), (-1.3, -0.86))       # gold edge connector
    faces += lay(0.1, (1.0, 0.08, 1.0), (196, 200, 208))                      # GPU die
    for dx, dz in ((-1.35, 0.5), (-1.35, -0.5), (1.35, 0.5), (1.35, -0.5)):
        faces += lay(0.1, (0.5, 0.06, 0.4), (26, 26, 30), (dx, dz))           # memory
    for i in range(10):
        faces += lay(1.0, (0.05, 0.45, 1.6), (170, 174, 182), (-1.9 + i * 0.42, 0))   # fins
    faces += lay(2.0, (4.4, 0.25, 1.9), (30, 32, 38), rim=G)                  # shroud
    for dx in (-1.05, 1.05):
        faces += lay(2.18, (1.3, 0.03, 1.3), (74, 76, 84), (dx, 0))           # fans
        faces += lay(2.21, (0.35, 0.04, 0.35), (118, 185, 0), (dx, 0))        # hub accent
    faces += lay(0.1, (1.0, 0.08, 1.0), (196, 200, 208), rim=G)               # die rim (the green core)
    return faces


def newsroom_set(ticker="NVDA", tape=""):
    """Cinematic dark newsroom for one-take videos. Zones:
    hook void (x=-34): black space where the exploded GPU floats (rim-lit), match-cut source;
    main stage (0, 4) with a round pendant lamp (match-cut target), glowing ring and two side holo panels;
    chart wall (back, z=30, x -12..12) glass screen with stand-by content;
    boardroom (x=+30): table, chairs (their light strips are animated props), vote screen at z=24;
    capitol screen on the left wall (x=-23.8, z 6..20); detail table front right."""
    tk = _tok()["color"]
    info = _hexc(tk["info"])
    s = Scene(bg=(8, 11, 20), floor=(14, 18, 28), fog=60, sky=[(4, 6, 12), (8, 11, 20), (14, 18, 32)],
              light_col=(236, 240, 255), shade_col=(44, 52, 76))
    s.reflect, s.edge, s.ambient = 0.38, 0.86, 0.62
    s.quad([[-70, 0, -40], [60, 0, -40], [60, 0, 60], [-70, 0, 60]], (14, 18, 28), bias=10000.0)
    s.faces[-1]["floor"] = True
    # walls
    s.quad([[-24, 0, 30], [24, 0, 30], [24, 16, 30], [-24, 16, 30]], (18, 23, 38), bias=-0.2)
    s.quad([[-24, 0, -10], [-24, 0, 30], [-24, 16, 30], [-24, 16, -10]], (15, 19, 32))
    for x in range(-22, 23, 4):                                         # wall panel seams
        s.quad([[x - 0.03, 0.4, 29.9], [x + 0.03, 0.4, 29.9], [x + 0.03, 15.6, 29.9], [x - 0.03, 15.6, 29.9]],
               (28, 34, 52), bias=-0.3)
    # chart wall: glass screen with stand-by content and a glowing frame
    s.quad([[-12, 11.2, 29.75], [12, 11.2, 29.75], [12, 1.6, 29.75], [-12, 1.6, 29.75]],
           tex=holo_tex("standby", ticker, tape, 1600, 640), bias=-2.0)
    for y in (1.45, 11.35):
        s.faces.append(dict(p=np.array([[-12.2, y - 0.06, 29.7], [12.2, y - 0.06, 29.7], [12.2, y + 0.06, 29.7],
                                        [-12.2, y + 0.06, 29.7]]), col=info, emit=True, double=True, bias=-2.5))
    # capitol screen on the left wall (faces +x)
    s.quad([[-23.8, 9.5, 6], [-23.8, 9.5, 20], [-23.8, 2.0, 20], [-23.8, 2.0, 6]][::-1] if False else
           [[-23.8, 9.5, 6], [-23.8, 9.5, 20], [-23.8, 2.0, 20], [-23.8, 2.0, 6]],
           tex=holo_tex("capitol", "US-KONGRESS", "", 1200, 640), bias=-1.0)
    # pillars with light strips
    for x in (-18, 18):
        s.box(x - 0.6, x + 0.6, 0, 16, 26, 27.2, col=(22, 27, 44), shadow=False)
        s.faces.append(dict(p=np.array([[x - 0.07, 0.2, 25.95], [x + 0.07, 0.2, 25.95], [x + 0.07, 15.5, 25.95],
                                        [x - 0.07, 15.5, 25.95]]), col=info, emit=True, double=True, bias=-0.3))
    # main stage + ring
    R = 3.0
    for k in range(10):
        a0, a1 = 2 * math.pi * k / 10, 2 * math.pi * (k + 1) / 10
        p0 = (R * math.cos(a0), 4 + R * math.sin(a0))
        p1 = (R * math.cos(a1), 4 + R * math.sin(a1))
        s.faces.append(dict(p=np.array([[0, 0.22, 4], [p0[0], 0.22, p0[1]], [p1[0], 0.22, p1[1]]]), col=(24, 30, 48),
                            double=True, poly=True, bias=3000.0))
        s.faces.append(dict(p=np.array([[p0[0], 0.16, p0[1]], [p1[0], 0.16, p1[1]], [p1[0], 0.22, p1[1]],
                                        [p0[0], 0.22, p0[1]]]), col=info, emit=True, double=True, bias=2900.0))
    # round pendant lamp above the stage (match-cut target for the green chip core)
    for k in range(12):
        a0, a1 = 2 * math.pi * k / 12, 2 * math.pi * (k + 1) / 12
        s.faces.append(dict(p=np.array([[0, 9.0, 4], [1.1 * math.cos(a0), 9.0, 4 + 1.1 * math.sin(a0)],
                                        [1.1 * math.cos(a1), 9.0, 4 + 1.1 * math.sin(a1)]]),
                            col=(210, 255, 220), emit=True, double=True, poly=True, bias=-1.0))
    s._box(-0.03, 0.03, 9.0, 13, 3.97, 4.03, col=(60, 66, 80))
    # boardroom zone
    s.quad([[22, 9.0, 23.9], [38, 9.0, 23.9], [38, 2.0, 23.9], [22, 2.0, 23.9]],
           tex=holo_tex("standby", "BOARD", "VERWALTUNGSRAT  ·  SITZUNG  ·  ABSTIMMUNG", 1200, 520), bias=-1.0)
    s.box(20, 40, 0, 16, 24, 24.6, col=(18, 23, 38), shadow=False)
    s.box(27.5, 32.5, 0.72, 0.8, 6, 18, col=(30, 36, 54), shadow=False)
    s.ground_shadow(27.5, 32.5, 6, 18, 1.0)
    for z in np.arange(7, 18, 2.2):
        for x in (26.5, 33.5):
            s._box(x - 0.35, x + 0.35, 0.45, 0.53, z - 0.32, z + 0.32, col=(26, 28, 36))
            bx = x - 0.32 if x < 30 else x + 0.32
            s._box(min(bx, bx + (0.07 if x > 30 else -0.07)), max(bx, bx + (0.07 if x > 30 else -0.07)), 0.53, 1.25,
                   z - 0.32, z + 0.32, col=(22, 24, 32))
    # detail table front right
    s.box(5.2, 9.2, 0, 0.9, -4, -1.6, col=(24, 30, 48))
    s.quad([[5.25, 0.92, -1.65], [9.15, 0.92, -1.65], [9.15, 0.92, -3.95], [5.25, 0.92, -3.95]],
           tex=holo_tex("chart", ticker, "", 600, 360), bias=-0.4)
    # ceiling light bars
    for z in (0, 10, 20):
        s.faces.append(dict(p=np.array([[-14, 13, z], [14, 13, z], [14, 13, z + 0.25], [-14, 13, z + 0.25]]),
                            col=(190, 210, 255), emit=True, double=True))
    return s


def columns_faces(c, t, values, labels_h=None, dur=1.4, gap=2.6, scale=1.6, cols=((150, 158, 178), (34, 197, 94)),
                  glow=True):
    """Market-cap columns growing out of the floor like towers (glowing top caps)."""
    faces = []
    n = len(values)
    vmax = max(values)
    for i, v in enumerate(values):
        k = max(0.0, min(1.0, (t - i * 0.35) / dur))
        k = 1 - (1 - k) ** 3
        h = max(0.02, v / vmax * scale * 3.0 * k)
        x = c[0] + (i - (n - 1) / 2) * gap
        faces += obox((x, h / 2, c[2]), (1.4, h, 1.4), 0, cols[i % len(cols)])
        if glow:
            faces.append(dict(p=np.array([[x - 0.72, h + 0.01, c[2] - 0.72], [x + 0.72, h + 0.01, c[2] - 0.72],
                                          [x + 0.72, h + 0.01, c[2] + 0.72], [x - 0.72, h + 0.01, c[2] + 0.72]]),
                              col=cols[i % len(cols)], emit=True, double=True, bias=-0.2))
    return faces


def chairlight_faces(t, step=0.18, x_sides=(26.5, 33.5), zs=None, glow=True, mid=30.0):
    """Light strips on the boardroom chair backs turning green one after another (unanimous vote)."""
    zs = zs if zs is not None else list(np.arange(7, 18, 2.2))
    faces = []
    i = 0
    for z in zs:
        for x in x_sides:
            on = t > i * step
            col = (34, 197, 94) if on else (60, 66, 84)
            bx = x - 0.32 if x < mid else x + 0.32
            xo = bx + (-0.04 if x < mid else 0.04)
            f = dict(p=np.array([[xo, 0.62, z - 0.25], [xo, 0.62, z + 0.25], [xo, 1.2, z + 0.25], [xo, 1.2, z - 0.25]]),
                     col=col, double=True, bias=-0.3)
            if on and glow:
                f["emit"] = True
            faces.append(f)
            i += 1
    return faces


def darkstudio_set(ticker="NVDA", change="+30 %"):
    """Dark, glossy finance studio: reflective floor, main chart wall, side KPI panels, floating holograms,
    a stage with a glowing ring for the Panda, a holo detail table, ceiling light bars, pillars with light strips."""
    tk = _tok()["color"]
    bg = _hexc(tk["bg"])
    info, up, gold = _hexc(tk["info"]), _hexc(tk["up"]), _hexc(tk["gold"])
    s = Scene(bg=bg, floor=(18, 22, 36), fog=70, sky=[(6, 8, 16), (11, 15, 26), (20, 26, 44)],
              light_col=(230, 236, 255), shade_col=(70, 80, 110))
    s.reflect = 0.34
    s.quad([[-40, 0, -30], [40, 0, -30], [40, 0, 60], [-40, 0, 60]], (18, 22, 36), bias=10000.0)
    s.faces[-1]["floor"] = True
    # back wall, side walls
    s.quad([[-24, 0, 30], [24, 0, 30], [24, 16, 30], [-24, 16, 30]], (22, 28, 46), bias=-0.2)
    s.quad([[-24, 0, -30], [-24, 0, 30], [-24, 16, 30], [-24, 16, -30]], (16, 20, 34))
    s.quad([[24, 0, 30], [24, 0, -30], [24, 16, -30], [24, 16, 30]], (16, 20, 34))
    # main chart wall (screen) with glowing frame
    s.quad([[-10, 10.6, 29.8], [10, 10.6, 29.8], [10, 1.8, 29.8], [-10, 1.8, 29.8]],
           tex=holo_tex("chart", ticker, change, 1200, 540), bias=-2.0)
    for y in (1.6, 10.8):
        s.faces.append(dict(p=np.array([[-10.2, y - 0.07, 29.7], [10.2, y - 0.07, 29.7], [10.2, y + 0.07, 29.7],
                                        [-10.2, y + 0.07, 29.7]]), col=info, emit=True, double=True, bias=-2.5))
    # side KPI panels, angled to the stage
    for side, (lab, val) in ((-1, ("KURS", change)), (1, ("TICKER", ticker))):
        x0, x1 = side * 15, side * 11
        s.quad([[x0, 7.5, 12], [x1, 7.5, 20], [x1, 2.5, 20], [x0, 2.5, 12]][:: (1 if side > 0 else -1)] if False else
               ([[x0, 7.5, 12], [x1, 7.5, 20], [x1, 2.5, 20], [x0, 2.5, 12]] if side < 0 else
                [[x1, 7.5, 20], [x0, 7.5, 12], [x0, 2.5, 12], [x1, 2.5, 20]]),
               tex=holo_tex("kpi", lab, val, 700, 440), bias=-1.0)
    # pillars with vertical light strips
    for x in (-18, -12, 12, 18):
        s.box(x - 0.6, x + 0.6, 0, 16, 26, 27.2, col=(26, 32, 52), shadow=False)
        s.faces.append(dict(p=np.array([[x - 0.08, 0.2, 25.95], [x + 0.08, 0.2, 25.95], [x + 0.08, 15.5, 25.95],
                                        [x - 0.08, 15.5, 25.95]]), col=info, emit=True, double=True, bias=-0.3))
    # ceiling light bars
    for z in (2, 10, 18):
        s.faces.append(dict(p=np.array([[-12, 13, z], [12, 13, z], [12, 13, z + 0.3], [-12, 13, z + 0.3]]),
                            col=(200, 220, 255), emit=True, double=True))
    # stage: low octagon platform with glowing ring
    R = 3.2
    for k in range(8):
        a0, a1 = 2 * math.pi * k / 8, 2 * math.pi * (k + 1) / 8
        p0 = (R * math.cos(a0), 4 + R * math.sin(a0))
        p1 = (R * math.cos(a1), 4 + R * math.sin(a1))
        s.faces.append(dict(p=np.array([[0, 0.25, 4], [p0[0], 0.25, p0[1]], [p1[0], 0.25, p1[1]]]), col=(30, 36, 58),
                            double=True, poly=True, bias=3000.0))
        s.faces.append(dict(p=np.array([[p0[0], 0.0, p0[1]], [p1[0], 0.0, p1[1]], [p1[0], 0.25, p1[1]],
                                        [p0[0], 0.25, p0[1]]]), col=info, emit=True, double=True, bias=2900.0))
    # floating holograms beside the stage
    for side in (-1, 1):
        x = side * 5.2
        s.quad([[x - side * 0.0 - 1.6, 4.6, 7.0 + side * 0.8], [x + 1.6, 4.6, 7.0 - side * 0.8],
                [x + 1.6, 2.4, 7.0 - side * 0.8], [x - 1.6, 2.4, 7.0 + side * 0.8]],
               tex=holo_tex("ticker", ticker if side < 0 else change, "", 600, 400), bias=-0.5)
    # detail table (front right): glass top with a mini chart
    s.box(5.2, 9.2, 0, 0.9, -4, -1.6, col=(28, 34, 56))
    s.quad([[5.25, 0.92, -1.65], [9.15, 0.92, -1.65], [9.15, 0.92, -3.95], [5.25, 0.92, -3.95]],
           tex=holo_tex("chart", ticker, "", 600, 360), bias=-0.4)
    s.faces.append(dict(p=np.array([[5.2, 0.9, -1.58], [9.2, 0.9, -1.58], [9.2, 0.95, -1.58], [5.2, 0.95, -1.58]]),
                        col=info, emit=True, double=True, bias=-0.5))
    return s


# -- bright line-art studio (reference look: white, airy, thin grey lines, transforms between zones) ---------

def _chair(s, x, z, face=1, col=(40, 42, 48)):
    """Simple modern chair: seat, backrest, central post, base. ``face`` +1 looks towards +z."""
    s._box(x - 0.32, x + 0.32, 0.44, 0.52, z - 0.3, z + 0.3, col=col)
    bz = z - face * 0.3
    s._box(x - 0.32, x + 0.32, 0.52, 1.15, min(bz, bz - face * 0.07), max(bz, bz - face * 0.07), col=col)
    s._box(x - 0.04, x + 0.04, 0.08, 0.44, z - 0.04, z + 0.04, col=(150, 152, 160))
    s._box(x - 0.3, x + 0.3, 0.0, 0.08, z - 0.3, z + 0.3, col=(70, 72, 80))
    s.ground_shadow(x - 0.32, x + 0.32, z - 0.3, z + 0.3, 1.0)


def brightstudio_set():
    """Airy white studio in three zones the camera flies between:
    A (x=0) presentation hall with a big wall screen and rows of chairs,
    C (x=-45) a giant circuit-board / chip relief (tech, data),
    B (x=+45) a boardroom with a long table and glass partitions."""
    s = Scene(bg=(247, 247, 250), floor=(242, 242, 246), fog=170, sky=[(240, 241, 246), (246, 246, 249), (249, 249, 251)])
    s.edge, s.ambient = 0.8, 0.94
    s.plane(-120, 120, -40, 80)
    for x in range(-90, 92, 3):                       # floor tiles
        s.flat(x - 0.025, x + 0.025, -40, 80, (226, 227, 233), bias=3900.0)
    for z in range(-39, 80, 3):
        s.flat(-120, 120, z - 0.025, z + 0.025, (226, 227, 233), bias=3900.0)
    # ceiling with light panels (soft, not neon)
    s.quad([[-120, 11, -40], [120, 11, -40], [120, 11, 21], [-120, 11, 21]], (246, 246, 249), bias=9000.0)
    for x in range(-60, 61, 6):
        for z in range(-30, 19, 6):
            s.quad([[x - 1.8, 10.98, z - 1.8], [x + 1.8, 10.98, z - 1.8], [x + 1.8, 10.98, z + 1.8], [x - 1.8, 10.98, z + 1.8]],
                   (251, 251, 253), bias=8000.0)
    # --- zone A: hall ------------------------------------------------------------------
    s.box(-16, 16, 0, 11, 20, 20.6, col=(248, 248, 251), shadow=False, mull=2.0, band_col=(232, 233, 238))
    s._box(-5.0, 5.0, 1.6, 8.0, 19.8, 20.0, col=(34, 36, 42))              # screen bezel (black)
    s.quad([[-4.7, 7.7, 19.78], [4.7, 7.7, 19.78], [4.7, 1.9, 19.78], [-4.7, 1.9, 19.78]], (238, 240, 245),
           bias=-0.3)                                                        # screen surface
    for side in (-1, 1):
        s.box(side * 16 - 0.3, side * 16 + 0.3, 0, 11, 8, 20, col=(246, 246, 249), shadow=False, mull=3.0,
              band_col=(232, 233, 238))
        for r in range(7):
            for c in range(5):
                _chair(s, side * (3.6 + c * 1.2), 1.0 + r * 2.4, face=1)
    # --- zone C: circuit board wall ------------------------------------------------------
    s.box(-62, -28, 0, 16, 22, 22.6, col=(245, 245, 248), shadow=False)
    s._box(-52, -38, 2, 14, 21.6, 22, col=(236, 237, 242))                   # board
    s._box(-48.5, -41.5, 4.5, 11.5, 21.2, 21.6, col=(226, 228, 234))         # chip
    s._box(-47.5, -42.5, 5.5, 10.5, 21.0, 21.2, col=(242, 243, 247))
    for i in range(9):
        y = 5.0 + i * 0.75
        for x0, x1 in ((-50.6, -48.5), (-41.5, -39.4)):
            s._box(x0, x1, y - 0.08, y + 0.08, 21.5, 21.6, col=(214, 216, 223))
        xx = -48.0 + i * 0.75
        for y0, y1 in ((2.4, 4.5), (11.5, 13.6)):
            s._box(xx - 0.08, xx + 0.08, y0, y1, 21.5, 21.6, col=(214, 216, 223))
    rng = np.random.default_rng(4)
    for k in range(26):                                                      # small components
        x = rng.uniform(-51.5, -38.5)
        y = rng.uniform(2.5, 13.5)
        if -49 < x < -41 and 4 < y < 12:
            continue
        s._box(x - 0.35, x + 0.35, y - 0.25, y + 0.25, 21.4, 21.6, col=(230, 231, 236))
    for k in range(5):                                                       # server racks
        x = -56 + k * 2.2 if k < 2 else -30.5 - (k - 2) * 2.2
        s.box(x - 0.9, x + 0.9, 0, 4.2, 14, 16, col=(244, 244, 247), bands=0.6, band_col=(225, 227, 233))
    # --- zone B: boardroom ---------------------------------------------------------------
    s.box(30, 60, 0, 10, 24, 24.6, col=(247, 247, 250), shadow=False)
    s._box(39, 51, 1.8, 7.2, 23.8, 24.0, col=(34, 36, 42))
    s.quad([[39.3, 6.9, 23.78], [50.7, 6.9, 23.78], [50.7, 2.1, 23.78], [39.3, 2.1, 23.78]], (236, 238, 243), bias=-0.3)
    s.box(42.5, 47.5, 0.72, 0.8, 8, 20, col=(252, 252, 253), shadow=False)
    s.ground_shadow(42.5, 47.5, 8, 20, 1.0)
    for x in (43.0, 47.0):
        s._box(x - 0.1, x + 0.1, 0, 0.72, 9, 19, col=(226, 228, 233))
    for z in np.arange(9, 20, 1.8):
        _chair(s, 41.6, z, face=1)
        _chair(s, 48.4, z, face=1)
    for x in (33, 36, 54, 57):                                               # glass partitions
        s._box(x - 0.05, x + 0.05, 0, 8, 10, 20, col=(228, 236, 244))
    # --- zone D: street outside, behind the hall (z 40..120) --------------------------------
    s.flat(-60, 60, 74, 84, (92, 96, 106), bias=3700.0)                     # road
    for x in range(-56, 60, 8):
        s.flat(x, x + 4, 78.85, 79.15, (240, 240, 244), bias=3600.0)          # lane marks
    for i in range(7):
        s.flat(-3 + i * 0.9, -2.5 + i * 0.9, 73.2, 74.0, (240, 240, 244), bias=3600.0)
    rng2 = np.random.default_rng(9)
    x = -60
    while x < 60:                                                            # clean office blocks
        w = rng2.uniform(10, 16)
        h = rng2.uniform(14, 30)
        s.box(x, x + w - 1.5, 0, h, 90, 104, col=(246, 246, 249), bands=3.0, mull=2.0, band_col=(222, 224, 230))
        s.windows(x + 0.8, x + w - 2.3, 1.5, h - 1.0, 90, int(h // 3), max(2, int(w // 2.2)), col=(214, 222, 234),
                  frame=0.22)
        x += w
    for xx in range(-40, 44, 10):
        if abs(xx) < 8:
            continue
        s.tree(xx, 70.5, 5.8)
        s.lamp(xx + 5, 71.5, side=-1)
    return s


SETS = {"newsroom": newsroom_set, "brightstudio": brightstudio_set, "darkstudio": darkstudio_set, "vicecity": vicecity_set, "reichstag": reichstag_set, "ministry": ministry_set, "trading": trading_set, "hq": hq_set, "avenue": avenue_set, "boardroom": boardroom_set, "office": office_set, "studio": studio_set}


@lru_cache(maxsize=16)
def get_set(name, *args):
    return SETS[name](*args)
