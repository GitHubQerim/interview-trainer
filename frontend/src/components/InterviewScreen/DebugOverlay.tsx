import { useEffect, useRef } from 'react'
import { haltungsWinkel, kopfZentriertheit } from '../../domain/features'
import type { VadAnalyse } from '../../domain/redefluss'
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
}

export interface DebugAudio {
  pegel: number
  vad: VadAnalyse
}

interface DebugWerteProps {
  letztesErgebnis: AnalysisResultPayload | null
  liveAuswertung: Auswertung | null
  framerate: number
  audio: DebugAudio | null
}

// Zeichnet nur die Landmarks ins Bild. Die Messwerte stehen bewusst daneben
// (DebugWerte), damit sie das Gesicht nicht verdecken.
export function DebugOverlay({ videoElement, letztesErgebnis }: DebugOverlayProps) {
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

  return <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} />
}

export function DebugWerte({ letztesErgebnis, liveAuswertung, framerate, audio }: DebugWerteProps) {
  const kopfRoh = letztesErgebnis ? kopfZentriertheit(letztesErgebnis.faceLandmarks) : null
  const haltungRoh = letztesErgebnis ? haltungsWinkel(letztesErgebnis.poseLandmarks) : null

  return (
      <div
        style={{
          background: 'rgba(255,255,255,0.08)',
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
        <div>
          Pegel: {audio ? audio.pegel.toFixed(3) : '–'} | Boden: {audio ? audio.vad.rauschboden.toFixed(3) : '–'} |
          Sprech: {audio ? audio.vad.sprechpegel.toFixed(3) : '–'} | Schwelle: {audio ? audio.vad.schwelle.toFixed(3) : '–'}
        </div>
        <div>Audio: {audio ? (audio.vad.stille ? 'Stille' : audio.vad.durchgehend ? 'durchgehend' : 'mit Pausen') : '–'}</div>
      </div>
  )
}
