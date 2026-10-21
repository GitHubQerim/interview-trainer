import { KI_ANTWORT_BEISPIEL } from './kiAntwort'
import {
  BEWEGUNGSRUHE_ZIELKORRIDOR,
  HALTUNG_ZIELKORRIDOR,
  KOPFAUSRICHTUNG_ZIELKORRIDOR,
  REDEFLUSS_ZIELKORRIDOR,
  type Auswertung,
} from './score'

export interface KiPromptFrage {
  nr: number
  frage: string
  // null = nicht mitgeben (Nutzer:in hat es abgewaehlt oder es liegt nicht vor)
  transkript: string | null
  kennzahlen: string[] | null
}

export interface KiPromptEingabe {
  ref: string
  beruf?: string
  schwierigkeit?: string
  fragen: KiPromptFrage[]
}

// Ohne leicht verwechselbare Zeichen (0/O, 1/I/L), damit sich die REF abtippen laesst.
const REF_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const REF_LAENGE = 6

/**
 * Kurze Zufalls-Kennung fuer eine Auswertung. Sie wird nicht aus Token oder Nutzerdaten
 * abgeleitet; die Bytes kommen von aussen (crypto.getRandomValues), damit die Funktion
 * testbar bleibt. Dient nur als Plausibilitaetscheck beim Einfuegen der KI-Antwort.
 */
export function erzeugeRef(zufallsBytes: Uint8Array): string {
  return Array.from({ length: REF_LAENGE }, (_, i) => REF_ALPHABET[(zufallsBytes[i] ?? 0) % REF_ALPHABET.length]).join('')
}

function komma(wert: number, stellen = 1): string {
  return wert.toFixed(stellen).replace('.', ',')
}

/**
 * Kennzahlen als kurze Textzeilen fuer den Prompt. Nennt immer den Orientierungsbereich,
 * damit die KI sie als grobe Richtwerte und nicht als Urteil liest.
 */
export function formatKennzahlen(auswertung: Auswertung): string[] {
  const zeilen: string[] = []

  if (auswertung.kopfausrichtungProzent !== null) {
    zeilen.push(
      `Kopfausrichtung: ${Math.round(auswertung.kopfausrichtungProzent)} % der Zeit zur Kamera (Orientierung ${KOPFAUSRICHTUNG_ZIELKORRIDOR.min}–${KOPFAUSRICHTUNG_ZIELKORRIDOR.max} %)`,
    )
  }
  if (auswertung.haltungGradMedian !== null) {
    zeilen.push(
      `Haltung: Schultern im Schnitt ${komma(auswertung.haltungGradMedian)}° geneigt (Orientierung ${HALTUNG_ZIELKORRIDOR.min}–${HALTUNG_ZIELKORRIDOR.max}°)`,
    )
  }
  if (auswertung.bewegungsruhe !== null) {
    zeilen.push(
      `Bewegung: ${komma(auswertung.bewegungsruhe, 2)} (höher = unruhiger; Orientierung bis ${komma(BEWEGUNGSRUHE_ZIELKORRIDOR.max, 2)})`,
    )
  }
  if (auswertung.redeflussProzent !== null) {
    const pause =
      auswertung.laengstePauseSekunden !== null ? `, längste Pause ${komma(auswertung.laengstePauseSekunden)} s` : ''
    zeilen.push(
      `Redefluss: ${Math.round(auswertung.redeflussProzent)} % Sprechanteil${pause} (Orientierung ${REDEFLUSS_ZIELKORRIDOR.min}–${REDEFLUSS_ZIELKORRIDOR.max} %)`,
    )
  }
  if (auswertung.fuellwoerterProMinute !== null) {
    zeilen.push(`Füllwörter: ${komma(auswertung.fuellwoerterProMinute)} pro Minute (nur grobe Schätzung)`)
  }

  return zeilen
}

/**
 * Baut den Text, den Nutzer:innen selbst in ihre eigene KI kopieren. Reine Textfunktion,
 * kein Netzwerk: die App ruft kein Sprachmodell auf (ADR-0001), sie erzeugt und liest Text.
 * Sprache und Antwortformat sind feste Konstanten; das Beispielformat ist dasselbe, das
 * `parseKiAntwort` akzeptiert (siehe kiAntwort.ts).
 */
export function baueKiPrompt(eingabe: KiPromptEingabe): string {
  const mitTranskript = eingabe.fragen.some((frage) => frage.transkript !== null)
  const mitKennzahlen = eingabe.fragen.some((frage) => frage.kennzahlen !== null && frage.kennzahlen.length > 0)

  const kontext = [eingabe.beruf ? `Beruf: ${eingabe.beruf}` : null, eingabe.schwierigkeit ? `Schwierigkeit: ${eingabe.schwierigkeit}` : null]
    .filter((teil): teil is string => teil !== null)
    .join(', ')

  const regeln = [
    'Gib mir Rückmeldung zum Inhalt und zur Formulierung meiner Antworten: Struktur, Konkretheit, Beispiele, Ergebnis, Verständlichkeit.',
    'Bewerte NICHT, ob ich für eine Stelle geeignet bin. Das hier ist reines Training.',
    'Erfinde keine Angaben, die nicht in meinem Text stehen.',
    mitTranskript
      ? 'Das Transkript stammt aus automatischer Spracherkennung: Satzzeichen fehlen, Füllwörter wie „äh“ fehlen oft und Wörter können falsch erkannt sein. Werte das nicht als Fehler von mir.'
      : null,
    mitKennzahlen
      ? 'Die Kennzahlen sind grobe Orientierungswerte aus einer automatischen Videoanalyse und keine Aussage über meine Person.'
      : null,
  ].filter((regel): regel is string => regel !== null)

  const abschnitte = eingabe.fragen.map((frage) => {
    const teile = [`--- Frage ${frage.nr} ---`, `Frage: ${frage.frage}`]

    if (frage.kennzahlen !== null && frage.kennzahlen.length > 0) {
      teile.push('Kennzahlen:', ...frage.kennzahlen.map((zeile) => `- ${zeile}`))
    }
    if (frage.transkript !== null) {
      teile.push('Meine Antwort (Transkript):', frage.transkript.trim() || '(leer)')
    }

    return teile.join('\n')
  })

  return [
    `Du bist ein erfahrener Interview-Coach. Ich übe ein Bewerbungsgespräch${kontext ? ` (${kontext})` : ''}. Unten stehen meine Fragen${mitTranskript ? ' mit dem Transkript meiner Antworten' : ''}${mitKennzahlen ? `${mitTranskript ? ' und' : ' mit'} Kennzahlen` : ''}.`,
    '',
    'Regeln:',
    ...regeln.map((regel) => `- ${regel}`),
    '',
    'Antworte ausschließlich mit JSON in genau diesem Format, ohne Text davor oder danach:',
    KI_ANTWORT_BEISPIEL.replace('REF_HIER', eingabe.ref),
    '',
    `REF: ${eingabe.ref} (bitte unverändert im Feld „ref“ übernehmen)`,
    '',
    abschnitte.join('\n\n'),
  ].join('\n')
}
