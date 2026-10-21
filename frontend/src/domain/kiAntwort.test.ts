import { describe, expect, it } from 'vitest'
import { KI_ANTWORT_BEISPIEL, parseKiAntwort } from './kiAntwort'

const MINIMAL = {
  ref: 'AB12CD',
  fragen: [{ nr: 1, staerken: ['klar'], verbesserungen: ['konkreter'], gesamteindruck: 'solide' }],
}

function ok(eingabe: string) {
  const ergebnis = parseKiAntwort(eingabe)
  if (!ergebnis.ok) {
    throw new Error(`Erwartet ok, bekam: ${ergebnis.fehler}`)
  }
  return ergebnis.antwort
}

function fehler(eingabe: string): string {
  const ergebnis = parseKiAntwort(eingabe)
  if (ergebnis.ok) {
    throw new Error('Erwartet Fehler')
  }
  return ergebnis.fehler
}

describe('parseKiAntwort', () => {
  it('liest eine gültige Antwort', () => {
    const antwort = ok(JSON.stringify(MINIMAL))

    expect(antwort.ref).toBe('AB12CD')
    expect(antwort.fragen).toEqual([
      { nr: 1, staerken: ['klar'], verbesserungen: ['konkreter'], formulierungen: [], gesamteindruck: 'solide' },
    ])
    expect(antwort.naechsteSchritte).toEqual([])
  })

  it('akzeptiert das Beispiel, das der Prompt vorgibt', () => {
    expect(parseKiAntwort(KI_ANTWORT_BEISPIEL).ok).toBe(true)
  })

  it('findet das JSON in Text und Code-Fences, wie KIs es oft liefern', () => {
    const eingabe = `Gerne! Hier ist die Auswertung:\n\n\`\`\`json\n${JSON.stringify(MINIMAL, null, 2)}\n\`\`\`\n\nViel Erfolg!`

    expect(ok(eingabe).fragen).toHaveLength(1)
  })

  it('erkennt Klammern in Texten nicht als Ende des JSON', () => {
    const eingabe = JSON.stringify({
      ...MINIMAL,
      fragen: [{ nr: 1, staerken: ['nutze {geschweifte} Klammern } im Text'], verbesserungen: [], gesamteindruck: '' }],
    })

    expect(ok(`Antwort: ${eingabe} Ende`).fragen[0]?.staerken[0]).toBe('nutze {geschweifte} Klammern } im Text')
  })

  describe('Fehler mit verständlicher Meldung', () => {
    it('meldet leere Eingabe', () => {
      expect(fehler('   ')).toMatch(/leer|eingefügt/i)
    })

    it('meldet Text ohne JSON', () => {
      expect(fehler('Das war eine gute Antwort, weiter so.')).toMatch(/JSON/)
    })

    it('meldet ungültiges JSON', () => {
      expect(fehler('{ "fragen": [ { "nr": 1, ')).toMatch(/JSON/)
    })

    it('meldet fehlendes Feld fragen', () => {
      expect(fehler('{"ref":"X"}')).toMatch(/fragen/)
    })

    it('meldet eine Frage ohne jeden Inhalt mit ihrer Nummer', () => {
      expect(fehler(JSON.stringify({ fragen: [{ nr: 1, staerken: ['a'] }, { nr: 2 }] }))).toMatch(/Frage 2/)
    })

    it('lehnt zu lange Eingaben ab, bevor sie geparst werden', () => {
      expect(fehler(`{"fragen":[],"x":"${'a'.repeat(60_000)}"}`)).toMatch(/zu lang/i)
    })
  })

  describe('toleranter, aber begrenzter Umgang mit Feldern', () => {
    it('füllt fehlende optionale Felder mit leeren Werten', () => {
      const antwort = ok(JSON.stringify({ fragen: [{ nr: 1, staerken: ['a'] }] }))

      expect(antwort.ref).toBeNull()
      expect(antwort.fragen[0]).toEqual({ nr: 1, staerken: ['a'], verbesserungen: [], formulierungen: [], gesamteindruck: '' })
    })

    it('akzeptiert die Fragennummer auch als Text', () => {
      expect(ok(JSON.stringify({ fragen: [{ nr: '3', staerken: ['a'] }] })).fragen[0]?.nr).toBe(3)
    })

    it('überspringt kaputte Formulierungsvorschläge, behält gute', () => {
      const antwort = ok(
        JSON.stringify({
          fragen: [{ nr: 1, staerken: ['a'], formulierungen: [{ statt: 'x', besser: 'y' }, { statt: 'nur das' }, 'text', null] }],
        }),
      )

      expect(antwort.fragen[0]?.formulierungen).toEqual([{ statt: 'x', besser: 'y' }])
    })

    it('kürzt lange Texte und Listen', () => {
      const antwort = ok(
        JSON.stringify({
          fragen: [{ nr: 1, staerken: Array.from({ length: 30 }, (_, i) => `punkt ${i}`), gesamteindruck: 'x'.repeat(5000) }],
        }),
      )

      expect(antwort.fragen[0]?.staerken).toHaveLength(8)
      expect(antwort.fragen[0]?.gesamteindruck.length).toBeLessThanOrEqual(1000)
    })

    it('ignoriert unbekannte Felder und übernimmt nie __proto__', () => {
      const eingabe = '{"__proto__":{"polluted":true},"fragen":[{"nr":1,"staerken":["a"],"__proto__":{"polluted":true},"extra":1}]}'

      const antwort = ok(eingabe)

      expect(({} as Record<string, unknown>).polluted).toBeUndefined()
      expect(Object.keys(antwort.fragen[0] ?? {}).sort()).toEqual(['formulierungen', 'gesamteindruck', 'nr', 'staerken', 'verbesserungen'])
    })

    it('verwirft eine ungültige REF, statt sie anzuzeigen', () => {
      expect(ok(JSON.stringify({ ref: '<script>x</script>', fragen: [{ nr: 1, staerken: ['a'] }] })).ref).toBeNull()
    })

    it('lässt Text unverändert (Schutz vor HTML liegt beim Rendern als reinem Text)', () => {
      const payload = '<img src=x onerror=alert(1)>'

      expect(ok(JSON.stringify({ fragen: [{ nr: 1, staerken: [payload] }] })).fragen[0]?.staerken[0]).toBe(payload)
    })

    it('begrenzt die Zahl der Fragen', () => {
      const fragen = Array.from({ length: 40 }, (_, i) => ({ nr: i + 1, staerken: ['a'] }))

      expect(ok(JSON.stringify({ fragen })).fragen).toHaveLength(20)
    })
  })

  it('nummeriert die Fragen nach Position neu, wenn die KI Nummern doppelt vergibt', () => {
    const antwort = ok(
      JSON.stringify({
        fragen: [
          { nr: 1, staerken: ['a'] },
          { nr: 1, staerken: ['b'] },
          { nr: 2, staerken: ['c'] },
        ],
      }),
    )

    expect(antwort.fragen.map((frage) => frage.nr)).toEqual([1, 2, 3])
  })

  it('behält die Nummern der KI, wenn sie eindeutig sind (auch mit Lücken)', () => {
    const antwort = ok(JSON.stringify({ fragen: [{ nr: 1, staerken: ['a'] }, { nr: 3, staerken: ['b'] }] }))

    expect(antwort.fragen.map((frage) => frage.nr)).toEqual([1, 3])
  })

  it('übernimmt nächste Schritte als Liste', () => {
    expect(ok(JSON.stringify({ ...MINIMAL, naechsteSchritte: ['üben', 'kürzen'] })).naechsteSchritte).toEqual(['üben', 'kürzen'])
  })
})
