export type Schwierigkeit = 'leicht' | 'mittel' | 'hart'

export interface Frage {
  id: string
  text: string
}

export async function getFragen(beruf: string, schwierigkeit: Schwierigkeit): Promise<Frage[]> {
  const query = new URLSearchParams({ beruf, schwierigkeit })
  const response = await fetch(`/api/fragen?${query.toString()}`)

  if (!response.ok) {
    throw new Error(`Fragenkatalog konnte nicht geladen werden (Status ${response.status}).`)
  }

  return response.json() as Promise<Frage[]>
}

export async function getBerufe(): Promise<string[]> {
  const response = await fetch('/api/berufe')

  if (!response.ok) {
    throw new Error(`Berufe konnten nicht geladen werden (Status ${response.status}).`)
  }

  return response.json() as Promise<string[]>
}
