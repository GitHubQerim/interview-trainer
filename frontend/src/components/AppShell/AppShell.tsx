import { useState } from 'react'
import type { FragenErgebnis } from '../../domain/interview'
import type { SessionConfig } from '../../domain/session'
import { speichereSession } from '../../domain/verlaufApi'
import { AuswertungScreen } from '../AuswertungScreen/AuswertungScreen'
import { DatenschutzActions } from '../DatenschutzActions/DatenschutzActions'
import { InterviewScreen } from '../InterviewScreen/InterviewScreen'
import { SetupScreen } from '../SetupScreen/SetupScreen'
import styles from './AppShell.module.scss'

type Tab = 'setup' | 'interview' | 'auswertung' | 'verlauf'

const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'setup', label: 'Setup' },
  { value: 'interview', label: 'Interview' },
  { value: 'auswertung', label: 'Auswertung' },
  { value: 'verlauf', label: 'Verlauf' },
]

export function AppShell() {
  const [activeTab, setActiveTab] = useState<Tab>('setup')
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null)
  const [ergebnisse, setErgebnisse] = useState<FragenErgebnis[] | null>(null)

  function handleStart(config: SessionConfig) {
    setSessionConfig(config)
    setActiveTab('interview')
  }

  function handleFinished(ergebnisse: FragenErgebnis[]) {
    setErgebnisse(ergebnisse)
    setActiveTab('auswertung')

    if (sessionConfig) {
      void speichereSession(sessionConfig, ergebnisse).catch((error: unknown) => {
        console.error('Konnte Auswertung nicht speichern:', error)
      })
    }
  }

  return (
    <div>
      <header className={styles.header}>
        <h1 className={styles.title}>Interview-Trainer</h1>
        <nav className={styles.nav}>
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={tab.value === activeTab ? `${styles.tab} ${styles.tabActive}` : styles.tab}
              onClick={() => setActiveTab(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        {activeTab !== 'interview' && <DatenschutzActions />}
      </header>

      <main className={styles.content}>
        {activeTab === 'setup' && <SetupScreen onStart={handleStart} />}
        {activeTab === 'interview' && sessionConfig && (
          <InterviewScreen config={sessionConfig} onFinished={handleFinished} />
        )}
        {activeTab === 'auswertung' && ergebnisse && (
          <AuswertungScreen
            ergebnisse={ergebnisse}
            onNochmalUeben={() => setActiveTab('setup')}
            onVerlaufAnsehen={() => setActiveTab('verlauf')}
          />
        )}
      </main>
    </div>
  )
}
