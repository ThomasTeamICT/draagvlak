/**
 * Demo-omgeving voor module W — alles in één commando:
 *   pnpm demo        (vanuit de repowortel)
 *
 * Start een vers schema met een herkenbare school, een lokale JWKS-stub,
 * de API, en een testcockpit op http://127.0.0.1:4600 waarmee je als
 * directeur bevragingen aanmaakt en als personeelslid antwoordt. De
 * extensie wijs je naar hetzelfde adres.
 *
 * ⚠ Wist het schema `core` in de opgegeven databank. Alleen voor
 * testdatabanken — nooit tegen echte gegevens draaien.
 */
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const hier = dirname(fileURLToPath(import.meta.url))
const repo = join(hier, '..', '..', '..')
const apiWortel = join(repo, 'apps', 'api')

const { default: postgres } = await import(join(apiWortel, 'node_modules', 'postgres', 'src', 'index.js'))
const jose = await import(join(apiWortel, 'node_modules', 'jose', 'dist', 'node', 'esm', 'index.js'))
const { buildApp } = await import(join(apiWortel, 'dist', 'app.js'))

const ADMIN_URL = process.env.DATABASE_ADMIN_URL ?? 'postgres://postgres:postgres@localhost:5432/draagvlak'
const APP_URL = process.env.DATABASE_URL ?? 'postgres://draagvlak_app:draagvlak@localhost:5432/draagvlak'
const API_POORT = 4599
const COCKPIT_POORT = 4600

const TENANT = 'de300000-1111-1111-1111-111111111111'
const SCHOOL = 'de300000-2222-2222-2222-222222222222'
const ISSUER = 'https://idp.demo/draagvlak'
const AUDIENCE = 'draagvlak-demo'

const PERSONEEL = [
  { id: 'de300000-aaaa-0000-0000-000000000001', naam: 'Anke Willems', rol: 'DIR', ambt: 'directeur' },
  { id: 'de300000-aaaa-0000-0000-000000000002', naam: 'Jonas Dierckx', ambt: 'onderwijzer (3A)' },
  { id: 'de300000-aaaa-0000-0000-000000000003', naam: 'Lien Mertens', ambt: 'onderwijzer (1A)' },
  { id: 'de300000-aaaa-0000-0000-000000000004', naam: 'Karim Benali', ambt: 'leermeester L.O.' },
  { id: 'de300000-aaaa-0000-0000-000000000005', naam: 'Sofie Claes', ambt: 'kleuteronderwijzer' },
  { id: 'de300000-aaaa-0000-0000-000000000006', naam: 'Els Van Damme', ambt: 'zorgcoördinator' },
  { id: 'de300000-aaaa-0000-0000-000000000007', naam: 'Piet Goossens', ambt: 'onderwijzer (5A)' },
  { id: 'de300000-aaaa-0000-0000-000000000008', naam: 'Nora El Amrani', ambt: 'onderwijzer (6A)' },
  { id: 'de300000-aaaa-0000-0000-000000000009', naam: 'Wout Jacobs', ambt: 'onderwijzer (2A)' },
]

console.log('▸ schema opbouwen…')
const admin = postgres(ADMIN_URL, { max: 1, onnotice: () => {} })
await admin.unsafe('drop schema if exists core cascade')
await admin.file(join(repo, 'db', 'bootstrap', 'rollen.sql'), { cache: false })
for (const m of ['0001_init.sql','0002_personeel.sql','0003_deadlines.sql','0004_idp.sql',
  '0005_beoordeling.sql','0006_regelparameters.sql','0007_scheduler.sql','0008_kalender.sql',
  '0009_toezichten.sql','0010_vervangingen.sql','0011_bevragingen.sql','0012_afgeleverd.sql']) {
  await admin.file(join(repo, 'db', 'migrations', m), { cache: false })
}

console.log('▸ identiteitsstub starten…')
const { publicKey, privateKey } = await jose.generateKeyPair('RS256')
const jwk = { ...(await jose.exportJWK(publicKey)), kid: 'demo', alg: 'RS256', use: 'sig' }
const jwks = createServer((_v, a) => { a.setHeader('content-type', 'application/json'); a.end(JSON.stringify({ keys: [jwk] })) })
await new Promise((k) => jwks.listen(0, '127.0.0.1', k))
const jwksUri = `http://127.0.0.1:${jwks.address().port}/jwks`
const maakToken = (sub) => {
  const nu = Math.floor(Date.now() / 1000)
  return new jose.SignJWT({}).setProtectedHeader({ alg: 'RS256', kid: 'demo' })
    .setIssuer(ISSUER).setAudience(AUDIENCE).setSubject(sub)
    .setIssuedAt(nu).setExpirationTime(nu + 12 * 3600).sign(privateKey)
}

console.log('▸ school vullen…')
const inserts = PERSONEEL.map((p) =>
  `('${p.id}', '${TENANT}', 'idp|${p.id}', '${p.naam}', '${p.naam.toLowerCase().replace(/[^a-z]/g, '.')}@school.demo')`).join(',')
await admin.unsafe(`
  insert into core.tenant (id, naam) values ('${TENANT}', 'Basisschool De Regenboog (demo)');
  insert into core.idp_config (tenant_id, issuer, audience, jwks_uri)
    values ('${TENANT}', '${ISSUER}', '${AUDIENCE}', '${jwksUri}');
  insert into core.school (id, tenant_id, instellingsnummer, naam)
    values ('${SCHOOL}', '${TENANT}', '012345', 'Basisschool De Regenboog');
  insert into core.persoon (id, tenant_id, idp_subject, naam, email) values ${inserts};
  insert into core.roltoewijzing (tenant_id, persoon_id, school_id, rol, geldig_vanaf)
    values ('${TENANT}', '${PERSONEEL[0].id}', '${SCHOOL}', 'DIR', '2024-09-01');
`)
await admin.end()

console.log('▸ API starten…')
const app = buildApp({ databaseUrl: APP_URL })
await app.listen({ port: API_POORT, host: '127.0.0.1' })

const personas = []
for (const p of PERSONEEL) {
  personas.push({ naam: p.naam, ambt: p.ambt, rol: p.rol ?? 'personeelslid', token: await maakToken(`idp|${p.id}`) })
}

// voorbeeldmateriaal: overlegorgaan + één openstaande invalvraag
const basisApi = `http://127.0.0.1:${API_POORT}`
const dirToken = personas[0].token
await fetch(`${basisApi}/api/v1/overlegorgaan`, {
  method: 'PUT',
  headers: { authorization: `Bearer ${dirToken}`, 'content-type': 'application/json' },
  body: JSON.stringify({ soort: 'personeel', naam: 'personeelsvergadering', dpiaBevestigd: true }),
})
await fetch(`${basisApi}/api/v1/bevragingen`, {
  method: 'POST',
  headers: { authorization: `Bearer ${dirToken}`, 'content-type': 'application/json' },
  body: JSON.stringify({
    type: 'op_naam',
    titel: 'Wie kan morgen het 3e lesuur invallen?',
    toelichting: 'Klas 4A — mevrouw Peeters is ziek gemeld.',
    vragen: [{ klasse: 'A', vorm: 'ja_nee', tekst: 'Kan je morgen het 3e lesuur invallen in 4A?' }],
    genodigden: PERSONEEL.slice(1, 4).map((p) => p.id),
  }),
})

// cockpit: statische pagina + proxy naar de API (zelfde oorsprong, dus geen CORS)
const cockpitHtml = readFileSync(join(hier, 'cockpit.html'))
const proxy = createServer(async (verzoek, antwoord) => {
  if (verzoek.url === '/' || verzoek.url === '/index.html') {
    antwoord.setHeader('content-type', 'text/html; charset=utf-8')
    antwoord.end(cockpitHtml)
    return
  }
  if (verzoek.url === '/demo-personas.json') {
    antwoord.setHeader('content-type', 'application/json')
    antwoord.end(JSON.stringify({ personas, genodigdenIds: PERSONEEL.map((p) => ({ id: p.id, naam: p.naam, ambt: p.ambt })) }))
    return
  }
  // alles onder /api en /health door naar de echte API
  const lichaam = []
  for await (const stuk of verzoek) lichaam.push(stuk)
  const door = await fetch(basisApi + verzoek.url, {
    method: verzoek.method,
    headers: { authorization: verzoek.headers.authorization ?? '', 'content-type': verzoek.headers['content-type'] ?? '' },
    body: lichaam.length > 0 ? Buffer.concat(lichaam) : undefined,
  })
  antwoord.statusCode = door.status
  antwoord.setHeader('content-type', door.headers.get('content-type') ?? 'application/json')
  antwoord.end(Buffer.from(await door.arrayBuffer()))
})
await new Promise((k) => proxy.listen(COCKPIT_POORT, '127.0.0.1', k))

console.log(`
──────────────────────────────────────────────────────────────
  Draagvlak demo-omgeving draait ✅

  Testcockpit (directeur + personas):
    http://127.0.0.1:${COCKPIT_POORT}

  Extensie testen (als personeelslid):
    1. chrome://extensions → ontwikkelaarsmodus
       → "uitgepakte extensie laden" → ${join(repo, 'apps', 'extensie')}
    2. pictogram → ⚙ instellingen:
       API-endpoint : http://127.0.0.1:${COCKPIT_POORT}
       token (uitklapper "Voor testomgevingen"), bv. ${PERSONEEL[1].naam}:

${personas[1].token}

  Volledig stappenplan: docs/testgids.md
  Stoppen: Ctrl+C  (het schema 'core' blijft staan voor een volgende keer)
──────────────────────────────────────────────────────────────`)
