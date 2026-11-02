import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Auswertung } from '../../domain/score'
import { FrageAuswertung } from './FrageAuswertung'

const GUTE_AUSWERTUNG: Auswertung = {
  abdeckung: 1,
  auswertbar: true,
  kopfausrichtungProzent: 85,
  haltungGradMedian: 2.1,
  haltungVerlauf: 0.5,
  bewegungsruhe: 0.1,
  redeflussProzent: 80,
  laengstePauseSekunden: 1.5,
  fuellwoerterProMinute: 4,
}

describe('FrageAuswertung', () => {
  it('zeigt die Frage und alle vier Metriken', () => {
    render(<FrageAuswertung frageText="Erste Frage" auswertung={GUTE_AUSWERTUNG} />)

    expect(screen.getByText('Erste Frage')).toBeInTheDocument()
    expect(screen.getByText('Kopfausrichtung (%)')).toBeInTheDocument()
    expect(screen.getByText('Aufrechte Haltung (°)')).toBeInTheDocument()
    expect(screen.getByText('Bewegung')).toBeInTheDocument()
    expect(screen.getByText('Redefluss (%)')).toBeInTheDocument()
    expect(screen.getByText(/Verlauf über die Antwort/)).toBeInTheDocument()
    expect(screen.getByText(/Längste Pause in der Antwort: 1.5s/)).toBeInTheDocument()
    expect(screen.getByText(/Füllwörter: 4.0 pro Minute Sprechzeit/)).toBeInTheDocument()
  })

  it('zeigt Redefluss auch, wenn die Video-Metriken wegen lueckenhafter Aufnahme fehlen', () => {
    render(
      <FrageAuswertung
        frageText="Frage"
        auswertung={{ ...GUTE_AUSWERTUNG, auswertbar: false, abdeckung: 0.3 }}
      />,
    )

    expect(screen.getByText(/Aufnahme zu lückenhaft/)).toBeInTheDocument()
    expect(screen.getByText('Redefluss (%)')).toBeInTheDocument()
  })

  it('zeigt einen Hinweis statt des Redefluss-Balkens, wenn keine Audiodaten vorliegen', () => {
    render(
      <FrageAuswertung
        frageText="Frage"
        auswertung={{ ...GUTE_AUSWERTUNG, redeflussProzent: null, laengstePauseSekunden: null }}
      />,
    )

    expect(screen.getByText(/Keine Redefluss-Daten/)).toBeInTheDocument()
    expect(screen.queryByText('Redefluss (%)')).not.toBeInTheDocument()
  })

  it('zeigt einen Hinweis statt einer Rate, wenn keine Füllwort-Daten vorliegen', () => {
    render(
      <FrageAuswertung frageText="Frage" auswertung={{ ...GUTE_AUSWERTUNG, fuellwoerterProMinute: null }} />,
    )

    expect(screen.getByText(/Füllwort-Erkennung: keine Daten/)).toBeInTheDocument()
  })

  it('zeigt einen Hinweis statt Balken, wenn die Aufnahme nicht auswertbar ist', () => {
    render(
      <FrageAuswertung
        frageText="Frage mit schlechter Aufnahme"
        auswertung={{ ...GUTE_AUSWERTUNG, auswertbar: false, abdeckung: 0.3 }}
      />,
    )

    expect(screen.getByText(/Aufnahme zu lückenhaft/)).toBeInTheDocument()
    expect(screen.getByText(/30%/)).toBeInTheDocument()
    expect(screen.queryByText('Kopfausrichtung (%)')).not.toBeInTheDocument()
  })

  it('lässt eine Metrik weg, wenn ihr Wert null ist', () => {
    render(<FrageAuswertung frageText="Frage" auswertung={{ ...GUTE_AUSWERTUNG, bewegungsruhe: null }} />)

    expect(screen.queryByText('Bewegung')).not.toBeInTheDocument()
  })

  it('erklärt bei der Bewegung, dass weniger ruhiger bedeutet', () => {
    render(<FrageAuswertung frageText="Frage" auswertung={GUTE_AUSWERTUNG} />)

    expect(screen.getByText(/weniger ist ruhiger/i)).toBeInTheDocument()
  })

  describe('Worauf du achten kannst', () => {
    it('zeigt Hinweise für Kennzahlen außerhalb des Zielbereichs', () => {
      render(
        <FrageAuswertung
          frageText="Frage"
          auswertung={{ ...GUTE_AUSWERTUNG, kopfausrichtungProzent: 40, redeflussProzent: 30 }}
        />,
      )

      expect(screen.getByRole('heading', { name: 'Worauf du achten kannst' })).toBeInTheDocument()
      expect(screen.getByText(/Nur 40 % der Zeit war dein Kopf zur Kamera gerichtet/)).toBeInTheDocument()
      expect(screen.getByText(/Dein Redefluss lag bei 30 %/)).toBeInTheDocument()
    })

    it('lobt, wenn alles im Zielbereich liegt, statt eine leere Liste zu zeigen', () => {
      render(<FrageAuswertung frageText="Frage" auswertung={GUTE_AUSWERTUNG} />)

      expect(screen.queryByRole('heading', { name: 'Worauf du achten kannst' })).not.toBeInTheDocument()
      expect(screen.getByText(/Alles im Zielbereich/)).toBeInTheDocument()
    })

    it('zeigt weder Hinweise noch Lob, wenn gar keine Kennzahl vorliegt', () => {
      render(
        <FrageAuswertung
          frageText="Frage"
          auswertung={{
            ...GUTE_AUSWERTUNG,
            auswertbar: false,
            abdeckung: 0.2,
            kopfausrichtungProzent: null,
            haltungGradMedian: null,
            bewegungsruhe: null,
            redeflussProzent: null,
            laengstePauseSekunden: null,
            fuellwoerterProMinute: null,
          }}
        />,
      )

      expect(screen.queryByText(/Alles im Zielbereich/)).not.toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Worauf du achten kannst' })).not.toBeInTheDocument()
    })
  })
})
