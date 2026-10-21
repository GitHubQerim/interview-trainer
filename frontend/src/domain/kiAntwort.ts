export interface KiFormulierung {
  statt: string
  besser: string
}

export interface KiFrageFeedback {
  nr: number
  staerken: string[]
  verbesserungen: string[]
  formulierungen: KiFormulierung[]
  gesamteindruck: string
}

export interface KiAntwort {
  ref: string | null
  fragen: KiFrageFeedback[]
  naechsteSchritte: string[]
}

export type KiParseErgebnis = { ok: true; antwort: KiAntwort } | { ok: false; fehler: string }

// Herkunft: eigene Einschaetzung, nicht empirisch validiert. Die Grenzen schuetzen die
// Oberflaeche vor riesigen oder absichtlich aufgeblaehten Eingaben; echte KI-Antworten zu
// fuenf Fragen liegen weit darunter.
const MAX_EINGABE_ZEICHEN = 50_000
const MAX_TEXT_ZEICHEN = 1000
const MAX_LISTE = 8
const MAX_FRAGEN = 20
const MAX_REF_ZEICHEN = 20

/**
 * Beispielantwort im erwarteten Format. Der Prompt (`kiPrompt.ts`) bettet genau dieses
 * Beispiel ein, ein Test prueft, dass der Parser es akzeptiert - so laufen Anweisung
 * und Parser nicht auseinander. "REF_HIER" wird beim Bauen des Prompts ersetzt.
 */
export const KI_ANTWORT_BEISPIEL = `{
  "ref": "REF_HIER",
  "fragen": [
    {
      "nr": 1,
      "staerken": ["..."],
      "verbesserungen": ["..."],
      "formulierungen": [{ "statt": "...", "besser": "..." }],
      "gesamteindruck": "..."
    }
  ],
  "naechsteSchritte": ["..."]
}`

function istObjekt(wert: unknown): wert is Record<string, unknown> {
  return typeof wert === 'object' && wert !== null && !Array.isArray(wert)
}

/**
 * Findet das erste vollstaendige JSON-Objekt in einem Text: ueberspringt Text davor,
 * Code-Fences und Text danach und beachtet Klammern innerhalb von Zeichenketten.
 */
function extrahiereJsonObjekt(text: string): string | null {
  const start = text.indexOf('{')
  if (start === -1) {
    return null
  }

  let tiefe = 0
  let inString = false
  let maskiert = false

  for (let i = start; i < text.length; i += 1) {
    const zeichen = text[i]
    if (inString) {
      if (maskiert) {
        maskiert = false
      } else if (zeichen === '\\') {
        maskiert = true
      } else if (zeichen === '"') {
        inString = false
      }
      continue
    }

    if (zeichen === '"') {
      inString = true
    } else if (zeichen === '{') {
      tiefe += 1
    } else if (zeichen === '}') {
      tiefe -= 1
      if (tiefe === 0) {
        return text.slice(start, i + 1)
      }
    }
  }

  return null
}

function text(wert: unknown): string {
  return typeof wert === 'string' ? wert.trim().slice(0, MAX_TEXT_ZEICHEN) : ''
}

function textListe(wert: unknown): string[] {
  if (!Array.isArray(wert)) {
    return []
  }
  return wert
    .map(text)
    .filter((eintrag) => eintrag.length > 0)
    .slice(0, MAX_LISTE)
}

function formulierungen(wert: unknown): KiFormulierung[] {
  if (!Array.isArray(wert)) {
    return []
  }

  const ergebnis: KiFormulierung[] = []
  for (const eintrag of wert) {
    if (!istObjekt(eintrag)) {
      continue
    }
    const statt = text(eintrag.statt)
    const besser = text(eintrag.besser)
    if (statt && besser) {
      ergebnis.push({ statt, besser })
    }
  }
  return ergebnis.slice(0, MAX_LISTE)
}

function fragenNummer(wert: unknown, fallback: number): number {
  const zahl = typeof wert === 'string' ? Number(wert) : wert
  return typeof zahl === 'number' && Number.isInteger(zahl) && zahl >= 1 && zahl <= 99 ? zahl : fallback
}

/**
 * Liest die Antwort einer eigenen KI (JSON, evtl. mit Text und Code-Fences drumherum) und
 * baut daraus ein neues, bereinigtes Objekt: nur bekannte Felder werden uebernommen (nie
 * __proto__ oder Unbekanntes), Texte und Listen sind in der Laenge begrenzt. Der Inhalt
 * bleibt reiner Text - die Oberflaeche rendert ihn nie als HTML.
 */
export function parseKiAntwort(eingabe: string): KiParseErgebnis {
  if (eingabe.trim().length === 0) {
    return { ok: false, fehler: 'Es wurde noch nichts eingefügt.' }
  }
  if (eingabe.length > MAX_EINGABE_ZEICHEN) {
    return { ok: false, fehler: 'Die eingefügte Antwort ist zu lang. Bitte nur das JSON einfügen.' }
  }

  const json = extrahiereJsonObjekt(eingabe)
  if (json === null) {
    return { ok: false, fehler: 'Keine JSON-Antwort gefunden. Die KI soll ausschließlich im vorgegebenen JSON-Format antworten.' }
  }

  let roh: unknown
  try {
    roh = JSON.parse(json)
  } catch {
    return { ok: false, fehler: 'Die Antwort ist kein gültiges JSON. Bitte die KI bitten, es korrigiert noch einmal auszugeben.' }
  }

  if (!istObjekt(roh) || !Array.isArray(roh.fragen) || roh.fragen.length === 0) {
    return { ok: false, fehler: 'Im JSON fehlt das Feld „fragen“ mit mindestens einer Frage.' }
  }

  const fragen: KiFrageFeedback[] = []
  for (const [index, eintrag] of roh.fragen.slice(0, MAX_FRAGEN).entries()) {
    const nr = istObjekt(eintrag) ? fragenNummer(eintrag.nr, index + 1) : index + 1
    if (!istObjekt(eintrag)) {
      return { ok: false, fehler: `Frage ${nr}: Eintrag hat nicht das erwartete Format.` }
    }

    const feedback: KiFrageFeedback = {
      nr,
      staerken: textListe(eintrag.staerken),
      verbesserungen: textListe(eintrag.verbesserungen),
      formulierungen: formulierungen(eintrag.formulierungen),
      gesamteindruck: text(eintrag.gesamteindruck),
    }

    const hatInhalt =
      feedback.staerken.length > 0 ||
      feedback.verbesserungen.length > 0 ||
      feedback.formulierungen.length > 0 ||
      feedback.gesamteindruck.length > 0
    if (!hatInhalt) {
      return { ok: false, fehler: `Frage ${nr}: keine Inhalte gefunden (staerken, verbesserungen oder gesamteindruck fehlen).` }
    }

    fragen.push(feedback)
  }

  // Vergibt die KI Nummern doppelt, ist die Zuordnung zu den Fragen unklar: dann nach
  // Position neu nummerieren (eindeutige Nummern, auch mit Luecken, bleiben erhalten).
  const nummern = fragen.map((frage) => frage.nr)
  if (new Set(nummern).size !== nummern.length) {
    fragen.forEach((frage, index) => {
      frage.nr = index + 1
    })
  }

  const ref = typeof roh.ref === 'string' && roh.ref.length <= MAX_REF_ZEICHEN && /^[A-Za-z0-9-]+$/.test(roh.ref) ? roh.ref : null

  return { ok: true, antwort: { ref, fragen, naechsteSchritte: textListe(roh.naechsteSchritte) } }
}
