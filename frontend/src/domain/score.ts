import { haltungsWinkel, kopfZentriertheit, schulterbreite, schulterMittelpunkt } from './features'
import type { FrameErgebnis } from './interview'

export interface Auswertung {
  abdeckung: number
  auswertbar: boolean
  kopfausrichtungProzent: number | null
  haltungGradMedian: number | null
  haltungVerlauf: number | null
  bewegungsruhe: number | null
}

// Herkunft: allgemeine Interview-Ratgeberliteratur (z.B. Empfehlung "moeglichst oft
// zur Kamera schauen"), nicht empirisch validiert. Anlass zur Aenderung: eigene
// Nutzertests zeigen eine andere sinnvolle Schwelle, oder eine Quelle mit konkreten
// Werten fuer diese Zielgruppe wird gefunden.
const KOPFAUSRICHTUNG_SCHWELLE = 0.7
const KOPFAUSRICHTUNG_ZIELKORRIDOR = { min: 60, max: 80 }

// Herkunft: allgemeine Ratgeberliteratur zu Sitzhaltung in Gespraechen, nicht
// empirisch validiert. Anlass zur Aenderung: siehe oben.
const HALTUNG_ZIELKORRIDOR = { min: 0, max: 6 }

// Herkunft: aus dem Klickdummy uebernommener Beispielwert, nicht empirisch validiert.
// Anlass zur Aenderung: siehe oben.
const BEWEGUNGSRUHE_ZIELKORRIDOR = { min: 0.15, max: 0.45 }

// Herkunft: eigene Einschaetzung, ab wann eine Aufnahme zu lueckenhaft ist, um noch
// verlaessliche Aussagen zuzulassen - nicht empirisch validiert. Anlass zur Aenderung:
// echte Nutzertests zeigen, dass 60% zu streng oder zu grosszuegig ist.
const MINDEST_ABDECKUNG = 0.6

const UNAUSWERTBAR: Omit<Auswertung, 'abdeckung' | 'auswertbar'> = {
  kopfausrichtungProzent: null,
  haltungGradMedian: null,
  haltungVerlauf: null,
  bewegungsruhe: null,
}

function istErkannt(frame: FrameErgebnis): boolean {
  return frame.faceLandmarks.length > 0 && frame.poseLandmarks.length > 0
}

function median(werte: number[]): number | null {
  if (werte.length === 0) {
    return null
  }
  const sortiert = [...werte].sort((a, b) => a - b)
  const mitteIndex = Math.floor(sortiert.length / 2)

  if (sortiert.length % 2 === 0) {
    const a = sortiert[mitteIndex - 1]
    const b = sortiert[mitteIndex]
    return a === undefined || b === undefined ? null : (a + b) / 2
  }

  return sortiert[mitteIndex] ?? null
}

function durchschnitt(werte: number[]): number | null {
  if (werte.length === 0) {
    return null
  }
  return werte.reduce((summe, wert) => summe + wert, 0) / werte.length
}

function berechneKopfausrichtungProzent(erkannteFrames: FrameErgebnis[]): number | null {
  const werte = erkannteFrames
    .map((frame) => kopfZentriertheit(frame.faceLandmarks))
    .filter((wert): wert is number => wert !== null)

  if (werte.length === 0) {
    return null
  }

  const anzahlUeberSchwelle = werte.filter((wert) => wert >= KOPFAUSRICHTUNG_SCHWELLE).length
  return (anzahlUeberSchwelle / werte.length) * 100
}

function haltungswinkelWerte(frames: FrameErgebnis[]): number[] {
  return frames
    .map((frame) => haltungsWinkel(frame.poseLandmarks))
    .filter((wert): wert is number => wert !== null)
}

const MINDEST_FRAMES_PRO_DRITTEL = 2

function berechneHaltungVerlauf(erkannteFrames: FrameErgebnis[]): number | null {
  if (erkannteFrames.length === 0) {
    return null
  }

  const zeitstempel = erkannteFrames.map((frame) => frame.zeitstempel)
  const zeitMin = Math.min(...zeitstempel)
  const zeitMax = Math.max(...zeitstempel)
  const dauer = zeitMax - zeitMin
  if (dauer <= 0) {
    return null
  }

  const erstesDrittelEnde = zeitMin + dauer / 3
  const letztesDrittelStart = zeitMin + (dauer * 2) / 3

  const erstesDrittel = erkannteFrames.filter((frame) => frame.zeitstempel <= erstesDrittelEnde)
  const letztesDrittel = erkannteFrames.filter((frame) => frame.zeitstempel >= letztesDrittelStart)

  if (erstesDrittel.length < MINDEST_FRAMES_PRO_DRITTEL || letztesDrittel.length < MINDEST_FRAMES_PRO_DRITTEL) {
    return null
  }

  const medianErstesDrittel = median(haltungswinkelWerte(erstesDrittel))
  const medianLetztesDrittel = median(haltungswinkelWerte(letztesDrittel))

  if (medianErstesDrittel === null || medianLetztesDrittel === null) {
    return null
  }

  return medianLetztesDrittel - medianErstesDrittel
}

function berechneBewegungsruhe(erkannteFrames: FrameErgebnis[]): number | null {
  const raten: number[] = []

  for (let i = 1; i < erkannteFrames.length; i += 1) {
    const vorheriger = erkannteFrames[i - 1]
    const aktueller = erkannteFrames[i]
    if (!vorheriger || !aktueller) {
      continue
    }

    const dtSekunden = (aktueller.zeitstempel - vorheriger.zeitstempel) / 1000
    if (dtSekunden <= 0) {
      continue
    }

    const schulterVorher = schulterMittelpunkt(vorheriger.poseLandmarks)
    const schulterAktuell = schulterMittelpunkt(aktueller.poseLandmarks)
    const breite = schulterbreite(vorheriger.poseLandmarks)
    if (!schulterVorher || !schulterAktuell || !breite) {
      continue
    }

    const distanz = Math.hypot(schulterAktuell.x - schulterVorher.x, schulterAktuell.y - schulterVorher.y)
    raten.push(distanz / breite / dtSekunden)
  }

  return durchschnitt(raten)
}

export function berechneAuswertung(ergebnisse: FrameErgebnis[]): Auswertung {
  const gesamtanzahl = ergebnisse.length
  const erkannteFrames = ergebnisse.filter(istErkannt)
  const abdeckung = gesamtanzahl === 0 ? 0 : erkannteFrames.length / gesamtanzahl
  const auswertbar = abdeckung >= MINDEST_ABDECKUNG

  if (!auswertbar) {
    return { abdeckung, auswertbar, ...UNAUSWERTBAR }
  }

  return {
    abdeckung,
    auswertbar,
    kopfausrichtungProzent: berechneKopfausrichtungProzent(erkannteFrames),
    haltungGradMedian: median(haltungswinkelWerte(erkannteFrames)),
    haltungVerlauf: berechneHaltungVerlauf(erkannteFrames),
    bewegungsruhe: berechneBewegungsruhe(erkannteFrames),
  }
}

export function istImZielkorridor(metrik: 'kopfausrichtung' | 'haltung' | 'bewegungsruhe', wert: number): boolean {
  const korridor =
    metrik === 'kopfausrichtung'
      ? KOPFAUSRICHTUNG_ZIELKORRIDOR
      : metrik === 'haltung'
        ? HALTUNG_ZIELKORRIDOR
        : BEWEGUNGSRUHE_ZIELKORRIDOR

  return wert >= korridor.min && wert <= korridor.max
}
