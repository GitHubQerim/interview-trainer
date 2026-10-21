import { useState } from 'react'

const SPIEGELN_SCHLUESSEL = 'interview-trainer.vorschau-spiegeln'

// localStorage nur als Komfort pro Browser: blockiert (privates Fenster, gesperrte
// Website-Daten) faellt es still auf den Standard "gespiegelt" zurueck.
function ladeSpiegeln(): boolean {
  try {
    return window.localStorage.getItem(SPIEGELN_SCHLUESSEL) !== 'false'
  } catch {
    return true
  }
}

function speichereSpiegeln(wert: boolean): void {
  try {
    window.localStorage.setItem(SPIEGELN_SCHLUESSEL, String(wert))
  } catch {
    // Einstellung gilt dann nur fuer diese Sitzung.
  }
}

/**
 * Spiegelanzeige der Kamera (nur Darstellung, die Analyse laeuft auf dem Originalbild).
 * Gemeinsame Einstellung fuer Setup-Vorschau und Interview, standardmaessig an.
 */
export function useSpiegeln(): [boolean, (wert: boolean) => void] {
  const [spiegeln, setSpiegeln] = useState(ladeSpiegeln)

  function setze(wert: boolean) {
    setSpiegeln(wert)
    speichereSpiegeln(wert)
  }

  return [spiegeln, setze]
}
