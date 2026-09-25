# Marktupdate by Panda_investiert - Remotion Vorlage

Markt-Recap im Stil der "Last 24 Hours"-Videos: 3D-Globus mit
Google-Earth-artigen Kamerafluegen, echte Flaggen direkt auf dem Land,
Flugboegen zwischen den Schauplaetzen, gestapelte News-Karten, zaehlende
Kennzahlen, Live-Ticker, Story-Fortschrittsbalken und Follow-Outro.
Keine Captions - die kommen spaeter in TikTok/YouTube dazu.

Zwei Kompositionen aus denselben Daten:

- `Short` - 1080x1920 (9:16, TikTok/Reels/Shorts)
- `Long`  - 1920x1080 (16:9, YouTube)

## 1. Setup (einmalig)

```bash
npm i
```

Voraussetzung: Node.js (nodejs.org). Beim ersten Rendern laedt Remotion
automatisch Chrome Headless und ffmpeg herunter.

## 2. Vorschau

```bash
npx remotion studio
```

Links die Komposition waehlen (`Short` oder `Long`), rechts in der Sidebar
lassen sich alle Texte/Werte live aendern.

## 3. Rendern

```bash
npx remotion render Short out/short.mp4
npx remotion render Long out/long.mp4
```

## 4. Taeglich austauschen: `src/data/episode.ts`

Pro Szene:

```ts
{
  label: "USA · WALL STREET",        // Orts-Chip oben
  countryIso: "840",                 // Flagge auf dem Land + automatische Kamera
  // lonLat: { lon: -79, lat: 38.5 }, // optional: eigener Bildausschnitt
  // zoom: 5.5,                       //   (1 = ganzer Globus)
  region: {                          // optional: wo genau die News herkommt
    stateFips: "24",                 //   US-Bundesstaat (FIPS) wird angehoben
    point: { lon: -76.94, lat: 38.99 }, // Pin (Stadt, Firmensitz, Boerse ...)
    title: "MARYLAND", subtitle: "IonQ · College Park",
    // zoom: 6.5,                     //   eigener Zoom statt Bundesstaat-Rahmung
  },
  // network: true,                   // Krypto: Netzwerk-Boegen zwischen Finanzzentren
  badge: { text: "IONQ", color: "#6f5bd0", kind: "logo" }, // "logo" | "coin" | "icon" (Emoji)
  news: [                            // 1-3 Karten, laufen nacheinander durch
    { outlet: "CNBC", headline: "...", accent: "#005594" },
  ],
  stats: [                           // 0-2 zaehlende Kennzahlen
    { label: "IonQ", value: 12, decimals: 0, suffix: " %", showSign: true,
      direction: "up" /* Pfeil */, tone: "good" /* Farbe: good|bad */ },
  ],
  voiceover: "Dein Sprechtext fuer diese Szene (wird nicht angezeigt).",
  durationInSeconds: 12,
}
```

Dazu pro Folge: `dateLabel`, `ticker` (Laufband oben), `introTitle`
(`MARKT*UPDATE*` - der Teil in Sternchen wird gelb), `introSubtitle`,
`channelName`, `brandLine`, `followLabel`/`followedLabel`.

### Eigenes Logo

Bild (quadratisch, z.B. PNG) als `public/logo.png` ablegen und in
`episode.ts` `logoSrc: "logo.png"` einkommentieren. Ohne Logo wird ein
Panda-Avatar angezeigt.

US-Bundesstaaten-FIPS (Auswahl): 06 Kalifornien, 36 New York, 24 Maryland,
48 Texas, 53 Washington, 25 Massachusetts, 17 Illinois, 13 Georgia, 12 Florida,
11 Washington D.C. (sehr klein - dort lieber nur `point` + `zoom`).

### Sound-Effekte

Liegen in `public/sfx/` und werden automatisch gesetzt (Riser im Intro, Whoosh
bei jedem Kameraflug, Thump beim Flaggen-Drop, Impact beim Hook, Lift + Ding
bei Bundesstaat/Pin, Pops bei Karten/Kennzahlen, Klick + Glitzern beim Folgen).
Neu erzeugen: `python3 scripts/generate-sfx.py`.

`tone: "bad"` fuer Werte, deren Anstieg schlecht ist (Renditen, Oel,
Hypothekenzinsen) - dann rot trotz Pfeil nach oben.

Flaggen sind verfuegbar fuer: US, DE, CN, JP, GB, FR, KR, IN, CH, RU, SA, BR,
CA, TW, IT, ES, NL, AU, MX, AE, IR, IL, UA, TR. Weitere: `scripts/generate-flags.mjs`
(CODES ergaenzen) und `node scripts/generate-flags.mjs` ausfuehren.

## 5. Mit echter Sprachaufnahme

Aktuell sind die Szenenlaengen geschaetzt. Mit deiner Aufnahme werden die
`durationInSeconds` auf die echten Satzgrenzen gesetzt und die Audiospur
eingebunden - Bild und Stimme laufen dann exakt synchron.

## 5b. Satelliten-Globus, Sounds, Musik

- `public/earth.jpg`: NASA Blue Marble + Natural-Earth-Relief (gemeinfrei),
  neu bauen mit `scripts/build-earth-texture.py` (Quelle: `pip download basemap-data`).
- `scripts/generate-sfx.py`: natürlichere Effekte (Rauschen, Raumhall, Holz-/Marimba-Töne), braucht numpy + scipy.
- `scripts/generate-music.py`: eigenes, lizenzfreies News-Bed.
- `scripts/voice-sync.py`: Szenenlängen aus der Sprachaufnahme.

## 6. Aufbau

- `src/timeline.ts` - Szenen-Zeitplan + Kamera (Great-Circle-Fluege mit Rauszoomen, sanftes Nachziehen)
- `src/layout.ts` - Positionen fuer 9:16 und 16:9
- `src/geo/globe.ts` - Kuesten/Grenzen (world-atlas 50m/10m je nach Zoom), US-Bundesstaaten (us-atlas), Landschaftsfarben, Rahmung
- `src/components/RegionMarker.tsx` - Pin mit Beschriftung
- `src/components/EarthCanvas.tsx` - Satellitenbild pixelgenau auf die Kugel projiziert
- `src/components/Globe.tsx` - Grenzen, Wolken, Atmosphaere, Flagge, Flugbogen, Ripple
- `src/components/NewsCard.tsx`, `StatCallout.tsx`, `Badge.tsx`, `Ticker.tsx`,
  `HudChips.tsx`, `StoryProgress.tsx`, `IntroIdent.tsx`, `FollowCta.tsx`, `ChannelBadge.tsx`
- `src/MainVideo.tsx` - setzt alles zusammen
- `src/Root.tsx` - registriert `Short` und `Long`

Hinweis: Firmenlogos sind bewusst generische Ticker-Badges (keine Markenlogos).
Die Mini-Linien in den Kennzahl-Karten sind dekorativ (keine echten Kursverlaeufe).
