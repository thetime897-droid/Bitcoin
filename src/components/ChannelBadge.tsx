import React from "react";
import type { Layout } from "../layout";
import { COLORS, FONT } from "../ui";
import { Avatar } from "./Avatar";

type Props = {
  channelName: string;
  brandLine: string;
  logoSrc?: string;
  layout: Layout;
};

export const ChannelBadge: React.FC<Props> = ({ channelName, brandLine, logoSrc, layout }) => {
  const { u, channel } = layout;
  return (
    <div
      style={{
        position: "absolute",
        left: channel.left,
        bottom: channel.bottom,
        display: "flex",
        alignItems: "center",
        gap: 12 * u,
        padding: `${8 * u}px ${22 * u}px ${8 * u}px ${8 * u}px`,
        borderRadius: 999,
        backgroundColor: "rgba(6,10,20,0.62)",
        border: "1px solid rgba(255,255,255,0.18)",
      }}
    >
      <Avatar size={46 * u} logoSrc={logoSrc} />
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
        <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: 16 * u, letterSpacing: 2.5 * u, color: COLORS.accent }}>{brandLine}</span>
        <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 24 * u, color: "#ffffff" }}>{channelName}</span>
      </div>
    </div>
  );
};
