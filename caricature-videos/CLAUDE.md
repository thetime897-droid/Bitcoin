# Panda_investiert Video-Vorlage (vom Nutzer abgenommen – so beibehalten!)

Referenz: `demo/sap_panda_news_FINAL.mp4`, Plan `examples/sap_panda_news.plan.json`,
Engine `toonfin/pandanews.py` + Illustrationen `toonfin/illus.py`.
Render: `python -m toonfin render <plan.json> --out out/<name>.mp4` (60 fps, 1080×1920).

## Ton & Text
- **Immer Originalton und Original-Untertitel aus dem Video des Nutzers.** Untertitel-Wortlaut aus den
  eingebrannten Untertiteln ablesen (Frames croppen), offensichtliche Transkriptionsfehler korrigieren.
- Keine eigene Musik, wenn das Original schon Musik hat.

- **Stimme (abgenommen):** Klang an das SAP-Video angleichen: `tools/voice_match.py in.wav out.wav 6 sap_ref.wav`
  (Referenz = Ton aus dem SAP-Original, warm/dunkel), danach `highpass 75, afftdn nr 6, agate, deesser 0,4,
  Kompressor 2,6:1`. Ohne Referenz: `tools/voice_match.py in.wav out.wav 8` (gleicht das Frequenzbild an eine
  Studio-Sprachkurve an – dumpfe/boxige Handy-/Laptop-Aufnahmen: Tiefmitten bis -12 dB, Präsenz/Luft bis +8 dB),
  dann leicht: `highpass=80, afftdn=nr=6, agate (range 0.25), deesser, Kompressor 1,7:1`.
  **Update (Nutzer: „zu dumpf“):** nach dem SAP-Match heller statt wärmer:
  `highpass 80, afftdn nr 6, agate, EQ -2 dB @300 Hz, +4,5 dB @3 kHz (Q 1,4), treble +3,5 dB @8 kHz, deesser 0,55,
  Kompressor 2,6:1` (Präsenz 2–5 kHz ~3,5 dB über der alten Version). Ersetzt den „wärmer“-Schritt unten.
  Neuer Ton auf fertiges Video: `tools/remix_audio.py plan.json video.mp4 out.mp4 voice.wav` (Bild bleibt).
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
- Keine echten Firmenlogos (Ausnahme seit Nutzerwunsch „wie echt“: im hellen Analyse-Studio das Logo der besprochenen Aktie aus `toonfin/logos/` (simple-icons), redaktionelle Nutzung).
- Kerzen-Charts sind simuliert, solange keine echten Kursdaten verfügbar sind – im Chat so benennen.

## Short-Layout (neu, Nutzerwunsch: rechte TikTok-Spalte freihalten)
- Rechts (x > ~935) liegen bei TikTok Like/Kommentar/Teilen → dort nichts Wichtiges. Inhalte mittig: Mitte x=545,
  Breite ≤ 750 (165–925), y 400–1130. Panda tiefer unten links (`panda_pos` x=175, y=1665, h=540).
  Untertitel darüber mittig-rechts: `layout` cap_x=625, cap_w=600, cap_y=1232, cap_size=66, `cap_chars: 15`;
  `stage` = [150, 395, 935, 1135]. Pillen höchstens bis y=1040. Vorlage: `examples/nu_brasilien_short.plan.json`.

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
- Musik nur auf ausdrücklichen Wunsch (Freistellungsauftrag: Nutzer fand die leise Musik unangenehm → entfernt). `music_bed: {file, rel_db: -17, duck_db: -5}` im Plan: Musik 17 dB unter der Stimme, beim Sprechen weitere 5 dB
  abgesenkt, 0,6 s Fade-in, 2 s Fade-out (kürzere Tracks werden geloopt). Musikdateien nicht ins Repo legen.

## Einblendungen (Overlays) für Facecam-Videos
- `toonfin/inserts.py` + Spec-JSON (Beispiel `examples/european_lithium_inserts.json`). Grafiken im oberen
  Bereich (y ≈ 300–1250), damit TikTok-Buttons, Beschreibung und das Gesicht frei bleiben; feste Bauchbinde
  oben bei y≈205.
- Export immer als `_key.mp4` mit **Magenta-Key** (nicht grün: der Key würde die grünen Grafiken ausstanzen)
  plus `_alpha.webm` mit echter Transparenz. Harte Sticker-Schatten statt weicher, damit der Key sauber bleibt.
- Mit Panda: Karte rechts (x=715, w=610), Panda links (x=185, h=520), keine Überlappung.

## Studio-Stil (3D-Kulissen, sprechender Panda) – Nutzerwunsch nach Referenzvideos
- Engine `toonfin/studio.py` + Software-3D `toonfin/scene3d.py` (Sets: hq, avenue, boardroom, office, studio;
  Kamera fährt pro Shot von `from` nach `to`). Shots ~1–2,5 s, Übergänge `zoom`/`whip`/`cut` mit Whoosh-Varianten.
- Panda in wechselnden Einstellungen (`wide`, `medium`, `close`, `*_left/_right`), **hier mit sprechendem Mund**
  (nur in diesem Stil gewünscht): `toonfin/pandaface.py` malt den gezeichneten Mund jeder Pose weg (Inpainting) und
  zeichnet einen einheitlichen Mund in 5 Öffnungen (gehalten auf 4 Frames, kein Flackern, nie doppelt). Nur Posen in
  `studio.TALK` sprechen (sauber geprüft); `arme_verschraenkt`, `nachdenklich`, `tipp_geben`, `wuetend`,
  `augenzwinkern`, `winken`, `laptop` nicht zum Sprechen verwenden (Reste/Schmierer).
- Zonen (nichts überlappt): Karten y 110–780, kleine Untertitel als Phrase in dunkler Pille bei y≈862 (40 px),
  Panda-Kopf immer unter y≈930. Schilder der 3D-Kulisse per Kamera-Blickrichtung aus der Untertitelzeile halten,
  Panda seitlich stellen, wenn ein Schild in der Mitte steht.
- Kulissen mit Details: `reichstag` (Kuppel, Säulen, Inschrift, Flaggen, Bäume, Laternen), `ministry` (Fensterraster,
  Portal, Schild), `trading` (Monitore mit Krypto-Charts), `avenue` (Bäume, Laternen, Plakat-Text als `set_args`),
  `boardroom` (Screen-Text als `set_args`). Gebäude/Bäume werfen Bodenschatten passend zum Licht.
- Kartentypen zusätzlich: `coins`, `strike`, `reasons`, `vote`, `rule`, `calc`, `warn`.
  Beispiel mit eigener Stimme: `examples/krypto_steuer_studio_spec.py`.
- Glas-Karten mit Farbschimmer drehen sich in 3D rein (`title`, `person`, `news`, `chart`, `kpi`, `quote`, `shrink`,
  `stamp`, `icon`). Kopfzeile „PANDA_INVESTIERT · BÖRSENNEWS datum“, Untertitel Wort für Wort gelb.
- Beispiel: `examples/nvidia_huang_studio_spec.py` → JSON, `python -m toonfin.studio spec.json out.mp4`.

## Vice-City-Stil (GTA-6-artige 3D-Stadt) – Nutzerwunsch
- Set `vicecity` in `toonfin/scene3d.py`: Sonnenuntergangs-Himmel (Verlauf am Horizont), Meer + Strand + Promenade,
  Ocean Drive, Art-déco-Hotels in Pastell mit leuchtenden Neonkanten/Neonschildern (Glow-Pass), Palmen,
  Börsenturm mit LED-Chartwand (x=12.9, y 30–54, z 72–90), Skyline im Dunst, Sportwagen. Warmes Licht/kühle Schatten.
- Eine durchgehende Kamerafahrt `campath` (Keyframes t/pos/target/fov, Hermite mit begrenzten Tangenten – kein
  Durchfliegen von Wänden), leichtes Handkamera-Wackeln `shake`, Bewegungsunschärfe aus der Kamerageschwindigkeit;
  Innenräume per Zoom-Schnitt (`trans: zoom`). Flüge immer erst nach dem Halte-Keyframe starten.
- Panda steht **in der Welt** (`panda.world = [x, z, höhe_m]`, ~2,4 m, Kamera ~6–8 m entfernt), mit Bodenschatten;
  natürliche Bewegung über `body_motion` (Gewichtsverlagerung, Atmen, Nicken beim Sprechen, Füße bleiben stehen).
  Kleidung/Posen unverändert aus `toonfin/panda/`.
- Callout-Karten mit `anchor: [x, y, z]` ziehen eine Linie zu einem Punkt in der 3D-Welt (Aufschlüsselung wie Referenz).
- Whooshs: eigene synthetische Luft-Whooshs `air`, `air_long`, `air_short` (frei, kommerziell nutzbar), an
  Kamera-Keyframes per `whoosh` + `whoosh_at`; Karten kommen mit `air_short` + leisem Pop. Mixkit/Pixabay sind im
  Netzwerk gesperrt (Freigabe vom Nutzer abgelehnt) → eigene Sounds in `toonfin/sfx/custom/` legen, wenn gewünscht.
- Beispiel: `examples/nvidia_comeback_vicecity_spec.py`.

## Helles Studio (aktueller Favorit-Kandidat, Nutzerwunsch nach Referenz „finanzlehre“)
- **Hell, kein Neon.** Set `brightstudio`: weißer, luftiger Raum im Linien-Look (feine graue Kanten, Bodenfliesen,
  Deckenfelder), drei Zonen, durch die die Kamera fließend fliegt (`campath`): A Saal mit großer Leinwand
  (`SCREEN_A`-Ecken) + Stuhlreihen (x=0), B Boardroom (x=+45), C Platinen-/Chip-Wand (x=−45).
- **Einblendungen „wie echt“:** Schlagzeilen ohne Kasten in Bebas Neue (grün/rot/gold) mit grauer Unterzeile
  (`headline`), echte 3D-Icons Microsoft Fluent Emoji 3D (`emoji`, MIT, `toonfin/emoji3d/`), Firmenlogo (`logo`),
  Kurs-Chart-Karte im Referenzstil (`stockchart`). Inhalte können **auf der 3D-Leinwand** liegen (`screen: [4 Ecken]`)
  und bewegen sich dann mit der Kamera.
- **Panda verschwindet bei wichtigen Infos** (`exit_at`, `exit_dir`) und kommt wieder (`enter_at`, `enter_dir`).
- Untertitel: einzelnes gesprochenes Wort, gelb mit dunkler Kontur, direkt über dem Panda-Kopf (`cap_style: word`);
  ohne Panda bei `cap_y`. Kopfzeile hell wie Referenz (`header_style: bar`).
- Beispiel: `examples/nvidia_bright_studio_spec.py`.

## Farbiges Studio v2 (Nutzer-Feedback: Kopfzeile weg, farbenfroh, schneller, nichts überlappt, stärkere Clips)
- **Keine Kopfzeile** (`header_style: none`). ~10 Szenenwechsel in 20 s: Kamerafahrten zwischen den Zonen,
  Farb-Wischer `trans: wipe` (diagonale Bänder Gold/Pink/Blau/Grün, darunter springt die Kamera), Panda raus/rein.
- **Farbe:** eigene Palette `POP` (Grün, Korall-Rot, Gold, Himmelblau, Violett, Pink, Pfirsich, Mint);
  pro Szene farbige Licht-Stimmung `wash: [farbe1, farbe2, stärke]` über dem hellen Set.
- **Clips:** `bigstat` (Farbverlauf-Badge, rollende Zahl, Einrast-Pop, Konfetti, Unter-Chip), `marker`
  (Bebas-Schlagzeile auf farbigem Marker-Balken), `emoji2` (3D-Icon auf Farbscheibe mit Strahlen), `chartclip`
  (Karte mit farbigem Kopf, Logo, leuchtender Linie, Puls-Punkt).
- **Nichts überlappt:** Infos oben (y ~250–1020), Panda-Kopf nie über `min_head` (900); wenn Panda aus dem Bild,
  Untertitel bei `cap_y` (1360). Logo nie hinter dem Panda platzieren.
- Beispiel: `examples/nvidia_color_studio_spec.py` → `demo/nvidia_color_studio_TEST.mp4`.

## News-Studio v3 (aktuell, Nutzer-Feedback: keine Farbschatten, clean, echte Börsen-News-Grafiken, offene 3D-Welt)
- **Keine `wash`-Farbschimmer.** Raum clean hell, Farbe nur als Akzent im Set: schwarze Stühle, schwarze
  Leinwandrahmen.
- **News-Grafiken** (`NEWS` in studio.py): `breaking` (roter Tag + Schlagzeile + Unterzeile, Text-Reveal),
  `ticker` (Logo, Name, Börse, %-Zähler mit Pfeil, Zusatzzeilen), `pricechart` (Achsen, Preis-Labels, Volumen,
  gestrichelte Ereignis-Marker, Last-Price-Tag; als 3D-Leinwand-Inhalt via `screen`), `mcap` (Vergleichsbalken +
  Delta-Pill), `vote` (Abstimmung mit Fortschritt + Haken), `dateblock` (Kalenderblatt + Titel + 3D-Icon).
  Kursverläufe sind Beispieldaten und so beschriftet.
- **Offene 3D-Welt mit Animationen** (`props` pro Shot, pro Frame gebaut): `money` (Geldbündel stapeln sich),
  `gpu` (Grafikkarte zerlegt sich als Explosionszeichnung). Zone D: Straße hinter der Halle (Kran-Fahrt über die Wand).
  Weitere Themen-Props nach gleichem Muster (z. B. Panzer, Auto-Explosionszeichnung) in `scene3d.py` ergänzen.
- Kamera ruhig: `shake: 0`, weiche Ease-Fahrten, Zooms nur mit Grund (Leinwand-Chart, Personen, Zahlen).
- Beispiel: `examples/nvidia_news_studio_spec.py` → `demo/nvidia_news_studio_TEST.mp4`.

## Cinematic Newsroom v4 (aktueller Stand, Nutzer-Brief „nvidia_news_studio verbessern“, dunkel gewünscht)
- Eine Konfigurationsdatei pro Video: `examples/nvidia_cinematic.json` → `python -m toonfin.cine cfg.json out.mp4`
  (`--preview` = 30 fps, `--stills 1,5` = Standbilder). Abschnitte = Kapitel; Kamera-Keys, Karten (`at_word`,
  `until_word`), Props, Stimmung (`mood`/`mood_keys`), `dutch`, `slowmo`, `trans`, Musik-Modus, Cues pro Kapitel.
- Set `newsroom` (scene3d): dunkel, Spiegelboden, Bühne mit Ring + runder Hängelampe (Match-Cut-Ziel), Chart-Wand mit
  Standby-Ticker, Sitzungssaal-Zone (Stuhl-Lichter als Prop `chairlights`), Kapitol-Screen links, Hook-Raum mit GPU
  (grünes Kantenlicht). Props: `gpu`, `columns` (Börsenwert-Säulen), `money`, `chairlights`.
- Panda-Integration (`look.panda_light`): Licht-Angleich, Kantenlicht, Schatten in Lichtrichtung, Kontaktschatten,
  Bodenspiegelung; Blinzeln (nur Posen in `studio.BLINK`, Augen automatisch erkannt).
- Hologramm-Panels im Raum (`holo: [x,y,z]`, `wm`, `yaw`) mit typ-eigenen Auftritten; Kalender reißt ab und fliegt in die
  Kamera. Übergänge `match`, `objwipe`, `whip`, `zoom`. Filmlook (`look.film`), Untertitel `cap_style: lower` (weiß,
  Schlüsselwörter farbig, unteres Drittel über der Safe Zone). Loop-Ende (`loop`) = erstes Bild.
- Sound (`toonfin/cine.py`): Stereo, Stimmkette (Hochpass, Kompressor, De-Esser, kurzer Raum), Musik `score()` mit
  Dur/Moll/Auflösung + Ducking −9 dB, Stille vor Impacts (`silence_gap`), −14 LUFS, True Peak ≤ −1,2 dBTP.
- Chart-Kursverlauf ist Platzhalter-Form (im Config-`_doc` vermerkt), im Video steht kein „Beispielverlauf“.
