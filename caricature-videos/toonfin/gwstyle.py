"""Clean explainer graphics in the style of the user's reference shorts (light, Apple-like):

  title2      black bold headline, one or more *coloured* keywords        {text, x, y, size}
  widget      rounded card, dark or light, with a header (logo dot + name + meta) and one content block:
              kind "line" (chart draws itself, end dot, x labels), "big" (counting number), "bars" (growing bars);
              optional pill (▲/▼ value) that pops in                         {theme, kind, ...}
  photo       picture card with soft shadow, label pill bottom-left, optional badge top-right  {img, label, badge}
  cal         white calendar card: red month, big day, sub line          {month, day, sub}
  profile     follow card: round avatar, name, "+ Folgen" pill that flips to "Gefolgt"   {name, flip_at}
  disclaimer  small grey pill (e.g. "Keine Anlageberatung")

Everything animates with a quick pop (scale 0.9 -> 1 with slight overshoot) + fade, like the reference.
Pictures are rendered from our own 3D world / emoji (no third-party photos)."""
import math
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from .ink import font

TYPES = {"title2", "widget", "photo", "cal", "profile", "disclaimer"}
HERE = Path(__file__).parent

INK = (17, 17, 19)
GREY = (142, 142, 147)
COL = {"red": (235, 64, 52), "green": (48, 176, 80), "purple": (88, 70, 190), "gold": (232, 160, 0),
       "blue": (10, 122, 255), "pink": (255, 45, 120), "violet": (128, 72, 220), "orange": (255, 140, 0)}
CARD_DARK = (12, 12, 14)
CARD_LIGHT = (255, 255, 255)


def _c(x):
    return COL.get(x, x) if isinstance(x, str) else tuple(x)


def seg(t, a, b):
    return min(1.0, max(0.0, (t - a) / max(b - a, 1e-6)))


def smooth(u):
    return u * u * (3 - 2 * u)


def back(u, s=1.5):
    u -= 1
    return u * u * ((s + 1) * u + s) + 1


def de(v, dec=0):
    s = f"{abs(v):,.{dec}f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return s


def rr(w, h, r, fill, outline=None):
    im = Image.new("RGBA", (int(w), int(h)), (0, 0, 0, 0))
    ImageDraw.Draw(im).rounded_rectangle([0, 0, w - 1, h - 1], r, fill=fill, outline=outline, width=2 if outline else 0)
    return im


def shadowed(card, blur=26, alpha=70, dy=16, pad=60):
    """Card with a soft drop shadow underneath (returned with padding)."""
    W_, H_ = card.width + 2 * pad, card.height + 2 * pad
    out = Image.new("RGBA", (W_, H_), (0, 0, 0, 0))
    a = card.getchannel("A").point(lambda v: int(v * alpha / 255))
    sh = Image.new("RGBA", card.size, (20, 22, 30, 0))
    sh.putalpha(a)
    tmp = Image.new("RGBA", (W_, H_), (0, 0, 0, 0))
    tmp.alpha_composite(sh, (pad, pad + dy))
    out.alpha_composite(tmp.filter(ImageFilter.GaussianBlur(blur)))
    out.alpha_composite(card, (pad, pad))
    return out


def put(img, el, x, y, ct, pop_at=0.0, dur=0.32, rise=18):
    """Pop element centred at (x, y): scale 0.9 -> 1 with overshoot, fade in."""
    u = seg(ct, pop_at, pop_at + dur)
    if u <= 0:
        return
    k = 0.9 + 0.1 * back(u, 1.7)
    a = smooth(min(1.0, u * 1.6))
    e = el
    if abs(k - 1) > 1e-3:
        e = el.resize((max(1, int(el.width * k)), max(1, int(el.height * k))), Image.BICUBIC)
    if a < 1:
        e = e.copy()
        e.putalpha(e.getchannel("A").point(lambda v: int(v * a)))
    img.alpha_composite(e, (int(x - e.width / 2), int(y - e.height / 2 + rise * (1 - smooth(u)))))


def pill(text, col, size=30, dark=False, solid=False):
    """Rounded value pill: tinted background + coloured bold text (or solid colour with white text)."""
    f = font("inter", size)
    tw = f.getlength(text)
    w, h = int(tw + size * 1.2), int(size * 1.65)
    c = _c(col)
    if solid:
        bg, fg = c + (255,), (255, 255, 255)
    else:
        base = np.array(CARD_DARK if dark else CARD_LIGHT, float)
        bg = tuple(int(v) for v in base * 0.8 + np.array(c) * 0.2) + (255,)
        fg = c
    im = rr(w, h, h // 2, bg)
    ImageDraw.Draw(im).text((w / 2, h / 2 + 1), text, font=f, fill=fg, anchor="mm")
    return im


def logo_dot(name, px, theme):
    """Round brand dot (e.g. Nvidia green with the eye mark in white) like the reference widgets."""
    im = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    col = {"nvidia": (118, 185, 0)}.get(name, (10, 122, 255))
    d.ellipse([0, 0, px - 1, px - 1], fill=col + (255,))
    try:
        from .studio import logo_img
        lg = logo_img(name, int(px * 0.62), "#FFFFFF")
        im.alpha_composite(lg, ((px - lg.width) // 2, (px - lg.height) // 2))
    except Exception:
        pass
    return im


# ---------------------------------------------------------------------------------------------------------------

def title2(c, ct):
    """'Kein *Rauswurf*': black words, starred words coloured; quick fade + rise per element."""
    size = c.get("size", 64)
    f = font("inter", size)
    parts = []
    for i, p in enumerate(c["text"].split("*")):
        if p:
            parts.append((p, _c(c.get("color", "green")) if i % 2 else INK))
    total = sum(f.getlength(p) for p, _ in parts)
    while total > c.get("maxw", 980) and size > 30:
        size -= 2
        f = font("inter", size)
        total = sum(f.getlength(p) for p, _ in parts)
    im = Image.new("RGBA", (int(total) + 20, int(size * 1.5)), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    x = 10
    for p, col in parts:
        d.text((x, im.height / 2), p, font=f, fill=col, anchor="lm")
        x += f.getlength(p)
    return im


def _header(card, c, dark, pad=26):
    d = ImageDraw.Draw(card)
    fg = (255, 255, 255) if dark else INK
    x = pad
    if c.get("logo"):
        dot = logo_dot(c["logo"], 34, dark)
        card.alpha_composite(dot, (pad, pad - 4))
        x += 46
    d.text((x, pad + 13), c.get("name", ""), font=font("inter", 26), fill=fg, anchor="lm")
    if c.get("meta"):
        d.text((card.width - pad, pad + 13), c["meta"], font=font("inters", 20), fill=GREY, anchor="rm")


def widget(c, ct):
    dark = c.get("theme", "dark") == "dark"
    w, h = c.get("w", 560), c.get("h", 330)
    card = rr(w, h, 34, (CARD_DARK if dark else CARD_LIGHT) + (255,), None if dark else (232, 232, 236, 255))
    _header(card, c, dark)
    d = ImageDraw.Draw(card)
    kind = c.get("kind", "line")
    fg = (255, 255, 255) if dark else INK
    if kind == "line":
        pts = c["points"]
        x0, x1, y0, y1 = 34, w - 40, 96, h - (96 if c.get("pill") else 66)
        lo, hi = min(pts), max(pts)
        xy = [(x0 + (x1 - x0) * i / (len(pts) - 1), y1 - (y1 - y0) * (v - lo) / max(hi - lo, 1e-9)) for i, v in enumerate(pts)]
        k = smooth(seg(ct, c.get("draw_at", 0.25), c.get("draw_end", 1.3)))
        col = _c(c.get("color", "green"))
        if k > 0:
            n = 1 + (len(xy) - 1) * k
            i = int(n)
            seg_pts = xy[:i] + ([(xy[i - 1][0] + (xy[min(i, len(xy) - 1)][0] - xy[i - 1][0]) * (n - i),
                                  xy[i - 1][1] + (xy[min(i, len(xy) - 1)][1] - xy[i - 1][1]) * (n - i))]
                                if i < len(xy) else [])
            if c.get("grey_until") is not None:              # first part grey (history), then coloured move
                g = c["grey_until"]
                d.line(seg_pts[:g + 1], fill=(120, 120, 126) if dark else (190, 190, 196), width=5, joint="curve")
                if len(seg_pts) > g:
                    d.line(seg_pts[g:], fill=col, width=6, joint="curve")
            else:
                d.line(seg_pts, fill=col, width=6, joint="curve")
            ex, ey = seg_pts[-1]
            r = 9
            d.ellipse([ex - r, ey - r, ex + r, ey + r], fill=(255, 255, 255) if dark else col)
            d.ellipse([ex - 5, ey - 5, ex + 5, ey + 5], fill=col)
        xl = c.get("xlabels")
        if xl:
            d.text((x0, h - 40 - (30 if c.get("pill") else 0)), xl[0], font=font("inters", 18), fill=GREY, anchor="lm")
            d.text((x1, h - 40 - (30 if c.get("pill") else 0)), xl[1], font=font("inters", 18), fill=GREY, anchor="rm")
    elif kind == "big":
        kc = smooth(seg(ct, c.get("count_at", 0.25), c.get("count_end", 1.0)))
        if "to" in c:
            v = c.get("from", 0) + (c["to"] - c.get("from", 0)) * kc
            txt = c.get("fmt", "{}").replace("{}", de(v, c.get("dec", 0)))
        else:
            txt = c["text"]
        d.text((w / 2, h / 2 + 18), txt, font=font("interx", c.get("size", 92)), fill=_c(c["num_col"]) if c.get("num_col") else fg,
               anchor="mm")
        if c.get("sub"):
            d.text((w / 2, h - 46), c["sub"], font=font("inters", 22), fill=GREY, anchor="mm")
    elif kind == "bars":
        bars = c["bars"]                                     # [label, value text, num, colour]
        vmax = max(b[2] for b in bars)
        base = h - 64 - (52 if c.get("pill") else 0)
        top = 120
        bw = min(120, (w - 120) / len(bars) - 40)
        for j, (lab, val, num, col) in enumerate(bars):
            cx = w / 2 + (j - (len(bars) - 1) / 2) * (bw + 70)
            kb = back(seg(ct, 0.3 + j * 0.35, 0.85 + j * 0.35), 1.2)
            hh = (base - top) * num / vmax * max(0.0, kb)
            colr = _c(col)
            if hh > 2:
                d.rounded_rectangle([cx - bw / 2, base - hh, cx + bw / 2, base], 10, fill=colr)
            d.text((cx, base + 26), lab, font=font("inters", 20), fill=colr if j == len(bars) - 1 else GREY, anchor="mm")
            if kb > 0.6:
                d.text((cx, base - hh - 22), val, font=font("inter", 22), fill=colr if j == len(bars) - 1 else GREY,
                       anchor="mm")
    out = card
    if c.get("pill"):
        p = c["pill"]
        u = seg(ct, p.get("at", 1.0), p.get("at", 1.0) + 0.3)
        if u > 0:
            pl = pill(p["text"], p.get("color", "green"), p.get("size", 28), dark=dark)
            kk = 0.6 + 0.4 * back(u, 2.0)
            pl = pl.resize((max(1, int(pl.width * kk)), max(1, int(pl.height * kk))), Image.BICUBIC)
            px = int(w / 2 - pl.width / 2) if p.get("align", "center") == "center" else 34
            out.alpha_composite(pl, (px, int(h - 30 - pl.height)))
    return out


@lru_cache(maxsize=8)
def picture(key, w, h):
    """Card picture rendered from our own 3D world (or a 3D emoji on a soft gradient)."""
    from . import scene3d
    if key in ("gpu", "boardroom", "studio", "chipwall"):
        st = scene3d.get_set("brightstudio")
        if key == "gpu":
            st = st.with_extra(scene3d.gpu_faces((-45, 2.6, 12), 2.2, 0.3, 1.2, -28.0, False))
            cam = scene3d.Camera((-45, 7.4, 4.6), (-45, 2.9, 12.2), 40)
        elif key == "boardroom":
            cam = scene3d.Camera((45, 3.4, 4.0), (45, 1.6, 18), 50)
        elif key == "chipwall":
            cam = scene3d.Camera((-45, 6.0, 4.0), (-45, 7.5, 22), 52)
        else:
            cam = scene3d.Camera((0, 3.6, -6), (0, 3.0, 14), 46)
        big = st.render(cam, h * 2, h * 2, ss=1.0).convert("RGB")
        # centre crop to the card's aspect
        cw = int(big.height * w / h)
        x0 = max(0, (big.width - cw) // 2)
        return big.crop((x0, 0, x0 + min(cw, big.width), big.height)).resize((w, h), Image.LANCZOS)
    # emoji scene: e.g. "emoji:classical_building:sky"
    _, name, sky = (key.split(":") + ["sky"])[:3]
    top, bot = {"sky": ((70, 140, 235), (190, 220, 255)), "warm": ((255, 196, 120), (255, 236, 200)),
                "red": ((235, 90, 80), (255, 200, 190)), "green": ((60, 170, 100), (200, 240, 210))}.get(sky)
    g = np.linspace(0, 1, h)[:, None, None]
    arr = np.array(top, float)[None, None] * (1 - g) + np.array(bot, float)[None, None] * g
    im = Image.fromarray(np.repeat(arr, w, 1).astype(np.uint8)).convert("RGBA")
    from .studio import emoji_img
    em = emoji_img(name, int(h * 0.82))
    im.alpha_composite(em, ((w - em.width) // 2, int(h * 0.12)))
    return im.convert("RGB")


def photo(c, ct):
    w, h = c.get("w", 520), c.get("h", 320)
    pic = picture(c["img"], w, h).convert("RGBA")
    m = rr(w, h, 26, (255, 255, 255, 255))
    pic.putalpha(m.getchannel("A"))
    card = rr(w + 10, h + 10, 30, (255, 255, 255, 255))      # thin white frame like a printed photo
    card.alpha_composite(pic, (5, 5))
    if c.get("label"):
        f = font("inter", 20)
        lw = int(f.getlength(c["label"]) + 26)
        lab = rr(lw, 34, 9, (20, 20, 22, 215))
        ImageDraw.Draw(lab).text((lw / 2, 17), c["label"], font=f, fill=(255, 255, 255), anchor="mm")
        card.alpha_composite(lab, (18, h - 40))
    if c.get("badge"):
        b = c["badge"]
        u = seg(ct, b.get("at", 0.6), b.get("at", 0.6) + 0.3)
        if u > 0:
            pl = pill(b["text"], b.get("color", "green"), 26, solid=True)
            kk = 0.5 + 0.5 * back(u, 2.2)
            pl = pl.resize((max(1, int(pl.width * kk)), max(1, int(pl.height * kk))), Image.BICUBIC)
            card.alpha_composite(pl, (int(w - 16 - pl.width), 18))
    if c.get("dim_at") is not None and ct > c["dim_at"]:     # fades back like the reference when the topic moves on
        q = smooth(seg(ct, c["dim_at"], c["dim_at"] + 0.4)) * 0.55
        card.putalpha(card.getchannel("A").point(lambda v: int(v * (1 - q))))
    return card


def cal(c, ct):
    w, h = c.get("w", 300), c.get("h", 300)
    card = rr(w, h, 46, (255, 255, 255, 255), (232, 232, 236, 255))
    d = ImageDraw.Draw(card)
    d.text((w / 2, 62), c.get("month", "DEZ."), font=font("interx", 38), fill=COL["red"], anchor="mm")
    k = back(seg(ct, 0.25, 0.6), 2.0)
    if k > 0:
        f = font("interx", int(150 * max(0.3, k)))
        d.text((w / 2, h / 2 + 34), str(c.get("day", "1")), font=f, fill=INK, anchor="mm")
    return card


@lru_cache(maxsize=2)
def avatar(px):
    im = Image.open(HERE / "panda" / "mikrofon.png").convert("RGBA")
    bb = im.getbbox()
    im = im.crop(bb)
    s = im.width
    head = im.crop((0, 0, s, int(s * 0.72))).resize((px, int(px * 0.72)), Image.LANCZOS)
    out = Image.new("RGBA", (px, px), (232, 245, 236, 255))
    out.alpha_composite(head, (0, int(px * 0.16)))
    m = Image.new("L", (px, px), 0)
    ImageDraw.Draw(m).ellipse([0, 0, px - 1, px - 1], fill=255)
    out.putalpha(m)
    return out


def profile(c, ct):
    w, h = c.get("w", 520), 150
    card = rr(w, h, 26, (255, 255, 255, 255), (30, 30, 34, 255))
    d = ImageDraw.Draw(card)
    av = avatar(104)
    card.alpha_composite(av, (24, 23))
    d.ellipse([22, 21, 130, 129], outline=(48, 176, 80), width=4)
    d.text((152, 52), c.get("name", "Panda_investiert"), font=font("inter", 34), fill=INK, anchor="lm")
    flipped = ct >= c.get("flip_at", 1.4)
    if flipped:
        pl = pill(c.get("done", "Gefolgt"), (142, 142, 147), 24)
    else:
        pl = pill(c.get("cta", "+ Folgen"), "pink", 24, solid=True)
    u = seg(ct, c.get("flip_at", 1.4), c.get("flip_at", 1.4) + 0.25) if flipped else 1.0
    kk = 0.8 + 0.2 * back(u, 2.0)
    pl = pl.resize((max(1, int(pl.width * kk)), max(1, int(pl.height * kk))), Image.BICUBIC)
    card.alpha_composite(pl, (152, 78))
    return card


def disclaimer(c, ct):
    f = font("inters", 20)
    t = c.get("text", "Keine Anlageberatung")
    w = int(f.getlength(t) + 28)
    im = rr(w, 34, 10, (255, 255, 255, 230), (220, 220, 226, 255))
    ImageDraw.Draw(im).text((w / 2, 17), t, font=f, fill=(90, 90, 96), anchor="mm")
    return im


def draw(img, c, ct):
    """Draw one graphic of this style onto img (RGBA), centred at c[x], c[y]."""
    ty = c["type"]
    x, y = c.get("x", 540), c.get("y", 480)
    fade = 1.0
    if c.get("until") is not None and ct > c["until"] - c.get("at", 0):
        fade = 1 - smooth(seg(ct, c["until"] - c.get("at", 0), c["until"] - c.get("at", 0) + 0.25))
        if fade <= 0.01:
            return
    if ty == "title2":
        el = title2(c, ct)
        u = seg(ct, 0, 0.22)
        e = el.copy()
        e.putalpha(e.getchannel("A").point(lambda v: int(v * smooth(u) * fade)))
        img.alpha_composite(e, (int(x - e.width / 2), int(y - e.height / 2 + 12 * (1 - smooth(u)))))
        return
    el = {"widget": widget, "photo": photo, "cal": cal, "profile": profile, "disclaimer": disclaimer}[ty](c, ct)
    if ty != "disclaimer":
        el = shadowed(el, blur=c.get("sh_blur", 26), alpha=c.get("sh_alpha", 64))
    if fade < 1:
        el.putalpha(el.getchannel("A").point(lambda v: int(v * fade)))
    if ty == "disclaimer":
        img.alpha_composite(el, (int(x - el.width / 2), int(y - el.height / 2)))
        return
    put(img, el, x, y, ct, 0.0, c.get("pop", 0.32))
