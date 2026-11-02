import { describe, expect, it } from 'vitest'
import { getBerufe, getFragen } from './fragenkatalog.js'

const SCHWIERIGKEITEN = ['leicht', 'mittel', 'hart'] as const

describe('getFragen', () => {
  it('liefert eine leere Liste fuer einen unbekannten Beruf', () => {
    expect(getFragen('Astronaut', 'leicht')).toEqual([])
  })
})

describe('Fragenkatalog', () => {
  it('deckt nicht nur IT-Berufe ab', () => {
    expect(getBerufe()).toEqual(
      expect.arrayContaining(['Softwareentwicklung', 'Projektmanagement', 'Vertrieb', 'Marketing', 'Kundenservice', 'Pflege']),
    )
  })

  describe.each(getBerufe())('%s', (beruf) => {
    it.each(SCHWIERIGKEITEN)('liefert 5 Fragen mit nicht leerem Text fuer %s', (schwierigkeit) => {
      const fragen = getFragen(beruf, schwierigkeit)

      expect(fragen).toHaveLength(5)
      expect(fragen.every((frage) => frage.text.trim().length > 0)).toBe(true)
    })
  })

  it('verwendet jede Frage-ID nur einmal ueber den ganzen Katalog', () => {
    const ids = getBerufe().flatMap((beruf) =>
      SCHWIERIGKEITEN.flatMap((schwierigkeit) => getFragen(beruf, schwierigkeit).map((frage) => frage.id)),
    )

    expect(new Set(ids).size).toBe(ids.length)
  })
})
