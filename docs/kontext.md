# Interview-Trainer – Projektkontext

Studienprojekt im Rahmen von `DLBSEPPSD01_D` (Projekt: Software Development), Aufgabenstellung 2 (Webanwendung inkl. Backend).

## Produktidee

Webanwendung zur Vorbereitung auf Bewerbungsgespräche: Nutzer:innen wählen ein Berufsfeld, beantworten typische Interviewfragen vor der Kamera und erhalten danach eine Auswertung zu Blickkontakt, Körperhaltung, Bewegungsruhe und Redefluss – jeweils mit Erläuterung, wie der Wert zustande kommt. Fragenkataloge sind je Berufsfeld wählbar/erweiterbar, Start mit technischen Rollen; die Analyse selbst ist berufsfeldunabhängig. Das Feedback ist Trainingshilfe, keine Eignungsbewertung.

## Stack

- Frontend: React, TypeScript, Vite (SPA)
- Bilderkennung: MediaPipe Tasks Vision, ausgeführt in einem Web Worker (clientseitige Analyse aus dem Kamerabild)
- Backend: Node.js mit Fastify
- Datenhaltung: Prisma mit SQLite
- Tests: Vitest, Playwright
- CI: GitHub Actions

## Feste fachliche Entscheidungen

- Bewertung ist regelbasiert, kein Sprachmodell zur Laufzeit – Begründung: Reproduzierbarkeit und Testbarkeit der Auswertung.
- Anonymes Session-Token, keine Registrierung.
- Analyse läuft clientseitig; ans Backend gehen nur aggregierte Kennzahlen, nie Video- oder Audiodaten.
- Transkription (Füllwort-Erkennung) nur mit lokaler Verarbeitung im Browser, sonst ist das Feature deaktiviert.
- Die Kennzahl heißt "Redefluss", nicht "Sprechtempo".

## Frontend-Konventionen

- **Co-Location**: eine Komponente = ein Ordner unter `src/components/<Name>/` mit `<Name>.tsx`, `<Name>.module.scss` und `<Name>.test.tsx`.
- **Design-Tokens**: Farben, Abstände und Schriftgrößen liegen zentral in `src/styles/tokens.scss`. Keine harten Werte in einzelnen Komponenten.
- **Kommentare**: nur dort, wo der Code das Warum nicht selbst zeigt. Keine beschreibenden Kommentare über selbsterklärendem Code.
- **TypeScript**: strict-Modus, zusätzlich `noUncheckedIndexedAccess`.
- **Keine Komponenten auf Vorrat**: Extraktion in eine geteilte Komponente erst beim zweiten echten Vorkommen. Einzige Ausnahme: der Metrik-Balken mit Zielbereich, der pro Auswertungsseite mehrfach vorkommt und daher von Anfang an als geteilte Komponente angelegt wird.
- **Design-Ausgangspunkt**: ein bestehender Klickdummy diente als visuelle Referenz (warmes Off-White, Sage-Grün als Akzentfarbe, durchgängig pillenförmige Buttons/Chips/Tabs, kartenbasiertes Layout) – als Werte in `src/styles/tokens.scss` hinterlegt.

## Pflichtanforderungen der Aufgabenstellung (paraphrasiert)

- SPA mit modernem Web-Framework (React)
- Kernfunktionalität durch Unit-/Integrationstests abgedeckt
- Code und Backend dokumentiert und getestet
- Schriftliches Konzept: Komponenten und deren Beziehungen, Wireframes, Softwarearchitektur (UML oder C4-Modell), Backend in der Gesamtarchitektur
- Gewähltes Vorgehensmodell explizit begründet
- Implementierung an konkreten Code-Auszügen erläutert (Navigation, Dateneingabe/-verarbeitung, Datenstrukturen)
- Kritische Evaluation am Ende: Zielerreichung, Verbesserungspotenzial, Lessons Learned, persönliche Entwicklung, positiv/negativ Erlebtes
- Vollständiger Code auf GitHub veröffentlicht, Link auf der Titelfolie der Präsentation
- Personenbezogene und unternehmensbezogene Daten werden grundsätzlich anonymisiert
