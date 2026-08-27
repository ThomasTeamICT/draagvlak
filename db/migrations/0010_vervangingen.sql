-- 0010_vervangingen.sql — vervangingen en noodmaatregelen (module P3, planning.md).
--
-- Drie stukken:
-- 1. platformlid: wie in het lerarenplatform zit, per schooljaar — de
--    kanaalkeuze-assistent en de vervangersvoorstellen kijken hiernaar.
-- 2. vervangingscontingent: het jaarbudget vervangingseenheden van de tenant;
--    het verbruik wordt berekend uit de vastgelegde vervangingen, nooit
--    dubbel bijgehouden.
-- 3. vervanging: de beslissing zelf. Elke vervanging draagt haar kanaal én —
--    bij een noodmaatregel — het expliciete verlies (wat werd opgeofferd).
--    Dat verlies is de onzichtbaarste kost van het lerarentekort; hier krijgt
--    hij een kolom en een auditregel, anders bestaat hij nergens.
--
-- ⚠ TE VALIDEREN: de regeldrempels zelf staan in @draagvlak/planregels
-- (vervangingsregelboek); dit schema legt alleen beslissingen vast.

begin;

create table core.platformlid (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references core.tenant (id),
  persoon_id    uuid not null references core.persoon (id),
  schooljaar    text not null check (schooljaar ~ '^\d{4}-\d{4}$'),
  aangemaakt_op timestamptz not null default now(),
  unique (tenant_id, persoon_id, schooljaar)
);

create table core.vervangingscontingent (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references core.tenant (id),
  schooljaar    text not null check (schooljaar ~ '^\d{4}-\d{4}$'),
  eenheden      int  not null check (eenheden >= 0),
  bron          text not null default 'handmatig',
  aangemaakt_op timestamptz not null default now(),
  unique (tenant_id, schooljaar)
);

create table core.vervanging (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references core.tenant (id),
  -- wie afwezig is en waarvoor vervangen wordt
  afwezige_id     uuid not null references core.persoon (id),
  start           date not null,
  einde           date not null,
  kanaal          text not null check (kanaal in
    ('lerarenplatform', 'tijdelijke_aanstelling', 'vervangingseenheden', 'intern', 'geen_vervanging')),
  -- wie vervangt: een personeelslid óf een externe naam; bij een pure
  -- noodmaatregel (klas verdeeld) kan het allebei leeg zijn
  vervanger_id    uuid references core.persoon (id),
  externe_naam    text,
  -- verbruik vervangingseenheden (alleen bij kanaal vervangingseenheden)
  eenheden        int not null default 0 check (eenheden >= 0),
  -- noodmaatregel: soort + het expliciet benoemde verlies
  nood_soort      text check (nood_soort in
    ('klas_verdelen', 'zorg_inzetten', 'klassen_samenvoegen', 'externe_invaller')),
  nood_verlies    text,
  -- reaffectatiecheck uitgevoerd vóór een tijdelijke aanstelling (V6)
  reaffectatie_gecheckt boolean not null default false,
  status          text not null default 'actief' check (status in ('actief', 'geannuleerd')),
  aangemaakt_door uuid references core.persoon (id),
  aangemaakt_op   timestamptz not null default now(),
  check (einde >= start),
  -- een noodmaatregel heeft altijd een benoemd verlies
  check (nood_soort is null or nood_verlies is not null),
  -- interne opvang of geen vervanging: dáár horen de noodmaatregelen thuis
  check (nood_soort is null or kanaal in ('intern', 'geen_vervanging'))
);

create index vervanging_afwezige_idx on core.vervanging (tenant_id, afwezige_id);
create index vervanging_periode_idx  on core.vervanging (tenant_id, start, einde);
create index vervanging_vervanger_idx on core.vervanging (tenant_id, vervanger_id);

alter table core.platformlid enable row level security;
alter table core.platformlid force row level security;
alter table core.vervangingscontingent enable row level security;
alter table core.vervangingscontingent force row level security;
alter table core.vervanging enable row level security;
alter table core.vervanging force row level security;

create policy tenant_isolatie on core.platformlid
  using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy tenant_isolatie on core.vervangingscontingent
  using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy tenant_isolatie on core.vervanging
  using (tenant_id = current_setting('app.tenant_id', true)::uuid);

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'draagvlak_app') then
    grant select, insert, delete on core.platformlid to draagvlak_app;
    grant select, insert, update on core.vervangingscontingent to draagvlak_app;
    grant select, insert, update on core.vervanging to draagvlak_app;
  end if;
end $$;

commit;
