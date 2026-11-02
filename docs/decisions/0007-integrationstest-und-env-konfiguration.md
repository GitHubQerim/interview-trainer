# 0007 – Echter Integrationstest mit isolierter Test-Datenbank statt Playwright
Datum: 2026-09-20 | Status: accepted

## Kontext
Die Aufgabenstellung fordert "Kernfunktionalität durch Unit-/Integrationstests abgedeckt" – eine Pflicht, kein Nice-to-have. Bis Slice 7 gab es dafür nur Routen-Tests mit gemocktem Repository (`backend/src/routes/verlauf.test.ts`) – wertvoll für die HTTP-/Validierungsschicht, aber kein Beleg, dass Aggregation → HTTP → Datenbank → HTTP → Anzeige als Ganzes funktioniert. Der Stack nennt zusätzlich Playwright, das bis dahin nirgends im Repo verwendet wurde.

## Optionen
1. **Playwright-E2E-Test** (echter Browser, kompletter Klickpfad) – deckt die Playwright-Zusage sichtbar ab, bräuchte aber Kamera-/MediaPipe-Mocking im Browser und wäre für die verbleibende Zeit bis 30.09. unverhältnismäßig teuer, ohne die eigentliche Pflichtanforderung (Integrationstest) besser zu erfüllen als eine leichtere Alternative.
2. **Integrationstest ohne Browser**: echter Fastify-Server, echte SQLite-Datei, angesprochen über die tatsächlichen Frontend-Client-Funktionen (`speichereSession`/`ladeVerlauf`) statt eines Repository-Mocks – deckt die volle Kette ab, ohne Browser-Infrastruktur.
3. **Gar kein zusätzlicher Test** – die Pflichtanforderung wäre nicht erfüllt. Scheidet aus.

## Entscheidung
Wir wählen Option 2: `frontend/src/domain/verlaufApi.integration.test.ts` startet einen echten Backend-Server als Kindprozess und ruft die unveränderten Frontend-Client-Funktionen dagegen auf. **Playwright bleibt bewusst außerhalb des Scopes – das ist eine Grenze oberhalb der damit erfüllten Pflicht, keine Lücke darunter.** Ein zusätzlicher Browser-E2E-Test wäre eine freiwillige Erweiterung.

## Testisolation: `DATABASE_URL` env-konfigurierbar
In Slice 6 (ADR-0006) war eine literale `datasource url` in `schema.prisma` bewusst richtig – es gab nur eine Datenbank. Mit dem Integrationstest gibt es zwei: die Entwicklungsdatenbank (`dev.db`) und eine Testdatenbank. Ein Testlauf gegen `dev.db` hätte diese verschmutzt (liegengebliebene Zeilen bei Testabbruch) und wäre mit einem parallel laufenden `npm run dev` kollidiert (gleiche SQLite-Datei, gleichzeitiger Zugriff).

- `schema.prisma`: `url = "file:./dev.db"` → `url = env("DATABASE_URL")`.
- `backend/.env.example` (committed) dokumentiert den Default `DATABASE_URL="file:./dev.db"`; `backend/.env` ist gitignored und wird von `postinstall` automatisch daraus angelegt, falls sie fehlt (`{ test -f .env || cp .env.example .env; } && prisma generate && prisma migrate deploy` – die geschweifte Klammer gruppiert die OR-Bedingung explizit, damit sie nicht mit der nachfolgenden `&&`-Kette verschmilzt). Normale Entwicklung bleibt dadurch unverändert einfach.
- Der Integrationstest setzt `DATABASE_URL=file:./test.db` explizit beim Spawnen des Server-Kindprozesses, löscht `test.db` vorher und nach dem Lauf – vollständig isoliert von `dev.db`, unabhängig davon, ob parallel `npm run dev` läuft.
- `PORT` in `backend/src/server.ts` ebenfalls env-konfigurierbar (`Number(process.env.PORT) || 3001`), damit der Test-Server (Port 3099) nicht mit einem laufenden Dev-Server kollidiert.

## Konsequenzen
- Positiv: erfüllt die Pflichtanforderung mit einem Test, der echte Fehler findet, die Mocks nicht könnten (z. B. eine falsche Prisma-`select`-Projektion oder ein AJV-Schema, das nicht zum tatsächlich gespeicherten Format passt). Kein Repo-weiter Eingriff in die Browser-App nötig – der env-Umbau betrifft nur das Backend-Paket.
- Negativ/Risiken: der Integrationstest ist langsamer als die übrigen Vitest-Suiten (Prozess-Start, Netzwerk-Polling) und koppelt `frontend`s Testlauf erstmals an ein bereits eingerichtetes `backend/` (Prisma-Client generiert, Migrationen vorhanden) – dokumentiert in beiden READMEs und in der CI (`frontend`-Job installiert jetzt zusätzlich `backend/`-Dependencies).
- Was würde uns zwingen zu revidieren: falls der CI-Lauf zeigt, dass das Spawnen eines zweiten Node-Prozesses im `frontend`-Job unzuverlässig ist (Flakiness durch Timing), müsste der Integrationstest stattdessen einen bereits von CI vorab gestarteten, extern verwalteten Server ansprechen statt ihn selbst zu starten.
