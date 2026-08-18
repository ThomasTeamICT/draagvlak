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
