-- 0008_kalender.sql — schoolkalender (module P1, planning.md): vakanties,
-- facultatieve verlofdagen, pedagogische studiedagen en lesvrije dagen.
--
-- De kalender is planning (geen juridisch feit): rijen mogen verwijderd
-- worden, maar elke mutatie krijgt een audit-regel. Validatie tegen het
-- kalenderregelboek van het schooljaar gebeurt in @draagvlak/planregels
-- (regels per schooljaar, ⚠ TE VALIDEREN tegen Edulex).

begin;

create table core.kalenderperiode (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references core.tenant (id),
  -- null = geldt voor alle scholen van de tenant
  school_id       uuid references core.school (id),
  schooljaar      text not null check (schooljaar ~ '^\d{4}-\d{4}$'),
  type            text not null check (type in (
    'vakantie', 'facultatieve_verlofdag', 'pedagogische_studiedag',
    'wettelijke_feestdag', 'lesvrij_overmacht'
  )),
  start           date not null,
  einde           date not null,
  dagdeel         text not null default 'heel' check (dagdeel in ('voormiddag', 'namiddag', 'heel')),
  omschrijving    text,
  opvang_voorzien boolean not null default false,
  aangemaakt_door uuid references core.persoon (id),
  aangemaakt_op   timestamptz not null default now(),
  check (einde >= start)
);

create index kalenderperiode_jaar_idx on core.kalenderperiode (tenant_id, schooljaar, type);

alter table core.kalenderperiode enable row level security;
alter table core.kalenderperiode force row level security;

create policy tenant_isolatie on core.kalenderperiode
  using (tenant_id = current_setting('app.tenant_id', true)::uuid);

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'draagvlak_app') then
    grant select, insert, delete on core.kalenderperiode to draagvlak_app;
  end if;
end $$;

commit;
