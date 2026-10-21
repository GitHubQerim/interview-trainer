import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { FragenErgebnis } from '../../domain/interview'
import { AuswertungScreen } from './AuswertungScreen'

const AUFRECHTE_POSE = (() => {
  const landmarks = new Array(25).fill(null).map(() => ({ x: 0, y: 0, z: 0, visibility: 1 }))
  landmarks[11] = { x: 0.4, y: 0.3, z: 0, visibility: 1 }
  landmarks[12] = { x: 0.6, y: 0.3, z: 0, visibility: 1 }
  landmarks[23] = { x: 0.4, y: 0.6, z: 0, visibility: 1 }
  landmarks[24] = { x: 0.6, y: 0.6, z: 0, visibility: 1 }
  return landmarks
})()

const ZENTRIERTE_FACE = [
  { x: 0, y: 0.5, z: 0, visibility: 1 },
  { x: 0.5, y: 0.5, z: 0, visibility: 1 },
  { x: 1, y: 0.5, z: 0, visibility: 1 },
]

function auswertbareErgebnisse(fragenId: string, fragenText: string): FragenErgebnis {
  return {
    frage: { id: fragenId, text: fragenText },
    ergebnisse: Array.from({ length: 10 }, (_, i) => ({
      zeitstempel: i * 1000,
      faceLandmarks: ZENTRIERTE_FACE,
      poseLandmarks: AUFRECHTE_POSE,
    })),
    audioErgebnisse: [],
    transkript: '',
  }
}

function luckenhafteErgebnisse(fragenId: string, fragenText: string): FragenErgebnis {
  return {
    frage: { id: fragenId, text: fragenText },
    ergebnisse: [
      { zeitstempel: 0, faceLandmarks: ZENTRIERTE_FACE, poseLandmarks: AUFRECHTE_POSE },
      ...Array.from({ length: 9 }, (_, i) => ({
        zeitstempel: (i + 1) * 1000,
        faceLandmarks: [],
        poseLandmarks: [],
      })),
    ],
    audioErgebnisse: [],
    transkript: '',
  }
}

describe('AuswertungScreen', () => {
  it('zeigt die Metriken fuer die erste Frage', () => {
    const ergebnisse = [auswertbareErgebnisse('1', 'Erste Frage')]

    render(<AuswertungScreen ergebnisse={ergebnisse} onNochmalUeben={vi.fn()} onVerlaufAnsehen={vi.fn()} />)

    expect(screen.getByText('Erste Frage')).toBeInTheDocument()
    expect(screen.getByText('Kopfausrichtung (%)')).toBeInTheDocument()
    expect(screen.getByText('Aufrechte Haltung (°)')).toBeInTheDocument()
    expect(screen.getByText('Bewegung')).toBeInTheDocument()
  })

  it('wechselt per Tab zur zweiten Frage', () => {
    const ergebnisse = [auswertbareErgebnisse('1', 'Erste Frage'), auswertbareErgebnisse('2', 'Zweite Frage')]

    render(<AuswertungScreen ergebnisse={ergebnisse} onNochmalUeben={vi.fn()} onVerlaufAnsehen={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Frage 2' }))

    expect(screen.getByText('Zweite Frage')).toBeInTheDocument()
  })

  it('zeigt einen Hinweis statt Balken, wenn die Abdeckung zu gering ist', () => {
    const ergebnisse = [luckenhafteErgebnisse('1', 'Frage mit schlechter Aufnahme')]

    render(<AuswertungScreen ergebnisse={ergebnisse} onNochmalUeben={vi.fn()} onVerlaufAnsehen={vi.fn()} />)

    expect(screen.getByText(/Aufnahme zu lückenhaft/)).toBeInTheDocument()
    expect(screen.queryByText('Kopfausrichtung (%)')).not.toBeInTheDocument()
  })

  it('ruft onNochmalUeben auf', () => {
    const onNochmalUeben = vi.fn()
    const ergebnisse = [auswertbareErgebnisse('1', 'Erste Frage')]

    render(<AuswertungScreen ergebnisse={ergebnisse} onNochmalUeben={onNochmalUeben} onVerlaufAnsehen={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Nochmal üben' }))

    expect(onNochmalUeben).toHaveBeenCalled()
  })

  it('weist darauf hin, dass die Zielbereiche Orientierungswerte einer Trainingshilfe sind', () => {
    render(
      <AuswertungScreen
        ergebnisse={[auswertbareErgebnisse('1', 'Erste Frage')]}
        onNochmalUeben={vi.fn()}
        onVerlaufAnsehen={vi.fn()}
      />,
    )

    expect(screen.getByText(/Orientierungswerte/)).toBeInTheDocument()
    expect(screen.getByText(/keine Bewertung/)).toBeInTheDocument()
  })

  it('kennzeichnet die gewählte Frage im Tab mit aria-pressed', () => {
    const ergebnisse = [auswertbareErgebnisse('1', 'Erste Frage'), auswertbareErgebnisse('2', 'Zweite Frage')]

    render(<AuswertungScreen ergebnisse={ergebnisse} onNochmalUeben={vi.fn()} onVerlaufAnsehen={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Frage 1' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Frage 2' })).toHaveAttribute('aria-pressed', 'false')
  })
})
