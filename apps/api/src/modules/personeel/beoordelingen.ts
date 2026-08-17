import { schooljaarVan, type ISODatum } from '@draagvlak/telregels'
import { metTenantContext, type Db } from '../../db.js'
import { schrijfAudit } from './audit.js'

export type BeoordelingResultaat =
  | 'positief'
  | 'met_werkpunten'
  | 'negatief'
  | 'stilzwijgend_positief'

export interface RegistreerInvoer {
  resultaat: BeoordelingResultaat
  opmerking?: string
  vandaag: ISODatum
}

export type RegistreerUitkomst =
  | {
      ok: true
      beoordeling: {
        id: string
        persoonId: string
        ambt: string
        schooljaar: string
        resultaat: BeoordelingResultaat
      }
      deadline: { id: string; status: 'geregistreerd' }
    }
  | { ok: false; status: 400 | 404 | 409; fout: string }

/**
 * Registreert een TADD-beoordeling tegen een open beoordelingsdeadline en
 * sluit daarmee de lus van module D: de deadline gaat naar 'geregistreerd'
 * (de status die de herberekenengine nooit meer aanraakt).
 *
 * Casus D4 — geen beoordeling vóór de deadline geldt decretaal als positief —
 * wordt vastgelegd als resultaat 'stilzwijgend_positief', en kan pas ná het
 * verstrijken van de deadline: een mens bevestigt de decretale realiteit, het
 * systeem registreert nooit stil zelf. (⚠ TE VALIDEREN met de personeelsdienst
 * of automatische vastlegging bij de schooljaarovergang gewenst is.)
 *
 * Een laattijdige gewone beoordeling (na de deadline) blijft registreerbaar:
 * vastleggen wat feitelijk gebeurd is, is precies de bedoeling.
 */
export async function registreerBeoordeling(
  db: Db,
  tenantId: string,
  actorId: string,
  deadlineId: string,
  invoer: RegistreerInvoer,
): Promise<RegistreerUitkomst> {
  return metTenantContext(db, tenantId, async (trx) => {
    // rijlock: gelijktijdige registraties op dezelfde deadline serialiseren
    const deadlines = (await trx`
      select id, persoon_id, school_id, ambt, type, to_char(datum, 'YYYY-MM-DD') as datum, status
      from core.deadline
      where id = ${deadlineId}
      for update`) as unknown as {
      id: string
      persoon_id: string
      school_id: string | null
      ambt: string
      type: string
      datum: string
      status: string
    }[]
    const deadline = deadlines[0]

    if (deadline === undefined) {
      return { ok: false as const, status: 404 as const, fout: 'deadline niet gevonden' }
    }
    if (deadline.type !== 'TADD_beoordeling') {
      return {
        ok: false as const,
        status: 400 as const,
        fout: 'alleen op een beoordelingsdeadline kan een beoordeling geregistreerd worden',
      }
    }
    if (deadline.status === 'geregistreerd') {
      return { ok: false as const, status: 409 as const, fout: 'deadline is al geregistreerd' }
    }
    if (deadline.status === 'vervallen') {
      return {
        ok: false as const,
        status: 409 as const,
        fout: 'deadline is vervallen (drempel niet meer bereikt) — controleer het dossier',
      }
    }
    if (invoer.resultaat === 'stilzwijgend_positief' && invoer.vandaag <= deadline.datum) {
      return {
        ok: false as const,
        status: 400 as const,
        fout: `stilzwijgend positief kan pas nadat de deadline (${deadline.datum}) verstreken is`,
      }
    }

    const schooljaar = schooljaarVan(deadline.datum)

    // voor-check op de unieke sleutel (persoon, ambt, schooljaar); de
    // constraint zelf blijft de sluitsteen
    const bestaande = await trx`
      select id from core.beoordeling
      where persoon_id = ${deadline.persoon_id} and ambt = ${deadline.ambt} and schooljaar = ${schooljaar}`
    if (bestaande.length > 0) {
      return {
        ok: false as const,
        status: 409 as const,
        fout: `er is al een beoordeling voor dit ambt in schooljaar ${schooljaar}`,
      }
    }

    const [rij] = (await trx`
      insert into core.beoordeling
        (tenant_id, persoon_id, school_id, deadline_id, ambt, schooljaar, resultaat, geregistreerd_door, opmerking)
      values
        (${tenantId}, ${deadline.persoon_id}, ${deadline.school_id}, ${deadline.id}, ${deadline.ambt},
         ${schooljaar}, ${invoer.resultaat}, ${actorId}, ${invoer.opmerking ?? null})
      returning id`) as unknown as { id: string }[]

    await trx`
      update core.deadline
      set status = 'geregistreerd', bijgewerkt_op = now()
      where id = ${deadline.id}`

    await schrijfAudit(
      trx,
      tenantId,
      actorId,
      'beoordeling',
      rij!.id,
      `beoordeling geregistreerd: ${invoer.resultaat} (${deadline.ambt}, ${schooljaar})`,
    )
    await schrijfAudit(
      trx,
      tenantId,
      actorId,
      'deadline',
      deadline.id,
      `deadline geregistreerd (beoordeling: ${invoer.resultaat})`,
    )

    return {
      ok: true as const,
      beoordeling: {
        id: rij!.id,
        persoonId: deadline.persoon_id,
        ambt: deadline.ambt,
        schooljaar,
        resultaat: invoer.resultaat,
      },
      deadline: { id: deadline.id, status: 'geregistreerd' as const },
    }
  })
}
