import type { Episode } from "../types";

// Folge vom 23. September 2026.
// Story-Bogen: Hook (Zins-Schock an der Wall Street) -> Ursache 1 (Oel/Iran)
// -> Ursache 2 (Fed) -> Folge (Hypotheken) -> Krypto (Bitcoin stabil + Wal)
// -> Lichtblick (IonQ/Nvidia) -> Cliffhanger (Trump-Xi-Gipfel morgen).
// Taeglich nur diese Datei austauschen. `voiceover` wird nicht gerendert -
// das ist dein Sprechtext pro Szene.
export const episode: Episode = {
  dateLabel: "23. SEPTEMBER",
  channelName: "Panda_investiert",
  brandLine: "MARKTUPDATE",
  logoSrc: "logo.jpg",
  introTitle: "MARKT*UPDATE*",
  introSubtitle: "PANDA INVESTIERT",
  ticker: [
    { symbol: "S&P 500", value: "7.706,03", change: "−0,75 %", direction: "down" },
    { symbol: "NASDAQ", value: "26.936,04", change: "−1,13 %", direction: "down" },
    { symbol: "DOW", value: "51.511,59", change: "−0,68 %", direction: "down" },
    { symbol: "US 10J", value: "> 5 %", change: "19-J.-Hoch", direction: "up", tone: "bad" },
    { symbol: "FED", value: "3,75–4,00 %", change: "+0,25", direction: "up", tone: "bad" },
    { symbol: "BRENT", value: "101,61 $", change: "+2,37 %", direction: "up", tone: "bad" },
    { symbol: "BITCOIN", value: "≈ 86.500 $", change: "stabil", direction: "neutral" },
    { symbol: "IONQ", value: "", change: "bis +11 %", direction: "up" },
    { symbol: "HYPO 30J", value: "7,12 %", change: "Hoch seit 2024", direction: "up", tone: "bad" },
  ],
  scenes: [
    {
      label: "USA · WALL STREET",
      countryIso: "840",
      region: { stateFips: "36", point: { lon: -74.0107, lat: 40.7069 }, title: "NEW YORK", subtitle: "Wall Street · NYSE" },
      news: [
        { outlet: "CNBC", headline: "10-year Treasury yield rockets to 19-year high. Here's what's driving the spike", accent: "#005594" },
        { outlet: "Börsen-Zeitung", headline: "US-Rendite klettert auf höchsten Stand seit 2007", accent: "#0b2a4a" },
      ],
      stats: [
        { label: "US-Rendite 10J", value: 5, decimals: 0, prefix: "> ", suffix: " %", direction: "up", tone: "bad" },
        { label: "Nasdaq", value: -1.13, decimals: 2, suffix: " %", showSign: true, direction: "down" },
      ],
      voiceover:
        "Die Zinsen explodieren – und reißen die Wall Street mit. Die zehnjährige US-Rendite springt über fünf Prozent, so hoch wie seit 2007 nicht mehr. Die Nasdaq verliert mehr als ein Prozent, der Dow über 350 Punkte.",
      durationInSeconds: 10.5,
    },
    {
      label: "IRAN · ÖLPREIS",
      countryIso: "364",
      region: { point: { lon: 56.3, lat: 26.55 }, title: "STRASSE VON HORMUS", subtitle: "Wichtigstes Öl-Nadelöhr", zoom: 5.2 },
      badge: { text: "🛢️", color: "#f59e0b", kind: "icon" },
      news: [
        { outlet: "Aktien.news", headline: "US-Renditesprung und Energiekrise setzen Finanzmärkte unter Druck", accent: "#0f766e" },
        { outlet: "Charles Schwab", headline: "Crude in Control: Stocks Stumble as Diplomacy Eyed", accent: "#00a0df" },
      ],
      stats: [
        { label: "Brent / Barrel", value: 101.61, decimals: 2, prefix: "$", direction: "up", tone: "bad" },
        { label: "Tagesplus", value: 2.37, decimals: 2, suffix: " %", showSign: true, direction: "up", tone: "bad" },
      ],
      voiceover:
        "Der Grund? Zum einen der Iran-Krieg: Er treibt den Ölpreis – Brent klettert über 100 Dollar pro Barrel. Und teures Öl heißt: Die Inflation bleibt hartnäckig.",
      durationInSeconds: 9,
    },
    {
      label: "USA · FEDERAL RESERVE",
      countryIso: "840",
      region: { point: { lon: -77.0457, lat: 38.8928 }, title: "WASHINGTON D.C.", subtitle: "Federal Reserve", zoom: 6.5 },
      badge: { text: "🏛️", color: "#94a3b8", kind: "icon" },
      news: [
        { outlet: "CNBC", headline: "Fed rate decision September 2026: Rates rise to 3.75%-4%", accent: "#005594" },
        { outlet: "Charles Schwab", headline: "Fed Hikes in 12-0 Vote, Commits to Inflation Fight", accent: "#00a0df" },
      ],
      stats: [{ label: "Leitzins", value: 4, decimals: 2, prefix: "3,75 – ", suffix: " %", direction: "up", tone: "bad" }],
      voiceover:
        "Zum anderen die Fed: Letzte Woche hat sie die Zinsen zum ersten Mal seit 2023 erhöht – und signalisiert, dass noch mehr kommen kann.",
      durationInSeconds: 8.5,
    },
    {
      label: "USA · IMMOBILIEN",
      countryIso: "840",
      badge: { text: "🏠", color: "#38bdf8", kind: "icon" },
      news: [
        { outlet: "Yahoo Finance", headline: "U.S. 30-year mortgage rate hits 7.12%, highest since May 2024", accent: "#6001d2" },
        { outlet: "CNBC", headline: "Nearly 10% of borrowers opted for riskier mortgages last week, as rates soared over 7%", accent: "#005594" },
      ],
      stats: [
        { label: "Hypothek 30J", value: 7.12, decimals: 2, suffix: " %", direction: "up", tone: "bad" },
        { label: "Anteil variabel", value: 9.8, decimals: 1, suffix: " %", direction: "up", tone: "bad" },
      ],
      voiceover:
        "Die Rechnung zahlen Immobilienkäufer: Der 30-jährige Hypothekenzins steigt auf 7,12 Prozent – der höchste Stand seit Mai 2024. Fast jeder Zehnte weicht schon auf riskantere, variable Kredite aus.",
      durationInSeconds: 9,
    },
    {
      label: "KRYPTO · BITCOIN",
      lonLat: { lon: -25, lat: 28 },
      zoom: 1.3,
      network: true,
      badge: { text: "₿", color: "#f7931a", kind: "coin" },
      news: [
        { outlet: "finanzen.net", headline: "Kryptomarkt: Bitcoin hält 86.500 Dollar – schlafender Wal erwacht nach 14 Jahren", accent: "#1d4ed8" },
        { outlet: "The Crypto Basic", headline: "600 Bitcoin Bought at Around $7 Moved After 14.2 Years", accent: "#f7931a" },
      ],
      stats: [
        { label: "Bitcoin", value: 86500, decimals: 0, prefix: "≈ $", direction: "neutral" },
        { label: "Wal bewegt", value: 600, decimals: 0, suffix: " BTC", direction: "neutral" },
      ],
      voiceover:
        "Und Bitcoin? Bleibt erstaunlich cool bei rund 86.500 Dollar. Spannender: Ein Wal, der 14 Jahre geschlafen hat, bewegt plötzlich 600 Bitcoin – gekauft für rund acht Dollar das Stück.",
      durationInSeconds: 9.5,
    },
    {
      label: "USA · QUANTEN-AKTIEN",
      countryIso: "840",
      region: { stateFips: "24", point: { lon: -76.9378, lat: 38.9897 }, title: "MARYLAND", subtitle: "IonQ · College Park" },
      badge: { text: "IONQ", color: "#6f5bd0", kind: "logo" },
      news: [
        { outlet: "finanzen.ch", headline: "Durchbruch bei der Fehlerkorrektur: IonQ-Aktie springt kräftig an", accent: "#e30613" },
        { outlet: "CNBC", headline: "IonQ shares rise after company says it made a major quantum computing breakthrough", accent: "#005594" },
      ],
      stats: [
        { label: "IonQ (Hoch)", value: 11, decimals: 0, suffix: " %", showSign: true, direction: "up" },
        { label: "D-Wave", value: 5, decimals: 0, suffix: " %", showSign: true, direction: "up" },
      ],
      voiceover:
        "Doch es gibt Gewinner: IonQ aus Maryland springt zeitweise um mehr als elf Prozent – nach einem Durchbruch bei der Quanten-Fehlerkorrektur in Echtzeit. Und Nvidia holt sich IonQs neuen Quantenrechner ins eigene Forschungszentrum.",
      durationInSeconds: 10.5,
    },
    {
      label: "CHINA × USA · GIPFEL",
      countryIso: "156",
      region: { point: { lon: 116.4074, lat: 39.9042 }, title: "PEKING", subtitle: "Xi reist nach Washington" },
      news: [
        { outlet: "Yahoo Finance", headline: "Trump meets Xi this week. Expect small steps on trade and AI, not breakthroughs.", accent: "#6001d2" },
        { outlet: "CNBC", headline: "Trump-Xi meeting: Why China's self-sufficiency changes the calculus", accent: "#005594" },
      ],
      voiceover:
        "Und morgen wird's spannend: Xi Jinping trifft Donald Trump in Washington. Handel, Chips, seltene Erden – erwartet werden kleine Schritte, aber große Schlagzeilen.",
      durationInSeconds: 9,
    },
  ],
  outroVoiceover: "Das war dein Marktupdate. Folg Panda investiert, damit du morgen nichts verpasst.",
  followLabel: "Folgen",
  followedLabel: "Gefolgt",
};
