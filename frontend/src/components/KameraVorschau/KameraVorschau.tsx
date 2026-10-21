import { useEffect, useMemo, useRef, useState } from 'react'
import { bewerteKameraSetup, type HinweisStatus } from '../../domain/kameraSetup'
import { useAnalysisWorker, type AnalysisResultPayload } from '../../media/useAnalysisWorker'
import styles from './KameraVorschau.module.scss'
import { zeichneOverlay } from './zeichneOverlay'

const SPIEGELN_SCHLUESSEL = 'interview-trainer.vorschau-spiegeln'
const STANDARD_SEITENVERHAELTNIS = '16 / 9'

const STATUS_LABEL: Record<HinweisStatus, string> = {
  ok: 'OK',
  achtung: 'Achtung:',
  unbekannt: '…',
}

// localStorage nur als Komfort pro Browser: blockiert (privates Fenster, gesperrte
// Website-Daten) faellt es still auf den Standard "gespiegelt" zurueck.
function ladeSpiegeln(): boolean {
  try {
    return window.localStorage.getItem(SPIEGELN_SCHLUESSEL) !== 'false'
  } catch {
    return true
  }
}

function speichereSpiegeln(wert: boolean): void {
  try {
    window.localStorage.setItem(SPIEGELN_SCHLUESSEL, String(wert))
  } catch {
    // Einstellung gilt dann nur fuer diese Sitzung.
  }
}

interface KameraVorschauProps {
  deaktiviert: boolean
}

export function KameraVorschau({ deaktiviert }: KameraVorschauProps) {
  const [an, setAn] = useState(false)
  const [spiegeln, setSpiegeln] = useState(ladeSpiegeln)
  const [ergebnis, setErgebnis] = useState<AnalysisResultPayload | null>(null)
  const [seitenverhaeltnis, setSeitenverhaeltnis] = useState(STANDARD_SEITENVERHAELTNIS)
  const [vorherDeaktiviert, setVorherDeaktiviert] = useState(deaktiviert)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Mikrofon bleibt in der Vorschau aus: nur Kamera, nichts wird aufgezeichnet.
  const { status, error, videoRef, start, stop } = useAnalysisWorker(setErgebnis, { mitTon: false })

  if (deaktiviert !== vorherDeaktiviert) {
    setVorherDeaktiviert(deaktiviert)
    if (deaktiviert) {
      setAn(false)
      setErgebnis(null)
    }
  }

  useEffect(() => {
    if (deaktiviert) {
      stop()
    }
  }, [deaktiviert, stop])

  const hinweise = useMemo(
    () => (ergebnis ? bewerteKameraSetup(ergebnis.faceLandmarks, ergebnis.poseLandmarks) : []),
    [ergebnis],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas) {
      return
    }
    canvas.width = video?.videoWidth || 640
    canvas.height = video?.videoHeight || 360
    const ctx = canvas.getContext('2d')
    if (ctx) {
      zeichneOverlay(ctx, canvas.width, canvas.height, an ? ergebnis : null, hinweise)
    }
  }, [an, ergebnis, hinweise, videoRef])

  function umschalten() {
    if (an) {
      stop()
      setAn(false)
      setErgebnis(null)
      return
    }
    setAn(true)
    void start()
  }

  function umschaltenSpiegeln(wert: boolean) {
    setSpiegeln(wert)
    speichereSpiegeln(wert)
  }

  const verweigert = an && status === 'permission-denied'
  const fehler = an && status === 'error'
  const wirdVorbereitet = an && (status === 'requesting-permission' || status === 'loading-model')

  return (
    <div className={styles.root}>
      <div
        className={styles.buehne}
        data-testid="vorschau-buehne"
        data-gespiegelt={spiegeln}
        style={{ aspectRatio: seitenverhaeltnis }}
      >
        <div className={spiegeln ? `${styles.medien} ${styles.gespiegelt}` : styles.medien}>
          <video
            ref={videoRef}
            className={styles.video}
            muted
            playsInline
            aria-label="Kameravorschau"
            onLoadedMetadata={(event) => {
              const { videoWidth, videoHeight } = event.currentTarget
              if (videoWidth > 0 && videoHeight > 0) {
                setSeitenverhaeltnis(`${videoWidth} / ${videoHeight}`)
              }
            }}
          />
          <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
        </div>
        {!an && <div className={styles.platzhalter}>Kamera ist aus</div>}
      </div>

      <div className={styles.steuerung}>
        <button type="button" className={styles.kameraButton} disabled={deaktiviert} onClick={umschalten}>
          {an ? 'Kamera ausschalten' : 'Kamera einschalten'}
        </button>
        <label className={styles.spiegelLabel}>
          <input type="checkbox" checked={spiegeln} onChange={(event) => umschaltenSpiegeln(event.target.checked)} />
          Spiegelbild
        </label>
      </div>

      {deaktiviert && <p className={styles.info}>Die Vorschau gibt es nur im Modus „Video und Ton“.</p>}
      {verweigert && (
        <p role="alert" className={styles.fehler}>
          Kamera-Zugriff wurde verweigert. Erlaube die Kamera in den Browser-Einstellungen und versuche es erneut.
        </p>
      )}
      {fehler && (
        <p role="alert" className={styles.fehler}>
          {error ?? 'Die Analyse konnte nicht gestartet werden.'}
        </p>
      )}
      {wirdVorbereitet && <p className={styles.info}>Kamera und Modell werden vorbereitet…</p>}

      {an && status === 'ready' && hinweise.length === 0 && (
        <p className={styles.info}>Suche nach Kopf und Schultern…</p>
      )}

      {an && hinweise.length > 0 && (
        <ul className={styles.hinweise} aria-label="Hinweise zur Haltung">
          {hinweise.map((hinweis) => (
            <li key={hinweis.id} className={`${styles.hinweis} ${styles[hinweis.status]}`}>
              <span className={styles.statusLabel}>{STATUS_LABEL[hinweis.status]}</span>
              <span>{hinweis.text}</span>
              {hinweis.detail && <span className={styles.detail}>{hinweis.detail}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
