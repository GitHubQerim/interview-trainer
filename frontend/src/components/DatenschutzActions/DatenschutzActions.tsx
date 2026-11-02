import { useState } from 'react'
import { setzeNeuenToken } from '../../domain/token'
import { ladeVerlauf, loescheVerlauf } from '../../domain/verlaufApi'
import styles from './DatenschutzActions.module.scss'

export function DatenschutzActions() {
  const [fehler, setFehler] = useState<string | null>(null)

  async function handleExport() {
    setFehler(null)
    try {
      const verlauf = await ladeVerlauf()
      const blob = new Blob([JSON.stringify(verlauf, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'interview-trainer-daten.json'
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      setFehler(error instanceof Error ? error.message : 'Export fehlgeschlagen.')
    }
  }

  async function handleLoeschen() {
    if (!confirm('Alle gespeicherten Auswertungen unwiderruflich löschen?')) {
      return
    }

    setFehler(null)
    try {
      await loescheVerlauf()
      setzeNeuenToken()
    } catch (error) {
      setFehler(error instanceof Error ? error.message : 'Löschen fehlgeschlagen.')
    }
  }

  return (
    <div className={styles.wrapper}>
      <button type="button" className={styles.button} onClick={handleExport}>
        Meine Daten exportieren
      </button>
      <button type="button" className={styles.button} onClick={handleLoeschen}>
        Meine Daten löschen
      </button>
      {fehler && <span className={styles.fehler}>{fehler}</span>}
    </div>
  )
}
