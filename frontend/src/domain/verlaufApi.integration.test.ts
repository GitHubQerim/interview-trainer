import { execFileSync, spawn, type ChildProcess } from 'node:child_process'
import { rmSync } from 'node:fs'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { FragenErgebnis } from './interview'
import { berechneAuswertung } from './score'
import { ladeVerlauf, loescheVerlauf, speichereSession } from './verlaufApi'

// Echter Integrationstest (Pflicht laut Aufgabenstellung: "Kernfunktionalität durch
// Unit-/Integrationstests abgedeckt") - kein Repository-Mock wie in den Backend-
// Routentests, sondern ein echter Fastify-Server gegen eine echte, isolierte
// SQLite-Testdatei, angesprochen ueber dieselben Frontend-Client-Funktionen, die
// die App auch nutzt. Playwright mit Kamera-Mocking bleibt bewusst ausserhalb des
// Scopes - eine Grenze oberhalb dieser Pflicht, keine Luecke darunter (siehe Journal).

// process.cwd() ist beim Testlauf immer das Wurzelverzeichnis von frontend/
// (dort liegt package.json/vite.config.ts) - robuster als import.meta.url,
// das unter Vitest je nach Pool keine echte file://-URL liefert.
const BACKEND_DIR = path.resolve(process.cwd(), '../backend')
const PORT = '3099'
const BASE_URL = `http://localhost:${PORT}`
const DATABASE_URL = 'file:./test.db'
const TEST_DB_PATH = path.join(BACKEND_DIR, 'prisma', 'test.db')

let server: ChildProcess

function loescheTestDb() {
  rmSync(TEST_DB_PATH, { force: true })
  rmSync(`${TEST_DB_PATH}-journal`, { force: true })
}

async function wartenBisBereit(timeoutMs = 15000) {
  const start = Date.now()
  const echterFetch = globalThis.fetch
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await echterFetch(`${BASE_URL}/api/fragen?beruf=x&schwierigkeit=leicht`)
      if (response.ok) {
        return
      }
    } catch {
      // Server noch nicht bereit - weiter pollen.
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error('Backend fuer den Integrationstest ist nicht rechtzeitig gestartet.')
}

function auswertbareErgebnisse(frageId: string, frageText: string): FragenErgebnis {
  const zentrierteFace = [
    { x: 0, y: 0.5, z: 0, visibility: 1 },
    { x: 0.5, y: 0.5, z: 0, visibility: 1 },
    { x: 1, y: 0.5, z: 0, visibility: 1 },
  ]
  const aufrechtePose = new Array(13).fill(null).map(() => ({ x: 0, y: 0, z: 0, visibility: 1 }))
  aufrechtePose[11] = { x: 0.4, y: 0.3, z: 0, visibility: 1 }
  aufrechtePose[12] = { x: 0.6, y: 0.3, z: 0, visibility: 1 }

  return {
    frage: { id: frageId, text: frageText },
    ergebnisse: Array.from({ length: 10 }, (_, i) => ({
      zeitstempel: i * 1000,
      faceLandmarks: zentrierteFace,
      poseLandmarks: aufrechtePose,
    })),
  }
}

beforeAll(async () => {
  loescheTestDb()

  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: BACKEND_DIR,
    env: { ...process.env, DATABASE_URL },
  })

  server = spawn('npx', ['tsx', 'src/server.ts'], {
    cwd: BACKEND_DIR,
    env: { ...process.env, PORT, DATABASE_URL },
    stdio: 'ignore',
  })

  const echterFetch = globalThis.fetch
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' && input.startsWith('/') ? `${BASE_URL}${input}` : input
    return echterFetch(url, init)
  })

  await wartenBisBereit()
}, 30000)

afterAll(() => {
  server.kill()
  vi.unstubAllGlobals()
  loescheTestDb()
})

describe('verlaufApi – echter Server, echte SQLite-Datei, kein Mock', () => {
  it('speichert eine Session per speichereSession und liest sie unverändert per ladeVerlauf zurück', async () => {
    const config = { beruf: 'Softwareentwicklung', schwierigkeit: 'leicht' as const, modus: 'video-ton' as const }
    const frageErgebnis = auswertbareErgebnisse('int-1', 'Testfrage für den Integrationstest')
    const erwarteteAuswertung = berechneAuswertung(frageErgebnis.ergebnisse)

    await speichereSession(config, [frageErgebnis])

    const verlauf = await ladeVerlauf()

    expect(verlauf).toHaveLength(1)
    expect(verlauf[0]).toMatchObject({ beruf: config.beruf, schwierigkeit: config.schwierigkeit, modus: config.modus })
    expect(verlauf[0]!.ergebnisse).toEqual([
      { frageId: 'int-1', frageText: 'Testfrage für den Integrationstest', ...erwarteteAuswertung },
    ])

    await loescheVerlauf()

    expect(await ladeVerlauf()).toHaveLength(0)
  })
})
