import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Badge as BadgeData } from "../types";
import type { Layout } from "../layout";
import { FONT } from "../ui";

type Props = {
  badge: BadgeData;
  layout: Layout;
  inAt: number;
  outAt: number;
  // Centered on the camera focal point (true) or floating beside a country (false).
  centered: boolean;
};

export const Badge: React.FC<Props> = ({ badge, layout, inAt, outAt, centered }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u, focal } = layout;

  const pop = spring({ frame: frame - inAt, fps, config: { damping: 9, stiffness: 160 } });
  const exit = interpolate(frame, [outAt - 10, outAt], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (frame < inAt - 1) return null;

  const size = (centered ? 200 : 150) * u;
  const bob = Math.sin((frame - inAt) / 14) * 8 * u;
  const cx = centered ? focal.x : focal.x + layout.badgeOffset.x;
  const cy = (centered ? focal.y : focal.y + layout.badgeOffset.y) + bob;
  const spin = (frame - inAt) * 1.6;
  const line = interpolate(frame, [inAt, inAt + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const glyphs = Array.from(badge.text).length;
  const baseFont = badge.kind === "icon" ? 96 : glyphs > 3 ? 44 : glyphs > 1 ? 58 : 96;
  const fontSize = baseFont * u * (centered ? 1.25 : 1);

  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - exit }}>
        {!centered && (
        <svg width={layout.width} height={layout.height} style={{ position: "absolute", inset: 0 }}>
          <line
            x1={focal.x}
            y1={focal.y}
            x2={focal.x + (cx - focal.x) * line}
            y2={focal.y + (cy - focal.y) * line}
            stroke="rgba(255,255,255,0.85)"
            strokeWidth={3 * u}
            strokeDasharray={`${8 * u} ${8 * u}`}
          />
          <circle cx={focal.x} cy={focal.y} r={9 * u} fill="#fff" opacity={line} />
        </svg>
      )}
      <div
        style={{
          position: "absolute",
          left: cx - size / 2,
          top: cy - size / 2,
          width: size,
          height: size,
          scale: pop,
        }}
      >
        <svg width={size * 1.5} height={size * 1.5} style={{ position: "absolute", left: -size * 0.25, top: -size * 0.25, rotate: `${spin}deg` }}>
          <circle
            cx={size * 0.75}
            cy={size * 0.75}
            r={size * 0.66}
            fill="none"
            stroke={badge.color}
            strokeWidth={4 * u}
            strokeDasharray={`${18 * u} ${14 * u}`}
            opacity={0.8}
          />
        </svg>
        <div
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            backgroundColor: badge.kind === "icon" ? "#0f172a" : badge.color,
            border: `${5 * u}px solid rgba(255,255,255,0.9)`,
            boxShadow: `0 ${18 * u}px ${40 * u}px rgba(0,0,0,0.5), 0 0 ${60 * u}px ${badge.color}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontFamily: FONT,
            fontWeight: 900,
            fontSize,
            letterSpacing: -1 * u,
            boxSizing: "border-box",
          }}
        >
          {badge.text}
        </div>
      </div>
    </div>
  );
};
