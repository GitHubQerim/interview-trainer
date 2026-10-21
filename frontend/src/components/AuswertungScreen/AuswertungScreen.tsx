import { useMemo, useState } from 'react'
import type { FragenErgebnis } from '../../domain/interview'
import { ergaenzeRedefluss } from '../../domain/redefluss'
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
    () =>
      ausgewaehlteFrage
        ? ergaenzeRedefluss(
            berechneAuswertung(ausgewaehlteFrage.ergebnisse),
            ausgewaehlteFrage.audioErgebnisse,
            ausgewaehlteFrage.transkript,
          )
        : null,
    [ausgewaehlteFrage],
  )

  if (!ausgewaehlteFrage || !auswertung) {
    return null
  }

  return (
    <div className={styles.wrapper}>
      <h1>Auswertung</h1>
      <p className={styles.hinweis}>
        Die Zielbereiche sind Orientierungswerte aus eigenen Tests, nicht wissenschaftlich validiert. Das hier ist eine
        Trainingshilfe und keine Bewertung deiner Eignung.
      </p>

      <div className={styles.tabs}>
        {ergebnisse.map((eintrag, index) => (
          <button
            key={eintrag.frage.id}
            type="button"
            aria-pressed={index === ausgewaehlterIndex}
            className={styles.tab}
            onClick={() => setAusgewaehlterIndex(index)}
          >
            Frage {index + 1}
          </button>
        ))}
      </div>

      <FrageAuswertung frageText={ausgewaehlteFrage.frage.text} auswertung={auswertung} />

      <div className={styles.buttons}>
        <button type="button" className={styles.buttonPrimary} onClick={onNochmalUeben}>
          Nochmal üben
        </button>
        <button type="button" className={styles.buttonSecondary} onClick={onVerlaufAnsehen}>
          Verlauf ansehen
        </button>
      </div>
    </div>
  )
}
