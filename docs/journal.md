## 2026-09-16 – Themenfreigabe durch die Modulbetreuung
Tags: [entscheidung]
Kriterium: [transfer|prozess]
- Was: Projektidee "Interview-Trainer" (Aufgabenstellung 2, Webanwendung) bei der Modulbetreuung eingereicht und freigegeben. Details/Wortlaut liegen lokal in `docs/private/betreuung.md` (nicht im Repo).
- Warum: Bewerbungsgespräche werden fachlich vorbereitet, aber das Gespräch/Auftreten selbst kaum geübt – Feedback zu Blickkontakt, Haltung, Bewegungsruhe, Redefluss soll das schließen.
- Rückfrage der Betreuung: wie erfolgt die Auswertung – per KI?
- Antwort/Begründung: Erkennung über vortrainiertes MediaPipe-Modell (Gesichts-/Körperpunkte), Bewertung selbst bewusst regelbasiert statt LLM-basiert, da ein Sprachmodell bei gleicher Eingabe nicht reproduzierbar wäre und sich nicht sauber mit Testdaten prüfen ließe. LLM wird nur einmalig vorab zur Erstellung der Fragenkataloge genutzt.
- Anforderung: deckt "Projekt-/Aufgabendefinition" (Bewertungskriterium Prüfungsleitfaden) und die Vorgabe, das Konzept vor Beginn zur Freigabe vorzulegen.
