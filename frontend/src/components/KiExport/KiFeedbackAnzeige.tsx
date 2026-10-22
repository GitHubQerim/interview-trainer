import type { KiAntwort } from '../../domain/kiAntwort'
import styles from './KiAssistent.module.scss'

interface KiFeedbackAnzeigeProps {
  antwort: KiAntwort
  // Fragetexte in der Reihenfolge der Auswertung, damit zu jeder Rueckmeldung die Frage steht.
  fragenTexte: string[]
  // REF dieser Auswertung, nur fuer den Plausibilitaetscheck gegen die REF der Antwort.
  aktuelleRef: string
  onZurueck: () => void
  onFertig: () => void
}

function zaehle(anzahl: number, einzahl: string, mehrzahl: string): string {
  return `${anzahl} ${anzahl === 1 ? einzahl : mehrzahl}`
}

/**
 * Schritt 3 des KI-Assistenten. Alle Inhalte sind reiner Text in React-Knoten - kein
 * dangerouslySetInnerHTML, kein Markdown, keine Links aus dem Antworttext. Jede Frage ist
 * eine zugeklappte Zeile mit Kurzinfo; darin lassen sich Staerken, Verbesserungen und
 * Formulierungen einzeln oeffnen, damit die Ansicht nicht zur langen Seite wird.
 */
export function KiFeedbackAnzeige({ antwort, fragenTexte, aktuelleRef, onZurueck, onFertig }: KiFeedbackAnzeigeProps) {
  return (
    <>
      <div className={styles.body}>
        <p className={styles.feedbackHinweis}>
          KI-generiert, ungeprüft – das ist kein Ergebnis dieser App und fließt nicht in die Kennzahlen ein.
        </p>
        {antwort.ref === null && (
          <p className={styles.hinweis}>
            Keine REF in der Antwort – ob sie zu dieser Auswertung gehört, lässt sich nicht prüfen.
          </p>
        )}
        {antwort.ref !== null && antwort.ref !== aktuelleRef && (
          <p className={styles.warnung}>
            Die REF der Antwort ({antwort.ref}) passt nicht zu dieser Auswertung ({aktuelleRef}). Sie wird trotzdem
            angezeigt.
          </p>
        )}

        {antwort.fragen.map((frage, position) => (
          <details key={position} className={styles.frage}>
            <summary className={styles.frageKopf}>
              <span className={styles.frageNr}>Frage {frage.nr}</span>
              <span className={styles.frageText}>{fragenTexte[frage.nr - 1]}</span>
              <span className={styles.chips}>
                {frage.staerken.length > 0 && (
                  <span className={styles.chip}>{zaehle(frage.staerken.length, 'Stärke', 'Stärken')}</span>
                )}
                {frage.verbesserungen.length > 0 && (
                  <span className={styles.chip}>{zaehle(frage.verbesserungen.length, 'Verbesserung', 'Verbesserungen')}</span>
                )}
                {frage.formulierungen.length > 0 && (
                  <span className={styles.chip}>{zaehle(frage.formulierungen.length, 'Formulierung', 'Formulierungen')}</span>
                )}
              </span>
            </summary>

            <div className={styles.frageInhalt}>
              {frage.gesamteindruck && <p className={styles.gesamteindruck}>{frage.gesamteindruck}</p>}

              {frage.staerken.length > 0 && (
                <details className={styles.karte}>
                  <summary>Stärken ({frage.staerken.length})</summary>
                  <ul>
                    {frage.staerken.map((eintrag, index) => (
                      <li key={index}>{eintrag}</li>
                    ))}
                  </ul>
                </details>
              )}

              {frage.verbesserungen.length > 0 && (
                <details className={styles.karte}>
                  <summary>Verbesserungen ({frage.verbesserungen.length})</summary>
                  <ul>
                    {frage.verbesserungen.map((eintrag, index) => (
                      <li key={index}>{eintrag}</li>
                    ))}
                  </ul>
                </details>
              )}

              {frage.formulierungen.length > 0 && (
                <details className={styles.karte}>
                  <summary>Statt … lieber … ({frage.formulierungen.length})</summary>
                  <ul>
                    {frage.formulierungen.map((eintrag, index) => (
                      <li key={index}>
                        <span className={styles.statt}>{eintrag.statt}</span> →{' '}
                        <span className={styles.besser}>{eintrag.besser}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </details>
        ))}

        {antwort.naechsteSchritte.length > 0 && (
          <details className={styles.karte}>
            <summary>Nächste Schritte ({antwort.naechsteSchritte.length})</summary>
            <ul>
              {antwort.naechsteSchritte.map((eintrag, index) => (
                <li key={index}>{eintrag}</li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.sekundaer} onClick={onZurueck}>
          Zurück zur Antwort
        </button>
        <button type="button" className={styles.primaer} onClick={onFertig}>
          Fertig
        </button>
      </div>
    </>
  )
}
