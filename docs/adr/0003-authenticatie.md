# ADR-0003 — Authenticatie via OIDC-tokens; autorisatie uit de databankrollen

**Status: voorgesteld — te bekrachtigen door de stuurgroep (Fase 0).**
Vervangt de tijdelijke `x-tenant-id`-header uit ADR-0002.

## Context

Blauwdruk § 9: het identiteitsplatform van de organisatie is de master; authenticatie via OpenID Connect tegen Microsoft Entra ID (en/of Google Workspace); rollen gemapt op security groups zodat rollenbeheer op één plek gebeurt. De API had tot nu een expliciete plaatshouder (tenant uit een header) en kon daardoor niet buiten localhost gebruikt worden.

## Beslissing

**Authenticatie (wie ben je):** de API valideert OIDC-**access tokens** (Bearer) met [jose]: handtekening tegen de JWKS van de issuer, plus `iss`-, `aud`- en vervaltijdcontrole. Per tenant staat de IdP-koppeling in de databank (`core.idp_config`: issuer, audience, JWKS-URI). De issuer in het token bepaalt de tenant — de API zelf is providerneutraal (Entra ID, Google of een test-IdP zijn configuratie, geen code).

Omdat de issuer-opzoeking plaatsvindt vóór er een tenant-context bestaat (kip-en-ei met row-level security), gebeurt die éne opzoeking via een `security definer`-functie (`core.idp_config_voor_issuer`) met vastgezette `search_path` — expliciet, klein en auditeerbaar; al het overige verkeer blijft achter RLS.

**Autorisatie (wat mag je):** rollen komen uit `core.roltoewijzing` in de databank — niet uit tokenclaims. Het token bewijst de identiteit (`sub` ↔ `persoon.idp_subject`); de databank bepaalt de rechten. Zo blijft de toegangsmatrix op één plek afdwingbaar en auditeerbaar, en wordt de latere SCIM-synchronisatie (security groups → roltoewijzingen) een datastroom in plaats van een tweede autorisatiemodel.

**Rolchecks in Fase 1** (vereenvoudigd; verfijning volgt met school-scoping):

| Endpoint | Toegestaan |
|---|---|
| `GET /personen/:id/tellers` | het personeelslid zelf, of rol DIR (toegangsmatrix: PL = eigen record, DIR = lezen) |
| `POST /deadlines/herbereken` | rol BG of DIR (systeemactie) |
| `GET /deadlines` | rol DIR, AD of BG |

## Bewust nog niet in deze stap

- **JIT-provisioning** (blauwdruk § 9 noemt het als vangnet): een geldig token zonder gekende `idp_subject` geeft 403 — personen ontstaan via SCIM-sync of beheer, niet impliciet.
- **SCIM-synchronisatie** van personen en rollen: eigen ADR zodra de pilot-tenant vastligt.
- **School-scoping van rollen** in de checks (roltoewijzing draagt al `school_id`; de afdwinging per school volgt zodra endpoints school-specifiek worden).
- **Publieke ontsluiting**: de API blijft niet extern bereikbaar tot de pentest (DPIA-maatregel R5) en de echte IdP-configuratie er zijn.

## Afgewezen alternatieven

- **Rollen uit tokenclaims (groups/roles)**: sneller, maar dupliceert het autorisatiemodel, maakt de toegangsmatrix afhankelijk van IdP-beheer buiten het platform, en botst met de audit-eis (wie had wanneer welke rol).
- **Sessies met cookies + server-side OIDC-flow**: hoort bij de web-app (ADR volgt met de web-keuze); de API-laag blijft stateless op Bearer-tokens zodat ook machineclients (sync-jobs) er terechtkunnen.
- **Issuer→tenant-mapping in applicatieconfiguratie**: verstopt tenantbeheer buiten de databank en het verwerkingsregister; de definer-functie houdt het in het RLS-domein met een expliciete, smalle uitzondering.

## Consequenties

- Integratietests tekenen echte tokens met een lokale JWKS-stub: de volledige verificatieketen (handtekening, issuer, audience, vervaltijd, persoon- en rolresolutie) wordt bij elke CI-run doorlopen.
- De audittrail krijgt de geauthenticeerde actor (`actor_id`) in plaats van `null` bij handelingen via de API.

[jose]: https://github.com/panva/jose
