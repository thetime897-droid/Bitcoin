import type { MajorEvent } from '../data/store';

/**
 * The screen-stopping layer: a full-width banner plus a coloured screen
 * flash for the handful of moments big enough to interrupt the scene.
 *
 * Deliberately rate-limited and short-lived. On a stream that runs for days
 * the banner only earns its interruption if it stays rare - fire it on
 * every liquidation and viewers stop seeing it at all.
 */
export class EventOverlay {
  private readonly root: HTMLDivElement;
  private readonly flashEl: HTMLDivElement;
  private readonly bannerEl: HTMLDivElement;
  private readonly titleEl: HTMLDivElement;
  private readonly subtitleEl: HTMLDivElement;
  private readonly kickerEl: HTMLDivElement;

  private hideTimer: number | null = null;
  private lastShownAt = 0;
  private lastIntensity = 0;

  /** Minimum gap between banners, unless the new one is clearly bigger. */
  private static readonly MIN_GAP_MS = 6000;
  private static readonly VISIBLE_MS = 4200;

  private static readonly KICKERS: Record<MajorEvent['kind'], string> = {
    'mega-liquidation': 'MASSIVE LIQUIDATION',
    breakout: 'PRICE LEVEL BROKEN',
    breakthrough: 'FRONT LINE COLLAPSES',
    streak: 'KILL STREAK',
  };

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'evt';

    this.flashEl = document.createElement('div');
    this.flashEl.className = 'evt__flash';

    this.bannerEl = document.createElement('div');
    this.bannerEl.className = 'evt__banner';
    this.kickerEl = document.createElement('div');
    this.kickerEl.className = 'evt__kicker';
    this.titleEl = document.createElement('div');
    this.titleEl.className = 'evt__title';
    this.subtitleEl = document.createElement('div');
    this.subtitleEl.className = 'evt__subtitle';
    this.bannerEl.append(this.kickerEl, this.titleEl, this.subtitleEl);

    this.root.append(this.flashEl, this.bannerEl);
    container.appendChild(this.root);
  }

  /** Returns true if the event was actually shown, so the caller knows
   * whether to play the matching sting. */
  show(event: MajorEvent): boolean {
    const now = Date.now();
    const sinceLast = now - this.lastShownAt;
    // A bigger event may cut in early; an equal or smaller one must wait.
    if (sinceLast < EventOverlay.MIN_GAP_MS && event.intensity <= this.lastIntensity) return false;

    this.lastShownAt = now;
    this.lastIntensity = event.intensity;

    this.kickerEl.textContent = EventOverlay.KICKERS[event.kind];
    this.titleEl.textContent = event.title;
    this.subtitleEl.textContent = event.subtitle;
    this.bannerEl.dataset.side = event.side;
    this.flashEl.dataset.side = event.side;

    // Scale the type with the event so a $2M wipe visibly outranks a $250K one.
    this.bannerEl.style.setProperty('--evt-scale', String(0.88 + event.intensity * 0.32));
    this.flashEl.style.setProperty('--evt-flash', String(0.18 + event.intensity * 0.42));

    this.restartAnimation(this.bannerEl, 'is-live');
    this.restartAnimation(this.flashEl, 'is-live');

    if (this.hideTimer !== null) clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(() => {
      this.bannerEl.classList.remove('is-live');
      this.lastIntensity = 0;
    }, EventOverlay.VISIBLE_MS);

    return true;
  }

  /** Re-triggers a CSS animation that may already be running. */
  private restartAnimation(el: HTMLElement, className: string): void {
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
  }
}
