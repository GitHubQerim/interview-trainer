import type { Ersetzungen } from '../../domain/anonymisieren'
import styles from './KiAssistent.module.scss'

interface KiSchrittTextProps {
  mitKennzahlen: boolean
  onMitKennzahlen: (wert: boolean) => void
  transkriptVorhanden: boolean
  transkriptAktiv: boolean
  onMitTranskript: (wert: boolean) => void
  begriffeText: string
  onBegriffe: (wert: string) => void
  begriffeId: string
  promptText: string
  ersetzungen: Ersetzungen
  bestaetigt: boolean
  onBestaetigung: (wert: boolean) => void
  kopiert: boolean
  kopierFehler: boolean
  onKopieren: () => void
  onWeiter: () => void
}

const BESTAETIGUNG = 'Ich habe den Text geprüft und möchte ihn weitergeben.'
const PLATZHALTER_MUSTER = /(\[(?:E-MAIL|LINK|TELEFON|ZAHL|GESCHWÄRZT)\])/

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
 * Schritt 1 des KI-Assistenten: Optionen waehlen, Text pruefen, bestaetigen und kopieren.
 * Die Vorschau zeigt exakt den Text, der kopiert wird (derselbe promptText).
 */
export function KiSchrittText({
  mitKennzahlen,
  onMitKennzahlen,
  transkriptVorhanden,
  transkriptAktiv,
  onMitTranskript,
  begriffeText,
  onBegriffe,
  begriffeId,
  promptText,
  ersetzungen,
  bestaetigt,
  onBestaetigung,
  kopiert,
  kopierFehler,
  onKopieren,
  onWeiter,
}: KiSchrittTextProps) {
  return (
    <>
      <div className={styles.body}>
        <p className={styles.einleitung}>
          Die App sendet nichts. Du kopierst den Text selbst in deine eigene KI und holst die Antwort danach wieder hierher.
        </p>
        <details className={styles.mehr}>
          <summary>Hinweise zum Datenschutz</summary>
          <p>
            Mit dem Einfügen in einen KI-Dienst gelten dessen Datenschutzbedingungen. Ein „temporärer Chat“ oder
            Inkognito-Modus ist eine Zusage des Anbieters, keine Garantie. Gib keine vertraulichen Firmen- oder
            Kundendaten weiter. Andere Programme auf deinem Gerät können die Zwischenablage lesen.
          </p>
        </details>

        <div className={styles.optionen}>
          <label>
            <input type="checkbox" checked={mitKennzahlen} onChange={(event) => onMitKennzahlen(event.target.checked)} />
            Kennzahlen mitgeben
          </label>
          <label>
            <input
              type="checkbox"
              checked={transkriptAktiv}
              disabled={!transkriptVorhanden}
              onChange={(event) => onMitTranskript(event.target.checked)}
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
              onChange={(event) => onBegriffe(event.target.value)}
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
        <pre className={styles.vorschau} data-testid="ki-vorschau" tabIndex={0}>
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
      </div>

      <div className={styles.footer}>
        <label className={styles.bestaetigung}>
          <input type="checkbox" checked={bestaetigt} onChange={(event) => onBestaetigung(event.target.checked)} />
          {BESTAETIGUNG}
        </label>
        <div className={styles.aktionen}>
          {kopiert && <span className={styles.status}>Kopiert.</span>}
          <button type="button" className={styles.sekundaer} disabled={!bestaetigt} onClick={onKopieren}>
            In Zwischenablage kopieren
          </button>
          <button type="button" className={kopiert ? styles.primaer : styles.sekundaer} onClick={onWeiter}>
            Weiter
          </button>
        </div>
        {kopierFehler && (
          <p role="alert" className={styles.fehler}>
            Kopieren nicht möglich. Markiere den Text in der Vorschau und kopiere ihn von Hand.
          </p>
        )}
      </div>
    </>
  )
}
