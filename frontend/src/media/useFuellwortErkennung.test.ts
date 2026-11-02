import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useFuellwortErkennung } from './useFuellwortErkennung'

class MockSpeechRecognition {
  lang = ''
  continuous = false
  processLocallyIgnorieren = false
  processLocallyBeiStart: boolean | undefined
  private lokal = false
  get processLocally() {
    return this.lokal
  }
  set processLocally(wert: boolean) {
    // Simuliert einen Browser ohne Unterstuetzung: Zuweisung wird verworfen.
    if (!this.processLocallyIgnorieren) {
      this.lokal = wert
    }
  }
  onresult: ((event: unknown) => void) | null = null
  onend: (() => void) | null = null
  onerror: (() => void) | null = null
  startShouldThrow = false
  start = vi.fn(() => {
    this.processLocallyBeiStart = this.processLocally
    if (this.startShouldThrow) {
      throw new Error('start fehlgeschlagen')
    }
  })
  stop = vi.fn(() => {
    // Simuliert echtes Verhalten nicht automatisch - Tests feuern onend() selbst.
  })
}

function ergebnisEvent(text: string) {
  return { resultIndex: 0, results: [{ isFinal: true, 0: { transcript: text } }] }
}

function stubCtor(
  verfuegbarkeit: 'unavailable' | 'downloadable' | 'downloading' | 'available',
  installImpl?: () => Promise<boolean>,
  optionen: { processLocallyIgnorieren?: boolean } = {},
) {
  const instanzen: MockSpeechRecognition[] = []
  class Ctor {
    static available = vi.fn(() => Promise.resolve(verfuegbarkeit))
    static install = vi.fn(installImpl ?? (() => Promise.resolve(true)))
    constructor() {
      const instanz = new MockSpeechRecognition()
      instanz.processLocallyIgnorieren = optionen.processLocallyIgnorieren ?? false
      instanzen.push(instanz)
      return instanz as unknown as Ctor
    }
  }
  vi.stubGlobal('SpeechRecognition', Ctor)
  vi.stubGlobal('webkitSpeechRecognition', undefined)
  return { Ctor, instanzen }
}

describe('useFuellwortErkennung', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('ist "unavailable", wenn SpeechRecognition gar nicht existiert', async () => {
    vi.stubGlobal('SpeechRecognition', undefined)
    vi.stubGlobal('webkitSpeechRecognition', undefined)

    const { result } = renderHook(() => useFuellwortErkennung())

    await waitFor(() => expect(result.current.status).toBe('unavailable'))
  })

  it('ist "unavailable", wenn available() wirft', async () => {
    class Ctor {
      static available = vi.fn(() => Promise.reject(new Error('kaputt')))
    }
    vi.stubGlobal('SpeechRecognition', Ctor)
    vi.stubGlobal('webkitSpeechRecognition', undefined)

    const { result } = renderHook(() => useFuellwortErkennung())

    await waitFor(() => expect(result.current.status).toBe('unavailable'))
  })

  it('übernimmt den Zustand "downloadable" von available()', async () => {
    stubCtor('downloadable')

    const { result } = renderHook(() => useFuellwortErkennung())

    await waitFor(() => expect(result.current.status).toBe('downloadable'))
  })

  it('aktiviere() loest "downloading" dann "available" aus, aber nie automatisch', async () => {
    let installAufgeloest: ((erfolgreich: boolean) => void) | undefined
    const { Ctor } = stubCtor(
      'downloadable',
      () =>
        new Promise((resolve) => {
          installAufgeloest = resolve
        }),
    )

    const { result } = renderHook(() => useFuellwortErkennung())
    await waitFor(() => expect(result.current.status).toBe('downloadable'))

    // Kein automatischer Aufruf ohne Klick.
    expect(Ctor.install).not.toHaveBeenCalled()

    act(() => {
      result.current.aktiviere()
    })
    expect(result.current.status).toBe('downloading')
    expect(Ctor.install).toHaveBeenCalledTimes(1)

    await act(async () => {
      installAufgeloest?.(true)
      await Promise.resolve()
    })

    await waitFor(() => expect(result.current.status).toBe('available'))
  })

  it('Regressionstest: install() mit erfolgreich=false fuehrt zu "unavailable", nicht zu "available"', async () => {
    stubCtor('downloadable', () => Promise.resolve(false))

    const { result } = renderHook(() => useFuellwortErkennung())
    await waitFor(() => expect(result.current.status).toBe('downloadable'))

    act(() => {
      result.current.aktiviere()
    })

    await waitFor(() => expect(result.current.status).toBe('unavailable'))
  })

  it('uebernimmt "available" direkt, wenn available() das liefert', async () => {
    stubCtor('available')

    const { result } = renderHook(() => useFuellwortErkennung())

    await waitFor(() => expect(result.current.status).toBe('available'))
  })

  it('Regressionstest: processLocally ist beim Aufruf von start() gesetzt (sonst Server-Erkennung)', async () => {
    const { instanzen } = stubCtor('available')
    const { result } = renderHook(() => useFuellwortErkennung())
    await waitFor(() => expect(result.current.status).toBe('available'))

    act(() => {
      result.current.starteFuerFrage()
    })

    const instanz = instanzen[0]!
    expect(instanz.start).toHaveBeenCalledTimes(1)
    expect(instanz.processLocallyBeiStart).toBe(true)
  })

  it('startet nicht und wird "unavailable", wenn der Browser processLocally ignoriert', async () => {
    const { instanzen } = stubCtor('available', undefined, { processLocallyIgnorieren: true })
    const { result } = renderHook(() => useFuellwortErkennung())
    await waitFor(() => expect(result.current.status).toBe('available'))

    act(() => {
      result.current.starteFuerFrage()
    })

    expect(instanzen[0]!.start).not.toHaveBeenCalled()
    expect(result.current.status).toBe('unavailable')
  })

  it('trennt Transkripte zweier Fragen: verspaetetes Ergebnis der alten Instanz landet nicht bei der neuen, aber im eigenen Abschluss', async () => {
    const { instanzen } = stubCtor('available')
    const { result } = renderHook(() => useFuellwortErkennung())
    await waitFor(() => expect(result.current.status).toBe('available'))

    act(() => {
      result.current.starteFuerFrage()
    })
    const instanzA = instanzen[0]!
    instanzA.onresult?.(ergebnisEvent('Frage A Text'))

    // Die eigentliche Race liegt zwischen stop() und dem (in Chrome asynchronen)
    // onend - nicht danach: nach onend kommen garantiert keine Ergebnisse mehr,
    // das ist ja gerade die Garantie, auf die sich das Design stuetzt. "Verspaetet"
    // heisst hier: die Erkennung liefert noch ein Ergebnis, WAEHREND sie schon dabei
    // ist zu stoppen.
    let transkriptAPromise: Promise<string> = Promise.resolve('')
    act(() => {
      transkriptAPromise = result.current.beendeFrage() // ruft instanzA.stop() auf
    })
    instanzA.onresult?.(ergebnisEvent('verspaetet zu A')) // trifft nach stop(), vor onend ein
    act(() => {
      instanzA.onend?.() // jetzt erst endgueltig fertig
    })

    act(() => {
      result.current.starteFuerFrage()
    })
    const instanzB = instanzen[1]!
    instanzB.onresult?.(ergebnisEvent('Frage B Text'))

    const transkriptA = await transkriptAPromise
    expect(transkriptA).toContain('Frage A Text')
    expect(transkriptA).toContain('verspaetet zu A')
    expect(transkriptA).not.toContain('Frage B Text')

    let transkriptB = ''
    await act(async () => {
      const promiseB = result.current.beendeFrage()
      instanzB.onend?.()
      transkriptB = await promiseB
    })
    expect(transkriptB).toContain('Frage B Text')
    expect(transkriptB).not.toContain('Frage A Text')
    expect(transkriptB).not.toContain('verspaetet zu A')
  })

  it('startet nach absichtlichem stop() nicht neu', async () => {
    const { instanzen } = stubCtor('available')
    const { result } = renderHook(() => useFuellwortErkennung())
    await waitFor(() => expect(result.current.status).toBe('available'))

    act(() => {
      result.current.starteFuerFrage()
    })
    const instanz = instanzen[0]!
    const startCallsVorStop = instanz.start.mock.calls.length

    await act(async () => {
      const promise = result.current.beendeFrage()
      instanz.onend?.()
      await promise
    })

    expect(instanz.start.mock.calls.length).toBe(startCallsVorStop) // kein Neustart
  })

  it('startet nach Unmount nicht mehr neu', async () => {
    const { instanzen } = stubCtor('available')
    const { result, unmount } = renderHook(() => useFuellwortErkennung())
    await waitFor(() => expect(result.current.status).toBe('available'))

    act(() => {
      result.current.starteFuerFrage()
    })
    const instanz = instanzen[0]!

    unmount()
    // Cleanup-Effekt ruft beendeFrage() -> setzt absichtlichGestoppt, ruft stop().
    await act(async () => {
      instanz.onend?.()
      await Promise.resolve()
    })

    const startCallsNachUnmount = instanz.start.mock.calls.length
    // Ein zweites, ueberholtes onend darf ebenfalls keinen Neustart mehr ausloesen.
    instanz.onend?.()
    expect(instanz.start.mock.calls.length).toBe(startCallsNachUnmount)
  })

  it('wechselt nach mehr als MAX_NEUSTARTS aufeinanderfolgenden Fehlschlaegen zu "unavailable"', async () => {
    const { instanzen } = stubCtor('available')
    const { result } = renderHook(() => useFuellwortErkennung())
    await waitFor(() => expect(result.current.status).toBe('available'))

    act(() => {
      result.current.starteFuerFrage()
    })
    const instanz = instanzen[0]!

    // Vier aufeinanderfolgende natuerliche Enden OHNE Ergebnis dazwischen (mehr als
    // MAX_NEUSTARTS=3) - jedes onend loest bei Erfolg instanz.start() erneut auf,
    // simuliert also denselben Recognizer, der immer wieder sofort wieder endet.
    for (let i = 0; i < 4; i += 1) {
      instanz.onend?.()
    }

    await waitFor(() => expect(result.current.status).toBe('unavailable'))
  })

  it('Regressionstest: viele natuerliche Enden MIT Ergebnissen dazwischen ueberschreiten MAX_NEUSTARTS nicht - Status bleibt "available"', async () => {
    const { instanzen } = stubCtor('available')
    const { result } = renderHook(() => useFuellwortErkennung())
    await waitFor(() => expect(result.current.status).toBe('available'))

    act(() => {
      result.current.starteFuerFrage()
    })
    const instanz = instanzen[0]!

    // 10 Zyklen "Ergebnis, dann natuerliches Ende" - jedes Ergebnis setzt den
    // Fehlschlag-Zaehler zurueck, deshalb darf trotz 10 Neustarts (> MAX_NEUSTARTS=3)
    // nie 'unavailable' erreicht werden.
    for (let i = 0; i < 10; i += 1) {
      instanz.onresult?.(ergebnisEvent(`Teil ${i}`))
      instanz.onend?.()
    }

    expect(result.current.status).toBe('available')
  })

  it('Regressionstest: synchroner Wurf bei start() im Neustart-Zweig fuehrt sofort zu "unavailable", nicht erst nach MAX_NEUSTARTS', async () => {
    const { instanzen } = stubCtor('available')
    const { result } = renderHook(() => useFuellwortErkennung())
    await waitFor(() => expect(result.current.status).toBe('available'))

    act(() => {
      result.current.starteFuerFrage()
    })
    const instanz = instanzen[0]!
    instanz.startShouldThrow = true

    // Erster Neustart-Versuch (weit unter MAX_NEUSTARTS=3) wirft synchron.
    act(() => {
      instanz.onend?.()
    })

    expect(result.current.status).toBe('unavailable')
  })
})
