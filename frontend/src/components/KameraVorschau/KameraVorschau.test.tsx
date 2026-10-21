import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnalysisResultPayload } from '../../media/useAnalysisWorker'
import { KameraVorschau } from './KameraVorschau'

const mocks = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  status: 'idle' as string,
  error: null as string | null,
  onResult: undefined as ((result: AnalysisResultPayload) => void) | undefined,
  optionen: undefined as { mitTon?: boolean } | undefined,
}))

vi.mock('../../media/useAnalysisWorker', () => ({
  useAnalysisWorker: (
    onResult?: (result: AnalysisResultPayload) => void,
    optionen?: { mitTon?: boolean },
  ) => {
    mocks.onResult = onResult
    mocks.optionen = optionen
    return {
      status: mocks.status,
      error: mocks.error,
      videoRef: { current: null },
      start: mocks.start,
      stop: mocks.stop,
      stream: null,
    }
  },
}))

function punkt(x: number, y: number): NormalizedLandmark {
  return { x, y, z: 0, visibility: 1 }
}

function ergebnis(schulterLinksY: number): AnalysisResultPayload {
  const pose = Array.from({ length: 33 }, () => punkt(0.5, 0.5))
  pose[11] = punkt(0.35, schulterLinksY)
  pose[12] = punkt(0.65, 0.7)
  return {
    timestamp: 1,
    durationMs: 10,
    faceLandmarks: [punkt(0.4, 0.2), punkt(0.5, 0.3), punkt(0.6, 0.2)],
    poseLandmarks: pose,
  }
}

describe('KameraVorschau', () => {
  beforeEach(() => {
    mocks.start.mockReset()
    mocks.stop.mockReset()
    mocks.status = 'idle'
    mocks.error = null
    mocks.onResult = undefined
    window.localStorage.clear()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('startet die Kamera erst auf Klick und ohne Mikrofon', () => {
    render(<KameraVorschau deaktiviert={false} />)

    expect(mocks.start).not.toHaveBeenCalled()
    expect(mocks.optionen).toEqual({ mitTon: false })

    fireEvent.click(screen.getByRole('button', { name: 'Kamera einschalten' }))

    expect(mocks.start).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Kamera ausschalten' })).toBeInTheDocument()
  })

  it('stoppt die Kamera beim Ausschalten', () => {
    render(<KameraVorschau deaktiviert={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Kamera einschalten' }))
    mocks.stop.mockClear()

    fireEvent.click(screen.getByRole('button', { name: 'Kamera ausschalten' }))

    expect(mocks.stop).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Kamera einschalten' })).toBeInTheDocument()
  })

  it('deaktiviert den Button ausserhalb des Modus Video und Ton', () => {
    render(<KameraVorschau deaktiviert />)

    expect(screen.getByRole('button', { name: 'Kamera einschalten' })).toBeDisabled()
    expect(screen.getByText(/nur im Modus/i)).toBeInTheDocument()
  })

  it('stoppt eine laufende Kamera, wenn der Modus gewechselt wird', () => {
    const { rerender } = render(<KameraVorschau deaktiviert={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Kamera einschalten' }))
    mocks.stop.mockClear()

    rerender(<KameraVorschau deaktiviert />)

    expect(mocks.stop).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Kamera einschalten' })).toBeDisabled()
  })

  describe('Spiegelung', () => {
    it('ist standardmaessig an', () => {
      render(<KameraVorschau deaktiviert={false} />)

      expect(screen.getByLabelText('Spiegelbild')).toBeChecked()
      expect(screen.getByTestId('vorschau-buehne')).toHaveAttribute('data-gespiegelt', 'true')
    })

    it('laesst sich ausschalten und wird gemerkt', () => {
      const { unmount } = render(<KameraVorschau deaktiviert={false} />)

      fireEvent.click(screen.getByLabelText('Spiegelbild'))
      expect(screen.getByTestId('vorschau-buehne')).toHaveAttribute('data-gespiegelt', 'false')

      unmount()
      render(<KameraVorschau deaktiviert={false} />)

      expect(screen.getByLabelText('Spiegelbild')).not.toBeChecked()
    })

    it('funktioniert auch, wenn localStorage nicht verfuegbar ist', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('blockiert')
      })
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('blockiert')
      })

      render(<KameraVorschau deaktiviert={false} />)
      fireEvent.click(screen.getByLabelText('Spiegelbild'))

      expect(screen.getByLabelText('Spiegelbild')).not.toBeChecked()
    })
  })

  describe('Hinweise', () => {
    function einschalten() {
      mocks.status = 'ready'
      render(<KameraVorschau deaktiviert={false} />)
      fireEvent.click(screen.getByRole('button', { name: 'Kamera einschalten' }))
    }

    it('zeigt vor dem ersten Ergebnis einen Wartetext statt Hinweisen', () => {
      einschalten()

      expect(screen.getByText(/suche nach kopf und schultern/i)).toBeInTheDocument()
      expect(screen.queryByText('Schultern waagerecht')).not.toBeInTheDocument()
    })

    it('zeigt live Hinweise mit Text und Detailwert', () => {
      einschalten()

      act(() => mocks.onResult?.(ergebnis(0.7)))

      expect(screen.getByText('Kopf im Bild')).toBeInTheDocument()
      expect(screen.getByText('Schultern waagerecht')).toBeInTheDocument()
      expect(screen.getByText('0.0° Neigung')).toBeInTheDocument()
    })

    it('markiert eine schiefe Haltung mit Text, nicht nur mit Farbe', () => {
      einschalten()

      act(() => mocks.onResult?.(ergebnis(0.62)))

      expect(screen.getByText('Schultern waagerecht halten')).toBeInTheDocument()
      expect(screen.getByText(/Achtung:/)).toBeInTheDocument()
    })

    it('blendet die Hinweise nach dem Ausschalten wieder aus', () => {
      einschalten()
      act(() => mocks.onResult?.(ergebnis(0.7)))

      fireEvent.click(screen.getByRole('button', { name: 'Kamera ausschalten' }))

      expect(screen.queryByText('Kopf im Bild')).not.toBeInTheDocument()
    })
  })

  it('erklaert verweigerten Kamerazugriff', () => {
    mocks.status = 'permission-denied'
    render(<KameraVorschau deaktiviert={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Kamera einschalten' }))

    expect(screen.getByRole('alert')).toHaveTextContent(/kamera-zugriff/i)
  })
})
