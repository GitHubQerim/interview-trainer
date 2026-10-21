import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { haltungsWinkel, kopfZentriertheit, schulterbreite } from './features'
import { istImZielkorridor, KOPFAUSRICHTUNG_SCHWELLE } from './score'

export type HinweisStatus = 'ok' | 'achtung' | 'unbekannt'

export interface SetupHinweis {
  id: 'kopf-im-bild' | 'kopf-zur-kamera' | 'schultern-sichtbar' | 'abstand' | 'schulterneigung'
  status: HinweisStatus
  text: string
  detail: string | null
}

const POSE_LINKE_SCHULTER = 11
const POSE_RECHTE_SCHULTER = 12

// Herkunft: eigene Einschaetzung, ab wann MediaPipe eine Schulter eher "rät" als
// sieht - nicht empirisch validiert. Anlass zur Aenderung: Vorschau meldet bei
// sichtbaren Schultern faelschlich "nicht im Bild" (oder umgekehrt).
const MINDEST_SICHTBARKEIT = 0.5

// Herkunft: eigene Einschaetzung, nicht empirisch validiert. Kopf soll nicht am
// Bildrand abgeschnitten werden; ein kleiner Rand wird toleriert.
const BILDRAND_TOLERANZ = 0.02

// Herkunft: eigene Einschaetzung fuer typisches Webcam-Framing (Kopf und Schultern
// im Bild), nicht empirisch validiert. Schulterbreite relativ zur Bildbreite.
const SCHULTERBREITE_KORRIDOR = { min: 0.25, max: 0.6 }

function imBild(punkt: NormalizedLandmark): boolean {
  return punkt.x >= 0 && punkt.x <= 1 && punkt.y >= 0 && punkt.y <= 1
}

function schulternSichtbar(pose: NormalizedLandmark[]): boolean {
  const links = pose[POSE_LINKE_SCHULTER]
  const rechts = pose[POSE_RECHTE_SCHULTER]
  if (!links || !rechts) {
    return false
  }
  return [links, rechts].every((schulter) => (schulter.visibility ?? 1) >= MINDEST_SICHTBARKEIT && imBild(schulter))
}

function bewerteKopf(face: NormalizedLandmark[]): SetupHinweis {
  if (face.length === 0) {
    return { id: 'kopf-im-bild', status: 'unbekannt', text: 'Kopf nicht erkannt', detail: null }
  }

  const xWerte = face.map((punkt) => punkt.x)
  const yWerte = face.map((punkt) => punkt.y)
  const angeschnitten =
    Math.min(...xWerte) < BILDRAND_TOLERANZ ||
    Math.max(...xWerte) > 1 - BILDRAND_TOLERANZ ||
    Math.min(...yWerte) < BILDRAND_TOLERANZ

  return angeschnitten
    ? { id: 'kopf-im-bild', status: 'achtung', text: 'Kopf wird angeschnitten', detail: null }
    : { id: 'kopf-im-bild', status: 'ok', text: 'Kopf im Bild', detail: null }
}

function bewerteKopfAusrichtung(face: NormalizedLandmark[]): SetupHinweis {
  const ausrichtung = kopfZentriertheit(face)
  if (ausrichtung === null) {
    return { id: 'kopf-zur-kamera', status: 'unbekannt', text: 'Kopfrichtung unbekannt', detail: null }
  }

  const detail = `Ausrichtung ${Math.round(ausrichtung * 100)} %`
  return ausrichtung >= KOPFAUSRICHTUNG_SCHWELLE
    ? { id: 'kopf-zur-kamera', status: 'ok', text: 'Kopf zur Kamera', detail }
    : { id: 'kopf-zur-kamera', status: 'achtung', text: 'Kopf zur Kamera drehen', detail }
}

function bewerteSchultern(pose: NormalizedLandmark[]): SetupHinweis {
  if (pose.length === 0) {
    return { id: 'schultern-sichtbar', status: 'unbekannt', text: 'Schultern nicht erkannt', detail: null }
  }

  return schulternSichtbar(pose)
    ? { id: 'schultern-sichtbar', status: 'ok', text: 'Schultern sichtbar', detail: null }
    : { id: 'schultern-sichtbar', status: 'achtung', text: 'Schultern nicht im Bild', detail: null }
}

function bewerteAbstand(pose: NormalizedLandmark[]): SetupHinweis {
  const breite = schulternSichtbar(pose) ? schulterbreite(pose) : null
  if (breite === null) {
    return { id: 'abstand', status: 'unbekannt', text: 'Abstand unbekannt', detail: null }
  }

  const detail = `${Math.round(breite * 100)} % der Bildbreite`
  if (breite < SCHULTERBREITE_KORRIDOR.min) {
    return { id: 'abstand', status: 'achtung', text: 'Etwas näher an die Kamera', detail }
  }
  if (breite > SCHULTERBREITE_KORRIDOR.max) {
    return { id: 'abstand', status: 'achtung', text: 'Etwas weiter weg von der Kamera', detail }
  }
  return { id: 'abstand', status: 'ok', text: 'Abstand passt', detail }
}

function bewerteNeigung(pose: NormalizedLandmark[]): SetupHinweis {
  const winkel = schulternSichtbar(pose) ? haltungsWinkel(pose) : null
  if (winkel === null) {
    return { id: 'schulterneigung', status: 'unbekannt', text: 'Schulterneigung unbekannt', detail: null }
  }

  const detail = `${winkel.toFixed(1)}° Neigung`
  return istImZielkorridor('haltung', winkel)
    ? { id: 'schulterneigung', status: 'ok', text: 'Schultern waagerecht', detail }
    : { id: 'schulterneigung', status: 'achtung', text: 'Schultern waagerecht halten', detail }
}

/**
 * Live-Hinweise fuer die Kameravorschau im Setup. Nutzt dieselben Features und den
 * Haltungs-Zielkorridor der Auswertung, damit die Vorschau nie anders bewertet als
 * das spaetere Ergebnis. Die Kopfausrichtung ist dabei, seit der Test vom 21.10.2026 gezeigt
 * hat, dass der Rohwert mit seitlicher Drehung deutlich faellt (frontal 0,92-0,97, mittlere
 * Drehung 0,52, Profil 0,03).
 */
export function bewerteKameraSetup(face: NormalizedLandmark[], pose: NormalizedLandmark[]): SetupHinweis[] {
  return [bewerteKopf(face), bewerteKopfAusrichtung(face), bewerteSchultern(pose), bewerteAbstand(pose), bewerteNeigung(pose)]
}
