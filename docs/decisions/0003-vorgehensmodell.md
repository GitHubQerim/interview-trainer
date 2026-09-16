# 0003 – Vorgehensmodell: angepasstes Scrum mit 1-Wochen-Sprints
Datum: 2026-09-16 | Status: proposed

## Kontext
Die Aufgabenstellung verlangt explizit die Wahl und Begründung eines Vorgehensmodells zur Organisation der Entwicklungsphase. Rahmenbedingungen: ein One-Man-Team (keine getrennten Rollen PO/SM/Dev möglich), begrenzte Zeit bis zur Bongo-Abgabe im Oktober 2026, und ein technisches Kernrisiko (MediaPipe Tasks Vision im Web Worker – bisher nicht erprobt), das früh validiert werden sollte statt am Ende überrascht zu werden.

## Optionen
1. **Klassisches Wasserfall** – vollständiges Konzept vor jeder Codezeile. Vorteil: einfach im Vorfeld zu dokumentieren. Nachteil: keine Anpassung, wenn sich das MediaPipe-Risiko als größer herausstellt als gedacht; liefert kaum Stoff für die geforderte laufende Prozessreflexion.
2. **Klassisches Scrum (2-Wochen-Sprints, getrennte Rollen, volle Zeremonien)** – Rollen-Trennung ergibt in einem Solo-Projekt keinen echten Mehrwert (Planning/Review/Retro mit sich selbst sind Ritual ohne Funktion), 2 Wochen sind bei ~4–5 Wochen Gesamtzeit bis Oktober zu grob getaktet, um früh gegenzusteuern.
3. **Scrum-Kernartefakte, angepasst ans Solo-Team, 1-Wochen-Sprints statt 2** – Backlog aus der Mindestanforderungs-Checkliste (`docs/journal-kontext.md`) abgeleitet, Sprint-Ziel pro Woche, DoD-Check + kurze Retro am Sprintende (bereits als Arbeitsweise-Regel in `CLAUDE.md` festgehalten), Rollen fallen zusammen, aber Timeboxing und Reflexionsdisziplin bleiben.

## Entscheidung
Wir wählen Option 3: angepasstes Scrum mit 1-Wochen-Sprints statt der sonst üblichen 2, weil die kürzere Taktung bei begrenzter Gesamtzeit häufiger Gelegenheit zum Gegensteuern gibt (v.a. beim MediaPipe-Risiko in Sprint 1) und weil jede Sprint-Retro direkt Rohmaterial für die geforderte Prozess- und Reflexionsbewertung liefert.

## Konsequenzen
- Positiv: erfüllt die Aufgabenstellungs-Pflicht (Vorgehensmodell gewählt und begründet); liefert laufend Belege für die Bewertungskriterien "Prozess" und "Kritische Reflexion" (je 15 %) statt sie am Ende rekonstruieren zu müssen; früh sichtbarer Fortschritt bei knapper Zeit bis zur Abgabe.
- Negativ/Risiken: ohne echtes Team fehlt eine unabhängige zweite Meinung bei Review/Retro – teilweise kompensiert durch die `code-reviewer`/`architecture-reviewer`-Subagenten als externe Prüfinstanz. Wöchentliche Sprints erzeugen Overhead, wenn sie zu formal betrieben werden – DoD-Check und Retro bewusst kurz halten (kein Zeremonien-Overkill).
- Was würde uns zwingen zu revidieren: falls sich in Sprint 1 zeigt, dass das MediaPipe-Risiko deutlich mehr Zeit frisst als geplant – dann Scope kürzen (z. B. Berufsfelder auf eines reduzieren) statt Sprint-Länge zu strecken, und das begründet in der Retro/im Journal festhalten.

## Offen – braucht Bestätigung
- Exaktes Abgabedatum (nur "Oktober 2026" bekannt) – bestimmt, ob 4 oder 5 Sprints realistisch sind.
- Sprint-Reihenfolge/-Inhalt siehe Vorschlag im Chat; nach Bestätigung hier nachtragen und Status auf `accepted` setzen.
