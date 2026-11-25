"""20-s test in the GTA-style 'Vice City' world: Jensen Huang returns to Nvidia, the stock jumps.

    python3 examples/nvidia_comeback_vicecity_spec.py words.json voice.wav out.json
One continuous camera flight through the city (campath) with a zoom-cut into the boardroom.
"""
import json
import sys

words = json.load(open(sys.argv[1]))
GREEN, RED, BLUE = [40, 176, 92], [228, 56, 66], [52, 120, 246]
PINK, CYAN = [255, 70, 170], [40, 200, 240]

campath = [
    dict(t=0.0, pos=[-70, 60, -90], target=[6, 6, 40], fov=55, whoosh="air_long", whoosh_at=0.05, gain=0.8),
    dict(t=2.4, pos=[2.6, 2.1, 6.0], target=[8.6, 3.2, 15.5], fov=52, ease="out"),
    dict(t=4.0, pos=[3.6, 2.0, 7.6], target=[8.8, 3.3, 15.5], fov=50, whoosh="air", whoosh_at=-0.2),
    dict(t=5.4, pos=[-14, 26, 52], target=[13, 42, 81], fov=50, ease="out"),
    dict(t=6.75, pos=[-8, 34, 62], target=[13, 42, 81], fov=46),
    dict(t=9.55, pos=[-0.5, 2.1, 108.5], target=[-6.8, 3.0, 116], fov=52, whoosh="air", whoosh_at=-0.1),
    dict(t=11.6, pos=[-2.0, 2.0, 110.0], target=[-6.8, 3.0, 116], fov=50),
    dict(t=13.15, pos=[-2.4, 2.0, 110.6], target=[-6.8, 3.0, 116], fov=49, whoosh="air", whoosh_at=0.2),
    dict(t=14.2, pos=[-11.5, 2.1, 188.5], target=[-18.5, 3.2, 196], fov=52, ease="out"),
    dict(t=17.6, pos=[-13.6, 2.0, 190.6], target=[-18.5, 3.1, 196], fov=50),
]

shots = [
    dict(start=0.0, end=4.0, set="vicecity", trans="cut",
         panda=dict(pose="mikrofon", world=[8.3, 15.5, 2.4], seed=0.3),
         cards=[dict(type="title", at=0.35, x=540, y=330, w=880, h=210, kicker="BREAKING · NVIDIA",
                     text="HUANG IST ZURÜCK", glow=["green", "pink"]),
                dict(type="kpi", at=2.95, x=540, y=600, w=640, h=210, kicker="NVIDIA-AKTIE", **{"from": 0},
                     to=30, fmt="+{} %", count_at=0.1, count_end=0.75, col=GREEN, glow=["green", "mint"])]),
    dict(start=4.0, end=6.75, set="vicecity", trans="cut",
         cards=[dict(type="kpi", at=0.55, x=540, y=330, w=860, h=250, kicker="BÖRSENWERT",
                     **{"from": 0}, to=920, fmt="+{} MRD. $", count_at=0.9, count_end=1.9, col=GREEN,
                     sub="fast eine Billion Dollar mehr", glow=["green", "gold"], anchor=[12.9, 42, 81],
                     line_col=[60, 255, 150])]),
    dict(start=6.75, end=9.55, set="boardroom", set_args=["VERWALTUNGSRAT", "Abstimmung: einstimmig"], trans="zoom",
         cam={"from": {"pos": [3, 2.6, -3.5], "target": [-6, 2.4, 13], "fov": 55},
              "to": {"pos": [1, 2.3, 1.5], "target": [-9, 3.2, 13], "fov": 52}},
         panda=dict(pose="selbstbewusst", frame="medium_right", seed=1.1),
         cards=[dict(type="title", at=0.35, x=540, y=330, w=840, h=210, kicker="VERWALTUNGSRAT",
                     text="EINSTIMMIG", glow=["green", "blue"])]),
    dict(start=9.55, end=13.7, set="vicecity", trans="zoom",
         panda=dict(pose="zeigen_tablet", world=[-6.8, 116, 2.4], seed=2.0),
         cards=[dict(type="chart", at=0.15, x=540, y=380, w=900, h=420, title="NVIDIA-AKTIE", sub="Freitag",
                     points=[0.8, 0.75, 0.78, 0.66, 0.6, 0.62, 0.44, 0.3, 0.16, 0.08], drop_from=11,
                     draw_at=0.3, draw_end=2.0, badge="−14 % · JAHRESTIEF", badge_at=2.2, glow=["red", "pink"])]),
    dict(start=13.7, end=17.6, set="vicecity", trans="cut",
         panda=dict(pose="zeigestock", world=[-18.5, 196, 2.4], seed=0.7),
         cards=[dict(type="warn", at=0.2, kicker="ABER", lines=["Ganz vorbei", "ist es nicht"], x=540, y=320,
                     w=860, h=240, glow=["red", "gold"], until=1.7),
                dict(type="news", at=2.05, kicker="1. DEZEMBER", lines=["Huang muss", "vor den Kongress"], x=540,
                     y=320, w=860, h=240, glow=["blue", "pink"])]),
    dict(start=17.6, end=19.6, set="vicecity", trans="zoom",
         cam={"from": {"pos": [-12, 1.7, 190], "target": [-420, 58, 470], "fov": 46},
              "to": {"pos": [-12.6, 1.7, 190.6], "target": [-420, 58, 470], "fov": 44}},
         panda=dict(pose="mikrofon", frame="close", seed=0.2),
         cards=[dict(type="icon", icon="bell", at=0.1, x=540, y=420, w=360, h=330, label="FOLGEN!",
                     glow=["gold", "pink"])]),
]
spec = dict(audio=sys.argv[2], duration=19.6, words=words, header="BÖRSENNEWS · 25.11.2026", shots=shots,
            campath=campath, shake=0.05, sfx_rel=0.6, master_lufs=-16.8, cap_y=862, cap_size=40)
json.dump(spec, open(sys.argv[3], "w"), ensure_ascii=False, indent=1)
