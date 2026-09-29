"""Word-accurate sync between a voice-over and the video.

Usage: python3 scripts/voice-align.py public/voice.mp3 blocks.txt [cues.txt]

blocks.txt: the spoken text, one block per scene plus the outro as the last
block, separated by blank lines (as in voice-sync.py).
cues.txt (optional): one cue per line, "<scene number> <cue> <keyword>", e.g.
    2 news2 Südkorea      -> 2nd news card of scene 2 appears when "Südkorea" is said
    2 stat1 Hynix         -> 1st stat of scene 2 appears on "Hynix"
    2 region Südkorea     -> pin / state lift of scene 2 appears on "Südkorea"

How it works: a local speech model (scripts/asr-words.mjs) transcribes the
recording in short slices with word timestamps; the transcript is aligned to
the known script letter by letter, so every script word gets a time even when
the model misspells it. Scene k starts LEAD seconds before its first word.
Prints durationInSeconds, outroSeconds and every cue as seconds from its scene
start, ready for src/data/episode.ts (news[].at, stats[].at, regionAt).
"""
import difflib
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from scipy.io import wavfile

INTRO = 40 / 30
LEAD = 0.8
TAIL = 1.0
MAX_SLICE = 11.0

voice, blocks_file = sys.argv[1], sys.argv[2]
cues_file = sys.argv[3] if len(sys.argv) > 3 else None
blocks = [b.strip() for b in open(blocks_file, encoding="utf-8").read().split("\n\n") if b.strip()]

# --- slice the recording at pauses so each piece is short enough for the model
with tempfile.TemporaryDirectory() as tmp:
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", voice, "-ac", "1", "-ar", "16000", f"{tmp}/v.wav"], check=True)
    sr, x = wavfile.read(f"{tmp}/v.wav")
x = x.astype(np.float32) / 32768
hop = sr // 100
n = len(x) // hop
db = 20 * np.log10(np.sqrt(np.mean(x[: n * hop].reshape(n, hop) ** 2, axis=1)) + 1e-9)
quiet = np.convolve(db, np.ones(5) / 5, mode="same") < np.percentile(db, 75) - 25
length = n / 100
cuts = [0.0]
while length - cuts[-1] > MAX_SLICE:
    lo, hi = int((cuts[-1] + 5) * 100), int((cuts[-1] + MAX_SLICE) * 100)
    # Longest quiet run inside the window; fall back to the quietest frame.
    best, run, best_len = None, 0, 0
    for i in range(lo, hi):
        run = run + 1 if quiet[i] else 0
        if run > best_len:
            best, best_len = i - run // 2, run
    cuts.append((best if best is not None else lo + int(np.argmin(db[lo:hi]))) / 100)
cuts.append(length)
slices = ";".join(f"{a:.2f},{b:.2f}" for a, b in zip(cuts, cuts[1:]))
here = Path(__file__).parent
words = json.loads(subprocess.run(["node", str(here / "asr-words.mjs"), voice, slices], capture_output=True, text=True, check=True).stdout)
# Drop obvious model glitches: time running backwards, stretched words.
clean = []
for w in words:
    if (not clean or w["start"] >= clean[-1]["start"]) and w["end"] - w["start"] < 1.5:
        clean.append(w)
words = clean


def norm(s):
    return re.sub(r"[^a-z0-9äöüß]", "", s.lower())


# --- align script words to recognised words, letter by letter
script = []  # (block, word)
for b, text in enumerate(blocks):
    for w in text.split():
        if norm(w):
            script.append((b, w))
a_chars, a_owner = [], []
for i, (_, w) in enumerate(script):
    for c in norm(w):
        a_chars.append(c)
        a_owner.append(i)
b_chars, b_owner = [], []
for j, w in enumerate(words):
    for c in norm(w["text"]):
        b_chars.append(c)
        b_owner.append(j)
sm = difflib.SequenceMatcher(None, "".join(a_chars), "".join(b_chars), autojunk=False)
times = [None] * len(script)
matched = [0] * len(script)
for blk in sm.get_matching_blocks():
    for k in range(blk.size):
        si, wj = a_owner[blk.a + k], b_owner[blk.b + k]
        matched[si] += 1
        t = words[wj]["start"]
        times[si] = t if times[si] is None else min(times[si], t)
# A word counts as found when at least half its letters matched; else interpolate.
known = [i for i, (_, w) in enumerate(script) if matched[i] >= max(2, len(norm(w)) / 2)]
cum = np.cumsum([0] + [len(norm(w)) for _, w in script])
for i in range(len(script)):
    if i in known:
        continue
    prev = max([k for k in known if k < i], default=None)
    nxt = min([k for k in known if k > i], default=None)
    if prev is None or nxt is None:
        times[i] = times[prev if prev is not None else nxt]
        continue
    f = (cum[i] - cum[prev]) / max(1, cum[nxt] - cum[prev])
    times[i] = times[prev] + f * (times[nxt] - times[prev])

block_start = [min(times[i] for i, (b, _) in enumerate(script) if b == k) for k in range(len(blocks))]
# Topic changes sit on a pause: snap each block start to the end of the most
# pronounced pause within SNAP seconds (the model can smear a boundary word).
SNAP = 1.2
pause_ends = []
run = 0
for i in range(n):
    run = run + 1 if quiet[i] else 0
    if run >= 4 and (i + 1 == n or not quiet[i + 1]):
        pause_ends.append(((i + 1) / 100, run))
for k in range(1, len(blocks)):
    near = [p for p in pause_ends if abs(p[0] - block_start[k]) <= SNAP and p[0] > block_start[k - 1] + 1]
    if near:
        block_start[k] = max(near, key=lambda p: p[1] * 3 - abs(p[0] - block_start[k]) * 100)[0]
voice_end = words[-1]["end"] if words else length

scene_starts = [INTRO] + [t - LEAD for t in block_start[1:-1]]
outro_start = block_start[-1] - LEAD
bounds = scene_starts + [outro_start]
durations = [round(bounds[i + 1] - bounds[i], 3) for i in range(len(bounds) - 1)]

cues = {}
if cues_file:
    for line in open(cues_file, encoding="utf-8"):
        if not line.strip() or line.startswith("#"):
            continue
        scene, cue, key = line.split(maxsplit=2)
        k = int(scene) - 1
        hit = next((i for i, (b, w) in enumerate(script) if b == k and norm(key.strip()) in norm(w)), None)
        if hit is None:
            print(f"WARNING: '{key.strip()}' not found in block {scene}", file=sys.stderr)
            continue
        cues.setdefault(scene, {})[cue] = round(times[hit] - bounds[k], 2)

print(json.dumps({
    "wordsFound": f"{len(known)}/{len(script)}",
    "blockStarts": [round(t, 2) for t in block_start],
    "durationInSeconds": durations,
    "outroSeconds": round(voice_end + TAIL - outro_start, 3),
    "cues": cues,
}, indent=2, ensure_ascii=False))
for k in range(len(blocks)):
    heard = " ".join(w["text"] for w in words if block_start[k] - 0.05 <= w["start"] < (block_start[k + 1] if k + 1 < len(blocks) else 1e9) - 0.05)
    print(f"[{k + 1}] {heard}", file=sys.stderr)
