import { describe, expect, it } from 'vitest'
import type { AudioFrameErgebnis } from './interview'
import type { Auswertung } from './score'
import { analysiereVad, berechneRedefluss, ergaenzeRedefluss, zaehleFuellwoerter } from './redefluss'

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

describe('berechneRedefluss ohne klare Stille in der Aufnahme', () => {
  // Realer Normalfall: wer die ganze Antwort ueber spricht, hat kein stilles
  // Zehntel, aus dem sich ein Rauschboden schaetzen liesse. Vorher lag das
  // 10.-Perzentil dann auf Sprechpegel, die Schwelle (3x) darueber, und der Redefluss
  // kam bei fluessigem Sprechen auf 4-12 % oder "keine Daten" (Test 21.10.2026).
  const SPRECHPEGEL_SCHWANKEND = [0.02, 0.08, 0.12, 0.05, 0.1, 0.03, 0.09, 0.06]

  function schwankend(anzahl: number, start = 0) {
    return Array.from({ length: anzahl }, (_, i) =>
      frame(start + i * 200, SPRECHPEGEL_SCHWANKEND[i % SPRECHPEGEL_SCHWANKEND.length] ?? 0.05),
    )
  }

  it('wertet gleichmaessiges Sprechen ohne Pausen als nahezu 100 % Redefluss', () => {
    const frames = Array.from({ length: 100 }, (_, i) => frame(i * 200, 0.06 + (i % 3) * 0.01))

    const ergebnis = berechneRedefluss(frames)

    expect(ergebnis.redeflussProzent).toBeCloseTo(100)
    expect(ergebnis.laengstePauseSekunden).toBe(0)
  })

  it('wertet Sprechen mit schwankender Lautstaerke als zusammenhaengend, solange Luecken kurz sind', () => {
    const ergebnis = berechneRedefluss(schwankend(100))

    expect(ergebnis.redeflussProzent).toBeGreaterThan(90)
    expect(ergebnis.laengstePauseSekunden).toBeLessThan(0.8)
  })

  it('zaehlt kurze Atem- und Wortluecken (unter 0,8 s) nicht als Pause', () => {
    // 2s Stille vorab (Rauschboden), dann Sprechen mit je einer 200ms-Luecke.
    const stille = Array.from({ length: 10 }, (_, i) => frame(i * 200, 0.003))
    const sprechen = Array.from({ length: 50 }, (_, i) => frame(2000 + i * 200, i % 5 === 4 ? 0.003 : 0.1))

    const ergebnis = berechneRedefluss([...stille, ...sprechen])

    expect(ergebnis.laengstePauseSekunden).toBe(0)
    expect(ergebnis.redeflussProzent).toBeCloseTo(100)
  })

  it('erkennt eine echte Pause von etwa 4 s mitten in schwankendem Sprechen', () => {
    // 5s Sprechen, 4s Pause (Raum-Grundpegel), 5s Sprechen.
    const vorher = schwankend(25)
    const pause = Array.from({ length: 20 }, (_, i) => frame(5000 + i * 200, 0.003))
    const nachher = schwankend(25, 9000)

    const ergebnis = berechneRedefluss([...vorher, ...pause, ...nachher])

    expect(ergebnis.laengstePauseSekunden).toBeCloseTo(4, 0)
    expect(ergebnis.redeflussProzent).toBeGreaterThan(50)
    expect(ergebnis.redeflussProzent).toBeLessThan(75)
  })

  it('erkennt auch leises Sprechen ueber einem konstanten Raumpegel', () => {
    const raum = Array.from({ length: 10 }, (_, i) => frame(i * 200, 0.003))
    const leise = Array.from({ length: 40 }, (_, i) => frame(2000 + i * 200, i % 2 === 0 ? 0.02 : 0.03))

    const ergebnis = berechneRedefluss([...raum, ...leise])

    expect(ergebnis.redeflussProzent).toBeCloseTo(100)
  })

  it('liefert null bei durchgehend leisem Raumrauschen', () => {
    const frames = Array.from({ length: 50 }, (_, i) => frame(i * 200, 0.003 + (i % 2) * 0.001))

    expect(berechneRedefluss(frames).redeflussProzent).toBeNull()
  })
})

describe('analysiereVad', () => {
  it('liefert Pegel, Rauschboden und Schwelle fuer die Anzeige im Debug-Overlay', () => {
    const werte = [...Array.from({ length: 10 }, () => 0.003), ...Array.from({ length: 40 }, () => 0.1)]

    const analyse = analysiereVad(werte)

    expect(analyse.stille).toBe(false)
    expect(analyse.durchgehend).toBe(false)
    expect(analyse.schwelle).toBeGreaterThan(0.003)
    expect(analyse.schwelle).toBeLessThan(0.1)
  })

  it('ignoriert ungültige Messwerte (NaN) statt die Perzentile zu verfälschen', () => {
    const werte = [...Array.from({ length: 10 }, () => 0.003), Number.NaN, ...Array.from({ length: 40 }, () => 0.1)]

    const analyse = analysiereVad(werte)

    expect(Number.isFinite(analyse.schwelle)).toBe(true)
    expect(analyse.stille).toBe(false)
    expect(analyse.durchgehend).toBe(false)
  })

  it('meldet Stille, wenn selbst die lautesten Werte unter dem Mindestpegel liegen', () => {
    expect(analysiereVad(Array.from({ length: 30 }, () => 0.002)).stille).toBe(true)
  })

  it('meldet durchgehendes Sprechen, wenn kein Pegelabstand erkennbar ist', () => {
    const analyse = analysiereVad(Array.from({ length: 30 }, (_, i) => 0.08 + (i % 2) * 0.01))

    expect(analyse.stille).toBe(false)
    expect(analyse.durchgehend).toBe(true)
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
