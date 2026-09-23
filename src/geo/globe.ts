import { geoArea, geoCentroid, geoDistance, geoOrthographic, geoPath } from "d3-geo";
import { feature, mesh } from "topojson-client";
import countries50 from "world-atlas/countries-50m.json";
import countries10 from "world-atlas/countries-10m.json";
import land50 from "world-atlas/land-50m.json";
import land10 from "world-atlas/land-10m.json";
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

export type Camera = { lon: number; lat: number; zoom: number };
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

const polygonChunks = (topology: unknown, name: string): Chunk[] => {
  const out: Chunk[] = [];
  for (const f of featuresOf(topology, name)) {
    const polys = f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : f.geometry.type === "Polygon" ? [f.geometry.coordinates] : [];
    for (const coords of polys) {
      // A few degenerate slivers in the 10m data read as "the whole sphere".
      if (geoArea({ type: "Polygon", coordinates: coords } as never) > 2 * Math.PI) continue;
      out.push(toChunk({ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: coords } }));
    }
  }
  return out;
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

export const LAND: Record<Lod, Chunk[]> = {
  low: polygonChunks(land50, "land"),
  high: polygonChunks(land10, "land"),
};

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

// Rough biome regions (lon0, lat0, lon1, lat1) blended over the land for a satellite look.
const box = (lon0: number, lat0: number, lon1: number, lat1: number): GeoFeature => {
  const ring: Pos[] = [];
  const step = 2;
  for (let x = lon0; x < lon1; x += step) ring.push([x, lat0]);
  for (let y = lat0; y < lat1; y += step) ring.push([lon1, y]);
  for (let x = lon1; x > lon0; x -= step) ring.push([x, lat1]);
  for (let y = lat1; y > lat0; y -= step) ring.push([lon0, y]);
  ring.push([lon0, lat0]);
  const geo: GeoFeature = { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } };
  // d3 treats rings winding the "wrong" way as the complement of the box.
  if (geoArea(geo as never) > 2 * Math.PI) (geo.geometry.coordinates as PolygonCoords)[0] = ring.slice().reverse();
  return geo;
};

export const BIOMES: { color: string; opacity: number; chunks: Chunk[] }[] = [
  {
    color: "#c9a96d", // deserts
    opacity: 0.9,
    chunks: [
      box(-17, 15, 35, 31), box(35, 13, 58, 31), box(52, 25, 70, 36), box(116, -32, 146, -19),
      box(-118, 28, -103, 38), box(-112, 24, -100, 31), box(12, -28, 25, -18), box(-72, -28, -68, -18),
      box(68, 24, 74, 29), box(-72, -50, -65, -38),
    ].map(toChunk),
  },
  {
    color: "#a89a6b", // steppe
    opacity: 0.8,
    chunks: [box(55, 38, 118, 48), box(-110, 40, -98, 49), box(20, 45, 55, 52)].map(toChunk),
  },
  {
    color: "#2c5a31", // rainforest / dense forest
    opacity: 0.85,
    chunks: [box(-76, -15, -48, 4), box(10, -8, 30, 5), box(95, -8, 125, 15), box(-130, 45, -120, 60), box(60, 55, 130, 66)].map(toChunk),
  },
  {
    color: "#8c9876", // tundra
    opacity: 0.8,
    chunks: [box(-170, 64, -60, 74), box(20, 66, 180, 76)].map(toChunk),
  },
  {
    color: "#eef3f6", // ice
    opacity: 0.97,
    chunks: [box(-74, 59, -11, 84), box(-179, -89, 179, -60), box(-125, 74, -60, 84), box(10, 76, 110, 84)].map(toChunk),
  },
];

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
