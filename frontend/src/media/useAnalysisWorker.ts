import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { useCallback, useEffect, useRef, useState } from 'react'
import { nextAnalysisStatus, shouldSendFrame, type AnalysisStatus } from './analysisState'
import type { InboundMessage, OutboundMessage } from './protocol'

const THROTTLE_MS = 120

/**
 * Video+Audio kombiniert anfragen; nur bei fehlendem Mikrofon (NotFoundError) auf
 * reines Video zurueckfallen. Bei verweigerter Berechtigung (NotAllowedError)
 * blockiert Chrome ueblicherweise Kamera UND Mikrofon gemeinsam - ein zweiter
 * Versuch waere dann sinnlos und wuerde nur unnoetig einen weiteren Prompt ausloesen.
 * autoGainControl: false, weil die automatische Verstaerkungsregelung sonst der
 * eigenen relativen Rauschboden-Normierung in domain/redefluss.ts entgegenarbeiten
 * wuerde (nicht empirisch validiert, wie die anderen Schwellwerte im Projekt).
 */
async function holeMedienStream(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({ video: true, audio: { autoGainControl: false } })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotFoundError') {
      return navigator.mediaDevices.getUserMedia({ video: true })
    }
    throw error
  }
}

export interface AnalysisResultPayload {
  timestamp: number
  durationMs: number
  faceLandmarks: NormalizedLandmark[]
  poseLandmarks: NormalizedLandmark[]
}

export function useAnalysisWorker(onResult?: (result: AnalysisResultPayload) => void) {
  const [status, setStatus] = useState<AnalysisStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const lastSentAtRef = useRef(0)
  const frameLoopRef = useRef<number | undefined>(undefined)
  const onResultRef = useRef(onResult)
  const generationRef = useRef(0)
  useEffect(() => {
    onResultRef.current = onResult
  }, [onResult])

  const stop = useCallback(() => {
    generationRef.current += 1
    if (frameLoopRef.current !== undefined) {
      window.clearInterval(frameLoopRef.current)
      frameLoopRef.current = undefined
    }
    workerRef.current?.terminate()
    workerRef.current = null
    for (const track of streamRef.current?.getTracks() ?? []) {
      track.stop()
    }
    streamRef.current = null
    setStream(null)
  }, [])

  useEffect(() => stop, [stop])

  const sendFrame = useCallback(() => {
    const video = videoRef.current
    const worker = workerRef.current
    if (!video || !worker) {
      return
    }

    const now = performance.now()
    if (!shouldSendFrame(lastSentAtRef.current, now, THROTTLE_MS)) {
      return
    }
    lastSentAtRef.current = now

    createImageBitmap(video)
      .then((bitmap) => {
        const message: InboundMessage = { type: 'frame', image: bitmap, timestamp: now }
        worker.postMessage(message, [bitmap])
      })
      .catch(() => {
        // Frame konnte nicht erfasst werden (z.B. Video noch nicht bereit) - naechster Tick versucht es erneut.
      })
  }, [])

  const start = useCallback(async () => {
    stop()
    const myGeneration = generationRef.current
    setError(null)
    setStatus(nextAnalysisStatus('idle', { type: 'start' }))

    let stream: MediaStream
    try {
      stream = await holeMedienStream()
    } catch {
      if (myGeneration === generationRef.current) {
        setStatus(nextAnalysisStatus('requesting-permission', { type: 'permission-denied' }))
      }
      return
    }

    if (myGeneration !== generationRef.current) {
      // start() wurde inzwischen erneut aufgerufen (z.B. React StrictMode-Doppel-Mount
      // oder ein zweiter Klick) - dieser Aufruf ist ueberholt, Stream wieder freigeben.
      for (const track of stream.getTracks()) {
        track.stop()
      }
      return
    }

    setStatus(nextAnalysisStatus('requesting-permission', { type: 'permission-granted' }))
    streamRef.current = stream
    setStream(stream)

    if (videoRef.current) {
      videoRef.current.srcObject = stream
      await videoRef.current.play()
    }

    if (myGeneration !== generationRef.current) {
      return
    }

    // Bewusst kein { type: 'module' } - @mediapipe/tasks-vision laedt seine WASM-Glue
    // per importScripts(), das geht nur im klassischen Worker. Vite buendelt die
    // TS-import-Syntax hier trotzdem korrekt zu einem klassischen Worker-Skript.
    const worker = new Worker(new URL('./analysis.worker.ts', import.meta.url))

    if (myGeneration !== generationRef.current) {
      worker.terminate()
      return
    }
    workerRef.current = worker

    worker.onmessage = (event: MessageEvent<OutboundMessage>) => {
      if (myGeneration !== generationRef.current) {
        return
      }

      const message = event.data

      if (message.type === 'ready') {
        setStatus((current) => nextAnalysisStatus(current, { type: 'worker-ready' }))
        frameLoopRef.current = window.setInterval(sendFrame, 16)
        return
      }

      if (message.type === 'error') {
        setError(message.message)
        setStatus((current) => nextAnalysisStatus(current, { type: 'worker-error' }))
        return
      }

      onResultRef.current?.({
        timestamp: message.timestamp,
        durationMs: message.durationMs,
        faceLandmarks: message.faceLandmarks,
        poseLandmarks: message.poseLandmarks,
      })
    }

    const initMessage: InboundMessage = { type: 'init' }
    worker.postMessage(initMessage)
  }, [sendFrame, stop])

  return {
    status,
    error,
    videoRef,
    start,
    stop,
    // Fuer useRedeflussVad/useFuellwortErkennung: derselbe Stream, keine zweite
    // getUserMedia-Stelle.
    stream,
  }
}
