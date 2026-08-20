/**
 * Integratietest schoolkalender (module P1, planning.md): beheer met
 * regelboekvalidatie per schooljaar, audit-spoor, tenant-afscherming, en de
 * doorwerking naar de TADD-teller (testcase B2: korte vakanties tellen niet
 * wanneer de parameterversie dat stelt).
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

const TENANT_A = 'ffffffff-1111-1111-1111-111111111111'
const TENANT_B = 'ffffffff-2222-2222-2222-222222222222'
const SCHOOL_A = 'ffffffff-3333-3333-3333-333333333333'
const SCHOOL_B = 'ffffffff-4444-4444-4444-444444444444'
const JONAS = 'ffffffff-5555-5555-5555-555555555555' // D1: 308/295
const ANKE = 'ffffffff-6666-6666-6666-666666666666' // DIR tenant A
const BART = 'ffffffff-7777-7777-7777-777777777777' // BG tenant A (voor de parameterversie)
const BEA = 'ffffffff-8888-8888-8888-888888888888' // DIR tenant B

const ISSUER_A = 'https://idp.test/kalender-a'
const ISSUER_B = 'https://idp.test/kalender-b'
const AUDIENCE = 'draagvlak-api-test'

const repoWortel = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

describe.skipIf(ADMIN_URL === undefined || APP_URL === undefined)(
  'schoolkalender (integratie)',
  () => {
    let admin: postgres.Sql
    let app: FastifyInstance
    let idp: IdpStub
    let tokenAnke: string
    let tokenJonas: string
    let tokenBea: string

    const voegToe = (payload: Record<string, unknown>, token?: string) =>
      app.inject({
        method: 'POST',
        url: '/api/v1/kalender',
        headers: { authorization: `Bearer ${token ?? tokenAnke}`, 'content-type': 'application/json' },
        payload,
      })

    const kalender = (schooljaar: string, token?: string) =>
      app.inject({
        method: 'GET',
        url: `/api/v1/kalender?schooljaar=${schooljaar}`,
        headers: { authorization: `Bearer ${token ?? tokenAnke}` },
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
        '0007_scheduler.sql',
        '0008_kalender.sql',
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
          ('${ANKE}', '${TENANT_A}', 'idp|anke', 'Anke Willems', 'anke@voorbeeld.be'),
          ('${BART}', '${TENANT_A}', 'idp|bart', 'Bart Vermeulen', 'bart@voorbeeld.be'),
          ('${BEA}', '${TENANT_B}', 'idp|bea', 'Bea Maes', 'bea@voorbeeld.be');
        insert into core.roltoewijzing (tenant_id, persoon_id, school_id, rol, geldig_vanaf) values
          ('${TENANT_A}', '${JONAS}', '${SCHOOL_A}', 'PL', '2024-09-01'),
          ('${TENANT_A}', '${ANKE}', '${SCHOOL_A}', 'DIR', '2024-09-01'),
          ('${TENANT_B}', '${BEA}', '${SCHOOL_B}', 'DIR', '2024-09-01');
        insert into core.aanstelling (tenant_id, persoon_id, school_id, ambt, statuut, start, einde) values
          ('${TENANT_A}', '${JONAS}', '${SCHOOL_A}', 'leraar', 'TABD', '2025-02-24', '2025-06-30'),
          ('${TENANT_A}', '${JONAS}', '${SCHOOL_A}', 'leraar', 'TABD', '2026-01-01', '2026-06-30');
        insert into core.afwezigheid (tenant_id, persoon_id, code, start, einde) values
          ('${TENANT_A}', '${JONAS}', 'ziekte', '2025-03-17', '2025-03-19'),
          ('${TENANT_A}', '${JONAS}', 'ziekte', '2026-02-09', '2026-02-18');
      `)

      tokenAnke = await idp.token({ issuer: ISSUER_A, audience: AUDIENCE, sub: 'idp|anke' })
      tokenJonas = await idp.token({ issuer: ISSUER_A, audience: AUDIENCE, sub: 'idp|jonas' })
      tokenBea = await idp.token({ issuer: ISSUER_B, audience: AUDIENCE, sub: 'idp|bea' })

      app = buildApp({ databaseUrl: APP_URL as string })
      await app.ready()
    })

    afterAll(async () => {
      await app?.close()
      await admin?.end()
      await idp?.stop()
    })

    it('kalenderbeheer vereist BG of DIR; lezen mag iedereen', async () => {
      expect(
        (await voegToe({ schooljaar: '2025-2026', type: 'vakantie', start: '2025-10-27', einde: '2025-11-02' }, tokenJonas)).statusCode,
      ).toBe(403)
      expect((await kalender('2025-2026', tokenJonas)).statusCode).toBe(200)
    })

    it('directeur bouwt de jaarkalender op: vakanties + facultatieve dagen binnen het regelboek', async () => {
      for (const [start, einde, oms] of [
        ['2025-10-27', '2025-11-02', 'herfstvakantie'],
        ['2025-12-22', '2026-01-04', 'kerstvakantie'],
        ['2026-02-16', '2026-02-22', 'krokusvakantie'],
        ['2026-04-06', '2026-04-19', 'paasvakantie'],
      ]) {
        const antwoord = await voegToe({
          schooljaar: '2025-2026', type: 'vakantie', start, einde, omschrijving: oms,
        })
        expect(antwoord.statusCode).toBe(201)
      }

      const fac = await voegToe({
        schooljaar: '2025-2026', type: 'facultatieve_verlofdag', start: '2025-10-06', einde: '2025-10-06',
      })
      expect(fac.statusCode).toBe(201)
      expect(fac.json().meldingen).toEqual([])

      const lijst = (await kalender('2025-2026')).json()
      expect(lijst.periodes).toHaveLength(5)
      expect(lijst.meldingen).toEqual([])
    })

    it('regelboek blokkeert: derde facultatieve dag in 2025-2026 geeft 422 met meldingen', async () => {
      expect((await voegToe({
        schooljaar: '2025-2026', type: 'facultatieve_verlofdag', start: '2026-05-04', einde: '2026-05-04',
      })).statusCode).toBe(201)

      const derde = await voegToe({
        schooljaar: '2025-2026', type: 'facultatieve_verlofdag', start: '2026-05-15', einde: '2026-05-15',
      })
      expect(derde.statusCode).toBe(422)
      expect(derde.json().meldingen.some((m: { code: string }) => m.code === 'facultatief_overschreden')).toBe(true)
      // en er is dus niets opgeslagen
      expect((await kalender('2025-2026')).json().periodes).toHaveLength(6)
    })

    it('regelboek per schooljaar: facultatieve dag is afgeschaft vanaf 2026-2027', async () => {
      const antwoord = await voegToe({
        schooljaar: '2026-2027', type: 'facultatieve_verlofdag', start: '2026-10-05', einde: '2026-10-05',
      })
      expect(antwoord.statusCode).toBe(422)
      expect(JSON.stringify(antwoord.json().meldingen)).toContain('afgeschaft')
    })

    it('opvangplicht vanaf 2026-2027: studiedag zonder opvang geeft een waarschuwing, mét opvang niet', async () => {
      const zonder = await voegToe({
        schooljaar: '2026-2027', type: 'pedagogische_studiedag', start: '2026-11-13', einde: '2026-11-13', dagdeel: 'voormiddag',
      })
      expect(zonder.statusCode).toBe(201)
      expect(zonder.json().meldingen.some((m: { code: string }) => m.code === 'opvangplicht')).toBe(true)
    })

    it('buiten het schooljaar en onmogelijke datums worden geweigerd', async () => {
      expect((await voegToe({
        schooljaar: '2025-2026', type: 'vakantie', start: '2025-07-15', einde: '2025-07-20',
      })).statusCode).toBe(422)
      expect((await voegToe({
        schooljaar: '2025-2026', type: 'vakantie', start: '2026-02-30', einde: '2026-02-30',
      })).statusCode).toBe(400)
    })

    it('RLS: tenant B ziet de kalender van tenant A niet', async () => {
      expect((await kalender('2025-2026', tokenBea)).json().periodes).toHaveLength(0)
    })

    it('verwijderen kan (planning, geen juridisch feit) — mét audit-spoor', async () => {
      const extra = await voegToe({
        schooljaar: '2025-2026', type: 'pedagogische_studiedag', start: '2025-11-14', einde: '2025-11-14', dagdeel: 'voormiddag',
      })
      const id = extra.json().id
      const weg = await app.inject({
        method: 'DELETE',
        url: `/api/v1/kalender/${id}`,
        headers: { authorization: `Bearer ${tokenAnke}` },
      })
      expect(weg.statusCode).toBe(204)

      const [audit] = await admin`
        select count(*)::int as aantal from core.audit_log
        where object_type = 'kalenderperiode' and context ->> 'reden' like 'kalenderperiode verwijderd%'`
      expect(audit?.['aantal']).toBe(1)
    })

    it('B2: met een parameterversie zonder korte vakanties telt de teller de kalendervakanties niet mee', async () => {
      // teller vóór de omschakeling: D1-waarden
      const voor = await app.inject({
        method: 'GET',
        url: `/api/v1/personen/${JONAS}/tellers?peildatum=2026-06-30`,
        headers: { authorization: `Bearer ${tokenJonas}` },
      })
      expect(voor.json().tellers[0]).toMatchObject({ dagenTotaal: 308, dagenEffectief: 295 })

      // bekrachtigde tenantversie met korteVakantieTeltMee=false (vier-ogen via admin-seed)
      await admin.unsafe(`
        insert into core.regelparameter
          (tenant_id, status, geldig_vanaf, bron, drempel_totaal, drempel_effectief, max_per_schooljaar,
           telregels, voorgesteld_door, bekrachtigd_door)
        values
          ('${TENANT_A}', 'actief', '2019-09-01', 'fictieve versie — korte vakanties tellen niet (B2)',
           290, 200, 360,
           '{"weekendTeltMee":true,"korteVakantieTeltMee":false,"zomervakantieTeltMee":false,"effectieveAfwezigheidscodes":[]}',
           '${BART}', '${ANKE}');
      `)

      const na = await app.inject({
        method: 'GET',
        url: `/api/v1/personen/${JONAS}/tellers?peildatum=2026-06-30`,
        headers: { authorization: `Bearer ${tokenJonas}` },
      })
      // kerst (4 d. binnen aanstelling) + krokus (7) + paas (14) = 25 dagen minder;
      // ziektedagen 16-18/2 vallen in de krokusvakantie en tellen dus ook niet meer
      expect(na.json().tellers[0]).toMatchObject({ dagenTotaal: 283, dagenEffectief: 273 })
      expect(na.json().tellers[0].drempel.drempelBereikt).toBe(false)
    })
  },
)
