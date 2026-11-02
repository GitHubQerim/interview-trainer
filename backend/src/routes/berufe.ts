import type { FastifyInstance } from 'fastify'
import { getBerufe } from '../domain/fragenkatalog.js'

export async function registerBerufeRoute(app: FastifyInstance): Promise<void> {
  app.get('/api/berufe', async () => getBerufe())
}
