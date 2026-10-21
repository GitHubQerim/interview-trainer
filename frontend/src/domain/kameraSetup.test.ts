import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { describe, expect, it } from 'vitest'
import { bewerteKameraSetup, type SetupHinweis } from './kameraSetup'

function punkt(x: number, y: number, visibility = 1): NormalizedLandmark {
  return { x, y, z: 0, visibility }
}

function pose(links: NormalizedLandmark, rechts: NormalizedLandmark): NormalizedLandmark[] {
  const landmarks = Array.from({ length: 33 }, () => punkt(0.5, 0.5))
  landmarks[11] = links
  landmarks[12] = rechts
  return landmarks
}

// Index 1 ist die Nasenspitze (wie im Face-Mesh) und sitzt hier mittig im Gesicht.
const GUTES_GESICHT = [punkt(0.4, 0.2), punkt(0.5, 0.3), punkt(0.6, 0.2)]
const GUTE_POSE = pose(punkt(0.35, 0.7), punkt(0.65, 0.7))

function hinweis(hinweise: SetupHinweis[], id: SetupHinweis['id']): SetupHinweis {
  const gefunden = hinweise.find((eintrag) => eintrag.id === id)
  if (!gefunden) {
    throw new Error(`Hinweis ${id} fehlt`)
  }
  return gefunden
}

describe('bewerteKameraSetup', () => {
  it('meldet bei gutem Setup alle fuenf Hinweise als ok', () => {
    const hinweise = bewerteKameraSetup(GUTES_GESICHT, GUTE_POSE)

    expect(hinweise.map((eintrag) => eintrag.id)).toEqual([
      'kopf-im-bild',
      'kopf-zur-kamera',
      'schultern-sichtbar',
      'abstand',
      'schulterneigung',
    ])
    expect(hinweise.every((eintrag) => eintrag.status === 'ok')).toBe(true)
  })

  it('markiert alles als unbekannt, solange nichts erkannt wird', () => {
    const hinweise = bewerteKameraSetup([], [])

    expect(hinweise.every((eintrag) => eintrag.status === 'unbekannt')).toBe(true)
  })

  describe('kopf-im-bild', () => {
    it('warnt, wenn der Kopf oben angeschnitten ist', () => {
      const hinweise = bewerteKameraSetup([punkt(0.4, 0.0), punkt(0.6, 0.3)], GUTE_POSE)

      expect(hinweis(hinweise, 'kopf-im-bild').status).toBe('achtung')
    })

    it('warnt, wenn der Kopf seitlich aus dem Bild ragt', () => {
      const hinweise = bewerteKameraSetup([punkt(0.5, 0.2), punkt(0.99, 0.3)], GUTE_POSE)

      expect(hinweis(hinweise, 'kopf-im-bild').status).toBe('achtung')
    })
  })

  describe('kopf-zur-kamera', () => {
    it('ist ok, wenn die Nase mittig im Gesicht sitzt', () => {
      const hinweise = bewerteKameraSetup(GUTES_GESICHT, GUTE_POSE)

      expect(hinweis(hinweise, 'kopf-zur-kamera').status).toBe('ok')
    })

    it('raet zur Drehung, wenn die Nase deutlich seitlich sitzt (Kopf zur Seite gedreht)', () => {
      // Nase bei 90 % der Gesichtsbreite -> Ausrichtung 0,2, unter der Schwelle der Auswertung.
      const gedreht = [punkt(0.4, 0.2), punkt(0.58, 0.3), punkt(0.6, 0.2)]

      const eintrag = hinweis(bewerteKameraSetup(gedreht, GUTE_POSE), 'kopf-zur-kamera')

      expect(eintrag.status).toBe('achtung')
      expect(eintrag.text).toMatch(/zur Kamera drehen/)
    })

    it('nutzt dieselbe Schwelle wie die Auswertung (0,7)', () => {
      // Nase bei 60 % -> Ausrichtung 0,8 (ok); bei 70 % -> 0,6 (unter 0,7).
      const leicht = [punkt(0.4, 0.2), punkt(0.52, 0.3), punkt(0.6, 0.2)]
      const staerker = [punkt(0.4, 0.2), punkt(0.54, 0.3), punkt(0.6, 0.2)]

      expect(hinweis(bewerteKameraSetup(leicht, GUTE_POSE), 'kopf-zur-kamera').status).toBe('ok')
      expect(hinweis(bewerteKameraSetup(staerker, GUTE_POSE), 'kopf-zur-kamera').status).toBe('achtung')
    })

    it('ist unbekannt, wenn kein Gesicht erkannt wird', () => {
      expect(hinweis(bewerteKameraSetup([], GUTE_POSE), 'kopf-zur-kamera').status).toBe('unbekannt')
    })
  })

  describe('schultern-sichtbar', () => {
    it('warnt bei geringer Sichtbarkeit der Schultern', () => {
      const hinweise = bewerteKameraSetup(GUTES_GESICHT, pose(punkt(0.35, 0.7, 0.2), punkt(0.65, 0.7, 0.9)))

      expect(hinweis(hinweise, 'schultern-sichtbar').status).toBe('achtung')
    })

    it('warnt, wenn eine Schulter ausserhalb des Bildes geschaetzt wird', () => {
      const hinweise = bewerteKameraSetup(GUTES_GESICHT, pose(punkt(0.35, 1.2), punkt(0.65, 1.2)))

      expect(hinweis(hinweise, 'schultern-sichtbar').status).toBe('achtung')
    })
  })

  describe('abstand', () => {
    it('rät bei schmalen Schultern, naeher heranzugehen', () => {
      const hinweise = bewerteKameraSetup(GUTES_GESICHT, pose(punkt(0.45, 0.7), punkt(0.55, 0.7)))

      const abstand = hinweis(hinweise, 'abstand')
      expect(abstand.status).toBe('achtung')
      expect(abstand.text).toMatch(/näher/)
    })

    it('rät bei sehr breiten Schultern, weiter weg zu gehen', () => {
      const hinweise = bewerteKameraSetup(GUTES_GESICHT, pose(punkt(0.1, 0.7), punkt(0.9, 0.7)))

      const abstand = hinweis(hinweise, 'abstand')
      expect(abstand.status).toBe('achtung')
      expect(abstand.text).toMatch(/weiter weg/)
    })

    it('ist unbekannt, wenn die Schultern nicht sichtbar sind', () => {
      const hinweise = bewerteKameraSetup(GUTES_GESICHT, pose(punkt(0.35, 0.7, 0.1), punkt(0.65, 0.7, 0.1)))

      expect(hinweis(hinweise, 'abstand').status).toBe('unbekannt')
    })
  })

  describe('schulterneigung', () => {
    it('nutzt denselben Zielkorridor wie die Auswertung (0-6 Grad)', () => {
      // dy/dx = 0.05/0.3 -> ca. 9,5 Grad
      const schief = bewerteKameraSetup(GUTES_GESICHT, pose(punkt(0.35, 0.65), punkt(0.65, 0.7)))
      // dy/dx = 0.02/0.3 -> ca. 3,8 Grad
      const leichtSchief = bewerteKameraSetup(GUTES_GESICHT, pose(punkt(0.35, 0.68), punkt(0.65, 0.7)))

      expect(hinweis(schief, 'schulterneigung').status).toBe('achtung')
      expect(hinweis(leichtSchief, 'schulterneigung').status).toBe('ok')
    })

    it('nennt die Neigung in Grad im Detail', () => {
      const hinweise = bewerteKameraSetup(GUTES_GESICHT, pose(punkt(0.35, 0.65), punkt(0.65, 0.7)))

      expect(hinweis(hinweise, 'schulterneigung').detail).toBe('9.5° Neigung')
    })
  })
})
