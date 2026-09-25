import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Stat } from "../types";
import type { Layout } from "../layout";
import { COLORS, FONT, directionArrow, formatStat, toneColor } from "../ui";

type Props = {
  stats: Stat[];
  layout: Layout;
  arrive: number;
  duration: number;
};

// Decorative trend line (no axis/values) that matches the stat's direction.
const sparkPath = (seed: number, direction: Stat["direction"], w: number, h: number) => {
  const n = 14;
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const trend = direction === "up" ? 1 - t : direction === "down" ? t : 0.5;
    const noise = Math.sin(seed * 12.9 + i * 2.3) * 0.12 + Math.sin(seed * 3.1 + i * 5.7) * 0.06;
    const y = Math.min(0.95, Math.max(0.05, 0.15 + trend * 0.7 + noise));
    pts.push(`${i === 0 ? "M" : "L"}${(t * w).toFixed(1)} ${(y * h).toFixed(1)}`);
  }
  return pts.join(" ");
};

const StatCard: React.FC<{ stat: Stat; layout: Layout; inAt: number; outAt: number; seed: number }> = ({
  stat,
  layout,
  inAt,
  outAt,
  seed,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = layout;
  const pop = spring({ frame: frame - inAt, fps, config: { damping: 11, stiffness: 150 } });
  const count = interpolate(frame, [inAt + 2, inAt + 38], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const draw = interpolate(frame, [inAt + 6, inAt + 44], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const exit = interpolate(frame, [outAt - 10, outAt], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const color = toneColor(stat.direction, stat.tone);
  const sparkW = 120 * u;
  const sparkH = 46 * u;
  const flash = interpolate(frame, [inAt + 36, inAt + 40, inAt + 52], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (frame < inAt - 1) return null;

  return (
    <>
    <div
      style={{
        opacity: Math.min(1, pop * 1.5) * (1 - exit),
        scale: 0.6 + 0.4 * pop,
        translate: `0 ${(1 - pop) * 30 * u + exit * 20 * u}px`,
        backgroundColor: COLORS.glass,
        border: `1px solid ${COLORS.glassBorder}`,
        borderRadius: 24 * u,
        padding: `${16 * u}px ${24 * u}px`,
        display: "flex",
        alignItems: "center",
        gap: 20 * u,
        boxShadow: `0 ${16 * u}px ${40 * u}px rgba(0,0,0,0.4), 0 0 ${40 * u * flash}px ${color}`,
      }}
    >
      <div>
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 22 * u,
            letterSpacing: 2 * u,
            color: "#9fb0c8",
            textTransform: "uppercase",
          }}
        >
          {stat.label}
        </div>
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: 58 * u,
            color,
            lineHeight: 1.1,
            fontVariantNumeric: "tabular-nums",
            whiteSpace: "nowrap",
          }}
        >
          {stat.direction !== "neutral" && (
            <span style={{ fontSize: 34 * u, marginRight: 8 * u, verticalAlign: "middle" }}>{directionArrow(stat.direction)}</span>
          )}
          {formatStat(stat, stat.value * count)}
        </div>
      </div>
      <svg width={sparkW} height={sparkH} viewBox={`0 0 ${sparkW} ${sparkH}`}>
        <path
          d={sparkPath(seed, stat.direction, sparkW, sparkH)}
          pathLength={1}
          strokeDasharray={`${draw} 1`}
          fill="none"
          stroke={color}
          strokeWidth={4 * u}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
    </>
  );
};

export const StatCallout: React.FC<Props> = ({ stats, layout, arrive, duration }) => {
  if (stats.length === 0) return null;
  const { stats: box, u } = layout;
  return (
    <div
      style={{
        position: "absolute",
        top: box.top,
        left: box.left,
        width: box.width,
        display: "flex",
        flexDirection: layout.portrait ? "row" : "column",
        justifyContent: box.align === "center" ? "center" : "flex-start",
        alignItems: layout.portrait ? "flex-start" : "flex-start",
        gap: 20 * u,
      }}
    >
      {stats.map((stat, i) => (
        <StatCard key={i} stat={stat} layout={layout} inAt={arrive + 16 + i * 12} outAt={duration - 10} seed={i + stat.value} />
      ))}
    </div>
  );
};
