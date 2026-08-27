import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { isGeldigeKalenderdatum } from '@draagvlak/telregels'
import type { Onderwijsniveau } from '@draagvlak/planregels'
import { metTenantContext, type Db } from '../../db.js'
import { heeftRol, type AuthContext, type AuthHandler } from '../../auth/plugin.js'
import { schrijfAudit } from '../personeel/audit.js'
import {
  adviesVoorAfwezigheid,
  haalContingent,
  kandidatenVoorDatum,
  noodscenarios,
  schooljaarVan,
} from './vervangingen.js'

const UUID_PATROON =
  '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
const DATUM_PATROON = '^\\d{4}-\\d{2}-\\d{2}$'
const SCHOOLJAAR_PATROON = '^\\d{4}-\\d{4}$'

export interface VervangingenOpties {
  authHandler: AuthHandler
}

/**
 * Module P3 — vervangingen & dagrooster (planning.md).
 *
 * Rollen: het overzicht is leesbaar voor DIR/AD/BG (dagelijkse werkvoorraad);
 * advies, registreren en contingentbeheer zijn DIR/BG. De kanaalkeuze is een
 * suggestie: de mens beslist, en elke beslissing — zeker de noodmaatregel —
 * krijgt een auditregel met het benoemde verlies.
 */
export function vervangingenModule(db: Db, opties: VervangingenOpties): FastifyPluginAsync {
  const { authHandler } = opties

  return async function (app: FastifyInstance) {
    app.addHook('onRequest', authHandler)

    // ── afwezigheid melden (bron: handmatig) ──
    app.post(
      '/api/v1/afwezigheden',
      {
        schema: {
          body: {
            type: 'object',
            required: ['persoonId', 'start', 'einde', 'code'],
            properties: {
              persoonId: { type: 'string', pattern: UUID_PATROON },
              start: { type: 'string', pattern: DATUM_PATROON },
              einde: { type: 'string', pattern: DATUM_PATROON },
              code: { type: 'string', minLength: 1, maxLength: 60 },
            },
            additionalProperties: false,
          },
        },
      },
      async (verzoek, antwoord) => {
        const auth = verzoek.auth as AuthContext
        if (!heeftRol(auth, 'BG', 'DIR', 'AD')) {
          return antwoord.code(403).send({ fout: 'afwezigheden melden vereist een beheerdersrol' })
        }
        const b = verzoek.body as { persoonId: string; start: string; einde: string; code: string }
        if (!isGeldigeKalenderdatum(b.start) || !isGeldigeKalenderdatum(b.einde) || b.einde < b.start) {
          return antwoord.code(422).send({ fout: `ongeldige periode ${b.start} – ${b.einde}` })
        }
        const uitkomst = await metTenantContext(db, auth.tenantId, async (trx) => {
          const personen = (await trx`
            select id from core.persoon where id = ${b.persoonId}`) as unknown as { id: string }[]
          if (personen.length === 0) return undefined
          const [rij] = (await trx`
            insert into core.afwezigheid (tenant_id, persoon_id, code, start, einde, bron)
            values (${auth.tenantId}, ${b.persoonId}, ${b.code}, ${b.start}, ${b.einde}, 'handmatig')
            returning id`) as unknown as { id: string }[]
          await schrijfAudit(
            trx,
            auth.tenantId,
            auth.persoonId,
            'afwezigheid',
            rij!.id,
            `afwezigheid ${b.code} gemeld van ${b.start} t/m ${b.einde}`,
          )
          return rij!.id
        })
        if (uitkomst === undefined) return antwoord.code(404).send({ fout: 'persoon niet gevonden' })
        return antwoord.code(201).send({ id: uitkomst })
      },
    )

    // ── kanaaladvies ──
    app.get(
      '/api/v1/vervangingen/advies',
      {
        schema: {
          querystring: {
            type: 'object',
            required: ['persoonId', 'peildatum'],
            properties: {
              persoonId: { type: 'string', pattern: UUID_PATROON },
              peildatum: { type: 'string', pattern: DATUM_PATROON },
              niveau: { type: 'string', enum: ['basis', 'secundair'] },
            },
            additionalProperties: false,
          },
        },
      },
      async (verzoek, antwoord) => {
        const auth = verzoek.auth as AuthContext
        if (!heeftRol(auth, 'BG', 'DIR', 'AD')) {
          return antwoord.code(403).send({ fout: 'het vervangingsadvies is er voor wie vervangingen regelt' })
        }
        const q = verzoek.query as { persoonId: string; peildatum: string; niveau?: Onderwijsniveau }
        const uitkomst = await metTenantContext(db, auth.tenantId, (trx) =>
          adviesVoorAfwezigheid(trx, {
            persoonId: q.persoonId,
            peildatum: q.peildatum,
            niveau: q.niveau ?? 'basis',
          }),
        )
        if (!uitkomst.ok) return antwoord.code(uitkomst.status ?? 404).send({ fout: uitkomst.fout })
        return uitkomst.advies
      },
    )

    // ── vervangersvoorstellen ──
    app.get(
      '/api/v1/vervangingen/kandidaten',
      {
        schema: {
          querystring: {
            type: 'object',
            required: ['afwezigeId', 'datum'],
            properties: {
              afwezigeId: { type: 'string', pattern: UUID_PATROON },
              datum: { type: 'string', pattern: DATUM_PATROON },
            },
            additionalProperties: false,
          },
        },
      },
      async (verzoek, antwoord) => {
        const auth = verzoek.auth as AuthContext
        if (!heeftRol(auth, 'BG', 'DIR', 'AD')) {
          return antwoord.code(403).send({ fout: 'vervangersvoorstellen zijn er voor wie vervangingen regelt' })
        }
        const q = verzoek.query as { afwezigeId: string; datum: string }
        const kandidaten = await metTenantContext(db, auth.tenantId, (trx) =>
          kandidatenVoorDatum(trx, { afwezigeId: q.afwezigeId, datum: q.datum }),
        )
        return { kandidaten }
      },
    )

    // ── noodscenario's doorrekenen (pure functie, geen opslag) ──
    app.post(
      '/api/v1/vervangingen/noodscenarios',
      {
        schema: {
          body: {
            type: 'object',
            required: ['klasgrootte', 'andereKlassen'],
            properties: {
              klasgrootte: { type: 'integer', minimum: 1, maximum: 60 },
              andereKlassen: {
                type: 'array',
                maxItems: 30,
                items: {
                  type: 'object',
                  required: ['id', 'grootte'],
                  properties: {
                    id: { type: 'string', minLength: 1, maxLength: 40 },
                    grootte: { type: 'integer', minimum: 0, maximum: 60 },
                  },
                  additionalProperties: false,
                },
              },
              zorgurenBeschikbaar: { type: 'integer', minimum: 0, maximum: 40 },
              externeInvallerBeschikbaar: { type: 'boolean' },
              maxGroepsgrootte: { type: 'integer', minimum: 10, maximum: 60 },
            },
            additionalProperties: false,
          },
        },
      },
      async (verzoek, antwoord) => {
        const auth = verzoek.auth as AuthContext
        if (!heeftRol(auth, 'BG', 'DIR', 'AD')) {
          return antwoord.code(403).send({ fout: 'noodscenario’s zijn er voor wie vervangingen regelt' })
        }
        return { scenarios: noodscenarios(verzoek.body as Parameters<typeof noodscenarios>[0]) }
      },
    )

    // ── vervanging vastleggen ──
    app.post(
      '/api/v1/vervangingen',
      {
        schema: {
          body: {
            type: 'object',
            required: ['afwezigeId', 'start', 'einde', 'kanaal'],
            properties: {
              afwezigeId: { type: 'string', pattern: UUID_PATROON },
              start: { type: 'string', pattern: DATUM_PATROON },
              einde: { type: 'string', pattern: DATUM_PATROON },
              kanaal: {
                type: 'string',
                enum: ['lerarenplatform', 'tijdelijke_aanstelling', 'vervangingseenheden', 'intern', 'geen_vervanging'],
              },
              vervangerId: { type: 'string', pattern: UUID_PATROON },
              externeNaam: { type: 'string', minLength: 1, maxLength: 120 },
              eenheden: { type: 'integer', minimum: 0, maximum: 400 },
              noodSoort: {
                type: 'string',
                enum: ['klas_verdelen', 'zorg_inzetten', 'klassen_samenvoegen', 'externe_invaller'],
              },
              noodVerlies: { type: 'string', minLength: 1, maxLength: 500 },
              reaffectatieGecheckt: { type: 'boolean' },
            },
            additionalProperties: false,
          },
        },
      },
      async (verzoek, antwoord) => {
        const auth = verzoek.auth as AuthContext
        if (!heeftRol(auth, 'BG', 'DIR')) {
          return antwoord.code(403).send({ fout: 'een vervanging vastleggen vereist de beheerders- of directeursrol' })
        }
        const b = verzoek.body as {
          afwezigeId: string
          start: string
          einde: string
          kanaal: string
          vervangerId?: string
          externeNaam?: string
          eenheden?: number
          noodSoort?: string
          noodVerlies?: string
          reaffectatieGecheckt?: boolean
        }
        if (!isGeldigeKalenderdatum(b.start) || !isGeldigeKalenderdatum(b.einde) || b.einde < b.start) {
          return antwoord.code(422).send({ fout: `ongeldige periode ${b.start} – ${b.einde}` })
        }
        // de regels die de databank-checks spiegelen, met een leesbare uitleg
        if (b.noodSoort !== undefined && (b.noodVerlies === undefined || b.noodVerlies.trim() === '')) {
          return antwoord.code(422).send({
            fout: 'een noodmaatregel zonder benoemd verlies bestaat niet — beschrijf wat er die dag wegvalt (dat is precies wat we willen kunnen aantonen)',
          })
        }
        if (b.noodSoort !== undefined && b.kanaal !== 'intern' && b.kanaal !== 'geen_vervanging') {
          return antwoord.code(422).send({ fout: 'noodmaatregelen horen bij interne opvang of geen vervanging' })
        }
        if (b.kanaal === 'tijdelijke_aanstelling' && b.reaffectatieGecheckt !== true) {
          return antwoord.code(422).send({
            fout: 'vóór een tijdelijke aanstelling moet de reaffectatie-/wedertewerkstellingscheck bevestigd zijn (V6) — vink hem af nadat je hem echt deed',
          })
        }
        if (b.kanaal === 'vervangingseenheden' && (b.eenheden === undefined || b.eenheden <= 0)) {
          return antwoord.code(422).send({ fout: 'geef het aantal verbruikte vervangingseenheden op' })
        }

        const uitkomst = await metTenantContext(db, auth.tenantId, async (trx) => {
          const personen = (await trx`
            select id from core.persoon where id = ${b.afwezigeId}`) as unknown as { id: string }[]
          if (personen.length === 0) return { fout: 'afwezige niet gevonden', status: 404 as const }
          if (b.vervangerId !== undefined) {
            const vervangers = (await trx`
              select id from core.persoon where id = ${b.vervangerId}`) as unknown as { id: string }[]
            if (vervangers.length === 0) return { fout: 'vervanger niet gevonden', status: 404 as const }
          }
          if (b.kanaal === 'vervangingseenheden') {
            const contingent = await haalContingent(trx, schooljaarVan(b.start))
            if ((b.eenheden ?? 0) > contingent.restant) {
              return {
                fout: `onvoldoende contingent: ${b.eenheden} eenheden gevraagd, nog ${contingent.restant} beschikbaar`,
                status: 422 as const,
              }
            }
          }
          const [rij] = (await trx`
            insert into core.vervanging
              (tenant_id, afwezige_id, start, einde, kanaal, vervanger_id, externe_naam,
               eenheden, nood_soort, nood_verlies, reaffectatie_gecheckt, aangemaakt_door)
            values
              (${auth.tenantId}, ${b.afwezigeId}, ${b.start}, ${b.einde}, ${b.kanaal},
               ${b.vervangerId ?? null}, ${b.externeNaam ?? null}, ${b.eenheden ?? 0},
               ${b.noodSoort ?? null}, ${b.noodVerlies ?? null},
               ${b.reaffectatieGecheckt ?? false}, ${auth.persoonId})
            returning id`) as unknown as { id: string }[]
          const reden =
            b.noodSoort !== undefined
              ? `noodmaatregel ${b.noodSoort} van ${b.start} t/m ${b.einde} — verlies: ${b.noodVerlies}`
              : `vervanging via ${b.kanaal} van ${b.start} t/m ${b.einde}`
          await schrijfAudit(trx, auth.tenantId, auth.persoonId, 'vervanging', rij!.id, reden)
          return { id: rij!.id }
        })
        if ('fout' in uitkomst) return antwoord.code(uitkomst.status ?? 422).send({ fout: uitkomst.fout })
        return antwoord.code(201).send(uitkomst)
      },
    )

    // ── overzicht ──
    app.get(
      '/api/v1/vervangingen',
      {
        schema: {
          querystring: {
            type: 'object',
            required: ['van', 'tot'],
            properties: {
              van: { type: 'string', pattern: DATUM_PATROON },
              tot: { type: 'string', pattern: DATUM_PATROON },
            },
            additionalProperties: false,
          },
        },
      },
      async (verzoek, antwoord) => {
        const auth = verzoek.auth as AuthContext
        if (!heeftRol(auth, 'BG', 'DIR', 'AD')) {
          return antwoord.code(403).send({ fout: 'het vervangingsoverzicht is er voor wie vervangingen regelt' })
        }
        const q = verzoek.query as { van: string; tot: string }
        const rijen = await metTenantContext(db, auth.tenantId, async (trx) => {
          return (await trx`
            select v.id,
                   to_char(v.start, 'YYYY-MM-DD') as start,
                   to_char(v.einde, 'YYYY-MM-DD') as einde,
                   v.kanaal,
                   v.eenheden,
                   v.nood_soort,
                   v.nood_verlies,
                   v.status,
                   afw.naam as afwezige,
                   ver.naam as vervanger,
                   v.externe_naam
            from core.vervanging v
            join core.persoon afw on afw.id = v.afwezige_id
            left join core.persoon ver on ver.id = v.vervanger_id
            where v.start <= ${q.tot} and v.einde >= ${q.van}
            order by v.start, afw.naam`) as unknown as Record<string, unknown>[]
        })
        return { vervangingen: rijen }
      },
    )

    // ── vervanging annuleren (status, nooit delete — het was een beslissing) ──
    app.post(
      '/api/v1/vervangingen/:vervangingId/annuleer',
      {
        schema: {
          params: {
            type: 'object',
            required: ['vervangingId'],
            properties: { vervangingId: { type: 'string', pattern: UUID_PATROON } },
            additionalProperties: false,
          },
        },
      },
      async (verzoek, antwoord) => {
        const auth = verzoek.auth as AuthContext
        if (!heeftRol(auth, 'BG', 'DIR')) {
          return antwoord.code(403).send({ fout: 'een vervanging annuleren vereist de beheerders- of directeursrol' })
        }
        const { vervangingId } = verzoek.params as { vervangingId: string }
        const gelukt = await metTenantContext(db, auth.tenantId, async (trx) => {
          const rijen = (await trx`
            update core.vervanging set status = 'geannuleerd'
            where id = ${vervangingId} and status = 'actief'
            returning id`) as unknown as { id: string }[]
          if (rijen.length === 0) return false
          await schrijfAudit(
            trx,
            auth.tenantId,
            auth.persoonId,
            'vervanging',
            vervangingId,
            'vervanging geannuleerd',
          )
          return true
        })
        if (!gelukt) return antwoord.code(404).send({ fout: 'geen actieve vervanging met dit id' })
        return antwoord.code(204).send()
      },
    )

    // ── contingent ──
    app.get(
      '/api/v1/vervangingen/contingent',
      {
        schema: {
          querystring: {
            type: 'object',
            required: ['schooljaar'],
            properties: { schooljaar: { type: 'string', pattern: SCHOOLJAAR_PATROON } },
            additionalProperties: false,
          },
        },
      },
      async (verzoek, antwoord) => {
        const auth = verzoek.auth as AuthContext
        if (!heeftRol(auth, 'BG', 'DIR', 'AD')) {
          return antwoord.code(403).send({ fout: 'het contingent is er voor wie vervangingen regelt' })
        }
        const { schooljaar } = verzoek.query as { schooljaar: string }
        return metTenantContext(db, auth.tenantId, (trx) => haalContingent(trx, schooljaar))
      },
    )

    app.put(
      '/api/v1/vervangingen/contingent',
      {
        schema: {
          body: {
            type: 'object',
            required: ['schooljaar', 'eenheden'],
            properties: {
              schooljaar: { type: 'string', pattern: SCHOOLJAAR_PATROON },
              eenheden: { type: 'integer', minimum: 0, maximum: 10000 },
            },
            additionalProperties: false,
          },
        },
      },
      async (verzoek, antwoord) => {
        const auth = verzoek.auth as AuthContext
        if (!heeftRol(auth, 'BG')) {
          return antwoord.code(403).send({ fout: 'het jaarcontingent instellen vereist de beheerdersrol' })
        }
        const b = verzoek.body as { schooljaar: string; eenheden: number }
        await metTenantContext(db, auth.tenantId, async (trx) => {
          const [rij] = (await trx`
            insert into core.vervangingscontingent (tenant_id, schooljaar, eenheden)
            values (${auth.tenantId}, ${b.schooljaar}, ${b.eenheden})
            on conflict (tenant_id, schooljaar) do update set eenheden = ${b.eenheden}
            returning id`) as unknown as { id: string }[]
          await schrijfAudit(
            trx,
            auth.tenantId,
            auth.persoonId,
            'vervangingscontingent',
            rij!.id,
            `contingent ${b.schooljaar} op ${b.eenheden} eenheden gezet`,
          )
        })
        return antwoord.code(204).send()
      },
    )

    // ── platformleden ──
    app.get('/api/v1/platformleden', {
      schema: {
        querystring: {
          type: 'object',
          required: ['schooljaar'],
          properties: { schooljaar: { type: 'string', pattern: SCHOOLJAAR_PATROON } },
          additionalProperties: false,
        },
      },
    }, async (verzoek, antwoord) => {
      const auth = verzoek.auth as AuthContext
      if (!heeftRol(auth, 'BG', 'DIR', 'AD')) {
        return antwoord.code(403).send({ fout: 'de platformlijst is er voor wie vervangingen regelt' })
      }
      const { schooljaar } = verzoek.query as { schooljaar: string }
      const leden = await metTenantContext(db, auth.tenantId, async (trx) => {
        return (await trx`
          select pl.id, pl.persoon_id, p.naam, pl.schooljaar
          from core.platformlid pl
          join core.persoon p on p.id = pl.persoon_id
          where pl.schooljaar = ${schooljaar}
          order by p.naam`) as unknown as Record<string, unknown>[]
      })
      return { leden }
    })

    app.post(
      '/api/v1/platformleden',
      {
        schema: {
          body: {
            type: 'object',
            required: ['persoonId', 'schooljaar'],
            properties: {
              persoonId: { type: 'string', pattern: UUID_PATROON },
              schooljaar: { type: 'string', pattern: SCHOOLJAAR_PATROON },
            },
            additionalProperties: false,
          },
        },
      },
      async (verzoek, antwoord) => {
        const auth = verzoek.auth as AuthContext
        if (!heeftRol(auth, 'BG', 'DIR')) {
          return antwoord.code(403).send({ fout: 'platformleden beheren vereist de beheerders- of directeursrol' })
        }
        const b = verzoek.body as { persoonId: string; schooljaar: string }
        const uitkomst = await metTenantContext(db, auth.tenantId, async (trx) => {
          const personen = (await trx`
            select id from core.persoon where id = ${b.persoonId}`) as unknown as { id: string }[]
          if (personen.length === 0) return undefined
          const [rij] = (await trx`
            insert into core.platformlid (tenant_id, persoon_id, schooljaar)
            values (${auth.tenantId}, ${b.persoonId}, ${b.schooljaar})
            on conflict (tenant_id, persoon_id, schooljaar) do update set schooljaar = ${b.schooljaar}
            returning id`) as unknown as { id: string }[]
          await schrijfAudit(
            trx,
            auth.tenantId,
            auth.persoonId,
            'platformlid',
            rij!.id,
            `opgenomen in het lerarenplatform voor ${b.schooljaar}`,
          )
          return rij!.id
        })
        if (uitkomst === undefined) return antwoord.code(404).send({ fout: 'persoon niet gevonden' })
        return antwoord.code(201).send({ id: uitkomst })
      },
    )
  }
}
