"""Removes breaths and tightens pauses in a voice-over recording.

Usage: python3 scripts/clean-voice.py <in-audio> <out.wav> [--tight] [--report]

Speech is located by voicing (pitch periodicity), so breaths - loud but
unpitched noise - are not mistaken for words. Each voiced run is widened a
little to keep unvoiced consonants (s, t, f, sch) at word edges. Everything
between speech runs is a gap: short gaps inside a phrase are kept as recorded,
longer ones are replaced by clean silence of a fixed length, which removes
breaths and makes the read feel continuous:

  gap < 0.25 s          kept as is (inside a phrase)
  0.25 s <= gap < 0.6 s -> 0.22 s (comma / short breath)
  0.6 s  <= gap < 1.0 s -> 0.32 s (sentence)
  gap >= 1.0 s          -> 0.50 s (paragraph = new scene)

--tight (Short-Video-Flow, keine hoerbare Stille): every gap of 0.10 s or more
is cut out completely and word edges are trimmed closer; only the tiny gaps
inside words stay as recorded.

Prints the kept speech spans and the new paragraph-pause positions (useful as
scene boundaries) as JSON.
"""
import json
import subprocess
import sys
import tempfile

import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 44100
HOP = 0.01
KEEP_BELOW = 0.25
SHORT, SENTENCE, PARAGRAPH = 0.22, 0.32, 0.50
PRE_ONSET, POST_OFFSET = 0.10, 0.14
TIGHT_MIN, TIGHT_GAP = 0.10, 0.0
FADE = 0.012

src, dst = sys.argv[1], sys.argv[2]
report = "--report" in sys.argv
tight = "--tight" in sys.argv
if tight:
    PRE_ONSET, POST_OFFSET = 0.06, 0.08

with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-ac", "1", "-ar", str(SR), tmp.name], check=True)
    _, x = wavfile.read(tmp.name)
x = x.astype(np.float32) / 32768

hop = int(HOP * SR)
n = len(x) // hop
frames = x[: n * hop].reshape(n, hop)
level = 20 * np.log10(np.sqrt((frames**2).mean(1)) + 1e-9)

# Voicing: normalised autocorrelation peak in the 70-400 Hz pitch range on a 40 ms window.
low = signal.sosfiltfilt(signal.butter(4, [70, 1000], "band", fs=SR, output="sos"), x)
win = int(0.04 * SR)
lag_lo, lag_hi = SR // 400, SR // 70
voiced_strength = np.zeros(n)
for i in range(n):
    c = i * hop + hop // 2
    seg = low[max(0, c - win // 2) : c + win // 2]
    if len(seg) < win or level[i] < -45:
        continue
    seg = seg - seg.mean()
    ac = np.correlate(seg, seg, "full")[len(seg) - 1 :]
    if ac[0] <= 0:
        continue
    voiced_strength[i] = (ac[lag_lo:lag_hi] / ac[0]).max()

speech_level = np.median(level[voiced_strength > 0.5]) if (voiced_strength > 0.5).any() else -20
voiced = (voiced_strength > 0.5) & (level > speech_level - 18)

# Close holes inside words (plosive closures, short unvoiced consonants).
mask = voiced.copy()
i = 0
while i < n:
    if not mask[i]:
        j = i
        while j < n and not mask[j]:
            j += 1
        if 0 < i and j < n and (j - i) * HOP < 0.12:
            mask[i:j] = True
        i = j
    else:
        i += 1

# Widen runs to keep word-edge consonants, but only over audible frames.
floor = speech_level - (24 if tight else 30)
wide = mask.copy()
for i in range(1, n):
    if mask[i] and not mask[i - 1]:
        k = i - 1
        while k >= 0 and (i - k) * HOP <= PRE_ONSET and level[k] > floor:
            wide[k] = True
            k -= 1
for i in range(n - 1):
    if mask[i] and not mask[i + 1]:
        k = i + 1
        while k < n and (k - i) * HOP <= POST_OFFSET and level[k] > floor:
            wide[k] = True
            k += 1

runs = []
i = 0
while i < n:
    if wide[i]:
        j = i
        while j < n and wide[j]:
            j += 1
        runs.append([i * HOP, j * HOP])
        i = j
    else:
        i += 1
# Drop isolated blips (clicks, lip smacks) far from any speech.
runs = [r for r in runs if r[1] - r[0] >= 0.08]

# Phrases = runs separated by less than KEEP_BELOW. A phrase that never gets near
# speech loudness is a breath, exhale or mouth noise, not words.
phrases, cur = [], [runs[0]] if runs else []
for r in runs[1:]:
    if r[0] - cur[-1][1] < KEEP_BELOW:
        cur.append(r)
    else:
        phrases.append(cur)
        cur = [r]
if cur:
    phrases.append(cur)
dropped = []
kept = []
for ph in phrases:
    peak = level[int(ph[0][0] / HOP) : int(ph[-1][1] / HOP)].max()
    if peak < speech_level - 12:
        dropped.append({"at": round(ph[0][0], 2), "len": round(ph[-1][1] - ph[0][0], 2), "peakDb": round(float(peak), 1)})
    else:
        kept.extend(ph)
runs = kept
if not runs:
    sys.exit("no speech found")


def fade(seg):
    f = min(int(FADE * SR), len(seg) // 2)
    if f > 0:
        ramp = np.linspace(0, 1, f, dtype=np.float32)
        seg[:f] *= ramp
        seg[-f:] *= ramp[::-1]
    return seg


out = [np.zeros(int(0.15 * SR), np.float32)]
t_out = 0.15
paragraphs = []
removed = []
spans = []
for k, (a, b) in enumerate(runs):
    if k > 0:
        gap = a - runs[k - 1][1]
        if gap < (TIGHT_MIN if tight else KEEP_BELOW):
            piece = x[int(runs[k - 1][1] * SR) : int(a * SR)].copy()
            out.append(piece)
            t_out += len(piece) / SR
        else:
            if tight:
                new = TIGHT_GAP
            else:
                new = SHORT if gap < 0.6 else SENTENCE if gap < 1.0 else PARAGRAPH
            gap_audio = x[int(runs[k - 1][1] * SR) : int(a * SR)]
            out.append(np.zeros(int(new * SR), np.float32))
            if gap >= 1.0:
                paragraphs.append(round(t_out + new / 2, 2))
            t_out += new
            removed.append({"at": round(runs[k - 1][1], 2), "len": round(gap, 2), "nextStart": round(t_out, 2), "peakDb": round(float(20 * np.log10(np.abs(gap_audio).max() + 1e-9)), 1)})
    piece = fade(x[int(a * SR) : int(b * SR)].copy())
    spans.append([round(t_out, 2), round(t_out + len(piece) / SR, 2)])
    out.append(piece)
    t_out += len(piece) / SR
out.append(np.zeros(int(0.3 * SR), np.float32))

y = np.concatenate(out)
wavfile.write(dst, SR, (np.clip(y, -1, 1) * 32767).astype(np.int16))

result = {
    "inLength": round(len(x) / SR, 2),
    "outLength": round(len(y) / SR, 2),
    "gapsShortened": len(removed),
    "noisesRemoved": dropped,
    "paragraphPauses": paragraphs,
    "voicedKept": round(float(voiced[[any(int(a / HOP) <= i < int(b / HOP) for a, b in runs) for i in range(n)]].sum() / max(1, voiced.sum())), 4),
}
if report:
    result["removedGaps"] = removed
print(json.dumps(result, indent=2))
