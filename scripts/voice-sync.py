"""Suggests scene durations that sync the video to a voice-over recording.

Usage: python3 scripts/voice-sync.py public/voice.mp3 blocks.txt
blocks.txt: the spoken text, one block per scene plus the outro as the last
block, blocks separated by a blank line (numbers written as spoken words work
best, but digits are fine).

How it works: the speaking rate is taken as uniform, so each block's share of
letters gives an expected boundary; that is then snapped to the nearest real
breathing pause in the recording. Each scene starts LEAD seconds before its
sentence so the camera flight lands as the topic is named.
Prints durationInSeconds per scene and outroSeconds for src/data/episode.ts.
"""
import json
import re
import subprocess
import sys
import tempfile

import numpy as np
from scipy import signal
from scipy.io import wavfile

INTRO = 40 / 30
LEAD = 0.5
TAIL = 1.0

voice, blocks_file = sys.argv[1], sys.argv[2]
blocks = [b.strip() for b in open(blocks_file, encoding="utf-8").read().split("\n\n") if b.strip()]
if len(blocks) < 2:
    sys.exit("need at least one scene block plus the outro block")

with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", voice, "-ac", "1", "-ar", "16000", tmp.name], check=True)
    sr, x = wavfile.read(tmp.name)
x = x.astype(np.float32) / 32768
y = signal.sosfiltfilt(signal.butter(4, [150, 3500], "band", fs=sr, output="sos"), x)
hop = int(0.01 * sr)
n = len(y) // hop
db = 20 * np.log10(np.array([np.sqrt(np.mean(y[i * hop : (i + 1) * hop] ** 2) + 1e-12) for i in range(n)]))
sm = np.convolve(db, np.ones(5) / 5, mode="same")
active = sm > np.median(sm) - 18
t_on = np.argmax(active) * 0.01
t_off = (n - np.argmax(active[::-1])) * 0.01

# Pauses: stretches clearly below the speech level.
thr = np.median(sm) - 13
pauses = []
i = 0
while i < n:
    if sm[i] < thr:
        j = i
        while j < n and sm[j] < thr:
            j += 1
        if j - i >= 8:
            pauses.append(((i + j) / 2 * 0.01, (j - i) * 0.01))
        i = j
    else:
        i += 1

letters = np.array([len(re.sub(r"[^A-Za-zÄÖÜäöüß0-9]", "", b)) for b in blocks], float)
share = np.cumsum(letters) / letters.sum()
starts = [t_on]
for k in range(len(blocks) - 1):
    # Re-estimate from the previous snapped boundary to avoid drift.
    remaining = letters[k:].sum()
    rate = (t_off - starts[-1]) / remaining
    est = starts[-1] + letters[k] * rate
    near = [p for p in pauses if abs(p[0] - est) < 2.0 and p[0] > starts[-1] + 1.0]
    best = min(near, key=lambda p: abs(p[0] - est) - 4 * p[1]) if near else (est, 0)
    starts.append(best[0])

scene_starts = [INTRO] + [s - LEAD for s in starts[1:-1]]
outro_start = starts[-1] - LEAD
bounds = scene_starts + [outro_start]
durations = [round(bounds[i + 1] - bounds[i], 3) for i in range(len(bounds) - 1)]
result = {
    "voiceStarts": [round(s, 2) for s in starts],
    "durationInSeconds": durations,
    "outroSeconds": round(t_off + TAIL - outro_start, 3),
    "voiceLength": round(len(x) / sr, 2),
}
print(json.dumps(result, indent=2))
if min(durations) < 3:
    print("WARNING: a scene is shorter than 3 s - merge it or re-check the blocks.", file=sys.stderr)
