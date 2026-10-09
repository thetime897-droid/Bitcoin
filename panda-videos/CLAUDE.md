# Panda Investiert – Video-Vorlage (vom Nutzer abgenommen, so beibehalten!)

Der Schnitt und Stil von `videos/apple-iphone18` ist die **verbindliche Vorlage** für alle weiteren Shorts.
Nicht ohne ausdrücklichen Wunsch ändern.

## Ablauf für ein neues Video
1. Voice-Over: Originalvideo des Nutzers (TikTok-Upload). Transkript + Timing aus den eingebrannten
   Untertiteln ablesen (Frames 4 fps, Untertitelzone croppen) – Whisper-Downloads sind im Netz gesperrt.
2. `videos/<name>/video.js` anlegen (Kopie von apple-iphone18 als Muster): `captions` + `scenes`.
3. Stills prüfen: `node tools/render.mjs <name> --stills 1,5,…` → Kontaktbogen mit `tools/contact.py`.
4. Final: `node tools/render.mjs <name> --audio <original.mp4> --out out/<name>.mp4`.

## Stil-Regeln
- 1080×1920, 30 fps. Neue Szene alle **~1–3 s**, passend zum gesprochenen Satz.
- Jede Szene: Comic-Headline oben (Luckiest Guy, weiße/farbige Füllung, dicke schwarze Kontur, leicht schräg),
  Illustration in der Mitte, Panda (freigestellt, Ganzkörper) unten links oder rechts – Panda-Pose zur Stimmung.
- Hintergrund: Sonnenstrahlen + Rasterpunkte. Stimmung = Farbe: `bad` rot (negativ), `good` grün (positiv),
  `neutral` creme, `blue` Info/Quelle, `dark` Spannung/Frage/Tech.
- Kamera: Punch-In bei jedem Schnitt + weißer Blitz, langsamer Zoom, Shake bei schlechten Nachrichten / Stempeln.
- Effekte: Pop-ins mit Überschwinger, Explosionen, rote ↓ / grüne ↑ Pfeile, Charts auf Whiteboard, Stempel, Geldregen.
- Untertitel: Montserrat 900, Großbuchstaben, weiß mit schwarzer Kontur bei y≈1470, aktuelles Wort gelb.
- Kein echtes Firmenlogo – Cartoon-Symbole (z. B. Apfel statt Apple-Logo).
- Intro mit LIVE-Balken + Laufband, Outro mit „Mehr Börsennews?“ + Folgen-Button.
- TikTok-Safe-Zone: wichtige Inhalte nicht ganz rechts (Buttons) und nicht unter y≈1600.

## Sound
- Voice-Over immer im Vordergrund; SFX-Bus via `tools/mix_sfx.py` (leichte Zufallsvariation je Einsatz).
- Typen: `whoosh` (jeder Schnitt automatisch), `pop` (Pop-ins), `ping` (Hinweis/Info), `cash` (Preise, Geld, Umsatz),
  `boom` (Impact/Shake), `stamp` (Stempel, Schloss), `paper` (Zeitung/Report), `down` (negativer Akzent).
- In Szenen: `pops: [t]`, `shake: [t]` (+ `shakeSfx`), `sfx: [[t, 'typ', gain]]`.
- Eigene Sounds (z. B. Pixabay) als `sfx/custom/<typ>.mp3` ablegen → ersetzen die eingebauten automatisch.
- `sfx/lib` neu bauen: `python3 tools/build_sfx.py` (Synthese + CC0-Schichten aus `sfx/uisfx`).
