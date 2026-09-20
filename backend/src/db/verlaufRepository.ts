import type { SessionEingabe } from '../domain/verlauf.js'
import { prisma } from './prisma.js'

export async function speichereSession(eingabe: SessionEingabe): Promise<{ id: string }> {
  const session = await prisma.session.create({
    data: {
      token: eingabe.token,
      beruf: eingabe.beruf,
      schwierigkeit: eingabe.schwierigkeit,
      modus: eingabe.modus,
      ergebnisse: { create: eingabe.ergebnisse },
    },
  })

  return { id: session.id }
}

export function ladeVerlauf(token: string) {
  return prisma.session.findMany({
    where: { token },
    select: {
      id: true,
      beruf: true,
      schwierigkeit: true,
      modus: true,
      erstelltAm: true,
      ergebnisse: {
        select: {
          frageId: true,
          frageText: true,
          abdeckung: true,
          auswertbar: true,
          kopfausrichtungProzent: true,
          haltungGradMedian: true,
          haltungVerlauf: true,
          bewegungsruhe: true,
        },
      },
    },
    orderBy: { erstelltAm: 'asc' },
  })
}

export async function loescheVerlauf(token: string): Promise<{ anzahl: number }> {
  const { count } = await prisma.session.deleteMany({ where: { token } })
  return { anzahl: count }
}
