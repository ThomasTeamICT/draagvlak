-- 0011_bevragingen.sql — module-familie W: bevragingen (functioneel ontwerp
-- welzijn.md, ontwerpbeslissingen W1-W12).
--
-- Twee producten in één motor, gescheiden door een onomkeerbare typekeuze:
-- 'op_naam' (klasse A: feit/keuze/beschikbaarheid) en 'team'
-- (vertrouwelijk-geaggregeerd, klasse A+B). Klasse C bestaat niet — de
-- check op bevraging_vraag kent alleen 'A' en 'B'.
--
-- De scheiding uitnodiging/antwoord (W3) zit in het schema zelf:
-- - bevraging_uitnodiging is de uitnodigingsdienst: kent personen, stuurt
--   herinneringen, registreert deelname — maar de API toont deelname alleen
--   bij op-naam-bevragingen (W12);
-- - bevraging_antwoord draagt bij teambevragingen GEEN persoon_id (check),
--   en geen tijdstip fijner dan de dag — een team van acht mag niet
--   terugrekenbaar zijn op "wie zat om 14u03 achter de pc".
--
-- Teambevragingen hebben lanceervoorwaarden tot in de databank (W7/W8):
-- geen teambevraging zonder opvolgpad; het overlegorgaan en de
-- DPIA-bevestiging worden in de API gecontroleerd tegen core.overlegorgaan.

begin;

create table core.overlegorgaan (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references core.tenant (id),
  -- generiek per net (W8): comité PBW, basiscomité (GO!), hoog
  -- overlegcomité (officieel), vakbondsafvaardiging, of rechtstreeks het
  -- personeel (kleine school zonder orgaan)
  soort         text not null check (soort in
    ('cpbw', 'basiscomite', 'hoc', 'vakbondsafvaardiging', 'personeel')),
  naam          text not null,
  dpia_bevestigd boolean not null default false,
  aangemaakt_op timestamptz not null default now(),
  unique (tenant_id)
);

create table core.bevraging (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references core.tenant (id),
  type           text not null check (type in ('op_naam', 'team')),
  titel          text not null,
  toelichting    text,
  status         text not null default 'open' check (status in ('open', 'gesloten')),
  -- terugkoppellus (W7): verplicht bij team — wie bespreekt het resultaat, wanneer
  opvolg_wie     text,
  opvolg_tegen   date,
  aangemaakt_door uuid references core.persoon (id),
  aangemaakt_op  timestamptz not null default now(),
  gesloten_op    timestamptz,
  check (type <> 'team' or (opvolg_wie is not null and opvolg_tegen is not null))
);

create table core.bevraging_vraag (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references core.tenant (id),
  bevraging_id uuid not null references core.bevraging (id),
  volgnr       int  not null check (volgnr >= 1),
  -- klasse C bestaat niet in dit platform (W1)
  klasse       text not null check (klasse in ('A', 'B')),
  vorm         text not null check (vorm in
    ('keuze', 'meerkeuze', 'schaal', 'ja_nee', 'datumkeuze', 'tekst')),
  tekst        text not null,
  -- keuzeopties voor keuze/meerkeuze/datumkeuze; schaalbereik voor schaal
  opties       jsonb,
  unique (bevraging_id, volgnr)
);

create table core.bevraging_uitnodiging (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references core.tenant (id),
  bevraging_id  uuid not null references core.bevraging (id),
  persoon_id    uuid not null references core.persoon (id),
  gezien_op     timestamptz,
  beantwoord_op timestamptz,
  aangemaakt_op timestamptz not null default now(),
  unique (bevraging_id, persoon_id)
);

create table core.bevraging_antwoord (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references core.tenant (id),
  bevraging_id uuid not null references core.bevraging (id),
  vraag_id     uuid not null references core.bevraging_vraag (id),
  -- op naam: verplicht; team: verboden (W3)
  op_naam      boolean not null,
  persoon_id   uuid references core.persoon (id),
  -- 'liever niet zeggen' is een geteld antwoord (W6): waarde null + geteld
  waarde       jsonb,
  liever_niet  boolean not null default false,
  -- daggranulariteit, bewust geen timestamptz (W3)
  beantwoord_op date not null default current_date,
  check (op_naam = (persoon_id is not null)),
  check (liever_niet or waarde is not null)
);

create index bevraging_tenant_idx on core.bevraging (tenant_id, status);
create index uitnodiging_persoon_idx on core.bevraging_uitnodiging (tenant_id, persoon_id);
create index uitnodiging_bevraging_idx on core.bevraging_uitnodiging (tenant_id, bevraging_id);
create index antwoord_bevraging_idx on core.bevraging_antwoord (tenant_id, bevraging_id);

alter table core.overlegorgaan enable row level security;
alter table core.overlegorgaan force row level security;
alter table core.bevraging enable row level security;
alter table core.bevraging force row level security;
alter table core.bevraging_vraag enable row level security;
alter table core.bevraging_vraag force row level security;
alter table core.bevraging_uitnodiging enable row level security;
alter table core.bevraging_uitnodiging force row level security;
alter table core.bevraging_antwoord enable row level security;
alter table core.bevraging_antwoord force row level security;

create policy tenant_isolatie on core.overlegorgaan
  using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy tenant_isolatie on core.bevraging
  using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy tenant_isolatie on core.bevraging_vraag
  using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy tenant_isolatie on core.bevraging_uitnodiging
  using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy tenant_isolatie on core.bevraging_antwoord
  using (tenant_id = current_setting('app.tenant_id', true)::uuid);

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'draagvlak_app') then
    grant select, insert, update on core.overlegorgaan to draagvlak_app;
    grant select, insert, update on core.bevraging to draagvlak_app;
    grant select, insert on core.bevraging_vraag to draagvlak_app;
    grant select, insert, update on core.bevraging_uitnodiging to draagvlak_app;
    grant select, insert on core.bevraging_antwoord to draagvlak_app;
  end if;
end $$;

commit;
