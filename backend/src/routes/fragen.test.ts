import Fastify from 'fastify'
import { describe, expect, it } from 'vitest'
import { registerFragenRoute } from './fragen.js'

async function buildApp() {
  const app = Fastify()
  await app.register(registerFragenRoute)
  return app
}

describe('GET /api/fragen', () => {
  it('liefert 5 Fragen fuer einen bekannten Beruf', async () => {
    const app = await buildApp()

    const response = await app.inject({
      method: 'GET',
      url: '/api/fragen?beruf=Softwareentwicklung&schwierigkeit=leicht',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toHaveLength(5)
  })

  it('liefert eine leere Liste fuer einen unbekannten Beruf', async () => {
    const app = await buildApp()

    const response = await app.inject({
      method: 'GET',
      url: '/api/fragen?beruf=Astronaut&schwierigkeit=leicht',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual([])
  })

  it('lehnt eine ungueltige Schwierigkeit ab', async () => {
    const app = await buildApp()

    const response = await app.inject({
      method: 'GET',
      url: '/api/fragen?beruf=Softwareentwicklung&schwierigkeit=unmoeglich',
    })

    expect(response.statusCode).toBe(400)
  })

  it('verlangt beide Query-Parameter', async () => {
    const app = await buildApp()

    const response = await app.inject({ method: 'GET', url: '/api/fragen?beruf=Softwareentwicklung' })

    expect(response.statusCode).toBe(400)
  })
})
