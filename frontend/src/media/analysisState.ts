export type AnalysisStatus =
  | 'idle'
  | 'requesting-permission'
  | 'permission-denied'
  | 'loading-model'
  | 'ready'
  | 'error'

export type AnalysisEvent =
  | { type: 'start' }
  | { type: 'permission-granted' }
  | { type: 'permission-denied' }
  | { type: 'worker-ready' }
  | { type: 'worker-error' }

export function nextAnalysisStatus(current: AnalysisStatus, event: AnalysisEvent): AnalysisStatus {
  switch (event.type) {
    case 'start':
      return 'requesting-permission'
    case 'permission-granted':
      return 'loading-model'
    case 'permission-denied':
      return 'permission-denied'
    case 'worker-ready':
      return 'ready'
    case 'worker-error':
      return 'error'
    default:
      return current
  }
}

export function shouldSendFrame(lastSentAt: number, now: number, minIntervalMs: number): boolean {
  return now - lastSentAt >= minIntervalMs
}
