import type { FastifyInstance } from 'fastify'
import type { ErgebnisEingabe, SessionEingabe } from '../domain/verlauf.js'
import { ladeVerlauf, loescheVerlauf, speichereSession } from '../db/verlaufRepository.js'

// Einfaches Regex statt ajv-formats: spart eine Dependency plus Typ-Interop-Workaround
// fuer eine reine UUID-Formpruefung, die ein Pattern genauso gut leistet.
const UUID_PATTERN = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'

const ERGEBNIS_SCHEMA = {
  type: 'object',
  required: [
    'frageId',
    'frageText',
    'abdeckung',
    'auswertbar',
    'kopfausrichtungProzent',
    'haltungGradMedian',
    'haltungVerlauf',
    'bewegungsruhe',
  ],
  properties: {
    frageId: { type: 'string', minLength: 1 },
    frageText: { type: 'string', minLength: 1 },
    abdeckung: { type: 'number' },
    auswertbar: { type: 'boolean' },
    kopfausrichtungProzent: { type: ['number', 'null'] },
    haltungGradMedian: { type: ['number', 'null'] },
    haltungVerlauf: { type: ['number', 'null'] },
    bewegungsruhe: { type: ['number', 'null'] },
  },
} as const

interface TokenQuery {
  token: string
}

export async function registerVerlaufRoute(app: FastifyInstance): Promise<void> {
  app.post<{ Body: SessionEingabe }>(
    '/api/verlauf',
    {
      schema: {
        body: {
          type: 'object',
          required: ['token', 'beruf', 'schwierigkeit', 'modus', 'ergebnisse'],
          properties: {
            token: { type: 'string', pattern: UUID_PATTERN },
            beruf: { type: 'string', minLength: 1 },
            schwierigkeit: { type: 'string', enum: ['leicht', 'mittel', 'hart'] },
            modus: { type: 'string', enum: ['video-ton', 'nur-ton', 'nur-fragen'] },
            ergebnisse: { type: 'array', items: ERGEBNIS_SCHEMA },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = await speichereSession(request.body)
      reply.code(201)
      return { id }
    },
  )

  app.get<{ Querystring: TokenQuery }>(
    '/api/verlauf',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['token'],
          properties: {
            token: { type: 'string', pattern: UUID_PATTERN },
          },
        },
      },
    },
    async (request) => {
      return ladeVerlauf(request.query.token)
    },
  )

  app.delete<{ Querystring: TokenQuery }>(
    '/api/verlauf',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['token'],
          properties: {
            token: { type: 'string', pattern: UUID_PATTERN },
          },
        },
      },
    },
    async (request) => {
      return loescheVerlauf(request.query.token)
    },
  )
}

export type { ErgebnisEingabe, SessionEingabe }
