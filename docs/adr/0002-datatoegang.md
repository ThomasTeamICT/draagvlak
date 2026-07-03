# ADR-0002 — Datatoegang: postgres.js met RLS-transactiehelper

**Status: voorgesteld — te bekrachtigen door de stuurgroep (Fase 0).**

## Context

ADR-0001 liet de datatoegangslaag open met als harde eis: de row-level security van de databank mag niet omzeild of verstopt worden. De eerste verticale doorsnede (module B: tellers) dwingt nu een keuze af.

## Beslissing

**postgres.js** (npm-pakket `postgres`) als databankclient, zonder ORM, met één verplicht patroon:

```ts
await metTenantContext(db, tenantId, async (trx) => {
  // elke query in deze transactie ziet uitsluitend de eigen tenant:
  // set_config('app.tenant_id', …, true) == SET LOCAL, vervalt na commit/rollback
})
```

- Alle applicatiequeries lopen binnen `metTenantContext`; de helper is de enige plek die de context zet.
- De applicatie verbindt als `draagvlak_app` (`NOBYPASSRLS`); queries buiten een context zien nul rijen — falen blijft dicht.
- SQL blijft leesbaar in de code (tagged templates met automatische parameterisatie — geen string-concatenatie, geen injectie).

## Afgewezen alternatieven

- **Prisma/TypeORM**: eigen migratie- en modellaag verstopt de RLS-policies en het `SET LOCAL`-patroon; pooling-gedrag maakt transactiegebonden context foutgevoelig.
- **Kysely**: sterke typering, maar nu nog een extra abstractie zonder nood; herzienbaar wanneer de querycomplexiteit groeit (nieuwe ADR).

## Consequenties

- Rijtypes worden per module expliciet gedeclareerd naast de query — de types van `@draagvlak/telregels` zijn daarbij de bron voor domeinobjecten.
- Integratietests draaien tegen een echte PostgreSQL met de echte migraties en verbinden als `draagvlak_app`, zodat élke test ook de RLS-afscherming test.
- **Authenticatie is nog niet gebouwd**: tot de OIDC-koppeling (eigen ADR) komt de tenant-context uit een expliciet als tijdelijk gemarkeerde `x-tenant-id`-header. De API is daarom uitsluitend voor lokale ontwikkeling en CI; ze wordt niet ontsloten vóór de authenticatielaag er is.
