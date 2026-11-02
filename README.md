# Interview-Trainer

Webanwendung zur Vorbereitung auf Bewerbungsgespräche: Berufsfeld wählen, typische Interviewfragen vor der Kamera beantworten und danach eine Auswertung zu **Kopfausrichtung, Haltung, Bewegung und Redefluss** erhalten – jeweils mit Erläuterung, wie der Wert zustande kommt. Die Auswertung ist eine Trainingshilfe, keine Eignungsbewertung.

Studienprojekt (IU, Projekt: Software Development, Aufgabenstellung 2 – Webanwendung).

## Prinzipien
- **Regelbasierte Bewertung, kein LLM zur Laufzeit.** Die Kennzahlen sind reproduzierbar und testbar. Ein Sprachmodell wurde nur einmalig vorab genutzt, um die Fragenkataloge zu erzeugen.
- **Analyse im Browser.** Video und Ton werden lokal ausgewertet (MediaPipe im Web Worker, Web Audio). Ans Backend gehen ausschließlich aggregierte Kennzahlen, nie Video oder Audio.
- **Keine Registrierung.** Der Verlauf hängt an einem anonymen Token im Browser; Export und Löschen der eigenen Daten sind in der Oberfläche möglich.
- **Transkription nur lokal und nur auf Wunsch.** Die optionale Füllwort-Erkennung nutzt die Spracherkennung des Browsers mit `processLocally` (aktuell Chrome).
- **Ehrlich über Grenzen.** Alle Zielbereiche sind Orientierungswerte aus eigenen Tests und nicht wissenschaftlich validiert. Das steht in der Oberfläche und in den Entscheidungsdokumenten.

## Stack
React, TypeScript, Vite (SPA) · MediaPipe Tasks Vision im Web Worker · Node und Fastify (Backend) · Prisma mit SQLite · Vitest · SCSS-Module

## Starten
Voraussetzung: aktuelles Node.js (LTS) und Chrome.

```bash
# Backend (legt beim Installieren .env an und migriert die Datenbank)
cd backend
npm install
npm run dev            # http://localhost:3001

# Frontend (zweites Terminal)
cd frontend
npm install
npm run fetch-models   # lädt die MediaPipe-Modelle einmalig und prüft ihre Prüfsummen
npm run build
npm run preview        # http://localhost:4173
```

Für alles mit Kamera bitte `build` und `preview` verwenden und nicht `npm run dev`: der Vite-Dev-Server liefert den klassischen Web Worker von MediaPipe nicht korrekt aus (siehe `docs/decisions/0004-worker-topologie-bildanalyse.md`).

## Tests und Prüfungen
```bash
cd backend && npm run lint && npm run typecheck && npm test
cd frontend && npm run lint && npm run typecheck && npm test
```
Das Frontend enthält neben Unit- und Komponententests einen Integrationstest, der einen echten Server gegen eine isolierte SQLite-Datei startet und die Verlaufs-Persistenz Ende zu Ende prüft.

## Aufbau
```
frontend/   React-SPA: Screens, Kennzahlen-Logik (src/domain), Kamera- und Audioanalyse (src/media)
backend/    Fastify-API: Fragenkataloge, Verlaufs-Persistenz mit Prisma
scripts/    Hilfsskripte (Modell-Download)
docs/       journal.md (Prozess), decisions/ (Architekturentscheidungen als ADR)
```

## Dokumentation
- `docs/decisions/` – Architekturentscheidungen mit Alternativen, Konsequenzen und Revisionsbedingungen
- `docs/journal.md` – Prozessjournal: Entscheidungen, Probleme und Befunde in zeitlicher Reihenfolge, inklusive dessen, was falsch war und korrigiert wurde

## Hinweis zur Entwicklung
Teile des Projekts wurden mit Unterstützung eines KI-Programmierassistenten (Claude Code) entwickelt. Anforderungen, Entscheidungen, Reviews und Tests liegen beim Autor; der Einsatz ist im Journal nachvollziehbar.
