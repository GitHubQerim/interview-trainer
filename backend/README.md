# Backend

Fastify-Server für den Interview-Trainer: Fragenkatalog sowie Verlaufs-Persistenz (Prisma/SQLite) mit anonymem Session-Token.

## Setup

```
npm install   # fuehrt automatisch "prisma generate" + "prisma migrate deploy" aus (postinstall)
npm run dev
npm run test
```

Neue Migrationen während der Entwicklung: `npx prisma migrate dev --name <name>`.

## Endpoints

- `GET /api/fragen?beruf=&schwierigkeit=` – liefert die Interviewfragen für einen Beruf und eine Schwierigkeitsstufe (`leicht`/`mittel`/`hart`). Unbekannte Berufe liefern eine leere Liste.
- `POST /api/verlauf` – speichert die aggregierten Kennzahlen einer abgeschlossenen Session (`{ token, beruf, schwierigkeit, modus, ergebnisse: [...] }`, `token` muss ein UUID sein). Antwort: `{ id }`.
- `GET /api/verlauf?token=` – liefert alle gespeicherten Sessions für ein Token (dient auch als DSGVO-Export, siehe ADR-0006).
- `DELETE /api/verlauf?token=` – löscht alle Sessions für ein Token (DSGVO-Löschung, siehe ADR-0006).
