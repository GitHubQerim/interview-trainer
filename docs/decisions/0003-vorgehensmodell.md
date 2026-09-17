# 0003 – Vorgehensmodell: angepasstes Scrum mit kurzen, slice-basierten Iterationen
Datum: 2026-09-16 | Status: accepted

## Kontext
Die Aufgabenstellung verlangt explizit die Wahl und Begründung eines Vorgehensmodells zur Organisation der Entwicklungsphase. Rahmenbedingungen: ein One-Man-Team (keine getrennten Rollen PO/SM/Dev möglich), begrenzte Zeit bis zur Bongo-Abgabe im Oktober 2026, und ein technisches Kernrisiko (MediaPipe Tasks Vision im Web Worker – bisher nicht erprobt), das früh validiert werden sollte statt am Ende überrascht zu werden.

## Optionen
1. **Klassisches Wasserfall** – vollständiges Konzept vor jeder Codezeile. Vorteil: einfach im Vorfeld zu dokumentieren. Nachteil: keine Anpassung, wenn sich das MediaPipe-Risiko als größer herausstellt als gedacht; liefert kaum Stoff für die geforderte laufende Prozessreflexion.
2. **Klassisches Scrum (2-Wochen-Sprints, getrennte Rollen, volle Zeremonien)** – Rollen-Trennung ergibt in einem Solo-Projekt keinen echten Mehrwert (Planning/Review/Retro mit sich selbst sind Ritual ohne Funktion), 2 Wochen sind bei ~4–5 Wochen Gesamtzeit bis Oktober zu grob getaktet, um früh gegenzusteuern.
3. **Scrum-Kernartefakte, angepasst ans Solo-Team, 1-Wochen-Sprints statt 2** – Backlog aus der Mindestanforderungs-Checkliste (`docs/journal-kontext.md`) abgeleitet, Sprint-Ziel pro Woche, DoD-Check + kurze Retro am Sprintende (bereits als Arbeitsweise-Regel in `CLAUDE.md` festgehalten), Rollen fallen zusammen, aber Timeboxing und Reflexionsdisziplin bleiben.
4. **Wie 3, aber Zeitbox verkürzt und am Feature-Slice statt am Kalender ausgerichtet (2–3 Tage statt 1 Woche)** – der einzige verbleibende Zweck einer Zeitbox in einem Solo-Team ist der Reflexions-Checkpoint fürs Journal, kein Team-Sync. Eine feste Wochenbox ist damit willkürlich; eine Box, die endet, wenn ein zusammenhängendes Feature (Slice) fertig ist, liefert genauso regelmäßig Reflexionsstoff, ohne Leerlauf-Zeremonien an Tagen ohne echten Meilenstein.

## Entscheidung
Wir wählen Option 4: angepasstes Scrum mit kurzen, slice-basierten Iterationen (2–3 Tage je Slice) statt fixer Wochen-Sprints, weil in einem Solo-Team die Team-Synchronisation wegfällt, die eine Kalenderbox sonst rechtfertigt – die kürzere, am Feature-Slice orientierte Taktung gibt trotzdem häufig Gelegenheit zum Gegensteuern (v.a. beim MediaPipe-Risiko im ersten Slice) und liefert bei Abschluss jedes Slices Rohmaterial für die geforderte Prozess- und Reflexionsbewertung.

## Konsequenzen
- Positiv: erfüllt die Aufgabenstellungs-Pflicht (Vorgehensmodell gewählt und begründet); liefert laufend Belege für die Bewertungskriterien "Prozess" und "Kritische Reflexion" (je 15 %) statt sie am Ende rekonstruieren zu müssen; früh sichtbarer Fortschritt bei knapper Zeit bis zur Abgabe.
- Negativ/Risiken: ohne echtes Team fehlt eine unabhängige zweite Meinung bei Review/Retro – teilweise kompensiert durch die `code-reviewer`/`architecture-reviewer`-Subagenten als externe Prüfinstanz. Häufige Slice-Retros erzeugen Overhead, wenn sie zu formal betrieben werden – DoD-Check und Retro bewusst kurz halten (kein Zeremonien-Overkill).
- Was würde uns zwingen zu revidieren: falls sich in Slice 1 zeigt, dass das MediaPipe-Risiko deutlich mehr Zeit frisst als geplant – dann Scope kürzen (z. B. Berufsfelder auf eines reduzieren) statt Slice-Länge zu strecken, und das begründet in der Retro/im Journal festhalten.

## Zeitrahmen und Slice-Backlog (bestätigt 2026-09-17)
Zielabgabe 30.09.2026, Ausweichtermin erste Oktoberwoche – ergibt ~13–20 Tage ab 17.09.2026. Für Solo-Entwicklung inkl. Backend, ML-Integration, Tests, Doku und Präsentation ist das eng; realistischer liegt das Ergebnis näher am Ausweichtermin als am 30.09.

1. MediaPipe/Web-Worker-Spike (Kamera-Permission, Face/Pose-Landmarks im Worker, Nachrichtenprotokoll) – 2–3 Tage, Risiko zuerst
2. Fragenkatalog (inkl. minimalem Fastify-Endpoint `GET /api/fragen`) + Setup-Screen (Beruf/Schwierigkeit/Modus) – 2 Tage
3. Interview-Flow (Fragen-Sequenz, Timer, Live-Kamera + Worker-Anbindung) – 2–3 Tage
4. Scoring-Kernlogik (`features.ts`/`score.ts`, regelbasiert, test-first) – 2 Tage
5. Auswertungsseite (Metrik-Balken-Komponente mit Zielkorridor, Transkript-Highlighting) – 2 Tage
6. Backend-Ausbau (Prisma, anonymes Token, aggregierte Kennzahlen, Export/Löschen, Modelle/WASM selbst hosten statt CDN – siehe ADR-0004) – der Fastify-Server existiert schon seit Slice 2, wird hier erweitert, nicht neu aufgesetzt – 2 Tage
7. Verlauf-Screen + Ende-zu-Ende-Integration – 1–2 Tage
8. Schriftliches Konzept fertigstellen (Wireframes, Architektur-Diagramm, kritische Evaluation) + Präsentation – 3–4 Tage, teils parallel zu 6–7

Fallback bleibt wie oben festgehalten: falls Slice 1 (MediaPipe) deutlich mehr Zeit frisst als geplant, Berufsfelder auf eines reduzieren statt Zeit zu strecken – Entscheidung dann im Journal begründen.
