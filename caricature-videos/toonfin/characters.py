"""Stick-figure caricatures with big heads, expressive faces and poses.

Angles are in degrees: 0 points straight down, +90 points right (+x),
180 points up. Arm angles are relative to the torso lean, leg angles are
absolute. Feet are planted on y=0 automatically.
"""
import math

from .ink import INK, WHITE, GREEN, RED, GOLD, SKY, GREY, mix

THIGH, SHIN, TORSO, UPPER, LOWER, HEAD = 60, 60, 100, 52, 52, 50
LIMB = 9


def _d(a):
    r = math.radians(a)
    return math.sin(r), math.cos(r)


def get_pose(name, t=0.0, seed=0.0):
    def w(f, a, ph=0.0):
        return math.sin(t * f * 6.283 + seed + ph) * a

    p = dict(la=(-16 + w(0.4, 3), -6), ra=(16 - w(0.4, 3), 6), ll=(-8, -3), rl=(8, 3),
             lean=w(0.3, 1.5), tilt=w(0.25, 3), bob=0.0)
    if name == "idle":
        pass
    elif name == "talk":
        p["ra"] = (45 + w(1.1, 18), 105 + w(1.6, 30))
        p["la"] = (-25 + w(0.9, 8, 1), -40 + w(1.3, 20, 2))
        p["tilt"] = w(0.7, 6)
    elif name == "wave":
        p["ra"] = (115, 158 + w(2.2, 26))
        p["tilt"] = 6
    elif name == "point":
        p["ra"] = (95 + w(0.8, 3), 88)
        p["tilt"] = 5
    elif name == "point_up":
        p["ra"] = (122, 168)
        p["tilt"] = -4
    elif name == "cheer":
        p["la"] = (-118 + w(2, 10), -152 + w(2, 18))
        p["ra"] = (118 - w(2, 10), 152 - w(2, 18))
        p["bob"] = -abs(math.sin(t * 6.283 * 1.6 + seed)) * 26
        p["ll"], p["rl"] = (-14, -6), (14, 6)
    elif name == "panic":
        p["la"] = (-135 + w(5, 14), 150 + w(6, 16))
        p["ra"] = (135 + w(5.3, 14, 1), -150 + w(6.2, 16, 1))
        p["ll"] = (-16 + w(7, 10), -10 + w(7, 10))
        p["rl"] = (16 + w(7, 10, 2), 10 + w(7, 10, 2))
        p["tilt"] = w(3, 7)
    elif name == "shock":
        p["la"], p["ra"] = (-62 + w(6, 4), -40), (62 - w(6, 4), 40)
        p["ll"], p["rl"] = (-16, -10), (16, 10)
        p["tilt"] = -6
    elif name == "shrug":
        p["la"], p["ra"] = (-55, -148), (55, 148)
        p["tilt"] = 12 + w(0.6, 4)
    elif name == "facepalm":
        p["ra"] = (120, -130)
        p["tilt"], p["lean"] = -8, 8
    elif name == "think":
        p["ra"] = (70, -140)
        p["la"] = (-20, 70)
        p["tilt"] = 10 + w(0.4, 4)
    elif name == "hold":
        p["la"], p["ra"] = (-40, 32), (40, -32)
    elif name == "present":
        p["ra"] = (75, 100)
        p["la"] = (-20 + w(0.5, 4), -10)
    elif name == "thumbs":
        p["ra"] = (60, 176)
        p["tilt"] = 8
    elif name == "sad":
        p["la"], p["ra"] = (-5, -2), (5, 2)
        p["lean"], p["tilt"] = 8, 18
    elif name in ("run", "walk"):
        f, amp, lean = (2.3, 38, 14) if name == "run" else (1.2, 22, 4)
        ph = t * 6.283 * f + seed
        s1, s2 = math.sin(ph), math.sin(ph + math.pi)
        p["ll"] = (amp * s1, amp * s1 - 25 - 35 * max(0.0, -math.cos(ph)))
        p["rl"] = (amp * s2, amp * s2 - 25 - 35 * max(0.0, math.cos(ph)))
        p["la"] = (-amp * 0.9 * s1, -amp * 0.9 * s1 + 70)
        p["ra"] = (-amp * 0.9 * s2, -amp * 0.9 * s2 + 70)
        p["lean"] = lean
        p["bob"] = -abs(math.sin(ph)) * (16 if name == "run" else 6)
    elif name == "dance":
        ph = t * 6.283 * 1.7 + seed
        s = math.sin(ph)
        p["la"] = (-115 + 35 * s, -160 + 45 * s)
        p["ra"] = (70 + 40 * s, 150 - 50 * s)
        p["ll"] = (-12 + 18 * max(0.0, s), -6)
        p["rl"] = (12 + 18 * max(0.0, -s), 6)
        p["lean"] = 10 * s
        p["tilt"] = -12 * s
        p["bob"] = -abs(math.sin(ph * 2)) * 16
    elif name == "push":
        p["la"], p["ra"] = (78 + w(3, 4), 92), (84 + w(3, 4, 1), 98)
        p["ll"], p["rl"] = (-34 + w(2, 4), -30), (18, 4)
        p["lean"] = 24 + w(2, 3)
    elif name == "sit":
        p["ll"], p["rl"] = (85, 5), (95, 15)
        p["la"], p["ra"] = (-118 + w(2, 12), -152), (118 - w(2, 12), 152)
    return p


def flipped(p):
    q = dict(p)
    q["la"], q["ra"] = tuple(-a for a in p["ra"]), tuple(-a for a in p["la"])
    q["ll"], q["rl"] = tuple(-a for a in p["rl"]), tuple(-a for a in p["ll"])
    q["lean"], q["tilt"] = -p["lean"], -p["tilt"]
    return q


FACES = {
    "happy": dict(eyes="dot", mouth="smile"),
    "grin": dict(eyes="happy", mouth="grin"),
    "shock": dict(eyes="wide", mouth="o", brows=-1),
    "sad": dict(eyes="dot", mouth="frown", brows=-1, tears=True),
    "angry": dict(eyes="dot", mouth="frown", brows=1),
    "smug": dict(eyes="lid", mouth="smirk", brows=0.5),
    "money": dict(eyes="dollar", mouth="grin"),
    "worried": dict(eyes="dot", mouth="wavy", brows=-1, sweat=True),
    "dead": dict(eyes="x", mouth="wavy"),
    "cool": dict(eyes="shades", mouth="smirk"),
    "idea": dict(eyes="wide", mouth="grin", brows=-0.6),
    "neutral": dict(eyes="dot", mouth="flat"),
}


def figure(ink, x, y, pose="idle", t=0.0, face="happy", s=1.0, flip=False, kind="hero",
           talk=None, look=0.0, accent=GREEN, seed=0.0, rot=0.0):
    """Draw a stick figure with feet at (x, y). Returns key points in parent coords."""
    p = pose if isinstance(pose, dict) else get_pose(pose, t, seed)
    if flip:
        p = flipped(p)
    f = dict(FACES[face]) if isinstance(face, str) else dict(face)
    if kind == "bro" and f.get("eyes") in ("dot", "lid"):
        f["eyes"] = "shades"

    def leg(a):
        (a1, a2) = a
        d1, d2 = _d(a1), _d(a2)
        return d1, d2, THIGH * d1[1] + SHIN * d2[1]

    lg, rg = leg(p["ll"]), leg(p["rl"])
    hip = (0.0, -max(lg[2], rg[2]) + p.get("bob", 0.0))
    lean = p["lean"]
    up = (math.sin(math.radians(lean)), -math.cos(math.radians(lean)))
    neck = (hip[0] + up[0] * TORSO, hip[1] + up[1] * TORSO)
    sh = (hip[0] + up[0] * (TORSO - 12), hip[1] + up[1] * (TORSO - 12))
    hd = _d(180 + lean + p["tilt"])
    head = (neck[0] + hd[0] * (HEAD + 2), neck[1] + hd[1] * (HEAD + 2))
    out = {}

    with ink.at(x, y, rot, s):
        # legs + shoes
        for g, side in ((lg, -1), (rg, 1)):
            d1, d2, _ = g
            knee = (hip[0] + d1[0] * THIGH, hip[1] + d1[1] * THIGH)
            foot = (knee[0] + d2[0] * SHIN, knee[1] + d2[1] * SHIN)
            ink.line([hip, knee, foot], INK, LIMB)
            fd = 1 if not flip else -1
            ink.ellipse(foot[0] + 9 * fd, foot[1] - 2, 13, 6, fill=INK, outline=None)
        # torso
        if kind == "banker":
            mid = ((hip[0] + neck[0]) / 2, (hip[1] + neck[1]) / 2 + 6)
            ink.line([hip, neck], INK, LIMB)
            ink.ellipse(mid[0], mid[1], 50, 58, fill=(64, 64, 76), outline=INK, w=7, rot=lean)
            ink.shape([(mid[0] - 12, mid[1] - 50), (mid[0] + 12, mid[1] - 50), (mid[0], mid[1] - 10)],
                      fill=WHITE, w=4)
            ink.shape([(mid[0] - 5, mid[1] - 46), (mid[0] + 5, mid[1] - 46), (mid[0] + 7, mid[1] - 14),
                       (mid[0], mid[1] - 6), (mid[0] - 7, mid[1] - 14)], fill=RED, w=3)
        else:
            ink.line([hip, neck], INK, LIMB)
            if kind == "hero":
                with ink.at(neck[0], neck[1], lean):
                    ink.shape([(-7, 6), (7, 6), (9, 46), (0, 58), (-9, 46)], fill=accent, w=4)
            if kind == "ceo":
                with ink.at(neck[0], neck[1], lean):
                    ink.shape([(-34, 4), (34, 4), (30, 96), (-30, 96)], fill=(40, 40, 46), w=6)
                    ink.shape([(-12, 4), (12, 4), (0, 34)], fill=(70, 70, 78), w=3)
                    ink.line([(-12, 4), (-20, 40), (-6, 60)], (110, 110, 120), 3)
                    ink.line([(12, 4), (20, 40), (6, 60)], (110, 110, 120), 3)
                    ink.line([(-6, 62), (-6, 92)], (150, 150, 160), 3, wob=0.3)
            if kind == "bro":
                with ink.at(neck[0], neck[1], lean):
                    ink.arc(0, 4, 24, 26, 20, 160, GOLD, 5, wob=0.5)
        # head
        ink.circle(head[0], head[1], HEAD, fill=WHITE, w=7)
        with ink.at(head[0], head[1], lean + p["tilt"]):
            _face(ink, f, t, seed, talk, look + (-4 if flip else 4) * (kind != "crowd"), kind)
            _accessory(ink, kind, accent, flip)
        # arms last, so hands can touch the face (facepalm, thinking) and never hide behind the head
        hands = {}
        for key, (a1, a2) in (("l", p["la"]), ("r", p["ra"])):
            d1, d2 = _d(a1 + lean), _d(a2 + lean)
            elbow = (sh[0] + d1[0] * UPPER, sh[1] + d1[1] * UPPER)
            hand = (elbow[0] + d2[0] * LOWER, elbow[1] + d2[1] * LOWER)
            if kind == "ceo":
                ink.line([sh, elbow, hand], INK, 22)
                ink.line([sh, elbow, hand], (62, 62, 70), 13, wob=0.6)
                ink.circle(hand[0], hand[1], 9, fill=WHITE, w=4)
            else:
                ink.line([sh, elbow, hand], INK, LIMB)
            hands[key] = hand
        if pose == "thumbs":
            hx, hy = hands["l" if flip else "r"]
            ink.line([(hx, hy), (hx, hy - 20)], INK, 8)

    def world(pt):
        c, sn = math.cos(math.radians(rot)), math.sin(math.radians(rot))
        return (x + (pt[0] * c - pt[1] * sn) * s, y + (pt[0] * sn + pt[1] * c) * s)

    out["hands"] = {k: world(v) for k, v in hands.items()}
    out["head"] = world(head)
    out["top"] = world((head[0], head[1] - HEAD))
    return out


def _face(ink, f, t, seed, talk, look, kind):
    eyes = f.get("eyes", "dot")
    blink = (t + seed * 1.37) % 3.7 < 0.12
    ex, ey = 17, -8
    lx = max(-6, min(6, look))
    if kind == "crowd":
        ink.dot(-ex + lx, ey, 5)
        ink.dot(ex + lx, ey, 5)
        ink.arc(0, 10, 13, 10, 20, 160, INK, 4)
        return
    b = f.get("brows")
    if b is not None:
        for sgn in (-1, 1):
            inner = (sgn * 7, -27 + b * 7)
            outer = (sgn * 28, -29 - b * 5)
            ink.line([outer, inner], INK, 5)
    if eyes in ("dot", "wide", "lid") and blink:
        for sgn in (-1, 1):
            ink.line([(sgn * ex - 7, ey), (sgn * ex + 7, ey)], INK, 4)
    elif eyes == "dot":
        for sgn in (-1, 1):
            ink.dot(sgn * ex + lx, ey, 5.5)
            ink.dot(sgn * ex + lx + 1.5, ey - 1.5, 1.6, WHITE)
    elif eyes == "wide":
        for sgn in (-1, 1):
            ink.circle(sgn * ex, ey - 2, 13, fill=WHITE, w=4)
            ink.dot(sgn * ex + lx * 0.8, ey - 1, 5.5)
    elif eyes == "lid":
        for sgn in (-1, 1):
            ink.dot(sgn * ex + lx, ey + 1, 5)
            ink.line([(sgn * ex - 9, ey - 3), (sgn * ex + 9, ey - 3)], INK, 4)
    elif eyes == "happy":
        for sgn in (-1, 1):
            ink.arc(sgn * ex, ey + 4, 9, 9, 200, 340, INK, 5)
    elif eyes == "x":
        for sgn in (-1, 1):
            cx = sgn * ex
            ink.line([(cx - 7, ey - 7), (cx + 7, ey + 7)], INK, 4)
            ink.line([(cx - 7, ey + 7), (cx + 7, ey - 7)], INK, 4)
    elif eyes == "dollar":
        k = 1 + 0.15 * math.sin(t * 14)
        for sgn in (-1, 1):
            ink.text(sgn * ex, ey - 2, "$", 30 * k, "comic", fill=GREEN, stroke=INK, sw=0.12)
    elif eyes == "shades":
        ink.rect(-34, ey - 11, -4, ey + 9, fill=INK, outline=INK, w=4, r=6)
        ink.rect(4, ey - 11, 34, ey + 9, fill=INK, outline=INK, w=4, r=6)
        ink.line([(-4, ey - 6), (4, ey - 6)], INK, 4)
        ink.line([(-28, ey - 6), (-20, ey - 6)], (120, 120, 140), 3, wob=0)

    mouth = f.get("mouth", "smile")
    my = 18
    if talk is not None and mouth not in ("o",):
        o = max(0.0, min(1.0, talk))
        if o < 0.12:
            if mouth in ("grin", "smile", "smirk"):
                ink.arc(0, my - 6, 15, 12, 25, 155, INK, 5)
            elif mouth == "frown":
                ink.arc(0, my + 10, 14, 9, 205, 335, INK, 5)
            else:
                ink.line([(-11, my), (11, my)], INK, 5)
        else:
            ink.ellipse(0, my + 2, 10 + 4 * o, 3 + 13 * o, fill=(120, 20, 34), w=4)
            if o > 0.4:
                ink.ellipse(0, my + 2 + 8 * o, 6, 3 * o, fill=(255, 120, 130), outline=None)
    elif mouth == "smile":
        ink.arc(0, my - 6, 16, 13, 20, 160, INK, 5)
    elif mouth == "grin":
        pts = [(16 * math.cos(math.radians(a)), my - 4 + 16 * math.sin(math.radians(a)))
               for a in range(0, 181, 15)]
        ink.shape(pts, fill=(120, 20, 34), w=5)
        ink.line([(-13, my - 2), (13, my - 2)], WHITE, 4, wob=0.3)
    elif mouth == "o":
        k = 1 + 0.12 * math.sin(t * 9)
        ink.ellipse(0, my + 4, 9 * k, 13 * k, fill=(120, 20, 34), w=5)
    elif mouth == "frown":
        ink.arc(0, my + 12, 15, 11, 205, 335, INK, 5)
    elif mouth == "flat":
        ink.line([(-11, my), (11, my)], INK, 5)
    elif mouth == "wavy":
        ink.line([(-16, my), (-8, my - 5), (0, my), (8, my - 5), (16, my)], INK, 4)
    elif mouth == "smirk":
        ink.line([(-12, my + 1), (4, my + 1), (14, my - 7)], INK, 5, smooth=True)

    if f.get("sweat"):
        k = (t * 1.3) % 1.0
        ink.shape([(40, -30 + 30 * k), (34, -14 + 30 * k), (46, -14 + 30 * k)], fill=SKY, w=3)
        ink.circle(40, -12 + 30 * k, 6, fill=SKY, w=3)
    if f.get("tears"):
        k = (t * 1.8) % 1.0
        for sgn in (-1, 1):
            ink.circle(sgn * (ex + 2), ey + 10 + 26 * k, 4 + 2 * k, fill=SKY, w=2)


def _accessory(ink, kind, accent, flip):
    fx = -1 if flip else 1
    if kind == "hero":
        for dx, a in ((-10, -20), (0, 0), (11, 22)):
            ink.line([(dx * fx, -HEAD + 2), (dx * fx + a * 0.5 * fx, -HEAD - 14)], INK, 5, smooth=True)
    elif kind == "banker":
        ink.rect(-30, -HEAD - 58, 30, -HEAD + 4, fill=INK, outline=INK, w=5)
        ink.rect(-30, -HEAD - 16, 30, -HEAD - 4, fill=RED, outline=None)
        ink.ellipse(0, -HEAD + 6, 52, 9, fill=INK, outline=INK, w=4)
        ink.circle(17 * fx, -8, 15, fill=None, outline=INK, w=4)
        ink.line([(30 * fx, -4), (40 * fx, 20), (34 * fx, 40)], GOLD, 3, smooth=True)
        ink.line([(-24, 8), (-12, 4), (0, 9), (12, 4), (24, 8)], INK, 7, smooth=True)
    elif kind == "ceo":
        ink.shape([(-52, -4), (-50, -30), (-34, -52), (-6, -62), (24, -60), (46, -46), (60, -34),
                   (40, -36), (20, -40), (-10, -36), (-36, -24), (-44, -4)], fill=(206, 206, 212), w=5, smooth=True)
        for cx in (-17, 17):
            ink.rect(cx - 14, -18, cx + 14, 2, fill=None, outline=INK, w=4, r=3)
        ink.line([(-3, -10), (3, -10)], INK, 4)
    elif kind == "bro":
        ink.arc(0, -16, HEAD - 2, HEAD - 6, 185, 355, GOLD, 22, wob=0.6)
        ink.ellipse(-44 * fx, -24, 20, 8, fill=GOLD, w=4)
