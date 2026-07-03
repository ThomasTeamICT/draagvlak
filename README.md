# Draagvlak

**Een HR- en schoolontwikkelingsplatform voor Vlaamse scholen.**

*De naam zegt wat het platform is: het vlak dat het schoolbeleid draagt, en het draagvlak dat beleid pas echt maakt.*

Draagvlak is een webplatform voor schoolbesturen, scholengroepen en directies in het Vlaamse leerplichtonderwijs. Het verenigt een professionele HR-laag voor onderwijzend personeel (statuutopvolging, aanvangsbegeleiding, feedback- en gesprekscyclus, waardering, professionalisering, welbevinden en desiderata) met een levend schoolontwikkelingsplan dat de visie van de school daadwerkelijk tot op de klasvloer brengt — aangevuld met een module voor het welbevinden van leerlingen en een assistieve AI-laag tegen planlast.

## Status

Dit project bevindt zich in de ontwerpfase. Het centrale document is:

**[📘 Blauwdruk versie 1.0 (werkdocument, juli 2026)](docs/blauwdruk.md)**

De blauwdruk beschrijft de probleemstelling en onderbouwing (Onderwijsspiegel 2026, TALIS, wetenschappelijke kaders), de ontwerpprincipes, de tien functionele modules, het juridische kader (AVG, AI Act, welzijns- en onderwijsregelgeving), de architectuur, de AI-laag met stoplichtmodel, en het implementatieplan in fases.

## Documentatie

| Document | Inhoud |
|---|---|
| [docs/blauwdruk.md](docs/blauwdruk.md) | De volledige blauwdruk (versie 1.0) |
| [docs/functioneel-ontwerp/](docs/functioneel-ontwerp/README.md) | Functioneel ontwerp Fase 0-1: scope en leeswijzer |
| [docs/functioneel-ontwerp/toegangsmatrix.md](docs/functioneel-ontwerp/toegangsmatrix.md) | Toegangsmatrix per rol en gegevensobject, met harde ontwerpregels |
| [docs/functioneel-ontwerp/regelparameters.md](docs/functioneel-ontwerp/regelparameters.md) | Decretale drempels en termijnen als configuratie (TADD, deadlines, telregels) |
| [docs/functioneel-ontwerp/datamodel.md](docs/functioneel-ontwerp/datamodel.md) | Conceptueel datamodel MVP met multi-tenant-scoping en audittrail |
| [docs/functioneel-ontwerp/wireframes.md](docs/functioneel-ontwerp/wireframes.md) | Low-fi wireframes van de zes kernflows, met validatievragen voor de pilootscholen |
| [docs/functioneel-ontwerp/testcases-telregels.md](docs/functioneel-ontwerp/testcases-telregels.md) | Testcasusset voor de TADD-telregels: het levende contract tussen regelgeving en code |
| [docs/dpia/dpia-aanzet.md](docs/dpia/dpia-aanzet.md) | Aanzet gegevensbeschermingseffectbeoordeling Fase 1 (personeelsluik) |
| [docs/adr/](docs/adr/README.md) | Architectuurbeslissingen (ADR-0001: stackkeuze, status "voorgesteld") |
| [prototype/](prototype/README.md) | Klikbaar validatie-prototype van de zes kernflows (één HTML-bestand, geen installatie) |

## Repostructuur (code)

```
packages/telregels   pure domeinlogica: TADD-tellers, drempeldetectie, vervolgtrajecten
                     — testcases-telregels.md als geautomatiseerde suite (⚠-casussen als todo)
apps/api             API-skelet (Fastify, modulaire monoliet)
db/                  SQL-migraties met row-level security als eerste-klas ontwerp
prototype/           wegwerp-validatieprototype (Fase 0)
```

Ontwikkelen: `pnpm install`, daarna `pnpm typecheck` en `pnpm test`. Lokale databank: zie [db/README.md](db/README.md). De stackkeuze staat gemotiveerd in [ADR-0001](docs/adr/0001-stackkeuze.md) en wacht op bekrachtiging door de stuurgroep.

## Kernprincipes (samengevat)

1. **De gouden draad** — elk object in het systeem is koppelbaar aan een strategisch doel: visie tot op de vloer wordt meetbaar.
2. **Registreer één keer, gebruik overal** — het platform neemt planlast weg, het creëert er geen.
3. **Ontwikkeling en beoordeling zijn gescheiden werelden** — waardering en welbevinden voeden nooit een evaluatiedossier.
4. **Privacy by design en by default** — dataminimalisatie, rolgebaseerde toegang, audittrail, geen geautomatiseerde besluitvorming over personen.
5. **AI assisteert, mensen beslissen** — altijd assistief, altijd met menselijke bevestiging, nooit als beoordelaar van mensen.

## Scope-afbakening

Draagvlak vervangt de schooladministratiepakketten (WISA, Informat, Broekx e.a.), de officiële zendingen naar AGODI, het CLB-dossier (LARS) en de digitale leerplatformen **niet**. Het is de ontwikkel- en beleidslaag die daarbovenop ontbreekt.

## Volgende stap

De blauwdruk valideren met een directie, de DPO en het bevoegde overlegcomité, en op basis daarvan het functioneel ontwerp van Fase 0-1 detailleren (wireframes, toegangsmatrix, DPIA-aanzet).

---

*Dit document is een functionele en technische blauwdruk met juridische duiding, geen juridisch advies.*
