import type { ConnectionStatus, LiquidationEvent, OrderBookState, TickerState } from '../data/types';
import type { FeedEvent, Milestone, Pressure } from '../data/store';
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
 * Channel branding beside the title. Uses `?logo=` when the streamer points
 * at their own image, and otherwise draws a panda mark inline so the badge
 * works with nothing to host or fetch.
 */
function buildChannelBadge(): HTMLElement {
  const badge = el('div', 'brand-badge');

  if (config.logoUrl) {
    const img = el('img', 'brand-badge__img');
    img.src = config.logoUrl;
    img.alt = '';
    // If the file is missing or blocked, fall back to the drawn mark rather
    // than leaving a broken-image icon on stream.
    img.onerror = () => {
      img.remove();
      badge.prepend(buildPandaMark());
    };
    badge.append(img);
  } else {
    badge.append(buildPandaMark());
  }

  badge.append(el('span', 'brand-badge__text', config.brand));
  return badge;
}

/** Panda mark drawn as inline SVG: nothing to load, scales cleanly. */
function buildPandaMark(): SVGSVGElement {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 48 48');
  svg.setAttribute('class', 'brand-badge__mark');

  const add = (tag: string, attrs: Record<string, string>) => {
    const node = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    svg.appendChild(node);
    return node;
  };

  add('circle', { cx: '24', cy: '24', r: '23', fill: '#12351f' });
  // Ears.
  add('circle', { cx: '10', cy: '11', r: '6.4', fill: '#14161a' });
  add('circle', { cx: '38', cy: '11', r: '6.4', fill: '#14161a' });
  // Face.
  add('circle', { cx: '24', cy: '25', r: '15', fill: '#f4f2ee' });
  // Eye patches, angled inward the way the logo's are.
  add('ellipse', { cx: '17.5', cy: '22', rx: '5.2', ry: '6', fill: '#14161a', transform: 'rotate(-14 17.5 22)' });
  add('ellipse', { cx: '30.5', cy: '22', rx: '5.2', ry: '6', fill: '#14161a', transform: 'rotate(14 30.5 22)' });
  add('circle', { cx: '18.4', cy: '22.4', r: '2', fill: '#ffffff' });
  add('circle', { cx: '29.6', cy: '22.4', r: '2', fill: '#ffffff' });
  // Snout.
  add('ellipse', { cx: '24', cy: '30', rx: '2.6', ry: '1.9', fill: '#14161a' });
  // The gold coin it's holding.
  add('circle', { cx: '35', cy: '36', r: '7.5', fill: '#e8a723', stroke: '#a86f0c', 'stroke-width': '1.6' });
  const btc = document.createElementNS(NS, 'text');
  btc.setAttribute('x', '35');
  btc.setAttribute('y', '39.6');
  btc.setAttribute('text-anchor', 'middle');
  btc.setAttribute('font-size', '9');
  btc.setAttribute('font-weight', '700');
  btc.setAttribute('fill', '#7a4e05');
  btc.textContent = '₿';
  svg.appendChild(btc);

  return svg;
}

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
  private readonly audioPromptEl: HTMLDivElement;
  private lastPrice: number | null = null;

  constructor(container: HTMLElement) {
    this.root = el('div', 'hud');
    if (config.transparent) this.root.classList.add('hud--transparent');

    // Top bar
    const topBar = el('div', 'hud__topbar');
    const brand = el('div', 'hud__brand');
    brand.append(el('span', 'hud__brand-icon', '₿'), el('span', 'hud__brand-text', 'Bitcoin Battlefield'));
    if (config.brand) brand.append(buildChannelBadge());
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

    // Browsers refuse to start audio until the page has been clicked. OBS
    // has no such restriction, so this prompt only ever appears when
    // someone opens the file in a normal browser - and it removes itself
    // the moment sound is running.
    this.audioPromptEl = el('div', 'hud__audio-prompt');
    this.audioPromptEl.append(
      el('span', 'hud__audio-prompt-icon', '🔇'),
      el('span', undefined, 'Click anywhere for sound'),
    );
    this.audioPromptEl.hidden = true;

    this.root.append(
      topBar, headerRow, sellWallBox, buyWallBox, depthBox, feedBox,
      this.killfeedEl, this.audioPromptEl,
    );

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

  /** Show or hide the "click for sound" prompt. */
  setAudioBlocked(blocked: boolean): void {
    this.audioPromptEl.hidden = !blocked;
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

  private static readonly FEED_ICONS: Record<FeedEvent['kind'], string> = {
    liquidation: '✖',
    whale: '◆',
    push: '➤',
    wall: '▮',
    status: '•',
  };

  /** Render one battle-log row. Everything that reaches the log - kills,
   * whale prints, ground gained, situation reports - comes through here. */
  pushFeed(event: FeedEvent): void {
    const row = el('div', 'hud__feed-row');
    row.dataset.side = event.side;
    row.dataset.kind = event.kind;
    row.append(
      el('div', 'hud__feed-icon', Hud.FEED_ICONS[event.kind]),
      el('div', 'hud__feed-text', event.text),
      el('div', 'hud__feed-units', event.detail),
    );
    this.feedListEl.prepend(row);
    while (this.feedListEl.children.length > MAX_FEED_ITEMS) {
      this.feedListEl.removeChild(this.feedListEl.lastElementChild as ChildNode);
    }
  }

  pushLiquidation(l: LiquidationEvent, unitsLost: number): void {
    // A liquidated short is a Bear losing their position, and vice versa.
    const losingSide = l.side === 'short' ? 'bears' : 'bulls';
    this.pushFeed({
      id: l.id,
      kind: 'liquidation',
      side: losingSide,
      text: `Liquidated ${l.side} · ${fmtUsd(l.usd)} @ ${l.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      detail: `${losingSide === 'bears' ? 'Bears' : 'Bulls'} -${unitsLost}`,
      time: l.time,
    });

    // Anything above the mega threshold gets the full-screen event banner
    // instead; showing both at once just stacks two announcements.
    if (l.usd >= 75_000 && l.usd < 250_000) {
      this.showKillfeed(
        `${losingSide.toUpperCase()} WIPED · ${fmtUsd(l.usd)} liquidated @ ${fmtPrice(l.price)}`,
        losingSide,
      );
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
  private showKillfeed(text: string, tone: 'bears' | 'bulls' | 'milestone'): void {
    this.killfeedEl.textContent = text;
    this.killfeedEl.dataset.tone = tone;
    this.killfeedEl.classList.remove('show');
    // Force reflow so the animation restarts even for back-to-back events.
    void this.killfeedEl.offsetWidth;
    this.killfeedEl.classList.add('show');
    if (this.killfeedTimer !== null) clearTimeout(this.killfeedTimer);
    this.killfeedTimer = window.setTimeout(() => this.killfeedEl.classList.remove('show'), 3600);
  }
}
