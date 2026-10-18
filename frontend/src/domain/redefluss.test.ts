import { describe, expect, it } from 'vitest'
import type { AudioFrameErgebnis } from './interview'
import type { Auswertung } from './score'
import { berechneRedefluss, ergaenzeRedefluss, zaehleFuellwoerter } from './redefluss'

function frame(zeitstempel: number, lautstaerke: number): AudioFrameErgebnis {
  return { zeitstempel, lautstaerke }
}

const LEISE = 0.001
const LAUT = 0.5

describe('berechneRedefluss', () => {
  it('liefert null bei leerem oder zu kurzem Array', () => {
    expect(berechneRedefluss([])).toEqual({
      redeflussProzent: null,
      laengstePauseSekunden: null,
      sprechzeitSekunden: null,
    })
    expect(berechneRedefluss([frame(0, LAUT)])).toEqual({
      redeflussProzent: null,
      laengstePauseSekunden: null,
      sprechzeitSekunden: null,
    })
  })

  it('liefert null, wenn kein Frame ueber dem Rauschboden liegt', () => {
    const frames = Array.from({ length: 10 }, (_, i) => frame(i * 200, LEISE))
    expect(berechneRedefluss(frames)).toEqual({
      redeflussProzent: null,
      laengstePauseSekunden: null,
      sprechzeitSekunden: null,
    })
  })

  it('schneidet fuehrende Stille heraus, bevor Redefluss/laengste Pause berechnet werden', () => {
    // 2s Stille (Vorlesezeit der Frage), dann 2s durchgehend Sprechen.
    const fuehrendeStille = Array.from({ length: 10 }, (_, i) => frame(i * 200, LEISE))
    const sprechen = Array.from({ length: 10 }, (_, i) => frame(2000 + i * 200, LAUT))
    const frames = [...fuehrendeStille, ...sprechen]

    const ergebnis = berechneRedefluss(frames)

    // Die fuehrende Stille (2s) darf NICHT als "laengste Pause" gezaehlt werden -
    // ohne durchgehendes Sprechen ist der getrimmte Bereich pausenfrei.
    expect(ergebnis.laengstePauseSekunden).toBe(0)
    expect(ergebnis.redeflussProzent).toBeCloseTo(100)
  })

  it('schneidet nachlaufende Stille heraus', () => {
    const sprechen = Array.from({ length: 10 }, (_, i) => frame(i * 200, LAUT))
    const nachlaufendeStille = Array.from({ length: 10 }, (_, i) => frame(2000 + i * 200, LEISE))
    const frames = [...sprechen, ...nachlaufendeStille]

    const ergebnis = berechneRedefluss(frames)

    expect(ergebnis.laengstePauseSekunden).toBe(0)
    expect(ergebnis.redeflussProzent).toBeCloseTo(100)
  })

  it('erkennt eine Pause mitten in der Antwort als laengste Pause, nicht die Vorlesezeit', () => {
    // Stille, sprechen, Pause mitten drin (1s), sprechen, Stille.
    const teile = [
      Array.from({ length: 5 }, (_, i) => frame(i * 200, LEISE)), // 1s Vorlesezeit
      Array.from({ length: 5 }, (_, i) => frame(1000 + i * 200, LAUT)), // 1s sprechen
      Array.from({ length: 5 }, (_, i) => frame(2000 + i * 200, LEISE)), // 1s Pause mitten drin
      Array.from({ length: 5 }, (_, i) => frame(3000 + i * 200, LAUT)), // 1s sprechen
    ]
    const frames = teile.flat()

    const ergebnis = berechneRedefluss(frames)

    // Laengste Pause muss die 1s mitten in der Antwort sein, nicht die anfaengliche
    // Vorlesezeit (die wurde bereits herausgeschnitten).
    expect(ergebnis.laengstePauseSekunden).toBeCloseTo(1, 1)
    expect(ergebnis.redeflussProzent).toBeLessThan(100)
  })
})

describe('zaehleFuellwoerter', () => {
  it('zaehlt Fuellwoerter case-insensitive mit Wortgrenzen', () => {
    expect(zaehleFuellwoerter('Also, äh, ich habe halt quasi keine Ahnung.')).toBe(4)
  })

  it('erkennt Umlaut-Fuellwoerter wie "ähm" korrekt (Unicode-Wortgrenze statt \\b)', () => {
    expect(zaehleFuellwoerter('Ich äh ähm sagte das schon.')).toBe(2)
  })

  it('zaehlt Teilwoerter nicht mit (Wortgrenzen greifen)', () => {
    expect(zaehleFuellwoerter('Genaugenommen ist das etwas anderes.')).toBe(0)
  })

  it('liefert 0 bei leerem Transkript', () => {
    expect(zaehleFuellwoerter('')).toBe(0)
  })
})

describe('ergaenzeRedefluss', () => {
  const BASIS_AUSWERTUNG: Auswertung = {
    abdeckung: 1,
    auswertbar: true,
    kopfausrichtungProzent: 85,
    haltungGradMedian: 2,
    haltungVerlauf: 0,
    bewegungsruhe: 0.1,
    redeflussProzent: null,
    laengstePauseSekunden: null,
    fuellwoerterProMinute: null,
  }

  it('setzt fuellwoerterProMinute auf null, wenn die Sprechzeit unter der Mindestschwelle liegt', () => {
    const frames = Array.from({ length: 5 }, (_, i) => frame(i * 200, LAUT)) // < 1s Sprechzeit

    const ergebnis = ergaenzeRedefluss(BASIS_AUSWERTUNG, frames, 'äh das war kurz')

    expect(ergebnis.fuellwoerterProMinute).toBeNull()
  })

  it('berechnet die Fuellwortrate bezogen auf die Sprechzeit, nicht auf die Antwortdauer', () => {
    // Realistische Mischung statt konstanter Lautstaerke: ein paar leise Frames
    // sorgen dafuer, dass das Perzentil tatsaechlich einen Rauschboden abbildet
    // (bei durchgehend gleicher Lautstaerke liegt das Perzentil auf Sprachpegel
    // selbst - genau die in ADR-0008 dokumentierte Pausenlos-Sprechen-Grenze).
    // 10s Sprechzeit (>= Mindestsprechzeit), 2 Fuellwoerter -> 12/Minute.
    const leise = Array.from({ length: 10 }, (_, i) => frame(i * 200, LEISE))
    const sprechen = Array.from({ length: 50 }, (_, i) => frame(2000 + i * 200, LAUT))
    const frames = [...leise, ...sprechen]

    const ergebnis = ergaenzeRedefluss(BASIS_AUSWERTUNG, frames, 'also äh das war die Antwort')

    expect(ergebnis.fuellwoerterProMinute).toBeCloseTo(12, 0)
  })

  it('laesst die uebrigen Auswertung-Felder unveraendert', () => {
    const ergebnis = ergaenzeRedefluss(BASIS_AUSWERTUNG, [], '')

    expect(ergebnis.kopfausrichtungProzent).toBe(85)
    expect(ergebnis.bewegungsruhe).toBe(0.1)
  })
})
