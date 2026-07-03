-- 0002_personeel.sql — module B, verticale doorsnede: aanstellingen & afwezigheden
-- (datamodel.md § 3). Volgt het RLS-patroon van 0001: tenant-scope op elke rij,
-- force row level security, geen delete-rechten voor de applicatierol.
-- Afwezigheden dragen enkel code en periode — géén medische inhoud (DPIA § 1.2).

begin;

create table core.aanstelling (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references core.tenant (id),
  persoon_id    uuid not null references core.persoon (id),
  school_id     uuid not null references core.school (id),
  ambt          text not null,
  statuut       text not null check (statuut in ('TABD','TADD','benoemd','TAO')),
  opdrachtbreuk numeric(5,4) check (opdrachtbreuk is null or (opdrachtbreuk > 0 and opdrachtbreuk <= 1)),
  start         date not null,
  einde         date not null,
  bron          text not null default 'handmatig' check (bron in ('sync','import','handmatig')),
  check (einde >= start)
);

create index aanstelling_persoon_idx on core.aanstelling (tenant_id, persoon_id);
create index aanstelling_school_idx on core.aanstelling (tenant_id, school_id);

create table core.afwezigheid (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references core.tenant (id),
  persoon_id uuid not null references core.persoon (id),
  code       text not null,
  start      date not null,
  einde      date not null,
  bron       text not null default 'sync' check (bron in ('sync','import','handmatig')),
  check (einde >= start)
);

create index afwezigheid_persoon_idx on core.afwezigheid (tenant_id, persoon_id);

alter table core.aanstelling enable row level security;
alter table core.afwezigheid enable row level security;
alter table core.aanstelling force row level security;
alter table core.afwezigheid force row level security;

create policy tenant_isolatie on core.aanstelling
  using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy tenant_isolatie on core.afwezigheid
  using (tenant_id = current_setting('app.tenant_id', true)::uuid);

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'draagvlak_app') then
    grant select, insert, update on core.aanstelling, core.afwezigheid to draagvlak_app;
  end if;
end $$;

commit;
