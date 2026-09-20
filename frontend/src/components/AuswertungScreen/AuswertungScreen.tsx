import { useMemo, useState } from 'react'
import type { FragenErgebnis } from '../../domain/interview'
import { berechneAuswertung } from '../../domain/score'
import { FrageAuswertung } from '../FrageAuswertung/FrageAuswertung'
import styles from './AuswertungScreen.module.scss'

interface AuswertungScreenProps {
  ergebnisse: FragenErgebnis[]
  onNochmalUeben: () => void
  onVerlaufAnsehen: () => void
}

export function AuswertungScreen({ ergebnisse, onNochmalUeben, onVerlaufAnsehen }: AuswertungScreenProps) {
  const [ausgewaehlterIndex, setAusgewaehlterIndex] = useState(0)

  const ausgewaehlteFrage = ergebnisse[ausgewaehlterIndex]

  const auswertung = useMemo(
    () => (ausgewaehlteFrage ? berechneAuswertung(ausgewaehlteFrage.ergebnisse) : null),
    [ausgewaehlteFrage],
  )

  if (!ausgewaehlteFrage || !auswertung) {
    return null
  }

  return (
    <div className={styles.wrapper}>
      <h1>Auswertung</h1>

      <div className={styles.tabs}>
        {ergebnisse.map((eintrag, index) => (
          <button
            key={eintrag.frage.id}
            type="button"
            className={index === ausgewaehlterIndex ? `${styles.tab} ${styles.tabActive}` : styles.tab}
            onClick={() => setAusgewaehlterIndex(index)}
          >
            Frage {index + 1}
          </button>
        ))}
      </div>

      <FrageAuswertung frageText={ausgewaehlteFrage.frage.text} auswertung={auswertung} />

      <div className={styles.transkript}>
        <strong>Transkript</strong>
        <p>Transkription ist deaktiviert.</p>
      </div>

      <div className={styles.buttons}>
        <button type="button" className={`${styles.button} ${styles.buttonPrimary}`} onClick={onNochmalUeben}>
          Nochmal üben
        </button>
        <button type="button" className={`${styles.button} ${styles.buttonSecondary}`} onClick={onVerlaufAnsehen}>
          Verlauf ansehen
        </button>
      </div>
    </div>
  )
}
