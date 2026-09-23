import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Layout } from "../layout";
import { COLORS, FONT } from "../ui";
import { Avatar } from "./Avatar";

type Props = {
  layout: Layout;
  title: string;
  subtitle: string;
  logoSrc?: string;
  endAt: number;
};

// "*part*" inside the title is highlighted in the accent colour.
const renderTitle = (word: string) =>
  word.split(/\*([^*]+)\*/g).map((part, i) =>
    part ? (
      <span key={i} style={{ color: i % 2 === 1 ? COLORS.accent : "#fff" }}>
        {part}
      </span>
    ) : null,
  );

export const IntroIdent: React.FC<Props> = ({ layout, title, subtitle, logoSrc, endAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u, portrait, width, height } = layout;
  if (frame > endAt) return null;

  const words = title.split(" ");
  const exit = interpolate(frame, [endAt - 14, endAt], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });
  const avatar = spring({ frame, fps, config: { damping: 10, stiffness: 160 } });
  const bar = interpolate(frame, [12, 28], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const sub = spring({ frame: frame - 14, fps, config: { damping: 14 } });

  const cx = portrait ? width / 2 : width * 0.29;
  const cy = portrait ? height * 0.28 : height * 0.5;

  return (
    <div
      style={{
        position: "absolute",
        left: cx,
        top: cy,
        translate: "-50% -50%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        opacity: 1 - exit,
        scale: 1 + exit * 0.3,
        filter: `blur(${exit * 8 * u}px)`,
      }}
    >
      <div
        style={{
          scale: avatar,
          marginBottom: 22 * u,
          borderRadius: "50%",
          boxShadow: `0 0 0 ${6 * u}px rgba(255,210,60,0.9), 0 ${16 * u}px ${40 * u}px rgba(0,0,0,0.55)`,
        }}
      >
        <Avatar size={140 * u} logoSrc={logoSrc} />
      </div>
      <div style={{ display: "flex", gap: 22 * u }}>
        {words.map((word, i) => {
          const s = spring({ frame: frame - 4 - i * 4, fps, config: { damping: 12, stiffness: 170 } });
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                fontFamily: FONT,
                fontWeight: 900,
                fontSize: (portrait ? 120 : 104) * u,
                lineHeight: 1,
                opacity: Math.min(1, s * 1.4),
                translate: `0 ${(1 - s) * 70 * u}px`,
                textShadow: `0 ${6 * u}px ${24 * u}px rgba(0,0,0,0.7)`,
              }}
            >
              {renderTitle(word)}
            </span>
          );
        })}
      </div>
      <div style={{ height: 8 * u, width: `${bar * 100}%`, backgroundColor: COLORS.accent, borderRadius: 999, margin: `${16 * u}px 0` }} />
      <div
        style={{
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: 40 * u,
          letterSpacing: 8 * u,
          color: "#fff",
          opacity: sub,
          translate: `0 ${(1 - sub) * 20 * u}px`,
          textShadow: `0 ${4 * u}px ${16 * u}px rgba(0,0,0,0.7)`,
        }}
      >
        {subtitle}
      </div>
    </div>
  );
};
