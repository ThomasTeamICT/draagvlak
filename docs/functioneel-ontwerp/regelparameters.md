# Regelparameters — decretale drempels en termijnen als configuratie

Ontwerpprincipe 7 van de blauwdruk: **regelgeving als configuratie**. Decretale parameters zijn geen hardcode maar instelbare regels met ingangsdatum, zodat het platform wijzigende regelgeving volgt zonder herbouw. Dit document definieert het regelmodel en de startset parameters voor Fase 1.

> **Let op:** de waarden hieronder zijn overgenomen uit de blauwdruk (gebaseerd op PERS/2019/03 en PERS/2007/09 zoals gekend bij redactie) en moeten vóór livegang gecontroleerd worden tegen de dan geldende versie van de omzendbrieven op Edulex. De jaarlijkse regelgevingsreview (blauwdruk § 13) is een beheerd proces met een eigenaar.

## 1. Regelmodel

Elke parameter is een record met:

| Veld | Betekenis |
|---|---|
| `code` | Stabiele sleutel waarnaar de applicatie verwijst |
| `waarde` | Getal, datum (dag/maand), duur of boolean |
| `eenheid` | kalenderdagen, effectieve dagen, jaren, datum, … |
| `geldig_vanaf` / `geldig_tot` | Ingangsdatum en (optioneel) einddatum; opeenvolgende versies vormen de historiek |
| `bron` | Regelgevende bron met artikel/paragraaf (Edulex-verwijzing) |
| `niveau` | Toepassingsgebied: alle niveaus, basisonderwijs, secundair, … |
| `tenant_override` | Of een scholengroep de waarde strenger mag configureren (nooit soepeler dan het decretale minimum) |

Tellers en deadlines worden altijd berekend met de parameterversie die gold **op het moment van de te beoordelen periode**, niet met de actuele versie. Wijziging van een parameter vereist vier-ogen-bevestiging door de beheerder en wordt gelogd met bronvermelding (zie toegangsmatrix, systeemobjecten).

## 2. Startset Fase 1

### TADD en dienstanciënniteit (module B en D — bron: PERS/2019/03)

| Code | Omschrijving | Waarde | Eenheid |
|---|---|---|---|
| `TADD_ANC_TOTAAL` | Vereiste dienstanciënniteit voor het recht op TADD | 290 | kalenderdagen |
| `TADD_ANC_EFFECTIEF` | Waarvan effectief gepresteerd | 200 | effectieve dagen |
| `TADD_KANDIDAAT_DEADLINE` | Uiterste datum kandidaatstelling TADD | 15 juni | datum (jaarlijks) |
| `BEOORDELING_DEADLINE` | Uiterste datum beoordeling door eerste evaluator | 30 juni | datum (jaarlijks) |
| `ANC_MAX_PER_SCHOOLJAAR` | Maximaal aanrekenbare dienstanciënniteit per schooljaar | 360 | kalenderdagen |
| `WERKPUNTEN_EXTRA_EFFECTIEF` | Bijkomend te presteren na beoordeling met werkpunten | 200 | effectieve dagen |
| `WERKPUNTEN_MAX_PER_AMBT` | Aantal keren dat een beoordeling met werkpunten mogelijk is | 1 | per ambt |

### Telregels dienstanciënniteit (module B — deterministische rekenregels, geen ML)

| Code | Regel | Waarde |
|---|---|---|
| `TELREGEL_WEEKEND` | Weekends binnen een aanstellingsperiode tellen mee | ja |
| `TELREGEL_KORTE_VAKANTIE` | Korte vakanties binnen een aanstellingsperiode tellen mee | ja |
| `TELREGEL_ZOMERVAKANTIE` | Zomervakantie telt mee | nee (in regel) |
| `TELREGEL_AFWEZIGHEID_EFFECTIEF` | Afwezigheden tellen mee als "effectief gepresteerd" | nee |

**⚠ TE VALIDEREN:** de exacte uitzonderingsgevallen op `TELREGEL_ZOMERVAKANTIE` (o.a. aanstellingen over de zomer heen) en de lijst afwezigheidscodes die wél als effectief gelden (bv. bepaalde vormen van verlof) worden in Fase 0 samen met een personeelsdienst uitgewerkt tegen de omzendbrieftekst. Dit is de meest foutgevoelige rekenlogica van het platform en krijgt een eigen testset met gedocumenteerde casussen.

### Functionering en evaluatie (module E — bron: PERS/2007/09, regime sinds 1/9/2021)

| Code | Omschrijving | Waarde | Eenheid |
|---|---|---|---|
| `FORMEEL_BEGELEIDING_MIN` | Minimale duur begeleidingstraject na formeel functioneringsgesprek | 120 | effectieve dagen |
| `EVALUATOR_OPLEIDING_TERMIJN` | Termijn waarbinnen de evaluatorenopleiding met succes afgerond moet zijn | 2 | jaar na aanduiding |
| `EVALUATOR_BLOKKERING` | Formele stappen geblokkeerd voor evaluator zonder geldige opleiding | ja | — |
| `PERIODIEKE_EVALUATIE_VERPLICHT` | Vierjaarlijkse evaluatieplicht (afgeschaft sinds 1/9/2021) | nee | — |

### Platformtermijnen (lokaal af te spreken — geen decretale basis, wel sociaal overleg)

| Code | Omschrijving | Voorstel | Status |
|---|---|---|---|
| `GESPREK_AANVRAAG_BEVESTIGING` | Bevestiging van een gesprek-aanvraag | 10 werkdagen | ⚠ TE VALIDEREN in lokaal comité |
| `GESPREK_AANVRAAG_BEHANDELING` | Gesprek vindt plaats binnen | 30 kalenderdagen | ⚠ TE VALIDEREN in lokaal comité |
| `STARTER_MIN_FEEDBACKMOMENTEN` | Minimum feedbackmomenten vóór een TADD-beoordeling | 3 | ⚠ TE VALIDEREN, configureerbaar per school |
| `STILLE_STARTER_SIGNAAL` | Signaal bij traject zonder activiteit gedurende | 30 kalenderdagen | voorstel |
| `DEKKING_GESPREK_NORM` | Norm dekkingsmonitor: elk personeelslid een gesprek binnen | 2 jaar | voorstel (spiegelt succesindicator § 14) |

## 3. Deadline-engine

De deadline-engine leidt uit de parameters en de aanstellingsdata per personeelslid concrete, rolgerichte herinneringen af:

1. **Prognose:** bij elke wijziging van aanstellings- of afwezigheidsdata herrekent een achtergrondjob de tellers en projecteert ze naar 30 juni ("op 30 juni bereikt X 297 dagen waarvan 214 effectief").
2. **Drempeldetectie:** personeelsleden die de TADD-drempel dit schooljaar bereiken, verschijnen automatisch op het startersdashboard van de eerste evaluator, met de resterende verplichte tussenstappen.
3. **Escalatieladder:** herinnering aan de eigenaar → herhaling → signaal aan de directeur → signaal aan AD/bestuur naarmate een harde deadline (15 juni, 30 juni) nadert zonder registratie. Deadlines kunnen nooit stil verstrijken.
4. **Uitlegbaarheid:** elke teller en elke herinnering toont zijn berekening (periodes, telregels, gebruikte parameterversie én bron), zodat een personeelslid of personeelsdienst het resultaat kan controleren. Dit is de RAG-loze, 100% regelgebaseerde kern (blauwdruk § 10.1).
