# 0004 – Worker-Topologie für die Bildanalyse
Datum: 2026-09-17 | Status: accepted

## Kontext
Slice 1 (siehe ADR-0003, `docs/journal.md` 2026-09-17) sollte klären, ob MediaPipe Tasks Vision (FaceLandmarker + PoseLandmarker) technisch in einem Web Worker läuft. Der Spike war erfolgreich und hat dabei konkrete, bindende Rahmenbedingungen für alle folgenden Slices offengelegt.

## Entscheidungen

**Ein Worker für beide Modelle, sequenziell pro Frame.** Face- und Pose-Erkennung laufen in einem einzigen Worker statt in zwei getrennten. Begründung: einfacher zu debuggen, und die gemessene Verarbeitungsdauer (~25 ms für beide zusammen) macht ein Aufsplitten überflüssig – die Grenze liegt woanders (siehe unten).

**Klassischer Worker, kein Module-Worker.** `@mediapipe/tasks-vision` lädt seine WASM-Glue per `importScripts()`, das ist in einem Module-Worker (`{ type: 'module' }`) nicht verfügbar und führt zu `ModuleFactory not set.`. Der Worker wird deshalb ohne `type: 'module'` erzeugt; Vite bündelt die TS-`import`-Syntax im Produktions-Build trotzdem korrekt zu einem einzelnen klassischen Skript.

**Bekannte Einschränkung: Dev-Server vs. Produktions-Build.** Vite hat einen bekannten, offenen Bug (vitejs/vite#8470, #7019): im Dev-Modus injiziert Vite selbst einen `import` in klassische Worker (für sein Env-Shim), was der Browser mit `Cannot use import statement outside a module` ablehnt. Der Produktions-Build ist nicht betroffen. Konsequenz: solange dieser Vite-Bug offen ist, wird an diesem Feature mit `npm run build && npm run preview` statt `npm run dev` manuell getestet. Das ist eine reine Test-Workflow-Einschränkung, keine Architektur-Schwäche.

**GPU-Delegate ist der Default, funktioniert ohne Sonderbehandlung.** Kein Fallback auf CPU nötig – das im ADR-0003-Risiko befürchtete Problem ist nicht aufgetreten.

**Empfohlenes Throttle-Intervall für kommende Slices: 60–120 ms (8–16 fps).** Gemessene Werte:

| Throttle | Verarbeitungsrate | Dauer/Frame |
|---|---|---|
| 120 ms | 8,0 fps | 25–35 ms |
| 60 ms | 16,0 fps | 25,6 ms |
| 33 ms | 22,0 fps (statt der angefragten ~30 fps) | 25,0 ms |

Die reine Inferenz kostet stabil ~25 ms/Frame; bei 33 ms Throttle wird die angefragte Rate (~30 fps) nicht erreicht, weil der Flaschenhals in Bildaufnahme/Message-Passing liegt, nicht in der Modell-Inferenz. Da Interviewantworten keine schnellen Bewegungen sind, reichen 8–16 fps für die Scoring-Kernlogik (Slice 4) aus – kein Grund, in Richtung 30 fps zu optimieren oder die Pipeline (z. B. durch zwei parallele Worker) weiter zu beschleunigen.

**Bindende Vorgabe für Slice 4 (Scoring-Kernlogik): Zeitfenster in Sekunden, nicht in Frames.** Die Framerate ist nicht fix (8–16 fps, geräteabhängig) und wird es auch später nicht sein. Für zeitfensterbasierte Kennzahlen – v. a. Bewegungsruhe, die Varianz über ein Fenster misst – muss das Fenster als Zeitspanne (z. B. "letzte 3 Sekunden") definiert werden, nie als feste Frame-Anzahl (z. B. "letzte 30 Frames"). Bei 8 fps sind 30 Frames fast 4 Sekunden, bei 16 fps 2 Sekunden – eine frame-basierte Fenstergröße wäre zwischen Geräten nicht vergleichbar und würde die Kennzahl an die zufällige tatsächliche Framerate koppeln.

**Vertagt, aber mit festem Termin – kein "irgendwann":** Modelle/WASM laufen aktuell vom offiziellen CDN (`storage.googleapis.com`, `cdn.jsdelivr.net`). Das ist mehr als ein Offline-Robustheits-Thema: bei jedem Start fließt die IP-Adresse der Nutzer:innen an Google, ein Datenabfluss an einen Dritten, den die Datenschutz-ADR (0002) für die eigentliche Analyse bewusst ausschließt (auch wenn es dort nur um Video/Audio ging, nicht um Asset-Requests). Selbst-Hosten der `.task`-Modelle und der WASM-Dateien unter `public/models/` wird deshalb **in Slice 6** umgesetzt, vor der Veröffentlichung als öffentliches Repo – nicht optional, nicht "später mal schauen". Passt inhaltlich zu Slice 6, weil dort ohnehin Backend und Datenschutz-Routen entstehen und das Thema damit am Stück beisammenliegt.

## Konsequenzen
- Positiv: größtes technisches Risiko des Projekts ist früh und mit konkreten Zahlen validiert statt einer vagen Einschätzung; das Nachrichtenprotokoll (`protocol.ts`) und die Worker-Lifecycle-Logik aus dem Spike sind direkt Grundlage für Slice 3 (Interview-Flow) und Slice 4 (Scoring). Die Messtabelle ist zudem eigenständiges Belegmaterial für die kritische Reflexion und die Präsentation (Entscheidung auf Datenbasis statt Vermutung: die ursprüngliche Annahme war "die Inferenz ist der Flaschenhals", widerlegt durch die Messung).
- Negativ/Risiken: Der Vite-Dev-Server-Bug erzwingt einen Zusatzschritt (`build && preview`) für jede manuelle Verifikation an diesem Feature, bis Vite ihn behebt oder wir einen Workaround bauen – für den engen Zeitrahmen (ADR-0003) ein akzeptierter kleiner Reibungspunkt, kein Show-Stopper. Die CDN-Abhängigkeit ist ein offener Datenschutz-Punkt, bis Slice 6 die Modelle selbst hostet – bis dahin bewusst als bekanntes, terminiertes Risiko geführt, nicht verschwiegen.
- Was würde uns zwingen zu revidieren: falls ein späteres Vite-Update den Bug behebt, kann dieser Punkt aus der ADR gestrichen werden; falls sich in Slice 3/4 zeigt, dass 8–16 fps für ein Feature (z. B. Bewegungsruhe) doch zu grob sind, wird das dort neu bewertet statt hier vorab spekuliert.
