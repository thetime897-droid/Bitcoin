# Aktien-Analyse-Studio (Panda, dunkles 3D-Finanzstudio)

## Neues Video in 4 Schritten
1. `examples/aktienanalyse_nvda.json` kopieren, z. B. nach `examples/aktienanalyse_<ticker>.json`.
2. `ticker`, `name`, `change`, `chips` und die `sections` anpassen: pro Kapitel `text`, `emotion`
   (siehe Tabelle), `zone`, `camera`, `trans`, `mood` und 1–3 `cards`. Mit `at_word` erscheint eine Karte
   genau bei diesem gesprochenen Wort.
3. Eigene Sprachaufnahme als `audio` eintragen (sonst entsteht eine Platzhalter-Stimme). Die Untertitel werden
   aus dem Skript wortgenau auf die Aufnahme gelegt.
4. Vorschau-Standbilder: `python3 -m toonfin.analysis <config> out/x.mp4 --stills 1,8,15` → dann ohne
   `--stills` rendern (1080×1920, 60 fps, H.264, −14 LUFS).

## Aufbau
- `toonfin/tokens.json` – Design-Tokens: Farben (Grün = gut, Rot = schlecht, Gold = Kernaussage,
  Cyan = Info, Hintergrund #0B0F1A), Schrift (Montserrat, 2 Schnitte), Safe Zones (oben 150 px, unten 380 px),
  Timing, Audio (−14 LUFS), Keyword-Farben für die Untertitel und die **Emotions-Tabelle**.
- `toonfin/scene3d.py` → `darkstudio`: glänzender, spiegelnder Boden, Haupt-Chartwand, seitliche
  Kennzahlen-Panels, schwebende Hologramme, Bühne mit Leuchtring, Holo-Detail-Tisch, Lichtleisten, Säulen.
- `toonfin/studio.py`: Renderer (Kamera, Karten, Panda, Übergänge `cut/zoom/whip/leak/glitch`,
  Licht-Stimmung `mood` up/down, Lichtstrahlen + Partikel, Karaoke-Untertitel, Sound-Mix mit Musik-Ducking).
- `toonfin/analysis.py`: Konfiguration → Stimme → Wort-Timing → Shots → Video.

## Emotions-Tabelle (tokens.json → `emotions`)
| Emotion | Pose | spricht | Geste | Kamera | Sound | Licht |
|---|---|---|---|---|---|---|
| schockiert | ueberrascht | nein (Reaktion) | Zusammenzucken | Push-in | Impact | – |
| begeistert | begeistert | nein (Reaktion) | Hüpfer | Push-in | Ping hoch | grün |
| selbstsicher | selbstbewusst | ja | Idle | Dolly | – | – |
| erklaerend | zeigen_tablet | ja | Idle | Orbit | – | – |
| zeigend | zeigen | ja | Nicken | Dolly | – | – |
| skeptisch | selbstbewusst | ja | Kopfschütteln | Pull-back | Ping runter | rot |
| nachdenklich | kaffee | ja | ruhig | Orbit | – | – |
| amuesiert | cool | ja | Nicken | Dolly | – | – |
| erklaerer | zeigestock | ja | Nicken | Dolly | – | – |
| moderator | mikrofon | ja | Idle | Push-in | – | – |
Reaktions-Posen sprechen nicht (ihr gezeichneter Mund passt), danach wechselt `then` in eine Sprech-Pose.

## Karten (1–3 pro Kapitel)
`kpi` (Zähler mit Einrast-Highlight), `logo` (Ticker-Monogramm als Hologramm – echte Logos sind Marken und
werden nicht geladen), `candles` (Kerzen mit Markern), `versus` (A vs. B), `metrics` (2–3 Kennzahlen),
`title`, `news`, `warn`, `reasons`, `chart`, `quote`, `calc` …

## Sound-Cues (alle selbst erzeugt oder CC0, siehe `toonfin/sfx/SOURCES.md`)
`riser2` (Hook), `impact` (Schock/Schlüsselmoment), `ping_up` (positiv, hell, steigend), `ping_down`
(negativ, dumpf, fallend), `click` (Zahlen/Logo), `air` / `air_short` / `air_long` (Kamerafahrten,
Übergänge), Musikbett (Am–F–C–G, 96 BPM, Pad/Bass/Kick/Hats) mit Ducking unter der Stimme und
Intensität pro Kapitel. Die Cue-Liste steht im erzeugten `spec.json` (`cues`).

## Daten
Zahlen kommen aus der Konfiguration. Kursverläufe sind Beispieldaten, solange keine Kursquelle angebunden ist,
und werden im Video als „Beispielverlauf“ gekennzeichnet. Keine erfundenen echten Kurse.
