"""Builds public/earth.jpg: NASA Blue Marble colour + Natural Earth relief detail.

Both source images are public domain and ship in the `basemap-data` wheel:
    pip download --no-deps basemap-data && unzip basemap_data-*.whl 'mpl_toolkits/basemap_data/*.jpg'
Run with: python3 scripts/build-earth-texture.py <path/to/basemap_data>
"""
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

Image.MAX_IMAGE_PIXELS = None
src = sys.argv[1] if len(sys.argv) > 1 else "mpl_toolkits/basemap_data"
out = os.path.join(os.path.dirname(__file__), "..", "public", "earth.jpg")
W, H = 8192, 4096

colour = Image.open(os.path.join(src, "bmng.jpg")).convert("RGB").resize((W, H), Image.LANCZOS)
relief = Image.open(os.path.join(src, "shadedrelief.jpg")).convert("L").resize((W, H), Image.LANCZOS)

c = np.asarray(colour).astype(np.float32) / 255.0
r = np.asarray(relief).astype(np.float32) / 255.0
r_blur = np.asarray(relief.filter(ImageFilter.GaussianBlur(4))).astype(np.float32) / 255.0

# Land mask: Blue Marble oceans are dark blue, land is brighter / greener / browner.
lum = c.mean(axis=2)
blueness = c[..., 2] - (c[..., 0] + c[..., 1]) / 2
land = np.clip((lum - 0.12) * 6, 0, 1) * np.clip(1 - blueness * 6, 0, 1)
land = np.asarray(Image.fromarray((land * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))).astype(np.float32) / 255.0

# Relief high-pass adds mountain shading detail on land.
detail = (r - r_blur) * 1.6
c = c + detail[..., None] * land[..., None]

# Gentle grade: lift shadows, a touch more contrast and saturation.
c = np.clip(c, 0, 1) ** 0.88
mean = c.mean(axis=2, keepdims=True)
c = mean + (c - mean) * 1.15
c = np.clip((c - 0.5) * 1.06 + 0.5, 0, 1)

Image.fromarray((c * 255).astype(np.uint8)).save(out, quality=90, optimize=True)
print("wrote", os.path.abspath(out), f"{os.path.getsize(out) / 1e6:.1f} MB")
