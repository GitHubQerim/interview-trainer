import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as fragenkatalog from '../../domain/fragenkatalog'
import type { SessionConfig } from '../../domain/session'
import * as useAnalysisWorkerModule from '../../media/useAnalysisWorker'
import type { AnalysisResultPayload } from '../../media/useAnalysisWorker'
import { InterviewScreen } from './InterviewScreen'

const FRAGEN = [
  { id: '1', text: 'Frage eins' },
  { id: '2', text: 'Frage zwei' },
]

let capturedOnResult: ((result: AnalysisResultPayload) => void) | undefined

function mockAnalysisWorker() {
  vi.spyOn(useAnalysisWorkerModule, 'useAnalysisWorker').mockImplementation((onResult) => {
    capturedOnResult = onResult
    return {
      status: 'ready',
      error: null,
      videoRef: { current: null },
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
      stream: null,
    }
  })
}

const videoTonConfig: SessionConfig = { beruf: 'Softwareentwicklung', schwierigkeit: 'mittel', modus: 'video-ton' }

describe('InterviewScreen', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    capturedOnResult = undefined
    vi.spyOn(fragenkatalog, 'getFragen').mockResolvedValue(FRAGEN)
    mockAnalysisWorker()
  })

  it('zeigt die erste Frage', async () => {
    render(<InterviewScreen config={videoTonConfig} bereitSekunden={0} onFinished={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Frage eins')).toBeInTheDocument()
    })
    expect(screen.getByText('Frage 1 von 2 · mittel')).toBeInTheDocument()
  })

  it('wechselt per Button zur naechsten Frage', async () => {
    render(<InterviewScreen config={videoTonConfig} bereitSekunden={0} onFinished={vi.fn()} />)

    await waitFor(() => expect(screen.getByText('Frage eins')).toBeInTheDocument())
    // advance() ist jetzt async (wartet auf beendeFuellwortErkennung()) - der
    // Klick-Handler stoesst nur an, die Statusaktualisierung kommt einen Mikrotask
    // spaeter, deshalb waitFor statt einer sofortigen Assertion.
    fireEvent.click(screen.getByRole('button', { name: 'Nächste Frage' }))

    await waitFor(() => expect(screen.getByText('Frage zwei')).toBeInTheDocument())
  })

  it('wechselt automatisch nach Ablauf der Fragendauer', async () => {
    vi.useFakeTimers()
    try {
      render(<InterviewScreen config={videoTonConfig} bereitSekunden={0} fragendauerSekunden={3} onFinished={vi.fn()} />)

      await act(async () => {
        await Promise.resolve()
      })
      expect(screen.getByText('Frage eins')).toBeInTheDocument()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(3_000)
      })

      expect(screen.getByText('Frage zwei')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('ruft onFinished mit den gepufferten Ergebnissen nach der letzten Frage auf', async () => {
    const onFinished = vi.fn()

    render(<InterviewScreen config={videoTonConfig} bereitSekunden={0} onFinished={onFinished} />)

    await waitFor(() => expect(screen.getByText('Frage eins')).toBeInTheDocument())

    act(() => {
      capturedOnResult?.({ timestamp: 1, durationMs: 5, faceLandmarks: [], poseLandmarks: [] })
    })
    // Jeder Klick muss vollstaendig verarbeitet sein (advance() ist async und hat
    // einen Doppelaufruf-Guard), bevor der naechste Klick feuert - sonst wuerde der
    // Guard den zweiten Klick als Doppelaufruf verwerfen.
    fireEvent.click(screen.getByRole('button', { name: 'Nächste Frage' }))
    await waitFor(() => expect(screen.getByText('Frage zwei')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Nächste Frage' }))
    await waitFor(() => expect(onFinished).toHaveBeenCalledTimes(1))
    const ergebnisse = onFinished.mock.calls[0]?.[0]
    expect(ergebnisse).toHaveLength(2)
    expect(ergebnisse[0].frage.text).toBe('Frage eins')
    expect(ergebnisse[0].ergebnisse).toHaveLength(1)
    expect(ergebnisse[1].frage.text).toBe('Frage zwei')
    expect(ergebnisse[1].ergebnisse).toHaveLength(0)
  })

  it('zeigt kein Kamera-Panel bei Modus "nur-fragen"', async () => {
    const config: SessionConfig = { beruf: 'Softwareentwicklung', schwierigkeit: 'mittel', modus: 'nur-fragen' }
    render(<InterviewScreen config={config} onFinished={vi.fn()} />)

    await waitFor(() => expect(screen.getByText('Frage eins')).toBeInTheDocument())

    expect(document.querySelector('video')).not.toBeInTheDocument()
  })

  describe('Videoansicht', () => {
    beforeEach(() => {
      window.localStorage.clear()
    })

    it('zeigt das Video standardmaessig gespiegelt, wie die Vorschau im Setup', async () => {
      render(<InterviewScreen config={videoTonConfig} bereitSekunden={0} onFinished={vi.fn()} />)

      await waitFor(() => expect(screen.getByText('Frage eins')).toBeInTheDocument())

      expect(screen.getByTestId('video-buehne')).toHaveAttribute('data-gespiegelt', 'true')
      expect(screen.getByLabelText('Spiegelbild')).toBeChecked()
    })

    it('laesst die Spiegelung ausschalten und merkt sie sich fuer die Vorschau', async () => {
      render(<InterviewScreen config={videoTonConfig} bereitSekunden={0} onFinished={vi.fn()} />)
      await waitFor(() => expect(screen.getByText('Frage eins')).toBeInTheDocument())

      fireEvent.click(screen.getByLabelText('Spiegelbild'))

      expect(screen.getByTestId('video-buehne')).toHaveAttribute('data-gespiegelt', 'false')
      expect(window.localStorage.getItem('interview-trainer.vorschau-spiegeln')).toBe('false')
    })

    it('zeigt die Debug-Werte neben dem Video und nicht darauf', async () => {
      render(<InterviewScreen config={videoTonConfig} bereitSekunden={0} onFinished={vi.fn()} />)
      await waitFor(() => expect(screen.getByText('Frage eins')).toBeInTheDocument())

      fireEvent.click(screen.getByLabelText(/Debug-Overlay/))

      const werte = screen.getByText(/fps:/)
      expect(werte).toBeInTheDocument()
      expect(screen.getByTestId('video-buehne')).not.toContainElement(werte)
    })
  })

  describe('Bereit-Phase', () => {
    const frame = { timestamp: 1, durationMs: 5, faceLandmarks: [], poseLandmarks: [] }

    it('zeigt vor jeder Frage eine Bereit-Phase und startet die Zeit erst danach', async () => {
      vi.useFakeTimers()
      try {
        render(<InterviewScreen config={videoTonConfig} onFinished={vi.fn()} />)
        await act(async () => {
          await Promise.resolve()
        })

        expect(screen.getByText(/Mach dich bereit/)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Sofort starten' })).toBeInTheDocument()
        expect(screen.getByText('00:00')).toBeInTheDocument()

        // Sekunde fuer Sekunde: React rendert innerhalb von act gebuendelt, ein einziger
        // Sprung von 3 s wuerde nur einen Countdown-Tick ausloesen.
        for (let sekunde = 0; sekunde < 3; sekunde += 1) {
          await act(async () => {
            await vi.advanceTimersByTimeAsync(1_000)
          })
        }
        expect(screen.queryByText(/Mach dich bereit/)).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Nächste Frage' })).toBeInTheDocument()

        for (let sekunde = 0; sekunde < 2; sekunde += 1) {
          await act(async () => {
            await vi.advanceTimersByTimeAsync(1_000)
          })
        }
        expect(screen.getByText('00:02')).toBeInTheDocument()
      } finally {
        vi.useRealTimers()
      }
    })

    it('wertet Bilder aus der Bereit-Phase nicht aus (Handbewegung zur Maus)', async () => {
      const onFinished = vi.fn()
      vi.mocked(fragenkatalog.getFragen).mockResolvedValue([{ id: '1', text: 'Frage eins' }])
      render(<InterviewScreen config={videoTonConfig} onFinished={onFinished} />)
      await waitFor(() => expect(screen.getByText('Frage eins')).toBeInTheDocument())

      act(() => capturedOnResult?.(frame))
      fireEvent.click(screen.getByRole('button', { name: 'Sofort starten' }))
      await waitFor(() => expect(screen.getByRole('button', { name: 'Nächste Frage' })).toBeInTheDocument())
      act(() => capturedOnResult?.({ ...frame, timestamp: 2 }))
      fireEvent.click(screen.getByRole('button', { name: 'Nächste Frage' }))

      await waitFor(() => expect(onFinished).toHaveBeenCalledTimes(1))
      expect(onFinished.mock.calls[0]?.[0][0].ergebnisse).toHaveLength(1)
    })

    it('beginnt auch die zweite Frage mit einer Bereit-Phase', async () => {
      render(<InterviewScreen config={videoTonConfig} onFinished={vi.fn()} />)
      await waitFor(() => expect(screen.getByText('Frage eins')).toBeInTheDocument())

      fireEvent.click(screen.getByRole('button', { name: 'Sofort starten' }))
      await waitFor(() => expect(screen.getByRole('button', { name: 'Nächste Frage' })).toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: 'Nächste Frage' }))

      await waitFor(() => expect(screen.getByText('Frage zwei')).toBeInTheDocument())
      expect(screen.getByText(/Mach dich bereit/)).toBeInTheDocument()
    })

    it('Pfeil rechts überspringt die Bereit-Phase und wechselt danach zur nächsten Frage', async () => {
      render(<InterviewScreen config={videoTonConfig} onFinished={vi.fn()} />)
      await waitFor(() => expect(screen.getByText('Frage eins')).toBeInTheDocument())

      fireEvent.keyDown(window, { key: 'ArrowRight' })
      await waitFor(() => expect(screen.queryByText(/Mach dich bereit/)).not.toBeInTheDocument())
      expect(screen.getByText('Frage eins')).toBeInTheDocument()

      fireEvent.keyDown(window, { key: 'ArrowRight' })
      await waitFor(() => expect(screen.getByText('Frage zwei')).toBeInTheDocument())
    })

    it('ignoriert gehaltene Pfeiltaste und Tastenkombinationen wie Alt+Pfeil (Browser zurück)', async () => {
      render(<InterviewScreen config={videoTonConfig} onFinished={vi.fn()} />)
      await waitFor(() => expect(screen.getByText('Frage eins')).toBeInTheDocument())

      fireEvent.keyDown(window, { key: 'ArrowRight', repeat: true })
      fireEvent.keyDown(window, { key: 'ArrowRight', altKey: true })
      fireEvent.keyDown(window, { key: 'ArrowRight', metaKey: true })
      fireEvent.keyDown(window, { key: 'ArrowRight', ctrlKey: true })

      expect(screen.getByText(/Mach dich bereit/)).toBeInTheDocument()
    })

    it('zeigt ohne Videoanalyse keine Bereit-Phase', async () => {
      const config: SessionConfig = { beruf: 'Softwareentwicklung', schwierigkeit: 'mittel', modus: 'nur-fragen' }
      render(<InterviewScreen config={config} onFinished={vi.fn()} />)

      await waitFor(() => expect(screen.getByText('Frage eins')).toBeInTheDocument())

      expect(screen.queryByText(/Mach dich bereit/)).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Nächste Frage' })).toBeInTheDocument()
    })
  })
})
