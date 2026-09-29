import type { Episode } from "../types";

// Folge "AMD × World Labs / Physical AI" vom 29. September 2026, synchron zur
// bereinigten Sprachaufnahme public/voice.mp3 (scripts/clean-voice.py: Atmer raus,
// Pausen gekuerzt). Szenenwechsel auf den Satz-/Absatzpausen der Aufnahme.
export const episode: Episode = {
  dateLabel: "29. SEPTEMBER",
  channelName: "Panda_investiert",
  brandLine: "MARKTUPDATE",
  logoSrc: "logo.jpg",
  voiceSrc: "voice.mp3",
  introTitle: "AKTIEN*NEWS*",
  introSubtitle: "AMD · PHYSICAL AI",
  ticker: [
    { symbol: "AMD (MO.)", value: "607,87 $", change: "−3,61 %", direction: "down" },
    { symbol: "AMD TRADEGATE", value: "541,75 €", change: "+1,24 %", direction: "up" },
    { symbol: "WORLD LABS", value: "8,2 Mrd. $", change: "Kaufpreis in Aktien", direction: "neutral" },
    { symbol: "BEWERTUNG FEB.", value: "5 Mrd. $", change: "World Labs", direction: "neutral" },
    { symbol: "ABSCHLUSS", value: "", change: "bis Ende 2026", direction: "neutral" },
  ],
  scenes: [
    {
      label: "USA · AMD",
      countryIso: "840",
      region: {
        stateFips: "06",
        point: { lon: -121.9552, lat: 37.3541 },
        title: "KALIFORNIEN",
        subtitle: "AMD · Santa Clara",
      },
      badge: { text: "AMD", color: "#1a1a1a", kind: "logo" },
      news: [
        {
          outlet: "wallstreet:online",
          headline: "Nach ChatGPT kommt Physical AI: AMD greift Nvidia an: 8,2 Milliarden für die nächste KI-Revolution",
          accent: "#003d7c",
        },
        {
          outlet: "CNBC",
          headline: "AMD acquiring Fei-Fei Li's World Labs AI firm in deal worth $8.2 billion",
          accent: "#005594",
        },
      ],
      stats: [
        { label: "Kaufpreis", value: 8.2, decimals: 1, prefix: "$", suffix: " Mrd.", direction: "neutral" },
        { label: "Bezahlt in Aktien", value: 100, decimals: 0, suffix: " %", direction: "neutral" },
      ],
      voiceover:
        "AMD greift Nvidia an – und zwar mit einer Milliarden-Übernahme. Der Chipkonzern kauft das KI-Start-up World Labs für rund 8,2 Milliarden Dollar, komplett bezahlt in AMD-Aktien. Es ist die zweitgrößte Übernahme der Firmengeschichte, nur Xilinx war größer. Chefin Lisa Su sagt: Wer die Rechenplattformen für die nächste KI-Generation baut, muss genau verstehen, wie sich die Modelle entwickeln.",
      durationInSeconds: 22.487,
    },
    {
      label: "USA · NVIDIA & PHYSICAL AI",
      countryIso: "840",
      region: {
        stateFips: "32",
        point: { lon: -115.1398, lat: 36.1699 },
        title: "NEVADA",
        subtitle: "CES · Las Vegas",
      },
      badge: { text: "NVDA", color: "#76b900", kind: "logo" },
      news: [
        {
          outlet: "Axios",
          headline: "Nvidia CES 2026: Jensen Huang says \"ChatGPT moment for physical AI\" is coming",
          accent: "#1f2937",
        },
        {
          outlet: "NVIDIA Newsroom",
          headline: "NVIDIA and Global Robotics Leaders Take Physical AI to the Real World",
          accent: "#76b900",
        },
      ],
      stats: [
        { label: "Robotik-Markt laut Huang", value: 40, decimals: 0, prefix: "$", suffix: " Bio.", direction: "neutral" },
        { label: "Nvidia-Robotikpartner", value: 110, decimals: 0, direction: "neutral" },
      ],
      voiceover:
        "Worum geht es? Um Physical AI – also KI, die die echte, dreidimensionale Welt versteht und darin handeln kann: Roboter, autonome Autos, Simulationen. Hier ist Nvidia bisher klar vorne. Jensen Huang hat auf der CES den ChatGPT-Moment für Physical AI ausgerufen, Nvidia arbeitet mit rund 110 Robotik-Firmen zusammen. Humanoide Roboter nennt Huang einen Markt von 40 Billionen Dollar.",
      durationInSeconds: 24.8,
    },
    {
      label: "USA · WORLD LABS",
      countryIso: "840",
      region: {
        stateFips: "06",
        point: { lon: -122.4194, lat: 37.7749 },
        title: "KALIFORNIEN",
        subtitle: "World Labs · San Francisco",
      },
      badge: { text: "🌐", color: "#6d28d9", kind: "icon" },
      news: [
        {
          outlet: "ComputerBase",
          headline: "Für 8 Milliarden Dollar: AMD holt World Labs samt „Godmother of AI“ ins Boot",
          accent: "#b91c1c",
        },
        {
          outlet: "The AI Insider",
          headline: "Fei-Fei Li's World Labs Raises $1B in Fresh Funding to Advance Development of World Models",
          accent: "#0f766e",
        },
        {
          outlet: "Fortune",
          headline: "AMD acquires Fei-Fei Li's physical AI startup World Labs for $8.2 billion",
          accent: "#c8102e",
        },
      ],
      stats: [
        { label: "Bewertung Feb. 2026", value: 5, decimals: 0, prefix: "$", suffix: " Mrd.", direction: "neutral" },
        { label: "AMD zahlt mehr", value: 64, decimals: 0, suffix: " %", showSign: true, direction: "up", tone: "neutral" },
      ],
      voiceover:
        "Genau hier setzt World Labs an. Gegründet 2024 von Fei-Fei Li – der Stanford-Forscherin, die mit ImageNet den Grundstein für modernes Deep Learning gelegt hat. Ihr Produkt Marble erzeugt aus Text, Bildern oder Videos begehbare 3D-Welten, etwa zum Training von Robotern. Im Februar war World Labs noch mit 5 Milliarden Dollar bewertet – AMD zahlt jetzt gut 60 Prozent mehr. Pikant: Auch Nvidia war dort Investor. Fei-Fei Li wird bei AMD Chief Scientist.",
      durationInSeconds: 25.7,
    },
    {
      label: "USA · WALL STREET",
      countryIso: "840",
      region: { stateFips: "36", point: { lon: -74.0107, lat: 40.7069 }, title: "NEW YORK", subtitle: "Nasdaq · AMD" },
      badge: { text: "AMD", color: "#1a1a1a", kind: "logo" },
      news: [
        {
          outlet: "GuruFocus",
          headline: "AMD to Acquire AI Research Firm World Labs in $8.2B Deal, Shares Dip Amid Valuation Concerns",
          accent: "#1d4ed8",
        },
        {
          outlet: "Blockonomi",
          headline: "AMD (AMD) Stock: Drops as $8.2B World Labs Deal Targets AI Growth",
          accent: "#334155",
        },
      ],
      stats: [
        { label: "AMD am Montag", value: -3.61, decimals: 2, suffix: " %", showSign: true, direction: "down" },
        { label: "Schlusskurs", value: 607.87, decimals: 2, prefix: "$", direction: "down" },
      ],
      voiceover:
        "An der Wall Street kam der Deal zunächst schlecht an. Die AMD-Aktie drehte am Montag nach einem starken Start ins Minus und schloss 3,6 Prozent tiefer bei rund 608 Dollar. Anleger stören sich am hohen Preis – und daran, dass AMD mit eigenen Aktien bezahlt, die ohnehin schon hoch bewertet sind.",
      durationInSeconds: 15.28,
    },
    {
      label: "DEUTSCHLAND · AMD HEUTE",
      countryIso: "276",
      region: { point: { lon: 13.405, lat: 52.52 }, title: "BERLIN", subtitle: "Tradegate · AMD", zoom: 7 },
      badge: { text: "AMD", color: "#1a1a1a", kind: "logo" },
      news: [
        {
          outlet: "finanzen.ch",
          headline: "AMD-Aktie mit Aufschlägen: NVIDIA-Rivale übernimmt KI-Start-up für 8,2 Milliarden Dollar",
          accent: "#0f172a",
        },
        {
          outlet: "OpenAI",
          headline: "AMD and OpenAI announce strategic partnership to deploy 6 gigawatts of AMD GPUs",
          accent: "#10a37f",
        },
      ],
      stats: [
        { label: "AMD heute", value: 1.24, decimals: 2, suffix: " %", showSign: true, direction: "up" },
        { label: "OpenAI-Deal", value: 6, decimals: 0, suffix: " GW", direction: "neutral" },
      ],
      voiceover:
        "Heute stabilisiert sich die Aktie: Im deutschen Handel liegt AMD gut ein Prozent im Plus. Spannend bleibt das Zusammenspiel mit OpenAI: In diesem Halbjahr sollen die ersten Chips aus dem Sechs-Gigawatt-Deal geliefert werden – und OpenAI hat gerade das Training seiner stärksten Modelle gestoppt. Die nächsten Zahlen gibt's voraussichtlich Anfang November.",
      durationInSeconds: 16.56,
    },
  ],
  outroVoiceover: "Das waren deine Aktien-News. Folg Panda investiert, damit du nichts verpasst.",
  outroSeconds: 4.55,
  followLabel: "Folgen",
  followedLabel: "Gefolgt",
};
