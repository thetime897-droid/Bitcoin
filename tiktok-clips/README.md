# TikTok-Clips: Retention-Animationen aus einem Skript

Baut animierte Grafik-Clips im Stil des Referenzvideos (dunkle Glas-Panels,
Neon-Glow, hochzählende Zahlen, Crash-Stempel) für **Faceless-Videos**: kein
Greenscreen, keine Facecam – jeder Satz des Skripts bekommt eine vollflächige
Animation. Stil und Regeln: [STYLE.md](STYLE.md).

## Ablauf

1. Du gibst Claude dein Skript.
2. Claude entscheidet nach `STYLE.md`, welche Sätze eine Animation bekommen,
   und schreibt ein Storyboard nach `storyboards/<name>.json`.
3. Claude rendert jede Szene als eigenen Clip nach `out/<name>/`:
   `01-hook.mp4`, `02-flow.mp4`, … plus `_alle_szenen.mp4` zum Durchschauen.
4. Du legst die Clips im Editor an die passenden Stellen (Spalte `script` im
   Storyboard sagt, zu welchem Satz ein Clip gehört).

## Selbst rendern

```bash
cd tiktok-clips
npm install                 # einmalig (Playwright); ffmpeg muss installiert sein
npx playwright install chromium
node render.cjs storyboards/beispiel-ki-blase.json --concat
```

| Option | Wirkung |
|---|---|
| `--alpha` | Transparenter Hintergrund als `.mov` (ProRes 4444) – nur falls du eine Grafik über eigenes Footage legen willst |
| `--only 03,05` | Nur diese Szenen-IDs |
| `--stills` | Nur ein Standbild (PNG) pro Szene – schnelle Kontrolle |
| `--preview` | Erzeugt `out/<name>/preview.html` zum Abspielen/Scrubben im Browser |
| `--concat` | Zusätzlich alle Szenen hintereinander in `_alle_szenen.mp4` |
| `--fps 60` | Andere Bildrate (Standard 30) |

## Storyboard-Format

```jsonc
{
  "name": "mein-video",
  "theme": "dark",          // dark | alarm | light  (pro Szene überschreibbar)
  "layout": "full",         // Standard: Grafik groß & mittig (faceless). "top" nicht verwenden
  "scenes": [
    { "id": "01", "type": "linechart", "title": "Bitcoin Kurs", "pill": "Live · 24h",
      "duration": 4.5, "script": "Der Satz aus dem Skript, zu dem der Clip gehört",
      "params": { ... } }
  ]
}
```

Alle Zeitangaben (`at`, `warnAt`, …) sind Sekunden ab Clip-Beginn.
Firmen/Coins werden über Ticker angegeben (`"META"`, `"BTC"`, `"NVDA"` …; Liste in
`engine/core.js` → `BRANDS`). Eigene: `{ "name": "XYZ", "color": "#ff0", "glyph": "X" }`
oder mit echtem Logo `{ "ticker": "META", "logo": "logos/meta.png" }`.

## Szenentypen

| Typ | Wofür | Wichtige `params` |
|---|---|---|
| `hook` | Alarm-Badge mit pulsierenden Ringen für den Einstieg | `text`, `emoji`, `sub`, `color`, `rings` |
| `statement` | Satz ohne Daten als animierte Schlagworte (füllt jede Lücke) | `text` (`*Wort*` = hervorgehoben), `icon`, `color`, `size`, `stagger`, `stamp` |
| `quote` | Zitat/Post-Karte, Passagen werden nacheinander farbig markiert | `author`, `handle`, `initials`, `text[]` (`*Passage*` = Markierung), `highlightAt[]`, `hlColors`, `meta`, `size` |
| `gauge` | Tacho, Nadel schwingt auf einen Prozentwert | `value` (0–100), `ticker`, `name`, `label`, `sub`, `color`, `at`, `sweepDur` |
| `versus` | Zwei Optionen nebeneinander, Daten fliegen weg (links) bzw. bleiben (rechts) | `left`/`right {title,icon,from,verdict,verdictAt,color,lock,flow:"out"\|"stay"}`, `rightAt` |
| `flow` | Akteure → Ziel, Geld fließt; kippt bei `warnAt` auf Warnung | `sources[]`, `target`, `warnAt`, `color`, `stamp` |
| `linechart` | Kursverlauf, zeichnet sich, Crash-Abschnitt | `ticker`, `header`, `data` (Array oder `{from,to,points,vol,seed}`), `xLabels`, `yLabel`, `unit`, `event{label,at,index}`, `drop{badge,sub,at,data}`, `projection{label,at,strikeAt}` |
| `bars` | Erwartet vs. tatsächlich, A vs. B | `items[{label,value,text,style:"ghost",color,colorAt}]`, `min`, `max`, `unit`, `suffix`, `revealAt`, `stamp{text,at,color}`, `badge{text,at}`, `line{value,label,at}` |
| `series` | Viele Balken über Zeit, ein Ausreißer | `values[]`, `ticker`, `header`, `pill`, `startLabel`, `endLabel`, `highlight{index,color,badge,at}` |
| `cards` | Ticker-Karten mit % (eine reißt andere mit) | `main{ticker,change}`, `items[{ticker,change}]`, `columns` |
| `number` | Riesige Zahl / Kapitelmarke | `value`, `label`, `color`, `size`, `countUp`, `countDur`, `stamp` |
| `tanks` | Reserven/Füllstände, einer läuft leer | `items[{ticker,level}]`, `drain{index,at,badge,level}`, `questionAt` |
| `loop` | Teufelskreis | `nodes[{text,icon}]`, `center`, `speed` |
| `calendar` | Termine | `dates[{month,day,label,logos[],at}]`, `highlightAt` |
| `rule` | „Alte Regel“ bricht | `tag`, `left{label}`, `right{label}`, `breaker`, `activateAt`, `breakAt` |
| `mystery` | 3 ?-Karten (Open Loop), optional Auflösung | `count`, `reveal[{text,icon,ticker,at,color}]` |
| `list` | Aufzählung, Punkte fliegen nacheinander rein | `items[{text,value,color,icon,ticker,at}]` |
| `cta` | Kanal/Produkt mit Lorbeer-Medaille | `brand`, `glyph`, `stats[{value,label}]` |

`stamp` (bei `number`, `statement`, `flow`, `linechart`): `{ "text": "AUSVERKAUFT", "at": 4.9, "color": "red", "size": 64, "y": 700, "rotate": -8 }` –
ein Stempel, der mit Knall reinfliegt.

Beispiele: `storyboards/beispiel-ki-blase.json` (fast jeder Typ) und
`storyboards/ghost-core.json` (Faceless-Short mit Sounds).

## Soundeffekte

Jeder Clip bekommt automatisch passende Sounds, abgestimmt auf die Animation:
Whoosh beim Reinfliegen, Pop bei Logos/Karten, Ticks beim Hochzählen, Stempel-Knall,
Ping bei Highlights, Absturz-Sound + Impact beim Crash, Alarm bei Warnungen usw.

Die Sounds sind **echte Aufnahmen unter CC0** (frei nutzbar, auch kommerziell) aus
`sfx/lib/` – Quellen in [sfx/lib/QUELLEN.md](sfx/lib/QUELLEN.md). Pro Effekt gibt es
mehrere Varianten, die abwechselnd verwendet werden. Alle sind auf gleiche Lautheit
gebracht und werden **bewusst leise** gemischt (Spitzen ca. −15 bis −22 dB), damit
sie unter der Stimme dezent bleiben. Eigene Sounds (z. B. von Pixabay) haben Vorrang:
Datei mit dem Effekt-Namen nach `sfx/` legen, z. B. `sfx/cash.mp3`.

| Name | Klang | Name | Klang |
|---|---|---|---|
| `whoosh` / `whoosh-down` | Luftzug hoch/runter | `impact` | tiefer Boom |
| `pop` | Plopp beim Erscheinen | `stamp` | Stempel-Knall |
| `ping` / `ding` | Glas-Ping / Bestätigungs-Gong | `riser` | Spannungsaufbau, endet auf dem Beat |
| `cash` | Kassenklingeln „Ka-Ching“ | `downer` | fallender Ton (Crash) |
| `coins` | Münzen | `error` / `success` | falsch / richtig |
| `alert` | Alarm | `tick` / `blip` | Klick / Digital-Blip |
| `crack` | Riss/Bruch | `lock` | Schloss rastet ein |
| `shine` | Glitzer | | |

`node sfx.cjs` legt alle Sounds samt Varianten als WAV in `sfx/vorschau/` ab
(zum Anhören oder direkt für CapCut). Im Storyboard pro Szene:

- `"sfx": [{ "name": "cash", "at": 1.4, "gain": 0.8 }]` – zusätzliche Sounds
- `"sfxDefault": false` – eingebaute Sounds der Szene weglassen
- `"sfx": false` – Clip ganz ohne Ton
- `--nosfx` beim Rendern – alle Clips stumm
- `"sfxVolume": 0.5` auf oberster Ebene – Gesamtlautstärke (Standard 0.35 = dezent)

## Ein- und Ausblendung

Jeder Clip blendet sauber ein (Inhalt wird in 0,3 s scharf) und aus (Inhalt zoomt
in 0,4 s weich raus, leiser Whoosh) – der Hintergrund bleibt stehen. So kann jeder
Clip hart in dein Video geschnitten oder mit einer CapCut-Überblendung kombiniert
werden. `"exit": false` an einer Szene lässt das letzte Bild stehen.

## Im Editor (CapCut)

- Voiceover als Tonspur, die MP4-Clips der Reihe nach als einzige Videospur
  darüber (Spalte `script` zeigt, zu welchem Satz ein Clip gehört).
  Clip-Länge bei Bedarf auf die Satzlänge trimmen oder Szene neu mit anderer
  `duration` rendern.
- Untertitel automatisch erzeugen und unter die Grafik setzen
  (≈ 1500–1700 px Höhe) – dort ist in jedem Clip Platz.
