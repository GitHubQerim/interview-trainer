import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { describe, expect, it } from 'vitest'
import type { FrameErgebnis } from './interview'
import { berechneAuswertung, haltungsVerlaufLabel, istImZielkorridor } from './score'

function punkt(x: number, y: number): NormalizedLandmark {
  return { x, y, z: 0, visibility: 1 }
}

function aufrechteFace(): NormalizedLandmark[] {
  return [punkt(0, 0.5), punkt(0.5, 0.5), punkt(1, 0.5)]
}

function aufrechtePose(schulterX = 0.5, schulterbreite = 0.2): NormalizedLandmark[] {
  const landmarks: NormalizedLandmark[] = new Array(13).fill(null).map(() => punkt(0, 0))
  landmarks[11] = punkt(schulterX - schulterbreite / 2, 0.3)
  landmarks[12] = punkt(schulterX + schulterbreite / 2, 0.3)
  return landmarks
}

function gekipptePose(schulterNeigungY: number, schulterbreite = 0.2): NormalizedLandmark[] {
  const landmarks: NormalizedLandmark[] = new Array(13).fill(null).map(() => punkt(0, 0))
  landmarks[11] = punkt(0.4, 0.3)
  landmarks[12] = punkt(0.4 + schulterbreite, 0.3 + schulterNeigungY)
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
  it('Kopfausrichtung 85% liegt im Zielkorridor (70-100%)', () => {
    expect(istImZielkorridor('kopfausrichtung', 85)).toBe(true)
  })

  it('Kopfausrichtung 50% liegt ausserhalb des Zielkorridors (70-100%)', () => {
    expect(istImZielkorridor('kopfausrichtung', 50)).toBe(false)
  })

  it('Bewegung 0.61 liegt ausserhalb des Zielkorridors (0-0.25)', () => {
    expect(istImZielkorridor('bewegungsruhe', 0.61)).toBe(false)
  })

  it('Bewegung 0.1 liegt im Zielkorridor (0-0.25)', () => {
    expect(istImZielkorridor('bewegungsruhe', 0.1)).toBe(true)
  })

  it('sehr ruhiges Sitzen (Bewegung 0) liegt im Zielkorridor, es gibt keine Untergrenze', () => {
    expect(istImZielkorridor('bewegungsruhe', 0)).toBe(true)
    expect(istImZielkorridor('bewegungsruhe', 0.01)).toBe(true)
  })

  it('durchgehend flüssiges Sprechen (Redefluss 100 %) liegt im Zielkorridor, es gibt keine Obergrenze', () => {
    expect(istImZielkorridor('redefluss', 100)).toBe(true)
    expect(istImZielkorridor('redefluss', 59)).toBe(false)
  })

  it('Haltung 5 Grad liegt im Zielkorridor (0-6 Grad)', () => {
    expect(istImZielkorridor('haltung', 5)).toBe(true)
  })
})

describe('haltungsVerlaufLabel', () => {
  it('gibt "nimmt zu" bei deutlich positivem Verlauf zurueck', () => {
    expect(haltungsVerlaufLabel(8)).toBe('nimmt zu')
  })

  it('gibt "nimmt ab" bei deutlich negativem Verlauf zurueck', () => {
    expect(haltungsVerlaufLabel(-8)).toBe('nimmt ab')
  })

  it('gibt "bleibt stabil" bei einer Differenz unter 1 Grad zurueck', () => {
    expect(haltungsVerlaufLabel(0.5)).toBe('bleibt stabil')
    expect(haltungsVerlaufLabel(-0.5)).toBe('bleibt stabil')
  })

  it('gibt "keine Daten" zurueck, wenn kein Verlauf berechnet werden konnte', () => {
    expect(haltungsVerlaufLabel(null)).toBe('keine Daten')
  })
})
