import { FaceLandmarker, FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'
import type { FaceLandmarkerResult, PoseLandmarkerResult } from '@mediapipe/tasks-vision'
import type { InboundMessage, OutboundMessage } from './protocol'

// Selbst gehostet statt CDN (ADR-0004, umgesetzt in Slice 6): vermeidet, dass bei
// jedem Start die IP-Adresse der Nutzer:innen an Google geht. Dateien werden per
// scripts/fetch-models.sh nach frontend/public/models/ geholt (nicht committed,
// siehe .gitignore) - vor dem ersten Start einmalig ausfuehren.
const WASM_BASE_PATH = '/models/wasm'
const FACE_MODEL_PATH = '/models/face_landmarker.task'
const POSE_MODEL_PATH = '/models/pose_landmarker_lite.task'

let faceLandmarker: FaceLandmarker | undefined
let poseLandmarker: PoseLandmarker | undefined

function post(message: OutboundMessage): void {
  postMessage(message)
}

async function init(): Promise<void> {
  const vision = await FilesetResolver.forVisionTasks(WASM_BASE_PATH)

  faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: FACE_MODEL_PATH, delegate: 'GPU' },
    runningMode: 'VIDEO',
    numFaces: 1,
  })

  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: POSE_MODEL_PATH, delegate: 'GPU' },
    runningMode: 'VIDEO',
    numPoses: 1,
  })

  post({ type: 'ready' })
}

function processFrame(image: ImageBitmap, timestamp: number): void {
  if (!faceLandmarker || !poseLandmarker) {
    post({ type: 'error', message: 'Modelle sind noch nicht geladen.' })
    image.close()
    return
  }

  const start = performance.now()
  let faceResult: FaceLandmarkerResult
  let poseResult: PoseLandmarkerResult
  try {
    faceResult = faceLandmarker.detectForVideo(image, timestamp)
    poseResult = poseLandmarker.detectForVideo(image, timestamp)
  } finally {
    image.close()
  }
  const durationMs = performance.now() - start

  post({
    type: 'result',
    timestamp,
    durationMs,
    faceLandmarks: faceResult.faceLandmarks[0] ?? [],
    poseLandmarks: poseResult.landmarks[0] ?? [],
  })
}

onmessage = (event: MessageEvent<InboundMessage>) => {
  const message = event.data

  if (message.type === 'init') {
    init().catch((error: unknown) => {
      post({ type: 'error', message: error instanceof Error ? error.message : String(error) })
    })
    return
  }

  try {
    processFrame(message.image, message.timestamp)
  } catch (error) {
    post({ type: 'error', message: error instanceof Error ? error.message : String(error) })
  }
}
