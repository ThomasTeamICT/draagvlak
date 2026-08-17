/**
 * Integratietest regelparameterbeheer: voorstel → vier-ogen-bekrachtiging →
 * de teller en de engine rekenen met de tenantversie. Het vier-ogen-principe
 * wordt zowel in de service als in de databank (check constraint) afgedwongen.
 * Draait alleen met DATABASE_ADMIN_URL + DATABASE_URL (zie apps/api/README.md).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import postgres from 'postgres'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app.js'
import { startIdpStub, type IdpStub } from './idp-stub.js'

const ADMIN_URL = process.env['DATABASE_ADMIN_URL']
const APP_URL = process.env['DATABASE_URL']

if (process.env['CI'] !== undefined && (ADMIN_URL === undefined || APP_URL === undefined)) {
  throw new Error('CI zonder DATABASE_ADMIN_URL/DATABASE_URL: integratietests zouden stil overgeslagen worden')
}

const TENANT_A = 'dddddddd-1111-1111-1111-111111111111'
const TENANT_B = 'dddddddd-2222-2222-2222-222222222222'
const SCHOOL_A = 'dddddddd-3333-3333-3333-333333333333'
const SCHOOL_B = 'dddddddd-4444-4444-4444-444444444444'
const JONAS = 'dddddddd-5555-5555-5555-555555555555' // D1: 308/295
const BART = 'dddddddd-6666-6666-6666-666666666666' // BG tenant A
const CARLA = 'dddddddd-7777-7777-7777-777777777777' // BG tenant A (tweede paar ogen)
const BEA = 'dddddddd-8888-8888-8888-888888888888' // BG tenant B

const ISSUER_A = 'https://idp.test/regelparameters-a'
const ISSUER_B = 'https://idp.test/regelparameters-b'
const AUDIENCE = 'draagvlak-api-test'

const STARTSET_TELREGELS = {
  weekendTeltMee: true,
  korteVakantieTeltMee: true,
  zomervakantieTeltMee: false,
  effectieveAfwezigheidscodes: [] as string[],
}

const repoWortel = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

describe.skipIf(ADMIN_URL === undefined || APP_URL === undefined)(
  'regelparameterbeheer (integratie)',
  () => {
    let admin: postgres.Sql
    let app: FastifyInstance
    let idp: IdpStub
    let tokenBart: string
    let tokenCarla: string
    let tokenJonas: string
    let tokenBea: string
    let voorstelId: string

    const stelVoor = (token: string, extra: Record<string, unknown> = {}) =>
      app.inject({
        method: 'POST',
        url: '/api/v1/regelparameters',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        payload: {
          geldigVanaf: '2019-09-01',
          bron: 'fictieve omzendbrief PERS/2099/01 — verstrengde drempel',
          drempelTotaal: 310,
          drempelEffectief: 200,
          maxPerSchooljaar: 360,
          telregels: STARTSET_TELREGELS,
          ...extra,
        },
      })

    const beslis = (id: string, actie: 'bekrachtig' | 'wijs-af', token: string) =>
      app.inject({
        method: 'POST',
        url: `/api/v1/regelparameters/${id}/${actie}`,
        headers: { authorization: `Bearer ${token}` },
      })

    const tellersJonas = (token: string) =>
      app.inject({
        method: 'GET',
        url: `/api/v1/personen/${JONAS}/tellers?peildatum=2026-06-30`,
        headers: { authorization: `Bearer ${token}` },
      })

    beforeAll(async () => {
      idp = await startIdpStub()
      admin = postgres(ADMIN_URL as string, { max: 1, onnotice: () => {} })

      await admin.unsafe('drop schema if exists core cascade')
      await admin.file(join(repoWortel, 'db', 'bootstrap', 'rollen.sql'), { cache: false })
      for (const migratie of [
        '0001_init.sql',
        '0002_personeel.sql',
        '0003_deadlines.sql',
        '0004_idp.sql',
        '0005_beoordeling.sql',
        '0006_regelparameters.sql',
      ]) {
        await admin.file(join(repoWortel, 'db', 'migrations', migratie), { cache: false })
      }

      await admin.unsafe(`
        insert into core.tenant (id, naam) values
          ('${TENANT_A}', 'Scholengroep A'),
          ('${TENANT_B}', 'Scholengroep B');
        insert into core.idp_config (tenant_id, issuer, audience, jwks_uri) values
          ('${TENANT_A}', '${ISSUER_A}', '${AUDIENCE}', '${idp.jwksUri}'),
          ('${TENANT_B}', '${ISSUER_B}', '${AUDIENCE}', '${idp.jwksUri}');
        insert into core.school (id, tenant_id, instellingsnummer, naam) values
          ('${SCHOOL_A}', '${TENANT_A}', '012345', 'Basisschool De Regenboog'),
          ('${SCHOOL_B}', '${TENANT_B}', '067890', 'Basisschool De Ster');
        insert into core.persoon (id, tenant_id, idp_subject, naam, email) values
          ('${JONAS}', '${TENANT_A}', 'idp|jonas', 'Jonas Dierckx', 'jonas@voorbeeld.be'),
          ('${BART}', '${TENANT_A}', 'idp|bart', 'Bart Vermeulen', 'bart@voorbeeld.be'),
          ('${CARLA}', '${TENANT_A}', 'idp|carla', 'Carla Jacobs', 'carla@voorbeeld.be'),
          ('${BEA}', '${TENANT_B}', 'idp|bea', 'Bea Maes', 'bea@voorbeeld.be');
        insert into core.roltoewijzing (tenant_id, persoon_id, school_id, rol, geldig_vanaf) values
          ('${TENANT_A}', '${JONAS}', '${SCHOOL_A}', 'PL', '2024-09-01'),
          ('${TENANT_A}', '${BART}', '${SCHOOL_A}', 'BG', '2024-09-01'),
          ('${TENANT_A}', '${CARLA}', '${SCHOOL_A}', 'BG', '2024-09-01'),
          ('${TENANT_B}', '${BEA}', '${SCHOOL_B}', 'BG', '2024-09-01');
        insert into core.aanstelling (tenant_id, persoon_id, school_id, ambt, statuut, start, einde) values
          ('${TENANT_A}', '${JONAS}', '${SCHOOL_A}', 'leraar', 'TABD', '2025-02-24', '2025-06-30'),
          ('${TENANT_A}', '${JONAS}', '${SCHOOL_A}', 'leraar', 'TABD', '2026-01-01', '2026-06-30');
        insert into core.afwezigheid (tenant_id, persoon_id, code, start, einde) values
          ('${TENANT_A}', '${JONAS}', 'ziekte', '2025-03-17', '2025-03-19'),
          ('${TENANT_A}', '${JONAS}', 'ziekte', '2026-02-09', '2026-02-18');
      `)

      tokenBart = await idp.token({ issuer: ISSUER_A, audience: AUDIENCE, sub: 'idp|bart' })
      tokenCarla = await idp.token({ issuer: ISSUER_A, audience: AUDIENCE, sub: 'idp|carla' })
      tokenJonas = await idp.token({ issuer: ISSUER_A, audience: AUDIENCE, sub: 'idp|jonas' })
      tokenBea = await idp.token({ issuer: ISSUER_B, audience: AUDIENCE, sub: 'idp|bea' })

      app = buildApp({ databaseUrl: APP_URL as string, herberekenVensterDagen: 36500 })
      await app.ready()
    })

    afterAll(async () => {
      await app?.close()
      await admin?.end()
      await idp?.stop()
    })

    it('zonder tenantversies geldt de startset uit het domeinpakket', async () => {
      const antwoord = await tellersJonas(tokenJonas)
      expect(antwoord.json().tellers[0].drempel.drempelBereikt).toBe(true)
      expect(antwoord.json().tellers[0].verantwoording.parameterbronnen[0]).toContain('PERS/2019/03')
    })

    it('parameterbeheer vereist de beheerdersrol', async () => {
      expect((await stelVoor(tokenJonas)).statusCode).toBe(403)
    })

    it('een beheerder stelt een versie voor: status voorgesteld, mét audit', async () => {
      const antwoord = await stelVoor(tokenBart)
      expect(antwoord.statusCode).toBe(201)
      expect(antwoord.json().status).toBe('voorgesteld')
      voorstelId = antwoord.json().id

      const lijst = await app.inject({
        method: 'GET',
        url: '/api/v1/regelparameters',
        headers: { authorization: `Bearer ${tokenBart}` },
      })
      expect(lijst.json().regelparameters[0]).toMatchObject({
        status: 'voorgesteld',
        drempelTotaal: 310,
        voorgesteldDoor: 'Bart Vermeulen',
      })

      const [audit] = await admin`
        select count(*)::int as aantal from core.audit_log
        where object_type = 'regelparameter' and actor_id = ${BART}`
      expect(audit?.['aantal']).toBe(1)
    })

    it('een voorgestelde versie stuurt de teller nog niet', async () => {
      const antwoord = await tellersJonas(tokenJonas)
      expect(antwoord.json().tellers[0].drempel.drempelBereikt).toBe(true)
    })

    it('vier-ogen: de voorsteller kan niet zelf bekrachtigen', async () => {
      const antwoord = await beslis(voorstelId, 'bekrachtig', tokenBart)
      expect(antwoord.statusCode).toBe(403)
      expect(antwoord.json().fout).toContain('vier-ogen')
    })

    it('vier-ogen zit ook in de databank zelf (check constraint)', async () => {
      await expect(
        admin.unsafe(`
          update core.regelparameter
          set status = 'actief', bekrachtigd_door = voorgesteld_door
          where id = '${voorstelId}'`),
      ).rejects.toThrow(/check constraint/)
    })

    it('een tweede beheerder bekrachtigt: de teller rekent met de tenantversie', async () => {
      const antwoord = await beslis(voorstelId, 'bekrachtig', tokenCarla)
      expect(antwoord.statusCode).toBe(200)
      expect(antwoord.json().status).toBe('actief')

      // Jonas heeft 308 dagen: onder de verstrengde drempel van 310
      const tellers = await tellersJonas(tokenJonas)
      expect(tellers.json().tellers[0].drempel.drempelBereikt).toBe(false)
      expect(tellers.json().tellers[0].verantwoording.parameterbronnen[0]).toContain('PERS/2099/01')
    })

    it('de engine rekent met dezelfde tenantversie: geen deadlines onder de nieuwe drempel', async () => {
      const run = await app.inject({
        method: 'POST',
        url: '/api/v1/deadlines/herbereken',
        headers: { authorization: `Bearer ${tokenBart}`, 'content-type': 'application/json' },
        payload: { vandaag: '2026-06-10' },
      })
      expect(run.json()).toMatchObject({ aangemaakt: 0 })
    })

    it('dubbel beslissen: 409', async () => {
      expect((await beslis(voorstelId, 'bekrachtig', tokenCarla)).statusCode).toBe(409)
      expect((await beslis(voorstelId, 'wijs-af', tokenCarla)).statusCode).toBe(409)
    })

    it('afwijzen: het voorstel wordt nooit actief', async () => {
      const voorstel = await stelVoor(tokenBart, { drempelTotaal: 250, bron: 'fictief voorstel dat sneuvelt' })
      const afwijzing = await beslis(voorstel.json().id, 'wijs-af', tokenCarla)
      expect(afwijzing.json().status).toBe('afgewezen')

      // teller blijft op de bekrachtigde versie (310)
      const tellers = await tellersJonas(tokenJonas)
      expect(tellers.json().tellers[0].drempel.drempelBereikt).toBe(false)
    })

    it('validatie: geldigTot vóór geldigVanaf en onmogelijke datums geven 400', async () => {
      expect((await stelVoor(tokenBart, { geldigTot: '2019-08-31' })).statusCode).toBe(400)
      expect((await stelVoor(tokenBart, { geldigVanaf: '2026-02-30' })).statusCode).toBe(400)
    })

    it('RLS: tenant B ziet de parameterversies van tenant A niet', async () => {
      const lijst = await app.inject({
        method: 'GET',
        url: '/api/v1/regelparameters',
        headers: { authorization: `Bearer ${tokenBea}` },
      })
      expect(lijst.json().regelparameters).toHaveLength(0)

      // en kan er ook niet over beslissen
      expect((await beslis(voorstelId, 'bekrachtig', tokenBea)).statusCode).toBe(404)
    })
  },
)
