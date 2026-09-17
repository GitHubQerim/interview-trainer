import { useCallback, useEffect, useRef, useState } from 'react'
import { computeProcessingRate, nextAnalysisStatus, shouldSendFrame, type AnalysisStatus } from './analysisState'
import type { InboundMessage, OutboundMessage } from './protocol'

const PROCESSING_RATE_WINDOW_MS = 2_000

interface AnalysisResult {
  faceLandmarkCount: number
  poseLandmarkCount: number
}

export function useAnalysisWorker() {
  const [status, setStatus] = useState<AnalysisStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [latestResult, setLatestResult] = useState<AnalysisResult | null>(null)
  const [latestDurationMs, setLatestDurationMs] = useState<number | null>(null)
  const [processingRate, setProcessingRate] = useState(0)
  const [throttleMs, setThrottleMs] = useState(120)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const lastSentAtRef = useRef(0)
  const frameLoopRef = useRef<number | undefined>(undefined)
  const resultTimestampsRef = useRef<number[]>([])
  const throttleMsRef = useRef(throttleMs)
  useEffect(() => {
    throttleMsRef.current = throttleMs
  }, [throttleMs])

  const stop = useCallback(() => {
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
  }, [])

  useEffect(() => stop, [stop])

  const sendFrame = useCallback(() => {
    const video = videoRef.current
    const worker = workerRef.current
    if (!video || !worker) {
      return
    }

    const now = performance.now()
    if (!shouldSendFrame(lastSentAtRef.current, now, throttleMsRef.current)) {
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
    setError(null)
    setStatus(nextAnalysisStatus('idle', { type: 'start' }))

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true })
    } catch {
      setStatus(nextAnalysisStatus('requesting-permission', { type: 'permission-denied' }))
      return
    }

    setStatus(nextAnalysisStatus('requesting-permission', { type: 'permission-granted' }))
    streamRef.current = stream

    if (videoRef.current) {
      videoRef.current.srcObject = stream
      await videoRef.current.play()
    }

    // Bewusst kein { type: 'module' } - @mediapipe/tasks-vision laedt seine WASM-Glue
    // per importScripts(), das geht nur im klassischen Worker. Vite buendelt die
    // TS-import-Syntax hier trotzdem korrekt zu einem klassischen Worker-Skript.
    const worker = new Worker(new URL('./analysis.worker.ts', import.meta.url))
    workerRef.current = worker

    worker.onmessage = (event: MessageEvent<OutboundMessage>) => {
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

      resultTimestampsRef.current = [...resultTimestampsRef.current, message.timestamp].filter(
        (timestamp) => timestamp >= message.timestamp - PROCESSING_RATE_WINDOW_MS,
      )
      setProcessingRate(computeProcessingRate(resultTimestampsRef.current, PROCESSING_RATE_WINDOW_MS, message.timestamp))
      setLatestDurationMs(message.durationMs)
      setLatestResult({ faceLandmarkCount: message.faceLandmarkCount, poseLandmarkCount: message.poseLandmarkCount })
    }

    const initMessage: InboundMessage = { type: 'init' }
    worker.postMessage(initMessage)
  }, [sendFrame])

  return {
    status,
    error,
    latestResult,
    latestDurationMs,
    processingRate,
    throttleMs,
    setThrottleMs,
    videoRef,
    start,
    stop,
  }
}
