import type { Auswertung } from '../../domain/score'
import {
  BEWEGUNGSRUHE_ZIELKORRIDOR,
  HALTUNG_ZIELKORRIDOR,
  haltungsVerlaufLabel,
  istImZielkorridor,
  KOPFAUSRICHTUNG_ZIELKORRIDOR,
  REDEFLUSS_ZIELKORRIDOR,
} from '../../domain/score'
import { MetrikBalken } from '../MetrikBalken/MetrikBalken'
import styles from './FrageAuswertung.module.scss'

interface FrageAuswertungProps {
  frageText: string
  auswertung: Auswertung
}

export function FrageAuswertung({ frageText, auswertung }: FrageAuswertungProps) {
  return (
    <div className={styles.card}>
      <p className={styles.frageText}>{frageText}</p>

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

      {/* Unabhaengig von auswertung.auswertbar (das gilt nur fuer die Video-Metriken) -
          Redefluss stammt aus Audio-Frames und kann auch bei lueckenhafter Videoaufnahme
          vorliegen, oder umgekehrt fehlen, wenn kein Mikrofonzugriff bestand. */}
      {auswertung.redeflussProzent === null ? (
        <p className={styles.hinweis}>Keine Redefluss-Daten (Mikrofon nicht verfügbar oder kein Sprechen erkannt).</p>
      ) : (
        <>
          <MetrikBalken
            label="Redefluss (%)"
            wert={auswertung.redeflussProzent}
            einheit="%"
            anzeigeMin={0}
            anzeigeMax={100}
            zielkorridorMin={REDEFLUSS_ZIELKORRIDOR.min}
            zielkorridorMax={REDEFLUSS_ZIELKORRIDOR.max}
            imZielkorridor={istImZielkorridor('redefluss', auswertung.redeflussProzent)}
            formatWert={(wert) => `${Math.round(wert)}%`}
            messmethode="Anteil der Sprechzeit innerhalb der eigentlichen Antwort (Vorlese-/Bedenkzeit am Anfang und Ende ausgeklammert), gemessen über die Mikrofon-Lautstärke - keine Spracherkennung nötig. Zielkorridor eigene Einschätzung, nicht empirisch validiert."
          />
          {auswertung.laengstePauseSekunden !== null && (
            <p className={styles.verlaufText}>
              Längste Pause in der Antwort: {auswertung.laengstePauseSekunden.toFixed(1)}s
            </p>
          )}
          <p className={styles.verlaufText}>
            {auswertung.fuellwoerterProMinute !== null
              ? `Füllwörter: ${auswertung.fuellwoerterProMinute.toFixed(1)} pro Minute Sprechzeit`
              : 'Füllwort-Erkennung: keine Daten (nicht aktiviert oder zu kurz gesprochen).'}
          </p>
        </>
      )}
    </div>
  )
}
