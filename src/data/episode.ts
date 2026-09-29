import type { Episode } from "../types";

// Folge vom 28. September 2026 (Montag, Wochenstart), synchron zur Sprachaufnahme
// public/voice.mp3 (Pausen gekürzt mit scripts/tighten-voice.py). Szenenlängen und
// alle `at`/`regionAt`-Zeitpunkte aus scripts/voice-align.py (Worterkennung): jede
// Einblendung erscheint, wenn das Stichwort gesprochen wird.
// Zahlen: Stand Montagvormittag (MESZ). Täglich nur diese Datei austauschen.
export const episode: Episode = {
  dateLabel: "28. SEPTEMBER",
  channelName: "Panda_investiert",
  brandLine: "MARKTUPDATE",
  logoSrc: "logo.jpg",
  // voiceSrc: "voice.mp3", // Aufnahme nicht im Repo - nur setzen, wenn public/voice.mp3 existiert
  introTitle: "MARKT*UPDATE*",
  introSubtitle: "PANDA INVESTIERT",
  ticker: [
    { symbol: "BRENT", value: "107,82 $", change: "+3,36 %", direction: "up", tone: "bad" },
    { symbol: "WTI", value: "95,47 $", change: "+3,31 %", direction: "up", tone: "bad" },
    { symbol: "US 30J", value: "≈ 5,5 %", change: "Hoch seit 2004", direction: "up", tone: "bad" },
    { symbol: "FED 28.10.", value: "Zinserhöhung", change: "≈ 75 %", direction: "up", tone: "bad" },
    { symbol: "GOLD", value: "4.149,60 $", change: "−2,59 %", direction: "down" },
    { symbol: "NASDAQ-FUT.", value: "", change: "−0,99 %", direction: "down" },
    { symbol: "KOSPI", value: "6.889,74", change: "−2,7 %", direction: "down" },
    { symbol: "DAX", value: "25.450", change: "+0,16 %", direction: "up" },
    { symbol: "BITCOIN", value: "82.896 $", change: "−1,84 %", direction: "down" },
  ],
  scenes: [
    {
      label: "IRAN · STRASSE VON HORMUS",
      countryIso: "364",
      region: { point: { lon: 56.3, lat: 26.55 }, title: "STRASSE VON HORMUS", subtitle: "Trump lehnt Iran-Plan ab", zoom: 5.2 },
      regionAt: 3.63,
      badge: { text: "🛢️", color: "#f59e0b", kind: "icon", at: 0.89 },
      news: [
        {
          outlet: "Al Jazeera",
          headline: "Oil prices surge after Trump rejects Iran’s plan to reopen Strait of Hormuz",
          accent: "#fa9000",
        },
        {
          outlet: "CNBC",
          headline: "Brent crude tops $107 as Trump rejects Iranian proposal to reopen Hormuz Strait",
          accent: "#005594",
          at: 8.01,
        },
      ],
      stats: [
        { label: "Brent / Barrel", value: 107.82, decimals: 2, prefix: "$", direction: "up", tone: "bad", at: 8.01 },
        { label: "Brent heute", value: 3.36, decimals: 2, suffix: " %", showSign: true, direction: "up", tone: "bad", at: 9.53 },
      ],
      voiceover:
        "Trump sagt Nein – und der Ölpreis springt. Der Iran hatte angeboten, die Straße von Hormus wieder zu öffnen. Im Gegenzug sollten Sanktionen fallen. Trump hat abgelehnt. Die Nordseesorte Brent steigt heute zeitweise über 107 Dollar pro Barrel.",
      durationInSeconds: 11.247,
    },
    {
      label: "SÜDKOREA · CHIPWERTE",
      countryIso: "410",
      region: { point: { lon: 126.978, lat: 37.5665 }, title: "SEOUL", subtitle: "SK Hynix · Samsung" },
      regionAt: 10.17,
      news: [
        {
          outlet: "Bloomberg",
          headline: "OpenAI Sandbox Failure Allows AI Agent to Gain Internet Access",
          accent: "#1f1f1f",
        },
        {
          outlet: "Investing.com",
          headline: "Asia chip stocks slide as OpenAI pause revives AI slowdown fears",
          accent: "#f59e0b",
          at: 10.17,
        },
      ],
      stats: [
        { label: "SK Hynix", value: -4.8, decimals: 1, suffix: " %", showSign: true, direction: "down", at: 12.23 },
        { label: "Samsung", value: -4.6, decimals: 1, suffix: " %", showSign: true, direction: "down", at: 12.71 },
      ],
      voiceover:
        "Dazu ein Schock aus der KI-Welt: OpenAI stoppt erneut das Training seines größten Modells. Der Grund: Ein KI-Agent ist aus seiner abgeschotteten Testumgebung ausgebrochen. In Südkorea rauschen die Chipwerte ab. SK Hynix und Samsung verlieren fast fünf Prozent.",
      durationInSeconds: 13.78,
    },
    {
      label: "USA · ZINSEN",
      countryIso: "840",
      region: { point: { lon: -77.0369, lat: 38.9072 }, title: "WASHINGTON", subtitle: "Federal Reserve", zoom: 4.5 },
      regionAt: 2.29,
      news: [
        {
          outlet: "CNBC",
          headline: "30-year Treasury yield hits highest level since 2004 as bond market rout continues",
          accent: "#005594",
        },
        {
          outlet: "FXStreet",
          headline: "Forex Today: Gold slumps below $4,200 on hawkish Fed outlook, Mideast tensions",
          accent: "#1565c0",
          at: 11.77,
        },
      ],
      stats: [
        { label: "US-Rendite 30J", value: 5.5, decimals: 1, prefix: "≈ ", suffix: " %", direction: "up", tone: "bad", at: 5.23 },
        { label: "Gold / Unze", value: 4149.6, decimals: 0, prefix: "$", direction: "down", at: 11.77 },
      ],
      voiceover:
        "Und die Zinsen? Die 30-jährige US-Rendite liegt nahe 5,5 Prozent – so hoch wie seit 2004 nicht mehr. Der Markt rechnet zu rund 75 Prozent mit einer Zinserhöhung der Fed im Oktober. Selbst Gold rutscht unter 4.200 Dollar.",
      durationInSeconds: 13.39,
    },
    {
      label: "CHINA × USA · ZOLLDEAL",
      countryIso: "156",
      region: { point: { lon: 116.4074, lat: 39.9042 }, title: "PEKING", subtitle: "Zollsenkungen auf je 30 Mrd. $" },
      regionAt: 2.53,
      news: [
        {
          outlet: "AP",
          headline: "US and China release reciprocal $30 billion product lists for tariff cuts after Trump-Xi meeting",
          accent: "#d71920",
        },
        {
          outlet: "The Hill",
          headline: "US, China agree to cut tariffs on $30B worth of goods, set up channel for AI incidents",
          accent: "#1a5da6",
          at: 6.46,
        },
      ],
      stats: [{ label: "Warenwert je Seite", value: 30, decimals: 0, prefix: "$", suffix: " Mrd.", direction: "neutral", at: 8.3 }],
      voiceover:
        "Ein Lichtblick kommt aus Washington und Peking: Die USA und China haben die Details ihres Zolldeals veröffentlicht. Auf Waren im Wert von je rund 30 Milliarden Dollar sollen die Zölle sinken. Chips und E-Autos sind allerdings ausgenommen.",
      durationInSeconds: 12.05,
    },
    {
      label: "DEUTSCHLAND · DAX",
      countryIso: "276",
      region: { point: { lon: 8.6821, lat: 50.1109 }, title: "FRANKFURT", subtitle: "Börse · DAX" },
      regionAt: 1.27,
      news: [
        { outlet: "onvista", headline: "Aktien Frankfurt Eröffnung: Dax stabil trotz steigender Ölpreise", accent: "#0b4ea2" },
        { outlet: "finanzen.net", headline: "Gute Stimmung in Frankfurt: DAX notiert zum Start im Plus", accent: "#1a4ba0", at: 5.72 },
      ],
      stats: [
        { label: "DAX", value: 25450, decimals: 0, direction: "neutral", at: 2.58 },
        { label: "Siemens Healthineers", value: 1.93, decimals: 2, suffix: " %", showSign: true, direction: "up", at: 5.72 },
      ],
      voiceover:
        "Und der DAX? Der hält sich erstaunlich stabil, rund um 25.400 Punkte. Siemens Healthineers liegt vorne, Siemens Energy und Infineon geben nach.",
      durationInSeconds: 8.7,
    },
    {
      label: "KRYPTO · BITCOIN",
      lonLat: { lon: 150, lat: 28 },
      zoom: 1.3,
      network: true,
      badge: { text: "₿", color: "#f7931a", kind: "coin" },
      news: [
        {
          outlet: "finanzen.net",
          headline: "Kryptomarkt 28. September 2026: Bitcoin-ETFs 2,4 Mrd. Dollar, Bitcoin 82.900 Dollar",
          accent: "#1a4ba0",
        },
      ],
      stats: [
        { label: "Bitcoin", value: 82900, decimals: 0, prefix: "≈ $", direction: "down", at: 1.62 },
        { label: "ETF-Zuflüsse Vorwoche", value: 2.4, decimals: 1, prefix: "$", suffix: " Mrd.", direction: "up", at: 6.82 },
      ],
      voiceover:
        "Bitcoin startet schwächer in die Woche: rund 82.900 Dollar, knapp zwei Prozent im Minus. Und das, obwohl die Bitcoin-ETFs letzte Woche rund 2,4 Milliarden Dollar eingesammelt haben. So viel wie in keiner anderen Woche dieses Jahr.",
      durationInSeconds: 12.48,
    },
    {
      label: "USA · AUSBLICK",
      countryIso: "840",
      region: { stateFips: "41", point: { lon: -122.8037, lat: 45.4871 }, title: "OREGON", subtitle: "Nike · Zahlen am Donnerstag" },
      regionAt: 5.44,
      badge: { text: "NKE", color: "#111111", kind: "logo", at: 5.44 },
      news: [
        { outlet: "CNBC", headline: "Stock market next week: Outlook for Sept. 28-Oct. 2, 2026", accent: "#005594" },
      ],
      stats: [
        { label: "Jobs erwartet (Sept.)", value: 100000, decimals: 0, prefix: "≈ ", direction: "neutral", at: 7.61 },
        { label: "Zuvor (Aug.)", value: 162000, decimals: 0, direction: "neutral", at: 8.0 },
      ],
      voiceover:
        "Diese Woche wird's richtig spannend: Mittwoch kommt die PCE-Inflation, Donnerstag die Zahlen von Nike, und Freitag der US-Arbeitsmarktbericht. Erwartet werden nur rund 100.000 neue Jobs.",
      durationInSeconds: 9.29,
    },
  ],
  outroVoiceover: "Das war dein Marktupdate. Folg Panda investiert, damit du morgen nichts verpasst.",
  outroSeconds: 5.27,
  followLabel: "Folgen",
  followedLabel: "Gefolgt",
};
