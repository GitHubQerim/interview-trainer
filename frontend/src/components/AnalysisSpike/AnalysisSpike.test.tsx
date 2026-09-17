import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import * as useAnalysisWorkerModule from '../../media/useAnalysisWorker'
import { AnalysisSpike } from './AnalysisSpike'

function mockHook(overrides: Partial<ReturnType<typeof useAnalysisWorkerModule.useAnalysisWorker>>) {
  vi.spyOn(useAnalysisWorkerModule, 'useAnalysisWorker').mockReturnValue({
    status: 'idle',
    error: null,
    latestResult: null,
    latestDurationMs: null,
    processingRate: 0,
    throttleMs: 120,
    setThrottleMs: vi.fn(),
    videoRef: { current: null },
    start: vi.fn(),
    stop: vi.fn(),
    ...overrides,
  })
}

describe('AnalysisSpike', () => {
  it('zeigt den Status im Idle-Zustand', () => {
    mockHook({ status: 'idle' })

    render(<AnalysisSpike />)

    expect(screen.getByText('Bereit')).toBeInTheDocument()
  })

  it('zeigt eine Fehlermeldung, wenn der Worker einen Fehler meldet', () => {
    mockHook({ status: 'error', error: 'GPU-Delegate nicht verfuegbar' })

    render(<AnalysisSpike />)

    expect(screen.getByText('GPU-Delegate nicht verfuegbar')).toBeInTheDocument()
  })

  it('zeigt Landmark-Anzahl und Messwerte, wenn ein Ergebnis vorliegt', () => {
    mockHook({
      status: 'ready',
      latestResult: { faceLandmarkCount: 478, poseLandmarkCount: 33 },
      latestDurationMs: 12.5,
      processingRate: 7.8,
    })

    render(<AnalysisSpike />)

    expect(screen.getByText('Gesicht: 478 Punkte')).toBeInTheDocument()
    expect(screen.getByText('Pose: 33 Punkte')).toBeInTheDocument()
    expect(screen.getByText('Verarbeitungsrate: 7.8 fps')).toBeInTheDocument()
    expect(screen.getByText('Dauer pro Frame: 12.5 ms')).toBeInTheDocument()
  })
})
