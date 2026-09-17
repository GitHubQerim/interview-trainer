import type { FastifyInstance } from 'fastify'
import { getFragen, type Schwierigkeit } from '../domain/fragenkatalog.js'

interface FragenQuery {
  beruf: string
  schwierigkeit: Schwierigkeit
}

export async function registerFragenRoute(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: FragenQuery }>(
    '/api/fragen',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['beruf', 'schwierigkeit'],
          properties: {
            beruf: { type: 'string', minLength: 1 },
            schwierigkeit: { type: 'string', enum: ['leicht', 'mittel', 'hart'] },
          },
        },
      },
    },
    async (request) => {
      const { beruf, schwierigkeit } = request.query
      return getFragen(beruf, schwierigkeit)
    },
  )
}
