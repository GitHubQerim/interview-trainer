import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as fragenkatalog from '../../domain/fragenkatalog'
import { AppShell } from './AppShell'

describe('AppShell', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(fragenkatalog, 'getFragen').mockResolvedValue([{ id: '1', text: 'Frage' }])
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
})
