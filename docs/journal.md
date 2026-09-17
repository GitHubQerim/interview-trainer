## 2026-09-16 – Themenfreigabe durch die Modulbetreuung
Tags: [entscheidung]
Kriterium: [transfer|prozess]
- Was: Projektidee "Interview-Trainer" (Aufgabenstellung 2, Webanwendung) bei der Modulbetreuung eingereicht und freigegeben. Details/Wortlaut liegen lokal in `docs/private/betreuung.md` (nicht im Repo).
- Warum: Bewerbungsgespräche werden fachlich vorbereitet, aber das Gespräch/Auftreten selbst kaum geübt – Feedback zu Blickkontakt, Haltung, Bewegungsruhe, Redefluss soll das schließen.
- Rückfrage der Betreuung: wie erfolgt die Auswertung – per KI?
- Antwort/Begründung: Erkennung über vortrainiertes MediaPipe-Modell (Gesichts-/Körperpunkte), Bewertung selbst bewusst regelbasiert statt LLM-basiert, da ein Sprachmodell bei gleicher Eingabe nicht reproduzierbar wäre und sich nicht sauber mit Testdaten prüfen ließe. LLM wird nur einmalig vorab zur Erstellung der Fragenkataloge genutzt.
- Anforderung: deckt "Projekt-/Aufgabendefinition" (Bewertungskriterium Prüfungsleitfaden) und die Vorgabe, das Konzept vor Beginn zur Freigabe vorzulegen.

## 2026-09-16 – Vitest und CI im selben Schritt wie das Scaffold
Tags: [entscheidung]
Kriterium: [prozess]
- Was: Beim ersten Code-Commit (`frontend`-Scaffold mit Vite/React/TS) wurden Vitest und die GitHub-Actions-Pipeline nicht separat, sondern im selben Commit ergänzt.
- Warum: Die Aufgabenstellung fordert, dass Tests integraler Bestandteil aller Entwicklungsphasen sind – nicht nur nachträglich ergänzt. Ein grüner CI-Lauf ab dem ersten Push (Zeitstempel) ist der objektive Beleg dafür, statt einer nachträglichen Behauptung im Bericht.
- Wie: `.github/workflows/ci.yml` läuft bei jedem Push und führt Lint, Typecheck, Tests und Build aus. Lokal vor dem Commit einmal komplett grün durchlaufen lassen.
- Anforderung: deckt "Kernfunktionalitäten durch Unit-/Integrationstests abgedeckt" und stärkt das Bewertungskriterium "Prozess".

## 2026-09-17 – Vorgehensmodell von Wochen-Sprints auf slice-basierte Iterationen umgestellt
Tags: [entscheidung]
Kriterium: [prozess|reflexion]
- Was: ADR-0003 von `proposed` auf `accepted` gesetzt und von starren 1-Wochen-Sprints auf kurze, feature-slice-basierte Iterationen (2–3 Tage) umgestellt; Zielabgabe 30.09.2026 mit Ausweich auf die erste Oktoberwoche festgehalten, Slice-Backlog mit 8 Slices grob geschätzt.
- Warum: In einem Solo-Team entfällt der Hauptgrund für eine feste Kalenderbox (Team-Synchronisation) – eine Box, die mit einem fertigen Feature-Slice endet statt mit einem Wochentag, liefert genauso regelmäßig Reflexionsstoff, ohne Leerlauf-Zeremonien an Tagen ohne echten Meilenstein. Zusätzlich zeigte die grobe Zeitrechnung (~13–20 Tage verfügbar), dass der Gesamtscope eng wird – bewusst früh dokumentiert statt es am Ende zu entdecken.
- Anforderung: deckt "Vorgehensmodell gewählt und begründet"; die frühe, ehrliche Zeitabschätzung ist Rohmaterial für die kritische Evaluation am Ende (Zielerreichung/Verbesserungspotenzial).
