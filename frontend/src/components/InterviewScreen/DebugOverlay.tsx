import { useEffect, useRef } from 'react'
import { haltungsWinkel, kopfZentriertheit } from '../../domain/features'
import { istImZielkorridor, type Auswertung } from '../../domain/score'
import type { AnalysisResultPayload } from '../../media/useAnalysisWorker'

// Wegwerf-Debug-Werkzeug (Branch debug/live-overlay) - zeigt Rohwert vs.
// aggregierten Wert, Abdeckung und tatsaechliche Framerate live an, damit
// Zielkorridore/Schwellen anhand echter Messungen statt erfundener
// Klickdummy-Werte kalibriert werden koennen. Nicht Teil des Produkts -
// deshalb keine Tests, kein Design-Feinschliff.

interface DebugOverlayProps {
  videoElement: HTMLVideoElement | null
  letztesErgebnis: AnalysisResultPayload | null
  liveAuswertung: Auswertung | null
  framerate: number
}

export function DebugOverlay({ videoElement, letztesErgebnis, liveAuswertung, framerate }: DebugOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !videoElement) {
      return
    }

    const breite = videoElement.clientWidth
    const hoehe = videoElement.clientHeight
    canvas.width = breite
    canvas.height = hoehe

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }
    ctx.clearRect(0, 0, breite, hoehe)

    if (!letztesErgebnis) {
      return
    }

    const kopfWert = kopfZentriertheit(letztesErgebnis.faceLandmarks)
    ctx.fillStyle = kopfWert !== null && kopfWert >= 0.7 ? '#2f6b57' : '#a9642a'
    for (const punkt of letztesErgebnis.faceLandmarks) {
      ctx.beginPath()
      ctx.arc(punkt.x * breite, punkt.y * hoehe, 1.5, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.fillStyle = '#2f6b57'
    for (const punkt of letztesErgebnis.poseLandmarks) {
      ctx.beginPath()
      ctx.arc(punkt.x * breite, punkt.y * hoehe, 3, 0, Math.PI * 2)
      ctx.fill()
    }

    const haltungWert = haltungsWinkel(letztesErgebnis.poseLandmarks)
    const links = letztesErgebnis.poseLandmarks[11]
    const rechts = letztesErgebnis.poseLandmarks[12]
    if (links && rechts) {
      ctx.strokeStyle = haltungWert !== null && istImZielkorridor('haltung', haltungWert) ? '#2f6b57' : '#a9642a'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(links.x * breite, links.y * hoehe)
      ctx.lineTo(rechts.x * breite, rechts.y * hoehe)
      ctx.stroke()
    }
  }, [letztesErgebnis, videoElement])

  const kopfRoh = letztesErgebnis ? kopfZentriertheit(letztesErgebnis.faceLandmarks) : null
  const haltungRoh = letztesErgebnis ? haltungsWinkel(letztesErgebnis.poseLandmarks) : null

  return (
    <>
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} />
      <div
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          background: 'rgba(0,0,0,0.7)',
          color: '#fff',
          padding: 8,
          fontSize: 12,
          borderRadius: 6,
          fontFamily: 'monospace',
          lineHeight: 1.6,
        }}
      >
        <div>fps: {framerate.toFixed(1)}</div>
        <div>Abdeckung: {liveAuswertung ? Math.round(liveAuswertung.abdeckung * 100) : 0}%</div>
        <div>
          Kopf roh: {kopfRoh !== null ? kopfRoh.toFixed(2) : '–'} | agg:{' '}
          {liveAuswertung?.kopfausrichtungProzent != null ? `${liveAuswertung.kopfausrichtungProzent.toFixed(0)}%` : '–'}
        </div>
        <div>
          Haltung roh: {haltungRoh !== null ? `${haltungRoh.toFixed(1)}°` : '–'} | agg:{' '}
          {liveAuswertung?.haltungGradMedian != null ? `${liveAuswertung.haltungGradMedian.toFixed(1)}°` : '–'}
        </div>
        <div>Bewegungsruhe agg: {liveAuswertung?.bewegungsruhe != null ? liveAuswertung.bewegungsruhe.toFixed(3) : '–'}</div>
      </div>
    </>
  )
}
