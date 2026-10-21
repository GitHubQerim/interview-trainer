# 0009 – Kameravorschau im Setup und Bereit-Phase vor jeder Frage
Datum: 2026-10-21 | Status: proposed (Entwurf zur Prüfung)

## Kontext
Ein Test mit echtem Interview-Ablauf zeigte zwei Probleme. (1) Nutzer:innen sehen sich erst im laufenden Interview und wissen vorher nicht, ob Kopf und Schultern im Bild sind. (2) Beim Klick auf "Nächste Frage" greift man zur Maus, lehnt sich vor und bewegt die Hand – diese Sekunden gehen in Haltung und Bewegung der nächsten Frage ein und verfälschen sie. ADR-0002 legte bisher fest, dass die Kamera erst mit dem Start der Session angeht.

## Entscheidung
**Kameravorschau im Setup.** Große Vorschau mit Overlay (Kopfumriss, Schulterlinie) und Live-Hinweisen (Kopf im Bild, Kopf zur Kamera, Schultern sichtbar, Abstand, Schulterneigung). Die Hinweise nutzen dieselben Features und Zielkorridore wie die Auswertung (`domain/kameraSetup.ts`), damit die Vorschau nie anders bewertet als das Ergebnis. Die Kamera geht **nur auf ausdrücklichen Klick** an; das **Mikrofon bleibt in der Vorschau aus** (`useAnalysisWorker(…, { mitTon: false })` fragt gar nicht erst Ton an). Beim Verlassen des Setups wird die Kamera freigegeben. Spiegelansicht (Standard an, nur Darstellung – die Analyse läuft auf dem Originalbild), Einstellung pro Browser in `localStorage`, gilt auch im Interview.

**Bereit-Phase.** Vor jeder Frage 3 Sekunden "Mach dich bereit" mit sichtbarer Frage; in dieser Zeit werden Video- und Audioframes verworfen und die Antwortzeit läuft noch nicht. Sie beginnt erst, wenn die Analyse bereit ist. "Sofort starten" und die Taste → überspringen sie; → wechselt später auch zur nächsten Frage, damit man sich dafür nicht zur Maus beugen muss. Bewusst nicht die Leertaste: sie würde fokussierte Buttons und Checkboxen auslösen.

## Alternativen
- Vorschau automatisch beim Öffnen des Setups: verworfen, widerspricht dem Opt-in aus ADR-0002.
- Mikrofon schon in der Vorschau (Pegelanzeige): verworfen, kein Nutzen für die Haltung und mehr Datenschutz-Fläche.
- Kalibrierungs-Baseline (neutrale Haltung messen und davon abziehen): vorerst nicht gebaut; die Bereit-Phase löst das akute Problem (Griff zur Maus) ohne zusätzliche, unvalidierte Rechnung.

## Konsequenzen
- Positiv: weniger verfälschte erste Sekunden; Nutzer:innen richten sich vor dem Interview ein; Datenschutz-Aussage bleibt prüfbar (Kamera nur auf Klick, nie Mikrofon in der Vorschau).
- Negativ/Risiken: 3 Sekunden mehr pro Frage; die Dauer ist eine eigene Einschätzung. Hinweise und Abstandskorridor (Schulterbreite 25–60 % der Bildbreite) sind nicht validiert. Die Vorschau zeigt nur, was die Kennzahlen messen – sie ist keine Aussage über den Gesamteindruck.
- Würde uns zwingen zu revidieren: falls Tests zeigen, dass die Bereit-Phase die Werte nicht verbessert oder Nutzer:innen sie als hinderlich empfinden.
