import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { describe, expect, it } from 'vitest'
import { haltungsWinkel, kopfZentriertheit, schulterbreite, schulterMittelpunkt } from './features'

function punkt(x: number, y: number, z = 0): NormalizedLandmark {
  return { x, y, z, visibility: 1 }
}

function faceMitNase(naseX: number): NormalizedLandmark[] {
  // 478 Punkte werden nicht gebraucht - nur Index 1 (Nase) plus zwei Randpunkte
  // fuer eine eindeutige Bounding-Box (x von 0 bis 1).
  const landmarks: NormalizedLandmark[] = new Array(2).fill(null).map(() => punkt(0, 0))
  landmarks[0] = punkt(0, 0.5)
  landmarks[1] = punkt(naseX, 0.5)
  landmarks.push(punkt(1, 0.5))
  return landmarks
}

function poseMitSchultern(schulterNeigungY: number, schulterbreiteWert = 0.2): NormalizedLandmark[] {
  const landmarks: NormalizedLandmark[] = new Array(13).fill(null).map(() => punkt(0, 0))
  landmarks[11] = punkt(0.4, 0.3) // linke Schulter
  landmarks[12] = punkt(0.4 + schulterbreiteWert, 0.3 + schulterNeigungY) // rechte Schulter
  return landmarks
}

describe('kopfZentriertheit', () => {
  it('gibt 1 zurueck, wenn die Nase mittig in der Bounding-Box liegt', () => {
    expect(kopfZentriertheit(faceMitNase(0.5))).toBeCloseTo(1)
  })

  it('gibt 0 zurueck, wenn die Nase am Rand liegt', () => {
    expect(kopfZentriertheit(faceMitNase(0))).toBeCloseTo(0)
  })

  it('gibt 0.5 zurueck, wenn die Nase bei 25% liegt', () => {
    expect(kopfZentriertheit(faceMitNase(0.25))).toBeCloseTo(0.5)
  })

  it('gibt null zurueck, wenn kein Gesicht erkannt wurde', () => {
    expect(kopfZentriertheit([])).toBeNull()
  })
})

describe('schulterMittelpunkt / schulterbreite', () => {
  it('berechnet den Mittelpunkt zwischen den Schultern', () => {
    expect(schulterMittelpunkt(poseMitSchultern(0))).toEqual({ x: 0.5, y: 0.3 })
  })

  it('berechnet die Schulterbreite', () => {
    expect(schulterbreite(poseMitSchultern(0, 0.3))).toBeCloseTo(0.3)
  })

  it('gibt null zurueck, wenn keine Pose erkannt wurde', () => {
    expect(schulterMittelpunkt([])).toBeNull()
    expect(schulterbreite([])).toBeNull()
  })
})

describe('haltungsWinkel', () => {
  it('gibt 0 Grad zurueck, wenn beide Schultern auf gleicher Hoehe sind', () => {
    expect(haltungsWinkel(poseMitSchultern(0))).toBeCloseTo(0)
  })

  it('gibt einen positiven Winkel zurueck, wenn die Schulterlinie geneigt ist', () => {
    const winkel = haltungsWinkel(poseMitSchultern(0.1))
    expect(winkel).not.toBeNull()
    expect(winkel as number).toBeGreaterThan(0)
  })

  it('gibt einen groesseren Winkel bei staerkerer Neigung zurueck', () => {
    const leichteNeigung = haltungsWinkel(poseMitSchultern(0.05)) as number
    const starkeNeigung = haltungsWinkel(poseMitSchultern(0.2)) as number
    expect(starkeNeigung).toBeGreaterThan(leichteNeigung)
  })

  it('gibt null zurueck, wenn keine Pose erkannt wurde', () => {
    expect(haltungsWinkel([])).toBeNull()
  })
})
