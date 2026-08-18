# ADR-0004 — Nachtelijke herberekening: in-proces planner, geen extra infrastructuur

**Status: voorgesteld — te bekrachtigen door de stuurgroep (Fase 0).**

## Context

De deadline-engine (drempeldetectie, escalatieniveaus, casus D3-intrekking) is
idempotent en draait per tenant in ~0,4 s, maar wordt tot nu alleen handmatig
aangeroepen. De kerninvariant "deadlines verstrijken nooit stil" vraagt dat de
escalatieladder élke dag opschuift zonder menselijke tussenkomst: een
beoordelingsdeadline die nadert moet vanzelf van eigenaar naar directeur naar
bestuur klimmen.

## Beslissing

Een **in-proces planner** in de API zelf: elke 30 seconden een goedkope
kloktik; wanneer de Belgische kloktijd (Europe/Brussels) het geconfigureerde
tijdstip passeert — standaard **03:30** — draait één veegronde over alle
tenants, elk in de eigen tenant-context en transactie, met `actor_id = null`
(systeem) in de audittrail.

De tenantlijst is per definitie tenant-overstijgend (zelfde kip-en-ei als de
issuer-lookup uit ADR-0003) en komt daarom uit een tweede smalle
`security definer`-functie, `core.tenant_ids()`, die uitsluitend id's
teruggeeft — geen namen, geen configuratie.

**Waarom veilig zonder verdere coördinatie:**

- de herberekening is idempotent; een dubbele run wijzigt niets;
- de bestaande advisory lock per tenant serialiseert overlappende runs — twee
  API-replica's die tegelijk vegen doen dubbel rekenwerk (bij de huidige
  schaal verwaarloosbaar), nooit dubbele mutaties;
- een fout in één tenant wordt gelogd en stopt de veegronde voor de andere
  tenants niet;
- de dagelijkse run gebruikt altijd de systeemdatum — het injecteerbare
  `vandaag` (met plausibiliteitsvenster) blijft exclusief voor het handmatige
  endpoint.

## Afgewezen alternatieven

- **Externe cron (Kubernetes CronJob, systemd-timer) die het endpoint
  aanroept**: vraagt per omgeving infrastructuurconfiguratie plus een
  machinetoken-verhaal door de OIDC-laag heen; kan later alsnog, de
  veegfunctie is er los van aanroeper.
- **pg_cron in de databank**: extensie-afhankelijk (niet overal beschikbaar op
  beheerde PostgreSQL) en verplaatst applicatielogica naar de databank.
- **Een jobqueue (BullMQ e.d.)**: extra infrastructuur (Redis) voor één
  dagelijkse, idempotente taak — tegen ADR-0001 (saai en klein beginnen).

## Bewust nog niet in deze stap

- **Verwittigingen** (e-mail/notificatie naar eigenaar, directeur, bestuur bij
  escalatie): eigen ontwerpstap, samen met de kanaalkeuze en het
  overleg-logboek.
- **Job-logtabel** met runhistoriek per tenant: nu volstaat de
  applicatielogging plus de audittrail (die elke mutatie al draagt); een
  tabel volgt zodra beheer een runoverzicht nodig heeft.
- **Leader election** over replica's: overbodig door idempotentie; herzien
  zodra het rekenwerk per run niet meer verwaarloosbaar is.

## Consequenties

- `HERBEREKEN_TIJDSTIP` (UU:MM, Belgische tijd) configureert het tijdstip;
  `HERBEREKEN_PLANNER=uit` schakelt de planner uit (bv. bij lokaal
  ontwikkelen naast een draaiende instantie). Tests draaien de veegfunctie
  rechtstreeks aan en starten de planner nooit.
- De klokvergelijking is een pure functie (`moetNuDraaien`) zodat de
  DST-gevoelige logica unit-testbaar is zonder klok of databank.
