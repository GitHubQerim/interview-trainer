import { describe, expect, it } from 'vitest'
import { anonymisiere, parseBegriffe } from './anonymisieren'

describe('anonymisiere', () => {
  it('lässt Text ohne erkennbare Daten unverändert', () => {
    const ergebnis = anonymisiere('Ich habe ein Projekt geleitet und viel gelernt.', [])

    expect(ergebnis.text).toBe('Ich habe ein Projekt geleitet und viel gelernt.')
    expect(ergebnis.ersetzungen.gesamt).toBe(0)
  })

  it('ersetzt E-Mail-Adressen', () => {
    const ergebnis = anonymisiere('Schreib mir an max.muster@beispiel.de oder an a_b+c@x.org.', [])

    expect(ergebnis.text).toBe('Schreib mir an [E-MAIL] oder an [E-MAIL].')
    expect(ergebnis.ersetzungen.email).toBe(2)
  })

  it('ersetzt Links ohne den Satzpunkt mitzunehmen', () => {
    const ergebnis = anonymisiere('Siehe https://firma.example/projekt/42, auch www.firma.example.', [])

    expect(ergebnis.text).toBe('Siehe [LINK], auch [LINK].')
    expect(ergebnis.ersetzungen.link).toBe(2)
  })

  it('ersetzt Telefonnummern in üblichen Schreibweisen', () => {
    const ergebnis = anonymisiere('Erreichbar unter +49 170 1234567 oder 0711/123 45 67.', [])

    expect(ergebnis.text).toBe('Erreichbar unter [TELEFON] oder [TELEFON].')
    expect(ergebnis.ersetzungen.telefon).toBe(2)
  })

  it('ersetzt lange Zahlenfolgen, lässt aber kurze Zahlen und Jahre stehen', () => {
    const ergebnis = anonymisiere('Kundennummer 4711234, Postleitzahl 70173, aber 2024 und 30 Prozent.', [])

    expect(ergebnis.text).toBe('Kundennummer [ZAHL], Postleitzahl [ZAHL], aber 2024 und 30 Prozent.')
    expect(ergebnis.ersetzungen.zahl).toBe(2)
  })

  describe('eigene Begriffe', () => {
    it('ersetzt eigene Begriffe ohne Rücksicht auf Groß- und Kleinschreibung', () => {
      const ergebnis = anonymisiere('Bei Acme GmbH habe ich mit acme-Kollegen gearbeitet. ACME war toll.', ['Acme'])

      expect(ergebnis.text).toBe('Bei [GESCHWÄRZT] GmbH habe ich mit [GESCHWÄRZT]-Kollegen gearbeitet. [GESCHWÄRZT] war toll.')
      expect(ergebnis.ersetzungen.begriffe).toBe(3)
    })

    it('beachtet Wortgrenzen, auch bei Umlauten', () => {
      const ergebnis = anonymisiere('Ich bin Jan. Janus und Jänner bleiben, ebenso Jana.', ['Jan'])

      expect(ergebnis.text).toBe('Ich bin [GESCHWÄRZT]. Janus und Jänner bleiben, ebenso Jana.')
    })

    it('behandelt Sonderzeichen in Begriffen als normalen Text (kein Regex-Absturz)', () => {
      const ergebnis = anonymisiere('Ich schreibe C++ und (alpha) sowie a.b*c.', ['C++', '(alpha)', 'a.b*c'])

      expect(ergebnis.text).toBe('Ich schreibe [GESCHWÄRZT] und [GESCHWÄRZT] sowie [GESCHWÄRZT].')
    })

    it('ersetzt mehrwortige Begriffe', () => {
      const ergebnis = anonymisiere('Ich arbeite bei Muster Maschinenbau AG in Ulm.', ['Muster Maschinenbau AG'])

      expect(ergebnis.text).toBe('Ich arbeite bei [GESCHWÄRZT] in Ulm.')
    })

    it('ignoriert leere und einbuchstabige Begriffe', () => {
      const ergebnis = anonymisiere('a b c', ['', ' ', 'a'])

      expect(ergebnis.text).toBe('a b c')
    })

    it('zerlegt keine Platzhalter, wenn ein Begriff wie ein Platzhaltername lautet', () => {
      const ergebnis = anonymisiere('Mail a@b.de, Link www.x.de und Zahl 12345 bei LINK.', ['LINK', 'ZAHL', 'E-MAIL'])

      // Die Wörter "Link" und "Zahl" im Satz sind echte Treffer für die Begriffe; die
      // Platzhalter [LINK] und [ZAHL] bleiben dabei heil.
      expect(ergebnis.text).toBe('Mail [E-MAIL], [GESCHWÄRZT] [LINK] und [GESCHWÄRZT] [ZAHL] bei [GESCHWÄRZT].')
      expect(ergebnis.text).not.toContain('[[')
      expect(ergebnis.ersetzungen.begriffe).toBe(3)
      expect(ergebnis.ersetzungen.gesamt).toBe(6)
    })

    it('ersetzt längere Begriffe zuerst, damit Teilbegriffe sie nicht zerlegen', () => {
      const ergebnis = anonymisiere('Anna Schmidt arbeitet mit Anna.', ['Anna', 'Anna Schmidt'])

      expect(ergebnis.text).toBe('[GESCHWÄRZT] arbeitet mit [GESCHWÄRZT].')
      expect(ergebnis.ersetzungen.begriffe).toBe(2)
    })
  })

  it('zählt alle Ersetzungen zusammen', () => {
    const ergebnis = anonymisiere('Mail a@b.de, Tel 0711 1234567, bei Acme.', ['Acme'])

    expect(ergebnis.ersetzungen.gesamt).toBe(3)
  })

  it('verwendet keine Platzhalter, die selbst wieder Treffer ergeben (idempotent)', () => {
    const einmal = anonymisiere('Mail a@b.de und Acme 12345678.', ['Acme'])
    const zweimal = anonymisiere(einmal.text, ['Acme'])

    expect(zweimal.text).toBe(einmal.text)
    expect(zweimal.ersetzungen.gesamt).toBe(0)
  })

  it('übersteht sehr lange Eingaben ohne Treffer in vernünftiger Zeit', () => {
    const lang = 'wort '.repeat(20_000)

    const start = performance.now()
    anonymisiere(lang, ['wortwort'])

    expect(performance.now() - start).toBeLessThan(1000)
  })
})

describe('parseBegriffe', () => {
  it('trennt an Komma, Semikolon und Zeilenumbruch und trimmt', () => {
    expect(parseBegriffe('Acme, Max Muster;  Projekt X\nUlm')).toEqual(['Acme', 'Max Muster', 'Projekt X', 'Ulm'])
  })

  it('entfernt Duplikate, leere Einträge und zu lange Begriffe und begrenzt die Anzahl', () => {
    const viele = Array.from({ length: 80 }, (_, i) => `Begriff${i}`).join(',')

    expect(parseBegriffe('Acme, acme, ,x'.concat(',', 'y'.repeat(200)))).toEqual(['Acme'])
    expect(parseBegriffe(viele)).toHaveLength(50)
  })
})
