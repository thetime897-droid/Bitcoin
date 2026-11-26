"""Clean explainer graphics in the style of the user's reference shorts (light, Apple-like), information first:

  title2      black bold headline, *starred* words coloured with a highlighter sweep; words rise in one by one
              and lift out when the next headline comes                     {text, color, x, y, size}
  widget      rounded card, dark or light, header (logo dot + name + meta) and one content block:
              "line" (chart draws itself with a glowing head + filled area, pulsing end dot), "big" (counting
              number that snaps), "bars" (spring bars with counting values); optional pill that pops in
  photo       picture card (slow Ken-Burns zoom inside), label pill bottom-left, bouncing badge top-right
  cal         calendar card: old page flips over to the new date, then the day gets circled
  profile     follow card: tap ripple on "+ Folgen", flips to "Gefolgt ✓"
  sticker     3D emoji that flies in with a spin, then floats                {emoji, px, from: [dx, dy]}
  burst       confetti + sparkle burst at a point                           {colors}
  disclaimer  small grey pill (e.g. "Keine Anlageberatung")

Cards push in from the right with a spring and horizontal motion blur, breathe slowly, punch in on key words
(``punch: [card-local t]``) and push out to the left at ``until`` (the builder sets that automatically when the
next beat brings a new card). Pictures are rendered from our own 3D world / emoji (no third-party photos)."""
import math
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from .ink import font

TYPES = {"title2", "widget", "photo", "cal", "profile", "disclaimer", "sticker", "burst"}
HERE = Path(__file__).parent

INK = (17, 17, 19)
GREY = (142, 142, 147)
COL = {"red": (235, 64, 52), "green": (48, 176, 80), "purple": (88, 70, 190), "gold": (232, 160, 0),
       "blue": (10, 122, 255), "pink": (255, 45, 120), "violet": (128, 72, 220), "orange": (255, 140, 0),
       "mint": (0, 199, 190), "yellow": (255, 204, 0)}
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


def spring(u, k=7.0, damp=4.2):
    """Damped spring 0 -> 1 (overshoots and settles)."""
    if u <= 0:
        return 0.0
    if u >= 1:
        return 1.0
    return 1 - math.exp(-damp * u) * math.cos(k * u)


def de(v, dec=0):
    return f"{abs(v):,.{dec}f}".replace(",", "X").replace(".", ",").replace("X", ".")


def rr(w, h, r, fill, outline=None, width=2):
    im = Image.new("RGBA", (int(w), int(h)), (0, 0, 0, 0))
    ImageDraw.Draw(im).rounded_rectangle([0, 0, w - 1, h - 1], r, fill=fill, outline=outline, width=width if outline else 0)
    return im


def fade(im, a):
    if a >= 0.999:
        return im
    im = im.copy()
    im.putalpha(im.getchannel("A").point(lambda v: int(v * max(0.0, a))))
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


def smear(im, px):
    """Horizontal motion blur (premultiplied average of shifted copies)."""
    px = int(abs(px))
    if px < 2:
        return im
    a = np.asarray(im, np.float32)
    rgb, al = a[..., :3] * a[..., 3:4] / 255, a[..., 3:4]
    n = min(9, max(3, px // 6))
    pad = px
    acc_c = np.zeros((a.shape[0], a.shape[1] + 2 * pad, 3), np.float32)
    acc_a = np.zeros((a.shape[0], a.shape[1] + 2 * pad, 1), np.float32)
    for i in range(n):
        o = pad + int((i / (n - 1) - 0.5) * px)
        acc_c[:, o:o + a.shape[1]] += rgb
        acc_a[:, o:o + a.shape[1]] += al
    acc_c /= n
    acc_a /= n
    out = np.concatenate([acc_c * 255 / np.maximum(acc_a, 1e-3), acc_a], 2)
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA").crop((pad, 0, pad + a.shape[1], a.shape[0]))


def place(img, el, x, y, ct, c, pad=0):
    """Animated placement of a card: spring push-in from the right (motion blur), slow breathing, punch-ins on
    key words, push-out to the left at ``until``."""
    enter = c.get("enter", "push")
    u = seg(ct, 0, 0.5)
    s = spring(u, 6.5, 4.6)
    if enter == "pop":
        dx, sc, blur = 0.0, 0.86 + 0.14 * s, 0.0
    elif enter == "up":
        dx, sc, blur = 0.0, 0.94 + 0.06 * s, 0.0
        y += 140 * (1 - s)
    else:
        dx, sc = 340 * (1 - s), 0.93 + 0.07 * s
        blur = 60 * max(0.0, 1 - u * 2.2)
    a = smooth(seg(ct, 0, 0.16))
    sc *= 1 + 0.02 * smooth(seg(ct, 0.5, 4.5))                       # slow breathing push
    for p in c.get("punch", []):                                    # quick punch-in on a key word
        q = ct - p
        if 0 <= q < 0.6:
            sc *= 1 + 0.055 * (q / 0.07 if q < 0.07 else math.exp(-(q - 0.07) * 7))
    ex = c.get("_exit")
    if ex is not None and ct > ex:
        e = seg(ct, ex, ex + 0.3)
        dx -= 420 * smooth(e) ** 1.3
        sc *= 1 - 0.07 * e
        a *= 1 - smooth(e)
        blur = max(blur, 70 * e)
    if a <= 0.01:
        return
    e = el
    if abs(sc - 1) > 1e-3:
        e = el.resize((max(1, int(el.width * sc)), max(1, int(el.height * sc))), Image.BICUBIC)
    if blur > 2:
        e = smear(e, blur)
    e = fade(e, a)
    img.alpha_composite(e, (int(x + dx - e.width / 2), int(y - e.height / 2)))


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


def pop_scale(el, u, s=2.0, lo=0.5):
    k = lo + (1 - lo) * back(u, s)
    return el.resize((max(1, int(el.width * k)), max(1, int(el.height * k))), Image.BICUBIC)


def logo_dot(name, px, theme=None):
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


# -- headline ----------------------------------------------------------------------------------------------------

def draw_title(img, c, ct):
    size = c.get("size", 66)
    f = font("inter", size)
    words = []
    for i, part in enumerate(c["text"].split("*")):
        for w in part.split(" "):
            if w:
                words.append((w, i % 2 == 1))
    sp = f.getlength(" ")
    total = sum(f.getlength(w) for w, _ in words) + sp * (len(words) - 1)
    while total > c.get("maxw", 980) and size > 30:
        size -= 2
        f = font("inter", size)
        sp = f.getlength(" ")
        total = sum(f.getlength(w) for w, _ in words) + sp * (len(words) - 1)
    x0 = c.get("x", 540) - total / 2
    y = c.get("y", 200)
    col = _c(c.get("color", "green"))
    ex = c.get("_exit")
    lay = Image.new("RGBA", (img.width, int(size * 2.2)), (0, 0, 0, 0))
    oy = size * 1.1
    d = ImageDraw.Draw(lay)
    # highlighter sweep behind the keyword(s)
    x = x0
    spans = []
    for w, kw in words:
        wl = f.getlength(w)
        if kw:
            spans.append((x, x + wl))
        x += wl + sp
    if spans:
        hx0, hx1 = spans[0][0], spans[-1][1]
        k = smooth(seg(ct, 0.28, 0.62))
        if k > 0:
            d.rounded_rectangle([hx0 - 12, oy - size * 0.18, hx0 - 12 + (hx1 - hx0 + 24) * k, oy + size * 0.52],
                                size * 0.16, fill=col + (46,))
    x = x0
    for i, (w, kw) in enumerate(words):
        wl = f.getlength(w)
        wu = seg(ct, 0.045 * i, 0.045 * i + 0.34)
        a = smooth(min(1.0, wu * 2))
        dy = 34 * (1 - spring(wu, 7, 5))
        if ex is not None and ct > ex:
            e = seg(ct, ex + 0.03 * i, ex + 0.03 * i + 0.24)
            a *= 1 - smooth(e)
            dy -= 40 * smooth(e)
        if a > 0.01:
            wl_im = Image.new("RGBA", (int(wl) + 8, int(size * 1.6)), (0, 0, 0, 0))
            ImageDraw.Draw(wl_im).text((2, size * 0.8), w, font=f, fill=(col if kw else INK) + (255,), anchor="lm")
            lay.alpha_composite(fade(wl_im, a), (int(x), int(oy - size * 0.8 + dy)))
        x += wl + sp
    img.alpha_composite(lay, (0, int(y - oy)))


# -- cards --------------------------------------------------------------------------------------------------------

def _header(card, c, dark, S, pad=30):
    d = ImageDraw.Draw(card)
    fg = (255, 255, 255) if dark else INK
    x = pad * S
    if c.get("logo"):
        dot = logo_dot(c["logo"], int(40 * S))
        card.alpha_composite(dot, (int(pad * S), int(pad * S - 4)))
        x += 54 * S
    d.text((x, pad * S + 16 * S), c.get("name", ""), font=font("inter", 30 * S), fill=fg, anchor="lm")
    if c.get("meta"):
        d.text((card.width - pad * S, pad * S + 16 * S), c["meta"], font=font("inters", 23 * S), fill=GREY, anchor="rm")


def widget(c, ct):
    dark = c.get("theme", "dark") == "dark"
    w, h = c.get("w", 560), c.get("h", 330)
    S = w / 560
    card = rr(w, h, int(34 * S), (CARD_DARK if dark else CARD_LIGHT) + (255,), None if dark else (232, 232, 236, 255))
    _header(card, c, dark, S)
    d = ImageDraw.Draw(card)
    kind = c.get("kind", "line")
    fg = (255, 255, 255) if dark else INK
    ppad = 70 * S if c.get("pill") else 0
    if kind == "line":
        pts = c["points"]
        x0, x1, y0, y1 = 40 * S, w - 50 * S, 110 * S, h - 74 * S - ppad
        lo, hi = min(pts), max(pts)
        xy = [(x0 + (x1 - x0) * i / (len(pts) - 1), y1 - (y1 - y0) * (v - lo) / max(hi - lo, 1e-9)) for i, v in enumerate(pts)]
        k = smooth(seg(ct, c.get("draw_at", 0.25), c.get("draw_end", 1.3)))
        col = _c(c.get("color", "green"))
        if k > 0:
            n = 1 + (len(xy) - 1) * k
            i = min(int(n), len(xy) - 1)
            fr = n - int(n)
            path = xy[:i] + ([(xy[i - 1][0] + (xy[i][0] - xy[i - 1][0]) * fr, xy[i - 1][1] + (xy[i][1] - xy[i - 1][1]) * fr)]
                             if int(n) < len(xy) else [xy[-1]])
            g = c.get("grey_until", 0)
            # filled area under the coloured part (fades down)
            area = Image.new("RGBA", card.size, (0, 0, 0, 0))
            if len(path) > g + 1:
                poly = path[g:] + [(path[-1][0], y1 + 4), (path[g][0], y1 + 4)]
                ImageDraw.Draw(area).polygon(poly, fill=col + (70,))
                grad = np.linspace(1, 0, card.height)[:, None] ** 0.8
                A = np.asarray(area.getchannel("A"), float) * grad
                area.putalpha(Image.fromarray(A.astype(np.uint8)))
                card.alpha_composite(area)
            # glow under the line
            glow = Image.new("RGBA", card.size, (0, 0, 0, 0))
            gd = ImageDraw.Draw(glow)
            if len(path) > g + 1:
                gd.line(path[g:], fill=col + (150,), width=int(18 * S), joint="curve")
                card.alpha_composite(glow.filter(ImageFilter.GaussianBlur(9 * S)))
            d = ImageDraw.Draw(card)
            if g:
                d.line(path[:g + 1], fill=(110, 110, 116) if dark else (190, 190, 196), width=int(6 * S), joint="curve")
            if len(path) > g:
                d.line(path[max(0, g):], fill=col, width=int(7 * S), joint="curve")
            ex_, ey_ = path[-1]
            if k >= 1:                                        # pulsing rings on the last price
                for ph in (0.0, 0.5):
                    q = ((ct - c.get("draw_end", 1.3)) * 1.1 + ph) % 1
                    r = (12 + 34 * q) * S
                    rl = Image.new("RGBA", card.size, (0, 0, 0, 0))
                    ImageDraw.Draw(rl).ellipse([ex_ - r, ey_ - r, ex_ + r, ey_ + r], outline=col + (int(200 * (1 - q)),),
                                               width=int(4 * S))
                    card.alpha_composite(rl)
            r = 11 * S
            d.ellipse([ex_ - r, ey_ - r, ex_ + r, ey_ + r], fill=(255, 255, 255) if dark else col)
            d.ellipse([ex_ - r * 0.55, ey_ - r * 0.55, ex_ + r * 0.55, ey_ + r * 0.55], fill=col)
        xl = c.get("xlabels")
        if xl:
            d.text((x0, y1 + 34 * S), xl[0], font=font("inters", 21 * S), fill=GREY, anchor="lm")
            d.text((x1, y1 + 34 * S), xl[1], font=font("inters", 21 * S), fill=GREY, anchor="rm")
    elif kind == "big":
        kc = smooth(seg(ct, c.get("count_at", 0.25), c.get("count_end", 1.0)))
        if "to" in c:
            v = c.get("from", 0) + (c["to"] - c.get("from", 0)) * kc
            txt = c.get("fmt", "{}").replace("{}", de(v, c.get("dec", 0)))
        else:
            txt = c["text"]
        snap = 1 + 0.08 * math.exp(-max(0.0, ct - c.get("count_end", 1.0)) * 9) * (ct >= c.get("count_end", 1.0))
        f = font("interx", c.get("size", 96) * S * snap)
        d.text((w / 2, (h - ppad) / 2 + 30 * S), txt, font=f, fill=_c(c["num_col"]) if c.get("num_col") else fg, anchor="mm")
    elif kind == "bars":
        bars = c["bars"]                                     # [label, value text, num, colour]
        vmax = max(b[2] for b in bars)
        base = h - 64 * S - ppad
        top = 125 * S
        bw = min(150 * S, (w - 140 * S) / len(bars) - 50 * S)
        for j, (lab, val, num, col) in enumerate(bars):
            cx = w / 2 + (j - (len(bars) - 1) / 2) * (bw + 110 * S)
            u = seg(ct, 0.3 + j * 0.4, 1.1 + j * 0.4)
            kb = spring(u, 8, 5)
            hh = (base - top) * num / vmax * max(0.0, kb)
            colr = _c(col)
            last = j == len(bars) - 1
            if hh > 2:
                d.rounded_rectangle([cx - bw / 2, base - hh, cx + bw / 2, base], int(14 * S), fill=colr)
            d.text((cx, base + 32 * S), lab, font=font("inters", 23 * S), fill=colr if last else GREY, anchor="mm")
            if u > 0:                                        # value counts up with the bar
                m = c.get("bar_fmt")
                vt = val if (u >= 1 or not m) else m.replace("{}", de(num * min(1.0, kb), 2))
                d.text((cx, base - hh - 28 * S), vt, font=font("inter", 27 * S), fill=colr if last else GREY, anchor="mm")
    out = card
    if c.get("pill"):
        p = c["pill"]
        u = seg(ct, p.get("at", 1.0), p.get("at", 1.0) + 0.35)
        if u > 0:
            pl = pop_scale(pill(p["text"], p.get("color", "green"), int(p.get("size", 30) * S), dark=dark), u, 2.4, 0.4)
            out.alpha_composite(pl, (int(w / 2 - pl.width / 2), int(h - 30 * S - pl.height / 2 - 26 * S)))
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
        cw = int(big.height * w / h)
        x0 = max(0, (big.width - cw) // 2)
        return big.crop((x0, 0, x0 + min(cw, big.width), big.height)).resize((w, h), Image.LANCZOS)
    _, name, sky = (key.split(":") + ["sky"])[:3]
    top, bot = {"sky": ((70, 140, 235), (190, 220, 255)), "warm": ((255, 196, 120), (255, 236, 200)),
                "red": ((235, 90, 80), (255, 200, 190)), "green": ((60, 170, 100), (200, 240, 210))}.get(sky)
    g = np.linspace(0, 1, h)[:, None, None]
    arr = np.array(top, float)[None, None] * (1 - g) + np.array(bot, float)[None, None] * g
    im = Image.fromarray(np.repeat(arr, w, 1).astype(np.uint8)).convert("RGBA")
    from .studio import emoji_img
    em = emoji_img(name, int(h * 0.8))
    im.alpha_composite(em, ((w - em.width) // 2, int(h * 0.13)))
    return im.convert("RGB")


def photo(c, ct):
    w, h = c.get("w", 520), c.get("h", 320)
    S = w / 560
    big = picture(c["img"], int(w * 1.14), int(h * 1.14))
    z = 1.0 + 0.12 * smooth(seg(ct, 0, 5.0))                       # Ken Burns: slow push into the picture
    cw, ch = big.width / z * 1.0, big.height / z * 1.0
    cx, cy = big.width / 2 + (c.get("kb_dx", 0.02) * big.width) * smooth(seg(ct, 0, 5.0)), big.height / 2
    pic = big.crop((int(cx - cw / 2 * 0.877), int(cy - ch / 2 * 0.877), int(cx + cw / 2 * 0.877), int(cy + ch / 2 * 0.877)))
    pic = pic.resize((w, h), Image.BICUBIC).convert("RGBA")
    m = rr(w, h, int(28 * S), (255, 255, 255, 255))
    pic.putalpha(m.getchannel("A"))
    card = rr(w + 12, h + 12, int(32 * S), (255, 255, 255, 255))
    card.alpha_composite(pic, (6, 6))
    if c.get("label"):
        f = font("inter", 24 * S)
        lw = int(f.getlength(c["label"]) + 30 * S)
        lab = rr(lw, int(42 * S), int(11 * S), (20, 20, 22, 215))
        ImageDraw.Draw(lab).text((lw / 2, 21 * S), c["label"], font=f, fill=(255, 255, 255), anchor="mm")
        lu = seg(ct, 0.25, 0.5)
        if lu > 0:
            card.alpha_composite(fade(lab, smooth(lu)), (int(22 * S - 30 * (1 - smooth(lu))), int(h - 52 * S)))
    if c.get("badge"):
        b = c["badge"]
        u = seg(ct, b.get("at", 0.6), b.get("at", 0.6) + 0.35)
        if u > 0:
            pl = pill(b["text"], b.get("color", "green"), int(30 * S), solid=True)
            pl = pop_scale(pl, u, 2.6, 0.3)
            if u >= 1:
                k = 1 + 0.03 * math.sin((ct - b.get("at", 0.6)) * 6)
                pl = pl.resize((int(pl.width * k), int(pl.height * k)), Image.BICUBIC)
            card.alpha_composite(pl, (int(w - 20 * S - pl.width), int(22 * S)))
    return card


def cal(c, ct):
    w, h = c.get("w", 320), c.get("h", 320)
    S = w / 320
    flip = c.get("flip_at", 0.35)
    u = seg(ct, flip, flip + 0.45)
    old = u < 0.5
    card = rr(w, h, int(50 * S), (255, 255, 255, 255), (232, 232, 236, 255))
    page = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(page)
    month = c.get("month_prev", "NOV.") if old else c.get("month", "DEZ.")
    day = c.get("day_prev", "30") if old else str(c.get("day", "1"))
    d.text((w / 2, 66 * S), month, font=font("interx", 42 * S), fill=COL["red"], anchor="mm")
    d.text((w / 2, h / 2 + 40 * S), day, font=font("interx", 160 * S), fill=INK, anchor="mm")
    sy = abs(math.cos(u * math.pi)) if 0 < u < 1 else 1.0            # page flips over
    if sy < 0.999:
        ph = max(1, int(h * sy))
        page = page.resize((w, ph), Image.BICUBIC)
        card.alpha_composite(page, (0, (h - ph) // 2 if old else 0))
    else:
        card.alpha_composite(page)
    ring = seg(ct, flip + 0.55, flip + 1.05)                        # the day gets circled in red
    if ring > 0:
        d2 = ImageDraw.Draw(card)
        r = 98 * S
        cx, cy = w / 2, h / 2 + 46 * S
        d2.arc([cx - r * 1.08, cy - r, cx + r * 1.08, cy + r * 0.95], -110, -110 + 360 * smooth(ring), fill=COL["red"],
               width=int(8 * S))
    return card


@lru_cache(maxsize=2)
def avatar(px):
    im = Image.open(HERE / "panda" / "mikrofon.png").convert("RGBA")
    im = im.crop(im.getbbox())
    s = im.width
    head = im.crop((0, 0, s, int(s * 0.72))).resize((px, int(px * 0.72)), Image.LANCZOS)
    out = Image.new("RGBA", (px, px), (232, 245, 236, 255))
    out.alpha_composite(head, (0, int(px * 0.16)))
    m = Image.new("L", (px, px), 0)
    ImageDraw.Draw(m).ellipse([0, 0, px - 1, px - 1], fill=255)
    out.putalpha(m)
    return out


def profile(c, ct):
    w = c.get("w", 520)
    S = w / 520
    h = int(160 * S)
    card = rr(w, h, int(28 * S), (255, 255, 255, 255), (30, 30, 34, 255), int(3 * S))
    d = ImageDraw.Draw(card)
    av = avatar(int(110 * S))
    card.alpha_composite(av, (int(26 * S), int(25 * S)))
    d.ellipse([24 * S, 23 * S, 138 * S, 137 * S], outline=(48, 176, 80), width=int(4 * S))
    d.text((160 * S, 56 * S), c.get("name", "Panda_investiert"), font=font("inter", 36 * S), fill=INK, anchor="lm")
    fa = c.get("flip_at", 1.4)
    flipped = ct >= fa
    pl = pill(c.get("done", "Gefolgt ✓"), (142, 142, 147), int(26 * S)) if flipped else \
        pill(c.get("cta", "+ Folgen"), "pink", int(26 * S), solid=True)
    k = 1.0
    if fa - 0.12 <= ct < fa:
        k = 0.88                                               # pressed
    elif flipped:
        k = 0.8 + 0.2 * back(seg(ct, fa, fa + 0.25), 2.2)
    pl = pl.resize((max(1, int(pl.width * k)), max(1, int(pl.height * k))), Image.BICUBIC)
    bx, by = int(160 * S), int(86 * S)
    card.alpha_composite(pl, (bx, by))
    q = seg(ct, fa - 0.12, fa + 0.45)                           # tap ripple
    if 0 < q < 1:
        rl = Image.new("RGBA", card.size, (0, 0, 0, 0))
        r = (14 + 70 * smooth(q)) * S
        cx, cy = bx + pl.width / 2, by + pl.height / 2
        ImageDraw.Draw(rl).ellipse([cx - r, cy - r, cx + r, cy + r], fill=COL["pink"] + (int(90 * (1 - q)),))
        card.alpha_composite(rl)
    return card


def disclaimer(c, ct):
    f = font("inters", 20)
    t = c.get("text", "Keine Anlageberatung")
    w = int(f.getlength(t) + 28)
    im = rr(w, 34, 10, (255, 255, 255, 230), (220, 220, 226, 255))
    ImageDraw.Draw(im).text((w / 2, 17), t, font=f, fill=(90, 90, 96), anchor="mm")
    return im


def draw_sticker(img, c, ct):
    from .studio import emoji_img
    px = c.get("px", 170)
    em = emoji_img(c["emoji"], px)
    u = seg(ct, 0, 0.55)
    s = spring(u, 7, 4.5)
    fx, fy = c.get("from", [260, -160])
    x = c.get("x", 540) + fx * (1 - s)
    y = c.get("y", 500) + fy * (1 - s) + math.sin(ct * 2.4 + px) * 7 * smooth(seg(ct, 0.5, 1.0))
    rot = c.get("spin", -200) * (1 - s) + math.sin(ct * 1.9) * 5 + c.get("tilt", 0)
    a = smooth(seg(ct, 0, 0.12))
    ex = c.get("_exit")
    sc = 0.4 + 0.6 * s
    if ex is not None and ct > ex:
        e = seg(ct, ex, ex + 0.25)
        a *= 1 - e
        sc *= 1 - 0.5 * e
    if a <= 0.01:
        return
    e = em.resize((max(1, int(em.width * sc)), max(1, int(em.height * sc))), Image.BICUBIC).rotate(rot, Image.BICUBIC, expand=True)
    sh = Image.new("RGBA", e.size, (20, 22, 30, 0))
    sh.putalpha(e.getchannel("A").point(lambda v: int(v * 0.25)))
    sh = sh.filter(ImageFilter.GaussianBlur(10))
    img.alpha_composite(fade(sh, a), (int(x - e.width / 2), int(y - e.height / 2 + 18)))
    img.alpha_composite(fade(e, a), (int(x - e.width / 2), int(y - e.height / 2)))


def draw_burst(img, c, ct):
    if ct < 0 or ct > 1.2:
        return
    rng = np.random.default_rng(c.get("seed", 7))
    cols = [_c(x) for x in c.get("colors", ["green", "gold", "blue", "pink"])]
    x0, y0 = c.get("x", 540), c.get("y", 500)
    lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    q = seg(ct, 0, 1.0)
    for i in range(10):                                            # sparkle rays
        a = i / 10 * 2 * math.pi
        r0, r1 = 40 + 120 * smooth(min(1, q * 2.5)), 60 + 170 * smooth(min(1, q * 2.5))
        al = int(230 * max(0.0, 1 - q * 2.2))
        if al > 0:
            d.line([(x0 + math.cos(a) * r0, y0 + math.sin(a) * r0), (x0 + math.cos(a) * r1, y0 + math.sin(a) * r1)],
                   fill=cols[i % len(cols)] + (al,), width=6)
    for i in range(c.get("n", 34)):                                 # confetti with gravity
        a = rng.uniform(0, 2 * math.pi)
        v = rng.uniform(260, 620)
        tt = ct
        px = x0 + math.cos(a) * v * tt
        py = y0 + math.sin(a) * v * tt + 900 * tt * tt
        al = int(255 * max(0.0, 1 - q))
        sz = rng.uniform(7, 13)
        ang = rng.uniform(0, 6) + tt * rng.uniform(4, 12)
        dx, dy = math.cos(ang) * sz, math.sin(ang) * sz * 0.5
        d.polygon([(px - dx, py - dy), (px + dy, py - dx), (px + dx, py + dy), (px - dy, py + dx)],
                  fill=cols[i % len(cols)] + (al,))
    img.alpha_composite(lay)


def draw(img, c, ct):
    """Draw one graphic of this style onto img (RGBA)."""
    ty = c["type"]
    if c.get("until") is not None:
        c = dict(c, _exit=c["until"] - c.get("at", 0))
    x, y = c.get("x", 540), c.get("y", 480)
    if ty == "title2":
        return draw_title(img, c, ct)
    if ty == "sticker":
        return draw_sticker(img, c, ct)
    if ty == "burst":
        return draw_burst(img, c, ct)
    if ty == "disclaimer":
        el = disclaimer(c, ct)
        img.alpha_composite(el, (int(x - el.width / 2), int(y - el.height / 2)))
        return
    el = {"widget": widget, "photo": photo, "cal": cal, "profile": profile}[ty](c, ct)
    el = shadowed(el, blur=c.get("sh_blur", 30), alpha=c.get("sh_alpha", 70), dy=20)
    place(img, el, x, y, ct, c)
