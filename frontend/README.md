# Interview-Trainer

Webanwendung zur Vorbereitung auf Bewerbungsgespräche: Interviewfragen vor der Kamera beantworten, Feedback zu Blickkontakt, Haltung, Bewegungsruhe und Redefluss erhalten.

Studienprojekt `DLBSEPPSD01_D`, Aufgabenstellung 2 (Webanwendung).

## Setup

```
npm install
npm run fetch-models   # einmalig: laedt MediaPipe-Modelle/WASM, siehe ADR-0004
npm run dev
npm run test
```

Kamera-Analyse (MediaPipe im Web Worker) funktioniert nur mit `npm run build && npm run preview`, nicht mit `npm run dev` (bekannter Vite-Dev-Server-Bug mit klassischen Workern, siehe ADR-0004).
