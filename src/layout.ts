import { useVideoConfig } from "remotion";

export type Layout = {
  width: number;
  height: number;
  portrait: boolean;
  // Unit for sizes: 1 = 1px on a 1080px short side.
  u: number;
  // Screen point the camera target lands on.
  focal: { x: number; y: number };
  // Box a country should roughly fill when framed.
  fitBox: { w: number; h: number };
  // Globe radius at zoom 1.
  globeRadius: number;
  progress: { top: number; left: number; right: number };
  ticker: { top: number; height: number };
  chips: { top: number; left: number };
  news: { top: number; left: number; width: number };
  stats: { top: number; left: number; width: number; align: "center" | "left" };
  badgeOffset: { x: number; y: number };
  channel: { left: number; bottom: number };
};

export const computeLayout = (width: number, height: number): Layout => {
  const portrait = height > width;
  const u = Math.min(width, height) / 1080;
  const globeRadius = Math.min(width, height) * 0.42;

  if (portrait) {
    return {
      width,
      height,
      portrait,
      u,
      focal: { x: width * 0.5, y: height * 0.57 },
      fitBox: { w: width * 0.8, h: height * 0.28 },
      globeRadius,
      progress: { top: 150 * u, left: 48 * u, right: 48 * u },
      ticker: { top: 168 * u, height: 58 * u },
      chips: { top: 246 * u, left: 48 * u },
      news: { top: 318 * u, left: 48 * u, width: width - 96 * u },
      stats: { top: height * 0.57 + 300 * u, left: 48 * u, width: width - 96 * u, align: "center" },
      badgeOffset: { x: 250 * u, y: -230 * u },
      channel: { left: 40 * u, bottom: 56 * u },
    };
  }

  return {
    width,
    height,
    portrait,
    u,
    focal: { x: width * 0.66, y: height * 0.54 },
    fitBox: { w: width * 0.52, h: height * 0.55 },
    globeRadius,
    progress: { top: 22 * u, left: 40 * u, right: 40 * u },
    ticker: { top: 36 * u, height: 56 * u },
    chips: { top: 112 * u, left: 64 * u },
    news: { top: 184 * u, left: 64 * u, width: 700 * u },
    stats: { top: 640 * u, left: 64 * u, width: 700 * u, align: "left" },
    badgeOffset: { x: 270 * u, y: -210 * u },
    channel: { left: 40 * u, bottom: 40 * u },
  };
};

export const useLayout = (): Layout => {
  const { width, height } = useVideoConfig();
  return computeLayout(width, height);
};
