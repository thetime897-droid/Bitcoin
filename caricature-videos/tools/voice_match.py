"""Corrective 'match EQ' for dull/boxy voice recordings.

Measures the long-term spectrum of the voice, compares it with a typical close-mic studio
speech curve and applies a smooth, limited correction (linear phase, numpy FFT).
python3 voice_match.py in.wav out.wav [max_boost_db=9] [reference.wav]
With a reference file the target curve is that recording's long-term speech spectrum
(e.g. an earlier video whose voice sound you liked) instead of the generic studio curve.
"""
import subprocess
import sys

import numpy as np

SR = 48000
# long-term spectrum of close-mic studio speech, dB relative to the 300-3000 Hz average
TARGET = [(60, -10), (100, -3), (150, -1), (250, 0), (500, -1), (1000, -3), (2000, -6), (3000, -8),
          (4500, -10), (6500, -14), (9000, -19), (12000, -24), (16000, -32)]


def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64)


def ltas(x, n=8192):
    hop = n // 2
    win = np.hanning(n)
    frames = [x[i:i + n] * win for i in range(0, len(x) - n, hop)]
    e = np.array([np.sum(f * f) for f in frames])
    keep = e > np.percentile(e, 40)  # speech frames only
    P = np.mean(np.abs(np.fft.rfft(np.array(frames)[keep], axis=1)) ** 2, axis=0)
    return np.fft.rfftfreq(n, 1 / SR), 10 * np.log10(P + 1e-20)


def smooth_oct(f, db, frac=3):
    out = np.empty_like(db)
    for i, fc in enumerate(f):
        if fc <= 0:
            out[i] = db[i]
            continue
        lo, hi = fc * 2 ** (-1 / (2 * frac)), fc * 2 ** (1 / (2 * frac))
        m = (f >= lo) & (f <= hi)
        out[i] = 10 * np.log10(np.mean(10 ** (db[m] / 10)))
    return out


def main():
    src, dst = sys.argv[1], sys.argv[2]
    max_boost = float(sys.argv[3]) if len(sys.argv) > 3 else 9.0
    x = load(src)
    f, P = ltas(x)
    P = smooth_oct(f, P)
    ref = np.mean(P[(f >= 300) & (f <= 3000)])
    cur = P - ref
    if len(sys.argv) > 4:
        fr, Pr = ltas(load(sys.argv[4]))
        Pr = smooth_oct(fr, Pr)
        tgt = Pr - np.mean(Pr[(fr >= 300) & (fr <= 3000)])
    else:
        tf, tv = zip(*TARGET)
        tgt = np.interp(np.log(np.maximum(f, 20)), np.log(tf), tv)
    corr = np.clip(tgt - cur, -12.0, max_boost)
    corr[f < 70] = np.minimum(corr[f < 70], 0)       # never boost rumble
    corr[f > 7000] = np.minimum(corr[f > 7000], 8)   # air, but don't dig up hiss
    corr[f > 14000] = np.minimum(corr[f > 14000], 2)
    corr = smooth_oct(f, corr, 2)
    # apply as a linear-phase filter on the whole signal
    N = 1 << int(np.ceil(np.log2(len(x) + 8192)))
    F = np.fft.rfftfreq(N, 1 / SR)
    g = 10 ** (np.interp(F, f, corr) / 20)
    y = np.fft.irfft(np.fft.rfft(x, N) * g, N)[:len(x)]
    y *= 0.5 / (np.max(np.abs(y)) + 1e-9)
    pcm = (np.clip(y, -1, 1) * 32767).astype(np.int16)
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-", dst],
                   input=pcm.tobytes(), check=True)
    for a, b in ((100, 200), (200, 400), (800, 1600), (1600, 3200), (3200, 6400), (6400, 10000)):
        m = (f >= a) & (f < b)
        print(f"{a:>5}-{b:<5} before {np.mean(cur[m]):6.1f}  target {np.mean(tgt[m]):6.1f}  eq {np.mean(corr[m]):+5.1f} dB")


if __name__ == "__main__":
    main()
