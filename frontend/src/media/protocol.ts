import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

export type InboundMessage =
  | { type: 'init' }
  | { type: 'frame'; image: ImageBitmap; timestamp: number }

export type OutboundMessage =
  | { type: 'ready' }
  | {
      type: 'result'
      timestamp: number
      durationMs: number
      faceLandmarks: NormalizedLandmark[]
      poseLandmarks: NormalizedLandmark[]
    }
  | { type: 'error'; message: string }
