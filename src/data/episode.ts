import type { Episode } from "../types";

// Folge "Rüstungsaktien", synchron zur Sprachaufnahme public/voice.mp3
// (Szenenlaengen aus scripts/voice-sync.py).
// Quellen (Stand 25. September 2026): CNBC, Investing.com, Barchart, Janes,
// The Defense Post, Defense Daily, Foreign Policy Journal, GuruFocus,
// Börse Express, IT-BOLTWISE, ad-hoc-news.de, Northrop-Grumman-Newsroom,
// BAE-Systems-Newsroom - siehe Notizen im Chat.
export const episode: Episode = {
  dateLabel: "25. SEPTEMBER",
  channelName: "Panda_investiert",
  brandLine: "MARKTUPDATE",
  logoSrc: "logo.jpg",
  voiceSrc: "voice.mp3",
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
          outlet: "Janes",
          headline: "US DoD, Lockheed Martin finalise contract for nearly 300 F-35s",
          accent: "#1e3a5f",
        },
        {
          outlet: "CNBC",
          headline: "Earnings upside for this defense giant isn't being appreciated by investors, says UBS",
          accent: "#005594",
        },
      ],
      stats: [
        { label: "Kurs", value: 528.09, decimals: 2, prefix: "$", direction: "up" },
        { label: "UBS-Kursziel", value: 674, decimals: 0, prefix: "$", direction: "up", tone: "good" },
      ],
      voiceover:
        "Los geht's mit Lockheed Martin: Der Rüstungsriese hat gerade einen 12,5-Milliarden-Dollar-Vertrag über 296 neue F-35 mit dem Pentagon finalisiert und ist zusätzlich am milliardenschweren Golden-Dome-Raketenschutzschild beteiligt. UBS hat die Aktie Anfang September von Neutral auf Kaufen hochgestuft, Kursziel 674 Dollar – rund 26 Prozent Potenzial. Trotzdem notiert sie bei 528 Dollar noch 24 Prozent unter ihrem Jahreshoch, die nächsten Zahlen gibt's am 27. Oktober.",
      durationInSeconds: 26.772,
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
          outlet: "Northrop Grumman Newsroom",
          headline:
            "Northrop Grumman Breaks Ground on New Facility to Support Strategic Deterrence and Advanced Aerospace Missions in Utah",
          accent: "#475569",
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
        "Auch Northrop Grumman punktet mit neuen Aufträgen: Zusammen mit True Anomaly baut der Konzern Aufklärungssatelliten für das Pentagon, parallel wächst in Utah die Sentinel-Fabrik für die neuen Atomraketen weiter. Der Umsatz stieg im zweiten Quartal um 5 Prozent auf 10,88 Milliarden Dollar, doch die operative Marge fiel von 13,8 auf 10,1 Prozent – Wachstum trifft auf Ausführungsrisiken. Die Aktie liegt gut 32 Prozent unter ihrem Jahreshoch, nächste Zahlen: 20. Oktober.",
      durationInSeconds: 28.215,
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
          outlet: "BAE Systems Newsroom",
          headline: "BAE Systems Announces 2025 Full Year Results",
          accent: "#0f766e",
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
        "In Großbritannien sichert sich BAE Systems 818 Millionen Dollar vom US-Heer für weitere gepanzerte Fahrzeuge vom Typ AMPV. Der Rückenwind kommt aber vor allem aus den Jahreszahlen: 2025 wuchs der Umsatz um 10 Prozent auf 30,7 Milliarden Pfund, der Gewinn je Aktie um 12 Prozent, dazu ein Rekord-Auftragsbestand von 83,6 Milliarden Pfund. Die Aktie steht seit Jahresbeginn rund 20 Prozent im Plus, Citi sieht noch 14 Prozent Potenzial nach oben.",
      durationInSeconds: 26.11,
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
          outlet: "GuruFocus",
          headline:
            "Rheinmetall AG (RNMBF) (Q2 2026) Earnings Call Highlights: Record Order Intake and Strategic Shifts Amid Naval Setback",
          accent: "#7c3aed",
        },
        {
          outlet: "ad-hoc-news",
          headline: "Die Rheinmetall-Aktie fällt am 25.09.2026 um 1,64 Prozent",
          accent: "#0f172a",
        },
      ],
      stats: [
        { label: "Auftragseingang Q2", value: 476, decimals: 0, suffix: " %", showSign: true, direction: "up", tone: "good" },
        { label: "Umsatzziel 2026", value: 14.2, decimals: 1, prefix: "bis € ", suffix: " Mrd.", direction: "down", tone: "bad" },
      ],
      voiceover:
        "Bei Rheinmetall ist die operative Entwicklung stark: Der Umsatz sprang im zweiten Quartal um 69 Prozent auf 3,29 Milliarden Euro, der Auftragseingang sogar um 476 Prozent auf 11,4 Milliarden Euro. Trotzdem bremst die Politik: Weil Deutschland das Fregattenprogramm F126 gestoppt hat, kappt der Konzern seine Umsatzprognose auf bis zu 14,2 Milliarden Euro. Deutsche Bank und Bernstein bleiben mit Kurszielen von 1.800 und 1.900 Euro trotzdem bei Kaufempfehlungen.",
      durationInSeconds: 28.36,
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
          headline: "Renk Group Aktie: 7,4 Milliarden Auftragsbestand",
          accent: "#16a34a",
        },
        {
          outlet: "IT-BOLTWISE",
          headline: "Renk nach Halbjahreszahlen: Rekord-Auftragseingang trifft auf Margenfrage",
          accent: "#b45309",
        },
      ],
      stats: [
        { label: "Auftragseingang H1", value: 29.7, decimals: 1, suffix: " %", showSign: true, direction: "up", tone: "good" },
        { label: "EPS Q2", value: 0.15, decimals: 2, prefix: "€", direction: "down", tone: "bad" },
      ],
      voiceover:
        "Und RENK zeigt: operative Stärke schützt nicht vor politischer Stimmung. Der Auftragseingang stieg im ersten Halbjahr um 29,7 Prozent auf 1,2 Milliarden Euro, der Auftragsbestand erreichte mit 7,4 Milliarden Euro ein Rekordhoch, und der Jahresausblick wurde bestätigt. Trotzdem ist die Aktie seit Jahresbeginn rund 22 Prozent gefallen, unter anderem weil US-Außenminister Rubio Putin offiziell zum G20-Gipfel eingeladen hat und Anleger auf Entspannung spekulieren. Der Gewinn je Aktie halbierte sich im zweiten Quartal auf 0,15 Euro.",
      durationInSeconds: 32.66,
    },
  ],
  outroVoiceover:
    "Das war dein Rüstungsaktien-Update: Milliardenaufträge auf der einen Seite, Friedens-Spekulation auf der anderen. Folg Panda investiert, damit du nichts verpasst.",
  outroSeconds: 11.46,
  followLabel: "Folgen",
  followedLabel: "Gefolgt",
};
