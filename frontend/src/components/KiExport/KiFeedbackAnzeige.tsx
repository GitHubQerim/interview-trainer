import type { KiAntwort } from '../../domain/kiAntwort'
import styles from './KiExport.module.scss'

interface KiFeedbackAnzeigeProps {
  antwort: KiAntwort
  // Fragetexte in der Reihenfolge der Auswertung, damit zu jeder Rueckmeldung die Frage steht.
  fragenTexte: string[]
}

/**
 * Zeigt die eingelesene KI-Antwort. Alle Inhalte sind reiner Text in React-Knoten - kein
 * dangerouslySetInnerHTML, kein Markdown, keine Links aus dem Antworttext.
 */
export function KiFeedbackAnzeige({ antwort, fragenTexte }: KiFeedbackAnzeigeProps) {
  return (
    <div className={styles.feedback}>
      <p className={styles.feedbackHinweis}>
        KI-generiert, ungeprüft – das ist kein Ergebnis dieser App und fließt nicht in die Kennzahlen ein.
      </p>

      {antwort.fragen.map((frage, position) => (
        <section key={position} className={styles.feedbackFrage}>
          <h3 className={styles.feedbackTitel}>Frage {frage.nr}</h3>
          {fragenTexte[frage.nr - 1] && <p className={styles.feedbackFragetext}>{fragenTexte[frage.nr - 1]}</p>}

          {frage.staerken.length > 0 && (
            <>
              <h4 className={styles.feedbackUnterTitel}>Stärken</h4>
              <ul>
                {frage.staerken.map((eintrag, index) => (
                  <li key={index}>{eintrag}</li>
                ))}
              </ul>
            </>
          )}

          {frage.verbesserungen.length > 0 && (
            <>
              <h4 className={styles.feedbackUnterTitel}>Verbesserungen</h4>
              <ul>
                {frage.verbesserungen.map((eintrag, index) => (
                  <li key={index}>{eintrag}</li>
                ))}
              </ul>
            </>
          )}

          {frage.formulierungen.length > 0 && (
            <>
              <h4 className={styles.feedbackUnterTitel}>Statt … lieber …</h4>
              <ul>
                {frage.formulierungen.map((eintrag, index) => (
                  <li key={index}>
                    <span className={styles.statt}>{eintrag.statt}</span> → <span className={styles.besser}>{eintrag.besser}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {frage.gesamteindruck && <p className={styles.gesamteindruck}>{frage.gesamteindruck}</p>}
        </section>
      ))}

      {antwort.naechsteSchritte.length > 0 && (
        <section className={styles.feedbackFrage}>
          <h3 className={styles.feedbackTitel}>Nächste Schritte</h3>
          <ul>
            {antwort.naechsteSchritte.map((eintrag, index) => (
              <li key={index}>{eintrag}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
