import { describe, expect, it, vi } from 'vitest'
import type { Auswertung } from './score'

const AUSWERTUNG: Auswertung = {
  abdeckung: 0.9,
  auswertbar: true,
  kopfausrichtungProzent: 85,
  haltungGradMedian: 2.1,
  haltungVerlauf: 0.5,
  bewegungsruhe: 0.1,
  redeflussProzent: null,
  laengstePauseSekunden: null,
  fuellwoerterProMinute: null,
}

vi.mock('./score', () => ({
  berechneAuswertung: vi.fn(() => AUSWERTUNG),
}))

const { aggregiereSession } = await import('./verlauf')

describe('aggregiereSession', () => {
  it('mappt jede Frage auf ihre Auswertung inkl. frageId und frageText', () => {
    const ergebnisse = [
      { frage: { id: 'se-leicht-1', text: 'Frage 1' }, ergebnisse: [], audioErgebnisse: [], transkript: '' },
      { frage: { id: 'se-leicht-2', text: 'Frage 2' }, ergebnisse: [], audioErgebnisse: [], transkript: '' },
    ]

    const eintraege = aggregiereSession(ergebnisse)

    expect(eintraege).toEqual([
      { frageId: 'se-leicht-1', frageText: 'Frage 1', ...AUSWERTUNG },
      { frageId: 'se-leicht-2', frageText: 'Frage 2', ...AUSWERTUNG },
    ])
  })

  it('liefert eine leere Liste bei leerer Eingabe', () => {
    expect(aggregiereSession([])).toEqual([])
  })
})
