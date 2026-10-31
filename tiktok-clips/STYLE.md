# Stil-Vorlage: Retention-Animationen für TikTok

Abgeleitet aus dem Referenzvideo (136 s, Finanz-Erklärvideo „AI Bubble Pop
Signal“). Diese Datei ist die verbindliche Vorlage: **jedes neue Skript wird
nach diesen Regeln in Animations-Clips übersetzt.**

> **WICHTIGSTE REGEL: Faceless-Content.** Der Nutzer ist nie im Bild – kein
> Greenscreen, keine Facecam, kein freigestellter Sprecher. Aus dem
> Referenzvideo werden nur Animationsstil und Tempo übernommen, nicht der
> Sprecher. Daraus folgt:
> - Layout ist immer `full` (Grafik groß und mittig), nie Platz für eine Person.
> - **Jeder Satz bekommt eine Grafik** – 100 % Animationsanteil. Stellen, an denen
>   im Original die Facecam lief (Hook, Übergänge, Meinung), werden mit `hook`
>   bzw. `statement` (animierte Schlagworte) gefüllt.
> - Keine Alpha-Overlays „über die Facecam“; alle Clips sind vollflächig.

## 1. Was das Referenzvideo macht

| Merkmal | Beobachtung |
|---|---|
| Format | 9:16. Im Original: Grafik oben, Sprecher unten. **Für uns (faceless): Grafik groß in der Mitte, Untertitel darunter** |
| Takt | Ca. **45 Animations-Beats in 136 s** → alle **2–3 s** passiert etwas Neues. Ein Bild steht nie länger als ~3 s still |
| Facecam-Anteil | Im Original ca. 15 % Facecam. **Bei uns 0 %** – diese Stellen werden zu `statement`-/`hook`-Clips |
| Titel | Immer oben mittig, **GROSSBUCHSTABEN**, fett, weiß, mit kurzer leuchtender Akzentlinie darunter. Optional eine Pille („● EARNINGS · OCT 28–29“) |
| Szenen-Aufbau | Eine Szene bleibt über mehrere Sätze stehen und **baut sich pro Satz weiter auf** (Logos → Leitungen → Geldfluss → Warnung). Nicht jeder Satz bekommt eine neue Grafik, aber jeder Satz verändert etwas |
| Farben | Dunkel (fast schwarz, Navy-Glow) als Standard. **Rot** wird zur Stimmung, wenn es um Verlust/Gefahr geht (ganzer Hintergrund glüht rot). **Hell** (Karopapier-Look) für „Regel/Erklärung/Kalender“-Abschnitte als Kontrast |
| Akzente | Neon-Grün = gut/Geld/Wachstum, Neon-Rot = Crash/Schulden, Cyan = neutral/Info, Gold = Rekord/CTA |
| Bewegung | Pop-in mit Überschwingen, Zahlen zählen hoch, Linien zeichnen sich, Stempel knallen rein („BEAT“), Lichtblitz beim Impact, Kamera-Schütteln beim Bruch |
| Logos | Weiße abgerundete Kacheln mit Firmen-Logo, oft auf isometrischen Sockeln |
| Untertitel | Immer eingeblendet (macht der Editor, nicht die Animation) |

## 2. Dramaturgie (Ablauf, den jedes Video übernimmt)

1. **Hook (0–3 s)** – Rote Alarm-Badge mittig mit pulsierenden Alarmringen („KI-BLASE PLATZT? 🚨“) + Zeitdruck-Unterzeile („In 72 Stunden“). → Szene `hook`, vollflächig.
2. **Kontext (3–15 s)** – Wer ist beteiligt? → `flow` (Akteure → Ziel) oder `cards`.
3. **Der Schock (15–35 s)** – Das überraschende Ereignis mit Zahl. → `linechart` mit `drop`, `bars` mit `stamp`, `cards` mit Minuswerten. Hintergrund wird rot.
4. **Problem Nr. 1 / Nr. 2** – Großes Kapitel-Zahlenbild. → `number` („1 · SCHULDEN“). Dann Belege: `series`, `tanks`, `loop`.
5. **Kontrast-Erklärung** – Heller Look für „die alte Regel“, Termine, Logik. → `rule`, `calendar`, `bars` mit `line`.
6. **Open Loop** – „Worauf du achten musst“ → `mystery` (3 ?-Karten), später Auflösung → `list`.
7. **CTA** – `cta` mit Lorbeer-Medaille und Kennzahlen.

## 3. Entscheidungsregeln: Wo kommt welche Animation hin?

Beim Lesen des Skripts **jeden Satz** markieren und so zuordnen:

| Im Skript steht … | Animation |
|---|---|
| Ein Kurs / Chart / „ist gefallen / gestiegen“ | `linechart` (+ `drop` bei Crash, + `event` für Earnings/News, + `projection` für „hätte steigen müssen“) |
| Erwartung vs. Ergebnis, A vs. B, „mehr als“ | `bars` (+ `stamp` BEAT/MISS, + `badge` REKORD, + `line` für Ziellinie) |
| Mehrere Firmen/Coins mit Prozentwerten | `cards` |
| Geldfluss, „investieren in“, „fließt zu“, Abhängigkeit | `flow` (+ `warnAt` wenn es kippt) |
| Eine einzelne, starke Zahl oder „Problem Nr. X“ | `number` |
| Entwicklung über Jahre, „zum ersten Mal seit …“ | `series` (+ `highlight` für den Ausreißer) |
| „Wem geht zuerst … aus“, Reserven, Kapazität | `tanks` (+ `drain`) |
| Teufelskreis, „verstärkt sich gegenseitig“ | `loop` (Thema alarm) |
| Termine, „diese Woche“, Datum | `calendar` (Thema light) |
| „Früher galt … aber jetzt …“, Regel bricht | `rule` (Thema light) |
| „Es gibt 3 Dinge …“ (Spannung aufbauen) | `mystery`, Auflösung danach mit `list` |
| Aufzählung, Checkliste, Gründe, Team, technische Daten | `list` |
| A gegen B, „bei X … bei Y dagegen …“ | `versus` |
| Jemand hat etwas gesagt/gepostet (Zitat, Tweet, Aussage) | `quote` (eigene Karte, sinngemäß übersetzt, kein Plattform-Nachbau) |
| Wahrscheinlichkeit, Risiko, Stimmung in % | `gauge` |
| Preis / Betrag mit Pointe („… und ausverkauft“) | `number` + `stamp` |
| Hook / Clickbait-Frage am Anfang | `hook` |
| Satz ohne Daten: Übergang, Meinung, Spannung („Und genau hier wird’s gefährlich“) | `statement` (Schlagwörter mit `*Sternchen*` hervorheben, passendes Emoji als `icon`) |
| Folgen / Kanal / Produkt | `cta` |

**Faustregeln**

- Alle **2–3 s eine sichtbare Veränderung** (neuer Beat innerhalb der Szene genügt).
- **Eine Szene = 1–3 Sätze.** Timings (`at`, `warnAt`, `breakAt` …) so setzen, dass der Beat **auf das Schlüsselwort** im Satz fällt. Sprechtempo ≈ **2,5 Wörter/s** (Deutsch) zum Schätzen.
- **Zahlen immer animieren** (hochzählen), nie statisch hinschreiben.
- **Farbwechsel = Stimmungswechsel.** Rot nur bei schlechten Nachrichten, damit es wirkt. Hell nur für Erklär-Abschnitte (max. ~25 % des Videos).
- **Jeden Satz abdecken** (faceless): Es darf keine Lücke ohne Clip entstehen. Kontrast entsteht stattdessen durch Wechsel zwischen Daten-Szenen und `statement`-Szenen sowie durch Themenwechsel (dark → alarm → light).
- Titel max. ~22 Zeichen, GROSS, Deutsch.
- Keine echten Markenlogos einbetten, außer der Nutzer legt PNGs bei (`"logo": "logos/meta.png"`). Standard sind Glyph-Kacheln in Markenfarbe.

## 4. Sound

- **Jeder Beat hat einen Sound**: Reinfliegen = `whoosh`, Erscheinen = `pop`,
  Zahl zählt = `tick`, Stempel = `stamp`, Highlight = `ping`, Crash = `downer` + `impact`,
  Warnung = `alert`, Bruch = `crack`, positiv = `success`, negativ = `error`.
- **Geld = `cash`**, gesetzt genau auf das Wort mit dem Betrag (über `"sfx"` im Storyboard).
- Vor großen Enthüllungen (Stempel nach einer Pause) einen `riser` davor.
- Sounds bleiben unter der Stimme (Spitzen ≈ −6 dB), sie sollen betonen, nicht übertönen.

## 5. Technische Konstanten

- Auflösung **1080 × 1920**, **30 fps**, H.264 MP4 (oder ProRes 4444 mit Alpha via `--alpha`).
- Layout `full` (Standard, faceless): Titel bei y ≈ 330 px, Grafik ≈ 450–1470 px,
  darunter (≈ 1500–1700 px) Platz für die Untertitel, unterste ~220 px frei für die TikTok-Bedienelemente.
  Layout `top` existiert nur noch technisch – **nicht verwenden**.
- Jede Szene = **eigener Clip**, harte Schnitte im Editor (wie im Original).
- Untertitel **nicht** in die Clips rendern – die kommen aus CapCut/Editor.
