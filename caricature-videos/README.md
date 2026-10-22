# toonfin – Finanz-Karikatur-Videos (Shorts + Longform)

Macht aus **Ton + Text** ein handgezeichnetes Karikatur-Video: Strichmännchen
mit großen Köpfen, Bulle gegen Bär, Sparschwein, Crash-Charts, Rakete zum Mond,
Geldregen. Dazu kommen TikTok-Untertitel Wort für Wort, Soundeffekte und
Hintergrundmusik. Ein Branding gibt es nicht.

```
Ton (dein Video / Voiceover / Skript)
   │  Transkription (faster-whisper)  oder  .srt  oder  Skript + TTS
   ▼
Wörter mit Zeitstempeln
   │  Planer: Schlüsselwörter → Szene, Zahlen → Headline, Stimmung → Musik
   ▼
plan.json  (von Hand anpassbar: Szene tauschen, Headline ändern)
   │  Renderer: Python/Pillow, parallel, wackelige „Boiling Lines“
   ▼
MP4 9:16 (1080×1920) und/oder 16:9 (1920×1080)  +  .srt
```

## Demos

| Datei | Inhalt |
|---|---|
| `demo/demo_short.mp4` | 9:16-Short, ca. 38 s: Inflation, FOMO, Crash, Sparplan, Zinseszins, Bank |
| `demo/nvidia_original_audio_short.mp4` | 9:16-Short, 16 s: **Originalton + Original-Untertitel** aus dem Clip, darüber CEO-Karikatur, Musik und SFX |
| `demo/nvidia_short.mp4` | 9:16-Short, ca. 28 s: Die „Aktien für eine S-Klasse“-Story, mit CEO-Karikatur und freier Neural-Stimme |
| `demo/boerse_long.mp4` | 16:9-Longform, ca. 55 s: Bulle vs. Bär, Hype, Crash, Schulden, Steuern, Rakete, Geldregen |

Die Stimme in den Demos ist eine **Platzhalter-Roboterstimme** (espeak-ng/mbrola).
Im echten Einsatz kommt der Ton aus deinem Video oder einer guten TTS
(z. B. ElevenLabs). Die Visuals, Untertitel und Effekte bleiben gleich.

### Komplett copyrightfreie Stimme (kostenlos)

Für `--script` kann statt der Roboterstimme die neuronale Piper-Stimme
**Thorsten** (Datensatz unter CC0, also frei nutzbar) verwendet werden:

```bash
pip install piper-tts
curl -LO https://github.com/rhasspy/piper/releases/download/v0.0.2/voice-de-thorsten-low.tar.gz
tar xzf voice-de-thorsten-low.tar.gz
python -m toonfin make --script examples/nvidia_auto.txt --voice de-thorsten-low.onnx --hero ceo --out out/nvidia
```

`--hero ceo` macht die Hauptfigur zur Chef-Karikatur (Lederjacke, Brille, graue Haare).

### Standard-Workflow: Originalton und Originaluntertitel

Bei `--media` bleibt der Ton des Videos immer erhalten, und die Untertitel kommen aus dem Video selbst:
entweder aus einer mitgelieferten `.srt` (eine Zeile pro Wort ergibt die genauesten Wort-Highlights,
siehe `examples/nvidia_original_words.srt`) oder automatisch per faster-whisper. Darunter liegen nur
eigene Musik und eigene Soundeffekte (Ducking unter der Stimme).

```bash
python -m toonfin make --media clip.mp4 --srt clip.srt --lang en --hero ceo --out out/clip
```

## Benutzung

```bash
pip install -r requirements.txt          # Pillow, numpy (+ faster-whisper für Transkription)
# ffmpeg muss installiert sein

# 1) Eigenes Video (Ton bleibt, wird automatisch transkribiert)
python -m toonfin make --media mein_clip.mp4 --format both --out out/clip

#    … mit deinem Gesicht als runder Bild-im-Bild-Einblendung
python -m toonfin make --media mein_clip.mp4 --format short --pip --out out/clip

#    … mit vorhandenen Untertiteln statt Whisper
python -m toonfin make --media mein_clip.mp4 --srt mein_clip.srt --out out/clip

# 2) Nur ein Skript (Platzhalter-Stimme liest vor)
python -m toonfin make --script examples/short_inflation.txt --format short --out out/demo

# 3) Plan anpassen und neu rendern
python -m toonfin make --media mein_clip.mp4 --plan-only --out out/clip
#    out/clip_short.plan.json bearbeiten (template / headline / number …)
python -m toonfin render out/clip_short.plan.json
```

Optionen: `--music auto|funny|serious|none|track.mp3`, `--lang de|en`,
`--ss 1` (schnelle Vorschau ohne Kantenglättung), `--fps 30`, `--model small|medium|large-v3`.

Ausgabe: `<out>_short.mp4`, `<out>_short.srt` (zum Hochladen als Untertitel),
`<out>_short.plan.json`.

## Szenen

Der Planer liest jeden Satz und wählt passend zum Inhalt (Deutsch + Englisch):

| Szene | Auslöser (Beispiele) | Was passiert |
|---|---|---|
| `hook` | erster Satz | Text knallt rein, Sunburst, schockierte Figur, Screen-Shake |
| `inflation` | Inflation, teurer, Kaufkraft | Geldschein schrumpft und wird grau, Preisschild am Brot springt hoch |
| `crash` | Crash, stürzt, Verlust, Panik | Chart steigt und stürzt ab, Slide-Whistle, roter Flash, „CRASH!“ |
| `moon` | Rakete, steigt, Allzeithoch, verdoppelt | Nachthimmel, Figur reitet die Rakete, grüner Chart als Abgasspur |
| `bullbear` | Bullen, Bären, Käufer | Bulle und Bär drücken gegeneinander, Sieger nach Stimmung des Satzes |
| `save` | sparen, Sparplan, Notgroschen | Münzen fallen ins Sparschwein (Ka-Ching), Zähler läuft hoch |
| `compound` | Zinseszins, ETF, langfristig | Schneeball rollt und wächst, Figur rennt davon, Kurve wird exponentiell |
| `debt` | Schulden, Kredit, Raten | Figur schleppt eine Eisenkugel, Regenwolke, Geldscheine fliegen mit Flügeln weg, Trauer-Posaune |
| `tax` | Steuer, Finanzamt | Das Finanzamt holt sich ein Tortenstück (dein %-Wert) |
| `fomo` | Hype, Gier, FOMO | Herde rennt zur glühenden Münze (₿, wenn es um Krypto geht) |
| `bank` | Bank, Gebühren, Berater | Münzen fliegen von dir zum Banker mit Zylinder und Monokel |
| `moneyrain` | reich, Millionär, Dividende | Geldregen, Figur tanzt mit Dollar-Augen |
| `car` | Mercedes, Porsche, Sportwagen | Luxusauto rauscht heran (Motorsound), Aktie fliegt rein, Figur jubelt |
| `versus` | nur per Tag `[versus]` | Waage: Auto gegen einen Berg Geld, kippt mit Knall |
| `think` | Satz endet mit „?“ | Gedankenblase: erst „?“, dann Glühbirne |
| `explain` | alles andere | Flipchart, Sprechblase oder riesige hochzählende Zahl (wenn eine Zahl im Satz steht) |
| `outro` | Folge, abonnieren, Teil 2 | Winken, pulsierender „FOLGEN!“-Button |

Erzwingen kannst du eine Szene im Skript mit `[crash] Und dann kam der Absturz.`
oder im `plan.json` über das Feld `template`.

### Was die Videos „catchy“ macht

- Alle 2–5 s ein neuer Shot. Lange Sätze werden geteilt, damit es nie statisch wird.
- Abwechselnd Pop-Zoom- und Whip-Pan-Übergänge mit Whoosh.
- Kurzer Punch-in auf Zahlen und Schlüsselwörter, Screen-Shake bei Impacts.
- Linien werden 10× pro Sekunde neu „gekritzelt“ (Boiling Lines), wie bei echter Handanimation.
- Die Figuren bewegen den Mund synchron zur Lautstärke der Stimme.
- Untertitel kommen Wort für Wort mit Pop. Zahlen sind gelb, positive Wörter grün, negative rot.
- Headline-Sticker oben, Fortschrittsbalken bei Shorts.
- Musik wird automatisch heruntergeregelt, sobald gesprochen wird (Ducking).
  Bei ernstem Inhalt läuft ein dunkles Pad, bei lockerem Inhalt ein verspieltes Pluck-Arpeggio.

## Aufbau

```
toonfin/
  ink.py         Wackel-Linien, Formen, Text, Transform-Stack
  characters.py  Strichmännchen: Posen, Gesichter, Typen (hero, banker, bro, crowd)
  props.py       Münzen, Scheine, Sparschwein, Bulle, Bär, Rakete, Burst, Wolken …
  scenes.py      Die Szenen-Templates (oben) inkl. Sound-/Shake-Cues
  planner.py     Wörter → Szenenplan (Keywords, Zahlen, Stimmung)
  render.py      Kamera, Übergänge, Untertitel, Headline, Multiprocessing → ffmpeg
  audio.py       Lip-Sync-Hüllkurve, synthetische SFX, Musik, Mix
  sources.py     Skript+TTS, eigenes Video (Whisper), SRT-Import
  fonts/         Luckiest Guy, Bangers, Permanent Marker, Patrick Hand (OFL/Apache)
```

Rendergeschwindigkeit: etwa 10 Bilder/s auf 4 Kernen, also rund 2 Minuten für einen 40-Sekunden-Short.

Eine neue Szene ist eine Funktion in `scenes.py` mit `@scene("name", cues)` plus
ein Eintrag in `planner.RULES`.
