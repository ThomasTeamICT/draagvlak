/**
 * Integratietest vervangingen (module P3): afwezigheid melden, kanaaladvies
 * op echte kalender + contingent + platformleden, vervangersvoorstellen,
 * vervanging vastleggen met verplichte checks (reaffectatie, benoemd
 * verlies bij noodmaatregelen), contingentbewaking en tenant-afscherming.
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

const TENANT_A = 'cdcdcdcd-1111-1111-1111-111111111111'
const TENANT_B = 'cdcdcdcd-2222-2222-2222-222222222222'
const SCHOOL_A = 'cdcdcdcd-3333-3333-3333-333333333333'
const SCHOOL_B = 'cdcdcdcd-4444-4444-4444-444444444444'
const ANKE = 'cdcdcdcd-5555-5555-5555-555555555555' // DIR
const ELS = 'cdcdcdcd-6666-6666-6666-666666666666'  // wordt ziek
const KARIM = 'cdcdcdcd-7777-7777-7777-777777777777' // platformlid
const LIEN = 'cdcdcdcd-8888-8888-8888-888888888888'
const BEA = 'cdcdcdcd-9999-9999-9999-999999999999' // DIR tenant B

const ISSUER_A = 'https://idp.test/vervangingen-a'
const ISSUER_B = 'https://idp.test/vervangingen-b'
const AUDIENCE = 'draagvlak-api-test'

const repoWortel = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

describe.skipIf(ADMIN_URL === undefined || APP_URL === undefined)(
  'vervangingen (integratie)',
  () => {
    let admin: postgres.Sql
    let app: FastifyInstance
    let idp: IdpStub
    let tokenAnke: string
    let tokenEls: string
    let tokenBea: string

    const post = (url: string, payload: Record<string, unknown>, token?: string) =>
      app.inject({
        method: 'POST',
        url,
        headers: { authorization: `Bearer ${token ?? tokenAnke}`, 'content-type': 'application/json' },
        payload,
      })
    const put = (url: string, payload: Record<string, unknown>, token?: string) =>
      app.inject({
        method: 'PUT',
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
        '0010_vervangingen.sql',
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
          ('${BEA}', '${TENANT_B}', 'idp|bea', 'Bea Maes', 'bea@voorbeeld.be');
        insert into core.roltoewijzing (tenant_id, persoon_id, school_id, rol, geldig_vanaf) values
          ('${TENANT_A}', '${ANKE}', '${SCHOOL_A}', 'DIR', '2024-09-01'),
          ('${TENANT_A}', '${ELS}', '${SCHOOL_A}', 'PL', '2024-09-01'),
          ('${TENANT_B}', '${BEA}', '${SCHOOL_B}', 'DIR', '2024-09-01');
        -- herfstvakantie voor de vakantiebrug-casus (V7)
        insert into core.kalenderperiode (tenant_id, schooljaar, type, start, einde, omschrijving) values
          ('${TENANT_A}', '2025-2026', 'vakantie', '2025-10-27', '2025-11-02', 'herfstvakantie');
        insert into core.platformlid (tenant_id, persoon_id, schooljaar) values
          ('${TENANT_A}', '${KARIM}', '2025-2026');
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

    it('directeur meldt een afwezigheid; personeelslid mag dat niet', async () => {
      expect(
        (
          await post(
            '/api/v1/afwezigheden',
            { persoonId: ELS, start: '2026-02-02', einde: '2026-02-04', code: 'ziekte' },
            tokenEls,
          )
        ).statusCode,
      ).toBe(403)

      const antwoord = await post('/api/v1/afwezigheden', {
        persoonId: ELS,
        start: '2026-02-02',
        einde: '2026-02-04',
        code: 'ziekte',
      })
      expect(antwoord.statusCode).toBe(201)
    })

    it('V5 op echte data: korte ziekte, platformlid vrij → platform aanbevolen', async () => {
      const antwoord = await get(`/api/v1/vervangingen/advies?persoonId=${ELS}&peildatum=2026-02-03`)
      expect(antwoord.statusCode).toBe(200)
      const advies = antwoord.json()
      expect(advies.werkdagen).toBe(3)
      expect(advies.drempelBereikt).toBe(false)
      expect(advies.platformledenVrij).toBe(1)
      expect(advies.aanbevolen).toBe('lerarenplatform')
      expect(advies.schooljaar).toBe('2025-2026')
    })

    it('V7 op echte data: de herfstvakantie-brug telt als één reeks van 10 werkdagen', async () => {
      await post('/api/v1/afwezigheden', {
        persoonId: LIEN,
        start: '2025-10-20',
        einde: '2025-10-24',
        code: 'ziekte',
      })
      await post('/api/v1/afwezigheden', {
        persoonId: LIEN,
        start: '2025-11-03',
        einde: '2025-11-07',
        code: 'ziekte',
      })
      const advies = (
        await get(`/api/v1/vervangingen/advies?persoonId=${LIEN}&peildatum=2025-11-05`)
      ).json()
      expect(advies.werkdagen).toBe(10)
      expect(advies.drempelBereikt).toBe(true)
      expect(advies.verantwoording.join(' ')).toContain('samengeteld')
    })

    it('kandidaten: het platformlid staat bovenaan, de afwezige staat er niet in', async () => {
      const antwoord = await get(`/api/v1/vervangingen/kandidaten?afwezigeId=${ELS}&datum=2026-02-03`)
      expect(antwoord.statusCode).toBe(200)
      const { kandidaten } = antwoord.json()
      expect(kandidaten[0].persoonId).toBe(KARIM)
      expect(kandidaten[0].voorstel.aanbevolen).toBe(true)
      expect(kandidaten.map((k: { persoonId: string }) => k.persoonId)).not.toContain(ELS)
    })

    it('een tijdelijke aanstelling zonder bevestigde reaffectatiecheck wordt geweigerd', async () => {
      const antwoord = await post('/api/v1/vervangingen', {
        afwezigeId: LIEN,
        start: '2025-11-10',
        einde: '2025-11-21',
        kanaal: 'tijdelijke_aanstelling',
        externeNaam: 'Sofie Peeters',
      })
      expect(antwoord.statusCode).toBe(422)
      expect(antwoord.json().fout).toContain('reaffectatie')

      const met = await post('/api/v1/vervangingen', {
        afwezigeId: LIEN,
        start: '2025-11-10',
        einde: '2025-11-21',
        kanaal: 'tijdelijke_aanstelling',
        externeNaam: 'Sofie Peeters',
        reaffectatieGecheckt: true,
      })
      expect(met.statusCode).toBe(201)
    })

    it('een noodmaatregel zonder benoemd verlies wordt geweigerd — mét verlies gelogd tot in de audit', async () => {
      const zonder = await post('/api/v1/vervangingen', {
        afwezigeId: ELS,
        start: '2026-02-02',
        einde: '2026-02-02',
        kanaal: 'intern',
        noodSoort: 'zorg_inzetten',
      })
      expect(zonder.statusCode).toBe(422)
      expect(zonder.json().fout).toContain('verlies')

      const met = await post('/api/v1/vervangingen', {
        afwezigeId: ELS,
        start: '2026-02-02',
        einde: '2026-02-02',
        kanaal: 'intern',
        vervangerId: KARIM,
        noodSoort: 'zorg_inzetten',
        noodVerlies: '4 zorguren vallen weg in leerjaar 3',
      })
      expect(met.statusCode).toBe(201)

      const [audit] = await admin`
        select context ->> 'reden' as reden from core.audit_log
        where object_type = 'vervanging' and object_id = ${met.json().id}`
      expect(audit?.['reden']).toContain('4 zorguren vallen weg')
    })

    it('contingent: budget zetten, verbruik bewaken, overschrijding weigeren', async () => {
      expect(
        (await put('/api/v1/vervangingen/contingent', { schooljaar: '2025-2026', eenheden: 5 })).statusCode,
      ).toBe(403) // DIR is geen BG

      await admin`
        insert into core.roltoewijzing (tenant_id, persoon_id, school_id, rol, geldig_vanaf)
        values (${TENANT_A}, ${ANKE}, ${SCHOOL_A}, 'BG', '2024-09-01')`
      expect(
        (await put('/api/v1/vervangingen/contingent', { schooljaar: '2025-2026', eenheden: 5 })).statusCode,
      ).toBe(204)

      const teVeel = await post('/api/v1/vervangingen', {
        afwezigeId: ELS,
        start: '2026-03-02',
        einde: '2026-03-06',
        kanaal: 'vervangingseenheden',
        vervangerId: KARIM,
        eenheden: 8,
      })
      expect(teVeel.statusCode).toBe(422)
      expect(teVeel.json().fout).toContain('onvoldoende contingent')

      const past = await post('/api/v1/vervangingen', {
        afwezigeId: ELS,
        start: '2026-03-02',
        einde: '2026-03-04',
        kanaal: 'vervangingseenheden',
        vervangerId: KARIM,
        eenheden: 3,
      })
      expect(past.statusCode).toBe(201)

      const stand = (await get('/api/v1/vervangingen/contingent?schooljaar=2025-2026')).json()
      expect(stand).toMatchObject({ totaal: 5, verbruikt: 3, restant: 2 })
    })

    it('het overzicht toont de vervangingen; annuleren geeft het contingent terug', async () => {
      const lijst = (await get('/api/v1/vervangingen?van=2026-03-01&tot=2026-03-31')).json()
      const rij = lijst.vervangingen.find((v: { kanaal: string }) => v.kanaal === 'vervangingseenheden')
      expect(rij).toMatchObject({ afwezige: 'Els Vermeulen', vervanger: 'Karim Benali', eenheden: 3 })

      expect((await post(`/api/v1/vervangingen/${rij.id}/annuleer`, {})).statusCode).toBe(204)
      const stand = (await get('/api/v1/vervangingen/contingent?schooljaar=2025-2026')).json()
      expect(stand.restant).toBe(5)
    })

    it('tenant B ziet niets van tenant A', async () => {
      const advies = await get(`/api/v1/vervangingen/advies?persoonId=${ELS}&peildatum=2026-02-03`, tokenBea)
      expect(advies.statusCode).toBe(404)
      const lijst = (await get('/api/v1/vervangingen?van=2026-01-01&tot=2026-12-31', tokenBea)).json()
      expect(lijst.vervangingen).toHaveLength(0)
    })
  },
)
