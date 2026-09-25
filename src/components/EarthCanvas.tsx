import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";
import type { Camera } from "../geo/globe";
import type { Layout } from "../layout";

type Texture = { data: Uint8ClampedArray; w: number; h: number };

let cached: Texture | null = null;
let loading: Promise<Texture> | null = null;

const loadTexture = (src: string) => {
  if (!loading) {
    loading = new Promise<Texture>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext("2d");
        if (!ctx) return reject(new Error("no 2d context"));
        ctx.drawImage(img, 0, 0);
        resolve({ data: ctx.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height });
      };
      img.onerror = () => reject(new Error(`failed to load ${src}`));
      img.src = src;
    });
  }
  return loading;
};

type Props = { camera: Camera; layout: Layout };

// Satellite globe: reprojects the equirectangular Earth texture onto the same
// orthographic projection d3 uses for the vector overlays, pixel by pixel.
export const EarthCanvas: React.FC<Props> = ({ camera, layout }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [tex, setTex] = useState<Texture | null>(cached);
  const [handle] = useState(() => (cached ? null : delayRender("Loading earth texture")));
  const { width: W, height: H, focal, globeRadius } = layout;

  useEffect(() => {
    if (tex) return;
    loadTexture(staticFile("earth.jpg"))
      .then((t) => {
        cached = t;
        setTex(t);
        if (handle !== null) continueRender(handle);
      })
      .catch((err) => cancelRender(err));
  }, [tex, handle]);

  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!tex || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(W, H);
    const out = img.data;
    const { data: src, w: tw, h: th } = tex;

    const R = globeRadius * camera.zoom;
    const cx = focal.x;
    const cy = focal.y;
    const lon0 = (camera.lon * Math.PI) / 180;
    const dPhi = (-camera.lat * Math.PI) / 180;
    const dGamma = ((camera.roll ?? 0) * Math.PI) / 180;
    const cosP = Math.cos(dPhi);
    const sinP = Math.sin(dPhi);
    const cosG = Math.cos(dGamma);
    const sinG = Math.sin(dGamma);
    const TWO_PI = Math.PI * 2;

    const y0 = Math.max(0, Math.floor(cy - R - 1));
    const y1 = Math.min(H - 1, Math.ceil(cy + R + 1));
    for (let py = y0; py <= y1; py++) {
      const Y = (cy - (py + 0.5)) / R;
      if (Y > 1.002 || Y < -1.002) continue;
      const half = Math.sqrt(Math.max(0, 1 - Y * Y)) * R + 1.5;
      const x0 = Math.max(0, Math.floor(cx - half));
      const x1 = Math.min(W - 1, Math.ceil(cx + half));
      let o = (py * W + x0) * 4;
      for (let px = x0; px <= x1; px++, o += 4) {
        const X = (px + 0.5 - cx) / R;
        const r2 = X * X + Y * Y;
        const rho = Math.sqrt(r2);
        const edge = Math.min(1, Math.max(0, (1 - rho) * R + 0.5));
        if (edge <= 0) continue;
        const z = Math.sqrt(Math.max(0, 1 - r2));
        // Inverse of d3's rotation([-lon, -lat, roll]) for the view vector (z, X, Y).
        const k = Y * cosG - X * sinG;
        const lam = Math.atan2(X * cosG + Y * sinG, z * cosP + k * sinP) + lon0;
        const s = k * cosP - z * sinP;
        const phi = Math.asin(s > 1 ? 1 : s < -1 ? -1 : s);

        let u = (lam / TWO_PI + 0.5) % 1;
        if (u < 0) u += 1;
        const fx = u * tw - 0.5;
        const fy = Math.min(th - 1.001, Math.max(0, (0.5 - phi / Math.PI) * th - 0.5));
        const ix = Math.floor(fx);
        const iy = Math.floor(fy);
        const ax = fx - ix;
        const ay = fy - iy;
        const xa = ((ix % tw) + tw) % tw;
        const xb = (xa + 1) % tw;
        const i00 = (iy * tw + xa) * 4;
        const i10 = (iy * tw + xb) * 4;
        const i01 = ((iy + 1) * tw + xa) * 4;
        const i11 = ((iy + 1) * tw + xb) * 4;
        const w00 = (1 - ax) * (1 - ay);
        const w10 = ax * (1 - ay);
        const w01 = (1 - ax) * ay;
        const w11 = ax * ay;

        // Soft terminator-free lighting: gentle limb darkening plus a blue haze at the rim.
        const light = 0.58 + 0.42 * Math.sqrt(z);
        const haze = (1 - z) * (1 - z) * 0.55;
        const rCh = (src[i00] * w00 + src[i10] * w10 + src[i01] * w01 + src[i11] * w11) * light;
        const gCh = (src[i00 + 1] * w00 + src[i10 + 1] * w10 + src[i01 + 1] * w01 + src[i11 + 1] * w11) * light;
        const bCh = (src[i00 + 2] * w00 + src[i10 + 2] * w10 + src[i01 + 2] * w01 + src[i11 + 2] * w11) * light;
        out[o] = rCh + (110 - rCh) * haze;
        out[o + 1] = gCh + (170 - gCh) * haze;
        out[o + 2] = bCh + (255 - bCh) * haze;
        out[o + 3] = 255 * edge;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [tex, camera.lon, camera.lat, camera.zoom, camera.roll, W, H, focal.x, focal.y, globeRadius]);

  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0, width: W, height: H }} />;
};
