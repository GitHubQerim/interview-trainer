import { describe, expect, it } from 'vitest'
import {
  computeProcessingRate,
  nextAnalysisStatus,
  shouldSendFrame,
  type AnalysisEvent,
  type AnalysisStatus,
} from './analysisState'

describe('nextAnalysisStatus', () => {
  const cases: Array<[AnalysisStatus, AnalysisEvent, AnalysisStatus]> = [
    ['idle', { type: 'start' }, 'requesting-permission'],
    ['requesting-permission', { type: 'permission-granted' }, 'loading-model'],
    ['requesting-permission', { type: 'permission-denied' }, 'permission-denied'],
    ['loading-model', { type: 'worker-ready' }, 'ready'],
    ['loading-model', { type: 'worker-error' }, 'error'],
    ['ready', { type: 'worker-error' }, 'error'],
  ]

  it.each(cases)('von %s mit %o wird zu %s', (current, event, expected) => {
    expect(nextAnalysisStatus(current, event)).toBe(expected)
  })
})

describe('shouldSendFrame', () => {
  it.each([
    [0, 120, 120, true],
    [0, 119, 120, false],
    [0, 60, 60, true],
    [0, 59, 60, false],
    [0, 33, 33, true],
    [0, 32, 33, false],
  ])('lastSentAt=%d now=%d minIntervalMs=%d -> %s', (lastSentAt, now, minIntervalMs, expected) => {
    expect(shouldSendFrame(lastSentAt, now, minIntervalMs)).toBe(expected)
  })
})

describe('computeProcessingRate', () => {
  it('zaehlt nur Zeitstempel innerhalb des Rolling-Windows', () => {
    const now = 10_000
    const timestamps = [9_000, 9_500, 9_900, 8_000]

    expect(computeProcessingRate(timestamps, 1_000, now)).toBe(3)
  })

  it('gibt 0 zurueck, wenn keine Zeitstempel im Fenster liegen', () => {
    expect(computeProcessingRate([1_000], 1_000, 10_000)).toBe(0)
  })

  it('gibt 0 zurueck bei leerer Liste', () => {
    expect(computeProcessingRate([], 1_000, 10_000)).toBe(0)
  })
})
