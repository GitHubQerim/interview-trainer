import { describe, expect, it } from 'vitest'
import { parseKiAntwort } from './kiAntwort'
import { baueKiPrompt, erzeugeRef, formatKennzahlen } from './kiPrompt'
import type { Auswertung } from './score'

const AUSWERTUNG: Auswertung = {
  abdeckung: 1,
  auswertbar: true,
  kopfausrichtungProzent: 85,
  haltungGradMedian: 2.1,
  haltungVerlauf: 0,
  bewegungsruhe: 0.07,
  redeflussProzent: 83,
  laengstePauseSekunden: 1.2,
  fuellwoerterProMinute: 4,
}

const BASIS = {
  ref: 'AB12CD',
  beruf: 'Vertrieb',
  schwierigkeit: 'mittel',
  fragen: [
    { nr: 1, frage: 'Wie gehen Sie mit Einwänden um?', transkript: null, kennzahlen: null },
    { nr: 2, frage: 'Wie priorisieren Sie Leads?', transkript: null, kennzahlen: null },
  ],
}

describe('baueKiPrompt', () => {
  it('nennt Beruf, Schwierigkeit, REF und alle Fragen', () => {
    const prompt = baueKiPrompt(BASIS)

    expect(prompt).toContain('Vertrieb')
    expect(prompt).toContain('mittel')
    expect(prompt).toContain('AB12CD')
    expect(prompt).toContain('Wie gehen Sie mit Einwänden um?')
    expect(prompt).toContain('Wie priorisieren Sie Leads?')
  })

  it('verlangt ausschließlich JSON und verbietet ein Eignungsurteil', () => {
    const prompt = baueKiPrompt(BASIS)

    expect(prompt).toMatch(/ausschließlich/i)
    expect(prompt).toMatch(/JSON/)
    expect(prompt).toMatch(/nicht[^.]*geeignet/i)
  })

  it('bettet ein Antwortformat ein, das der Parser akzeptiert, mit eingesetzter REF', () => {
    const prompt = baueKiPrompt(BASIS)
    const beispiel = prompt.slice(prompt.indexOf('{'), prompt.lastIndexOf('}') + 1)

    const ergebnis = parseKiAntwort(beispiel)

    expect(ergebnis.ok).toBe(true)
    expect(ergebnis.ok && ergebnis.antwort.ref).toBe('AB12CD')
  })

  it('nimmt Transkripte nur auf, wenn sie übergeben werden', () => {
    const ohne = baueKiPrompt(BASIS)
    const mit = baueKiPrompt({
      ...BASIS,
      fragen: [{ nr: 1, frage: 'Frage?', transkript: 'also ich würde erstmal nachfragen', kennzahlen: null }],
    })

    expect(ohne).not.toMatch(/Transkript/)
    expect(mit).toContain('also ich würde erstmal nachfragen')
    expect(mit).toMatch(/Transkript/)
  })

  it('weist beim Transkript darauf hin, dass es aus automatischer Spracherkennung stammt', () => {
    const prompt = baueKiPrompt({ ...BASIS, fragen: [{ nr: 1, frage: 'F?', transkript: 'text', kennzahlen: null }] })

    expect(prompt).toMatch(/Spracherkennung/)
  })

  it('nimmt Kennzahlen nur auf, wenn sie übergeben werden, und nennt sie Orientierungswerte', () => {
    const ohne = baueKiPrompt(BASIS)
    const mit = baueKiPrompt({ ...BASIS, fragen: [{ nr: 1, frage: 'F?', transkript: null, kennzahlen: formatKennzahlen(AUSWERTUNG) }] })

    expect(ohne).not.toMatch(/Kennzahlen/)
    expect(mit).toMatch(/Kennzahlen/)
    expect(mit).toMatch(/Redefluss/)
    expect(mit).toMatch(/Orientierung/)
  })

  it('lässt Beruf und Schwierigkeit weg, wenn sie unbekannt sind', () => {
    const prompt = baueKiPrompt({ ...BASIS, beruf: undefined, schwierigkeit: undefined })

    expect(prompt).not.toMatch(/undefined/)
  })
})

describe('formatKennzahlen', () => {
  it('beschreibt vorhandene Kennzahlen mit deutschen Dezimalstellen', () => {
    const zeilen = formatKennzahlen(AUSWERTUNG)

    expect(zeilen.join('\n')).toMatch(/Kopfausrichtung: 85 %/)
    expect(zeilen.join('\n')).toMatch(/2,1°/)
    expect(zeilen.join('\n')).toMatch(/Bewegung: 0,07/)
    expect(zeilen.join('\n')).toMatch(/Redefluss: 83 %/)
    expect(zeilen.join('\n')).toMatch(/1,2 s/)
  })

  it('lässt fehlende Kennzahlen weg', () => {
    const zeilen = formatKennzahlen({
      ...AUSWERTUNG,
      auswertbar: false,
      kopfausrichtungProzent: null,
      haltungGradMedian: null,
      bewegungsruhe: null,
      redeflussProzent: null,
      laengstePauseSekunden: null,
      fuellwoerterProMinute: null,
    })

    expect(zeilen).toEqual([])
  })
})

describe('erzeugeRef', () => {
  it('liefert sechs Zeichen ohne leicht verwechselbare Buchstaben und Ziffern', () => {
    const ref = erzeugeRef(new Uint8Array([0, 1, 2, 3, 250, 255]))

    expect(ref).toHaveLength(6)
    expect(ref).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/)
  })

  it('ist bei gleichen Zufallswerten gleich und bei anderen verschieden', () => {
    expect(erzeugeRef(new Uint8Array([1, 2, 3, 4, 5, 6]))).toBe(erzeugeRef(new Uint8Array([1, 2, 3, 4, 5, 6])))
    expect(erzeugeRef(new Uint8Array([1, 2, 3, 4, 5, 6]))).not.toBe(erzeugeRef(new Uint8Array([6, 5, 4, 3, 2, 1])))
  })
})
