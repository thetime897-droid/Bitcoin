# Panda Investiert – animierte Shorts

Erzeugt 9:16-Shorts (1080×1920, 30 fps) im Comic-Stil mit dem Panda-Maskottchen:
Voice-Over aus dem Originalvideo, Szenen-Illustrationen, Zooms, Shakes, Explosionen,
Charts und Wort-für-Wort-Untertitel.

## Aufbau
- `assets/` – freigestellter Panda (aus `assets/referenzblatt_v2.png`, via `tools/crop_panda.py`)
- `assets_hd/` – 6× hochgerechnete, nachgeschärfte Version für das Video (`tools/hd_panda.py`)
- `engine/engine.js` – Zeichen-Engine (Hintergründe, Panda, Effekte, Requisiten, Untertitel, Kamera)
- `videos/<name>/video.js` – ein Video: Untertitel mit Zeiten + Szenen
- `tools/render.mjs` – rendert Frames in Chromium, mischt Soundeffekte + Voice-Over
- `sfx/lib/` – Soundeffekte (`tools/build_sfx.py`), `sfx/custom/` – eigene Sounds (haben Vorrang), `sfx/uisfx/` – CC0-Quellen
- `CLAUDE.md` – verbindliche Stil- und Schnitt-Vorlage

## Rendern
```
npm install
node tools/render.mjs apple-iphone18 --audio <originalvideo.mp4> --out out/apple.mp4
node tools/render.mjs apple-iphone18 --stills 1,5,10      # nur Standbilder zur Kontrolle
```
