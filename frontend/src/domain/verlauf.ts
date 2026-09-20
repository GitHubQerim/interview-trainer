import type { FragenErgebnis } from './interview'
import { berechneAuswertung } from './score'

export interface SessionErgebnisEintrag {
  frageId: string
  frageText: string
  abdeckung: number
  auswertbar: boolean
  kopfausrichtungProzent: number | null
  haltungGradMedian: number | null
  haltungVerlauf: number | null
  bewegungsruhe: number | null
}

export function aggregiereSession(ergebnisse: FragenErgebnis[]): SessionErgebnisEintrag[] {
  return ergebnisse.map((eintrag) => ({
    frageId: eintrag.frage.id,
    frageText: eintrag.frage.text,
    ...berechneAuswertung(eintrag.ergebnisse),
  }))
}
