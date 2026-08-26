import type {
  ConnectionStatus,
  LiquidationEvent,
  OrderBookState,
  TickerState,
  TradeEvent,
} from './types';

export type Pressure = 'buyers' | 'sellers' | 'balanced';

export interface Milestone {
  kind: 'round-number' | 'new-24h-high' | 'new-24h-low';
  price: number;
  time: number;
}

export interface MarketState {
  ticker: TickerState | null;
  book: OrderBookState | null;
  status: ConnectionStatus;
  liquidations: LiquidationEvent[];
  pressure: Pressure;
  /** -1 (sellers fully in control) .. +1 (buyers fully in control) */
  pressureRatio: number;
}

type Listener = (s: MarketState) => void;
type LiquidationListener = (l: LiquidationEvent) => void;
type MilestoneListener = (m: Milestone) => void;

const MAX_LIQUIDATION_HISTORY = 40;
const ROUND_NUMBER_STEP = 1000;

/**
 * Single source of truth for live market state. Feed handlers push raw
 * events in; everything downstream (3D scene, HUD, audio) subscribes here
 * instead of touching the WebSocket layer directly.
 */
class MarketStore {
  private state: MarketState = {
    ticker: null,
    book: null,
    status: 'connecting',
    liquidations: [],
    pressure: 'balanced',
    pressureRatio: 0,
  };

  private listeners = new Set<Listener>();
  private liquidationListeners = new Set<LiquidationListener>();
  private milestoneListeners = new Set<MilestoneListener>();

  private tradeFlowEma = 0;
  private tradeVolumeEma = 0;
  private lastRoundLevelSeen: number | null = null;
  private lastHigh24h: number | null = null;
  private lastLow24h: number | null = null;

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  onLiquidation(fn: LiquidationListener): () => void {
    this.liquidationListeners.add(fn);
    return () => this.liquidationListeners.delete(fn);
  }

  onMilestone(fn: MilestoneListener): () => void {
    this.milestoneListeners.add(fn);
    return () => this.milestoneListeners.delete(fn);
  }

  get snapshot(): MarketState {
    return this.state;
  }

  setStatus(status: ConnectionStatus): void {
    this.state = { ...this.state, status };
    this.emit();
  }

  setTicker(ticker: TickerState): void {
    this.checkMilestones(ticker);
    this.state = { ...this.state, ticker };
    this.recomputePressure();
  }

  setBook(book: OrderBookState): void {
    this.state = { ...this.state, book };
    this.recomputePressure();
  }

  addTrade(trade: TradeEvent): void {
    // isBuyerMaker=true -> taker sold (sell pressure); false -> taker bought.
    const signed = trade.isBuyerMaker ? -trade.usd : trade.usd;
    const alpha = 0.05;
    this.tradeFlowEma = this.tradeFlowEma * (1 - alpha) + signed * alpha;
    this.tradeVolumeEma = this.tradeVolumeEma * (1 - alpha) + trade.usd * alpha;
    this.recomputePressure();
  }

  addLiquidation(liq: LiquidationEvent): void {
    const liquidations = [liq, ...this.state.liquidations].slice(0, MAX_LIQUIDATION_HISTORY);
    this.state = { ...this.state, liquidations };
    this.emit();
    for (const fn of this.liquidationListeners) fn(liq);
  }

  private recomputePressure(): void {
    const { book } = this.state;
    let wallRatio = 0;
    if (book && book.bidWallUsd + book.askWallUsd > 0) {
      wallRatio = (book.bidWallUsd - book.askWallUsd) / (book.bidWallUsd + book.askWallUsd);
    }
    const tradeRatio =
      this.tradeVolumeEma > 1 ? clamp(this.tradeFlowEma / (this.tradeVolumeEma * 2), -1, 1) : 0;

    const combined = clamp(wallRatio * 0.65 + tradeRatio * 0.35, -1, 1);
    const pressure: Pressure = combined > 0.07 ? 'buyers' : combined < -0.07 ? 'sellers' : 'balanced';

    this.state = { ...this.state, pressureRatio: combined, pressure };
    this.emit();
  }

  private checkMilestones(ticker: TickerState): void {
    const round = Math.round(ticker.price / ROUND_NUMBER_STEP) * ROUND_NUMBER_STEP;
    const distance = Math.abs(ticker.price - round);
    if (distance < ROUND_NUMBER_STEP * 0.01 && this.lastRoundLevelSeen !== round) {
      this.lastRoundLevelSeen = round;
      this.fireMilestone({ kind: 'round-number', price: round, time: Date.now() });
    }

    if (this.lastHigh24h !== null && ticker.high24h > this.lastHigh24h) {
      this.fireMilestone({ kind: 'new-24h-high', price: ticker.high24h, time: Date.now() });
    }
    this.lastHigh24h = ticker.high24h;

    if (this.lastLow24h !== null && ticker.low24h < this.lastLow24h) {
      this.fireMilestone({ kind: 'new-24h-low', price: ticker.low24h, time: Date.now() });
    }
    this.lastLow24h = ticker.low24h;
  }

  private fireMilestone(m: Milestone): void {
    for (const fn of this.milestoneListeners) fn(m);
  }

  private emit(): void {
    for (const fn of this.listeners) fn(this.state);
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export const marketStore = new MarketStore();
