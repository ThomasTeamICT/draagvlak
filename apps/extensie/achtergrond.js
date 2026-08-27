/**
 * Draagvlak — achtergrondwerker (MV3).
 *
 * Bewust minimaal (ontwerpbeslissing W10/W11): één terugkerend alarm dat de
 * inbox ophaalt en de badge bijwerkt. Geen content scripts, geen tabs-,
 * history- of webRequest-permissies — deze extensie kán niet zien welke
 * websites je bezoekt. Geen telemetrie. De badge is het enige signaal:
 * een teller op het pictogram, nooit een melding die je les onderbreekt.
 *
 * Alle listeners staan synchroon op topniveau: elke activering van de
 * worker is een koude start en een listener achter een await mist events.
 */
import { leesConfig, synchroniseer } from './gedeeld.js'

chrome.runtime.onInstalled.addListener(opstart)
chrome.runtime.onStartup.addListener(opstart)
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'sync') void synchroniseer()
})
chrome.storage.onChanged.addListener((wijzigingen, gebied) => {
  // beheerd beleid of lokale configuratie gewijzigd → meteen opnieuw laden
  if (gebied === 'managed' || (gebied === 'local' && (wijzigingen.apiBaseUrl || wijzigingen.ontwikkelToken || wijzigingen.syncMinuten))) {
    void opstart()
  }
})
chrome.runtime.onMessage.addListener((bericht, _afzender, stuurAntwoord) => {
  if (bericht?.type === 'sync') {
    synchroniseer().then(stuurAntwoord)
    return true // asynchroon antwoord
  }
  return false
})

// klik op het pictogram opent het zijpaneel
void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })

async function opstart() {
  const config = await leesConfig()
  const minuten = Math.max(1, Math.min(120, config.syncMinuten || 10))
  await chrome.alarms.clear('sync')
  chrome.alarms.create('sync', { periodInMinutes: minuten })
  await synchroniseer()
}
