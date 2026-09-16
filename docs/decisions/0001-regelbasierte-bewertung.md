# 0001 – Regelbasierte Bewertung statt LLM zur Laufzeit
Datum: 2026-09-16 | Status: accepted

## Kontext
MediaPipe liefert aus dem Kamerabild Gesichts- und Körperpunkte (clientseitig, im Web Worker). Daraus müssen die Kennzahlen Blickkontakt, Körperhaltung, Bewegungsruhe und Redefluss zu einem nachvollziehbaren Feedback verdichtet werden. Die Bewertung ist Kern der Prüfungsleistung – muss also reproduzierbar sein und mit Testdaten geprüft werden können.

## Optionen
1. **LLM bewertet die Rohdaten zur Laufzeit** – flexibel bei neuen/unscharfen Kennzahlen, kann Erläuterungstext direkt mitformulieren. Nachteil: bei gleicher Eingabe nicht reproduzierbar, schwer mit Testdaten (Vitest) prüfbar, zusätzliche Latenz/Kosten, schwerer zu erklären warum ein Wert zustande kam.
2. **Feste, dokumentierte Regeln pro Kennzahl** (Schwellwerte/Formeln auf Basis der MediaPipe-Landmarks) – deterministisch, test-first entwickelbar, Erläuterungstext ist direkt aus der Regel ableitbar. Nachteil: neue Kennzahlen brauchen manuellen Regelentwurf statt Prompt-Anpassung, weniger "intelligent" bei Grenzfällen.
3. **Nichts tun / MediaPipe-Rohwerte direkt anzeigen** – keine Aggregation, keine Konsistenz zwischen Kennzahlen, für Nutzer:innen nicht interpretierbar. Scheidet aus.

## Entscheidung
Wir wählen Option 2. Ein LLM wird ausschließlich einmalig und offline zur Erstellung der Fragenkataloge genutzt, nie zur Laufzeit-Bewertung.

## Konsequenzen
- Positiv: Score-Logik (`score.ts`) ist deterministisch, test-first entwickelbar, Ergebnis bei gleicher Eingabe immer gleich – Voraussetzung für die Aufgabenstellungs-Anforderung "Kernfunktionalitäten durch Tests abgedeckt".
- Negativ/Risiken: Regeln müssen bei neuen Erkenntnissen manuell nachgeschärft werden; ggf. weniger nuanciert als ein Modell bei Grenzfällen.
- Würde uns zwingen zu revidieren: wenn sich zeigt, dass regelbasierte Schwellwerte bei realen Testnutzer:innen systematisch falsch liegen und sich nicht durch weitere Regeln beheben lassen – dann begründete Abweichung in der kritischen Reflexion dokumentieren (siehe Zusage an die Modulbetreuung, Details `docs/private/betreuung.md`).

## Junior-Schutz-Fragen
- **10x mehr Nutzer/Daten?** Unkritisch – Bewertung läuft clientseitig pro Session, keine zentrale Rechenlast.
- **User-Löschung (DSGVO)?** Betrifft primär ADR 0002 (keine Registrierung, anonymes Token) – für die Scoring-Logik selbst keine Datenhaltung, kein Löschproblem.
- **Migration falls falsch?** Regeln liegen isoliert in `score.ts`/`features.ts`, austauschbar ohne API-Bruch, solange die Kennzahl-Namen (z.B. "Redefluss") stabil bleiben.
- **Löst die einfachste Option das Problem?** Ja – das ist der Grund für die Wahl; die "aufwendigere" Option (LLM) wurde bewusst verworfen, nicht die einfache übersehen.
