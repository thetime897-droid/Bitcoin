import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Layout } from "../layout";
import { COLORS, FONT } from "../ui";
import { Audio } from "@remotion/media";
import { Sequence, staticFile } from "remotion";
import { Avatar } from "./Avatar";

type Props = {
  layout: Layout;
  channelName: string;
  logoSrc?: string;
  followLabel: string;
  followedLabel: string;
};

const TAP_AT = 62;

export const FollowCta: React.FC<Props> = ({ layout, channelName, logoSrc, followLabel, followedLabel }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u, portrait, width, height } = layout;

  const enter = spring({ frame: frame - 18, fps, config: { damping: 13 } });
  const handIn = interpolate(frame, [38, TAP_AT - 4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const tap = interpolate(frame, [TAP_AT - 4, TAP_AT, TAP_AT + 5], [1, 0.88, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const followed = frame >= TAP_AT;
  const handOut = interpolate(frame, [TAP_AT + 8, TAP_AT + 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const cx = portrait ? width / 2 : 64 * u + 350 * u;
  const cy = portrait ? height * 0.27 : height * 0.5;
  const buttonW = 380 * u;

  const burst = Array.from({ length: 12 }).map((_, i) => {
    const t = (frame - TAP_AT) / 26;
    if (t <= 0 || t >= 1) return null;
    const angle = (i / 12) * Math.PI * 2;
    const dist = 60 * u + 170 * u * Easing.out(Easing.cubic)(t);
    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: Math.cos(angle) * dist,
          top: Math.sin(angle) * dist,
          width: 16 * u,
          height: 16 * u,
          borderRadius: "50%",
          backgroundColor: i % 2 === 0 ? "#fe2c55" : COLORS.accent,
          opacity: 1 - t,
          translate: "-50% -50%",
        }}
      />
    );
  });

  return (
    <>
    <Sequence from={TAP_AT - 1} layout="none">
      <Audio src={staticFile("sfx/click.wav")} volume={0.6} />
    </Sequence>
    <Sequence from={TAP_AT} layout="none">
      <Audio src={staticFile("sfx/sparkle.wav")} volume={0.45} />
    </Sequence>
    <div
      style={{
        position: "absolute",
        left: cx,
        top: cy,
        translate: "-50% -50%",
        opacity: Math.min(1, enter * 1.4),
        scale: 0.8 + 0.2 * enter,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 22 * u,
          padding: `${36 * u}px ${56 * u}px`,
          borderRadius: 32 * u,
          backgroundColor: COLORS.glass,
          border: `1px solid ${COLORS.glassBorder}`,
          boxShadow: `0 ${24 * u}px ${60 * u}px rgba(0,0,0,0.5)`,
        }}
      >
        <div style={{ borderRadius: "50%", boxShadow: `0 0 0 ${5 * u}px ${COLORS.accent}` }}>
          <Avatar size={130 * u} logoSrc={logoSrc} />
        </div>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 46 * u, color: "#fff" }}>{channelName}</div>
        <div style={{ position: "relative" }}>
          <div
            style={{
              width: buttonW,
              height: 88 * u,
              borderRadius: 18 * u,
              backgroundColor: followed ? "#2a2f3a" : "#fe2c55",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: FONT,
              fontWeight: 900,
              fontSize: 36 * u,
              color: "#fff",
              scale: tap,
            }}
          >
            {followed ? `${followedLabel} ✓` : followLabel}
          </div>
          <div style={{ position: "absolute", left: buttonW / 2, top: 44 * u }}>{burst}</div>
          <div
            style={{
              position: "absolute",
              left: buttonW / 2 + (1 - handIn) * 220 * u,
              top: 50 * u + (1 - handIn) * 260 * u + handOut * 200 * u,
              fontSize: 90 * u,
              opacity: handIn * (1 - handOut),
              scale: tap,
            }}
          >
            👆
          </div>
        </div>
      </div>
    </div>
    </>
  );
};
