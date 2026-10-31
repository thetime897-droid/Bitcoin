---
name: tiktok-animationen
description: Baut aus einem Video-Skript animierte Retention-Clips (9:16) im Stil des Referenzvideos. Verwenden, sobald der Nutzer ein Skript, einen Sprechertext oder einen Videotext schickt – auch ohne ausdrücklich nach Animationen zu fragen.
---

# Skript → TikTok-Animations-Clips

Der Nutzer (Kanal Panda_investiert, Finanz/Krypto) will zu **jedem Skript**
Animations-Clips im Stil seines Referenzvideos, um die Retention zu erhöhen.
Werkzeug und Stil liegen in `tiktok-clips/`.

**Immer Faceless-Content:** Der Nutzer ist nie im Bild – kein Greenscreen,
keine Facecam. Layout `full`, jeder Satz bekommt einen Clip (Lücken mit
`statement`), nichts für eine Facecam freihalten, keine Overlays „über den Sprecher“.

**Einzelne Clips statt fertigem Video:** Der Nutzer hat oft schon eigene
Szenen (z. B. Cartoon-Clips) und will die Animationen als **einzelne
Einblend-Clips** pro Fakt/Moment. Jede Szene = eigene MP4, mit Zeitmarke im
Feld `script`, damit klar ist, wo sie hingehört.

**Immer mit Soundeffekten, aber dezent** (eingebaut, siehe README „Soundeffekte“):
echte CC0-Aufnahmen aus `tiktok-clips/sfx/lib/` (Whooshes, Pops, Pings, Ka-Ching),
leise gemischt (Standard `sfxVolume` 0.35). Nicht lauter machen, außer der Nutzer
will es. Geldbeträge bekommen `cash`, Enthüllungen einen `stamp` mit `riser` davor.
Pixabay & Co. sind in der Cloud-Umgebung gesperrt; GitHub und npm gehen – neue
Sounds nur mit klarer CC0-Lizenz in `sfx/lib/` aufnehmen und in `QUELLEN.md`
eintragen. Eigene Dateien unter `tiktok-clips/sfx/<name>.mp3` haben Vorrang.

**Dynamisch & schnell:** Clips bewegen sich immer leicht weiter (Partikel, Zoom,
Schweben – automatisch). Einblendungen schnell hintereinander, Clips 3–5 s.

**Saubere Einblendungen:** Jeder Clip blendet automatisch weich ein und aus.
Letzten Beat mindestens 0,5 s vor Clip-Ende legen, damit er nicht in die
Ausblendung fällt.

## Vorgehen

1. `tiktok-clips/STYLE.md` lesen (Dramaturgie + Entscheidungstabelle) und
   `tiktok-clips/README.md` (Szenentypen + Parameter). Bei Bedarf
   `tiktok-clips/storyboards/beispiel-ki-blase.json` als Vorlage nehmen.
2. Skript in Sätze zerlegen und **jedem Satz** eine Animation zuordnen
   (100 % Abdeckung, alle 2–3 s ein Beat). Daten-Sätze → Daten-Szenen,
   Übergänge/Meinungen → `statement`. Mehrere Sätze dürfen eine Szene teilen,
   die sich pro Satz weiter aufbaut.
3. Dauer pro Szene aus der Wortzahl schätzen (≈ 2,5 Wörter/s Deutsch,
   + 0,5 s Puffer). Beat-Zeiten (`at`, `warnAt`, `breakAt`, `drop.at` …) auf
   das Schlüsselwort im Satz legen. Zahlen/Fakten nur aus dem Skript nehmen;
   fehlen Kursdaten, `data` als `{from,to,points,vol,seed}` angeben.
4. Storyboard nach `tiktok-clips/storyboards/<kurzer-name>.json` schreiben,
   Feld `script` je Szene mit dem zugehörigen Satz füllen. Titel deutsch,
   kurz, GROSS geschrieben wirken lassen.
5. Erst `node render.cjs storyboards/<name>.json --stills` und die PNGs
   ansehen (Überlappungen, abgeschnittener Text, leere Bereiche) → korrigieren.
6. Dann `node render.cjs storyboards/<name>.json --concat`.
   Ergebnis liegt in `tiktok-clips/out/<name>/`.
7. Dem Nutzer `_alle_szenen.mp4` (nur zur Vorschau) schicken und eine
   Tabelle geben: Clip-Datei → Zeitmarke/Satz im Skript → was passiert → Sounds.
8. Storyboard committen (Clips in `out/` sind gitignored).

Fehlt ein Szenentyp für eine gute Idee im Skript, neuen Typ in
`tiktok-clips/engine/scenes.js` im gleichen Stil ergänzen (zeitbasiertes
`update(t)`, keine CSS-Transitions) und in README/STYLE eintragen.
