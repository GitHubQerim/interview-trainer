import type { Schwierigkeit } from './fragenkatalog'

export type Modus = 'video-ton' | 'nur-ton' | 'nur-fragen'

export interface SessionConfig {
  beruf: string
  schwierigkeit: Schwierigkeit
  modus: Modus
}

export const MODUS_OPTIONEN: Array<{ value: Modus; titel: string; untertitel: string }> = [
  { value: 'video-ton', titel: 'Video und Ton', untertitel: 'volle Auswertung' },
  { value: 'nur-ton', titel: 'Nur Ton', untertitel: 'Sprache, keine Kamera' },
  { value: 'nur-fragen', titel: 'Nur Fragen', untertitel: 'ohne Messung' },
]
