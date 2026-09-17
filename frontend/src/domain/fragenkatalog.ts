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
