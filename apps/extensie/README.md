# Draagvlak — Chrome-extensie (module W, kanaal)

De dunne schil op de bevragings-API (ontwerpbeslissing W10,
[`../../docs/functioneel-ontwerp/welzijn.md`](../../docs/functioneel-ontwerp/welzijn.md)):
een service worker die de inbox synchroniseert en een teller op het pictogram
zet, en een zijpaneel waarin het personeelslid naast zijn gewone werk
(Smartschool, Classroom, Docs) antwoordt. Meer niet — bewust.

## Wat deze extensie wél en niet doet

**Wel:** de inbox ophalen bij precies één adres (de Draagvlak-API van de
school), een teller op het pictogram tonen (badge — nooit een melding die de
les onderbreekt), en antwoorden versturen wanneer de gebruiker op versturen
klikt. Per item staat er "wie ziet dit": op naam toont de ontvanger,
vertrouwelijk toont de groepsgrootte en de drempel (W6).

**Niet:** geen content scripts (de extensie kán niet zien welke websites je
bezoekt), geen tabs-/history-/webRequest-permissies, geen telemetrie of
analytics, geen meting van typgedrag of invulsnelheid (architecturale
invariant, AI Act art. 5.1.f), geen meldingen buiten wat de badge toont.
Bij teambevragingen wordt het antwoord zonder persoonskoppeling opgeslagen
en schrijft de API bewust géén auditregel per antwoord.

## Bestanden

| Bestand | Rol |
|---|---|
| `manifest.json` | MV3; permissies beperkt tot `storage`, `alarms`, `sidePanel`, `identity` |
| `achtergrond.js` | service worker: één terugkerend alarm → inbox → badge; listeners synchroon op topniveau (elke activering is een koude start) |
| `gedeeld.js` | configuratie (beheerd beleid wint), tokenopslag (sessie), API-laag |
| `paneel.html/js/css` | het zijpaneel: inbox → formulier per vraagvorm → versturen |
| `opties.html/js` | verbinding, aanmelden (OIDC PKCE via `launchWebAuthFlow`; token plakken voor testomgevingen), diagnose |
| `schema.json` | beheerd-beleid-schema: `apiBaseUrl`, `oidcIssuer`, `oidcClientId`, `syncMinuten` |

## Lokaal testen

```bash
# 1. start de API met een databank (zie apps/api/README.md)
# 2. chrome://extensions → ontwikkelaarsmodus → "uitgepakte extensie laden" → deze map
# 3. opties: API-endpoint invullen; voor testomgevingen een token plakken
#    (de integratiesuite laat zien hoe je met de JWKS-stub tokens maakt)
```

De end-to-end-test (`test/extensie.e2e.mjs` vanuit de repowortel via
`node apps/extensie/test/extensie.e2e.mjs`) start een eigen schema, de API en
een JWKS-stub, laadt de extensie in Chromium (`--headless=new`) en doorloopt
de volledige flow: badge, inbox, "wie ziet dit", antwoorden op naam én
vertrouwelijk, en de controle dat teamantwoorden zonder persoonskoppeling
in de databank staan.

## Uitrol in een beheerde Google-omgeving (het doelscenario)

1. **Eenmalig (Draagvlak):** pakket uploaden naar het Chrome Web
   Store-dashboard zonder publiceren → Package → "View public key" → als
   `"key"` in `manifest.json` zetten zodat het extensie-ID overal stabiel is
   (nodig voor de OIDC-redirect `https://<id>.chromiumapp.org/oidc`).
   Zichtbaarheid: **Unlisted** — scholen installeren via het ID, niet via de
   winkel.
2. **Per school (beheerder), Google Admin console:**
   `Apparaten → Chrome → Apps en extensies → Gebruikers en browsers` →
   organisatie-eenheid van het personeel kiezen → extensie toevoegen op ID →
   **Gedwongen installeren + vastzetten op de taakbalk**. Zonder vastzetten
   is de badge onzichtbaar.
3. **Beleid voor de extensie** (zelfde scherm, "Policy for extensions") —
   let op de `{"Value": …}`-omslag van de Admin console:

   ```json
   {
     "apiBaseUrl":  { "Value": "https://api.draagvlak.be" },
     "oidcIssuer":  { "Value": "https://login.school.be" },
     "oidcClientId": { "Value": "draagvlak-extensie" },
     "syncMinuten": { "Value": 10 }
   }
   ```

4. **Netwerk-allowlist:** de API-host en
   `https://clients2.google.com/service/update2/crx` (extensie-updates).
5. **Overlegtraject eerst (W11):** de uitrol volgt het informatie- en
   overlegpatroon (drie maanden, CAO 39-stijl — ⚠ per net te valideren), met
   het manifest en de permissie-uitleg in gewone taal als bijlage.

**Microsoft-scholen (minderheid):** hetzelfde pakket werkt in Edge via
Intune met de update-URL naar de Chrome Web Store — zelfde extensie-ID,
zelfde redirect. Niet apart in de Edge-winkel publiceren (dat zou een tweede
ID en een tweede OIDC-registratie betekenen).

## Bewuste beperkingen (v0.1)

Geen pushberichten (het alarm volstaat om te testen; Web Push met
`userVisibleOnly:false` volgt zodra de API VAPID-sleutels heeft), geen
meldingen, geen offline outbox (antwoorden vereisen verbinding; de inbox
zelf is gecachet). Stiltevensters zitten serverzijdig in het ontwerp (W11)
en horen niet in de client.
