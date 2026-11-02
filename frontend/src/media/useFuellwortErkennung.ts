import { useCallback, useEffect, useRef, useState } from 'react'

export type FuellwortStatus = 'pruefe' | 'unavailable' | 'downloadable' | 'downloading' | 'available'

// Herkunft: eigene Einschaetzung, nicht empirisch validiert. Verhindert eine
// Endlosschleife bei einem dauerhaften Fehler (z.B. wiederholtes 'not-allowed':
// onerror -> onend -> Neustart -> onerror -> ...).
const MAX_NEUSTARTS = 3

const SPRACHE = 'de-DE'

interface SpeechRecognitionAlternative {
  transcript: string
}

interface SpeechRecognitionResultItem {
  isFinal: boolean
  0: SpeechRecognitionAlternative
}

interface SpeechRecognitionErgebnisEvent {
  resultIndex: number
  results: ArrayLike<SpeechRecognitionResultItem>
}

interface SpeechRecognitionInstanz {
  lang: string
  continuous: boolean
  processLocally: boolean
  onresult: ((event: SpeechRecognitionErgebnisEvent) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}

interface SpeechRecognitionVerfuegbarkeitOptionen {
  langs: string[]
  processLocally: boolean
}

/**
 * Minimaler Typ-Ausschnitt fuer die experimentelle On-Device-SpeechRecognition-API -
 * im TypeScript-DOM-lib (noch) nicht enthalten. Live in der Browser-Konsole
 * verifiziert: `SpeechRecognition.available({langs:['de-DE'], processLocally:true})`
 * existiert und liefert fuer Deutsch 'downloadable'. `install()` liefert laut MDN
 * einen Erfolgs-Boolean (nicht void) - muss ausgewertet werden, sonst wird ein
 * fehlgeschlagener Download faelschlich als 'available' behandelt. Kein
 * Fortschritts-Callback dokumentiert, deshalb nur ein unbestimmter Ladehinweis in
 * der UI statt einer Prozentanzeige.
 */
interface SpeechRecognitionCtorErweitert {
  new (): SpeechRecognitionInstanz
  available: (options: SpeechRecognitionVerfuegbarkeitOptionen) => Promise<FuellwortStatus>
  install?: (options: SpeechRecognitionVerfuegbarkeitOptionen) => Promise<boolean>
}

function holeCtor(): SpeechRecognitionCtorErweitert | undefined {
  const globalesObjekt = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtorErweitert
    webkitSpeechRecognition?: SpeechRecognitionCtorErweitert
  }
  return globalesObjekt.SpeechRecognition ?? globalesObjekt.webkitSpeechRecognition
}

export function useFuellwortErkennung() {
  const [status, setStatus] = useState<FuellwortStatus>('pruefe')
  const aktuelleRef = useRef<{ beende: () => Promise<string> } | null>(null)

  useEffect(() => {
    let aktuell = true

    async function pruefeVerfuegbarkeit() {
      try {
        const Ctor = holeCtor()
        if (!Ctor || typeof Ctor.available !== 'function') {
          if (aktuell) {
            setStatus('unavailable')
          }
          return
        }
        const verfuegbarkeit = await Ctor.available({ langs: [SPRACHE], processLocally: true })
        if (aktuell) {
          setStatus(verfuegbarkeit)
        }
      } catch {
        if (aktuell) {
          setStatus('unavailable')
        }
      }
    }

    void pruefeVerfuegbarkeit()
    return () => {
      aktuell = false
    }
  }, [])

  const aktiviere = useCallback(() => {
    const Ctor = holeCtor()
    if (!Ctor) {
      setStatus('unavailable')
      return
    }
    if (typeof Ctor.install !== 'function') {
      setStatus('unavailable')
      return
    }
    setStatus('downloading')
    Ctor.install({ langs: [SPRACHE], processLocally: true })
      .then((erfolgreich) => setStatus(erfolgreich ? 'available' : 'unavailable'))
      .catch(() => setStatus('unavailable'))
  }, [])

  const beendeFrage = useCallback(async (): Promise<string> => {
    const aktuelle = aktuelleRef.current
    aktuelleRef.current = null
    return aktuelle?.beende() ?? ''
  }, [])

  const starteFuerFrage = useCallback(() => {
    const Ctor = holeCtor()
    if (!Ctor || status !== 'available') {
      return
    }

    const instanz = new Ctor()
    let transkript = ''
    let absichtlichGestoppt = false
    let aufloesen: ((wert: string) => void) | null = null
    let neustartVersuche = 0

    instanz.lang = SPRACHE
    instanz.continuous = true
    // available()/install() pruefen nur das lokale Sprachpaket. Ob die laufende
    // Erkennung lokal arbeitet, entscheidet erst diese Property; Default ist die
    // Server-Erkennung. Ignoriert der Browser die Zuweisung (Property bleibt
    // false), starten wir nicht - sonst ginge Mikrofon-Audio unbemerkt an einen Server.
    instanz.processLocally = true
    if (instanz.processLocally !== true) {
      setStatus('unavailable')
      return
    }

    instanz.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const ergebnis = event.results[i]
        if (ergebnis?.isFinal) {
          transkript += ` ${ergebnis[0].transcript}`
        }
      }
      // Zaehlt aufeinanderfolgende Fehlschlaege, nicht Neustarts insgesamt - ein
      // natuerliches Ende nach einer Sprechpause ist bei `continuous` in Chrome
      // normal und kommt in einer 90-Sekunden-Antwort mehrfach vor; ohne Reset
      // waere das Feature nach der vierten normalen Denkpause faelschlich
      // 'unavailable'.
      neustartVersuche = 0
    }

    instanz.onend = () => {
      if (absichtlichGestoppt) {
        aufloesen?.(transkript) // sicher: nach onend kommen keine Ergebnisse mehr
        return
      }
      neustartVersuche += 1
      if (neustartVersuche > MAX_NEUSTARTS) {
        setStatus('unavailable')
        return
      }
      try {
        instanz.start() // natuerliches Ende waehrend die Frage noch laeuft -> Neustart
      } catch {
        // Unbedingt, nicht hinter neustartVersuche >= MAX_NEUSTARTS gegatet: nach
        // einem synchronen Wurf feuert kein onend mehr, der Zaehler kann das Limit
        // also nie erreichen. Ein synchroner Wurf ist immer terminal.
        setStatus('unavailable')
      }
    }

    instanz.onerror = () => {
      // onerror wird ueblicherweise von einem onend gefolgt, das die Neustart-Logik
      // uebernimmt - hier nichts zusaetzlich tun, um Doppel-Handling zu vermeiden.
    }

    try {
      instanz.start()
    } catch {
      setStatus('unavailable')
      return
    }

    aktuelleRef.current = {
      beende: () =>
        new Promise<string>((resolve) => {
          aufloesen = resolve
          absichtlichGestoppt = true
          try {
            instanz.stop()
          } catch {
            resolve(transkript)
            return
          }
          // Absicherung, falls onend ausbleibt; Promise ist idempotent.
          setTimeout(() => resolve(transkript), 1000)
        }),
    }
  }, [status])

  // Cleanup bei Unmount/Session-Abbruch MUSS denselben "absichtlich"-Pfad
  // durchlaufen. Wichtig, sonst nicht offensichtlich: SpeechRecognition nutzt das
  // Mikrofon unabhaengig vom getUserMedia-Stream aus useAnalysisWorker - das
  // Stoppen der dortigen Tracks beendet diese Erkennung NICHT. Ohne dieses Cleanup
  // wuerde sie sich ueber den onend-Neustart-Zweig endlos weiter neu starten, und
  // die Mikrofon-Anzeige des Browsers bliebe nach Interview-Ende faelschlich an.
  useEffect(() => {
    return () => {
      void beendeFrage()
    }
  }, [beendeFrage])

  return { status, aktiviere, starteFuerFrage, beendeFrage }
}
