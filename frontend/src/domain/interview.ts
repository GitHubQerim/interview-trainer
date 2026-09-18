import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import type { Frage } from './fragenkatalog'

export interface FrameErgebnis {
  zeitstempel: number
  faceLandmarks: NormalizedLandmark[]
  poseLandmarks: NormalizedLandmark[]
}

export interface FragenErgebnis {
  frage: Frage
  ergebnisse: FrameErgebnis[]
}
