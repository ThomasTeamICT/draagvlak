# Toegangsmatrix — Fase 1 (MVP)

Deze matrix legt per rol en per gegevensobject vast wie wat mag zien en doen. Ze is samen met de DPIA een **ontwerpdocument vanaf dag één** (blauwdruk § 9): de matrix wordt technisch afgedwongen via rolgebaseerde toegang én row-level security in de databank, onafhankelijk van applicatielogica.

## 1. Rollen (Fase 1)

| Code | Rol | Scope |
|---|---|---|
| BG | Beheerder scholengroep | Hele tenant (configuratie, geen inhoudelijke dossiers) |
| AD | Algemeen/coördinerend directeur | Hele tenant, inhoud geaggregeerd |
| DIR | Directeur (eerste evaluator) | Eigen school/scholen |
| TE | Tweede evaluator / bestuur | Toegewezen formele trajecten |
| BO | Beleidsondersteuner / middenkader | Eigen school, strategie en kwaliteit |
| ME | Mentor / aanvangsbegeleider | Toegewezen starters |
| PL | Leraar / personeelslid | Eigen dossier en teamcontext |
| DPO | Functionaris gegevensbescherming | Metadata, logs en workflows — geen dossierinhoud |

Rollen zijn cumuleerbaar en per school toewijsbaar (blauwdruk § 4); rechten worden per (persoon, school, rol) geëvalueerd. De rollen uit Fase 2-3 (zorgcoördinator, preventieadviseur, leerling) worden pas toegevoegd bij de uitbreiding van de matrix voor die fases.

## 2. Legenda

| Symbool | Betekenis |
|---|---|
| **B** | Beheren: aanmaken, wijzigen, archiveren (verwijderen enkel via bewaarregels) |
| **S** | Schrijven: aanmaken en wijzigen van eigen bijdragen |
| **L** | Lezen (volledige inhoud, binnen scope) |
| **LA** | Lezen, uitsluitend geaggregeerd/geanonimiseerd |
| **E** | Enkel het eigen record (lezen, en schrijven waar aangegeven) |
| — | Geen toegang; het veld verlaat de server niet (dataminimalisatie) |

## 3. Matrix per module

### Module A — Strategisch beleid

| Object | BG | AD | DIR | TE | BO | ME | PL | DPO |
|---|---|---|---|---|---|---|---|---|
| Doelenboom (visie, doelen, jaardoelen) | B¹ | L | B | — | B | L | L | — |
| Acties/projecten | — | L | B | — | B | S² | S² | — |
| Indicatoren & meetwaarden | — | LA | B | — | B | L | L | — |
| Kwaliteitskalender & evaluaties (keep-stop-change-start) | — | L | B | — | B | — | L | — |
| Overleg-logboek (instemmingsrondes) | L | L | B | — | S | — | L | — |
| Groepscockpit (vergelijking scholen) | LA | LA | LA³ | — | — | — | — | — |

¹ BG beheert sjabloondoelen en groepsprioriteiten, geen schoolspecifieke inhoud.
² Personeelsleden en mentoren kunnen bijdragen (status, verslag) op acties waarvan zij eigenaar of deelnemer zijn.
³ Enkel de eigen school herkenbaar; andere scholen als mediaan + spreiding (blauwdruk § 5.11).

### Module B — Personeelsdossier

| Object | BG | AD | DIR | TE | BO | ME | PL | DPO |
|---|---|---|---|---|---|---|---|---|
| Identiteit & organisatie (sync uit IdP) | B⁴ | L | L | — | — | — | E | — |
| Ambten & bekwaamheidsbewijzen | — | LA | B | — | — | — | E | — |
| Statuut & tellers (TADD-prognose) | — | LA | L | — | — | — | E | — |
| Afwezigheden (leesweergave uit administratiepakket) | — | — | L | — | — | — | E | — |
| Documentenkluis (functiebeschrijving, overeenkomsten, verslagen) | — | — | B⁵ | L⁶ | — | — | E | — |
| Deadline-overzicht | — | LA | L | — | — | — | E⁷ | — |
| HR-cockpit (statuutverdeling, piramides, verloop) | — | LA | LA | — | — | — | — | — |

⁴ Beheer van de synchronisatie (SCIM-koppeling), geen handmatige inhoudelijke wijziging van dossiers.
⁵ Per documenttype; formele evaluatiedocumenten volgen de strengere regels van module E-spoor 2.
⁶ Uitsluitend documenten binnen formele trajecten waarvoor TE is aangeduid.
⁷ Eigen deadlines (bv. "kandidaatstelling TADD vóór 15 juni").

### Module C — Opdrachten & desiderata

| Object | BG | AD | DIR | TE | BO | ME | PL | DPO |
|---|---|---|---|---|---|---|---|---|
| Desiderata | — | — | L | — | — | — | E (S) | — |
| Opdrachtscenario's (concept, vóór publicatie) | — | — | B | — | — | — | — | — |
| Gepubliceerde opdracht | — | LA | B | — | — | — | E⁸ | — |
| Taakregister schoolgebonden opdrachten | — | LA | B | — | L | — | L⁹ | — |
| Billijkheidsmonitor (desiderata vs. toekenning) | — | LA | L | — | — | — | E | — |

⁸ Met leesbevestiging; vanaf de eigen opdracht kan het personeelslid een gesprek aanvragen (module E).
⁹ Teamleden zien de verdeling van schoolgebonden taken binnen het eigen team (transparantie is hier het doel); individuele desiderata van collega's blijven onzichtbaar.

### Module D — Aanvangsbegeleiding & beoordeling

| Object | BG | AD | DIR | TE | BO | ME | PL (starter) | DPO |
|---|---|---|---|---|---|---|---|---|
| Overeenkomst aanvangsbegeleiding | — | — | B | — | — | L | E (bevestigen) | — |
| Logboek & klasbezoeken (coaching) | — | — | L¹⁰ | — | — | S | E (S) | — |
| Reflecties van de starter | — | — | —¹¹ | — | — | L¹¹ | E (S) | — |
| Beoordelingsverslag (positief / werkpunten / negatief) | — | — | B | L¹² | — | — | E | — |
| Vervolgtraject na werkpunten | — | — | B | L¹² | — | L | E | — |
| Verhaal/bezwaar bij het bestuur | — | — | L | B | — | — | E (S) | — |
| Startersdashboard (trajecten, mentorbelasting, "stille starters") | — | LA | L | — | — | L¹³ | — | — |

¹⁰ De eerste evaluator leest het logboek (het voedt de decretale beoordeling), maar schrijft er niet in: coaching is van mentor en starter.
¹¹ Persoonlijke reflecties zijn standaard enkel zichtbaar voor de starter; de starter kiest per reflectie of de mentor meeleest. **⚠ TE VALIDEREN** met pilootscholen.
¹² Leesrecht als procesbewaker; geen inhoudelijke wijziging (blauwdruk § 5.5).
¹³ Enkel de eigen toegewezen starters.

**Harde scheiding coaching ↔ beoordeling:** de mentor heeft géén toegang tot het beoordelingsverslag en wordt in het platform nergens om een oordeel gevraagd. De beoordeling is exclusief van de eerste evaluator.

### Module E — spoor 1: gesprekkencyclus

| Object | BG | AD | DIR | TE | BO | ME | PL | DPO |
|---|---|---|---|---|---|---|---|---|
| Gespreksplanning | — | — | B | — | — | — | E | — |
| Gespreksverslag (informeel functioneringsgesprek) | — | — | B¹⁴ | — | — | — | E (mede-ondertekenen) | — |
| Gesprek-aanvraag (decretaal recht) | — | — | L (behandelen) | — | — | — | E (S) | — |
| Functiebeschrijvingen (sjablonen per ambt) | B | L | B | — | — | — | — | — |
| Functiebeschrijving (geïndividualiseerd) | — | — | B | — | — | — | E (ondertekenen) | — |
| Dekkingsmonitor ("wie had twee jaar geen gesprek?") | — | LA | L | — | — | — | — | — |

¹⁴ Het verslag wordt pas definitief na kennisname door het personeelslid; beide partijen kunnen een eigen aanvulling toevoegen die onlosmakelijk bij het verslag hoort.

### Module E — spoor 2: formeel traject *(Fase 2, nu al in het ontwerp wegens de harde scheiding)*

| Object | BG | AD | DIR (1e evaluator) | TE (2e evaluator) | BO | ME | PL (betrokkene) | DPO |
|---|---|---|---|---|---|---|---|---|
| Formeel dossier (verslag, doelstellingen, 120-dagenteller, evaluatie) | — | — | B | L | — | — | E | — |
| Evaluatorenregister & opleidingsstatus | B | LA | E | E | — | — | L¹⁵ | — |
| Audittrail formele documenten | — | — | L (eigen handelingen) | L | — | — | E | L |

¹⁵ Elk personeelslid ziet wie zijn eerste en tweede evaluator is.

### Systeemobjecten

| Object | BG | AD | DIR | TE | BO | ME | PL | DPO |
|---|---|---|---|---|---|---|---|---|
| Tenant-/schoolconfiguratie, rolmapping | B | L | L | — | — | — | — | L |
| Regelparameters (zie regelparameters.md) | B¹⁶ | L | L | — | — | — | — | — |
| Audittrail (leessporen gevoelige dossiers) | — | — | — | — | — | — | E¹⁷ | L |
| Verwerkingsregister-export, inzage-/verwijderworkflows | — | — | — | — | — | — | E (aanvragen) | B |
| Bewaarregels & vernietigingslog | L | — | — | — | — | — | — | B |

¹⁶ Wijziging van decretale parameters vereist vier-ogen-bevestiging en wordt gelogd met bronvermelding.
¹⁷ Ieder personeelslid kan zien wíé zijn dossier raadpleegde (transparantie als controlemechanisme). **⚠ TE VALIDEREN** met DPO en sociaal overleg.

## 4. Harde ontwerpregels (gelden boven de matrix)

1. **Ontwikkeling ≠ beoordeling.** Objecten uit het ontwikkelspoor (logboek-coaching, reflecties, later portfolio/kudos/welbevinden) kunnen technisch niet gekoppeld, gekopieerd of geëxporteerd worden naar een formeel evaluatiedossier. Geen uitzonderingen, ook niet voor beheerders.
2. **Beleidsondersteuners hebben nooit toegang tot personeelsdossiers** (blauwdruk § 4), ook niet leesrechten via rapportages: hun cockpits tonen uitsluitend geaggregeerde HR-cijfers zonder herleidbaarheid.
3. **Geaggregeerd is pas geaggregeerd vanaf n ≥ 5.** Elke geaggregeerde weergave (LA) onderdrukt cellen met minder dan vijf personen. Dit geldt vanaf Fase 1 (bv. HR-cockpit per klein team), niet pas bij de welbevindenmodules.
4. **Alles wat gevoelig is, is gelogd.** Elke lees- en schrijfhandeling op documentenkluis, trajectdossiers, gespreksverslagen en formele dossiers komt in een onveranderbare audittrail.
5. **Scope is afdwingbaar op rijniveau.** Elke query draagt tenant- en school-scope; groepsrollen (BG, AD) bereiken onderliggende records nooit rechtstreeks, enkel via geaggregeerde views.
6. **De tweede evaluator kan niets wijzigen.** Leesrecht en procesannotaties, geen inhoudelijke bewerking van verslagen of beslissingen.
7. **DPO ziet processen, geen inhoud.** Inzage in dossierinhoud verloopt ook voor de DPO via de formele inzageworkflow, met logging.
8. **Rechten vervallen mee met de rol.** Einde aanstelling of rolwijziging (sync uit het IdP) beëindigt de toegang onmiddellijk; historische handelingen blijven in de audittrail staan.

## 5. Openstaande beslispunten

- **⚠ TE VALIDEREN:** zichtbaarheid van starterreflecties voor de mentor (opt-in per reflectie of standaard gedeeld?).
- **⚠ TE VALIDEREN:** kan het personeelslid de leessporen op zijn eigen dossier rechtstreeks inzien, of enkel op aanvraag via de DPO?
- **⚠ TE VALIDEREN:** leesrecht van AD op individuele statuuttellers bij scholengroepbrede benoemingsrondes — nu bewust op LA gezet; het alternatief (L met doelbinding en logging) aftoetsen met DPO en sociaal overleg.
- **⚠ TE VALIDEREN:** behandeltermijn van een gesprek-aanvraag (voorstel: bevestiging binnen 10 werkdagen, gesprek binnen 30 kalenderdagen) — af te spreken in het lokaal comité.
