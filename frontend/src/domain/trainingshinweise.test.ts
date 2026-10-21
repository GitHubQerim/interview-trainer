import { describe, expect, it } from 'vitest'
import type { Auswertung } from './score'
import { leiteTrainingshinweiseAb } from './trainingshinweise'

const IM_ZIELBEREICH: Auswertung = {
  abdeckung: 1,
  auswertbar: true,
  kopfausrichtungProzent: 90,
  haltungGradMedian: 2,
  haltungVerlauf: 0,
  bewegungsruhe: 0.1,
  redeflussProzent: 80,
  laengstePauseSekunden: 1,
  fuellwoerterProMinute: 2,
}

describe('leiteTrainingshinweiseAb', () => {
  it('liefert keine Hinweise, wenn alle Kennzahlen im Zielbereich liegen', () => {
    expect(leiteTrainingshinweiseAb(IM_ZIELBEREICH)).toEqual([])
  })

  it('rät bei zu wenig Kopfausrichtung, öfter in die Kamera zu schauen, und nennt den Wert', () => {
    const hinweise = leiteTrainingshinweiseAb({ ...IM_ZIELBEREICH, kopfausrichtungProzent: 55 })

    expect(hinweise).toHaveLength(1)
    expect(hinweise[0]?.metrik).toBe('kopfausrichtung')
    expect(hinweise[0]?.text).toMatch(/55 %/)
    expect(hinweise[0]?.text).toMatch(/Kamera/)
  })

  it('rät bei schiefer Haltung zum geraden Sitzen und nennt die Neigung', () => {
    const hinweise = leiteTrainingshinweiseAb({ ...IM_ZIELBEREICH, haltungGradMedian: 8.3 })

    expect(hinweise[0]?.metrik).toBe('haltung')
    expect(hinweise[0]?.text).toMatch(/8,3°/)
  })

  it('ergänzt bei zunehmender Neigung einen Hinweis auf den Verlauf', () => {
    const mit = leiteTrainingshinweiseAb({ ...IM_ZIELBEREICH, haltungGradMedian: 8, haltungVerlauf: 3 })
    const ohne = leiteTrainingshinweiseAb({ ...IM_ZIELBEREICH, haltungGradMedian: 8, haltungVerlauf: 0 })

    expect(mit[0]?.text).toMatch(/im Lauf der Antwort/)
    expect(ohne[0]?.text).not.toMatch(/im Lauf der Antwort/)
  })

  it('rät bei viel Bewegung zu ruhigen Händen', () => {
    const hinweise = leiteTrainingshinweiseAb({ ...IM_ZIELBEREICH, bewegungsruhe: 0.4 })

    expect(hinweise[0]?.metrik).toBe('bewegung')
    expect(hinweise[0]?.text).toMatch(/Hände/)
  })

  it('rät bei niedrigem Redefluss zu Stichpunkten und nennt die längste Pause', () => {
    const hinweise = leiteTrainingshinweiseAb({ ...IM_ZIELBEREICH, redeflussProzent: 40, laengstePauseSekunden: 6.2 })

    expect(hinweise[0]?.metrik).toBe('redefluss')
    expect(hinweise[0]?.text).toMatch(/6,2 s/)
    expect(hinweise[0]?.text).toMatch(/Stichpunkt/)
  })

  it('rät bei fast pausenlosem Sprechen zu bewussten Pausen', () => {
    const hinweise = leiteTrainingshinweiseAb({ ...IM_ZIELBEREICH, redeflussProzent: 99 })

    expect(hinweise[0]?.text).toMatch(/Pausen/)
  })

  it('lässt Video-Hinweise weg, wenn die Aufnahme nicht auswertbar war, bewertet aber den Redefluss weiter', () => {
    const hinweise = leiteTrainingshinweiseAb({
      ...IM_ZIELBEREICH,
      auswertbar: false,
      kopfausrichtungProzent: null,
      haltungGradMedian: null,
      bewegungsruhe: null,
      redeflussProzent: 30,
    })

    expect(hinweise.map((hinweis) => hinweis.metrik)).toEqual(['redefluss'])
  })

  it('erzeugt keinen Redefluss-Hinweis ohne Redefluss-Daten', () => {
    const hinweise = leiteTrainingshinweiseAb({ ...IM_ZIELBEREICH, redeflussProzent: null, laengstePauseSekunden: null })

    expect(hinweise).toEqual([])
  })

  it('behält eine feste Reihenfolge (Kopf, Haltung, Bewegung, Redefluss)', () => {
    const hinweise = leiteTrainingshinweiseAb({
      ...IM_ZIELBEREICH,
      kopfausrichtungProzent: 10,
      haltungGradMedian: 12,
      bewegungsruhe: 0.9,
      redeflussProzent: 5,
    })

    expect(hinweise.map((hinweis) => hinweis.metrik)).toEqual(['kopfausrichtung', 'haltung', 'bewegung', 'redefluss'])
  })

  it('formuliert nie ein Eignungsurteil', () => {
    const hinweise = leiteTrainingshinweiseAb({
      ...IM_ZIELBEREICH,
      kopfausrichtungProzent: 10,
      haltungGradMedian: 12,
      bewegungsruhe: 0.9,
      redeflussProzent: 5,
    })

    for (const hinweis of hinweise) {
      expect(hinweis.text).not.toMatch(/ungeeignet|geeignet|schlecht|versagt/i)
    }
  })
})
