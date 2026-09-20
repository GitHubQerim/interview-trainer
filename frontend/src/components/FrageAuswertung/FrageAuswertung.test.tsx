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
}

describe('FrageAuswertung', () => {
  it('zeigt die Frage und alle drei Metriken', () => {
    render(<FrageAuswertung frageText="Erste Frage" auswertung={GUTE_AUSWERTUNG} />)

    expect(screen.getByText('Erste Frage')).toBeInTheDocument()
    expect(screen.getByText('Kopfausrichtung (%)')).toBeInTheDocument()
    expect(screen.getByText('Aufrechte Haltung (°)')).toBeInTheDocument()
    expect(screen.getByText('Bewegungsruhe')).toBeInTheDocument()
    expect(screen.getByText(/Verlauf über die Antwort/)).toBeInTheDocument()
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

    expect(screen.queryByText('Bewegungsruhe')).not.toBeInTheDocument()
  })
})
