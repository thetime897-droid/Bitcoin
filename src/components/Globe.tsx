import React, { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import { geoDistance, geoInterpolate, geoOrthographic, geoPath, type GeoProjection } from "d3-geo";
import {
  BORDERS,
  STATE_BORDERS,
  cull,
  getMainFeature,
  getState,
  lodFor,
  visibleAngle,
  type Camera,
  type Chunk,
} from "../geo/globe";
import { getFlag } from "../geo/flags";
import { isOnFrontSide, maxCornerDistance } from "../geo/projection";
import type { Layout } from "../layout";
import { EarthCanvas } from "./EarthCanvas";

export type Drape = { key: string; iso: string; opacity: number; pop: number };
export type Arc = { from: [number, number]; to: [number, number]; progress: number; opacity: number };
export type Ripple = { at: [number, number]; t: number; marker: boolean };
export type StateLift = { fips: string; iso?: string; lift: number };
export type Network = { t: number; opacity: number };

type Props = {
  camera: Camera;
  projection: GeoProjection;
  layout: Layout;
  frame: number;
  drapes: Drape[];
  arc?: Arc;
  ripple?: Ripple;
  stateLift?: StateLift;
  network?: Network;
};

const HUBS: Record<string, [number, number]> = {
  ny: [-74.0, 40.7],
  sf: [-122.4, 37.8],
  sp: [-46.6, -23.5],
  ld: [-0.1, 51.5],
  fr: [8.7, 50.1],
  lg: [3.4, 6.5],
  db: [55.3, 25.2],
  sg: [103.8, 1.35],
  hk: [114.2, 22.3],
  tk: [139.7, 35.7],
  sy: [151.2, -33.9],
  zh: [8.5, 47.4],
};
const LINKS: [string, string][] = [
  ["ny", "ld"], ["ld", "fr"], ["ny", "sp"], ["ld", "lg"], ["fr", "db"], ["sf", "ny"],
  ["zh", "db"], ["db", "sg"], ["sg", "hk"], ["hk", "tk"], ["sg", "sy"], ["tk", "sf"], ["sp", "lg"],
];

const STARS = Array.from({ length: 160 }).map((_, i) => ({
  x: (i * 37.61) % 100,
  y: (i * 71.17) % 100,
  r: 0.6 + ((i * 13) % 3) * 0.5,
}));

const CLOUDS = Array.from({ length: 70 }).map((_, i) => ({
  lon: ((i * 47.3) % 360) - 180,
  lat: ((i * 29.7) % 120) - 60,
  r: 2.5 + ((i * 7) % 6),
  stretch: 1.4 + ((i * 3) % 4) * 0.35,
  rot: ((i * 53) % 60) - 30,
}));

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export const Globe: React.FC<Props> = ({ camera, projection, layout, frame, drapes, arc, ripple, stateLift, network }) => {
  const { width: W, height: H, focal, u } = layout;
  const radius = projection.scale();
  const path = geoPath(projection);
  // Flags are fitted to the whole country, not the part inside the frame; otherwise
  // the flag re-fits (slides and stretches) whenever the country crosses the frame edge.
  const unclippedPath = geoPath(
    geoOrthographic()
      .rotate(projection.rotate())
      .translate(projection.translate())
      .scale(projection.scale())
      .clipAngle(90)
      .precision(projection.precision()),
  );
  const center: [number, number] = [camera.lon, camera.lat];
  const angle = visibleAngle(radius, maxCornerDistance(layout));
  const lod = lodFor(camera.zoom);

  const join = (chunks: Chunk[]) => {
    let d = "";
    for (const c of cull(chunks, center, angle)) d += path(c.geo as never) ?? "";
    return d;
  };

  const borders = join(BORDERS[lod]);
  const statesOpacity = Math.min(1, Math.max(0, (camera.zoom - 1.8) / 1.4));
  const states = statesOpacity > 0 ? join(STATE_BORDERS) : "";

  const clouds = CLOUDS.map((c, i) => {
    const lon = c.lon + frame * 0.02;
    const dist = geoDistance([lon, c.lat], center);
    if (dist > Math.min(1.35, angle + 0.1)) return null;
    const p = projection([lon, c.lat]);
    if (!p) return null;
    const ry = ((c.r * Math.PI) / 180) * radius;
    const fade = 1 - dist / 1.35;
    return (
      <ellipse
        key={i}
        cx={p[0]}
        cy={p[1]}
        rx={ry * c.stretch}
        ry={ry}
        transform={`rotate(${c.rot} ${p[0]} ${p[1]})`}
        fill="url(#cloud)"
        opacity={0.32 * fade}
      />
    );
  });

  const stars = useMemo(
    () => STARS.map((s, i) => <circle key={i} cx={(s.x / 100) * W} cy={(s.y / 100) * H} r={s.r * u} fill="#fff" />),
    [W, H, u],
  );

  const flagLayer = (iso: string, x0: number, y0: number, w: number, h: number) => {
    const flag = getFlag(iso);
    if (!flag) return null;
    return (
      <g opacity={0.9}>
        <svg
          x={x0}
          y={y0}
          width={Math.max(1, w)}
          height={Math.max(1, h)}
          viewBox={flag.viewBox}
          preserveAspectRatio="xMidYMid slice"
          dangerouslySetInnerHTML={{ __html: flag.inner }}
        />
        <rect x={x0} y={y0} width={w} height={h} fill="url(#flag-sheen)" />
      </g>
    );
  };

  const renderStatePiece = (lift: StateLift, countryBounds?: [[number, number], [number, number]]) => {
    const state = getState(lift.fips);
    if (!state || lift.lift <= 0.001) return null;
    const sd = path(state as never);
    if (!sd) return null;
    const [scx, scy] = path.centroid(state as never);
    const [[sx0, sy0], [sx1, sy1]] = path.bounds(state as never);
    const l = lift.lift;
    const up = 16 * u * l;
    const [[x0, y0], [x1, y1]] = countryBounds ?? [[sx0, sy0], [sx1, sy1]];
    return (
      <g key="state-piece">
        <path d={sd} fill="rgba(0,0,0,0.55)" opacity={Math.min(1, l)} transform={`translate(${6 * u} ${6 * u + up * 0.4})`} />
        <g transform={`translate(${scx} ${scy - up}) scale(${1 + 0.07 * l}) translate(${-scx} ${-scy})`}>
          <clipPath id="state-clip">
            <path d={sd} />
          </clipPath>
          <g clipPath="url(#state-clip)">
            {lift.iso && countryBounds ? (
              <g style={{ filter: "saturate(1.15) brightness(1.08)" }}>{flagLayer(lift.iso, x0, y0, x1 - x0, y1 - y0)}</g>
            ) : (
              <rect x={sx0} y={sy0} width={sx1 - sx0} height={sy1 - sy0} fill="url(#gold)" />
            )}
          </g>
          <path d={sd} fill="none" stroke="#ffd23c" strokeWidth={18 * u} strokeOpacity={0.22 * l} strokeLinejoin="round" />
          <path d={sd} fill="none" stroke="#ffd23c" strokeWidth={7 * u} strokeOpacity={0.45 * l} strokeLinejoin="round" />
          <path d={sd} fill="none" stroke="#ffffff" strokeWidth={2.6 * u} strokeOpacity={l} strokeLinejoin="round" />
        </g>
      </g>
    );
  };

  const renderDrape = (drape: Drape) => {
    const main = getMainFeature(drape.iso, lod);
    if (!main || !getFlag(drape.iso) || drape.opacity <= 0) return null;
    const d = path(main as never);
    if (!d) return null;
    const bounds = unclippedPath.bounds(main as never) as [[number, number], [number, number]];
    const [[x0, y0], [x1, y1]] = bounds;
    const [cx, cy] = unclippedPath.centroid(main as never);
    const scale = 0.9 + 0.1 * drape.pop;
    const lift = 10 * u * drape.pop;
    const clipId = `drape-${drape.key}`;
    const liftHere = stateLift && stateLift.iso === drape.iso ? stateLift : undefined;
    return (
      <g key={drape.key} opacity={drape.opacity}>
        <path d={d} fill="rgba(0,0,0,0.38)" transform={`translate(${4 * u} ${5 * u + lift})`} filter="url(#soft-shadow)" />
        <g transform={`translate(${cx} ${cy - lift}) scale(${scale}) translate(${-cx} ${-cy})`}>
          <clipPath id={clipId}>
            <path d={d} />
          </clipPath>
          <g clipPath={`url(#${clipId})`}>{flagLayer(drape.iso, x0, y0, x1 - x0, y1 - y0)}</g>
          {states && (
            <g clipPath={`url(#${clipId})`}>
              <path d={states} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={1.4 * u} opacity={statesOpacity} />
            </g>
          )}
          <path d={d} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={5 * u} strokeLinejoin="round" />
          <path d={d} fill="none" stroke="rgba(8,10,16,0.9)" strokeWidth={1.8 * u} strokeLinejoin="round" />
          {liftHere && <path d={d} fill={`rgba(4,8,16,${0.3 * Math.min(1, liftHere.lift)})`} />}
          {liftHere && renderStatePiece(liftHere, bounds)}
        </g>
      </g>
    );
  };

  let arcEl: React.ReactNode = null;
  if (arc && arc.opacity > 0) {
    const d = path({ type: "LineString", coordinates: [arc.from, arc.to] } as never);
    const head = geoInterpolate(arc.from, arc.to)(arc.progress);
    const headP = isOnFrontSide(head, camera) ? projection(head) : null;
    const startP = isOnFrontSide(arc.from, camera) ? projection(arc.from) : null;
    arcEl = d ? (
      <g opacity={arc.opacity}>
        <path d={d} pathLength={1} strokeDasharray={`${arc.progress} 1`} fill="none" stroke="rgba(255,210,60,0.25)" strokeWidth={18 * u} strokeLinecap="round" />
        <path d={d} pathLength={1} strokeDasharray={`${arc.progress} 1`} fill="none" stroke="#ffd23c" strokeWidth={4.5 * u} strokeLinecap="round" />
        {startP && <circle cx={startP[0]} cy={startP[1]} r={9 * u} fill="#fff" stroke="#ffd23c" strokeWidth={4 * u} />}
        {headP && arc.progress < 1 && (
          <>
            <circle cx={headP[0]} cy={headP[1]} r={30 * u} fill="rgba(255,210,60,0.28)" />
            <circle cx={headP[0]} cy={headP[1]} r={11 * u} fill="#fff" />
          </>
        )}
      </g>
    ) : null;
  }

  let networkEl: React.ReactNode = null;
  if (network && network.opacity > 0) {
    const links = LINKS.map(([a, b], i) => {
      const t0 = i * 5;
      const draw = Math.min(1, Math.max(0, (network.t - t0) / 26));
      if (draw <= 0) return null;
      const from = HUBS[a];
      const to = HUBS[b];
      const d = path({ type: "LineString", coordinates: [from, to] } as never);
      if (!d) return null;
      const pulseT = ((network.t - t0) / 45 + i * 0.37) % 1;
      const pulse = geoInterpolate(from, to)(pulseT);
      const pp = isOnFrontSide(pulse, camera) ? projection(pulse) : null;
      return (
        <g key={i}>
          <path d={d} pathLength={1} strokeDasharray={`${draw} 1`} fill="none" stroke="rgba(247,147,26,0.9)" strokeWidth={2.5 * u} />
          {draw >= 1 && pp && <circle cx={pp[0]} cy={pp[1]} r={7 * u} fill="#fff" stroke="#f7931a" strokeWidth={3 * u} />}
        </g>
      );
    });
    const nodes = Object.values(HUBS).map((h, i) => {
      if (!isOnFrontSide(h, camera)) return null;
      const p = projection(h);
      if (!p) return null;
      const s = 1 + 0.35 * Math.sin(frame / 6 + i);
      return (
        <g key={`n${i}`}>
          <circle cx={p[0]} cy={p[1]} r={20 * u * s} fill="rgba(247,147,26,0.22)" />
          <circle cx={p[0]} cy={p[1]} r={8 * u} fill="#f7931a" stroke="#fff" strokeWidth={3 * u} />
        </g>
      );
    });
    networkEl = (
      <g opacity={network.opacity}>
        {links}
        {nodes}
      </g>
    );
  }

  let rippleEl: React.ReactNode = null;
  if (ripple && isOnFrontSide(ripple.at, camera)) {
    const p = projection(ripple.at);
    if (p) {
      const rings = [0, 14, 28].map((delay) => {
        const t = (ripple.t - delay) / 42;
        if (t <= 0 || t >= 1) return null;
        return (
          <circle key={delay} cx={p[0]} cy={p[1]} r={(24 + 200 * easeOut(t)) * u} fill="none" stroke="#ffd23c" strokeWidth={5 * u * (1 - t)} opacity={0.9 * (1 - t)} />
        );
      });
      const pulse = 1 + 0.25 * Math.sin(frame / 5);
      rippleEl = (
        <g>
          {rings}
          {ripple.marker && ripple.t > 0 && (
            <>
              <circle cx={p[0]} cy={p[1]} r={30 * u * pulse} fill="rgba(255,210,60,0.25)" />
              <circle cx={p[0]} cy={p[1]} r={12 * u} fill="#ffd23c" stroke="#fff" strokeWidth={4 * u} />
            </>
          )}
        </g>
      );
    }
  }

  const twinkle = 0.55 + 0.25 * Math.sin(frame / 9);
  const standaloneLift = stateLift && !drapes.some((d) => d.iso === stateLift.iso && d.opacity > 0) ? stateLift : undefined;

  return (
    <AbsoluteFill style={{ backgroundColor: "#02040a" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id="space" cx="50%" cy="45%" r="75%">
            <stop offset="0%" stopColor="#0b1530" />
            <stop offset="100%" stopColor="#010208" />
          </radialGradient>
          <radialGradient id="atmo" gradientUnits="userSpaceOnUse" cx={focal.x} cy={focal.y} r={radius * 1.1}>
            <stop offset={0.88} stopColor="rgba(110,190,255,0.75)" />
            <stop offset={0.93} stopColor="rgba(80,160,255,0.28)" />
            <stop offset={1} stopColor="rgba(60,140,255,0)" />
          </radialGradient>
          <radialGradient id="shade" gradientUnits="userSpaceOnUse" cx={focal.x - radius * 0.35} cy={focal.y - radius * 0.4} r={radius * 1.45}>
            <stop offset="0%" stopColor="rgba(255,250,235,0.10)" />
            <stop offset="50%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,6,20,0.45)" />
          </radialGradient>
          <filter id="soft-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation={6 * u} />
          </filter>
          <radialGradient id="cloud">
            <stop offset="0%" stopColor="rgba(255,255,255,0.75)" />
            <stop offset="55%" stopColor="rgba(255,255,255,0.3)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <linearGradient id="flag-sheen" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
            <stop offset="45%" stopColor="rgba(255,255,255,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.22)" />
          </linearGradient>
          <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffe27a" />
            <stop offset="100%" stopColor="#e0a800" />
          </linearGradient>
        </defs>

        <rect width={W} height={H} fill="url(#space)" />
        <g opacity={twinkle}>{stars}</g>
        <circle cx={focal.x} cy={focal.y} r={radius * 1.1} fill="url(#atmo)" />
      </svg>
      <EarthCanvas camera={camera} layout={layout} />
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        <path d={borders} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={2.6 * u} strokeLinejoin="round" />
        <path d={borders} fill="none" stroke="rgba(255,228,150,0.78)" strokeWidth={1.25 * u} strokeLinejoin="round" />
        {states && (
          <path d={states} fill="none" stroke="rgba(255,240,200,0.5)" strokeWidth={0.9 * u} strokeDasharray={`${6 * u} ${4 * u}`} opacity={statesOpacity} />
        )}

        <g>{clouds}</g>
        <circle cx={focal.x} cy={focal.y} r={radius} fill="url(#shade)" />

        {networkEl}
        {drapes.map(renderDrape)}
        {standaloneLift && renderStatePiece(standaloneLift)}
        {arcEl}
        {rippleEl}
      </svg>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)" }} />
    </AbsoluteFill>
  );
};
