import { useState } from 'react'
import type { SessionConfig } from '../../domain/session'
import { SetupScreen } from '../SetupScreen/SetupScreen'
import styles from './AppShell.module.scss'

type Tab = 'setup' | 'interview' | 'auswertung' | 'verlauf'

const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'setup', label: 'Setup' },
  { value: 'interview', label: 'Interview' },
  { value: 'auswertung', label: 'Auswertung' },
  { value: 'verlauf', label: 'Verlauf' },
]

const PLATZHALTER: Record<Exclude<Tab, 'setup'>, string> = {
  interview: 'Der Interview-Flow kommt in Slice 3.',
  auswertung: 'Die Auswertungsseite kommt in Slice 5.',
  verlauf: 'Der Verlauf kommt in Slice 7.',
}

export function AppShell() {
  const [activeTab, setActiveTab] = useState<Tab>('setup')
  const [, setSessionConfig] = useState<SessionConfig | null>(null)

  function handleStart(config: SessionConfig) {
    setSessionConfig(config)
    setActiveTab('interview')
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
      </header>

      <main className={styles.content}>
        {activeTab === 'setup' ? (
          <SetupScreen onStart={handleStart} />
        ) : (
          <p className={styles.placeholder}>{PLATZHALTER[activeTab]}</p>
        )}
      </main>
    </div>
  )
}
