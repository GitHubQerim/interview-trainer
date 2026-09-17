import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as fragenkatalog from '../../domain/fragenkatalog'
import { SetupScreen } from './SetupScreen'

describe('SetupScreen', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('setzt das Beruf-Feld beim Klick auf einen Vorschlags-Chip', async () => {
    vi.spyOn(fragenkatalog, 'getFragen').mockResolvedValue([{ id: '1', text: 'Frage' }])

    render(<SetupScreen onStart={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Vertrieb' }))

    expect(screen.getByLabelText('Beruf oder Rolle')).toHaveValue('Vertrieb')
  })

  it('wechselt die aktive Schwierigkeit', async () => {
    vi.spyOn(fragenkatalog, 'getFragen').mockResolvedValue([{ id: '1', text: 'Frage' }])

    render(<SetupScreen onStart={vi.fn()} />)

    const hartButton = screen.getByRole('button', { name: 'hart' })
    fireEvent.click(hartButton)

    expect(hartButton).toHaveAttribute('aria-pressed', 'true')
  })

  it('wechselt den aktiven Modus', async () => {
    vi.spyOn(fragenkatalog, 'getFragen').mockResolvedValue([{ id: '1', text: 'Frage' }])

    render(<SetupScreen onStart={vi.fn()} />)

    const nurTonButton = screen.getByRole('button', { name: /Nur Ton/ })
    fireEvent.click(nurTonButton)

    expect(nurTonButton).toHaveAttribute('aria-pressed', 'true')
  })

  it('deaktiviert den Start-Button, wenn keine Fragen verfuegbar sind', async () => {
    vi.spyOn(fragenkatalog, 'getFragen').mockResolvedValue([])

    render(<SetupScreen onStart={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Keine Fragen für diese Auswahl verfügbar.')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Interview starten' })).toBeDisabled()
  })

  it('ruft onStart mit der aktuellen Auswahl auf', async () => {
    vi.spyOn(fragenkatalog, 'getFragen').mockResolvedValue([{ id: '1', text: 'Frage' }])
    const onStart = vi.fn()

    render(<SetupScreen onStart={onStart} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Interview starten' })).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: 'hart' }))
    fireEvent.click(screen.getByRole('button', { name: 'Interview starten' }))

    expect(onStart).toHaveBeenCalledWith({ beruf: 'Softwareentwicklung', schwierigkeit: 'hart', modus: 'video-ton' })
  })
})
