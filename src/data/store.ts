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

/** Anything worth printing to the on-screen battle log. */
export interface FeedEvent {
  id: string;
  kind: 'liquidation' | 'whale' | 'push' | 'wall' | 'status';
  /** Which army the event favours; drives the row's accent colour. */
  side: 'bears' | 'bulls' | 'neutral';
  text: string;
  /** Short right-aligned label, e.g. the unit swing. */
  detail: string;
  time: number;
}

type Listener = (s: MarketState) => void;
type LiquidationListener = (l: LiquidationEvent) => void;
type MilestoneListener = (m: Milestone) => void;
type FeedListener = (e: FeedEvent) => void;

const MAX_LIQUIDATION_HISTORY = 40;
const ROUND_NUMBER_STEP = 1000;

/** A single trade this large is worth calling out on its own. */
const WHALE_TRADE_USD = 120_000;
/** Minimum gap between the chattier auto-generated feed lines, so whale
 * prints and wall shifts can't drown out actual liquidations. */
const CHATTER_MIN_GAP_MS = 2600;
/** If nothing at all has printed for this long, post a situation report -
 * a quiet market must never leave the log looking frozen on stream. */
const SITREP_AFTER_MS = 17_000;

function fmtUsd(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

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
  private feedListeners = new Set<FeedListener>();

  private tradeFlowEma = 0;
  private tradeVolumeEma = 0;
  private lastRoundLevelSeen: number | null = null;
  private lastHigh24h: number | null = null;
  private lastLow24h: number | null = null;

  private feedSeq = 0;
  private lastChatterAt = 0;
  private lastFeedAt = 0;
  private lastReportedPressure: Pressure | null = null;
  private lastBidWall = 0;
  private lastAskWall = 0;

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

  onFeed(fn: FeedListener): () => void {
    this.feedListeners.add(fn);
    return () => this.feedListeners.delete(fn);
  }

  /** Emit a battle-log line. `chatter` lines are rate-limited against each
   * other; liquidations always get through. */
  private pushFeed(event: Omit<FeedEvent, 'id' | 'time'>, chatter = true): void {
    const now = Date.now();
    if (chatter && now - this.lastChatterAt < CHATTER_MIN_GAP_MS) return;
    if (chatter) this.lastChatterAt = now;
    this.lastFeedAt = now;
    this.feedSeq += 1;
    const full: FeedEvent = { ...event, id: `feed-${now}-${this.feedSeq}`, time: now };
    for (const fn of this.feedListeners) fn(full);
  }

  /**
   * Called on a timer from the render loop. Prints a situation report if the
   * market has gone quiet, so the on-screen log always looks live even when
   * nothing is being liquidated.
   */
  tickFeed(): void {
    if (Date.now() - this.lastFeedAt < SITREP_AFTER_MS) return;
    const { pressure, pressureRatio, book } = this.state;
    if (pressure === 'balanced' || !book) {
      this.pushFeed({
        kind: 'status',
        side: 'neutral',
        text: 'Front holds · neither side gaining ground',
        detail: 'STANDOFF',
      }, false);
    } else {
      const bulls = pressure === 'buyers';
      this.pushFeed({
        kind: 'status',
        side: bulls ? 'bulls' : 'bears',
        text: `${bulls ? 'Bulls' : 'Bears'} hold the advance · ${fmtUsd(bulls ? book.bidWallUsd : book.askWallUsd)} wall`,
        detail: `${Math.round(Math.abs(pressureRatio) * 100)}%`,
      }, false);
    }
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
    this.checkWallShift(book);
    this.state = { ...this.state, book };
    this.recomputePressure();
  }

  /** Report a wall that thickens or thins sharply - reinforcements arriving
   * or a side pulling back. */
  private checkWallShift(book: OrderBookState): void {
    const prevBid = this.lastBidWall;
    const prevAsk = this.lastAskWall;
    this.lastBidWall = book.bidWallUsd;
    this.lastAskWall = book.askWallUsd;
    if (prevBid <= 0 || prevAsk <= 0) return;

    const bidDelta = (book.bidWallUsd - prevBid) / prevBid;
    const askDelta = (book.askWallUsd - prevAsk) / prevAsk;
    const bidBigger = Math.abs(bidDelta) >= Math.abs(askDelta);
    const delta = bidBigger ? bidDelta : askDelta;
    if (Math.abs(delta) < 0.18) return;

    const side = bidBigger ? 'bulls' : 'bears';
    const wallName = bidBigger ? 'Buy wall' : 'Sell wall';
    const verb = delta > 0 ? 'reinforced' : 'thinning';
    this.pushFeed({
      kind: 'wall',
      side,
      text: `${wallName} ${verb} · ${fmtUsd(bidBigger ? book.bidWallUsd : book.askWallUsd)}`,
      detail: `${delta > 0 ? '+' : ''}${Math.round(delta * 100)}%`,
    });
  }

  addTrade(trade: TradeEvent): void {
    // isBuyerMaker=true -> taker sold (sell pressure); false -> taker bought.
    const signed = trade.isBuyerMaker ? -trade.usd : trade.usd;
    const alpha = 0.05;
    this.tradeFlowEma = this.tradeFlowEma * (1 - alpha) + signed * alpha;
    this.tradeVolumeEma = this.tradeVolumeEma * (1 - alpha) + trade.usd * alpha;

    if (trade.usd >= WHALE_TRADE_USD) {
      const buying = !trade.isBuyerMaker;
      this.pushFeed({
        kind: 'whale',
        side: buying ? 'bulls' : 'bears',
        text: `Whale ${buying ? 'buy' : 'sell'} · ${fmtUsd(trade.usd)} @ ${trade.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
        detail: `${buying ? 'Bulls' : 'Bears'} +${Math.max(1, Math.round(trade.usd / 90_000))}`,
      });
    }

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

    // Announce whenever control of the line actually changes hands.
    if (this.lastReportedPressure !== null && pressure !== this.lastReportedPressure) {
      if (pressure === 'balanced') {
        this.pushFeed({
          kind: 'push',
          side: 'neutral',
          text: 'Advance stalls · line back to a standoff',
          detail: 'HELD',
        });
      } else {
        const bulls = pressure === 'buyers';
        this.pushFeed({
          kind: 'push',
          side: bulls ? 'bulls' : 'bears',
          text: `${bulls ? 'Bulls' : 'Bears'} push the line forward`,
          detail: `${Math.round(Math.abs(combined) * 100)}%`,
        });
      }
    }
    this.lastReportedPressure = pressure;

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
