import type { AudioFrameErgebnis } from './interview'
import type { Auswertung } from './score'

// Herkunft: eigene Einschaetzung, nicht empirisch validiert - wie die anderen
// Schwellwerte im Projekt. Verhindert, dass eine sehr leise Aufnahme einen
// Perzentil-Wert nahe Null liefert, der schon kleinstes Quantisierungsrauschen
// als "sprechend" zaehlen wuerde. Deckt NICHT den umgekehrten Fall ab (nahezu
// pausenloses Sprechen, bei dem schon das Perzentil selbst auf Sprachpegel liegt) -
// siehe ADR-0008, bekannte Grenze.
const RAUSCHBODEN_MINIMUM = 0.01

// Herkunft: eigene Einschaetzung, nicht empirisch validiert.
const VAD_SCHWELLE_FAKTOR = 3

// Herkunft: eigene Einschaetzung, nicht empirisch validiert. Verhindert absurde
// Fuellwort-Raten aus wenigen Sekunden Sprechzeit (z.B. 1 Fuellwort in 2 Sekunden
// hochgerechnet auf 30/Minute).
const MINDEST_SPRECHZEIT_SEKUNDEN = 5

// Herkunft: gaengige deutsche Fuellwoerter aus allgemeiner Beobachtung, keine
// empirische Quelle. Caveat: naives Wortmatching ueberschaetzt systematisch -
// "also" und "genau" sind oft legitime Satzanschluesse/Bestaetigungen, keine
// Fuellwoerter. Nicht empirisch validiert, Anlass zur Aenderung: eigene
// Testaufnahmen zeigen eine sinnvollere Liste.
export const FUELLWOERTER = [
  'äh',
  'ähm',
  'also',
  'halt',
  'quasi',
  'sozusagen',
  'genau',
  'ne',
  'eigentlich',
  'irgendwie',
]

export interface RedeflussErgebnis {
  redeflussProzent: number | null
  laengstePauseSekunden: number | null
  sprechzeitSekunden: number | null
}

function perzentil(werte: number[], p: number): number {
  const sortiert = [...werte].sort((a, b) => a - b)
  const index = Math.min(sortiert.length - 1, Math.max(0, Math.floor(sortiert.length * p)))
  return sortiert[index] ?? 0
}

const UNAUSWERTBAR: RedeflussErgebnis = { redeflussProzent: null, laengstePauseSekunden: null, sprechzeitSekunden: null }

/**
 * Sprechanteil + laengste Pause, ausschliesslich innerhalb des Bereichs vom ersten
 * bis zum letzten als "sprechend" erkannten Frame - Stille vor dem ersten und nach
 * dem letzten sprechenden Frame (Vorlese-/Bedenkzeit der Frage) zaehlt bewusst nicht
 * mit, sonst waere "laengste Pause" fast immer diese Vorlesezeit statt eines
 * Stockens mitten in der Antwort.
 */
export function berechneRedefluss(frames: AudioFrameErgebnis[]): RedeflussErgebnis {
  if (frames.length < 2) {
    return UNAUSWERTBAR
  }

  const lautstaerken = frames.map((frame) => frame.lautstaerke)
  const rauschboden = Math.max(perzentil(lautstaerken, 0.1), RAUSCHBODEN_MINIMUM)
  const schwelle = rauschboden * VAD_SCHWELLE_FAKTOR
  const istSprechend = (frame: AudioFrameErgebnis) => frame.lautstaerke > schwelle

  const sprechendIndizes = frames
    .map((frame, index) => (istSprechend(frame) ? index : -1))
    .filter((index) => index !== -1)

  if (sprechendIndizes.length === 0) {
    return UNAUSWERTBAR
  }

  const start = sprechendIndizes[0]!
  const ende = sprechendIndizes[sprechendIndizes.length - 1]!

  let sprechzeitSekunden = 0
  let gesamtSekunden = 0
  let aktuellePauseSekunden = 0
  let laengstePauseSekunden = 0

  for (let i = start; i < ende; i += 1) {
    const aktuell = frames[i]!
    const naechster = frames[i + 1]!
    const dt = (naechster.zeitstempel - aktuell.zeitstempel) / 1000
    if (dt <= 0) {
      continue
    }

    gesamtSekunden += dt
    if (istSprechend(aktuell)) {
      sprechzeitSekunden += dt
      aktuellePauseSekunden = 0
    } else {
      aktuellePauseSekunden += dt
      laengstePauseSekunden = Math.max(laengstePauseSekunden, aktuellePauseSekunden)
    }
  }

  if (gesamtSekunden === 0) {
    return UNAUSWERTBAR
  }

  return {
    redeflussProzent: (sprechzeitSekunden / gesamtSekunden) * 100,
    laengstePauseSekunden,
    sprechzeitSekunden,
  }
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Zaehlt Fuellwort-Treffer im Transkript. Nutzt Unicode-Wortgrenzen (\p{L} statt \b),
 * weil JavaScripts \b auf ASCII-\w basiert und Umlaute wie "ä" nicht als
 * Wortzeichen behandelt - ein normales \bähm\b wuerde in "ich äh ähm sagte" nicht
 * treffen, weil vor "ä" keine \w/\W-Transition erkannt wird.
 */
export function zaehleFuellwoerter(transkript: string): number {
  return FUELLWOERTER.reduce((anzahl, wort) => {
    const regex = new RegExp(`(?<!\\p{L})${escapeRegex(wort)}(?!\\p{L})`, 'giu')
    const treffer = transkript.match(regex)
    return anzahl + (treffer?.length ?? 0)
  }, 0)
}

/**
 * Zentraler Merge-Punkt: reichert eine (video-basierte) Auswertung um die
 * Redefluss-Kennzahlen aus Audio-Frames und Transkript an. Wird sowohl fuer die
 * Live-Anzeige (AuswertungScreen) als auch fuer die Persistenz (aggregiereSession)
 * genutzt, damit die Merge-Logik nicht doppelt gepflegt werden muss. Nur die
 * abgeleiteten Zahlen verlassen diese Funktion - das Transkript selbst wird
 * nirgends weitergereicht, gespeichert oder geloggt.
 */
export function ergaenzeRedefluss(
  auswertung: Auswertung,
  audioErgebnisse: AudioFrameErgebnis[],
  transkript: string,
): Auswertung {
  const { redeflussProzent, laengstePauseSekunden, sprechzeitSekunden } = berechneRedefluss(audioErgebnisse)

  const fuellwoerterProMinute =
    sprechzeitSekunden !== null && sprechzeitSekunden >= MINDEST_SPRECHZEIT_SEKUNDEN
      ? zaehleFuellwoerter(transkript) / (sprechzeitSekunden / 60)
      : null

  return {
    ...auswertung,
    redeflussProzent,
    laengstePauseSekunden,
    fuellwoerterProMinute,
  }
}
