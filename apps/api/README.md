# @draagvlak/api

Modulaire monoliet (Fastify) — zie [ADR-0001](../../docs/adr/0001-stackkeuze.md) en [ADR-0002](../../docs/adr/0002-datatoegang.md).

## Endpoints

| Endpoint | Wat |
|---|---|
| `GET /health`, `GET /version` | Liveness en identificatie |
| `GET /api/v1/personen/:persoonId/tellers?peildatum=JJJJ-MM-DD` | Dienstanciënniteitstellers per ambt, met drempelevaluatie (TADD-deadlines) en volledige verantwoording. Zonder `peildatum`: prognose op 30 juni van het lopende schooljaar |
| `POST /api/v1/deadlines/herbereken` | Deadline-engine: idempotente drempeldetectie over alle personen van de tenant; maakt deadlines aan, actualiseert escalatieniveaus en trekt vervallen signalen in (status, nooit delete). Body optioneel `{ "vandaag": "JJJJ-MM-DD" }` voor reproduceerbare escalatie |
| `GET /api/v1/deadlines?status=open&limiet=100` | Werkvoorraad voor startscherm en startersdashboard: deadlines met naam, type, datum, escalatieniveau en de berekening erachter (standaard 100, max 500) |
| `POST /api/v1/deadlines/:deadlineId/registreer` | Registreert een TADD-beoordeling (`positief`, `met_werkpunten`, `negatief`, of `stilzwijgend_positief` ná het verstrijken — casus D4) tegen een open beoordelingsdeadline; de deadline gaat naar `geregistreerd` |
| `GET /api/v1/personen/:persoonId/beoordelingen` | Beoordelingshistoriek voor het dossierscherm, met registrator en schooljaar |
| `GET /api/v1/regelparameters` | Alle parameterversies van de tenant (voorgesteld, actief, afgewezen), met voorsteller en bekrachtiger |
| `POST /api/v1/regelparameters` | Nieuwe parameterversie voorstellen (drempels, plafond, telregels, bronvermelding) — status `voorgesteld` |
| `POST /api/v1/regelparameters/:id/bekrachtig` | Vier-ogen-bekrachtiging door een ándere beheerder — pas dan stuurt de versie teller en engine |
| `POST /api/v1/regelparameters/:id/wijs-af` | Voorstel afwijzen (rij blijft bestaan, wordt nooit actief) |
| `GET /api/v1/kalender?schooljaar=JJJJ-JJJJ&niveau=basis` | Schoolkalender (module P1) met validatiemeldingen tegen het kalenderregelboek van dat schooljaar |
| `POST /api/v1/kalender` | Kalenderperiode toevoegen (vakantie, facultatieve verlofdag, pedagogische studiedag…) — regelboek-fouten blokkeren met 422, waarschuwingen (bv. opvangplicht 2026-2027) informeren |
| `DELETE /api/v1/kalender/:id` | Kalenderperiode verwijderen (planning, geen juridisch feit) — mét auditregel |
| `POST /api/v1/toezichten/soorten` · `GET …/soorten` | Toezichtsoorten (module P2) met juridische categorie: `schoolopdracht`, `vergoed` (middagtoezicht) of `vrijwillig`, plus weekdagen en tijdvak |
| `POST /api/v1/toezichten/genereer` | Billijke, deterministische beurtrolgeneratie over een periode: laagste historische teller eerst, niemand twee keer per dag als het niet hoeft, kalendervrije dagen overgeslagen |
| `GET /api/v1/toezichten?van=…&tot=…` | Toezichtrooster — leesbaar voor het hele team (transparantie) |
| `GET /api/v1/toezichten/tellers` | Billijkheidstellers per persoon per soort — het antwoord op "waarom sta ik er weer op?" |
| `POST /api/v1/toezichten` · `POST …/:id/ruil` · `DELETE …/:id` | Handmatige beurt (personeelslid óf externe toezichter), ruilen en annuleren — elk met auditregel |
| `POST /api/v1/afwezigheden` | Afwezigheid handmatig melden (bron `handmatig`) — het startpunt van elke vervanging |
| `GET /api/v1/vervangingen/advies?persoonId=…&peildatum=…` | Kanaalkeuze-assistent (module P3): telt de reeks werkdagen (vakantiebrug incl.), kent platformbeschikbaarheid en contingent, en zegt wélk kanaal openstaat, waarom, en welke checks eerst moeten |
| `GET /api/v1/vervangingen/kandidaten?afwezigeId=…&datum=…` | Vervangersvoorstellen: platformlid eerst, dan billijkheid (laagste teller), navertelbaar met redenen én bezwaren |
| `POST /api/v1/vervangingen/noodscenarios` | Noodscenario's doorrekenen (klas verdelen, zorg inzetten, samenvoegen, externe invaller) — elk met nieuwe groepsgroottes en het expliciet benoemde verlies |
| `POST /api/v1/vervangingen` · `GET …?van=…&tot=…` · `POST …/:id/annuleer` | Vervanging vastleggen (reaffectatiecheck verplicht vóór een tijdelijke aanstelling; een noodmaatregel zonder benoemd verlies wordt geweigerd), overzicht, annuleren (status, nooit delete) |
| `GET/PUT /api/v1/vervangingen/contingent?schooljaar=…` | Jaarcontingent vervangingseenheden: budget (BG), verbruik berekend uit actieve vervangingen, overschrijding geweigerd |
| `GET/POST /api/v1/platformleden` | Wie in het lerarenplatform zit, per schooljaar — stuurt advies én kandidatenlijst |
| `GET/PUT /api/v1/overlegorgaan` | Het overlegorgaan van de school (comité PBW / basiscomité / HOC / vakbondsafvaardiging / personeel) mét DPIA-vink — lanceervoorwaarde voor teambevragingen (module W) |
| `POST /api/v1/bevragingen` | Bevraging aanmaken en uitsturen: `op_naam` (klasse A — feit/keuze/beschikbaarheid) of `team` (vertrouwelijk-geaggregeerd, klasse A+B). De classificatie beslist, niet de titel: een belevingsvraag op naam is een 422, klasse C bestaat niet; een teambevraging zonder opvolgpad, overlegorgaan of DPIA-vink evenmin |
| `GET /api/v1/bevragingen` · `GET …/:id` | Vraagstellerszijde: bij op naam de antwoorden en leesstatus per genodigde; bij team nooit een deelnemerslijst — alleen een responsgraad die zelf boven de drempel ligt |
| `POST /api/v1/bevragingen/:id/sluit` · `GET …/:id/rapport` | Het teamrapport bestaat pas na sluiting (geen realtime) en boven de drempel (n ≥ 5; vrije tekst n ≥ 10), met de expliciete kleine-school-modus als niets toonbaar is |
| `GET /api/v1/inbox` · `GET …/:id` · `POST …/:id/antwoorden` · `POST …/afgeleverd` | De inbox van het personeelslid, met per item "wie ziet dit"; antwoorden op naam bij op-naam-vragen, zónder persoonskoppeling en zonder auditregel bij teambevragingen; "liever niet zeggen" is een geteld antwoord. Afgeleverd/gezien/beantwoord wordt geregistreerd voor herinneringen maar alléén getoond bij op-naam-vragen |

**Authenticatie (ADR-0003):** elke route onder `/api/v1` vereist een OIDC-Bearer-token; de issuer in het token bepaalt de tenant (`core.idp_config`), en de rollen komen uit `core.roltoewijzing`. Rolchecks Fase 1: tellers en beoordelingshistoriek = het personeelslid zelf of DIR; herbereken = BG/DIR; deadline-overzicht = DIR/AD/BG; beoordeling registreren = DIR; regelparameterbeheer = BG (vier-ogen, afgedwongen tot in de databank). Zonder bekrachtigde tenantversies geldt de startset PERS/2019/03 uit het domeinpakket — de bronvermelding in elke verantwoording toont welke set gold. De API blijft niet extern ontsloten tot de pentest en de echte IdP-configuratie er zijn.

**Nachtelijke planner (ADR-0004):** de server draait elke nacht (standaard 03:30 Belgische tijd) automatisch de deadline-veegronde over alle tenants — zo klimt de escalatieladder vanzelf en verstrijken deadlines nooit stil, met het systeem (`actor_id = null`) in de audittrail. Configuratie: `HERBEREKEN_TIJDSTIP=UU:MM` en `HERBEREKEN_PLANNER=uit` om hem uit te schakelen. De veegronde is idempotent en replica-veilig (advisory lock per tenant); het handmatige herbereken-endpoint blijft bestaan als vangnet.

## Draaien

```bash
pnpm build            # bouwt ook @draagvlak/telregels (topologische volgorde)
DATABASE_URL=postgres://draagvlak_app:...@localhost:5432/draagvlak pnpm --filter @draagvlak/api start
```

Zonder `DATABASE_URL` start de app met alleen health/version.

## Tests

- Unit-tests draaien altijd: `pnpm --filter @draagvlak/api test`
- De integratiesuite (echte migraties, RLS als `draagvlak_app`, endpoint end-to-end) draait alleen met een databank:

```bash
DATABASE_ADMIN_URL=postgres://postgres@localhost:5432/draagvlak \
DATABASE_URL=postgres://draagvlak_app@localhost:5432/draagvlak \
pnpm --filter @draagvlak/api test
```

De suite bouwt het schema zelf op (drop + migraties + testdata); gebruik nooit een databank met echte gegevens.
