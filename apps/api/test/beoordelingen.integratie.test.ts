/**
 * Integratietest registratieflow beoordelingen (module D): een directeur
 * registreert een TADD-beoordeling tegen een open beoordelingsdeadline; de
 * deadline gaat naar 'geregistreerd' en de engine raakt hem nooit meer aan.
 * Casus D4 (stilzwijgend positief) kan pas ná het verstrijken.
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

const TENANT_A = 'cccccccc-1111-1111-1111-111111111111'
const TENANT_B = 'cccccccc-2222-2222-2222-222222222222'
const SCHOOL_A = 'cccccccc-3333-3333-3333-333333333333'
const SCHOOL_B = 'cccccccc-4444-4444-4444-444444444444'
const JONAS = 'cccccccc-5555-5555-5555-555555555555' // D1: drempel bereikt
const PIET = 'cccccccc-6666-6666-6666-666666666666' // idem, voor de D4-casus
const ANKE = 'cccccccc-7777-7777-7777-777777777777' // DIR tenant A
const BEA = 'cccccccc-8888-8888-8888-888888888888' // DIR tenant B

const ISSUER_A = 'https://idp.test/beoordelingen-a'
const ISSUER_B = 'https://idp.test/beoordelingen-b'
const AUDIENCE = 'draagvlak-api-test'

const repoWortel = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

describe.skipIf(ADMIN_URL === undefined || APP_URL === undefined)(
  'registratieflow beoordelingen (integratie)',
  () => {
    let admin: postgres.Sql
    let app: FastifyInstance
    let idp: IdpStub
    let tokenAnke: string
    let tokenJonas: string
    let tokenBea: string
    let jonasBeoordelingId: string
    let jonasKandidaatId: string
    let pietBeoordelingId: string

    const registreer = (
      deadlineId: string,
      payload: Record<string, unknown>,
      token?: string,
    ) =>
      app.inject({
        method: 'POST',
        url: `/api/v1/deadlines/${deadlineId}/registreer`,
        headers: {
          authorization: `Bearer ${token ?? tokenAnke}`,
          'content-type': 'application/json',
        },
        payload,
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
          ('${PIET}', '${TENANT_A}', 'idp|piet', 'Piet Claes', 'piet@voorbeeld.be'),
          ('${ANKE}', '${TENANT_A}', 'idp|anke', 'Anke Willems', 'anke@voorbeeld.be'),
          ('${BEA}', '${TENANT_B}', 'idp|bea', 'Bea Maes', 'bea@voorbeeld.be');
        insert into core.roltoewijzing (tenant_id, persoon_id, school_id, rol, geldig_vanaf) values
          ('${TENANT_A}', '${JONAS}', '${SCHOOL_A}', 'PL', '2024-09-01'),
          ('${TENANT_A}', '${ANKE}', '${SCHOOL_A}', 'DIR', '2024-09-01'),
          ('${TENANT_B}', '${BEA}', '${SCHOOL_B}', 'DIR', '2024-09-01');
        insert into core.aanstelling (tenant_id, persoon_id, school_id, ambt, statuut, start, einde) values
          ('${TENANT_A}', '${JONAS}', '${SCHOOL_A}', 'leraar', 'TABD', '2025-02-24', '2025-06-30'),
          ('${TENANT_A}', '${JONAS}', '${SCHOOL_A}', 'leraar', 'TABD', '2026-01-01', '2026-06-30'),
          ('${TENANT_A}', '${PIET}', '${SCHOOL_A}', 'leraar', 'TABD', '2025-02-24', '2025-06-30'),
          ('${TENANT_A}', '${PIET}', '${SCHOOL_A}', 'leraar', 'TABD', '2026-01-01', '2026-06-30');
      `)

      tokenAnke = await idp.token({ issuer: ISSUER_A, audience: AUDIENCE, sub: 'idp|anke' })
      tokenJonas = await idp.token({ issuer: ISSUER_A, audience: AUDIENCE, sub: 'idp|jonas' })
      tokenBea = await idp.token({ issuer: ISSUER_B, audience: AUDIENCE, sub: 'idp|bea' })

      app = buildApp({ databaseUrl: APP_URL as string, herberekenVensterDagen: 36500 })
      await app.ready()

      // drempeldetectie zet de deadlines klaar (2 per starter)
      const run = await app.inject({
        method: 'POST',
        url: '/api/v1/deadlines/herbereken',
        headers: { authorization: `Bearer ${tokenAnke}`, 'content-type': 'application/json' },
        payload: { vandaag: '2026-06-10' },
      })
      expect(run.json()).toMatchObject({ aangemaakt: 4 })

      const rijen = await admin`
        select id, persoon_id, type from core.deadline where tenant_id = ${TENANT_A}`
      jonasBeoordelingId = rijen.find((r) => r['persoon_id'] === JONAS && r['type'] === 'TADD_beoordeling')!['id']
      jonasKandidaatId = rijen.find((r) => r['persoon_id'] === JONAS && r['type'] === 'TADD_kandidaatstelling')!['id']
      pietBeoordelingId = rijen.find((r) => r['persoon_id'] === PIET && r['type'] === 'TADD_beoordeling')!['id']
    })

    afterAll(async () => {
      await app?.close()
      await admin?.end()
      await idp?.stop()
    })

    it('beoordelen is een directeursbevoegdheid: personeelslid krijgt 403', async () => {
      const antwoord = await registreer(jonasBeoordelingId, { resultaat: 'positief' }, tokenJonas)
      expect(antwoord.statusCode).toBe(403)
    })

    it('stilzwijgend positief kan niet vóór het verstrijken van de deadline (D4)', async () => {
      const antwoord = await registreer(jonasBeoordelingId, {
        resultaat: 'stilzwijgend_positief',
        vandaag: '2026-06-20',
      })
      expect(antwoord.statusCode).toBe(400)
      expect(antwoord.json().fout).toContain('verstreken')
    })

    it('alleen een beoordelingsdeadline is registreerbaar', async () => {
      const antwoord = await registreer(jonasKandidaatId, { resultaat: 'positief' })
      expect(antwoord.statusCode).toBe(400)
    })

    it('RLS: een directeur van een andere tenant vindt de deadline niet (404)', async () => {
      const antwoord = await registreer(jonasBeoordelingId, { resultaat: 'positief' }, tokenBea)
      expect(antwoord.statusCode).toBe(404)
    })

    it('directeur registreert een beoordeling met werkpunten — deadline naar geregistreerd, mét audit-spoor', async () => {
      const antwoord = await registreer(jonasBeoordelingId, {
        resultaat: 'met_werkpunten',
        opmerking: 'vervolgtraject afgesproken (klasmanagement)',
        vandaag: '2026-06-20',
      })
      expect(antwoord.statusCode).toBe(201)
      expect(antwoord.json().beoordeling).toMatchObject({
        persoonId: JONAS,
        ambt: 'leraar',
        schooljaar: '2025-2026',
        resultaat: 'met_werkpunten',
      })
      expect(antwoord.json().deadline).toMatchObject({ status: 'geregistreerd' })

      const overzicht = await app.inject({
        method: 'GET',
        url: '/api/v1/deadlines?status=geregistreerd',
        headers: { authorization: `Bearer ${tokenAnke}` },
      })
      expect(overzicht.json().deadlines.map((d: { id: string }) => d.id)).toContain(jonasBeoordelingId)

      const [audit] = await admin`
        select count(*)::int as aantal from core.audit_log
        where tenant_id = ${TENANT_A} and actor_id = ${ANKE}
          and (object_type = 'beoordeling' or context ->> 'reden' like 'deadline geregistreerd%')`
      expect(audit?.['aantal']).toBe(2)
    })

    it('dubbel registreren op dezelfde deadline: 409', async () => {
      const antwoord = await registreer(jonasBeoordelingId, { resultaat: 'positief' })
      expect(antwoord.statusCode).toBe(409)
    })

    it('herberekening raakt de geregistreerde deadline nooit meer aan', async () => {
      const run = await app.inject({
        method: 'POST',
        url: '/api/v1/deadlines/herbereken',
        headers: { authorization: `Bearer ${tokenAnke}`, 'content-type': 'application/json' },
        payload: { vandaag: '2026-06-20' },
      })
      // alleen de open kandidaatstellingen (15/6, nu verstreken) escaleren
      expect(run.json()).toMatchObject({ aangemaakt: 0, vervallen: 0 })

      const [rij] = await admin`
        select status from core.deadline where id = ${jonasBeoordelingId}`
      expect(rij?.['status']).toBe('geregistreerd')
    })

    it('D4: stilzwijgend positief ná het verstrijken, expliciet bevestigd door een directeur', async () => {
      const antwoord = await registreer(pietBeoordelingId, {
        resultaat: 'stilzwijgend_positief',
        vandaag: '2026-09-15',
      })
      expect(antwoord.statusCode).toBe(201)
      expect(antwoord.json().beoordeling.resultaat).toBe('stilzwijgend_positief')
    })

    it('dossierscherm: personeelslid ziet de eigen beoordelingen, met registrator', async () => {
      const antwoord = await app.inject({
        method: 'GET',
        url: `/api/v1/personen/${JONAS}/beoordelingen`,
        headers: { authorization: `Bearer ${tokenJonas}` },
      })
      expect(antwoord.statusCode).toBe(200)
      expect(antwoord.json().beoordelingen).toHaveLength(1)
      expect(antwoord.json().beoordelingen[0]).toMatchObject({
        schooljaar: '2025-2026',
        resultaat: 'met_werkpunten',
        geregistreerdDoor: 'Anke Willems',
      })

      const vreemd = await app.inject({
        method: 'GET',
        url: `/api/v1/personen/${PIET}/beoordelingen`,
        headers: { authorization: `Bearer ${tokenJonas}` },
      })
      expect(vreemd.statusCode).toBe(403)
    })
  },
)
