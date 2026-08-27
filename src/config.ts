const params = new URLSearchParams(window.location.search);

function bool(name: string, fallback: boolean): boolean {
  const v = params.get(name);
  if (v === null) return fallback;
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
  /** Synthesized sound effects (explosions, milestones). Muted by default -
   * enable per-source in OBS via "Control audio via OBS" and this flag. */
  sound: bool('sound', false),
  /** Subtle day/night tint cycle keyed to real UTC time. */
  dayNight: bool('daynight', false),
  /** Streamer handle / watermark text shown bottom-right. */
  watermark: params.get('watermark') ?? '',
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
};

export const displaySymbol = config.label ?? config.symbol.replace(/USDT?$/, '/USD');
