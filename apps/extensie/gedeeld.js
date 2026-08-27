/**
 * Gedeelde configuratie- en API-laag (extensie = dunne schil, W10).
 *
 * Configuratievoorrang: beheerd beleid (chrome.storage.managed, gezet door
 * de schoolbeheerder via de Google Admin console) wint van lokale invoer.
 * Het beheerde tenant-/rolveld is een UI-hint — autorisatie komt uitsluitend
 * uit het token, serverzijdig (RLS).
 */
export async function leesConfig() {
  const beheerd = await chrome.storage.managed.get(null).catch(() => ({}))
  const lokaal = await chrome.storage.local.get(['apiBaseUrl', 'syncMinuten'])
  return {
    apiBaseUrl: (beheerd.apiBaseUrl ?? lokaal.apiBaseUrl ?? '').replace(/\/+$/, ''),
    oidcIssuer: beheerd.oidcIssuer ?? '',
    oidcClientId: beheerd.oidcClientId ?? '',
    syncMinuten: Number(beheerd.syncMinuten ?? lokaal.syncMinuten ?? 10),
    beheerd: Object.keys(beheerd).length > 0,
  }
}

/** Toegangstoken: kortlevend, alleen in sessieopslag (weg bij browserherstart). */
export async function leesToken() {
  const s = await chrome.storage.session.get('token')
  if (s.token) return s.token
  // ontwikkelmodus: een geplakt token in local (opties-pagina)
  const l = await chrome.storage.local.get('ontwikkelToken')
  return l.ontwikkelToken ?? null
}

export async function apiVraag(pad, opties = {}) {
  const config = await leesConfig()
  if (!config.apiBaseUrl) throw new Error('geen API-endpoint geconfigureerd')
  const token = await leesToken()
  if (!token) throw new Error('niet aangemeld')
  const antwoord = await fetch(config.apiBaseUrl + pad, {
    ...opties,
    headers: {
      authorization: `Bearer ${token}`,
      ...(opties.body ? { 'content-type': 'application/json' } : {}),
      ...(opties.headers ?? {}),
    },
  })
  if (antwoord.status === 401) throw new Error('niet aangemeld')
  if (!antwoord.ok) {
    let fout = `API-fout ${antwoord.status}`
    try { fout = (await antwoord.json()).fout ?? fout } catch { /* leeg */ }
    throw new Error(fout)
  }
  if (antwoord.status === 204) return null
  return antwoord.json()
}

/** Eén synchronisatie: inbox ophalen, cachen, badge bijwerken. */
export async function synchroniseer() {
  try {
    const { items } = await apiVraag('/api/v1/inbox')
    await chrome.storage.local.set({
      inbox: items,
      laatsteSync: Date.now(),
      syncFout: null,
    })
    await chrome.action.setBadgeBackgroundColor({ color: '#1f6f5c' })
    await chrome.action.setBadgeText({ text: items.length > 0 ? String(items.length) : '' })
    return { items }
  } catch (fout) {
    const nietAangemeld = String(fout.message).includes('aangemeld') || String(fout.message).includes('endpoint')
    await chrome.storage.local.set({ syncFout: fout.message, laatsteSync: Date.now() })
    await chrome.action.setBadgeBackgroundColor({ color: '#8a5a2f' })
    await chrome.action.setBadgeText({ text: nietAangemeld ? '·' : '' })
    return { fout: fout.message }
  }
}
