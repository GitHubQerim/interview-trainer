# Architektur des Interview-Trainers

Softwarearchitektur im C4-Stil (Kontext, Container, Komponenten) und als UML (Sequenz, Datenmodell). Die Diagramme sind Mermaid und werden von GitHub direkt gerendert. Sie beschreiben den Stand der Implementierung; Begründungen stehen in `docs/decisions/` (ADR-0001 bis ADR-0011).

## Ebene 1: Systemkontext

Wer nutzt das System, und womit hängt es zusammen?

```mermaid
flowchart LR
    nutzer(["Bewerber:in<br/>(übt ein Gespräch)"])
    system["<b>Interview-Trainer</b><br/>Webanwendung: Fragen, Analyse,<br/>Auswertung, Verlauf"]
    browser["Browser-Schnittstellen<br/>Kamera, Mikrofon,<br/>Spracherkennung auf dem Gerät"]
    ki["Eigene KI des Nutzers<br/>(außerhalb der App,<br/>vom Nutzer bedient)"]

    nutzer -->|"übt, liest Auswertung"| system
    system -->|"liest Bild und Ton lokal"| browser
    system -.->|"erzeugt Text zum Kopieren,<br/>liest Antwort zurück (manuell)"| ki
    nutzer -.->|"kopiert Text, fügt Antwort ein"| ki
```

Die Anwendung ruft **kein** Sprachmodell auf (ADR-0001). Die gestrichelten Linien sind Handlungen der Nutzer:in außerhalb der App (ADR-0011).

## Ebene 2: Container

Welche ausführbaren Bausteine gibt es, und was fließt zwischen ihnen?

```mermaid
flowchart LR
    nutzer(["Bewerber:in"])

    subgraph browser["Browser des Nutzers"]
        spa["<b>React-SPA</b><br/>TypeScript, Vite<br/>Screens, Kennzahlen-Logik"]
        worker["<b>Web Worker</b><br/>MediaPipe Tasks Vision<br/>Gesichts- und Körperpunkte"]
        audio["<b>Web Audio</b><br/>nur Lautstärke"]
        speicher[("localStorage<br/>anonymes Token,<br/>Spiegel-Einstellung")]
    end

    subgraph server["Server"]
        api["<b>Fastify-API</b><br/>Node.js<br/>Kataloge, Verlauf"]
        db[("SQLite<br/>über Prisma")]
    end

    nutzer --> spa
    spa <-->|"Frames, Punkte (Nachrichten)"| worker
    spa -->|"Lautstärkewerte"| audio
    spa --- speicher
    spa -->|"HTTP/JSON: nur Kennzahlen + Token"| api
    api --> db
```

Video und Ton verlassen den Browser nie; zum Server gehen nur aggregierte Kennzahlen und ein zufälliges Token (ADR-0002, ADR-0006).

## Ebene 3: Komponenten

### Frontend (React-SPA)

```mermaid
flowchart TB
    subgraph screens["Screens (components/)"]
        shell["AppShell<br/>Tab-Zustand, Session"]
        setup["SetupScreen<br/>+ KameraVorschau"]
        interview["InterviewScreen"]
        auswertung["AuswertungScreen<br/>+ FrageAuswertung, MetrikBalken"]
        ki["KiExportPanel"]
        verlauf["VerlaufScreen"]
        datenschutz["DatenschutzActions"]
    end

    subgraph media["Medien (media/)"]
        hook["useAnalysisWorker"]
        worker["analysis.worker<br/>(MediaPipe)"]
        vad["useRedeflussVad"]
        sprache["useFuellwortErkennung"]
    end

    subgraph domain["Fachlogik (domain/, ohne React)"]
        features["features, score<br/>Kopf, Haltung, Bewegung"]
        redefluss["redefluss<br/>Sprechanteil, Pausen"]
        hinweise["trainingshinweise,<br/>kameraSetup"]
        kilogik["kiPrompt, anonymisieren,<br/>kiAntwort"]
        api["verlaufApi, fragenkatalog,<br/>token"]
    end

    shell --> setup
    shell --> interview
    shell --> auswertung
    shell --> verlauf
    shell --> datenschutz
    auswertung --> ki
    interview --> hook
    interview --> vad
    interview --> sprache
    setup --> hook
    hook <--> worker
    interview --> features
    interview --> redefluss
    auswertung --> features
    auswertung --> redefluss
    auswertung --> hinweise
    setup --> hinweise
    ki --> kilogik
    shell --> api
    verlauf --> api
    datenschutz --> api
```

Die Fachlogik (`domain/`) kennt weder React noch den Browser und ist deshalb test-first mit synthetischen Daten entwickelt (ADR-0005).

### Backend (Fastify)

```mermaid
flowchart TB
    subgraph routes["Routen (routes/)"]
        fragen["GET /api/fragen"]
        berufe["GET /api/berufe"]
        verlaufRoute["POST, GET, DELETE /api/verlauf<br/>Token im Body bzw. in der Query,<br/>JSON-Schema-Validierung"]
    end
    katalog["domain/fragenkatalog<br/>Kataloge je Beruf"]
    typen["domain/verlauf<br/>Typen der Eingabe"]
    repo["db/verlaufRepository<br/>Prisma-Zugriff"]
    sqlite[("SQLite")]

    fragen --> katalog
    berufe --> katalog
    verlaufRoute --> typen
    verlaufRoute --> repo
    repo --> sqlite
```

## UML: Ablauf einer Übungssession

```mermaid
sequenceDiagram
    actor N as Nutzer:in
    participant S as SetupScreen
    participant A as AppShell
    participant I as InterviewScreen
    participant W as Web Worker
    participant D as Domain (score, redefluss)
    participant B as Backend

    N->>S: Beruf, Schwierigkeit, Modus wählen
    S->>B: GET /api/berufe, /api/fragen
    B-->>S: Berufe und Fragen
    N->>S: Interview starten
    S->>A: onStart(config)
    A->>I: Interview anzeigen
    loop je Frage
        I->>N: 3 s Bereit-Phase (keine Messung)
        loop alle ~120 ms
            I->>W: Bild
            W-->>I: Gesichts- und Körperpunkte
        end
        N->>I: Nächste Frage (Taste oder Klick)
    end
    I->>A: onFinished(Ergebnisse)
    A->>D: Kennzahlen berechnen
    D-->>A: Auswertung je Frage
    A-->>N: Auswertung anzeigen
    A->>B: POST /api/verlauf (nur Kennzahlen, Token)
    B-->>A: gespeichert
```

## UML: Datenmodell

```mermaid
erDiagram
    SESSION ||--o{ ERGEBNIS : enthaelt
    SESSION {
        string id PK
        string token
        string beruf
        string schwierigkeit
        string modus
        datetime erstelltAm
    }
    ERGEBNIS {
        string id PK
        string sessionId FK
        string frageId
        string frageText
        float abdeckung
        boolean auswertbar
        float kopfausrichtungProzent
        float haltungGradMedian
        float haltungVerlauf
        float bewegungsruhe
        float redeflussProzent
        float laengstePauseSekunden
        float fuellwoerterProMinute
    }
```

Löschen einer Session löscht ihre Ergebnisse mit (`onDelete: Cascade`). Es gibt kein Feld für Video, Audio oder Transkript.

## Zuordnung zu den Entscheidungen

| Thema | ADR |
|---|---|
| Regelbasiert statt LLM zur Laufzeit | 0001 |
| Datenschutz: Analyse im Browser | 0002 |
| Vorgehensmodell | 0003 |
| Web Worker für die Bildanalyse | 0004 |
| Scoring-Kernlogik | 0005 |
| Verlauf und anonymes Token | 0006 |
| Integrationstest statt Playwright | 0007 |
| Redefluss | 0008 |
| Kameravorschau und Bereit-Phase | 0009 |
| Berufsauswahl und Kataloge | 0010 |
| KI-Export | 0011 |
