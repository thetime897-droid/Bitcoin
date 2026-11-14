"""Studio-style video: Krypto-Steuer vom Tisch? (user's own voice). Builds the JSON spec.

    python3 examples/krypto_steuer_studio_spec.py words.json voice.wav out.json
Card times are written in absolute seconds here and converted to shot-local / card-local times.
"""
import json
import sys

words = json.load(open(sys.argv[1]))
GREEN, RED, BLUE, DARK, GOLD = [40, 176, 92], [228, 56, 66], [52, 120, 246], [22, 24, 32], [232, 160, 0]

INNER = ("strike_at", "sub_at", "count_at", "count_end", "badge_at", "plus_at", "draw_at", "draw_end",
         "shrink_at", "shrink_end")


def cam(p0, t0, p1, t1, fov0=52, fov1=None, whoosh=False):
    return {"from": {"pos": p0, "target": t0, "fov": fov0}, "to": {"pos": p1, "target": t1, "fov": fov1 or fov0},
            "whoosh": whoosh}


def card(A, **c):
    """A card appearing at absolute time A; inner event times (absolute) become card-relative."""
    c = dict(c)
    c["A"] = A
    for k in INNER:
        if k in c:
            c[k] = round(c[k] - A, 3)
    for key, idx in (("coins", 2), ("items", 1), ("rows", 3), ("boxes", 3)):
        if key in c:
            c[key] = [list(x[:idx]) + [round(x[idx] - A, 3)] + list(x[idx + 1:]) for x in c[key]]
    return c


def shot(start, end, set_, camera, panda=None, cards=(), trans="zoom", set_args=(), blur=0.0):
    cs = []
    for c in cards:
        c = dict(c)
        c["at"] = round(c.pop("A") - start, 3)
        cs.append(c)
    if panda and "swap" in panda:
        panda = dict(panda, swap=[[round(a - start, 3), p] for a, p in panda["swap"]])
    return dict(start=start, end=end, set=set_, set_args=list(set_args), cam=camera, panda=panda, cards=cs,
                trans=trans, blur=blur)


C1 = card(0.15, type="strike", kicker="BREAKING · DEUTSCHLAND", text="KRYPTO-STEUER", strike_at=2.8, sub="vom Tisch?",
          sub_at=3.0, x=540, y=400, w=880, h=240, glow=["red", "pink"])
REASONS = card(29.35, type="reasons", title="DIE UNION BLOCKIERT", x=540, y=440, w=900, h=390, glow=["red", "blue"],
               items=[["„Nicht ausreichend begründet“", 31.15], ["Haltefrist gilt auch für Gold", 33.4],
                      ["Nicht im Koalitionsvertrag", 35.5]])
VOTE = card(38.45, type="vote", title="ANTRAG DER GRÜNEN", sub="Bundestag · Oktober", x=540, y=430, w=900, h=330,
            glow=["blue", "mint"], rows=[["DAGEGEN", 445, DARK, 41.1], ["DAFÜR", 132, BLUE, 42.4]])
RULE = card(43.8, type="rule", title="DAS GILT WEITER", x=540, y=440, w=920, h=360, glow=["green", "pink"],
            boxes=[["ÜBER 1 JAHR GEHALTEN", "STEUERFREI\negal wie hoch der Gewinn", GREEN, 45.7],
                   ["UNTER 1 JAHR", "STEUERPFLICHTIG\nab 1.000 € Gewinn im Jahr", RED, 48.0]])

AV1 = ("KEHRTWENDE", "Krypto-Steuer")
AV2 = ("HALTEFRIST", "bleibt sie doch?")
BR = ("KOALITION", "Union stellt sich quer")

shots = [
    shot(0.0, 1.5, "reichstag", cam([0, 4, -70], [0, 13, 45], [0, 5, -38], [0, 13, 45], 50, 48, True), None, [C1]),
    shot(1.5, 3.4, "reichstag", cam([-12, 5, -22], [0, 12, 45], [-8, 5, -16], [0, 12, 45], 50),
         dict(pose="mikrofon", frame="wide_right"), [dict(C1)], "whip"),
    shot(3.4, 7.5, "trading", cam([-3, 2.4, -2], [0, 1.6, 30], [1.5, 2.2, 2], [0, 1.6, 30], 55), 
         dict(pose="zeigestock", frame="medium_left"),
         [card(3.42, type="coins", kicker="BETROFFEN WÄREN", x=540, y=360, w=900, h=270, glow=["gold", "blue"],
               coins=[["BTC", [247, 147, 26], 3.44], ["ETH", [98, 126, 234], 3.92], ["XRP", [40, 44, 52], 4.46],
                      ["SOL", [153, 69, 255], 4.8]]),
          card(5.6, type="title", kicker="DEINE GEWINNE", text="STEUERFREI?", x=540, y=640, w=760, h=200,
               glow=["green", "mint"])], "zoom", blur=1.2),
    shot(7.5, 11.7, "avenue", cam([-3, 3, 8], [0, 19, 150], [2.5, 4, 50], [0, 20, 150], 55, None, True),
         dict(pose="cool", frame="wide_left", x=250),
         [card(8.25, type="warn", kicker="DAS MUSST DU WISSEN", lines=["Komplette", "Kehrtwende"],
               sub="Die Steuer war schon fest eingeplant", x=540, y=430, w=880, h=270, glow=["red", "gold"])],
         "whip", AV1),
    shot(11.7, 15.15, "ministry", cam([0, 3, -40], [0, 16, 20], [-4, 3, -24], [0, 16, 20], 52, None, True),
         dict(pose="selbstbewusst", frame="wide_right", x=840),
         [card(12.2, type="person", name="LARS KLINGBEIL", role="Finanzminister · SPD", x=540, y=330, w=860, h=200,
               glow=["blue", "pink"]),
          card(13.75, type="news", kicker="DER PLAN", lines=["Die Haltefrist", "fällt weg"], x=540, y=625, w=860,
               h=230, glow=["red", "blue"])], "zoom"),
    shot(15.15, 19.7, "studio", cam([0, 1.6, -6], [0, 1.2, 10], [0.5, 1.5, -4.6], [0, 1.2, 10], 45),
         dict(pose="zeigen", frame="medium_left"),
         [card(15.25, type="strike", kicker="BISHER", text="STEUERFREI NACH 1 JAHR", strike_at=16.5, sub="fällt weg",
               sub_at=16.75, x=540, y=330, w=900, h=220, glow=["green", "blue"]),
          card(17.2, type="kpi", kicker="STATTDESSEN PAUSCHAL", **{"from": 0}, to=25, fmt="{} %", count_at=17.3,
               count_end=17.95, col=RED, sub="auf alle Krypto-Gewinne", x=540, y=625, w=760, h=240,
               glow=["red", "pink"])], "whip"),
    shot(19.7, 25.2, "trading", cam([3, 2.6, 4], [0, 1.6, 30], [-1, 2.2, 8], [0, 1.6, 30], 55),
         dict(pose="zeigen_tablet", frame="medium_right"),
         [card(19.9, type="calc", kicker="HEISST KONKRET", gain_label="Gewinn", gain="10.000 €",
               tax_label="Steuer (25 %)", tax=2500, count_at=22.3, count_end=23.3, plus="+ Soli", plus_at=24.55,
               x=540, y=420, w=880, h=300, glow=["red", "gold"])], "zoom", blur=1.2),
    shot(25.2, 29.1, "avenue", cam([0, 3, 40], [0, 19, 150], [0, 4, 90], [0, 21, 150], 55, None, True),
         dict(pose="hoodie_daumen", frame="wide_left", x=185),
         [card(25.45, type="news", kicker="LAUT BILD-BERICHT", lines=["Abschaffung der Haltefrist", "soll nicht kommen"],
               x=540, y=420, w=900, h=260, glow=["green", "blue"])], "whip", AV2),
    shot(29.1, 33.3, "boardroom", cam([3, 2.6, -3.5], [0, 0.9, 16], [1, 2.2, 2], [0, 0.9, 16], 55),
         dict(pose="selbstbewusst", frame="medium_left"), [REASONS], "zoom", BR, blur=1.5),
    shot(33.3, 37.4, "studio", cam([0, 1.6, -6], [0, 1.2, 10], [-0.4, 1.6, -5], [0, 1.2, 10], 45),
         dict(pose="cool", frame="close"), [dict(REASONS)], "whip"),
    shot(37.4, 40.95, "reichstag", cam([0, 34, -40], [0, 16, 45], [0, 22, -14], [0, 16, 45], 50, None, True),
         dict(pose="kaffee", frame="wide_left"), [VOTE], "zoom"),
    shot(40.95, 43.65, "studio", cam([0, 1.6, -6], [0, 1.2, 10], [0.4, 1.6, -5], [0, 1.2, 10], 45),
         dict(pose="zeigestock", frame="medium_right"), [dict(VOTE)], "whip"),
    shot(43.65, 47.95, "trading", cam([-4, 2.8, -2], [0, 1.6, 30], [0, 2.2, 6], [0, 1.6, 30], 55),
         dict(pose="entspannt", frame="medium_left"), [RULE], "zoom", blur=1.5),
    shot(47.95, 50.95, "studio", cam([0, 1.6, -6], [0, 1.2, 10], [0, 1.6, -4.8], [0, 1.2, 10], 45),
         dict(pose="zeigen", frame="close"), [dict(RULE)], "whip"),
    shot(50.95, 54.65, "ministry", cam([10, 3, -20], [0, 15, 20], [4, 3, -12], [0, 15, 20], 52, None, True),
         dict(pose="zeigestock", frame="medium_right"),
         [card(51.2, type="warn", kicker="ACHTUNG", lines=["Offiziell noch", "nicht bestätigt"], x=540, y=420,
               w=860, h=250, glow=["red", "gold"])], "zoom", blur=1.0),
    shot(54.65, 58.4, "ministry", cam([0, 2.5, -14], [0, 15, 20], [0, 3, -8], [0, 15, 20], 52),
         dict(pose="zeigen", frame="wide_right"),
         [card(54.9, type="news", kicker="SPD & FINANZMINISTERIUM", lines=["wollten die Steuer", "unbedingt"], x=540,
               y=420, w=880, h=250, glow=["red", "blue"])], "whip"),
    shot(58.4, 60.05, "studio", cam([0, 1.6, -6], [0, 1.2, 10], [0.3, 1.6, -5.4], [0, 1.2, 10], 45),
         dict(pose="kaffee", frame="medium"),
         [card(58.5, type="title", kicker="WICHTIG", text="KEINE STEUERBERATUNG", x=540, y=420, w=880, h=200,
               glow=["gold", "pink"])], "zoom"),
    shot(60.05, 61.14, "studio", cam([0, 1.6, -5.2], [0, 1.2, 10], [0, 1.6, -4.6], [0, 1.2, 10], 45),
         dict(pose="mikrofon", frame="close"),
         [card(60.1, type="title", kicker="UND DU?", text="WAS SAGST DU DAZU?", x=540, y=420, w=880, h=200,
               glow=["blue", "mint"])], "whip"),
]
spec = dict(audio=sys.argv[2], duration=61.14, words=words, header="BÖRSENNEWS · 14.11.2026", shots=shots,
            sfx_rel=0.665, master_lufs=-16.8, cap_y=862, cap_size=40)
json.dump(spec, open(sys.argv[3], "w"), ensure_ascii=False, indent=1)
