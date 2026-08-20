/**
 * Integratietest planner-veegronde (ADR-0004): alle tenants herberekend, elk
 * in de eigen context; systeem als actor; idempotent; tenant-afscherming
 * blijft intact. Draait alleen met DATABASE_ADMIN_URL + DATABASE_URL.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import postgres from 'postgres'
import type { FastifyBaseLogger } from 'fastify'
import { maakDb, type Db } from '../src/db.js'
import { herberekenAlleTenants } from '../src/scheduler.js'

const ADMIN_URL = process.env['DATABASE_ADMIN_URL']
const APP_URL = process.env['DATABASE_URL']

if (process.env['CI'] !== undefined && (ADMIN_URL === undefined || APP_URL === undefined)) {
  throw new Error('CI zonder DATABASE_ADMIN_URL/DATABASE_URL: integratietests zouden stil overgeslagen worden')
}

const TENANT_A = 'eeeeeeee-1111-1111-1111-111111111111'
const TENANT_B = 'eeeeeeee-2222-2222-2222-222222222222'
const SCHOOL_A = 'eeeeeeee-3333-3333-3333-333333333333'
const JONAS = 'eeeeeeee-4444-4444-4444-444444444444' // D1: drempel bereikt

const stilleLog = { info() {}, error() {} } as unknown as FastifyBaseLogger

const repoWortel = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

describe.skipIf(ADMIN_URL === undefined || APP_URL === undefined)(
  'planner-veegronde (integratie)',
  () => {
    let admin: postgres.Sql
    let db: Db

    beforeAll(async () => {
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
        insert into core.school (id, tenant_id, instellingsnummer, naam) values
          ('${SCHOOL_A}', '${TENANT_A}', '012345', 'Basisschool De Regenboog');
        insert into core.persoon (id, tenant_id, idp_subject, naam, email) values
          ('${JONAS}', '${TENANT_A}', 'idp|jonas', 'Jonas Dierckx', 'jonas@voorbeeld.be');
        insert into core.aanstelling (tenant_id, persoon_id, school_id, ambt, statuut, start, einde) values
          ('${TENANT_A}', '${JONAS}', '${SCHOOL_A}', 'leraar', 'TABD', '2025-02-24', '2025-06-30'),
          ('${TENANT_A}', '${JONAS}', '${SCHOOL_A}', 'leraar', 'TABD', '2026-01-01', '2026-06-30');
      `)

      db = maakDb(APP_URL as string)
    })

    afterAll(async () => {
      await db?.end()
      await admin?.end()
    })

    it('de applicatierol kan de tenantlijst alleen via de definer-functie zien', async () => {
      const viaFunctie = await db`select core.tenant_ids() as id`
      expect(viaFunctie).toHaveLength(2)
      // rechtstreeks op de tabel: RLS zonder tenant-context → niets
      const rechtstreeks = await db`select id from core.tenant`
      expect(rechtstreeks).toHaveLength(0)
    })

    it('één veegronde verwerkt alle tenants, met het systeem als actor', async () => {
      const uitkomsten = await herberekenAlleTenants(db, stilleLog, '2026-06-10')
      expect(uitkomsten).toHaveLength(2)
      expect(uitkomsten.every((u) => u.fout === undefined)).toBe(true)

      const perTenant = Object.fromEntries(uitkomsten.map((u) => [u.tenantId, u.resultaat]))
      expect(perTenant[TENANT_A]).toMatchObject({ personenVerwerkt: 1, aangemaakt: 2 })
      expect(perTenant[TENANT_B]).toMatchObject({ personenVerwerkt: 0, aangemaakt: 0 })

      const [audit] = await admin`
        select count(*)::int as aantal from core.audit_log
        where object_type = 'deadline' and actor_id is null`
      expect(audit?.['aantal']).toBe(2)

      // afscherming: alle aangemaakte deadlines horen bij tenant A
      const rijen = await admin`select distinct tenant_id from core.deadline`
      expect(rijen).toHaveLength(1)
      expect(rijen[0]?.['tenant_id']).toBe(TENANT_A)
    })

    it('een tweede veegronde dezelfde dag is een no-op', async () => {
      const uitkomsten = await herberekenAlleTenants(db, stilleLog, '2026-06-10')
      const totaal = uitkomsten.reduce(
        (som, u) =>
          som + (u.resultaat ? u.resultaat.aangemaakt + u.resultaat.bijgewerkt + u.resultaat.vervallen : 0),
        0,
      )
      expect(totaal).toBe(0)
    })

    it('een latere veegronde schuift de escalatieladder vanzelf op', async () => {
      const uitkomsten = await herberekenAlleTenants(db, stilleLog, '2026-06-20')
      const perTenant = Object.fromEntries(uitkomsten.map((u) => [u.tenantId, u.resultaat]))
      // 15/6 is verstreken → niveau 5; 30/6 over 10 dagen → niveau 3 (directeur)
      expect(perTenant[TENANT_A]).toMatchObject({ bijgewerkt: 2, vervallen: 0 })

      const niveaus = await admin`
        select to_char(datum, 'YYYY-MM-DD') as datum, escalatieniveau
        from core.deadline order by datum`
      expect(niveaus.map((r) => [r['datum'], r['escalatieniveau']])).toEqual([
        ['2026-06-15', 5],
        ['2026-06-30', 3],
      ])
    })
  },
)
