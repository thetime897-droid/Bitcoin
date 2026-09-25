import React from "react";
import { interpolate, spring, useVideoConfig } from "remotion";
import type { GeoProjection } from "d3-geo";
import type { Camera } from "../geo/globe";
import { isOnFrontSide } from "../geo/projection";
import type { Layout } from "../layout";
import type { Region } from "../types";
import { COLORS, FONT } from "../ui";

type Props = {
  region: Region;
  projection: GeoProjection;
  camera: Camera;
  layout: Layout;
  // Frames since the marker should start appearing (negative = not yet).
  t: number;
  // Frames until the scene ends.
  remaining: number;
};

export const RegionMarker: React.FC<Props> = ({ region, projection, camera, layout, t, remaining }) => {
  const { fps } = useVideoConfig();
  const { u, width } = layout;
  const point: [number, number] = [region.point.lon, region.point.lat];
  if (t < 0 || !isOnFrontSide(point, camera)) return null;
  const p = projection(point);
  if (!p) return null;

  const drop = spring({ frame: t, fps, config: { damping: 9, stiffness: 140 } });
  const label = spring({ frame: t - 12, fps, config: { damping: 14 } });
  const exit = interpolate(remaining, [0, 10], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const alpha = 1 - exit;

  const pinW = 58 * u;
  const pinH = 78 * u;
  const lift = (1 - drop) * 160 * u;

  const titleSize = 32 * u;
  const subSize = 22 * u;
  const estWidth = Math.max(region.title.length * titleSize * 0.66, (region.subtitle?.length ?? 0) * subSize * 0.56) + 56 * u;
  const toLeft = p[0] > width * (layout.portrait ? 0.6 : 0.74);
  let lx = toLeft ? p[0] - 70 * u - estWidth : p[0] + 70 * u;
  lx = Math.min(width - 40 * u - estWidth, Math.max(40 * u, lx));
  const ly = p[1] - pinH - 80 * u;
  const anchorX = toLeft ? lx + estWidth : lx;

  return (
    <div style={{ position: "absolute", inset: 0, opacity: alpha }}>
      <svg width={layout.width} height={layout.height} style={{ position: "absolute", inset: 0 }}>
        {[0, 20, 40].map((delay) => {
          const k = ((t - 10 - delay) % 60) / 60;
          if (t - 10 - delay < 0) return null;
          return (
            <ellipse
              key={delay}
              cx={p[0]}
              cy={p[1]}
              rx={(12 + 90 * k) * u}
              ry={(5 + 36 * k) * u}
              fill="none"
              stroke={COLORS.accent}
              strokeWidth={4 * u * (1 - k)}
              opacity={1 - k}
            />
          );
        })}
        <ellipse cx={p[0]} cy={p[1]} rx={18 * u * drop} ry={7 * u * drop} fill="rgba(0,0,0,0.5)" />
        <line
          x1={p[0]}
          y1={p[1] - pinH * 0.72}
          x2={p[0] + (anchorX - p[0]) * label}
          y2={p[1] - pinH * 0.72 + (ly + 34 * u - (p[1] - pinH * 0.72)) * label}
          stroke="rgba(255,255,255,0.9)"
          strokeWidth={3 * u}
          opacity={label}
        />
        <g transform={`translate(${p[0] - pinW / 2} ${p[1] - pinH - lift})`}>
          <path
            d={`M${pinW / 2} ${pinH} C ${pinW * 0.3} ${pinH * 0.7}, 0 ${pinH * 0.55}, 0 ${pinW / 2} A ${pinW / 2} ${pinW / 2} 0 1 1 ${pinW} ${pinW / 2} C ${pinW} ${pinH * 0.55}, ${pinW * 0.7} ${pinH * 0.7}, ${pinW / 2} ${pinH} Z`}
            fill="#e11d2a"
            stroke="#fff"
            strokeWidth={4 * u}
          />
          <circle cx={pinW / 2} cy={pinW / 2} r={pinW * 0.2} fill="#fff" />
        </g>
      </svg>
      <div
        style={{
          position: "absolute",
          left: lx,
          top: ly,
          width: estWidth,
          opacity: label,
          translate: `${(1 - label) * (toLeft ? 30 : -30) * u}px 0`,
          scale: 0.9 + 0.1 * label,
          backgroundColor: COLORS.glass,
          border: `1px solid ${COLORS.glassBorder}`,
          borderLeft: toLeft ? `1px solid ${COLORS.glassBorder}` : `${6 * u}px solid ${COLORS.accent}`,
          borderRight: toLeft ? `${6 * u}px solid ${COLORS.accent}` : `1px solid ${COLORS.glassBorder}`,
          borderRadius: 14 * u,
          padding: `${10 * u}px ${20 * u}px`,
          boxSizing: "border-box",
          textAlign: toLeft ? "right" : "left",
          boxShadow: `0 ${12 * u}px ${30 * u}px rgba(0,0,0,0.45)`,
        }}
      >
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: titleSize, color: "#fff", letterSpacing: 1 * u, whiteSpace: "nowrap" }}>
          {region.title}
        </div>
        {region.subtitle && (
          <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: subSize, color: "#cbd5e1", whiteSpace: "nowrap" }}>{region.subtitle}</div>
        )}
      </div>
    </div>
  );
};
