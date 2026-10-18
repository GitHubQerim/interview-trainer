import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRedeflussVad } from './useRedeflussVad'

class MockAnalyserNode {
  fftSize = 2048
  wert = 128 // Mitte = Stille bei 8-bit Time-Domain-Daten
  getByteTimeDomainData(buffer: Uint8Array) {
    buffer.fill(this.wert)
  }
}

class MockAudioContext {
  analyser = new MockAnalyserNode()
  close = vi.fn().mockResolvedValue(undefined)
  createMediaStreamSource() {
    return { connect: vi.fn() }
  }
  createAnalyser() {
    return this.analyser
  }
}

function fakeStreamMitAudio(): MediaStream {
  return { getAudioTracks: () => [{}] } as unknown as MediaStream
}

function fakeStreamOhneAudio(): MediaStream {
  return { getAudioTracks: () => [] } as unknown as MediaStream
}

describe('useRedeflussVad', () => {
  let audioContextInstanzen: MockAudioContext[]

  beforeEach(() => {
    vi.useFakeTimers()
    audioContextInstanzen = []
    vi.stubGlobal(
      'AudioContext',
      class {
        constructor() {
          const instanz = new MockAudioContext()
          audioContextInstanzen.push(instanz)
          return instanz
        }
      },
    )
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('tut nichts ohne Stream', () => {
    const onAudioFrame = vi.fn()
    renderHook(() => useRedeflussVad(null, onAudioFrame))

    vi.advanceTimersByTime(1000)

    expect(onAudioFrame).not.toHaveBeenCalled()
    expect(audioContextInstanzen).toHaveLength(0)
  })

  it('tut nichts bei einem Stream ohne Audio-Track', () => {
    const onAudioFrame = vi.fn()
    renderHook(() => useRedeflussVad(fakeStreamOhneAudio(), onAudioFrame))

    vi.advanceTimersByTime(1000)

    expect(onAudioFrame).not.toHaveBeenCalled()
    expect(audioContextInstanzen).toHaveLength(0)
  })

  it('misst alle 200ms die Lautstaerke und meldet sie ueber onAudioFrame', () => {
    const onAudioFrame = vi.fn()
    renderHook(() => useRedeflussVad(fakeStreamMitAudio(), onAudioFrame))

    vi.advanceTimersByTime(1000)

    // 5 Ticks in 1000ms bei 200ms-Intervall.
    expect(onAudioFrame).toHaveBeenCalledTimes(5)
    // Puffer ist konstant auf 128 (Mitte) -> RMS 0 (Stille).
    expect(onAudioFrame).toHaveBeenLastCalledWith(
      expect.objectContaining({ lautstaerke: expect.closeTo(0, 5) }),
    )
  })

  it('schliesst den AudioContext beim Unmount', () => {
    const { unmount } = renderHook(() => useRedeflussVad(fakeStreamMitAudio(), vi.fn()))

    unmount()

    expect(audioContextInstanzen[0]?.close).toHaveBeenCalled()
  })
})
