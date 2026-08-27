/**
 * End-to-end-test van de extensie tegen de echte API: vers schema, JWKS-stub,
 * API op 127.0.0.1, extensie geladen in Chromium (--headless=new), en dan de
 * volledige flow — badge, inbox met "wie ziet dit", antwoorden op naam én
 * vertrouwelijk, en de databankcontrole dat teamantwoorden aan niemand hangen.
 *
 * Draaien vanuit de repowortel:
 *   DATABASE_ADMIN_URL=… DATABASE_URL=… node apps/extensie/test/extensie.e2e.mjs
 */
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

const hier = dirname(fileURLToPath(import.meta.url))
const repo = join(hier, '..', '..', '..')
const apiWortel = join(repo, 'apps', 'api')

const { default: postgres } = await import(join(apiWortel, 'node_modules', 'postgres', 'src', 'index.js'))
const jose = await import(join(apiWortel, 'node_modules', 'jose', 'dist', 'node', 'esm', 'index.js'))
const { buildApp } = await import(join(apiWortel, 'dist', 'app.js'))
// playwright-core: eerst in de werkruimte zoeken, anders via PLAYWRIGHT_CORE_PAD
const pwKandidaten = [
  process.env.PLAYWRIGHT_CORE_PAD,
  join(repo, 'node_modules', 'playwright-core', 'index.mjs'),
  join(apiWortel, 'node_modules', 'playwright-core', 'index.mjs'),
].filter(Boolean)
let chromium
for (const kandidaat of pwKandidaten) {
  try { ({ chromium } = await import(kandidaat)); break } catch { /* volgende */ }
}
if (!chromium) throw new Error('playwright-core niet gevonden; zet PLAYWRIGHT_CORE_PAD')

const ADMIN_URL = process.env.DATABASE_ADMIN_URL ?? 'postgres://postgres:postgres@localhost:5432/draagvlak'
const APP_URL = process.env.DATABASE_URL ?? 'postgres://draagvlak_app:draagvlak@localhost:5432/draagvlak'
const API_POORT = 4599

const TENANT = 'e2e00000-1111-1111-1111-111111111111'
const SCHOOL = 'e2e00000-2222-2222-2222-222222222222'
const ANKE = 'e2e00000-3333-3333-3333-333333333333'
const LEDEN = Array.from({ length: 6 }, (_, i) => `e2e00000-6666-6666-6666-66666666666${i + 1}`)
const ISSUER = 'https://idp.test/e2e'
const AUDIENCE = 'draagvlak-api-test'

let fouten = 0
const check = (naam, conditie, extra = '') => {
  console.log(`${conditie ? '✅' : '❌'} ${naam}${extra ? ' — ' + extra : ''}`)
  if (!conditie) fouten++
}

// ── 1. databank vers ──
const admin = postgres(ADMIN_URL, { max: 1, onnotice: () => {} })
await admin.unsafe('drop schema if exists core cascade')
await admin.file(join(repo, 'db', 'bootstrap', 'rollen.sql'), { cache: false })
for (const m of ['0001_init.sql','0002_personeel.sql','0003_deadlines.sql','0004_idp.sql',
  '0005_beoordeling.sql','0006_regelparameters.sql','0007_scheduler.sql','0008_kalender.sql',
  '0009_toezichten.sql','0010_vervangingen.sql','0011_bevragingen.sql','0012_afgeleverd.sql']) {
  await admin.file(join(repo, 'db', 'migrations', m), { cache: false })
}

// ── 2. JWKS-stub ──
const { publicKey, privateKey } = await jose.generateKeyPair('RS256')
const jwk = { ...(await jose.exportJWK(publicKey)), kid: 'e2e', alg: 'RS256', use: 'sig' }
const jwksServer = createServer((_v, a) => { a.setHeader('content-type','application/json'); a.end(JSON.stringify({ keys: [jwk] })) })
await new Promise((k) => jwksServer.listen(0, '127.0.0.1', k))
const jwksUri = `http://127.0.0.1:${jwksServer.address().port}/jwks`
const maakToken = (sub) => {
  const nu = Math.floor(Date.now() / 1000)
  return new jose.SignJWT({}).setProtectedHeader({ alg: 'RS256', kid: 'e2e' })
    .setIssuer(ISSUER).setAudience(AUDIENCE).setSubject(sub)
    .setIssuedAt(nu).setExpirationTime(nu + 3600).sign(privateKey)
}

// ── 3. testdata ──
const ledenInsert = LEDEN.map((id, i) =>
  `('${id}', '${TENANT}', 'idp|lid${i}', 'Teamlid ${i + 1}', 'lid${i}@voorbeeld.be')`).join(',')
await admin.unsafe(`
  insert into core.tenant (id, naam) values ('${TENANT}', 'E2E-school');
  insert into core.idp_config (tenant_id, issuer, audience, jwks_uri)
    values ('${TENANT}', '${ISSUER}', '${AUDIENCE}', '${jwksUri}');
  insert into core.school (id, tenant_id, instellingsnummer, naam)
    values ('${SCHOOL}', '${TENANT}', '099999', 'Basisschool E2E');
  insert into core.persoon (id, tenant_id, idp_subject, naam, email) values
    ('${ANKE}', '${TENANT}', 'idp|anke', 'Anke Willems', 'anke@voorbeeld.be'), ${ledenInsert};
  insert into core.roltoewijzing (tenant_id, persoon_id, school_id, rol, geldig_vanaf)
    values ('${TENANT}', '${ANKE}', '${SCHOOL}', 'DIR', '2024-09-01');
`)

// ── 4. API starten ──
const app = buildApp({ databaseUrl: APP_URL })
await app.listen({ port: API_POORT, host: '127.0.0.1' })
const basis = `http://127.0.0.1:${API_POORT}`
const tokenAnke = await maakToken('idp|anke')
const tokenLid1 = await maakToken('idp|lid0')

const apiPost = (pad, body, token = tokenAnke) =>
  fetch(basis + pad, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }))
const apiPut = (pad, body) =>
  fetch(basis + pad, { method: 'PUT', headers: { authorization: `Bearer ${tokenAnke}`, 'content-type': 'application/json' }, body: JSON.stringify(body) })

// bevragingen klaarzetten: één op naam (invalvraag) + één teambevraging
await apiPut('/api/v1/overlegorgaan', { soort: 'personeel', naam: 'personeelsvergadering', dpiaBevestigd: true })
const opNaam = await apiPost('/api/v1/bevragingen', {
  type: 'op_naam',
  titel: 'Wie kan morgen het 3e lesuur invallen?',
  toelichting: 'Klas 4A, mevrouw Peeters is ziek gemeld.',
  vragen: [{ klasse: 'A', vorm: 'ja_nee', tekst: 'Kan je morgen het 3e lesuur invallen in 4A?' }],
  genodigden: [LEDEN[0], LEDEN[1], LEDEN[2]],
})
const team = await apiPost('/api/v1/bevragingen', {
  type: 'team',
  titel: 'Hoe loopt het eerste trimester?',
  opvolgWie: 'personeelsvergadering', opvolgTegen: '2026-12-15',
  vragen: [
    { klasse: 'B', vorm: 'schaal', tekst: 'Hoe ervaar je je werkdruk dit trimester?', opties: { min: 1, max: 5 } },
    { klasse: 'A', vorm: 'keuze', tekst: 'Welk moment past voor de personeelsvergadering?', opties: ['dinsdag 16u', 'woensdag 12u30', 'donderdag 16u'] },
  ],
  genodigden: LEDEN,
})
check('op-naam-bevraging aangemaakt', opNaam.status === 201)
check('teambevraging aangemaakt', team.status === 201)

// ── 5. extensie in Chromium ──
const profiel = mkdtempSync(join(tmpdir(), 'dv-ext-'))
const extPad = join(repo, 'apps', 'extensie')
const context = await chromium.launchPersistentContext(profiel, {
  headless: true,
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: [
    '--headless=new',
    `--disable-extensions-except=${extPad}`,
    `--load-extension=${extPad}`,
  ],
})
let [worker] = context.serviceWorkers()
if (!worker) worker = await context.waitForEvent('serviceworker')
const extId = new URL(worker.url()).host
check('service worker actief', Boolean(extId), extId)

// opties invullen zoals een tester dat zou doen
const opties = await context.newPage()
await opties.goto(`chrome-extension://${extId}/opties.html`)
await opties.fill('#apiBaseUrl', basis)
await opties.click('summary')
await opties.fill('#ontwikkelToken', tokenLid1)
await opties.click('#opslaan')
await opties.waitForFunction(() => document.getElementById('status').textContent.includes('✅'))
check('opties: verbonden', true, await opties.textContent('#status'))

// badge = 2 open items
await new Promise((r) => setTimeout(r, 600))
const badge = await worker.evaluate(() => chrome.action.getBadgeText({}))
check('badge toont 2', badge === '2', `badge="${badge}"`)

// paneel: inbox met beide soorten en "wie ziet dit"
const paneel = await context.newPage()
await paneel.goto(`chrome-extension://${extId}/paneel.html`)
await paneel.waitForSelector('.item')
const items = await paneel.$$eval('.item', (els) => els.map((e) => ({
  soort: e.querySelector('.soort').textContent,
  titel: e.querySelector('.titel').textContent,
  wie: e.querySelector('.wieziet').textContent,
})))
check('inbox toont 2 items', items.length === 2)
const inval = items.find((i) => i.titel.includes('invallen'))
const trimester = items.find((i) => i.titel.includes('trimester'))
check('op naam: "wie ziet dit" noemt de ontvanger', inval?.wie.includes('Anke Willems') === true, inval?.wie)
check('team: "wie ziet dit" legt de drempel uit', trimester?.wie.includes('minstens 5') === true, trimester?.wie)
await paneel.screenshot({ path: join(hier, 'e2e-1-inbox.png') })

// de invalvraag beantwoorden (ja)
await paneel.click(`.item:has-text("invallen")`)
await paneel.waitForSelector('.vraagblok')
await paneel.screenshot({ path: join(hier, 'e2e-2-invalvraag.png') })
await paneel.click('.keuzes label:has-text("ja")')
await paneel.click('.verstuur')
await paneel.waitForFunction(() => document.body.textContent.includes('Verstuurd'))
check('op-naam-antwoord verstuurd', true)

// de teambevraging beantwoorden (schaal 4, keuze woensdag) — met "liever niet" op niets
await paneel.waitForSelector('.item')
await paneel.click(`.item:has-text("trimester")`)
await paneel.waitForSelector('.vraagblok')
await paneel.click('.schaal label:has-text("4")')
await paneel.click('.keuzes label:has-text("woensdag 12u30")')
await paneel.screenshot({ path: join(hier, 'e2e-3-teambevraging.png') })
await paneel.click('.verstuur')
await paneel.waitForFunction(() => document.body.textContent.includes('Verstuurd'))
check('teamantwoord verstuurd', true)

// lege inbox + badge weg
await paneel.waitForFunction(() => document.body.textContent.includes('Niets openstaand'))
const badgeNa = await worker.evaluate(() => chrome.action.getBadgeText({}))
check('badge leeg na beantwoorden', badgeNa === '')
await paneel.screenshot({ path: join(hier, 'e2e-4-leeg.png') })

// ── 6. serverzijdige controles ──
const detail = await fetch(`${basis}/api/v1/bevragingen/${opNaam.json.id}`, {
  headers: { authorization: `Bearer ${tokenAnke}` } }).then((r) => r.json())
const lid1 = detail.antwoorden?.find((a) => a.naam === 'Teamlid 1')
check('vraagsteller ziet het op-naam-antwoord van Teamlid 1', lid1?.waarde === true)
const status = detail.genodigden?.find((g) => g.naam === 'Teamlid 1')
check('leesbevestiging op naam zichtbaar', status?.gezien === true && status?.beantwoord === true)
check('afleverbevestiging op naam zichtbaar', status?.afgeleverd === true)
const nietOpgehaald = detail.genodigden?.find((g) => g.naam === 'Teamlid 3')
check('wie de extensie niet opende, staat op niet-afgeleverd', nietOpgehaald?.afgeleverd === false)

const losseAntwoorden = await admin`
  select count(*)::int as aantal from core.bevraging_antwoord
  where bevraging_id = ${team.json.id} and persoon_id is not null`
check('teamantwoorden hangen in de databank aan niemand', losseAntwoorden[0].aantal === 0)

const teamDetail = await fetch(`${basis}/api/v1/bevragingen/${team.json.id}`, {
  headers: { authorization: `Bearer ${tokenAnke}` } }).then((r) => r.json())
check('vraagsteller ziet bij team geen deelnemerslijst', teamDetail.genodigden === undefined,
  `responsgraad: ${teamDetail.responsgraad}`)

// ── opruimen ──
await context.close()
rmSync(profiel, { recursive: true, force: true })
await app.close()
jwksServer.close()
await admin.end()

console.log(fouten === 0 ? '\nAlles groen.' : `\n${fouten} controle(s) faalden.`)
process.exit(fouten === 0 ? 0 : 1)
