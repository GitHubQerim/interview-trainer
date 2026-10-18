export interface ErgebnisEingabe {
  frageId: string
  frageText: string
  abdeckung: number
  auswertbar: boolean
  kopfausrichtungProzent: number | null
  haltungGradMedian: number | null
  haltungVerlauf: number | null
  bewegungsruhe: number | null
  redeflussProzent: number | null
  laengstePauseSekunden: number | null
  fuellwoerterProMinute: number | null
}

export interface SessionEingabe {
  token: string
  beruf: string
  schwierigkeit: string
  modus: string
  ergebnisse: ErgebnisEingabe[]
}
