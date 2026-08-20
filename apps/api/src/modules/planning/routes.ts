import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { dagenTussen, isGeldigeKalenderdatum } from '@draagvlak/telregels'
import {
  schooljaarGrenzen,
  valideerKalender,
  type Dagdeel,
  type KalenderType,
  type Onderwijsniveau,
} from '@draagvlak/planregels'
import { metTenantContext, type Db } from '../../db.js'
import { heeftRol, type AuthContext, type AuthHandler } from '../../auth/plugin.js'
import { schrijfAudit } from '../personeel/audit.js'
import { haalKalender } from './kalender.js'
import { genereerBeurten } from './toezichten.js'

const UUID_PATROON =
  '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
const SCHOOLJAAR_PATROON = '^\\d{4}-\\d{4}$'

export interface PlanningOpties {
  authHandler: AuthHandler
}

/**
 * Module P1 — schoolkalender (planning.md): vakanties, facultatieve
 * verlofdagen, pedagogische studiedagen en lesvrije dagen, gevalideerd tegen
 * het kalenderregelboek van het schooljaar (@draagvlak/planregels).
 *
 * Rollen: iedereen met een account leest de kalender; beheren = BG of DIR.
 * Regelboek-fouten blokkeren opslaan (422 mét meldingen); waarschuwingen
 * (bv. opvangplicht) informeren zonder te blokkeren — transparantie boven
 * betutteling, want het regelboek zelf is ⚠ TE VALIDEREN.
 */
export function planningModule(db: Db, opties: PlanningOpties): FastifyPluginAsync {
  const { authHandler } = opties

  return async function (app: FastifyInstance) {
    app.addHook('onRequest', authHandler)

    app.get(
      '/api/v1/kalender',
      {
        schema: {
          querystring: {
            type: 'object',
            required: ['schooljaar'],
            properties: {
              schooljaar: { type: 'string', pattern: SCHOOLJAAR_PATROON },
              niveau: { type: 'string', enum: ['basis', 'secundair'] },
            },
            additionalProperties: false,
          },
        },
      },
      async (verzoek, antwoord) => {
        const auth = verzoek.auth as AuthContext
        const { schooljaar, niveau = 'basis' } = verzoek.query as {
          schooljaar: string
          niveau?: Onderwijsniveau
        }
        try {
          schooljaarGrenzen(schooljaar)
        } catch {
          return antwoord.code(400).send({ fout: `ongeldig schooljaar: ${schooljaar}` })
        }

        const periodes = await metTenantContext(db, auth.tenantId, (trx) =>
          haalKalender(trx, schooljaar),
        )
        return {
          schooljaar,
          niveau,
          periodes,
          meldingen: valideerKalender(periodes, schooljaar, niveau),
        }
      },
    )

    app.post(
      '/api/v1/kalender',
      {
        schema: {
          body: {
            type: 'object',
            required: ['schooljaar', 'type', 'start', 'einde'],
            properties: {
              schooljaar: { type: 'string', pattern: SCHOOLJAAR_PATROON },
              type: {
                type: 'string',
                enum: [
                  'vakantie',
                  'facultatieve_verlofdag',
                  'pedagogische_studiedag',
                  'wettelijke_feestdag',
                  'lesvrij_overmacht',
                ],
              },
              start: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
              einde: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
              dagdeel: { type: 'string', enum: ['voormiddag', 'namiddag', 'heel'] },
              omschrijving: { type: 'string', maxLength: 300 },
              opvangVoorzien: { type: 'boolean' },
              schoolId: { type: 'string', pattern: UUID_PATROON },
              niveau: { type: 'string', enum: ['basis', 'secundair'] },
            },
            additionalProperties: false,
          },
        },
      },
      async (verzoek, antwoord) => {
        const auth = verzoek.auth as AuthContext
        if (!heeftRol(auth, 'BG', 'DIR')) {
          return antwoord.code(403).send({ fout: 'kalenderbeheer vereist de beheerders- of directeursrol' })
        }
        const lichaam = verzoek.body as {
          schooljaar: string
          type: KalenderType
          start: string
          einde: string
          dagdeel?: Dagdeel
          omschrijving?: string
          opvangVoorzien?: boolean
          schoolId?: string
          niveau?: Onderwijsniveau
        }
        const niveau = lichaam.niveau ?? 'basis'
        const dagdeel = lichaam.dagdeel ?? 'heel'

        if (!isGeldigeKalenderdatum(lichaam.start) || !isGeldigeKalenderdatum(lichaam.einde)) {
          return antwoord.code(400).send({ fout: 'ongeldige kalenderdatum' })
        }
        try {
          schooljaarGrenzen(lichaam.schooljaar)
        } catch {
          return antwoord.code(400).send({ fout: `ongeldig schooljaar: ${lichaam.schooljaar}` })
        }

        const uitkomst = await metTenantContext(db, auth.tenantId, async (trx) => {
          const bestaande = await haalKalender(trx, lichaam.schooljaar)
          const nieuwe = {
            type: lichaam.type,
            start: lichaam.start,
            einde: lichaam.einde,
            dagdeel,
            opvangVoorzien: lichaam.opvangVoorzien ?? false,
          }
          const meldingen = valideerKalender([...bestaande, nieuwe], lichaam.schooljaar, niveau)
          if (meldingen.some((m) => m.ernst === 'fout')) {
            return { ok: false as const, meldingen }
          }

          const [rij] = (await trx`
            insert into core.kalenderperiode
              (tenant_id, school_id, schooljaar, type, start, einde, dagdeel, omschrijving, opvang_voorzien, aangemaakt_door)
            values
              (${auth.tenantId}, ${lichaam.schoolId ?? null}, ${lichaam.schooljaar}, ${lichaam.type},
               ${lichaam.start}, ${lichaam.einde}, ${dagdeel}, ${lichaam.omschrijving ?? null},
               ${lichaam.opvangVoorzien ?? false}, ${auth.persoonId})
            returning id`) as unknown as { id: string }[]
          await schrijfAudit(
            trx,
            auth.tenantId,
            auth.persoonId,
            'kalenderperiode',
            rij!.id,
            `kalenderperiode toegevoegd: ${lichaam.type} ${lichaam.start} – ${lichaam.einde} (${dagdeel}, ${lichaam.schooljaar})`,
          )
          return { ok: true as const, id: rij!.id, meldingen }
        })

        if (!uitkomst.ok) {
          return antwoord.code(422).send({
            fout: 'de kalender overschrijdt het regelboek van dit schooljaar',
            meldingen: uitkomst.meldingen,
          })
        }
        return antwoord.code(201).send({ id: uitkomst.id, meldingen: uitkomst.meldingen })
      },
    )

    app.delete(
      '/api/v1/kalender/:periodeId',
      {
        schema: {
          params: {
            type: 'object',
            required: ['periodeId'],
            properties: { periodeId: { type: 'string', pattern: UUID_PATROON } },
          },
        },
      },
      async (verzoek, antwoord) => {
        const auth = verzoek.auth as AuthContext
        if (!heeftRol(auth, 'BG', 'DIR')) {
          return antwoord.code(403).send({ fout: 'kalenderbeheer vereist de beheerders- of directeursrol' })
        }
        const { periodeId } = verzoek.params as { periodeId: string }

        const verwijderd = await metTenantContext(db, auth.tenantId, async (trx) => {
          const rijen = (await trx`
            delete from core.kalenderperiode
            where id = ${periodeId}
            returning type, to_char(start, 'YYYY-MM-DD') as start, to_char(einde, 'YYYY-MM-DD') as einde, schooljaar`) as unknown as {
            type: string
            start: string
            einde: string
            schooljaar: string
          }[]
          const rij = rijen[0]
          if (rij === undefined) return false
          await schrijfAudit(
            trx,
            auth.tenantId,
            auth.persoonId,
            'kalenderperiode',
            periodeId,
            `kalenderperiode verwijderd: ${rij.type} ${rij.start} – ${rij.einde} (${rij.schooljaar})`,
          )
          return true
        })

        if (!verwijderd) return antwoord.code(404).send({ fout: 'kalenderperiode niet gevonden' })
        return antwoord.code(204).send()
      },
    )

    /*
     * Module P2 — toezichten & beurtrollen. Soorten dragen hun juridische
     * categorie (schoolopdracht / vergoed / vrijwillig); beurten worden
     * gegenereerd met de billijke, deterministische verdeler uit
     * @draagvlak/planregels, met respect voor de schoolkalender. Iedereen
     * leest het rooster en de tellers (transparantie); beheren = BG/DIR.
     */
    app.post(
      '/api/v1/toezichten/soorten',
      {
        schema: {
          body: {
            type: 'object',
            required: ['naam', 'categorie', 'weekdagen', 'starttijd', 'eindtijd'],
            properties: {
              naam: { type: 'string', minLength: 3, maxLength: 120 },
              categorie: { type: 'string', enum: ['schoolopdracht', 'vergoed', 'vrijwillig'] },
              weekdagen: {
                type: 'array',
                items: { type: 'integer', minimum: 1, maximum: 5 },
                minItems: 1,
                maxItems: 5,
                uniqueItems: true,
              },
              starttijd: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
              eindtijd: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
              schoolId: { type: 'string', pattern: UUID_PATROON },
            },
            additionalProperties: false,
          },
        },
      },
      async (verzoek, antwoord) => {
        const auth = verzoek.auth as AuthContext
        if (!heeftRol(auth, 'BG', 'DIR')) {
          return antwoord.code(403).send({ fout: 'toezichtbeheer vereist de beheerders- of directeursrol' })
        }
        const lichaam = verzoek.body as {
          naam: string
          categorie: string
          weekdagen: number[]
          starttijd: string
          eindtijd: string
          schoolId?: string
        }
        if (lichaam.eindtijd <= lichaam.starttijd) {
          return antwoord.code(400).send({ fout: 'eindtijd ligt niet na starttijd' })
        }

        const id = await metTenantContext(db, auth.tenantId, async (trx) => {
          const [rij] = (await trx`
            insert into core.toezichtsoort (tenant_id, school_id, naam, categorie, weekdagen, starttijd, eindtijd)
            values (${auth.tenantId}, ${lichaam.schoolId ?? null}, ${lichaam.naam}, ${lichaam.categorie},
                    ${lichaam.weekdagen}, ${lichaam.starttijd}, ${lichaam.eindtijd})
            returning id`) as unknown as { id: string }[]
          await schrijfAudit(
            trx,
            auth.tenantId,
            auth.persoonId,
            'toezichtsoort',
            rij!.id,
            `toezichtsoort aangemaakt: '${lichaam.naam}' (${lichaam.categorie}, ${lichaam.starttijd}–${lichaam.eindtijd})`,
          )
          return rij!.id
        })
        return antwoord.code(201).send({ id })
      },
    )

    app.get('/api/v1/toezichten/soorten', async (verzoek) => {
      const auth = verzoek.auth as AuthContext
      const soorten = await metTenantContext(db, auth.tenantId, (trx) =>
        trx`
          select id, naam, categorie, weekdagen,
                 to_char(starttijd, 'HH24:MI') as starttijd,
                 to_char(eindtijd, 'HH24:MI') as eindtijd
          from core.toezichtsoort
          order by starttijd, naam`,
      )
      return { soorten }
    })

    app.post(
      '/api/v1/toezichten/genereer',
      {
        schema: {
          body: {
            type: 'object',
            required: ['soortId', 'van', 'tot', 'persoonIds'],
            properties: {
              soortId: { type: 'string', pattern: UUID_PATROON },
              van: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
              tot: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
              persoonIds: {
                type: 'array',
                items: { type: 'string', pattern: UUID_PATROON },
                minItems: 1,
                maxItems: 200,
                uniqueItems: true,
              },
            },
            additionalProperties: false,
          },
        },
      },
      async (verzoek, antwoord) => {
        const auth = verzoek.auth as AuthContext
        if (!heeftRol(auth, 'BG', 'DIR')) {
          return antwoord.code(403).send({ fout: 'toezichtbeheer vereist de beheerders- of directeursrol' })
        }
        const lichaam = verzoek.body as { soortId: string; van: string; tot: string; persoonIds: string[] }
        if (!isGeldigeKalenderdatum(lichaam.van) || !isGeldigeKalenderdatum(lichaam.tot)) {
          return antwoord.code(400).send({ fout: 'ongeldige kalenderdatum' })
        }
        if (lichaam.tot < lichaam.van || dagenTussen(lichaam.van, lichaam.tot) > 200) {
          return antwoord.code(400).send({ fout: 'periode moet oplopend zijn en hoogstens 200 dagen beslaan' })
        }

        const uitkomst = await metTenantContext(db, auth.tenantId, (trx) =>
          genereerBeurten(trx, auth.tenantId, auth.persoonId, lichaam),
        )
        if (!uitkomst.ok) return antwoord.code(uitkomst.status ?? 404).send({ fout: uitkomst.fout })
        return antwoord.code(201).send({
          aangemaakt: uitkomst.aangemaakt,
          overgeslagen: uitkomst.overgeslagen,
          verdeling: uitkomst.verdeling,
        })
      },
    )

    app.get(
      '/api/v1/toezichten',
      {
        schema: {
          querystring: {
            type: 'object',
            required: ['van', 'tot'],
            properties: {
              van: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
              tot: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            },
            additionalProperties: false,
          },
        },
      },
      async (verzoek) => {
        const auth = verzoek.auth as AuthContext
        const { van, tot } = verzoek.query as { van: string; tot: string }
        const beurten = await metTenantContext(db, auth.tenantId, (trx) =>
          trx`
            select b.id,
                   s.naam as soort,
                   s.categorie,
                   to_char(b.datum, 'YYYY-MM-DD') as datum,
                   b.persoon_id as "persoonId",
                   coalesce(p.naam, b.externe_naam) as naam,
                   (b.persoon_id is null) as extern
            from core.toezichtbeurt b
            join core.toezichtsoort s on s.id = b.soort_id
            left join core.persoon p on p.id = b.persoon_id
            where b.datum between ${van} and ${tot}
            order by b.datum, s.starttijd, naam`,
        )
        return { van, tot, beurten }
      },
    )

    /** Billijkheidstellers: voor het hele team zichtbaar — dit is de transparantie-USP. */
    app.get('/api/v1/toezichten/tellers', async (verzoek) => {
      const auth = verzoek.auth as AuthContext
      const tellers = await metTenantContext(db, auth.tenantId, (trx) =>
        trx`
          select s.naam as soort,
                 coalesce(p.naam, b.externe_naam) as naam,
                 count(*)::int as beurten
          from core.toezichtbeurt b
          join core.toezichtsoort s on s.id = b.soort_id
          left join core.persoon p on p.id = b.persoon_id
          group by s.naam, coalesce(p.naam, b.externe_naam)
          order by s.naam, beurten desc, naam`,
      )
      return { tellers }
    })

    /** Handmatige beurt: personeelslid óf externe toezichter (bv. vrijwilliger middag). */
    app.post(
      '/api/v1/toezichten',
      {
        schema: {
          body: {
            type: 'object',
            required: ['soortId', 'datum'],
            properties: {
              soortId: { type: 'string', pattern: UUID_PATROON },
              datum: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
              persoonId: { type: 'string', pattern: UUID_PATROON },
              externeNaam: { type: 'string', minLength: 2, maxLength: 120 },
            },
            additionalProperties: false,
          },
        },
      },
      async (verzoek, antwoord) => {
        const auth = verzoek.auth as AuthContext
        if (!heeftRol(auth, 'BG', 'DIR')) {
          return antwoord.code(403).send({ fout: 'toezichtbeheer vereist de beheerders- of directeursrol' })
        }
        const lichaam = verzoek.body as {
          soortId: string
          datum: string
          persoonId?: string
          externeNaam?: string
        }
        if ((lichaam.persoonId === undefined) === (lichaam.externeNaam === undefined)) {
          return antwoord.code(400).send({ fout: 'geef óf een persoonId óf een externeNaam op' })
        }
        if (!isGeldigeKalenderdatum(lichaam.datum)) {
          return antwoord.code(400).send({ fout: `ongeldige kalenderdatum: ${lichaam.datum}` })
        }

        const id = await metTenantContext(db, auth.tenantId, async (trx) => {
          const [rij] = (await trx`
            insert into core.toezichtbeurt (tenant_id, soort_id, datum, persoon_id, externe_naam)
            values (${auth.tenantId}, ${lichaam.soortId}, ${lichaam.datum},
                    ${lichaam.persoonId ?? null}, ${lichaam.externeNaam ?? null})
            returning id`) as unknown as { id: string }[]
          await schrijfAudit(
            trx,
            auth.tenantId,
            auth.persoonId,
            'toezichtbeurt',
            rij!.id,
            `toezichtbeurt toegevoegd op ${lichaam.datum} (${lichaam.externeNaam !== undefined ? `externe: ${lichaam.externeNaam}` : 'personeelslid'})`,
          )
          return rij!.id
        })
        return antwoord.code(201).send({ id })
      },
    )

    app.post(
      '/api/v1/toezichten/:beurtId/ruil',
      {
        schema: {
          params: {
            type: 'object',
            required: ['beurtId'],
            properties: { beurtId: { type: 'string', pattern: UUID_PATROON } },
          },
          body: {
            type: 'object',
            required: ['naarPersoonId'],
            properties: { naarPersoonId: { type: 'string', pattern: UUID_PATROON } },
            additionalProperties: false,
          },
        },
      },
      async (verzoek, antwoord) => {
        const auth = verzoek.auth as AuthContext
        if (!heeftRol(auth, 'BG', 'DIR')) {
          return antwoord.code(403).send({ fout: 'toezichtbeheer vereist de beheerders- of directeursrol' })
        }
        const { beurtId } = verzoek.params as { beurtId: string }
        const { naarPersoonId } = verzoek.body as { naarPersoonId: string }

        const geruild = await metTenantContext(db, auth.tenantId, async (trx) => {
          const rijen = (await trx`
            update core.toezichtbeurt
            set persoon_id = ${naarPersoonId}, externe_naam = null
            where id = ${beurtId}
            returning to_char(datum, 'YYYY-MM-DD') as datum`) as unknown as { datum: string }[]
          const rij = rijen[0]
          if (rij === undefined) return false
          await schrijfAudit(
            trx,
            auth.tenantId,
            auth.persoonId,
            'toezichtbeurt',
            beurtId,
            `toezichtbeurt geruild op ${rij.datum}`,
          )
          return true
        })
        if (!geruild) return antwoord.code(404).send({ fout: 'toezichtbeurt niet gevonden' })
        return { id: beurtId, persoonId: naarPersoonId }
      },
    )

    app.delete(
      '/api/v1/toezichten/:beurtId',
      {
        schema: {
          params: {
            type: 'object',
            required: ['beurtId'],
            properties: { beurtId: { type: 'string', pattern: UUID_PATROON } },
          },
        },
      },
      async (verzoek, antwoord) => {
        const auth = verzoek.auth as AuthContext
        if (!heeftRol(auth, 'BG', 'DIR')) {
          return antwoord.code(403).send({ fout: 'toezichtbeheer vereist de beheerders- of directeursrol' })
        }
        const { beurtId } = verzoek.params as { beurtId: string }
        const verwijderd = await metTenantContext(db, auth.tenantId, async (trx) => {
          const rijen = (await trx`
            delete from core.toezichtbeurt where id = ${beurtId}
            returning to_char(datum, 'YYYY-MM-DD') as datum`) as unknown as { datum: string }[]
          const rij = rijen[0]
          if (rij === undefined) return false
          await schrijfAudit(
            trx,
            auth.tenantId,
            auth.persoonId,
            'toezichtbeurt',
            beurtId,
            `toezichtbeurt geannuleerd op ${rij.datum}`,
          )
          return true
        })
        if (!verwijderd) return antwoord.code(404).send({ fout: 'toezichtbeurt niet gevonden' })
        return antwoord.code(204).send()
      },
    )
  }
}
