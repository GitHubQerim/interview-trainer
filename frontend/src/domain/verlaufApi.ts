import type { FragenErgebnis } from './interview'
import type { SessionConfig } from './session'
import { holeToken } from './token'
import { aggregiereSession, type SessionErgebnisEintrag } from './verlauf'

export interface SessionVerlaufEintrag {
  id: string
  beruf: string
  schwierigkeit: string
  modus: string
  erstelltAm: string
  ergebnisse: SessionErgebnisEintrag[]
}

export async function speichereSession(config: SessionConfig, ergebnisse: FragenErgebnis[]): Promise<void> {
  const response = await fetch('/api/verlauf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: holeToken(),
      beruf: config.beruf,
      schwierigkeit: config.schwierigkeit,
      modus: config.modus,
      ergebnisse: aggregiereSession(ergebnisse),
    }),
  })

  if (!response.ok) {
    throw new Error(`Auswertung konnte nicht gespeichert werden (Status ${response.status}).`)
  }
}

export async function ladeVerlauf(): Promise<SessionVerlaufEintrag[]> {
  const query = new URLSearchParams({ token: holeToken() })
  const response = await fetch(`/api/verlauf?${query.toString()}`)

  if (!response.ok) {
    throw new Error(`Verlauf konnte nicht geladen werden (Status ${response.status}).`)
  }

  return response.json() as Promise<SessionVerlaufEintrag[]>
}

export async function loescheVerlauf(): Promise<void> {
  const query = new URLSearchParams({ token: holeToken() })
  const response = await fetch(`/api/verlauf?${query.toString()}`, { method: 'DELETE' })

  if (!response.ok) {
    throw new Error(`Verlauf konnte nicht geloescht werden (Status ${response.status}).`)
  }
}
