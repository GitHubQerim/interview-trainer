import { useAnalysisWorker } from '../../media/useAnalysisWorker'
import styles from './AnalysisSpike.module.scss'

const THROTTLE_OPTIONS_MS = [120, 60, 33]

const STATUS_LABEL: Record<string, string> = {
  idle: 'Bereit',
  'requesting-permission': 'Warte auf Kamera-Freigabe...',
  'permission-denied': 'Kamera-Zugriff verweigert',
  'loading-model': 'Lade Modelle...',
  ready: 'Bereit, Analyse laeuft',
  error: 'Fehler',
}

export function AnalysisSpike() {
  const {
    status,
    error,
    latestResult,
    latestDurationMs,
    processingRate,
    throttleMs,
    setThrottleMs,
    videoRef,
    start,
  } = useAnalysisWorker()

  return (
    <div className={styles.wrapper}>
      <button type="button" className={styles.button} onClick={() => void start()}>
        Kamera aktivieren
      </button>

      <div className={styles.throttleGroup}>
        {THROTTLE_OPTIONS_MS.map((option) => (
          <button
            key={option}
            type="button"
            className={option === throttleMs ? `${styles.throttleOption} ${styles.throttleOptionActive}` : styles.throttleOption}
            onClick={() => setThrottleMs(option)}
          >
            {option} ms
          </button>
        ))}
      </div>

      <video ref={videoRef} className={styles.video} muted playsInline />

      <p className={styles.status}>{STATUS_LABEL[status]}</p>
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.metrics}>
        <span>Gesicht: {latestResult?.faceLandmarkCount ?? 0} Punkte</span>
        <span>Pose: {latestResult?.poseLandmarkCount ?? 0} Punkte</span>
        <span>Verarbeitungsrate: {processingRate.toFixed(1)} fps</span>
        <span>Dauer pro Frame: {latestDurationMs?.toFixed(1) ?? '–'} ms</span>
      </div>
    </div>
  )
}
