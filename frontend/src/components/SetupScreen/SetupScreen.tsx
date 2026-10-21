import { useEffect, useState } from 'react'
import { getBerufe, getFragen, type Schwierigkeit } from '../../domain/fragenkatalog'
import { MODUS_OPTIONEN, type Modus, type SessionConfig } from '../../domain/session'
import { KameraVorschau } from '../KameraVorschau/KameraVorschau'
import styles from './SetupScreen.module.scss'

const SCHWIERIGKEITEN: Schwierigkeit[] = ['leicht', 'mittel', 'hart']

interface SetupScreenProps {
  onStart: (config: SessionConfig) => void
}

export function SetupScreen({ onStart }: SetupScreenProps) {
  const [berufe, setBerufe] = useState<string[] | null>(null)
  const [berufeFehler, setBerufeFehler] = useState(false)
  const [beruf, setBeruf] = useState<string | null>(null)
  const [schwierigkeit, setSchwierigkeit] = useState<Schwierigkeit>('mittel')
  const [modus, setModus] = useState<Modus>('video-ton')
  const [fragenAnzahl, setFragenAnzahl] = useState<number | null>(null)

  useEffect(() => {
    let aktuell = true

    getBerufe()
      .then((liste) => {
        if (aktuell) {
          setBerufe(liste)
          setBeruf((aktuelle) => aktuelle ?? liste[0] ?? null)
        }
      })
      .catch(() => {
        if (aktuell) {
          setBerufeFehler(true)
        }
      })

    return () => {
      aktuell = false
    }
  }, [])

  useEffect(() => {
    if (beruf === null) {
      return
    }

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
  const startGesperrt = beruf === null || keineFragenVerfuegbar
  const fragenStatusText =
    beruf === null
      ? ''
      : fragenAnzahl === null
        ? 'Prüfe verfügbare Fragen...'
        : keineFragenVerfuegbar
          ? 'Keine Fragen für diese Auswahl verfügbar.'
          : `${fragenAnzahl} Fragen verfügbar.`

  return (
    <div className={styles.wrapper}>
      <h1>Neue Übungssession</h1>
      <p className={styles.description}>
        Die Analyse läuft vollständig in diesem Browser. Es wird kein Video und kein Ton aufgezeichnet oder gesendet.
      </p>

      <div className={styles.columns}>
        <div className={styles.card}>
          <div>
            <span className={styles.label}>Beruf oder Rolle</span>
            {berufeFehler && (
              <p role="alert" className={styles.fehler}>
                Berufe konnten nicht geladen werden. Läuft das Backend?
              </p>
            )}
            {!berufeFehler && berufe === null && <p className={styles.hinweis}>Lade Berufe...</p>}
            <div className={styles.karteListe}>
              {(berufe ?? []).map((name) => (
                <button
                  key={name}
                  type="button"
                  aria-pressed={name === beruf}
                  className={styles.karte}
                  onClick={() => setBeruf(name)}
                >
                  {name}
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
                  className={styles.pill}
                  onClick={() => setSchwierigkeit(stufe)}
                >
                  {stufe}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className={styles.label}>Modus</span>
            <div className={styles.karteListe}>
              {MODUS_OPTIONEN.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={option.value === modus}
                  className={styles.karte}
                  onClick={() => setModus(option.value)}
                >
                  <span className={styles.karteTitel}>{option.titel}</span>
                  <span className={styles.karteUntertitel}>{option.untertitel}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <KameraVorschau deaktiviert={modus !== 'video-ton'} />
          <div className={styles.startBereich}>
            <p className={styles.fragenStatus}>
              {fragenStatusText}
            </p>
            <button
              type="button"
              className={styles.startButton}
              disabled={startGesperrt}
              onClick={() => beruf !== null && onStart({ beruf, schwierigkeit, modus })}
            >
              Interview starten
            </button>
          </div>
        </div>
      </div>

      <p className={styles.privacyNote}>
        Die Kamera ist aus, bis Sie die Vorschau einschalten oder die Session starten, das Mikrofon erst mit dem
        Interview. Der Verlauf wird nur gespeichert, wenn Sie ihn aktivieren, und ist jederzeit löschbar.
      </p>
    </div>
  )
}
