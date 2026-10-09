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
- 1080×1920, 30 fps. **Ruhiger Schnitt: neue Szene alle ~2,5–5 s** (Nutzer spricht nicht schnell – Feedback v2).
  Inhalte innerhalb einer Szene wechseln weich (Headline tauscht, Elemente blenden/poppen), statt hart zu schneiden.
  Animationen gemächlich: Pop-ins ~0,45 s, sanfter Punch-In, schwacher Blitz, wenig Shake.
- Jede Szene: Comic-Headline oben (Luckiest Guy, weiße/farbige Füllung, dicke schwarze Kontur, leicht schräg),
  Illustration in der Mitte, Panda (freigestellt, Ganzkörper) unten links oder rechts – Panda-Pose zur Stimmung.
- Hintergrund: Sonnenstrahlen + Rasterpunkte. Stimmung = Farbe: `bad` rot (negativ), `good` grün (positiv),
  `neutral` creme, `blue` Info/Quelle, `dark` Spannung/Frage/Tech.
- Kamera: leichter Punch-In bei jedem Schnitt + schwacher Blitz, langsamer Zoom, dezenter Shake nur bei Stempel/Impact.
- Effekte: Pop-ins mit Überschwinger, Explosionen, rote ↓ / grüne ↑ Pfeile, Charts auf Whiteboard, Stempel, Geldregen.
- Untertitel: Montserrat 900, Großbuchstaben, weiß mit schwarzer Kontur bei y≈1470, aktuelles Wort gelb.
- Kein echtes Firmenlogo – Cartoon-Symbole (z. B. Apfel statt Apple-Logo).
- Intro mit LIVE-Balken + Laufband. **Kein Outro/Folgen-Button**: Video endet exakt mit dem Voice-Over (`endFade: false`).
- Politur (ab iran-wahlkampf): `xfade: 0.3` (weiche Szenen-Überblendung), `grain: 0.06` (Filmkorn), `bokeh: true`,
  Headline-Zeilen mit `ribbon: <farbe>` als Banner-Band. Requisiten in `engine/props.js` (`E.P.*`).
- TikTok-Safe-Zone: wichtige Inhalte nicht ganz rechts (Buttons) und nicht unter y≈1600.

## Panda-Qualität
- `assets_hd/` wird mit `python3 tools/hd_panda.py assets assets_hd 6` erzeugt (Entrauschen → Lanczos → kantenmaskierter
  Shock-Filter → Anti-Aliasing). KI-Upscaler-Modelle sind im Netz nicht ladbar, Vektorisierung (vtracer) sah posterisiert aus.
- Beste Qualität: Posen einzeln in hoher Auflösung (≥ 1024 px Höhe) vom Nutzer → in `assets/` ersetzen und neu erzeugen.
- Canvas zeichnet mit `imageSmoothingQuality = 'high'`; Upload-Encode mit ≥ 6,5 Mbit/s (`-tune animation`).

## Sound
- Voice-Over immer klar im Vordergrund; SFX **leise** (MASTER 0.15, Spitzen ≈ -20 dBFS) und **sparsam** – nur Akzente
  an Schlüsselmomenten, kein Dauer-Geklimper. SFX-Bus via `tools/mix_sfx.py` (leichte Zufallsvariation je Einsatz).
- Typen: `whoosh` (nur wenn Szene `whoosh: true` setzt), `pop` (Pop-ins), `ping` (Hinweis/Info), `cash` (Preise, Geld, Umsatz),
  `boom` (Impact/Shake), `stamp` (Stempel, Schloss), `paper` (Zeitung/Report), `down` (negativer Akzent).
- In Szenen: `pops: [t]`, `shake: [t]` (+ `shakeSfx`), `sfx: [[t, 'typ', gain, pan]]` – pan = Position im Bild (-1 links … 1 rechts).
- Sounddesign: `swell` (Rückwärts-Hall) endet auf der Enthüllung; Zähler bekommen `tick`-Folgen, die sich zum Ziel verdichten;
  `horn` für Schiffe; Mix duckt Effekte automatisch unter der Stimme (bis -6 dB) und lässt 2,8 kHz frei.
- Eigene Sounds (z. B. Pixabay) als `sfx/custom/<typ>.mp3` ablegen → ersetzen die eingebauten automatisch.
- `sfx/lib` neu bauen: `python3 tools/build_sfx.py` – organische/weiche CC0-Sounds (`sfx/uisfx`: organic, soft) + natürliche
  Geräusch-Schichten (Münzen, Papier, Thud). Keine synthetischen Ton-Sweeps (klangen dem Nutzer zu generisch).
- Pixabay/Freesound sind im Netz gesperrt → für echte Aufnahmen Nutzer-Uploads in `sfx/custom/` verwenden.
