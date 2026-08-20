/**
 * Integratietest toezichten & beurtrollen (module P2): soorten met juridische
 * categorie, billijke deterministische beurtrolgeneratie die de schoolkalender
 * respecteert, zichtbare tellers, ruilen en annuleren met audit, externe
 * toezichters, en tenant-afscherming.
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

const TENANT_A = 'abababab-1111-1111-1111-111111111111'
const TENANT_B = 'abababab-2222-2222-2222-222222222222'
const SCHOOL_A = 'abababab-3333-3333-3333-333333333333'
const SCHOOL_B = 'abababab-4444-4444-4444-444444444444'
const ANKE = 'abababab-5555-5555-5555-555555555555' // DIR
const ELS = 'abababab-6666-6666-6666-666666666666'
const KARIM = 'abababab-7777-7777-7777-777777777777'
const LIEN = 'abababab-8888-8888-8888-888888888888'
const NORA = 'abababab-9999-9999-9999-999999999999'
const BEA = 'abababab-aaaa-aaaa-aaaa-aaaaaaaaaaaa' // DIR tenant B

const LERAREN = [ELS, KARIM, LIEN, NORA]

const ISSUER_A = 'https://idp.test/toezichten-a'
const ISSUER_B = 'https://idp.test/toezichten-b'
const AUDIENCE = 'draagvlak-api-test'

const repoWortel = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

describe.skipIf(ADMIN_URL === undefined || APP_URL === undefined)(
  'toezichten & beurtrollen (integratie)',
  () => {
    let admin: postgres.Sql
    let app: FastifyInstance
    let idp: IdpStub
    let tokenAnke: string
    let tokenEls: string
    let tokenBea: string
    let soortId: string

    const post = (url: string, payload: Record<string, unknown>, token?: string) =>
      app.inject({
        method: 'POST',
        url,
        headers: { authorization: `Bearer ${token ?? tokenAnke}`, 'content-type': 'application/json' },
        payload,
      })

    const get = (url: string, token?: string) =>
      app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${token ?? tokenAnke}` } })

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
        '0007_scheduler.sql',
        '0008_kalender.sql',
        '0009_toezichten.sql',
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
          ('${ANKE}', '${TENANT_A}', 'idp|anke', 'Anke Willems', 'anke@voorbeeld.be'),
          ('${ELS}', '${TENANT_A}', 'idp|els', 'Els Vermeulen', 'els@voorbeeld.be'),
          ('${KARIM}', '${TENANT_A}', 'idp|karim', 'Karim Benali', 'karim@voorbeeld.be'),
          ('${LIEN}', '${TENANT_A}', 'idp|lien', 'Lien Maes', 'lien@voorbeeld.be'),
          ('${NORA}', '${TENANT_A}', 'idp|nora', 'Nora El Amrani', 'nora@voorbeeld.be'),
          ('${BEA}', '${TENANT_B}', 'idp|bea', 'Bea Maes', 'bea@voorbeeld.be');
        insert into core.roltoewijzing (tenant_id, persoon_id, school_id, rol, geldig_vanaf) values
          ('${TENANT_A}', '${ANKE}', '${SCHOOL_A}', 'DIR', '2024-09-01'),
          ('${TENANT_A}', '${ELS}', '${SCHOOL_A}', 'PL', '2024-09-01'),
          ('${TENANT_B}', '${BEA}', '${SCHOOL_B}', 'DIR', '2024-09-01');
        -- herfstvakantie: de generator moet die week overslaan
        insert into core.kalenderperiode (tenant_id, schooljaar, type, start, einde, omschrijving) values
          ('${TENANT_A}', '2025-2026', 'vakantie', '2025-10-27', '2025-11-02', 'herfstvakantie');
      `)

      tokenAnke = await idp.token({ issuer: ISSUER_A, audience: AUDIENCE, sub: 'idp|anke' })
      tokenEls = await idp.token({ issuer: ISSUER_A, audience: AUDIENCE, sub: 'idp|els' })
      tokenBea = await idp.token({ issuer: ISSUER_B, audience: AUDIENCE, sub: 'idp|bea' })

      app = buildApp({ databaseUrl: APP_URL as string })
      await app.ready()
    })

    afterAll(async () => {
      await app?.close()
      await admin?.end()
      await idp?.stop()
    })

    it('directeur maakt een toezichtsoort aan; personeelslid mag dat niet', async () => {
      const soort = {
        naam: 'middagtoezicht refter',
        categorie: 'vergoed',
        weekdagen: [1, 2, 4, 5],
        starttijd: '12:05',
        eindtijd: '13:05',
      }
      expect((await post('/api/v1/toezichten/soorten', soort, tokenEls)).statusCode).toBe(403)

      const antwoord = await post('/api/v1/toezichten/soorten', soort)
      expect(antwoord.statusCode).toBe(201)
      soortId = antwoord.json().id

      const lijst = (await get('/api/v1/toezichten/soorten', tokenEls)).json()
      expect(lijst.soorten[0]).toMatchObject({ naam: 'middagtoezicht refter', categorie: 'vergoed' })
    })

    it('genereert een billijke beurtrol en slaat de herfstvakantie over', async () => {
      // ma 20/10 t/m vr 7/11: weken van 20/10 en 3/11 tellen (ma-di-do-vr = 8 dagen);
      // de herfstvakantieweek (27/10-2/11) wordt volledig overgeslagen
      const antwoord = await post('/api/v1/toezichten/genereer', {
        soortId,
        van: '2025-10-20',
        tot: '2025-11-07',
        persoonIds: LERAREN,
      })
      expect(antwoord.statusCode).toBe(201)
      const lichaam = antwoord.json()
      expect(lichaam.aangemaakt).toBe(8)
      expect(lichaam.overgeslagen).toEqual(['2025-10-27', '2025-10-28', '2025-10-30', '2025-10-31'])
      expect(Object.values(lichaam.verdeling as Record<string, number>).sort()).toEqual([2, 2, 2, 2])

      const rooster = (await get('/api/v1/toezichten?van=2025-10-20&tot=2025-11-07', tokenEls)).json()
      expect(rooster.beurten).toHaveLength(8)
      expect(rooster.beurten.every((b: { datum: string }) => b.datum < '2025-10-27' || b.datum > '2025-11-02')).toBe(true)
    })

    it('is idempotent per dag: opnieuw genereren plant al bezette dagen niet dubbel', async () => {
      const antwoord = await post('/api/v1/toezichten/genereer', {
        soortId,
        van: '2025-10-20',
        tot: '2025-11-07',
        persoonIds: LERAREN,
      })
      expect(antwoord.json().aangemaakt).toBe(0)
    })

    it('billijkheid over rondes heen: wie achterstaat, krijgt de nieuwe beurten', async () => {
      // Nora raakt haar beurten kwijt (bv. pas later in dienst): teller op 0
      await admin.unsafe(`delete from core.toezichtbeurt where persoon_id = '${NORA}';`)

      const antwoord = await post('/api/v1/toezichten/genereer', {
        soortId,
        van: '2025-11-10',
        tot: '2025-11-14',
        persoonIds: LERAREN,
      })
      // 4 nieuwe beurten (ma-di-do-vr); Nora staat op 0 tegenover 2-2-2 → zij krijgt er 2,
      // en omdat niemand twee keer op dezelfde dag hoeft, verdelen de rest zich per dag
      expect(antwoord.json().aangemaakt).toBe(4)
      expect((antwoord.json().verdeling as Record<string, number>)[NORA]).toBe(2)

      const tellers = (await get('/api/v1/toezichten/tellers', tokenEls)).json()
      const perNaam = Object.fromEntries(
        tellers.tellers.map((t: { naam: string; beurten: number }) => [t.naam, t.beurten]),
      )
      expect(perNaam['Nora El Amrani']).toBe(2)
    })

    it('ruilen en annuleren kan, mét audit-spoor', async () => {
      const rooster = (await get('/api/v1/toezichten?van=2025-11-10&tot=2025-11-14')).json()
      const beurt = rooster.beurten.find((b: { persoonId: string }) => b.persoonId === NORA)

      const ruil = await post(`/api/v1/toezichten/${beurt.id}/ruil`, { naarPersoonId: KARIM })
      expect(ruil.statusCode).toBe(200)

      const weg = await app.inject({
        method: 'DELETE',
        url: `/api/v1/toezichten/${beurt.id}`,
        headers: { authorization: `Bearer ${tokenAnke}` },
      })
      expect(weg.statusCode).toBe(204)

      const [audit] = await admin`
        select count(*)::int as aantal from core.audit_log
        where object_type = 'toezichtbeurt'
          and (context ->> 'reden' like 'toezichtbeurt geruild%' or context ->> 'reden' like 'toezichtbeurt geannuleerd%')`
      expect(audit?.['aantal']).toBe(2)
    })

    it('externe toezichters (bv. vrijwilliger middag) kunnen handmatig toegevoegd worden', async () => {
      const antwoord = await post('/api/v1/toezichten', {
        soortId,
        datum: '2025-11-12',
        externeNaam: 'vrijwilliger Maria',
      })
      expect(antwoord.statusCode).toBe(201)

      const rooster = (await get('/api/v1/toezichten?van=2025-11-12&tot=2025-11-12', tokenEls)).json()
      expect(rooster.beurten.some((b: { naam: string; extern: boolean }) => b.naam === 'vrijwilliger Maria' && b.extern)).toBe(true)

      const beide = await post('/api/v1/toezichten', {
        soortId,
        datum: '2025-11-12',
        persoonId: ELS,
        externeNaam: 'dubbelop',
      })
      expect(beide.statusCode).toBe(400)
    })

    it('personeelsleden lezen rooster en tellers, maar genereren niet', async () => {
      expect(
        (await post('/api/v1/toezichten/genereer', { soortId, van: '2025-12-01', tot: '2025-12-05', persoonIds: LERAREN }, tokenEls)).statusCode,
      ).toBe(403)
    })

    it('RLS: tenant B ziet soorten noch beurten van tenant A', async () => {
      expect((await get('/api/v1/toezichten/soorten', tokenBea)).json().soorten).toHaveLength(0)
      expect((await get('/api/v1/toezichten?van=2025-10-20&tot=2025-11-14', tokenBea)).json().beurten).toHaveLength(0)
    })
  },
)
