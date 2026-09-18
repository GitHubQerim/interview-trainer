import { useCallback, useEffect, useRef, useState } from 'react'
import { getFragen, type Frage } from '../../domain/fragenkatalog'
import type { FragenErgebnis } from '../../domain/interview'
import type { SessionConfig } from '../../domain/session'
import { formatZeit } from '../../domain/zeit'
import { berechneAuswertung, type Auswertung } from '../../domain/score'
import { useAnalysisWorker, type AnalysisResultPayload } from '../../media/useAnalysisWorker'
import { DebugOverlay } from './DebugOverlay'
import styles from './InterviewScreen.module.scss'

const FRAMERATE_FENSTER_MS = 2_000

const STANDARD_FRAGENDAUER_SEKUNDEN = 90

interface InterviewScreenProps {
  config: SessionConfig
  fragendauerSekunden?: number
  onFinished: (ergebnisse: FragenErgebnis[]) => void
}

export function InterviewScreen({
  config,
  fragendauerSekunden = STANDARD_FRAGENDAUER_SEKUNDEN,
  onFinished,
}: InterviewScreenProps) {
  const [fragen, setFragen] = useState<Frage[] | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  const currentIndexRef = useRef(0)
  useEffect(() => {
    currentIndexRef.current = currentIndex
  }, [currentIndex])
  const ergebnisseRef = useRef<FragenErgebnis['ergebnisse']>([])
  const alleErgebnisseRef = useRef<FragenErgebnis[]>([])

  // Debug-Overlay (Branch debug/live-overlay, vermutlich wieder entfernt).
  const [debugModus, setDebugModus] = useState(false)
  const [letztesErgebnis, setLetztesErgebnis] = useState<AnalysisResultPayload | null>(null)
  const [liveAuswertung, setLiveAuswertung] = useState<Auswertung | null>(null)
  const [framerate, setFramerate] = useState(0)
  const resultZeitstempelRef = useRef<number[]>([])

  const { status, error, videoRef, start } = useAnalysisWorker((result) => {
    ergebnisseRef.current = [
      ...ergebnisseRef.current,
      { zeitstempel: result.timestamp, faceLandmarks: result.faceLandmarks, poseLandmarks: result.poseLandmarks },
    ]

    setLetztesErgebnis(result)
    setLiveAuswertung(berechneAuswertung(ergebnisseRef.current))

    resultZeitstempelRef.current = [...resultZeitstempelRef.current, result.timestamp].filter(
      (zeitstempel) => zeitstempel >= result.timestamp - FRAMERATE_FENSTER_MS,
    )
    setFramerate(resultZeitstempelRef.current.length / (FRAMERATE_FENSTER_MS / 1000))
  })

  useEffect(() => {
    getFragen(config.beruf, config.schwierigkeit).then(setFragen)
  }, [config.beruf, config.schwierigkeit])

  useEffect(() => {
    if (config.modus === 'video-ton') {
      void start()
    }
  }, [config.modus, start])

  const advance = useCallback(
    (fragenListe: Frage[]) => {
      const aktuelleFrage = fragenListe[currentIndexRef.current]
      if (!aktuelleFrage) {
        return
      }

      alleErgebnisseRef.current = [
        ...alleErgebnisseRef.current,
        { frage: aktuelleFrage, ergebnisse: ergebnisseRef.current },
      ]
      ergebnisseRef.current = []
      setElapsed(0)

      if (currentIndexRef.current + 1 >= fragenListe.length) {
        onFinished(alleErgebnisseRef.current)
        return
      }

      currentIndexRef.current += 1
      setCurrentIndex(currentIndexRef.current)
    },
    [onFinished],
  )

  useEffect(() => {
    if (!fragen || fragen.length === 0) {
      return
    }

    const interval = window.setInterval(() => {
      setElapsed((sekunden) => sekunden + 1)
    }, 1000)

    return () => window.clearInterval(interval)
  }, [fragen, currentIndex])

  useEffect(() => {
    if (fragen && elapsed >= fragendauerSekunden) {
      advance(fragen)
    }
  }, [elapsed, fragendauerSekunden, fragen, advance])

  if (!fragen) {
    return <p>Fragen werden geladen...</p>
  }

  if (fragen.length === 0) {
    return <p>Keine Fragen für diese Auswahl verfügbar.</p>
  }

  const aktuelleFrage = fragen[currentIndex]
  if (!aktuelleFrage) {
    return null
  }

  return (
    <div className={styles.wrapper}>
      <h1>{config.beruf}</h1>
      <p className={styles.subtitle}>
        Antworten Sie laut und zusammenhängend. Während der Antwort wird bewusst keine Bewertung angezeigt.
      </p>

      <div className={styles.card}>
        <span className={styles.meta}>
          Frage {currentIndex + 1} von {fragen.length} · {config.schwierigkeit}
        </span>
        <p className={styles.frageText}>{aktuelleFrage.text}</p>

        {config.modus === 'video-ton' && (
          <div className={styles.videoBox} style={{ position: 'relative' }}>
            <video ref={videoRef} className={styles.video} muted playsInline />
            {debugModus && (
              <DebugOverlay
                videoElement={videoRef.current}
                letztesErgebnis={letztesErgebnis}
                liveAuswertung={liveAuswertung}
                framerate={framerate}
              />
            )}
          </div>
        )}

        {config.modus === 'video-ton' && (
          <label style={{ fontSize: 12, color: '#6f6f6a' }}>
            <input type="checkbox" checked={debugModus} onChange={(event) => setDebugModus(event.target.checked)} />{' '}
            Debug-Overlay anzeigen (nur zum Testen)
          </label>
        )}

        <div className={styles.footer}>
          <span className={styles.analyseStatus}>
            {config.modus === 'video-ton' && (
              <>
                <span className={styles.dot} />
                {status === 'ready' ? 'Analyse läuft lokal' : error ?? 'Analyse wird vorbereitet...'}
              </>
            )}
          </span>
          <span>{formatZeit(elapsed)}</span>
        </div>
      </div>

      <button type="button" className={styles.nextButton} onClick={() => advance(fragen)}>
        Nächste Frage
      </button>
    </div>
  )
}
