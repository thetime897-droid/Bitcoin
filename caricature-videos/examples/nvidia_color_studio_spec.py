"""20-s example, faster and colourful: bright studio + coloured light washes, colour-wipe scene changes,
stylish clips (bigstat / marker / emoji2 / chartclip), panda never overlaps the info (min_head), no header bar.

    python3 examples/nvidia_color_studio_spec.py words.json voice.wav out.json
"""
import json
import sys

words = json.load(open(sys.argv[1]))
SCREEN_A = [[-4.7, 7.7, 19.78], [4.7, 7.7, 19.78], [4.7, 1.9, 19.78], [-4.7, 1.9, 19.78]]
A = dict(pos=[0.7, 1.7, -1.6], target=[0.1, 3.4, 20], fov=52)
B = dict(pos=[45.7, 1.8, -1.0], target=[45.0, 2.9, 20], fov=52)
C = dict(pos=[-45, 2.1, 1.5], target=[-45, 7.0, 22], fov=54)


def k(t, z, dz=(0, 0, 0), fov=None, **kw):
    return dict(t=t, pos=[z["pos"][i] + dz[i] for i in range(3)], target=z["target"], fov=fov or z["fov"], **kw)


campath = [
    k(0.0, A, (0, 0.9, -6), 56),
    k(1.4, A, (0, 0, 0), ease="out"),
    k(1.6, A, (0, 0, 0.2)),
    k(2.4, A, (-0.7, 2.9, 7.0), 50, ease="out"),            # push into the screen (panda leaves)
    k(3.85, A, (-0.7, 2.9, 8.2), 50),
    k(4.3, B, (0, 1.5, -5), 56, ease="out"),                  # jump to boardroom under the colour wipe
    k(6.7, B, (0, 0.6, -2.5), 54),
    k(8.1, B, (0.2, 0, 0.5), 50, ease="out"),
    k(9.45, B, (0.3, 0, 1.0), 49, whoosh="air_long", whoosh_at=-0.05),
    k(10.2, C, (0, 0, 0), 54, ease="out"),                    # visible flight to the circuit wall
    k(11.6, C, (0, 0.2, 1.2), 52),
    k(13.6, C, (0, 0.3, 3.0), 50),
    k(14.05, A, (1.2, 0, -1.5), 54, ease="out"),              # back to the hall under the wipe
    k(15.4, A, (0.4, 0, -0.6), 52),
    k(17.5, A, (0.1, 0, 0.3), 50),
    k(19.6, A, (0, 2.2, -9), 56),                            # pull back: end on the wide hall (loop to start)
]
P = dict(min_head=900)
shots = [
    dict(start=0.0, end=1.55, set="brightstudio", trans="cut", wash=["blue", "peach", 0.42],
         panda=dict(pose="mikrofon", world=[0.9, 5.0, 2.3], gesture="idle"),
         cards=[dict(type="marker", text="HUANG IST ZURÜCK", color="gold", at=0.1, x=540, y=300, size=118),
                dict(type="logo", logo="nvidia", word="NVIDIA", at=0.3, x=540, y=600, px=210, word_size=72)]),
    dict(start=1.55, end=3.95, set="brightstudio", trans="cut", wash=["green", "mint", 0.4],
         panda=dict(pose="mikrofon", world=[0.9, 5.0, 2.3], exit_at=0.0, exit_dir=1),
         cards=[dict(type="chartclip", at=0.25, x=540, y=900, w=900, h=540, color="green", title="NVIDIA",
                     logo="nvidia", tag="NVDA", points=[0.72, 0.78, 0.7, 0.6, 0.52, 0.4, 0.3, 0.18, 0.1, 0.92],
                     draw_at=0.3, draw_end=1.5),
                dict(type="bigstat", at=1.5, x=540, y=380, color="green", **{"from": 0}, to=30, fmt="+{} %",
                     count_at=0.05, count_end=0.6, size=200, sub="Aktie springt")]),
    dict(start=3.95, end=6.7, set="brightstudio", trans="wipe", wash=["gold", "peach", 0.46],
         cards=[dict(type="emoji2", emoji="money_bag", color="gold", at=0.3, x=540, y=430, px=230, tilt=-14),
                dict(type="bigstat", at=1.0, x=540, y=820, color="gold", **{"from": 0}, to=920, fmt="+{} MRD. $",
                     count_at=0.05, count_end=0.85, size=170, sub="Börsenwert an einem Tag")]),
    dict(start=6.7, end=8.1, set="brightstudio", trans="cut", wash=["blue", "mint", 0.4],
         panda=dict(pose="selbstbewusst", world=[45.0, 5.0, 2.3], enter_at=0.0, enter_dir=-1),
         cards=[dict(type="emoji2", emoji="chair", color="blue", at=0.2, x=540, y=420, px=230)]),
    dict(start=8.1, end=9.55, set="brightstudio", trans="cut", wash=["green", "blue", 0.42],
         panda=dict(pose="selbstbewusst", world=[45.0, 5.0, 2.3], gesture="nod", gesture_at=0.15),
         cards=[dict(type="marker", text="EINSTIMMIG", color="green", sub="wieder Chef und im Verwaltungsrat", at=0.05,
                     x=540, y=330, size=130),
                dict(type="emoji2", emoji="check_mark_button", color="green", at=0.35, x=540, y=650, px=170)]),
    dict(start=9.55, end=11.6, set="brightstudio", trans="cut", wash=["red", "peach", 0.42],
         cards=[dict(type="chartclip", at=0.5, x=540, y=760, w=900, h=560, color="red", title="NVIDIA",
                     logo="nvidia", tag="FREITAG", points=[0.85, 0.9, 0.82, 0.7, 0.66, 0.5, 0.42, 0.3, 0.18, 0.06],
                     draw_at=0.55, draw_end=1.9)]),
    dict(start=11.6, end=13.7, set="brightstudio", trans="cut", wash=["red", "violet", 0.45],
         cards=[dict(type="bigstat", at=0.05, x=540, y=430, color="red", text="−14 %", size=230,
                     sub="tiefster Stand seit 1 Jahr"),
                dict(type="emoji2", emoji="chart_decreasing", color="red", at=0.5, x=540, y=880, px=220, tilt=12)]),
    dict(start=13.7, end=15.4, set="brightstudio", trans="wipe", wash=["gold", "red", 0.4],
         panda=dict(pose="zeigestock", world=[0.9, 5.0, 2.3], enter_at=0.3, enter_dir=1, gesture="shake",
                    gesture_at=0.9),
         cards=[dict(type="marker", text="NOCH NICHT VORBEI", color="gold", at=0.25, x=540, y=330, size=112),
                dict(type="emoji2", emoji="warning", color="gold", at=0.45, x=540, y=620, px=170)]),
    dict(start=15.4, end=17.55, set="brightstudio", trans="cut", wash=["violet", "blue", 0.45],
         panda=dict(pose="zeigestock", world=[0.9, 5.0, 2.3], exit_at=0.0, exit_dir=1),
         cards=[dict(type="emoji2", emoji="calendar", color="violet", at=0.15, x=540, y=430, px=230, tilt=-10),
                dict(type="bigstat", at=0.5, x=540, y=820, color="violet", text="1. DEZEMBER", size=160,
                     sub="Huang muss vor den Kongress")]),
    dict(start=17.55, end=19.6, set="brightstudio", trans="cut", wash=["pink", "peach", 0.42],
         panda=dict(pose="mikrofon", world=[0.4, 5.0, 2.3], enter_at=0.0, enter_dir=-1, gesture="nod",
                    gesture_at=0.5),
         cards=[dict(type="emoji2", emoji="bell", color="pink", at=0.1, x=540, y=360, px=200, tilt=-16),
                dict(type="marker", text="FOLG FÜR MEHR", color="pink", at=0.3, x=540, y=630, size=110)]),
]
cues = [[0.0, "riser2", 0.45], [0.2, "air_short", 0.5], [1.5, "air", 0.6], [3.08, "pop", 0.6], [3.62, "ping_up", 0.6],
        [3.9, "swish", 0.8], [4.0, "air", 0.6], [4.25, "pop", 0.5], [5.8, "cash", 0.55], [6.6, "air_short", 0.6],
        [6.9, "pop", 0.45], [8.15, "swish", 0.5], [8.45, "ping_up", 0.55], [10.1, "air_short", 0.4],
        [10.2, "ping_down", 0.55], [11.62, "impact", 0.7], [12.1, "pop", 0.5], [13.62, "swish", 0.8],
        [13.75, "air", 0.6], [14.0, "pop", 0.5], [15.35, "air_short", 0.55], [15.55, "pop", 0.5], [15.95, "click", 0.45],
        [17.5, "air_short", 0.55], [17.65, "pop", 0.5], [17.9, "ping_up", 0.5]]
spec = dict(audio=sys.argv[2], duration=19.6, words=words, shots=shots, campath=campath, shake=0.04,
            header_style="none", cap_style="word", cap_y=1360, cap_size=46, min_head=900,
            wipe_cols=["gold", "pink", "blue", "green"], sfx_rel=0.6, master_lufs=-14.0, no_riser=True, cues=cues,
            music=dict(bpm=104, rel_db=-20, duck_db=-7, intensity=[[0, 0.7], [3, 0.9], [9.5, 0.7], [11.6, 0.85],
                                                                  [17.5, 0.95], [19.6, 0.9]]))
json.dump(spec, open(sys.argv[3], "w"), ensure_ascii=False, indent=1)
