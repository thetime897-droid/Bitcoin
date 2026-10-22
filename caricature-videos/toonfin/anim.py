"""Easing and timing helpers. Everything is a pure function of time."""
import math


def clamp(x, a=0.0, b=1.0):
    return a if x < a else b if x > b else x


def lerp(a, b, k):
    return a + (b - a) * k


def seg(t, t0, t1):
    """0..1 progress of ``t`` through the window [t0, t1]."""
    if t1 <= t0:
        return 1.0 if t >= t1 else 0.0
    return clamp((t - t0) / (t1 - t0))


def ease_out(k):
    return 1 - (1 - k) ** 3


def ease_in(k):
    return k ** 3


def ease_in_out(k):
    return 4 * k ** 3 if k < 0.5 else 1 - (-2 * k + 2) ** 3 / 2


def ease_out_back(k, s=1.9):
    k -= 1
    return 1 + (s + 1) * k ** 3 + s * k ** 2


def spring(k, freq=2.5, damp=5.0):
    """0 -> 1 with a bouncy overshoot; k is time in seconds since start."""
    if k <= 0:
        return 0.0
    return 1 - math.exp(-damp * k) * math.cos(2 * math.pi * freq * k)


def pop(t, t0, dur=0.35):
    """Scale for a sticker popping in at t0 (0 before, overshoots to ~1.2)."""
    if t < t0:
        return 0.0
    return ease_out_back(seg(t, t0, t0 + dur), 2.6)


def wiggle(t, freq=1.0, seed=0.0):
    return (math.sin(t * freq * 6.283 + seed * 1.7) * 0.6
            + math.sin(t * freq * 2.3 * 6.283 + seed * 3.1) * 0.3
            + math.sin(t * freq * 5.1 * 6.283 + seed * 0.7) * 0.1)


def decay(t, t0, length=0.35):
    """1 at t0 fading to 0 after ``length`` seconds (0 before t0)."""
    if t < t0 or t > t0 + length:
        return 0.0
    return 1 - (t - t0) / length
