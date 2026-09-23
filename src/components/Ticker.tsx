import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import type { TickerItem } from "../types";
import type { Layout } from "../layout";
import { FONT, directionArrow, toneColor } from "../ui";

type Props = { items: TickerItem[]; layout: Layout; label: string };

export const Ticker: React.FC<Props> = ({ items, layout, label }) => {
  const frame = useCurrentFrame();
  const { u, ticker, width } = layout;
  if (items.length === 0) return null;

  const itemWidth = 440 * u;
  const loop = itemWidth * items.length;
  const offset = (frame * 2.4 * u) % loop;
  const copies = Math.ceil(width / loop) + 2;
  const enter = interpolate(frame, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const labelWidth = 150 * u;

  return (
    <div
      style={{
        position: "absolute",
        top: ticker.top,
        left: 0,
        width,
        height: ticker.height,
        backgroundColor: "rgba(6,10,20,0.82)",
        borderTop: "1px solid rgba(255,255,255,0.12)",
        borderBottom: "1px solid rgba(255,255,255,0.12)",
        overflow: "hidden",
        opacity: enter,
        translate: `0 ${(1 - enter) * -20 * u}px`,
      }}
    >
      <div style={{ position: "absolute", left: labelWidth - offset, top: 0, height: "100%", display: "flex" }}>
        {Array.from({ length: copies }).flatMap((_, c) =>
          items.map((item, i) => (
            <div
              key={`${c}-${i}`}
              style={{
                width: itemWidth,
                height: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12 * u,
                paddingLeft: 24 * u,
                fontFamily: FONT,
                fontSize: 24 * u,
                whiteSpace: "nowrap",
                overflow: "hidden",
                borderLeft: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <span style={{ fontWeight: 900, color: "#fff" }}>{item.symbol}</span>
              <span style={{ color: "#cbd5e1", fontVariantNumeric: "tabular-nums" }}>{item.value}</span>
              {item.change && (
                <span style={{ color: toneColor(item.direction, item.tone), fontWeight: 800 }}>
                  {directionArrow(item.direction)} {item.change}
                </span>
              )}
            </div>
          )),
        )}
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: labelWidth,
          height: "100%",
          backgroundColor: "#ffd23c",
          color: "#0b0b0b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 22 * u,
          letterSpacing: 1.5 * u,
          boxShadow: `${8 * u}px 0 ${16 * u}px rgba(0,0,0,0.4)`,
        }}
      >
        {label}
      </div>
    </div>
  );
};
