# Backend

Fastify-Server für den Interview-Trainer: Fragenkatalog sowie Verlaufs-Persistenz (Prisma/SQLite) mit anonymem Session-Token.

## Setup

```
npm install   # legt .env aus .env.example an (falls noch keine vorhanden) und
              # fuehrt automatisch "prisma generate" + "prisma migrate deploy" aus (postinstall)
npm run dev
npm run test
```

`DATABASE_URL` (Standard: `file:./dev.db`) kommt aus `.env` (gitignored, aus `.env.example` kopiert). Für den Integrationstest im Frontend-Paket (`frontend/src/domain/verlaufApi.integration.test.ts`) wird eine eigene, isolierte SQLite-Datei (`test.db`) verwendet – nie `dev.db`.

Neue Migrationen während der Entwicklung: `npx prisma migrate dev --name <name>`.

## Endpoints

- `GET /api/fragen?beruf=&schwierigkeit=` – liefert die Interviewfragen für einen Beruf und eine Schwierigkeitsstufe (`leicht`/`mittel`/`hart`). Unbekannte Berufe liefern eine leere Liste.
- `POST /api/verlauf` – speichert die aggregierten Kennzahlen einer abgeschlossenen Session (`{ token, beruf, schwierigkeit, modus, ergebnisse: [...] }`, `token` muss ein UUID sein). Antwort: `{ id }`.
- `GET /api/verlauf?token=` – liefert alle gespeicherten Sessions für ein Token (dient auch als DSGVO-Export, siehe ADR-0006).
- `DELETE /api/verlauf?token=` – löscht alle Sessions für ein Token (DSGVO-Löschung, siehe ADR-0006).
