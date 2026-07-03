# ADR-0001 — Stackkeuze MVP: TypeScript-monorepo, Fastify, PostgreSQL met RLS

**Status: voorgesteld — te bekrachtigen door de stuurgroep (Fase 0).**
De scaffolding in deze repository volgt deze ADR alvast, zodat er iets concreets te beoordelen valt; alles hieronder is omkeerbaar zolang Fase 1 niet gestart is.

## Context

De blauwdruk (§ 9) vraagt: een responsieve web-app (PWA), een modulaire monoliet rond een centrale API, PostgreSQL met row-level security als afdwinging van de toegangsmatrix, achtergrondjobs voor tellers en de deadline-engine, EU-hosting, en maatwerk (geen generiek no-code) omdat RLS, audittrails, bewaartermijn-automatisering en WCAG hard te maken moeten zijn.

## Beslissing

| Aspect | Keuze | Kernargument |
|---|---|---|
| Taal | TypeScript, strict, overal | Eén taal voor domein, API en web verlaagt de instapdrempel voor een klein team; types documenteren het domein |
| Repostructuur | Monorepo met pnpm-workspaces | Domeinpakketten, API en web delen types en testinfrastructuur zonder publicatie-overhead |
| Domeinlogica | Framework-vrije packages (`packages/*`) | De gevoeligste logica (telregels!) blijft puur en testbaar, los van elke framework- of databankkeuze |
| API | Fastify als modulaire monoliet (`apps/api`) | Licht, snel, uitstekende schema-validatie; plugins per module (A-E) geven de "modulaire monoliet" vorm zonder de leercurve en magie van NestJS |
| Databank | PostgreSQL 16; migraties in platte SQL | RLS-policies zijn eerste-klas ontwerpartefacten en horen leesbaar in versiebeheer, niet verstopt achter een ORM-abstractie |
| Datatoegang | Nader te bepalen (ADR volgt) | Kandidaten: Kysely of postgres.js met eigen RLS-transactiehelper (`SET LOCAL app.tenant_id`); een ORM die RLS omzeilt is uitgesloten |
| Web-app | **Uitgesteld naar ADR-0002** | Niet nodig vóór het einde van Fase 0; kandidaten SvelteKit en Next.js worden beoordeeld op WCAG-realiseerbaarheid, PWA/offline-tolerantie en teamprofiel |
| Tests | Vitest | Snel, TypeScript-native; de testcasusset telregels is de eerste suite |
| CI | GitHub Actions | Typecheck + tests bij elke push; uitbreidbaar met lint, audit en e2e |
| Lokale ontwikkeling | docker-compose (PostgreSQL 16) | Reproduceerbare databank met de RLS-migraties |

## Afgewezen alternatieven

- **NestJS**: goede modulestructuur, maar zwaardere abstractielaag en leercurve; Fastify + plugins bereikt dezelfde modulariteit expliciter. Herzienbaar als het team groeit.
- **Generiek no-code/low-code voor productie**: afgewezen in de blauwdruk zelf (§ 9); no-code blijft wél het middel voor wegwerp-validatieprototypes (zie `prototype/`).
- **ORM met eigen rechtenlaag i.p.v. RLS**: de toegangsmatrix moet gelden onafhankelijk van applicatiebugs; RLS in de databank is het ontwerpuitgangspunt (blauwdruk § 8-9).

## Consequenties

- De eerste code is het pakket `@draagvlak/telregels`: pure domeinlogica met de testcasusset ([testcases-telregels.md](../functioneel-ontwerp/testcases-telregels.md)) als geautomatiseerde suite; ⚠ TE VALIDEREN-casussen staan als `todo`-tests zichtbaar in de runner.
- Migratie `db/migrations/0001_init.sql` zet het RLS-patroon dat alle latere tabellen volgen.
- Wat deze ADR **niet** vastlegt: hostingpartij en -regio-inrichting (wel: EU), IdP-koppelingsbibliotheek, zoekindex, jobrunner, migratietooling. Elk volgt in een eigen ADR zodra het aan de orde is.
