import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FragenErgebnis } from '../../domain/interview'
import { KiExportPanel } from './KiExportPanel'

const POSE = (() => {
  const landmarks = new Array(25).fill(null).map(() => ({ x: 0, y: 0, z: 0, visibility: 1 }))
  landmarks[11] = { x: 0.4, y: 0.3, z: 0, visibility: 1 }
  landmarks[12] = { x: 0.6, y: 0.3, z: 0, visibility: 1 }
  return landmarks
})()
const GESICHT = [
  { x: 0, y: 0.5, z: 0, visibility: 1 },
  { x: 0.5, y: 0.5, z: 0, visibility: 1 },
  { x: 1, y: 0.5, z: 0, visibility: 1 },
]

function frage(id: string, text: string, transkript: string): FragenErgebnis {
  return {
    frage: { id, text },
    ergebnisse: Array.from({ length: 10 }, (_, i) => ({ zeitstempel: i * 1000, faceLandmarks: GESICHT, poseLandmarks: POSE })),
    audioErgebnisse: [],
    transkript,
  }
}

const ERGEBNISSE = [
  frage('1', 'Wie gehen Sie mit Einwänden um?', 'Ich arbeite bei Acme, Mail a@b.de, und frage erstmal nach.'),
  frage('2', 'Wie priorisieren Sie Leads?', 'Ich sortiere nach Wahrscheinlichkeit.'),
]

function vorschau(): string {
  return screen.getByTestId('ki-vorschau').textContent ?? ''
}

describe('KiExportPanel', () => {
  let writeText: ReturnType<typeof vi.fn>

  beforeEach(() => {
    writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('Export', () => {
    it('ist zunächst eingeklappt und erklärt, dass die App selbst nichts sendet', () => {
      render(<KiExportPanel ergebnisse={ERGEBNISSE} beruf="Vertrieb" schwierigkeit="mittel" />)

      expect(screen.getByText(/Mit eigener KI auswerten/).closest('details')).not.toHaveAttribute('open')
      expect(screen.getByText(/Die App sendet nichts/)).toBeInTheDocument()
      expect(screen.getByText(/Datenschutzbedingungen/)).toBeInTheDocument()
    })

    it('gibt standardmäßig Fragen und Kennzahlen, aber kein Transkript mit', () => {
      render(<KiExportPanel ergebnisse={ERGEBNISSE} beruf="Vertrieb" schwierigkeit="mittel" />)

      expect(screen.getByLabelText('Kennzahlen mitgeben')).toBeChecked()
      expect(screen.getByLabelText('Transkript mitgeben')).not.toBeChecked()
      expect(vorschau()).toContain('Wie gehen Sie mit Einwänden um?')
      expect(vorschau()).toContain('Kennzahlen')
      expect(vorschau()).not.toContain('frage erstmal nach')
    })

    it('nimmt das Transkript erst nach dem Haken auf und schwärzt erkannte Angaben und eigene Begriffe', () => {
      render(<KiExportPanel ergebnisse={ERGEBNISSE} beruf="Vertrieb" schwierigkeit="mittel" />)

      fireEvent.click(screen.getByLabelText('Transkript mitgeben'))
      fireEvent.change(screen.getByLabelText(/Begriffe schwärzen/), { target: { value: 'Acme' } })

      expect(vorschau()).toContain('frage erstmal nach')
      expect(vorschau()).toContain('[GESCHWÄRZT]')
      expect(vorschau()).toContain('[E-MAIL]')
      expect(vorschau()).not.toContain('Acme')
      expect(vorschau()).not.toContain('a@b.de')
      expect(screen.getByText(/2 Ersetzungen/)).toBeInTheDocument()
    })

    it('markiert Ersetzungen in der Vorschau farbig', () => {
      render(<KiExportPanel ergebnisse={ERGEBNISSE} />)

      fireEvent.click(screen.getByLabelText('Transkript mitgeben'))

      const marks = within(screen.getByTestId('ki-vorschau')).getAllByText('[E-MAIL]')
      expect(marks[0]?.tagName).toBe('MARK')
    })

    it('weist ehrlich darauf hin, was die Schwärzung nicht erkennt', () => {
      render(<KiExportPanel ergebnisse={ERGEBNISSE} />)

      expect(screen.getByText(/Namen, Orte, Firmen/)).toBeInTheDocument()
      expect(screen.getByText(/erkennt sie nicht von selbst/i)).toBeInTheDocument()
    })

    it('sperrt die Transkript-Option mit Erklärung, wenn kein Transkript vorliegt', () => {
      render(<KiExportPanel ergebnisse={[frage('1', 'Frage?', '')]} />)

      expect(screen.getByLabelText('Transkript mitgeben')).toBeDisabled()
      expect(screen.getByText(/Kein Transkript vorhanden/)).toBeInTheDocument()
    })

    it('erlaubt das Kopieren erst nach der Bestätigung und kopiert exakt den Vorschautext', async () => {
      render(<KiExportPanel ergebnisse={ERGEBNISSE} />)
      const kopieren = screen.getByRole('button', { name: 'In Zwischenablage kopieren' })

      expect(kopieren).toBeDisabled()
      fireEvent.click(screen.getByLabelText('Ich habe den Text geprüft und möchte ihn weitergeben.'))
      expect(kopieren).toBeEnabled()
      fireEvent.click(kopieren)

      await waitFor(() => expect(screen.getByText('Kopiert.')).toBeInTheDocument())
      expect(writeText).toHaveBeenCalledWith(vorschau())
    })

    it('verlangt eine neue Bestätigung, sobald sich der Text ändert', () => {
      render(<KiExportPanel ergebnisse={ERGEBNISSE} />)
      fireEvent.click(screen.getByLabelText('Ich habe den Text geprüft und möchte ihn weitergeben.'))
      expect(screen.getByRole('button', { name: 'In Zwischenablage kopieren' })).toBeEnabled()

      fireEvent.click(screen.getByLabelText('Transkript mitgeben'))

      expect(screen.getByLabelText('Ich habe den Text geprüft und möchte ihn weitergeben.')).not.toBeChecked()
      expect(screen.getByRole('button', { name: 'In Zwischenablage kopieren' })).toBeDisabled()
    })

    it('zeigt einen Hinweis zum Selbstkopieren, wenn die Zwischenablage nicht erreichbar ist', async () => {
      writeText.mockRejectedValue(new Error('blockiert'))
      render(<KiExportPanel ergebnisse={ERGEBNISSE} />)

      fireEvent.click(screen.getByLabelText('Ich habe den Text geprüft und möchte ihn weitergeben.'))
      fireEvent.click(screen.getByRole('button', { name: 'In Zwischenablage kopieren' }))

      await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/von Hand/))
    })
  })

  describe('Rückweg', () => {
    function ref(): string {
      return /REF: ([A-Z0-9]{6})/.exec(vorschau())?.[1] ?? ''
    }

    function antwort(refWert: string | null, extra: Record<string, unknown> = {}) {
      return JSON.stringify({
        ...(refWert ? { ref: refWert } : {}),
        fragen: [{ nr: 1, staerken: ['Klare Struktur'], verbesserungen: ['Ein Beispiel ergänzen'], gesamteindruck: 'Solide', ...extra }],
        naechsteSchritte: ['Mit Zahlen üben'],
      })
    }

    function einfuegen(text: string) {
      fireEvent.change(screen.getByLabelText('Antwort deiner KI einfügen'), { target: { value: text } })
      fireEvent.click(screen.getByRole('button', { name: 'Prüfen und anzeigen' }))
    }

    it('zeigt eine gültige Antwort als als KI-generiert und ungeprüft gekennzeichneten Text', () => {
      render(<KiExportPanel ergebnisse={ERGEBNISSE} />)

      einfuegen(antwort(ref()))

      expect(screen.getByText(/KI-generiert, ungeprüft/)).toBeInTheDocument()
      expect(screen.getByText('Klare Struktur')).toBeInTheDocument()
      expect(screen.getByText('Ein Beispiel ergänzen')).toBeInTheDocument()
      expect(screen.getByText('Mit Zahlen üben')).toBeInTheDocument()
      expect(screen.queryByText(/passt nicht zu dieser Auswertung/)).not.toBeInTheDocument()
    })

    it('warnt, wenn die REF zu einer anderen Auswertung gehört, zeigt die Antwort aber trotzdem', () => {
      render(<KiExportPanel ergebnisse={ERGEBNISSE} />)

      einfuegen(antwort('ZZZZZZ'))

      expect(screen.getByText(/passt nicht zu dieser Auswertung/)).toBeInTheDocument()
      expect(screen.getByText('Klare Struktur')).toBeInTheDocument()
    })

    it('weist darauf hin, wenn keine REF in der Antwort steht', () => {
      render(<KiExportPanel ergebnisse={ERGEBNISSE} />)

      einfuegen(antwort(null))

      expect(screen.getByText(/Keine REF/)).toBeInTheDocument()
    })

    it('erklärt Fehler verständlich statt etwas Halbes anzuzeigen', () => {
      render(<KiExportPanel ergebnisse={ERGEBNISSE} />)

      einfuegen('Das war gut!')

      expect(screen.getByRole('alert')).toHaveTextContent(/JSON/)
      expect(screen.queryByText(/KI-generiert/)).not.toBeInTheDocument()
    })

    it('rendert Inhalte der Antwort ausschließlich als Text, nie als HTML', () => {
      render(<KiExportPanel ergebnisse={ERGEBNISSE} />)

      einfuegen(antwort(ref(), { staerken: ['<img src=x onerror=alert(1)>'] }))

      expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
      expect(document.querySelector('img')).toBeNull()
    })
  })
})
