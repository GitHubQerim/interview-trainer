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
}

export function getFragen(beruf: string, schwierigkeit: Schwierigkeit): Frage[] {
  return KATALOG[beruf]?.[schwierigkeit] ?? []
}
