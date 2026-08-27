import type { ConnectionStatus, LiquidationEvent, OrderBookState, TickerState } from '../data/types';
import type { Milestone, Pressure } from '../data/store';
import { config, displaySymbol } from '../config';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function fmtUsd(n: number, compact = true): string {
  if (compact) {
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
    return `$${n.toFixed(0)}`;
  }
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function fmtPrice(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connecting: 'CONNECTING',
  live: 'LIVE',
  reconnecting: 'RECONNECTING',
  stale: 'RECONNECTING',
};

const MAX_FEED_ITEMS = 14;

/**
 * Builds and mutates the DOM overlay drawn on top of the WebGL canvas.
 * Everything here is pure presentation - it only reacts to data pushed in
 * from main.ts, never touches the network or the scene directly.
 */
export class Hud {
  readonly root: HTMLDivElement;
  private readonly priceEl: HTMLDivElement;
  private readonly changeEl: HTMLDivElement;
  private readonly clockEl: HTMLDivElement;
  private readonly pressureLabelEl: HTMLDivElement;
  private readonly pressureBarEl: HTMLDivElement;
  private readonly pressureBarFillEl: HTMLDivElement;
  private readonly pressureDetailEl: HTMLDivElement;
  private readonly sellWallEl: HTMLDivElement;
  private readonly buyWallEl: HTMLDivElement;
  private readonly statusDotEl: HTMLDivElement;
  private readonly statusTextEl: HTMLDivElement;
  private readonly feedListEl: HTMLDivElement;
  private readonly depthCanvas: HTMLCanvasElement;
  private readonly killfeedEl: HTMLDivElement;
  private lastPrice: number | null = null;

  constructor(container: HTMLElement) {
    this.root = el('div', 'hud');
    if (config.transparent) this.root.classList.add('hud--transparent');

    // Top bar
    const topBar = el('div', 'hud__topbar');
    const brand = el('div', 'hud__brand');
    brand.append(el('span', 'hud__brand-icon', '₿'), el('span', 'hud__brand-text', 'Bitcoin Battlefield'));
    const status = el('div', 'hud__status');
    this.statusDotEl = el('div', 'hud__status-dot');
    this.statusTextEl = el('div', 'hud__status-text', 'CONNECTING');
    status.append(this.statusDotEl, this.statusTextEl);
    topBar.append(brand, status);

    // Centered hero block: clock, symbol, price, change, pressure meter.
    const headerRow = el('div', 'hud__center');
    this.clockEl = el('div', 'hud__clock', 'UTC --:--:--');
    const label = el('div', 'hud__price-label', `${displaySymbol} · AGGREGATED SPOT`);
    this.priceEl = el('div', 'hud__price', '$--,---.--');
    this.changeEl = el('div', 'hud__change', '--');

    this.pressureLabelEl = el('div', 'hud__pressure-label', 'Balanced');
    this.pressureBarEl = el('div', 'hud__pressure-bar');
    this.pressureBarFillEl = el('div', 'hud__pressure-bar-fill');
    this.pressureBarEl.append(this.pressureBarFillEl);
    this.pressureDetailEl = el('div', 'hud__pressure-detail', 'Waiting for data…');

    const meter = el('div', 'hud__meter');
    meter.append(
      el('span', 'hud__meter-end hud__meter-end--bears', 'BEARS'),
      this.pressureBarEl,
      el('span', 'hud__meter-end hud__meter-end--bulls', 'BULLS'),
    );

    headerRow.append(
      this.clockEl,
      label,
      this.priceEl,
      this.changeEl,
      this.pressureLabelEl,
      meter,
      this.pressureDetailEl,
    );

    // Wall totals (corners)
    const sellWallBox = el('div', 'hud__wall hud__wall--sell');
    sellWallBox.append(el('div', 'hud__wall-label', 'SELL WALL · BEARS'), (this.sellWallEl = el('div', 'hud__wall-value', '--')));
    const buyWallBox = el('div', 'hud__wall hud__wall--buy');
    buyWallBox.append(el('div', 'hud__wall-label', 'BUY WALL · BULLS'), (this.buyWallEl = el('div', 'hud__wall-value', '--')));

    // Bottom-left depth chart
    const depthBox = el('div', 'hud__depth');
    const depthHeader = el('div', 'hud__depth-header');
    depthHeader.append(el('span', undefined, 'ORDER BOOK DEPTH'), el('span', 'hud__depth-source', 'Binance spot'));
    this.depthCanvas = el('canvas', 'hud__depth-canvas');
    this.depthCanvas.width = 360;
    this.depthCanvas.height = 150;
    depthBox.append(depthHeader, this.depthCanvas);

    // Bottom-right market feed
    const feedBox = el('div', 'hud__feed');
    const feedHeader = el('div', 'hud__feed-header');
    feedHeader.append(el('span', undefined, 'MARKET FEED'), el('span', 'hud__feed-live', 'LIVE'));
    this.feedListEl = el('div', 'hud__feed-list');
    feedBox.append(feedHeader, this.feedListEl);

    // Kill-feed style callout for large liquidations
    this.killfeedEl = el('div', 'hud__killfeed');

    this.root.append(topBar, headerRow, sellWallBox, buyWallBox, depthBox, feedBox, this.killfeedEl);

    if (config.watermark) {
      this.root.append(el('div', 'hud__watermark', config.watermark));
    }

    container.appendChild(this.root);
    this.tickClock();
    window.setInterval(() => this.tickClock(), 1000);
  }

  private tickClock(): void {
    const now = new Date();
    this.clockEl.textContent = `UTC ${now.toISOString().slice(11, 19)}`;
  }

  setStatus(status: ConnectionStatus): void {
    this.statusTextEl.textContent = STATUS_LABEL[status];
    this.statusDotEl.dataset.status = status;
  }

  setTicker(t: TickerState): void {
    this.priceEl.textContent = fmtPrice(t.price);
    this.priceEl.classList.remove('flash-up', 'flash-down');
    if (this.lastPrice !== null && t.price !== this.lastPrice) {
      this.priceEl.classList.add(t.price > this.lastPrice ? 'flash-up' : 'flash-down');
    }
    this.lastPrice = t.price;

    const sign = t.changePercent24h >= 0 ? '+' : '';
    this.changeEl.textContent = `${sign}${t.changePercent24h.toFixed(2)}% 24h`;
    this.changeEl.classList.toggle('hud__change--up', t.changePercent24h >= 0);
    this.changeEl.classList.toggle('hud__change--down', t.changePercent24h < 0);
  }

  setBook(book: OrderBookState, pressure: Pressure, pressureRatio: number, currentPrice: number): void {
    this.sellWallEl.textContent = fmtUsd(book.askWallUsd);
    this.buyWallEl.textContent = fmtUsd(book.bidWallUsd);

    const label = pressure === 'buyers' ? 'Buyers advancing' : pressure === 'sellers' ? 'Sellers advancing' : 'Standoff';
    this.pressureLabelEl.textContent = label;
    this.pressureLabelEl.dataset.pressure = pressure;

    const clamped = Math.max(-1, Math.min(1, pressureRatio));
    this.pressureBarFillEl.style.width = `${Math.abs(clamped) * 50}%`;
    this.pressureBarFillEl.classList.toggle('hud__pressure-bar-fill--buy', clamped >= 0);
    this.pressureBarFillEl.classList.toggle('hud__pressure-bar-fill--sell', clamped < 0);
    this.pressureBarFillEl.style.left = clamped >= 0 ? '50%' : `${50 - Math.abs(clamped) * 50}%`;

    this.pressureDetailEl.textContent =
      pressure === 'balanced' ? 'Evenly matched' : `${Math.round(Math.abs(clamped) * 100)}% ${pressure === 'buyers' ? 'buy-side' : 'sell-side'} dominance`;

    this.drawDepth(book, currentPrice);
  }

  private drawDepth(book: OrderBookState, currentPrice: number): void {
    const ctx = this.depthCanvas.getContext('2d');
    if (!ctx) return;
    const w = this.depthCanvas.width;
    const h = this.depthCanvas.height;
    ctx.clearRect(0, 0, w, h);
    if (book.bids.length < 2 || book.asks.length < 2) return;

    const bids = [...book.bids].sort((a, b) => b.price - a.price);
    const asks = [...book.asks].sort((a, b) => a.price - b.price);
    const minPrice = bids[bids.length - 1].price;
    const maxPrice = asks[asks.length - 1].price;
    const range = Math.max(maxPrice - minPrice, 1);
    const x = (p: number) => ((p - minPrice) / range) * w;

    let cum = 0;
    const bidPoints: [number, number][] = [[x(bids[0].price), 0]];
    for (const level of bids) {
      cum += level.price * level.qty;
      bidPoints.push([x(level.price), cum]);
    }
    cum = 0;
    const askPoints: [number, number][] = [[x(asks[0].price), 0]];
    for (const level of asks) {
      cum += level.price * level.qty;
      askPoints.push([x(level.price), cum]);
    }

    const maxCum = Math.max(bidPoints[bidPoints.length - 1][1], askPoints[askPoints.length - 1][1], 1);
    const y = (v: number) => h - (v / maxCum) * (h - 24);

    const paint = (points: [number, number][], color: string, fill: string) => {
      ctx.beginPath();
      ctx.moveTo(points[0][0], h);
      for (const [px, pv] of points) ctx.lineTo(px, y(pv));
      ctx.lineTo(points[points.length - 1][0], h);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(points[0][0], y(points[0][1]));
      for (const [px, pv] of points) ctx.lineTo(px, y(pv));
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };

    paint(bidPoints, 'rgba(54, 193, 122, 0.9)', 'rgba(54, 193, 122, 0.25)');
    paint(askPoints, 'rgba(224, 72, 63, 0.9)', 'rgba(224, 72, 63, 0.25)');

    const cx = x(currentPrice);
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, h);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(minPrice.toLocaleString('en-US', { maximumFractionDigits: 0 }), 4, h - 4);
    ctx.textAlign = 'right';
    ctx.fillText(maxPrice.toLocaleString('en-US', { maximumFractionDigits: 0 }), w - 4, h - 4);
  }

  pushLiquidation(l: LiquidationEvent, unitsLost: number): void {
    const row = el('div', 'hud__feed-row');
    row.dataset.side = l.side;
    const icon = el('div', 'hud__feed-icon', l.side === 'short' ? '▲' : '▼');
    const text = el(
      'div',
      'hud__feed-text',
      `Liquidated ${l.side} · ${fmtUsd(l.usd)} @ ${l.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
    );
    const units = el('div', 'hud__feed-units', `${l.side === 'short' ? 'Bears' : 'Bulls'} -${unitsLost}`);
    row.append(icon, text, units);
    this.feedListEl.prepend(row);
    while (this.feedListEl.children.length > MAX_FEED_ITEMS) {
      this.feedListEl.removeChild(this.feedListEl.lastElementChild as ChildNode);
    }

    if (l.usd >= 75_000) {
      this.showKillfeed(`${l.side === 'short' ? 'BEARS' : 'BULLS'} WIPED · ${fmtUsd(l.usd)} liquidated @ ${fmtPrice(l.price)}`, l.side);
    }
  }

  pushMilestone(m: Milestone): void {
    if (m.kind === 'round-number') {
      this.showKillfeed(`BTC crossed ${fmtPrice(m.price)}`, 'milestone');
    } else if (m.kind === 'new-24h-high') {
      this.showKillfeed(`New 24h high · ${fmtPrice(m.price)}`, 'bulls');
    } else if (m.kind === 'new-24h-low') {
      this.showKillfeed(`New 24h low · ${fmtPrice(m.price)}`, 'bears');
    }
  }

  private killfeedTimer: number | null = null;
  private showKillfeed(text: string, tone: 'short' | 'long' | 'bears' | 'bulls' | 'milestone'): void {
    this.killfeedEl.textContent = text;
    this.killfeedEl.dataset.tone = tone === 'short' ? 'bears' : tone === 'long' ? 'bulls' : tone;
    this.killfeedEl.classList.remove('show');
    // Force reflow so the animation restarts even for back-to-back events.
    void this.killfeedEl.offsetWidth;
    this.killfeedEl.classList.add('show');
    if (this.killfeedTimer !== null) clearTimeout(this.killfeedTimer);
    this.killfeedTimer = window.setTimeout(() => this.killfeedEl.classList.remove('show'), 3600);
  }
}
