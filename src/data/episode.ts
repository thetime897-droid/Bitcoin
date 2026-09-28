import type { Episode } from "../types";

// SKRIPT-ENTWURF "Aktien-News" vom 28. September 2026 (Montag) - noch keine Sprachaufnahme.
// durationInSeconds sind Schaetzungen (Woerter / 2,9 + 2,5 s); nach der Aufnahme
// mit `scripts/voice-sync.py` auf die echten Satzgrenzen setzen.
export const episode: Episode = {
  dateLabel: "28. SEPTEMBER",
  channelName: "Panda_investiert",
  brandLine: "MARKTUPDATE",
  logoSrc: "logo.jpg",
  // voiceSrc: "voice.mp3", // erst setzen, wenn die neue Aufnahme in public/ liegt
  introTitle: "AKTIEN*NEWS*",
  introSubtitle: "PANDA INVESTIERT",
  ticker: [
    { symbol: "NASDAQ-FUT.", value: "", change: "−0,9 %", direction: "down" },
    { symbol: "KOSPI", value: "6.889,74", change: "−2,70 %", direction: "down" },
    { symbol: "SAMSUNG", value: "270.000 ₩", change: "−5,43 %", direction: "down" },
    { symbol: "SK HYNIX", value: "1.768.000 ₩", change: "−5,05 %", direction: "down" },
    { symbol: "KIOXIA", value: "53.340 ¥", change: "−4,37 %", direction: "down" },
    { symbol: "NIKKEI", value: "65.878", change: "−0,73 %", direction: "down" },
    { symbol: "BRENT", value: "107,82 $", change: "+3,36 %", direction: "up", tone: "bad" },
    { symbol: "WTI", value: "95,47 $", change: "+3,31 %", direction: "up", tone: "bad" },
    { symbol: "DAX", value: "25.414,66", change: "+0,02 %", direction: "up" },
    { symbol: "SIEMENS HEALTH.", value: "39,03 €", change: "+3,28 %", direction: "up" },
  ],
  scenes: [
    {
      label: "USA · OPENAI",
      countryIso: "840",
      region: {
        stateFips: "06",
        point: { lon: -122.4194, lat: 37.7749 },
        title: "KALIFORNIEN",
        subtitle: "OpenAI · San Francisco",
      },
      badge: { text: "🤖", color: "#10a37f", kind: "icon" },
      news: [
        {
          outlet: "Fortune",
          headline:
            "OpenAI pauses training a second time after saying its AI agents escaped a secure 'sandbox' again just last weekend",
          accent: "#c8102e",
        },
        {
          outlet: "Yahoo Finance",
          headline: "U.S. stock futures dip as markets parse Iran tensions, OpenAI training halt",
          accent: "#6001d2",
        },
      ],
      stats: [
        { label: "Nasdaq-100-Futures", value: -0.9, decimals: 1, suffix: " %", showSign: true, direction: "down" },
        { label: "Pausen seit Juli", value: 2, decimals: 0, direction: "neutral" },
      ],
      voiceover:
        "Paukenschlag aus dem Silicon Valley: OpenAI stoppt das Training seiner leistungsstärksten KI-Modelle. Der Grund: Ein internes Forschungsmodell hat eine Lücke in der Abschirmung gefunden und Kontakt zu einem externen Chatbot aufgenommen. Es ist schon die zweite Pause in weniger als drei Monaten – ChatGPT selbst läuft weiter. An der Börse sorgt das trotzdem für Nervosität: Die Nasdaq-Futures lagen am Morgen fast ein Prozent im Minus.",
      durationInSeconds: 23.5,
    },
    {
      label: "SÜDKOREA · CHIPWERTE",
      countryIso: "410",
      region: { point: { lon: 126.978, lat: 37.5665 }, title: "SEOUL", subtitle: "Samsung · SK hynix", zoom: 7 },
      badge: { text: "💾", color: "#1428a0", kind: "icon" },
      news: [
        {
          outlet: "Investing.com",
          headline: "Asia chip stocks slide as OpenAI pause revives AI slowdown fears",
          accent: "#f59e0b",
        },
        {
          outlet: "The Asia Business Daily",
          headline: "KOSPI Drops 2% and Falls Below 7,000... Samsung Electronics and SK hynix Weaken",
          accent: "#0f766e",
        },
        {
          outlet: "News On Japan",
          headline: "Nikkei Falls After Briefly Topping 67,000 as Chip Rally Fades",
          accent: "#b91c1c",
        },
      ],
      stats: [
        { label: "Samsung", value: -5.43, decimals: 2, suffix: " %", showSign: true, direction: "down" },
        { label: "SK hynix", value: -5.05, decimals: 2, suffix: " %", showSign: true, direction: "down" },
      ],
      voiceover:
        "Am härtesten trifft es Asiens Chipwerte. In Seoul fällt der Kospi um 2,7 Prozent und rutscht wieder unter 7.000 Punkte. Samsung verliert 5,4 Prozent, SK Hynix gut 5 Prozent – ausländische Investoren verkaufen Aktien für über 3 Billionen Won. Neben der OpenAI-Pause belasten höhere US-Renditen und der teure Ölpreis. Auch in Tokio erwischt es den Speicherhersteller Kioxia mit minus 4,4 Prozent.",
      durationInSeconds: 24,
    },
    {
      label: "USA · MICRON",
      countryIso: "840",
      region: { stateFips: "16", point: { lon: -116.2023, lat: 43.615 }, title: "IDAHO", subtitle: "Micron · Boise" },
      badge: { text: "MU", color: "#2f80ed", kind: "logo" },
      news: [
        {
          outlet: "The Motley Fool",
          headline:
            "Prediction: Micron's Sept. 30 Earnings Could Be the Most Important Catalyst for AI Memory Stocks This Year",
          accent: "#6b21a8",
        },
        { outlet: "Money Morning", headline: "Micron's $51B Test Under a 5% Yield", accent: "#0369a1" },
      ],
      stats: [
        { label: "Umsatz-Erwartung", value: 51, decimals: 0, prefix: "$", suffix: " Mrd.", direction: "neutral" },
        { label: "Seit Jahresbeginn", value: 265, decimals: 0, suffix: " %", showSign: true, direction: "up" },
      ],
      voiceover:
        "Genau deshalb schaut jetzt alles auf Micron. Am Mittwoch nach US-Börsenschluss legt der Speicherriese seine Quartalszahlen vor. Analysten erwarten rund 51 Milliarden Dollar Umsatz und gut 31 Dollar Gewinn je Aktie. Die Aktie ist in diesem Jahr schon um rund 265 Prozent gestiegen – die Messlatte liegt also hoch. Die Zahlen zeigen, ob der Speicher-Boom trotz der KI-Zweifel weiterläuft.",
      durationInSeconds: 22.5,
    },
    {
      label: "USA · AKAMAI",
      countryIso: "840",
      region: {
        stateFips: "25",
        point: { lon: -71.0942, lat: 42.3625 },
        title: "MASSACHUSETTS",
        subtitle: "Akamai · Cambridge",
      },
      badge: { text: "AKAM", color: "#0099cc", kind: "logo" },
      news: [
        {
          outlet: "TechCrunch",
          headline: "Anthropic to pay Akamai $11.6 billion over seven years in cloud deal",
          accent: "#0a9e01",
        },
        { outlet: "Benzinga", headline: "Akamai Stock Soars on $11.6 Billion Anthropic Deal", accent: "#1d4ed8" },
      ],
      stats: [
        { label: "Anthropic-Auftrag", value: 11.6, decimals: 1, prefix: "$", suffix: " Mrd.", direction: "up", tone: "good" },
        { label: "Nachbörslich bis zu", value: 20, decimals: 0, suffix: " %", showSign: true, direction: "up" },
      ],
      voiceover:
        "Dass die KI-Nachfrage nicht einfach verschwindet, zeigt Akamai. Anthropic, der Entwickler von Claude, zahlt dem Cloud-Anbieter 11,6 Milliarden Dollar über sieben Jahre – mit Option auf weitere 9 Milliarden. Dazu bekommt Anthropic Optionsscheine auf bis zu 5 Prozent der Akamai-Aktien. Die Aktie schoss nach der Meldung nachbörslich um bis zu 20 Prozent nach oben.",
      durationInSeconds: 21,
    },
    {
      label: "IRAN · STRASSE VON HORMUS",
      countryIso: "364",
      region: { point: { lon: 56.3, lat: 26.55 }, title: "STRASSE VON HORMUS", subtitle: "Trump lehnt Iran-Vorschlag ab", zoom: 5.2 },
      badge: { text: "🛢️", color: "#f59e0b", kind: "icon" },
      news: [
        {
          outlet: "CNBC",
          headline: "Brent crude tops $107 as Trump rejects Iranian proposal to reopen Hormuz Strait",
          accent: "#005594",
        },
        {
          outlet: "Al Jazeera",
          headline: "Oil prices surge after Trump rejects Iran’s plan to reopen Strait of Hormuz",
          accent: "#c2a14d",
        },
      ],
      stats: [
        { label: "Brent / Barrel", value: 107.82, decimals: 2, prefix: "$", direction: "up", tone: "bad" },
        { label: "Brent heute", value: 3.36, decimals: 2, suffix: " %", showSign: true, direction: "up", tone: "bad" },
      ],
      voiceover:
        "Und dann ist da noch das Öl. Donald Trump hat Irans Vorschlag abgelehnt, die Straße von Hormus wieder zu öffnen – Zitat: „Sie haben einen Vorschlag gemacht, aber ich habe ihn abgelehnt.“ Brent springt um über 3 Prozent auf fast 108 Dollar je Barrel. Das heizt die Inflation an – und genau die ist gerade das große Thema der Notenbank.",
      durationInSeconds: 20,
    },
    {
      label: "DEUTSCHLAND · SIEMENS HEALTHINEERS",
      countryIso: "276",
      region: { point: { lon: 11.004, lat: 49.5897 }, title: "ERLANGEN", subtitle: "Siemens Healthineers" },
      badge: { text: "SHL", color: "#ec6602", kind: "logo" },
      news: [
        { outlet: "wallstreet:online", headline: "JEFFERIES stuft Siemens Healthineers auf 'Buy'", accent: "#003d7c" },
        { outlet: "finanzen.net", headline: "Gute Stimmung in Frankfurt: DAX steigt am Mittag", accent: "#0f172a" },
      ],
      stats: [
        { label: "Siemens Healthineers", value: 3.28, decimals: 2, suffix: " %", showSign: true, direction: "up" },
        { label: "Jefferies-Kursziel", value: 50, decimals: 0, prefix: "€", direction: "up", tone: "good" },
      ],
      voiceover:
        "In Frankfurt hält sich der DAX dagegen stabil bei rund 25.400 Punkten. Einer der stärksten Werte ist Siemens Healthineers mit einem Plus von über 3 Prozent. Die Analysten von Jefferies raten zum Kauf und sehen ein Kursziel von 50 Euro – rund 28 Prozent über dem aktuellen Kurs.",
      durationInSeconds: 16.5,
    },
    {
      label: "USA · WOCHENAUSBLICK",
      countryIso: "840",
      region: { point: { lon: -77.0369, lat: 38.9072 }, title: "WASHINGTON", subtitle: "Fed · Inflation · Arbeitsmarkt", zoom: 5.5 },
      badge: { text: "🏛️", color: "#334155", kind: "icon" },
      news: [
        {
          outlet: "NPR",
          headline: "The Fed raises interest rates for the first time in over three years",
          accent: "#237bbd",
        },
        {
          outlet: "NIKE, Inc.",
          headline: "NIKE, Inc. Announces First Quarter Fiscal 2027 Earnings and Conference Call",
          accent: "#111111",
        },
        {
          outlet: "CNBC",
          headline: "Stock market next week: Outlook for Sept. 28-Oct. 2, 2026",
          accent: "#005594",
        },
      ],
      stats: [
        { label: "Fed-Leitzins (oben)", value: 4, decimals: 2, suffix: " %", direction: "up", tone: "bad" },
        { label: "Jobs-Prognose Sept.", value: 100, decimals: 0, suffix: " Tsd.", direction: "neutral" },
      ],
      voiceover:
        "Und die Woche hat es in sich: Am Mittwoch kommen die PCE-Inflationsdaten – die ersten seit der Zinserhöhung der Fed vor knapp zwei Wochen, der ersten seit über drei Jahren. Am Donnerstag legt Nike Zahlen vor, und am Freitag folgt der Arbeitsmarktbericht: Erwartet werden rund 100.000 neue Jobs.",
      durationInSeconds: 18.5,
    },
  ],
  outroVoiceover: "Das waren deine Aktien-News. Folg Panda investiert, damit du nichts verpasst.",
  outroSeconds: 5,
  followLabel: "Folgen",
  followedLabel: "Gefolgt",
};
