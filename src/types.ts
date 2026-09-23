import { z } from "zod";
import { zColor } from "@remotion/zod-types";

export const LonLatSchema = z.object({
  lon: z.number().min(-180).max(180),
  lat: z.number().min(-85).max(85),
});

export const NewsSchema = z.object({
  outlet: z.string(),
  headline: z.string(),
  accent: zColor().optional(),
});

export const StatSchema = z.object({
  label: z.string(),
  value: z.number(),
  decimals: z.number().int().min(0).max(4),
  prefix: z.string().optional(),
  suffix: z.string().optional(),
  showSign: z.boolean().optional(),
  direction: z.enum(["up", "down", "neutral"]),
  // Colour: "good" = green, "bad" = red. Defaults to up=good / down=bad.
  // Use "bad" for rising yields, oil or mortgage rates.
  tone: z.enum(["good", "bad", "neutral"]).optional(),
});

export const BadgeSchema = z.object({
  text: z.string(),
  color: zColor(),
  kind: z.enum(["logo", "coin", "icon"]),
});

export const TickerItemSchema = z.object({
  symbol: z.string(),
  value: z.string(),
  change: z.string().optional(),
  direction: z.enum(["up", "down", "neutral"]),
  tone: z.enum(["good", "bad", "neutral"]).optional(),
});

export const RegionSchema = z.object({
  // US state FIPS code (e.g. "36" = New York): lifts the state out of the map.
  stateFips: z.string().optional(),
  // Exact spot for the pin (city, HQ, exchange ...).
  point: LonLatSchema,
  title: z.string(),
  subtitle: z.string().optional(),
  // Camera zoom for the push-in onto the region (auto-fit for states).
  zoom: z.number().min(1).max(20).optional(),
});

export const SceneSchema = z
  .object({
    // Short location/topic chip, e.g. "USA · WALL STREET".
    label: z.string(),
    // world-atlas numeric ISO-3166-1 id (e.g. "840" = USA): drapes the real
    // flag over the country on the globe and frames the camera on it.
    countryIso: z.string().optional(),
    // Explicit camera target (e.g. an ocean view for crypto, or a close-up inside
    // a country). Overrides the automatic country framing when set.
    lonLat: LonLatSchema.optional(),
    // Camera zoom for lonLat targets (1 = whole globe visible).
    zoom: z.number().min(0.8).max(20).optional(),
    // Where exactly the news comes from: pin + label, optional lifted US state.
    region: RegionSchema.optional(),
    // Animated network of arcs between financial hubs (e.g. for crypto).
    network: z.boolean().optional(),
    badge: BadgeSchema.optional(),
    news: z.array(NewsSchema).min(1).max(3),
    stats: z.array(StatSchema).max(2).optional(),
    // Spoken narration for this scene (not rendered - reference for recording/sync).
    voiceover: z.string(),
    durationInSeconds: z.number().min(3).max(30),
  })
  .refine((scene) => scene.countryIso || scene.lonLat, {
    message: "Either countryIso or lonLat must be set to define the camera target.",
  });

export const EpisodeSchema = z.object({
  dateLabel: z.string(),
  channelName: z.string(),
  // Optional logo file in public/ (e.g. "logo.png"); falls back to a panda avatar.
  logoSrc: z.string().optional(),
  // Optional voice-over file in public/ (e.g. "voice.mp3"); starts at frame 0.
  voiceSrc: z.string().optional(),
  brandLine: z.string(),
  introTitle: z.string(),
  introSubtitle: z.string(),
  ticker: z.array(TickerItemSchema),
  scenes: z.array(SceneSchema).min(1),
  outroVoiceover: z.string(),
  followLabel: z.string(),
  followedLabel: z.string(),
});

export type Region = z.infer<typeof RegionSchema>;
export type News = z.infer<typeof NewsSchema>;
export type Stat = z.infer<typeof StatSchema>;
export type Badge = z.infer<typeof BadgeSchema>;
export type TickerItem = z.infer<typeof TickerItemSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type Episode = z.infer<typeof EpisodeSchema>;
