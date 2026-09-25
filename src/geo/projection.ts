import { geoDistance, geoOrthographic, type GeoProjection } from "d3-geo";
import type { Camera } from "./globe";
import type { Layout } from "../layout";

export const makeProjection = (camera: Camera, layout: Layout): GeoProjection =>
  geoOrthographic()
    .rotate([-camera.lon, -camera.lat, camera.roll ?? 0])
    .translate([layout.focal.x, layout.focal.y])
    .scale(layout.globeRadius * camera.zoom)
    .clipAngle(90)
    .clipExtent([
      [-20, -20],
      [layout.width + 20, layout.height + 20],
    ])
    .precision(0.35);

export const maxCornerDistance = (layout: Layout) => {
  const { focal, width, height } = layout;
  return Math.max(
    Math.hypot(focal.x, focal.y),
    Math.hypot(width - focal.x, focal.y),
    Math.hypot(focal.x, height - focal.y),
    Math.hypot(width - focal.x, height - focal.y),
  );
};

export const isOnFrontSide = (point: [number, number], camera: Camera, margin = 0.03) =>
  geoDistance(point, [camera.lon, camera.lat]) < Math.PI / 2 - margin;
