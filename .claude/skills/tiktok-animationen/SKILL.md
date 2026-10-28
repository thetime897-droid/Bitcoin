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
7. Dem Nutzer `_alle_szenen.mp4` schicken und eine Tabelle geben:
   Clip-Datei → Satz im Skript → was passiert.
8. Storyboard committen (Clips in `out/` sind gitignored).

Fehlt ein Szenentyp für eine gute Idee im Skript, neuen Typ in
`tiktok-clips/engine/scenes.js` im gleichen Stil ergänzen (zeitbasiertes
`update(t)`, keine CSS-Transitions) und in README/STYLE eintragen.
