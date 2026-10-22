import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { anonymisiere, parseBegriffe, type Ersetzungen } from '../../domain/anonymisieren'
import type { FragenErgebnis } from '../../domain/interview'
import { parseKiAntwort, type KiParseErgebnis } from '../../domain/kiAntwort'
import { baueKiPrompt, erzeugeRef, formatKennzahlen } from '../../domain/kiPrompt'
import { ergaenzeRedefluss } from '../../domain/redefluss'
import { berechneAuswertung } from '../../domain/score'
import { KiFeedbackAnzeige } from './KiFeedbackAnzeige'
import { KiSchrittAntwort } from './KiSchrittAntwort'
import { KiSchrittText } from './KiSchrittText'
import styles from './KiAssistent.module.scss'

interface KiAssistentProps {
  ergebnisse: FragenErgebnis[]
  beruf?: string
  schwierigkeit?: string
}

type Schritt = 1 | 2 | 3

const SCHRITTE: Array<{ nr: Schritt; titel: string }> = [
  { nr: 1, titel: 'Text vorbereiten' },
  { nr: 2, titel: 'Antwort einfügen' },
  { nr: 3, titel: 'Feedback' },
]

function summiere(a: Ersetzungen, b: Ersetzungen): Ersetzungen {
  return {
    email: a.email + b.email,
    link: a.link + b.link,
    telefon: a.telefon + b.telefon,
    zahl: a.zahl + b.zahl,
    begriffe: a.begriffe + b.begriffe,
    gesamt: a.gesamt + b.gesamt,
  }
}

/**
 * "Mit KI auswerten": Button plus Modal in drei Schritten (Text vorbereiten, Antwort
 * einfuegen, Feedback). Die App ruft selbst kein Sprachmodell auf und sendet nichts; das
 * Transkript wird nur aus dem vorhandenen State gelesen, nicht kopiert, gespeichert oder
 * zwischengelagert. Der Zustand lebt in dieser Komponente und bleibt beim Schliessen des
 * Modals erhalten, solange die Auswertung offen ist. Entscheidung und Grenzen: ADR-0011.
 */
export function KiAssistent({ ergebnisse, beruf, schwierigkeit }: KiAssistentProps) {
  const [offen, setOffen] = useState(false)
  const [schritt, setSchritt] = useState<Schritt>(1)
  const [ref] = useState(() => erzeugeRef(crypto.getRandomValues(new Uint8Array(6))))
  const [mitKennzahlen, setMitKennzahlen] = useState(true)
  const [mitTranskript, setMitTranskript] = useState(false)
  const [begriffeText, setBegriffeText] = useState('')
  const [bestaetigtFuer, setBestaetigtFuer] = useState<string | null>(null)
  const [kopiertText, setKopiertText] = useState<string | null>(null)
  const [kopierFehler, setKopierFehler] = useState(false)
  const [antwortText, setAntwortText] = useState('')
  const [parseErgebnis, setParseErgebnis] = useState<KiParseErgebnis | null>(null)

  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const titelId = useId()
  const antwortId = useId()
  const begriffeId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) {
      return
    }
    if (offen && !dialog.open) {
      if (typeof dialog.showModal === 'function') {
        dialog.showModal()
      } else {
        dialog.setAttribute('open', '')
      }
    } else if (!offen && dialog.open) {
      dialog.close()
    }
  }, [offen])

  const transkriptVorhanden = ergebnisse.some((eintrag) => eintrag.transkript.trim().length > 0)
  const transkriptAktiv = mitTranskript && transkriptVorhanden
  const begriffe = useMemo(() => parseBegriffe(begriffeText), [begriffeText])

  const { promptText, ersetzungen } = useMemo(() => {
    const anonymisiert = ergebnisse.map((eintrag) => (transkriptAktiv ? anonymisiere(eintrag.transkript, begriffe) : null))

    const fragen = ergebnisse.map((eintrag, index) => ({
      nr: index + 1,
      frage: eintrag.frage.text,
      transkript: anonymisiert[index]?.text ?? null,
      kennzahlen: mitKennzahlen
        ? formatKennzahlen(
            ergaenzeRedefluss(berechneAuswertung(eintrag.ergebnisse), eintrag.audioErgebnisse, eintrag.transkript),
          )
        : null,
    }))

    const summe = anonymisiert.reduce<Ersetzungen>(
      (gesamt, eintrag) => (eintrag ? summiere(gesamt, eintrag.ersetzungen) : gesamt),
      { email: 0, link: 0, telefon: 0, zahl: 0, begriffe: 0, gesamt: 0 },
    )

    return { promptText: baueKiPrompt({ ref, beruf, schwierigkeit, fragen }), ersetzungen: summe }
  }, [ergebnisse, transkriptAktiv, mitKennzahlen, begriffe, ref, beruf, schwierigkeit])

  const bestaetigt = bestaetigtFuer === promptText
  const kopiert = kopiertText === promptText

  async function kopieren() {
    try {
      await navigator.clipboard.writeText(promptText)
      setKopiertText(promptText)
      setKopierFehler(false)
    } catch {
      setKopierFehler(true)
    }
  }

  function antwortPruefen() {
    const ergebnis = parseKiAntwort(antwortText)
    setParseErgebnis(ergebnis)
    if (ergebnis.ok) {
      setSchritt(3)
    }
  }

  return (
    <>
      <button type="button" className={styles.kiButton} onClick={() => setOffen(true)}>
        <span aria-hidden="true" className={styles.funke}>
          ✦
        </span>
        Mit KI auswerten
      </button>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby={titelId}
        onClose={() => setOffen(false)}
        onClick={(event) => {
          // Klick auf den Hintergrund (das Dialog-Element selbst) schliesst das Modal.
          if (event.target === event.currentTarget) {
            setOffen(false)
          }
        }}
      >
        {offen && (
          <div className={styles.rahmen}>
            <div className={styles.kopf}>
              <h2 id={titelId} className={styles.titel}>
                Mit eigener KI auswerten
              </h2>
              <button type="button" className={styles.schliessen} aria-label="Schließen" onClick={() => setOffen(false)}>
                ✕
              </button>
            </div>

            <ol className={styles.stepper} aria-label="Fortschritt">
              {SCHRITTE.map((eintrag) => (
                <li
                  key={eintrag.nr}
                  className={styles.schritt}
                  aria-current={schritt === eintrag.nr ? 'step' : undefined}
                  data-erledigt={schritt > eintrag.nr}
                >
                  <span className={styles.schrittNr}>{eintrag.nr}</span>
                  {eintrag.titel}
                </li>
              ))}
            </ol>

            {schritt === 1 && (
              <KiSchrittText
                mitKennzahlen={mitKennzahlen}
                onMitKennzahlen={setMitKennzahlen}
                transkriptVorhanden={transkriptVorhanden}
                transkriptAktiv={transkriptAktiv}
                onMitTranskript={setMitTranskript}
                begriffeText={begriffeText}
                onBegriffe={setBegriffeText}
                begriffeId={begriffeId}
                promptText={promptText}
                ersetzungen={ersetzungen}
                bestaetigt={bestaetigt}
                onBestaetigung={(wert) => setBestaetigtFuer(wert ? promptText : null)}
                kopiert={kopiert}
                kopierFehler={kopierFehler}
                onKopieren={() => void kopieren()}
                onWeiter={() => setSchritt(2)}
              />
            )}

            {schritt === 2 && (
              <KiSchrittAntwort
                antwortText={antwortText}
                onAntwortText={setAntwortText}
                antwortId={antwortId}
                parseErgebnis={parseErgebnis}
                onZurueck={() => setSchritt(1)}
                onPruefen={antwortPruefen}
              />
            )}

            {schritt === 3 && parseErgebnis?.ok && (
              <KiFeedbackAnzeige
                antwort={parseErgebnis.antwort}
                fragenTexte={ergebnisse.map((eintrag) => eintrag.frage.text)}
                aktuelleRef={ref}
                onZurueck={() => setSchritt(2)}
                onFertig={() => setOffen(false)}
              />
            )}
          </div>
        )}
      </dialog>
    </>
  )
}
