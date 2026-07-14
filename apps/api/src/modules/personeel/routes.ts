import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import {
  berekenPerAmbt,
  dagenTussen,
  evalueerDrempel,
  isGeldigeKalenderdatum,
  PERS_2019_03,
  prognosePeildatum,
  type Aanstelling,
  type Afwezigheid,
} from '@draagvlak/telregels'
import { metTenantContext, type Db } from '../../db.js'
import { herberekenDeadlines } from './deadlines.js'

/** Vandaag in Belgische tijd — toISOString() zou tussen middernacht en 2u de vorige dag geven. */
function vandaagBrussel(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Brussels' })
}

const UUID_PATROON =
  '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'

const TENANT_HEADER = {
  type: 'object',
  required: ['x-tenant-id'],
  properties: { 'x-tenant-id': { type: 'string', pattern: UUID_PATROON } },
} as const

/**
 * Tot de regelparameters per tenant in de databank staan (REGELPARAMETER,
 * latere migratie), geldt de startset uit het domeinpakket.
 */
const PARAMETERS = [PERS_2019_03]

export interface PersoneelOpties {
  /**
   * Plausibiliteitsvenster (in dagen rond de systeemdatum) voor de injecteerbare
   * `vandaag` van de herberekening: een tikfout in het jaartal zou anders in één
   * POST alle open deadlines van de tenant intrekken.
   */
  vensterDagen?: number
}

/**
 * Module B — personeel: tellers per ambt met verantwoording en drempelevaluatie.
 *
 * LET OP (ADR-0002): de tenant-context komt tijdelijk uit de x-tenant-id-header.
 * Dit is een expliciete plaatshouder tot de OIDC-authenticatielaag er is; de API
 * wordt niet extern ontsloten vóór die er is.
 */
export function personeelModule(db: Db, opties: PersoneelOpties = {}): FastifyPluginAsync {
  const vensterDagen = opties.vensterDagen ?? 400
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
          headers: TENANT_HEADER,
        },
      },
      async (verzoek, antwoord) => {
        const { persoonId } = verzoek.params as { persoonId: string }
        const query = verzoek.query as { peildatum?: string }
        const tenantId = verzoek.headers['x-tenant-id'] as string
        if (query.peildatum !== undefined && !isGeldigeKalenderdatum(query.peildatum)) {
          return antwoord.code(400).send({ fout: `ongeldige kalenderdatum: ${query.peildatum}` })
        }
        const peildatum = query.peildatum ?? prognosePeildatum(vandaagBrussel())

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

    /**
     * Deadline-engine: drempeldetectie over alle personen van de tenant.
     * Idempotent; aangeroepen door een beheerder of (later, eigen ADR) een
     * geplande job. `vandaag` is injecteerbaar zodat escalatie testbaar en
     * reproduceerbaar blijft — zonder body geldt de systeemdatum.
     */
    app.post(
      '/api/v1/deadlines/herbereken',
      {
        schema: {
          headers: TENANT_HEADER,
          body: {
            type: ['object', 'null'],
            properties: { vandaag: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' } },
            additionalProperties: false,
          },
        },
      },
      async (verzoek, antwoord) => {
        const tenantId = verzoek.headers['x-tenant-id'] as string
        const lichaam = (verzoek.body ?? {}) as { vandaag?: string }
        const systeemdatum = vandaagBrussel()
        const vandaag = lichaam.vandaag ?? systeemdatum

        if (!isGeldigeKalenderdatum(vandaag)) {
          return antwoord.code(400).send({ fout: `ongeldige kalenderdatum: ${vandaag}` })
        }
        if (Math.abs(dagenTussen(systeemdatum, vandaag)) > vensterDagen) {
          return antwoord.code(400).send({
            fout: `peildatum ${vandaag} ligt meer dan ${vensterDagen} dagen van vandaag (${systeemdatum}) — herberekening geweigerd om massale foutieve intrekking te voorkomen`,
          })
        }

        return herberekenDeadlines(db, tenantId, vandaag)
      },
    )

    /** Werkvoorraad voor het startersdashboard (wireframe W5) en het startscherm (W1). */
    app.get(
      '/api/v1/deadlines',
      {
        schema: {
          headers: TENANT_HEADER,
          querystring: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['open', 'geregistreerd', 'vervallen'] },
            },
            additionalProperties: false,
          },
        },
      },
      async (verzoek) => {
        const tenantId = verzoek.headers['x-tenant-id'] as string
        const { status = 'open' } = verzoek.query as { status?: string }

        const deadlines = await metTenantContext(db, tenantId, async (trx) => {
          return trx`
            select d.id,
                   d.persoon_id as "persoonId",
                   p.naam,
                   d.ambt,
                   d.type,
                   to_char(d.datum, 'YYYY-MM-DD') as datum,
                   d.status,
                   d.escalatieniveau,
                   d.berekening
            from core.deadline d
            join core.persoon p on p.id = d.persoon_id
            where d.status = ${status}
            order by d.datum, p.naam`
        })

        return { status, deadlines }
      },
    )
  }
}
