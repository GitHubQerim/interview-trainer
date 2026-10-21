export type Schwierigkeit = 'leicht' | 'mittel' | 'hart'

export interface Frage {
  id: string
  text: string
}

const KATALOG: Record<string, Record<Schwierigkeit, Frage[]>> = {
  Softwareentwicklung: {
    leicht: [
      { id: 'se-leicht-1', text: 'Erzählen Sie von einem Projekt, auf das Sie stolz sind.' },
      { id: 'se-leicht-2', text: 'Wie gehen Sie vor, wenn Sie eine neue Programmiersprache lernen müssen?' },
      { id: 'se-leicht-3', text: 'Was macht für Sie guten Code aus?' },
      { id: 'se-leicht-4', text: 'Wie halten Sie sich über neue Technologien auf dem Laufenden?' },
      { id: 'se-leicht-5', text: 'Beschreiben Sie einen Fehler, aus dem Sie viel gelernt haben.' },
    ],
    mittel: [
      { id: 'se-mittel-1', text: 'Wie gehen Sie mit unklaren Anforderungen um?' },
      { id: 'se-mittel-2', text: 'Beschreiben Sie eine Situation, in der Sie fachlich anderer Meinung waren als ein:e Kolleg:in.' },
      { id: 'se-mittel-3', text: 'Wie priorisieren Sie, wenn mehrere Deadlines gleichzeitig anstehen?' },
      { id: 'se-mittel-4', text: 'Wie gehen Sie mit Code um, den Sie nicht selbst geschrieben haben und nicht verstehen?' },
      { id: 'se-mittel-5', text: 'Erzählen Sie von einem Projekt, das nicht wie geplant gelaufen ist.' },
    ],
    hart: [
      { id: 'se-hart-1', text: 'Beschreiben Sie eine Architekturentscheidung, die Sie im Nachhinein anders treffen würden.' },
      { id: 'se-hart-2', text: 'Wie gehen Sie vor, wenn ein Produktionssystem ausfällt und die Ursache unklar ist?' },
      { id: 'se-hart-3', text: 'Wie überzeugen Sie ein Team von einer technischen Entscheidung, die unpopulär ist?' },
      { id: 'se-hart-4', text: 'Wie wägen Sie zwischen technischer Schuld und Liefertermin ab?' },
      { id: 'se-hart-5', text: 'Beschreiben Sie eine Situation, in der Sie eine Aufgabe bewusst abgelehnt haben.' },
    ],
  },
  Projektmanagement: {
    leicht: [
      { id: 'pm-leicht-1', text: 'Welches Projekt haben Sie zuletzt geleitet oder begleitet?' },
      { id: 'pm-leicht-2', text: 'Wie sorgen Sie dafür, dass alle im Team wissen, was zu tun ist?' },
      { id: 'pm-leicht-3', text: 'Was bedeutet für Sie ein erfolgreiches Projekt?' },
      { id: 'pm-leicht-4', text: 'Wie planen Sie die ersten Wochen eines neuen Projekts?' },
      { id: 'pm-leicht-5', text: 'Wie gehen Sie mit Terminen um, die Sie nicht selbst gesetzt haben?' },
    ],
    mittel: [
      { id: 'pm-mittel-1', text: 'Wie gehen Sie vor, wenn sich der Projektumfang während der Laufzeit ändert?' },
      { id: 'pm-mittel-2', text: 'Wie managen Sie die Erwartungen unterschiedlicher Stakeholder?' },
      { id: 'pm-mittel-3', text: 'Wie erkennen Sie früh, dass ein Projekt aus dem Ruder läuft?' },
      { id: 'pm-mittel-4', text: 'Beschreiben Sie einen Konflikt im Team und wie Sie ihn gelöst haben.' },
      { id: 'pm-mittel-5', text: 'Wie priorisieren Sie, wenn Budget oder Zeit plötzlich gekürzt werden?' },
    ],
    hart: [
      { id: 'pm-hart-1', text: 'Beschreiben Sie ein Projekt, das gescheitert ist, und Ihren Anteil daran.' },
      { id: 'pm-hart-2', text: 'Wie überzeugen Sie die Geschäftsführung, ein Projekt zu stoppen, in das schon viel investiert wurde?' },
      { id: 'pm-hart-3', text: 'Wie gehen Sie vor, wenn ein Schlüsselmitarbeiter kurz vor dem Liefertermin ausfällt?' },
      { id: 'pm-hart-4', text: 'Wie führen Sie ein Team, dem gegenüber Sie keine Weisungsbefugnis haben?' },
      { id: 'pm-hart-5', text: 'Wie entscheiden Sie zwischen Qualität, Zeit und Kosten, wenn nicht alles zu halten ist?' },
    ],
  },
  Vertrieb: {
    leicht: [
      { id: 'ver-leicht-1', text: 'Was reizt Sie am Vertrieb?' },
      { id: 'ver-leicht-2', text: 'Wie bereiten Sie sich auf ein erstes Kundengespräch vor?' },
      { id: 'ver-leicht-3', text: 'Beschreiben Sie einen Verkaufserfolg, auf den Sie stolz sind.' },
      { id: 'ver-leicht-4', text: 'Wie bauen Sie Vertrauen zu einem neuen Kunden auf?' },
      { id: 'ver-leicht-5', text: 'Wie gehen Sie mit einem freundlichen Nein um?' },
    ],
    mittel: [
      { id: 'ver-mittel-1', text: 'Wie gehen Sie mit Einwänden zum Preis um?' },
      { id: 'ver-mittel-2', text: 'Wie priorisieren Sie Ihre Leads und Kundentermine?' },
      { id: 'ver-mittel-3', text: 'Erzählen Sie von einem Kunden, den Sie zurückgewonnen haben.' },
      { id: 'ver-mittel-4', text: 'Wie behalten Sie Ihre Ziele im Blick, wenn die Quartalsquote in Gefahr ist?' },
      { id: 'ver-mittel-5', text: 'Wie gehen Sie vor, wenn der Kunde etwas will, das Ihr Produkt nicht leisten kann?' },
    ],
    hart: [
      { id: 'ver-hart-1', text: 'Beschreiben Sie einen Abschluss, den Sie verloren haben, und was Sie daraus gelernt haben.' },
      { id: 'ver-hart-2', text: 'Wie verhandeln Sie, wenn der Kunde deutlich mehr Rabatt verlangt, als Sie geben dürfen?' },
      { id: 'ver-hart-3', text: 'Wie gehen Sie vor, wenn ein wichtiger Bestandskunde mit der Kündigung droht?' },
      { id: 'ver-hart-4', text: 'Wie entscheiden Sie, ob Sie um einen schwierigen Kunden kämpfen oder ihn loslassen?' },
      { id: 'ver-hart-5', text: 'Wie reagieren Sie, wenn Ihr Unternehmen ein Versprechen an einen Kunden nicht einhalten kann?' },
    ],
  },
  Marketing: {
    leicht: [
      { id: 'mkt-leicht-1', text: 'Was begeistert Sie am Marketing?' },
      { id: 'mkt-leicht-2', text: 'Welche Kampagne hat Sie zuletzt beeindruckt und warum?' },
      { id: 'mkt-leicht-3', text: 'Wie halten Sie sich über Trends und Kanäle auf dem Laufenden?' },
      { id: 'mkt-leicht-4', text: 'Wie lernen Sie eine neue Zielgruppe kennen?' },
      { id: 'mkt-leicht-5', text: 'Beschreiben Sie eine Kampagne, an der Sie mitgearbeitet haben.' },
    ],
    mittel: [
      { id: 'mkt-mittel-1', text: 'Wie messen Sie den Erfolg einer Kampagne?' },
      { id: 'mkt-mittel-2', text: 'Wie verteilen Sie ein begrenztes Budget auf mehrere Kanäle?' },
      { id: 'mkt-mittel-3', text: 'Wie gehen Sie vor, wenn eine Kampagne die Ziele nicht erreicht?' },
      { id: 'mkt-mittel-4', text: 'Wie stimmen Sie sich mit dem Vertrieb ab, wenn Erwartungen auseinandergehen?' },
      { id: 'mkt-mittel-5', text: 'Wie finden Sie die richtige Tonalität für eine neue Marke?' },
    ],
    hart: [
      { id: 'mkt-hart-1', text: 'Wie reagieren Sie auf einen öffentlichen Shitstorm gegen Ihr Unternehmen?' },
      { id: 'mkt-hart-2', text: 'Wie überzeugen Sie Vorgesetzte von einer kreativen Idee mit unsicherem Ausgang?' },
      { id: 'mkt-hart-3', text: 'Wie bewerten Sie den Beitrag des Marketings, wenn sich Wirkung kaum direkt messen lässt?' },
      { id: 'mkt-hart-4', text: 'Wie gehen Sie mit widersprüchlichen Daten und Bauchgefühl um?' },
      { id: 'mkt-hart-5', text: 'Beschreiben Sie eine Entscheidung, bei der Marke und kurzfristiger Umsatz im Konflikt standen.' },
    ],
  },
  Kundenservice: {
    leicht: [
      { id: 'ks-leicht-1', text: 'Warum möchten Sie im Kundenservice arbeiten?' },
      { id: 'ks-leicht-2', text: 'Wie begrüßen Sie einen Kunden, der gerade verärgert anruft?' },
      { id: 'ks-leicht-3', text: 'Was macht für Sie guten Service aus?' },
      { id: 'ks-leicht-4', text: 'Wie bleiben Sie freundlich, auch wenn der Tag stressig ist?' },
      { id: 'ks-leicht-5', text: 'Beschreiben Sie eine Situation, in der Sie einem Kunden besonders gut geholfen haben.' },
    ],
    mittel: [
      { id: 'ks-mittel-1', text: 'Wie gehen Sie vor, wenn Sie eine Frage nicht beantworten können?' },
      { id: 'ks-mittel-2', text: 'Wie priorisieren Sie, wenn mehrere Kunden gleichzeitig warten?' },
      { id: 'ks-mittel-3', text: 'Wie bleiben Sie ruhig, wenn ein Kunde laut oder unhöflich wird?' },
      { id: 'ks-mittel-4', text: 'Wie erklären Sie einem Kunden eine Entscheidung, die er nicht akzeptieren will?' },
      { id: 'ks-mittel-5', text: 'Wie gehen Sie mit wiederkehrenden Beschwerden über dasselbe Problem um?' },
    ],
    hart: [
      { id: 'ks-hart-1', text: 'Wie reagieren Sie, wenn ein Kunde eine Entschädigung fordert, die Sie nicht zusagen dürfen?' },
      { id: 'ks-hart-2', text: 'Beschreiben Sie eine Eskalation, die Sie nicht lösen konnten, und was Sie danach getan haben.' },
      { id: 'ks-hart-3', text: 'Wie gehen Sie vor, wenn eine Regel des Unternehmens dem Kunden offensichtlich schadet?' },
      { id: 'ks-hart-4', text: 'Wie halten Sie die Qualität, wenn Kennzahlen wie die Gesprächsdauer Druck erzeugen?' },
      { id: 'ks-hart-5', text: 'Wie geben Sie Kolleg:innen Feedback, die Kunden gegenüber unfreundlich auftreten?' },
    ],
  },
  Pflege: {
    leicht: [
      { id: 'pfl-leicht-1', text: 'Was hat Sie dazu bewegt, in der Pflege zu arbeiten?' },
      { id: 'pfl-leicht-2', text: 'Wie gehen Sie auf einen neuen Patienten oder Bewohner zu?' },
      { id: 'pfl-leicht-3', text: 'Was bedeutet für Sie gute Pflege?' },
      { id: 'pfl-leicht-4', text: 'Wie sorgen Sie im Schichtdienst für Ihr eigenes Wohlbefinden?' },
      { id: 'pfl-leicht-5', text: 'Beschreiben Sie eine Situation, in der Sie jemandem besonders helfen konnten.' },
    ],
    mittel: [
      { id: 'pfl-mittel-1', text: 'Wie priorisieren Sie, wenn mehrere Patienten gleichzeitig Hilfe brauchen?' },
      { id: 'pfl-mittel-2', text: 'Wie sprechen Sie mit Angehörigen, die verunsichert oder verärgert sind?' },
      { id: 'pfl-mittel-3', text: 'Wie gehen Sie mit Zeitdruck um, ohne dass die Zuwendung leidet?' },
      { id: 'pfl-mittel-4', text: 'Wie dokumentieren und übergeben Sie, damit nichts verloren geht?' },
      { id: 'pfl-mittel-5', text: 'Wie gehen Sie mit einem Patienten um, der Hilfe ablehnt?' },
    ],
    hart: [
      { id: 'pfl-hart-1', text: 'Wie reagieren Sie, wenn Sie einen Fehler bei sich oder im Team bemerken?' },
      { id: 'pfl-hart-2', text: 'Wie gehen Sie mit dem Tod eines Patienten oder Bewohners um?' },
      { id: 'pfl-hart-3', text: 'Wie verhalten Sie sich, wenn eine Anweisung Ihrer Meinung nach nicht im Sinne des Patienten ist?' },
      { id: 'pfl-hart-4', text: 'Wie gehen Sie vor, wenn bei knapper Besetzung Standards nicht einzuhalten sind?' },
      { id: 'pfl-hart-5', text: 'Wie sprechen Sie Überlastung im Team an?' },
    ],
  },
}

export function getFragen(beruf: string, schwierigkeit: Schwierigkeit): Frage[] {
  return KATALOG[beruf]?.[schwierigkeit] ?? []
}

export function getBerufe(): string[] {
  return Object.keys(KATALOG)
}
