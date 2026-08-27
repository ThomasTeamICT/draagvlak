# Testgids — de hele lus van directeur tot extensie

Deze gids doorloopt module W end-to-end op je eigen machine: de directeur
stuurt bevragingen uit via de testcockpit, personeelsleden antwoorden via de
Chrome-extensie of via persona-wissel in de cockpit, en je ziet beide kanten
van elke ontwerpbeslissing (de blokkades incluis — die zíjn de demo).

## Vooraf nodig

- Node 22+ en pnpm (`corepack enable`)
- PostgreSQL lokaal met de rollen uit `db/bootstrap/rollen.sql`
  (de demo gaat uit van `postgres://postgres:postgres@localhost:5432/draagvlak`
  en `postgres://draagvlak_app:draagvlak@localhost:5432/draagvlak`; anders:
  `DATABASE_ADMIN_URL` en `DATABASE_URL` zetten)
- Chrome (of Chromium)

```bash
pnpm install
pnpm -r build
pnpm demo
```

`pnpm demo` bouwt een **vers** schema (⚠ wist `core` — alleen
testdatabanken), start een lokale identiteitsstub en de API, vult
Basisschool De Regenboog met een directeur en acht personeelsleden, zet het
overlegorgaan klaar en stuurt alvast één invalvraag uit. Daarna draait op
**http://127.0.0.1:4600** de testcockpit, en print de terminal een token om
in de extensie te plakken.

## Als http://127.0.0.1:4600 niet bereikbaar is

Dan draait `pnpm demo` niet (meer) — kijk in de terminal waar je hem
startte; het script zegt sinds v0.2 precies wat er schort en blijft anders
gewoon op de voorgrond draaien (sluit het venster niet). De drie gewone
oorzaken:

1. **PostgreSQL draait niet of is niet geïnstalleerd.** Snelste weg,
   ook op Windows (Docker Desktop):

   ```bash
   docker run --name draagvlak-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16
   ```

   De demo maakt de databank en de applicatierol daarna zelf aan, en zet
   het wachtwoord van de rol gelijk met wat in `DATABASE_URL` staat.
2. **Nog niet gebouwd** — de demo bouwt tegenwoordig zelf als
   `apps/api/dist` ontbreekt; `pnpm install` blijft wel nodig.
3. **Poort 4599/4600 bezet** — er draait al een demo in een ander venster;
   stop die eerst met Ctrl+C.

**Poort 5432 al bezet** (een bestaande PostgreSQL-installatie)? Draai de
container dan op 5433 en leg dat één keer vast in een `.env`-bestand in de
repowortel — de demo leest het voortaan zelf:

```powershell
docker rm -f draagvlak-pg
docker run --name draagvlak-pg -e POSTGRES_PASSWORD=postgres -p 5433:5432 -d postgres:16
```

`.env` (naast package.json; staat in .gitignore):

```
DATABASE_ADMIN_URL=postgres://postgres:postgres@localhost:5433/draagvlak
DATABASE_URL=postgres://draagvlak_app:draagvlak@localhost:5433/draagvlak
```

Draait je PostgreSQL met andere gegevens, zet dan diezelfde twee regels in
`.env` met jouw waarden (of als omgevingsvariabelen vóór `pnpm demo`).

## Stap 1 — de cockpit (directeurskant)

Open http://127.0.0.1:4600. Rechtsboven kies je wie je bent; je start als
**Anke Willems (directeur)**.

1. **Nieuwe bevraging** — de typekeuze staat bovenaan en is de kern van het
   ontwerp: *Vraag aan personen* (op naam) of *Teambevraging*
   (vertrouwelijk). De gele/groene balk eronder zegt per type wie wat te
   zien krijgt.
2. **Probeer de blokkade:** kies *Vraag aan personen*, zet de vraagklasse op
   **B — beleving** en stuur uit. De weigering die je krijgt, is
   ontwerpbeslissing W9 in werking: een beleving mag nooit op naam.
3. **Stuur een echte teambevraging:** type *Teambevraging*, titel "Hoe loopt
   het eerste trimester?", opvolgpad invullen (verplicht — de
   terugkoppellus is een lanceervoorwaarde), één schaalvraag klasse B,
   vijf of meer genodigden aanvinken, uitsturen.

## Stap 2 — de extensie (personeelskant)

1. `chrome://extensions` → ontwikkelaarsmodus aan → **Uitgepakte extensie
   laden** → map `apps/extensie/`.
2. Pin het pictogram vast (puzzelstukje → punaise) — anders zie je de badge
   niet.
3. Klik het pictogram → ⚙ instellingen: API-endpoint
   `http://127.0.0.1:4600`, klap *"Voor testomgevingen"* open en plak het
   token uit de terminal (dat is Jonas Dierckx). **Opslaan en verbinden.**
4. Het zijpaneel toont nu de inbox: de invalvraag (groen, *op naam*, "jouw
   antwoord gaat op naam naar Anke Willems") en de teambevraging (amber,
   *vertrouwelijk*, met de drempeluitleg). De badge op het pictogram telt
   mee.
5. Beantwoord beide. Let bij de teambevraging op "liever niet zeggen" — dat
   is een gételd antwoord, geen non-respons.

## Stap 3 — de drempel halen en het rapport zien

Achter de teambevraging zit de drempel van vijf respondenten. Wissel in de
cockpit rechtsboven van persona en beantwoord de teambevraging via het
tabblad **Inbox van deze persona** tot vijf mensen geantwoord hebben.

Dan als directeur:

1. **Overzicht** → klik de teambevraging. Je ziet een responsgraad maar
   **geen deelnemerslijst** — dat is W12, ook voor jou als directeur.
2. Klik *"Probeer het rapport nu al op te vragen"*: geweigerd — het rapport
   bestaat pas na sluiting (W5, geen realtime meekijken).
3. **Sluiten en rapport opmaken** → het rapport toont de verdeling.
   Sluit je met minder dan vijf respondenten, dan zie je de
   **kleine-school-modus**: een expliciet advies, nooit stilletjes niets.
4. Open ook de **invalvraag**: daar zie je per genodigde
   ✓ afgeleverd · ✓✓ gezien · ✓✓✓ beantwoord, mét het antwoord op naam.
   Wie de extensie gebruikte staat op ✓ zodra zijn toestel de vraag ophaalde.

## Stap 4 — de databankcontrole (voor wie het wil nameten)

```sql
-- geen enkel teamantwoord hangt aan een persoon:
select count(*) from core.bevraging_antwoord
where op_naam = false and persoon_id is not null;  -- altijd 0
```

## Geautomatiseerd

Dezelfde lus draait ook zonder klikken:

```bash
# extensie end-to-end in Chromium (badge, inbox, antwoorden, databankcontroles)
node apps/extensie/test/extensie.e2e.mjs

# de volledige suite (domeinregels + API-integratie)
DATABASE_ADMIN_URL=… DATABASE_URL=… pnpm -r test
```

## Wat je bewust níét kan testen (want bestaat niet)

Een klasse C-vraag aanmaken (gezondheidsvragen bestaan niet in het
platform), een deelnemerslijst bij een teambevraging opvragen, een
teamrapport onder de drempel afdwingen, of realtime meekijken — elke poging
eindigt in een uitleg die naar het functioneel ontwerp verwijst. Dat is
geen beperking van de demo maar het product zelf.
