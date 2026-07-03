import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import {
  berekenPerAmbt,
  evalueerDrempel,
  PERS_2019_03,
  prognosePeildatum,
  type Aanstelling,
  type Afwezigheid,
} from '@draagvlak/telregels'
import { metTenantContext, type Db } from '../../db.js'

const UUID_PATROON =
  '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'

/**
 * Tot de regelparameters per tenant in de databank staan (REGELPARAMETER,
 * latere migratie), geldt de startset uit het domeinpakket.
 */
const PARAMETERS = [PERS_2019_03]

/**
 * Module B — personeel: tellers per ambt met verantwoording en drempelevaluatie.
 *
 * LET OP (ADR-0002): de tenant-context komt tijdelijk uit de x-tenant-id-header.
 * Dit is een expliciete plaatshouder tot de OIDC-authenticatielaag er is; de API
 * wordt niet extern ontsloten vóór die er is.
 */
export function personeelModule(db: Db): FastifyPluginAsync {
  return async function (app: FastifyInstance) {
    app.get(
      '/api/v1/personen/:persoonId/tellers',
      {
        schema: {
          params: {
            type: 'object',
            required: ['persoonId'],
            properties: { persoonId: { type: 'string', pattern: UUID_PATROON } },
          },
          querystring: {
            type: 'object',
            properties: { peildatum: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' } },
            additionalProperties: false,
          },
          headers: {
            type: 'object',
            required: ['x-tenant-id'],
            properties: { 'x-tenant-id': { type: 'string', pattern: UUID_PATROON } },
          },
        },
      },
      async (verzoek, antwoord) => {
        const { persoonId } = verzoek.params as { persoonId: string }
        const query = verzoek.query as { peildatum?: string }
        const tenantId = verzoek.headers['x-tenant-id'] as string
        const peildatum =
          query.peildatum ?? prognosePeildatum(new Date().toISOString().slice(0, 10))

        const gegevens = await metTenantContext(db, tenantId, async (trx) => {
          const personen = await trx`select id from core.persoon where id = ${persoonId}`
          if (personen.length === 0) return undefined
          const aanstellingen = await trx`
            select to_char(start, 'YYYY-MM-DD') as start,
                   to_char(einde, 'YYYY-MM-DD') as einde,
                   ambt
            from core.aanstelling
            where persoon_id = ${persoonId}
            order by start`
          const afwezigheden = await trx`
            select to_char(start, 'YYYY-MM-DD') as start,
                   to_char(einde, 'YYYY-MM-DD') as einde,
                   code
            from core.afwezigheid
            where persoon_id = ${persoonId}
            order by start`
          return {
            aanstellingen: aanstellingen as unknown as Aanstelling[],
            afwezigheden: afwezigheden as unknown as Afwezigheid[],
          }
        })

        // RLS maakt "bestaat niet" en "andere tenant" bewust onderscheidbaar
        // onmogelijk: beide zijn 404.
        if (gegevens === undefined) {
          return antwoord.code(404).send({ fout: 'persoon niet gevonden' })
        }

        const perAmbt = berekenPerAmbt({
          aanstellingen: gegevens.aanstellingen,
          afwezigheden: gegevens.afwezigheden,
          parameters: PARAMETERS,
          peildatum,
        })

        return {
          persoonId,
          peildatum,
          tellers: [...perAmbt.entries()].map(([ambt, resultaat]) => ({
            ambt,
            dagenTotaal: resultaat.dagenTotaal,
            dagenEffectief: resultaat.dagenEffectief,
            perSchooljaar: resultaat.perSchooljaar,
            drempel: evalueerDrempel(resultaat, PARAMETERS),
            verantwoording: resultaat.verantwoording,
          })),
        }
      },
    )
  }
}
