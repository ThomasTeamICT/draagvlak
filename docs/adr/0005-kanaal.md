# ADR-0005 — Kanaal: Chrome-extensie eerst, op een kanaalneutrale inbox-API

**Status:** aanvaard (augustus 2026) · **Beslist door:** producteigenaar

## Context

Module-familie W heeft een kanaal nodig waarmee gerichte vragen het juiste
personeelslid bereiken en meteen beantwoord kunnen worden (functioneel
ontwerp welzijn.md, W10). Het onderzoek adviseerde "PWA eerst, extensie als
dunne schil erop", met als openstaande validatievraag of de doelscholen
überhaupt in een beheerde browser leven.

De producteigenaar heeft die vraag beantwoord: **de meeste scholen,
leerlingen en leerkrachten zitten in een beheerde Chrome/Google-omgeving**;
een minderheid in Microsoft. De eerste testscope is daarom de
Chrome-extensie.

## Beslissing

1. **De Chrome-extensie is het eerste kanaal** (`apps/extensie`), als dunne
   schil op de bestaande inbox-API: service worker (alarm → inbox → badge)
   plus zijpaneel (inbox → formulier). Geen content scripts, geen tabs-,
   history- of webRequest-permissies, geen telemetrie, geen meting van
   invulgedrag — de waarborgen uit W10/W11 zijn manifest-feiten, geen beleid.
2. **De API blijft kanaalneutraal.** Alles wat de extensie kan, kan elke
   andere client (PWA, webapp) via dezelfde endpoints; er bestaat geen
   "extensie-endpoint" met soepelere regels. De bredere bruikbaarheid die de
   eigenaar wil, is daarmee een kwestie van extra schillen, niet van
   herbouw.
3. **Microsoft-scholen krijgen hetzelfde pakket** via Edge + Intune met de
   update-URL naar de Chrome Web Store (zelfde extensie-ID, zelfde
   OIDC-redirect). Niet apart in de Edge-winkel publiceren.
4. **Leerlingen blijven buiten dit kanaal** (W11): bevragingen bereiken hen
   later via link/PWA in hun bestaande omgeving, nooit via een
   force-geïnstalleerde extensie.

## Gevolgen

- Aanmelden loopt via OIDC Authorization Code + PKCE met
  `launchWebAuthFlow` (het enige identity-mechanisme dat ook in Edge werkt);
  het extensie-ID wordt vastgezet via `"key"` in het manifest zodra het
  pakket bij de Chrome Web Store geregistreerd is.
- Voor testomgevingen bestaat een token-plak-veld in de instellingen; dat
  verdwijnt niet (integratietests en pilootomgevingen hebben het nodig)
  maar zit achter een uitklapper met expliciete "alleen voor testen"-tekst.
- Web Push (`userVisibleOnly:false`) volgt zodra de API VAPID-sleutels
  heeft; tot dan is het synchronisatie-alarm het wekmechanisme. De badge is
  en blijft het enige signaal — geen meldingen die een les onderbreken.
- Elke UI-wijziging in de extensie kost een storereview; vragenlijsten zijn
  daarom server-data (JSON), en de PWA blijft de latere noodklep voor
  hotfixes en niet-beheerde toestellen.
- De end-to-end-test (`apps/extensie/test/extensie.e2e.mjs`) doorloopt de
  volledige keten tegen de echte API in Chromium en bewaakt de kernwaarborg
  in de databank: teamantwoorden hangen aan niemand.
