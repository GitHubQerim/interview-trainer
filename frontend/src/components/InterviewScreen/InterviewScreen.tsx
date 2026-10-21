import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { getFragen, type Frage } from '../../domain/fragenkatalog'
import type { AudioFrameErgebnis, FragenErgebnis } from '../../domain/interview'
import type { SessionConfig } from '../../domain/session'
import { formatZeit } from '../../domain/zeit'
import { berechneAuswertung, type Auswertung } from '../../domain/score'
import { analysiereVad } from '../../domain/redefluss'
import { useSpiegeln } from '../../media/spiegeln'
import { useAnalysisWorker, type AnalysisResultPayload } from '../../media/useAnalysisWorker'
import { useFuellwortErkennung } from '../../media/useFuellwortErkennung'
import { useRedeflussVad } from '../../media/useRedeflussVad'
import { DebugOverlay, DebugWerte, type DebugAudio } from './DebugOverlay'
import styles from './InterviewScreen.module.scss'

const FRAMERATE_FENSTER_MS = 2_000

const STANDARD_FRAGENDAUER_SEKUNDEN = 90

// Vor jeder Frage: Zeit zum Zurechtsetzen und Lesen, in der nichts gemessen wird. Ohne sie
// landet der Griff zur Maus (Vorlehnen, Handbewegung) in den ersten Sekunden von Haltung
// und Bewegung (Befund Test 21.10.2026).
const STANDARD_BEREIT_SEKUNDEN = 3

interface InterviewScreenProps {
  config: SessionConfig
  fragendauerSekunden?: number
  bereitSekunden?: number
  onFinished: (ergebnisse: FragenErgebnis[]) => void
}

export function InterviewScreen({
  config,
  fragendauerSekunden = STANDARD_FRAGENDAUER_SEKUNDEN,
  bereitSekunden = STANDARD_BEREIT_SEKUNDEN,
  onFinished,
}: InterviewScreenProps) {
  const [fragen, setFragen] = useState<Frage[] | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [istImWechsel, setIstImWechsel] = useState(false)

  // Nur mit Videoanalyse gibt es etwas zu kalibrieren; in den anderen Modi startet die
  // Frage sofort.
  const mitVideo = config.modus === 'video-ton'
  const [bereitRest, setBereitRest] = useState(mitVideo ? bereitSekunden : 0)
  const bereit = bereitRest > 0
  const bereitRef = useRef(bereit)
  useEffect(() => {
    bereitRef.current = bereit
  }, [bereit])

  const currentIndexRef = useRef(0)
  useEffect(() => {
    currentIndexRef.current = currentIndex
  }, [currentIndex])
  const ergebnisseRef = useRef<FragenErgebnis['ergebnisse']>([])
  const audioErgebnisseRef = useRef<AudioFrameErgebnis[]>([])
  const alleErgebnisseRef = useRef<FragenErgebnis[]>([])
  const istImWechselRef = useRef(false)

  // Debug-Overlay (Branch debug/live-overlay, vermutlich wieder entfernt).
  const [videoVerhaeltnis, setVideoVerhaeltnis] = useState(16 / 9)
  const [spiegeln, setSpiegeln] = useSpiegeln()
  const [debugModus, setDebugModus] = useState(false)
  const [audioDebug, setAudioDebug] = useState<DebugAudio | null>(null)
  const [letztesErgebnis, setLetztesErgebnis] = useState<AnalysisResultPayload | null>(null)
  const [liveAuswertung, setLiveAuswertung] = useState<Auswertung | null>(null)
  const [framerate, setFramerate] = useState(0)
  const resultZeitstempelRef = useRef<number[]>([])

  const { status, error, videoRef, start, stream } = useAnalysisWorker((result) => {
    if (bereitRef.current) {
      return
    }

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

  useRedeflussVad(mitVideo ? stream : null, (frame) => {
    if (bereitRef.current) {
      return
    }

    audioErgebnisseRef.current = [...audioErgebnisseRef.current, frame]

    if (debugModus) {
      const pegel = audioErgebnisseRef.current.map((eintrag) => eintrag.lautstaerke)
      setAudioDebug({ pegel: frame.lautstaerke, vad: analysiereVad(pegel) })
    }
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
    if (mitVideo && !bereit && fuellwortStatus === 'available' && letzterGestarteterIndexRef.current !== currentIndex) {
      letzterGestarteterIndexRef.current = currentIndex
      starteFuellwortErkennung()
    }
  }, [mitVideo, bereit, fuellwortStatus, currentIndex, starteFuellwortErkennung])

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
      setBereitRest(mitVideo ? bereitSekunden : 0)
      // Synchron setzen: der Effekt, der den Ref sonst aktualisiert, laeuft erst nach dem
      // Render - Frames dazwischen landeten sonst noch in der neuen Frage.
      bereitRef.current = mitVideo && bereitSekunden > 0
      istImWechselRef.current = false
      setIstImWechsel(false)
    },
    [onFinished, beendeFuellwortErkennung, mitVideo, bereitSekunden],
  )

  // Die Bereit-Phase laeuft erst, wenn die Analyse bereit ist - sonst waere sie schon
  // vorbei, waehrend Kamera und Modell noch laden.
  const analyseBereit = !mitVideo || status === 'ready'
  useEffect(() => {
    if (!fragen || fragen.length === 0 || bereitRest <= 0 || !analyseBereit) {
      return
    }

    const timeout = window.setTimeout(() => setBereitRest((rest) => rest - 1), 1000)

    return () => window.clearTimeout(timeout)
  }, [fragen, bereitRest, analyseBereit])

  useEffect(() => {
    if (!fragen || fragen.length === 0 || bereit) {
      return
    }

    const interval = window.setInterval(() => {
      setElapsed((sekunden) => sekunden + 1)
    }, 1000)

    return () => window.clearInterval(interval)
  }, [fragen, currentIndex, bereit])

  // Pfeil rechts: ohne Maus weiter (Bereit-Phase ueberspringen bzw. naechste Frage). Bewusst
  // nicht die Leertaste - die wuerde fokussierte Buttons und Checkboxen ausloesen.
  useEffect(() => {
    function beiTaste(event: KeyboardEvent) {
      // Gehaltene Taste und Kombinationen (Alt+Pfeil = Browser zurueck) nicht abfangen.
      if (event.key !== 'ArrowRight' || event.repeat || event.altKey || event.ctrlKey || event.metaKey) {
        return
      }
      const ziel = event.target
      if (ziel instanceof HTMLElement && (ziel.tagName === 'TEXTAREA' || ziel.tagName === 'SELECT')) {
        return
      }

      event.preventDefault()
      if (bereit) {
        setBereitRest(0)
      } else if (fragen) {
        void advance(fragen)
      }
    }

    window.addEventListener('keydown', beiTaste)
    return () => window.removeEventListener('keydown', beiTaste)
  }, [bereit, fragen, advance])

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

      <div className={mitVideo ? `${styles.card} ${styles.cardMitVideo}` : styles.card}>
        <div className={styles.frage}>
          <span className={styles.meta}>
            Frage {currentIndex + 1} von {fragen.length} · {config.schwierigkeit}
          </span>
          <p className={styles.frageText}>{aktuelleFrage.text}</p>
        </div>

        {mitVideo && (
          <div className={styles.videoSpalte}>
            <div
              className={styles.videoBox}
              data-testid="video-buehne"
              data-gespiegelt={spiegeln}
              style={{ '--ratio': videoVerhaeltnis } as CSSProperties}
            >
              {/* Video und Overlay teilen sich einen Container, damit die Spiegelung beide
                  gleich trifft. Die Analyse laeuft immer auf dem Originalbild. */}
              <div className={spiegeln ? `${styles.medien} ${styles.gespiegelt}` : styles.medien}>
                <video
                  ref={videoRef}
                  className={styles.video}
                  muted
                  playsInline
                  onLoadedMetadata={(event) => {
                    const { videoWidth, videoHeight } = event.currentTarget
                    if (videoWidth > 0 && videoHeight > 0) {
                      setVideoVerhaeltnis(videoWidth / videoHeight)
                    }
                  }}
                />
                {debugModus && <DebugOverlay videoElement={videoRef.current} letztesErgebnis={letztesErgebnis} />}
              </div>
              {bereit && (
                <div className={styles.bereitOverlay} role="status">
                  <span>Mach dich bereit</span>
                  {analyseBereit && <strong>{bereitRest}</strong>}
                </div>
              )}
            </div>
          </div>
        )}

        <div className={styles.steuerung}>
          {mitVideo && fuellwortStatus === 'downloadable' && (
            <p className={styles.fuellwortHinweis}>
              Das deutsche Sprachpaket wird einmalig über Chrome von Google geladen. Danach läuft die Erkennung
              vollständig lokal.{' '}
              <button type="button" className={styles.sekundaerButton} onClick={aktiviereFuellwortErkennung}>
                Füllwort-Erkennung aktivieren
              </button>
            </p>
          )}
          {mitVideo && fuellwortStatus === 'downloading' && (
            <p className={styles.fuellwortHinweis}>Sprachpaket wird geladen...</p>
          )}
          {mitVideo && fuellwortStatus === 'unavailable' && (
            <p className={styles.fuellwortHinweis}>
              Füllwort-Erkennung in diesem Browser nicht verfügbar - Redefluss wird trotzdem gemessen.
            </p>
          )}

          <div className={styles.footer}>
            <span className={styles.analyseStatus}>
              {mitVideo && (
                <>
                  <span className={styles.dot} />
                  {status !== 'ready' ? (error ?? 'Analyse wird vorbereitet...') : bereit ? 'Gleich geht’s los' : 'Analyse läuft lokal'}
                </>
              )}
            </span>
            <span className={styles.zeit}>{formatZeit(elapsed)}</span>
          </div>

          {bereit ? (
            <button type="button" className={styles.nextButton} onClick={() => setBereitRest(0)}>
              Sofort starten
            </button>
          ) : (
            <button
              type="button"
              className={styles.nextButton}
              onClick={() => void advance(fragen)}
              disabled={istImWechsel}
            >
              Nächste Frage
            </button>
          )}
          {mitVideo && <p className={styles.tipp}>Tipp: Mit der Taste → kommst du ohne Maus weiter.</p>}

          {mitVideo && (
            <div className={styles.optionen}>
              <label>
                <input type="checkbox" checked={spiegeln} onChange={(event) => setSpiegeln(event.target.checked)} />{' '}
                Spiegelbild
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={debugModus}
                  onChange={(event) => setDebugModus(event.target.checked)}
                />{' '}
                Debug-Overlay anzeigen (nur zum Testen)
              </label>
            </div>
          )}

          {mitVideo && debugModus && (
            <DebugWerte
              letztesErgebnis={letztesErgebnis}
              liveAuswertung={liveAuswertung}
              framerate={framerate}
              audio={audioDebug}
            />
          )}
        </div>
      </div>
    </div>
  )
}
