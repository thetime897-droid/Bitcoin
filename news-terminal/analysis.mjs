/**
 * Kostenlose, regelbasierte "Einordnung" zu einer Meldung.
 *
 * Bewusst ohne KI-API: kostet nichts und erfindet keine Fakten. Die Stichpunkte
 * erklären nur, wie solche Nachrichten typischerweise wirken - sie sagen nie,
 * was man kaufen oder verkaufen soll.
 */

const L = '[\\p{L}\\p{N}]';
/** Macht \\b und \\w Unicode-fähig, sonst passen Wörter wie "Übernahme" nie. */
function u(re) {
  const src = re.source
    .replace(/\\b/g, `(?:(?<=${L})(?!${L})|(?<!${L})(?=${L}))`)
    .replace(/\\w/g, L);
  return new RegExp(src, 'iu');
}

// Reihenfolge = Priorität. Die erste passende Regel liefert die Stichpunkte.
const RULES = [
  {
    match: u(/\b(leitzins|zinsentscheid|zinssenkung|zinserhöhung|zinsen|fed|federal reserve|ezb|notenbank|powell|lagarde)\b/i),
    breaking: true,
    points: [
      'Zinsentscheide bewegen oft Aktien, Anleihen, Gold und Krypto gleichzeitig.',
      'Sinkende Zinsen gelten meist als Rückenwind für riskantere Anlagen, steigende eher als Gegenwind.',
      'Häufig zählt der Ausblick der Notenbank mehr als die Entscheidung selbst.',
    ],
  },
  {
    match: u(/\b(inflation|verbraucherpreise|teuerung|cpi|pce)\b/i),
    breaking: true,
    points: [
      'Inflationsdaten beeinflussen die Erwartung an künftige Zinsschritte.',
      'Höher als erwartet: Märkte rechnen eher mit länger hohen Zinsen.',
      'Entscheidend ist die Abweichung von der Prognose, nicht die Zahl allein.',
    ],
  },
  {
    match: u(/\b(hack|hacker|exploit|gestohlen|diebstahl|sicherheitslücke)\b/i),
    breaking: true,
    points: [
      'Sicherheitsvorfälle können kurzfristig Vertrauen und Kurse belasten.',
      'Betroffen ist oft zuerst das jeweilige Projekt bzw. die Plattform.',
      'Wichtig: Sind Kundengelder betroffen und gibt es eine Entschädigung?',
    ],
  },
  {
    match: u(/\b(sec|zulassung|genehmig\w*|zugelassen)\b.*\betf\b|\betf\b.*\b(sec|zulassung|genehmig\w*|zugelassen)\b/i),
    breaking: true,
    points: [
      'Neue ETF-Zulassungen öffnen einen Markt für zusätzliche Anlegergruppen.',
      'Oft wird so etwas vorab erwartet und ist teils schon im Preis enthalten.',
      'Langfristig zählen die tatsächlichen Zuflüsse in den Fonds.',
    ],
  },
  {
    match: u(/\betf\b.*\b(zufl\w*|abfl\w*|mittel\w*)\b|\b(zufl\w*|abfl\w*)\b.*\betf\b/i),
    points: [
      'ETF-Zu- und Abflüsse zeigen, wohin Anlegergeld gerade wandert.',
      'Anhaltende Zuflüsse deuten auf wachsendes Interesse hin, einzelne Tage sagen wenig.',
      'Am besten über mehrere Wochen betrachten.',
    ],
  },
  {
    match: u(/\b(regulierung|mica|verbot|gesetz\w*|aufsicht|bafin|klage|verklagt)\b/i),
    points: [
      'Regulierung schafft Klarheit, kann aber auch Einschränkungen bringen.',
      'Märkte reagieren oft auf Unsicherheit stärker als auf die Regel selbst.',
      'Bis Gesetze wirklich greifen, vergeht meist viel Zeit.',
    ],
  },
  {
    match: u(/\b(quartalszahlen|quartal|bilanz|umsatz|gewinn|prognose|jahreszahlen|ergebnis)\b/i),
    points: [
      'Bei Unternehmenszahlen zählt vor allem der Vergleich mit den Erwartungen der Analysten.',
      'Der Ausblick auf die nächsten Quartale bewegt den Kurs oft stärker als die Vergangenheit.',
      'Große Konzerne können ganze Branchen und Indizes mitziehen.',
    ],
  },
  {
    match: u(/\b(übernahme|übernimmt|fusion|kauft\s+\w+\s+für|deal)\b/i),
    points: [
      'Bei Übernahmen steigt oft die Aktie des übernommenen Unternehmens.',
      'Der Käufer steht unter Beobachtung: Ist der Preis gerechtfertigt?',
      'Kartellbehörden müssen solche Deals häufig noch genehmigen.',
    ],
  },
  {
    match: u(/\b(dividende|aktienrückkauf|rückkauf)\b/i),
    points: [
      'Dividenden und Rückkäufe geben Gewinne an Aktionäre zurück.',
      'Sie gelten oft als Zeichen von Stabilität, sind aber keine Garantie.',
      'Nach dem Dividendentermin sinkt der Kurs rechnerisch um die Ausschüttung.',
    ],
  },
  {
    match: u(/\b(rekordhoch|allzeithoch|rekord|höchststand)\b/i),
    points: [
      'Rekordstände zeigen starke Nachfrage, bedeuten aber nicht automatisch weitere Anstiege.',
      'An Hochs nehmen manche Anleger Gewinne mit, das kann zu Schwankungen führen.',
      'Wichtig ist, wie breit der Anstieg getragen wird.',
    ],
  },
  {
    match: u(/\b(crash|einbruch|absturz|ausverkauf|kursrutsch|bricht ein|stürzt|panik)\b/i),
    breaking: true,
    points: [
      'Starke Kursrückgänge werden oft durch Hebelpositionen und Panik verstärkt.',
      'Kurzfristige Bewegungen sagen wenig über die langfristige Entwicklung.',
      'Wichtig ist der Auslöser: Einzelereignis oder grundlegende Veränderung?',
    ],
  },
  {
    match: u(/\b(zölle|zoll|handelsstreit|handelskrieg|sanktionen)\b/i),
    points: [
      'Zölle und Sanktionen können Kosten, Lieferketten und Gewinne von Unternehmen treffen.',
      'Export-starke Branchen und Länder reagieren oft besonders sensibel.',
      'Märkte preisen häufig schon Ankündigungen ein, nicht erst die Umsetzung.',
    ],
  },
  {
    match: u(/\b(öl|ölpreis|opec|gaspreis|energiepreis\w*)\b/i),
    points: [
      'Energiepreise wirken auf Inflation, Unternehmenskosten und Konsum.',
      'Energiekonzerne profitieren oft von höheren Preisen, energieintensive Branchen leiden eher.',
      'Politische Ereignisse können Rohstoffpreise schnell bewegen.',
    ],
  },
  {
    match: u(/\b(arbeitsmarkt|arbeitslos\w*|beschäftigung|stellenabbau|entlassungen|jobs)\b/i),
    points: [
      'Arbeitsmarktdaten zeigen, wie robust die Wirtschaft gerade ist.',
      'Sie fließen direkt in die Zinsüberlegungen der Notenbanken ein.',
      'Stellenabbau in einem Unternehmen kann Sparkurs oder Schwäche signalisieren.',
    ],
  },
  {
    match: u(/\b(insolvenz|pleite|zahlungsunfähig)\b/i),
    breaking: true,
    points: [
      'Insolvenzen treffen Aktionäre meist am stärksten.',
      'Zu prüfen: Gibt es Ansteckungsgefahr für Partner oder die Branche?',
      'Solche Meldungen sind oft Einzelfälle, keine Marktwende.',
    ],
  },
  {
    match: u(/\b(stablecoin|usdt|usdc|tether)\b/i),
    points: [
      'Stablecoins sind das wichtigste Bindeglied zwischen Euro/Dollar und dem Kryptomarkt.',
      'Wachsende Stablecoin-Mengen werden oft als verfügbares Kapital gedeutet.',
      'Regulierung von Stablecoins betrifft den ganzen Kryptomarkt.',
    ],
  },
  {
    match: u(/\b(halving)\b/i),
    points: [
      'Beim Halving halbiert sich die Menge neu erzeugter Bitcoin.',
      'Historisch folgten darauf teils starke Phasen, die Vergangenheit ist aber kein Versprechen.',
      'Miner-Einnahmen sinken, was die Branche unter Druck setzen kann.',
    ],
  },
];

const DEFAULTS = {
  krypto: [
    'Kryptowerte schwanken deutlich stärker als die meisten anderen Anlagen.',
    'Einzelne Nachrichten können kurzfristig große Bewegungen auslösen.',
    'Es lohnt sich, auf Bestätigung durch weitere Quellen zu warten.',
  ],
  etf: [
    'ETFs bilden einen Index ab und streuen das Risiko über viele Werte.',
    'Wichtig bei ETFs: Kosten (TER), Abbildungsmethode und Fondsgröße.',
    'Für langfristige Anleger sind einzelne Tagesmeldungen meist wenig relevant.',
  ],
  aktien: [
    'Einzelne Nachrichten können eine Aktie stark bewegen, den Gesamtmarkt aber kaum.',
    'Entscheidend ist oft, ob die Nachricht besser oder schlechter als erwartet ist.',
    'Die Reaktion des Marktes zeigt sich häufig erst über mehrere Tage.',
  ],
  makro: [
    'Konjunkturnachrichten beeinflussen die Stimmung am Gesamtmarkt.',
    'Sie fließen in die Erwartungen an Zinsen und Unternehmensgewinne ein.',
    'Einzelne Datenpunkte sind weniger wichtig als der Trend.',
  ],
};

const CATEGORY_WORDS = [
  ['krypto', u(/\b(bitcoin|btc|ethereum|eth|krypto\w*|crypto\w*|blockchain|solana|xrp|ripple|stablecoin|altcoin\w*|memecoin\w*|binance|coinbase|defi|nft)\b/i)],
  ['etf', u(/\b(etf|etfs|indexfonds|msci world|sparplan)\b/i)],
  ['makro', u(/\b(leitzins|zinsen|ezb|fed|notenbank|inflation|konjunktur|bip|rezession|arbeitsmarkt|ifo|zölle)\b/i)],
  ['aktien', u(/\b(aktie\w*|dax|mdax|nasdaq|dow jones|s&p|börse\w*|quartal\w*|dividende|anleger|kurs\w*)\b/i)],
];

// Allgemeine Wirtschafts-Feeds enthalten auch Themen ohne Marktbezug.
const FINANCE_WORDS =
  u(/\b(aktie\w*|börse\w*|dax|anleger|anleihe\w*|zins\w*|inflation|ezb|fed|notenbank|kurs\w*|etf\w*|bitcoin|krypto\w*|gold|ölpreis|dividende|konjunktur|umsatz|gewinn|quartal\w*|investor\w*|index|markt|märkte|rendite|übernahme|insolvenz|zölle)\b/i);

export function categorize(text, fallback) {
  for (const [cat, re] of CATEGORY_WORDS) if (re.test(text)) return cat;
  return fallback;
}

export function isFinanceRelated(text) {
  return FINANCE_WORDS.test(text);
}

export function analyse(text, category) {
  for (const rule of RULES) {
    if (rule.match.test(text)) return { points: rule.points, important: !!rule.breaking };
  }
  return { points: DEFAULTS[category] ?? DEFAULTS.makro, important: false };
}
