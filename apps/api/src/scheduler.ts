import type { FastifyBaseLogger } from 'fastify'
import type { Db } from './db.js'
import { herberekenDeadlines, type HerberekenResultaat } from './modules/personeel/deadlines.js'

/**
 * Nachtelijke planner (ADR-0004): één veegronde per dag over alle tenants,
 * op het geconfigureerde tijdstip in Belgische tijd. De veegronde zelf is
 * los aanroepbaar (en zo getest); de planner is alleen de dunne kloktik.
 */

export interface TenantUitkomst {
  tenantId: string
  resultaat?: HerberekenResultaat
  fout?: string
}

/** Vandaag/nu in Belgische tijd, als { datum: 'JJJJ-MM-DD', tijd: 'UU:MM' }. */
export function klokBrussel(nu = new Date()): { datum: string; tijd: string } {
  const datum = nu.toLocaleDateString('en-CA', { timeZone: 'Europe/Brussels' })
  const tijd = nu.toLocaleTimeString('nl-BE', {
    timeZone: 'Europe/Brussels',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return { datum, tijd }
}

/**
 * Pure klokvergelijking: draaien zodra het tijdstip van vandaag gepasseerd is
 * en er vandaag nog niet gedraaid werd. ">=" in plaats van "===" zodat een
 * gemiste tik (herstart, drukke event loop, DST-sprong) zich binnen dezelfde
 * dag herstelt in plaats van een etmaal te wachten.
 */
export function moetNuDraaien(
  klok: { datum: string; tijd: string },
  tijdstip: string,
  laatsteRunDatum: string | undefined,
): boolean {
  return klok.tijd >= tijdstip && klok.datum !== laatsteRunDatum
}

/**
 * Eén veegronde: herbereken alle tenants met de systeemdatum, elk in de eigen
 * transactie. Een fout in één tenant stopt de andere niet. Idempotent en
 * replica-veilig: de advisory lock per tenant serialiseert overlappende runs.
 */
export async function herberekenAlleTenants(
  db: Db,
  log: FastifyBaseLogger,
  vandaag = klokBrussel().datum,
): Promise<TenantUitkomst[]> {
  const tenants = (await db`select core.tenant_ids() as id`) as unknown as { id: string }[]
  const uitkomsten: TenantUitkomst[] = []

  for (const tenant of tenants) {
    try {
      const resultaat = await herberekenDeadlines(db, tenant.id, vandaag, null)
      uitkomsten.push({ tenantId: tenant.id, resultaat })
      if (resultaat.aangemaakt + resultaat.bijgewerkt + resultaat.vervallen > 0) {
        log.info({ tenantId: tenant.id, ...resultaat }, 'deadline-veegronde: wijzigingen')
      }
    } catch (fout) {
      const boodschap = fout instanceof Error ? fout.message : String(fout)
      uitkomsten.push({ tenantId: tenant.id, fout: boodschap })
      log.error({ tenantId: tenant.id, fout: boodschap }, 'deadline-veegronde: tenant overgeslagen')
    }
  }
  return uitkomsten
}

export interface PlannerOpties {
  /** 'UU:MM' in Belgische tijd; standaard 03:30. */
  tijdstip?: string
  /** Tikinterval in ms (alleen voor tests verlaagbaar). */
  intervalMs?: number
}

/** Start de kloktik; geeft een stopfunctie terug (voor de onClose-hook). */
export function startPlanner(db: Db, log: FastifyBaseLogger, opties: PlannerOpties = {}): () => void {
  const tijdstip = opties.tijdstip ?? '03:30'
  let laatsteRunDatum: string | undefined
  let bezig = false

  const tik = setInterval(() => {
    const klok = klokBrussel()
    if (bezig || !moetNuDraaien(klok, tijdstip, laatsteRunDatum)) return
    bezig = true
    laatsteRunDatum = klok.datum
    herberekenAlleTenants(db, log, klok.datum)
      .then((uitkomsten) => {
        const fouten = uitkomsten.filter((u) => u.fout !== undefined).length
        log.info(
          { tenants: uitkomsten.length, fouten, datum: klok.datum },
          'deadline-veegronde afgerond',
        )
      })
      .catch((fout) => log.error({ fout }, 'deadline-veegronde mislukt'))
      .finally(() => {
        bezig = false
      })
  }, opties.intervalMs ?? 30_000)
  tik.unref?.()

  log.info({ tijdstip }, 'planner gestart (nachtelijke deadline-herberekening)')
  return () => clearInterval(tik)
}
