import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

// MediaPipe FaceLandmarker: Nasenspitze, stabiler Standard-Index im 478-Punkte-Face-Mesh.
// Iris-Landmarks (468-477) existieren im selben Modell, werden hier bewusst nicht
// genutzt - echtes Blick-Tracking ist eine Scope-Erweiterung, siehe ADR-0005.
const FACE_NASENSPITZE = 1

// MediaPipe PoseLandmarker/BlazePose: Standard-Indizes des 33-Punkte-Skeletts.
const POSE_LINKE_SCHULTER = 11
const POSE_RECHTE_SCHULTER = 12
const POSE_LINKE_HUEFTE = 23
const POSE_RECHTE_HUEFTE = 24

interface Punkt2D {
  x: number
  y: number
}

/**
 * Misst die Kopfausrichtung zur Kamera (nicht die Blickrichtung), ueber die
 * horizontale Position der Nasenspitze relativ zur Bounding-Box aller
 * Face-Landmarks. 1 = Nase mittig (Kopf zur Kamera), 0 = Nase am Rand
 * (Kopf stark gedreht).
 */
export function kopfZentriertheit(faceLandmarks: NormalizedLandmark[]): number | null {
  const nase = faceLandmarks[FACE_NASENSPITZE]
  if (!nase) {
    return null
  }

  const xWerte = faceLandmarks.map((punkt) => punkt.x)
  const minX = Math.min(...xWerte)
  const maxX = Math.max(...xWerte)
  const breite = maxX - minX
  if (breite === 0) {
    return null
  }

  const relativePosition = (nase.x - minX) / breite
  return 1 - Math.abs(relativePosition - 0.5) * 2
}

export function schulterMittelpunkt(poseLandmarks: NormalizedLandmark[]): Punkt2D | null {
  const links = poseLandmarks[POSE_LINKE_SCHULTER]
  const rechts = poseLandmarks[POSE_RECHTE_SCHULTER]
  if (!links || !rechts) {
    return null
  }
  return { x: (links.x + rechts.x) / 2, y: (links.y + rechts.y) / 2 }
}

export function schulterbreite(poseLandmarks: NormalizedLandmark[]): number | null {
  const links = poseLandmarks[POSE_LINKE_SCHULTER]
  const rechts = poseLandmarks[POSE_RECHTE_SCHULTER]
  if (!links || !rechts) {
    return null
  }
  return Math.hypot(rechts.x - links.x, rechts.y - links.y)
}

function hueftMittelpunkt(poseLandmarks: NormalizedLandmark[]): Punkt2D | null {
  const links = poseLandmarks[POSE_LINKE_HUEFTE]
  const rechts = poseLandmarks[POSE_RECHTE_HUEFTE]
  if (!links || !rechts) {
    return null
  }
  return { x: (links.x + rechts.x) / 2, y: (links.y + rechts.y) / 2 }
}

/**
 * Winkel zwischen der Huefte-Schulter-Linie und der Vertikalen, in Grad.
 * 0 Grad = Schultern genau ueber der Huefte (aufrecht).
 */
export function haltungsWinkel(poseLandmarks: NormalizedLandmark[]): number | null {
  const schulter = schulterMittelpunkt(poseLandmarks)
  const huefte = hueftMittelpunkt(poseLandmarks)
  if (!schulter || !huefte) {
    return null
  }

  const dx = schulter.x - huefte.x
  const dy = schulter.y - huefte.y
  const radiant = Math.atan2(Math.abs(dx), Math.abs(dy))
  return radiant * (180 / Math.PI)
}
