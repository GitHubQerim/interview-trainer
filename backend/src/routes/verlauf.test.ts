import Fastify from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerVerlaufRoute } from './verlauf.js'

const { speichereSession, ladeVerlauf, loescheVerlauf } = vi.hoisted(() => ({
  speichereSession: vi.fn(),
  ladeVerlauf: vi.fn(),
  loescheVerlauf: vi.fn(),
}))

vi.mock('../db/verlaufRepository.js', () => ({ speichereSession, ladeVerlauf, loescheVerlauf }))

async function buildApp() {
  const app = Fastify()
  await app.register(registerVerlaufRoute)
  return app
}

const GUELTIGES_TOKEN = '3fa85f64-5717-4562-b3fc-2c963f66afa6'

const GUELTIGER_BODY = {
  token: GUELTIGES_TOKEN,
  beruf: 'Softwareentwicklung',
  schwierigkeit: 'leicht',
  modus: 'video-ton',
  ergebnisse: [
    {
      frageId: 'se-leicht-1',
      frageText: 'Erzählen Sie von einem Projekt, auf das Sie stolz sind.',
      abdeckung: 0.9,
      auswertbar: true,
      kopfausrichtungProzent: 85,
      haltungGradMedian: 2.1,
      haltungVerlauf: 0.5,
      bewegungsruhe: 0.1,
    },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/verlauf', () => {
  it('speichert eine gueltige Session und liefert 201 mit id', async () => {
    speichereSession.mockResolvedValue({ id: 'session-1' })
    const app = await buildApp()

    const response = await app.inject({ method: 'POST', url: '/api/verlauf', payload: GUELTIGER_BODY })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toEqual({ id: 'session-1' })
    expect(speichereSession).toHaveBeenCalledWith(GUELTIGER_BODY)
  })

  it('lehnt ein nicht-UUID-Token ab', async () => {
    const app = await buildApp()

    const response = await app.inject({
      method: 'POST',
      url: '/api/verlauf',
      payload: { ...GUELTIGER_BODY, token: 'kein-uuid' },
    })

    expect(response.statusCode).toBe(400)
    expect(speichereSession).not.toHaveBeenCalled()
  })

  it('lehnt eine ungueltige Schwierigkeit ab', async () => {
    const app = await buildApp()

    const response = await app.inject({
      method: 'POST',
      url: '/api/verlauf',
      payload: { ...GUELTIGER_BODY, schwierigkeit: 'unmoeglich' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('verlangt das ergebnisse-Feld', async () => {
    const app = await buildApp()
    const { ergebnisse: _ergebnisse, ...ohneErgebnisse } = GUELTIGER_BODY

    const response = await app.inject({ method: 'POST', url: '/api/verlauf', payload: ohneErgebnisse })

    expect(response.statusCode).toBe(400)
  })

  it('lehnt einen Ergebnis-Eintrag ohne kopfausrichtungProzent ab', async () => {
    const app = await buildApp()
    const { kopfausrichtungProzent: _kopfausrichtungProzent, ...ergebnisOhneFeld } = GUELTIGER_BODY.ergebnisse[0]!

    const response = await app.inject({
      method: 'POST',
      url: '/api/verlauf',
      payload: { ...GUELTIGER_BODY, ergebnisse: [ergebnisOhneFeld] },
    })

    expect(response.statusCode).toBe(400)
    expect(speichereSession).not.toHaveBeenCalled()
  })
})

describe('GET /api/verlauf', () => {
  it('liefert den Verlauf fuer ein gueltiges Token', async () => {
    ladeVerlauf.mockResolvedValue([{ id: 'session-1' }])
    const app = await buildApp()

    const response = await app.inject({ method: 'GET', url: `/api/verlauf?token=${GUELTIGES_TOKEN}` })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual([{ id: 'session-1' }])
    expect(ladeVerlauf).toHaveBeenCalledWith(GUELTIGES_TOKEN)
  })

  it('lehnt ein nicht-UUID-Token ab', async () => {
    const app = await buildApp()

    const response = await app.inject({ method: 'GET', url: '/api/verlauf?token=kein-uuid' })

    expect(response.statusCode).toBe(400)
  })

  it('verlangt das token-Query-Parameter', async () => {
    const app = await buildApp()

    const response = await app.inject({ method: 'GET', url: '/api/verlauf' })

    expect(response.statusCode).toBe(400)
  })
})

describe('DELETE /api/verlauf', () => {
  it('loescht den Verlauf fuer ein gueltiges Token', async () => {
    loescheVerlauf.mockResolvedValue({ anzahl: 2 })
    const app = await buildApp()

    const response = await app.inject({ method: 'DELETE', url: `/api/verlauf?token=${GUELTIGES_TOKEN}` })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ anzahl: 2 })
    expect(loescheVerlauf).toHaveBeenCalledWith(GUELTIGES_TOKEN)
  })

  it('lehnt ein nicht-UUID-Token ab', async () => {
    const app = await buildApp()

    const response = await app.inject({ method: 'DELETE', url: '/api/verlauf?token=kein-uuid' })

    expect(response.statusCode).toBe(400)
  })
})
