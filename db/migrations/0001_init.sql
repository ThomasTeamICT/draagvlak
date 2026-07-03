-- 0001_init.sql — kernschema organisatie & identiteit + audittrail
-- Zet het RLS-patroon dat álle latere tabellen volgen (datamodel.md § 1 en § 7,
-- toegangsmatrix.md § 4 regel 5): elke rij draagt tenant-scope, de databank
-- dwingt de afscherming af onafhankelijk van applicatielogica.
--
-- De applicatie verbindt als rol `draagvlak_app` (zie db/bootstrap/rollen.sql)
-- en zet per transactie de context:
--   SET LOCAL app.tenant_id = '<uuid>';
-- Zonder context ziet een query nul rijen — falen is dicht, nooit open.

begin;

create schema if not exists core;

-- ── Organisatie ─────────────────────────────────────────────────────────────

create table core.tenant (
  id            uuid primary key default gen_random_uuid(),
  naam          text not null,
  idp_koppeling jsonb,
  aangemaakt_op timestamptz not null default now()
);

create table core.school (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references core.tenant (id),
  instellingsnummer text not null,
  naam              text not null,
  onderwijsniveau   text,
  unique (tenant_id, instellingsnummer)
);

-- ── Identiteit (bron: IdP via SCIM — Draagvlak is nooit de master) ──────────

create table core.persoon (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references core.tenant (id),
  idp_subject text not null,
  naam        text not null,
  email       text not null,
  in_dienst   date,
  unique (tenant_id, idp_subject)
);

create table core.roltoewijzing (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references core.tenant (id),
  persoon_id   uuid not null references core.persoon (id),
  school_id    uuid not null references core.school (id),
  rol          text not null check (rol in ('BG','AD','DIR','TE','BO','ME','PL','DPO')),
  geldig_vanaf date not null,
  geldig_tot   date,
  check (geldig_tot is null or geldig_tot >= geldig_vanaf)
);

create index roltoewijzing_persoon_idx on core.roltoewijzing (persoon_id);
create index roltoewijzing_school_idx on core.roltoewijzing (school_id);

-- ── Audittrail: append-only, ook voor de applicatierol ──────────────────────

create table core.audit_log (
  id          bigint generated always as identity primary key,
  tenant_id   uuid not null,
  actor_id    uuid,
  actie       text not null check (actie in ('lees','schrijf','export','config')),
  object_type text not null,
  object_id   uuid,
  tijdstip    timestamptz not null default now(),
  context     jsonb
);

create index audit_log_object_idx on core.audit_log (tenant_id, object_type, object_id);

-- ── Row-level security ──────────────────────────────────────────────────────

alter table core.tenant        enable row level security;
alter table core.school        enable row level security;
alter table core.persoon       enable row level security;
alter table core.roltoewijzing enable row level security;
alter table core.audit_log     enable row level security;

alter table core.tenant        force row level security;
alter table core.school        force row level security;
alter table core.persoon       force row level security;
alter table core.roltoewijzing force row level security;
alter table core.audit_log     force row level security;

-- current_setting(..., true) geeft NULL zonder context: dan matcht geen enkele rij.
create policy tenant_isolatie on core.tenant
  using (id = current_setting('app.tenant_id', true)::uuid);

create policy tenant_isolatie on core.school
  using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy tenant_isolatie on core.persoon
  using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy tenant_isolatie on core.roltoewijzing
  using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Audit: lezen en toevoegen binnen de tenant; wijzigen of wissen kan níét
-- (geen update/delete-policy en geen grants — append-only by design).
create policy audit_lezen on core.audit_log
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy audit_toevoegen on core.audit_log
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ── Rechten voor de applicatierol (bestaat via db/bootstrap/rollen.sql) ─────

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'draagvlak_app') then
    grant usage on schema core to draagvlak_app;
    grant select, insert, update on core.tenant, core.school, core.persoon, core.roltoewijzing to draagvlak_app;
    grant select, insert on core.audit_log to draagvlak_app;
    -- bewust géén delete: verwijderen verloopt via bewaarregels (aparte, gelogde functie, volgt later)
  end if;
end $$;

commit;
