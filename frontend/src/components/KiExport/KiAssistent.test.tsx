import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FragenErgebnis } from '../../domain/interview'
import { KiAssistent } from './KiAssistent'

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

const BESTAETIGUNG = 'Ich habe den Text geprüft und möchte ihn weitergeben.'

function vorschau(): string {
  return screen.getByTestId('ki-vorschau').textContent ?? ''
}

function oeffne() {
  fireEvent.click(screen.getByRole('button', { name: /Mit KI auswerten/ }))
}

describe('KiAssistent', () => {
  let writeText: ReturnType<typeof vi.fn>

  beforeAll(() => {
    // jsdom kennt showModal/close nicht in jeder Version; das Stub bildet nur nach, was die
    // Komponente braucht: open-Attribut setzen und beim Schliessen das close-Ereignis feuern.
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '')
    }
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    }
  })

  beforeEach(() => {
    writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('Modal und Ablauf', () => {
    it('zeigt zunächst nur den Button, das Modal ist geschlossen', () => {
      render(<KiAssistent ergebnisse={ERGEBNISSE} beruf="Vertrieb" schwierigkeit="mittel" />)

      expect(screen.getByRole('button', { name: /Mit KI auswerten/ })).toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('öffnet ein Modal mit Fortschrittsanzeige über drei Schritte', () => {
      render(<KiAssistent ergebnisse={ERGEBNISSE} />)

      oeffne()

      const dialog = screen.getByRole('dialog', { name: 'Mit eigener KI auswerten' })
      const schritte = within(dialog).getAllByRole('listitem')
      expect(schritte.map((eintrag) => eintrag.textContent)).toEqual([
        expect.stringContaining('Text vorbereiten'),
        expect.stringContaining('Antwort einfügen'),
        expect.stringContaining('Feedback'),
      ])
      expect(schritte[0]).toHaveAttribute('aria-current', 'step')
    })

    it('erklärt kurz, dass die App nichts sendet, und hält Details zum Datenschutz bereit', () => {
      render(<KiAssistent ergebnisse={ERGEBNISSE} />)
      oeffne()

      expect(screen.getByText(/Die App sendet nichts/)).toBeInTheDocument()
      expect(screen.getByText(/Datenschutzbedingungen/)).toBeInTheDocument()
      expect(screen.getByText(/Inkognito-Modus ist eine Zusage des Anbieters/)).toBeInTheDocument()
    })

    it('führt mit Weiter und Zurück durch die Schritte', () => {
      render(<KiAssistent ergebnisse={ERGEBNISSE} />)
      oeffne()

      fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
      expect(screen.getByLabelText('Antwort deiner KI einfügen')).toBeInTheDocument()
      expect(within(screen.getByRole('dialog')).getAllByRole('listitem')[1]).toHaveAttribute('aria-current', 'step')

      fireEvent.click(screen.getByRole('button', { name: 'Zurück' }))
      expect(screen.getByLabelText('Kennzahlen mitgeben')).toBeInTheDocument()
    })

    it('schließt per Button und merkt sich Schritt und Eingaben beim erneuten Öffnen', () => {
      render(<KiAssistent ergebnisse={ERGEBNISSE} />)
      oeffne()
      fireEvent.click(screen.getByLabelText('Transkript mitgeben'))
      fireEvent.change(screen.getByLabelText(/Begriffe schwärzen/), { target: { value: 'Acme' } })

      fireEvent.click(screen.getByRole('button', { name: 'Schließen' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

      oeffne()
      expect(screen.getByLabelText('Transkript mitgeben')).toBeChecked()
      expect(screen.getByLabelText(/Begriffe schwärzen/)).toHaveValue('Acme')
    })

    it('behandelt Esc (close-Ereignis des Dialogs) wie Schließen', () => {
      render(<KiAssistent ergebnisse={ERGEBNISSE} />)
      oeffne()

      fireEvent(document.querySelector('dialog') as HTMLDialogElement, new Event('close'))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  describe('Schritt 1: Text vorbereiten', () => {
    it('gibt standardmäßig Fragen und Kennzahlen, aber kein Transkript mit', () => {
      render(<KiAssistent ergebnisse={ERGEBNISSE} beruf="Vertrieb" schwierigkeit="mittel" />)
      oeffne()

      expect(screen.getByLabelText('Kennzahlen mitgeben')).toBeChecked()
      expect(screen.getByLabelText('Transkript mitgeben')).not.toBeChecked()
      expect(vorschau()).toContain('Wie gehen Sie mit Einwänden um?')
      expect(vorschau()).toContain('Kennzahlen')
      expect(vorschau()).not.toContain('frage erstmal nach')
    })

    it('nimmt das Transkript erst nach dem Haken auf und schwärzt erkannte Angaben und eigene Begriffe', () => {
      render(<KiAssistent ergebnisse={ERGEBNISSE} beruf="Vertrieb" schwierigkeit="mittel" />)
      oeffne()

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
      render(<KiAssistent ergebnisse={ERGEBNISSE} />)
      oeffne()

      fireEvent.click(screen.getByLabelText('Transkript mitgeben'))

      const marks = within(screen.getByTestId('ki-vorschau')).getAllByText('[E-MAIL]')
      expect(marks[0]?.tagName).toBe('MARK')
    })

    it('weist ehrlich darauf hin, was die Schwärzung nicht erkennt', () => {
      render(<KiAssistent ergebnisse={ERGEBNISSE} />)
      oeffne()

      expect(screen.getByText(/Namen, Orte, Firmen/)).toBeInTheDocument()
      expect(screen.getByText(/erkennt sie nicht von selbst/i)).toBeInTheDocument()
    })

    it('sperrt die Transkript-Option mit Erklärung, wenn kein Transkript vorliegt', () => {
      render(<KiAssistent ergebnisse={[frage('1', 'Frage?', '')]} />)
      oeffne()

      expect(screen.getByLabelText('Transkript mitgeben')).toBeDisabled()
      expect(screen.getByText(/Kein Transkript vorhanden/)).toBeInTheDocument()
    })

    it('erlaubt das Kopieren erst nach der Bestätigung und kopiert exakt den Vorschautext', async () => {
      render(<KiAssistent ergebnisse={ERGEBNISSE} />)
      oeffne()
      const kopieren = screen.getByRole('button', { name: 'In Zwischenablage kopieren' })

      expect(kopieren).toBeDisabled()
      fireEvent.click(screen.getByLabelText(BESTAETIGUNG))
      expect(kopieren).toBeEnabled()
      fireEvent.click(kopieren)

      await waitFor(() => expect(screen.getByText('Kopiert.')).toBeInTheDocument())
      expect(writeText).toHaveBeenCalledWith(vorschau())
    })

    it('verlangt eine neue Bestätigung, sobald sich der Text ändert', () => {
      render(<KiAssistent ergebnisse={ERGEBNISSE} />)
      oeffne()
      fireEvent.click(screen.getByLabelText(BESTAETIGUNG))
      expect(screen.getByRole('button', { name: 'In Zwischenablage kopieren' })).toBeEnabled()

      fireEvent.click(screen.getByLabelText('Transkript mitgeben'))

      expect(screen.getByLabelText(BESTAETIGUNG)).not.toBeChecked()
      expect(screen.getByRole('button', { name: 'In Zwischenablage kopieren' })).toBeDisabled()
    })

    it('zeigt einen Hinweis zum Selbstkopieren, wenn die Zwischenablage nicht erreichbar ist', async () => {
      writeText.mockRejectedValue(new Error('blockiert'))
      render(<KiAssistent ergebnisse={ERGEBNISSE} />)
      oeffne()

      fireEvent.click(screen.getByLabelText(BESTAETIGUNG))
      fireEvent.click(screen.getByRole('button', { name: 'In Zwischenablage kopieren' }))

      await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/von Hand/))
    })
  })

  describe('Schritt 2 und 3: Antwort einfügen und Feedback', () => {
    function ref(): string {
      return /REF: ([A-Z0-9]{6})/.exec(vorschau())?.[1] ?? ''
    }

    function antwort(refWert: string | null, extra: Record<string, unknown> = {}) {
      return JSON.stringify({
        ...(refWert ? { ref: refWert } : {}),
        fragen: [
          {
            nr: 1,
            staerken: ['Klare Struktur', 'Gutes Beispiel'],
            verbesserungen: ['Ein Beispiel ergänzen'],
            formulierungen: [{ statt: 'ich glaub', besser: 'Ich bin überzeugt' }],
            gesamteindruck: 'Solide',
            ...extra,
          },
        ],
        naechsteSchritte: ['Mit Zahlen üben'],
      })
    }

    function einfuegen(text: string) {
      fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
      fireEvent.change(screen.getByLabelText('Antwort deiner KI einfügen'), { target: { value: text } })
      fireEvent.click(screen.getByRole('button', { name: 'Prüfen und anzeigen' }))
    }

    it('wechselt nach gültiger Antwort zu Schritt 3 und kennzeichnet sie als KI-generiert und ungeprüft', () => {
      render(<KiAssistent ergebnisse={ERGEBNISSE} />)
      oeffne()
      const refWert = ref()

      einfuegen(antwort(refWert))

      expect(screen.getByText(/KI-generiert, ungeprüft/)).toBeInTheDocument()
      expect(within(screen.getByRole('dialog')).getAllByRole('listitem')[2]).toHaveAttribute('aria-current', 'step')
      expect(screen.queryByText(/passt nicht zu dieser Auswertung/)).not.toBeInTheDocument()
    })

    it('zeigt je Frage eine zugeklappte Zeile mit Kurzinfo statt einer langen Seite', () => {
      render(<KiAssistent ergebnisse={ERGEBNISSE} />)
      oeffne()
      const refWert = ref()

      einfuegen(antwort(refWert))

      const zeile = screen.getByText('Wie gehen Sie mit Einwänden um?').closest('details')
      expect(zeile).not.toBeNull()
      expect(zeile).not.toHaveAttribute('open')
      expect(screen.getByText(/2 Stärken/)).toBeInTheDocument()
      expect(screen.getByText(/1 Verbesserung\b/)).toBeInTheDocument()
      expect(screen.getByText(/1 Formulierung\b/)).toBeInTheDocument()
    })

    it('hält die drei Karten Stärken, Verbesserungen und Statt-lieber je Frage einzeln zugeklappt bereit', () => {
      render(<KiAssistent ergebnisse={ERGEBNISSE} />)
      oeffne()
      const refWert = ref()

      einfuegen(antwort(refWert))

      for (const titel of [/^Stärken/, /^Verbesserungen/, /^Statt … lieber …/]) {
        const karte = screen.getByText(titel, { selector: 'summary' }).closest('details')
        expect(karte).not.toBeNull()
        expect(karte).not.toHaveAttribute('open')
      }
      expect(screen.getByText('Klare Struktur')).toBeInTheDocument()
      expect(screen.getByText('Mit Zahlen üben')).toBeInTheDocument()
    })

    it('warnt, wenn die REF zu einer anderen Auswertung gehört, zeigt die Antwort aber trotzdem', () => {
      render(<KiAssistent ergebnisse={ERGEBNISSE} />)
      oeffne()

      einfuegen(antwort('ZZZZZZ'))

      expect(screen.getByText(/passt nicht zu dieser Auswertung/)).toBeInTheDocument()
      expect(screen.getByText('Klare Struktur')).toBeInTheDocument()
    })

    it('weist darauf hin, wenn keine REF in der Antwort steht', () => {
      render(<KiAssistent ergebnisse={ERGEBNISSE} />)
      oeffne()

      einfuegen(antwort(null))

      expect(screen.getByText(/Keine REF/)).toBeInTheDocument()
    })

    it('erklärt Fehler im Schritt 2, statt etwas Halbes anzuzeigen', () => {
      render(<KiAssistent ergebnisse={ERGEBNISSE} />)
      oeffne()

      einfuegen('Das war gut!')

      expect(screen.getByRole('alert')).toHaveTextContent(/JSON/)
      expect(screen.getByLabelText('Antwort deiner KI einfügen')).toBeInTheDocument()
      expect(screen.queryByText(/KI-generiert/)).not.toBeInTheDocument()
    })

    it('rendert Inhalte der Antwort ausschließlich als Text, nie als HTML', () => {
      render(<KiAssistent ergebnisse={ERGEBNISSE} />)
      oeffne()
      const refWert = ref()

      einfuegen(antwort(refWert, { staerken: ['<img src=x onerror=alert(1)>'] }))

      expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
      expect(document.querySelector('img')).toBeNull()
    })

    it('kann aus Schritt 3 zurück zur Antwort und zu einem neuen Versuch', () => {
      render(<KiAssistent ergebnisse={ERGEBNISSE} />)
      oeffne()
      einfuegen(antwort('ZZZZZZ'))

      fireEvent.click(screen.getByRole('button', { name: 'Zurück zur Antwort' }))

      expect(screen.getByLabelText('Antwort deiner KI einfügen')).toHaveValue(antwort('ZZZZZZ'))
    })
  })
})
