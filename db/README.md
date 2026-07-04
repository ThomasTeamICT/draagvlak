# Databank

PostgreSQL 16 met row-level security als afdwinging van de toegangsmatrix (ADR-0001). Migraties zijn platte, genummerde SQL-bestanden in `migrations/`; migratietooling wordt gekozen in een latere ADR — tot dan volstaat `psql` in volgorde.

## Lokaal starten

```bash
docker compose up -d db
# rollen (eenmalig), daarna alle migraties in volgorde
docker compose exec -T db psql -U draagvlak -d draagvlak < db/bootstrap/rollen.sql
for migratie in db/migrations/*.sql; do
  docker compose exec -T db psql -v ON_ERROR_STOP=1 -U draagvlak -d draagvlak < "$migratie"
done
```

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
