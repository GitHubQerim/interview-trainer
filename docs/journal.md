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

## 2026-09-17 – Slice 1 (MediaPipe/Web-Worker-Spike): Ergebnis
Tags: [befund]
Kriterium: [prozess|kritische-reflexion]
- Was: FaceLandmarker + PoseLandmarker in einem Web Worker technisch verifiziert (Kamera-Zugriff, Worker-Init, Live-Erkennung, GPU-Delegate). Lief ohne Fehler.
- Zwei echte Probleme aufgetreten und gelöst, beide bekannte Tooling-Eigenheiten, kein MediaPipe-Bug:
  1. `ModuleFactory not set.` – `@mediapipe/tasks-vision` lädt seine WASM-Glue per `importScripts()`, das geht nur im klassischen Worker, nicht im Module-Worker. Fix: `new Worker(...)` ohne `{ type: 'module' }`.
  2. `Cannot use import statement outside a module` im Dev-Server – bekannter Vite-Bug (vitejs/vite#8470, #7019): Vite injiziert im Dev-Modus selbst einen Import ins Env-Shim eines klassischen Workers, den der Browser ablehnt. Der Production-Build ist nicht betroffen. Workaround: für dieses Feature gegen `npm run build && npm run preview` statt `npm run dev` testen.
- Messwerte (Face+Pose sequenziell, GPU-Delegate, PoseLandmarker "lite"):
  | Throttle | Verarbeitungsrate | Dauer/Frame |
  |---|---|---|
  | 120 ms | 8,0 fps | 25–35 ms |
  | 60 ms | 16,0 fps | 25,6 ms |
  | 33 ms | 22,0 fps (statt der angefragten ~30 fps) | 25,0 ms |
- Einordnung: Die reine Modell-Inferenz kostet stabil ~25 ms/Frame (rechnerisch bis zu ~40 fps möglich). Bei 33 ms Throttle (~30 fps angefragt) kommen aber nur 22 fps an – der Flaschenhals liegt nicht in der Erkennung selbst, sondern in Bildaufnahme/Message-Passing drumherum. Für die spätere Scoring-Kernlogik reichen 8–16 fps völlig aus (Interviewantworten sind keine schnellen Bewegungen), es besteht kein Grund, Richtung 30 fps zu optimieren.
- Anforderung: validiert das größte technische Risiko aus ADR-0003 früh (Slice-1-Ziel erreicht); liefert Rohmaterial für die kritische Evaluation (zwei echte Probleme + Lösung statt nur "hat funktioniert").

## 2026-09-17 – Slice 2: Fragenkatalog-Endpoint aus Slice 6 vorgezogen
Tags: [entscheidung]
Kriterium: [prozess]
- Was: Der Fragenkatalog liegt von Anfang an im Backend (minimaler Fastify-Server, `GET /api/fragen?beruf=&schwierigkeit=`) statt als lokales Frontend-Datenmodul. Das Frontend holt die Fragen per `fetch` über einen Vite-Dev-Proxy. Der Fastify-Server existiert damit schon seit Slice 2, nicht erst seit Slice 6 – ADR-0003-Backlogtext für Slice 2/6 entsprechend präzisiert.
- Warum: Der Fragenkatalog gehört fachlich ins Backend (Formale Anforderung "Backend in Gesamtarchitektur", `docs/kontext.md`). Ihn zunächst im Frontend zu bauen und in Slice 6 ins Backend zu verschieben, hätte doppelte Arbeit bedeutet. Keine eigene ADR dafür – das ist eine Planungsänderung (Reihenfolge), keine Architekturentscheidung mit abgewogenen Alternativen.
- Wie: CI bekam einen zweiten Job für `backend/` (Lint/Typecheck/Test/Build), damit Tests ab sofort für beide Pakete gelten, nicht nur fürs Frontend.
- Anforderung: vermeidet doppelte Arbeit, stärkt "Backend dokumentiert und getestet" schon ab Slice 2 statt erst ab Slice 6.

## 2026-09-18 – Slice 3 (Interview-Flow): Ergebnis und drei echte Bugs
Tags: [befund]
Kriterium: [prozess|kritische-reflexion]
- Was: Fragen-Sequenz mit Timer und Live-Kamera im Interview-Screen umgesetzt; Worker-Ergebnisse werden jetzt pro Frage als echte Landmark-Koordinaten gepuffert (nicht mehr nur Zählwerte), am Ende an `onFinished` übergeben – Slice 4 hat damit echte Daten zum Rechnen.
- Drei echte Bugs beim manuellen Testen gefunden, alle gefixt und der erste mit Regressionstest abgesichert:
  1. **Race Condition bei `start()`**: React StrictMode mountet Effects beim ersten Laden absichtlich doppelt (mount→cleanup→mount) – zwei überlappende Kamera/Worker-Starts liefen gegeneinander, Status blieb dauerhaft bei "wird vorbereitet" hängen. Fix: Generation-Counter in `useAnalysisWorker`, der überholte `start()`-Aufrufe an jedem Await-Punkt erkennt und deren Stream/Worker sauber wieder freigibt. Mit Test abgesichert (`useAnalysisWorker.test.ts`).
  2. **Dark Mode ließ Text verschwinden**: `index.css` setzte `color-scheme: light dark`, ohne dass eigene dunkle Farben definiert waren – der Browser füllte seinen eigenen dunklen Hintergrund, unser Text blieb dunkel-auf-dunkel. Fix: auf reines Hell-Theme committet (passend zum Klickdummy, der nie Dark Mode vorsah), `index.css` zu `index.scss` gemacht, um die Design-Tokens direkt zu nutzen statt Farben doppelt zu pflegen.
  3. **Eigene Vergesslichkeit**: den in ADR-0004/Slice-1-Journal bereits dokumentierten Vite-Dev-Server-Bug (klassischer Worker bricht im Dev-Modus) beim Testen von Slice 3 zunächst selbst vergessen und gegen `npm run dev` statt `npm run preview` getestet – dadurch sah der Fix aus Punkt 1 erst wie ein Fehlschlag aus. Zusätzlich fehlte der Proxy-Eintrag für den Preview-Server (`vite.config.ts` hatte nur `server.proxy`, nicht `preview.proxy`) – beides ergänzt, inkl. Kommentar im Code, der auf ADR-0004 verweist, damit das nicht wieder vergessen wird.
- Zusätzlich dokumentiert (keine ADR, siehe Slice 2 – Planungsdetail statt Architekturentscheidung): `getFragen` wird jetzt an zwei Stellen separat aufgerufen (Setup zeigt die Anzahl, Interview lädt die Liste erneut). Das hält nur, solange der Katalog deterministisch ist – bricht, sobald eine zufällige Fragenauswahl eingebaut wird, weil dann beide Aufrufe dieselbe Auswahl sehen müssten.
- Anforderung: liefert weiteres Rohmaterial für die kritische Evaluation – drei unterschiedliche Fehlerklassen (Concurrency-Bug, CSS/Theming-Annahme, eigene Vergesslichkeit trotz Dokumentation) in einem Slice, alle nachvollziehbar dokumentiert statt verschwiegen.

## 2026-09-18 – Slice 4 (Scoring-Kernlogik): Ergebnis
Tags: [entscheidung|befund]
Kriterium: [prozess|kritische-reflexion]
- Was: `features.ts`/`score.ts` berechnen aus den in Slice 3 gepufferten Frame-Daten pro Frage: Kopfausrichtung (%), Haltung (Median + zeitbasierter Verlauf), Bewegungsruhe (auf Schulterbreite und Sekunden normiert) und eine Abdeckungs-Kennzahl. Details und Alternativenabwägung in ADR-0005. Test-first, 18 Tests mit synthetischen Landmark-Daten, keine echte Kamera-Session nötig.
- Beim Review der ADR zwei fachliche Präzisierungen ergänzt (nicht vom Code betroffen, nur von der Begründung):
  1. Iris-Landmarks (468–477) sind nicht automatisch Teil der 478 Punkte – nur mit aktiviertem `refine_landmarks`. Der in Slice 1 gemessene Wert von 478 zeigt, dass das in unserer Worker-Konfiguration mitläuft; die ADR sagt jetzt "im aktuell konfigurierten Modell", nicht "im selben Modell", um nicht triviale Verfügbarkeit zu suggerieren.
  2. Der Ausschluss von Mimik-/Emotionsmetriken stand zunächst nur auf "fachlich heikel" – der eigentlich tragende Grund ist der EU AI Act, der Emotionserkennung in Arbeits- und Bildungskontexten als verbotene/hochriskante Praxis einordnet. Diese Abgrenzung ist die, die in der kritischen Reflexion der Präsentation gezogen werden soll (Anschluss an ADR-0002).
- Anforderung: deckt die im Konzept zugesagten Kennzahlen (regelbasiert, test-first, ADR-0001) ab; die EU-AI-Act-Einordnung liefert direktes Material für die kritische Evaluation/Reflexion am Ende.

## 2026-09-18 – Slice 5 (Auswertungsseite): Ergebnis, kein kombinierter Score, ein echter Formel-Bug per manuellem Test gefunden
Tags: [entscheidung|befund]
Kriterium: [prozess|kritische-reflexion]
- Was: Auswertungsseite mit `MetrikBalken`-Komponente (Zielkorridor-Skala, Textlabel zusätzlich zur Farbe wegen Rot-Grün-Schwäche, "So wurde das gemessen"-Detail) und Fragen-Tabs. Kein kombinierter "X von 100"-Score wie im Klickdummy – bewusste Vereinfachung, keine ADR: eine Gewichtung wäre eine dritte Schicht nicht validierter Zahlen auf den schon nicht validierten Einzelmetriken (ADR-0005), und ein Einzelwert liest sich als Eignungsurteil statt als Trainingshinweis, was der Produktidee widerspricht ("Feedback ist Trainingshilfe, keine Eignungsbewertung", `docs/kontext.md`).
- Manueller Test mit echter Kamera (3 Fragen, je ein bewusstes Verhalten für ~15–30 Sekunden) deckte einen echten Formel-Fehler auf, den die synthetischen Unit-Tests aus Slice 4 nicht hätten finden können: **Haltung reagierte kaum auf tatsächliches Lehnen** (30 Sekunden durchgehend deutlich schräg saß ergab nur 3,3°, weiterhin "im Zielbereich"). Ursache: die Formel nutzte den Winkel Hüfte→Schulter, aber bei typischer Webcam-Framing ist die Hüfte meist nicht im Bild – MediaPipe schätzt die Position dann aus Körper-Priors statt sie zu tracken. Fix: Formel auf reine Schulter-Neigung umgestellt (nur Landmarks 11/12), im selben manuellen Test mit derselben Bewegung ergab das 6,7°, korrekt "außerhalb". Mit neuen Tests abgesichert, ADR-0005 nachgetragen (`docs/decisions/0005-scoring-kernlogik.md`).
- Noch offen, nicht gefixt: Bewegungsruhe lag in allen drei manuellen Testfällen deutlich unter dem Zielkorridor (0,07–0,16 statt 0,15–0,45) – auch bei bewusst viel Bewegung. Vermutung: Aliasing bei der Sampling-Rate (~8 Bilder/Sekunde, 120 ms Throttle) – schnelles Wackeln zwischen zwei erfassten Frames kann wieder nahe der Ausgangsposition landen, was die gemessene Bewegung unterschätzt. Bewusst nicht jetzt behoben, da noch keine zweite Bestätigung/kein klarer Fix-Ansatz – wird vor Slice 6/7 nochmal angeschaut.
- Anforderung: die synthetischen Tests aus Slice 4 waren wertvoll (schnell, deterministisch), haben aber einen realen Framing-Effekt nicht abgedeckt, den nur ein Test mit echter Kamera zeigen konnte – gutes Beispiel für die kritische Evaluation, dass regelbasierte, unit-getestete Logik trotzdem gegen echte Daten validiert werden muss.
