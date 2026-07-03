-- Databankrollen — eenmalig per cluster, vóór de migraties (rollen zijn
-- cluster-niveau en horen niet in migraties thuis).
-- Het wachtwoord hieronder is uitsluitend voor lokale ontwikkeling;
-- in gedeelde omgevingen komt het uit de secret store.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'draagvlak_app') then
    create role draagvlak_app login password 'dev-only-wachtwoord' nobypassrls;
  end if;
end $$;
