import { useEffect, useRef } from 'react'
import type { AudioFrameErgebnis } from '../domain/interview'

// 200ms reicht fuer eine Sprechanteil-Kennzahl - kein 60fps-Signal noetig, anders
// als beim Video-Frame-Loop in useAnalysisWorker.
const SAMPLE_INTERVAL_MS = 200

/**
 * Misst alle 200ms die RMS-Lautstaerke des Audio-Tracks eines bestehenden Streams
 * (kein eigener getUserMedia-Aufruf - der Stream kommt aus useAnalysisWorker, ein
 * Owner/eine Berechtigungsabfrage). Kein Rohaudio verlaesst den Browser, nur die
 * abgeleitete Zahl wird ueber onAudioFrame nach aussen gereicht.
 */
export function useRedeflussVad(stream: MediaStream | null, onAudioFrame?: (frame: AudioFrameErgebnis) => void) {
  const onAudioFrameRef = useRef(onAudioFrame)
  useEffect(() => {
    onAudioFrameRef.current = onAudioFrame
  }, [onAudioFrame])

  useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) {
      return
    }

    let intervalId: number | undefined
    let audioContext: AudioContext | undefined

    try {
      audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      // 8192 Samples (~170 ms bei 48 kHz): fast das ganze 200-ms-Intervall statt einer
      // 43-ms-Momentaufnahme, die oft genau in eine Wortluecke faellt.
      analyser.fftSize = 8192
      source.connect(analyser)

      const buffer = new Uint8Array(analyser.fftSize)

      intervalId = window.setInterval(() => {
        analyser.getByteTimeDomainData(buffer)

        let summeQuadrate = 0
        for (let i = 0; i < buffer.length; i += 1) {
          const normalisiert = (buffer[i]! - 128) / 128
          summeQuadrate += normalisiert * normalisiert
        }
        const lautstaerke = Math.sqrt(summeQuadrate / buffer.length)

        onAudioFrameRef.current?.({ zeitstempel: performance.now(), lautstaerke })
      }, SAMPLE_INTERVAL_MS)
    } catch {
      // Web Audio API nicht verfuegbar/fehlgeschlagen - Redefluss bleibt null,
      // Rest der App (Video-Analyse) laeuft unbeeintraechtigt weiter.
    }

    return () => {
      if (intervalId !== undefined) {
        window.clearInterval(intervalId)
      }
      void audioContext?.close()
    }
  }, [stream])
}
