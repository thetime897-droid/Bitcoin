# Bitcoin Battlefield — Live

A live, 3D Bitcoin market visualization built to run for hours unattended as
an **OBS Browser Source** on a monetized YouTube livestream. Bears (sellers)
hold the red half of the map, Bulls (buyers) the green half, and the
frontline between them is pushed back and forth by live market pressure.
Their armies grow and shrink with real order-book depth, fight across the
line with tracers, artillery and air support, and take casualties in real
time whenever a leveraged position gets liquidated.

It's inspired by [newhedge.io's Bitcoin Battlefield](https://newhedge.io/bitcoin/battlefield),
rebuilt from scratch and tuned specifically for streaming: a slow
autonomous camera that holds a steady side-on framing (no interaction
required), synthesized sound effects (no
licensing headaches), automatic WebSocket reconnects so a dropped
connection never freezes the stream, and a "kill-feed" style callout for
big liquidations and price milestones to keep viewers engaged.

## What it shows

- **Live BTC/USD price**, 24h change, and a UTC clock (top center).
- **Market pressure** — buyers vs. sellers, derived from order-book
  imbalance *and* recent taker trade flow, not price alone.
- **Sell Wall / Buy Wall** — live USD depth on each side (top corners).
- **Order book depth chart** (bottom-left) — the classic bid/ask "valley"
  chart, mirrored from the same data driving the 3D scene.
- **Two fortified camps** — walled compounds with an HQ, hangar, vehicle
  park, tents and corner blockhouses, fronted by a battlemented stone
  tower flying the side's colours. Each side's emblem - a horned bull for
  the Bulls, a bear's head for the Bears - is drawn procedurally onto both
  the tower flag and the camp wordmark, so nothing has to be fetched at
  runtime. A cut trench with a spoil berm runs in front of each tower,
  holding a forward gun battery that fires flat and fast at whatever is
  pressing the boundary, while the rear battery lobs shells high over the
  camp.
- **A frontline you can read at a glance** — the ground is painted with each
  side's colour: Bear red on the left, Bull green on the right, split by a
  glowing boundary. That boundary is physically pushed back and forth by
  market pressure, so whoever is winning is visible without reading a
  single number.
- **Bulls vs. Bears armies** — unit count scales with order-book depth on
  each side - well over a hundred per army at full depth. Rather than each
  class forming its own tidy rank, units are handed out round-robin into
  sixteen combined-arms squads, so a group is riflemen up front with an
  APC and usually a tank supporting from behind. Squads move and fight as
  groups, each on its own clock, switching between pushing right up to the
  boundary, holding the firing line, and pulling into the rear - which is
  what produces clumps and gaps along the front instead of an evenly
  spaced line. Within a squad every member has its own speed, so a group
  stretches out on the move and bunches up again when it arrives, and
  around one unit in six fights alone to fill the gaps between groups.
  Units turn to face where they're going and back toward the enemy on
  arrival, and anything within range of the line is firing. A post is
  measured back from the frontline rather than stored as a fixed
  coordinate, so the whole army advances or falls back as the line moves,
  and nobody can cross onto enemy ground. A destroyed unit leaves a burnt
  hull smoking on the spot and stays gone for several seconds before a
  replacement rolls out of the camp and drives back up to the front, so
  losses read as losses instead of blinking straight back.
- **Artillery, armour and air support** — field guns behind each camp lob
  shells over their own infantry (with recoil and muzzle blast). Jets fly
  real attack profiles: cruising in high, nosing down onto the target,
  releasing a stick of three to five bombs across the line, then climbing
  out with the burner lit. Their pitch and bank are derived from actual
  climb and turn rate rather than a canned animation. Bombs are released
  rather than launched - they keep the jet's forward speed while the drop
  accelerates, so they pitch over steeply and land well ahead of the drop
  point. Gunships work the line from behind their own front, shifting
  station constantly and tipping into each move the way a helicopter does.
- **Live liquidations** — every forced long/short liquidation on Binance
  Futures triggers an explosion at the front line: a fireball that cools
  from white through orange to embers, tumbling debris that bounces once
  and settles, an expanding ground shockwave, a rising smoke column and a
  scorch mark burned into the terrain. It also shakes the camera, removes
  units from the losing side, and appears in the market feed. Large
  liquidations (≥ $75K) also trigger a big on-screen callout.
- **Milestones** — round-number price crossings and new 24h highs/lows get
  their own callout + chime.
- **Session scoreboard** (top left) — running liquidation totals per side,
  biggest hit of the session, total kills, and how long the current side
  has held the line.
- **Next objective** (top right) — a progress bar toward the next round
  price level, with the distance still to go.
- **Major event banners** — a full-width announcement plus a coloured
  screen flash for the moments that actually deserve interrupting the
  scene: a $250K+ liquidation, a price level breaking, one side overrunning
  the line, or a run of kills against the same side. Deliberately
  rate-limited: fire these on every liquidation and viewers stop seeing
  them.

## Sound

All audio is **synthesized in the browser with the Web Audio API** - there
are no audio files, so there is nothing to license and nothing that can
trip a Content ID claim on a monetized channel.

**Sound is on by default** - there is no parameter to add. Pass `?sound=0`
if you deliberately want a silent overlay.

One quirk worth knowing: a normal browser refuses to start audio until the
page has been clicked, so opening the file by double-clicking shows a
"Click anywhere for sound" prompt at the bottom until you click once. OBS'
browser source has no such restriction, so the prompt never appears there
and audio starts on its own.

What you get: a low ambient battlefield bed that swells with how many units
are engaged, explosion booms scaled to the size of the liquidation, a
riser-and-impact sting under event banners, a klaxon on the biggest events,
milestone chimes and a soft blip on whale prints.

**Verifying it works.** Browsers give no way to confirm sound reached the
speakers, so the engine taps its own output. Open the page with
`?sound=1&debug=1` and run in the console:

```js
window.battlefieldDebug.testSound();
window.battlefieldDebug.audioStatus();
```

`state` must read `running` - a `suspended` context means the browser is
still waiting for a click - and `peak` must rise above zero while something
is firing. Measured in headless Chromium:

| Situation | Result |
|---|---|
| Opened by hand, before clicking | `state: "suspended"`, prompt shown |
| After one click | peak `0.075`, prompt gone |
| Launched the way OBS runs its browser source (no gesture available) | peak `0.038`, prompt never shown |
| `?sound=0` | `state: "disabled"`, peak `0` |

If OBS is silent despite `state: running`, the problem is downstream: check
that the Browser Source is not muted in the Audio Mixer, and tick
**"Control audio via OBS"** in the source properties so it is routed
through the mixer at all.

## Enlisting chat viewers

Viewers who write in chat get their own soldier or vehicle, with their
handle floating above it in a colour derived from the name (stable, so
they look the same every time) on a chip edged in their army's colour.
They're split evenly between Bears and Bulls, they join the battle log
when they enlist, and they get their own line when their unit is killed.
Up to 46 handles are shown at once; past that the field becomes a wall of
text and nobody's name is readable.

**The page cannot read YouTube chat on its own** - that needs the YouTube
Data API. Three ways to feed it, in order of how well they hold up:

**1. A bot or relay over WebSocket** (recommended for 24/7)

```
?chatws=ws://localhost:8080
```

Anything that pushes one message per chat line works: either a bare handle
as text, or JSON with an `author`, `user`, `name` or `displayName` field.
Reconnects on its own with backoff. This is the option that survives a
round-the-clock stream.

**2. The YouTube Data API directly**

```
?ytkey=YOUR_API_KEY&ytvideo=YOUR_LIVE_VIDEO_ID
```

Simplest to set up, but **read the quota maths before relying on it**:
`liveChatMessages.list` costs 5 quota units per call and a default Google
Cloud project gets 10,000 units per day - about 2,000 calls. That is one
call every ~45 seconds for a full 24 hours, which is why `chatpoll`
defaults to 45000 ms. Poll faster and chat silently stops partway through
the day when the quota runs dry. For anything quicker you need a quota
increase from Google, or the WebSocket relay above. Note also that the key
sits in the URL, so treat that file as private and restrict the key to the
YouTube Data API in the Cloud console.

**3. Manually, from a script or the console**

```js
window.battlefieldEnlist('SomeViewer');
```

Always available. Useful for testing, or for a local script driving the
page from any chat source you like.

### Why those elements

The retention research on always-on streams is fairly consistent: what
holds a passive viewer is a mix of **milestone alerts**, **visible goals
and progress**, and **running totals they can check back on** - concrete
things happening on a predictable rhythm, rather than a scene that merely
moves. The scoreboard, objective bar, event banners and the continuously
updating battle log all exist for that, not for trading utility. Sources:
[getrektlabs on alerts & widgets](https://getrektlabs.com/blogs/news/why-alerts-widgets-matter-increase-viewer-interaction-retention-and-support),
[rave-tech on overlays & engagement](https://rave-tech.com/stream-overlays-101-how-to-boost-engagement-with-custom-alerts-widgets/),
[EnosTech on 24/7 watch time](https://www.enostech.com/how-24-7-live-streams-boost-viewer-engagement-and-watch-time-on-youtube/).

## Quick start (no coding, no server)

The build produces a **single self-contained `dist/index.html`** file - all
JS/CSS inlined, nothing else to host. You can just:

1. Double-click it to open in a browser and see it working, or
2. In OBS: **Add Source → Browser → Local File**, and point it at that
   `index.html` on disk.

No `localhost`, no server, no npm needed day-to-day - only the WebSocket
connection to Binance requires internet. Re-run `npm run build` (see below)
any time you change something and it regenerates that one file.

## Data source

Everything is fetched **client-side, directly from Binance's public
WebSocket API** — no backend server, no API key, nothing to host except the
static files themselves:

- `btcusdt@ticker` — live price / 24h stats
- `btcusdt@depth20@1000ms` — top-20 order book (buy/sell wall)
- `btcusdt@aggTrade` — trade flow (for market pressure)
- Binance USD-M Futures `btcusdt@forceOrder` — liquidation events

Because it's single-exchange (Binance spot + Binance futures), the wall
totals and liquidation feed will differ slightly from any multi-exchange
aggregator — that's expected and disclosed in the UI ("Binance spot").

## Building it (only needed if you change something)

```bash
npm install
npm run build
```

That regenerates the single `dist/index.html` described above. For local
development with hot reload while editing: `npm run dev`.

### Alternative: hosting it instead of using a local file

You don't need this for normal use, but if you stream from more than one
machine it can be more convenient to host `dist/index.html` somewhere and
point OBS at a URL instead of a local path — any static host works
(Vercel/Netlify/Cloudflare Pages/GitHub Pages), or run it locally with
`npm run preview -- --port 4173` and add `http://localhost:4173` as the
Browser Source URL. Since it's one static file, there's no backend to keep
running either way.

## OBS Browser Source setup

1. Add **Browser Source**. Either check **"Local file"** and pick
   `index.html` on disk, or (if you want query parameters, see below) leave
   it unchecked and paste the full path into the URL field as
   `file:///C:/path/to/index.html?sound=1&watermark=%40YourChannel` (Windows)
   or `file:///Users/you/path/index.html?sound=1` (macOS/Linux) — OBS's URL
   field accepts `file://` URLs directly, and that's the only way to pass
   query parameters to a local file since the "Local file" picker doesn't
   have a field for them.
2. Resolution: **1920×1080** (or match your canvas), FPS: 30 is plenty.
3. **Uncheck** "Shutdown source when not visible" — you want the WebSocket
   connections and army positions to keep updating even while you're on
   another scene, so it's still live the moment you switch back.
4. **Uncheck** "Refresh browser when scene becomes active" for the same
   reason — a refresh would drop and re-establish all the WebSocket
   connections and reset the armies every time you switch scenes.
5. If you enable sound (`?sound=1`, see below), check **"Control audio via
   OBS"** so it's mixed like any other audio source instead of relying on
   browser autoplay.

## URL query parameters

The same build adapts to different scenes/setups without a rebuild:

| Param | Default | Effect |
|---|---|---|
| `symbol` | `BTCUSDT` | Any Binance spot+futures symbol, e.g. `ETHUSDT` |
| `label` | derived from symbol | Override the display label (e.g. `ETH/USD`) |
| `sound` | `1` | On by default. `0` silences the synthesized soundtrack: a low ambient battle bed that swells with how many units are engaged, explosion booms, milestone chimes, a riser-and-impact sting under event banners, and a klaxon on the very biggest events |
| `transparent` | `0` | `1` renders on a transparent background so you can overlay the scene on top of another source instead of using it full-screen |
| `interact` | `0` | `1` enables mouse-drag/scroll/WASD camera control (for you to line up a shot) — leave this **off** for the actual live source so nothing can accidentally bump the camera during a multi-hour stream |
| `cinematic` | `1` | Slow autonomous camera sway when not interacting |
| `daynight` | `0` | `1` adds a subtle day/night tint cycle keyed to real UTC time |
| `watermark` | *(none)* | Text shown bottom-right, e.g. your channel handle |
| `brand` | `Panda_investiert` | Channel name in the badge beside the title. Empty string hides the badge |
| `logo` | *(drawn panda)* | Image for the badge instead of the built-in drawn mark. Any URL the page can load, including a `file:///` path to a PNG sitting next to the HTML. Falls back to the drawn mark if it can't load |
| `quality` | `high` | `low` / `medium` / `high` — lower reduces tree/shadow/aircraft counts if you're CPU/GPU constrained while also running an encoder |
| `scale` | `1` | Supersampling factor. OBS browser sources report a device pixel ratio of 1, so `scale=1.5` is the only way to render *above* the capture resolution and downsample for noticeably cleaner edges. Costs fill rate quadratically — try it before committing to it on stream. |
| `fps` | `60` | Internal render FPS cap, independent of OBS's own capture rate |
| `chatws` | *(none)* | WebSocket relay pushing chat handles - see **Enlisting chat viewers** |
| `ytkey` / `ytvideo` | *(none)* | YouTube Data API key + live video id, to poll chat directly (quota-limited) |
| `chatpoll` | `45000` | Floor on the YouTube poll interval in ms. The default is what keeps a full day inside the default API quota |
| `debug` | `0` | `1` exposes `window.battlefieldDebug` in the browser console (`demoTicker()`, `demoLiquidation()`) to sanity-check the scene without waiting on real market data |

Example for a transparent overlay with your handle and sound on:

```
http://localhost:4173/?transparent=1&sound=1&watermark=%40YourChannel
```

## Architecture

Everything is plain TypeScript + [three.js](https://threejs.org), bundled
with Vite — no framework, no backend:

```
src/
  config.ts          query-param configuration
  audio.ts            synthesized WebAudio sound effects
  data/
    types.ts          shared data types
    BinanceFeed.ts     WebSocket connections + auto-reconnect + staleness watchdog
    store.ts           single reactive store (pressure/derived state, pub-sub)
    chat.ts            viewer enlistment from YouTube / a relay / manual calls
  scene/
    Battlefield.ts     terrain + territory shader, frontline, camps, camera
    Units.ts           instanced armies, autonomous movement and their fire
    Combat.ts          pooled tracers, artillery shells, muzzle flashes
    Emplacements.ts    camp artillery batteries (firing + recoil)
    Aircraft.ts        jet bombing runs and frontline gunships
    Nametags.ts        floating handles above enlisted viewers' units
    Effects.ts         pooled explosion particles + camera shake
    geometry.ts         merged low-poly geometries for instancing
  ui/
    hud.ts             DOM overlay (price, walls, depth chart, battle log)
    StatsPanel.ts      session scoreboard + next-objective bar
    EventOverlay.ts    full-width banners + screen flash for major moments
  main.ts              wires data -> store -> scene/HUD, render loop
```

Design choices worth knowing about if you extend this:

- **No external asset downloads.** Terrain, trees, tanks, soldiers, the
  road texture and all sound are procedurally generated. Nothing to fetch
  at runtime beyond the Binance WebSocket data itself, so a flaky CDN can
  never break your live source.
- **Object pooling everywhere that runs continuously** (units, explosion
  particles) — a multi-hour stream must not leak memory or accumulate
  draw calls.
- **The camera never requires interaction.** OBS Browser Sources don't
  receive keyboard/mouse input unless you tick "Interact", which you won't
  be doing mid-stream — so the default camera is a slow autonomous sway,
  not the reference site's WASD fly-cam (`?interact=1` brings that back for
  setting up a shot beforehand).

## Disclaimer

This is a data visualization for entertainment purposes, not financial
advice. Wall sizes and liquidation data reflect Binance only and can differ
from other exchanges or aggregators.
