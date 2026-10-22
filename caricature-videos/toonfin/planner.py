"""Turn timed words into a shot list: which caricature scene plays when.

The plan is plain JSON so it can be tweaked by hand (swap a template, fix a
headline) and re-rendered without redoing transcription or TTS.
"""
import re

# Priority-ordered keyword stems per scene (German + English).
RULES = [
    ("outro", ["folg", "abonnier", "abo ", "follow", "subscribe", "teil 2", "part 2", "kommentier"]),
    ("crash", ["crash", "absturz", "abgestürzt", "stürzt", "einbruch", "pleite", "panik", "rezession",
               "bärenmarkt", "bear market", "verlust", "verlier", "collapse", "plunge"]),
    ("bullbear", ["bulle", "bullen", "bär", "bären", "bull ", "bulls", "bears", "käufer", "verkäufer"]),
    ("inflation", ["inflation", "teurer", "kaufkraft", "preise", "entwert", "wertlos", "gelddruck", "druckt",
                   "prices", "purchasing"]),
    ("debt", ["schulden", "kredit", "ratenkauf", "raten", "dispo", "kreditkarte", "leasing", "verschuld",
              "debt", "loan", "credit card"]),
    ("tax", ["steuer", "finanzamt", "abgeltung", "abgaben", "tax"]),
    ("fomo", ["fomo", "hype", "herde", "gier", "meme", "alle kaufen", "jeder kauft", "trend", "greed"]),
    ("moon", ["mond", "moon", "rakete", "rally", "allzeithoch", "verdoppel", "verzehnfach", "explodier",
              "steigt", "gestiegen", "skyrocket", "to the moon"]),
    ("save", ["spar", "notgroschen", "rücklage", "zurücklegen", "saving", "save "]),
    ("compound", ["zinseszins", "compound", "exponentiell", "schneeball", "langfristig", "jahrzehnt", "etf",
                  "wächst", "wachstum", "snowball"]),
    ("bank", ["bank", "banker", "gebühr", "provision", "berater", "ezb", "fed ", "zentralbank", "fees"]),
    ("moneyrain", ["reich", "millionär", "million", "passives einkommen", "cashflow", "dividende",
                   "ausschüttung", "finanzielle freiheit", "rich", "wealth"]),
]
POS = ["steig", "gewinn", "plus", "reich", "wachs", "wächst", "frei", "mond", "rally", "profit", "verdoppel",
       "rendite", "besser", "smart", "clever", "spar", "zinseszins", "gain", "grow", "rich", "dividend", "win"]
NEG = ["crash", "fall", "fäll", "verlust", "verlier", "minus", "schulden", "teuer", "inflation", "pleite", "angst",
       "risiko", "gebühr", "steuer", "weniger", "wertlos", "abzock", "kredit", "panik", "loss", "debt", "fee",
       "tax", "fear", "lose", "hype", "gier"]
SERIOUS = ["crash", "verlust", "pleite", "angst", "risiko", "gefahr", "warnung", "achtung", "schulden",
           "rezession", "krise", "loss", "danger", "warning", "crisis"]
NEGATIONS = {"kein", "keine", "keinen", "keiner", "nicht", "ohne", "no", "not", "never", "nie"}
STOP = {"der", "die", "das", "und", "oder", "aber", "ein", "eine", "einen", "dem", "den", "des", "ist", "sind",
        "the", "and", "for", "with", "you", "your", "dein", "deine", "deinen", "mit", "von", "auf", "für", "nicht",
        "auch", "noch", "dann", "wenn", "weil", "dass", "wird", "werden", "kann", "jeden", "jedes", "jede"}

NUM_RE = re.compile(
    r"(?:(\$)\s?(\d[\d.,]*\d|\d)|(\d[\d.,]*\d|\d)\s*(%|prozent|percent|€|euro|\$|dollar|jahren|jahre|years|"
    r"monaten|monate|months|tagen|tage|days|mal|x|millionen|million|mio|tausend|k)?)",
    re.IGNORECASE)
UNIT = {"prozent": "%", "percent": "%", "euro": "€", "dollar": "$", "jahren": "Jahre", "jahre": "Jahre",
        "years": "years", "monaten": "Monate", "monate": "Monate", "months": "months", "tagen": "Tage",
        "tage": "Tage", "days": "days", "millionen": "Mio.", "million": "Mio.", "mio": "Mio.",
        "tausend": "Tsd.", "mal": "x", "x": "x", "k": "k"}


def norm(w):
    return re.sub(r"[^\wäöüß€$%.,]", "", w.lower())


def find_numbers(text):
    """All number phrases, best first: money/percent > other units > bare numbers."""
    found = []
    for m in NUM_RE.finditer(text):
        if m.group(1):
            s, u = "$" + m.group(2), "$"
        else:
            unit = (m.group(4) or "").lower()
            u = UNIT.get(unit, m.group(4) or "")
            s = m.group(3) + ("%" if u == "%" else (" " + u if u else ""))
        score = 2 if u in ("%", "€", "$") else 1 if u else 0
        found.append((score, -len(found), s.strip(), u, m.group(0).strip()))
    found.sort(reverse=True)
    return [(s, u, raw) for _, _, s, u, raw in found]


def find_number(text):
    nums = find_numbers(text)
    return nums[0][0] if nums else ""


def match_rule(text):
    low = " " + text.lower() + " "
    for name, stems in RULES:
        for st in stems:
            if st.endswith(" ") or " " in st.strip():
                if st in low:
                    return name, st.strip()
            else:
                for m in re.finditer(r"[\s\-(\"'„]" + re.escape(st), low):
                    before = low[:m.start()].split()[-1:]
                    if before and before[0] in NEGATIONS:
                        continue  # "keine Panik" is not a crash
                    return name, st
    return None, None


def keyword_word(text, stem):
    for w in re.findall(r"[\wäöüÄÖÜß\-]+", text):
        if w.lower().startswith(stem.split()[0]):
            return w
    return stem


def noun_headline(text):
    words = re.findall(r"[\wäöüÄÖÜß\-]+", text)
    caps = [w for i, w in enumerate(words) if i > 0 and w[:1].isupper() and w.lower() not in STOP]
    pool = caps or [w for w in words if w.lower() not in STOP]
    return max(pool, key=len) if pool else text[:20]


def sentiment(text):
    low = text.lower()
    p = sum(low.count(s) for s in POS)
    n = sum(low.count(s) for s in NEG)
    return (p > n) - (n > p)


def split_sentences(words):
    """Group words into sentences at end punctuation (or explicit sentence ids)."""
    out, cur = [], []
    for i, w in enumerate(words):
        cur.append(w)
        nxt = words[i + 1] if i + 1 < len(words) else None
        end = re.search(r"[.!?…]$", w["w"]) and not re.search(r"\d[.,]$", w["w"])
        if "sid" in w:
            end = nxt is None or nxt.get("sid") != w["sid"]
        if end or nxt is None:
            out.append(cur)
            cur = []
    return [s for s in out if s]


def _split_long(sent, max_dur=6.0):
    dur = sent[-1]["e"] - sent[0]["s"]
    if dur <= max_dur or len(sent) < 6:
        return [sent]
    mid = len(sent) // 2
    best = None
    for i in range(2, len(sent) - 2):
        if sent[i]["w"].endswith((",", ";", ":", "–", "-")):
            if best is None or abs(i - mid) < abs(best - mid):
                best = i
    if best is None and dur < 8.5:
        return [sent]  # no natural break: one longer shot beats a cut mid-phrase
    cut = (best + 1) if best is not None else mid
    return _split_long(sent[:cut], max_dur) + _split_long(sent[cut:], max_dur)


def build(words, fmt="short", lang="de", fps=30, audio="", duration=None, forced=None, music="auto"):
    forced = forced or {}
    if duration:
        words = [w for w in words if w["s"] < duration]
    sents = split_sentences(words)
    groups = []
    for si, s in enumerate(sents):
        for part in _split_long(s):
            groups.append((si, part))
    # very short sentences ("Und die Bank?") ride along with the next one
    merged, carry = [], None
    for gi, (si, part) in enumerate(groups):
        if carry:
            si, part = carry[0], carry[1] + part
            carry = None
        d = part[-1]["e"] - part[0]["s"]
        if d < 0.9 and gi + 1 < len(groups) and si not in forced:
            carry = (si, part)
        else:
            merged.append((si, part))
    groups = merged

    full_text = " ".join(w["w"] for w in words)
    coin_sym = "₿" if re.search(r"bitcoin|krypto|crypto|btc", full_text, re.I) else ("$" if lang == "en" else "€")
    end_time = duration or (words[-1]["e"] + 0.8 if words else 3.0)

    scenes, prev, board_flip = [], None, 0
    serious_votes = 0
    for gi, (si, part) in enumerate(groups):
        text = " ".join(w["w"] for w in part)
        number = own_number = find_number(text)
        sent_text = " ".join(w["w"] for w in sents[si])
        rule, stem = match_rule(text)
        tmpl = forced.get(si) if gi == 0 or groups[gi - 1][0] != si else None
        is_forced = tmpl is not None
        if not tmpl:
            if gi == 0:
                tmpl = "hook"
            elif rule == "outro" and gi < len(groups) - 2:
                tmpl = "explain"
            else:
                tmpl = rule or ("think" if text.rstrip().endswith("?") else "explain")
        if not is_forced and tmpl == prev and tmpl != "explain":
            tmpl = "explain"
        if not number and tmpl in ("tax", "inflation", "moon", "debt", "save"):
            number = find_number(sent_text)  # the figure may sit in the other half of a split sentence
        variant = ""
        if tmpl == "explain":
            if number:
                variant = "stat"
            else:
                variant = "board" if board_flip % 2 == 0 else "bubble"
                board_flip += 1
            if prev == "explain" and variant == "stat" and scenes and scenes[-1]["variant"] == "stat":
                variant = "bubble"
        kw = keyword_word(text, stem) if stem else ""
        headline = own_number or (kw.upper() if kw else noun_headline(text).upper())
        nums = find_numbers(text)
        other = next((raw for n, u, raw in nums[1:] if u and u not in ("%", "€", "$")), "")
        sub = (("in " + other) if other and lang == "de" else other or kw or noun_headline(text)).upper() \
            if number else ""
        hook_text = text if len(text.split()) <= 10 else " ".join(text.split()[-6:])
        sen = sentiment(text)
        serious = any(st in text.lower() for st in SERIOUS)
        serious_votes += 1 if serious else -1 if sen > 0 else 0
        emph = []
        for w in part:
            nw = norm(w["w"])
            if (re.search(r"\d", nw) or (stem and nw.startswith(stem.split()[0])) or w["w"].endswith("!")
                    or (len(w["w"]) > 3 and w["w"].isupper())):
                emph.append(round(w["s"], 3))
        start = 0.0 if gi == 0 else part[0]["s"] - 0.05
        scenes.append(dict(
            template=tmpl, variant=variant, start=round(start, 3), end=None, text=text,
            headline=headline, sub=sub, hook_text=hook_text, number=number, sentiment=sen,
            mood="serious" if serious else "funny", seed=gi * 7 + 3, emph=emph[:4],
            coin_sym=coin_sym, lang=lang, cta="FOLGEN!" if lang == "de" else "FOLLOW!",
            bank_label=(kw.upper() if tmpl == "bank" and kw and len(kw) <= 10 and kw.lower() != "banker"
                        else "BANK"),
        ))
        prev = tmpl
    for i, sc in enumerate(scenes):
        sc["end"] = round(scenes[i + 1]["start"] if i + 1 < len(scenes) else end_time, 3)
    for i, sc in enumerate(scenes):
        if sc["end"] - sc["start"] < 0.3 and i:
            scenes[i - 1]["end"] = sc["end"]
    scenes = [sc for sc in scenes if sc["end"] - sc["start"] >= 0.3]

    kw_words = []
    for w in words:
        nw = norm(w["w"])
        tag = ""
        if re.search(r"\d", nw):
            tag = "num"
        elif any(nw.startswith(st) for st in POS if len(st) > 3):
            tag = "pos"
        elif any(nw.startswith(st) for st in NEG if len(st) > 3):
            tag = "neg"
        kw_words.append(dict(w=w["w"], s=round(w["s"], 3), e=round(w["e"], 3), tag=tag))

    W, H = (1080, 1920) if fmt == "short" else (1920, 1080)
    return dict(version=1, format=fmt, width=W, height=H, fps=fps, lang=lang, audio=str(audio),
                duration=round(end_time, 3), music=music if music != "auto" else
                ("serious" if serious_votes > 0 else "funny"),
                pip=None, words=kw_words, scenes=scenes)
