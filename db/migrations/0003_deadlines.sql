-- 0003_deadlines.sql — deadline-engine: gedetecteerde decretale deadlines met
-- escalatieniveau (datamodel.md § 3 DEADLINE, regelparameters.md § 3).
-- Rijen worden aangemaakt en ingetrokken door de herberekenservice; intrekken
-- is een statuswijziging ('vervallen'), nooit een delete — het spoor blijft.

begin;

create table core.deadline (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references core.tenant (id),
  persoon_id      uuid not null references core.persoon (id),
  school_id       uuid references core.school (id),
  ambt            text not null,
  type            text not null check (type in ('TADD_kandidaatstelling', 'TADD_beoordeling')),
  datum           date not null,
  status          text not null default 'open' check (status in ('open', 'geregistreerd', 'vervallen')),
  escalatieniveau int  not null default 0 check (escalatieniveau between 0 and 5),
  -- verantwoording van de drempeldetectie (dagen, peildatum, parameterbronnen)
  berekening      jsonb,
  aangemaakt_op   timestamptz not null default now(),
  bijgewerkt_op   timestamptz not null default now(),
  unique (tenant_id, persoon_id, ambt, type, datum)
);

create index deadline_status_idx on core.deadline (tenant_id, status, datum);
create index deadline_persoon_idx on core.deadline (tenant_id, persoon_id);

alter table core.deadline enable row level security;
alter table core.deadline force row level security;

create policy tenant_isolatie on core.deadline
  using (tenant_id = current_setting('app.tenant_id', true)::uuid);

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'draagvlak_app') then
    grant select, insert, update on core.deadline to draagvlak_app;
  end if;
end $$;

commit;
