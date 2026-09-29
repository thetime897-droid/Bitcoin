# Markt-Terminal Live

Ein Live-Nachrichten-Terminal für einen Dauer-Livestream auf YouTube oder Twitch.
Es zeigt laufend die neuesten Meldungen zu **Aktien, ETFs, Krypto und Wirtschaft**.
Zu jeder Meldung gibt es drei Stichpunkte „Was kann das bedeuten?“. Dazu kommen
**Kurse von Indizes, Aktien, ETFs/ETCs und etablierten Kryptowährungen**, die
stärksten Gewinner und Verlierer, **Analysten-Kursziele** und ein dauerhaft
sichtbarer Hinweis **„Keine Anlageberatung“**.

**Laufende Kosten: 0 €.** Keine Abos, keine API-Schlüssel, keine Programmbibliotheken.

## Was auf dem Bildschirm passiert

- **Große Karte:** eine Meldung nach der anderen (standardmäßig je 25 Sekunden)
  mit Kategorie, Quelle, Uhrzeit, kurzem Anriss und drei Stichpunkten zur Einordnung
- **Eilmeldungen:** Frische, wichtige Themen wie Zinsentscheide, Hacks, Crashs,
  ETF-Zulassungen oder Insolvenzen unterbrechen sofort, werden rot markiert und
  spielen einen kurzen Ton
- **Aktie zur Meldung:** Geht es in einer Meldung um eine bekannte Aktie oder
  Kryptowährung (z. B. „Rheinmetall“, „Nvidia“, „Solana“), erscheint unten ihr
  Kurs mit Tagesverlauf und, falls vorhanden, dem Analysten-Kursziel
- **Markt-Folien** nach jeweils 3 Meldungen, abwechselnd:
  - *Top-Bewegungen Aktien*: die 5 stärksten Gewinner und Verlierer mit Balken und Verlauf
  - *Top-Bewegungen Krypto*: das Gleiche für etablierte Kryptowährungen (keine Meme-Coins)
  - *Im Fokus*: die Aktie mit der größten Bewegung heute, mit großem Chart, Tageshoch/-tief
    und Analysten-Kursziel (Durchschnitt, Spanne, Anzahl Analysten, Konsens)
  - *Indizes, ETFs & ETCs*: DAX, Euro Stoxx 50, S&P 500, Nasdaq, Dow Jones, Gold, Öl,
    EUR/USD sowie beliebte ETFs und ETCs als Kacheln
- **Kurs-Laufband oben:** Indizes, große Kryptos, ETFs/ETCs. Preise blinken bei
  Änderungen kurz grün oder rot
- **Countdown oben:** ein Ring zeigt, wann die nächste Einblendung kommt, und
  darunter steht, was als Nächstes gezeigt wird
- **Seitenleiste:** oben wechseln alle 9 Sekunden Gewinner und Verlierer
  (Aktien und Krypto), unten die neuesten Meldungen
- **Bewegung:** Hintergrund, Charts, die sich zeichnen, und Balken, die wachsen,
  damit das Bild nie „steht“
- **News-Laufband:** die neuesten Überschriften
- **Hinweis-Leiste:** „KEINE ANLAGEBERATUNG …“ steht **immer** unten im Bild.
  Zusätzlich erscheint nach jeweils 8 Meldungen ein großer Hinweis-Bildschirm,
  und jede Einordnung ist mit „keine Anlageberatung“ beschriftet

Wenn nichts Neues kommt, rotiert das Terminal durch die 20 neuesten Meldungen.
Der Bildschirm ist also nie leer. Neue Meldungen werden alle 2 Minuten abgerufen,
Aktienkurse alle 3 Minuten, Kryptokurse alle 15 Sekunden.

## Starten (Windows)

1. **Node.js** installieren (kostenlos, Version „LTS“): https://nodejs.org
2. In diesem Ordner **`start-windows.bat`** doppelklicken.
   Das schwarze Fenster offen lassen, solange der Stream läuft.
3. Im Browser **http://localhost:8080** öffnen, um die Anzeige zu prüfen.

Zum Ausprobieren ohne echte Nachrichten: `demo-windows.bat`. Dann erscheinen
Beispielmeldungen mit einem lila „DEMO-MODUS“-Hinweis. **Nicht so live gehen.**

Mac/Linux: `node server.mjs` bzw. `node server.mjs --demo`.

Welche Quellen gerade funktionieren, zeigt http://localhost:8080/status.

## In OBS einbinden

1. In OBS eine **Szene** anlegen, dann **Quelle hinzufügen → Browser**.
2. URL: `http://localhost:8080`, Breite **1920**, Höhe **1080**.
3. „Audio über OBS steuern“ anhaken, damit du die Lautstärke des Eilmeldungs-Tons regeln kannst.
4. **Musik:** in derselben Szene eine **Medienquelle** oder **VLC-Videoquelle**
   mit einer Playlist anlegen, auf „Wiederholen“ stellen und leise mischen.

> ⚠ **Nur lizenzfreie Musik verwenden**, die ausdrücklich für monetarisierte
> Streams erlaubt ist. Kostenlose Quellen: die **YouTube Audio-Mediathek**
> (YouTube Studio → Audio-Mediathek) und **StreamBeats**. Normale Musik aus
> Spotify & Co. führt zu Content-ID-Sperren, und der Stream wird abgeschaltet.

## Einstellungen

Über die Adresse in OBS:

| Adresse | Wirkung |
|---|---|
| `http://localhost:8080/?sekunden=30` | Jede Meldung 30 statt 25 Sekunden zeigen |
| `http://localhost:8080/?ton=0` | Eilmeldungs-Ton aus |
| `http://localhost:8080/?markt=25` | Markt-Folien 25 statt 18 Sekunden zeigen |
| `http://localhost:8080/?sekunden=20&ton=0` | mehrere Einstellungen kombiniert |

**Quellen** stehen in `feeds.json` und lassen sich dort ergänzen oder entfernen.
Jede Quelle hat eine Standard-Kategorie (`aktien`, `etf`, `krypto`, `makro`).
Meldungen werden zusätzlich anhand von Stichwörtern einsortiert.
`"filter": true` bedeutet, dass nur Meldungen mit Finanzbezug übernommen werden.

**Kurslisten** stehen in `markets.json`: Indizes, Aktien (DAX-Schwergewichte und
große US-Werte), ETFs/ETCs und Kryptowährungen. Aktien, Indizes und ETFs nutzen
Kürzel von Yahoo Finance (z. B. `SAP.DE`, `AAPL`, `^GDAXI`), Kryptos das Kürzel
bei Binance (z. B. `BTC`). Über `keywords` wird eine Nachricht einer Aktie zugeordnet.
Top-Gewinner und -Verlierer werden aus diesen Listen berechnet. Wer mehr Aktien
aufnimmt, bekommt also eine breitere Auswahl.

**Stichpunkte / Einordnung** stehen in `analysis.mjs`. Sie sind **regelbasiert**:
Das Programm erkennt Stichwörter wie „Leitzins“, „Übernahme“ oder „Hack“ und zeigt
dazu vorbereitete, allgemeine Erklärungen. Das ist kostenlos und erfindet keine
Fakten. Es gibt aber keine individuelle Analyse der einzelnen Meldung.

## Kosten und Einnahmen realistisch

| Posten | Kosten |
|---|---|
| Software, Nachrichten, Kurse, Kursziele | 0 € |
| OBS | 0 € |
| Musik (YouTube Audio-Mediathek / StreamBeats) | 0 € |
| **Strom für einen PC im 24/7-Betrieb** | **ca. 15–35 € / Monat** (je nach PC, 60–130 W bei ~0,35 €/kWh) |

Der Strom ist der einzige echte Kostenpunkt. Ein sparsamer Rechner (Mini-PC, Laptop)
senkt ihn deutlich. Werbeeinnahmen auf YouTube gibt es erst **nach der Aufnahme ins
YouTube-Partnerprogramm** (u. a. 1.000 Abonnenten und 4.000 öffentliche
Wiedergabestunden in 12 Monaten). Bis dahin verdient der Stream nichts. Genau
deshalb ist hier alles kostenlos gehalten.

Optional später, wenn der Kanal Geld verdient: KI-Stichpunkte, die jede Meldung
individuell erklären. Mit einem günstigen Modell kostet das je nach Menge etwa
ein paar Euro im Monat.

## Rechtliche Hinweise (bitte selbst prüfen)

- **Keine Anlageberatung:** ist in der Hinweis-Leiste, auf dem Hinweis-Bildschirm und bei
  jeder Einordnung eingebaut. Schreib es zusätzlich in die **Stream-Beschreibung**.
- **Presseinhalte:** Angezeigt werden nur Überschrift, Quelle und ein sehr kurzer Anriss
  (max. 160 Zeichen), nie ganze Artikel. Das deutsche Leistungsschutzrecht erlaubt nur
  „sehr kurze Auszüge“. Prüfe die Nutzungsbedingungen der Quellen für kommerzielle
  Streams. Im Zweifel die Quelle aus `feeds.json` entfernen.
- **Kursdaten:** Aktien-, Index- und ETF-Kurse sowie Kursziele kommen über die
  inoffizielle, kostenlose Schnittstelle von Yahoo Finance. Sie ist verzögert, nicht
  garantiert und kann sich jederzeit ändern. Laut Yahoo-Nutzungsbedingungen ist sie für
  den persönlichen Gebrauch gedacht. Für einen monetarisierten Stream solltest du das
  prüfen und bei Wachstum auf einen lizenzierten Datenanbieter umsteigen. Kryptokurse
  kommen von der öffentlichen Binance-Schnittstelle.
- **Kursziele:** werden immer als „Meinungen Dritter, keine Empfehlung“ gekennzeichnet.
  Sind sie nicht abrufbar (Yahoo zeigt in der EU teils eine Cookie-Seite), fehlen nur die
  Kursziele, der Rest läuft weiter.
- **Impressum:** Monetarisierte Kanäle in Deutschland brauchen in der Regel ein Impressum
  (z. B. im Kanal-Info-Bereich).

Dies ist keine Rechtsberatung. Bei Unsicherheit bitte fachkundig beraten lassen.
