export type InboundMessage =
  | { type: 'init' }
  | { type: 'frame'; image: ImageBitmap; timestamp: number }

export type OutboundMessage =
  | { type: 'ready' }
  | {
      type: 'result'
      timestamp: number
      durationMs: number
      faceLandmarkCount: number
      poseLandmarkCount: number
    }
  | { type: 'error'; message: string }
