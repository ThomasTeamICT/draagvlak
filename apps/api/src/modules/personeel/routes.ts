import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import {
  berekenPerAmbt,
  dagenTussen,
  evalueerDrempel,
  isGeldigeKalenderdatum,
  prognosePeildatum,
  type Aanstelling,
  type Afwezigheid,
} from '@draagvlak/telregels'
import { metTenantContext, type Db } from '../../db.js'
import { heeftRol, maakAuthHandler, type AuthContext, type AuthHandler } from '../../auth/plugin.js'
import { herberekenDeadlines } from './deadlines.js'
import { registreerBeoordeling } from './beoordelingen.js'
import {
  beslisOverParameter,
  haalActieveParameters,
  stelParameterVoor,
  type VoorstelInvoer,
} from './parameters.js'
import { haalKorteVakanties } from '../planning/kalender.js'

/** Vandaag in Belgische tijd — toISOString() zou tussen middernacht en 2u de vorige dag geven. */
function vandaagBrussel(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Brussels' })
}

const UUID_PATROON =
  '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'

export interface PersoneelOpties {
  /**
   * Plausibiliteitsvenster (in dagen rond de systeemdatum) voor de injecteerbare
   * `vandaag` van de herberekening: een tikfout in het jaartal zou anders in één
   * POST alle open deadlines van de tenant intrekken.
   */
  vensterDagen?: number
  /** Gedeelde authenticatiehandler (app.ts maakt er één voor alle modules). */
  authHandler?: AuthHandler
}

/**
 * Module B — personeel: tellers, drempeldetectie en de deadline-engine.
 *
 * Authenticatie: OIDC-Bearer-tokens (ADR-0003); elke route in deze module
 * vereist een geldig token. Autorisatie volgt de toegangsmatrix, in Fase 1
 * vereenvoudigd tot rolniveau (school-scoping volgt met de SCIM-sync):
 * - tellers: het personeelslid zelf, of DIR
 * - herbereken: BG of DIR
 * - deadline-overzicht: DIR, AD of BG
 */
export function personeelModule(db: Db, opties: PersoneelOpties = {}): FastifyPluginAsync {
  const vensterDagen = opties.vensterDagen ?? 400
  const authHandler = opties.authHandler ?? maakAuthHandler(db)

  return async function (app: FastifyInstance) {
    // onRequest: 401 valt vóór body-parsing en schema-validatie
    app.addHook('onRequest', authHandler)

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
        },
      },
      async (verzoek, antwoord) => {
        const auth = verzoek.auth as AuthContext
        const { persoonId } = verzoek.params as { persoonId: string }
        const query = verzoek.query as { peildatum?: string }

        if (persoonId !== auth.persoonId && !heeftRol(auth, 'DIR')) {
          return antwoord.code(403).send({ fout: 'geen toegang tot dit dossier' })
        }
        if (query.peildatum !== undefined && !isGeldigeKalenderdatum(query.peildatum)) {
          return antwoord.code(400).send({ fout: `ongeldige kalenderdatum: ${query.peildatum}` })
        }
        const peildatum = query.peildatum ?? prognosePeildatum(vandaagBrussel())

        const gegevens = await metTenantContext(db, auth.tenantId, async (trx) => {
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
            parameters: await haalActieveParameters(trx),
            korteVakanties: await haalKorteVakanties(trx),
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
          parameters: gegevens.parameters,
          peildatum,
          korteVakanties: gegevens.korteVakanties,
        })

        return {
          persoonId,
          peildatum,
          tellers: [...perAmbt.entries()].map(([ambt, resultaat]) => ({
            ambt,
            dagenTotaal: resultaat.dagenTotaal,
            dagenEffectief: resultaat.dagenEffectief,
            perSchooljaar: resultaat.perSchooljaar,
            drempel: evalueerDrempel(resultaat, gegevens.parameters),
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
          body: {
            type: ['object', 'null'],
            properties: { vandaag: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' } },
            additionalProperties: false,
          },
        },
      },
      async (verzoek, antwoord) => {
        const auth = verzoek.auth as AuthContext
        if (!heeftRol(auth, 'BG', 'DIR')) {
          return antwoord.code(403).send({ fout: 'geen toegang tot de deadline-engine' })
        }

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

        return herberekenDeadlines(db, auth.tenantId, vandaag, auth.persoonId)
      },
    )

    /**
     * Werkvoorraad voor het startersdashboard (wireframe W5) en het startscherm
     * (W1). Begrensd: vervallen/verstreken rijen accumuleren per schooljaar
     * (deadlines worden nooit verwijderd), dus zonder limiet groeit de respons
     * onbegrensd mee. Keyset-paginering volgt zodra een scherm ze nodig heeft.
     */
    app.get(
      '/api/v1/deadlines',
      {
        schema: {
          querystring: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['open', 'geregistreerd', 'vervallen'] },
              limiet: { type: 'integer', minimum: 1, maximum: 500 },
            },
            additionalProperties: false,
          },
        },
      },
      async (verzoek, antwoord) => {
        const auth = verzoek.auth as AuthContext
        if (!heeftRol(auth, 'DIR', 'AD', 'BG')) {
          return antwoord.code(403).send({ fout: 'geen toegang tot het deadline-overzicht' })
        }
        const { status = 'open', limiet = 100 } = verzoek.query as {
          status?: string
          limiet?: number
        }

        const deadlines = await metTenantContext(db, auth.tenantId, async (trx) => {
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
            order by d.datum, p.naam
            limit ${limiet}`
        })

        return { status, deadlines }
      },
    )

    /**
     * Module D — registratie van een TADD-beoordeling tegen een open
     * beoordelingsdeadline (toegangsmatrix: beoordelen is een
     * directeursbevoegdheid). Sluit de TADD-lus: de deadline gaat naar
     * 'geregistreerd'.
     */
    app.post(
      '/api/v1/deadlines/:deadlineId/registreer',
      {
        schema: {
          params: {
            type: 'object',
            required: ['deadlineId'],
            properties: { deadlineId: { type: 'string', pattern: UUID_PATROON } },
          },
          body: {
            type: 'object',
            required: ['resultaat'],
            properties: {
              resultaat: {
                type: 'string',
                enum: ['positief', 'met_werkpunten', 'negatief', 'stilzwijgend_positief'],
              },
              opmerking: { type: 'string', maxLength: 2000 },
              vandaag: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            },
            additionalProperties: false,
          },
        },
      },
      async (verzoek, antwoord) => {
        const auth = verzoek.auth as AuthContext
        if (!heeftRol(auth, 'DIR')) {
          return antwoord.code(403).send({ fout: 'beoordelen is een directeursbevoegdheid' })
        }
        const { deadlineId } = verzoek.params as { deadlineId: string }
        const lichaam = verzoek.body as {
          resultaat: 'positief' | 'met_werkpunten' | 'negatief' | 'stilzwijgend_positief'
          opmerking?: string
          vandaag?: string
        }
        const vandaag = lichaam.vandaag ?? vandaagBrussel()
        if (!isGeldigeKalenderdatum(vandaag)) {
          return antwoord.code(400).send({ fout: `ongeldige kalenderdatum: ${vandaag}` })
        }

        const uitkomst = await registreerBeoordeling(db, auth.tenantId, auth.persoonId, deadlineId, {
          resultaat: lichaam.resultaat,
          ...(lichaam.opmerking !== undefined ? { opmerking: lichaam.opmerking } : {}),
          vandaag,
        })
        if (!uitkomst.ok) {
          return antwoord.code(uitkomst.status).send({ fout: uitkomst.fout })
        }
        return antwoord.code(201).send({
          beoordeling: uitkomst.beoordeling,
          deadline: uitkomst.deadline,
        })
      },
    )

    /** Beoordelingshistoriek voor het dossierscherm (het personeelslid zelf of DIR). */
    app.get(
      '/api/v1/personen/:persoonId/beoordelingen',
      {
        schema: {
          params: {
            type: 'object',
            required: ['persoonId'],
            properties: { persoonId: { type: 'string', pattern: UUID_PATROON } },
          },
        },
      },
      async (verzoek, antwoord) => {
        const auth = verzoek.auth as AuthContext
        const { persoonId } = verzoek.params as { persoonId: string }
        if (persoonId !== auth.persoonId && !heeftRol(auth, 'DIR')) {
          return antwoord.code(403).send({ fout: 'geen toegang tot dit dossier' })
        }

        const beoordelingen = await metTenantContext(db, auth.tenantId, async (trx) => {
          return trx`
            select b.id,
                   b.ambt,
                   b.schooljaar,
                   b.resultaat,
                   b.opmerking,
                   p.naam as "geregistreerdDoor",
                   to_char(b.aangemaakt_op, 'YYYY-MM-DD') as "geregistreerdOp"
            from core.beoordeling b
            join core.persoon p on p.id = b.geregistreerd_door
            where b.persoon_id = ${persoonId}
            order by b.schooljaar desc, b.ambt`
        })

        return { persoonId, beoordelingen }
      },
    )

    /**
     * Beheer van regelparameters (toegangsmatrix: BG, met vier-ogen).
     * Wijzigen = nieuw voorstel; een ándere beheerder bekrachtigt. Alleen
     * bekrachtigde versies sturen de teller en de engine; zonder tenant-
     * versies geldt de startset uit het domeinpakket.
     */
    app.get('/api/v1/regelparameters', async (verzoek, antwoord) => {
      const auth = verzoek.auth as AuthContext
      if (!heeftRol(auth, 'BG')) {
        return antwoord.code(403).send({ fout: 'parameterbeheer vereist de beheerdersrol' })
      }
      const regelparameters = await metTenantContext(db, auth.tenantId, async (trx) => {
        return trx`
          select r.id,
                 r.status,
                 to_char(r.geldig_vanaf, 'YYYY-MM-DD') as "geldigVanaf",
                 to_char(r.geldig_tot, 'YYYY-MM-DD') as "geldigTot",
                 r.bron,
                 r.drempel_totaal as "drempelTotaal",
                 r.drempel_effectief as "drempelEffectief",
                 r.max_per_schooljaar as "maxPerSchooljaar",
                 r.telregels,
                 vp.naam as "voorgesteldDoor",
                 bp.naam as "bekrachtigdDoor"
          from core.regelparameter r
          join core.persoon vp on vp.id = r.voorgesteld_door
          left join core.persoon bp on bp.id = r.bekrachtigd_door
          order by r.geldig_vanaf desc, r.aangemaakt_op desc`
      })
      return { regelparameters }
    })

    app.post(
      '/api/v1/regelparameters',
      {
        schema: {
          body: {
            type: 'object',
            required: [
              'geldigVanaf',
              'bron',
              'drempelTotaal',
              'drempelEffectief',
              'maxPerSchooljaar',
              'telregels',
            ],
            properties: {
              geldigVanaf: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
              geldigTot: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
              bron: { type: 'string', minLength: 5, maxLength: 500 },
              drempelTotaal: { type: 'integer', minimum: 1, maximum: 2000 },
              drempelEffectief: { type: 'integer', minimum: 1, maximum: 2000 },
              maxPerSchooljaar: { type: 'integer', minimum: 1, maximum: 366 },
              telregels: {
                type: 'object',
                required: [
                  'weekendTeltMee',
                  'korteVakantieTeltMee',
                  'zomervakantieTeltMee',
                  'effectieveAfwezigheidscodes',
                ],
                properties: {
                  weekendTeltMee: { type: 'boolean' },
                  korteVakantieTeltMee: { type: 'boolean' },
                  zomervakantieTeltMee: { type: 'boolean' },
                  effectieveAfwezigheidscodes: {
                    type: 'array',
                    items: { type: 'string', minLength: 1, maxLength: 50 },
                    maxItems: 100,
                  },
                },
                additionalProperties: false,
              },
            },
            additionalProperties: false,
          },
        },
      },
      async (verzoek, antwoord) => {
        const auth = verzoek.auth as AuthContext
        if (!heeftRol(auth, 'BG')) {
          return antwoord.code(403).send({ fout: 'parameterbeheer vereist de beheerdersrol' })
        }
        const lichaam = verzoek.body as VoorstelInvoer
        if (!isGeldigeKalenderdatum(lichaam.geldigVanaf)) {
          return antwoord.code(400).send({ fout: `ongeldige kalenderdatum: ${lichaam.geldigVanaf}` })
        }
        if (lichaam.geldigTot !== undefined && !isGeldigeKalenderdatum(lichaam.geldigTot)) {
          return antwoord.code(400).send({ fout: `ongeldige kalenderdatum: ${lichaam.geldigTot}` })
        }
        if (lichaam.geldigTot !== undefined && lichaam.geldigTot < lichaam.geldigVanaf) {
          return antwoord.code(400).send({ fout: 'geldigTot ligt vóór geldigVanaf' })
        }

        const voorstel = await stelParameterVoor(db, auth.tenantId, auth.persoonId, lichaam)
        return antwoord.code(201).send(voorstel)
      },
    )

    for (const beslissing of ['bekrachtig', 'wijs-af'] as const) {
      app.post(
        `/api/v1/regelparameters/:parameterId/${beslissing}`,
        {
          schema: {
            params: {
              type: 'object',
              required: ['parameterId'],
              properties: { parameterId: { type: 'string', pattern: UUID_PATROON } },
            },
          },
        },
        async (verzoek, antwoord) => {
          const auth = verzoek.auth as AuthContext
          if (!heeftRol(auth, 'BG')) {
            return antwoord.code(403).send({ fout: 'parameterbeheer vereist de beheerdersrol' })
          }
          const { parameterId } = verzoek.params as { parameterId: string }
          const uitkomst = await beslisOverParameter(
            db,
            auth.tenantId,
            auth.persoonId,
            parameterId,
            beslissing === 'bekrachtig' ? 'bekrachtig' : 'wijs_af',
          )
          if (!uitkomst.ok) {
            return antwoord.code(uitkomst.status).send({ fout: uitkomst.fout })
          }
          return { id: uitkomst.id, status: uitkomst.status }
        },
      )
    }
  }
}
