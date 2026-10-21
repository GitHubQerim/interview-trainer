import Fastify from 'fastify'
import { describe, expect, it } from 'vitest'
import { getFragen } from '../domain/fragenkatalog.js'
import { registerBerufeRoute } from './berufe.js'

async function buildApp() {
  const app = Fastify()
  await app.register(registerBerufeRoute)
  return app
}

describe('GET /api/berufe', () => {
  it('liefert die Berufe, fuer die der Katalog Fragen hat', async () => {
    const app = await buildApp()

    const response = await app.inject({ method: 'GET', url: '/api/berufe' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toContain('Softwareentwicklung')
  })

  it('liefert nur Berufe mit Fragen in jeder Schwierigkeit', async () => {
    const app = await buildApp()

    const berufe = (await app.inject({ method: 'GET', url: '/api/berufe' })).json<string[]>()

    for (const beruf of berufe) {
      for (const schwierigkeit of ['leicht', 'mittel', 'hart'] as const) {
        expect(getFragen(beruf, schwierigkeit).length).toBeGreaterThan(0)
      }
    }
  })
})
