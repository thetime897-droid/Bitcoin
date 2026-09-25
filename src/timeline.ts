import { geoDistance, geoInterpolate } from "d3-geo";
import { fitCountryCamera, fitStateCamera, type Camera } from "./geo/globe";
import type { Layout } from "./layout";
import type { Episode, Scene } from "./types";

export const INTRO_FRAMES = 40;
export const OUTRO_FRAMES = 105;
const FOCUS_DELAY = 34;
const FOCUS_LENGTH = 44;

export type Segment = {
  kind: "intro" | "scene" | "outro";
  index: number;
  from: number;
  duration: number;
  fly: number;
  start: Camera;
  target: Camera;
  push: number;
  drift: number;
  // Optional second camera move inside the scene (country -> state / city).
  focus?: Camera;
  focusAt: number;
  focusLength: number;
  arcFrom?: [number, number];
  arcTo?: [number, number];
};

export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// Zero velocity and zero acceleration at both ends: no visible "kick" when a flight starts or lands.
export const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const sceneFrames = (scene: Scene, fps: number) => Math.round(scene.durationInSeconds * fps);

export const outroFrames = (episode: Episode, fps: number) =>
  episode.outroSeconds ? Math.round(episode.outroSeconds * fps) : OUTRO_FRAMES;

export const computeTotalFrames = (episode: Episode, fps: number) =>
  INTRO_FRAMES + episode.scenes.reduce((sum, s) => sum + sceneFrames(s, fps), 0) + outroFrames(episode, fps);

const sceneCamera = (scene: Scene, layout: Layout): Camera => {
  // An explicit lonLat always wins, so a country scene can use a custom close-up.
  if (!scene.lonLat && scene.countryIso) {
    const cam = fitCountryCamera(scene.countryIso, layout.fitBox, layout.globeRadius);
    if (cam) return cam;
  }
  const ll = scene.lonLat ?? { lon: 0, lat: 20 };
  return { lon: ll.lon, lat: ll.lat, zoom: scene.zoom ?? 2.5 };
};

const focusCamera = (scene: Scene, target: Camera, layout: Layout): Camera | undefined => {
  const region = scene.region;
  if (!region) return undefined;
  if (region.zoom) return { lon: region.point.lon, lat: region.point.lat, zoom: region.zoom };
  if (region.stateFips) {
    const cam = fitStateCamera(region.stateFips, layout.fitBox, layout.globeRadius);
    if (cam) return { ...cam, zoom: Math.max(cam.zoom, target.zoom * 1.4) };
  }
  return undefined;
};

// Where the story "is" in a scene (used for the flight arcs).
const sceneAnchor = (scene: Scene, target: Camera): [number, number] =>
  scene.region ? [scene.region.point.lon, scene.region.point.lat] : [target.lon, target.lat];

const flyFrames = (a: Camera, b: Camera) => {
  const d = geoDistance([a.lon, a.lat], [b.lon, b.lat]);
  const zr = Math.abs(Math.log(b.zoom / a.zoom));
  return Math.round(Math.min(84, Math.max(42, 36 + 24 * d + 8 * zr)));
};

const flyBetween = (a: Camera, b: Camera, p: number, dipEnabled: boolean): Camera => {
  const [lon, lat] = geoInterpolate([a.lon, a.lat], [b.lon, b.lat])(p);
  const d = geoDistance([a.lon, a.lat], [b.lon, b.lat]);
  // Pull back mid-flight on long hops (Google-Earth style), none on short ones.
  const dip = dipEnabled ? Math.min(1, Math.max(0.3, 1.12 - d / 1.5)) : 1;
  const logZoom = lerp(Math.log(a.zoom), Math.log(b.zoom), p) + Math.log(dip) * Math.sin(Math.PI * p);
  // Bank into the turn on longer flights, like a plane.
  const dLon = ((((b.lon - a.lon) % 360) + 540) % 360) - 180;
  const bank = dipEnabled ? -Math.sign(dLon) * Math.min(7, 2 + d * 3.5) * Math.sin(Math.PI * p) : 0;
  const roll = lerp(a.roll ?? 0, b.roll ?? 0, p) + bank;
  return { lon, lat, zoom: Math.max(0.75, Math.exp(logZoom)), roll };
};

const drifted = (base: Camera, drift: number, push: number, e: number): Camera => ({
  lon: base.lon + drift * e,
  lat: base.lat,
  zoom: base.zoom * (1 + push * e),
  roll: 0,
});

export const cameraAt = (seg: Segment, local: number): Camera => {
  if (local < seg.fly) {
    return flyBetween(seg.start, seg.target, smootherstep(clamp01(local / seg.fly)), true);
  }
  if (!seg.focus) {
    const hold = seg.duration - seg.fly;
    return drifted(seg.target, seg.drift, seg.push, easeInOutSine(hold > 0 ? clamp01((local - seg.fly) / hold) : 1));
  }
  const settle = (t: number) => drifted(seg.target, seg.drift * 0.3, 0.03, easeInOutSine(clamp01((t - seg.fly) / (seg.focusAt - seg.fly))));
  if (local < seg.focusAt) return settle(local);
  const pushEnd = seg.focusAt + seg.focusLength;
  if (local < pushEnd) {
    return flyBetween(settle(seg.focusAt), seg.focus, smootherstep((local - seg.focusAt) / seg.focusLength), false);
  }
  const hold = seg.duration - pushEnd;
  return drifted(seg.focus, 2 / seg.focus.zoom, 0.05, easeInOutSine(hold > 0 ? clamp01((local - pushEnd) / hold) : 1));
};

const endCamera = (seg: Segment) => cameraAt(seg, seg.duration);

export const buildTimeline = (episode: Episode, layout: Layout, fps: number): Segment[] => {
  const segments: Segment[] = [];
  const first = sceneCamera(episode.scenes[0], layout);
  const introStart: Camera = { lon: first.lon + 40, lat: first.lat * 0.5 + 5, zoom: 0.9 };

  segments.push({
    kind: "intro",
    index: -1,
    from: 0,
    duration: INTRO_FRAMES,
    fly: 0,
    start: introStart,
    target: introStart,
    push: 0.05,
    drift: -18,
    focusAt: 0,
    focusLength: 0,
  });

  let from = INTRO_FRAMES;
  let prevAnchor: [number, number] | undefined;
  episode.scenes.forEach((scene, i) => {
    const prev = segments[segments.length - 1];
    const target = sceneCamera(scene, layout);
    const start = endCamera(prev);
    const duration = sceneFrames(scene, fps);
    const fly = flyFrames(start, target);
    const focus = focusCamera(scene, target, layout);
    const focusAt = fly + FOCUS_DELAY;
    const seg: Segment = {
      kind: "scene",
      index: i,
      from,
      duration,
      fly,
      start,
      target,
      push: 0.07,
      drift: 4 / target.zoom,
      focus: focus && duration - (focusAt + FOCUS_LENGTH) >= 45 ? focus : undefined,
      focusAt,
      focusLength: FOCUS_LENGTH,
    };
    if (prevAnchor) {
      seg.arcFrom = prevAnchor;
      seg.arcTo = [target.lon, target.lat];
    }
    prevAnchor = sceneAnchor(scene, target);
    segments.push(seg);
    from += duration;
  });

  const last = segments[segments.length - 1];
  const outroTarget: Camera = { lon: last.target.lon - 20, lat: 15, zoom: 0.8 };
  const outroStart = endCamera(last);
  segments.push({
    kind: "outro",
    index: -1,
    from,
    duration: outroFrames(episode, fps),
    fly: flyFrames(outroStart, outroTarget),
    start: outroStart,
    target: outroTarget,
    push: 0,
    drift: -25,
    focusAt: 0,
    focusLength: 0,
  });

  return segments;
};

export const segmentAt = (segments: Segment[], frame: number): Segment => {
  for (let i = segments.length - 1; i >= 0; i--) {
    if (frame >= segments[i].from) return segments[i];
  }
  return segments[0];
};

export const flyProgress = (seg: Segment, local: number) =>
  seg.fly > 0 ? smootherstep(clamp01(local / seg.fly)) : 1;

// Frame (scene-local) at which the region pin/state lift should appear.
export const regionRevealAt = (seg: Segment) => (seg.focus ? seg.focusAt + seg.focusLength - 16 : seg.fly + 14);
