import {
  bepaalEscalatie,
  berekenPerAmbt,
  berekenTeller,
  evalueerDrempel,
  PERS_2019_03,
  prognosePeildatum,
  type Aanstelling,
  type Afwezigheid,
  type ISODatum,
  type TellerResultaat,
} from '@draagvlak/telregels'
import { metTenantContext, type Db } from '../../db.js'
import { schrijfAudit } from './audit.js'

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
  ambt: string
  type: string
  datum: string
  status: string
  escalatieniveau: number
}

/**
 * Drempeldetectie over alle personen van de tenant (deadline-engine,
 * regelparameters.md § 3): idempotent herberekenen van de TADD-deadlines.
 *
 * Invarianten (aangescherpt na de adversariële review van deze module):
 * - drempel (prognose 30/6) bereikt → deadlines van het lopende schooljaar
 *   aanmaken of heropenen; bestaande open deadlines van eerdere schooljaren
 *   blijven ONAANGEROERD open en escaleren door tot "verstreken" — deadlines
 *   verstrijken nooit stil, ook niet over een schooljaargrens heen;
 * - drempel niet (meer) bereikt → open deadlines intrekken (status
 *   'vervallen', casus D3) met een waarheidsgetrouwe reden — dit is het
 *   ENIGE pad naar 'vervallen', dus de auditreden klopt altijd;
 * - ook ambten die alleen nog in bestaande deadlines voorkomen (hernoemd of
 *   verwijderd in de aanstellingen) worden gereconcilieerd;
 * - status 'geregistreerd' wordt in geen enkele richting aangeraakt;
 * - elke statusovergang én elke escalatieniveau-wijziging krijgt een
 *   audittrail-regel;
 * - gelijktijdige runs voor dezelfde tenant serialiseren via een
 *   advisory lock — geen unique-constraint-botsingen.
 *
 * De aanroep gebeurt nu via het admin-endpoint; een geplande job volgt in
 * een eigen ADR.
 */
export async function herberekenDeadlines(
  db: Db,
  tenantId: string,
  vandaag: ISODatum,
  actorId: string | null = null,
): Promise<HerberekenResultaat> {
  const peildatum = prognosePeildatum(vandaag)

  return metTenantContext(db, tenantId, async (trx) => {
    await trx`select pg_advisory_xact_lock(hashtext(${'deadlines:' + tenantId}))`

    const resultaat: HerberekenResultaat = {
      peildatum,
      personenVerwerkt: 0,
      aangemaakt: 0,
      bijgewerkt: 0,
      vervallen: 0,
    }

    // drie tenant-brede reads (RLS scopet al), in JS gegroepeerd per persoon:
    // ~5 queries per run i.p.v. 3 per persoon (N+1, ~6.000 bij 2000 personeelsleden)
    const personen = (await trx`select id from core.persoon order by id`) as unknown as {
      id: string
    }[]

    const perPersoonAanstellingen = groepeer(
      (await trx`
        select persoon_id,
               to_char(start, 'YYYY-MM-DD') as start,
               to_char(einde, 'YYYY-MM-DD') as einde,
               ambt,
               school_id
        from core.aanstelling
        order by persoon_id, start`) as unknown as (Aanstelling & {
        persoon_id: string
        school_id: string
      })[],
    )

    const perPersoonAfwezigheden = groepeer(
      (await trx`
        select persoon_id,
               to_char(start, 'YYYY-MM-DD') as start,
               to_char(einde, 'YYYY-MM-DD') as einde,
               code
        from core.afwezigheid
        order by persoon_id, start`) as unknown as (Afwezigheid & { persoon_id: string })[],
    )

    const perPersoonDeadlines = groepeer(
      (await trx`
        select persoon_id, id, ambt, type, to_char(datum, 'YYYY-MM-DD') as datum, status, escalatieniveau
        from core.deadline`) as unknown as (DeadlineRij & { persoon_id: string })[],
    )

    for (const persoon of personen) {
      const aanstellingen = perPersoonAanstellingen.get(persoon.id) ?? []
      const afwezigheden = perPersoonAfwezigheden.get(persoon.id) ?? []
      const bestaandeAlle = perPersoonDeadlines.get(persoon.id) ?? []

      const perAmbt = berekenPerAmbt({ aanstellingen, afwezigheden, parameters: PARAMETERS, peildatum })

      // reconcilieer ook ambten die alleen nog in deadlines bestaan (verdwenen ambt)
      const ambten = new Set<string>([...perAmbt.keys(), ...bestaandeAlle.map((b) => b.ambt)])

      for (const ambt of ambten) {
        const teller: TellerResultaat =
          perAmbt.get(ambt) ??
          berekenTeller({ aanstellingen: [], afwezigheden, parameters: PARAMETERS, peildatum })
        const drempel = evalueerDrempel(teller, PARAMETERS)
        const gewenst =
          drempel.deadlines !== undefined
            ? [
                { type: 'TADD_kandidaatstelling', datum: drempel.deadlines.kandidaatstellingTadd },
                { type: 'TADD_beoordeling', datum: drempel.deadlines.beoordeling },
              ]
            : []

        const bestaande = bestaandeAlle.filter((b) => b.ambt === ambt)
        const schoolId = aanstellingen.filter((a) => a.ambt === ambt).at(-1)?.school_id ?? null
        const berekening = {
          peildatum,
          dagenTotaal: teller.dagenTotaal,
          dagenEffectief: teller.dagenEffectief,
          parameterbronnen: teller.verantwoording.parameterbronnen,
        }

        for (const w of gewenst) {
          const escalatie = bepaalEscalatie(w.datum, vandaag)
          const match = bestaande.find((b) => b.type === w.type && b.datum === w.datum)

          if (match === undefined) {
            const [rij] = (await trx`
              insert into core.deadline (tenant_id, persoon_id, school_id, ambt, type, datum, escalatieniveau, berekening)
              values (${tenantId}, ${persoon.id}, ${schoolId}, ${ambt}, ${w.type}, ${w.datum}, ${escalatie.niveau}, ${trx.json(berekening)})
              returning id`) as unknown as { id: string }[]
            await schrijfAudit(trx, tenantId, actorId, 'deadline', rij!.id, 'deadline aangemaakt (drempeldetectie)')
            resultaat.aangemaakt += 1
          } else if (match.status === 'vervallen') {
            await trx`
              update core.deadline
              set status = 'open', escalatieniveau = ${escalatie.niveau}, school_id = ${schoolId},
                  berekening = ${trx.json(berekening)}, bijgewerkt_op = now()
              where id = ${match.id}`
            await schrijfAudit(
              trx,
              tenantId,
              actorId,
              'deadline',
              match.id,
              `deadline heropend (drempel opnieuw bereikt; escalatieniveau ${match.escalatieniveau} → ${escalatie.niveau})`,
            )
            resultaat.bijgewerkt += 1
          } else if (match.status === 'open' && match.escalatieniveau !== escalatie.niveau) {
            await trx`
              update core.deadline
              set escalatieniveau = ${escalatie.niveau}, bijgewerkt_op = now()
              where id = ${match.id}`
            await schrijfAudit(
              trx,
              tenantId,
              actorId,
              'deadline',
              match.id,
              `escalatieniveau ${match.escalatieniveau} → ${escalatie.niveau} (${escalatie.dagenResterend} dagen tot deadline)`,
            )
            resultaat.bijgewerkt += 1
          }
          // status 'geregistreerd': nooit aanraken
        }

        for (const b of bestaande) {
          if (b.status !== 'open') continue
          if (gewenst.some((w) => w.type === b.type && w.datum === b.datum)) continue

          if (drempel.drempelBereikt) {
            // deadline van een eerder schooljaar terwijl de drempel nog geldt:
            // blijft open en escaleert door (tot "verstreken") — nooit stil intrekken
            const escalatie = bepaalEscalatie(b.datum, vandaag)
            if (escalatie.niveau !== b.escalatieniveau) {
              await trx`
                update core.deadline
                set escalatieniveau = ${escalatie.niveau}, bijgewerkt_op = now()
                where id = ${b.id}`
              await schrijfAudit(
                trx,
                tenantId,
                actorId,
                'deadline',
                b.id,
                `escalatieniveau ${b.escalatieniveau} → ${escalatie.niveau} (${escalatie.dagenResterend} dagen tot deadline${escalatie.verstreken ? ' — verstreken' : ''})`,
              )
              resultaat.bijgewerkt += 1
            }
          } else {
            await trx`
              update core.deadline
              set status = 'vervallen', berekening = ${trx.json(berekening)}, bijgewerkt_op = now()
              where id = ${b.id}`
            await schrijfAudit(
              trx,
              tenantId,
              actorId,
              'deadline',
              b.id,
              `deadline ingetrokken (${drempel.redenen.join('; ')})`,
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

function groepeer<T extends { persoon_id: string }>(rijen: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const rij of rijen) {
    const lijst = map.get(rij.persoon_id)
    if (lijst === undefined) map.set(rij.persoon_id, [rij])
    else lijst.push(rij)
  }
  return map
}
