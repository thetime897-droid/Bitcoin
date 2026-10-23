"""Real-ESRGAN (RRDBNet x4, anime_6B) inference in plain numpy - no torch needed.
python3 esrgan_np.py weights.pth in.png out.png
"""
import pickle, sys, zipfile
import numpy as np
from numpy.lib.stride_tricks import as_strided, sliding_window_view
from PIL import Image

DT = {"FloatStorage": np.float32, "HalfStorage": np.float16, "DoubleStorage": np.float64}


def load_pth(path):
    zf = zipfile.ZipFile(path)
    names = zf.namelist()
    root = names[0].split("/")[0]

    class U(pickle.Unpickler):
        def find_class(self, mod, name):
            if name == "_rebuild_tensor_v2":
                def rebuild(storage, off, size, stride, *a):
                    it = storage.itemsize
                    return as_strided(storage[off:], shape=size, strides=[s * it for s in stride]).copy()
                return rebuild
            if mod == "collections" and name == "OrderedDict":
                import collections
                return collections.OrderedDict
            if mod.startswith("torch") and name.endswith("Storage"):
                return name
            return super().find_class(mod, name)

        def persistent_load(self, pid):
            _, stype, key, loc, numel = pid
            stype = stype if isinstance(stype, str) else getattr(stype, "__name__", str(stype))
            raw = zf.read(f"{root}/data/{key}")
            return np.frombuffer(raw, dtype=DT.get(stype, np.float32))

    sd = U(zf.open(f"{root}/data.pkl")).load()
    for k in ("params_ema", "params"):
        if k in sd:
            sd = sd[k]
    return {k: np.asarray(v, np.float32) for k, v in sd.items()}


def conv(x, w, b):
    """x: (C,H,W), w: (O,C,3,3) -> (O,H,W), zero padding 1."""
    C, H, W = x.shape
    xp = np.pad(x, ((0, 0), (1, 1), (1, 1)))
    win = sliding_window_view(xp, (3, 3), axis=(1, 2))  # C,H,W,3,3
    cols = win.transpose(1, 2, 0, 3, 4).reshape(H * W, C * 9)
    out = cols @ w.reshape(w.shape[0], -1).T + b
    return out.T.reshape(-1, H, W)


def lrelu(x):
    return np.where(x > 0, x, 0.2 * x)


def rdb(x, P, p):
    x1 = lrelu(conv(x, P[p + "conv1.weight"], P[p + "conv1.bias"]))
    x2 = lrelu(conv(np.concatenate([x, x1]), P[p + "conv2.weight"], P[p + "conv2.bias"]))
    x3 = lrelu(conv(np.concatenate([x, x1, x2]), P[p + "conv3.weight"], P[p + "conv3.bias"]))
    x4 = lrelu(conv(np.concatenate([x, x1, x2, x3]), P[p + "conv4.weight"], P[p + "conv4.bias"]))
    x5 = conv(np.concatenate([x, x1, x2, x3, x4]), P[p + "conv5.weight"], P[p + "conv5.bias"])
    return x5 * 0.2 + x


def net(x, P):
    feat = conv(x, P["conv_first.weight"], P["conv_first.bias"])
    body = feat
    i = 0
    while f"body.{i}.rdb1.conv1.weight" in P:
        o = body
        for r in ("rdb1", "rdb2", "rdb3"):
            o = rdb(o, P, f"body.{i}.{r}.")
        body = o * 0.2 + body
        i += 1
    feat = feat + conv(body, P["conv_body.weight"], P["conv_body.bias"])
    feat = lrelu(conv(feat.repeat(2, 1).repeat(2, 2), P["conv_up1.weight"], P["conv_up1.bias"]))
    feat = lrelu(conv(feat.repeat(2, 1).repeat(2, 2), P["conv_up2.weight"], P["conv_up2.bias"]))
    return conv(lrelu(conv(feat, P["conv_hr.weight"], P["conv_hr.bias"])), P["conv_last.weight"], P["conv_last.bias"])


def upscale_rgb(img, P, tile=64, pad=10):
    """img: HxWx3 uint8 -> 4H x 4W x 3 uint8, processed in overlapping tiles."""
    x = img.astype(np.float32).transpose(2, 0, 1) / 255
    C, H, W = x.shape
    out = np.zeros((3, H * 4, W * 4), np.float32)
    for y0 in range(0, H, tile):
        for x0 in range(0, W, tile):
            y1, x1 = min(H, y0 + tile), min(W, x0 + tile)
            ya, xa = max(0, y0 - pad), max(0, x0 - pad)
            yb, xb = min(H, y1 + pad), min(W, x1 + pad)
            o = net(x[:, ya:yb, xa:xb], P)
            out[:, y0 * 4:y1 * 4, x0 * 4:x1 * 4] = o[:, (y0 - ya) * 4:(y0 - ya + y1 - y0) * 4,
                                                      (x0 - xa) * 4:(x0 - xa + x1 - x0) * 4]
    return (np.clip(out, 0, 1).transpose(1, 2, 0) * 255 + 0.5).astype(np.uint8)


def upscale_rgba(path, out, P):
    im = Image.open(path).convert("RGBA")
    a = im.getchannel("A")
    flat = Image.new("RGB", im.size, (255, 255, 255))
    flat.paste(im, mask=a)
    big = upscale_rgb(np.asarray(flat), P)
    A = np.asarray(a.resize((im.width * 4, im.height * 4), Image.BICUBIC)).astype(np.float32)
    from PIL import ImageFilter
    A = np.clip((A - 100) * 255 / 60, 0, 255).astype(np.uint8)
    A = Image.fromarray(A).filter(ImageFilter.GaussianBlur(1.0))
    res = Image.fromarray(big).convert("RGBA")
    res.putalpha(A)
    res.save(out)


if __name__ == "__main__":
    P = load_pth(sys.argv[1])
    upscale_rgba(sys.argv[2], sys.argv[3], P)
