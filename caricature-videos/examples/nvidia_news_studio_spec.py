"""20-s example: clean bright studio with black accents, real-looking news graphics (breaking banner,
ticker card with logo, price chart with axes/volume/markers, market-cap bars, vote, date block), an open 3D world
(exploding graphics card at the circuit wall, crane over the wall into the street where cash piles up), calm
eased camera moves and purposeful zooms. No colour washes.

    python3 examples/nvidia_news_studio_spec.py words.json voice.wav out.json
"""
import json
import sys

words = json.load(open(sys.argv[1]))
SCREEN_A = [[-4.7, 7.7, 19.78], [4.7, 7.7, 19.78], [4.7, 1.9, 19.78], [-4.7, 1.9, 19.78]]


def k(t, pos, target, fov=52, **kw):
    return dict(t=t, pos=pos, target=target, fov=fov, **kw)


campath = [
    k(0.0, [-45, 6.9, 0.6], [-45, 4.0, 11], 50),
    k(1.45, [-45, 6.3, 2.6], [-45, 3.9, 11], 49, whoosh="air", whoosh_at=0.0),
    k(2.1, [0.7, 1.7, -1.8], [0.1, 3.4, 20], 52),
    k(3.85, [0.5, 1.7, -0.7], [0.1, 3.4, 20], 50, whoosh="air_long", whoosh_at=0.0),
    k(4.45, [0.4, 14.5, 22], [0, 4.0, 62], 56),
    k(5.0, [0.6, 1.8, 44.6], [0, 3.2, 64], 52, ease="out"),
    k(6.5, [0.3, 1.8, 46.2], [0, 3.2, 64], 50, whoosh="air_long", whoosh_at=0.0),
    k(7.15, [26, 15, 24], [45, 3.0, 20], 56),
    k(7.75, [45.7, 1.8, -1.0], [45, 2.9, 20], 52, ease="out"),
    k(9.4, [45.5, 1.8, 0.4], [45, 2.9, 20], 50, whoosh="air_long", whoosh_at=0.0),
    k(10.25, [0, 4.75, 0.8], [0, 4.8, 20], 52, ease="out"),
    k(13.55, [0, 4.8, 2.0], [0, 4.8, 20], 51, whoosh="air", whoosh_at=0.0),
    k(14.2, [1.5, 1.7, -1.6], [0.1, 3.4, 20], 52, ease="out"),
    k(17.45, [1.0, 1.7, -0.8], [0.1, 3.4, 20], 50),
    k(19.6, [0, 4.6, -10], [0, 3.0, 15], 56),
]
shots = [
    dict(start=0.0, end=1.55, set="brightstudio", trans="cut",
         props=[dict(type="gpu", pos=[-45, 3.0, 11], at=-0.4, explode_at=0.5, dur=1.3)],
         cards=[dict(type="breaking", at=0.1, x=540, y=290, tag="EILMELDUNG", time="Mo · 15:00",
                     text="Huang zurück an der Nvidia-Spitze", sub="Verwaltungsrat setzt den Gründer wieder ein")]),
    dict(start=1.55, end=3.95, set="brightstudio", trans="cut",
         panda=dict(pose="mikrofon", world=[0.6, 5.0, 2.3], enter_at=0.25, enter_dir=1),
         cards=[dict(type="ticker", at=0.55, x=540, y=380, logo="nvidia", name="NVIDIA Corp.", exch="NASDAQ: NVDA",
                     change=29.72, count_at=0.8, count_end=1.65, note="vorbörslich", note2="Schluss Fr.: 125,53 $")]),
    dict(start=3.95, end=6.7, set="brightstudio", trans="cut",
         props=[dict(type="money", pos=[-2.9, 58], at=0.75, cols=3, rows=2, layers=12, dur=1.9),
                dict(type="money", pos=[2.9, 58], at=0.9, cols=3, rows=2, layers=12, dur=1.9)],
         panda=dict(pose="zeigen", world=[0.0, 52.0, 2.3], gesture="nod", gesture_at=1.4),
         cards=[dict(type="mcap", at=0.9, x=540, y=400, title="BÖRSENWERT NVIDIA",
                     rows=[["Freitag", "3,03 Bio. $", 3.03], ["Heute", "3,95 Bio. $", 3.95]], delta="+920 Mrd. $")]),
    dict(start=6.7, end=9.55, set="brightstudio", trans="cut",
         panda=dict(pose="selbstbewusst", world=[45.0, 5.0, 2.3], gesture="nod", gesture_at=1.6),
         cards=[dict(type="vote", at=1.0, x=540, y=380, title="VERWALTUNGSRAT · ABSTIMMUNG", text="EINSTIMMIG",
                     sub="Huang wieder CEO und im Board")]),
    dict(start=9.55, end=13.7, set="brightstudio", trans="cut",
         cards=[dict(type="pricechart", at=0.4, screen=SCREEN_A, w=940, h=580, bg=(255, 255, 255), logo="nvidia",
                     title="NVIDIA · NVDA", range="1 Monat · Beispielverlauf",
                     prices=[150, 152, 149, 151, 147, 144, 145, 141, 138, 139, 135, 131, 128, 125.5, 163],
                     volume=[3, 3, 2, 3, 4, 3, 3, 4, 5, 4, 5, 6, 8, 9, 14], draw_at=0.3, draw_end=2.0,
                     xlabels=["27.10.", "3.11.", "10.11.", "17.11.", "heute"],
                     markers=[[13, "Fr −14 %", "down", 2.05], [14, "+30 %", "up", 2.6]], last="163 $")]),
    dict(start=13.7, end=17.55, set="brightstudio", trans="cut",
         panda=dict(pose="zeigestock", world=[0.6, 5.0, 2.3], enter_at=0.4, enter_dir=1, gesture="shake",
                    gesture_at=1.0),
         cards=[dict(type="breaking", at=0.25, x=540, y=280, tag="ABER", time="noch offen",
                     text="Untersuchung läuft weiter", sub="Nvidia bekommt neuen Ausschuss für Exportkontrollen"),
                dict(type="dateblock", at=1.85, x=540, y=560, month="DEZ", day="1", title="Anhörung im Kongress",
                     sub="Huang muss aussagen", emoji="classical_building")]),
    dict(start=17.55, end=19.6, set="brightstudio", trans="cut",
         panda=dict(pose="mikrofon", world=[0.6, 5.0, 2.3], gesture="nod", gesture_at=0.4),
         cards=[dict(type="breaking", at=0.1, x=540, y=290, tag="FOLGEN", time="täglich",
                     text="Mehr Börsen-News jeden Tag", sub="Keine Anlageberatung")]),
]
cues = [[0.0, "riser2", 0.4], [0.12, "air_short", 0.5], [0.6, "click", 0.4], [1.8, "click", 0.35],
        [2.1, "air_short", 0.45], [3.2, "ping_up", 0.55], [4.75, "air_short", 0.4], [5.0, "pop", 0.4],
        [5.55, "cash", 0.55], [6.0, "pop", 0.4], [7.7, "air_short", 0.45], [8.25, "ping_up", 0.5],
        [9.95, "air_short", 0.4], [11.6, "impact", 0.55], [12.15, "ping_up", 0.45], [13.95, "air_short", 0.45],
        [14.3, "ping_down", 0.45], [15.55, "click", 0.4], [17.65, "air_short", 0.45]]
spec = dict(audio=sys.argv[2], duration=19.6, words=words, shots=shots, campath=campath, shake=0.0,
            header_style="none", cap_style="word", cap_y=1480, cap_size=46, min_head=900, sfx_rel=0.55,
            master_lufs=-14.0, no_riser=True, cues=cues,
            music=dict(bpm=100, rel_db=-21, duck_db=-7, intensity=[[0, 0.6], [3, 0.8], [9.5, 0.65], [11.6, 0.8],
                                                                  [17.5, 0.85], [19.6, 0.8]]))
json.dump(spec, open(sys.argv[3], "w"), ensure_ascii=False, indent=1)
