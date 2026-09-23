import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import type { Layout } from "../layout";
import { COLORS, FONT } from "../ui";

type Props = {
  layout: Layout;
  dateLabel: string;
  location: string;
  // Frame at which `location` last changed (drives the flip-in animation).
  locationSince: number;
};

const chipStyle = (u: number): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 10 * u,
  height: 48 * u,
  padding: `0 ${18 * u}px`,
  borderRadius: 999,
  backgroundColor: COLORS.glass,
  border: `1px solid ${COLORS.glassBorder}`,
  fontFamily: FONT,
  fontWeight: 800,
  fontSize: 22 * u,
  letterSpacing: 1.5 * u,
  color: "#fff",
  whiteSpace: "nowrap",
});

export const HudChips: React.FC<Props> = ({ layout, dateLabel, location, locationSince }) => {
  const frame = useCurrentFrame();
  const { u, chips } = layout;
  const enter = interpolate(frame, [4, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const flip = interpolate(frame - locationSince, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pulse = 0.5 + 0.5 * Math.sin(frame / 5);

  return (
    <div
      style={{
        position: "absolute",
        top: chips.top,
        left: chips.left,
        display: "flex",
        gap: 12 * u,
        opacity: enter,
        translate: `${(1 - enter) * -30 * u}px 0`,
      }}
    >
      <div style={{ ...chipStyle(u), backgroundColor: "#e11d2a", border: "none" }}>
        <span style={{ width: 12 * u, height: 12 * u, borderRadius: "50%", backgroundColor: "#fff", opacity: 0.4 + 0.6 * pulse }} />
        LIVE
      </div>
      <div style={chipStyle(u)}>{dateLabel}</div>
      <div style={{ ...chipStyle(u), overflow: "hidden" }}>
        <svg width={18 * u} height={22 * u} viewBox="0 0 24 30" fill={COLORS.accent}>
          <path d="M12 0C5.4 0 0 5.2 0 11.7 0 20.4 12 30 12 30s12-9.6 12-18.3C24 5.2 18.6 0 12 0zm0 16a4.3 4.3 0 1 1 0-8.6 4.3 4.3 0 0 1 0 8.6z" />
        </svg>
        <span style={{ display: "inline-block", opacity: flip, translate: `0 ${(1 - flip) * 24 * u}px` }}>{location}</span>
      </div>
    </div>
  );
};
