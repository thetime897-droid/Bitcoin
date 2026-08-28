import type { SessionStats } from '../data/store';

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

function fmtUsd(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (v: number) => v.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/**
 * Session scoreboard (top left) and next-objective bar (top right).
 *
 * Both exist for retention rather than trading: running totals and a
 * visible target give a viewer who just tuned in something to follow, and
 * give a returning viewer a reason to check back on how the battle went.
 */
export class StatsPanel {
  private readonly bearsLostEl: HTMLDivElement;
  private readonly bullsLostEl: HTMLDivElement;
  private readonly biggestEl: HTMLDivElement;
  private readonly countEl: HTMLDivElement;
  private readonly holdLabelEl: HTMLDivElement;
  private readonly holdTimeEl: HTMLDivElement;

  private readonly objectiveLabelEl: HTMLDivElement;
  private readonly objectiveGapEl: HTMLDivElement;
  private readonly objectiveFillEl: HTMLDivElement;

  private stats: SessionStats | null = null;

  constructor(container: HTMLElement) {
    // --- Scoreboard -------------------------------------------------------
    const board = el('div', 'stats');
    board.append(el('div', 'stats__caption', 'SESSION SCOREBOARD'));

    const grid = el('div', 'stats__grid');
    this.bearsLostEl = el('div', 'stats__value stats__value--bears', '$0');
    this.bullsLostEl = el('div', 'stats__value stats__value--bulls', '$0');
    grid.append(
      this.statCell('BEARS LIQUIDATED', this.bearsLostEl),
      this.statCell('BULLS LIQUIDATED', this.bullsLostEl),
    );
    board.append(grid);

    this.biggestEl = el('div', 'stats__row-value', '—');
    this.countEl = el('div', 'stats__row-value', '0');
    this.holdTimeEl = el('div', 'stats__row-value', '0:00');
    this.holdLabelEl = el('div', 'stats__row-label', 'LINE HELD BY');
    board.append(
      this.statRow(el('div', 'stats__row-label', 'BIGGEST HIT'), this.biggestEl),
      this.statRow(el('div', 'stats__row-label', 'TOTAL KILLS'), this.countEl),
      this.statRow(this.holdLabelEl, this.holdTimeEl),
    );
    container.appendChild(board);

    // --- Next objective ---------------------------------------------------
    const objective = el('div', 'objective');
    objective.append(el('div', 'objective__caption', 'NEXT OBJECTIVE'));
    this.objectiveLabelEl = el('div', 'objective__target', '—');
    this.objectiveGapEl = el('div', 'objective__gap', 'waiting for price…');
    const track = el('div', 'objective__track');
    this.objectiveFillEl = el('div', 'objective__fill');
    track.append(this.objectiveFillEl);
    objective.append(this.objectiveLabelEl, track, this.objectiveGapEl);
    container.appendChild(objective);

    window.setInterval(() => this.tickHold(), 1000);
  }

  private statCell(label: string, valueEl: HTMLElement): HTMLElement {
    const cell = el('div', 'stats__cell');
    cell.append(el('div', 'stats__label', label), valueEl);
    return cell;
  }

  private statRow(labelEl: HTMLElement, valueEl: HTMLElement): HTMLElement {
    const row = el('div', 'stats__row');
    row.append(labelEl, valueEl);
    return row;
  }

  setStats(stats: SessionStats): void {
    this.stats = stats;
    this.bearsLostEl.textContent = fmtUsd(stats.bearsLostUsd);
    this.bullsLostEl.textContent = fmtUsd(stats.bullsLostUsd);
    this.countEl.textContent = stats.liquidationCount.toLocaleString('en-US');

    if (stats.biggestSide) {
      this.biggestEl.textContent = `${fmtUsd(stats.biggestUsd)} · ${stats.biggestSide === 'bears' ? 'Bears' : 'Bulls'}`;
      this.biggestEl.dataset.side = stats.biggestSide;
    }

    const holder =
      stats.holdSide === 'buyers' ? 'BULLS' : stats.holdSide === 'sellers' ? 'BEARS' : 'CONTESTED';
    this.holdLabelEl.textContent = `LINE HELD BY ${holder}`;
    this.tickHold();
  }

  private tickHold(): void {
    if (!this.stats) return;
    this.holdTimeEl.textContent = fmtDuration(Date.now() - this.stats.holdSince);
  }

  /**
   * Progress toward the next round-number price level. Which direction
   * counts as "next" follows the 24h trend, so a falling market shows the
   * level below rather than an unreachable one above.
   */
  setPrice(price: number, changePercent24h: number): void {
    const step = 1000;
    const rising = changePercent24h >= 0;
    const target = rising ? Math.ceil(price / step) * step : Math.floor(price / step) * step;
    const previous = rising ? target - step : target + step;
    const span = Math.abs(target - previous) || step;
    const progress = Math.min(1, Math.max(0, Math.abs(price - previous) / span));
    const gap = Math.abs(target - price);

    this.objectiveLabelEl.textContent = `$${target.toLocaleString('en-US')}`;
    this.objectiveLabelEl.dataset.dir = rising ? 'up' : 'down';
    this.objectiveGapEl.textContent = `${rising ? '▲' : '▼'} $${gap.toLocaleString('en-US', { maximumFractionDigits: 0 })} to go`;
    this.objectiveFillEl.style.width = `${progress * 100}%`;
    this.objectiveFillEl.dataset.dir = rising ? 'up' : 'down';
  }
}
