import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as fragenkatalog from '../../domain/fragenkatalog'
import { SetupScreen } from './SetupScreen'

function mockKatalog(berufe = ['Softwareentwicklung', 'Vertrieb']) {
  vi.spyOn(fragenkatalog, 'getBerufe').mockResolvedValue(berufe)
  vi.spyOn(fragenkatalog, 'getFragen').mockResolvedValue([{ id: '1', text: 'Frage' }])
}

describe('SetupScreen', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('Berufsauswahl', () => {
    it('bietet nur die Berufe aus dem Katalog an, ohne freies Textfeld', async () => {
      mockKatalog(['Softwareentwicklung', 'Vertrieb'])

      render(<SetupScreen onStart={vi.fn()} />)

      expect(await screen.findByRole('button', { name: /Vertrieb/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Softwareentwicklung/ })).toBeInTheDocument()
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })

    it('waehlt den ersten Beruf vor und kennzeichnet ihn', async () => {
      mockKatalog()

      render(<SetupScreen onStart={vi.fn()} />)

      expect(await screen.findByRole('button', { name: /Softwareentwicklung/ })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
      expect(screen.getByRole('button', { name: /Vertrieb/ })).toHaveAttribute('aria-pressed', 'false')
    })

    it('wechselt den Beruf per Klick und laedt dessen Fragen', async () => {
      mockKatalog()

      render(<SetupScreen onStart={vi.fn()} />)
      fireEvent.click(await screen.findByRole('button', { name: /Vertrieb/ }))

      expect(screen.getByRole('button', { name: /Vertrieb/ })).toHaveAttribute('aria-pressed', 'true')
      await waitFor(() => {
        expect(fragenkatalog.getFragen).toHaveBeenLastCalledWith('Vertrieb', 'mittel')
      })
    })

    it('erklaert, wenn der Katalog nicht geladen werden kann, und sperrt den Start', async () => {
      vi.spyOn(fragenkatalog, 'getBerufe').mockRejectedValue(new Error('offline'))
      vi.spyOn(fragenkatalog, 'getFragen').mockResolvedValue([])

      render(<SetupScreen onStart={vi.fn()} />)

      expect(await screen.findByRole('alert')).toHaveTextContent(/Berufe konnten nicht geladen werden/)
      expect(screen.getByRole('button', { name: 'Interview starten' })).toBeDisabled()
    })
  })

  it('wechselt die aktive Schwierigkeit', async () => {
    mockKatalog()

    render(<SetupScreen onStart={vi.fn()} />)

    const hartButton = await screen.findByRole('button', { name: /hart/ })
    fireEvent.click(hartButton)

    expect(hartButton).toHaveAttribute('aria-pressed', 'true')
  })

  it('wechselt den aktiven Modus', async () => {
    mockKatalog()

    render(<SetupScreen onStart={vi.fn()} />)

    const nurTonButton = await screen.findByRole('button', { name: /Nur Ton/ })
    fireEvent.click(nurTonButton)

    expect(nurTonButton).toHaveAttribute('aria-pressed', 'true')
  })

  it('deaktiviert den Start-Button, wenn keine Fragen verfuegbar sind', async () => {
    vi.spyOn(fragenkatalog, 'getBerufe').mockResolvedValue(['Softwareentwicklung'])
    vi.spyOn(fragenkatalog, 'getFragen').mockResolvedValue([])

    render(<SetupScreen onStart={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Keine Fragen für diese Auswahl verfügbar.')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Interview starten' })).toBeDisabled()
  })

  it('ruft onStart mit der aktuellen Auswahl auf', async () => {
    mockKatalog()
    const onStart = vi.fn()

    render(<SetupScreen onStart={onStart} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Interview starten' })).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: /Vertrieb/ }))
    fireEvent.click(screen.getByRole('button', { name: /hart/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Interview starten' }))

    expect(onStart).toHaveBeenCalledWith({ beruf: 'Vertrieb', schwierigkeit: 'hart', modus: 'video-ton' })
  })

  it('bietet die Kameravorschau nur im Modus Video und Ton an', async () => {
    mockKatalog()

    render(<SetupScreen onStart={vi.fn()} />)

    expect(await screen.findByRole('button', { name: 'Kamera einschalten' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: /Nur Ton/ }))

    expect(screen.getByRole('button', { name: 'Kamera einschalten' })).toBeDisabled()
  })

  it('weist darauf hin, dass die Kamera erst auf Klick startet', async () => {
    mockKatalog()

    render(<SetupScreen onStart={vi.fn()} />)

    expect(await screen.findByText(/Kamera ist aus, bis Sie die Vorschau einschalten/)).toBeInTheDocument()
  })
})
