"""Frame renderer + ffmpeg encoder.

Frames are rendered in parallel worker processes (each frame is a pure
function of the plan and its timestamp) and piped to ffmpeg in order.
"""
import math
import multiprocessing as mp
import subprocess
import sys
import time
from pathlib import Path

import numpy as np
from PIL import Image

from . import audio
from .anim import clamp, seg, ease_out, ease_out_back, decay
from .ink import Ink, INK, WHITE, GOLD, RED, GREEN, PAPER, mix, affine
from .scenes import SCENES, Shot, wrap
from . import props

TAG_COLOR = {"num": GOLD, "pos": GREEN, "neg": RED}


def layout(plan):
    W, H = plan["width"], plan["height"]
    short = H > W
    # shorts use a narrower, closer stage so the caricatures read on a phone
    u = W / 800 if short else H / 880
    return dict(W=W, H=H, short=short, u=u,
                cx=W / 2, cy=H * (0.43 if short else 0.47),
                W2=(W / 2) / u, G=320 if short else 290,
                cap_y=H * (0.735 if short else 0.885) / u,
                cap_size=78 if short else 62, cap_words=3 if short else 6, cap_chars=16 if short else 34)


def caption_chunks(words, lay):
    chunks, cur = [], []
    for i, w in enumerate(words):
        cur.append(i)
        text = " ".join(words[j]["w"] for j in cur)
        nxt = words[i + 1] if i + 1 < len(words) else None
        brk = (len(cur) >= lay["cap_words"] or len(text) >= lay["cap_chars"] or w["w"][-1:] in ".!?,;:"
               or nxt is None or nxt["s"] - w["e"] > 0.5)
        if brk:
            chunks.append(cur)
            cur = []
    out = []
    for k, c in enumerate(chunks):
        s = words[c[0]]["s"]
        e = words[c[-1]]["e"] + 0.25
        if k + 1 < len(chunks):
            ns = words[chunks[k + 1][0]]["s"]
            e = ns if ns - words[c[-1]]["e"] < 0.6 else e
        out.append((s, e, c))
    return out


class Renderer:
    def __init__(self, plan, ss=2, env=None):
        self.plan = plan
        self.ss = ss
        self.lay = layout(plan)
        self.fps = plan["fps"]
        self.words = plan["words"]
        self.chunks = caption_chunks(self.words, self.lay)
        self.env = env if env is not None else np.zeros(int(plan["duration"] * self.fps) + 2)
        self.cues = []
        for sc in plan["scenes"]:
            shot = Shot(dict(sc, dur=sc["end"] - sc["start"]), 0, 0, self.lay)
            self.cues.append([(sc["start"] + t, kind, arg) for kind, t, arg in
                              ((c[0], c[1], c[2]) for c in SCENES[sc["template"]]["cues"](shot))])
        self.bg = {m: self._background(m) for m in ("funny", "serious")}

    def _background(self, mood):
        W, H = self.lay["W"] * self.ss, self.lay["H"] * self.ss
        base = np.array(PAPER if mood == "funny" else (240, 236, 228), dtype=np.float32)
        rng = np.random.default_rng(7)
        small = rng.normal(0, 1, (H // 6 + 1, W // 6 + 1)).astype(np.float32)
        grain = np.array(Image.fromarray(small).resize((W, H), Image.BILINEAR)) * 4.0
        grain += rng.normal(0, 2.5, (H, W)).astype(np.float32)
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        r = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H * 0.45) / (H / 2)) ** 2)
        vig = 1 - (0.10 if mood == "funny" else 0.18) * np.clip(r - 0.35, 0, None) ** 1.6
        img = (base[None, None, :] + grain[..., None]) * vig[..., None]
        return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))

    def scene_at(self, t):
        sc = self.plan["scenes"]
        for i, s in enumerate(sc):
            if s["start"] <= t < s["end"]:
                return i, s
        return len(sc) - 1, sc[-1]

    def frame(self, i):
        t = i / self.fps
        L, ss = self.lay, self.ss
        idx, sc = self.scene_at(t)
        lt = t - sc["start"]
        dur = sc["end"] - sc["start"]
        talk = float(self.env[min(i, len(self.env) - 1)])
        shot = Shot(dict(sc, dur=dur), lt, talk, L)

        # camera: slow push-in, punch-ins on emphasis words, transition, shake
        zoom = 1.0 + 0.05 * shot.p
        for e in sc.get("emph", []):
            if t >= e:
                zoom += 0.07 * math.exp(-(t - e) * 7) * clamp((t - e) / 0.04)
        offx = 0.0
        if idx > 0:
            if idx % 2 == 0:
                zoom *= 1 + 0.32 * (1 - ease_out(seg(lt, 0, 0.3)))
            else:
                offx = (1 - ease_out(seg(lt, 0, 0.3))) * L["W2"] * 2.3
        shx = shy = shr = 0.0
        flash = None
        for cue_list in self.cues[max(0, idx - 1):idx + 1]:
            for ct, kind, arg in cue_list:
                if kind == "shake" and ct <= t < ct + 0.4:
                    k = arg * (1 - (t - ct) / 0.4) ** 2
                    shx += math.sin(t * 91) * k
                    shy += math.cos(t * 77) * k
                    shr += math.sin(t * 53) * k * 0.08
                elif kind == "flash" and ct <= t < ct + 0.3:
                    flash = (arg, 0.5 * (1 - (t - ct) / 0.3))
        u = L["u"] * ss
        base = affine(L["cx"] * ss + (offx + shx) * u, L["cy"] * ss + shy * u, shr, u * zoom)
        img = self.bg[sc.get("mood", "funny")].copy()
        ink = Ink(img, base, boil=i // 3 + idx * 101, ss=ss)
        SCENES[sc["template"]]["draw"](ink, shot)

        if flash:
            img = Image.blend(img, Image.new("RGB", img.size, flash[0]), flash[1])
        ov = Ink(img, affine(L["cx"] * ss, 0, 0, u), boil=i // 3 + 7, ss=ss)
        if idx > 0 and idx % 2 == 1 and lt < 0.3:
            props.speedlines(ov, -L["W2"], L["W2"],
                             [L["H"] / L["u"] * k for k in (0.15, 0.3, 0.45, 0.6, 0.75, 0.9)], t, INK, idx)
        if not SCENES[sc["template"]]["own_headline"] and sc.get("headline"):
            self._headline(ov, sc, lt)
        self._captions(ov, t)
        if self.plan.get("pip"):
            self._pip_ring(ov)
        if L["short"]:
            prog = t / self.plan["duration"]
            ov.d.rectangle((0, 0, img.width * prog, 9 * ss), fill=GOLD)
        if ss != 1:
            img = img.reduce(ss) if isinstance(ss, int) else img.resize((L["W"], L["H"]), Image.LANCZOS)
        return img

    def _headline(self, ov, sc, lt):
        L = self.lay
        k = ease_out_back(seg(lt, 0.08, 0.4), 2.2)
        if k <= 0.01:
            return
        txt = sc["headline"].upper()
        lines = wrap(txt, 14 if L["short"] else 18)[:2]
        size = 62 if L["short"] else 56
        fill = RED if sc.get("sentiment", 0) < 0 else GOLD
        if L["short"]:
            x, y, rot = 0, L["H"] * 0.075 / L["u"], -2.5
        else:
            w = max(ov.text_w(l, size) for l in lines)
            x, y, rot = -L["W2"] + 60 + w / 2 + 30, 85, -2
        w = max(ov.text_w(l, size) for l in lines) + 60
        h = size * 1.1 * len(lines) + 30
        with ov.at(x, y, rot, k):
            ov.rect(-w / 2 + 10, -h / 2 + 12, w / 2 + 10, h / 2 + 12, fill=INK, outline=None, wob=0.5)
            ov.rect(-w / 2, -h / 2, w / 2, h / 2, fill=fill, w=7, r=14)
            for j, l in enumerate(lines):
                ov.text(0, (j - (len(lines) - 1) / 2) * size * 1.1 + 4, l, size, "caption", fill=WHITE, sw=0.12)

    def _captions(self, ov, t):
        L = self.lay
        cur = None
        for s, e, c in self.chunks:
            if s <= t < e:
                cur = (s, e, c)
                break
        if not cur:
            return
        s, e, c = cur
        size = L["cap_size"]
        words = [self.words[j] for j in c]
        texts = [w["w"].upper().strip(",;:") for w in words]
        space = size * 0.32
        widths = [ov.text_w(tx, size) for tx in texts]
        maxw = L["W2"] * 1.8
        lines, line, lw = [], [], 0.0
        for j, wd in enumerate(widths):
            if line and lw + space + wd > maxw:
                lines.append(line)
                line, lw = [], 0.0
            lw += (space if line else 0) + wd
            line.append(j)
        lines.append(line)
        k = 0.78 + 0.22 * ease_out_back(seg(t, s, s + 0.14), 2.4)
        y0 = L["cap_y"] - (len(lines) - 1) * size * 0.55
        with ov.at(0, y0, 0, k):
            for li, line in enumerate(lines):
                total = sum(widths[j] for j in line) + space * (len(line) - 1)
                x = -total / 2
                for j in line:
                    w = words[j]
                    active = w["s"] <= t < max(w["e"], w["s"] + 0.08)
                    col = TAG_COLOR.get(w.get("tag"), WHITE)
                    if active:
                        col = GOLD if col == WHITE else col
                    punch = 1 + 0.16 * math.exp(-(t - w["s"]) * 12) if t >= w["s"] else 1
                    sc = punch if active else 1
                    cx = x + widths[j] / 2
                    with ov.at(cx, li * size * 1.1, -2 if active else 0, sc):
                        ov.text(0, 0, texts[j], size, "caption", fill=col, sw=0.13, shadow=0.08)
                    x += widths[j] + space

    def pip_box(self):
        L = self.lay
        if L["short"]:
            d = 330
            return int(L["W"] / 2 - d / 2), int(L["H"] * 0.785), d
        d = 300
        return int(L["W"] - d - 50), 50, d

    def _pip_ring(self, ov):
        x, y, d = self.pip_box()
        L, ss = self.lay, self.ss
        cx, cy, r = (x + d / 2) * ss, (y + d / 2) * ss, d / 2 * ss
        ov.d.ellipse((cx - r - 9 * ss, cy - r - 9 * ss, cx + r + 9 * ss, cy + r + 9 * ss), fill=INK)
        ov.d.ellipse((cx - r - 4 * ss, cy - r - 4 * ss, cx + r + 4 * ss, cy + r + 4 * ss), fill=GOLD)


_R = None


def _init(plan, ss, env):
    global _R
    _R = Renderer(plan, ss, env)


def _work(i):
    return _R.frame(i).tobytes()


def render(plan, out_path, ss=2, workers=None, music_path=None, log=print):
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fps, dur = plan["fps"], plan["duration"]
    n = int(math.ceil(dur * fps))
    voice = audio.load(plan["audio"]) if plan.get("audio") else np.zeros(int(dur * audio.SR))
    env = audio.envelope(voice, fps, n)

    r = Renderer(plan, ss, env)
    cues = [(t, arg) for cl in r.cues for t, kind, arg in cl if kind == "sfx"]
    mus = None
    if plan.get("music") not in (None, "none"):
        mus = audio.load(music_path) if music_path else \
            audio.music(dur, plan["music"] if plan["music"] in ("funny", "serious") else "funny")
    mixed = audio.mix(voice, dur, cues, mus, env, fps)
    wav = out_path.with_suffix(".mix.wav")
    audio.save(wav, mixed)

    W, H = plan["width"], plan["height"]
    cmd = ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(fps),
           "-i", "-", "-i", str(wav)]
    if plan.get("pip"):
        x, y, d = r.pip_box()
        cmd += ["-i", plan["pip"], "-filter_complex",
                f"[2:v]scale={d}:{d}:force_original_aspect_ratio=increase,crop={d}:{d},format=yuva420p,"
                f"geq=lum='p(X,Y)':cb='p(X,Y)':cr='p(X,Y)':a='if(lte(hypot(X-W/2,Y-H/2),W/2-2),255,0)'[p];"
                f"[0:v][p]overlay={x}:{y}:eof_action=pass[v]", "-map", "[v]", "-map", "1:a"]
    else:
        cmd += ["-map", "0:v", "-map", "1:a"]
    cmd += ["-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac",
            "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(out_path)]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    t0 = time.time()
    workers = workers or max(1, mp.cpu_count())
    with mp.Pool(workers, initializer=_init, initargs=(plan, ss, env)) as pool:
        for k, buf in enumerate(pool.imap(_work, range(n), chunksize=4)):
            proc.stdin.write(buf)
            if k % (fps * 5) == 0:
                el = time.time() - t0
                log(f"  frame {k}/{n}  ({el:.0f}s, ~{el / max(1, k) * (n - k):.0f}s left)")
    proc.stdin.close()
    if proc.wait() != 0:
        sys.exit("ffmpeg failed")
    wav.unlink(missing_ok=True)
    log(f"  wrote {out_path} ({n} frames in {time.time() - t0:.0f}s)")
    return out_path


def write_srt(plan, path):
    lay = layout(plan)
    words = plan["words"]

    def ts(x):
        h, rem = divmod(x, 3600)
        m, s = divmod(rem, 60)
        return f"{int(h):02d}:{int(m):02d}:{int(s):02d},{int((s % 1) * 1000):03d}"

    lines = []
    for k, (s, e, c) in enumerate(caption_chunks(words, dict(lay, cap_words=7, cap_chars=42)), 1):
        lines += [str(k), f"{ts(s)} --> {ts(e)}", " ".join(words[j]["w"] for j in c), ""]
    Path(path).write_text("\n".join(lines), encoding="utf-8")
