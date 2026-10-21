export interface Ersetzungen {
  email: number
  link: number
  telefon: number
  zahl: number
  begriffe: number
  gesamt: number
}

export interface AnonymisierungsErgebnis {
  text: string
  ersetzungen: Ersetzungen
}

export const PLATZHALTER = ['[E-MAIL]', '[LINK]', '[TELEFON]', '[ZAHL]', '[GESCHWÄRZT]'] as const

const PLATZHALTER_MUSTER = /(\[(?:E-MAIL|LINK|TELEFON|ZAHL|GESCHWÄRZT)\])/

const MAX_BEGRIFFE = 50
const MAX_BEGRIFF_LAENGE = 60
const MIN_BEGRIFF_LAENGE = 2

// Herkunft: eigene Einschaetzung, nicht empirisch validiert. Zahlenfolgen ab fuenf
// Ziffern (Postleitzahlen, Kunden- und Vertragsnummern) werden ersetzt, kuerzere Zahlen
// und Jahre bleiben stehen, weil sie fuer den Inhalt einer Antwort oft wichtig sind.
const LANGE_ZAHL = /(?<!\d)\d{5,}(?!\d)/g

const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.\p{L}{2,}/gu
const LINK = /(?:https?:\/\/|www\.)[^\s]+/gu
// Beginnt mit +, 00 oder 0 und enthaelt mindestens sieben Ziffern; reine Ziffernfolgen
// ohne fuehrende Null fallen unter LANGE_ZAHL. Datumsangaben wie 01.02.2024 treffen
// ebenfalls - zu viel Schwaerzen ist hier die sichere Seite.
const TELEFON = /(?<!\d)(?:\+\d|0\d)[\d\s/().-]{5,}\d(?!\d)/g

function leereErsetzungen(): Ersetzungen {
  return { email: 0, link: 0, telefon: 0, zahl: 0, begriffe: 0, gesamt: 0 }
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function ersetzeLink(treffer: string): string {
  // Satzzeichen am Ende gehoeren zum Satz, nicht zum Link.
  const ende = treffer.match(/[.,;:!?)]+$/u)?.[0] ?? ''
  return `[LINK]${ende}`
}

function ziffern(text: string): number {
  return text.replace(/\D/g, '').length
}

/**
 * Ersetzt erkennbare personenbezogene Angaben durch Platzhalter: E-Mail-Adressen, Links,
 * Telefonnummern, lange Zahlenfolgen und die vom Nutzer angegebenen Begriffe (Name,
 * Arbeitgeber, Projektnamen).
 *
 * Das ist eine Heuristik ohne Namenserkennung (im Deutschen sind alle Hauptwoerter
 * grossgeschrieben, eine Erkennung allein ueber Grossbuchstaben waere unzuverlaessig,
 * ein lokales Modell eine grosse neue Abhaengigkeit). Namen, Orte und Firmen erkennt sie
 * NICHT von selbst - die Oberflaeche zeigt deshalb eine Vorschau, die Nutzer:innen pruefen
 * muessen, und verspricht keine vollstaendige Anonymisierung. Gesprochene Zahlen ("null
 * eins sieben ...") und Transkripte ohne Satzzeichen werden ebenfalls nicht erkannt.
 */
export function anonymisiere(text: string, begriffe: string[]): AnonymisierungsErgebnis {
  const ersetzungen = leereErsetzungen()
  let ergebnis = text

  ergebnis = ergebnis.replace(EMAIL, () => {
    ersetzungen.email += 1
    return '[E-MAIL]'
  })

  ergebnis = ergebnis.replace(LINK, (treffer) => {
    ersetzungen.link += 1
    return ersetzeLink(treffer)
  })

  const geordneteBegriffe = [...begriffe]
    .map((begriff) => begriff.trim())
    .filter((begriff) => begriff.length >= MIN_BEGRIFF_LAENGE)
    .sort((a, b) => b.length - a.length)

  for (const begriff of geordneteBegriffe) {
    const regex = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(begriff)}(?![\\p{L}\\p{N}])`, 'giu')
    // Nur ausserhalb bereits gesetzter Platzhalter ersetzen: ein Begriff wie "LINK" soll
    // nicht den Platzhalter [LINK] zu [[GESCHWÄRZT]] zerlegen.
    ergebnis = ergebnis
      .split(PLATZHALTER_MUSTER)
      .map((teil) =>
        PLATZHALTER_MUSTER.test(teil)
          ? teil
          : teil.replace(regex, () => {
              ersetzungen.begriffe += 1
              return '[GESCHWÄRZT]'
            }),
      )
      .join('')
  }

  ergebnis = ergebnis.replace(TELEFON, (treffer) => {
    if (ziffern(treffer) < 7) {
      return treffer
    }
    ersetzungen.telefon += 1
    return '[TELEFON]'
  })

  ergebnis = ergebnis.replace(LANGE_ZAHL, () => {
    ersetzungen.zahl += 1
    return '[ZAHL]'
  })

  ersetzungen.gesamt =
    ersetzungen.email + ersetzungen.link + ersetzungen.telefon + ersetzungen.zahl + ersetzungen.begriffe

  return { text: ergebnis, ersetzungen }
}

/**
 * Zerlegt die Eingabe "Begriffe zum Schwaerzen" (Komma, Semikolon oder Zeilenumbruch) in
 * eine bereinigte Liste: getrimmt, ohne Duplikate (Gross-/Kleinschreibung egal), ohne zu
 * kurze oder zu lange Eintraege, hoechstens MAX_BEGRIFFE.
 */
export function parseBegriffe(eingabe: string): string[] {
  const gesehen = new Set<string>()
  const begriffe: string[] = []

  for (const roh of eingabe.split(/[,;\n]/)) {
    const begriff = roh.trim()
    const schluessel = begriff.toLowerCase()
    if (begriff.length < MIN_BEGRIFF_LAENGE || begriff.length > MAX_BEGRIFF_LAENGE || gesehen.has(schluessel)) {
      continue
    }
    gesehen.add(schluessel)
    begriffe.push(begriff)
    if (begriffe.length >= MAX_BEGRIFFE) {
      break
    }
  }

  return begriffe
}
