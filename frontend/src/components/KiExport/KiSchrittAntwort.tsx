import type { KiParseErgebnis } from '../../domain/kiAntwort'
import styles from './KiAssistent.module.scss'

interface KiSchrittAntwortProps {
  antwortText: string
  onAntwortText: (wert: string) => void
  antwortId: string
  parseErgebnis: KiParseErgebnis | null
  onZurueck: () => void
  onPruefen: () => void
}

/** Schritt 2 des KI-Assistenten: Antwort der KI einfuegen und pruefen lassen. */
export function KiSchrittAntwort({
  antwortText,
  onAntwortText,
  antwortId,
  parseErgebnis,
  onZurueck,
  onPruefen,
}: KiSchrittAntwortProps) {
  return (
    <>
      <div className={styles.body}>
        <p className={styles.einleitung}>
          Füge den kopierten Text in deine KI ein, kopiere ihre Antwort und füge sie hier ein.
        </p>
        <p className={styles.hinweis}>
          Lass dieses Fenster oder den Tab offen: Die Auswertung liegt nur im Browser-Tab und geht beim Neuladen
          verloren.
        </p>
        <label htmlFor={antwortId} className={styles.antwortLabel}>
          Antwort deiner KI einfügen
        </label>
        <textarea
          id={antwortId}
          className={styles.antwort}
          rows={10}
          value={antwortText}
          onChange={(event) => onAntwortText(event.target.value)}
        />
        {parseErgebnis && !parseErgebnis.ok && (
          <p role="alert" className={styles.fehler}>
            {parseErgebnis.fehler}
          </p>
        )}
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.sekundaer} onClick={onZurueck}>
          Zurück
        </button>
        <button type="button" className={styles.primaer} onClick={onPruefen}>
          Prüfen und anzeigen
        </button>
      </div>
    </>
  )
}
