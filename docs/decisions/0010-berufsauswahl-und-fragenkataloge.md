# 0010 – Berufsauswahl aus dem Katalog statt Freitext; Kataloge einmalig vorab erzeugt
Datum: 2026-10-21 | Status: proposed (Entwurf zur Prüfung)

## Kontext
Das Setup bot ein freies Textfeld mit Vorschlags-Chips (Vertrieb, Pflege, Projektmanagement), der Katalog im Backend enthielt aber nur "Softwareentwicklung". Jede andere Eingabe lieferte null Fragen und sperrte den Start-Button: die Oberfläche versprach Berufe, die es nicht gab. Aufgefallen ist das erst beim Ansehen am echten Produkt – ein Unit-Test hatte den Zustand sogar als erwartet festgeschrieben (`getFragen('Vertrieb') → []`).

## Entscheidung
- Der Beruf ist **nur auswählbar**, aus einer Liste, die das Backend aus dem Katalog ableitet (`GET /api/berufe`). Oberfläche und Katalog können nicht mehr auseinanderlaufen; ein Beruf erscheint erst, wenn er Fragen in jeder Schwierigkeit hat (Test).
- Fragenkataloge für sechs Berufsfelder (Softwareentwicklung, Projektmanagement, Vertrieb, Marketing, Kundenservice, Pflege), je 5 Fragen pro Schwierigkeit, **einmalig vorab per LLM erzeugt** und redaktionell geprüft – im Rahmen von ADR-0001 (LLM nur zur Katalogerzeugung, nie zur Laufzeit).
- Einheitliche Auswahl- und Button-Muster (`styles/_controls.scss`) statt vier unabhängig gewachsener Stile.

## Alternativen
- Freitext beibehalten und unbekannte Berufe mit einem generischen Katalog bedienen: verworfen, ein generischer Katalog wäre inhaltlich beliebig.
- Dropdown statt Karten: bei sechs Berufen sind Karten mit sichtbarem Ausgewählt-Zustand lesbarer.
- Frage-IDs je Beruf eindeutig über den ganzen Katalog (Test), damit spätere Erweiterung kollisionsfrei bleibt.

## Konsequenzen
- Positiv: kein Leerlauf mehr im Setup; Berufe sind erweiterbar, indem man Katalogdaten ergänzt.
- Negativ/Risiken: die Fragen sind unvalidierte Entwürfe; Nicht-IT-Kataloge sind nicht von Fachleuten geprüft. Eigene Kataloge (Import durch Nutzer:innen) sind noch nicht gebaut und brauchen einen eigenen ADR (u. a. wegen Datenschutz der Bezeichnungen).
- Würde uns zwingen zu revidieren: falls die Auswahl mit vielen Berufen unübersichtlich wird (dann Suche oder Gruppierung).
