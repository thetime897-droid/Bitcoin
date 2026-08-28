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

/** Running totals for the session, shown in the scoreboard panel. Gives a
 * returning viewer something to check in on beyond the current price. */
export interface SessionStats {
  /** Shorts liquidated - Bears losing positions. */
  bearsLostUsd: number;
  /** Longs liquidated - Bulls losing positions. */
  bullsLostUsd: number;
  liquidationCount: number;
  biggestUsd: number;
  biggestSide: 'bears' | 'bulls' | null;
  /** Which side currently controls the line, and since when. */
  holdSide: Pressure;
  holdSince: number;
}

/** A moment big enough to interrupt the screen with a full-width banner. */
export interface MajorEvent {
  kind: 'mega-liquidation' | 'breakout' | 'breakthrough' | 'streak';
  title: string;
  subtitle: string;
  side: 'bears' | 'bulls' | 'neutral';
  /** 0..1 - drives banner size, screen flash strength and sound. */
  intensity: number;
}

type Listener = (s: MarketState) => void;
type LiquidationListener = (l: LiquidationEvent) => void;
type MilestoneListener = (m: Milestone) => void;
type FeedListener = (e: FeedEvent) => void;
type StatsListener = (s: SessionStats) => void;
type MajorListener = (e: MajorEvent) => void;

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

/** A liquidation this size stops the show with a full-width banner. */
const MEGA_LIQUIDATION_USD = 250_000;
/** Consecutive kills on one side, within this window, count as a rout. */
const STREAK_WINDOW_MS = 22_000;
const STREAK_MIN = 3;
/** Pressure beyond this counts as one side breaking through the line. */
const BREAKTHROUGH_RATIO = 0.55;
/** Don't re-announce a breakthrough more often than this. */
const BREAKTHROUGH_COOLDOWN_MS = 45_000;

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

  private statsListeners = new Set<StatsListener>();
  private majorListeners = new Set<MajorListener>();
  private stats: SessionStats = {
    bearsLostUsd: 0,
    bullsLostUsd: 0,
    liquidationCount: 0,
    biggestUsd: 0,
    biggestSide: null,
    holdSide: 'balanced',
    holdSince: Date.now(),
  };
  private streakSide: 'bears' | 'bulls' | null = null;
  private streakCount = 0;
  private streakLastAt = 0;
  private streakAnnouncedAt = 0;
  private lastBreakthroughAt = 0;
  private lastBreakthroughSide: 'bears' | 'bulls' | null = null;

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

  onStats(fn: StatsListener): () => void {
    this.statsListeners.add(fn);
    fn(this.stats);
    return () => this.statsListeners.delete(fn);
  }

  /** Screen-stopping moments: a whale getting wiped out, a price level
   * breaking, one side overrunning the line, a run of kills. */
  onMajorEvent(fn: MajorListener): () => void {
    this.majorListeners.add(fn);
    return () => this.majorListeners.delete(fn);
  }

  private emitStats(): void {
    for (const fn of this.statsListeners) fn(this.stats);
  }

  private fireMajor(event: MajorEvent): void {
    for (const fn of this.majorListeners) fn(event);
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

    // A liquidated short is a Bear losing their position, and vice versa.
    const losing: 'bears' | 'bulls' = liq.side === 'short' ? 'bears' : 'bulls';
    if (losing === 'bears') this.stats.bearsLostUsd += liq.usd;
    else this.stats.bullsLostUsd += liq.usd;
    this.stats.liquidationCount += 1;
    if (liq.usd > this.stats.biggestUsd) {
      this.stats.biggestUsd = liq.usd;
      this.stats.biggestSide = losing;
    }
    this.emitStats();

    this.checkStreak(losing);

    if (liq.usd >= MEGA_LIQUIDATION_USD) {
      this.fireMajor({
        kind: 'mega-liquidation',
        title: `${losing === 'bears' ? 'BEARS' : 'BULLS'} WIPED OUT`,
        subtitle: `${fmtUsd(liq.usd)} liquidated at ${liq.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
        side: losing,
        // Saturates around $1M so a single record print can't peg it forever.
        intensity: clamp(liq.usd / 1_000_000, 0.35, 1),
      });
    }
  }

  /** Consecutive kills against one side inside a short window read as a
   * rout, which is worth calling out even when no single hit was huge. */
  private checkStreak(losing: 'bears' | 'bulls'): void {
    const now = Date.now();
    if (this.streakSide === losing && now - this.streakLastAt <= STREAK_WINDOW_MS) {
      this.streakCount += 1;
    } else {
      this.streakSide = losing;
      this.streakCount = 1;
      this.streakAnnouncedAt = 0;
    }
    this.streakLastAt = now;

    // Announce at the threshold, then only on every further kill.
    if (this.streakCount >= STREAK_MIN && this.streakCount > this.streakAnnouncedAt) {
      this.streakAnnouncedAt = this.streakCount;
      const winner = losing === 'bears' ? 'BULLS' : 'BEARS';
      this.fireMajor({
        kind: 'streak',
        title: `${winner} ON A RAMPAGE`,
        subtitle: `${this.streakCount} liquidations in a row`,
        side: losing === 'bears' ? 'bulls' : 'bears',
        intensity: clamp(0.3 + this.streakCount * 0.12, 0.3, 1),
      });
    }
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
    if (this.lastReportedPressure !== pressure) {
      this.stats.holdSide = pressure;
      this.stats.holdSince = Date.now();
      this.emitStats();
    }
    this.lastReportedPressure = pressure;
    this.checkBreakthrough(combined);

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

  /** One side pushing the line far past centre is its own headline. */
  private checkBreakthrough(ratio: number): void {
    if (Math.abs(ratio) < BREAKTHROUGH_RATIO) return;
    const side: 'bears' | 'bulls' = ratio > 0 ? 'bulls' : 'bears';
    const now = Date.now();
    if (side === this.lastBreakthroughSide && now - this.lastBreakthroughAt < BREAKTHROUGH_COOLDOWN_MS) return;
    this.lastBreakthroughSide = side;
    this.lastBreakthroughAt = now;
    this.fireMajor({
      kind: 'breakthrough',
      title: `${side === 'bulls' ? 'BULLS' : 'BEARS'} BREAK THROUGH`,
      subtitle: `Line pushed ${Math.round(Math.abs(ratio) * 100)}% into enemy ground`,
      side,
      intensity: clamp(Math.abs(ratio), 0.4, 1),
    });
  }

  private fireMilestone(m: Milestone): void {
    for (const fn of this.milestoneListeners) fn(m);

    if (m.kind === 'round-number') {
      this.fireMajor({
        kind: 'breakout',
        title: `BTC BREAKS $${m.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
        subtitle: 'Price level taken',
        side: 'neutral',
        intensity: 0.8,
      });
    }
  }

  private emit(): void {
    for (const fn of this.listeners) fn(this.state);
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export const marketStore = new MarketStore();
