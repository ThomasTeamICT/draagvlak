/**
 * Integratietest deadline-engine: drempeldetectie, escalatie, idempotentie en
 * het intrekken van signalen (casus D3) — tegen echte migraties, als
 * draagvlak_app, met echte OIDC-tokens (ADR-0003).
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

const TENANT_A = 'aaaaaaaa-1111-1111-1111-111111111111'
const TENANT_B = 'bbbbbbbb-2222-2222-2222-222222222222'
const SCHOOL_A = 'aaaaaaaa-3333-3333-3333-333333333333'
const SCHOOL_B = 'bbbbbbbb-8888-8888-8888-888888888888'
const JONAS = 'aaaaaaaa-4444-4444-4444-444444444444' // D1: 308/295 → drempel bereikt
const SOFIE = 'aaaaaaaa-5555-5555-5555-555555555555' // D2: 288 → onder de drempel
const ANKE = 'aaaaaaaa-6666-6666-6666-666666666666' // directeur (BG/DIR mag herberekenen)
const BEA = 'bbbbbbbb-7777-7777-7777-777777777777' // directeur tenant B

const ISSUER_A = 'https://idp.test/deadlines-a'
const ISSUER_B = 'https://idp.test/deadlines-b'
const AUDIENCE = 'draagvlak-api-test'

const repoWortel = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

describe.skipIf(ADMIN_URL === undefined || APP_URL === undefined)(
  'deadline-engine (integratie)',
  () => {
    let admin: postgres.Sql
    let app: FastifyInstance
    let idp: IdpStub
    let tokenAnke: string
    let tokenJonas: string
    let tokenBea: string

    const herbereken = (vandaag: string, token?: string) =>
      app.inject({
        method: 'POST',
        url: '/api/v1/deadlines/herbereken',
        headers: {
          authorization: `Bearer ${token ?? tokenAnke}`,
          'content-type': 'application/json',
        },
        payload: { vandaag },
      })

    const overzicht = (status = 'open', token?: string) =>
      app.inject({
        method: 'GET',
        url: `/api/v1/deadlines?status=${status}`,
        headers: { authorization: `Bearer ${token ?? tokenAnke}` },
      })

    beforeAll(async () => {
      idp = await startIdpStub()
      admin = postgres(ADMIN_URL as string, { max: 1, onnotice: () => {} })

      await admin.unsafe('drop schema if exists core cascade')
      await admin.file(join(repoWortel, 'db', 'bootstrap', 'rollen.sql'), { cache: false })
      for (const migratie of ['0001_init.sql', '0002_personeel.sql', '0003_deadlines.sql', '0004_idp.sql']) {
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
          ('${SOFIE}', '${TENANT_A}', 'idp|sofie', 'Sofie Peeters', 'sofie@voorbeeld.be'),
          ('${ANKE}', '${TENANT_A}', 'idp|anke', 'Anke Willems', 'anke@voorbeeld.be'),
          ('${BEA}', '${TENANT_B}', 'idp|bea', 'Bea Maes', 'bea@voorbeeld.be');
        insert into core.roltoewijzing (tenant_id, persoon_id, school_id, rol, geldig_vanaf) values
          ('${TENANT_A}', '${JONAS}', '${SCHOOL_A}', 'PL', '2024-09-01'),
          ('${TENANT_A}', '${ANKE}', '${SCHOOL_A}', 'DIR', '2024-09-01'),
          ('${TENANT_B}', '${BEA}', '${SCHOOL_B}', 'DIR', '2024-09-01');
        insert into core.aanstelling (tenant_id, persoon_id, school_id, ambt, statuut, start, einde) values
          ('${TENANT_A}', '${JONAS}', '${SCHOOL_A}', 'leraar', 'TABD', '2025-02-24', '2025-06-30'),
          ('${TENANT_A}', '${JONAS}', '${SCHOOL_A}', 'leraar', 'TABD', '2026-01-01', '2026-06-30'),
          ('${TENANT_A}', '${SOFIE}', '${SCHOOL_A}', 'leraar', 'TABD', '2025-09-16', '2026-06-30');
        insert into core.afwezigheid (tenant_id, persoon_id, code, start, einde) values
          ('${TENANT_A}', '${JONAS}', 'ziekte', '2025-03-17', '2025-03-19'),
          ('${TENANT_A}', '${JONAS}', 'ziekte', '2026-02-09', '2026-02-18');
      `)

      tokenAnke = await idp.token({ issuer: ISSUER_A, audience: AUDIENCE, sub: 'idp|anke' })
      tokenJonas = await idp.token({ issuer: ISSUER_A, audience: AUDIENCE, sub: 'idp|jonas' })
      tokenBea = await idp.token({ issuer: ISSUER_B, audience: AUDIENCE, sub: 'idp|bea' })

      // ruim venster: de suite injecteert vaste datums die anders ooit buiten
      // het plausibiliteitsvenster rond de systeemdatum zouden vallen
      app = buildApp({ databaseUrl: APP_URL as string, herberekenVensterDagen: 36500 })
      await app.ready()
    })

    afterAll(async () => {
      await app?.close()
      await admin?.end()
      await idp?.stop()
    })

    it('detecteert de drempel en maakt beide deadlines aan — alleen voor wie ze bereikt', async () => {
      const antwoord = await herbereken('2026-03-01')
      expect(antwoord.statusCode).toBe(200)
      expect(antwoord.json()).toMatchObject({
        peildatum: '2026-06-30',
        personenVerwerkt: 3,
        aangemaakt: 2,
        bijgewerkt: 0,
        vervallen: 0,
      })

      const lichaam = (await overzicht()).json()
      expect(lichaam.deadlines).toHaveLength(2)
      expect(lichaam.deadlines.map((d: { type: string; datum: string }) => [d.type, d.datum])).toEqual([
        ['TADD_kandidaatstelling', '2026-06-15'],
        ['TADD_beoordeling', '2026-06-30'],
      ])
      const eerste = lichaam.deadlines[0]
      expect(eerste.naam).toBe('Jonas Dierckx')
      expect(eerste.escalatieniveau).toBe(0)
      expect(eerste.berekening).toMatchObject({ dagenTotaal: 308, dagenEffectief: 295 })
    })

    it('audittrail draagt de geauthenticeerde actor', async () => {
      const [rij] = await admin`
        select count(*)::int as aantal from core.audit_log
        where object_type = 'deadline' and actor_id = ${ANKE}`
      expect(rij?.['aantal']).toBeGreaterThanOrEqual(2)
    })

    it('autorisatie: een personeelslid zonder DIR/BG-rol mag de engine niet aanroepen', async () => {
      expect((await herbereken('2026-03-01', tokenJonas)).statusCode).toBe(403)
      expect((await overzicht('open', tokenJonas)).statusCode).toBe(403)
    })

    it('is idempotent: opnieuw draaien wijzigt niets', async () => {
      const antwoord = await herbereken('2026-03-01')
      expect(antwoord.json()).toMatchObject({ aangemaakt: 0, bijgewerkt: 0, vervallen: 0 })
    })

    it('actualiseert escalatieniveaus naarmate de deadline nadert', async () => {
      const antwoord = await herbereken('2026-06-10')
      expect(antwoord.json()).toMatchObject({ aangemaakt: 0, bijgewerkt: 2, vervallen: 0 })

      const lichaam = (await overzicht()).json()
      const perType = Object.fromEntries(
        lichaam.deadlines.map((d: { type: string; escalatieniveau: number }) => [
          d.type,
          d.escalatieniveau,
        ]),
      )
      // 15/6 over 5 dagen → AD/bestuur (4); 30/6 over 20 dagen → herhaling eigenaar (2)
      expect(perType).toEqual({ TADD_kandidaatstelling: 4, TADD_beoordeling: 2 })
    })

    it('trekt signalen in wanneer de drempel wegvalt (casus D3), mét audit-spoor', async () => {
      // 97 extra ziektedagen duwen Jonas' effectief van 295 naar 198 (< 200)
      await admin.unsafe(`
        insert into core.afwezigheid (tenant_id, persoon_id, code, start, einde) values
          ('${TENANT_A}', '${JONAS}', 'ziekte', '2026-03-01', '2026-06-05');
      `)

      const antwoord = await herbereken('2026-06-10')
      expect(antwoord.json()).toMatchObject({ aangemaakt: 0, vervallen: 2 })

      expect((await overzicht('open')).json().deadlines).toHaveLength(0)
      const vervallen = (await overzicht('vervallen')).json().deadlines
      expect(vervallen).toHaveLength(2)
      expect(vervallen[0].berekening).toMatchObject({ dagenEffectief: 198 })

      const [audit] = await admin`
        select count(*)::int as aantal from core.audit_log
        where object_type = 'deadline' and context ->> 'reden' like 'deadline ingetrokken%'`
      expect(audit?.['aantal']).toBe(2)
    })

    it('heropent een vervallen deadline wanneer de drempel opnieuw bereikt wordt', async () => {
      await admin.unsafe(`
        delete from core.afwezigheid
        where persoon_id = '${JONAS}' and start = '2026-03-01';
      `)

      const antwoord = await herbereken('2026-06-10')
      expect(antwoord.json()).toMatchObject({ aangemaakt: 0, bijgewerkt: 2, vervallen: 0 })
      expect((await overzicht('open')).json().deadlines).toHaveLength(2)
    })

    it('tenant-afscherming: tenant B verwerkt en ziet niets', async () => {
      const antwoord = await herbereken('2026-06-10', tokenBea)
      expect(antwoord.json()).toMatchObject({ personenVerwerkt: 1, aangemaakt: 0 })
      expect((await overzicht('open', tokenBea)).json().deadlines).toHaveLength(0)
    })

    it('schooljaar-rollover: oude open deadlines blijven staan en escaleren tot "verstreken" — nooit stil intrekken', async () => {
      const antwoord = await herbereken('2026-09-15')
      // nieuwe 2027-deadlines erbij (drempel blijft bereikt); de nooit
      // geregistreerde 2026-deadlines blijven open en escaleren naar niveau 5
      expect(antwoord.json()).toMatchObject({ aangemaakt: 2, bijgewerkt: 2, vervallen: 0 })

      const open = (await overzicht('open')).json().deadlines
      expect(open).toHaveLength(4)
      const perDatum = Object.fromEntries(
        open.map((d: { datum: string; escalatieniveau: number }) => [d.datum, d.escalatieniveau]),
      )
      expect(perDatum).toEqual({
        '2026-06-15': 5,
        '2026-06-30': 5,
        '2027-06-15': 0,
        '2027-06-30': 0,
      })

      const [audit] = await admin`
        select count(*)::int as aantal from core.audit_log
        where object_type = 'deadline' and context ->> 'reden' like 'escalatieniveau%verstreken%'`
      expect(audit?.['aantal']).toBe(2)
    })

    it("status 'geregistreerd' wordt door herberekening nooit aangeraakt", async () => {
      await admin.unsafe(`
        update core.deadline set status = 'geregistreerd'
        where persoon_id = '${JONAS}' and datum = '2026-06-15';
      `)

      const antwoord = await herbereken('2026-09-15')
      expect(antwoord.json()).toMatchObject({ aangemaakt: 0, bijgewerkt: 0, vervallen: 0 })

      const geregistreerd = (await overzicht('geregistreerd')).json().deadlines
      expect(geregistreerd).toHaveLength(1)
      expect(geregistreerd[0]).toMatchObject({ datum: '2026-06-15', escalatieniveau: 5 })
    })

    it('verdwenen ambt: achtergebleven open deadlines worden ingetrokken met waarheidsgetrouwe reden', async () => {
      await admin.unsafe(`
        update core.aanstelling set ambt = 'kleuteronderwijzer'
        where persoon_id = '${JONAS}';
      `)

      const antwoord = await herbereken('2026-09-15')
      // nieuw ambt haalt de drempel (zelfde dagen) → 2 nieuwe deadlines;
      // de 3 open 'leraar'-deadlines (2026-06-30 + beide 2027) vervallen
      expect(antwoord.json()).toMatchObject({ aangemaakt: 2, vervallen: 3 })

      const open = (await overzicht('open')).json().deadlines
      expect(open).toHaveLength(2)
      expect(open.every((d: { ambt: string }) => d.ambt === 'kleuteronderwijzer')).toBe(true)

      const [audit] = await admin`
        select count(*)::int as aantal from core.audit_log
        where object_type = 'deadline'
          and context ->> 'reden' like 'deadline ingetrokken%dienstanciënniteit 0 dagen%'`
      expect(audit?.['aantal']).toBe(3)

      // de geregistreerde 'leraar'-deadline blijft ook nu onaangeroerd
      expect((await overzicht('geregistreerd')).json().deadlines).toHaveLength(1)
    })

    it('weigert een onmogelijke kalenderdatum met 400 (geen 500)', async () => {
      const antwoord = await herbereken('2026-02-30')
      expect(antwoord.statusCode).toBe(400)
      expect(antwoord.json().fout).toContain('ongeldige kalenderdatum')
    })

    it('weigert een peildatum buiten het plausibiliteitsvenster (tikfout in jaartal)', async () => {
      const strikt = buildApp({ databaseUrl: APP_URL as string })
      await strikt.ready()
      try {
        const antwoord = await strikt.inject({
          method: 'POST',
          url: '/api/v1/deadlines/herbereken',
          headers: { authorization: `Bearer ${tokenAnke}`, 'content-type': 'application/json' },
          payload: { vandaag: '2020-06-10' },
        })
        expect(antwoord.statusCode).toBe(400)
        expect(antwoord.json().fout).toContain('herberekening geweigerd')
        // niets ingetrokken door de geweigerde aanroep
        expect((await overzicht('open')).json().deadlines).toHaveLength(2)
      } finally {
        await strikt.close()
      }
    })
  },
)
