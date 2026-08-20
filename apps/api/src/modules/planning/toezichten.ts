import { verdeelBeurten } from '@draagvlak/planregels'
import { dagenIn } from '@draagvlak/telregels'
import type { Trx } from '../../db.js'
import { schrijfAudit } from '../personeel/audit.js'

/**
 * Beurtrolgenerator (module P2): verdeelt de toezichtbeurten van één soort
 * over een periode — deterministisch, billijk (laagste historische teller
 * eerst) en met respect voor de schoolkalender: op vakantie-, feest- en
 * lesvrije dagen wordt geen toezicht gepland.
 *
 * Vereenvoudiging (⚠ validatievraag): élke kalenderperiode blokkeert de hele
 * dag, ook een halve pedagogische studiedag. Verfijning per dagdeel volgt
 * zodra de praktijk erom vraagt.
 */

export interface GenereerUitkomst {
  ok: boolean
  status?: 404 | 409
  fout?: string
  aangemaakt?: number
  overgeslagen?: string[]
  verdeling?: Record<string, number>
}

export async function genereerBeurten(
  trx: Trx,
  tenantId: string,
  actorId: string,
  invoer: { soortId: string; van: string; tot: string; persoonIds: readonly string[] },
): Promise<GenereerUitkomst> {
  const soorten = (await trx`
    select id, naam, weekdagen from core.toezichtsoort where id = ${invoer.soortId}`) as unknown as {
    id: string
    naam: string
    weekdagen: number[]
  }[]
  const soort = soorten[0]
  if (soort === undefined) return { ok: false, status: 404, fout: 'toezichtsoort niet gevonden' }

  // dagen zonder school: alle kalenderperiodes die de periode raken
  const vrijeDagen = new Set<string>()
  const periodes = (await trx`
    select to_char(start, 'YYYY-MM-DD') as start, to_char(einde, 'YYYY-MM-DD') as einde
    from core.kalenderperiode
    where start <= ${invoer.tot} and einde >= ${invoer.van}`) as unknown as {
    start: string
    einde: string
  }[]
  for (const p of periodes) for (const dag of dagenIn(p.start, p.einde)) vrijeDagen.add(dag)

  const datums: string[] = []
  const overgeslagen: string[] = []
  for (const dag of dagenIn(invoer.van, invoer.tot)) {
    const weekdag = new Date(`${dag}T00:00Z`).getUTCDay()
    if (!soort.weekdagen.includes(weekdag)) continue
    if (vrijeDagen.has(dag)) {
      overgeslagen.push(dag)
      continue
    }
    datums.push(dag)
  }

  // bestaande beurten in de periode voor deze soort: niet dubbel plannen
  const bestaande = (await trx`
    select to_char(datum, 'YYYY-MM-DD') as datum from core.toezichtbeurt
    where soort_id = ${soort.id} and datum between ${invoer.van} and ${invoer.tot}`) as unknown as {
    datum: string
  }[]
  const alBezet = new Set(bestaande.map((b) => b.datum))
  const tePlannen = datums.filter((d) => !alBezet.has(d))
  if (tePlannen.length === 0) {
    return { ok: true, aangemaakt: 0, overgeslagen, verdeling: {} }
  }

  // billijkheid: historische teller per kandidaat voor deze soort (alle tijd)
  const historiek = (await trx`
    select persoon_id, count(*)::int as aantal from core.toezichtbeurt
    where soort_id = ${soort.id} and persoon_id is not null
    group by persoon_id`) as unknown as { persoon_id: string; aantal: number }[]
  const tellerVan = new Map(historiek.map((h) => [h.persoon_id, h.aantal]))
  const kandidaten = invoer.persoonIds.map((id) => ({ id, teller: tellerVan.get(id) ?? 0 }))

  const toewijzingen = verdeelBeurten(tePlannen, kandidaten)

  const verdeling: Record<string, number> = {}
  for (const t of toewijzingen) {
    await trx`
      insert into core.toezichtbeurt (tenant_id, soort_id, datum, persoon_id)
      values (${tenantId}, ${soort.id}, ${t.datum}, ${t.kandidaatId})`
    verdeling[t.kandidaatId] = (verdeling[t.kandidaatId] ?? 0) + 1
  }
  await schrijfAudit(
    trx,
    tenantId,
    actorId,
    'toezichtsoort',
    soort.id,
    `beurtrol gegenereerd: ${toewijzingen.length} beurten voor '${soort.naam}' (${invoer.van} t/m ${invoer.tot}, ${overgeslagen.length} kalendervrije dagen overgeslagen)`,
  )

  return { ok: true, aangemaakt: toewijzingen.length, overgeslagen, verdeling }
}
