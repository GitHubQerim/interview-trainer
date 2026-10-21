import {
  BEWEGUNGSRUHE_ZIELKORRIDOR,
  HALTUNG_VERLAUF_STABIL_SCHWELLE,
  HALTUNG_ZIELKORRIDOR,
  istImZielkorridor,
  KOPFAUSRICHTUNG_ZIELKORRIDOR,
  REDEFLUSS_ZIELKORRIDOR,
  type Auswertung,
} from './score'

export interface Trainingshinweis {
  metrik: 'kopfausrichtung' | 'haltung' | 'bewegung' | 'redefluss'
  text: string
}

function komma(wert: number, stellen = 1): string {
  return wert.toFixed(stellen).replace('.', ',')
}

/**
 * Leitet aus den bereits berechneten Kennzahlen Hinweise "Worauf du achten kannst" ab.
 * Rein regelbasiert (kein LLM, ADR-0001) und nur fuer Kennzahlen ausserhalb ihres
 * Zielkorridors. Die Texte beschreiben Verhalten und geben einen Trainingsrat; sie
 * bewerten nie die Eignung der Person (Produktidee: Trainingshilfe, keine Bewertung).
 * Die Kennzahlen selbst bleiben unveraendert - das hier ist nur die Formulierung.
 */
export function leiteTrainingshinweiseAb(auswertung: Auswertung): Trainingshinweis[] {
  const hinweise: Trainingshinweis[] = []

  const kopf = auswertung.kopfausrichtungProzent
  if (kopf !== null && kopf < KOPFAUSRICHTUNG_ZIELKORRIDOR.min) {
    hinweise.push({
      metrik: 'kopfausrichtung',
      text: `Nur ${Math.round(kopf)} % der Zeit war dein Kopf zur Kamera gerichtet. Schau bei der Antwort öfter direkt in die Kamera und leg Notizen am besten direkt neben sie.`,
    })
  }

  const haltung = auswertung.haltungGradMedian
  if (haltung !== null && !istImZielkorridor('haltung', haltung) && haltung > HALTUNG_ZIELKORRIDOR.max) {
    const zunahme =
      auswertung.haltungVerlauf !== null && auswertung.haltungVerlauf > HALTUNG_VERLAUF_STABIL_SCHWELLE
        ? ' Die Neigung nahm im Lauf der Antwort zu – richte dich zwischendurch kurz wieder auf.'
        : ''
    hinweise.push({
      metrik: 'haltung',
      text: `Deine Schultern waren im Schnitt ${komma(haltung)}° geneigt. Setz dich gerade hin, beide Füße auf den Boden, und stell die Kamera auf Augenhöhe.${zunahme}`,
    })
  }

  const bewegung = auswertung.bewegungsruhe
  if (bewegung !== null && bewegung > BEWEGUNGSRUHE_ZIELKORRIDOR.max) {
    hinweise.push({
      metrik: 'bewegung',
      text: 'Dein Oberkörper war ziemlich in Bewegung. Leg die Hände ruhig ab und setz Gesten bewusst ein, statt sie nebenbei laufen zu lassen.',
    })
  }

  const redefluss = auswertung.redeflussProzent
  if (redefluss !== null) {
    if (redefluss < REDEFLUSS_ZIELKORRIDOR.min) {
      const pause =
        auswertung.laengstePauseSekunden !== null
          ? ` Die längste Pause dauerte ${komma(auswertung.laengstePauseSekunden)} s.`
          : ''
      hinweise.push({
        metrik: 'redefluss',
        text: `Dein Redefluss lag bei ${Math.round(redefluss)} %.${pause} Überleg dir vorher zwei bis drei Stichpunkte, dann stockst du seltener.`,
      })
    } else if (redefluss > REDEFLUSS_ZIELKORRIDOR.max) {
      hinweise.push({
        metrik: 'redefluss',
        text: `Du hast fast ohne Pausen gesprochen (${Math.round(redefluss)} %). Kurze Pausen nach wichtigen Sätzen helfen den Zuhörenden beim Folgen.`,
      })
    }
  }

  return hinweise
}
