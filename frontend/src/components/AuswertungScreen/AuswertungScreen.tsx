import { useMemo, useState } from 'react'
import type { FragenErgebnis } from '../../domain/interview'
import {
  BEWEGUNGSRUHE_ZIELKORRIDOR,
  berechneAuswertung,
  HALTUNG_ZIELKORRIDOR,
  haltungsVerlaufLabel,
  istImZielkorridor,
  KOPFAUSRICHTUNG_ZIELKORRIDOR,
} from '../../domain/score'
import { MetrikBalken } from '../MetrikBalken/MetrikBalken'
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

      <div className={styles.card}>
        <p className={styles.frageText}>{ausgewaehlteFrage.frage.text}</p>

        {!auswertung.auswertbar ? (
          <p className={styles.hinweis}>
            Aufnahme zu lückenhaft für eine Auswertung (nur {Math.round(auswertung.abdeckung * 100)}% der Bilder
            auswertbar).
          </p>
        ) : (
          <>
            {auswertung.kopfausrichtungProzent !== null && (
              <MetrikBalken
                label="Kopfausrichtung (%)"
                wert={auswertung.kopfausrichtungProzent}
                einheit="%"
                anzeigeMin={0}
                anzeigeMax={100}
                zielkorridorMin={KOPFAUSRICHTUNG_ZIELKORRIDOR.min}
                zielkorridorMax={KOPFAUSRICHTUNG_ZIELKORRIDOR.max}
                imZielkorridor={istImZielkorridor('kopfausrichtung', auswertung.kopfausrichtungProzent)}
                formatWert={(wert) => `${Math.round(wert)}%`}
                messmethode="Anteil der Zeit, in der der Kopf laut Position der Nasenspitze zur Kamera ausgerichtet war - misst die Kopfhaltung, nicht die tatsächliche Blickrichtung (kein Iris-Tracking). Zielkorridor aus allgemeiner Ratgeberliteratur, nicht empirisch validiert."
              />
            )}

            {auswertung.haltungGradMedian !== null && (
              <>
                <MetrikBalken
                  label="Aufrechte Haltung (°)"
                  wert={auswertung.haltungGradMedian}
                  einheit="°"
                  anzeigeMin={0}
                  anzeigeMax={20}
                  zielkorridorMin={HALTUNG_ZIELKORRIDOR.min}
                  zielkorridorMax={HALTUNG_ZIELKORRIDOR.max}
                  imZielkorridor={istImZielkorridor('haltung', auswertung.haltungGradMedian)}
                  formatWert={(wert) => `${wert.toFixed(1)}°`}
                  messmethode="Neigung der Schulterlinie zur Horizontalen, als Median über die gesamte Antwort (robuster gegen einzelne Ausreißer als ein Durchschnitt). Bewusst ohne die Hüfte berechnet – bei typischer Webcam-Framing ist die Hüfte oft nicht im Bild und wird von der Erkennung eher geschätzt als getrackt. Zielkorridor aus allgemeiner Ratgeberliteratur, nicht empirisch validiert."
                />
                <p className={styles.verlaufText}>
                  Verlauf über die Antwort: {haltungsVerlaufLabel(auswertung.haltungVerlauf)}
                </p>
              </>
            )}

            {auswertung.bewegungsruhe !== null && (
              <MetrikBalken
                label="Bewegungsruhe"
                wert={auswertung.bewegungsruhe}
                anzeigeMin={0}
                anzeigeMax={1}
                zielkorridorMin={BEWEGUNGSRUHE_ZIELKORRIDOR.min}
                zielkorridorMax={BEWEGUNGSRUHE_ZIELKORRIDOR.max}
                imZielkorridor={istImZielkorridor('bewegungsruhe', auswertung.bewegungsruhe)}
                formatWert={(wert) => wert.toFixed(2)}
                messmethode="Bewegung des Schulter-Mittelpunkts zwischen aufeinanderfolgenden Aufnahmen, normiert auf die Schulterbreite (unabhängig vom Kameraabstand) und auf Sekunden (unabhängig von der Framerate) - ein normierter Index ohne Einheit, kein Prozent- oder Gradwert. Zielkorridor aus dem Klickdummy übernommen, nicht empirisch validiert."
              />
            )}
          </>
        )}
      </div>

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
