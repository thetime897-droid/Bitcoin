"""Hochwertiges Upscaling der Panda-Assets fuer Comic-Lineart (ohne KI-Modelle):
Entrauschen (bilateral) -> mehrstufig Lanczos -> Shock-Filter (macht weiche Kanten wieder hart) -> leichtes Anti-Aliasing.
python3 tools/hd_panda.py <src_dir> <out_dir> [faktor=6]
"""
import sys, glob, os
import numpy as np, cv2

def shock(img, iters=12, dt=0.22, sigma=1.4):
    I = img.astype(np.float32)
    for _ in range(iters):
        g = cv2.GaussianBlur(I, (0, 0), sigma)
        lap = cv2.Laplacian(g, cv2.CV_32F, ksize=3)
        gx = cv2.Sobel(I, cv2.CV_32F, 1, 0, ksize=3) / 8
        gy = cv2.Sobel(I, cv2.CV_32F, 0, 1, ksize=3) / 8
        I = I - dt * np.sign(lap) * np.sqrt(gx * gx + gy * gy)
    return np.clip(I, 0, 255)

def upscale(path, out, F):
    src = cv2.imread(path, cv2.IMREAD_UNCHANGED)
    bgr, a = src[:, :, :3], src[:, :, 3]
    bgr = cv2.bilateralFilter(bgr, 5, 28, 3)                      # JPEG-Rauschen weg, Kanten bleiben
    x = cv2.resize(bgr, None, fx=2, fy=2, interpolation=cv2.INTER_LANCZOS4)
    x = cv2.bilateralFilter(x, 7, 22, 4)
    x = cv2.resize(x, None, fx=F / 2, fy=F / 2, interpolation=cv2.INTER_CUBIC)
    smooth = cv2.bilateralFilter(x, 9, 16, 1.5 * F)                # saubere Flaechen (kein JPEG-Muster)
    lab = cv2.cvtColor(smooth, cv2.COLOR_BGR2LAB).astype(np.float32)
    L0 = lab[:, :, 0].copy()
    Ls = shock(L0, iters=int(3 * F), sigma=0.35 * F)
    # Schaerfen nur an Linien: Kantenmaske aus dem geglaetteten Bild
    edges = cv2.Canny(smooth, 30, 90)
    m = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=max(1, F // 2)).astype(np.float32) / 255
    m = cv2.GaussianBlur(m, (0, 0), F * 0.5)
    lab[:, :, 0] = L0 + m * (Ls - L0)
    x = cv2.cvtColor(np.clip(lab, 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR)
    x = cv2.GaussianBlur(x, (0, 0), 0.6)                            # sauberes Anti-Aliasing
    A = cv2.resize(a, None, fx=F, fy=F, interpolation=cv2.INTER_CUBIC).astype(np.float32)
    A = cv2.GaussianBlur(A, (0, 0), 0.5 * F / 2)
    A = np.clip((A - 110) * 255 / 40, 0, 255)                       # harte, glatte Silhouette
    A = cv2.GaussianBlur(A, (0, 0), 0.8)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    cv2.imwrite(out, np.dstack([x, A.astype(np.uint8)]))

if __name__ == "__main__":
    src, dst = sys.argv[1], sys.argv[2]; F = int(sys.argv[3]) if len(sys.argv) > 3 else 6
    files = [sys.argv[4]] if len(sys.argv) > 4 else glob.glob(f"{src}/*/*.png")
    for f in files:
        upscale(f, f.replace(src, dst, 1), F); print(f)
