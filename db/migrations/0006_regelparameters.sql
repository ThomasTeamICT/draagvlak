-- 0006_regelparameters.sql — regelparameters per tenant (regelparameters.md
-- § 2: versiebeheer met bronvermelding; toegangsmatrix: wijzigen vereist het
-- vier-ogen-principe).
--
-- Levenscyclus: 'voorgesteld' → 'actief' (bekrachtigd door een ánder dan de
-- voorsteller) of 'afgewezen'. Rijen worden nooit verwijderd; een wijziging
-- is een nieuw voorstel. Alleen 'actief'-rijen sturen de teller en de
-- deadline-engine; zonder actieve rijen geldt de startset uit het
-- domeinpakket (bronvermelding maakt dat zichtbaar in elke verantwoording).
--
-- Het vier-ogen-principe zit in de tabel zelf: een rij kan alleen 'actief'
-- zijn met een bekrachtiger die verschilt van de voorsteller.

begin;

create table core.regelparameter (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references core.tenant (id),
  status             text not null default 'voorgesteld'
                     check (status in ('voorgesteld', 'actief', 'afgewezen')),
  geldig_vanaf       date not null,
  geldig_tot         date,
  bron               text not null,
  drempel_totaal     int  not null check (drempel_totaal > 0),
  drempel_effectief  int  not null check (drempel_effectief > 0),
  max_per_schooljaar int  not null check (max_per_schooljaar between 1 and 366),
  telregels          jsonb not null,
  voorgesteld_door   uuid not null references core.persoon (id),
  bekrachtigd_door   uuid references core.persoon (id),
  aangemaakt_op      timestamptz not null default now(),
  bijgewerkt_op      timestamptz not null default now(),
  check (geldig_tot is null or geldig_tot >= geldig_vanaf),
  check (status <> 'actief' or (bekrachtigd_door is not null and bekrachtigd_door <> voorgesteld_door))
);

create index regelparameter_actief_idx on core.regelparameter (tenant_id, status, geldig_vanaf);

alter table core.regelparameter enable row level security;
alter table core.regelparameter force row level security;

create policy tenant_isolatie on core.regelparameter
  using (tenant_id = current_setting('app.tenant_id', true)::uuid);

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'draagvlak_app') then
    grant select, insert, update on core.regelparameter to draagvlak_app;
  end if;
end $$;

commit;
