import type {
  ConnectionStatus,
  DepthLevel,
  LiquidationEvent,
  OrderBookState,
  TickerState,
  TradeEvent,
} from './types';

export interface FeedHandlers {
  onTicker(t: TickerState): void;
  onDepth(o: OrderBookState): void;
  onTrade(tr: TradeEvent): void;
  onLiquidation(l: LiquidationEvent): void;
  onStatus(s: ConnectionStatus): void;
}

const MARKET_HOST = 'wss://stream.binance.com:9443/stream';
const FUTURES_HOST = 'wss://fstream.binance.com/ws';
const MAX_BACKOFF_MS = 30_000;
const STALE_AFTER_MS = 15_000;

let seq = 0;
function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now()}-${seq}`;
}

function parseLevels(raw: [string, string][]): DepthLevel[] {
  return raw.map(([price, qty]) => ({ price: Number(price), qty: Number(qty) }));
}

function sumUsd(levels: DepthLevel[]): number {
  let total = 0;
  for (const l of levels) total += l.price * l.qty;
  return total;
}

/**
 * Owns two independent Binance WebSocket connections - spot market data
 * (ticker/depth/trades) and USD-M futures forced-liquidation orders - and
 * keeps both alive indefinitely with exponential-backoff reconnects. This
 * is designed to sit behind an OBS Browser Source for hours/days, so every
 * failure mode reconnects on its own; nothing here ever throws upward.
 */
export class BinanceFeed {
  private marketWs: WebSocket | null = null;
  private futuresWs: WebSocket | null = null;
  private marketBackoff = 1000;
  private futuresBackoff = 1000;
  private closedByUs = false;
  private lastMarketMessageAt = 0;
  private watchdog: number | null = null;
  private marketReconnectTimer: number | null = null;
  private futuresReconnectTimer: number | null = null;
  private status: ConnectionStatus = 'connecting';

  constructor(
    private readonly symbol: string,
    private readonly handlers: FeedHandlers,
  ) {}

  start(): void {
    this.closedByUs = false;
    this.connectMarket();
    this.connectFutures();
    this.watchdog = window.setInterval(() => this.checkStale(), 4000);
  }

  stop(): void {
    this.closedByUs = true;
    if (this.watchdog !== null) clearInterval(this.watchdog);
    if (this.marketReconnectTimer !== null) clearTimeout(this.marketReconnectTimer);
    if (this.futuresReconnectTimer !== null) clearTimeout(this.futuresReconnectTimer);
    this.marketWs?.close();
    this.futuresWs?.close();
  }

  private setStatus(s: ConnectionStatus): void {
    if (this.status === s) return;
    this.status = s;
    this.handlers.onStatus(s);
  }

  private checkStale(): void {
    if (this.lastMarketMessageAt === 0) return;
    const age = Date.now() - this.lastMarketMessageAt;
    if (age > STALE_AFTER_MS) {
      this.setStatus('stale');
      this.marketWs?.close();
    }
  }

  private connectMarket(): void {
    const s = this.symbol.toLowerCase();
    const streams = [`${s}@ticker`, `${s}@depth20@1000ms`, `${s}@aggTrade`].join('/');
    const ws = new WebSocket(`${MARKET_HOST}?streams=${streams}`);
    this.marketWs = ws;
    this.setStatus(this.marketBackoff > 1000 ? 'reconnecting' : 'connecting');

    ws.onopen = () => {
      this.marketBackoff = 1000;
      this.lastMarketMessageAt = Date.now();
      this.setStatus('live');
    };
    ws.onmessage = (ev) => {
      this.lastMarketMessageAt = Date.now();
      if (this.status !== 'live') this.setStatus('live');
      this.handleMarketMessage(ev);
    };
    ws.onerror = () => ws.close();
    ws.onclose = () => {
      if (this.closedByUs) return;
      this.setStatus('reconnecting');
      this.marketReconnectTimer = window.setTimeout(() => this.connectMarket(), this.marketBackoff);
      this.marketBackoff = Math.min(this.marketBackoff * 1.7, MAX_BACKOFF_MS);
    };
  }

  private connectFutures(): void {
    const s = this.symbol.toLowerCase();
    const ws = new WebSocket(`${FUTURES_HOST}/${s}@forceOrder`);
    this.futuresWs = ws;

    ws.onopen = () => {
      this.futuresBackoff = 1000;
    };
    ws.onmessage = (ev) => this.handleFuturesMessage(ev);
    ws.onerror = () => ws.close();
    ws.onclose = () => {
      if (this.closedByUs) return;
      this.futuresReconnectTimer = window.setTimeout(() => this.connectFutures(), this.futuresBackoff);
      this.futuresBackoff = Math.min(this.futuresBackoff * 1.7, MAX_BACKOFF_MS);
    };
  }

  private handleMarketMessage(ev: MessageEvent): void {
    let envelope: { stream: string; data: Record<string, unknown> };
    try {
      envelope = JSON.parse(ev.data);
    } catch {
      return;
    }
    const { stream, data } = envelope;
    if (!stream || !data) return;

    if (stream.endsWith('@ticker')) {
      this.handlers.onTicker({
        price: Number(data.c),
        changePercent24h: Number(data.P),
        high24h: Number(data.h),
        low24h: Number(data.l),
        volume24hBase: Number(data.v),
        updatedAt: Date.now(),
      });
    } else if (stream.includes('@depth20')) {
      const bids = parseLevels(data.bids as [string, string][]);
      const asks = parseLevels(data.asks as [string, string][]);
      this.handlers.onDepth({
        bids,
        asks,
        bidWallUsd: sumUsd(bids),
        askWallUsd: sumUsd(asks),
        updatedAt: Date.now(),
      });
    } else if (stream.endsWith('@aggTrade')) {
      const price = Number(data.p);
      const qty = Number(data.q);
      this.handlers.onTrade({
        id: nextId('trade'),
        price,
        qtyBase: qty,
        usd: price * qty,
        isBuyerMaker: Boolean(data.m),
        time: Number(data.T),
      });
    }
  }

  private handleFuturesMessage(ev: MessageEvent): void {
    let msg: { e: string; o: Record<string, unknown> };
    try {
      msg = JSON.parse(ev.data);
    } catch {
      return;
    }
    if (msg.e !== 'forceOrder' || !msg.o) return;
    const o = msg.o;
    const price = Number(o.ap) || Number(o.p);
    const qty = Number(o.q ?? o.z ?? 0);
    this.handlers.onLiquidation({
      id: nextId('liq'),
      side: o.S === 'SELL' ? 'long' : 'short',
      price,
      qtyBase: qty,
      usd: price * qty,
      time: Number(o.T) || Date.now(),
    });
  }
}
