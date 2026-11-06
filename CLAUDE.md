# Hinweise für Claude

- `src/` ist die „Bitcoin Battlefield“-Live-Visualisierung (siehe README.md).
- `tiktok-clips/` erzeugt Retention-Animationen für TikTok-Videos.
  **Schickt der Nutzer ein Skript, immer den Skill `tiktok-animationen`
  (`.claude/skills/tiktok-animationen/SKILL.md`) befolgen** und die Clips nach
  `tiktok-clips/STYLE.md` bauen.
- Die TikTok-Videos sind **Faceless-Content**: der Nutzer ist nie zu sehen
  (kein Greenscreen, keine Facecam). Jeder Satz bekommt eine vollflächige Animation.
- Aktueller Standard-Stil: Broker-App-Karten (`theme: tr`), Export `--tiktok` + `--alpha`, immer mit „Keine Anlageberatung“.
- **Skript-Dramaturgie (Standard):** Immer die *stärkste* Hook zuerst – das spannendste
  Detail (z. B. Manipulation, Insiderkauf, Riesenzahl) sofort zeigen, aber nicht alles
  spoilern. Danach Stück für Stück aufdecken (Wer? Wo? Wie? Folgen?) mit Re-Hooks,
  damit Retention und Watchtime hoch bleiben. Logos/Grafiken/Charts wo möglich.
