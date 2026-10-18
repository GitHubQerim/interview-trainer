import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAnalysisWorker } from './useAnalysisWorker'

class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null
  postMessage = vi.fn((message: { type: string }) => {
    if (message.type === 'init') {
      this.onmessage?.({ data: { type: 'ready' } } as MessageEvent)
    }
  })
  terminate = vi.fn()
}

function stubMediaDevices(getUserMedia: () => Promise<MediaStream>) {
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } })
}

function fakeStream(): MediaStream {
  return { getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream
}

describe('useAnalysisWorker', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('wechselt zu permission-denied, wenn die Kamera-Freigabe verweigert wird', async () => {
    stubMediaDevices(() => Promise.reject(new Error('denied')))
    const { result } = renderHook(() => useAnalysisWorker())

    await act(async () => {
      await result.current.start()
    })

    expect(result.current.status).toBe('permission-denied')
  })

  it('faellt bei fehlendem Mikrofon (NotFoundError) auf reines Video zurueck', async () => {
    vi.stubGlobal(
      'Worker',
      class {
        constructor() {
          return new MockWorker()
        }
      },
    )
    const aufrufe: (MediaStreamConstraints | undefined)[] = []
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn((constraints?: MediaStreamConstraints) => {
          aufrufe.push(constraints)
          if (aufrufe.length === 1) {
            return Promise.reject(new DOMException('kein Mikrofon', 'NotFoundError'))
          }
          return Promise.resolve(fakeStream())
        }),
      },
    })

    const { result } = renderHook(() => useAnalysisWorker())

    await act(async () => {
      await result.current.start()
    })

    expect(aufrufe).toHaveLength(2)
    expect(aufrufe[0]).toMatchObject({ video: true, audio: expect.anything() })
    expect(aufrufe[1]).toEqual({ video: true })
    expect(result.current.status).not.toBe('permission-denied')
  })

  it('versucht bei verweigerter Berechtigung (NotAllowedError) keinen zweiten Anlauf', async () => {
    const getUserMedia = vi.fn(() => Promise.reject(new DOMException('verweigert', 'NotAllowedError')))
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } })

    const { result } = renderHook(() => useAnalysisWorker())

    await act(async () => {
      await result.current.start()
    })

    expect(getUserMedia).toHaveBeenCalledTimes(1)
    expect(result.current.status).toBe('permission-denied')
  })

  it('wechselt zu ready, sobald der Worker "ready" meldet', async () => {
    let createdWorker: MockWorker | undefined
    vi.stubGlobal(
      'Worker',
      class {
        constructor() {
          createdWorker = new MockWorker()
          return createdWorker
        }
      },
    )
    stubMediaDevices(() => Promise.resolve(fakeStream()))

    const { result } = renderHook(() => useAnalysisWorker())

    await act(async () => {
      await result.current.start()
    })

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(createdWorker).toBeDefined()
  })

  it('ruft onResult bei jeder result-Nachricht auf', async () => {
    let createdWorker: MockWorker | undefined
    vi.stubGlobal(
      'Worker',
      class {
        constructor() {
          createdWorker = new MockWorker()
          return createdWorker
        }
      },
    )
    stubMediaDevices(() => Promise.resolve(fakeStream()))
    const onResult = vi.fn()

    const { result } = renderHook(() => useAnalysisWorker(onResult))

    await act(async () => {
      await result.current.start()
    })
    await waitFor(() => expect(result.current.status).toBe('ready'))

    act(() => {
      createdWorker?.onmessage?.({
        data: { type: 'result', timestamp: 1, durationMs: 10, faceLandmarks: [], poseLandmarks: [] },
      } as MessageEvent)
    })

    expect(onResult).toHaveBeenCalledWith({ timestamp: 1, durationMs: 10, faceLandmarks: [], poseLandmarks: [] })
  })

  it('beendet den vorherigen Worker, wenn start() erneut aufgerufen wird', async () => {
    const workers: MockWorker[] = []
    vi.stubGlobal(
      'Worker',
      class {
        constructor() {
          const worker = new MockWorker()
          workers.push(worker)
          return worker
        }
      },
    )
    stubMediaDevices(() => Promise.resolve(fakeStream()))

    const { result } = renderHook(() => useAnalysisWorker())

    await act(async () => {
      await result.current.start()
    })
    await waitFor(() => expect(result.current.status).toBe('ready'))

    await act(async () => {
      await result.current.start()
    })

    expect(workers).toHaveLength(2)
    expect(workers[0]?.terminate).toHaveBeenCalled()
  })

  it('ignoriert eine ueberholte start()-Ausfuehrung (z.B. React-StrictMode-Doppel-Mount)', async () => {
    const workers: MockWorker[] = []
    vi.stubGlobal(
      'Worker',
      class {
        constructor() {
          const worker = new MockWorker()
          workers.push(worker)
          return worker
        }
      },
    )

    let resolveErsterStream: ((stream: MediaStream) => void) | undefined
    const ersterStreamTracks = [{ stop: vi.fn() }]
    const ersterStream = { getTracks: () => ersterStreamTracks } as unknown as MediaStream

    let callCount = 0
    stubMediaDevices(() => {
      callCount += 1
      if (callCount === 1) {
        return new Promise((resolve) => {
          resolveErsterStream = resolve
        })
      }
      return Promise.resolve(fakeStream())
    })

    const { result } = renderHook(() => useAnalysisWorker())

    // Erster start() haengt noch in getUserMedia, zweiter start() ueberholt ihn -
    // simuliert exakt die React-StrictMode-Doppel-Mount-Situation.
    const ersterStart = result.current.start()
    const zweiterStart = result.current.start()

    await act(async () => {
      resolveErsterStream?.(ersterStream)
      await Promise.all([ersterStart, zweiterStart])
    })

    await waitFor(() => expect(result.current.status).toBe('ready'))

    // Der ueberholte erste Aufruf darf keinen Worker erzeugt und muss seinen Stream wieder freigegeben haben.
    expect(workers).toHaveLength(1)
    expect(ersterStreamTracks[0]?.stop).toHaveBeenCalled()
  })
})
