/**
 * Markt-Terminal Live: sammelt Finanz-News aus kostenlosen RSS-Feeds und
 * schickt sie per Server-Sent Events an die Stream-Seite.
 *
 * Keine Abhängigkeiten, keine API-Schlüssel, keine laufenden Kosten.
 *
 *   node server.mjs           echte Feeds
 *   node server.mjs --demo    Beispielmeldungen (zum Testen ohne Internet)
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyse, categorize, isFinanceRelated } from './analysis.mjs';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.env.PORT) || 8080;
const DEMO = process.argv.includes('--demo');
const MAX_ITEMS = 150;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
// Frische, wichtige Meldungen werden als Eilmeldung vorgezogen.
const BREAKING_WINDOW_MS = 30 * 60 * 1000;

const config = JSON.parse(await readFile(join(ROOT, 'feeds.json'), 'utf8'));

/** @type {Map<string, object>} key = normalisierte Überschrift */
const items = new Map();
const clients = new Set();
const feedStatus = {};

// ---------------------------------------------------------------- RSS-Parsing

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—', laquo: '«', raquo: '»', bdquo: '„', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß', euro: '€' };

function decode(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e] ?? m;
  });
}

function clean(s) {
  if (!s) return '';
  s = s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  // Zweimal dekodieren: manche Feeds liefern HTML als escapten Text.
  s = decode(s).replace(/<[^>]+>/g, ' ');
  return decode(s).replace(/\s+/g, ' ').trim();
}

function tag(block, names) {
  for (const n of names) {
    const m = block.match(new RegExp(`<${n}(?:\\s[^>]*)?>([\\s\\S]*?)</${n}>`, 'i'));
    if (m) return m[1];
  }
  return '';
}

function parseFeed(xml, feed) {
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi) ?? [];
  const out = [];
  for (const b of blocks) {
    let title = clean(tag(b, ['title']));
    let link = clean(tag(b, ['link']));
    if (!link) link = b.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? '';
    const date = new Date(clean(tag(b, ['pubDate', 'published', 'updated', 'dc:date'])));
    const source = clean(tag(b, ['source'])) || feed.name;
    // Google News hängt die Quelle an die Überschrift an: "Titel - Handelsblatt"
    if (title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3));
    let summary = clean(tag(b, ['description', 'summary', 'content:encoded', 'content']));
    if (summary.startsWith(title)) summary = summary.slice(title.length).trim();
    if (summary === source) summary = '';
    if (!title || Number.isNaN(date.getTime())) continue;
    out.push({ title, link, source, summary: teaser(summary), date: date.getTime() });
  }
  return out;
}

/** Nur ein kurzer Anriss, nie der ganze Artikel (Urheberrecht). */
function teaser(s) {
  if (s.length <= 160) return s;
  const cut = s.slice(0, 160);
  return cut.slice(0, cut.lastIndexOf(' ')) + ' …';
}

function charsetOf(buf, header) {
  const fromHeader = header?.match(/charset=([\w-]+)/i)?.[1];
  const fromXml = buf.subarray(0, 200).toString('latin1').match(/encoding="([\w-]+)"/i)?.[1];
  return (fromXml || fromHeader || 'utf-8').toLowerCase();
}

// ---------------------------------------------------------------- Sammeln

function keyOf(title) {
  return title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '').slice(0, 70);
}

function addItem(raw, feed) {
  const key = keyOf(raw.title);
  if (items.has(key) || Date.now() - raw.date > MAX_AGE_MS) return null;
  const text = `${raw.title} ${raw.summary}`;
  if (feed.filter && !isFinanceRelated(text)) return null;
  const category = categorize(text, feed.category);
  const { points, important } = analyse(text, category);
  const item = {
    id: key,
    ...raw,
    category,
    points,
    breaking: important && Date.now() - raw.date < BREAKING_WINDOW_MS,
    demo: !!raw.demo,
  };
  items.set(key, item);
  return item;
}

function prune() {
  const sorted = [...items.values()].sort((a, b) => b.date - a.date);
  for (const it of sorted.slice(MAX_ITEMS)) items.delete(it.id);
  for (const it of sorted) if (Date.now() - it.date > MAX_AGE_MS) items.delete(it.id);
}

async function pollFeed(feed) {
  try {
    const res = await fetch(feed.url, {
      headers: { 'user-agent': 'Mozilla/5.0 (Markt-Terminal RSS-Reader)' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const xml = new TextDecoder(charsetOf(buf, res.headers.get('content-type'))).decode(buf);
    const parsed = parseFeed(xml, feed);
    const fresh = parsed.map((r) => addItem(r, feed)).filter(Boolean);
    feedStatus[feed.url] = { ok: true, items: parsed.length, at: Date.now() };
    return fresh;
  } catch (err) {
    if (feedStatus[feed.url]?.ok !== false) console.warn(`[feed] ${feed.name}: ${err.message}`);
    feedStatus[feed.url] = { ok: false, error: err.message, at: Date.now() };
    return [];
  }
}

let firstPoll = true;
async function pollAll() {
  const results = await Promise.all(config.feeds.map(pollFeed));
  const fresh = results.flat().sort((a, b) => a.date - b.date);
  prune();
  // Beim Start nicht 100 Meldungen auf einmal als "neu" verschicken.
  if (!firstPoll) for (const it of fresh) broadcast('item', it);
  const ok = Object.values(feedStatus).filter((s) => s.ok).length;
  console.log(`[feed] ${new Date().toLocaleTimeString('de-DE')}: ${fresh.length} neu, ${items.size} gesamt, ${ok}/${config.feeds.length} Quellen erreichbar`);
  firstPoll = false;
}

// ---------------------------------------------------------------- Demo

const DEMO_ITEMS = [
  ['EZB lässt Leitzins unverändert und signalisiert Geduld', 'Die Notenbank verweist auf die weiterhin erhöhte Kerninflation.', 'makro'],
  ['Bitcoin steigt über wichtige Marke, Handelsvolumen zieht an', 'Am Kryptomarkt legen auch Ether und Solana zu.', 'krypto'],
  ['Spot-ETF-Zuflüsse: Anleger investieren erneut Millionen', 'Die ETF-Zuflüsse halten die dritte Woche in Folge an.', 'etf'],
  ['Techkonzern übertrifft Erwartungen mit Quartalszahlen', 'Umsatz und Gewinn liegen über den Prognosen der Analysten.', 'aktien'],
  ['DAX schließt nahe Rekordhoch', 'Autowerte und Banken gehören zu den Gewinnern des Tages.', 'aktien'],
  ['Ölpreis legt nach OPEC-Treffen zu', 'Das Kartell hält an den Förderkürzungen fest.', 'makro'],
  ['Kryptobörse meldet Hack, Auszahlungen vorübergehend gestoppt', 'Kundengelder sollen laut Unternehmen gesichert sein.', 'krypto'],
  ['MSCI World ETF bleibt beliebtester Sparplan', 'Neobroker melden weiter steigende Sparplan-Zahlen.', 'etf'],
];
let demoIndex = 0;
function demoTick() {
  const [title, summary, category] = DEMO_ITEMS[demoIndex++ % DEMO_ITEMS.length];
  const item = addItem(
    { title: `${title} (#${demoIndex})`, summary, link: '', source: 'DEMO', date: Date.now(), demo: true },
    { category, filter: false },
  );
  if (item) broadcast('item', item);
}

// ---------------------------------------------------------------- HTTP

function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) res.write(msg);
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.png': 'image/png' };

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');

  if (url.pathname === '/events') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
    const list = [...items.values()].sort((a, b) => b.date - a.date);
    res.write(`event: init\ndata: ${JSON.stringify({ items: list, demo: DEMO })}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  if (url.pathname === '/status') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ demo: DEMO, items: items.size, feeds: feedStatus }, null, 2));
    return;
  }

  const path = normalize(url.pathname === '/' ? '/index.html' : url.pathname).replace(/^(\.\.[/\\])+/, '');
  try {
    const body = await readFile(join(ROOT, 'public', path));
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('Nicht gefunden');
  }
});

// Verbindung offen halten, auch wenn gerade nichts passiert.
setInterval(() => { for (const res of clients) res.write(': ping\n\n'); }, 25000);

server.listen(PORT, () => {
  console.log(`Markt-Terminal läuft: http://localhost:${PORT}${DEMO ? '   (DEMO-MODUS)' : ''}`);
  console.log(`Quellen-Status:      http://localhost:${PORT}/status`);
});

if (DEMO) {
  for (let i = 0; i < 5; i++) demoTick();
  setInterval(demoTick, 20000);
} else {
  await pollAll();
  setInterval(pollAll, (config.pollSeconds ?? 120) * 1000);
}
