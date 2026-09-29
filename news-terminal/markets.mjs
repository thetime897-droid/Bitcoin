/**
 * Kurse für das Terminal - alles aus kostenlosen Quellen ohne API-Schlüssel:
 *
 * - Aktien, Indizes, ETFs/ETCs: Yahoo Finance (inoffizielle Schnittstelle,
 *   verzögert, kann sich ohne Vorwarnung ändern)
 * - Analysten-Kursziele: Yahoo Finance "financialData" (selten abgefragt)
 * - Krypto: Binance (öffentliche REST-Schnittstelle)
 *
 * Fällt eine Quelle aus, bleiben die letzten bekannten Werte stehen - der
 * Stream zeigt nie eine leere Fläche.
 */

const UA = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36' };
const SPARK_POINTS = 48;
const TARGET_REFRESH_MS = 12 * 60 * 60 * 1000;
const CURRENCY = { EUR: '€', USD: '$', GBP: '£', CHF: 'CHF' };

const L = '[\\p{L}\\p{N}]';

function downsample(values, n = SPARK_POINTS) {
  const v = values.filter((x) => Number.isFinite(x));
  if (v.length <= n) return v;
  const out = [];
  for (let i = 0; i < n; i++) out.push(v[Math.round((i * (v.length - 1)) / (n - 1))]);
  return out;
}

async function getJson(url, headers = {}) {
  const res = await fetch(url, { headers: { ...UA, ...headers }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Führt fn für alle Einträge aus, höchstens `limit` gleichzeitig. */
async function pool(list, limit, fn) {
  let i = 0;
  const worker = async () => { while (i < list.length) await fn(list[i++]); };
  await Promise.all(Array.from({ length: limit }, worker));
}

export function createMarkets(cfg, { demo = false, onUpdate = () => {} } = {}) {
  /** @type {Map<string, object>} */
  const quotes = new Map();
  const groups = { indices: [], stocks: [], etfs: [], crypto: [] };

  for (const it of cfg.indices) groups.indices.push({ ...it, kind: 'Index', unit: it.unit ?? 'Pkt.' });
  for (const it of cfg.stocks) groups.stocks.push({ ...it, kind: 'Aktie' });
  for (const it of cfg.etfs) groups.etfs.push({ ...it, kind: it.kind ?? 'ETF' });
  for (const it of cfg.crypto) groups.crypto.push({ ...it, kind: 'Krypto', unit: '$', keywords: it.keywords ?? [it.name, it.sym] });
  for (const list of Object.values(groups)) for (const it of list) quotes.set(it.sym, { ...it, price: null, pct: null, spark: [] });

  // Nachrichten einer Aktie/Krypto zuordnen. Längere Stichwörter zuerst,
  // damit "Siemens Energy" nicht als "Siemens" erkannt wird.
  const matchers = [...groups.stocks, ...groups.etfs, ...groups.crypto]
    .flatMap((it) => (it.keywords ?? []).map((k) => ({ sym: it.sym, k })))
    .sort((a, b) => b.k.length - a.k.length)
    .map(({ sym, k }) => ({ sym, re: new RegExp(`(?<!${L})${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?!${L})`, 'u') }));

  function findSymbol(text) {
    return matchers.find((m) => m.re.test(text))?.sym ?? null;
  }

  function snapshot() {
    const pick = (list) => list.map((it) => quotes.get(it.sym)).filter((q) => q.price != null);
    return {
      updated: Date.now(),
      demo,
      indices: pick(groups.indices),
      stocks: pick(groups.stocks),
      etfs: pick(groups.etfs),
      crypto: pick(groups.crypto),
    };
  }

  // -------------------------------------------------------------- Yahoo

  const status = { yahoo: null, binance: null, targets: null };

  async function pollYahooSymbol(it) {
    try {
      const data = await getJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(it.sym)}?range=1d&interval=5m`);
      const r = data.chart?.result?.[0];
      const meta = r?.meta;
      if (!meta?.regularMarketPrice) throw new Error('keine Daten');
      const prev = meta.previousClose ?? meta.chartPreviousClose;
      const q = quotes.get(it.sym);
      q.price = meta.regularMarketPrice;
      q.pct = prev ? ((q.price - prev) / prev) * 100 : null;
      q.time = (meta.regularMarketTime ?? 0) * 1000;
      q.unit = it.unit ?? CURRENCY[meta.currency] ?? meta.currency ?? '';
      q.spark = downsample(r.indicators?.quote?.[0]?.close ?? []);
      return true;
    } catch (err) {
      status.yahoo = err.message;
      return false;
    }
  }

  async function pollYahoo() {
    const list = [...groups.indices, ...groups.stocks, ...groups.etfs];
    let ok = 0;
    await pool(list, 4, async (it) => { if (await pollYahooSymbol(it)) ok++; });
    console.log(`[kurse] Yahoo: ${ok}/${list.length} Werte aktualisiert${ok < list.length && status.yahoo ? ` (letzter Fehler: ${status.yahoo})` : ''}`);
    if (ok) onUpdate();
  }

  // Kursziele brauchen bei Yahoo ein Cookie + "Crumb". Schlägt das fehl
  // (z. B. Einwilligungsseite in der EU), fehlen nur die Kursziele.
  let session = null;
  async function yahooSession() {
    if (session && Date.now() - session.at < 6 * 60 * 60 * 1000) return session;
    const r = await fetch('https://fc.yahoo.com', { headers: UA, redirect: 'manual', signal: AbortSignal.timeout(15000) });
    const cookie = r.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
    const c = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', { headers: { ...UA, cookie }, signal: AbortSignal.timeout(15000) });
    const crumb = (await c.text()).trim();
    if (!c.ok || !crumb || crumb.includes('<') || crumb.includes(' ')) throw new Error(`kein Crumb (HTTP ${c.status})`);
    session = { cookie, crumb, at: Date.now() };
    return session;
  }

  const REC = { strong_buy: 'Starker Kauf', buy: 'Kaufen', hold: 'Halten', underperform: 'Untergewichten', sell: 'Verkaufen', strong_sell: 'Starker Verkauf' };

  async function fetchTarget(it) {
    const s = await yahooSession();
    const data = await getJson(
      `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(it.sym)}?modules=financialData&crumb=${encodeURIComponent(s.crumb)}`,
      { cookie: s.cookie },
    );
    const f = data.quoteSummary?.result?.[0]?.financialData;
    const q = quotes.get(it.sym);
    q.targetAt = Date.now();
    if (!f?.targetMeanPrice?.raw || !f.numberOfAnalystOpinions?.raw) { q.target = null; return; }
    q.target = {
      mean: f.targetMeanPrice.raw,
      low: f.targetLowPrice?.raw ?? null,
      high: f.targetHighPrice?.raw ?? null,
      n: f.numberOfAnalystOpinions.raw,
      rec: REC[f.recommendationKey] ?? null,
    };
  }

  let targetIdx = 0;
  let targetFailLogged = false;
  async function targetTick() {
    // Eine Aktie alle paar Sekunden - schont die Quelle.
    const it = groups.stocks[targetIdx++ % groups.stocks.length];
    const q = quotes.get(it.sym);
    if (q.targetAt && Date.now() - q.targetAt < TARGET_REFRESH_MS) return;
    try {
      await fetchTarget(it);
      status.targets = 'ok';
      targetFailLogged = false;
    } catch (err) {
      session = null;
      status.targets = err.message;
      if (!targetFailLogged) console.warn(`[kurse] Kursziele nicht verfügbar: ${err.message}`);
      targetFailLogged = true;
    }
  }

  // -------------------------------------------------------------- Binance

  const binSym = (s) => `${s}USDT`;

  async function pollBinance() {
    try {
      const symbols = JSON.stringify(groups.crypto.map((c) => binSym(c.sym)));
      const data = await getJson(`https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbols)}`);
      for (const t of data) {
        const q = quotes.get(t.symbol.replace(/USDT$/, ''));
        if (!q) continue;
        q.price = Number(t.lastPrice);
        q.pct = Number(t.priceChangePercent);
        q.time = t.closeTime;
      }
      status.binance = 'ok';
      onUpdate();
    } catch (err) {
      if (status.binance !== err.message) console.warn(`[kurse] Binance: ${err.message}`);
      status.binance = err.message;
    }
  }

  async function pollBinanceSparks() {
    await pool(groups.crypto, 3, async (c) => {
      try {
        const k = await getJson(`https://api.binance.com/api/v3/klines?symbol=${binSym(c.sym)}&interval=30m&limit=${SPARK_POINTS}`);
        quotes.get(c.sym).spark = k.map((row) => Number(row[4]));
      } catch { /* Sparkline ist optional */ }
    });
  }

  // -------------------------------------------------------------- Demo

  const DEMO_BASE = {
    '^GDAXI': 19450, '^STOXX50E': 4980, '^GSPC': 5820, '^IXIC': 18400, '^DJI': 42300, 'GC=F': 2650, 'BZ=F': 74.2, 'EURUSD=X': 1.108,
    BTC: 64200,
    'SAP.DE': 238, 'SIE.DE': 192, 'ENR.DE': 61, 'ALV.DE': 298, 'MUV2.DE': 476, 'DTE.DE': 29.4, 'DBK.DE': 17.2, 'CBK.DE': 16.1, 'MBG.DE': 61.5, 'BMW.DE': 81.2,
    'VOW3.DE': 94.8, 'BAS.DE': 46.3, 'BAYN.DE': 27.1, 'IFX.DE': 34.6, 'RHM.DE': 521, 'AIR.DE': 158, 'ADS.DE': 221, 'DHL.DE': 40.3, 'RWE.DE': 32.4, 'EOAN.DE': 13.1,
    AAPL: 226, MSFT: 431, NVDA: 121, AMZN: 186, GOOGL: 164, META: 561, TSLA: 252, AMD: 156, NFLX: 702, JPM: 211, PLTR: 37.4, COIN: 181, MSTR: 152,
    'EUNL.DE': 98.4, 'VWCE.DE': 124.9, 'SXR8.DE': 541, 'SXRV.DE': 948, 'EXS1.DE': 171, 'IS3N.DE': 33.2, '4GLD.DE': 75.1, 'BTCE.DE': 55.3, ETH: 2620, XRP: 0.61, BNB: 590, SOL: 152, ADA: 0.38, TRX: 0.16, AVAX: 28.4, LINK: 11.9, DOT: 4.6, LTC: 68, BCH: 340, XLM: 0.098, TON: 5.4, ATOM: 4.7, NEAR: 5.1,
  };

  function demoInit() {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (const q of quotes.values()) {
      const base = DEMO_BASE[q.sym] ?? 20 + rnd() * 400;
      q.pct = (rnd() - 0.5) * (q.kind === 'Krypto' ? 14 : q.kind === 'Index' ? 2.4 : 9);
      const open = base / (1 + q.pct / 100);
      q.spark = Array.from({ length: SPARK_POINTS }, (_, i) => open + (base - open) * (i / (SPARK_POINTS - 1)) + (rnd() - 0.5) * base * 0.006);
      q.price = base;
      q.spark[SPARK_POINTS - 1] = base;
      q.unit = q.unit ?? (q.sym.endsWith('.DE') ? '€' : '$');
      q.time = Date.now();
      if (q.kind === 'Aktie') {
        const mean = base * (1.05 + rnd() * 0.25);
        q.target = { mean, low: base * (0.75 + rnd() * 0.15), high: mean * (1.15 + rnd() * 0.2), n: 8 + Math.floor(rnd() * 35), rec: ['Kaufen', 'Halten', 'Starker Kauf'][Math.floor(rnd() * 3)] };
      }
    }
  }

  function demoTick() {
    for (const q of quotes.values()) {
      if (Math.random() > 0.35) continue;
      const vol = q.kind === 'Krypto' ? 0.004 : q.kind === 'Index' ? 0.0006 : 0.002;
      const open = q.price / (1 + q.pct / 100);
      q.price *= 1 + (Math.random() - 0.5) * 2 * vol;
      q.pct = ((q.price - open) / open) * 100;
      q.spark = [...q.spark.slice(1), q.price];
      q.time = Date.now();
    }
    onUpdate();
  }

  // -------------------------------------------------------------- Start

  function start() {
    if (demo) {
      demoInit();
      setInterval(demoTick, 3000);
      return;
    }
    pollBinanceSparks().then(pollBinance);
    setInterval(pollBinance, (cfg.cryptoPollSeconds ?? 15) * 1000);
    setInterval(pollBinanceSparks, 5 * 60 * 1000);
    pollYahoo();
    setInterval(pollYahoo, (cfg.stockPollSeconds ?? 180) * 1000);
    setInterval(targetTick, 8000);
  }

  return { start, snapshot, findSymbol, status };
}
