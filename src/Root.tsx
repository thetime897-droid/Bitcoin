import "./index.css";
import React from "react";
import { CalculateMetadataFunction, Composition } from "remotion";
import { z } from "zod";
import { MainVideo } from "./MainVideo";
import { computeTotalFrames } from "./timeline";
import { EpisodeSchema, type Episode } from "./types";
import { episode } from "./data/episode";

const MainVideoSchema = z.object({ episode: EpisodeSchema });
const FPS = 30;

const calculateMetadata: CalculateMetadataFunction<{ episode: Episode }> = ({ props }) => ({
  durationInFrames: computeTotalFrames(props.episode, FPS),
});

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Short"
        component={MainVideo}
        fps={FPS}
        width={1080}
        height={1920}
        durationInFrames={computeTotalFrames(episode, FPS)}
        schema={MainVideoSchema}
        defaultProps={{ episode }}
        calculateMetadata={calculateMetadata}
      />
      <Composition
        id="Long"
        component={MainVideo}
        fps={FPS}
        width={1920}
        height={1080}
        durationInFrames={computeTotalFrames(episode, FPS)}
        schema={MainVideoSchema}
        defaultProps={{ episode }}
        calculateMetadata={calculateMetadata}
      />
    </>
  );
};
