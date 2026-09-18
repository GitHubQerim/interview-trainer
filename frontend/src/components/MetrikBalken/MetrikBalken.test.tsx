import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MetrikBalken } from './MetrikBalken'

describe('MetrikBalken', () => {
  it('zeigt "im Zielbereich" und den entsprechenden Text, wenn der Wert im Korridor liegt', () => {
    render(
      <MetrikBalken
        label="Kopfausrichtung (%)"
        wert={69}
        einheit="%"
        anzeigeMin={0}
        anzeigeMax={100}
        zielkorridorMin={60}
        zielkorridorMax={80}
        imZielkorridor
        messmethode="Testmethode Kopfausrichtung"
      />,
    )

    expect(screen.getByText('im Zielbereich')).toBeInTheDocument()
    expect(screen.getByText('69%')).toBeInTheDocument()
  })

  it('zeigt "außerhalb", wenn der Wert nicht im Korridor liegt (Klickdummy-Beispiel Bewegungsruhe)', () => {
    render(
      <MetrikBalken
        label="Bewegungsruhe"
        wert={0.61}
        anzeigeMin={0}
        anzeigeMax={1}
        zielkorridorMin={0.15}
        zielkorridorMax={0.45}
        imZielkorridor={false}
        messmethode="Testmethode Bewegungsruhe"
      />,
    )

    expect(screen.getByText('außerhalb')).toBeInTheDocument()
  })

  it('zeigt die Messmethode im aufgeklappten Detail-Text', () => {
    render(
      <MetrikBalken
        label="Haltung (°)"
        wert={5}
        einheit="°"
        anzeigeMin={0}
        anzeigeMax={20}
        zielkorridorMin={0}
        zielkorridorMax={6}
        imZielkorridor
        messmethode="Winkel zwischen Huefte und Schulter."
      />,
    )

    expect(screen.getByText('So wurde das gemessen')).toBeInTheDocument()
    expect(screen.getByText('Winkel zwischen Huefte und Schulter.')).toBeInTheDocument()
  })
})
