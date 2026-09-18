import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { describe, expect, it } from 'vitest'
import type { FrameErgebnis } from './interview'
import { berechneAuswertung, istImZielkorridor } from './score'

function punkt(x: number, y: number): NormalizedLandmark {
  return { x, y, z: 0, visibility: 1 }
}

function aufrechteFace(): NormalizedLandmark[] {
  return [punkt(0, 0.5), punkt(0.5, 0.5), punkt(1, 0.5)]
}

function aufrechtePose(schulterX = 0.5, schulterbreite = 0.2): NormalizedLandmark[] {
  const landmarks: NormalizedLandmark[] = new Array(25).fill(null).map(() => punkt(0, 0))
  landmarks[11] = punkt(schulterX - schulterbreite / 2, 0.3)
  landmarks[12] = punkt(schulterX + schulterbreite / 2, 0.3)
  landmarks[23] = punkt(schulterX - schulterbreite / 2, 0.6)
  landmarks[24] = punkt(schulterX + schulterbreite / 2, 0.6)
  return landmarks
}

function gekipptePose(schulterVersatzX: number, schulterbreite = 0.2): NormalizedLandmark[] {
  const landmarks: NormalizedLandmark[] = new Array(25).fill(null).map(() => punkt(0, 0))
  landmarks[11] = punkt(0.4 + schulterVersatzX, 0.3)
  landmarks[12] = punkt(0.4 + schulterVersatzX + schulterbreite, 0.3)
  landmarks[23] = punkt(0.4, 0.6)
  landmarks[24] = punkt(0.4 + schulterbreite, 0.6)
  return landmarks
}

function erkannterFrame(zeitstempel: number, poseLandmarks: NormalizedLandmark[] = aufrechtePose()): FrameErgebnis {
  return { zeitstempel, faceLandmarks: aufrechteFace(), poseLandmarks }
}

function nichtErkannterFrame(zeitstempel: number): FrameErgebnis {
  return { zeitstempel, faceLandmarks: [], poseLandmarks: [] }
}

describe('berechneAuswertung', () => {
  it('liefert nicht auswertbar bei leerer Liste', () => {
    const auswertung = berechneAuswertung([])
    expect(auswertung.abdeckung).toBe(0)
    expect(auswertung.auswertbar).toBe(false)
    expect(auswertung.kopfausrichtungProzent).toBeNull()
    expect(auswertung.haltungGradMedian).toBeNull()
    expect(auswertung.bewegungsruhe).toBeNull()
  })

  it('liefert nicht auswertbar bei Abdeckung unter 60%', () => {
    const ergebnisse = [
      erkannterFrame(0),
      erkannterFrame(1000),
      erkannterFrame(2000),
      nichtErkannterFrame(3000),
      nichtErkannterFrame(4000),
      nichtErkannterFrame(5000),
      nichtErkannterFrame(6000),
      nichtErkannterFrame(7000),
      nichtErkannterFrame(8000),
      nichtErkannterFrame(9000),
    ]

    const auswertung = berechneAuswertung(ergebnisse)

    expect(auswertung.abdeckung).toBeCloseTo(0.3)
    expect(auswertung.auswertbar).toBe(false)
    expect(auswertung.kopfausrichtungProzent).toBeNull()
  })

  it('berechnet Kopfausrichtung und Haltung bei ruhiger, aufrechter Sitzhaltung', () => {
    const ergebnisse = Array.from({ length: 10 }, (_, i) => erkannterFrame(i * 1000))

    const auswertung = berechneAuswertung(ergebnisse)

    expect(auswertung.auswertbar).toBe(true)
    expect(auswertung.abdeckung).toBe(1)
    expect(auswertung.kopfausrichtungProzent).toBeCloseTo(100)
    expect(auswertung.haltungGradMedian).toBeCloseTo(0)
    expect(auswertung.bewegungsruhe).toBeCloseTo(0)
  })

  it('erkennt einen Anstieg der Neigung im Verlauf der Antwort', () => {
    const ergebnisse = [
      erkannterFrame(0, aufrechtePose()),
      erkannterFrame(1000, aufrechtePose()),
      erkannterFrame(2000, aufrechtePose()),
      erkannterFrame(3000, gekipptePose(0.15)),
      erkannterFrame(4000, gekipptePose(0.15)),
      erkannterFrame(5000, gekipptePose(0.15)),
      erkannterFrame(6000, gekipptePose(0.3)),
      erkannterFrame(7000, gekipptePose(0.3)),
      erkannterFrame(8000, gekipptePose(0.3)),
    ]

    const auswertung = berechneAuswertung(ergebnisse)

    expect(auswertung.haltungVerlauf).not.toBeNull()
    expect(auswertung.haltungVerlauf as number).toBeGreaterThan(0)
  })

  it('normiert Bewegungsruhe auf die Schulterbreite und rechnet pro Sekunde', () => {
    // Schulter bewegt sich pro Sekunde um die halbe Schulterbreite (0.1 bei Breite 0.2).
    const ergebnisse = [
      erkannterFrame(0, aufrechtePose(0.5, 0.2)),
      erkannterFrame(1000, aufrechtePose(0.6, 0.2)),
      erkannterFrame(2000, aufrechtePose(0.5, 0.2)),
    ]

    const auswertung = berechneAuswertung(ergebnisse)

    // Distanz 0.1, Breite 0.2 -> normiert 0.5, pro Sekunde (dt=1s) -> 0.5.
    expect(auswertung.bewegungsruhe).toBeCloseTo(0.5)
  })
})

describe('istImZielkorridor', () => {
  it('Kopfausrichtung 70% liegt im Zielkorridor (60-80%)', () => {
    expect(istImZielkorridor('kopfausrichtung', 70)).toBe(true)
  })

  it('Bewegungsruhe 0.61 liegt ausserhalb des Zielkorridors (0.15-0.45)', () => {
    expect(istImZielkorridor('bewegungsruhe', 0.61)).toBe(false)
  })

  it('Haltung 5 Grad liegt im Zielkorridor (0-6 Grad)', () => {
    expect(istImZielkorridor('haltung', 5)).toBe(true)
  })
})
