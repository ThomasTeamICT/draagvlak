import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { isGeldigeKalenderdatum } from '@draagvlak/telregels'
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
  }
}
