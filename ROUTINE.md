# Tägliche Routine: Marktupdate by Panda_investiert

Diese Datei ist die komplette Arbeitsanweisung für die tägliche Folge. Folge
ihr Schritt für Schritt. Das Design ist fertig – ändere keinen Code, außer
etwas ist kaputt. Täglich wird nur `src/data/episode.ts` neu geschrieben.

Sprache mit dem Nutzer: Deutsch, kurz und klar. Der Nutzer liest mobil.

## 0. Setup (ca. 2 Min.)

```bash
git fetch origin marktupdate
git worktree add ../marktupdate origin/marktupdate 2>/dev/null || true
cd ../marktupdate && git checkout -B marktupdate origin/marktupdate
npm ci --no-audit --no-fund
```

Alle weiteren Befehle laufen in `../marktupdate`.

## 1. Recherche (Stand: jetzt, Zeitraum: letzte 24 Stunden)

Mit WebSearch die wichtigsten Markt-News der letzten 24 Stunden sammeln.
Quellen (professionell, gern gemischt Deutsch/Englisch): CNBC, Reuters,
Bloomberg, Yahoo Finance, MarketWatch, TheStreet, Barron's, Benzinga,
Börsen-Zeitung, Handelsblatt, finanzen.net, wallstreet-online.de,
finanznachrichten.de, boerse.de, Der Aktionär, CoinDesk, The Block, KuCoin/
Fortune für Kurse. Sinnvolle Suchen: "stock market today <Datum>",
"biggest stock movers <Datum>", "DAX Schluss <Datum>", "Bitcoin Kurs <Datum>",
"Fed/EZB <Monat Jahr>", "oil price <Datum>", "gold price <Datum>",
"<große Firma> stock <Datum>", "earnings <Datum>".

Auswahl (6–8 Meldungen):
- **Hook = die größte, marktbewegendste Meldung** (Zinsen/Notenbank,
  Index-Einbruch/Rekord, Gipfel/Politik, Rohstoff-Schock, Mega-Cap-News).
- Makro-Treiber: Zinsen, Notenbank-Beschlüsse, Konjunkturdaten, Politik/
  Gipfeltreffen, Kriege/Sanktionen, Öl/Gold.
- Große oder gehypte Unternehmen (Mag-7, Chips/KI, Quanten, Rüstung, DAX-
  Schwergewichte) mit konkretem Anlass (Zahlen, Deal, Kurssprung).
- Krypto (Bitcoin + ggf. eine auffällige Story).
- Am Ende ein Ausblick/Cliffhanger (Termin morgen/diese Woche).

Faktenregeln (wichtig):
- Jede Zahl braucht eine Quelle vom selben Tag. Nichts erfinden, nichts
  schätzen. Widersprechen sich Quellen (Intraday), vorsichtig formulieren
  ("über 5 %", "zeitweise mehr als 11 %", "rund 86.500 $").
- Nicht einseitig framen: Tagesverlauf prüfen (z. B. Bitcoin erst fällt,
  dann erholt).
- News-Karten zeigen **echte Überschriften wörtlich** (Deutsch oder
  Englisch) mit dem richtigen Outlet.

## 2. Storytelling-Skript (Sprechtext)

- Deutsch, gesprochen, locker aber seriös. Kurze Sätze.
- Bogen: Hook → Ursache(n) → Folge → weitere Themen → Lichtblick →
  Cliffhanger → Outro ("Das war dein Marktupdate. Folg Panda investiert,
  damit du morgen nichts verpasst.").
- Länge: 170–260 Wörter → Video **65–100 Sekunden** (nie unter 60 s).
- Szenendauer ≈ Wörter / 2,9 + 2,5 s (für den Kameraflug), min. 8 s.

**Sofort nach dem Skript** (vor dem Rendern) dem Nutzer schicken: das
komplette Skript nach Szenen, darunter die Quellen als Links. Zusätzlich eine
PushNotification: "Skript für dein Marktupdate ist da".

## 3. Daten: `src/data/episode.ts`

Die bestehende Datei ist die Vorlage – Struktur beibehalten, Inhalte ersetzen.
Felder siehe `README.md` Abschnitt 4. Hinweise:
- `countryIso`: numerische ISO-Id; muss in `src/geo/flagAssets.generated.ts`
  vorhanden sein, sonst in `scripts/generate-flags.mjs` ergänzen und
  `node scripts/generate-flags.mjs` ausführen.
- `region`: Pin auf den echten Ort der News (Börse, Firmensitz, Notenbank,
  Gipfelort). Bei US-Firmen `stateFips` setzen (Bundesstaat wird
  angehoben). Sehr kleine Orte (D.C.) nur mit `point` + `zoom`.
- Aufeinanderfolgende Szenen möglichst an verschiedenen Orten.
- `tone: "bad"` für steigende Renditen/Öl/Zinsen; neutrale Werte ohne Pfeil.
- `ticker`: nur verifizierte Tageswerte (deutsches Zahlenformat).
- `badge`: Firmen = Ticker-Kürzel (`kind: "logo"`, keine echten Logos),
  Krypto = Symbol (`coin`), Themen = Emoji (`icon`).
- `voiceover` pro Szene = der Sprechtext. `dateLabel` = heutiges Datum.
- Hook-Szene hat automatisch BREAKING + Impact-Sound.

## 4. Prüfen

```bash
npx tsc --noEmit
```

Dann Standbilder prüfen (je Szene kurz nach der Ankunft), z. B.:

```bash
HEADLESS=$(ls -d /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell | head -1)
npx remotion still Short --frame=<N> --scale=0.4 --browser-executable=$HEADLESS out/check-<N>.png
```

Szenenstart = 40 + Summe der vorherigen Szenen (in Frames, 30 fps); Ankunft
≈ Start + 40–78 Frames. Achten auf: überlappende Beschriftungen, Pins
außerhalb des Bildes, falsche Flaggen, leere Karten. Bei Problemen die Daten
anpassen (z. B. `region.zoom`, andere Szene/Ort), nicht das Design.

## 5. Rendern (Short 9:16 + Long 16:9)

```bash
bash scripts/cloud-render.sh marktupdate-<JJJJ-MM-TT>
```

Dauert ca. 30 Min. pro Format → im Hintergrund starten und auf die
Benachrichtigung warten (nicht pollen). Danach beide `*-web.mp4` mit
SendUserFile schicken (Limit 30 MB – die Web-Kopien sind darauf ausgelegt)
und eine PushNotification "Marktupdate-Videos sind fertig".

## 6. Archivieren

```bash
git add src/data/episode.ts && git commit -m "Marktupdate <JJJJ-MM-TT>" && git push origin marktupdate
```

Keine Videos committen.

## 7. Wenn der Nutzer seine Sprachaufnahme schickt

1. `pip install --break-system-packages numpy scipy` (falls nötig), Datei nach
   `public/voice.mp3` kopieren (vorher mit ffmpeg umwandeln, falls kein MP3),
   in `episode.ts` `voiceSrc: "voice.mp3"` setzen.
2. `blocks.txt` schreiben: der gesprochene Text je Szene plus Outro als letzter
   Block, Blöcke durch eine Leerzeile getrennt (Zahlen am besten ausgeschrieben).
3. `python3 scripts/voice-sync.py public/voice.mp3 blocks.txt` →
   `durationInSeconds` je Szene und `outroSeconds` in `episode.ts` übernehmen.
   Szenen unter ~5 s: kurze Flugstrecke wählen (Ziel nahe der Vorszene) und
   nur eine News-Karte.
4. Nur die gewünschten Formate rendern (Long: `npx remotion render Long ...`,
   Details siehe `scripts/cloud-render.sh`).

## 8. Hintergrundmusik (optional)

`python3 scripts/generate-music.py <Sekunden> public/music/newsbed.wav` erzeugt
ein eigenes, lizenzfreies News-Bed (selbst synthetisiert). Unter das fertige
Video mischen (Musik duckt automatisch unter der Stimme):

```bash
ffmpeg -i out/video.mp4 -i public/music/newsbed.wav -filter_complex \
 "[0:a]asplit=2[k][v];[1:a]volume=0.135[m];[m][k]sidechaincompress=threshold=0.02:ratio=8:attack=15:release=400[md];[v][md]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]" \
 -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k out/video-musik.mp4
```

`volume=0.135` ist der abgenommene Pegel (Stimme klar im Vordergrund) – nicht
lauter machen. Sound-Design bewusst sparsam: ein Whoosh nur bei echtem
Ortswechsel, ein dezenter Impact auf dem Hook, keine Pop-/Ding-Sounds bei
Einblendungen (Pegel zentral in `src/MainVideo.tsx`, `SFX_WITH_VOICE`).

Beide Versionen (mit/ohne Musik) und die Musik-Datei schicken.
