# TECHNISCH RAPPORT — CHROME-EXTENSIE MV3 (agent 4, kern)
⚠ developer.chrome.com e.a. geblokkeerd; gewerkt vanaf open-source spiegels + Chromium-policybronnen (betrouwbaarst).

## Kernconclusies
1. **Dunne schil**: service worker (transport+wekker), side panel (UI), NIETS meer — geen content scripts, één host_permission (eigen API).
2. **Web Push met userVisibleOnly:false** = primair wekmechanisme (extensies mogen dat sinds Chrome 121; sinds 132 zonder notifications-permissie); chrome.alarms als vangnet. Backend: gewoon web-push/VAPID — zelfde infra als PWA. chrome.gcm = dood spoor (niet in Edge).
3. **Auth**: Authorization Code + PKCE via chrome.identity.launchWebAuthFlow; redirect https://<extension-id>.chromiumapp.org/oidc; **extensie-ID vastzetten via "key" in manifest** (public key uit CWS) anders breekt de redirect; getAuthToken NIET (Edge ondersteunt het niet).
4. **Distributie**: één CWS-listing (Unlisted) + force-install per OU (Google Admin: Devices→Chrome→Apps&extensions→Users&browsers→ID→Force install); Edge via Intune met update_url=https://clients2.google.com/service/update2/crx → zelfde pakket, zelfde ID, zelfde redirect. NIET ook in Edge Add-ons store publiceren (tweede ID).
5. **Eerst PWA/webapp, dan extensie** — extensie voegt precies twee dingen toe (permanent side panel naast Smartschool/Classroom + stille push), kost CWS-review per release. PWA is de noodklep (WebAppInstallForceList + NotificationsAllowedForUrls maken PWA even uitrolbaar in beheerde omgeving!).

## Service worker regels
30s idle / 5min per taak / 30s per fetch; alle listeners synchroon top-level; state in storage/IndexedDB; alarms min. 30s, verdwijnen bij update/herstart → heraanmaken in onStartup+onInstalled; max 500 alarms → **nooit één alarm per toezichtbeurt** (rooster lokaal cachen, UI rekent zelf); gedrag na slaapstand ongedefinieerd (dichtgeklapte Chromebook!) → "toezicht over 10 min" is best effort, zo communiceren.

## Berichtenflow
push → SW wake → GET /inbox?since=cursor (ETag, delta) → IndexedDB → **badge als hoofdsignaal** (setBadgeText), notificatie alleen bij urgentie → onClicked opent side panel (heeft user gesture; ⚠ open bugs → fallback: extensiepagina in tab). sidePanel.open() kan NIET automatisch (user gesture vereist) → product ontwerpen rond "gebruiker haalt op". Outbox met idempotency keys (dubbele antwoorden = dodelijk voor cijfers). Ephemeral gedeelde Chromebooks: elke aanmelding = lege staat → koude start naar bruikbaar in seconden, stille SSO.

## Tokenopslag
Geen veilige opslag; access token 5-15min in storage.session; refresh token roterend (RFC 9700) in storage.local; Origin-header pinnen (defense in depth); device-registratie serverzijdig met revocatie; NOOIT tokens/HR-data in storage.sync (gaat naar Google-account); managed storage = leesbaar op chrome://policy → nooit geheimen. Geen cookies (SameSite/partitioning-ellende).

## Preconfiguratie (grootste UX-winst)
storage.managed_schema: apiBaseUrl/tenantId/roleHint door schoolbeheerder gezet ({"Value":...}-wrapper in Admin console); leerkracht opent Chrome en alles staat klaar. **tenantId is UI-hint, nooit autorisatie — tenant komt uit het token (RLS); mismatch = hard falen + loggen.** ExtensionSettings toolbar_pin:force_pinned (anders geen badge zichtbaar). Let op runtime_blocked_hosts-baselines (documenteer runtime_allowed_hosts).

## OU-scoping werkt precies zoals gehoopt
/Personeel force-install+pin; /Leerlingen/Graad3 later; erft en overschrijfbaar per OU; force-install = stil, niet verwijderbaar, permissies impliciet toegekend.

## Beveiliging
Toestel = vijandig; DevTools leest storage. Geen content scripts (= verkoopbaar argument "kan niet zien welke sites je bezoekt"); host_permissions exact één; CSP default niet aanraken; extensie is géén bevoorrechte client (zelfde scopes/RLS/rate limits); dataminimalisatie (alleen eigen inbox, nooit klas-/schoolbrede payload client-side filteren); TTL + wissen bij logout/403; 2FA+security key op CWS-account (gekaapt account = stille malware op alle klant-Chromebooks — grootste SPOF); reproduceerbare builds + hash per release.

## MV3-beperkingen die het ontwerp raken
Geen remote code → UI-wijziging = CWS-review → **vragenlijsten als data (JSON-schema van server), server-side feature flags**; geen DOM/audio in SW (offscreen doc, max 1); review-vertraging = operationeel risico → PWA als hotfix-route; MV2 definitief dood (Chrome 139).

## Edge
sidePanel/alarms/notifications/offscreen/launchWebAuthFlow OK; getAuthToken/gcm NIET; panel herlaadt bij tabwissel → panel stateless en tab-onafhankelijk ontwerpen. ⚠ userVisibleOnly:false in Edge onbevestigd → alarm-fallback.

## Precedenten
GoGuardian/Securly/Hapara/Lightspeed = exact dit distributiemodel → elke Vlaamse ICT-coördinator kent het. MAAR: die tools zijn hét voorbeeld van "spyware die school installeerde"-reputatieschade → geen content scripts, permissielijst in gewone taal publiceren, icoon zichtbaar, **leerlingbevragingen bewust via PWA/link (Classroom/Smartschool) i.p.v. force-geïnstalleerde extensie**. Geen precedent van HR-extensie voor personeel in EU-scholen → meer uitleg aan DPO's nodig.

## Open vragen pilot
userVisibleOnly:false in Edge · push-endpoints door schoolproxy's (fcm.googleapis.com) · Edge force-install met CWS-update_url · ephemeral koude start · notification→sidePanel op alle platforms · CWS-review vroeg aftasten ("wrapper"-bezwaar) · Google/Microsoft-verhouding Vlaams secundair (geen cijfer gevonden — valideren bij eerste 10 prospects) · Background Sync in extensie-SW (uitgaan van niet beschikbaar).

## Digisprong-context
ASPIRE-raamcontract Google Workspace for Education Plus; Kenniscentrum Digisprong publiceerde privacy- en technische handleiding; DPIA-traject loopt.
