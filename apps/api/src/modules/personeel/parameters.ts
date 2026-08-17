import { PERS_2019_03, type ISODatum, type ParameterVersie } from '@draagvlak/telregels'
import { metTenantContext, type Db, type Trx } from '../../db.js'
import { schrijfAudit } from './audit.js'

/**
 * Regelparameters per tenant (regelparameters.md § 2), met het vier-ogen-
 * principe uit de toegangsmatrix: één beheerder stelt voor, een ándere
 * bekrachtigt — de databank dwingt dat af met een check constraint, deze
 * service met nette foutantwoorden.
 *
 * Zonder actieve tenant-rijen geldt de startset uit het domeinpakket; de
 * bronvermelding in elke verantwoording maakt zichtbaar welke set gold.
 */

interface ParameterRij {
  geldig_vanaf: string
  geldig_tot: string | null
  bron: string
  drempel_totaal: number
  drempel_effectief: number
  max_per_schooljaar: number
  telregels: ParameterVersie['telregels']
}

export async function haalActieveParameters(trx: Trx): Promise<ParameterVersie[]> {
  const rijen = (await trx`
    select to_char(geldig_vanaf, 'YYYY-MM-DD') as geldig_vanaf,
           to_char(geldig_tot, 'YYYY-MM-DD') as geldig_tot,
           bron, drempel_totaal, drempel_effectief, max_per_schooljaar, telregels
    from core.regelparameter
    where status = 'actief'
    order by geldig_vanaf`) as unknown as ParameterRij[]

  if (rijen.length === 0) return [PERS_2019_03]

  return rijen.map((r) => ({
    geldigVanaf: r.geldig_vanaf,
    ...(r.geldig_tot !== null ? { geldigTot: r.geldig_tot } : {}),
    bron: r.bron,
    drempelTotaal: r.drempel_totaal,
    drempelEffectief: r.drempel_effectief,
    maxPerSchooljaar: r.max_per_schooljaar,
    telregels: r.telregels,
  }))
}

export interface VoorstelInvoer {
  geldigVanaf: ISODatum
  geldigTot?: ISODatum
  bron: string
  drempelTotaal: number
  drempelEffectief: number
  maxPerSchooljaar: number
  telregels: ParameterVersie['telregels']
}

export async function stelParameterVoor(
  db: Db,
  tenantId: string,
  actorId: string,
  invoer: VoorstelInvoer,
): Promise<{ id: string; status: 'voorgesteld' }> {
  return metTenantContext(db, tenantId, async (trx) => {
    const [rij] = (await trx`
      insert into core.regelparameter
        (tenant_id, geldig_vanaf, geldig_tot, bron, drempel_totaal, drempel_effectief,
         max_per_schooljaar, telregels, voorgesteld_door)
      values
        (${tenantId}, ${invoer.geldigVanaf}, ${invoer.geldigTot ?? null}, ${invoer.bron},
         ${invoer.drempelTotaal}, ${invoer.drempelEffectief}, ${invoer.maxPerSchooljaar},
         ${trx.json({ ...invoer.telregels })}, ${actorId})
      returning id`) as unknown as { id: string }[]
    await schrijfAudit(
      trx,
      tenantId,
      actorId,
      'regelparameter',
      rij!.id,
      `parameterversie voorgesteld (geldig vanaf ${invoer.geldigVanaf}, bron: ${invoer.bron})`,
    )
    return { id: rij!.id, status: 'voorgesteld' as const }
  })
}

export type BeslisUitkomst =
  | { ok: true; id: string; status: 'actief' | 'afgewezen' }
  | { ok: false; status: 403 | 404 | 409; fout: string }

export async function beslisOverParameter(
  db: Db,
  tenantId: string,
  actorId: string,
  parameterId: string,
  beslissing: 'bekrachtig' | 'wijs_af',
): Promise<BeslisUitkomst> {
  return metTenantContext(db, tenantId, async (trx) => {
    const rijen = (await trx`
      select id, status, voorgesteld_door
      from core.regelparameter
      where id = ${parameterId}
      for update`) as unknown as { id: string; status: string; voorgesteld_door: string }[]
    const rij = rijen[0]

    if (rij === undefined) {
      return { ok: false as const, status: 404 as const, fout: 'parameterversie niet gevonden' }
    }
    if (rij.status !== 'voorgesteld') {
      return {
        ok: false as const,
        status: 409 as const,
        fout: `parameterversie is al ${rij.status}`,
      }
    }
    if (beslissing === 'bekrachtig' && rij.voorgesteld_door === actorId) {
      return {
        ok: false as const,
        status: 403 as const,
        fout: 'vier-ogen-principe: de voorsteller kan niet zelf bekrachtigen',
      }
    }

    const nieuweStatus = beslissing === 'bekrachtig' ? 'actief' : 'afgewezen'
    await trx`
      update core.regelparameter
      set status = ${nieuweStatus},
          bekrachtigd_door = ${beslissing === 'bekrachtig' ? actorId : null},
          bijgewerkt_op = now()
      where id = ${rij.id}`
    await schrijfAudit(
      trx,
      tenantId,
      actorId,
      'regelparameter',
      rij.id,
      beslissing === 'bekrachtig'
        ? 'parameterversie bekrachtigd (vier-ogen)'
        : 'parameterversie afgewezen',
    )
    return { ok: true as const, id: rij.id, status: nieuweStatus as 'actief' | 'afgewezen' }
  })
}
