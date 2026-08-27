# Bitcoin Battlefield — Live

A live, 3D Bitcoin market visualization built to run for hours unattended as
an **OBS Browser Source** on a monetized YouTube livestream. Bears (sellers)
hold the red half of the map, Bulls (buyers) the green half, and the
frontline between them is pushed back and forth by live market pressure.
Their armies grow and shrink with real order-book depth, fight across the
line with tracers, artillery and air support, and take casualties in real
time whenever a leveraged position gets liquidated.

It's inspired by [newhedge.io's Bitcoin Battlefield](https://newhedge.io/bitcoin/battlefield),
rebuilt from scratch and tuned specifically for streaming: a fully
autonomous camera (no interaction required), synthesized sound effects (no
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
- **A frontline you can read at a glance** — the ground is painted with each
  side's colour: Bear red on the left, Bull green on the right, split by a
  glowing boundary. That boundary is physically pushed back and forth by
  market pressure, so whoever is winning is visible without reading a
  single number.
- **Bulls vs. Bears armies** — unit count scales with order-book depth on
  each side. Soldiers and tanks march out from camp, dig in at the line and
  trade tracer fire across it.
- **Artillery, armour and air support** — field guns behind each camp lob
  shells over their own infantry (with recoil and muzzle blast), jets make
  bombing runs the length of the map, and gunships hold station behind the
  line and strafe across it.
- **Live liquidations** — every forced long/short liquidation on Binance
  Futures triggers an explosion + camera shake at the front line, removes
  units from the losing side, and appears in the market feed. Large
  liquidations (≥ $75K) also trigger a big on-screen callout.
- **Milestones** — round-number price crossings and new 24h highs/lows get
  their own callout + chime.

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
| `sound` | `0` | `1` enables synthesized explosion/milestone SFX |
| `transparent` | `0` | `1` renders on a transparent background so you can overlay the scene on top of another source instead of using it full-screen |
| `interact` | `0` | `1` enables mouse-drag/scroll/WASD camera control (for you to line up a shot) — leave this **off** for the actual live source so nothing can accidentally bump the camera during a multi-hour stream |
| `cinematic` | `1` | Slow autonomous camera sway when not interacting |
| `daynight` | `0` | `1` adds a subtle day/night tint cycle keyed to real UTC time |
| `watermark` | *(none)* | Text shown bottom-right, e.g. your channel handle |
| `quality` | `high` | `low` / `medium` / `high` — lower reduces tree/shadow/aircraft counts if you're CPU/GPU constrained while also running an encoder |
| `scale` | `1` | Supersampling factor. OBS browser sources report a device pixel ratio of 1, so `scale=1.5` is the only way to render *above* the capture resolution and downsample for noticeably cleaner edges. Costs fill rate quadratically — try it before committing to it on stream. |
| `fps` | `60` | Internal render FPS cap, independent of OBS's own capture rate |
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
  scene/
    Battlefield.ts     terrain + territory shader, frontline, camps, camera
    Units.ts           instanced armies (soldiers + tanks) and their fire
    Combat.ts          pooled tracers, artillery shells, muzzle flashes
    Emplacements.ts    camp artillery batteries (firing + recoil)
    Aircraft.ts        jet bombing runs and frontline gunships
    Effects.ts         pooled explosion particles + camera shake
    geometry.ts         merged low-poly geometries for instancing
  ui/
    hud.ts             DOM overlay (price, walls, depth chart, feed, kill-feed)
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
