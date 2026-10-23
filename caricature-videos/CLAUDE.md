# Panda_investiert Video-Vorlage (vom Nutzer abgenommen – so beibehalten!)

Referenz: `demo/sap_panda_news_FINAL.mp4`, Plan `examples/sap_panda_news.plan.json`,
Engine `toonfin/pandanews.py` + Illustrationen `toonfin/illus.py`.
Render: `python -m toonfin render <plan.json> --out out/<name>.mp4` (60 fps, 1080×1920).

## Ton & Text
- **Immer Originalton und Original-Untertitel aus dem Video des Nutzers.** Untertitel-Wortlaut aus den
  eingebrannten Untertiteln ablesen (Frames croppen), offensichtliche Transkriptionsfehler korrigieren.
- Keine eigene Musik, wenn das Original schon Musik hat.

- **Stimme:** Erst Klang-Korrektur mit `tools/voice_match.py in.wav out.wav 8` (gleicht das Frequenzbild an eine
  Studio-Sprachkurve an – dumpfe/boxige Handy-/Laptop-Aufnahmen: Tiefmitten bis -12 dB, Präsenz/Luft bis +8 dB),
  dann leicht: `highpass=80, afftdn=nr=6, agate (range 0.25), deesser, Kompressor 1,7:1`.
  **Nie mehrfach komprimieren/limiten.** Mastering linear, `master_lufs: -16.8` (abgenommen: Stimme nicht zu laut). Nach dem Match-EQ leicht
  wärmer: `lowshelf +1,2 dB @150 Hz`, `-1,2 dB @3,6 kHz`, De-Esser 0,6.
- Effekte: jeder Sound wird auf seinen lautesten Moment eingepegelt (gleich laut wirkend), `SFX_TRIM` setzt
  Riser (0.6), Kasse, Schimmer tiefer.

## Look
- **Hintergrund immer weiß.** Farbe nur in Grafiken/Animationen (Akzentstreifen, Funken, Pillen).
- Jede Seite kommt gefüllt rein und schiebt die alte weg (seitlich, abwechselnd links/rechts,
  Bewegungsunschärfe). Elemente gleiten weich ein (`at`) und fliegen nach links raus (`until`).
- **Bild nie leer, nie überladen:** pro Seite eine große Illustration (`illus`) ODER ein
  professioneller Chart/Karte, plus Headline oben. Grafiken in guter Größe (~650–700 px breit).
- **Nichts darf in die Headline laufen** (Illustrationen werden unter y=400 abgeschnitten) und
  nichts in andere Grafiken (z. B. Haken neben den Chart, nicht hinein).
- Mischung aus **richtig professionell** (Kerzen-Charts `candles`, Balken `bars` in **einheitlicher
  Farbe**, KPI-Karten mit Zähler, Spannen, Laufband `tape`, Info-Karten `info`) und **coolen
  Illustrationen mit Motion Graphics** (Geldberg wächst + Pokal, Grabstein bricht auf, Geld-Regen in
  Eimer, Stapel wächst, Tacho-Zeiger, Kalender wird eingekreist, Rakete …).
- Themenbezogene Illustrationen nutzen bzw. ergänzen: Autos `car`, Raketen `rocket`, Panzer/Rüstung
  `tank`, News `newspaper` / `phone`, Rekord `trophy`, Warnung `warning`, Analyse `magnifier`,
  Prognose `gauge`, Termin `calendar`, Problem `hook`, Totgesagt `tombstone`, Wachstum `stack`/`cloud`.
  Fehlt ein Motiv, eine neue Funktion in `toonfin/illus.py` im gleichen Stil anlegen.
- Keine echten Firmenlogos.
- Kerzen-Charts sind simuliert, solange keine echten Kursdaten verfügbar sind – im Chat so benennen.

## Panda
- Nur die sauberen HQ-Posen aus `toonfin/panda/` (Real-ESRGAN, `tools/esrgan_np.py`). Keine runden
  Panda-Einblendungen, immer genau ein Panda, fest auf seiner Position (`panda_pos`), keine
  Mundbewegung. Posenwechsel per Squash + kleinem Hüpfer, Pose passend zur Aussage.

## Sound (ausgewogen, kein „Sound-Engineering“)
- Ein einheitlicher Whoosh bei Seitenwechsel und großen Einflügen, Pop bei Zahlen/Plaketten,
  Registrierkasse bei Geldbeträgen, Einzel-Akzente nur wo es passt (Riss, Schimmer, Glocke, Riser im
  Hook). Mindestabstände in `MIN_GAP`. Kein Klicken, Ticken, dumpfes Bumm.
- Eigene Sounds (z. B. Pixabay) in `toonfin/sfx/custom/` ersetzen die eingebauten.

## Einstieg
- Erste Sekunden sofort packend: `breaking`-Motion-Graphic (rote/schwarze Bänder, Titel, Warnlichter),
  dann fliegt der Chart rein und zeichnet sich live; Laufband oben, Riser zur Enthüllung.
- Gestapelte Illustrationen (z. B. `stack`) so niedrig halten, dass sie nie in die Headline wachsen.

## Longform 16:9 (1920×1080)
- Aus dem fertigen Short-Plan erzeugen: `python3 tools/to_longform.py short.plan.json long.plan.json`,
  dann rendern. Referenz: `demo/sap_panda_news_LONGFORM.mp4`.
- Panda groß links (`panda_pos` x=330, y=1050, h=700), Inhaltsbereich rechts (Mitte x≈1270,
  y≈340–950), Headline mittig über dem Inhalt (y≈138), Untertitel einzeilig bei y≈1018.
- Charts/Karten breit (Kerzen 1180 px, Balken/Linien 1000 px), Illustrationen ~0,93×; gleichzeitig
  sichtbare Elemente nebeneinander statt untereinander. Nichts überlappt, nichts am Rand abgeschnitten,
  nichts läuft in Headline oder Untertitel (hohe Motive wie `cloud` kleiner skalieren).

## Transkription ohne eingebrannte Untertitel
- Whisper „small“ (CTranslate2/int8) liegt auf npm in 4 Teilen: `@skillninja/shortmovie-telop-model-p0…p3`
  (MIT). Teile zusammenfügen (`model.bin.part0-3` → `model.bin`, SHA256 in `model.sha256`), dann
  faster-whisper mit `language="de"`, `word_timestamps=True`; Audio vorher selbst dekodieren (numpy, 16 kHz).
  Erkennungsfehler (Fachbegriffe, Zahlen) von Hand korrigieren.

## Zooms & Effekt-Lautstärke
- `zooms: [{at, hold, scale, x, y}]` im Plan: Punch-in nur auf die Grafik, automatisch so begrenzt, dass der
  vergrößerte Inhalt in der freien Bühne bleibt (`stage` = [455, 400, 1066, 1465]: nie in Panda, Headline, Untertitel) (Headline, Panda, Untertitel bleiben
  ruhig), mit Whoosh rein und raus. Für wichtige Stellen, Skala 1,18–1,3.
- `sfx_rel: 0.665` (aktuell abgenommen) = Effekte ~33 % unter der Stimme; 0.75 = 25 % darunter (relativ zur Stimm-Lautheit, `gain` trimmt nur nach unten).

## Musik
- `music_bed: {file, rel_db: -17, duck_db: -5}` im Plan: Musik 17 dB unter der Stimme, beim Sprechen weitere 5 dB
  abgesenkt, 0,6 s Fade-in, 2 s Fade-out (kürzere Tracks werden geloopt). Musikdateien nicht ins Repo legen.
