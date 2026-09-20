import { useEffect, useState } from 'react'
import { getFragen, type Schwierigkeit } from '../../domain/fragenkatalog'
import { MODUS_OPTIONEN, type Modus, type SessionConfig } from '../../domain/session'
import styles from './SetupScreen.module.scss'

const BERUF_VORSCHLAEGE = ['Softwareentwicklung', 'Vertrieb', 'Pflege', 'Projektmanagement']
const SCHWIERIGKEITEN: Schwierigkeit[] = ['leicht', 'mittel', 'hart']

interface SetupScreenProps {
  onStart: (config: SessionConfig) => void
}

export function SetupScreen({ onStart }: SetupScreenProps) {
  const [beruf, setBeruf] = useState('Softwareentwicklung')
  const [schwierigkeit, setSchwierigkeit] = useState<Schwierigkeit>('mittel')
  const [modus, setModus] = useState<Modus>('video-ton')
  const [fragenAnzahl, setFragenAnzahl] = useState<number | null>(null)

  useEffect(() => {
    let aktuell = true

    getFragen(beruf, schwierigkeit)
      .then((fragen) => {
        if (aktuell) {
          setFragenAnzahl(fragen.length)
        }
      })
      .catch(() => {
        if (aktuell) {
          setFragenAnzahl(0)
        }
      })

    return () => {
      aktuell = false
    }
  }, [beruf, schwierigkeit])

  const keineFragenVerfuegbar = fragenAnzahl === 0

  return (
    <div className={styles.wrapper}>
      <h1>Neue Übungssession</h1>
      <p className={styles.description}>
        Die Analyse läuft vollständig in diesem Browser. Es wird kein Video und kein Ton aufgezeichnet oder gesendet.
      </p>

      <div className={styles.columns}>
        <div className={styles.card}>
          <div>
            <label className={styles.label} htmlFor="beruf">
              Beruf oder Rolle
            </label>
            <input
              id="beruf"
              className={styles.input}
              value={beruf}
              onChange={(event) => setBeruf(event.target.value)}
            />
            <div className={styles.chipRow}>
              {BERUF_VORSCHLAEGE.map((vorschlag) => (
                <button key={vorschlag} type="button" className={styles.chip} onClick={() => setBeruf(vorschlag)}>
                  {vorschlag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className={styles.label}>Schwierigkeit</span>
            <div className={styles.pillRow}>
              {SCHWIERIGKEITEN.map((stufe) => (
                <button
                  key={stufe}
                  type="button"
                  aria-pressed={stufe === schwierigkeit}
                  className={stufe === schwierigkeit ? `${styles.pill} ${styles.pillActive}` : styles.pill}
                  onClick={() => setSchwierigkeit(stufe)}
                >
                  {stufe}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className={styles.label}>Modus</span>
            <div className={styles.modusRow}>
              {MODUS_OPTIONEN.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={option.value === modus}
                  className={
                    option.value === modus ? `${styles.modusCard} ${styles.modusCardActive}` : styles.modusCard
                  }
                  onClick={() => setModus(option.value)}
                >
                  <span className={styles.modusTitle}>{option.titel}</span>
                  <span className={styles.modusSubtitle}>{option.untertitel}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.videoPlaceholder}>Kameravorschau</div>
          <p className={styles.caption}>Kopf und Schultern im Rahmen halten.</p>
          <p className={styles.fragenStatus}>
            {fragenAnzahl === null
              ? 'Prüfe verfügbare Fragen...'
              : keineFragenVerfuegbar
                ? 'Keine Fragen für diese Auswahl verfügbar.'
                : `${fragenAnzahl} Fragen verfügbar.`}
          </p>
          <button
            type="button"
            className={styles.startButton}
            disabled={keineFragenVerfuegbar}
            onClick={() => onStart({ beruf, schwierigkeit, modus })}
          >
            Interview starten
          </button>
        </div>
      </div>

      <p className={styles.privacyNote}>
        Kamera und Mikrofon sind aus, bis Sie die Session starten. Der Verlauf wird nur gespeichert, wenn Sie ihn
        aktivieren, und ist jederzeit löschbar.
      </p>
    </div>
  )
}
