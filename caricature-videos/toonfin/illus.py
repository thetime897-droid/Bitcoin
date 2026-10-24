"""Big, frame-filling finance illustrations for the Panda news style.

Clean comic look: thick dark outlines, flat colours, very little wobble. Each function draws
around its own origin (roughly 640 x 720 units) and animates from its local time ``t``.
Called through the ``illus`` element: {"type": "illus", "kind": "trophy", "at": .., "x": .., "y": .., ...}.
"""
import math

from .anim import clamp, lerp, seg, ease_out_back
from .ink import WHITE, mix

DARK = (20, 22, 28)
GREEN = (46, 178, 84)
MONEY = (120, 196, 110)
MONEY_DK = (60, 140, 70)
RED = (226, 58, 64)
GOLD = (255, 196, 0)
GOLD_DK = (214, 150, 0)
BLUE = (52, 120, 246)
SKY = (196, 222, 255)
GREY = (176, 180, 188)
STONE = (196, 198, 204)
STONE_DK = (150, 152, 160)
BROWN = (150, 102, 60)
BOX = (222, 178, 118)
ORANGE = (255, 140, 40)
LW = 8


def smooth(k):
    return 1 - (1 - clamp(k)) ** 5


def T(ink, x, y, text, size, fill=DARK, key="mont", rot=0.0):
    ink.text(x, y, text, size, key, fill=fill, stroke=None, rot=rot)


def bill(ink, x, y, s=1.0, rot=0.0):
    with ink.at(x, y, rot, s):
        ink.rect(-70, -34, 70, 34, fill=MONEY, outline=DARK, w=5, wob=0.2, r=4)
        ink.rect(-58, -24, 58, 24, fill=None, outline=MONEY_DK, w=3, wob=0, r=3)
        ink.circle(0, 0, 15, fill=mix(MONEY, WHITE, 0.4), outline=MONEY_DK, w=3, wob=0)
        T(ink, 0, 1, "€", 20, MONEY_DK)


def sparkle(ink, x, y, r, col=GOLD):
    ink.shape([(x, y - r), (x + r * 0.25, y - r * 0.25), (x + r, y), (x + r * 0.25, y + r * 0.25),
               (x, y + r), (x - r * 0.25, y + r * 0.25), (x - r, y), (x - r * 0.25, y - r * 0.25)],
              fill=col, outline=None, wob=0)


# -- illustrations -------------------------------------------------------------------

def trophy(ink, t, e):
    """Pile of money with a golden trophy on top; the value on the trophy counts up."""
    grow = smooth(seg(t, 0.0, 0.7))
    with ink.at(0, 300, 0, 1.0, max(0.05, grow)):
        ink.shape([(-330, 0), (-290, -90), (-200, -170), (-80, -215), (60, -220), (190, -175), (280, -100), (330, 0)],
                  fill=MONEY, outline=DARK, w=LW, wob=0.3, smooth=True)
        for i in range(26):
            a = (i * 137.5) % 360
            r = 40 + (i * 53) % 260
            bx = math.cos(math.radians(a)) * r
            by = -abs(math.sin(math.radians(a))) * r * 0.62 - 20
            if by > -200 + abs(bx) * 0.35:
                bill(ink, bx, by, 0.62, (i * 47) % 70 - 35)
    drop = ease_out_back(seg(t, 0.35, 0.9), 1.4)
    if drop > 0:
        y0 = lerp(-700, 0, drop)
        with ink.at(0, y0 - 40):
            ink.arc(-150, -120, 64, 76, 100, 260, DARK, 22, wob=0.2)
            ink.arc(-150, -120, 64, 76, 100, 260, GOLD, 12, wob=0.2)
            ink.arc(150, -120, 64, 76, -80, 80, DARK, 22, wob=0.2)
            ink.arc(150, -120, 64, 76, -80, 80, GOLD, 12, wob=0.2)
            ink.shape([(-150, -230), (150, -230), (125, -40), (55, 25), (-55, 25), (-125, -40)],
                      fill=GOLD, outline=DARK, w=LW, wob=0.2, smooth=True)
            ink.shape([(-110, -215), (-80, -215), (-95, -60)], fill=mix(GOLD, WHITE, 0.55), outline=None, wob=0)
            ink.rect(-34, 25, 34, 95, fill=GOLD_DK, outline=DARK, w=LW, wob=0.2)
            ink.rect(-105, 95, 105, 150, fill=BROWN, outline=DARK, w=LW, wob=0.2, r=8)
            T(ink, 0, -175, e.get("label", "REKORD"), 38, DARK)
            k = smooth(seg(t, e.get("count_at", 0.9), e.get("count_end", 2.0)))
            from .scenes import count_fmt
            vt = count_fmt(e.get("value", ""), k)
            full = e.get("value", "")
            fs = min(58, 58 * 225 / max(1, ink.text_w(full, 58, "mont")))
            T(ink, 0, -105, vt, fs, DARK)
            if t > e.get("count_end", 2.0):
                for i in range(5):
                    kk = smooth(seg(t, e["count_end"] + i * 0.08, e["count_end"] + i * 0.08 + 0.4))
                    a = math.radians(-160 + i * 35)
                    sparkle(ink, math.cos(a) * 230 * kk, -120 + math.sin(a) * 200 * kk, 22 * kk)


def tombstone(ink, t, e):
    """'R.I.P.' stone that cracks and bursts open - what was declared dead flies out."""
    crack, burst = e.get("crack_at", 0.7), e.get("burst_at", 1.5)
    ink.ellipse(0, 300, 300, 50, fill=(126, 170, 96), outline=DARK, w=LW, wob=0.3)
    split = smooth(seg(t, burst, burst + 0.5))
    for side in (-1, 1):
        with ink.at(side * 120 * split, 0, side * 14 * split):
            pts_l = [(-200, 290), (-200, -150), (-150, -260), (-60, -300), (0, -305), (-30, -200), (10, -90),
                     (-25, 40), (5, 160), (-15, 290)]
            pts = pts_l if side < 0 else [(-x, y) for x, y in pts_l]
            if split <= 0:
                continue
            ink.shape(pts, fill=STONE, outline=DARK, w=LW, wob=0.2)
    if split <= 0:
        ink.shape([(-200, 290), (-200, -150), (-150, -260), (-60, -300), (60, -300), (150, -260), (200, -150),
                   (200, 290)], fill=STONE, outline=DARK, w=LW, wob=0.2)
        ink.rect(-150, -150, 150, 260, fill=None, outline=STONE_DK, w=4, wob=0.2, r=10)
        T(ink, 0, -170, "R.I.P.", 70, STONE_DK)
        T(ink, 0, -60, e.get("label", "SAP?"), 76, (110, 112, 120))
        T(ink, 0, 40, e.get("years", "1972 – ?"), 34, STONE_DK)
        c = seg(t, crack, crack + 0.5)
        if c > 0:
            pts = [(-30, -300), (-10, -200), (-45, -90), (5, 30), (-20, 150), (10, 290)]
            n = 1 + int((len(pts) - 1) * c)
            ink.line(pts[:n + 1], DARK, 7, wob=0.2)
    for fx, col in ((-235, (255, 120, 150)), (-260, GOLD), (235, (255, 120, 150))):
        ink.line([(fx, 290), (fx + 6, 220)], (60, 140, 70), 5, wob=0.2)
        for k in range(5):
            a = math.radians(k * 72)
            ink.circle(fx + 6 + math.cos(a) * 12, 214 + math.sin(a) * 12, 9, fill=col, outline=DARK, w=2, wob=0)
    if t >= burst:
        k = ease_out_back(seg(t, burst, burst + 0.6), 1.5)
        with ink.at(0, lerp(120, -150, smooth(seg(t, burst, burst + 0.6))), -6, max(0.05, k)):
            ink.rect(-170, -110, 170, 90, fill=(40, 44, 54), outline=DARK, w=LW, wob=0.2, r=14)
            ink.rect(-150, -92, 150, 72, fill=SKY, outline=None, wob=0)
            pts = [(-120, 40), (-60, 10), (-10, 25), (50, -30), (120, -70)]
            ink.line(pts, GREEN, 10, wob=0)
            T(ink, 0, -55, e.get("pop", "SOFTWARE"), 38, BLUE)
            ink.shape([(-210, 90), (210, 90), (240, 128), (-240, 128)], fill=GREY, outline=DARK, w=LW, wob=0.2)
        for i in range(8):
            a = math.radians(i * 45 + 20)
            kk = smooth(seg(t, burst, burst + 0.6))
            r = 180 + 160 * kk
            if kk < 1:
                ink.line([(math.cos(a) * r * 0.6, -150 + math.sin(a) * r * 0.6),
                          (math.cos(a) * r, -150 + math.sin(a) * r)], GOLD, 10 * (1 - kk) + 1, wob=0)


def cloud(ink, t, e):
    """Cloud with a label raining money into a bucket that fills up."""
    for i in range(14):
        sp = 420 + (i * 53) % 180
        y = -120 + ((t * sp + i * 97) % 520)
        x = -170 + (i * 29) % 340 + math.sin(t * 3 + i) * 14
        if y < 330:
            bill(ink, x, y, 0.5, math.sin(t * 2 + i) * 40 + i * 30)
    blobs = [(-180, -170, 95), (-70, -235, 125), (75, -225, 115), (185, -160, 90), (0, -150, 120)]
    for bx, by, r in blobs:
        ink.circle(bx, by, r, fill=DARK, outline=DARK, w=LW * 2, wob=0.2)
    for bx, by, r in blobs:
        ink.circle(bx, by, r - LW * 0.5, fill=WHITE, outline=None, wob=0.2)
    T(ink, 0, -175, e.get("label", "CLOUD"), 74, BLUE)
    fill = clamp(t / e.get("fill_time", 3.5))
    with ink.at(0, 300):
        ink.shape([(-150, -110), (150, -110), (120, 60), (-120, 60)], fill=GREY, outline=DARK, w=LW, wob=0.2)
        if fill > 0:
            h = 160 * fill
            ink.shape([(-145, 55 - h), (145, 55 - h), (122, 56), (-122, 56)], fill=MONEY, outline=None, wob=0)
            for i in range(int(6 * fill) + 1):
                bill(ink, -90 + i * 36, 40 - h, 0.4, i * 25)
        ink.arc(0, -110, 150, 130, 190, 350, DARK, 7, wob=0.2)
        if e.get("value"):
            w = ink.text_w(e["value"], 44, "mont") + 60
            ink.rect(-w / 2, 80, w / 2, 150, fill=WHITE, outline=DARK, w=6, wob=0, r=14)
            T(ink, 0, 116, e["value"], 44, DARK)


def stack(ink, t, e):
    """Stack of signed contracts growing one by one, value tag on top."""
    n = e.get("n", 6)
    shown = clamp(t / e.get("build", 2.4)) * n
    for i in range(int(shown) + 1):
        if i >= n:
            break
        k = smooth(clamp(shown - i))
        sway = math.sin(t * 2.2 + i * 0.5) * i * 1.2
        y = 330 - i * 70 - 200 * (1 - k)
        with ink.at(sway, y, sway * 0.3 + (i % 2) * 2 - 1):
            ink.rect(-180, -66, 180, 0, fill=BOX if i % 3 else mix(BOX, WHITE, 0.25), outline=DARK, w=6, wob=0.2)
            ink.line([(-180, -33), (180, -33)], BROWN, 4, wob=0)
            ink.rect(-60, -50, 60, -16, fill=WHITE, outline=BROWN, w=3, wob=0, r=4)
            T(ink, 0, -33, e.get("box", "AUFTRAG"), 20, BROWN)
    if t > e.get("build", 2.4):
        k = ease_out_back(seg(t, e["build"], e["build"] + 0.45), 1.6)
        top = 330 - n * 70 - 75
        with ink.at(0, top, -3, max(0.05, k)):
            w = ink.text_w(e.get("value", ""), 54, "mont") + 70
            ink.rect(-w / 2, -48, w / 2, 48, fill=GOLD, outline=DARK, w=LW, wob=0.2, r=16)
            T(ink, 0, 2, e.get("value", ""), 54, DARK)


def hook(ink, t, e):
    """A big fishing hook drops in from the top and hangs over the scene, swinging slightly."""
    k = ease_out_back(seg(t, 0.0, 0.8), 1.2)
    sw = math.sin(t * 1.8) * 4
    with ink.at(0, lerp(-700, 0, k), sw):
        ink.line([(0, -900), (0, -120)], DARK, 5, wob=0.1)
        ink.rect(-24, -140, 24, -100, fill=GREY, outline=DARK, w=5, wob=0)
        ink.line([(0, -100), (0, 120)], (150, 154, 162), 22, wob=0)
        ink.line([(0, -100), (0, 120)], DARK, 4, wob=0)
        ink.arc(-70, 120, 70, 70, -10, 190, DARK, 30, wob=0.1)
        ink.arc(-70, 120, 70, 70, -10, 190, (170, 174, 182), 18, wob=0.1)
        ink.shape([(-140, 120), (-170, 70), (-125, 92)], fill=(170, 174, 182), outline=DARK, w=5, wob=0)
        with ink.at(-40, 290, -4):
            ink.rect(-110, -40, 110, 40, fill=WHITE, outline=DARK, w=6, wob=0.2, r=10)
            T(ink, 0, 2, e.get("label", "HAKEN"), 42, RED)


def calendar(ink, t, e):
    """Big calendar sheet; the quarter gets circled with a red marker."""
    with ink.at(0, 0, -2):
        ink.rect(-300, -300, 300, 300, fill=WHITE, outline=DARK, w=LW, wob=0.2, r=18)
        ink.rect(-300, -300, 300, -170, fill=RED, outline=DARK, w=LW, wob=0.2, r=18)
        T(ink, 0, -232, e.get("month", "OKT – DEZ"), 62, WHITE)
        for k in (-200, -70, 70, 200):
            ink.rect(k - 12, -330, k + 12, -270, fill=GREY, outline=DARK, w=5, wob=0, r=8)
        for r_ in range(4):
            for c_ in range(6):
                x = -250 + c_ * 100
                y = -120 + r_ * 100
                ink.rect(x - 38, y - 34, x + 38, y + 34, fill=(244, 245, 248), outline=None, wob=0, r=8)
        T(ink, 0, 80, e.get("big", "Q4"), 190, DARK)
        k = smooth(seg(t, e.get("circle_at", 0.5), e.get("circle_at", 0.5) + 0.6))
        if k > 0:
            ink.arc(0, 85, 175, 120, 20, 20 + 360 * k, RED, 14, wob=0.5, rot=-6)


def target(ink, t, e):
    """Dartboard; a dart flies in and hits high on the board."""
    rings = [(230, RED), (180, WHITE), (130, RED), (80, WHITE), (35, RED)]
    for r, col in rings:
        ink.circle(0, 0, r, fill=col, outline=DARK, w=6, wob=0.1)
    ink.line([(0, 235), (-60, 330)], BROWN, 14, wob=0)
    ink.line([(0, 235), (60, 330)], BROWN, 14, wob=0)
    hit = e.get("hit_at", 0.6)
    k = smooth(seg(t, hit - 0.35, hit))
    hx, hy = e.get("hx", 18), e.get("hy", -60)
    if t >= hit - 0.35:
        sx, sy = lerp(520, hx, k), lerp(-420, hy, k)
        wob_ = math.sin((t - hit) * 40) * 6 * math.exp(-max(0, t - hit) * 6) if t > hit else 0
        with ink.at(sx, sy, 40 + wob_):
            ink.line([(0, 0), (150, 0)], DARK, 12, wob=0)
            ink.shape([(0, 0), (22, -9), (22, 9)], fill=GREY, outline=DARK, w=4, wob=0)
            ink.shape([(120, 0), (170, -36), (180, 0), (170, 36)], fill=GOLD, outline=DARK, w=4, wob=0)
    if t > hit and e.get("label"):
        kk = ease_out_back(seg(t, hit, hit + 0.4), 1.8)
        with ink.at(0, -320, -3, max(0.05, kk)):
            w = ink.text_w(e["label"], 46, "mont") + 60
            ink.rect(-w / 2, -40, w / 2, 40, fill=GREEN, outline=DARK, w=6, wob=0.2, r=40)
            T(ink, 0, 2, e["label"], 46, WHITE)


def warning(ink, t, e):
    """Road-style warning sign with a note plate."""
    sw = math.sin(t * 2.5) * 3
    with ink.at(0, 0, sw):
        ink.line([(0, 0), (0, 380)], GREY, 22, wob=0)
        ink.line([(0, 0), (0, 380)], DARK, 4, wob=0)
        ink.shape([(0, -330), (230, 60), (-230, 60)], fill=GOLD, outline=DARK, w=LW + 4, wob=0.2)
        T(ink, 0, -40, "!", 230, DARK)
        ink.rect(-270, 110, 270, 250, fill=WHITE, outline=DARK, w=LW, wob=0.2, r=14)
        lines = e.get("text", "KEINE\nANLAGEBERATUNG").split("\n")
        for i, l in enumerate(lines):
            T(ink, 0, 180 + (i - (len(lines) - 1) / 2) * 56, l, 48, DARK)


def magnifier(ink, t, e):
    """Magnifying glass gliding over a document with a chart, question mark inside the lens."""
    with ink.at(-30, 40, -4):
        ink.rect(-230, -280, 230, 280, fill=WHITE, outline=DARK, w=LW, wob=0.2, r=14)
        for i in range(5):
            ink.line([(-180, -200 + i * 40), (180 - (i % 2) * 80, -200 + i * 40)], GREY, 8, wob=0)
        ink.line([(-170, 200), (-90, 130), (-20, 160), (60, 40), (170, -20)], GREEN, 12, wob=0)
    a = t * 1.3
    mx, my = 60 + math.cos(a) * 70, -30 + math.sin(a * 1.4) * 60
    with ink.at(mx, my):
        ink.line([(110, 110), (240, 240)], DARK, 44, wob=0)
        ink.line([(110, 110), (240, 240)], BROWN, 30, wob=0)
        ink.circle(0, 0, 150, fill=mix(SKY, WHITE, 0.5), outline=DARK, w=20, wob=0.1)
        ink.arc(0, 0, 118, 118, 200, 250, WHITE, 12, wob=0)
        T(ink, 0, 6, e.get("mark", "?"), 170, BLUE)


def rocket(ink, t, e):
    """Rocket on the launch pad, engines warming up (or lifting off from ``lift_at``)."""
    lift = e.get("lift_at")
    up = 0.0 if lift is None else smooth(seg(t, lift, lift + 1.6)) * 900
    shake = math.sin(t * 40) * 3
    for i in range(7):
        k = (t * 0.8 + i / 7) % 1
        ink.circle(-200 + i * 66, 300 - k * 40, 46 + 30 * k, fill=mix(GREY, WHITE, 0.4 + 0.5 * k), outline=None, wob=0.2)
    ink.rect(-260, 300, 260, 340, fill=GREY, outline=DARK, w=6, wob=0)
    with ink.at(shake, -up):
        fl = 1 + 0.25 * math.sin(t * 37)
        ink.shape([(-40, 230), (0, 230 + 120 * fl), (40, 230)], fill=ORANGE, outline=DARK, w=5, wob=0.2)
        ink.shape([(-20, 230), (0, 230 + 70 * fl), (20, 230)], fill=GOLD, outline=None, wob=0)
        ink.shape([(-70, 120), (-140, 240), (-60, 220)], fill=RED, outline=DARK, w=6, wob=0.2)
        ink.shape([(70, 120), (140, 240), (60, 220)], fill=RED, outline=DARK, w=6, wob=0.2)
        ink.shape([(-75, 230), (-82, -60), (-50, -200), (0, -290), (50, -200), (82, -60), (75, 230)],
                  fill=WHITE, outline=DARK, w=LW, wob=0.2, smooth=True)
        ink.shape([(-50, -200), (0, -290), (50, -200)], fill=RED, outline=DARK, w=6, wob=0.2)
        ink.circle(0, -70, 42, fill=SKY, outline=DARK, w=7, wob=0)
        T(ink, 0, 70, e.get("label", "SAP"), 40, DARK, rot=-90)
    if e.get("tag"):
        k = ease_out_back(seg(t, 0.3, 0.75), 1.6)
        with ink.at(230, -170, 6, max(0.05, k)):
            w = ink.text_w(e["tag"], 46, "mont") + 50
            ink.rect(-w / 2, -40, w / 2, 40, fill=GOLD, outline=DARK, w=6, wob=0.2, r=12)
            T(ink, 0, 2, e["tag"], 46, DARK)


KINDS = {"trophy": trophy, "tombstone": tombstone, "cloud": cloud, "stack": stack, "hook": hook,
         "calendar": calendar, "target": target, "warning": warning, "magnifier": magnifier, "rocket": rocket}


def gauge(ink, t, e):
    """Speedometer: needle sweeps up into the green zone and settles with a small overshoot."""
    segs = [(RED, 0.0, 0.2), ((255, 140, 40), 0.2, 0.4), (GOLD, 0.4, 0.6), ((150, 210, 90), 0.6, 0.8), (GREEN, 0.8, 1.0)]
    R, r = 300, 190
    for col, a, b in segs:
        a0, a1 = 180 + 180 * a, 180 + 180 * b
        pts = [(math.cos(math.radians(a0 + (a1 - a0) * i / 12)) * R, math.sin(math.radians(a0 + (a1 - a0) * i / 12)) * R)
               for i in range(13)]
        pts += [(math.cos(math.radians(a1 - (a1 - a0) * i / 12)) * r, math.sin(math.radians(a1 - (a1 - a0) * i / 12)) * r)
                for i in range(13)]
        ink.shape(pts, fill=col, outline=DARK, w=6, wob=0.1)
    for i in range(11):
        a = math.radians(180 + 18 * i)
        ink.line([(math.cos(a) * (r - 14), math.sin(a) * (r - 14)), (math.cos(a) * (r - 40), math.sin(a) * (r - 40))],
                 DARK, 6 if i % 5 == 0 else 3, wob=0)
    T(ink, -r + 70, -16, e.get("lo", "UNTEN"), 26, (110, 114, 124))
    T(ink, r - 70, -16, e.get("hi", "OBEN"), 26, (110, 114, 124))
    settle = e.get("settle", 1.3)
    v = e.get("level", 0.88)
    k = seg(t, 0.15, settle)
    val = v * smooth(k) + (0.06 * math.sin((t - settle) * 14) * math.exp(-(t - settle) * 5) if t > settle else 0)
    a = math.radians(180 + 180 * val)
    ink.shape([(math.cos(a) * (R - 30), math.sin(a) * (R - 30)), (math.cos(a + 1.57) * 18, math.sin(a + 1.57) * 18),
               (math.cos(a - 1.57) * 18, math.sin(a - 1.57) * 18)], fill=DARK, outline=None, wob=0)
    ink.circle(0, 0, 34, fill=DARK, outline=None, wob=0)
    ink.circle(0, 0, 14, fill=GOLD, outline=None, wob=0)
    if t > settle and e.get("label"):
        kk = ease_out_back(seg(t, settle, settle + 0.4), 1.6)
        with ink.at(0, 120, -2, max(0.05, kk)):
            w = ink.text_w(e["label"], 50, "mont") + 70
            ink.rect(-w / 2, -44, w / 2, 44, fill=GREEN, outline=DARK, w=6, wob=0.2, r=44)
            T(ink, 0, 2, e["label"], 50, WHITE)
        for i in range(6):
            kk = smooth(seg(t, settle + i * 0.05, settle + i * 0.05 + 0.5))
            aa = a + (i - 2.5) * 0.25
            if kk < 1:
                sparkle(ink, math.cos(aa) * (R + 20 + 60 * kk), math.sin(aa) * (R + 20 + 60 * kk), 18 * (1 - kk))


def car(ink, t, e):
    """Sports car racing in from the right with speed lines, then parking with a bounce."""
    k = smooth(seg(t, 0.0, 0.8))
    x = lerp(900, 0, k)
    b = 10 * math.sin((t - 0.8) * 16) * math.exp(-(t - 0.8) * 5) if t > 0.8 else 0
    if k < 1:
        for i in range(4):
            yy = -60 + i * 40
            ink.line([(x + 330, yy), (x + 330 + 260 * (1 - k), yy)], (176, 180, 188), 6, wob=0)
    ink.ellipse(x, 150, 320, 26, fill=(230, 231, 236), outline=None, wob=0)
    col = tuple(e.get("color", (226, 58, 64)))
    with ink.at(x, -abs(b)):
        ink.shape([(-320, 110), (-310, 30), (-250, 10), (-150, -70), (60, -80), (170, -10), (300, 15), (325, 70),
                   (320, 110)], fill=col, outline=DARK, w=LW, wob=0.2, smooth=True)
        ink.shape([(-130, -10), (-80, -60), (40, -64), (40, -10)], fill=SKY, outline=DARK, w=6, wob=0)
        ink.shape([(60, -10), (60, -62), (120, -10)], fill=SKY, outline=DARK, w=6, wob=0)
        ink.line([(-300, 50), (300, 50)], mix(col, WHITE, 0.4), 6, wob=0)
        ink.ellipse(305, 40, 16, 10, fill=GOLD, outline=DARK, w=3, wob=0)
        for wx in (-190, 190):
            ink.circle(wx, 110, 62, fill=DARK, outline=DARK, w=4, wob=0)
            ink.circle(wx, 110, 34, fill=(200, 202, 210), outline=DARK, w=4, wob=0)
            for j in range(3):
                aa = math.radians(-x * 0.8 + j * 60)
                ink.line([(wx - math.cos(aa) * 30, 110 - math.sin(aa) * 30), (wx + math.cos(aa) * 30, 110 + math.sin(aa) * 30)],
                         DARK, 4, wob=0)
    if e.get("tag") and t > 0.9:
        kk = ease_out_back(seg(t, 0.9, 1.3), 1.6)
        with ink.at(150, -200, 5, max(0.05, kk)):
            w = ink.text_w(e["tag"], 46, "mont") + 50
            ink.rect(-w / 2, -40, w / 2, 40, fill=GOLD, outline=DARK, w=6, wob=0.2, r=12)
            T(ink, 0, 2, e["tag"], 46, DARK)


def tank(ink, t, e):
    """Tank rolling in, turret turning, small recoil puff."""
    k = smooth(seg(t, 0.0, 1.0))
    x = lerp(-900, 0, k)
    turret = lerp(-20, 6, smooth(seg(t, 0.9, 1.5)))
    green = (106, 128, 70)
    with ink.at(x, 0):
        ink.rect(-330, 60, 330, 170, fill=(70, 74, 60), outline=DARK, w=LW, wob=0.2, r=55)
        for i in range(7):
            wx = -270 + i * 90
            ink.circle(wx, 115, 38, fill=(150, 154, 140), outline=DARK, w=5, wob=0)
            ink.circle(wx, 115, 12, fill=DARK, outline=None, wob=0)
        ink.shape([(-300, 60), (-260, -30), (270, -30), (310, 60)], fill=green, outline=DARK, w=LW, wob=0.2)
        with ink.at(-20, -30, turret):
            ink.rect(0, -60, 380, -30, fill=green, outline=DARK, w=6, wob=0.1)
            ink.shape([(-170, 0), (-140, -90), (120, -90), (160, 0)], fill=green, outline=DARK, w=LW, wob=0.2)
            ink.rect(-60, -120, 30, -90, fill=green, outline=DARK, w=6, wob=0.1)
        if e.get("label"):
            T(ink, 0, 20, e["label"], 40, (230, 232, 220))


def newspaper(ink, t, e):
    """Newspaper slides in with a slight spin; headline and photo block."""
    k = smooth(seg(t, 0.0, 0.7))
    with ink.at(0, 0, lerp(-25, -3, k), lerp(0.6, 1.0, k)):
        ink.rect(-300, -360, 300, 360, fill=(250, 248, 240), outline=DARK, w=LW, wob=0.2, r=6)
        T(ink, 0, -300, e.get("paper", "FINANZ-NEWS"), 46, DARK, "comic")
        ink.line([(-260, -265), (260, -265)], DARK, 5, wob=0)
        lines = e.get("headline", "BREAKING").split("\n")
        for i, l in enumerate(lines):
            T(ink, 0, -205 + i * 64, l, 58, DARK)
        top = -205 + len(lines) * 64
        ink.rect(-260, top, 30, top + 200, fill=SKY, outline=DARK, w=5, wob=0)
        ink.line([(-240, top + 170), (-170, top + 120), (-110, top + 140), (0, top + 40)], GREEN, 10, wob=0)
        for i in range(6):
            ink.line([(60, top + 20 + i * 34), (260, top + 20 + i * 34)], GREY, 8, wob=0)
        for i in range(3):
            ink.line([(-260, top + 240 + i * 34), (260 - (i % 2) * 90, top + 240 + i * 34)], GREY, 8, wob=0)


def phone_post(ink, t, e):
    """Smartphone showing a social/news post; the post card pops in."""
    ink.rect(-220, -380, 220, 380, fill=(30, 32, 38), outline=DARK, w=LW, wob=0.1, r=46)
    ink.rect(-196, -350, 196, 350, fill=WHITE, outline=None, wob=0, r=30)
    ink.rect(-50, -366, 50, -350, fill=(30, 32, 38), outline=None, wob=0, r=8)
    k = ease_out_back(seg(t, 0.25, 0.7), 1.4)
    if k > 0.02:
        with ink.at(0, -60, 0, k):
            ink.circle(-130, -170, 36, fill=BLUE, outline=DARK, w=4, wob=0)
            ink.text(-80, -185, e.get("name", "News"), 34, "mont", fill=DARK, stroke=None, anchor="lm")
            ink.text(-80, -148, e.get("handle", "@finanzen · jetzt"), 22, "mont", fill=(110, 114, 124), stroke=None,
                     anchor="lm")
            for i, l in enumerate(e.get("text", "").split("\n")):
                T(ink, 0, -80 + i * 50, l, 36, DARK)
            ink.rect(-160, 90, 160, 250, fill=SKY, outline=DARK, w=4, wob=0, r=12)
            ink.line([(-140, 220), (-60, 170), (0, 190), (130, 110)], e.get("trend") == "down" and RED or GREEN, 9, wob=0)


KINDS.update({"gauge": gauge, "car": car, "tank": tank, "newspaper": newspaper, "phone": phone_post})


def _check(ink, x, y, s, col):
    ink.circle(x, y, 30 * s, fill=col, outline=DARK, w=5, wob=0)
    ink.line([(x - 13 * s, y), (x - 3 * s, y + 11 * s), (x + 15 * s, y - 11 * s)], WHITE, 8 * s, wob=0)


def _cross(ink, x, y, s, col):
    ink.circle(x, y, 30 * s, fill=col, outline=DARK, w=5, wob=0)
    ink.line([(x - 11 * s, y - 11 * s), (x + 11 * s, y + 11 * s)], WHITE, 8 * s, wob=0)
    ink.line([(x + 11 * s, y - 11 * s), (x - 11 * s, y + 11 * s)], WHITE, 8 * s, wob=0)


def proscons(ink, t, e):
    """Two columns: green pros with check marks, red cons with crosses; rows pop in one by one."""
    pros, cons = e.get("pros", ["", ""]), e.get("cons", ["", "", ""])
    step = e.get("step", 0.35)
    for col, (title, items, c, mark) in enumerate(((e.get("pt", "VORTEILE"), pros, GREEN, _check),
                                                   (e.get("ct", "NACHTEILE"), cons, RED, _cross))):
        x = -165 + col * 330
        k = smooth(seg(t, col * 0.15, col * 0.15 + 0.4))
        with ink.at(x, 40 * (1 - k)):
            ink.rect(-150, -300, 150, 300, fill=WHITE, outline=DARK, w=LW, wob=0.2, r=22)
            ink.rect(-150, -300, 150, -210, fill=c, outline=DARK, w=LW, wob=0.2, r=22)
            T(ink, 0, -255, f"{len(items)} {title}", 38, WHITE)
            for i, it in enumerate(items):
                at = e.get("items_at", 0.5) + (i + col * len(pros)) * step
                ki = ease_out_back(seg(t, at, at + 0.35), 1.8)
                if ki > 0.02:
                    yy = -150 + i * 120
                    with ink.at(-95, yy, 0, max(0.05, ki)):
                        mark(ink, 0, 0, 1.0, c)
                    if it:
                        T(ink, 30, yy, it, 26, DARK)
                    else:
                        ink.rect(-50, yy - 10, 120, yy + 10, fill=(232, 233, 238), outline=None, wob=0, r=10)


def choice(ink, t, e):
    """Two option cards side by side; at ``pick_at`` one gets a big check mark, the other greys out."""
    pick = e.get("pick_at", 99)
    k_pick = smooth(seg(t, pick, pick + 0.45))
    for i, (lbl, icon_) in enumerate(((e.get("a", "SELBST-\nBESTIMMT"), "a"), (e.get("b", "VORAUS-\nGEWÄHLT"), "b"))):
        x = -170 + i * 340
        k = ease_out_back(seg(t, 0.1 + i * 0.25, 0.5 + i * 0.25), 1.4)
        chosen = i == e.get("pick", 0)
        s = 1.0 + (0.06 * k_pick if chosen else -0.08 * k_pick)
        fill = WHITE if (chosen or k_pick < 0.01) else mix(WHITE, (225, 226, 230), k_pick)
        with ink.at(x, 0, (-3 if i == 0 else 3) * (1 - k_pick), max(0.05, k * s)):
            ink.rect(-150, -240, 150, 240, fill=fill, outline=GREEN if (chosen and k_pick > 0.5) else DARK,
                     w=LW + 4 * k_pick * chosen, wob=0.2, r=26)
            if icon_ == "a":
                ink.circle(0, -105, 60, fill=mix(BLUE, WHITE, 0.75), outline=DARK, w=6, wob=0)
                ink.line([(-30, -85), (-30, -135)], DARK, 8, wob=0)
                ink.line([(0, -85), (0, -150)], DARK, 8, wob=0)
                ink.line([(30, -85), (30, -120)], DARK, 8, wob=0)
                ink.circle(30, -125, 9, fill=GREEN, outline=None, wob=0)
            else:
                ink.circle(0, -105, 60, fill=mix(GOLD, WHITE, 0.7), outline=DARK, w=6, wob=0)
                ink.rect(-28, -130, 28, -80, fill=WHITE, outline=DARK, w=5, wob=0, r=6)
                ink.line([(-15, -115), (15, -115)], GREY, 5, wob=0)
                ink.line([(-15, -100), (10, -100)], GREY, 5, wob=0)
            for j, l in enumerate(lbl.split("\n")):
                T(ink, 0, 30 + j * 48, l, 40, DARK)
            T(ink, 0, 170, e.get("sa" if icon_ == "a" else "sb", ""), 24, (110, 114, 124))
    if t >= pick:
        x = -170 + 340 * e.get("pick", 0)
        kk = ease_out_back(seg(t, pick, pick + 0.4), 2.0)
        with ink.at(x + 110, -220, 0, max(0.05, kk)):
            ink.circle(0, 0, 58, fill=GREEN, outline=DARK, w=6, wob=0)
            ink.line([(-26, 0), (-6, 22), (28, -22)], WHITE, 14, wob=0)


def gift(ink, t, e):
    """Present box: lid pops off, a tag with the gift flies up, sparkles."""
    open_at = e.get("open_at", 0.6)
    k = smooth(seg(t, open_at, open_at + 0.4))
    shake = math.sin(t * 30) * 4 if t < open_at else 0
    with ink.at(shake, 120):
        ink.rect(-190, -120, 190, 200, fill=RED, outline=DARK, w=LW, wob=0.2, r=10)
        ink.rect(-30, -120, 30, 200, fill=GOLD, outline=DARK, w=5, wob=0)
        with ink.at(-120 * k, -120 - 160 * k, -35 * k):
            ink.rect(-215, -60, 215, 0, fill=RED, outline=DARK, w=LW, wob=0.2, r=8)
            ink.rect(-34, -60, 34, 0, fill=GOLD, outline=DARK, w=5, wob=0)
            ink.ellipse(-55, -85, 55, 30, fill=GOLD, outline=DARK, w=5, wob=0, rot=-20)
            ink.ellipse(55, -85, 55, 30, fill=GOLD, outline=DARK, w=5, wob=0, rot=20)
    if t > open_at:
        kt = ease_out_back(seg(t, open_at + 0.15, open_at + 0.6), 1.5)
        with ink.at(60, lerp(60, -250, smooth(seg(t, open_at + 0.15, open_at + 0.6))), 6, max(0.05, kt)):
            w = ink.text_w(e.get("tag", "GESCHENKT"), 52, "mont") + 70
            ink.rect(-w / 2, -50, w / 2, 50, fill=WHITE, outline=DARK, w=LW, wob=0.2, r=14)
            ink.circle(-w / 2 + 26, 0, 9, fill=(240, 240, 240), outline=DARK, w=3, wob=0)
            T(ink, 12, 2, e.get("tag", "GESCHENKT"), 52, GREEN)
        for i in range(7):
            kk = smooth(seg(t, open_at + i * 0.05, open_at + i * 0.05 + 0.6))
            a = math.radians(-170 + i * 27)
            if kk < 1:
                sparkle(ink, math.cos(a) * (120 + 200 * kk), 20 + math.sin(a) * (120 + 200 * kk), 24 * (1 - kk))


def vault(ink, t, e):
    """Safe full of money; the door swings shut and a padlock with the age drops on."""
    shut = e.get("shut_at", 0.6)
    k = smooth(seg(t, shut, shut + 0.5))
    ink.rect(-250, -270, 250, 270, fill=(120, 126, 138), outline=DARK, w=LW, wob=0.2, r=26)
    ink.rect(-205, -225, 205, 225, fill=(60, 64, 74), outline=DARK, w=6, wob=0.1, r=14)
    for r_ in range(3):
        for c_ in range(3):
            bill(ink, -120 + c_ * 120, -130 + r_ * 120, 0.75, (r_ * 3 + c_) % 2 * 8 - 4)
    door_w = 410 * (1 - k * 0) if k <= 0 else 410
    if k > 0:
        # door closing from the left hinge: drawn as a narrowing-then-full panel
        w = 410 * k
        ink.rect(-205, -225, -205 + w, 225, fill=(150, 156, 168), outline=DARK, w=6, wob=0.1, r=14)
        if k > 0.9:
            ink.circle(0, 0, 80, fill=(170, 176, 188), outline=DARK, w=7, wob=0)
            for a in range(6):
                aa = math.radians(a * 60 + t * 20)
                ink.line([(math.cos(aa) * 20, math.sin(aa) * 20), (math.cos(aa) * 70, math.sin(aa) * 70)], DARK, 7, wob=0)
            ink.circle(0, 0, 22, fill=DARK, outline=None, wob=0)
    lk = e.get("lock_at", shut + 0.6)
    if t >= lk:
        d = ease_out_back(seg(t, lk, lk + 0.45), 1.6)
        with ink.at(170, lerp(-600, 150, smooth(seg(t, lk, lk + 0.45))), 0, max(0.05, d)):
            ink.arc(0, -70, 55, 60, 180, 360, DARK, 26, wob=0)
            ink.arc(0, -70, 55, 60, 180, 360, (190, 194, 202), 14, wob=0)
            ink.rect(-85, -70, 85, 80, fill=GOLD, outline=DARK, w=LW, wob=0.2, r=14)
            T(ink, 0, 5, e.get("lock", "67"), 64, DARK)
    door_w = door_w


def chained(ink, t, e):
    """Money bag tied down with a heavy chain and padlock; the bag strains, sweat drops."""
    strain = math.sin(t * 6) * 6
    with ink.at(0, 40):
        with ink.at(strain * 0.6, 0, strain * 0.4):
            ink.shape([(-60, -170), (-170, -60), (-190, 70), (-120, 190), (120, 190), (190, 70), (170, -60), (60, -170)],
                      fill=BOX, outline=DARK, w=LW, wob=0.2, smooth=True)
            ink.shape([(-60, -170), (-85, -235), (0, -205), (85, -235), (60, -170)], fill=BOX, outline=DARK, w=6,
                      wob=0.2, smooth=True)
            T(ink, 0, -40, "€", 130, MONEY_DK)
        k = smooth(seg(t, e.get("chain_at", 0.3), e.get("chain_at", 0.3) + 0.6))
        for side in (-1, 1):
            n = int(9 * k)
            for i in range(n):
                x = side * (230 - i * 26)
                y = 50 + (i % 2) * 4
                ink.ellipse(x, y + 20, 22, 13, fill=None, outline=(120, 124, 134), w=9, wob=0,
                            rot=0 if i % 2 else 90)
        ink.line([(-260, 260), (260, 260)], DARK, 10, wob=0)
        for side in (-1, 1):
            ink.rect(side * 260 - 22, 180, side * 260 + 22, 270, fill=GREY, outline=DARK, w=5, wob=0, r=6)
        if k >= 1:
            kk = ease_out_back(seg(t, e.get("chain_at", 0.3) + 0.6, e.get("chain_at", 0.3) + 1.0), 1.6)
            with ink.at(0, 120, 0, max(0.05, kk)):
                ink.arc(0, -50, 40, 45, 180, 360, DARK, 20, wob=0)
                ink.arc(0, -50, 40, 45, 180, 360, (190, 194, 202), 10, wob=0)
                ink.rect(-60, -50, 60, 55, fill=GOLD, outline=DARK, w=6, wob=0.2, r=12)
                ink.circle(0, 0, 10, fill=DARK, outline=None, wob=0)


KINDS.update({"proscons": proscons, "choice": choice, "gift": gift, "vault": vault, "chained": chained})


def _bank_house(ink, x, y, s, label, col=(226, 228, 234)):
    with ink.at(x, y, 0, s):
        ink.shape([(-130, -150), (0, -230), (130, -150)], fill=WHITE, outline=DARK, w=LW, wob=0.2)
        ink.rect(-120, -150, 120, -125, fill=col, outline=DARK, w=6, wob=0.1)
        for cx in (-85, -30, 30, 85):
            ink.rect(cx - 14, -125, cx + 14, 20, fill=WHITE, outline=DARK, w=5, wob=0.1)
        ink.rect(-135, 20, 135, 50, fill=col, outline=DARK, w=6, wob=0.1)
        T(ink, 0, -170, label, 30 if len(label) < 9 else 22, DARK)


def taxoffice(ink, t, e):
    """Coins leave a shrinking wallet and fly into the tax office: the wallet's gain counts down, the
    office's take counts up, the building bounces on every hit, a tax stamp lands at the end."""
    n = e.get("coins", 7)
    fly_at, step, dur = e.get("fly_at", 0.4), e.get("step", 0.32), 0.85
    lands = [fly_at + i * step + dur for i in range(n)]
    landed = sum(1 for lt in lands if t >= lt)
    gone = sum(1 for i in range(n) if t >= fly_at + i * step)
    last = max([lt for lt in lands if t >= lt], default=-9)
    hit = math.exp(-(t - last) * 9) if t >= last else 0.0
    # tax office, squashing a little on every hit
    with ink.at(190, 175, 0, 1.0 + 0.03 * hit, 1.0 - 0.05 * hit):
        _bank_house(ink, 0, -55, 1.25, e.get("label", "FINANZAMT"))
    # wallet with bills that shrink as coins leave, shaking while it empties
    sh = math.sin(t * 38) * 4 if fly_at <= t < lands[-1] - dur + 0.2 else 0.0
    fill = 1 - gone / n
    with ink.at(-210 + sh, 150, -8):
        for j in range(3):
            hgt = 60 * fill
            if hgt > 2:
                ink.rect(-80 + j * 40, -70 - hgt, -20 + j * 40, -60, fill=MONEY, outline=DARK, w=4, wob=0.1)
        ink.rect(-110, -70, 110, 70, fill=(52, 52, 62), outline=DARK, w=LW, wob=0.2, r=16)
        ink.rect(30, -30, 120, 30, fill=(80, 80, 92), outline=DARK, w=5, wob=0, r=10)
        ink.circle(70, 0, 10, fill=GOLD, outline=None, wob=0)
    for i in range(n):
        st = fly_at + i * step
        k = seg(t, st, st + dur)
        if 0 < k < 1:
            x = lerp(-180, 190, k)
            y = lerp(90, 40, k) - math.sin(k * math.pi) * 270
            with ink.at(x, y, k * 360, 1.0):
                ink.circle(0, 0, 34, fill=GOLD, outline=DARK, w=5, wob=0)
                T(ink, 0, 2, "€", 34, GOLD_DK)
    # little "-€" puffs rising from the office on each hit
    for lt in lands:
        d = t - lt
        if 0 <= d < 0.6:
            ink.text(190 + 70 * math.sin(lt * 7), -30 - 120 * d, "-€", 40 * (1 - d * 0.6), "mont",
                     fill=mix(RED, WHITE, d / 0.6), stroke=None)
    # counters
    from .scenes import count_fmt
    k = landed / n if n else 0
    if t >= fly_at - 0.2:
        ka = ease_out_back(seg(t, fly_at - 0.2, fly_at + 0.2), 1.6)
        gain, take = e.get("gain", 500.0), e.get("take", 131.88)
        with ink.at(-210, -150, -3, max(0.05, ka)):
            ink.rect(-150, -55, 150, 55, fill=WHITE, outline=DARK, w=6, wob=0.1, r=14)
            T(ink, 0, -26, e.get("gain_label", "DEIN GEWINN"), 22, (110, 114, 124))
            T(ink, 0, 16, f"{gain - take * k:,.2f} €".replace(",", "X").replace(".", ",").replace("X", "."), 40,
              GREEN if k < 1 else DARK)
        with ink.at(190, -330, 3, max(0.05, ka)):
            ink.rect(-150, -55, 150, 55, fill=WHITE, outline=RED, w=6, wob=0.1, r=14)
            T(ink, 0, -26, e.get("take_label", "STEUER"), 22, RED)
            T(ink, 0, 16, f"{take * k:,.2f} €".replace(",", "X").replace(".", ",").replace("X", "."), 40, RED)
    # tax stamp on the building at the end
    if e.get("tag") and t > e.get("tag_at", lands[-1]):
        ta = e.get("tag_at", lands[-1])
        kk = seg(t, ta, ta + 0.25)
        with ink.at(190, 60, -12, lerp(1.8, 1.0, 1 - (1 - kk) ** 3)):
            w = ink.text_w(e["tag"], 46, "mont") + 50
            ink.rect(-w / 2, -40, w / 2, 40, fill=None, outline=RED, w=10, wob=0.5, r=10)
            T(ink, 0, 3, e["tag"], 46, RED)


def _phone_frame(ink, w=430, h=820):
    ink.rect(-w / 2 - 6, -h / 2 + 10, w / 2 + 6, h / 2 + 22, fill=(225, 226, 232), outline=None, wob=0, r=60)
    ink.rect(-w / 2, -h / 2, w / 2, h / 2, fill=(18, 18, 22), outline=DARK, w=LW, wob=0.1, r=58)
    ink.rect(-w / 2 + 16, -h / 2 + 16, w / 2 - 16, h / 2 - 16, fill=(10, 10, 12), outline=None, wob=0, r=44)
    ink.rect(-50, -h / 2 + 26, 50, -h / 2 + 46, fill=(30, 30, 36), outline=None, wob=0, r=10)


def _row(ink, y, text, hi=False, sub=None, w=360):
    ink.rect(-w / 2, y - 38, w / 2, y + 38, fill=(40, 40, 46) if hi else (24, 24, 28), outline=None, wob=0, r=16)
    ink.text(-w / 2 + 24, y - (8 if sub else 0), text, 28, "mont", fill=WHITE, stroke=None, anchor="lm")
    if sub:
        ink.text(-w / 2 + 24, y + 22, sub, 20, "montb", fill=(150, 150, 160), stroke=None, anchor="lm")
    ink.line([(w / 2 - 34, y - 10), (w / 2 - 22, y), (w / 2 - 34, y + 10)], (150, 150, 160), 4, wob=0)


def app_steps(ink, t, e):
    """Dark broker-app mock-up: screens change step by step, a finger tap ripple marks each click.
    steps: list of [time, screen]; screens: profile, taxes, fsa, amount, done."""
    _phone_frame(ink)
    steps = e.get("steps", [[0.4, "profile"]])
    cur = steps[0][1]
    since = t - steps[0][0]
    for at, sc in steps:
        if t >= at:
            cur, since = sc, t - at
    slide = 1 - smooth(seg(since, 0.0, 0.35))
    app = e.get("app", "Broker-App")
    with ink.at(160 * slide, 0):
        ink.text(-170, -330, app, 24, "montb", fill=(150, 150, 160), stroke=None, anchor="lm")
        if cur == "home":
            ink.text(-170, -270, "Portfolio", 44, "mont", fill=WHITE, stroke=None, anchor="lm")
            ink.text(-170, -210, e.get("portfolio", "12.480,00 €"), 34, "mont", fill=WHITE, stroke=None, anchor="lm")
            ink.line([(-170, -60), (-100, -110), (-30, -80), (60, -160), (170, -190)], GREEN, 6, wob=0)
            ink.circle(150, -330, 26, fill=(40, 40, 46), outline=None, wob=0)
            ink.circle(150, -337, 9, fill=(170, 170, 180), outline=None, wob=0)
            ink.arc(150, -318, 14, 9, 200, 340, (170, 170, 180), 5, wob=0)
        elif cur == "profile":
            ink.text(-170, -270, "Profil", 44, "mont", fill=WHITE, stroke=None, anchor="lm")
            for i, (tx, hi) in enumerate((("Persönliche Daten", 0), ("Steuern", 1), ("Sicherheit", 0), ("Hilfe", 0))):
                _row(ink, -160 + i * 95, tx, hi)
        elif cur == "taxes":
            ink.text(-170, -270, "Steuern", 44, "mont", fill=WHITE, stroke=None, anchor="lm")
            for i, (tx, hi) in enumerate((("Freistellungsauftrag", 1), ("Steuer-ID", 0), ("Steuerberichte", 0))):
                _row(ink, -160 + i * 95, tx, hi, "nicht eingerichtet" if hi else None)
        elif cur in ("fsa", "amount", "done"):
            ink.text(-170, -270, "Freistellungs-", 40, "mont", fill=WHITE, stroke=None, anchor="lm")
            ink.text(-170, -225, "auftrag", 40, "mont", fill=WHITE, stroke=None, anchor="lm")
            amt = e.get("amount", "1.000 €")
            if cur == "fsa":
                shown = "0 €"
            elif cur == "amount":
                from .scenes import count_fmt
                shown = count_fmt(amt, smooth(seg(since, 0.2, 1.0)))
            else:
                shown = amt
            ink.rect(-180, -150, 180, -30, fill=(30, 30, 36), outline=GREEN if cur != "fsa" else (70, 70, 80),
                     w=4, wob=0, r=18)
            ink.text(0, -90, shown, 64, "mont", fill=WHITE, stroke=None)
            ink.text(-180, 10, "max. 1.000 € pro Person", 22, "montb", fill=(150, 150, 160), stroke=None, anchor="lm")
            ink.rect(-180, 250, 180, 330, fill=WHITE if cur != "done" else GREEN, outline=None, wob=0, r=40)
            ink.text(0, 290, "Bestätigen" if cur != "done" else "Gespeichert", 30, "mont",
                     fill=DARK if cur != "done" else WHITE, stroke=None)
            if cur == "done":
                kk = ease_out_back(seg(since, 0.05, 0.45), 1.8)
                with ink.at(0, 130, 0, max(0.05, kk)):
                    ink.circle(0, 0, 70, fill=GREEN, outline=None, wob=0)
                    ink.line([(-32, 0), (-8, 26), (36, -26)], WHITE, 16, wob=0)
    tap = {"home": (150, -330), "profile": (0, -65), "taxes": (0, -160), "fsa": (0, -90), "amount": (0, 290)}
    for at, sc in steps:
        d = t - (at - 0.18)
        if 0 <= d < 0.5 and sc in ("profile", "taxes", "fsa", "amount", "done"):
            prev = steps[max(0, steps.index([at, sc]) - 1)][1] if [at, sc] in steps else sc
            px, py = tap.get(prev, (0, 0))
            r = 20 + 70 * smooth(d / 0.5)
            ink.circle(px, py, r, fill=None, outline=mix(GOLD, WHITE, d / 0.5), w=8 * (1 - d / 0.5) + 1, wob=0)
            ink.circle(px, py, 18, fill=GOLD, outline=None, wob=0)
    for i, (at, sc) in enumerate(steps):
        lab = e.get("labels", {}).get(sc)
        if lab and t >= at:
            k = smooth(seg(t, at, at + 0.35))
            yy = -330 + i * 120
            with ink.at(e.get("label_x", 330) + 60 * (1 - k), yy):
                ink.circle(-70, 0, 30, fill=GREEN if t >= at else GREY, outline=DARK, w=5, wob=0)
                T(ink, -70, 2, str(i + 1) if sc != "done" else "✓", 30, WHITE)


def report(ink, t, e):
    """Two banks send their exemption amounts to the federal tax office, which adds them up."""
    for i, (lbl, amt) in enumerate(e.get("banks", [["BANK A", "600 €"], ["BANK B", "400 €"]])):
        y = -170 + i * 300
        _bank_house(ink, -220, y + 110, 0.75, lbl)
        st = e.get("send_at", 0.6) + i * 0.5
        k = smooth(seg(t, st, st + 0.8))
        if st <= t < st + 0.85:
            x = lerp(-120, 150, k)
            yy = lerp(y + 40, 20, k) - math.sin(k * math.pi) * 80
            with ink.at(x, yy, -6 + 12 * k, 0.9):
                ink.rect(-60, -40, 60, 40, fill=WHITE, outline=DARK, w=5, wob=0.1, r=6)
                T(ink, 0, 2, amt, 28, DARK)
    _bank_house(ink, 230, 140, 1.15, "BZSt")
    tot = e.get("total_at", 2.2)
    if t >= tot:
        kk = ease_out_back(seg(t, tot, tot + 0.4), 1.6)
        with ink.at(230, -190, -3, max(0.05, kk)):
            w = ink.text_w(e.get("total", "= 1.000 €"), 46, "mont") + 50
            ink.rect(-w / 2, -40, w / 2, 40, fill=GOLD, outline=DARK, w=6, wob=0.2, r=12)
            T(ink, 0, 2, e.get("total", "= 1.000 €"), 46, DARK)


def checklist(ink, t, e):
    """Clipboard with items ticked off one after another."""
    ink.rect(-260, -320, 260, 330, fill=(170, 120, 70), outline=DARK, w=LW, wob=0.2, r=20)
    ink.rect(-225, -280, 225, 300, fill=WHITE, outline=DARK, w=6, wob=0.1, r=8)
    ink.rect(-80, -345, 80, -285, fill=GREY, outline=DARK, w=6, wob=0, r=12)
    T(ink, 0, -225, e.get("title", "TO-DO"), 42, DARK)
    for i, (at, txt) in enumerate(e.get("items", [])):
        y = -120 + i * 120
        ink.rect(-190, y - 30, -130, y + 30, fill=WHITE, outline=DARK, w=5, wob=0, r=8)
        ink.text(-105, y, txt, 34, "mont", fill=DARK, stroke=None, anchor="lm")
        if t >= at:
            k = smooth(seg(t, at, at + 0.3))
            pts = [(-180, y), (-162, y + 20), (-120, y - 30)]
            n = 1 + int(2 * k) if k < 1 else 2
            ink.line(pts[:n + 1], GREEN, 12, wob=0)


def switch(ink, t, e):
    """Big toggle that flips on, label lights up, coins pop around."""
    on_at = e.get("on_at", 0.8)
    k = smooth(seg(t, on_at, on_at + 0.3))
    col = mix((196, 198, 206), GREEN, k)
    ink.rect(-230, -110, 230, 110, fill=col, outline=DARK, w=LW, wob=0.1, r=110)
    with ink.at(lerp(-120, 120, k), 0):
        ink.circle(0, 0, 92, fill=WHITE, outline=DARK, w=LW, wob=0)
    T(ink, 0, -250, e.get("label", "ZINSEN"), 70, DARK)
    T(ink, 0, 200, "AN" if k > 0.5 else "AUS", 60, GREEN if k > 0.5 else (150, 152, 160))
    if t > on_at + 0.2:
        for i in range(6):
            st = on_at + 0.2 + i * 0.12
            kk = seg(t, st, st + 0.9)
            if 0 < kk < 1:
                a = math.radians(-150 + i * 24)
                r = 160 + 160 * smooth(kk)
                with ink.at(math.cos(a) * r, math.sin(a) * r * 0.7 - 40, kk * 200, 1 - 0.3 * kk):
                    ink.circle(0, 0, 30, fill=GOLD, outline=DARK, w=5, wob=0)
                    T(ink, 0, 2, "€", 30, GOLD_DK)


KINDS.update({"taxoffice": taxoffice, "app_steps": app_steps, "report": report, "checklist": checklist, "switch": switch})


def gavel(ink, t, e):
    """Judge's gavel: raised, slams down on the block at ``slam_at``, shock lines and a date tag."""
    slam = e.get("slam_at", 0.7)
    wood, wood_dk = (176, 112, 62), (120, 72, 36)
    ink.ellipse(-60, 236, 230, 26, fill=(232, 233, 237), outline=None, wob=0)
    ink.rect(-250, 160, 130, 230, fill=wood, outline=DARK, w=LW, wob=0.2, r=14)
    ink.ellipse(-60, 160, 190, 26, fill=mix(wood, WHITE, 0.25), outline=DARK, w=LW, wob=0.2)
    if t < slam - 0.35:
        a = 38 + 4 * math.sin(t * 5)
    elif t < slam:
        k = seg(t, slam - 0.35, slam)
        a = lerp(42, 0, k * k)
    else:
        a = 7 * math.exp(-(t - slam) * 9) * abs(math.sin((t - slam) * 22))
    with ink.at(260, 70, a):
        ink.line([(-320, 0), (0, 0)], DARK, 34, wob=0)
        ink.line([(-320, 0), (-4, 0)], wood, 22, wob=0)
        ink.circle(0, 0, 22, fill=wood_dk, outline=DARK, w=6, wob=0)
        ink.rect(-385, -78, -255, 78, fill=wood, outline=DARK, w=LW, wob=0.2, r=16)
        for y in (-48, 48):
            ink.rect(-389, y - 10, -251, y + 10, fill=GOLD, outline=DARK, w=5, wob=0, r=4)
    if t >= slam:
        k = seg(t, slam, slam + 0.45)
        for i in range(7):
            ang = math.radians(-180 + i * 30)
            r0, r1 = 120 + 90 * k, 170 + 150 * k
            w = 10 * (1 - k)
            if w > 0.8:
                ink.line([(-60 + math.cos(ang) * r0, 150 + math.sin(ang) * r0 * 0.7),
                          (-60 + math.cos(ang) * r1, 150 + math.sin(ang) * r1 * 0.7)], GOLD, w, wob=0)
    if e.get("tag") and t > slam + 0.1:
        kk = ease_out_back(seg(t, slam + 0.1, slam + 0.5), 1.8)
        with ink.at(e.get("tag_x", 150), -230, -6, max(0.05, kk)):
            w = ink.text_w(e["tag"], 60, "mont") + 70
            ink.rect(-w / 2, -46, w / 2, 46, fill=e.get("tag_col", RED), outline=DARK, w=6, wob=0, r=46)
            T(ink, 0, 3, e["tag"], 60, WHITE)


def battery(ink, t, e):
    """Lithium battery draining from full to ``level``, colour shifts green -> red, arrow and tag."""
    d0, d1 = e.get("drain_at", 0.3), e.get("drain_end", 1.6)
    k = smooth(seg(t, d0, d1))
    lvl = lerp(1.0, e.get("level", 0.28), k)
    col = mix(GREEN, RED, k) if k < 0.5 else mix(mix(GREEN, RED, 0.5), RED, (k - 0.5) * 2)
    x0, y0, x1, y1 = -150, -230, 150, 300
    ink.rect(-60, y0 - 52, 60, y0 + 4, fill=GREY, outline=DARK, w=LW, wob=0, r=12)
    ink.rect(x0, y0, x1, y1, fill=WHITE, outline=DARK, w=LW + 4, wob=0.2, r=40)
    inner = (y1 - 26) - (y0 + 26)
    top = (y1 - 26) - inner * lvl
    if lvl > 0.02:
        ink.rect(x0 + 26, top, x1 - 26, y1 - 26, fill=col, outline=None, wob=0, r=22)
        ink.rect(x0 + 26, top, x0 + 80, y1 - 26, fill=mix(col, WHITE, 0.3), outline=None, wob=0, r=20)
    T(ink, 0, 50, e.get("label", "Li"), 120, DARK if lvl < 0.55 else WHITE)
    if k > 0.05:
        ka = smooth(seg(t, d0 + 0.2, d1))
        with ink.at(270, -60 + 160 * ka):
            ink.shape([(-34, -120), (34, -120), (34, 20), (80, 20), (0, 120), (-80, 20), (-34, 20)],
                      fill=RED, outline=DARK, w=6, wob=0)
    if e.get("tag") and t > d1:
        kk = ease_out_back(seg(t, d1, d1 + 0.45), 1.8)
        with ink.at(e.get("tag_x", 250), 230, -5, max(0.05, kk)):
            w = ink.text_w(e["tag"], 64, "mont") + 70
            ink.rect(-w / 2, -48, w / 2, 48, fill=RED, outline=DARK, w=6, wob=0, r=48)
            T(ink, 0, 3, e["tag"], 64, WHITE)


KINDS.update({"gavel": gavel, "battery": battery})
