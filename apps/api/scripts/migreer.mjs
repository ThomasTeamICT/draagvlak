#!/usr/bin/env node
/**
 * Migratierunner (db/README.md): draait de genummerde SQL-bestanden uit
 * db/migrations/ in volgorde en houdt in public.schema_migratie bij wat al
 * toegepast is — psql-in-een-lus, maar dan met geheugen.
 *
 * Ontwerpkeuzes:
 * - de versietabel staat in public, niet in core: een test die `drop schema
 *   core cascade` doet, mag de historiek niet meenemen (en andersom: de
 *   runner detecteert dat en draait core-migraties opnieuw);
 * - elk bestand beheert zijn eigen transactie (begin/commit staat in de
 *   migratie zelf) — de runner wikkelt er niets omheen;
 * - een advisory lock voorkomt dat twee replicas tegelijk migreren;
 * - een al toegepast bestand dat naderhand gewijzigd is, is een fout, geen
 *   stille no-op: migraties zijn onveranderlijk, verbeteren doe je met een
 *   nieuwe migratie.
 *
 * Gebruik:
 *   DATABASE_ADMIN_URL=postgres://… node scripts/migreer.mjs           # migreren
 *   DATABASE_ADMIN_URL=postgres://… node scripts/migreer.mjs --status  # alleen kijken
 */
import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import postgres from 'postgres'

const LOCK_SLEUTEL = 727_001 // willekeurig maar vast: één runner tegelijk

const url = process.env.DATABASE_ADMIN_URL
if (!url) {
  console.error('DATABASE_ADMIN_URL ontbreekt (migraties draaien onder de eigenaarsrol, niet als draagvlak_app)')
  process.exit(2)
}
const alleenStatus = process.argv.includes('--status')

const migratieMap = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'db', 'migrations')
const sql = postgres(url, { max: 1, onnotice: () => {} })

try {
  const bestanden = (await readdir(migratieMap)).filter((b) => /^\d{4}_.+\.sql$/.test(b)).sort()
  if (bestanden.length === 0) throw new Error(`geen migraties gevonden in ${migratieMap}`)

  await sql.unsafe(`
    create table if not exists public.schema_migratie (
      naam          text primary key,
      controlesom   text not null,
      toegepast_op  timestamptz not null default now()
    )`)

  // historiek van core-migraties zonder core-schema = de databank is
  // opnieuw opgebouwd (bv. testomgeving): historiek is dan waardeloos
  const [{ heeft_core: heeftCore }] = await sql`
    select exists(select 1 from information_schema.schemata where schema_name = 'core') as heeft_core`
  const toegepast = new Map(
    (await sql`select naam, controlesom from public.schema_migratie`).map((r) => [r.naam, r.controlesom]),
  )
  if (!heeftCore && toegepast.size > 0) {
    console.warn('⚠ historiek zonder core-schema — de databank is herbouwd; historiek wordt gewist en alles draait opnieuw')
    if (!alleenStatus) {
      await sql`truncate public.schema_migratie`
      toegepast.clear()
    }
  }

  let fouten = 0
  const wachtrij = []
  for (const naam of bestanden) {
    const inhoud = await readFile(join(migratieMap, naam), 'utf8')
    const som = createHash('sha256').update(inhoud).digest('hex')
    const eerdere = toegepast.get(naam)
    if (eerdere === undefined) wachtrij.push({ naam, inhoud, som })
    else if (eerdere !== som) {
      console.error(`✗ ${naam}: is gewijzigd ná toepassing — migraties zijn onveranderlijk; maak een nieuwe migratie`)
      fouten++
    } else if (alleenStatus) console.log(`✓ ${naam} (toegepast)`)
  }
  if (fouten > 0) process.exit(1)

  if (alleenStatus) {
    for (const m of wachtrij) console.log(`… ${m.naam} (nog niet toegepast)`)
    console.log(wachtrij.length === 0 ? 'alles bij: niets te doen' : `${wachtrij.length} migratie(s) te gaan`)
    process.exit(0)
  }

  if (wachtrij.length === 0) {
    console.log('alles bij: niets te doen')
    process.exit(0)
  }

  await sql`select pg_advisory_lock(${LOCK_SLEUTEL})`
  try {
    // onder de lock opnieuw kijken: een andere runner kan ons voor geweest zijn
    const vers = new Set((await sql`select naam from public.schema_migratie`).map((r) => r.naam))
    for (const m of wachtrij) {
      if (vers.has(m.naam)) { console.log(`✓ ${m.naam} (door een andere runner gedaan)`); continue }
      await sql.unsafe(m.inhoud)
      await sql`insert into public.schema_migratie (naam, controlesom) values (${m.naam}, ${m.som})`
      console.log(`✓ ${m.naam}`)
    }
  } finally {
    await sql`select pg_advisory_unlock(${LOCK_SLEUTEL})`
  }
  console.log('klaar')
} catch (fout) {
  console.error('migratie mislukt:', fout instanceof Error ? fout.message : fout)
  process.exitCode = 1
} finally {
  await sql.end()
}
