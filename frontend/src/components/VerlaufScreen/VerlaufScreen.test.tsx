import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as verlaufApi from '../../domain/verlaufApi'
import type { SessionVerlaufEintrag } from '../../domain/verlaufApi'
import { VerlaufScreen } from './VerlaufScreen'

function session(overrides: Partial<SessionVerlaufEintrag> = {}): SessionVerlaufEintrag {
  return {
    id: 'session-1',
    beruf: 'Softwareentwicklung',
    schwierigkeit: 'leicht',
    modus: 'video-ton',
    erstelltAm: '2026-09-20T10:00:00.000Z',
    ergebnisse: [
      {
        frageId: 'se-leicht-1',
        frageText: 'Erste Frage',
        abdeckung: 0.9,
        auswertbar: true,
        kopfausrichtungProzent: 85,
        haltungGradMedian: 2.1,
        haltungVerlauf: 0.5,
        bewegungsruhe: 0.1,
      },
    ],
    ...overrides,
  }
}

describe('VerlaufScreen', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('zeigt einen Ladehinweis, bevor der Verlauf da ist', () => {
    vi.spyOn(verlaufApi, 'ladeVerlauf').mockReturnValue(new Promise(() => {}))

    render(<VerlaufScreen onZurueck={vi.fn()} />)

    expect(screen.getByText('Verlauf wird geladen...')).toBeInTheDocument()
  })

  it('zeigt einen Hinweis, wenn noch keine Sessions gespeichert sind', async () => {
    vi.spyOn(verlaufApi, 'ladeVerlauf').mockResolvedValue([])

    render(<VerlaufScreen onZurueck={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Noch keine gespeicherten Übungssessions.')).toBeInTheDocument()
    })
  })

  it('zeigt einen Fehler, wenn das Laden fehlschlaegt', async () => {
    vi.spyOn(verlaufApi, 'ladeVerlauf').mockRejectedValue(new Error('Verlauf konnte nicht geladen werden.'))

    render(<VerlaufScreen onZurueck={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Verlauf konnte nicht geladen werden.')).toBeInTheDocument()
    })
  })

  it('zeigt die erste Session mit ihrer ersten Frage', async () => {
    vi.spyOn(verlaufApi, 'ladeVerlauf').mockResolvedValue([session()])

    render(<VerlaufScreen onZurueck={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Erste Frage')).toBeInTheDocument()
    })
    expect(screen.getByText(/Softwareentwicklung/)).toBeInTheDocument()
    expect(screen.getByText(/Video und Ton/)).toBeInTheDocument()
  })

  it('zeigt neuere Sessions zuerst', async () => {
    vi.spyOn(verlaufApi, 'ladeVerlauf').mockResolvedValue([
      session({ id: 'alt', erstelltAm: '2026-09-19T10:00:00.000Z' }),
      session({
        id: 'neu',
        erstelltAm: '2026-09-20T10:00:00.000Z',
        ergebnisse: [
          {
            frageId: 'se-leicht-2',
            frageText: 'Neuere Frage',
            abdeckung: 0.9,
            auswertbar: true,
            kopfausrichtungProzent: 90,
            haltungGradMedian: 1,
            haltungVerlauf: 0,
            bewegungsruhe: 0.1,
          },
        ],
      }),
    ])

    render(<VerlaufScreen onZurueck={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Neuere Frage')).toBeInTheDocument()
    })
  })

  it('wechselt per Tab zwischen Sessions', async () => {
    // ladeVerlauf liefert aufsteigend (aeltste zuerst); die Komponente dreht fuer
    // "neueste zuerst" um - "session-2" erscheint deshalb zuerst als "Session 1"-Tab.
    vi.spyOn(verlaufApi, 'ladeVerlauf').mockResolvedValue([
      session({ id: 'session-1' }),
      session({
        id: 'session-2',
        ergebnisse: [
          {
            frageId: 'se-leicht-2',
            frageText: 'Frage der zweiten Session',
            abdeckung: 0.9,
            auswertbar: true,
            kopfausrichtungProzent: 90,
            haltungGradMedian: 1,
            haltungVerlauf: 0,
            bewegungsruhe: 0.1,
          },
        ],
      }),
    ])

    render(<VerlaufScreen onZurueck={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Frage der zweiten Session')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Session 2' }))

    expect(screen.getByText('Erste Frage')).toBeInTheDocument()
  })

  it('ruft onZurueck auf', async () => {
    const onZurueck = vi.fn()
    vi.spyOn(verlaufApi, 'ladeVerlauf').mockResolvedValue([session()])

    render(<VerlaufScreen onZurueck={onZurueck} />)

    await waitFor(() => {
      expect(screen.getByText('Erste Frage')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Zurück' }))

    expect(onZurueck).toHaveBeenCalled()
  })
})
