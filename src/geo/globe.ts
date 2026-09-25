import { geoArea, geoCentroid, geoDistance, geoOrthographic, geoPath } from "d3-geo";
import { feature, mesh } from "topojson-client";
import countries50 from "world-atlas/countries-50m.json";
import countries10 from "world-atlas/countries-10m.json";
import usStates from "us-atlas/states-10m.json";

type Pos = [number, number];
type Ring = Pos[];
type PolygonCoords = Ring[];
type Geometry =
  | { type: "Polygon"; coordinates: PolygonCoords }
  | { type: "MultiPolygon"; coordinates: PolygonCoords[] }
  | { type: "MultiLineString"; coordinates: Pos[][] };

export type GeoFeature = {
  type: "Feature";
  id?: string;
  properties: { name?: string };
  geometry: Geometry;
};

export type Camera = { lon: number; lat: number; zoom: number; roll?: number };
export type Lod = "low" | "high";

// A piece of geometry with a bounding cap, so off-screen parts can be skipped per frame.
export type Chunk = { geo: GeoFeature; center: Pos; radius: number };

type Topology = { objects: Record<string, unknown> };
const obj = (t: unknown, name: string) => (t as Topology).objects[name] as never;

const featuresOf = (topology: unknown, name: string) =>
  (feature(topology as never, obj(topology, name)) as unknown as { features: GeoFeature[] }).features.filter(
    (f) => f.geometry,
  );

const allPositions = (g: Geometry): Pos[] => {
  if (g.type === "Polygon") return g.coordinates.flat();
  if (g.type === "MultiPolygon") return g.coordinates.flat(2);
  return g.coordinates.flat();
};

const toChunk = (geo: GeoFeature): Chunk => {
  const center = geoCentroid(geo as never) as Pos;
  let radius = 0;
  for (const p of allPositions(geo.geometry)) radius = Math.max(radius, geoDistance(center, p));
  return { geo, center, radius };
};

// Groups the lines of a mesh into ~cell-degree tiles.
const lineChunks = (lines: Pos[][], cell: number): Chunk[] => {
  const tiles = new Map<string, Pos[][]>();
  for (const line of lines) {
    const mid = line[Math.floor(line.length / 2)];
    const key = `${Math.floor(mid[0] / cell)}:${Math.floor(mid[1] / cell)}`;
    const list = tiles.get(key) ?? [];
    list.push(line);
    tiles.set(key, list);
  }
  return [...tiles.values()].map((coords) =>
    toChunk({ type: "Feature", properties: {}, geometry: { type: "MultiLineString", coordinates: coords } }),
  );
};

const borderLines = (topology: unknown, name: string) =>
  (mesh(topology as never, obj(topology, name), (a: unknown, b: unknown) => a !== b) as unknown as { coordinates: Pos[][] })
    .coordinates;

export const BORDERS: Record<Lod, Chunk[]> = {
  low: lineChunks(borderLines(countries50, "countries"), 20),
  high: lineChunks(borderLines(countries10, "countries"), 10),
};

export const STATE_BORDERS: Chunk[] = lineChunks(borderLines(usStates, "states"), 6);

const COUNTRIES: Record<Lod, GeoFeature[]> = {
  low: featuresOf(countries50, "countries"),
  high: featuresOf(countries10, "countries"),
};
const STATES = featuresOf(usStates, "states");

// Keeps only the country's big landmasses (drops e.g. Alaska/Hawaii for the USA)
// so the flag drape and camera framing focus on the main territory.
const mainCache = new Map<string, GeoFeature | null>();
export const getMainFeature = (iso: string, lod: Lod = "low"): GeoFeature | null => {
  const key = `${lod}:${iso}`;
  if (mainCache.has(key)) return mainCache.get(key) ?? null;
  const f = COUNTRIES[lod].find((c) => c.id === iso) ?? null;
  let result: GeoFeature | null = f;
  if (f && f.geometry.type === "MultiPolygon") {
    const polys = f.geometry.coordinates.map((coords) => ({
      coords,
      area: geoArea({ type: "Polygon", coordinates: coords } as never),
    }));
    const valid = polys.filter((p) => p.area < 2 * Math.PI);
    const max = Math.max(...valid.map((p) => p.area));
    result = { ...f, geometry: { type: "MultiPolygon", coordinates: valid.filter((p) => p.area >= max * 0.3).map((p) => p.coords) } };
  }
  mainCache.set(key, result);
  return result;
};

export const getState = (fips: string): GeoFeature | null => STATES.find((s) => s.id === fips) ?? null;

const fitFeature = (f: GeoFeature, box: { w: number; h: number }, globeRadius: number, min: number, max: number): Camera => {
  const [lon, lat] = geoCentroid(f as never);
  const unit = geoOrthographic().rotate([-lon, -lat]).translate([0, 0]).scale(1).clipAngle(90);
  const [[x0, y0], [x1, y1]] = geoPath(unit).bounds(f as never);
  const scale = Math.min(box.w / Math.max(x1 - x0, 1e-4), box.h / Math.max(y1 - y0, 1e-4));
  return { lon, lat, zoom: Math.min(max, Math.max(min, scale / globeRadius)) };
};

export const fitCountryCamera = (iso: string, box: { w: number; h: number }, globeRadius: number): Camera | null => {
  const f = getMainFeature(iso);
  return f ? fitFeature(f, box, globeRadius, 2.2, 12) : null;
};

export const fitStateCamera = (fips: string, box: { w: number; h: number }, globeRadius: number): Camera | null => {
  const f = getState(fips);
  return f ? fitFeature(f, { w: box.w * 0.45, h: box.h * 0.45 }, globeRadius, 3, 9) : null;
};

export const lodFor = (zoom: number): Lod => (zoom >= 2 ? "high" : "low");

// Angular radius (from the camera centre) that can be on screen.
export const visibleAngle = (radiusPx: number, maxCornerPx: number) =>
  radiusPx <= maxCornerPx ? Math.PI / 2 : Math.asin(maxCornerPx / radiusPx);

export const cull = (chunks: Chunk[], center: Pos, angle: number) =>
  chunks.filter((c) => geoDistance(c.center, center) - c.radius < angle + 0.02);
