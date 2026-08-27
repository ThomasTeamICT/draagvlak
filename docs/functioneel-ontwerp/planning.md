# Planning — functioneel ontwerp module-familie P

> **Status: ontwerp op basis van marktonderzoek en regelgevingsonderzoek (augustus 2026).**
> De regelgevingsdetails zijn onderzocht via secundaire bronnen mét bronvermelding, maar de
> primaire teksten (Edulex) konden vanuit de onderzoeksomgeving niet integraal geverifieerd
> worden — elke regelparameter hieronder draagt daarom hetzelfde ⚠ TE VALIDEREN-regime als de
> telregels: vóór livegang aftoetsen met een personeelsdienst tegen de geldende omzendbrieftekst.

## 1. Doel en positionering

Gerichte planningssoftware voor **lagere én secundaire scholen** in Vlaanderen: flexibel,
met opties en radicaal transparant — het managen van de schoolplanning zo makkelijk mogelijk
maken. Geen vervanging van de administratieve kernpakketten, wel de intelligente laag erboven.

Het marktonderzoek valideert dat model letterlijk: Informat, WISA/Wis@d, Broekx, Smartschool
en DKO3 zijn de AGODI-erkende systemen gekoppeld aan Discimus (zwaar gereguleerd
overheidsterrein — buiten scope), en er floreert al een ecosysteem van bolt-on-tools
(TBVS Toolbox, Gimme, ParentCom) dat via synchronisatie naast die kernpakketten werkt.
Sterkste bewijs van de vraag: Stedelijk Onderwijs Antwerpen liet extern een "Intelligent
Assisted Planning Platform" bouwen (Ballistix, 2 Feweb-awards) **omdat** Wis@d enkel
registratie achteraf kan — geen slimme planning.

## 2. Wat het onderzoek leert

**De markt (Untis, aSc, FET, TimeTabler, Edval, Prime Timetable, Smartschool Planner):**

1. **Table stakes** die elk gevestigd pakket heeft: constraint-gebaseerde generatie met
   instelbare gewichten, handmatig verfijnen met realtime conflictdetectie, lokalenbeheer,
   een aparte dagrooster-/vervangingslaag bovenop het masterrooster, publicatie naar
   web/app, en import/export naar het schoolecosysteem.
2. **De dagelijkse pijn wint van de jaarpuzzel**: Untis' Dagroosterbeheer (vervangingen) is
   naar eigen zeggen wereldwijd hun meest gebruikte module. In Vlaanderen versterkt het
   lerarentekort dit ("dagelijks puzzelen, invullen, zoeken" — GO!-directies; zelfs
   geschrapte examens).
3. **Het gat is UX + transparantie**: marktleiders vergen betaalde meerdaagse cursussen
   (Untis), hebben verouderde single-user-Windows-UI's (aSc, TimeTabler, Edval-core) of
   ruwe interfaces (FET); niemand publiceert prijzen; en géén pakket legt een leraar uit
   *waarom* zijn rooster is zoals het is.
4. **Smartschool is publicatielaag, geen generator** (90% marktaandeel secundair; de
   Untis→Smartschool-koppeling is volautomatisch). Integratie is een adoptievoorwaarde,
   concurrentie op dat vlak zinloos.
5. **Het basisonderwijs is onbediend**: geen enkele roostertool mikt erop; de praktijk is
   Excel en papier. Alleen TBVS biedt een rudimentair toezicht-prikbord en
   vervangingslijsten. In Nederland bestaat de categorie wél (Quebble, Solvidi,
   JaartaakPlanner) — bewijs dat het product bestaansrecht heeft.
6. **Niemand verbindt rooster met personeelsbeleid**: opdrachtbreuken met verschillende
   noemers, plage-uren, bekwaamheidsbewijzen, het pakket uren-leraar als budget — dat is
   exact waar Draagvlak als personeelsplatform al staat. Dit is de gracht.

**De Vlaamse context die het ontwerp stuurt:**

- **Lager ≠ secundair.** Het lager heeft geen roosterengine nodig: het klastitularis-model
  maakt het weekrooster quasi statisch (28-29 lestijden, woensdagnamiddag vrij). Wat er wél
  gepland moet worden zijn de uitzonderingslagen: levensbeschouwelijke vakken (parallel,
  externe leermeesters op 2-3 scholen), LO/zwemmen (zwembadtijdslot + bus als extern anker),
  zorg/SES-uren (versnipperd, sneuvelen als eerste bij vervanging), kinderverzorging,
  toezichten en vervangingen.
- **Toezichten hebben juridische lagen**: kwartier vóór/na de lessen en speeltijden =
  schoolopdracht (max. 26 klokuren); middagtoezicht valt er wettelijk búíten (aparte
  personen, aparte vergoeding, ook niet-personeelsleden) — omzendbrief BaO/97/8 en
  JUR1/11/AVW (⚠).
- **Vervangingen kennen een regelmachine**: de 10-werkdagenregel (met reaffectatiecheck
  vanaf de drempel), vervangingseenheden voor korte afwezigheden, het lerarenplatform
  (Bao/2018/01), versoepelingen die het aantal beslissingen verhogen — plus noodscenario's
  zonder vervanger (klas verdelen, zorgleerkracht inzetten) die nu nergens gelogd worden.
- **Het regelboek wijzigt per schooljaar**: vanaf 1/9/2026 verdwijnen de facultatieve
  verlofdagen (basis én secundair), gelden max. 3 halve pedagogische studiedagen (basis) en
  komt er een opvangplicht; de LBV-parallel- en weekverplichting wordt losgelaten
  (bundeling mogelijk). Hardgecodeerde regels verouderen binnen het jaar → geparametriseerde
  regels met ingangsdatum, zoals de telregels (⚠ alle waarden).
- **Transparantie is wettelijk verankerd**: criteria voor de aanwending van lestijden,
  uren en punten moeten via schoolraad/LOC; het individuele wekelijkse dienstrooster is
  bijlage bij het arbeidsreglement. Een tool die verdeling (toezichtbeurten, springuren,
  plage) telbaar en zichtbaar maakt, ondersteunt die inspraak rechtstreeks — dat is
  letterlijk de merkbelofte van Draagvlak. 83% van de onderwijsprofessionals klaagt over
  planlast (Onderwijsinspectie 2024); de Onderwijsspiegel 2026 beveelt planlastreductie aan.

## 3. Ontwerpprincipes

1. **Dagelijkse pijn eerst**: toezichten en vervangingen vóór de jaarlijkse roosterpuzzel.
2. **Kalender + uitzonderingen** voor het lager; een masterrooster is daar overkill.
3. **Masterrooster ≠ dagrooster**: het masterrooster is het plan, het dagrooster de
   werkelijkheid van vandaag (les Edval Daily/Untis) — aparte lagen, apart bewerkbaar.
4. **Uitlegbaarheid als eerste-klas-functie**: elk rooster, elke beurt en elke vervanging
   kan tonen wáárom ("jij staat dinsdag omdat…: beurtteller, beschikbaarheid, regel X").
   Billijkheidstellers zijn zichtbaar voor het hele team.
5. **Regelboek per schooljaar**: alle regelgevingsparameters met ingangsdatum en
   bronvermelding, beheerd met het vier-ogen-principe (patroon van de regelparameters).
6. **Integratie-eerst**: Smartschool Planner-export (XML), Untis-import, Informat/WISA-sync
   volgens het bewezen bolt-on-model; nooit een eigen leerlingenadministratie.
7. **Transparante prijs** (in tegenstelling tot de offertecultuur van de markt) en cloud,
   multi-user, zonder cursusverplichting.

## 4. Modules, gefaseerd

| # | Module | Voor | Kern |
|---|---|---|---|
| P1 | **Schoolkalender** | lager + secundair | Schooljaarstructuur: vakanties, facultatieve verlofdagen (t/m 2025-2026), pedagogische studiedagen, lesvrije dagen mét opvangaanduiding; validatie tegen het regelboek van dát schooljaar; externe ankers (zwemslots) volgen in P4. **Fundament onder alles — en deblokkeert testcase B2 van de TADD-teller (vakantiekalender als invoer).** |
| P2 | **Toezichten & beurtrollen** | vooral lager | Toezichtsoorten (ochtend/speeltijd/middag/refter/avond) met juridische categorie (schoolopdracht vs. apart vergoed vs. externe toezichter), beurtrolgenerator met zichtbare billijkheidstellers, ruilen met één klik. Vervangt het Excel/prikbord-model van vandaag. |
| P3 | **Vervangingen & dagrooster** | lager + secundair | Afwezigheid → kanaalkeuze-assistent (10-werkdagenteller met reaffectatietrigger, vervangingseenheden-contingent, lerarenplatform), vervangingsvoorstellen op beschikbaarheid + billijkheid, noodscenario's (klas verdelen, zorguren opofferen) expliciet gelogd, notificaties. Sluit aan op de bestaande afwezigheden in Draagvlak. |
| P4 | **Weekrooster lager** | lager | Kalender + uitzonderingslagen: LBV-blokken (parallel én gebundeld, per schooljaar), zwemmomenten (tijdslot + bus + beurtrol per klas), zorg/SES-toewijzingen, kinderverzorging, cross-school-beschikbaarheid van leermeesters — de laag die Excel nooit kan bieden. |
| P5 | **Masterrooster secundair** | secundair | Lessentabellen per richting als importeerbare koepel-templates; handmatig roosteren met realtime conflictdetectie éérst; gekoppeld aan opdrachtbreuken (22-23/21-22/29-30, ⚠), plage-bewaking en bekwaamheidsbewijzen-validatie — de combinatie die niemand heeft. Automatische generatie is een latere, aparte fase (bewuste volgorde: eerst het datamodel en de conflictdetectie bewijzen). |
| P6 | **Roosters rond het rooster** | secundair (+ lager licht) | Examenroosters (opsteller ≠ toezichter; Vlaamse toetsen-halve dagen), klassenraadplanning (voltalligheid; leraren op meerdere scholen), oudercontact-tijdsloten (of Smartschool Contactmomenten-integratie). |
| P∫ | **Integraties** | doorlopend | Smartschool Planner XML-export (P4/P5-voorwaarde), Untis-import (adoptiepad voor secundair), Informat/WISA-sync voor personen/afwezigheden, iCal-feeds. |

### Testcontract P3 (vervangingen) — casussen V1 t/m V8

Vastgelegd in `packages/planregels/test/vervangingsregels.test.ts` en
`vervanger.test.ts`, zelfde regime als de telregel-testcases (⚠ alle drempels
te valideren met een personeelsdienst tegen de primaire teksten):

| # | Casus | Verwacht |
|---|---|---|
| V1 | Eén aaneengesloten ziekte van 10 werkdagen | één reeks, drempel bereikt |
| V2 | Ziek ma–wo, donderdag aanwezig, weer ziek | één dag aanwezigheid knipt de reeks níét (venster 1 werkdag); effectieve werkdagen tellen, de aanwezige dag niet |
| V3 | Een week aanwezig tussen twee ziekteperiodes | twee aparte reeksen |
| V4 | Ziek de week vóór én na de herfstvakantie | vakantiedagen zijn geen werkdagen → één reeks van 10; de "vakantiebrug" haalt de drempel (V7) |
| V5 | Korte ziekte (3 dagen), contingent beschikbaar | vervangingseenheden aanbevolen, verbruik expliciet; contingent op → intern mét verplichte noodmaatregel-log (V5b) |
| V6 | Drempel bereikt | tijdelijke aanstelling mogelijk, reaffectatiecheck verplicht vóór aanstelling; platformlid vrij → platform gaat voor en de check vervalt (V6b) |
| V8 | Secundair 2025-2026 | geen platform, geen eenheden — het regelboek verschilt per niveau én per schooljaar |

Vervangersvoorstellen: platformlid > billijkheid (laagste teller) > vrije
ruimte; onbevoegd of onbeschikbaar zakt onder de streep mét reden; een
zorgleerkracht draagt haar prijs ("N zorguren vallen weg") als bezwaar mee.
Noodscenario's (klas verdelen, zorg inzetten, samenvoegen, externe invaller)
berekenen de nieuwe groepsgroottes tegen de eigen maximumgrens en benoemen
elk hun verlies — dat verlies hoort in de audittrail, anders bestaat het niet.

**Volgorde**: P1 → P2 → P3 vormen samen het "lager eerst"-product (onbediende markt, sluit
naadloos aan op wat Draagvlak al heeft: personen, aanstellingen, afwezigheden, RLS, audit).
P4 verdiept het lager; P5/P6 openen het secundair. Elke module krijgt een testcontract met
gedocumenteerde casussen, zoals testcases-telregels.md.

## 5. Wat bewust níét (scope)

- Geen leerlingenadministratie, geen Discimus-koppeling, geen puntenboek, geen
  loonverwerking — dat is het terrein van de AGODI-erkende pakketten (wij synchroniseren).
- Geen automatische roostergenerator vóór het handmatige spoor met conflictdetectie bewezen
  is (de generator is bij alle concurrenten de bron van de black-box-frustratie).
- Geen eigen oudercommunicatiekanaal (Smartschool/Gimme-territorium); wel tijdslotbeheer.

## 6. Beslispunten voor validatie (sessies + stuurgroep)

1. Alle regelgevingsparameters in § 2 en het regelboek van P1 (⚠ — tegen Edulex, met
   personeelsdienst).
2. Billijkheid: toont de tool alleen tellers (transparantie) of verdeelt hij ook
   automatisch (met menselijke override)? Voorstel: suggestie + zichtbare teller, mens
   beslist — consistent met het AVG/AI-Act-principe "nooit geautomatiseerde besluitvorming".
3. Prijsmodel: publiek, per school of per personeelslid, aparte instap voor het lager.
4. Voor welke doelgroep opent de pilot: het lager (geen concurrentie, grootste gat) is het
   voorstel.

## 7. Belangrijkste bronnen (selectie)

- Untis product- en modulepagina's (untis.be/untis.at); helpdesk.untis.nl (Dagroosterbeheer)
- aSc Timetables, FET (timetabling.de), TimeTabler, Edval (Tes), Prime Timetable
- Smartschool: Planner, Contactmomenten (april 2025), Untis-koppeling
- TBVS Toolbox (toezichten/vervangingslijsten), Ballistix × Stedelijk Onderwijs Antwerpen
- Omzendbrieven (⚠ te verifiëren op Edulex): BaO/2020/03, SO 74, BaO/97/8, PERS/2005/21,
  PERS/2011/04, Bao/2018/01, SO/2018/01, BaO/2001/13, JUR1/11/AVW; reaffectatiebesluit
  29/4/1992; hervormingen per 1/9/2026 (kalender + LBV, beslissingen Vlaamse Regering
  30/1/2026 en min. Demir dec. 2025)
- Onderwijsinspectie planlastbevraging (2024), Onderwijsspiegel 2026, VDAB-vacaturecijfers
