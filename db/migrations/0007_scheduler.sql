-- 0007_scheduler.sql — tenantopsomming voor de nachtelijke planner (ADR-0004).
--
-- De veegronde van de deadline-engine is per definitie tenant-overstijgend:
-- ze moet wéten welke tenants er zijn vóór er een tenant-context bestaat —
-- hetzelfde kip-en-ei als de issuer-lookup (0004_idp.sql). Daarom één tweede,
-- even smalle security definer-functie: uitsluitend id's, geen namen of
-- configuratie. Al het overige verkeer blijft achter row-level security.

begin;

create function core.tenant_ids()
returns setof uuid
language sql
security definer
set search_path = core, pg_temp
as $$
  select id from core.tenant order by id
$$;

revoke all on function core.tenant_ids() from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'draagvlak_app') then
    grant execute on function core.tenant_ids() to draagvlak_app;
  end if;
end $$;

commit;
