import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import type { Layout } from "../layout";
import type { Segment } from "../timeline";

type Props = { layout: Layout; segments: Segment[] };

export const StoryProgress: React.FC<Props> = ({ layout, segments }) => {
  const frame = useCurrentFrame();
  const { u, progress } = layout;
  const scenes = segments.filter((s) => s.kind === "scene");
  const enter = interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div
      style={{
        position: "absolute",
        top: progress.top,
        left: progress.left,
        right: progress.right,
        display: "flex",
        gap: 8 * u,
        opacity: enter,
      }}
    >
      {scenes.map((s) => {
        const fill = Math.min(1, Math.max(0, (frame - s.from) / s.duration));
        return (
          <div key={s.index} style={{ flex: 1, height: 6 * u, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.25)", overflow: "hidden" }}>
            <div style={{ width: `${fill * 100}%`, height: "100%", backgroundColor: "#fff" }} />
          </div>
        );
      })}
    </div>
  );
};
