import React from "react";
import { Easing, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import type { News } from "../types";
import type { Layout } from "../layout";
import { FONT, SERIF } from "../ui";

type Props = {
  news: News[];
  layout: Layout;
  arrive: number;
  duration: number;
  breaking: boolean;
};

const Card: React.FC<{
  item: News;
  layout: Layout;
  inAt: number;
  outAt: number;
  first: boolean;
  last: boolean;
  breaking: boolean;
}> = ({ item, layout, inAt, outAt, first, last, breaking }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = layout;
  const accent = item.accent ?? "#d92b2b";

  const enter = spring({ frame: frame - inAt, fps, config: { damping: 15, stiffness: 140 } });
  const exit = interpolate(frame, [outAt - 10, outAt], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });
  const sound = (
    <Sequence from={inAt} durationInFrames={20} layout="none">
      <Audio src={staticFile("sfx/pop.wav")} volume={0.3} />
    </Sequence>
  );
  if (frame < inAt - 1 || frame > outAt + 1) return sound;

  const enterX = first ? 0 : (1 - enter) * 90 * u;
  const enterY = first ? (1 - enter) * -50 * u : 0;
  const exitX = last ? 0 : exit * -110 * u;
  const exitY = last ? exit * -30 * u : 0;
  const dwell = interpolate(frame, [inAt + 12, outAt - 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const breakingPulse = 0.75 + 0.25 * Math.sin(frame / 4);
  const sheen = interpolate(frame, [inAt + 6, inAt + 26], [-0.4, 1.4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const headlineSize = (layout.portrait ? 44 : 38) * u;

  return (
    <>
    {sound}
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        opacity: Math.min(enter * 1.4, 1) * (1 - exit),
        translate: `${enterX + exitX}px ${enterY + exitY}px`,
        scale: 0.96 + 0.04 * enter,
      }}
    >
      {breaking && first && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10 * u,
            marginBottom: 12 * u,
            padding: `${8 * u}px ${16 * u}px`,
            borderRadius: 8 * u,
            backgroundColor: "#e11d2a",
            color: "#fff",
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: 24 * u,
            letterSpacing: 2 * u,
            boxShadow: `0 ${8 * u}px ${24 * u}px rgba(225,29,42,${0.35 * breakingPulse})`,
          }}
        >
          <span style={{ width: 12 * u, height: 12 * u, borderRadius: "50%", backgroundColor: "#fff", opacity: breakingPulse }} />
          BREAKING
        </div>
      )}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: 22 * u,
          overflow: "hidden",
          position: "relative",
          boxShadow: `0 ${24 * u}px ${60 * u}px rgba(0,0,0,0.45)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: "35%",
            left: `${sheen * 100}%`,
            background: "linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0) 100%)",
            pointerEvents: "none",
            zIndex: 2,
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: `${18 * u}px ${24 * u}px ${14 * u}px`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 * u }}>
            <div
              style={{
                width: 42 * u,
                height: 42 * u,
                borderRadius: 10 * u,
                backgroundColor: accent,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: FONT,
                fontWeight: 900,
                fontSize: 24 * u,
              }}
            >
              {item.outlet.charAt(0).toUpperCase()}
            </div>
            <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 30 * u, color: "#111318" }}>{item.outlet}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 18 * u, color: "#8a8f99" }}>
            <svg width={26 * u} height={26 * u} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="M15.5 15.5 21 21" strokeLinecap="round" />
            </svg>
            <svg width={26 * u} height={26 * u} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </div>
        </div>
        <div style={{ height: 1, backgroundColor: "#e7e7ea" }} />
        <div
          style={{
            fontFamily: SERIF,
            fontWeight: 700,
            fontSize: headlineSize,
            lineHeight: 1.2,
            color: "#15171c",
            padding: `${18 * u}px ${24 * u}px ${24 * u}px`,
          }}
        >
          {item.headline}
        </div>
        <div style={{ height: 5 * u, backgroundColor: "#eceef1" }}>
          <div style={{ height: "100%", width: `${dwell * 100}%`, backgroundColor: accent }} />
        </div>
      </div>
    </div>
    </>
  );
};

export const NewsStack: React.FC<Props> = ({ news, layout, arrive, duration, breaking }) => {
  const start = arrive + 4;
  const end = duration - 12;
  const slot = (end - start) / news.length;

  return (
    <div
      style={{
        position: "absolute",
        top: layout.news.top,
        left: layout.news.left,
        width: layout.news.width,
      }}
    >
      {news.map((item, i) => (
        <Card
          key={i}
          item={item}
          layout={layout}
          inAt={Math.round(start + i * slot)}
          outAt={i < news.length - 1 ? Math.round(start + (i + 1) * slot) : end}
          first={i === 0}
          last={i === news.length - 1}
          breaking={breaking}
        />
      ))}
    </div>
  );
};
