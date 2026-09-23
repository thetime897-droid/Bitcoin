import React, { useMemo } from "react";
import { AbsoluteFill, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { Globe, type Arc, type Drape, type Network, type Ripple, type StateLift } from "./components/Globe";
import { Ticker } from "./components/Ticker";
import { HudChips } from "./components/HudChips";
import { StoryProgress } from "./components/StoryProgress";
import { ChannelBadge } from "./components/ChannelBadge";
import { IntroIdent } from "./components/IntroIdent";
import { FollowCta } from "./components/FollowCta";
import { RegionMarker } from "./components/RegionMarker";
import { SceneOverlay } from "./scenes/SceneOverlay";
import { makeProjection } from "./geo/projection";
import { useLayout } from "./layout";
import { buildTimeline, cameraAt, flyProgress, regionRevealAt, segmentAt, type Segment } from "./timeline";
import type { Episode } from "./types";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Sound effects are mixed quieter when a voice-over is present.
const SfxGain = React.createContext(1);

const Sfx: React.FC<{ at: number; name: string; volume: number }> = ({ at, name, volume }) => {
  const gain = React.useContext(SfxGain);
  return (
    <Sequence from={Math.max(0, Math.round(at))} layout="none" name={`SFX ${name}`}>
      <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume * gain} />
    </Sequence>
  );
};

const segmentSounds = (seg: Segment, episode: Episode) => {
  const out: React.ReactNode[] = [];
  if (seg.kind === "intro") return out;
  out.push(<Sfx key={`w${seg.from}`} at={seg.from} name={seg.fly >= 58 ? "whoosh-long" : "whoosh-short"} volume={0.55} />);
  if (seg.kind !== "scene") return out;
  const scene = episode.scenes[seg.index];
  if (scene.countryIso) out.push(<Sfx key={`t${seg.from}`} at={seg.from + seg.fly - 12} name="thump" volume={0.55} />);
  if (seg.index === 0) out.push(<Sfx key={`i${seg.from}`} at={seg.from + seg.fly - 2} name="impact" volume={0.7} />);
  if (seg.focus) out.push(<Sfx key={`f${seg.from}`} at={seg.from + seg.focusAt} name="whoosh-short" volume={0.3} />);
  if (scene.region) {
    const reveal = seg.from + regionRevealAt(seg);
    if (scene.region.stateFips) out.push(<Sfx key={`l${seg.from}`} at={reveal - 4} name="lift" volume={0.45} />);
    out.push(<Sfx key={`d${seg.from}`} at={reveal + 8} name="ding" volume={0.35} />);
  }
  return out;
};

export const MainVideo: React.FC<{ episode: Episode }> = ({ episode }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const layout = useLayout();
  const { u } = layout;

  const segments = useMemo(
    () => buildTimeline(episode, layout, fps),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [episode, layout.width, layout.height, fps],
  );
  const segIndex = segments.indexOf(segmentAt(segments, frame));
  const seg = segments[segIndex];
  const local = frame - seg.from;
  const camera = cameraAt(seg, local);
  const projection = makeProjection(camera, layout);

  const drapes: Drape[] = [];
  const prev = segments[segIndex - 1];
  if (prev?.kind === "scene") {
    const iso = episode.scenes[prev.index].countryIso;
    const opacity = interpolate(local, [0, 16], [1, 0], clamp);
    if (iso && opacity > 0) drapes.push({ key: `s${prev.index}`, iso, opacity, pop: 1 });
  }

  let arc: Arc | undefined;
  let ripple: Ripple | undefined;
  let stateLift: StateLift | undefined;
  let network: Network | undefined;
  let regionMarker: React.ReactNode = null;
  let shake = 0;

  if (seg.kind === "scene") {
    const scene = episode.scenes[seg.index];
    const revealAt = seg.fly - 12;
    if (scene.countryIso) {
      drapes.push({
        key: `s${seg.index}`,
        iso: scene.countryIso,
        opacity: interpolate(local, [revealAt, revealAt + 8], [0, 1], clamp),
        pop: spring({ frame: local - revealAt, fps, config: { damping: 10, stiffness: 120 } }),
      });
    }
    if (seg.arcFrom && seg.arcTo) {
      arc = {
        from: seg.arcFrom,
        to: seg.arcTo,
        progress: flyProgress(seg, local),
        opacity: interpolate(local, [seg.fly, seg.fly + 24], [1, 0], clamp),
      };
    }
    ripple = { at: [seg.target.lon, seg.target.lat], t: local - seg.fly + 4, marker: !scene.countryIso && !scene.badge && !scene.region };
    if (scene.network) {
      network = { t: local - seg.fly + 10, opacity: interpolate(local, [seg.fly - 10, seg.fly + 6, seg.duration - 12, seg.duration], [0, 1, 1, 0], clamp) };
    }
    if (scene.region) {
      const reveal = regionRevealAt(seg);
      if (scene.region.stateFips) {
        stateLift = {
          fips: scene.region.stateFips,
          iso: scene.countryIso,
          lift: spring({ frame: local - reveal, fps, config: { damping: 11, stiffness: 110 } }) * interpolate(local, [seg.duration - 12, seg.duration], [1, 0], clamp),
        };
      }
      regionMarker = (
        <RegionMarker region={scene.region} projection={projection} camera={camera} layout={layout} t={local - reveal - 6} remaining={seg.duration - local} />
      );
    }
    if (seg.index === 0) {
      const t = local - seg.fly;
      if (t >= 0 && t < 18) shake = (1 - t / 18) * 14 * u * Math.sin(t * 2.4);
    }
  }
  const location = seg.kind === "scene" ? episode.scenes[seg.index].label : seg.kind === "intro" ? "WELTMÄRKTE" : "RECAP";
  const firstScene = segments[1];
  const flash = seg.kind === "scene" && seg.index === 0 ? interpolate(local - seg.fly, [-2, 0, 10], [0, 0.5, 0], clamp) : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <AbsoluteFill style={{ translate: `${shake}px ${shake * 0.6}px` }}>
        <Globe
          camera={camera}
          projection={projection}
          layout={layout}
          frame={frame}
          drapes={drapes}
          arc={arc}
          ripple={ripple}
          stateLift={stateLift}
          network={network}
        />
        {regionMarker}
      </AbsoluteFill>
      {flash > 0 && <AbsoluteFill style={{ backgroundColor: `rgba(255,255,255,${flash})` }} />}

      {segments.map((s) =>
        s.kind === "scene" ? (
          <Sequence key={s.index} from={s.from} durationInFrames={s.duration} name={`Szene ${s.index + 1}: ${episode.scenes[s.index].label}`}>
            <SceneOverlay scene={episode.scenes[s.index]} index={s.index} layout={layout} arrive={s.fly} duration={s.duration} />
          </Sequence>
        ) : null,
      )}

      {segments
        .filter((s) => s.kind === "outro")
        .map((s) => (
          <Sequence key="outro" from={s.from} durationInFrames={s.duration} name="Outro">
            <FollowCta
              layout={layout}
              channelName={episode.channelName}
              logoSrc={episode.logoSrc}
              followLabel={episode.followLabel}
              followedLabel={episode.followedLabel}
            />
          </Sequence>
        ))}

      <IntroIdent
        layout={layout}
        title={episode.introTitle}
        subtitle={episode.introSubtitle}
        logoSrc={episode.logoSrc}
        endAt={firstScene.from + firstScene.fly - 6}
      />

      <StoryProgress layout={layout} segments={segments} />
      <Ticker items={episode.ticker} layout={layout} label="MÄRKTE" />
      <HudChips layout={layout} dateLabel={episode.dateLabel} location={location} locationSince={seg.from} />
      <ChannelBadge channelName={episode.channelName} brandLine={episode.brandLine} logoSrc={episode.logoSrc} layout={layout} />

      <SfxGain.Provider value={episode.voiceSrc ? 0.55 : 1}>
        <Sfx at={0} name="riser" volume={0.5} />
        <Sfx at={6} name="pop" volume={0.35} />
        {segments.flatMap((s) => segmentSounds(s, episode))}
      </SfxGain.Provider>
      {episode.voiceSrc && <Audio src={staticFile(episode.voiceSrc)} volume={1} />}
    </AbsoluteFill>
  );
};
