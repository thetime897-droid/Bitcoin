"""20-s example: bright, transforming 3D studio (reference look), real overlays, panda leaves for key info.

    python3 examples/nvidia_bright_studio_spec.py words.json voice.wav out.json
One continuous camera flight through the zones of `brightstudio` (hall -> boardroom -> circuit wall -> hall).
"""
import json
import sys

words = json.load(open(sys.argv[1]))
SCREEN_A = [[-4.7, 7.7, 19.78], [4.7, 7.7, 19.78], [4.7, 1.9, 19.78], [-4.7, 1.9, 19.78]]

campath = [
    dict(t=0.0, pos=[0, 3.0, -9], target=[0, 3.6, 20], fov=56),
    dict(t=2.2, pos=[0, 1.7, -2.2], target=[0, 3.4, 20], fov=52, ease="out"),
    dict(t=4.0, pos=[0.3, 1.7, -1.6], target=[0, 3.5, 20], fov=51, whoosh="air", whoosh_at=0.0),
    dict(t=5.0, pos=[0, 4.6, 2.2], target=[0, 4.6, 20], fov=52, ease="out"),
    dict(t=6.65, pos=[0, 4.6, 3.4], target=[0, 4.6, 20], fov=52, whoosh="air_long", whoosh_at=-0.05),
    dict(t=7.7, pos=[45, 1.8, -2.0], target=[45, 2.9, 20], fov=52, ease="out"),
    dict(t=9.5, pos=[45.6, 1.8, -1.2], target=[45, 2.9, 20], fov=51, whoosh="air_long", whoosh_at=-0.05),
    dict(t=10.5, pos=[-45, 2.0, 1.0], target=[-45, 7.0, 22], fov=54, ease="out"),
    dict(t=13.7, pos=[-45, 2.2, 3.0], target=[-45, 7.2, 22], fov=52, whoosh="air_long", whoosh_at=-0.05),
    dict(t=14.6, pos=[2.4, 1.7, -1.6], target=[-0.4, 3.4, 20], fov=52, ease="out"),
    dict(t=17.55, pos=[1.6, 1.7, -1.2], target=[-0.3, 3.4, 20], fov=51, whoosh="air", whoosh_at=0.0),
    dict(t=19.6, pos=[0, 6.5, -14], target=[0, 3.0, 15], fov=56),
]

shots = [
    dict(start=0.0, end=4.0, set="brightstudio", trans="cut",
         panda=dict(pose="mikrofon", world=[0, 5.0, 2.3], gesture="idle", seed=0.2),
         cards=[dict(type="logo", logo="nvidia", word="NVIDIA", at=0.3, screen=SCREEN_A, w=940, h=580, px=300,
                     word_size=110),
                dict(type="headline", text="+30 %", tone="up", sub="Nvidia-Aktie nach Huangs Rückkehr", at=3.05,
                     x=540, y=420, size=170),
                dict(type="emoji", emoji="chart_increasing", at=2.95, x=820, y=300, px=190, tilt=-12)]),
    dict(start=4.0, end=6.65, set="brightstudio", trans="cut",
         panda=dict(pose="zeigen", world=[0, 5.0, 2.3], exit_at=0.05, exit_dir=1),
         cards=[dict(type="stockchart", screen=SCREEN_A, at=0.0, w=940, h=580, title="NVIDIA",
                     sub="Börsenwert in Billionen Dollar", logo="nvidia", tone="up",
                     points=[0.78, 0.84, 0.8, 0.7, 0.62, 0.55, 0.42, 0.3, 0.18, 0.12, 0.08, 0.92], draw_at=0.4, draw_end=1.7,
                     xlabels=["9.11.", "16.11.", "Fr 20.11.", "heute"], tag="3,95 Bio. $"),
                dict(type="headline", text="+920 MRD. $", tone="up", sub="Börsenwert an einem Tag", at=0.9, x=540,
                     y=330, size=150)]),
    dict(start=6.65, end=9.5, set="brightstudio", trans="cut",
         panda=dict(pose="selbstbewusst", world=[45, 5.0, 2.3], enter_at=0.75, enter_dir=-1, gesture="nod",
                    gesture_at=1.6),
         cards=[dict(type="emoji", emoji="chair", at=0.85, x=470, y=330, px=230),
                dict(type="emoji", emoji="up_arrow", at=1.1, x=650, y=320, px=150, tilt=10),
                dict(type="headline", text="EINSTIMMIG", tone="up", sub="wieder Chef und im Verwaltungsrat", at=1.45,
                     x=540, y=560, size=120)]),
    dict(start=9.5, end=13.7, set="brightstudio", trans="cut",
         cards=[dict(type="emoji", emoji="chart_decreasing", at=0.7, x=540, y=360, px=260, tilt=-10),
                dict(type="headline", text="−14 %", tone="down", sub="Freitag · tiefster Stand seit 1 Jahr", at=2.1,
                     x=540, y=640, size=190)]),
    dict(start=13.7, end=17.55, set="brightstudio", trans="cut",
         panda=dict(pose="zeigestock", world=[0.7, 5.0, 2.3], enter_at=0.55, enter_dir=1, gesture="shake",
                    gesture_at=1.1),
         cards=[dict(type="emoji", emoji="warning", at=0.75, x=540, y=330, px=210, until=1.7),
                dict(type="emoji", emoji="classical_building", at=1.85, x=540, y=320, px=230),
                dict(type="headline", text="1. DEZEMBER", tone="gold", sub="Huang muss vor den Kongress", at=2.05,
                     x=540, y=560, size=120)]),
    dict(start=17.55, end=19.6, set="brightstudio", trans="cut",
         panda=dict(pose="mikrofon", world=[0.7, 5.0, 2.3], gesture="nod", gesture_at=0.2),
         cards=[dict(type="emoji", emoji="bell", at=0.15, x=540, y=380, px=230, tilt=-15),
                dict(type="headline", text="FOLGEN", tone="gold", sub="für mehr Börsen-News", at=0.3, x=540, y=600,
                     size=110)]),
]
spec = dict(audio=sys.argv[2], duration=19.6, words=words, shots=shots, campath=campath, shake=0.03,
            header_style="bar", brand="panda_investiert", header="25.11.2026", header_tag="BREAKING",
            cap_style="word", cap_y=1420, cap_size=44, sfx_rel=0.6, master_lufs=-14.0, no_riser=True,
            cues=[[0.0, "riser2", 0.45], [3.05, "ping_up", 0.6], [4.95, "click", 0.4], [5.55, "cash", 0.5],
                  [7.5, "click", 0.4], [8.1, "ping_up", 0.55], [10.2, "ping_down", 0.6], [11.6, "impact", 0.6],
                  [14.45, "click", 0.4], [15.75, "click", 0.4], [17.7, "ping_up", 0.5]],
            music=dict(bpm=96, rel_db=-21, duck_db=-7, intensity=[[0, 0.55], [3, 0.8], [9.5, 0.6], [11.6, 0.75],
                                                                 [17.5, 0.85], [19.6, 0.8]]))
json.dump(spec, open(sys.argv[3], "w"), ensure_ascii=False, indent=1)
