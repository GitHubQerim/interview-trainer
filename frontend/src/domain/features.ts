import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

// MediaPipe FaceLandmarker: Nasenspitze, stabiler Standard-Index im 478-Punkte-Face-Mesh.
// Iris-Landmarks (468-477) existieren im selben Modell, werden hier bewusst nicht
// genutzt - echtes Blick-Tracking ist eine Scope-Erweiterung, siehe ADR-0005.
const FACE_NASENSPITZE = 1

// MediaPipe PoseLandmarker/BlazePose: Standard-Indizes des 33-Punkte-Skeletts.
const POSE_LINKE_SCHULTER = 11
const POSE_RECHTE_SCHULTER = 12

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

/**
 * Neigung der Schulterlinie zur Horizontalen, in Grad. 0 Grad = Schultern auf
 * gleicher Hoehe (aufrecht), waechst mit seitlichem Lehnen.
 *
 * Nutzt bewusst nur die Schultern (11/12), keine Huefte: ein frueherer Versuch
 * mit dem Winkel Huefte-Mitte->Schulter-Mitte hat echtes Lehnen in einem
 * manuellen Test kaum abgebildet (30s durchgehend deutlich geneigt saß
 * ergab nur 3,3 Grad) - vermutlich weil die Huefte bei typischer
 * Webcam-Framing (Kopf/Schultern im Bild, Huefte meist nicht) von MediaPipe
 * eher aus Koerper-Priors geschaetzt als tatsaechlich getrackt wird. Die
 * Schulter-Neigung allein reagierte im selben Test deutlich staerker (6,7 Grad,
 * korrekt "außerhalb" des Zielkorridors) - siehe ADR-0005-Nachtrag.
 */
export function haltungsWinkel(poseLandmarks: NormalizedLandmark[]): number | null {
  const links = poseLandmarks[POSE_LINKE_SCHULTER]
  const rechts = poseLandmarks[POSE_RECHTE_SCHULTER]
  if (!links || !rechts) {
    return null
  }

  const dx = rechts.x - links.x
  const dy = rechts.y - links.y
  const radiant = Math.atan2(Math.abs(dy), Math.abs(dx))
  return radiant * (180 / Math.PI)
}
