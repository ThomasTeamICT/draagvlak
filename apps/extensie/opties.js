/** Instellingen: beheerd beleid wint; token-plakken is er alleen voor testomgevingen. */
import { leesConfig, apiVraag, synchroniseer } from './gedeeld.js'

const $ = (id) => document.getElementById(id)
const status = $('status')

async function laad() {
  const beheerd = await chrome.storage.managed.get(null).catch(() => ({}))
  const lokaal = await chrome.storage.local.get(['apiBaseUrl', 'syncMinuten', 'ontwikkelToken'])
  $('beheerdblok').hidden = Object.keys(beheerd).length === 0
  $('apiBaseUrl').value = beheerd.apiBaseUrl ?? lokaal.apiBaseUrl ?? ''
  $('apiBaseUrl').disabled = beheerd.apiBaseUrl !== undefined
  $('syncMinuten').value = beheerd.syncMinuten ?? lokaal.syncMinuten ?? 10
  $('syncMinuten').disabled = beheerd.syncMinuten !== undefined
  $('ontwikkelToken').value = lokaal.ontwikkelToken ?? ''
}

$('opslaan').addEventListener('click', async () => {
  await chrome.storage.local.set({
    apiBaseUrl: $('apiBaseUrl').value.trim(),
    syncMinuten: Number($('syncMinuten').value) || 10,
    ontwikkelToken: $('ontwikkelToken').value.trim() || undefined,
  })
  status.textContent = 'Opgeslagen. Verbinden…'
  const uitkomst = await synchroniseer()
  status.textContent = uitkomst.fout
    ? `⚠ ${uitkomst.fout}`
    : `✅ Verbonden — ${uitkomst.items.length} item(s) in je inbox.`
})

$('testknop').addEventListener('click', async () => {
  const config = await leesConfig()
  if (!config.apiBaseUrl) { status.textContent = '⚠ vul eerst het API-endpoint in'; return }
  try {
    const antwoord = await fetch(config.apiBaseUrl + '/health')
    status.textContent = antwoord.ok ? '✅ De API is bereikbaar.' : `⚠ API antwoordt met ${antwoord.status}`
  } catch {
    status.textContent = '⚠ De API is niet bereikbaar vanaf dit toestel — controleer het adres en de netwerk-allowlist van de school.'
  }
})

$('aanmelden').addEventListener('click', async () => {
  const config = await leesConfig()
  if (!config.oidcIssuer || !config.oidcClientId) {
    status.textContent = '⚠ Aanmelden met je schoolaccount kan pas zodra de beheerder de OIDC-issuer en client-id heeft ingesteld (beheerd beleid). Gebruik voor testomgevingen het token-veld hieronder.'
    return
  }
  try {
    const token = await oidcAanmelding(config)
    await chrome.storage.session.set({ token })
    status.textContent = 'Aangemeld. Verbinden…'
    const uitkomst = await synchroniseer()
    status.textContent = uitkomst.fout ? `⚠ ${uitkomst.fout}` : `✅ Aangemeld — ${uitkomst.items.length} item(s).`
  } catch (fout) {
    status.textContent = `⚠ Aanmelden mislukt: ${fout.message}`
  }
})

/**
 * OIDC Authorization Code + PKCE via launchWebAuthFlow — het enige
 * identity-mechanisme dat ook in Edge werkt. De redirect is
 * https://<extensie-id>.chromiumapp.org/oidc; die moet bij de provider
 * geregistreerd staan (zie README).
 */
async function oidcAanmelding(config) {
  const redirect = chrome.identity.getRedirectURL('oidc')
  const codeVerifier = willekeurig(64)
  const uitdaging = basis64url(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier)),
  )
  const staat = willekeurig(24)
  const meta = await (await fetch(config.oidcIssuer.replace(/\/$/, '') + '/.well-known/openid-configuration')).json()

  const authUrl = new URL(meta.authorization_endpoint)
  authUrl.search = new URLSearchParams({
    client_id: config.oidcClientId,
    response_type: 'code',
    redirect_uri: redirect,
    scope: 'openid profile email',
    code_challenge: uitdaging,
    code_challenge_method: 'S256',
    state: staat,
  }).toString()

  const terug = await chrome.identity.launchWebAuthFlow({ url: authUrl.toString(), interactive: true })
  const terugUrl = new URL(terug)
  if (terugUrl.searchParams.get('state') !== staat) throw new Error('state klopt niet')
  const code = terugUrl.searchParams.get('code')
  if (!code) throw new Error(terugUrl.searchParams.get('error_description') ?? 'geen code ontvangen')

  const tokenAntwoord = await fetch(meta.token_endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.oidcClientId,
      code,
      redirect_uri: redirect,
      code_verifier: codeVerifier,
    }),
  })
  if (!tokenAntwoord.ok) throw new Error(`tokenendpoint antwoordt met ${tokenAntwoord.status}`)
  const tokens = await tokenAntwoord.json()
  if (!tokens.access_token) throw new Error('geen access token in het antwoord')
  return tokens.access_token
}

const willekeurig = (n) =>
  basis64url(crypto.getRandomValues(new Uint8Array(n)).buffer)
const basis64url = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

void laad()
