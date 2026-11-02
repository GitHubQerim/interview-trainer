import { useEffect, useState } from 'react'
import { ladeVerlauf, type SessionVerlaufEintrag } from '../../domain/verlaufApi'
import { MODUS_OPTIONEN } from '../../domain/session'
import { FrageAuswertung } from '../FrageAuswertung/FrageAuswertung'
import styles from './VerlaufScreen.module.scss'

interface VerlaufScreenProps {
  onZurueck: () => void
}

function formatDatum(erstelltAm: string): string {
  return new Date(erstelltAm).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })
}

function modusTitel(modus: string): string {
  return MODUS_OPTIONEN.find((option) => option.value === modus)?.titel ?? modus
}

export function VerlaufScreen({ onZurueck }: VerlaufScreenProps) {
  const [sessions, setSessions] = useState<SessionVerlaufEintrag[] | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [ausgewaehlterSessionIndex, setAusgewaehlterSessionIndex] = useState(0)
  const [ausgewaehlterFrageIndex, setAusgewaehlterFrageIndex] = useState(0)

  useEffect(() => {
    let aktuell = true

    ladeVerlauf()
      .then((geladen) => {
        if (aktuell) {
          setSessions([...geladen].reverse())
        }
      })
      .catch((error: unknown) => {
        if (aktuell) {
          setFehler(error instanceof Error ? error.message : 'Verlauf konnte nicht geladen werden.')
        }
      })

    return () => {
      aktuell = false
    }
  }, [])

  function handleSessionWechsel(index: number) {
    setAusgewaehlterSessionIndex(index)
    setAusgewaehlterFrageIndex(0)
  }

  const ausgewaehlteSession = sessions?.[ausgewaehlterSessionIndex] ?? null
  const ausgewaehlteFrage = ausgewaehlteSession?.ergebnisse[ausgewaehlterFrageIndex] ?? null

  return (
    <div className={styles.wrapper}>
      <h1>Verlauf</h1>

      {sessions === null && !fehler && <p>Verlauf wird geladen...</p>}
      {fehler && <p className={styles.hinweis}>{fehler}</p>}
      {sessions !== null && sessions.length === 0 && <p>Noch keine gespeicherten Übungssessions.</p>}

      {ausgewaehlteSession && (
        <>
          <div className={styles.tabs}>
            {sessions?.map((session, index) => (
              <button
                key={session.id}
                type="button"
                aria-pressed={index === ausgewaehlterSessionIndex}
                className={styles.tab}
                onClick={() => handleSessionWechsel(index)}
              >
                Session {index + 1}
              </button>
            ))}
          </div>

          <p className={styles.sessionInfo}>
            {ausgewaehlteSession.beruf} · {ausgewaehlteSession.schwierigkeit} ·{' '}
            {modusTitel(ausgewaehlteSession.modus)} · {formatDatum(ausgewaehlteSession.erstelltAm)}
          </p>

          {ausgewaehlteFrage && (
            <>
              <div className={styles.tabs}>
                {ausgewaehlteSession.ergebnisse.map((eintrag, index) => (
                  <button
                    key={eintrag.frageId}
                    type="button"
                    aria-pressed={index === ausgewaehlterFrageIndex}
                    className={styles.tab}
                    onClick={() => setAusgewaehlterFrageIndex(index)}
                  >
                    Frage {index + 1}
                  </button>
                ))}
              </div>

              <FrageAuswertung frageText={ausgewaehlteFrage.frageText} auswertung={ausgewaehlteFrage} />
            </>
          )}
        </>
      )}

      <div className={styles.buttons}>
        <button type="button" className={styles.buttonSecondary} onClick={onZurueck}>
          Zurück
        </button>
      </div>
    </div>
  )
}
