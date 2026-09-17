import { describe, expect, it } from 'vitest'
import { getFragen } from './fragenkatalog.js'

describe('getFragen', () => {
  it.each(['leicht', 'mittel', 'hart'] as const)(
    'liefert 5 Fragen mit eindeutigen IDs fuer Softwareentwicklung/%s',
    (schwierigkeit) => {
      const fragen = getFragen('Softwareentwicklung', schwierigkeit)

      expect(fragen).toHaveLength(5)
      expect(new Set(fragen.map((frage) => frage.id)).size).toBe(5)
    },
  )

  it('liefert eine leere Liste fuer einen unbekannten Beruf', () => {
    expect(getFragen('Vertrieb', 'leicht')).toEqual([])
  })
})
