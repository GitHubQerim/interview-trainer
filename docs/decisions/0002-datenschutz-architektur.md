# 0002 – Datenschutzarchitektur: clientseitige Analyse, kein Video/Audio ans Backend
Datum: 2026-09-16 | Status: accepted

## Kontext
Die App analysiert Kamerabild (und optional Ton) einer Person in einer potenziell sensiblen Situation (Bewerbungsgesprächs-Übung). Ohne Registrierung soll trotzdem ein Sessionverlauf möglich sein. Die Aufgabenstellung verlangt Anonymisierung personenbezogener Daten; zusätzlich soll die kritische Reflexion der Präsentation DSGVO und EU AI Act einordnen (Zusage an die Modulbetreuung, Details `docs/private/betreuung.md`).

## Optionen
1. **Video/Audio ans Backend streamen, dort analysieren** – zentraler, leichter zu skalieren/updaten, aber Video/Audio einer Person verlassen das Gerät: höchstes DSGVO-Risiko, zusätzlich potenziell EU-AI-Act-relevant (biometrische Auswertung als Cloud-Dienst).
2. **Analyse clientseitig im Web Worker, nur aggregierte Kennzahlen ans Backend, anonymes Session-Token statt Registrierung, Transkription nur bei explizitem `processLocally`-Flag sonst deaktiviert** – Video/Audio verlassen das Gerät nie, Backend sieht nur Zahlen ohne Personenbezug, Verlauf ohne Konto möglich.
3. **Gar keine Historie/kein Backend** – maximal datensparsam, aber Anforderung "Verlauf über mehrere Sessions mit Export-/Löschfunktion" (eigene Zusage an die Modulbetreuung) nicht erfüllbar. Scheidet aus.

## Entscheidung
Wir wählen Option 2: Analyse läuft ausschließlich clientseitig; ans Backend gehen nur die aggregierten Kennzahlen (nicht Rohbild/-ton); Session-Identifikation über ein anonymes Token ohne Registrierung; Transkription (Füllwort-Erkennung) ist nur aktiv, wenn `processLocally` erfüllt ist, sonst deaktiviert statt an einen Cloud-Dienst auszulagern.

## Konsequenzen
- Positiv: Video/Ton verlassen das Gerät nie → deutlich reduziertes DSGVO-Risiko (keine Verarbeitung besonderer Kategorien personenbezogener Daten – biometrische Rohdaten – durch uns als Verantwortliche außerhalb des Endgeräts). Feedback ist klar als Trainingshilfe eingeordnet, nicht als automatisierte Eignungsbewertung – relevant für die EU-AI-Act-Einordnung (kein Hochrisiko-Einsatz "Eignungsbeurteilung von Bewerber:innen").
- Negativ/Risiken: Clientseitige Analyse ist rechenintensiver für schwächere Geräte; kein serverseitiges Debugging der Rohdaten möglich, falls ein Score falsch aussieht (nur die Kennzahl ist im Zweifel nachvollziehbar, nicht das Ausgangsbild).
- Würde uns zwingen zu revidieren: wenn MediaPipe im Web Worker auf relevanten Zielgeräten nicht performant genug läuft und eine serverseitige Analyse unumgänglich würde – dann müsste die Datenschutzeinordnung neu bewertet werden (ggf. explizite Einwilligung statt "kein Personenbezug").

## Nachtrag 2026-09-21 (Redefluss-Slice, siehe ADR-0008)
Bis hierhin war `getUserMedia({video:true})` die einzige Mediennutzung – kein Mikrofonzugriff existierte. Mit der vierten Kennzahl "Redefluss" wird das Mikrofon real angefragt (`getUserMedia({video:true, audio:{...}})`), zusätzlich zum Kamerabild. Konsequenzen für diese ADR:
- Der Berechtigungsdialog des Browsers fragt jetzt Kamera **und** Mikrofon gemeinsam ab (ein zusätzlicher, sichtbarer Schritt im Ablauf, den es vorher nicht gab). Bei fehlendem Mikrofon (Gerät ohne Mikrofon, `NotFoundError`) fällt der Code auf reines Video zurück; bei verweigerter Berechtigung (`NotAllowedError`) gibt es bewusst keinen zweiten Versuch, da Chrome Kamera und Mikrofon in diesem Fall meist gemeinsam blockiert.
- Die Grundaussage dieser ADR bleibt unverändert gültig: Audio verlässt das Gerät genauso wenig wie Video – die Lautstärke-Analyse (VAD) läuft im selben clientseitigen Kontext, ans Backend geht weiterhin nur die aggregierte Kennzahl. Die optionale Füllwort-Erkennung (Transkription) ist die konkrete Realisierung des bis dahin nur prosaisch formulierten `processLocally`-Flags – Details, Abwägung und Abgrenzung zu ADR-0004 in ADR-0008.

## Junior-Schutz-Fragen
- **10x mehr Nutzer/Daten?** Unkritisch für Datenschutz (keine zentrale Video/Audio-Speicherung); Backend-Last bleibt klein, da nur Kennzahlen persistiert werden.
- **User-Löschung (DSGVO)?** Anonymes Token macht "Lösch mich" trivial: Löschung des lokalen Tokens + zugehöriger Kennzahlen-Zeilen im Backend, kein Konto/keine E-Mail-Verknüpfung, die anderswo gelöscht werden müsste. Export-/Löschfunktion ist ohnehin als Pflicht-Feature vorgesehen.
- **Migration falls falsch?** Client-Analyse ist austauschbar, solange die Backend-Schnittstelle bei "aggregierte Kennzahl" bleibt – ein Wechsel auf Server-Analyse würde nur die Datenschutz-Einordnung ändern, nicht zwingend das API-Schema.
- **Löst die einfachste Option das Problem?** Ja, "gar kein Backend" (Option 3) wäre einfacher, erfüllt aber die eigene Feature-Zusage (Verlauf/Export/Löschen) nicht – Option 2 ist die einfachste Option, die die Anforderung noch erfüllt.
