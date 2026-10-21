import type { SetupHinweis } from '../../domain/kameraSetup'
import type { AnalysisResultPayload } from '../../media/useAnalysisWorker'

const FARBE_OK = '#2f6b57'
const FARBE_ACHTUNG = '#a9642a'
const FARBE_NEUTRAL = '#ffffff'

const POSE_LINKE_SCHULTER = 11
const POSE_RECHTE_SCHULTER = 12
const FACE_NASENSPITZE = 1

function farbeFuer(hinweise: SetupHinweis[], id: SetupHinweis['id']): string {
  const status = hinweise.find((hinweis) => hinweis.id === id)?.status
  return status === 'ok' ? FARBE_OK : status === 'achtung' ? FARBE_ACHTUNG : FARBE_NEUTRAL
}

/**
 * Zeichnet nur, was in die Wertung eingeht: Kopfumriss mit Nasenpunkt und die
 * Schulterlinie. Koordinaten sind normiert (0..1) und werden auf die interne
 * Canvas-Aufloesung skaliert; eine Spiegelung uebernimmt das CSS des umgebenden
 * Containers, damit Video und Overlay immer deckungsgleich bleiben.
 */
export function zeichneOverlay(
  ctx: CanvasRenderingContext2D,
  breite: number,
  hoehe: number,
  ergebnis: AnalysisResultPayload | null,
  hinweise: SetupHinweis[],
): void {
  ctx.clearRect(0, 0, breite, hoehe)
  if (!ergebnis) {
    return
  }

  const linie = Math.max(2, breite / 200)
  ctx.lineWidth = linie

  const { faceLandmarks, poseLandmarks } = ergebnis
  if (faceLandmarks.length > 0) {
    const xWerte = faceLandmarks.map((punkt) => punkt.x * breite)
    const yWerte = faceLandmarks.map((punkt) => punkt.y * hoehe)
    const minX = Math.min(...xWerte)
    const maxX = Math.max(...xWerte)
    const minY = Math.min(...yWerte)
    const maxY = Math.max(...yWerte)

    ctx.strokeStyle = farbeFuer(hinweise, 'kopf-im-bild')
    ctx.beginPath()
    ctx.ellipse((minX + maxX) / 2, (minY + maxY) / 2, (maxX - minX) / 2, (maxY - minY) / 2, 0, 0, Math.PI * 2)
    ctx.stroke()

    const nase = faceLandmarks[FACE_NASENSPITZE]
    if (nase) {
      ctx.fillStyle = FARBE_NEUTRAL
      ctx.beginPath()
      ctx.arc(nase.x * breite, nase.y * hoehe, linie * 1.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  const links = poseLandmarks[POSE_LINKE_SCHULTER]
  const rechts = poseLandmarks[POSE_RECHTE_SCHULTER]
  if (links && rechts) {
    const farbe = farbeFuer(hinweise, 'schulterneigung')
    ctx.strokeStyle = farbe
    ctx.lineWidth = linie * 1.5
    ctx.beginPath()
    ctx.moveTo(links.x * breite, links.y * hoehe)
    ctx.lineTo(rechts.x * breite, rechts.y * hoehe)
    ctx.stroke()

    ctx.fillStyle = farbe
    for (const schulter of [links, rechts]) {
      ctx.beginPath()
      ctx.arc(schulter.x * breite, schulter.y * hoehe, linie * 2.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}
