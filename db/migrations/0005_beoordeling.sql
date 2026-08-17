-- 0005_beoordeling.sql — registratie van TADD-beoordelingen (module D,
-- datamodel.md § 3 BEOORDELING; sluit de lus deadline → geregistreerd).
--
-- Append-only voor de applicatierol: een beoordeling is een juridisch feit.
-- 'stilzwijgend_positief' legt casus D4 vast (geen beoordeling vóór de
-- deadline geldt decretaal als positief) — expliciet bevestigd door een
-- directeur, nooit stil door het systeem. Correcties (vier-ogen) volgen in
-- een latere migratie samen met het beheerscherm.

begin;

create table core.beoordeling (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references core.tenant (id),
  persoon_id        uuid not null references core.persoon (id),
  school_id         uuid references core.school (id),
  deadline_id       uuid not null references core.deadline (id),
  ambt              text not null,
  schooljaar        text not null check (schooljaar ~ '^\d{4}-\d{4}$'),
  resultaat         text not null check (
    resultaat in ('positief', 'met_werkpunten', 'negatief', 'stilzwijgend_positief')
  ),
  geregistreerd_door uuid not null references core.persoon (id),
  opmerking         text,
  aangemaakt_op     timestamptz not null default now(),
  -- één beoordeling per persoon per ambt per schooljaar
  unique (tenant_id, persoon_id, ambt, schooljaar)
);

create index beoordeling_persoon_idx on core.beoordeling (tenant_id, persoon_id, schooljaar);

alter table core.beoordeling enable row level security;
alter table core.beoordeling force row level security;

create policy tenant_isolatie on core.beoordeling
  using (tenant_id = current_setting('app.tenant_id', true)::uuid);

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'draagvlak_app') then
    grant select, insert on core.beoordeling to draagvlak_app;
  end if;
end $$;

commit;
