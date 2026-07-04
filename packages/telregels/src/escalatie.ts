import type { ISODatum } from './types.js'
import { naarUtc } from './kalender.js'

const DAG_MS = 86_400_000

/**
 * Escalatieladder van de deadline-engine (regelparameters.md § 3, stap 3):
 * herinnering aan de eigenaar → herhaling → signaal aan de directeur →
 * signaal aan AD/bestuur. Deadlines kunnen nooit stil verstrijken.
 *
 * De trappen zijn platformstandaarden; ze worden later per tenant
 * configureerbaar via de regelparameters (⚠ TE VALIDEREN in het lokaal comité).
 */
export interface EscalatieTrap {
  dagenVoorDeadline: number
  niveau: number
  doelgroep: string
}

export const STANDAARD_TRAPPEN: readonly EscalatieTrap[] = [
  { dagenVoorDeadline: 42, niveau: 1, doelgroep: 'eigenaar' },
  { dagenVoorDeadline: 21, niveau: 2, doelgroep: 'eigenaar (herhaling)' },
  { dagenVoorDeadline: 14, niveau: 3, doelgroep: 'directeur' },
  { dagenVoorDeadline: 7, niveau: 4, doelgroep: 'algemeen directeur / bestuur' },
]

export const NIVEAU_VERSTREKEN = 5

export interface EscalatieStand {
  niveau: number
  doelgroep?: string
  dagenResterend: number
  verstreken: boolean
}

export function bepaalEscalatie(
  deadline: ISODatum,
  vandaag: ISODatum,
  trappen: readonly EscalatieTrap[] = STANDAARD_TRAPPEN,
): EscalatieStand {
  const dagenResterend = Math.round((naarUtc(deadline) - naarUtc(vandaag)) / DAG_MS)

  if (dagenResterend < 0) {
    return {
      niveau: NIVEAU_VERSTREKEN,
      doelgroep: 'algemeen directeur / bestuur',
      dagenResterend,
      verstreken: true,
    }
  }

  let actief: EscalatieTrap | undefined
  for (const trap of trappen) {
    if (dagenResterend <= trap.dagenVoorDeadline && (actief === undefined || trap.niveau > actief.niveau)) {
      actief = trap
    }
  }

  return {
    niveau: actief?.niveau ?? 0,
    ...(actief !== undefined ? { doelgroep: actief.doelgroep } : {}),
    dagenResterend,
    verstreken: false,
  }
}
