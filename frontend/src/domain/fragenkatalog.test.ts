import { afterEach, describe, expect, it, vi } from 'vitest'
import { getFragen } from './fragenkatalog'

describe('getFragen', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('ruft die richtige URL mit Query-Parametern auf und liefert die Fragen', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ id: 'se-leicht-1', text: 'Frage 1' }]),
    })
    vi.stubGlobal('fetch', fetchMock)

    const fragen = await getFragen('Softwareentwicklung', 'leicht')

    expect(fetchMock).toHaveBeenCalledWith('/api/fragen?beruf=Softwareentwicklung&schwierigkeit=leicht')
    expect(fragen).toEqual([{ id: 'se-leicht-1', text: 'Frage 1' }])
  })

  it('wirft einen Fehler, wenn die Antwort nicht ok ist', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400, json: () => Promise.resolve([]) }))

    await expect(getFragen('Softwareentwicklung', 'leicht')).rejects.toThrow()
  })
})
