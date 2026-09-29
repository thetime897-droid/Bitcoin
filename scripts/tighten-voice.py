"""Removes pauses and breaths from a voice-over so the video keeps its pace.

Usage: python3 scripts/tighten-voice.py <input audio> public/voice.mp3 [break,times,...]

Every non-speech stretch (silence or an unvoiced breath) longer than MIN_GAP
is cut down to KEEP seconds, from the middle with a short crossfade, so word
endings stay intact and nothing clicks. Optional scene-break times (seconds in
the input, e.g. from voice-sync.py) keep BREAK_KEEP instead. The voice is also
brought to TARGET_LUFS so music and effects sit exactly as in earlier episodes.
Prints the new length and where the scene breaks moved to.
"""
import json
import subprocess
import sys
import tempfile

import numpy as np
from scipy.io import wavfile

MIN_GAP = 0.1
KEEP = 0.07
BREAK_KEEP = 0.15
FADE = 0.012
TARGET_LUFS = -18.8

src, dst = sys.argv[1], sys.argv[2]
breaks = [float(t) for t in sys.argv[3].split(",")] if len(sys.argv) > 3 else []

with tempfile.TemporaryDirectory() as tmp:
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-ac", "1", "-ar", "48000", f"{tmp}/in.wav"], check=True)
    sr, x = wavfile.read(f"{tmp}/in.wav")
x = x.astype(np.float32) / 32768

# Per 10 ms: overall level and voicing (low harmonics vs. hiss).
hop = int(0.01 * sr)
n = len(x) // hop
spec = np.abs(np.fft.rfft(x[: n * hop].reshape(n, hop) * np.hanning(hop), axis=1)) ** 2
f = np.fft.rfftfreq(hop, 1 / sr)
level = 10 * np.log10(spec[:, (f > 100) & (f < 8000)].sum(1) + 1e-12)
voicing = 10 * np.log10((spec[:, (f > 80) & (f < 500)].sum(1) + 1e-12) / (spec[:, (f > 1500) & (f < 6000)].sum(1) + 1e-12))
level = np.convolve(level, np.ones(3) / 3, mode="same")
voicing = np.convolve(voicing, np.ones(5) / 5, mode="same")
speech = np.percentile(level, 75)
silent = level < speech - 30
breath = (level < speech - 12) & (voicing < 5)
nonspeech = silent | breath

speaking = np.flatnonzero(~nonspeech)
on, off = speaking[0] * hop, (speaking[-1] + 1) * hop

gaps = []
i = on // hop
while i < off // hop:
    if nonspeech[i]:
        j = i
        while j < n and nonspeech[j]:
            j += 1
        if (j - i) / 100 > MIN_GAP:
            gaps.append((i * hop, j * hop))
        i = j
    else:
        i += 1

keep = [[max(0, on - int(0.05 * sr)), None]]
break_src = []
for a, b in gaps:
    is_break = any(a / sr - 0.4 <= t <= b / sr + 0.4 for t in breaks)
    half = int((BREAK_KEEP if is_break else KEEP) * sr / 2)
    if is_break:
        break_src.append(b - half)
    keep[-1][1] = a + half
    keep.append([b - half, None])
keep[-1][1] = min(len(x), off + int(0.25 * sr))

fade = int(FADE * sr)
ramp = np.sin(np.linspace(0, np.pi / 2, fade)) ** 2
out = x[keep[0][0] : keep[0][1]].copy()
starts = [0]
for a, b in keep[1:]:
    seg = x[a:b]
    out[-fade:] = out[-fade:] * ramp[::-1] + seg[:fade] * ramp
    starts.append(len(out) - fade)
    out = np.concatenate([out, seg[fade:]])


def new_time(t):
    for (a, b), s in zip(keep, starts):
        if a <= t <= b:
            return (s + t - a) / sr
    return None


with tempfile.TemporaryDirectory() as tmp:
    wavfile.write(f"{tmp}/out.wav", sr, (np.clip(out, -1, 1) * 32767).astype(np.int16))
    # Measure, then apply one static gain (plus a safety limiter) - no pumping.
    # Measured as dual-mono stereo, because that is how the video plays it
    # (a mono measurement reads 3 dB quieter than what you hear).
    meas = subprocess.run(
        ["ffmpeg", "-i", f"{tmp}/out.wav", "-af", "pan=stereo|c0=c0|c1=c0,ebur128", "-f", "null", "-"],
        capture_output=True, text=True,
    ).stderr
    lufs = float(meas.rsplit("I:", 1)[1].split("LUFS")[0])
    subprocess.run([
        "ffmpeg", "-y", "-loglevel", "error", "-i", f"{tmp}/out.wav",
        "-af", f"pan=stereo|c0=c0|c1=c0,volume={TARGET_LUFS - lufs:.2f}dB,alimiter=limit=0.89:level=false",
        "-ar", "48000", "-c:a", "libmp3lame", "-b:a", "192k", dst,
    ], check=True)

print(json.dumps({
    "before": round(len(x) / sr, 2),
    "after": round(len(out) / sr, 2),
    "cuts": len(gaps),
    "removedSeconds": round((len(x) - len(out)) / sr, 2),
    "sceneBreaks": [round(new_time(t), 2) for t in break_src],
}, indent=2))
