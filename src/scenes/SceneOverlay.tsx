import React from "react";
import { AbsoluteFill } from "remotion";
import { NewsStack } from "../components/NewsCard";
import { StatCallout } from "../components/StatCallout";
import { Badge } from "../components/Badge";
import type { Layout } from "../layout";
import type { Scene } from "../types";

type Props = {
  scene: Scene;
  index: number;
  layout: Layout;
  arrive: number;
  duration: number;
};

export const SceneOverlay: React.FC<Props> = ({ scene, index, layout, arrive, duration }) => {
  const centered = !scene.countryIso && !scene.region;
  // The region label sits right of the pin, so the badge moves to the other side.
  const badgeLayout: Layout = scene.region
    ? { ...layout, badgeOffset: { x: -Math.abs(layout.badgeOffset.x), y: layout.badgeOffset.y } }
    : layout;
  return (
    <AbsoluteFill>
      {scene.badge && (
        <Badge badge={scene.badge} layout={badgeLayout} inAt={centered ? arrive - 6 : arrive + 30} outAt={duration - 8} centered={centered} />
      )}
      {scene.stats && <StatCallout stats={scene.stats} layout={layout} arrive={arrive} duration={duration} />}
      <NewsStack news={scene.news} layout={layout} arrive={arrive} duration={duration} breaking={index === 0} />
    </AbsoluteFill>
  );
};
