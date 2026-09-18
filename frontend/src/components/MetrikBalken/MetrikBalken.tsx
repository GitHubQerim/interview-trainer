import styles from './MetrikBalken.module.scss'

interface MetrikBalkenProps {
  label: string
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
    <div className={styles.wrapper}>
      <div className={styles.kopfzeile}>
        <span className={styles.label}>{label}</span>
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

      <span className={styles.status}>{statusText}</span>

      <details className={styles.details}>
        <summary>So wurde das gemessen</summary>
        <p>{messmethode}</p>
      </details>
    </div>
  )
}
