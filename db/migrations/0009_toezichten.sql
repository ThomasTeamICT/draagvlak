-- 0009_toezichten.sql — toezichten en beurtrollen (module P2, planning.md).
--
-- Toezichtsoorten dragen hun juridische categorie (BaO/97/8 en JUR1/11/AVW,
-- ⚠ TE VALIDEREN): kwartier vóór/na en speeltijden = schoolopdracht;
-- middagtoezicht valt erbuiten (apart vergoed, ook niet-personeelsleden —
-- vandaar externe_naam als alternatief voor persoon_id op een beurt).
-- Beurten zijn planning: wijzigen en verwijderen mag, altijd met auditregel.

begin;

create table core.toezichtsoort (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references core.tenant (id),
  -- null = geldt voor alle scholen van de tenant
  school_id     uuid references core.school (id),
  naam          text not null,
  categorie     text not null check (categorie in ('schoolopdracht', 'vergoed', 'vrijwillig')),
  -- weekdagen waarop dit toezicht bestaat: 1 = maandag … 5 = vrijdag
  weekdagen     int[] not null check (weekdagen <> '{}' and weekdagen <@ array[1,2,3,4,5]),
  starttijd     time not null,
  eindtijd      time not null,
  aangemaakt_op timestamptz not null default now(),
  check (eindtijd > starttijd),
  unique (tenant_id, naam)
);

create table core.toezichtbeurt (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references core.tenant (id),
  soort_id      uuid not null references core.toezichtsoort (id),
  datum         date not null,
  -- óf een personeelslid, óf een externe toezichter (bv. vrijwilliger middag)
  persoon_id    uuid references core.persoon (id),
  externe_naam  text,
  aangemaakt_op timestamptz not null default now(),
  check ((persoon_id is null) <> (externe_naam is null)),
  unique (soort_id, datum, persoon_id)
);

create index toezichtbeurt_datum_idx on core.toezichtbeurt (tenant_id, datum);
create index toezichtbeurt_persoon_idx on core.toezichtbeurt (tenant_id, persoon_id);

alter table core.toezichtsoort enable row level security;
alter table core.toezichtsoort force row level security;
alter table core.toezichtbeurt enable row level security;
alter table core.toezichtbeurt force row level security;

create policy tenant_isolatie on core.toezichtsoort
  using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy tenant_isolatie on core.toezichtbeurt
  using (tenant_id = current_setting('app.tenant_id', true)::uuid);

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'draagvlak_app') then
    grant select, insert on core.toezichtsoort to draagvlak_app;
    grant select, insert, update, delete on core.toezichtbeurt to draagvlak_app;
  end if;
end $$;

commit;
