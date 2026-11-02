# 0011 – KI-Export ("Bring your own AI"): Text zum Selbstkopieren, Rückweg nur als Anzeige
Datum: 2026-10-21 | Status: proposed (Entwurf zur Prüfung)

## Kontext
Die Kennzahlen (Kopf, Haltung, Bewegung, Redefluss) sagen nichts über den **Inhalt** einer Antwort. Inhaltliches Feedback (Struktur, Konkretheit, Beispiele, bessere Formulierungen) ist ohne Sprachmodell nur sehr begrenzt möglich; ein Sprachmodell zur Laufzeit scheidet aber aus (ADR-0001: reproduzierbar, testbar; ADR-0002: kein Inhalt verlässt das Gerät, nur Kennzahlen). Nutzer:innen haben häufig ein eigenes KI-Abo. Idee: Die App erzeugt aus der Auswertung einen Text, den die Person **selbst** in ihre KI kopiert, und liest die Antwort wieder ein.

## Entscheidung
**Die App ruft kein Sprachmodell auf und sendet nichts.** Sie erzeugt Text und liest Text; der KI-Schritt ist eine Handlung der Nutzer:in außerhalb der App.

1. **Prompt** (`domain/kiPrompt.ts`, reine Funktion): deutscher Text mit Beruf, Schwierigkeit, Fragen, optional Kennzahlen (mit Orientierungsbereich), optional Transkript, einer kurzen Zufalls-**REF** und der Anweisung, ausschließlich mit JSON im vorgegebenen Format zu antworten und **keine Eignungsbewertung** abzugeben. Sprache und Format sind feste Konstanten.
2. **Opt-in je Bestandteil:** Kennzahlen standardmäßig an, **Transkript standardmäßig aus** (ausdrücklich anzuhaken, und nur wählbar, wenn überhaupt eines vorliegt).
3. **Anonymisierung ist Pflicht** (`domain/anonymisieren.ts`): ersetzt E-Mails, Links, Telefonnummern, lange Zahlenfolgen und vom Nutzer eingegebene Begriffe (Name, Arbeitgeber, Projektnamen) durch Platzhalter. **Keine Namenserkennung** (im Deutschen sind alle Hauptwörter großgeschrieben; ein lokales Modell wäre eine große neue Abhängigkeit). Stattdessen: farbig markierte **Vorschau** mit Zähler, ehrlicher Hinweis, was nicht erkannt wird (Namen, Orte, Firmen, gesprochene Zahlen), und eine Bestätigung "Ich habe den Text geprüft und möchte ihn weitergeben." – bewusst nicht "ist anonymisiert". Die Bestätigung gilt nur für genau den angezeigten Text und verfällt bei jeder Änderung.
4. **Ausgabe nur per Zwischenablage**, exakt der Vorschautext, nach Bestätigung, mit Hinweis auf Zwischenablage-Zugriff anderer Programme und Fallback "von Hand kopieren". Kein automatisches Kopieren.
5. **Rückweg** (`domain/kiAntwort.ts`, `KiFeedbackAnzeige`): eingefügtes JSON wird extrahiert (auch aus Text und Code-Fences), von Hand validiert (kein Schema-Paket), in ein **neues** Objekt mit nur bekannten Feldern kopiert (kein `__proto__`), in Länge und Anzahl begrenzt und **nur als Text** gerendert (kein HTML, kein Markdown, keine Links aus dem Antworttext). Die Anzeige trägt das Label "KI-generiert, ungeprüft" und fließt nie in Kennzahlen ein. Die **REF ist nur ein Plausibilitätscheck** ("gehört zu einer anderen Auswertung"), kein Schlüssel – KIs wiederholen Felder unzuverlässig.

## Abgrenzung zu bestehenden Entscheidungen
- **ADR-0001:** unberührt. Kein LLM in der App; das KI-Feedback ist klar vom regelbasierten Score getrennt und optional.
- **ADR-0002:** "Video/Audio und Inhalte gehen nicht ans Backend" bleibt wahr – es gibt keine Backend-Änderung. Neu ist, dass Inhalt **auf ausdrückliche Handlung der Nutzer:in** die App verlassen kann; Datenschutz-by-Design endet an der Grenze, die die Person selbst überschreitet. Mit dem Einfügen in einen KI-Dienst gelten dessen Bedingungen; "temporärer Chat" ist eine Zusage des Anbieters, keine Garantie – das steht so in der Oberfläche.
- **ADR-0008:** Das Transkript lag schon als `FragenErgebnis.transkript` im React-State (siehe Nachtrag dort). Neu ist, dass es zusätzlich für den Export gelesen wird – direkt aus dem vorhandenen State, ohne Kopie, Cache oder Persistenz. Es wird weiterhin nie gespeichert, geloggt oder ans Backend gesendet.

## Bewusst nicht in dieser Version (nach Architektur-Review verkleinert)
- **Keine Persistenz der KI-Antwort** (kein localStorage, keine Verlaufsanbindung): Sie existiert nur im geöffneten Tab, so wie die Auswertung selbst. Das spart Löschkette, Migration und Quota-Probleme. Erst nachrüsten, wenn es jemand vermisst (dann mit gemeinsamem Schlüsselpräfix, Versionsfeld, Test in "Meine Daten löschen").
- **Keine gespeicherten Schwärzungsbegriffe:** Name und Arbeitgeber wären selbst personenbezogen.
- **Kein .md-Download**, nur Zwischenablage (zwei Ausgabewege wären doppelte Oberfläche und Tests).
- **Kleines Antwortformat** (Stärken, Verbesserungen, Formulierungsvorschläge `statt → besser` optional, Gesamteindruck, nächste Schritte): je größer das JSON, desto häufiger liefern KIs Ungültiges; optionale Felder werden tolerant gelesen.

## Alternativen
- **Direkter API-Aufruf mit Nutzer-Key:** verworfen – Schlüssel im Browser, Inhalt verlässt die App automatisch, bricht ADR-0001/0002.
- **Lokales Modell im Browser:** verworfen – große Abhängigkeit, schlechte Qualität für deutsches Feedback.
- **Automatische Namenserkennung (NER):** verworfen – siehe oben; die Vorschau mit Nutzerbegriffen ist die ehrliche Lösung.

## Konsequenzen
- Positiv: inhaltliches Feedback ohne Laufzeit-LLM; Datenschutz bleibt Entscheidung der Nutzer:in; keine neue Abhängigkeit, keine Backend-Änderung; alle neuen Module sind reine Funktionen mit Tests.
- Negativ/Risiken: Heuristik-Anonymisierung ist unvollständig (dokumentiert, in der Oberfläche benannt); die Qualität des Feedbacks hängt von der KI der Nutzer:in ab und wurde nicht validiert; Transkripte der Browser-Erkennung sind lückenhaft (keine Satzzeichen, fehlende Füllwörter); der Rückweg verlangt, dass der Tab offen bleibt.
- Würde uns zwingen zu revidieren: falls sich zeigt, dass Nutzer:innen die Vorschau nur wegklicken (dann strengere Hilfen oder Export nur ohne Transkript), oder falls Persistenz der Antworten gewünscht wird (dann eigener Nachtrag zu Löschen und Format-Version).

## Nachtrag 2026-10-22 – Oberfläche als Modal mit drei Schritten
Das zuerst gebaute Panel unter den Kennzahlen stapelte Erklärung, Warnung, Vorschau, Eingabefeld und Antwort in einer langen Seite. Nach dem ersten Test mit einer echten KI (und weil die Ansicht für die Präsentation übersichtlicher sein sollte) ersetzt ein **Modal mit drei Schritten** das Panel: (1) Text vorbereiten, (2) Antwort einfügen, (3) Feedback. Ausgelöst wird es durch einen Button "Mit KI auswerten" in der Button-Reihe der Auswertung.
- **Inhaltlich unverändert:** Prompt, Schwärzung, Bestätigung vor dem Kopieren, Antwort-Parser und alle Datenschutz-Grenzen aus der Entscheidung oben. Die Warnung zur Schwärzung bleibt sichtbar; nur die allgemeinen Datenschutz-Hinweise stehen eingeklappt unter "Hinweise zum Datenschutz".
- **Feedback als Akkordeon:** Je Frage eine zugeklappte Zeile mit Kurzinfo ("5 Stärken, 4 Verbesserungen"); darin lassen sich Stärken, Verbesserungen und "Statt … lieber …" einzeln öffnen. Die Antwort bleibt reiner Text.
- **Technik:** natives `<dialog>` (Fokusfalle, Esc, Hintergrund inklusive), keine neue Abhängigkeit. Der Zustand lebt in der Auswertungs-Komponente und bleibt beim Schließen des Modals erhalten, solange der Tab offen ist; es wird weiterhin nichts gespeichert.

