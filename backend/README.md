# Backend

Fastify-Server für den Interview-Trainer. Aktuell nur der Fragenkatalog-Endpoint; Token, Persistenz, Export/Löschen und Modell-Hosting folgen in einem eigenen Schritt.

## Setup

```
npm install
npm run dev
npm run test
```

## Endpoints

- `GET /api/fragen?beruf=&schwierigkeit=` – liefert die Interviewfragen für einen Beruf und eine Schwierigkeitsstufe (`leicht`/`mittel`/`hart`). Unbekannte Berufe liefern eine leere Liste.
