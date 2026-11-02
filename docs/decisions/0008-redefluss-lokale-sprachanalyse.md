# 0008 – Redefluss: lokale Sprechanteil-Analyse + optionale On-Device-Füllwort-Erkennung
Datum: 2026-09-21 | Status: accepted

## Kontext
"Redefluss" ist seit dem ursprünglichen Konzept eine der vier zugesagten Kennzahlen (`docs/kontext.md`, `CLAUDE.md`), aber bis zu diesem Slice nirgends implementiert – nur ein Platzhalter ("Transkription ist deaktiviert") in `AuswertungScreen.tsx`. Bisher gab es außerdem überhaupt keinen Mikrofonzugriff (nur `getUserMedia({video:true})`, siehe ADR-0002-Nachtrag oben). `processLocally` war in ADR-0002 reine Prosa ohne konkreten Mechanismus.

**Live-Konsolenprüfung im tatsächlichen Chrome des Nutzers** (nicht nur aus Dokumentation übernommen) ergab: `SpeechRecognition.available({ langs: ['de-DE'], processLocally: true })` existiert wirklich und liefert für Deutsch `'downloadable'`. Das ist die reale, konkrete Umsetzung dessen, was ADR-0002 bislang nur als Konzept nannte.

## Architektur, zweistufig

**1. Immer lokale Basis-Kennzahl, ganz ohne Spracherkennung.** Web-Audio-API (`AudioContext`+`AnalyserNode`) misst alle ~200ms die RMS-Lautstärke des Mikrofon-Tracks (`useRedeflussVad.ts`). Daraus berechnet `domain/redefluss.ts`:
- **Adaptiver Schwellwert statt absolut**: Rauschboden pro Aufnahme aus dem 10. Perzentil der eigenen Lautstärke-Werte geschätzt, zusätzlich nach unten begrenzt durch `RAUSCHBODEN_MINIMUM = 0.01` (eigene Einschätzung, nicht empirisch validiert). Ein absoluter Schwellwert hätte dasselbe Geräteabhängigkeits-Problem gehabt wie Bewegungsruhe/Kopfausrichtung vor ihrer Kalibrierung (siehe Journal 2026-09-19).
- **Führende/nachlaufende Stille wird herausgeschnitten**, bevor `redeflussProzent` und `laengstePauseSekunden` berechnet werden – sonst wäre "längste Pause" fast immer die Vorlese-/Bedenkzeit am Anfang, nicht ein Stocken mitten in der Antwort.
- `laengstePauseSekunden` als eigene Kennzahl neben dem reinen Sprechanteil, weil Sprechanteil allein nicht zwischen vielen kurzen Pausen und einem langen Stocken unterscheidet.

Rohaudio verlässt den Browser nie – nur die abgeleiteten Zahlen.

**2. Füllwort-Erkennung optional on top**, über die echte On-Device-`SpeechRecognition`-API mit explizitem Einwilligungsschritt (`useFuellwortErkennung.ts`). Feature-Detection über beide Namen (`window.SpeechRecognition` und `window.webkitSpeechRecognition`), alle vier `available()`-Zustände behandelt:
- `'unavailable'`: Feature dauerhaft aus, sichtbarer Hinweis, Redefluss (Basis-Kennzahl) wird trotzdem gemessen.
- `'downloadable'`: **kein automatischer Download.** UI zeigt einen Button ("Füllwort-Erkennung aktivieren") mit Erklärtext; der Download wird ausschließlich durch den Klick-Handler ausgelöst, nie beim Mount.
- `'downloading'`: Ladehinweis.
- `'available'`: pro Frage eine neue `SpeechRecognition`-Instanz (`lang: 'de-DE'`, `continuous: true`), mit eigenem Neustart-Zähler (`MAX_NEUSTARTS = 3`, eigene Einschätzung) für den Fall, dass `onend` wiederholt ohne Ergebnis feuert.

**Transkript lebt nur im Speicher.** Es ist closure-lokal innerhalb der jeweiligen `SpeechRecognition`-Instanz in `useFuellwortErkennung.ts`, wird nie persistiert, nie geloggt, nie ans Backend gesendet. `ergaenzeRedefluss()` (`domain/redefluss.ts`) ist der einzige Ort, der das Transkript liest, und gibt ausschließlich die abgeleitete Zahl (`fuellwoerterProMinute`) zurück – das Transkript selbst verlässt diese Funktion nie.

`fuellwoerterProMinute` bezieht sich auf die **Sprechzeit**, nicht auf die Antwortdauer, sonst würden viele Pausen die Rate künstlich verzerren. Unterhalb von `MINDEST_SPRECHZEIT_SEKUNDEN = 5` (eigene Einschätzung) ist der Wert `null` statt einer aus wenigen Sekunden hochgerechneten Rate.

**Füllwortliste (`FUELLWOERTER`)**: gängige deutsche Füllwörter aus allgemeiner Beobachtung, keine empirische Quelle. Caveat: naives Wortmatching überschätzt systematisch – "also" und "genau" sind oft legitime Satzanschlüsse/Bestätigungen statt Füllwörter, nicht nur in Einzelfällen.

## Abgrenzung zu ADR-0004 (Modelle selbst gehostet)
ADR-0004 hat den Wechsel weg vom Google-CDN gerade damit begründet, dass jeder App-Start ohne Einwilligung eine IP an Google sendet. Die Füllwort-Erkennung tut auf den ersten Blick etwas Ähnliches (Download einer Google-Komponente), ist aber bewusst anders abgewogen, kein Widerspruch:
- **Einmalig statt bei jedem Start**: das Sprachpaket wird einmal installiert, nicht bei jedem App-Aufruf neu angefragt.
- **Bewusster Klick statt automatisch**: der Download läuft ausschließlich über den expliziten "Füllwort-Erkennung aktivieren"-Button, nie beim Laden der Seite.
- **Optional statt Voraussetzung**: die App bleibt ohne diese Funktion vollständig nutzbar (Redefluss-Basis-Kennzahl funktioniert unabhängig); bei MediaPipe-Modellen war die App ohne den CDN-Download gar nicht lauffähig.
- Ehrlich benannt: auch hier fließt beim Download einmalig eine IP an Google – das ist nicht "kein Datenabfluss", sondern ein bewusst in Kauf genommener, einmaliger, eingewilligter Abfluss statt eines wiederholten, unausweichlichen.

## Nachtrag 2026-09-21 (manueller Test): `install()` liefert einen Boolean, Chrome selbst zeigte einen offenen Fehler
Beim ersten manuellen Test blieb der Status in echtem Chrome über 60 Sekunden bei `'downloading'` hängen (Safari: erwartungsgemäß `'unavailable'`, da die API dort nicht existiert). Recherche (MDN, Chromium-Issue-Tracker) ergab zwei getrennte Punkte:
1. **Echter Bug im eigenen Code**: `SpeechRecognition.install()` löst laut MDN mit einem Erfolgs-**Boolean** auf, nicht mit `void`. Der ursprüngliche Code ignorierte den Rückgabewert und setzte bei jedem Auflösen `'available'`, auch bei einem fehlgeschlagenen Download. Gefixt: `erfolgreich ? 'available' : 'unavailable'`, mit Regressionstest.
2. **Bestätigt kein eigener Bug, sondern eine Chrome-seitige Einschränkung**: `chrome://components` wurde während des hängenden `'downloading'`-Zustands geprüft – **keine** der 22 aufgeführten Komponenten betrifft Spracherkennung/SODA/On-Device-Speech (u. a. vorhanden: WASM-TTS-Engine für Sprach**ausgabe**, aber nichts für Spracherkennung). Die vom Blink-API-Surface angebotene `available()`/`install()`-Funktionalität hat auf dieser Chrome-Installation also keine registrierte Download-Infrastruktur dahinter – strukturell deckungsgleich mit dem im Chromium-/Brave-Issue-Tracker dokumentierten Muster ("API-Oberfläche vorhanden, SODA-Komponente nicht verdrahtet"). Das On-Device-Web-Speech-API ist zum Testzeitpunkt noch im gestaffelten Dev-Preview-Rollout; diese Instabilität liegt außerhalb des Einflussbereichs dieses Projekts und wird als bekannte, dokumentierte Grenze geführt statt versucht, sie im eigenen Code zu kompensieren.

## Bekannte Grenzen
- **Nahezu pausenloses Sprechen**: liegt bereits das 10. Perzentil der Lautstärke-Werte selbst auf Sprachpegel (kaum leise Frames zum Schätzen vorhanden), kann die adaptive Rauschboden-Schätzung zu hoch ausfallen und Redefluss für sehr flüssige Sprecher:innen unterschätzen. `RAUSCHBODEN_MINIMUM` federt nur den umgekehrten Fall ab (sehr leise Aufnahme, Perzentil nahe Null) – diese Schwäche bleibt in diesem Slice offen, dokumentiert statt verschwiegen. Kalibrierung mit echten Testaufnahmen wäre der nächste Schritt (gleiches Muster wie bei Bewegungsruhe/Kopfausrichtung, Journal 2026-09-19).
- **Modus "Nur Ton"**: Redefluss ist vorerst nur an den Modus "Video und Ton" angebunden (`InterviewScreen.tsx` prüft `config.modus === 'video-ton'`). Ein reiner Ton-Modus ohne Kamera ist eine bekannte, bewusst nicht in diesem Slice geschlossene Lücke.
- **Whisper WASM** (vollständig lokales, modellbasiertes STT unabhängig vom Browser-Hersteller) wäre eine Alternative ohne Abhängigkeit von Chrome/Google gewesen, wurde aber nicht gebaut, da mit der echten `SpeechRecognition.available()`-API bereits eine verifiziert funktionierende On-Device-Lösung existiert. Bleibt als Ausblick dokumentiert, nicht als offene Aufgabe.

## Konsequenzen
- Positiv: erfüllt die zugesagte vierte Kennzahl vollständig, inklusive einer echten (nicht nur behaupteten) On-Device-Garantie für die optionale Transkription – `processLocally` aus ADR-0002 hat jetzt einen konkreten, verifizierten Mechanismus statt reiner Absicht.
- Negativ/Risiken: Füllwort-Erkennung funktioniert nur in Chromium-Browsern mit dieser experimentellen API; die Füllwortliste ist unvalidiert und überschätzt systematisch; die Rauschboden-Schätzung hat eine dokumentierte Schwäche bei sehr flüssigem Sprechen.
- Würde uns zwingen zu revidieren: falls sich in weiteren Browsern zeigt, dass `SpeechRecognition.available()` nicht verlässlich `processLocally` respektiert (z. B. heimlich doch an einen Server sendet) – dann müsste die gesamte Füllwort-Erkennung entfernt oder durch eine WASM-Lösung ersetzt werden.

## Nachtrag 2026-10-21 – Schwellenlogik versagte bei fließendem Sprechen; Transkript-Lebensdauer präzisiert

**Fehler.** Die oben beschriebene Rauschboden-Schätzung (10. Perzentil der gesamten Aufnahme, Sprechschwelle = 3 × Rauschboden) setzt voraus, dass mindestens 10 % der Aufnahme still sind. Wer die ganze Antwort über spricht, hat ein Perzentil auf Sprechpegel; die Schwelle liegt dann über fast allem Gesprochenen. Im manuellen Test mit echtem Mikrofon und bewusst flüssigem Sprechen kam der Redefluss deshalb auf 4–12 % (längste Pause 6–19 s), bei sehr gleichmäßiger Lautstärke sogar auf "keine Daten". Die Grenze "nahezu pausenloses Sprechen" (siehe oben) war kein Randfall, sondern der Normalfall; die Unit-Tests hatten sie als bekannte Einschränkung festgeschrieben, statt sie zu prüfen.

**Neue Methode (test-first, `domain/redefluss.ts`):**
- Rauschboden = 10. Perzentil, Sprechpegel = 90. Perzentil; die Schwelle liegt in der logarithmischen Mitte zwischen beiden.
- Ist der Abstand zu klein (Sprechpegel/Rauschboden < 2,5), gilt die Aufnahme als *durchgehend gesprochen*; liegt schon der Sprechpegel unter einem Mindestpegel (0,008), gilt sie als *Stille* ("keine Daten").
- Lücken unter 0,8 s zwischen sprechenden Frames zählen als Sprechen (Wort- und Atemlücken), erst längere als Pause.
- Das Messfenster des Pegels wurde von 2048 auf 8192 Samples vergrößert (~170 ms statt 43 ms bei 200-ms-Raster), damit eine Wortlücke nicht zufällig die ganze Stichprobe bestimmt.
- Das Debug-Overlay zeigt Pegel, Rauschboden, Sprechpegel, Schwelle und Status live zur Kalibrierung.
Bestätigt im selben Test: flüssiges Sprechen 83–88 %, Stocken 58 %, 20 s Schweigen "keine Daten". Nicht bestätigt: der Mindestpegel passt zu anderen Mikrofonen; alle Konstanten bleiben eigene Einschätzungen.

**Neue Grenze.** Eine konstant laute Umgebung ohne Sprechen (z. B. Lüfter) hat keinen Pegelabstand und wird als durchgehend gesprochen gewertet. Die Füllwort-Erkennung liefert in der Praxis zudem zu niedrige Raten: die Browser-Erkennung lässt "äh/ähm" oft weg.

**Korrektur zur Transkript-Lebensdauer.** Oben steht, das Transkript verlasse `ergaenzeRedefluss()` nie. Genauer: Es liegt als `FragenErgebnis.transkript` im React-State, solange Interview und Auswertung offen sind, und wird ausschließlich von `ergaenzeRedefluss()` gelesen (aufgerufen aus `AuswertungScreen` und `aggregiereSession`). Es wird nicht persistiert, nicht geloggt und nicht ans Backend gesendet – das Backend hat dafür kein Feld.


## Nachtrag 2026-11-02 – `processLocally` fehlte auf der Erkennungs-Instanz; Garantie jetzt wirklich gesetzt

**Fehler.** Oben steht, die optionale Füllwort-Erkennung habe "eine echte (nicht nur behauptete) On-Device-Garantie". Das stimmte nicht. `processLocally: true` wurde nur an `SpeechRecognition.available()` und `install()` übergeben; diese beiden prüfen bzw. laden lediglich das lokale Sprachpaket. Ob die laufende Erkennung lokal arbeitet, entscheidet die Property `processLocally` auf der `SpeechRecognition`-Instanz, deren Default die Server-Erkennung ist. Die Instanz bekam nur `lang` und `continuous`. Mit installiertem Sprachpaket konnte das Mikrofon-Audio also trotzdem an einen Server gehen. Aufgefallen ist das beim Gegenprüfen einer Folienaussage ("Video und Ton bleiben auf dem Gerät") gegen den Code; die Unit-Tests hatten es nicht abgedeckt, weil der Mock die Property nie kannte.

**Fix (test-first, `useFuellwortErkennung.ts`).**
- `processLocally = true` wird auf jeder Instanz gesetzt, bevor `start()` läuft.
- Liest der Browser den Wert danach nicht als `true` zurück (Zuweisung ignoriert), startet die Erkennung nicht und der Status wird `unavailable`. Das Feature ist dann aus, statt unbemerkt auf Server-Erkennung zu fallen. Das setzt die feste Entscheidung "nur mit `processLocally`, sonst ist das Feature aus" erst tatsächlich um.
- Zwei Regressionstests: `processLocally` ist beim `start()`-Aufruf gesetzt; bei ignorierter Property wird nicht gestartet.

**Verifikation.** Manueller Test in Chrome mit ausgeschaltetem WLAN: Eine Antwort wurde offline gesprochen, die App erzeugte ein Transkript und eine Füllwortrate (4,4 pro Minute). Eine Server-Erkennung hätte ohne Netz abgebrochen. Grenzen: ein einzelner Lauf, ein Browser; ein Vergleichslauf mit dem alten Stand wurde nicht gemacht.

**Konsequenz.** Die Aussage "Video und Ton bleiben auf dem Gerät" gilt jetzt auch bei aktiver Füllwort-Erkennung, solange der Browser `processLocally` unterstützt. In allen anderen Browsern ist das Feature aus.
