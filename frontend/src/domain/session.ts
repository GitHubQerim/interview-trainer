import type { Schwierigkeit } from './fragenkatalog'

export type Modus = 'video-ton' | 'nur-ton' | 'nur-fragen'

export interface SessionConfig {
  beruf: string
  schwierigkeit: Schwierigkeit
  modus: Modus
}
