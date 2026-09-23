import type { Stat } from "./types";

export const FONT = "'Helvetica Neue', Arial, 'Liberation Sans', sans-serif";
export const SERIF = "Georgia, 'Times New Roman', serif";

export const COLORS = {
  up: "#22c55e",
  down: "#ef4444",
  neutral: "#e5e7eb",
  accent: "#ffd23c",
  glass: "rgba(8,12,24,0.78)",
  glassBorder: "rgba(255,255,255,0.14)",
};

type Direction = "up" | "down" | "neutral";
type Tone = "good" | "bad" | "neutral";

export const toneColor = (direction: Direction, tone?: Tone) => {
  const t = tone ?? (direction === "up" ? "good" : direction === "down" ? "bad" : "neutral");
  return t === "good" ? COLORS.up : t === "bad" ? COLORS.down : COLORS.neutral;
};

export const directionArrow = (d: Direction) => (d === "up" ? "▲" : d === "down" ? "▼" : "•");

export const formatStat = (stat: Stat, value: number) => {
  const abs = Math.abs(value).toLocaleString("de-DE", {
    minimumFractionDigits: stat.decimals,
    maximumFractionDigits: stat.decimals,
  });
  const sign = stat.showSign ? (value < 0 ? "−" : "+") : value < 0 ? "−" : "";
  return `${sign}${stat.prefix ?? ""}${abs}${stat.suffix ?? ""}`;
};
