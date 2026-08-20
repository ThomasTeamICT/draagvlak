/**
 * Integratietest van de verticale doorsnede module B: echte migraties, echte
 * RLS (de app verbindt als draagvlak_app), echte teller-engine, echt endpoint,
 * en sinds ADR-0003 echte OIDC-tokenverificatie via een lokale IdP-stub.
 *
 * Draait alleen wanneer beide omgevingsvariabelen gezet zijn:
 *   DATABASE_ADMIN_URL  superuser, voor migraties en testdata
 *   DATABASE_URL        draagvlak_app, waarmee de applicatie verbindt
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

// lokaal zonder databank slaan deze tests over; in CI is dat een fout, geen
// stilte — anders is een verkeerd geconfigureerde pipeline vals-groen
if (process.env['CI'] !== undefined && (ADMIN_URL === undefined || APP_URL === undefined)) {
  throw new Error('CI zonder DATABASE_ADMIN_URL/DATABASE_URL: integratietests zouden stil overgeslagen worden')
}

const TENANT_A = '11111111-1111-1111-1111-111111111111'
const TENANT_B = '22222222-2222-2222-2222-222222222222'
const SCHOOL_A = '33333333-3333-3333-3333-333333333333'
const SCHOOL_B = '77777777-7777-7777-7777-777777777777'
const JONAS = '44444444-4444-4444-4444-444444444444'
const ANKE = '55555555-5555-5555-5555-555555555555'
const BEA = '66666666-6666-6666-6666-666666666666'

const ISSUER_A = 'https://idp.test/personeel-a'
const ISSUER_B = 'https://idp.test/personeel-b'
const AUDIENCE = 'draagvlak-api-test'

const repoWortel = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

describe.skipIf(ADMIN_URL === undefined || APP_URL === undefined)(
  'module B — verticale doorsnede (integratie)',
  () => {
    let admin: postgres.Sql
    let app: FastifyInstance
    let idp: IdpStub
    let tokenAnke: string
    let tokenJonas: string
    let tokenBea: string

    const tellers = (persoonId: string, token?: string) =>
      app.inject({
        method: 'GET',
        url: `/api/v1/personen/${persoonId}/tellers?peildatum=2026-06-30`,
        ...(token !== undefined ? { headers: { authorization: `Bearer ${token}` } } : {}),
      })

    beforeAll(async () => {
      idp = await startIdpStub()
      admin = postgres(ADMIN_URL as string, { max: 1, onnotice: () => {} })

      await admin.unsafe('drop schema if exists core cascade')
      await admin.file(join(repoWortel, 'db', 'bootstrap', 'rollen.sql'), { cache: false })
      for (const migratie of ['0001_init.sql', '0002_personeel.sql', '0003_deadlines.sql', '0004_idp.sql', '0005_beoordeling.sql', '0006_regelparameters.sql', '0007_scheduler.sql', '0008_kalender.sql', '0009_toezichten.sql']) {
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

    it('directeur ziet de teller met drempelevaluatie en verantwoording (casus D1)', async () => {
      const antwoord = await tellers(JONAS, tokenAnke)
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
      expect(teller.verantwoording.periodes).toHaveLength(2)
      expect(teller.verantwoording.parameterbronnen[0]).toContain('PERS/2019/03')
    })

    it('een personeelslid ziet het eigen dossier, maar niet dat van een ander (403)', async () => {
      expect((await tellers(JONAS, tokenJonas)).statusCode).toBe(200)
      expect((await tellers(ANKE, tokenJonas)).statusCode).toBe(403)
    })

    it('RLS: een directeur van een andere tenant vindt de persoon niet (404, geen 403)', async () => {
      expect((await tellers(JONAS, tokenBea)).statusCode).toBe(404)
    })

    it('zonder token, met vervalst token of met verlopen token: 401', async () => {
      expect((await tellers(JONAS)).statusCode).toBe(401)

      const vervalst = await idp.token({
        issuer: ISSUER_A,
        audience: AUDIENCE,
        sub: 'idp|anke',
        sleutel: idp.vreemdeSleutel,
      })
      expect((await tellers(JONAS, vervalst)).statusCode).toBe(401)

      const verlopen = await idp.token({
        issuer: ISSUER_A,
        audience: AUDIENCE,
        sub: 'idp|anke',
        geldigSeconden: -60,
      })
      expect((await tellers(JONAS, verlopen)).statusCode).toBe(401)
    })

    it('verkeerde audience of onbekende issuer: 401', async () => {
      const foutAudience = await idp.token({
        issuer: ISSUER_A,
        audience: 'iemand-anders',
        sub: 'idp|anke',
      })
      expect((await tellers(JONAS, foutAudience)).statusCode).toBe(401)

      const onbekendeIssuer = await idp.token({
        issuer: 'https://idp.test/onbekend',
        audience: AUDIENCE,
        sub: 'idp|anke',
      })
      expect((await tellers(JONAS, onbekendeIssuer)).statusCode).toBe(401)
    })

    it('geldig token zonder gekend account: 403 (geen JIT-provisioning)', async () => {
      const onbekend = await idp.token({ issuer: ISSUER_A, audience: AUDIENCE, sub: 'idp|niemand' })
      expect((await tellers(JONAS, onbekend)).statusCode).toBe(403)
    })

    it('valideert invoer: ongeldige peildatum en ongeldig uuid', async () => {
      const foutePeildatum = await app.inject({
        method: 'GET',
        url: `/api/v1/personen/${JONAS}/tellers?peildatum=2026-02-30`,
        headers: { authorization: `Bearer ${tokenAnke}` },
      })
      expect(foutePeildatum.statusCode).toBe(400)

      const foutUuid = await app.inject({
        method: 'GET',
        url: '/api/v1/personen/geen-uuid/tellers',
        headers: { authorization: `Bearer ${tokenAnke}` },
      })
      expect(foutUuid.statusCode).toBe(400)
    })

    it('onbekende persoon binnen de eigen tenant → 404', async () => {
      expect((await tellers('99999999-9999-9999-9999-999999999999', tokenAnke)).statusCode).toBe(404)
    })
  },
)
