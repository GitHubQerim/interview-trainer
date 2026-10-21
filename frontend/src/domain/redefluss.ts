import type { AudioFrameErgebnis } from './interview'
import type { Auswertung } from './score'

// Herkunft: eigene Einschaetzung, nicht empirisch validiert. RMS-Pegel (0..1), unter
// dem selbst die lautesten 10 % der Aufnahme nur Raumrauschen sind. Anlass zur
// Aenderung: Testaufnahmen zeigen, dass normales Sprechen mit dem eigenen Mikrofon
// darunter liegt (dann wird Sprechen faelschlich als Stille verworfen).
const STILLE_PEGEL = 0.008

// Herkunft: eigene Einschaetzung, nicht empirisch validiert. Verhaeltnis zwischen
// lautem (90. Perzentil) und leisem (10. Perzentil) Pegel, ab dem die Aufnahme echte
// Stille enthaelt. Darunter gilt sie als durchgehend gesprochen: dann gibt es keinen
// Rauschboden, den man schaetzen koennte - frueher lag die Schwelle hier ueber dem
// Sprechpegel und ein fluessiger Vortrag kam auf 4-12 % Redefluss (Test 21.10.2026).
const MINDEST_PEGELABSTAND = 2.5

// Herkunft: eigene Einschaetzung, nicht empirisch validiert. Kuerzere Luecken
// zwischen sprechenden Frames (Wort-/Atemluecken) zaehlen als Sprechen, erst laengere
// als Pause - die Messung ist ohnehin nur ein 200-ms-Raster.
const MINDEST_PAUSE_SEKUNDEN = 0.8

// Untergrenze fuer das Verhaeltnis-Mass, damit ein exakt stiller Frame (0) keine
// Division durch null ausloest.
const RAUSCHBODEN_UNTERGRENZE = 0.001

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

export interface VadAnalyse {
  rauschboden: number
  sprechpegel: number
  // Schwelle, ab der ein Frame als sprechend zaehlt; bei stille/durchgehend ohne Bedeutung.
  schwelle: number
  stille: boolean
  durchgehend: boolean
}

/**
 * Schaetzt aus der Pegelverteilung der Aufnahme, was Stille und was Sprechen ist.
 * Rauschboden = 10. Perzentil, Sprechpegel = 90. Perzentil; die Schwelle liegt in der
 * logarithmischen Mitte dazwischen. Ist der Abstand zu klein, gibt es keine erkennbare
 * Stille (durchgehend gesprochen); liegt schon der Sprechpegel unter STILLE_PEGEL,
 * wurde gar nicht gesprochen.
 */
export function analysiereVad(lautstaerken: number[]): VadAnalyse {
  const rauschboden = Math.max(perzentil(lautstaerken, 0.1), RAUSCHBODEN_UNTERGRENZE)
  const sprechpegel = perzentil(lautstaerken, 0.9)
  const stille = sprechpegel < STILLE_PEGEL
  const durchgehend = !stille && sprechpegel / rauschboden < MINDEST_PEGELABSTAND

  return { rauschboden, sprechpegel, schwelle: Math.sqrt(rauschboden * Math.max(sprechpegel, rauschboden)), stille, durchgehend }
}

// Luecken zwischen sprechenden Frames unter MINDEST_PAUSE_SEKUNDEN zaehlen als Sprechen.
function fuelleKurzeLuecken(frames: AudioFrameErgebnis[], sprechend: boolean[]): boolean[] {
  const ergebnis = [...sprechend]
  let letzterSprechenderIndex = -1

  for (let i = 0; i < frames.length; i += 1) {
    if (!sprechend[i]) {
      continue
    }

    if (letzterSprechenderIndex !== -1 && i - letzterSprechenderIndex > 1) {
      const ersterStillerFrame = frames[letzterSprechenderIndex + 1]!
      const luecke = (frames[i]!.zeitstempel - ersterStillerFrame.zeitstempel) / 1000
      if (luecke < MINDEST_PAUSE_SEKUNDEN) {
        for (let j = letzterSprechenderIndex + 1; j < i; j += 1) {
          ergebnis[j] = true
        }
      }
    }
    letzterSprechenderIndex = i
  }

  return ergebnis
}

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

  const vad = analysiereVad(frames.map((frame) => frame.lautstaerke))
  if (vad.stille) {
    return UNAUSWERTBAR
  }

  const rohSprechend = frames.map((frame) => vad.durchgehend || frame.lautstaerke > vad.schwelle)
  const sprechend = fuelleKurzeLuecken(frames, rohSprechend)

  const start = sprechend.indexOf(true)
  const ende = sprechend.lastIndexOf(true)
  if (start === -1) {
    return UNAUSWERTBAR
  }

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
    if (sprechend[i]) {
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
