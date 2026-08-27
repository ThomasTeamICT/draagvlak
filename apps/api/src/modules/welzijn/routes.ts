import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import {
  DREMPEL_STANDAARD,
  DREMPEL_VRIJE_TEKST,
  magVraagInBevraging,
  onderdrukCellen,
  toonbareResponsgraad,
  type BevragingsType,
  type VraagVorm,
  type Vraagklasse,
} from '@draagvlak/welzijnsregels'
import { metTenantContext, type Db, type Trx } from '../../db.js'
import { heeftRol, type AuthContext, type AuthHandler } from '../../auth/plugin.js'
import { schrijfAudit } from '../personeel/audit.js'

const UUID_PATROON =
  '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'

export interface WelzijnOpties {
  authHandler: AuthHandler
}

interface VraagInvoer {
  klasse: Vraagklasse
  vorm: VraagVorm
  tekst: string
  opties?: unknown
}

/**
 * Module-familie W — bevragingen (functioneel ontwerp welzijn.md).
 *
 * Twee producten in één motor (W1): "Vraag aan personen" (op naam, klasse A)
 * en "Teambevraging" (vertrouwelijk-geaggregeerd, klasse A+B). De
 * classificatie beslist, niet de titel (W2); de terugkoppellus en het
 * overlegorgaan zijn lanceervoorwaarden voor teambevragingen (W7/W8); het
 * rapport verschijnt pas na sluiting en boven de drempel (W4/W5); deelname
 * is alleen zichtbaar bij op-naam-vragen (W12).
 */
export function welzijnModule(db: Db, opties: WelzijnOpties): FastifyPluginAsync {
  const { authHandler } = opties

  return async function (app: FastifyInstance) {
    app.addHook('onRequest', authHandler)

    // ── overlegorgaan (W8) ──
    app.get('/api/v1/overlegorgaan', async (verzoek) => {
      const auth = verzoek.auth as AuthContext
      const rijen = await metTenantContext(db, auth.tenantId, async (trx) => {
        return (await trx`
          select soort, naam, dpia_bevestigd from core.overlegorgaan`) as unknown as Record<
          string,
          unknown
        >[]
      })
      return { overlegorgaan: rijen[0] ?? null }
    })

    app.put(
      '/api/v1/overlegorgaan',
      {
        schema: {
          body: {
            type: 'object',
            required: ['soort', 'naam', 'dpiaBevestigd'],
            properties: {
              soort: {
                type: 'string',
                enum: ['cpbw', 'basiscomite', 'hoc', 'vakbondsafvaardiging', 'personeel'],
              },
              naam: { type: 'string', minLength: 1, maxLength: 200 },
              dpiaBevestigd: { type: 'boolean' },
            },
            additionalProperties: false,
          },
        },
      },
      async (verzoek, antwoord) => {
        const auth = verzoek.auth as AuthContext
        if (!heeftRol(auth, 'BG', 'DIR')) {
          return antwoord.code(403).send({ fout: 'het overlegorgaan configureren vereist de beheerders- of directeursrol' })
        }
        const b = verzoek.body as { soort: string; naam: string; dpiaBevestigd: boolean }
        await metTenantContext(db, auth.tenantId, async (trx) => {
          const [rij] = (await trx`
            insert into core.overlegorgaan (tenant_id, soort, naam, dpia_bevestigd)
            values (${auth.tenantId}, ${b.soort}, ${b.naam}, ${b.dpiaBevestigd})
            on conflict (tenant_id) do update
              set soort = ${b.soort}, naam = ${b.naam}, dpia_bevestigd = ${b.dpiaBevestigd}
            returning id`) as unknown as { id: string }[]
          await schrijfAudit(
            trx,
            auth.tenantId,
            auth.persoonId,
            'overlegorgaan',
            rij!.id,
            `overlegorgaan geconfigureerd: ${b.soort} (${b.naam}), DPIA ${b.dpiaBevestigd ? 'bevestigd' : 'niet bevestigd'}`,
          )
        })
        return antwoord.code(204).send()
      },
    )

    // ── bevraging aanmaken en meteen uitsturen ──
    app.post(
      '/api/v1/bevragingen',
      {
        schema: {
          body: {
            type: 'object',
            required: ['type', 'titel', 'vragen', 'genodigden'],
            properties: {
              type: { type: 'string', enum: ['op_naam', 'team'] },
              titel: { type: 'string', minLength: 1, maxLength: 200 },
              toelichting: { type: 'string', maxLength: 2000 },
              opvolgWie: { type: 'string', minLength: 1, maxLength: 200 },
              opvolgTegen: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
              vragen: {
                type: 'array',
                minItems: 1,
                maxItems: 25,
                items: {
                  type: 'object',
                  required: ['klasse', 'vorm', 'tekst'],
                  properties: {
                    klasse: { type: 'string', enum: ['A', 'B', 'C'] },
                    vorm: {
                      type: 'string',
                      enum: ['keuze', 'meerkeuze', 'schaal', 'ja_nee', 'datumkeuze', 'tekst'],
                    },
                    tekst: { type: 'string', minLength: 1, maxLength: 500 },
                    opties: {},
                  },
                  additionalProperties: false,
                },
              },
              genodigden: {
                type: 'array',
                minItems: 1,
                maxItems: 500,
                items: { type: 'string', pattern: UUID_PATROON },
              },
            },
            additionalProperties: false,
          },
        },
      },
      async (verzoek, antwoord) => {
        const auth = verzoek.auth as AuthContext
        if (!heeftRol(auth, 'BG', 'DIR', 'AD')) {
          return antwoord.code(403).send({ fout: 'bevragingen aanmaken vereist een beheerdersrol' })
        }
        const b = verzoek.body as {
          type: BevragingsType
          titel: string
          toelichting?: string
          opvolgWie?: string
          opvolgTegen?: string
          vragen: VraagInvoer[]
          genodigden: string[]
        }

        // W1/W2: de classificatie beslist, niet de titel — blokkade, geen waarschuwing
        for (const [i, vraag] of b.vragen.entries()) {
          const oordeel = magVraagInBevraging(b.type, vraag.klasse)
          if (!oordeel.toegestaan) {
            return antwoord.code(422).send({ fout: `vraag ${i + 1}: ${oordeel.reden}` })
          }
        }

        // W7: de terugkoppellus is een lanceervoorwaarde voor teambevragingen
        if (b.type === 'team' && (b.opvolgWie === undefined || b.opvolgTegen === undefined)) {
          return antwoord.code(422).send({
            fout: 'een teambevraging zonder opvolgpad bestaat niet: vul in wie het resultaat bespreekt en tegen wanneer — meten zonder opvolging is de nummer één reden waarom bevragingen doodbloeden (W7)',
          })
        }

        const uitkomst = await metTenantContext(db, auth.tenantId, async (trx) => {
          // W8: geen teambevraging zonder geconfigureerd overlegorgaan mét DPIA-vink
          if (b.type === 'team') {
            const organen = (await trx`
              select dpia_bevestigd from core.overlegorgaan`) as unknown as {
              dpia_bevestigd: boolean
            }[]
            if (organen.length === 0) {
              return {
                status: 422 as const,
                fout: 'configureer eerst het overlegorgaan van de school (comité PBW, basiscomité, hoog overlegcomité, vakbondsafvaardiging of rechtstreeks het personeel) — teambevragingen horen via dat orgaan te lopen (W8)',
              }
            }
            if (organen[0]!.dpia_bevestigd !== true) {
              return {
                status: 422 as const,
                fout: 'bevestig eerst dat de gegevensbeschermingseffectbeoordeling (DPIA) voor teambevragingen is uitgevoerd — dit is een lanceervoorwaarde (W8)',
              }
            }
          }

          const personen = (await trx`
            select id from core.persoon where id = any(${b.genodigden}::uuid[])`) as unknown as {
            id: string
          }[]
          if (personen.length !== new Set(b.genodigden).size) {
            return { status: 404 as const, fout: 'één of meer genodigden niet gevonden' }
          }

          const [bevraging] = (await trx`
            insert into core.bevraging
              (tenant_id, type, titel, toelichting, opvolg_wie, opvolg_tegen, aangemaakt_door)
            values
              (${auth.tenantId}, ${b.type}, ${b.titel}, ${b.toelichting ?? null},
               ${b.opvolgWie ?? null}, ${b.opvolgTegen ?? null}, ${auth.persoonId})
            returning id`) as unknown as { id: string }[]
          const bevragingId = bevraging!.id

          for (const [i, vraag] of b.vragen.entries()) {
            await trx`
              insert into core.bevraging_vraag
                (tenant_id, bevraging_id, volgnr, klasse, vorm, tekst, opties)
              values
                (${auth.tenantId}, ${bevragingId}, ${i + 1}, ${vraag.klasse}, ${vraag.vorm},
                 ${vraag.tekst}, ${vraag.opties === undefined ? null : trx.json(vraag.opties as never)})`
          }
          for (const persoonId of new Set(b.genodigden)) {
            await trx`
              insert into core.bevraging_uitnodiging (tenant_id, bevraging_id, persoon_id)
              values (${auth.tenantId}, ${bevragingId}, ${persoonId})`
          }
          await schrijfAudit(
            trx,
            auth.tenantId,
            auth.persoonId,
            'bevraging',
            bevragingId,
            `${b.type === 'op_naam' ? 'vraag aan personen' : 'teambevraging'} "${b.titel}" uitgestuurd naar ${new Set(b.genodigden).size} genodigden`,
          )
          return { id: bevragingId }
        })
        if ('fout' in uitkomst) return antwoord.code(uitkomst.status ?? 422).send({ fout: uitkomst.fout })
        return antwoord.code(201).send(uitkomst)
      },
    )

    // ── overzicht voor de vraagsteller ──
    app.get('/api/v1/bevragingen', async (verzoek, antwoord) => {
      const auth = verzoek.auth as AuthContext
      if (!heeftRol(auth, 'BG', 'DIR', 'AD')) {
        return antwoord.code(403).send({ fout: 'het bevragingsoverzicht is er voor wie bevragingen beheert' })
      }
      const rijen = await metTenantContext(db, auth.tenantId, async (trx) => {
        return (await trx`
          select b.id, b.type, b.titel, b.status,
                 to_char(b.aangemaakt_op, 'YYYY-MM-DD') as aangemaakt,
                 (select count(*)::int from core.bevraging_uitnodiging u
                  where u.bevraging_id = b.id) as genodigden,
                 (select count(*)::int from core.bevraging_uitnodiging u
                  where u.bevraging_id = b.id and u.beantwoord_op is not null) as beantwoord
          from core.bevraging b
          order by b.aangemaakt_op desc`) as unknown as Record<string, unknown>[]
      })
      // W12: bij teambevragingen alleen een responsgraad die zelf niets verraadt
      return {
        bevragingen: rijen.map((r) => {
          if (r['type'] !== 'team') return r
          const graad = toonbareResponsgraad(
            r['genodigden'] as number,
            r['beantwoord'] as number,
            DREMPEL_STANDAARD,
          )
          return {
            ...r,
            beantwoord: undefined,
            responsgraad: graad.toonbaar ? `${graad.procent}%` : `nog niet toonbaar (${graad.reden})`,
          }
        }),
      }
    })

    // ── detail: op naam = antwoorden en leesstatus; team = nooit deelnemers (W12) ──
    app.get(
      '/api/v1/bevragingen/:bevragingId',
      {
        schema: {
          params: {
            type: 'object',
            required: ['bevragingId'],
            properties: { bevragingId: { type: 'string', pattern: UUID_PATROON } },
            additionalProperties: false,
          },
        },
      },
      async (verzoek, antwoord) => {
        const auth = verzoek.auth as AuthContext
        if (!heeftRol(auth, 'BG', 'DIR', 'AD')) {
          return antwoord.code(403).send({ fout: 'bevragingsdetails zijn er voor wie bevragingen beheert' })
        }
        const { bevragingId } = verzoek.params as { bevragingId: string }
        const uitkomst = await metTenantContext(db, auth.tenantId, async (trx) => {
          const [bevraging] = (await trx`
            select id, type, titel, toelichting, status, opvolg_wie,
                   to_char(opvolg_tegen, 'YYYY-MM-DD') as opvolg_tegen
            from core.bevraging where id = ${bevragingId}`) as unknown as {
            id: string
            type: BevragingsType
            titel: string
            status: string
          }[]
          if (bevraging === undefined) return undefined

          const vragen = (await trx`
            select id, volgnr, klasse, vorm, tekst, opties
            from core.bevraging_vraag where bevraging_id = ${bevragingId}
            order by volgnr`) as unknown as Record<string, unknown>[]

          if (bevraging.type === 'op_naam') {
            const genodigden = (await trx`
              select u.persoon_id, p.naam,
                     u.gezien_op is not null as gezien,
                     u.beantwoord_op is not null as beantwoord
              from core.bevraging_uitnodiging u
              join core.persoon p on p.id = u.persoon_id
              where u.bevraging_id = ${bevragingId}
              order by p.naam`) as unknown as Record<string, unknown>[]
            const antwoorden = (await trx`
              select a.vraag_id, a.persoon_id, p.naam, a.waarde, a.liever_niet
              from core.bevraging_antwoord a
              join core.persoon p on p.id = a.persoon_id
              where a.bevraging_id = ${bevragingId}
              order by p.naam`) as unknown as Record<string, unknown>[]
            return { bevraging, vragen, genodigden, antwoorden }
          }

          // team: geen deelnemerslijst, geen antwoorden hier — alleen het rapport
          const tellers = (await trx`
            select count(*)::int as genodigden,
                   count(beantwoord_op)::int as beantwoord
            from core.bevraging_uitnodiging where bevraging_id = ${bevragingId}`) as unknown as {
            genodigden: number
            beantwoord: number
          }[]
          const graad = toonbareResponsgraad(
            tellers[0]!.genodigden,
            tellers[0]!.beantwoord,
            DREMPEL_STANDAARD,
          )
          return {
            bevraging,
            vragen,
            responsgraad: graad.toonbaar ? `${graad.procent}%` : `nog niet toonbaar (${graad.reden})`,
          }
        })
        if (uitkomst === undefined) return antwoord.code(404).send({ fout: 'bevraging niet gevonden' })
        return uitkomst
      },
    )

    // ── sluiten ──
    app.post(
      '/api/v1/bevragingen/:bevragingId/sluit',
      {
        schema: {
          params: {
            type: 'object',
            required: ['bevragingId'],
            properties: { bevragingId: { type: 'string', pattern: UUID_PATROON } },
            additionalProperties: false,
          },
        },
      },
      async (verzoek, antwoord) => {
        const auth = verzoek.auth as AuthContext
        if (!heeftRol(auth, 'BG', 'DIR', 'AD')) {
          return antwoord.code(403).send({ fout: 'bevragingen sluiten vereist een beheerdersrol' })
        }
        const { bevragingId } = verzoek.params as { bevragingId: string }
        const gelukt = await metTenantContext(db, auth.tenantId, async (trx) => {
          const rijen = (await trx`
            update core.bevraging set status = 'gesloten', gesloten_op = now()
            where id = ${bevragingId} and status = 'open'
            returning id`) as unknown as { id: string }[]
          if (rijen.length === 0) return false
          await schrijfAudit(trx, auth.tenantId, auth.persoonId, 'bevraging', bevragingId, 'bevraging gesloten')
          return true
        })
        if (!gelukt) return antwoord.code(404).send({ fout: 'geen open bevraging met dit id' })
        return antwoord.code(204).send()
      },
    )

    // ── het teamrapport: pas na sluiting, boven de drempel (W4/W5) ──
    app.get(
      '/api/v1/bevragingen/:bevragingId/rapport',
      {
        schema: {
          params: {
            type: 'object',
            required: ['bevragingId'],
            properties: { bevragingId: { type: 'string', pattern: UUID_PATROON } },
            additionalProperties: false,
          },
        },
      },
      async (verzoek, antwoord) => {
        const auth = verzoek.auth as AuthContext
        if (!heeftRol(auth, 'BG', 'DIR', 'AD')) {
          return antwoord.code(403).send({ fout: 'rapporten zijn er voor wie bevragingen beheert' })
        }
        const { bevragingId } = verzoek.params as { bevragingId: string }
        const uitkomst = await metTenantContext(db, auth.tenantId, async (trx) => {
          const [bevraging] = (await trx`
            select id, type, titel, status from core.bevraging
            where id = ${bevragingId}`) as unknown as {
            id: string
            type: BevragingsType
            titel: string
            status: string
          }[]
          if (bevraging === undefined) return { status: 404 as const, fout: 'bevraging niet gevonden' }
          if (bevraging.type !== 'team') {
            return {
              status: 422 as const,
              fout: 'op-naam-bevragingen hebben geen aggregatierapport: de antwoorden staan op naam in het detail',
            }
          }
          // WB5: geen realtime — het rapport bestaat pas na sluiting
          if (bevraging.status !== 'gesloten') {
            return {
              status: 422 as const,
              fout: 'het rapport verschijnt pas na sluiting van de bevraging: live meekijken terwijl mensen invullen, breekt de vertrouwelijkheid (W5)',
            }
          }

          const [tellers] = (await trx`
            select count(beantwoord_op)::int as respondenten
            from core.bevraging_uitnodiging where bevraging_id = ${bevragingId}`) as unknown as {
            respondenten: number
          }[]
          const respondenten = tellers!.respondenten

          const hoofdcel = onderdrukCellen(
            [{ sleutel: 'team', n: respondenten }],
            DREMPEL_STANDAARD,
          )
          if (!hoofdcel.ietsZichtbaar) {
            // WB4 — de kleine-school-modus: expliciet, nooit stilletjes niets
            return {
              rapport: {
                titel: bevraging.titel,
                toonbaar: false,
                respondenten: null,
                advies: hoofdcel.advies,
              },
            }
          }

          const vragen = (await trx`
            select id, volgnr, klasse, vorm, tekst, opties
            from core.bevraging_vraag where bevraging_id = ${bevragingId}
            order by volgnr`) as unknown as {
            id: string
            volgnr: number
            klasse: Vraagklasse
            vorm: VraagVorm
            tekst: string
            opties: unknown
          }[]

          const perVraag = []
          for (const vraag of vragen) {
            const antwoorden = (await trx`
              select waarde, liever_niet from core.bevraging_antwoord
              where vraag_id = ${vraag.id}
              order by waarde`) as unknown as { waarde: unknown; liever_niet: boolean }[]
            const lieverNiet = antwoorden.filter((a) => a.liever_niet).length

            if (vraag.vorm === 'tekst') {
              // W4: vrije tekst in klasse B pas vanaf de hogere drempel
              const drempel = vraag.klasse === 'B' ? DREMPEL_VRIJE_TEKST : DREMPEL_STANDAARD
              const teksten = antwoorden
                .filter((a) => !a.liever_niet)
                .map((a) => String(a.waarde))
                .sort() // gesorteerd, zodat de volgorde niets over binnenkomst verraadt
              perVraag.push({
                volgnr: vraag.volgnr,
                tekst: vraag.tekst,
                vorm: vraag.vorm,
                lieverNiet,
                ...(teksten.length >= drempel
                  ? { teksten }
                  : {
                      teksten: null,
                      reden: `open antwoorden verschijnen pas vanaf ${drempel} respondenten (nu ${teksten.length})`,
                    }),
              })
              continue
            }

            const verdeling = new Map<string, number>()
            for (const a of antwoorden) {
              if (a.liever_niet) continue
              const sleutel = JSON.stringify(a.waarde)
              verdeling.set(sleutel, (verdeling.get(sleutel) ?? 0) + 1)
            }
            perVraag.push({
              volgnr: vraag.volgnr,
              tekst: vraag.tekst,
              vorm: vraag.vorm,
              lieverNiet,
              verdeling: [...verdeling.entries()]
                .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
                .map(([waarde, aantal]) => ({ waarde: JSON.parse(waarde) as unknown, aantal })),
            })
          }

          return {
            rapport: {
              titel: bevraging.titel,
              toonbaar: true,
              respondenten,
              vragen: perVraag,
            },
          }
        })
        if ('fout' in uitkomst) return antwoord.code(uitkomst.status ?? 422).send({ fout: uitkomst.fout })
        return uitkomst
      },
    )

    // ── de inbox van het personeelslid ──
    app.get('/api/v1/inbox', async (verzoek) => {
      const auth = verzoek.auth as AuthContext
      const items = await metTenantContext(db, auth.tenantId, async (trx) => {
        return (await trx`
          select u.id as uitnodiging_id,
                 b.id as bevraging_id,
                 b.type, b.titel, b.toelichting,
                 vp.naam as vraagsteller,
                 u.gezien_op is not null as gezien,
                 (select count(*)::int from core.bevraging_uitnodiging g
                  where g.bevraging_id = b.id) as groepsgrootte
          from core.bevraging_uitnodiging u
          join core.bevraging b on b.id = u.bevraging_id
          left join core.persoon vp on vp.id = b.aangemaakt_door
          where u.persoon_id = ${auth.persoonId}
            and u.beantwoord_op is null
            and b.status = 'open'
          order by u.aangemaakt_op`) as unknown as Record<string, unknown>[]
      })
      // W6: "wie ziet wat" hoort bij elk item — op naam toont de ontvanger,
      // vertrouwelijk toont de groepsgrootte en de drempel
      return {
        items: items.map((i) => ({
          ...i,
          wieZietDit:
            i['type'] === 'op_naam'
              ? `jouw antwoord gaat op naam naar ${String(i['vraagsteller'] ?? 'de vraagsteller')}`
              : `vertrouwelijk: je antwoord wordt alleen getoond als deel van een groep van minstens ${DREMPEL_STANDAARD}; jouw groep telt ${String(i['groepsgrootte'])} genodigden; onder de ${DREMPEL_STANDAARD} ziet niemand iets`,
        })),
      }
    })

    app.get(
      '/api/v1/inbox/:uitnodigingId',
      {
        schema: {
          params: {
            type: 'object',
            required: ['uitnodigingId'],
            properties: { uitnodigingId: { type: 'string', pattern: UUID_PATROON } },
            additionalProperties: false,
          },
        },
      },
      async (verzoek, antwoord) => {
        const auth = verzoek.auth as AuthContext
        const uitkomst = await metTenantContext(db, auth.tenantId, async (trx) => {
          const [item] = (await trx`
            select u.id, b.id as bevraging_id, b.type, b.titel, b.toelichting, b.status
            from core.bevraging_uitnodiging u
            join core.bevraging b on b.id = u.bevraging_id
            where u.id = ${uitnodigingId(verzoek)} and u.persoon_id = ${auth.persoonId}`) as unknown as {
            id: string
            bevraging_id: string
            type: BevragingsType
            status: string
          }[]
          if (item === undefined) return undefined
          // gezien registreren — getoond wordt dit alleen bij op naam (W12)
          await trx`
            update core.bevraging_uitnodiging set gezien_op = coalesce(gezien_op, now())
            where id = ${item.id}`
          const vragen = (await trx`
            select id, volgnr, klasse, vorm, tekst, opties
            from core.bevraging_vraag where bevraging_id = ${item.bevraging_id}
            order by volgnr`) as unknown as Record<string, unknown>[]
          return { item, vragen }
        })
        if (uitkomst === undefined) return antwoord.code(404).send({ fout: 'uitnodiging niet gevonden' })
        return uitkomst
      },
    )

    // ── antwoorden ──
    app.post(
      '/api/v1/inbox/:uitnodigingId/antwoorden',
      {
        schema: {
          params: {
            type: 'object',
            required: ['uitnodigingId'],
            properties: { uitnodigingId: { type: 'string', pattern: UUID_PATROON } },
            additionalProperties: false,
          },
          body: {
            type: 'object',
            required: ['antwoorden'],
            properties: {
              antwoorden: {
                type: 'array',
                minItems: 1,
                maxItems: 25,
                items: {
                  type: 'object',
                  required: ['vraagId'],
                  properties: {
                    vraagId: { type: 'string', pattern: UUID_PATROON },
                    waarde: {},
                    lieverNiet: { type: 'boolean' },
                  },
                  additionalProperties: false,
                },
              },
            },
            additionalProperties: false,
          },
        },
      },
      async (verzoek, antwoord) => {
        const auth = verzoek.auth as AuthContext
        const b = verzoek.body as {
          antwoorden: { vraagId: string; waarde?: unknown; lieverNiet?: boolean }[]
        }
        const uitkomst = await metTenantContext(db, auth.tenantId, async (trx) => {
          const [item] = (await trx`
            select u.id, u.beantwoord_op, b.id as bevraging_id, b.type, b.status, b.titel
            from core.bevraging_uitnodiging u
            join core.bevraging b on b.id = u.bevraging_id
            where u.id = ${uitnodigingId(verzoek)} and u.persoon_id = ${auth.persoonId}`) as unknown as {
            id: string
            beantwoord_op: string | null
            bevraging_id: string
            type: BevragingsType
            status: string
            titel: string
          }[]
          if (item === undefined) return { status: 404 as const, fout: 'uitnodiging niet gevonden' }
          if (item.status !== 'open') return { status: 422 as const, fout: 'deze bevraging is gesloten' }
          if (item.beantwoord_op !== null) {
            return { status: 422 as const, fout: 'je hebt deze bevraging al beantwoord' }
          }

          const vragen = (await trx`
            select id from core.bevraging_vraag
            where bevraging_id = ${item.bevraging_id}`) as unknown as { id: string }[]
          const geldigeVragen = new Set(vragen.map((v) => v.id))
          for (const a of b.antwoorden) {
            if (!geldigeVragen.has(a.vraagId)) {
              return { status: 422 as const, fout: 'antwoord op een vraag die niet bij deze bevraging hoort' }
            }
            if (a.lieverNiet !== true && a.waarde === undefined) {
              return {
                status: 422 as const,
                fout: 'elk antwoord heeft een waarde of de expliciete keuze "liever niet zeggen" — overslaan mag ook: laat de vraag dan weg',
              }
            }
          }

          const opNaam = item.type === 'op_naam'
          for (const a of b.antwoorden) {
            await trx`
              insert into core.bevraging_antwoord
                (tenant_id, bevraging_id, vraag_id, op_naam, persoon_id, waarde, liever_niet)
              values
                (${auth.tenantId}, ${item.bevraging_id}, ${a.vraagId}, ${opNaam},
                 ${opNaam ? auth.persoonId : null},
                 ${a.waarde === undefined ? null : trx.json(a.waarde as never)},
                 ${a.lieverNiet ?? false})`
          }
          await trx`
            update core.bevraging_uitnodiging
            set beantwoord_op = now(), gezien_op = coalesce(gezien_op, now())
            where id = ${item.id}`
          // audit alleen bij op naam: een auditregel per teamantwoord zou
          // deelname herleidbaar maken voor wie het auditlog leest (W3/W12)
          if (opNaam) {
            await schrijfAudit(
              trx,
              auth.tenantId,
              auth.persoonId,
              'bevraging_antwoord',
              item.id,
              `antwoord op naam gegeven op "${item.titel}"`,
            )
          }
          return { ok: true as const }
        })
        if ('fout' in uitkomst) return antwoord.code(uitkomst.status ?? 422).send({ fout: uitkomst.fout })
        return antwoord.code(201).send({ ok: true })
      },
    )
  }
}

function uitnodigingId(verzoek: { params: unknown }): string {
  return (verzoek.params as { uitnodigingId: string }).uitnodigingId
}
