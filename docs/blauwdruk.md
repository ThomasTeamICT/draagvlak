# DRAAGVLAK
## Blauwdruk voor een HR- en schoolontwikkelingsplatform voor Vlaamse scholen

**Versie 1.0 — werkdocument | Juli 2026**

*De naam zegt wat het platform is: het vlak dat het schoolbeleid draagt, en het draagvlak dat beleid pas echt maakt.*

*Dit document is een functionele en technische blauwdruk met juridische duiding. Het is geen juridisch advies: betrek voor de realisatie steeds de functionaris voor gegevensbescherming (DPO), de juridische dienst van het bestuur en het bevoegde lokaal overlegcomité.*

---

## 1. Samenvatting

Draagvlak is een webplatform voor schoolbesturen, scholengroepen en directies in het Vlaamse leerplichtonderwijs. Het verenigt twee dingen die vandaag versnipperd of afwezig zijn: een professionele HR-laag voor onderwijzend personeel (statuutopvolging, aanvangsbegeleiding, feedback- en gesprekscyclus, waardering, professionalisering, welbevinden en desiderata) en een levend schoolontwikkelingsplan dat de visie van de school daadwerkelijk tot op de klasvloer brengt.

Het platform is een rechtstreeks antwoord op de kernvaststelling van de Onderwijsspiegel 2026: scholen hebben doorgaans wél een visie, maar bij twee derde van de scholen raakt die onvoldoende tot op de klasvloer, ontbreekt de vertaling naar strategisch beleid met meetbare doelen, sluit professionalisering niet aan bij die doelen en krijgen ervaren leraren nauwelijks structurele feedback op hun pedagogisch-didactisch handelen. Draagvlak maakt van die diagnose een productarchitectuur: élk object in het systeem — een navorming, een klasbezoek, een leergemeenschap, een welbevindenmeting, een gesprek — is koppelbaar aan een strategisch doel, waardoor de rode draad van visie tot vloer zichtbaar, meetbaar en bespreekbaar wordt.

Daarnaast bevat Draagvlak een module voor het systematisch opvolgen van het welbevinden van leerlingen, geïnspireerd op PXL Appwel maar bewust eenvoudiger: geen aparte app-installatie maar toegang via de bestaande schoolaccounts (single sign-on), kortere metingen, en een rechtstreekse koppeling met het leerlingbegeleidingsdossier en het schoolbeleid.

Dwars door alle modules loopt een assistieve AI-laag die administratieve taken verlicht — verslagen structureren, regelgeving opzoeken mét bronvermelding, syntheses voorbereiden — onder één strikt principe: AI assisteert, mensen beslissen (§ 10).

De scope is bewust afgebakend: Draagvlak vervangt de schooladministratiepakketten (WISA, Informat, Broekx e.a.) en de officiële personeels- en leerlingenzendingen naar AGODI **niet**. Het is de ontwikkel- en beleidslaag die daarbovenop ontbreekt.

---

## 2. Probleemstelling en onderbouwing

### 2.1 De Onderwijsspiegel 2026 als vertrekpunt

Het jaarverslag van de Vlaamse onderwijsinspectie over het schooljaar 2024-2025 (Onderwijsspiegel 2026) schetst een scherp beeld. Achttien procent van de doorgelichte scholen kreeg een ongunstig advies; in het secundair onderwijs loopt dat op tot bijna één op vier. Slechts 37% van de doorgelichte scholen voldoet zonder voorwaarden aan alle verwachtingen van het referentiekader voor onderwijskwaliteit (ROK), opvallend minder dan het jaar voordien.

De inspectie benoemt daarbij een keten van hardnekkige knelpunten die exact het werkterrein van dit platform vormen:

1. **Visie zonder doorwerking.** Veel scholen hebben een sterk organisatiebeleid en een heldere, gedragen visie, maar bij ongeveer twee derde van de scholen raakt die visie onvoldoende tot op de klasvloer. Het ontbreekt aan doelgerichte maatregelen en afspraken.
2. **Geen strategisch beleid met meetbare doelen.** Scholen vertalen hun visie onvoldoende naar een strategisch beleid met duidelijke, meetbare doelen, en evalueren hun kwaliteit onvoldoende cyclisch, systematisch en betrouwbaar.
3. **Professionalisering los van strategie.** De professionalisering sluit niet altijd aan bij de strategische doelen; schoolafspraken focussen vaker op praktische dan op onderwijskundige aspecten.
4. **Feedbackarmoede bij ervaren leraren.** Professionalisering krijgt voor starters vorm via aanvangsbegeleiding, maar meer ervaren leraren ontvangen weinig structurele feedback op hun pedagogisch-didactisch handelen. Er zijn bovendien grote verschillen tussen leraren onderling.
5. **Leerlingbegeleiding onvoldoende doelgericht.** De leerlingbegeleiding is niet altijd even doelgericht georganiseerd.

De inspectie beveelt onder meer duurzame professionalisering aan, en reikt in publicaties zoals Klasse concrete werkvormen aan: onderbouwen met betrouwbare data (gestandaardiseerde toetsen, de DataWijzer van de inspectie), voortgang monitoren met een progressiecirkel, actieplannen zichtbaar maken in de lerarenkamer, en maatregelen evalueren met keep-stop-change-start. Draagvlak digitaliseert precies deze werkvormen.

### 2.2 Internationale spiegel: TALIS

De OESO-onderzoeken Teaching and Learning International Survey (TALIS 2018 en TALIS 2024) bevestigen het Vlaamse feedbacktekort. Slechts ongeveer 35% van de Vlaamse leraren reflecteerde op lesobservaties — significant minder dan in vergelijkingslanden — en ongeveer 25% nam deel aan coaching. Een OESO-analyse van scholen als lerende organisaties (2021) wijst uit dat Vlaanderen vooral groeikansen heeft in diepgaande vormen van professionele samenwerking zoals teamteaching, observatie en feedback: krachtige vormen omdat ze gewoontes en overtuigingen blootleggen en tot gezamenlijke reflectie leiden. TALIS toont bovendien een toenemende professionaliseringsnood (klasmanagement, leerlingen met specifieke onderwijsbehoeften, curriculumkennis) en een laag gevoel van maatschappelijke waardering bij Vlaamse leraren.

### 2.3 Wetenschappelijke kaders die het ontwerp sturen

- **Feedbackonderzoek** (Hattie & Timperley, 2007, *The Power of Feedback*): feedback is een van de krachtigste hefbomen voor leren en professioneel handelen, op voorwaarde dat ze doelgericht is (feed up / feed back / feed forward). Het platform structureert gesprekken en klasbezoeken volgens dit model.
- **Zelfdeterminatietheorie** (Deci & Ryan; in Vlaanderen o.a. Vansteenkiste): motivatie en welbevinden groeien wanneer de basisbehoeften **A**utonomie, ver**B**ondenheid en **C**ompetentie vervuld zijn. Dit ABC stuurt de waarderings- en welbevindenmodules: erkenning van competentie, verbondenheid via leergemeenschappen, autonomie via desiderata en eigen professionaliseringskeuzes.
- **Professionele leergemeenschappen** (Stoll et al., 2006; Vescio, Ross & Adams, 2008): PLG's met focus op leerlingenleren veranderen de klaspraktijk aantoonbaar. Voorwaarden zijn gedeelde doelen, gedeprivatiseerde praktijk en ondersteunende structuren — precies wat een platform kan faciliteren en zichtbaar maken.
- **Handelingsgericht werken** (Pameijer & van Beukering): de zeven uitgangspunten (o.a. doelgericht werken, wisselwerking en afstemming, constructieve samenwerking, systematiek en transparantie) vormen de grammatica van de leerlingbegeleidingsmodule.
- **Kwaliteitszorgcyclus (PDCA)** en het **referentiekader onderwijskwaliteit (ROK)**: het ROK verwacht dat scholen hun kwaliteit ontwikkelen vanuit een gedragen visie, systematisch evalueren en borgen. De doelenboom en evaluatieflows in Draagvlak zijn een operationalisering van die verwachtingen.
- **Vier in Balans** (Kennisnet): succesvolle onderwijstechnologie vraagt evenwicht tussen visie, deskundigheid, inhoud en infrastructuur. Dit kader stuurt het implementatiehoofdstuk (§ 12).

### 2.4 Les uit Appwel

PXL Appwel bewijst dat systematische welbevindenmonitoring in Vlaanderen werkt en gedragen wordt (348 scholen, ruim 132.000 leerlingen in schooljaar 2022-2023) en dat de deelconstructen van het ROK — tevredenheid, klasklimaat en betrokkenheid, sociale relaties tussen leerlingen, academisch zelfconcept — een valide meetbasis vormen. De gekende beperkingen zijn tegelijk de kans voor Draagvlak: de tool wordt door begeleiders als vrij complex ervaren, staat los van de overige school- en personeelsprocessen, en vraagt een aparte app-installatie. Draagvlak integreert de meting in één platform met single sign-on, verkort de bevraging en verbindt de resultaten rechtstreeks met het begeleidingsdossier én met de strategische doelen van de school (geaggregeerd).

---

## 3. Visie en ontwerpprincipes

1. **De gouden draad.** Elk object in het systeem (actie, navorming, gesprek, PLG, meting, interventie) kan gekoppeld worden aan een doel in de doelenboom van de school. Zo wordt "visie tot op de vloer" geen slogan maar een query: het platform kan op elk moment tonen welke concrete activiteiten aan welk strategisch doel bijdragen — en waar het stil ligt.
2. **Registreer één keer, gebruik overal.** Het platform mag géén extra planlast creëren; het moet planlast wegnemen. Gegevens die al bestaan (identiteit, ambt, opdracht) worden gesynchroniseerd, niet herbevraagd. Elke registratie levert de invoerder zélf iets op (een teller, een herinnering, een overzicht).
3. **Ontwikkeling en beoordeling zijn gescheiden werelden.** Waardering, kudos, portfolio en welbevindendata voeden nooit automatisch een evaluatiedossier. Formele evaluatie volgt uitsluitend het decretale spoor (§ 5.5) met eigen, afgeschermde documenten. Deze scheiding is een voorwaarde voor psychologische veiligheid en voor eerlijk gebruik.
4. **Privacy by design en by default** (AVG art. 25): dataminimalisatie, strikte rolgebaseerde toegang, pseudonimisering en aggregatie waar mogelijk, volledige audittrail, en géén geautomatiseerde besluitvorming over personen (AVG art. 22).
5. **Toegankelijk en meertalig.** WCAG 2.1 niveau AA als harde ondergrens, WCAG 2.2 als ontwerpdoel; leerlinggerichte schermen leeftijdsadequaat, vertaalbaar en voorleesbaar.
6. **De mens beslist.** Het platform signaleert, structureert en herinnert; beslissingen over mensen (beoordelingen, evaluaties, zorgfases) worden altijd door mensen genomen en gemotiveerd.
7. **Regelgeving als configuratie.** Decretale parameters (dagen, deadlines, beoordelingstypes) zijn geen hardcode maar instelbare regels met ingangsdatum, zodat het platform wijzigende regelgeving volgt zonder herbouw.
8. **Netneutraal, GO!-klaar.** Het datamodel is netneutraal, maar de eerste implementatie aligneert met de GO!-context: het PPGO! en het strategisch plan GO! 2030 kunnen als bovenliggende visielaag ("poolster") worden ingeladen waaraan schoolvisies zich verhouden.
9. **AI als stille assistent.** Waar AI aantoonbaar planlast wegneemt, zetten we ze in — altijd assistief, altijd met menselijke bevestiging, nooit als beoordelaar van mensen (§ 10).

---

## 4. Doelgroepen en rollen

Draagvlak bedient een scholengroep of schoolbestuur als hoogste organisatieniveau, met daaronder scholen (elk met eigen instellingsnummer) en teams/vakgroepen. Onderstaande rollen zijn cumuleerbaar en per school toewijsbaar via het identiteitsplatform (§ 9).

| Rol | Kernrechten (samengevat) |
|---|---|
| Beheerder scholengroep | Configuratie, rollenbeheer, groepsbrede geaggregeerde dashboards, sjabloonbeheer |
| Algemeen/coördinerend directeur | Groepsbrede strategie, benchmarks tussen scholen (geaggregeerd), HR-overzichten |
| Directeur (eerste evaluator) | Schooldashboard, volledige gesprekscyclus, beoordelingen, opdrachtverdeling, professionaliseringsplan |
| Tweede evaluator / bestuur | Procesbewaking evaluatietrajecten (leesrecht op formele dossiers, geen inhoudelijke wijziging) |
| Beleidsondersteuner / middenkader | Doelenboom, acties, kwaliteitskalender, PLG-coördinatie (zonder toegang tot formele personeelsdossiers) |
| Mentor / aanvangsbegeleider | Trajecten van toegewezen starters, logboek, kijkwijzers |
| Leraar / personeelslid | Eigen dossier, portfolio, desiderata, professionalisering, PLG's, gesprekken aanvragen, kudos geven |
| Zorgcoördinator / leerlingbegeleider | Welbevindendashboard leerlingen, begeleidingsdossiers, interventietoolkit, MDO-agenda |
| Leraar (zorguitvoerend) | Enkel de afspraken en maatregelen voor de eigen klasgroepen ("wat betekent dit morgen in mijn klas") |
| Preventieadviseur / vertrouwenspersoon | Geaggregeerde welbevindenrapporten personeel i.k.v. psychosociale risicoanalyse |
| Leerling | Eigen metingen invullen, hulpvraag stellen, eigen resultaten inzien (leeftijdsadequaat) |
| DPO | Verwerkingsregister-export, audittrail, inzage-/verwijderworkflows |

Ouders zijn in het MVP geen actieve gebruikers; zij komen in beeld via informatie- en toestemmingsflows (§ 8) en, in een latere fase, via een beperkt inzageportaal.

---

## 5. Functionele modules

Elke module wordt beschreven met doel, onderbouwing en wettelijke basis, kernfunctionaliteit en rapportage. De volgorde volgt de logica van het platform: eerst het strategische hart, dan de HR-keten, dan leerlingen.

### 5.1 Module A — Strategisch beleid & schoolontwikkelingsplan (het hart)

**Doel.** De visie van de school vertalen in een meerjarig, meetbaar en levend schoolontwikkelingsplan, en de uitvoering ervan zichtbaar maken tot op de klasvloer.

**Onderbouwing.** Rechtstreeks antwoord op Onderwijsspiegel-knelpunten 1-3 (§ 2.1) en op de ROK-verwachtingen rond gedragen visie en cyclische, systematische en betrouwbare kwaliteitsevaluatie. Methodisch geënt op PDCA en op de door de inspectie/Klasse aangereikte werkvormen (progressiecirkel, keep-stop-change-start, zichtbare actieplannen).

**Kernfunctionaliteit.**
- **Doelenboom in vier lagen:** (1) Visie/pedagogisch project (lange termijn, bv. 6 jaar; voor GO!-scholen koppelbaar aan PPGO! en GO! 2030), (2) strategische doelen (3-5 per school, SMART geformuleerd), (3) operationele jaardoelen, (4) acties/projecten met eigenaar, timing, middelen, status en indicator(en).
- **Meerjaren-implementatieplan:** tijdlijnweergave (roadmap/gantt) over meerdere schooljaren, met mijlpalen en afhankelijkheden — het "meerjaren implementatieplan" als gestructureerd object in plaats van een Word-bestand.
- **ROK-tagging:** elk doel en elke actie kan getagd worden met de relevante kwaliteitsverwachting(en) uit het ROK. Eén klik genereert een "doorlichtingsdossier": per ROK-verwachting alle lopende en afgeronde acties, evidentie en evaluaties.
- **Kwaliteitskalender:** jaarplanning van evaluatiemomenten per doel; automatische PDCA-herinneringen; evaluatie via keep-stop-change-start met gemotiveerde beslissing.
- **Visieradar op de vloer:** elk personeelslid ziet op zijn startscherm de prioriteiten van dit schooljaar en wat die déze maand concreet betekenen voor zijn praktijk (gekoppelde acties, afspraken, ondersteuningsaanbod). Teamoverleg-widgets tonen dezelfde informatie op vakgroep-/teamniveau.
- **Databibliotheek:** indicatoren kunnen gevoed worden door platformdata (welbevinden, professionaliseringsdeelname, gespreksdekking) én door handmatig of via import toegevoegde externe data (resultaten Vlaamse toetsen, IDP/OVSG-toetsen, in- en uitstroomcijfers, DataWijzer-inzichten). Zo wordt "onderbouw met betrouwbare data" praktisch haalbaar.
- **Sjablonen en co-creatie:** de scholengroep kan sjabloondoelen en groepsprioriteiten uitrollen; scholen vertalen die lokaal. Commentaar- en instemmingsrondes (bv. pedagogische raad, schoolraad) worden gelogd zodat gedragenheid aantoonbaar is.

**Rapportage.** Strategiecockpit per school (voortgang per doel, stilgevallen acties, indicatorentrends), groepscockpit met geaggregeerde vergelijking tussen scholen, exporteerbaar doorlichtingsdossier (PDF).

### 5.2 Module B — Personeelsdossier & loopbaan

**Doel.** Eén betrouwbaar, actueel HR-beeld per personeelslid: wie is wat, in welk statuut, met welke bekwaamheidsbewijzen, en welke deadlines komen eraan.

**Wettelijke basis.** Decreet Rechtspositie personeelsleden gemeenschapsonderwijs (27 maart 1991) resp. Decreet Rechtspositie gesubsidieerd onderwijs, en de uitvoerende omzendbrieven, waaronder PERS/2019/03 (tijdelijke aanstelling en TADD) en PERS/2007/09 (functiebeschrijving en evaluatie). Verwerking van personeelsgegevens steunt op de arbeidsrelatie en wettelijke verplichtingen (AVG art. 6.1.b/c) — zie § 8.

**Kernfunctionaliteit.**
- **Identiteit en organisatie** gesynchroniseerd vanuit Microsoft Entra ID / Google Workspace (SCIM): naam, school/scholen, functie, team. Geen dubbele invoer.
- **Ambten en bekwaamheidsbewijzen:** per personeelslid de ambten met vereist (VE), voldoende geacht (VO) of "ander" (AND) bekwaamheidsbewijs, met vervaldata van bewijsstukken (bv. bewijs pedagogische bekwaamheid).
- **Statuutopvolging en tellers:** actueel statuut per ambt (TABD, TADD, vast benoemd; tijdelijk andere opdracht), met automatische tellers voor dienstanciënniteit. De TADD-teller volgt de decretale rekenregels (kalenderdagen binnen aanstellingsperiodes; weekends en korte vakanties tellen mee, zomervakantie in regel niet; maximaal 360 dagen per jaar; onderscheid totale versus effectief gepresteerde dagen) en toont een prognose: "op 30 juni bereikt X 297 dagen dienstanciënniteit waarvan 214 effectief — beoordeling vereist vóór 30 juni; kandidaatstelling TADD vóór 15 juni."
- **Deadline-engine:** automatische, rolgerichte herinneringen voor de kritieke data uit de regelgeving: kandidaatstelling TADD (vóór 15 juni), beoordeling starters (uiterlijk 30 juni), vacantverklaringen en benoemingsrondes, einde interimopdrachten, verplichte evaluatorenopleiding (binnen twee jaar na aanduiding).
- **Verlofstelsels en afwezigheden (informatief):** leesweergave gesynchroniseerd of geïmporteerd uit het schooladministratiepakket, omdat afwezigheden de tellers "effectief gepresteerd" beïnvloeden. De bron blijft het administratiepakket; Draagvlak verstuurt géén RL-zendingen naar AGODI.
- **Documentenkluis per personeelslid** met versiebeheer en toegangslogging (functiebeschrijving, overeenkomst aanvangsbegeleiding, verslagen — zie verder).

**Rapportage.** HR-cockpit: statuutverdeling, benoemingsgraad, leeftijds- en anciënniteitspiramide, komende deadlines, risico's (bv. starters zonder geplande beoordeling), personeelsverloop.

### 5.3 Module C — Opdrachten, uren & desiderata

**Doel.** De jaarlijkse opdrachtverdeling transparant, billijk en bespreekbaar maken, en de voorkeuren van personeelsleden structureel meenemen.

**Wettelijke basis en kaders.** Prestatie- en opdrachtregelingen per niveau; het decretale principe van de geïndividualiseerde functiebeschrijving als kader voor wat verwacht mag worden; in het basisonderwijs de "negatieve lijst" van taken die niet opgelegd mogen worden; afspraken over billijke verdeling van schoolgebonden opdrachten behoren tot het lokale sociaal overleg.

**Kernfunctionaliteit.**
- **Desiderata-ronde:** vóór de opdrachtverdeling geven personeelsleden gestructureerd voorkeuren door (vakken/leerjaren, klassen, uurroosterwensen, taken, deeltijds werken, professionaliseringswensen). Desiderata zijn zichtbaar voor de directie en worden bij de puzzel als beslissingsinformatie getoond; de beslissing en motivering worden gelogd — transparantie zonder valse beloftes.
- **Opdrachtenpuzzel:** opdrachten per personeelslid per schooljaar (percentages/lestijden, plage-uren waar van toepassing, BPT-/beleidsuren, mentoruren aanvangsbegeleiding), met scenariomodus (concepten vergelijken vóór publicatie) en billijkheidsweergave (verdeling van schoolgebonden taken over het team).
- **Taakregister schoolgebonden opdrachten:** toezichten, werkgroepen, uitstappen — zichtbaar per persoon en per team, met historiek over de jaren (wie droeg wat, hoe lang al).
- **Publicatie en bezwaarflow:** publicatie van de individuele opdracht met leesbevestiging; personeelslid kan via het platform een gesprek aanvragen (koppeling met module E).

**Rapportage.** Bezettingsoverzicht per vak/ambt, openstaande uren, verdeling schoolgebonden taken, historiek desiderata versus toekenning (billijkheidsmonitor).

### 5.4 Module D — Aanvangsbegeleiding & beoordeling (TADD-flow)

**Doel.** Elke starter een kwaliteitsvol, gedocumenteerd traject van aanvangsbegeleiding geven en de decretale beoordelingsflow richting TADD sluitend en tijdig laten verlopen.

**Wettelijke basis.** Omzendbrief PERS/2019/03: aanvangsbegeleiding is een recht én plicht voor tijdelijke personeelsleden in een wervingsambt; de eerste evaluator legt duur en intensiteit van het individuele traject vast in overleg met het personeelslid (schriftelijke overeenkomst); de afspraken over aanvangsbegeleiding krijgen een vertaling in het professionaliseringsplan en worden onderhandeld in het bevoegde lokaal comité. Het traject mondt uit in een beoordeling door de eerste evaluator, uiterlijk op 30 juni van het schooljaar waarin de vereiste dienstanciënniteit (290 dagen, waarvan 200 effectief) wordt bereikt. Drie uitkomsten: positief (of geen beoordeling, wat als positief geldt), beoordeling met werkpunten (verslag met werkpunten en afgelegd traject; nadien 200 bijkomende effectieve dagen met aangepast traject en voorrang op een nieuwe TABD-aanstelling; slechts één keer per ambt mogelijk), of negatief (gemotiveerd verslag; opgebouwde anciënniteit in die instelling telt niet mee; verhaal mogelijk bij het bestuur).

**Kernfunctionaliteit.**
- **Trajectdossier per starter:** digitale overeenkomst aanvangsbegeleiding (duur, intensiteit, afspraken) met handtekening/bevestiging; toegewezen mentor(en); doelen van het traject gekoppeld aan de basiscompetenties en aan schoolprioriteiten.
- **Logboek en klasbezoeken:** coaching- en overlegmomenten loggen in twee klikken; klasbezoeken met configureerbare kijkwijzers (observatiefocus, feed up/back/forward-structuur); starter kan zelf reflecties en vragen toevoegen.
- **Beoordelingsflow met vangnet:** automatische detectie van wie dit schooljaar de TADD-drempel bereikt; tijdslijn met verplichte tussenstappen (minstens X feedbackmomenten vóór de beoordeling — configureerbaar); gestructureerd beoordelingsverslag per uitkomsttype, inclusief de decretaal vereiste motivering en trajectbeschrijving bij werkpunten of negatief; automatisch vervolgtraject bij werkpunten (nieuw aangepast traject, focus op de werkpunten, teller van 200 bijkomende effectieve dagen).
- **Afstemming binnen scholengemeenschap/-groep:** wanneer een starter in meerdere scholen presteert, ondersteunt het platform het (gelogde) overleg tussen eerste evaluatoren over één coherente beoordeling — een gekend praktijkknelpunt.
- **Verhaal- en beroepsregistratie:** registratie van bezwaar bij het bestuur met termijnbewaking.

**Rapportage.** Startersdashboard: lopende trajecten, mentorbelasting, geplande beoordelingen, uitkomsten per school en per jaar; signalering van trajecten zonder recente activiteit ("stille starters").

### 5.5 Module E — Feedback, functionering & evaluatie ("nieuwe stijl")

**Doel.** Een levende feedbackcultuur voor iedereen, en een juridisch sluitend evaluatiespoor voor de uitzonderingen — strikt gescheiden, conform de sinds 1 september 2021 geldende regelgeving.

**Wettelijke basis.** Omzendbrief PERS/2007/09 (functiebeschrijving en evaluatie), zoals gewijzigd: de verplichting om ieder personeelslid minstens vierjaarlijks te evalueren is afgeschaft. Met alle personeelsleden moet op regelmatige basis een (informeel) functioneringsgesprek gehouden worden; elk personeelslid heeft het recht om zelf een functioneringsgesprek aan te vragen. Enkel bij ernstige tekortkomingen volgt een formeel functioneringsgesprek met persoons- en ontwikkelingsgerichte doelstellingen in het verslag, gevolgd door een verplicht begeleidingstraject van minstens 120 (effectief gepresteerde) dagen, waarna een evaluatie kan volgen; bij een evaluatie "onvoldoende" gelden verdere decretale stappen en beroepsmogelijkheden (College van Beroep). De eerste evaluator (in regel de directeur) draagt het proces; de tweede evaluator bewaakt als neutrale procesbewaker en kan de beslissing niet wijzigen. Evaluatoren moeten binnen twee jaar na aanduiding met succes een evaluatorenopleiding afronden, anders vervalt hun bevoegdheid. Elk personeelslid heeft een (geïndividualiseerde) functiebeschrijving als referentiekader; schoolgebonden taken buiten de functiebeschrijving zijn geen evaluatievoorwerp.

**Kernfunctionaliteit — spoor 1: iedereen (ontwikkelgericht).**
- **Gesprekkencyclus:** planning en registratie van informele functioneringsgesprekken met lichte, gestructureerde verslagen (afspraken, ondersteuningsvragen, follow-up), agenda-integratie (Outlook/Google Agenda) en dekkingsmonitor ("wie had al twee jaar geen gesprek?" — het directe antwoord op de feedbackarmoede bij ervaren leraren uit de Onderwijsspiegel).
- **Gesprek-aanvraagknop:** elk personeelslid kan met één klik zijn decretale recht op een functioneringsgesprek uitoefenen; de aanvraag krijgt een behandeltermijn en verschijnt op het dashboard van de eerste evaluator.
- **Collegiale visitatie en lesobservatie (vrijwillig):** kijkwijzers, wederzijdse feedback volgens feed up/back/forward; resultaten zijn eigendom van het personeelslid en verschijnen énkel in diens eigen portfolio — nooit in een evaluatiedossier. Hiermee wordt het TALIS-tekort aan observatie en coaching aangepakt zonder controle-connotatie.
- **Functiebeschrijvingenbeheer:** sjablonen per ambt, geïndividualiseerde toevoegingen, versiebeheer, ondertekenflow.

**Kernfunctionaliteit — spoor 2: uitzondering (formeel, afgeschermd).**
- **Formeel traject:** apart, extra beveiligd dossiertype dat pas ontstaat wanneer de eerste evaluator een formeel functioneringsgesprek met persoons- en ontwikkelingsgerichte doelstellingen registreert. Het platform bewaakt de procedurele vormvereisten: verslag met doelstellingen, startdatum begeleidingstraject, teller van 120 effectief gepresteerde dagen (afwezigheden tellen niet mee), geplande coaching en remediëring, tussentijdse opvolgmomenten, tijdslijn tot eventuele evaluatie, rol en leesrecht van de tweede evaluator, beroepstermijnen.
- **Evaluatorenregister:** wie is eerste/tweede evaluator voor wie; opleidingsstatus met vervaldatum (verplichting binnen twee jaar); blokkering van formele stappen door niet-gekwalificeerde evaluatoren, met duidelijke melding.
- **Volledige audittrail** op elk formeel document (wie zag/wijzigde wat wanneer), export voor juridische procedures.

**Rapportage.** Voor de directie: gespreksdekking, openstaande aanvragen, lopende formele trajecten (enkel voor bevoegden). Voor de scholengroep: geaggregeerde dekking en opleidingsstatus evaluatoren — nooit inhoud.

### 5.6 Module F — Waardering & valorisatie

**Doel.** Het geleverde werk van onderwijsprofessionals zichtbaar maken en waarderen — structureel, niet incidenteel — als hefboom voor motivatie, retentie en een positieve teamcultuur.

**Onderbouwing.** TALIS toont een laag ervaren maatschappelijke waardering bij Vlaamse leraren en een samenhang tussen waardering, jobtevredenheid en retentie; de zelfdeterminatietheorie verklaart waarom erkenning van competentie en verbondenheid motiverend werkt. De Onderwijsspiegel vraagt expliciet om opvolging van personeel mét waardering en om het valoriseren van ontwikkeling. Ontwerpprincipe 3 geldt hier absoluut: waardering is ontkoppeld van evaluatie.

**Kernfunctionaliteit.**
- **Kudos (peer-to-peer):** korte, concrete waardering tussen collega's en van leidinggevenden, optioneel gekoppeld aan een schoolwaarde of strategisch doel ("jouw co-teaching-experiment maakt doel 2 concreet"). Kudos verschijnen in het eigen portfolio en, mits akkoord, in de teamfeed.
- **Portfolio & impactverslag:** elk personeelslid bouwt (semi-automatisch) een portfolio op: gevolgde professionalisering, PLG-bijdragen, gedeelde materialen, projecten, kudos. Jaarlijks genereert het platform een persoonlijk "impactverslag" — het vaak onzichtbare werk buiten de lesuren, zwart op wit. Het personeelslid beslist wat gedeeld wordt.
- **Mijlpalen en momenten:** dienstjubilea, geslaagde trajecten (TADD, benoeming), afgeronde opleidingen — met attente, configureerbare teamcommunicatie.
- **Spotlight & deelmomenten:** periodiek uitgelichte praktijken op team- of groepsniveau; koppeling met module G (leergemeenschappen) zodat valorisatie en kennisdeling samenvallen.

**Rapportage.** Waarderingsklimaat op teamniveau (frequentie en spreiding van kudos — geaggregeerd, nooit als individuele score), deelname aan deelmomenten.

### 5.7 Module G — Professionalisering & leergemeenschappen

**Doel.** Professionalisering doelgericht maken (gekoppeld aan strategie én aan individuele groeivragen), leergemeenschappen zichtbaar maken en hun ontwikkeling valoriseren.

**Wettelijke basis en kaders.** Elke school beschikt over een professionaliseringsplan (opvolger van het nascholingsplan), waarin ook de aanpak van de aanvangsbegeleiding vervat zit; het plan wordt onderhandeld in het bevoegde lokaal comité (cf. PERS/2019/03). De Onderwijsspiegel 2026 vraagt duurzame professionalisering die aansluit bij strategische doelen; PLG-onderzoek (Stoll; Vescio) onderbouwt de leergemeenschapsaanpak.

**Kernfunctionaliteit.**
- **Professionaliseringsplan als levend object:** prioriteiten per schooljaar, budget(indicatie), doelgroepkeuzes — rechtstreeks gekoppeld aan de doelenboom (module A). De onderhandeling in het lokaal comité wordt gelogd (datum, versie).
- **Individuele trajecten:** persoonlijke professionaliseringsdoelen (uit functioneringsgesprek, eigen ambitie of teamprioriteit), aanvraag- en goedkeuringsflow voor navormingen, registratie van gevolgde initiatieven met kostprijs en tijdsinvestering, transfer-opvolging ("wat neem je mee, wat probeer je uit, wat deel je?") — want professionalisering zonder transfer is de klassieke lek in de keten visie→vloer.
- **Aanbodcatalogus:** intern aanbod (eigen expertise! zie kaart hieronder), aanbod van de pedagogische begeleidingsdienst en externe partners; inschrijving en evaluatie van initiatieven.
- **Expertisekaart:** personeelsleden kunnen expertises aangeven of laten valideren; de school ziet in één beeld welke expertise in huis is — basis voor interne kennisdeling en teamteaching.
- **PLG-ruimtes:** elke leergemeenschap (vakgroep, werkgroep, lerend netwerk) krijgt een ruimte met leden, doelstelling (gekoppeld aan de doelenboom), agenda/verslagen, gedeelde artefacten (lesmateriaal, kijkwijzers, data-analyses) en een publieke "vitrine" die de output zichtbaar maakt voor het hele team of de hele groep — het letterlijke "zichtbaar maken van leergemeenschappen en valoriseren van ontwikkeling".
- **Micro-erkenning:** badges/attesten voor afgeronde trajecten en PLG-output, opgenomen in het portfolio (module F).

**Rapportage.** Professionaliseringsdekking per strategisch doel (waar investeren we in, waar niet — de inspectievraag), deelname- en transferindicatoren, PLG-activiteit, interne-expertisebenutting.

### 5.8 Module H — Welbevinden personeel & bevragingen

**Doel.** Het welbevinden van het team systematisch en veilig monitoren en verbinden met concreet beleid.

**Wettelijke basis.** Welzijnswet van 4 augustus 1996 en de Codex over het welzijn op het werk (boek I, titel 3, cf. KB van 10 april 2014): de werkgever is verplicht psychosociale risico's te analyseren en preventiemaatregelen te nemen. Structurele welbevindenmonitoring is daarmee geen extraatje maar een instrument binnen een wettelijke verplichting — uit te voeren in samenspraak met de interne/externe preventiedienst en het bevoegde overlegcomité.

**Kernfunctionaliteit.**
- **Pulse-metingen:** korte bevragingen (5-10 vragen, 2-4 keer per jaar) rond werkbaar werk, autonomie-verbondenheid-competentie (ABC), werkdruk en ondersteuning; wetenschappelijk onderbouwde itemsets, samengesteld met de preventiedienst.
- **Anonimiteit met harde drempels:** rapportage uitsluitend geaggregeerd; geen enkel rapport onder n<5 respondenten per groep; geen individuele scores raadpleegbaar door leidinggevenden, ooit.
- **Signaalkanaal:** een vrijwillige, vertrouwelijke "ik wil hierover praten"-knop die enkel de vertrouwenspersoon of preventieadviseur bereikt — nooit de hiërarchische lijn.
- **Van meting naar actie:** resultaten worden per team besproken met een gespreksleidraad; verbeteracties worden als actie in de doelenboom gezet (module A), waardoor opvolging gegarandeerd en zichtbaar is. De cyclus meten→duiden→handelen→hermeten wordt door het platform bewaakt.
- **Bredere bevragingen:** generieke, AVG-conforme bevragingsmodule voor ouder- en teambevragingen i.k.v. kwaliteitszorg (met dezelfde anonimiteitsregels).

**Rapportage.** Trendlijnen per team/school (geaggregeerd), vergelijking met groepsgemiddelde, respons, gekoppelde acties en hun status; export voor het jaaractieplan/globaal preventieplan van de preventiedienst.

### 5.9 Module I — Welbevinden leerlingen ("Appwel, maar eenvoudiger")

**Doel.** Het individuele en collectieve schoolwelbevinden van leerlingen systematisch meten en opvolgen, met een minimale drempel voor leerlingen én begeleiders, en met een directe lijn naar begeleiding en beleid.

**Wettelijke basis en kaders.** Het decreet leerlingenbegeleiding (27 april 2018) verplicht elke school een geïntegreerd beleid op leerlingenbegeleiding te voeren (erkenningsvoorwaarde) over vier domeinen — onderwijsloopbaan, leren en studeren, psychisch en sociaal functioneren, preventieve gezondheidszorg — vanuit een continuüm van zorg; kwaliteitsvolle leerlingenbegeleiding "verhoogt het welbevinden" van leerlingen. Het ROK bevat welbevinden als kwaliteitsverwachting; de deelconstructen van schoolwelbevinden zoals gehanteerd door PXL Appwel (tevredenheid, klasklimaat en betrokkenheid, sociale relaties tussen leerlingen, academisch zelfconcept) zijn op dat kader geënt en vormen ook hier de meetbasis. Gegevensbescherming: zie § 8 (dit is de gevoeligste module van het platform).

**Kernfunctionaliteit.**
- **Geen appdrempel:** leerlingen vullen metingen in via de browser of als progressive web app, aangemeld met hun bestaande schoolaccount (Microsoft/Google SSO). Geen installatie, geen apart wachtwoord — dé structurele vereenvoudiging tegenover Appwel.
- **Korte, slimme metingen:** 3-5 meetmomenten per schooljaar van telkens 5-8 vragen. De vier constructen roteren over de metingen (planned rotation), zodat elke afname kort blijft maar het jaarbeeld volledig is. Leeftijdsadequate schermen (van smiley-schalen in de lagere school tot genuanceerde schalen in het secundair), vertaalbare vragen en voorleesfunctie (toegankelijkheid, § 11).
- **Hulpvraagknop, altijd beschikbaar:** los van meetmomenten kan een leerling aangeven "ik wil met iemand praten" (met keuze van thema en, waar de school dat toelaat, voorkeurspersoon). Het signaal komt uitsluitend bij de leerlingbegeleiding terecht, met een opvolgtermijn en registratie van de opvolging. Drempelverlagend, zoals bij Appwel, maar ingebed in het begeleidingsproces.
- **Dashboard voor leerlingbegeleiders:** klas- en jaargroepbeeld per construct, geaggregeerd en pas na sluiting van het meetvenster. *Gecorrigeerd aug. 2026 (juridisch onderzoek):* geen individueel verloop en geen automatische signalering per leerling — een longitudinaal psychisch profiel en automatische risicovlaggen zijn strijdig met het signaleren/diagnosticeren-onderscheid (school ↔ CLB) en met de dunne art. 9-basis voor schoolinterne welbevindenregistratie. De individuele route is uitsluitend de zelf-geïnitieerde hulpvraagknop; wat begeleiders registreren zijn handelingen ("gesprek gevoerd, doorverwezen"), geen toestanden — zie [functioneel ontwerp W13](functioneel-ontwerp/welzijn.md).
- **Interventietoolkit:** per construct een gecureerde set interventies (klasniveau en individueel), gekoppeld aan de fase in het zorgcontinuüm; scholen kunnen eigen interventies toevoegen; effectopvolging via her-meting.
- **Beleidslus:** geaggregeerde, geanonimiseerde welbevindendata voeden de indicatoren in de doelenboom (module A) — welbevinden wordt zo een gedeelde beleidsprioriteit met data, niet enkel een zorgdossier.
- **Leerlingperspectief:** de leerling ziet (leeftijdsadequaat) alleen zíjn eigen antwoorden van het moment zelf — niemand anders bouwt daar een verloop van op — en krijgt na elke meting een korte, warme terugkoppeling met hulpbronnen (incl. externe kanalen zoals Awel/CLBch@t), wat de meting ook voor de leerling zelf betekenisvol maakt.

**Wat Draagvlak bewust anders doet dan Appwel:** één platform in plaats van een losstaande tool (zelfde login, zelfde dossier, zelfde beleidscockpit), kortere metingen door rotatie, signalen die rechtstreeks in de begeleidingsflow landen, en een sterk vereenvoudigde begeleidersinterface (taakgericht: "deze 4 leerlingen en deze 2 klassen vragen vandaag je aandacht"). Appwel blijft de referentie die de waarde van het concept bewees; Draagvlak bouwt de volgende iteratie: geïntegreerd, eenvoudiger, beleidsgekoppeld.

**Rapportage.** Klas- en schooltrends (geaggregeerd, boven de anonimiteitsdrempels), respons per meting, opvolggraad van signalen en hulpvragen, effect van interventies (voor-na), geaggregeerde export voor het MDO en het beleid op leerlingenbegeleiding.

### 5.10 Module J — Leerlingbegeleiding & zorgcontinuüm

**Doel.** Het beleid op leerlingenbegeleiding en de dagelijkse zorgpraktijk structureren volgens het zorgcontinuüm en handelingsgericht werken, en de afspraken helder maken voor álle onderwijsprofessionals.

**Wettelijke basis en kaders.** Decreet leerlingenbegeleiding (2018): geïntegreerd beleid over de vier domeinen als erkenningsvoorwaarde, met versterkt kwaliteitstoezicht door de inspectie sinds 2021-2022; de school voert de regie, het CLB werkt subsidiair en complementair (kernactiviteiten: signaalfunctie en consultatieve leerlingenbegeleiding); het multidisciplinair dossier blijft bij het CLB (Draagvlak vervangt LARS niet). Decreet leersteun (in werking sinds 1 september 2023): versterking van brede basiszorg en verhoogde zorg voor leerlingen met specifieke onderwijsbehoeften in het gewoon onderwijs. Methodisch kader: handelingsgericht werken en het zorgcontinuüm (brede basiszorg → verhoogde zorg → uitbreiding van zorg → individueel aangepast curriculum).

**Kernfunctionaliteit.**
- **Beleidsdocument als structuur:** het beleid op leerlingenbegeleiding wordt in het platform opgebouwd over de vier domeinen en de fasen van het zorgcontinuüm — geen pdf in een map, maar een navigeerbare structuur met eigenaars, afspraken en evaluatiemomenten (ROK-tagbaar, doorlichtingsklaar).
- **Begeleidingsdossier per leerling:** fase in het zorgcontinuüm per domein; maatregelen en redelijke aanpassingen volgens HGW-logica (beeldvorming → doelen → aanpak → evaluatie), met start- en evaluatiedatum; gespreksverslagen (leerling, ouders, CLB); leessporen volledig gelogd.
- **"Wat betekent dit voor mijn klas morgen":** de leraar ziet per klasgroep uitsluitend de actuele, uitvoerbare afspraken en maatregelen voor zijn leerlingen — helder, actueel en zonder toegang tot het achterliggende dossier. Dit beantwoordt rechtstreeks de vraag om leerlingbegeleiding "duidelijker te maken voor alle onderwijsprofessionals" én de inspectievaststelling dat begeleiding niet altijd doelgericht doorwerkt in de klas.
- **MDO en overleg:** agenda, deelnemers, besluiten en actiepunten van multidisciplinair overleg; uitnodigingsflow naar CLB; opvolging van actiepunten met eigenaar en deadline.
- **Scharniermomenten:** gestructureerde (en gelogde) overdracht binnen de school en tussen scholen van de groep bij overgangen, met dataminimalisatie (enkel wat nodig is voor continuïteit van zorg, conform de regelgeving en het schoolreglement).
- **Signaalintegratie:** signalen uit module I (welbevinden, hulpvragen) en uit leraarobservaties komen in één werkvoorraad voor de begeleidingscel, met triage en opvolgtermijnen.

**Rapportage.** Zorgzwaartebeeld per school (aantal leerlingen per fase/domein, geaggregeerd), doorlooptijden van signalen, evaluatiegraad van maatregelen, MDO-opvolging; beleidsrapport per domein voor de doorlichting.

### 5.11 Dwarsmodule — Dashboards, benchmarks & datageletterdheid

Elke rol krijgt een taakgericht startscherm ("wat vraagt vandaag mijn aandacht") in plaats van een datamuur. Daarbovenop: de strategiecockpit (module A) per school; een groepscockpit met geanonimiseerde/geaggregeerde vergelijking tussen scholen van de groep (leren van elkaar, geen ranking-cultuur: standaard mediaan en spreiding, geen naamlijstjes); en een "doorlichtingsmodus" die per ROK-verwachting de evidentie bundelt. Elke grafiek heeft een "wat zie ik hier?"-toelichting en een duidingsvraag, om datageletterdheid in teams te ondersteunen in plaats van cijferfetisjisme te voeden.

---

## 6. Juridisch kader (dwarsdoorsnede)

Dit hoofdstuk bundelt de regelgeving die het platform raakt. Per module werd de specifieke basis al genoemd; hieronder het overzicht en de consequenties voor het ontwerp.

**Onderwijsregelgeving (Vlaanderen).**
- Decreten Rechtspositie (gemeenschapsonderwijs, 27 maart 1991; gesubsidieerd onderwijs, 27 maart 1991) en uitvoerende omzendbrieven: statuten (TABD/TADD/vaste benoeming), dienstanciënniteit, functiebeschrijving, evaluatie. Kernconsequentie: alle drempels en termijnen (290/200 dagen, 15 juni, 30 juni, 120 dagen, 360 dagen richting benoeming, evaluatorenopleiding binnen 2 jaar) worden als **geparametriseerde regels met ingangsdatum** gebouwd, want deze regelgeving wijzigt geregeld.
- Omzendbrief PERS/2019/03 (tijdelijke aanstelling, aanvangsbegeleiding, beoordeling) en PERS/2007/09 (functiebeschrijving en evaluatie, regime sinds 1/9/2021): zie modules D en E.
- Decreet leerlingenbegeleiding (27 april 2018) en decreet leersteun (1 september 2023): zie modules I en J.
- Referentiekader onderwijskwaliteit (ROK) en Inspectie 2.0: geen wet maar hét toetsingskader van de doorlichting; in het platform aanwezig als taxonomie voor tagging en het doorlichtingsdossier.
- Participatie- en overlegregelgeving: afspraken over aanvangsbegeleiding, beoordeling, professionaliseringsplan, functiebeschrijvingen, taakverdeling en bevragingen behoren tot het lokale sociaal overleg (bij het GO!: de basiscomités; elders LOC/ondernemingsraad-equivalenten) en waar relevant het arbeidsreglement en de schoolraad. Het platform voorziet daarom een **overleg-logboek**: versies van documenten met datum en gremium van onderhandeling/advies.

**Gegevensbescherming.** AVG (EU 2016/679) en de Belgische kaderwet van 30 juli 2018; zie § 8 voor de volledige uitwerking. Voor overheidsinstanties en publiekrechtelijke instellingen — waaronder scholen(groepen) — is een functionaris voor gegevensbescherming verplicht (AVG art. 37).

**Welzijn op het werk.** Welzijnswet van 4 augustus 1996 en Codex welzijn op het werk (psychosociale risico's, KB 10 april 2014): grondslag en verplichtingskader voor module H, in samenwerking met de interne/externe preventiedienst en het bevoegde comité.

**Digitale toegankelijkheid.** Europese richtlijn 2016/2102 inzake webtoegankelijkheid van overheidsinstanties, in Vlaanderen omgezet via het Bestuursdecreet van 7 december 2018: websites en (mobiele) applicaties van overheidsinstanties en publiekrechtelijke instellingen moeten voldoen aan EN 301 549 / WCAG 2.1 niveau AA en een toegankelijkheidsverklaring publiceren. Vlaamse onderwijsactoren passen dit toe (zo publiceren het Vlaams Ministerie van Onderwijs en bv. Stedelijk Onderwijs Antwerpen toegankelijkheidsverklaringen op WCAG 2.1 AA). Daarnaast verruimt de European Accessibility Act (richtlijn 2019/882, van kracht voor nieuwe producten en diensten sinds 28 juni 2025) de toegankelijkheidsplicht naar private digitale dienstverlening, en schuift de sector op naar WCAG 2.2. Ontwerpkeuze: **WCAG 2.1 AA als contractuele ondergrens, WCAG 2.2 AA als ontwerpdoel, jaarlijkse audit volgens WCAG-EM en een publieke toegankelijkheidsverklaring** (§ 11).

**AI-regelgeving.** De Europese AI-verordening (AI Act, verordening 2024/1689) klasseert AI-systemen in onderwijs en werkgelegenheid — o.m. systemen die de evaluatie van personen of de toegang tot onderwijs beïnvloeden — als hoog risico, en verbiedt bepaalde praktijken volledig, waaronder emotieherkenning op de werkplek en in onderwijsinstellingen (art. 5). Draagvlak blijft daarom bewust in de assistieve zone: AI vat samen, structureert, vertaalt en zoekt op, maar beoordeelt nooit een persoon en neemt nooit een besluit — zie het stoplichtmodel in § 10. Transparantieverplichtingen (art. 50: AI-output herkenbaar maken) en AI-geletterdheid van gebruikers (art. 4) zijn ingebouwd; geautomatiseerde individuele besluitvorming is sowieso uitgesloten (AVG art. 22 én ontwerpprincipe 6).

**Auteursrecht en gedeelde materialen.** Gedeeld lesmateriaal in PLG-ruimtes krijgt een eenvoudige licentiekeuze (intern gebruik / Creative Commons), zodat delen juridisch proper verloopt.

---

## 7. Wat Draagvlak bewust níét doet (scope-afbakening)

- Geen loonadministratie, geen elektronische personeelszendingen (RL-berichten) naar AGODI, geen leerlingenadministratie (Discimus): dat blijft het terrein van WISA/Informat/Broekx e.a. Draagvlak leest/synchroniseert.
- Geen vervanging van het multidisciplinair CLB-dossier (LARS): Draagvlak documenteert de schoolinterne zorg en de samenwerking mét het CLB.
- Geen digitaal leerplatform (Smartschool, Google Classroom, Teams) en geen puntenboek.
- Geen medische of psychodiagnostiek: welbevindenmetingen zijn signalerings- en beleidsinstrumenten, geen klinische instrumenten. Elke signalering leidt naar een mens, nooit naar een label.

Deze afbakening houdt het platform bouwbaar, verkoopbaar en juridisch beheersbaar — en vermijdt de valkuil van "alles-in-één"-systemen die nergens excelleren.

---

## 8. Gegevensbescherming: ontwerp in detail

**Rolverdeling.** Het schoolbestuur/de scholengroep is verwerkingsverantwoordelijke; de platformleverancier is verwerker (AVG art. 28) met een modelverwerkersovereenkomst, sub-verwerkerslijst en EU-datalocatie. Het verwerkingsregister (art. 30) wordt per module meegeleverd als invulbaar sjabloon.

**Grondslagen per verwerkingsdoel (hoofdlijnen — af te toetsen met de DPO):**

| Verwerking | Grondslag (AVG) | Bijzondere categorieën (art. 9) |
|---|---|---|
| Personeelsdossier, statuut, opdrachten | Art. 6.1.b (arbeidsrelatie) en 6.1.c (decretale verplichtingen) | n.v.t. |
| Functionering/evaluatie, aanvangsbegeleiding | Art. 6.1.c (decretale opdracht) | n.v.t. |
| Waardering, portfolio, PLG | Art. 6.1.f of 6.1.e; deelname aan zichtbare onderdelen op basis van keuze van het personeelslid | n.v.t. |
| Welbevinden personeel | Art. 6.1.c (Welzijnswet: psychosociale risicoanalyse) | Anoniem/geaggregeerd by design. *Gecorrigeerd aug. 2026 (juridisch onderzoek):* werknemerstoestemming (9.2.a) is wegens de gezagsverhouding geen bruikbare grondslag; het individuele kanaal loopt uitsluitend via de vertrouwenspersoon/preventieadviseur psychosociale aspecten onder hun wettelijk statuut en beroepsgeheim (9.2.h-logica), buiten elke rapportagestroom — zie [functioneel ontwerp W9](functioneel-ontwerp/welzijn.md) |
| Welbevinden leerlingen | Art. 6.1.e (taak van algemeen belang: decreet leerlingenbegeleiding, dat welbevinden expliciet tot doel stelt) | Waar antwoorden gezondheidsgerelateerd zijn: strikte noodzakelijkheid, uitdrukkelijke toestemming (leerling/ouders volgens leeftijd) als aanvullende waarborg, verwerking door aan beroepsgeheim/discretieplicht gebonden begeleiders (9.2.g/h-logica) — definitieve kwalificatie via DPIA en DPO |
| Begeleidingsdossier leerling | Art. 6.1.e (decreet leerlingenbegeleiding, erkenningsvoorwaarde) | Idem: noodzakelijkheid, need-to-know, logging |

**Verplichte DPIA.** Grootschalige verwerking van gegevens van kwetsbare betrokkenen (minderjarigen) en van gevoelige gegevens maakt een gegevensbeschermingseffectbeoordeling (art. 35) vóór ingebruikname verplicht. De DPIA wordt per module gedocumenteerd en bij wezenlijke wijziging herhaald; het platform levert de technische input (datastromen, toegangsmatrix, loggingbeschrijving) kant-en-klaar aan.

**Transparantie en rechten.** Privacyverklaringen op maat van doelgroep (personeel; leerlingen in kindtaal; ouders), opname in schoolreglement en arbeidsreglement waar vereist; ingebouwde workflows voor inzage, verbetering en wissing; informatie- en (waar toepasselijk) toestemmingsflow richting ouders vóór de eerste welbevindenmeting, met registratie.

**Techniek.** Encryptie in transit (TLS 1.2+) en at rest; pseudonimisering van meetdata (scheiding identiteit ↔ antwoorden op databankniveau); rolgebaseerde én attribuutgebaseerde toegang met row-level security; volledige, onveranderbare audittrail op gevoelige dossiers; automatische dataminimalisatie (velden die een rol niet nodig heeft, verlaten de server niet); back-ups met gelijke bescherming; jaarlijkse penetratietest; incident- en meldingsprocedure (72-uursmelding, art. 33).

**Bewaartermijnen (principe).** Per objecttype wordt een bewaarregel geconfigureerd volgens het principe "zo kort als kan, zo lang als moet", afgestemd op de selectielijsten voor onderwijsarchieven en het advies van de DPO. Indicatieve logica: welbevindenantwoorden van leerlingen worden na afloop van de schoolloopbaan gewist of onomkeerbaar geanonimiseerd voor beleidsstatistiek; begeleidingsdossiers volgen de onderwijsregelgeving; formele evaluatiedossiers volgen de decretale en verjaringslogica; kudos en portfolio zijn eigendom van het personeelslid (meeneembaar/verwijderbaar bij vertrek). Het platform voert bewaartermijnen automatisch uit en logt de vernietiging.

---

## 9. Architectuur & technologie

**Identiteit eerst.** Eén principe: het identiteitsplatform van de organisatie is de master. Concreet voor een GO!-scholengroep met één Microsoft- en Google-tenant: authenticatie via OpenID Connect/SAML tegen Microsoft Entra ID (en/of Google Workspace), provisioning via SCIM 2.0 met attributen voor school (instellingsnummer), rol en team; just-in-time provisioning als vangnet; leerlingen loggen in met hun bestaande leerlingaccounts. Multifactor en conditional access volgen het beleid van de tenant. Rollen in Draagvlak worden gemapt op security groups zodat rollenbeheer op één plek gebeurt.

**Multi-tenant datamodel.** Scholengroep = tenant; school = organisatie-eenheid met eigen afscherming; alle gegevens dragen tenant- en school-scope; row-level security in de databank dwingt dit af, onafhankelijk van applicatielogica. Groepsrapportage gebeurt via geaggregeerde views, nooit via rechtstreekse toegang tot onderliggende records van een andere school.

**Integraties (API-first).**
- *Inbound:* import/synchronisatie van personeels- en opdrachtgegevens uit schooladministratiepakketten (WISA, Informat, Broekx) via API waar beschikbaar, anders gestandaardiseerde CSV/SFTP-connectoren met validatie; klas- en leerlinglijsten idem.
- *Kalender & communicatie:* Microsoft Graph / Google Calendar voor gespreksuitnodigingen; notificaties via mail, Teams en/of Smartschool-koppeling (configureerbaar per school).
- *Outbound:* export van doorlichtingsdossiers, preventierapporten en beleidsdocumenten (PDF/Excel); alle data van de klant is exporteerbaar in open formaten (anti-lock-in-garantie).
- *Publieke API + webhooks* voor toekomstige koppelingen (bv. BI-tools van de scholengroep).

**Applicatiearchitectuur.** Responsieve web-app (PWA) met mobile-first schermen voor leerlingmetingen en snelle registraties (kudos, logboek); modulaire monoliet of gematigde services rond een centrale API (REST/GraphQL); relationele databank (PostgreSQL) met row-level security; zoekindex voor dossiers en catalogus; achtergrondjobs voor tellers, deadline-engine en synchronisaties; infrastructuur in een EU-regio (bv. Azure West-Europa, aansluitend bij de bestaande Microsoft-tenant), met infrastructure-as-code, gescheiden omgevingen (dev/test/acceptatie/productie) en logging/monitoring. Beveiligingsbeheer volgens ISO 27001-logica (beleid, risicoregister, toegangsbeheer, leveranciersbeheer), met certificering als groeipad.

**Bouwstrategie: no-code, low-code of maatwerk?** Een eerlijke afweging, zeker gezien de piste-Bubble:
- *Prototype/validatie (aanbevolen op no-code/low-code):* klikbare flows voor doelenboom, gesprekkencyclus en desiderata om met directies te valideren — snel, goedkoop, weggooibaar.
- *Productie (afgeraden op generiek no-code):* dit platform staat of valt met row-level security, fijnmazige rollen, audittrails, bewaartermijn-automatisering, WCAG-conformiteit en AVG-aantoonbaarheid. Dat is op generieke no-code-platformen moeilijk hard te maken (en moeilijk te auditen). Aanbevolen pad: no-code voor het valideren van de flows, maatwerk (of een open-source basis met eigen ontwikkeling) voor het product, met de DPIA en de toegangsmatrix als ontwerpdocumenten vanaf dag één.

**AI-gateway.** Alle AI-verkeer loopt via één interne gateway (uitgewerkt in § 10): provider-agnostisch, met per tenant configureerbare API-sleutels (bring your own key) die versleuteld in een key vault staan, budgetplafonds, feature flags per school en per module, een redactielaag voor dataminimalisatie en volledige gebruikslogging. AI blijft zo een uitwisselbare bouwsteen in plaats van een afhankelijkheid.

---

## 10. AI-laag: assistieve intelligentie tegen planlast

AI heeft in Draagvlak precies één opdracht: administratieve last wegnemen zodat tijd naar mensen gaat — leerlingen, starters, teams. Twee ontwerpwetten gelden zonder uitzondering. **Eén: AI assisteert, mensen beslissen.** Elke AI-output is een concept dat pas geldig wordt na menselijke bevestiging; AI beoordeelt nooit een persoon. **Twee: evidence-based of niets.** AI-antwoorden over regelgeving en kaders zijn retrieval-gebaseerd (RAG) met verplichte bronvermelding — geen bron, geen antwoord — en suggesties komen uitsluitend uit gecureerde, onderbouwde bibliotheken (interventietoolkit, professionaliseringscatalogus, eigen beleidsdocumenten), nooit uit vrije modelkennis.

### 10.1 Stoplichtmodel

| Zone | Wat | Voorwaarden |
|---|---|---|
| **Groen** | Samenvatten, structureren en herformuleren van eigen invoer; regelgevings- en beleidsvragen via RAG met bron; vertaling en voorlezen; semantisch zoeken in gecureerde bibliotheken; datagrafieken duiden in mensentaal | Output zichtbaar gelabeld als AI-concept; mens bevestigt |
| **Oranje** | Thema-extractie uit open bevragingsantwoorden (uitsluitend geaggregeerd, boven de n<5-drempel); conceptverslagen op basis van eigen notities of dictaat; conceptsyntheses uit platformdata (zelfevaluaties, impactverslagen) | Human-in-the-loop verplicht; per functie een DPIA-toets; nooit in formele evaluatiedossiers |
| **Rood — nooit** | Scoren, rangschikken of beoordelen van personeelsleden of leerlingen; voorspellende risicoprofielen op individuen; emotieherkenning of sentimentanalyse op individueel niveau; geautomatiseerde besluiten | — |

De rode zone is geen beleidskeuze alleen maar een juridische lijn: emotieherkenning op de werkplek en in onderwijsinstellingen is een verboden praktijk onder de AI Act (art. 5), en AI-invloed op de evaluatie van personen valt in de hoog-risicoklasse die Draagvlak bewust vermijdt. Welbevinden wordt in Draagvlak dan ook uitsluitend gemeten via bewuste zelfrapportage — nooit afgeleid uit gedrag, taalgebruik of biometrie. Signalering (module I) draait op transparante, deterministische drempelregels, niet op machine learning: uitlegbaar voor begeleider, leerling en ouder. Statuuttellers en deadlines (module B) blijven eveneens 100% regelgebaseerd.

### 10.2 Toepassingen per module

| Waar | AI-assistentie (altijd concept, mens bevestigt) | Planlastwinst |
|---|---|---|
| A Strategie | Visietekst → voorstel van SMART-doelenboom; conceptsynthese keep-stop-change-start uit actiedata; "leg deze indicator uit in mensentaal" | Sneller van visie naar meetbaar plan; datageletterdheid in teams |
| B Dossier | Regelgevings-Q&A met bronvermelding op omzendbrieven en decreten ("wat betekent een beoordeling met werkpunten voor deze teller?") | Minder uitzoekwerk; correcte antwoorden met bron |
| C Opdrachten | Conceptcommunicatie bij publicatie van de opdrachtverdeling; teamsynthese van de desiderata-ronde | Snellere, zorgvuldiger communicatie |
| D Aanvangsbegeleiding | Spraak-naar-tekst en structurering van eigen coachingsnotities; conceptagenda voor het volgende gesprek uit eerdere afspraken | Logboek in minuten in plaats van avonduren |
| E Gesprekscyclus (spoor 1) | Dicteer- en structureerhulp voor gespreksverslagen; conceptuitnodiging met agendapunten | De grootste administratiepost van directies fors verlicht |
| E Formeel traject (spoor 2) | Uitsluitend transcriptie-/dicteerhulp; generatieve suggesties uitgeschakeld | Juridische zuiverheid, geen AI-invloed op evaluatie |
| F Waardering | Formuleerhulp bij kudos; conceptsynthese van het jaarlijkse impactverslag uit portfoliodata | Lagere drempel, meer zichtbaarheid |
| G Professionalisering | Semantische matching van aanbod aan doelen en groeivragen (met transparante motivering); samenvatting van PLG-output voor de vitrine | Doelgerichte professionalisering — dé inspectievraag |
| H Welbevinden personeel | Thema-extractie uit open antwoorden, uitsluitend geaggregeerd en boven de n-drempel | Rijke duiding zonder honderden antwoorden manueel te lezen |
| I Welbevinden leerlingen | Vertaling en voorlezen van vragen; geaggregeerde trendduiding voor beleid — géén AI op individuele antwoorden | Toegankelijkheid; beleid, geen labels |
| J Leerlingbegeleiding | Semantisch zoeken in de gecureerde interventietoolkit; conceptverslag MDO uit besluiten en actiepunten | Sneller passende, onderbouwde interventies |
| Dwars | Platform-copilot (RAG op handleiding en eigen configuratie: "hoe start ik een PLG-ruimte?"); vragen in natuurlijke taal op eigen geaggregeerde dashboards | Lagere leercurve, minder supportvragen |

### 10.3 Technische architectuur: de AI-gateway

Alle modules praten met één interne AI-gateway, nooit rechtstreeks met een externe provider. De gateway is **provider-agnostisch**: per tenant (scholengroep) worden API-sleutels geconfigureerd — bring your own key — voor de gewenste dienst: Azure OpenAI in de eigen tenant en regio (aantrekkelijk voor groepen met een Microsoft-omgeving: de data verlaat de eigen cloudomgeving niet), Anthropic, Google of EU-gehoste open modellen. Wisselen van provider vergt configuratie, geen herbouw.

Sleutelbeheer en beheersing: sleutels staan versleuteld in een key vault en bereiken nooit de client; AI-functies zijn per school en per module aan/uit te zetten (feature flags); budgetplafonds en rate limits per tenant; een volledig gebruikslogboek (functie, model, tokens, kostprijs — zonder persoonsinhoud). Vóór elke externe call passeert de invoer een **redactielaag** die namen en identificatoren maskeert waar de taak dat toelaat (dataminimalisatie). Contractueel gelden voor elke provider, als sub-verwerker in de keten (§ 8): verwerking in de EU, geen training op klantdata, geen of minimale retentie, en een verwerkersovereenkomst. Elke output wordt gelogd met model en versie, zichtbaar gelabeld als AI-gegenereerd (AI Act art. 50) en is bewerkbaar vóór bevestiging.

### 10.4 Governance en geletterdheid

Per tenant houdt Draagvlak een **AI-register** bij: welke functies actief zijn, met welk model en welke overeenkomst — exporteerbaar voor de DPO en het overleg. Gebruikers die AI-functies inschakelen doorlopen een korte, verplichte introductie (AI-geletterdheid, AI Act art. 4), opgenomen in het professionaliseringsaanbod van module G. En het bewijs blijft de maatstaf: elke AI-functie heeft een eigen KPI — gemeten tijdswinst tegenover een nulmeting, correctiegraad (hoe vaak de mens de output aanpast), gebruikersfeedback en periodieke kwaliteitssteekproeven. Functies zonder aantoonbare winst gaan uit; keep-stop-change-start geldt ook voor AI.

---

## 11. UX & toegankelijkheid

- **Taakgericht, niet modulegericht:** elk startscherm beantwoordt "wat vraagt vandaag mijn aandacht?" in maximaal één schermlengte; alles daarachter is doorklik. Doel: een directeur beheert de kernflows na één uur introductie (het anti-Appwel-complexiteitscriterium; te toetsen in usability-tests met échte directies en begeleiders).
- **Twee-klikken-regel voor registraties:** een kudo, een logboeknotitie of een gesprek plannen kost nooit meer dan twee klikken plus vrije tekst.
- **WCAG 2.1 AA verplicht, 2.2 AA als doel:** semantische HTML, volledig toetsenbord-bedienbaar, zichtbare focus, contrastminimum 4.5:1, labels en foutmeldingen met correctiesuggestie, geen informatie enkel via kleur, ondertitelde media; jaarlijkse audit volgens WCAG-EM door een externe partij; publieke toegankelijkheidsverklaring met feedbackkanaal (Bestuursdecreet-conform).
- **Meertaligheid en leesbaarheid:** interface NL (uitbreidbaar), leerlingvragen vertaalbaar en voorleesbaar; taalniveau B1 voor alle gebruikersteksten; iconografie consequent.
- **Leeftijdsadequate leerlingschermen:** grote tikdoelen, één vraag per scherm, visuele schalen in het lager onderwijs, neutrale en warme toon, altijd een "ik wil praten"-uitweg.
- **Donkere modus, responsive tot 320px, offline-tolerantie** voor metingen in klassen met zwakke wifi (lokale buffer, latere synchronisatie).

---

## 12. Implementatie & governance (Vier in Balans)

**Fase 0 — Fundament (3-4 maanden).** Co-creatie met 2-3 pilootscholen (directie, beleidsondersteuner, leerlingbegeleider, leraren, starter); DPIA en verwerkersovereenkomst; onderhandeling in de bevoegde lokale comités (aanvangsbegeleiding, gesprekscyclus, bevragingen, professionaliseringsplan raken het sociaal overleg); toegangsmatrix en bewaarregels vastleggen; SSO/SCIM-koppeling met de tenant; validatie-prototype van de kernflows.

**Fase 1 — MVP (schooljaar 1).** Modules A (doelenboom + kwaliteitskalender), B (dossier + tellers + deadline-engine), C (desiderata + opdrachtenpuzzel), D (aanvangsbegeleiding + beoordelingsflow) en E-spoor 1 (gesprekkencyclus). Pilot in 3 scholen vanaf september; groepsbrede uitrol van A/B in het tweede semester. Succescriterium: de volledige TADD-cyclus van dat schooljaar loopt aantoonbaar foutloos en tijdig door het platform.

**Fase 2 — Verdieping (schooljaar 2).** Module E-spoor 2 (formele trajecten), F (waardering/portfolio), G (professionalisering + PLG-ruimtes), H (personeelswelbevinden, samen met de preventiedienst). Train-the-trainer per school (één Draagvlak-coach per team), geen klassikale knoppencursussen maar begeleide echte casussen.

**Fase 3 — Leerlingluik (schooljaar 2-3).** Module I (welbevinden leerlingen, eerst in 2 pilootscholen met ouderinformatieronde) en J (begeleidingsdossier + zorgcontinuüm), daarna groepsbrede uitrol en de beleidslus (welbevindendata → doelenboom).

**Governance.** Stuurgroep op groepsniveau (mandaat, prioritering), productraad met gebruikers per rol (tweemaandelijks), DPO structureel aan tafel, jaarlijkse evaluatie van het platform zélf via keep-stop-change-start — practice what you preach. Vier in Balans bewaakt dat visie (waarom doen we dit), deskundigheid (opleiding en coaching), inhoud (gevulde catalogi, sjablonen, toolkit) en infrastructuur (koppelingen, devices) gelijk op evolueren; techniek zonder de andere drie is de klassieke faalroute van onderwijs-ICT.

---

## 13. Risico's en mitigaties

| Risico | Mitigatie |
|---|---|
| Planlast-paradox: platform wordt registratielast | Twee-klikken-regel; synchronisatie i.p.v. herinvoer; elke registratie levert de invoerder direct iets op; planlastmeting in de pilot (nulmeting vs. na 6 maanden) |
| Vermenging ontwikkeling ↔ beoordeling ondermijnt vertrouwen | Harde technische scheiding (apart dossiertype, aparte rechten), communicatiecharter, sociaal overleg vooraf, audittrail |
| Privacy-incident (zeker leerlingdata) | DPIA vóór livegang, pseudonimisering, n<5-drempels, pentests, incidentprocedure, minimale bewaartermijnen |
| Lage adoptie bij leraren | Waarde-eerst-volgorde (desiderata en visieradar eerst: geven vóór vragen), Draagvlak-coaches, meten van actieve adoptie per rol |
| Regelgeving wijzigt | Parametrisering met ingangsdata; jaarlijkse regelgevingsreview (Edulex-monitoring) als beheerd proces |
| Vendor lock-in-vrees bij besturen | Open exportformaten, data-eigendom contractueel bij het bestuur, exit-clausule met migratieplicht |
| Benchmarks worden afrekencultuur | Standaard geaggregeerd/geanonimiseerd, mediaan + spreiding i.p.v. rangschikking, duiding verplicht bij elke grafiek |
| Signaal zonder opvolging (welbevinden) | Opvolgtermijnen met escalatie, opvolggraad als KPI, hulpvragen kunnen nooit "verdwijnen" |
| AI-output bevat fouten of verkeerde regelgevingsinfo | RAG met verplichte bronvermelding (geen bron = geen antwoord), menselijke bevestiging, correctiegraad-monitoring, periodieke kwaliteitssteekproeven |
| AI-kosten of leveranciersafhankelijkheid lopen op | Provider-agnostische gateway met eigen API-sleutels, budgetplafonds per tenant, functies per school uitschakelbaar, jaarlijkse keep-stop-change-start van elke AI-functie |

---

## 14. Succesindicatoren (na 2 schooljaren, per school)

Strategie: 100% van de acties gekoppeld aan een doel; ≥80% van de doelen minstens éénmaal cyclisch geëvalueerd; doorlichtingsdossier genereerbaar in <1 uur. HR: 100% van de TADD-plichtige beoordelingen tijdig; ≥90% van de personeelsleden minstens één functioneringsgesprek per twee jaar (dekking zichtbaar); alle evaluatoren met geldige opleiding. Cultuur: stijgende trend in ervaren waardering en in deelname aan collegiale visitatie (TALIS-spiegelvragen in de pulse-meting). Leerlingen: respons ≥85% per meting; 100% van de hulpvragen opgevolgd binnen de afgesproken termijn; aantoonbare beleidslus (minstens één strategisch doel gevoed door welbevindendata). Platform: actieve adoptie per rol, tevredenheid gebruikers ≥4/5, planlastmeting neutraal of dalend. AI: per ingeschakelde AI-functie een aantoonbare tijdswinst en dalende correctiegraad; 100% van de AI-output gelabeld en menselijk bevestigd.

---

## 15. Bronnen

**Beleid en inspectie**
- Vlaamse Onderwijsinspectie, *Onderwijsspiegel 2026* — onderwijsinspectie.be; duiding: VRT NWS (01/04/2026), vrt.be/vrtnws/nl/2026/04/01/onderwijsspiegel-2026-bijna-1-op-5-scholen-haalt-lat-niet/; Klasse, *Onderwijsspiegel 2026: 6 reflectievragen*, klasse.be/630474/
- Referentiekader Onderwijskwaliteit (ROK) — onderwijsinspectie.be

**Regelgeving (Edulex, tenzij anders vermeld)**
- Decreet Rechtspositie personeelsleden gemeenschapsonderwijs (27/03/1991) en Decreet Rechtspositie gesubsidieerd onderwijs (27/03/1991)
- Omzendbrief PERS/2007/09, *Functiebeschrijving en evaluatie* — data-onderwijs.vlaanderen.be/edulex/document.aspx?docid=13932
- Omzendbrief PERS/2019/03, *Tijdelijke aanstelling van bepaalde en doorlopende duur* — data-onderwijs.vlaanderen.be/edulex/document.aspx?docid=15412
- Decreet betreffende de leerlingenbegeleiding (27/04/2018) — data-onderwijs.vlaanderen.be/edulex/document.aspx?docid=15236; toelichting: onderwijs.vlaanderen.be (beleid op leerlingenbegeleiding)
- Decreet leersteun (05/05/2023, in werking 01/09/2023)
- Bestuursdecreet (07/12/2018), omzetting richtlijn (EU) 2016/2102 webtoegankelijkheid; EN 301 549 / WCAG 2.1 AA; European Accessibility Act (richtlijn (EU) 2019/882)
- AVG (verordening (EU) 2016/679) en wet van 30/07/2018; AI-verordening (verordening (EU) 2024/1689)
- Welzijnswet (04/08/1996) en Codex over het welzijn op het werk (psychosociale risico's, KB 10/04/2014)

**Onderzoek en kaders**
- OESO/Departement Onderwijs, *TALIS 2018* en *TALIS 2024* (Vlaamse rapporten) — onderwijs.vlaanderen.be/talis; duiding TALIS 2024: Klasse, klasse.be/633788/
- Hattie, J. & Timperley, H. (2007). The Power of Feedback. *Review of Educational Research*, 77(1), 81-112.
- Deci, E. & Ryan, R. — zelfdeterminatietheorie; Vlaamse toepassing o.a. Vansteenkiste (UGent)
- Stoll, L. e.a. (2006). Professional Learning Communities: a review. *Journal of Educational Change*, 7, 221-258; Vescio, V., Ross, D. & Adams, A. (2008). *Teaching and Teacher Education*, 24(1), 80-91.
- Pameijer, N. & van Beukering, T. — *Handelingsgericht werken*
- Kennisnet — *Vier in Balans*-model
- Vlaams Ministerie van Onderwijs en Vorming — richtsnoeren en ondersteuningsmateriaal rond AI in het onderwijs (onderwijs.vlaanderen.be)

**Referentieproduct**
- PXL Appwel — appwel.be / tool.appwel.be; onderzoeksfiche Hogeschool PXL (pxl-research.be/projects/782); screening Onlinehulp-apps (onlinehulp-apps.be/apps-overzicht/appwel); VRT NWS (03/12/2023) over gebruikscijfers

---

*Volgende stap: dit document valideren met een directie, de DPO en het bevoegde overlegcomité, en op basis daarvan het functioneel ontwerp van Fase 0-1 detailleren (wireframes, toegangsmatrix, DPIA-aanzet).*
