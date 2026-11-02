import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as fragenkatalog from '../../domain/fragenkatalog'
import * as verlaufApi from '../../domain/verlaufApi'
import { AppShell } from './AppShell'

describe('AppShell', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(fragenkatalog, 'getBerufe').mockResolvedValue(['Softwareentwicklung'])
    vi.spyOn(fragenkatalog, 'getFragen').mockResolvedValue([{ id: '1', text: 'Frage' }])
    vi.spyOn(verlaufApi, 'speichereSession').mockResolvedValue(undefined)
    vi.spyOn(verlaufApi, 'ladeVerlauf').mockResolvedValue([])
  })

  it('zeigt initial den Setup-Tab', () => {
    render(<AppShell />)

    expect(screen.getByRole('heading', { name: 'Neue Übungssession' })).toBeInTheDocument()
  })

  it('zeigt eine leere Seite fuer die anderen Tabs', () => {
    render(<AppShell />)

    fireEvent.click(screen.getByRole('button', { name: 'Auswertung' }))

    expect(screen.queryByRole('heading', { name: 'Neue Übungssession' })).not.toBeInTheDocument()
  })

  it('zeigt nach "Interview starten" den Interview-Screen mit der gewaehlten Config', async () => {
    render(<AppShell />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Interview starten' })).toBeEnabled()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Interview starten' }))

    expect(screen.queryByRole('heading', { name: 'Neue Übungssession' })).not.toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Softwareentwicklung' })).toBeInTheDocument()
    })
  })

  it('blendet die Datenschutz-Aktionen waehrend eines laufenden Interviews aus', async () => {
    render(<AppShell />)

    expect(screen.getByRole('button', { name: 'Meine Daten löschen' })).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Interview starten' })).toBeEnabled()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Interview starten' }))

    expect(screen.queryByRole('button', { name: 'Meine Daten löschen' })).not.toBeInTheDocument()
  })

  it('zeigt den Verlauf-Screen statt einer Leerseite im Verlauf-Tab', async () => {
    render(<AppShell />)

    fireEvent.click(screen.getByRole('button', { name: 'Verlauf' }))

    expect(screen.getByRole('heading', { name: 'Verlauf' })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('Noch keine gespeicherten Übungssessions.')).toBeInTheDocument()
    })
  })

  it('zeigt nach Abschluss des Interviews die Auswertung', async () => {
    render(<AppShell />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Interview starten' })).toBeEnabled()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Interview starten' }))

    // Ohne Kamera (jsdom) wird die Analyse nie bereit, die Bereit-Phase laeuft dann nicht
    // von selbst ab - sie laesst sich aber immer per Button ueberspringen.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sofort starten' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Sofort starten' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Nächste Frage' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Nächste Frage' }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Auswertung' })).toBeInTheDocument()
    })
  })

  it('zeigt nach dem Start einer neuen Session nicht die Ergebnisse der alten an', async () => {
    render(<AppShell />)

    await waitFor(() => expect(screen.getByRole('button', { name: 'Interview starten' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Interview starten' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sofort starten' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Sofort starten' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Nächste Frage' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Nächste Frage' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Auswertung' })).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Setup' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Interview starten' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Interview starten' }))
    fireEvent.click(screen.getByRole('button', { name: 'Auswertung' }))

    // Sonst bekaeme etwa das KI-Panel Beruf und Schwierigkeit der neuen Session zu den
    // Ergebnissen der alten.
    expect(screen.queryByRole('heading', { name: 'Auswertung' })).not.toBeInTheDocument()
  })
})
