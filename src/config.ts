const params = new URLSearchParams(window.location.search);

function bool(name: string, fallback: boolean): boolean {
  const v = params.get(name);
  if (v === null) return fallback;
  // A bare flag (`?sound`) reads as an empty value; treat it as "on", which
  // is what anyone typing it expects.
  if (v === '') return true;
  return v === '1' || v === 'true' || v === 'yes';
}

/** Runtime configuration, entirely driven by URL query params so the same
 * build can be reused for different OBS scenes without a rebuild. */
export const config = {
  /** Binance symbol to track. */
  symbol: (params.get('symbol') ?? 'BTCUSDT').toUpperCase(),
  /** Human label shown in the HUD, derived from the symbol unless overridden. */
  label: params.get('label') ?? undefined,
  /** Transparent canvas background for compositing as an overlay layer in OBS. */
  transparent: bool('transparent', false),
  /** Enable mouse/keyboard camera control (WASD + drag + scroll). Off by
   * default: a 24/7 unattended stream should never drift because someone's
   * cat walked on the keyboard. */
  interact: bool('interact', false),
  /** Slow autonomous cinematic camera drift when not interacting. */
  cinematic: bool('cinematic', true),
  /** Synthesized sound effects. On by default: a silent stream is the
   * surprising outcome, not a noisy one, and OBS can mute the source
   * anyway. Pass `?sound=0` for a deliberately silent overlay. */
  sound: bool('sound', true),
  /** Subtle day/night tint cycle keyed to real UTC time. */
  dayNight: bool('daynight', false),
  /** Streamer handle / watermark text shown bottom-right. */
  watermark: params.get('watermark') ?? '',
  /** Channel branding shown next to the title. Defaults to the drawn panda
   * mark; `logo` swaps in an image (any URL the page can load, including a
   * local file:// path next to the HTML). */
  brand: params.get('brand') ?? 'Panda_investiert',
  logoUrl: params.get('logo') ?? '',
  /** Target render FPS cap (OBS captures whatever it wants; capping keeps
   * CPU/GPU headroom free for the encoder during long unattended runs). */
  fpsCap: Number(params.get('fps') ?? '60'),
  /** Quality preset affects instance counts / shadow use. */
  quality: (params.get('quality') ?? 'high') as 'low' | 'medium' | 'high',
  /** Supersampling factor. OBS browser sources report a device pixel ratio
   * of 1, so this is the only way to render above the capture resolution
   * and downsample for noticeably cleaner edges. Costs fill rate
   * quadratically - 1.5 is a good quality/cost point on a capable GPU. */
  renderScale: Math.min(Math.max(Number(params.get('scale') ?? '1') || 1, 0.5), 2),

  // --- Chat enlistment ---------------------------------------------------
  /** WebSocket relay pushing chat messages. The scalable option for 24/7 -
   * any bot that can emit `{"author":"name"}` or a bare handle works. */
  chatWsUrl: params.get('chatws') ?? '',
  /** YouTube Data API key and the live video id, for polling chat directly.
   * Simple to set up, but quota-limited - see chat.ts and the README. */
  ytKey: params.get('ytkey') ?? '',
  ytVideoId: params.get('ytvideo') ?? '',
  /** Floor on the YouTube poll interval. The default keeps a full day of
   * polling inside the default 10,000-unit daily API quota. */
  chatPollMs: Math.max(Number(params.get('chatpoll') ?? '45000') || 45_000, 5_000),
};

export const displaySymbol = config.label ?? config.symbol.replace(/USDT?$/, '/USD');
