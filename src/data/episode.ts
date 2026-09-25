import type { Episode } from "../types";

// Folge vom 25. September 2026 (Freitag), synchron zur Sprachaufnahme public/voice.mp3.
// Szenenlaengen aus der Audio-Analyse: jeder Kameraflug startet 0,5 s vor dem
// jeweiligen Satz. Taeglich nur diese Datei austauschen.
export const episode: Episode = {
  dateLabel: "25. SEPTEMBER",
  channelName: "Panda_investiert",
  brandLine: "MARKTUPDATE",
  logoSrc: "logo.jpg",
  // voiceSrc: "voice.mp3", // Aufnahme nicht im Repo - nur setzen, wenn public/voice.mp3 existiert
  introTitle: "MARKT*UPDATE*",
  introSubtitle: "PANDA INVESTIERT",
  ticker: [
    { symbol: "S&P 500", value: "7.743,41", change: "+0,51 %", direction: "up" },
    { symbol: "NASDAQ", value: "27.068,72", change: "+0,50 %", direction: "up" },
    { symbol: "DOW", value: "51.828,62", change: "+0,93 %", direction: "up" },
    { symbol: "US 10J", value: "5,18 %", change: "Hoch seit 2007", direction: "up", tone: "bad" },
    { symbol: "BRENT", value: "104,32 $", change: "−2,14 %", direction: "down", tone: "good" },
    { symbol: "WTI", value: "92,41 $", change: "−2,33 %", direction: "down", tone: "good" },
    { symbol: "META", value: "", change: "+13 % Woche", direction: "up" },
    { symbol: "ORACLE", value: "", change: "Force Majeure", direction: "down" },
    { symbol: "BITCOIN", value: "≈ 85.000 $", change: "~+10 % Woche", direction: "up" },
    { symbol: "MICRON", value: "", change: "+279 % 2026", direction: "up" },
  ],
  scenes: [
    {
      label: "USA · WALL STREET",
      countryIso: "840",
      region: { stateFips: "36", point: { lon: -74.0107, lat: 40.7069 }, title: "NEW YORK", subtitle: "Wall Street · NYSE" },
      news: [
        {
          outlet: "Yahoo Finance",
          headline: "Stock market today: Dow, S&P 500, Nasdaq notch weekly wins as market shrugs off bond sell-off, oil prices ease",
          accent: "#6001d2",
        },
        {
          outlet: "TheStreet",
          headline: "Stock Market Today (Sept. 25, 2026): S&P 500, Nasdaq jump as yields, oil prices test investors",
          accent: "#e4002b",
        },
      ],
      stats: [
        { label: "US-Rendite 10J", value: 5.18, decimals: 2, suffix: " %", direction: "up", tone: "bad" },
        { label: "Dow", value: 0.93, decimals: 2, suffix: " %", showSign: true, direction: "up" },
      ],
      voiceover:
        "Die US-Renditen steigen auf das höchste Niveau seit der Finanzkrise – 5,18 Prozent bei der zehnjährigen Staatsanleihe. Und trotzdem dreht die Wall Street ins Plus: Der Dow steigt fast ein Prozent und beendet damit eine dreiwöchige Verlustserie.",
      durationInSeconds: 11.097,
    },
    {
      label: "IRAN · STRASSE VON HORMUS",
      countryIso: "364",
      region: { point: { lon: 56.3, lat: 26.55 }, title: "STRASSE VON HORMUS", subtitle: "Hoffnung auf Öffnung", zoom: 5.2 },
      badge: { text: "🛢️", color: "#f59e0b", kind: "icon" },
      news: [
        {
          outlet: "Yahoo Finance",
          headline: "Stock market today: Dow, S&P 500, Nasdaq trims losses as hopes of Hormuz deal offset rising bond yields",
          accent: "#6001d2",
        },
      ],
      stats: [
        { label: "Brent / Barrel", value: 104.32, decimals: 2, prefix: "$", direction: "down", tone: "good" },
        { label: "Brent heute", value: -2.14, decimals: 2, suffix: " %", showSign: true, direction: "down", tone: "good" },
      ],
      voiceover:
        "Der Grund für die gute Laune: Hoffnung am Persischen Golf. Die USA und der Iran arbeiten an einem Plan, die Straße von Hormus wieder zu öffnen. Der Ölpreis gibt nach – Brent verliert über zwei Prozent.",
      durationInSeconds: 9.98,
    },
    {
      label: "USA · META",
      countryIso: "840",
      region: { stateFips: "06", point: { lon: -122.1817, lat: 37.4848 }, title: "KALIFORNIEN", subtitle: "Meta · Menlo Park" },
      badge: { text: "META", color: "#0866ff", kind: "logo" },
      news: [
        {
          outlet: "Invezz",
          headline: "Meta stock surges 36% in September on Muse AI boom: can it breach the $2T mark?",
          accent: "#0f766e",
        },
        {
          outlet: "GuruFocus",
          headline: "Meta Platforms (META) Stock Surges Over 11% on Positive AI Product Outlook",
          accent: "#1d4ed8",
        },
      ],
      stats: [
        { label: "Diese Woche", value: 13, decimals: 0, suffix: " %", showSign: true, direction: "up" },
        { label: "September", value: 36, decimals: 0, suffix: " %", showSign: true, direction: "up" },
      ],
      voiceover:
        "Der Star der Woche heißt Meta. Der neue KI-Assistent Muse stürmt die App-Charts – die Aktie legt diese Woche rund 13 Prozent zu, im September sogar 36 Prozent.",
      durationInSeconds: 9.12,
    },
    {
      label: "USA · ORACLE",
      countryIso: "840",
      region: { stateFips: "35", point: { lon: -106.68, lat: 31.86 }, title: "NEW MEXICO", subtitle: "Oracle · Project Jupiter" },
      badge: { text: "ORCL", color: "#c74634", kind: "logo" },
      news: [
        {
          outlet: "CNBC",
          headline: "Oracle sends 'force majeure' notice about data center project — stock drops 3%",
          accent: "#005594",
        },
        { outlet: "Yahoo Finance", headline: "Why Oracle's force majeure notice is freaking out AI bulls", accent: "#6001d2" },
      ],
      stats: [
        { label: "Oracle (Do.)", value: -3, decimals: 0, suffix: " %", showSign: true, direction: "down" },
        { label: "Rechenzentrum", value: 165, decimals: 0, prefix: "$", suffix: " Mrd.", direction: "neutral" },
      ],
      voiceover:
        "Ganz anders bei Oracle: Für sein 165-Milliarden-Dollar-Rechenzentrum in New Mexico hat der Konzern am Donnerstag „höhere Gewalt“ angemeldet. Die Aktie verliert – und die KI-Bullen werden nervös.",
      durationInSeconds: 10.88,
    },
    {
      label: "CHINA × USA · HANDEL",
      countryIso: "156",
      region: { point: { lon: 116.4074, lat: 39.9042 }, title: "PEKING", subtitle: "Handelsfrieden bis 10. Januar" },
      news: [
        {
          outlet: "CNBC",
          headline: "U.S.-China trade truce extended for two months, Bessent says, as Xi begins state visit",
          accent: "#005594",
        },
      ],
      voiceover:
        "Entspannung dagegen zwischen Washington und Peking: Beim Staatsbesuch von Xi Jinping verlängern die USA und China ihren Handelsfrieden bis zum 10. Januar.",
      durationInSeconds: 7.97,
    },
    {
      label: "KRYPTO · BITCOIN",
      lonLat: { lon: 150, lat: 28 },
      zoom: 1.3,
      network: true,
      badge: { text: "₿", color: "#f7931a", kind: "coin" },
      news: [
        {
          outlet: "Yahoo Finance",
          headline: "Bitcoin and ethereum prices today, Friday, September 25, 2026: Is bitcoin finally on a path to $250,000?",
          accent: "#6001d2",
        },
      ],
      stats: [{ label: "Bitcoin", value: 85000, decimals: 0, prefix: "≈ $", direction: "neutral" }],
      voiceover: "Bitcoin hält sich bei rund 85.000 Dollar – mit fast zehn Prozent Plus auf Wochensicht.",
      durationInSeconds: 4.77,
    },
    {
      label: "USA · MICRON",
      countryIso: "840",
      region: { stateFips: "16", point: { lon: -116.2023, lat: 43.615 }, title: "IDAHO", subtitle: "Micron · Boise" },
      badge: { text: "MU", color: "#2f80ed", kind: "logo" },
      news: [
        { outlet: "The Motley Fool", headline: "Act Now: Micron Could Skyrocket After Sept. 30", accent: "#6b21a8" },
        {
          outlet: "Investing.com",
          headline: "Micron earnings outlook: what to watch ahead of the September 30 report",
          accent: "#f59e0b",
        },
      ],
      stats: [{ label: "Micron seit Jahresstart", value: 279, decimals: 0, suffix: " %", showSign: true, direction: "up" }],
      voiceover:
        "Und nächste Woche wird's heiß: Am 30. September legt Micron Zahlen vor – die Aktie ist in diesem Jahr schon um fast 280 Prozent gestiegen. Und am selben Tag kommen neue Inflationsdaten.",
      durationInSeconds: 11.67,
    },
  ],
  outroVoiceover: "Das war dein Marktupdate. Folg Panda investiert, damit du nichts verpasst.",
  outroSeconds: 5.29,
  followLabel: "Folgen",
  followedLabel: "Gefolgt",
};
