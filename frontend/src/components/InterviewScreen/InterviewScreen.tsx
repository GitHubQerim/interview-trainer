import { useCallback, useEffect, useRef, useState } from 'react'
import { getFragen, type Frage } from '../../domain/fragenkatalog'
import type { AudioFrameErgebnis, FragenErgebnis } from '../../domain/interview'
import type { SessionConfig } from '../../domain/session'
import { formatZeit } from '../../domain/zeit'
import { berechneAuswertung, type Auswertung } from '../../domain/score'
import { useAnalysisWorker, type AnalysisResultPayload } from '../../media/useAnalysisWorker'
import { useFuellwortErkennung } from '../../media/useFuellwortErkennung'
import { useRedeflussVad } from '../../media/useRedeflussVad'
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
  const [istImWechsel, setIstImWechsel] = useState(false)

  const currentIndexRef = useRef(0)
  useEffect(() => {
    currentIndexRef.current = currentIndex
  }, [currentIndex])
  const ergebnisseRef = useRef<FragenErgebnis['ergebnisse']>([])
  const audioErgebnisseRef = useRef<AudioFrameErgebnis[]>([])
  const alleErgebnisseRef = useRef<FragenErgebnis[]>([])
  const istImWechselRef = useRef(false)

  // Debug-Overlay (Branch debug/live-overlay, vermutlich wieder entfernt).
  const [debugModus, setDebugModus] = useState(false)
  const [letztesErgebnis, setLetztesErgebnis] = useState<AnalysisResultPayload | null>(null)
  const [liveAuswertung, setLiveAuswertung] = useState<Auswertung | null>(null)
  const [framerate, setFramerate] = useState(0)
  const resultZeitstempelRef = useRef<number[]>([])

  const { status, error, videoRef, start, stream } = useAnalysisWorker((result) => {
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

  useRedeflussVad(config.modus === 'video-ton' ? stream : null, (frame) => {
    audioErgebnisseRef.current = [...audioErgebnisseRef.current, frame]
  })

  const {
    status: fuellwortStatus,
    aktiviere: aktiviereFuellwortErkennung,
    starteFuerFrage: starteFuellwortErkennung,
    beendeFrage: beendeFuellwortErkennung,
  } = useFuellwortErkennung()

  useEffect(() => {
    getFragen(config.beruf, config.schwierigkeit).then(setFragen)
  }, [config.beruf, config.schwierigkeit])

  useEffect(() => {
    if (config.modus === 'video-ton') {
      void start()
    }
  }, [config.modus, start])

  // Startet die Fuellwort-Erkennung neu, sobald sie verfuegbar wird (Einwilligung
  // kann waehrend einer beliebigen Frage erteilt werden) UND bei jedem Fragenwechsel
  // (currentIndex aendert sich in advance()). Ein Ref haelt fest, fuer welchen Index
  // schon gestartet wurde, damit dieser Effekt nicht bei jedem Render erneut startet.
  const letzterGestarteterIndexRef = useRef(-1)
  useEffect(() => {
    if (
      config.modus === 'video-ton' &&
      fuellwortStatus === 'available' &&
      letzterGestarteterIndexRef.current !== currentIndex
    ) {
      letzterGestarteterIndexRef.current = currentIndex
      starteFuellwortErkennung()
    }
  }, [config.modus, fuellwortStatus, currentIndex, starteFuellwortErkennung])

  const advance = useCallback(
    async (fragenListe: Frage[]) => {
      // Verhindert doppelte Verarbeitung, wenn ein Doppelklick auf "Naechste Frage"
      // oder der ablaufende Auto-Advance-Timer advance() erneut ausloest, waehrend
      // die erste Ausfuehrung noch auf beendeFuellwortErkennung() wartet.
      if (istImWechselRef.current) {
        return
      }
      istImWechselRef.current = true
      setIstImWechsel(true)

      const aktuelleFrage = fragenListe[currentIndexRef.current]
      if (!aktuelleFrage) {
        istImWechselRef.current = false
        setIstImWechsel(false)
        return
      }

      const transkript = await beendeFuellwortErkennung()

      alleErgebnisseRef.current = [
        ...alleErgebnisseRef.current,
        {
          frage: aktuelleFrage,
          ergebnisse: ergebnisseRef.current,
          audioErgebnisse: audioErgebnisseRef.current,
          transkript,
        },
      ]
      ergebnisseRef.current = []
      audioErgebnisseRef.current = []
      setElapsed(0)

      if (currentIndexRef.current + 1 >= fragenListe.length) {
        onFinished(alleErgebnisseRef.current)
        istImWechselRef.current = false
        setIstImWechsel(false)
        return
      }

      currentIndexRef.current += 1
      setCurrentIndex(currentIndexRef.current)
      istImWechselRef.current = false
      setIstImWechsel(false)
    },
    [onFinished, beendeFuellwortErkennung],
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
      void advance(fragen)
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

        {config.modus === 'video-ton' && fuellwortStatus === 'downloadable' && (
          <p className={styles.fuellwortHinweis}>
            Das deutsche Sprachpaket wird einmalig über Chrome von Google geladen. Danach läuft die Erkennung
            vollständig lokal.{' '}
            <button type="button" onClick={aktiviereFuellwortErkennung}>
              Füllwort-Erkennung aktivieren
            </button>
          </p>
        )}
        {config.modus === 'video-ton' && fuellwortStatus === 'downloading' && (
          <p className={styles.fuellwortHinweis}>Sprachpaket wird geladen...</p>
        )}
        {config.modus === 'video-ton' && fuellwortStatus === 'unavailable' && (
          <p className={styles.fuellwortHinweis}>
            Füllwort-Erkennung in diesem Browser nicht verfügbar - Redefluss wird trotzdem gemessen.
          </p>
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

      <button type="button" className={styles.nextButton} onClick={() => void advance(fragen)} disabled={istImWechsel}>
        Nächste Frage
      </button>
    </div>
  )
}
