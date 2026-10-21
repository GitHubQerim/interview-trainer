import { useId, useMemo, useState } from 'react'
import { anonymisiere, parseBegriffe, type Ersetzungen } from '../../domain/anonymisieren'
import type { FragenErgebnis } from '../../domain/interview'
import { parseKiAntwort, type KiParseErgebnis } from '../../domain/kiAntwort'
import { baueKiPrompt, erzeugeRef, formatKennzahlen } from '../../domain/kiPrompt'
import { ergaenzeRedefluss } from '../../domain/redefluss'
import { berechneAuswertung } from '../../domain/score'
import { KiFeedbackAnzeige } from './KiFeedbackAnzeige'
import styles from './KiExport.module.scss'

interface KiExportPanelProps {
  ergebnisse: FragenErgebnis[]
  beruf?: string
  schwierigkeit?: string
}

const BESTAETIGUNG = 'Ich habe den Text geprüft und möchte ihn weitergeben.'
const PLATZHALTER_MUSTER = /(\[(?:E-MAIL|LINK|TELEFON|ZAHL|GESCHWÄRZT)\])/

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

function beschreibe(ersetzungen: Ersetzungen): string {
  const teile = [
    ersetzungen.email > 0 ? `E-Mail ${ersetzungen.email}` : null,
    ersetzungen.link > 0 ? `Link ${ersetzungen.link}` : null,
    ersetzungen.telefon > 0 ? `Telefon ${ersetzungen.telefon}` : null,
    ersetzungen.zahl > 0 ? `Zahl ${ersetzungen.zahl}` : null,
    ersetzungen.begriffe > 0 ? `eigene Begriffe ${ersetzungen.begriffe}` : null,
  ].filter((teil): teil is string => teil !== null)
  return teile.length > 0 ? ` (${teile.join(', ')})` : ''
}

/**
 * "Mit eigener KI auswerten": erzeugt aus Fragen, optional Kennzahlen und optional
 * (geschwaerztem) Transkript einen Text zum Kopieren und liest die Antwort der KI wieder
 * ein. Die App ruft selbst kein Sprachmodell auf und sendet nichts; das Transkript wird nur
 * aus dem vorhandenen State gelesen, nicht kopiert, gespeichert oder zwischengelagert.
 * Entscheidung und Grenzen: ADR-0011.
 */
export function KiExportPanel({ ergebnisse, beruf, schwierigkeit }: KiExportPanelProps) {
  const [ref] = useState(() => erzeugeRef(crypto.getRandomValues(new Uint8Array(6))))
  const [mitKennzahlen, setMitKennzahlen] = useState(true)
  const [mitTranskript, setMitTranskript] = useState(false)
  const [begriffeText, setBegriffeText] = useState('')
  const [bestaetigtFuer, setBestaetigtFuer] = useState<string | null>(null)
  const [kopiertText, setKopiertText] = useState<string | null>(null)
  const [kopierFehler, setKopierFehler] = useState(false)
  const [antwortText, setAntwortText] = useState('')
  const [parseErgebnis, setParseErgebnis] = useState<KiParseErgebnis | null>(null)

  const antwortId = useId()
  const begriffeId = useId()

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
    setParseErgebnis(parseKiAntwort(antwortText))
  }

  return (
    <details className={styles.panel}>
      <summary className={styles.summary}>Mit eigener KI auswerten (optional)</summary>

      <div className={styles.inhalt}>
        <p className={styles.erklaerung}>
          Die App sendet nichts. Sie erzeugt einen Text, den du selbst in deine eigene KI kopierst, und liest die Antwort
          wieder ein. Mit dem Einfügen in einen KI-Dienst gelten dessen Datenschutzbedingungen. Ein „temporärer Chat“
          oder Inkognito-Modus ist eine Zusage des Anbieters, keine Garantie. Gib keine vertraulichen Firmen- oder
          Kundendaten weiter.
        </p>

        <h3 className={styles.abschnitt}>1. Text für deine KI</h3>

        <div className={styles.optionen}>
          <label>
            <input type="checkbox" checked={mitKennzahlen} onChange={(event) => setMitKennzahlen(event.target.checked)} />
            Kennzahlen mitgeben
          </label>
          <label>
            <input
              type="checkbox"
              checked={transkriptAktiv}
              disabled={!transkriptVorhanden}
              onChange={(event) => setMitTranskript(event.target.checked)}
            />
            Transkript mitgeben
          </label>
        </div>
        {!transkriptVorhanden && (
          <p className={styles.hinweis}>
            Kein Transkript vorhanden. Aktiviere im Interview die Füllwort-Erkennung (Chrome), dann wird deine Antwort
            lokal mitgeschrieben.
          </p>
        )}

        {transkriptAktiv && (
          <div className={styles.begriffe}>
            <label htmlFor={begriffeId}>Begriffe schwärzen (mit Komma getrennt)</label>
            <input
              id={begriffeId}
              type="text"
              value={begriffeText}
              placeholder="z. B. dein Name, Arbeitgeber, Projektnamen"
              onChange={(event) => setBegriffeText(event.target.value)}
            />
            <p className={styles.hinweis}>Gilt nur für diesen Export und wird nicht gespeichert.</p>
          </div>
        )}

        <p className={styles.warnung}>
          Automatische Schwärzung findet nur E-Mails, Links mit http oder www, Telefonnummern, lange Zahlen und die
          Begriffe, die du eingibst. Namen, Orte, Firmen, Domainnamen ohne http oder www (z. B. firma.de) und andere
          Details, die dich identifizieren, erkennt sie nicht von selbst. Gesprochene Zahlen („null eins sieben …“)
          auch nicht. Prüfe den Text unten selbst.
        </p>

        <p className={styles.vorschauTitel}>
          Vorschau – genau dieser Text wird kopiert
          {transkriptAktiv && (
            <span className={styles.zaehler}>
              {' '}
              · {ersetzungen.gesamt} {ersetzungen.gesamt === 1 ? 'Ersetzung' : 'Ersetzungen'}
              {beschreibe(ersetzungen)}
            </span>
          )}
        </p>
        <pre className={styles.vorschau} data-testid="ki-vorschau">
          {promptText.split(PLATZHALTER_MUSTER).map((teil, index) =>
            PLATZHALTER_MUSTER.test(teil) ? (
              <mark key={index} className={styles.treffer}>
                {teil}
              </mark>
            ) : (
              teil
            ),
          )}
        </pre>

        <label className={styles.bestaetigung}>
          <input
            type="checkbox"
            checked={bestaetigt}
            onChange={(event) => setBestaetigtFuer(event.target.checked ? promptText : null)}
          />
          {BESTAETIGUNG}
        </label>

        <div className={styles.aktionen}>
          <button type="button" className={styles.kopierButton} disabled={!bestaetigt} onClick={() => void kopieren()}>
            In Zwischenablage kopieren
          </button>
          {kopiert && <span className={styles.status}>Kopiert.</span>}
        </div>
        {kopierFehler && (
          <p role="alert" className={styles.fehler}>
            Kopieren nicht möglich. Markiere den Text in der Vorschau und kopiere ihn von Hand.
          </p>
        )}
        <p className={styles.hinweis}>
          Andere Programme auf deinem Gerät können die Zwischenablage lesen. Füge den Text direkt in deine KI ein.
        </p>

        <h3 className={styles.abschnitt}>2. Antwort deiner KI zurückholen</h3>
        <p className={styles.hinweis}>
          Bleib auf dieser Seite, bis du die Antwort eingefügt hast: Die Auswertung liegt nur im Browser-Tab und geht beim
          Neuladen verloren.
        </p>
        <label htmlFor={antwortId} className={styles.antwortLabel}>
          Antwort deiner KI einfügen
        </label>
        <textarea
          id={antwortId}
          className={styles.antwort}
          rows={6}
          value={antwortText}
          onChange={(event) => setAntwortText(event.target.value)}
        />
        <div className={styles.aktionen}>
          <button type="button" className={styles.kopierButton} onClick={antwortPruefen}>
            Prüfen und anzeigen
          </button>
        </div>

        {parseErgebnis && !parseErgebnis.ok && (
          <p role="alert" className={styles.fehler}>
            {parseErgebnis.fehler}
          </p>
        )}
        {parseErgebnis?.ok && (
          <>
            {parseErgebnis.antwort.ref === null && (
              <p className={styles.hinweis}>
                Keine REF in der Antwort – ob sie zu dieser Auswertung gehört, lässt sich nicht prüfen.
              </p>
            )}
            {parseErgebnis.antwort.ref !== null && parseErgebnis.antwort.ref !== ref && (
              <p className={styles.warnung}>
                Die REF der Antwort ({parseErgebnis.antwort.ref}) passt nicht zu dieser Auswertung ({ref}). Sie wird
                trotzdem angezeigt.
              </p>
            )}
            <KiFeedbackAnzeige
              antwort={parseErgebnis.antwort}
              fragenTexte={ergebnisse.map((eintrag) => eintrag.frage.text)}
            />
          </>
        )}
      </div>
    </details>
  )
}
