# Databank

PostgreSQL 16 met row-level security als afdwinging van de toegangsmatrix (ADR-0001). Migraties zijn platte, genummerde SQL-bestanden in `migrations/`, gedraaid door een kleine runner met versietabel (`apps/api/scripts/migreer.mjs`).

## Lokaal starten

```bash
docker compose up -d db
# rollen (eenmalig)
docker compose exec -T db psql -U draagvlak -d draagvlak < db/bootstrap/rollen.sql
# daarna: de runner houdt in public.schema_migratie bij wat al toegepast is
DATABASE_ADMIN_URL=postgres://draagvlak@localhost:5432/draagvlak pnpm --filter @draagvlak/api migreer
pnpm --filter @draagvlak/api migreer:status   # alleen kijken
```

De runner is idempotent en replica-veilig (advisory lock). Drie regels die hij afdwingt:

1. **Migraties zijn onveranderlijk.** Een toegepast bestand dat naderhand gewijzigd is (controlesom klopt niet meer) is een fout, geen stille no-op — verbeteren doe je met een nieuwe migratie.
2. **De versietabel staat in `public`, niet in `core`.** Een testomgeving die `drop schema core cascade` doet, neemt de historiek niet mee; de runner ziet "historiek zonder core-schema", wist de historiek en bouwt opnieuw op.
3. **Elke migratie beheert haar eigen transactie** (`begin`/`commit` staat in het bestand); de runner wikkelt er niets omheen.

## Het RLS-patroon (geldt voor elke latere tabel)

1. Elke tabel draagt `tenant_id` (en waar van toepassing `school_id`).
2. `enable` én `force row level security` — ook de tabel-eigenaar passeert de policies.
3. Policy op `current_setting('app.tenant_id', true)::uuid`: zonder gezette context (`SET LOCAL app.tenant_id = '…'` per transactie) matcht geen enkele rij — falen is dicht.
4. De applicatierol `draagvlak_app` heeft `NOBYPASSRLS` en géén delete-rechten; verwijderen verloopt uitsluitend via de bewaarregels (gelogde functie, volgt in een latere migratie).
5. `core.audit_log` is append-only: alleen select- en insert-policies, geen update/delete — voor niemand.

## Verifiëren

```sql
-- zonder context: nul rijen, geen fout
select count(*) from core.school;        -- 0

-- met context: alleen de eigen tenant
begin;
set local app.tenant_id = '<tenant-uuid>';
select count(*) from core.school;
commit;
```
