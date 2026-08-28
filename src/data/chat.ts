import { config } from '../config';

export type ChatHandler = (author: string) => void;

/**
 * Feeds viewer handles into the battle so chatters can be enlisted as
 * units. Three independent sources, all optional:
 *
 * 1. `youtube` - polls the YouTube Data API directly. Simplest to set up,
 *    but see the quota note on `pollYouTube` below: the default API quota
 *    cannot sustain fast polling for 24 hours.
 * 2. `websocket` - connects to any bot or relay that pushes chat messages.
 *    This is the option that actually scales to a round-the-clock stream.
 * 3. `manual` - `window.battlefieldEnlist('name')`, always available, for
 *    testing or for a local script driving the page.
 *
 * Handles are sanitised here rather than at the call site: this is the
 * boundary where untrusted text enters the scene.
 */
export class ChatBridge {
  private ws: WebSocket | null = null;
  private wsBackoff = 1000;
  private pollTimer: number | null = null;
  private liveChatId: string | null = null;
  private nextPageToken: string | null = null;
  private stopped = false;

  constructor(private readonly onAuthor: ChatHandler) {}

  start(): void {
    // Always expose the manual hook - it costs nothing and makes the whole
    // feature testable without wiring up a live chat first.
    (window as unknown as { battlefieldEnlist: (n: string) => void }).battlefieldEnlist = (name) => {
      this.emit(name);
    };

    if (config.chatWsUrl) this.connectWebSocket();
    if (config.ytKey && config.ytVideoId) void this.startYouTube();
  }

  stop(): void {
    this.stopped = true;
    this.ws?.close();
    if (this.pollTimer !== null) clearTimeout(this.pollTimer);
  }

  /** Strip anything that would break the label or smuggle markup through. */
  private emit(raw: unknown): void {
    if (typeof raw !== 'string') return;
    const name = raw.replace(/[\u0000-\u001f\u007f<>&"'\\]/g, '').trim().slice(0, 18);
    if (name.length < 2) return;
    this.onAuthor(name);
  }

  // --- WebSocket relay -------------------------------------------------

  private connectWebSocket(): void {
    if (this.stopped) return;
    const ws = new WebSocket(config.chatWsUrl);
    this.ws = ws;

    ws.onopen = () => {
      this.wsBackoff = 1000;
    };
    ws.onmessage = (ev) => {
      // Accept either a bare handle per message or a JSON object with an
      // author field, so most existing bots work without a shim.
      const data = String(ev.data ?? '');
      if (data.startsWith('{')) {
        try {
          const parsed = JSON.parse(data);
          this.emit(parsed.author ?? parsed.user ?? parsed.name ?? parsed.displayName);
          return;
        } catch {
          /* fall through to plain text */
        }
      }
      this.emit(data);
    };
    ws.onerror = () => ws.close();
    ws.onclose = () => {
      if (this.stopped) return;
      window.setTimeout(() => this.connectWebSocket(), this.wsBackoff);
      this.wsBackoff = Math.min(this.wsBackoff * 1.7, 30_000);
    };
  }

  // --- YouTube Data API ------------------------------------------------

  private async startYouTube(): Promise<void> {
    try {
      const url =
        `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails` +
        `&id=${encodeURIComponent(config.ytVideoId)}&key=${encodeURIComponent(config.ytKey)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`videos.list ${res.status}`);
      const json = await res.json();
      const id = json?.items?.[0]?.liveStreamingDetails?.activeLiveChatId;
      if (!id) {
        console.warn('[chat] no active live chat on that video id');
        return;
      }
      this.liveChatId = id;
      void this.pollYouTube();
    } catch (err) {
      console.warn('[chat] youtube setup failed', err);
    }
  }

  /**
   * Quota note, because it decides whether this is usable at all:
   * `liveChatMessages.list` costs 5 units and the default project quota is
   * 10,000 units/day - about 2,000 calls. Polling every 45s fits inside a
   * full 24 hours; anything faster runs dry partway through the day and
   * chat silently stops. Either request a quota increase from Google or
   * use the WebSocket relay instead.
   */
  private async pollYouTube(): Promise<void> {
    if (this.stopped || !this.liveChatId) return;
    let waitMs = config.chatPollMs;
    try {
      const params = new URLSearchParams({
        liveChatId: this.liveChatId,
        part: 'snippet,authorDetails',
        key: config.ytKey,
      });
      if (this.nextPageToken) params.set('pageToken', this.nextPageToken);
      const res = await fetch(`https://www.googleapis.com/youtube/v3/liveChat/messages?${params}`);
      if (!res.ok) throw new Error(`liveChatMessages.list ${res.status}`);
      const json = await res.json();
      this.nextPageToken = json?.nextPageToken ?? null;
      waitMs = Math.max(config.chatPollMs, Number(json?.pollingIntervalMillis) || 0);
      for (const item of json?.items ?? []) {
        this.emit(item?.authorDetails?.displayName);
      }
    } catch (err) {
      console.warn('[chat] youtube poll failed', err);
      // Back off hard on errors so a bad key can't burn the daily quota.
      waitMs = Math.max(waitMs, 60_000);
    }
    this.pollTimer = window.setTimeout(() => void this.pollYouTube(), waitMs);
  }
}
