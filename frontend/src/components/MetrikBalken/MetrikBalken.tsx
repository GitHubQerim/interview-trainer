import type { ReactNode } from 'react'
import styles from './MetrikBalken.module.scss'

interface MetrikBalkenProps {
  label: string
  // Kurze Lesehilfe unter dem Titel, z.B. wenn ein hoeherer Wert etwas Unerwartetes bedeutet.
  untertitel?: string
  // Weitere Zeilen zur selben Kennzahl (Verlauf, Pause, Fuellwoerter), gehoeren in die Karte.
  zusatz?: ReactNode
  wert: number
  einheit?: string
  anzeigeMin: number
  anzeigeMax: number
  zielkorridorMin: number
  zielkorridorMax: number
  imZielkorridor: boolean
  formatWert?: (wert: number) => string
  messmethode: string
}

function prozentAufSkala(wert: number, min: number, max: number): number {
  const anteil = ((wert - min) / (max - min)) * 100
  return Math.min(100, Math.max(0, anteil))
}

export function MetrikBalken({
  label,
  untertitel,
  zusatz,
  wert,
  einheit = '',
  anzeigeMin,
  anzeigeMax,
  zielkorridorMin,
  zielkorridorMax,
  imZielkorridor,
  formatWert,
  messmethode,
}: MetrikBalkenProps) {
  const wertText = formatWert ? formatWert(wert) : `${wert}${einheit}`
  const korridorLinks = prozentAufSkala(zielkorridorMin, anzeigeMin, anzeigeMax)
  const korridorRechts = prozentAufSkala(zielkorridorMax, anzeigeMin, anzeigeMax)
  const markerPosition = prozentAufSkala(wert, anzeigeMin, anzeigeMax)
  const statusText = imZielkorridor ? 'im Zielbereich' : 'außerhalb'

  return (
    <div className={imZielkorridor ? styles.karte : `${styles.karte} ${styles.karteAusserhalb}`}>
      <div className={styles.kopfzeile}>
        <div className={styles.titel}>
          <span className={styles.label}>{label}</span>
          {untertitel && <span className={styles.untertitel}>{untertitel}</span>}
        </div>
        <span className={imZielkorridor ? `${styles.wert} ${styles.wertImZielkorridor}` : `${styles.wert} ${styles.wertAusserhalb}`}>
          {wertText}
        </span>
      </div>

      <div className={styles.track}>
        <div
          className={styles.korridor}
          style={{ left: `${korridorLinks}%`, width: `${korridorRechts - korridorLinks}%` }}
        />
        <div
          className={imZielkorridor ? `${styles.marker} ${styles.markerImZielkorridor}` : `${styles.marker} ${styles.markerAusserhalb}`}
          style={{ left: `${markerPosition}%` }}
        />
      </div>

      <div className={styles.skala}>
        <span>
          {anzeigeMin}
          {einheit}
        </span>
        <span>
          Zielkorridor {zielkorridorMin}–{zielkorridorMax}
          {einheit}
        </span>
        <span>
          {anzeigeMax}
          {einheit}
        </span>
      </div>

      <span className={imZielkorridor ? `${styles.status} ${styles.statusOk}` : `${styles.status} ${styles.statusAchtung}`}>
        {statusText}
      </span>

      {zusatz}

      <details className={styles.details}>
        <summary>So wurde das gemessen</summary>
        <p>{messmethode}</p>
      </details>
    </div>
  )
}
