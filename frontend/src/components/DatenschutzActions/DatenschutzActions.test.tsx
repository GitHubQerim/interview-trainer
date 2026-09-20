import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as token from '../../domain/token'
import * as verlaufApi from '../../domain/verlaufApi'
import { DatenschutzActions } from './DatenschutzActions'

describe('DatenschutzActions', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('laedt beim Export den Verlauf und erzeugt einen Download-Link', async () => {
    const ladeVerlaufSpy = vi.spyOn(verlaufApi, 'ladeVerlauf').mockResolvedValue([])
    render(<DatenschutzActions />)

    fireEvent.click(screen.getByRole('button', { name: 'Meine Daten exportieren' }))

    await waitFor(() => {
      expect(ladeVerlaufSpy).toHaveBeenCalled()
    })
    expect(screen.queryByText(/fehlgeschlagen/)).not.toBeInTheDocument()
  })

  it('zeigt einen Fehler, wenn der Export fehlschlaegt', async () => {
    vi.spyOn(verlaufApi, 'ladeVerlauf').mockRejectedValue(new Error('Verlauf konnte nicht geladen werden.'))
    render(<DatenschutzActions />)

    fireEvent.click(screen.getByRole('button', { name: 'Meine Daten exportieren' }))

    await waitFor(() => {
      expect(screen.getByText('Verlauf konnte nicht geladen werden.')).toBeInTheDocument()
    })
  })

  it('loescht nach Bestaetigung den Verlauf und setzt ein neues Token', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true))
    const loescheVerlaufSpy = vi.spyOn(verlaufApi, 'loescheVerlauf').mockResolvedValue(undefined)
    const setzeNeuenTokenSpy = vi.spyOn(token, 'setzeNeuenToken').mockReturnValue('neues-token')
    render(<DatenschutzActions />)

    fireEvent.click(screen.getByRole('button', { name: 'Meine Daten löschen' }))

    await waitFor(() => {
      expect(loescheVerlaufSpy).toHaveBeenCalled()
      expect(setzeNeuenTokenSpy).toHaveBeenCalled()
    })
  })

  it('loescht nichts ohne Bestaetigung', () => {
    vi.stubGlobal('confirm', vi.fn(() => false))
    const loescheVerlaufSpy = vi.spyOn(verlaufApi, 'loescheVerlauf')
    render(<DatenschutzActions />)

    fireEvent.click(screen.getByRole('button', { name: 'Meine Daten löschen' }))

    expect(loescheVerlaufSpy).not.toHaveBeenCalled()
  })
})
