import {
  bepaalEscalatie,
  berekenPerAmbt,
  evalueerDrempel,
  PERS_2019_03,
  prognosePeildatum,
  type Aanstelling,
  type Afwezigheid,
  type ISODatum,
} from '@draagvlak/telregels'
import { metTenantContext, type Db, type Trx } from '../../db.js'

const PARAMETERS = [PERS_2019_03]

export interface HerberekenResultaat {
  peildatum: ISODatum
  personenVerwerkt: number
  aangemaakt: number
  bijgewerkt: number
  vervallen: number
}

interface DeadlineRij {
  id: string
  type: string
  datum: string
  status: string
  escalatieniveau: number
}

/**
 * Drempeldetectie over alle personen van de tenant (deadline-engine,
 * regelparameters.md § 3): idempotent herberekenen van de TADD-deadlines.
 *
 * - drempel (prognose 30/6) bereikt → deadlines aanmaken of heropenen,
 *   escalatieniveau actualiseren op basis van `vandaag`;
 * - drempel niet (meer) bereikt → open deadlines intrekken (status
 *   'vervallen', casus D3) — nooit verwijderen;
 * - status 'geregistreerd' wordt in geen enkele richting aangeraakt.
 *
 * Elke aanmaak, heropening en intrekking krijgt een audittrail-regel.
 * De aanroep gebeurt nu via het admin-endpoint; een geplande job (scheduler)
 * volgt in een eigen ADR.
 */
export async function herberekenDeadlines(
  db: Db,
  tenantId: string,
  vandaag: ISODatum,
): Promise<HerberekenResultaat> {
  const peildatum = prognosePeildatum(vandaag)

  return metTenantContext(db, tenantId, async (trx) => {
    const resultaat: HerberekenResultaat = {
      peildatum,
      personenVerwerkt: 0,
      aangemaakt: 0,
      bijgewerkt: 0,
      vervallen: 0,
    }

    const personen = (await trx`select id from core.persoon order by id`) as unknown as {
      id: string
    }[]

    for (const persoon of personen) {
      const aanstellingen = (await trx`
        select to_char(start, 'YYYY-MM-DD') as start,
               to_char(einde, 'YYYY-MM-DD') as einde,
               ambt,
               school_id
        from core.aanstelling
        where persoon_id = ${persoon.id}
        order by start`) as unknown as (Aanstelling & { school_id: string })[]

      const afwezigheden = (await trx`
        select to_char(start, 'YYYY-MM-DD') as start,
               to_char(einde, 'YYYY-MM-DD') as einde,
               code
        from core.afwezigheid
        where persoon_id = ${persoon.id}
        order by start`) as unknown as Afwezigheid[]

      const perAmbt = berekenPerAmbt({ aanstellingen, afwezigheden, parameters: PARAMETERS, peildatum })

      for (const [ambt, teller] of perAmbt) {
        const drempel = evalueerDrempel(teller, PARAMETERS)
        const gewenst =
          drempel.deadlines !== undefined
            ? [
                { type: 'TADD_kandidaatstelling', datum: drempel.deadlines.kandidaatstellingTadd },
                { type: 'TADD_beoordeling', datum: drempel.deadlines.beoordeling },
              ]
            : []

        const bestaande = (await trx`
          select id, type, to_char(datum, 'YYYY-MM-DD') as datum, status, escalatieniveau
          from core.deadline
          where persoon_id = ${persoon.id} and ambt = ${ambt}`) as unknown as DeadlineRij[]

        const berekening = {
          peildatum,
          dagenTotaal: teller.dagenTotaal,
          dagenEffectief: teller.dagenEffectief,
          parameterbronnen: teller.verantwoording.parameterbronnen,
        }
        const schoolId = aanstellingen.at(-1)?.school_id ?? null

        for (const w of gewenst) {
          const escalatie = bepaalEscalatie(w.datum, vandaag)
          const match = bestaande.find((b) => b.type === w.type && b.datum === w.datum)

          if (match === undefined) {
            const [rij] = (await trx`
              insert into core.deadline (tenant_id, persoon_id, school_id, ambt, type, datum, escalatieniveau, berekening)
              values (${tenantId}, ${persoon.id}, ${schoolId}, ${ambt}, ${w.type}, ${w.datum}, ${escalatie.niveau}, ${trx.json(berekening)})
              returning id`) as unknown as { id: string }[]
            await schrijfAudit(trx, tenantId, rij!.id, 'deadline aangemaakt (drempeldetectie)')
            resultaat.aangemaakt += 1
          } else if (match.status === 'vervallen') {
            await trx`
              update core.deadline
              set status = 'open', escalatieniveau = ${escalatie.niveau},
                  berekening = ${trx.json(berekening)}, bijgewerkt_op = now()
              where id = ${match.id}`
            await schrijfAudit(trx, tenantId, match.id, 'deadline heropend (drempel opnieuw bereikt)')
            resultaat.bijgewerkt += 1
          } else if (match.status === 'open' && match.escalatieniveau !== escalatie.niveau) {
            await trx`
              update core.deadline
              set escalatieniveau = ${escalatie.niveau}, bijgewerkt_op = now()
              where id = ${match.id}`
            resultaat.bijgewerkt += 1
          }
        }

        for (const b of bestaande) {
          const nogGewenst = gewenst.some((w) => w.type === b.type && w.datum === b.datum)
          if (b.status === 'open' && !nogGewenst) {
            await trx`
              update core.deadline
              set status = 'vervallen', berekening = ${trx.json(berekening)}, bijgewerkt_op = now()
              where id = ${b.id}`
            await schrijfAudit(
              trx,
              tenantId,
              b.id,
              `deadline ingetrokken: drempel niet meer bereikt (${drempel.redenen.join('; ')})`,
            )
            resultaat.vervallen += 1
          }
        }
      }

      resultaat.personenVerwerkt += 1
    }

    return resultaat
  })
}

async function schrijfAudit(
  trx: Trx,
  tenantId: string,
  deadlineId: string,
  reden: string,
): Promise<void> {
  await trx`
    insert into core.audit_log (tenant_id, actor_id, actie, object_type, object_id, context)
    values (${tenantId}, null, 'schrijf', 'deadline', ${deadlineId}, ${trx.json({ reden, bron: 'deadline-engine' })})`
}
