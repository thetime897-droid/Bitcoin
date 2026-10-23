import json, copy, sys
src = json.load(open(sys.argv[1]))
d = copy.deepcopy(src)
d.update(width=1920, height=1080, cap_words=4, cap_chars=22)
d["layout"] = dict(head_x=1270, head_w=1150, cap_x=1270, cap_w=1240, cap_y=1018, cap_size=60, clip_top=335)
d["panda_pos"] = dict(x=330, y=1050, h=700)
CX, CY = 1270, 615
CARD = {"candles": dict(w=1180, h=580, y=650), "kpi": dict(w=900, h=330, y=600), "bars": dict(w=1000, h=580, y=650),
        "line": dict(w=1000, h=560, y=650), "hbars": dict(w=1000, h=360, y=640), "range": dict(w=1000, h=340, y=640),
        "info": dict(w=820, h=230, y=650), "iconcard": dict(w=640, h=540, y=650), "tiles": dict(y=650),
        "minichart": dict(w=900, h=260, y=600), "stamp": dict(y=600)}
CONTENT = set(CARD) | {"illus"}
for pn in d["panels"]:
    els = pn["elements"]
    kpis = {}
    for e, o in zip(els, src["panels"][d["panels"].index(pn)]["elements"]):
        t = e["type"]
        if t == "headline":
            e["y"] = 138
            e.pop("x", None)
        elif t == "breaking":
            e.update(x=CX, y=600)
        elif t in CARD:
            e.update(x=CX, **CARD[t])
            if t == "kpi":
                kpis[id(e)] = (o, e)
        elif t == "illus":
            if e["kind"] == "hook":
                e.update(x=1720, y=520, s=0.55)
            elif e["kind"] == "cloud":
                e.update(x=CX, y=616, s=0.76)  # tall motif: cloud on top, bucket and value tag below
            else:
                e.update(x=CX, y=640, s=0.93)
    # marker circles follow their KPI card (same offset from the card's left edge)
    for e, o in zip(els, src["panels"][d["panels"].index(pn)]["elements"]):
        if e["type"] == "circle":
            ko, kn = next(iter(kpis.values()))
            e["x"] = kn["x"] - kn["w"] / 2 + (o["x"] - (ko.get("x", 650) - ko.get("w", 700) / 2))
            e["y"] = kn["y"] + (o["y"] - ko.get("y", 720))
    # line chart next to the hook
    if any(e["type"] == "illus" and e["kind"] == "hook" for e in els):
        for e in els:
            if e["type"] == "line":
                e.update(x=1120, w=880)
    # elements that are on screen at the same time go side by side
    cont = [e for e in els if e["type"] in CONTENT and not (e["type"] == "illus" and e["kind"] == "hook")
            and e["type"] != "line" or (e["type"] == "line" and not any(x["type"] == "illus" and x["kind"] == "hook" for x in els))]
    span = lambda e: (e.get("at", 0), e.get("until", 1e9))
    for i, a in enumerate(cont):
        for b in cont[i + 1:]:
            (a0, a1), (b0, b1) = span(a), span(b)
            if a0 < b1 and b0 < a1:
                for e, x in ((a, 985), (b, 1570)):
                    if e.get("_col"):
                        continue
                    e["_col"] = 1
                    e["x"] = x
                    if e["type"] == "illus":
                        e["s"] = 0.6
                    elif "w" in e:
                        e["w"] = min(e["w"], 560)
                        if e["type"] == "iconcard":
                            e["h"] = 440
    for e in els:
        e.pop("_col", None)
json.dump(d, open(sys.argv[2], "w"), ensure_ascii=False, indent=1)
