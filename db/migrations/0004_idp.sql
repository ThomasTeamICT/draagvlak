-- 0004_idp.sql — IdP-koppeling per tenant (ADR-0003): issuer → tenant,
-- audience en JWKS-URI voor tokenvalidatie.
--
-- De opzoeking op issuer gebeurt vóór er een tenant-context bestaat (kip-en-ei
-- met RLS). Daarom bestaat er één smalle, expliciete uitzondering: de
-- security definer-functie core.idp_config_voor_issuer. Al het overige
-- verkeer blijft achter row-level security.

begin;

create table core.idp_config (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references core.tenant (id),
  issuer        text not null unique,
  audience      text not null,
  jwks_uri      text not null,
  aangemaakt_op timestamptz not null default now()
);

-- ENABLE zonder FORCE, bewust: de security definer-functie hieronder draait
-- als tabel-eigenaar (de migratierol), en die moet langs de policies kunnen
-- lezen óók wanneer de migratierol geen superuser/BYPASSRLS is — met FORCE
-- zou de issuer-lookup dan nul rijen zien en faalt élke authenticatie.
-- draagvlak_app is geen eigenaar en valt dus altijd onder de policy.
alter table core.idp_config enable row level security;

create policy tenant_isolatie on core.idp_config
  using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Eigenaar van de functie is de migratierol (superuser in dev/CI); de functie
-- leest daardoor langs RLS heen — uitsluitend deze drie kolommen, op exacte
-- issuer-match. search_path vastgezet tegen schaduwtabellen.
create function core.idp_config_voor_issuer(p_issuer text)
returns table (tenant_id uuid, audience text, jwks_uri text)
language sql
security definer
set search_path = core, pg_temp
as $$
  select tenant_id, audience, jwks_uri
  from core.idp_config
  where issuer = p_issuer
$$;

revoke all on function core.idp_config_voor_issuer(text) from public;

-- De applicatierol krijgt GEEN rechten op de tabel zelf: idp_config is het
-- vertrouwensanker van de tokenvalidatie (issuer → tenant, audience,
-- jwks_uri). De app leest uitsluitend via de definer-functie; beheer verloopt
-- via de migratie-/beheerrol.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'draagvlak_app') then
    grant execute on function core.idp_config_voor_issuer(text) to draagvlak_app;
  end if;
end $$;

commit;
