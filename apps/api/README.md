# @draagvlak/api

Modulaire monoliet (Fastify) — zie [ADR-0001](../../docs/adr/0001-stackkeuze.md) en [ADR-0002](../../docs/adr/0002-datatoegang.md).

## Endpoints

| Endpoint | Wat |
|---|---|
| `GET /health`, `GET /version` | Liveness en identificatie |
| `GET /api/v1/personen/:persoonId/tellers?peildatum=JJJJ-MM-DD` | Dienstanciënniteitstellers per ambt, met drempelevaluatie (TADD-deadlines) en volledige verantwoording. Zonder `peildatum`: prognose op 30 juni van het lopende schooljaar |
| `POST /api/v1/deadlines/herbereken` | Deadline-engine: idempotente drempeldetectie over alle personen van de tenant; maakt deadlines aan, actualiseert escalatieniveaus en trekt vervallen signalen in (status, nooit delete). Body optioneel `{ "vandaag": "JJJJ-MM-DD" }` voor reproduceerbare escalatie |
| `GET /api/v1/deadlines?status=open` | Werkvoorraad voor startscherm en startersdashboard: deadlines met naam, type, datum, escalatieniveau en de berekening erachter |

**⚠ Tijdelijk, tot de OIDC-authenticatielaag er is:** de tenant-context komt uit de header `x-tenant-id`. De API is daarom uitsluitend voor lokale ontwikkeling en CI en wordt niet extern ontsloten (ADR-0002).

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
