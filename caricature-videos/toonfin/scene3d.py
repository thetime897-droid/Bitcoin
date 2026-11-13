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

    def box(self, x0, x1, y0, y1, z0, z1, col=WHITE, bands=0.0, mull=0.0, band_col=None, bias=0.0):
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
        self.quad([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], col or self.floor)

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
                n = _norm(np.cross(face["p"][1] - face["p"][0], face["p"][3] - face["p"][0]))
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


SETS = {"hq": hq_set, "avenue": avenue_set, "boardroom": boardroom_set, "office": office_set, "studio": studio_set}


@lru_cache(maxsize=16)
def get_set(name, *args):
    return SETS[name](*args)
