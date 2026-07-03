/**
 * Integratietest van de verticale doorsnede module B: echte migraties, echte
 * RLS (de app verbindt als draagvlak_app), echte teller-engine, echt endpoint.
 *
 * Draait alleen wanneer beide omgevingsvariabelen gezet zijn:
 *   DATABASE_ADMIN_URL  superuser, voor migraties en testdata
 *   DATABASE_URL        draagvlak_app, waarmee de applicatie verbindt
 * Zonder databank wordt de suite overgeslagen (unit-tests blijven draaien).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import postgres from 'postgres'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app.js'

const ADMIN_URL = process.env['DATABASE_ADMIN_URL']
const APP_URL = process.env['DATABASE_URL']

const TENANT_A = '11111111-1111-1111-1111-111111111111'
const TENANT_B = '22222222-2222-2222-2222-222222222222'
const SCHOOL_A = '33333333-3333-3333-3333-333333333333'
const JONAS = '44444444-4444-4444-4444-444444444444'

const repoWortel = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

describe.skipIf(ADMIN_URL === undefined || APP_URL === undefined)(
  'module B — verticale doorsnede (integratie)',
  () => {
    let admin: postgres.Sql
    let app: FastifyInstance

    beforeAll(async () => {
      // max: 1 — de migratiebestanden bevatten eigen begin/commit; postgres.js
      // staat handmatige transacties alleen toe zonder connection pooling
      admin = postgres(ADMIN_URL as string, { max: 1, onnotice: () => {} })

      // vers schema; rollen zijn cluster-niveau en idempotent
      await admin.unsafe('drop schema if exists core cascade')
      await admin.file(join(repoWortel, 'db', 'bootstrap', 'rollen.sql'), { cache: false })
      await admin.file(join(repoWortel, 'db', 'migrations', '0001_init.sql'), { cache: false })
      await admin.file(join(repoWortel, 'db', 'migrations', '0002_personeel.sql'), { cache: false })

      // testdata: tenant A met de D1-casus uit het testcontract, plus een lege tenant B
      await admin.unsafe(`
        insert into core.tenant (id, naam) values
          ('${TENANT_A}', 'Scholengroep A'),
          ('${TENANT_B}', 'Scholengroep B');
        insert into core.school (id, tenant_id, instellingsnummer, naam) values
          ('${SCHOOL_A}', '${TENANT_A}', '012345', 'Basisschool De Regenboog');
        insert into core.persoon (id, tenant_id, idp_subject, naam, email) values
          ('${JONAS}', '${TENANT_A}', 'idp|jonas', 'Jonas Dierckx', 'jonas@voorbeeld.be');
        insert into core.aanstelling (tenant_id, persoon_id, school_id, ambt, statuut, start, einde) values
          ('${TENANT_A}', '${JONAS}', '${SCHOOL_A}', 'leraar', 'TABD', '2025-02-24', '2025-06-30'),
          ('${TENANT_A}', '${JONAS}', '${SCHOOL_A}', 'leraar', 'TABD', '2026-01-01', '2026-06-30');
        insert into core.afwezigheid (tenant_id, persoon_id, code, start, einde) values
          ('${TENANT_A}', '${JONAS}', 'ziekte', '2025-03-17', '2025-03-19'),
          ('${TENANT_A}', '${JONAS}', 'ziekte', '2026-02-09', '2026-02-18');
      `)

      app = buildApp({ databaseUrl: APP_URL as string })
      await app.ready()
    })

    afterAll(async () => {
      await app?.close()
      await admin?.end()
    })

    it('serveert de teller met drempelevaluatie en verantwoording (casus D1)', async () => {
      const antwoord = await app.inject({
        method: 'GET',
        url: `/api/v1/personen/${JONAS}/tellers?peildatum=2026-06-30`,
        headers: { 'x-tenant-id': TENANT_A },
      })
      expect(antwoord.statusCode).toBe(200)

      const lichaam = antwoord.json()
      expect(lichaam.peildatum).toBe('2026-06-30')
      expect(lichaam.tellers).toHaveLength(1)

      const teller = lichaam.tellers[0]
      expect(teller.ambt).toBe('leraar')
      expect(teller.dagenTotaal).toBe(308)
      expect(teller.dagenEffectief).toBe(295)
      expect(teller.drempel.drempelBereikt).toBe(true)
      expect(teller.drempel.deadlines).toEqual({
        kandidaatstellingTadd: '2026-06-15',
        beoordeling: '2026-06-30',
      })
      // uitlegbaarheid: de verantwoording reist mee tot in het antwoord
      expect(teller.verantwoording.periodes).toHaveLength(2)
      expect(teller.verantwoording.afwezigheden).toHaveLength(2)
      expect(teller.verantwoording.parameterbronnen[0]).toContain('PERS/2019/03')
    })

    it('RLS: dezelfde persoon is voor een andere tenant onvindbaar (404, geen 403)', async () => {
      const antwoord = await app.inject({
        method: 'GET',
        url: `/api/v1/personen/${JONAS}/tellers?peildatum=2026-06-30`,
        headers: { 'x-tenant-id': TENANT_B },
      })
      expect(antwoord.statusCode).toBe(404)
    })

    it('zonder tenant-context wordt het verzoek geweigerd', async () => {
      const antwoord = await app.inject({
        method: 'GET',
        url: `/api/v1/personen/${JONAS}/tellers?peildatum=2026-06-30`,
      })
      expect(antwoord.statusCode).toBe(400)
    })

    it('valideert invoer: ongeldige peildatum en ongeldig uuid', async () => {
      const foutePeildatum = await app.inject({
        method: 'GET',
        url: `/api/v1/personen/${JONAS}/tellers?peildatum=30-06-2026`,
        headers: { 'x-tenant-id': TENANT_A },
      })
      expect(foutePeildatum.statusCode).toBe(400)

      const foutUuid = await app.inject({
        method: 'GET',
        url: '/api/v1/personen/geen-uuid/tellers',
        headers: { 'x-tenant-id': TENANT_A },
      })
      expect(foutUuid.statusCode).toBe(400)
    })

    it('onbekende persoon binnen de eigen tenant → 404', async () => {
      const antwoord = await app.inject({
        method: 'GET',
        url: '/api/v1/personen/99999999-9999-9999-9999-999999999999/tellers',
        headers: { 'x-tenant-id': TENANT_A },
      })
      expect(antwoord.statusCode).toBe(404)
    })
  },
)
