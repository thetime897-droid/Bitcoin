import type { Episode } from "../types";

// SKRIPT-ENTWURF "Rüstungsaktien" - noch keine Sprachaufnahme.
// durationInSeconds sind Schätzungen (~2,9 Woerter/Sekunde); nach der
// Aufnahme mit `scripts/voice-sync.py` auf die echten Satzgrenzen setzen.
// Quellen (Stand 25. September 2026): CNBC, Investing.com, Barchart,
// The Defense Post, Defense Daily, Foreign Policy Journal, ad-hoc-news.de,
// Börse Express - siehe Notizen im Chat.
export const episode: Episode = {
  dateLabel: "25. SEPTEMBER",
  channelName: "Panda_investiert",
  brandLine: "MARKTUPDATE",
  logoSrc: "logo.jpg",
  // voiceSrc: "voice.mp3", // erst setzen, wenn die Aufnahme in public/ liegt
  introTitle: "RÜSTUNGS*AKTIEN*",
  introSubtitle: "5 AKTIEN IM CHECK",
  ticker: [
    { symbol: "LMT", value: "528,09 $", change: "+0,60 %", direction: "up" },
    { symbol: "NOC", value: "526,63 $", change: "−0,14 %", direction: "down", tone: "bad" },
    { symbol: "BAE", value: "2.050 p", change: "+0,69 %", direction: "up" },
    { symbol: "RHM", value: "973,80 €", change: "−1,64 %", direction: "down", tone: "bad" },
    { symbol: "RENK", value: "40,40 €", change: "+0,40 %", direction: "up" },
  ],
  scenes: [
    {
      label: "USA · LOCKHEED MARTIN",
      countryIso: "840",
      region: {
        stateFips: "24",
        point: { lon: -77.0947, lat: 38.9847 },
        title: "MARYLAND",
        subtitle: "Lockheed Martin · Bethesda",
      },
      badge: { text: "LMT", color: "#14284b", kind: "logo" },
      news: [
        {
          outlet: "Investing.com",
          headline: "Lockheed Martin wins $871 million F-35 contract modification",
          accent: "#f59e0b",
        },
        {
          outlet: "Barchart",
          headline:
            "Lockheed Martin Stock Looks Well-Positioned to Get a Big Lift From the Very Costly Golden Dome Initiative",
          accent: "#c8102e",
        },
      ],
      stats: [
        { label: "Kurs", value: 528.09, decimals: 2, prefix: "$", direction: "up" },
        { label: "Vs. Jahreshoch", value: -24.32, decimals: 2, suffix: " %", showSign: true, direction: "down", tone: "bad" },
      ],
      voiceover:
        "Los geht's mit Lockheed Martin: Der US-Rüstungsriese hat gerade einen milliardenschweren F-35-Vertrag mit dem Pentagon finalisiert und ist am Golden-Dome-Raketenschutzschild beteiligt. Die Aktie notiert bei 528 Dollar – trotzdem liegt sie noch rund 24 Prozent unter ihrem Jahreshoch.",
      durationInSeconds: 11.5,
    },
    {
      label: "USA · NORTHROP GRUMMAN",
      countryIso: "840",
      region: {
        stateFips: "51",
        point: { lon: -77.1711, lat: 38.8823 },
        title: "VIRGINIA",
        subtitle: "Northrop Grumman · Falls Church",
      },
      badge: { text: "NOC", color: "#2b3a4a", kind: "logo" },
      news: [
        {
          outlet: "The Defense Post",
          headline:
            "US Defense Innovation Unit and Space Systems Command select Northrop Grumman and True Anomaly for GEO reconnaissance satellite prototypes",
          accent: "#334155",
        },
        {
          outlet: "ad-hoc-news",
          headline: "Northrop Grumman stock falls as defense demand meets execution risk",
          accent: "#0f172a",
        },
      ],
      stats: [
        { label: "Kurs", value: 526.63, decimals: 2, prefix: "$", direction: "down", tone: "bad" },
        { label: "Operative Marge Q2", value: 10.1, decimals: 1, suffix: " %", direction: "down", tone: "bad" },
      ],
      voiceover:
        "Auch Northrop Grumman punktet mit neuen Aufträgen: Zusammen mit True Anomaly baut der Konzern Aufklärungssatelliten für das Pentagon. Doch im zweiten Quartal ist die operative Marge von 13,8 auf 10,1 Prozent gefallen – Wachstum trifft auf Ausführungsrisiken.",
      durationInSeconds: 12,
    },
    {
      label: "UK · BAE SYSTEMS",
      countryIso: "826",
      region: {
        point: { lon: -0.1276, lat: 51.5072 },
        title: "LONDON",
        subtitle: "BAE Systems · London Stock Exchange",
      },
      badge: { text: "BA.", color: "#0b3d6e", kind: "logo" },
      news: [
        {
          outlet: "Defense Daily",
          headline: "BAE Nabs $818 Million Order For More AMPVs",
          accent: "#1d4ed8",
        },
        {
          outlet: "Foreign Policy Journal",
          headline:
            "BAE Systems (LSE: BA.) Share Price Rises 0.69% As Order Backlog And 2025 Results Bolster Investor Confidence",
          accent: "#0ea5e9",
        },
      ],
      stats: [
        { label: "Kurs", value: 2050, decimals: 0, suffix: " p", direction: "up" },
        { label: "Seit Jahresbeginn", value: 19.6, decimals: 1, suffix: " %", showSign: true, direction: "up", tone: "good" },
      ],
      voiceover:
        "In Großbritannien sichert sich BAE Systems 818 Millionen Dollar vom US-Heer für weitere gepanzerte Fahrzeuge vom Typ AMPV. Die Aktie steht seit Jahresbeginn rund 20 Prozent im Plus, Citi sieht noch 14 Prozent Potenzial nach oben.",
      durationInSeconds: 11.5,
    },
    {
      label: "DEUTSCHLAND · RHEINMETALL",
      countryIso: "276",
      region: {
        point: { lon: 6.7735, lat: 51.2277 },
        title: "DÜSSELDORF",
        subtitle: "Rheinmetall · Konzernzentrale",
      },
      badge: { text: "RHM", color: "#d6540d", kind: "logo" },
      news: [
        {
          outlet: "CNBC",
          headline:
            "Rheinmetall stock volatile after trimming guidance as Germany's F126 warship cancellation hits sales outlook",
          accent: "#005594",
        },
        {
          outlet: "ad-hoc-news",
          headline: "Die Rheinmetall-Aktie fällt am 25.09.2026 um 1,64 Prozent",
          accent: "#0f172a",
        },
      ],
      stats: [
        { label: "Kurs heute", value: -1.64, decimals: 2, suffix: " %", showSign: true, direction: "down", tone: "bad" },
        { label: "Umsatzziel 2026", value: 14.2, decimals: 1, prefix: "bis € ", suffix: " Mrd.", direction: "down", tone: "bad" },
      ],
      voiceover:
        "Bei Rheinmetall dagegen bremst die Politik: Nachdem Deutschland das milliardenschwere Fregattenprogramm F126 gestoppt hat, kappt der Konzern seine Umsatzprognose auf bis zu 14,2 Milliarden Euro. Analysten wie Deutsche Bank und Bernstein bleiben trotzdem bei Kaufempfehlungen.",
      durationInSeconds: 11.5,
    },
    {
      label: "DEUTSCHLAND · RENK",
      countryIso: "276",
      region: {
        point: { lon: 10.8978, lat: 48.3705 },
        title: "AUGSBURG",
        subtitle: "RENK Group · Hauptsitz",
      },
      badge: { text: "RENK", color: "#4a4f57", kind: "logo" },
      news: [
        {
          outlet: "ad-hoc-news",
          headline: "Renk Group Aktie: Putin-Einladung zum G20 belastet Kurs",
          accent: "#0f172a",
        },
        {
          outlet: "Börse Express",
          headline: "Renk Group: Aktie nähert sich 52-Wochen-Tief",
          accent: "#16a34a",
        },
      ],
      stats: [
        { label: "Kurs", value: 40.4, decimals: 2, prefix: "€", direction: "up", tone: "good" },
        { label: "Seit Jahresbeginn", value: -22, decimals: 0, suffix: " %", showSign: true, direction: "down", tone: "bad" },
      ],
      voiceover:
        "Und RENK kratzt am 52-Wochen-Tief: Die Aktie ist seit Jahresbeginn rund 22 Prozent gefallen, nachdem US-Außenminister Rubio Putin offiziell zum G20-Gipfel eingeladen hat – Anleger spekulieren auf Entspannung. Dabei meldet RENK ein Rekord-Auftragspolster und bestätigt sein Jahresziel.",
      durationInSeconds: 13.5,
    },
  ],
  outroVoiceover:
    "Das war dein Rüstungsaktien-Update: Milliardenaufträge auf der einen Seite, Friedens-Spekulation auf der anderen. Folg Panda investiert, damit du nichts verpasst.",
  outroSeconds: 6.5,
  followLabel: "Folgen",
  followedLabel: "Gefolgt",
};
