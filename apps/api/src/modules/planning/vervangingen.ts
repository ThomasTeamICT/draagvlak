import {
  bepaalKanaal,
  noodscenarios,
  stelVervangersVoor,
  type KanaalAdvies,
  type NoodInvoer,
  type Onderwijsniveau,
  type VervangerKandidaat,
} from '@draagvlak/planregels'
import { dagenIn, isWeekend } from '@draagvlak/telregels'
import type { Trx } from '../../db.js'
import { haalKalender } from './kalender.js'

/**
 * Module P3 — vervangingen: de koppeling tussen de pure regelmachine
 * (@draagvlak/planregels) en de echte data van de tenant. Alle drempels en
 * volgordes zitten in het regelboek; hier komt alleen data bij elkaar.
 */

/** Kalendervrije dagen van een schooljaar als set, voor de werkdagentelling. */
export async function haalVrijeDagen(trx: Trx, schooljaar: string): Promise<Set<string>> {
  const periodes = await haalKalender(trx, schooljaar)
  const vrij = new Set<string>()
  for (const p of periodes) {
    if (p.einde < p.start) continue
    for (const dag of dagenIn(p.start, p.einde)) {
      if (!isWeekend(dag)) vrij.add(dag)
    }
  }
  return vrij
}

/** Schooljaar 'JJJJ-JJJJ' waarin een datum valt (1/9 t/m 31/8). */
export function schooljaarVan(datum: string): string {
  const jaar = Number(datum.slice(0, 4))
  const maand = Number(datum.slice(5, 7))
  return maand >= 9 ? `${jaar}-${jaar + 1}` : `${jaar - 1}-${jaar}`
}

/** Resterend contingent: jaarbudget minus verbruik van actieve vervangingen. */
export async function haalContingent(
  trx: Trx,
  schooljaar: string,
): Promise<{ totaal: number; verbruikt: number; restant: number }> {
  const [budget] = (await trx`
    select eenheden from core.vervangingscontingent where schooljaar = ${schooljaar}`) as unknown as {
    eenheden: number
  }[]
  const grenzen = { start: `${schooljaar.slice(0, 4)}-09-01`, einde: `${schooljaar.slice(5, 9)}-08-31` }
  const [verbruik] = (await trx`
    select coalesce(sum(eenheden), 0)::int as som
    from core.vervanging
    where status = 'actief'
      and kanaal = 'vervangingseenheden'
      and start >= ${grenzen.start} and start <= ${grenzen.einde}`) as unknown as { som: number }[]
  const totaal = budget?.eenheden ?? 0
  const verbruikt = verbruik?.som ?? 0
  return { totaal, verbruikt, restant: Math.max(0, totaal - verbruikt) }
}

export interface AdviesUitkomst {
  ok: boolean
  status?: 404
  fout?: string
  advies?: KanaalAdvies & {
    contingent: { totaal: number; verbruikt: number; restant: number }
    platformledenVrij: number
    schooljaar: string
  }
}

/**
 * Kanaaladvies voor de afwezigheid van één persoon op een peildatum:
 * echte afwezigheden + echte schoolkalender + echt contingent + echte
 * platformbeschikbaarheid, door de pure kanaalkeuze-assistent.
 */
export async function adviesVoorAfwezigheid(
  trx: Trx,
  invoer: { persoonId: string; peildatum: string; niveau: Onderwijsniveau },
): Promise<AdviesUitkomst> {
  const personen = (await trx`
    select id from core.persoon where id = ${invoer.persoonId}`) as unknown as { id: string }[]
  if (personen.length === 0) return { ok: false, status: 404, fout: 'persoon niet gevonden' }

  const schooljaar = schooljaarVan(invoer.peildatum)
  const grenzen = { start: `${schooljaar.slice(0, 4)}-09-01`, einde: `${schooljaar.slice(5, 9)}-08-31` }

  const afwezigheden = (await trx`
    select to_char(start, 'YYYY-MM-DD') as start,
           to_char(einde, 'YYYY-MM-DD') as einde,
           code
    from core.afwezigheid
    where persoon_id = ${invoer.persoonId}
      and einde >= ${grenzen.start} and start <= ${grenzen.einde}
    order by start`) as unknown as { start: string; einde: string; code: string }[]

  const vrijeDagen = await haalVrijeDagen(trx, schooljaar)
  const contingent = await haalContingent(trx, schooljaar)

  // platformleden die op de peildatum niet zelf afwezig zijn en niet al
  // een actieve vervanging draaien
  const vrijePlatformleden = (await trx`
    select p.persoon_id
    from core.platformlid p
    where p.schooljaar = ${schooljaar}
      and not exists (
        select 1 from core.afwezigheid a
        where a.persoon_id = p.persoon_id
          and a.start <= ${invoer.peildatum} and a.einde >= ${invoer.peildatum})
      and not exists (
        select 1 from core.vervanging v
        where v.vervanger_id = p.persoon_id
          and v.status = 'actief'
          and v.start <= ${invoer.peildatum} and v.einde >= ${invoer.peildatum})`) as unknown as {
    persoon_id: string
  }[]

  const advies = bepaalKanaal({
    schooljaar,
    niveau: invoer.niveau,
    afwezigheden,
    peilDatum: invoer.peildatum,
    vrijeDagen: [...vrijeDagen],
    contingentRestant: contingent.restant,
    platformlidBeschikbaar: vrijePlatformleden.length > 0,
  })

  return {
    ok: true,
    advies: { ...advies, contingent, platformledenVrij: vrijePlatformleden.length, schooljaar },
  }
}

export interface KandidaatRij {
  persoonId: string
  naam: string
  voorstel: ReturnType<typeof stelVervangersVoor>[number]
}

/**
 * Vervangersvoorstellen voor een datum: alle personeelsleden behalve de
 * afwezige, met beschikbaarheid (geen eigen afwezigheid of vervanging die
 * dag), platformlidmaatschap en de billijkheidsteller uit de historiek.
 *
 * Bevoegdheid (bekwaamheidsbewijzen) is nog niet gemodelleerd — tot dan telt
 * iedereen als bevoegd (⚠ validatievraag; het veld bestaat al in de regels).
 */
export async function kandidatenVoorDatum(
  trx: Trx,
  invoer: { afwezigeId: string; datum: string },
): Promise<KandidaatRij[]> {
  const schooljaar = schooljaarVan(invoer.datum)
  const grenzen = { start: `${schooljaar.slice(0, 4)}-09-01`, einde: `${schooljaar.slice(5, 9)}-08-31` }

  const rijen = (await trx`
    select p.id,
           p.naam,
           exists (select 1 from core.platformlid pl
                   where pl.persoon_id = p.id and pl.schooljaar = ${schooljaar}) as platformlid,
           exists (select 1 from core.afwezigheid a
                   where a.persoon_id = p.id
                     and a.start <= ${invoer.datum} and a.einde >= ${invoer.datum}) as afwezig,
           exists (select 1 from core.vervanging v
                   where v.vervanger_id = p.id and v.status = 'actief'
                     and v.start <= ${invoer.datum} and v.einde >= ${invoer.datum}) as bezet,
           (select count(*)::int from core.vervanging v
            where v.vervanger_id = p.id and v.status = 'actief'
              and v.start >= ${grenzen.start} and v.start <= ${grenzen.einde}) as teller
    from core.persoon p
    where p.id <> ${invoer.afwezigeId}
    order by p.naam`) as unknown as {
    id: string
    naam: string
    platformlid: boolean
    afwezig: boolean
    bezet: boolean
    teller: number
  }[]

  const kandidaten: VervangerKandidaat[] = rijen.map((r) => ({
    id: r.id,
    platformlid: r.platformlid,
    bevoegd: true,
    beschikbaar: !r.afwezig && !r.bezet,
    teller: r.teller,
  }))

  const voorstellen = stelVervangersVoor(kandidaten)
  const opNaam = new Map(rijen.map((r) => [r.id, r.naam]))
  return voorstellen.map((v) => ({
    persoonId: v.kandidaatId,
    naam: opNaam.get(v.kandidaatId) ?? '',
    voorstel: v,
  }))
}

export { noodscenarios, type NoodInvoer }
