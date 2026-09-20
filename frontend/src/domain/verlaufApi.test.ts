import { afterEach, describe, expect, it, vi } from 'vitest'

const TOKEN = '3fa85f64-5717-4562-b3fc-2c963f66afa6'
const AGGREGIERT = [{ frageId: 'se-leicht-1', frageText: 'Frage 1', abdeckung: 0.9 }]

vi.mock('./token', () => ({ holeToken: vi.fn(() => TOKEN) }))
vi.mock('./verlauf', () => ({ aggregiereSession: vi.fn(() => AGGREGIERT) }))

const { speichereSession, ladeVerlauf, loescheVerlauf } = await import('./verlaufApi')

describe('speichereSession', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sendet Token, Konfiguration und aggregierte Ergebnisse per POST', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    await speichereSession({ beruf: 'Softwareentwicklung', schwierigkeit: 'leicht', modus: 'video-ton' }, [])

    expect(fetchMock).toHaveBeenCalledWith('/api/verlauf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: TOKEN,
        beruf: 'Softwareentwicklung',
        schwierigkeit: 'leicht',
        modus: 'video-ton',
        ergebnisse: AGGREGIERT,
      }),
    })
  })

  it('wirft einen Fehler, wenn die Antwort nicht ok ist', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))

    await expect(
      speichereSession({ beruf: 'Softwareentwicklung', schwierigkeit: 'leicht', modus: 'video-ton' }, []),
    ).rejects.toThrow()
  })
})

describe('ladeVerlauf', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('laedt den Verlauf fuer das eigene Token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([{ id: 'session-1' }]) })
    vi.stubGlobal('fetch', fetchMock)

    const verlauf = await ladeVerlauf()

    expect(fetchMock).toHaveBeenCalledWith(`/api/verlauf?token=${TOKEN}`)
    expect(verlauf).toEqual([{ id: 'session-1' }])
  })

  it('wirft einen Fehler, wenn die Antwort nicht ok ist', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))

    await expect(ladeVerlauf()).rejects.toThrow()
  })
})

describe('loescheVerlauf', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loescht den Verlauf fuer das eigene Token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    await loescheVerlauf()

    expect(fetchMock).toHaveBeenCalledWith(`/api/verlauf?token=${TOKEN}`, { method: 'DELETE' })
  })

  it('wirft einen Fehler, wenn die Antwort nicht ok ist', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))

    await expect(loescheVerlauf()).rejects.toThrow()
  })
})
