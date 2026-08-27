# Welzijn & bevragingen — functioneel ontwerp module-familie W

> **Status: ontwerp op basis van vier onderzoekssporen + adversariële controle
> (augustus 2026).** Bronnenkernen in [`../onderzoek/welzijn/`](../onderzoek/welzijn/README.md).
> Zelfde ⚠-regime als de telregels en planning: elke juridische kwalificatie
> hieronder is desk research en moet vóór livegang langs een Belgische
> arbeidsrecht- én gegevensbeschermingsadvocaat, de koepel-DPO's en het
> bevoegde overlegorgaan. Vier pijlers zijn expliciet ⚠ TE VALIDEREN:
> CAO 81/deconnectie in onderwijs, de art. 9-kwalificatie van
> belevingsvragen, de grondslag van het leerlingenluik, en de licenties op
> bestaande itemsets (S-ISW, COPSOQ).

## 1. Doel en positionering

De directeur bereikt zijn personeel gericht — en later bereikt de leerkracht
zijn klasgroep — met bevragingen die meteen beantwoord kunnen worden, over
welzijn én over alle andere thema's van de school. Dat is de productwens, en
ze is haalbaar zodra één onderscheid glashelder is:

**"Gericht" slaat op de heenweg, niet op de terugweg.** Gericht uitnodigen
van het juiste individu mag altijd — het systeem kent identiteiten, rollen en
roosters. Het verschil zit in wat er terugkomt: bij praktische vragen het
antwoord op naam, bij belevingsvragen uitsluitend het groepsbeeld. En één
eerlijke uitzondering: individuele welzijnszorg is een gesprek, geen
formulier — "gaat het met je?" aan één persoon hoort in de gesprekscyclus of
bij de vertrouwenspersoon, nooit in een bevragingsmotor.

**De beslisregel (één zin):** een feit, een beschikbaarheid of een keuze →
op naam; een beleving, een oordeel of een relatie → vertrouwelijk-geaggregeerd.

## 2. Wat het onderzoek leert (samengevat)

**De markt.** Geen enkel welzijnsplatform is gebouwd voor teams van 8-25;
de anonimiteitsdrempels van de sector (5-10 per groep) maken uitsplitsing in
een Vlaamse basisschool onmogelijk, en de prijsmodellen (per medewerker, met
minima) sluiten scholen uit. Het bewezen prijspunt voor scholen is per
school per jaar (Welbee, ~£250). Alle Vlaamse instrumenten stoppen bij het
rapport: geen cyclus, geen opvolging. En het sterkste marktsignaal is een
faalvoorbeeld: de gratis, door de inspectie gemaakte planlastcalculator
haalt 12,4% adoptie — een losstaande tool wordt niet gebruikt, hoe goed ook.
Welzijnsmeting moet zitten wáár de directeur al werkt. (⚠ cijfers via
secundaire bronnen.)

**Survey fatigue bestaat niet — lack-of-action fatigue wel.** De nummer één
reden waarom bevragingen doodbloeden is dat er niets met de resultaten
gebeurt. De terugkoppellus is dus geen feature maar een lanceervoorwaarde.

**Juridisch.** Welzijnsantwoorden zijn (mentale) gezondheidsgegevens of
liggen er dicht tegen (AVG art. 9, ruim uitgelegd); toestemming van een
werknemer is geen bruikbare grondslag (gezagsverhouding); individuele
signalen horen bij de vertrouwenspersoon/preventieadviseur (beroepsgeheim),
nooit bij de directeur; de AI Act verbiedt emotie-afleiding uit
(gedrags)biometrie op de werkplek en op school absoluut — tot en met
typritme en invulsnelheid, die we daarom zelfs niet verzamelen. "Anoniem"
mag alleen als de architectuur het waarmaakt; anders heet het
"vertrouwelijk". Voor leerlingen: de school signaleert, het CLB
diagnosticeert; vastleggen doe je handelingen, geen toestanden.

**Het kanaal.** Technisch is een Chrome-extensie goed haalbaar (MV3, stille
push, force-install per organisatie-eenheid zoals elke beheerde
schoolomgeving al kent), maar de juiste volgorde is: eerst de PWA/webapp —
die is in een beheerde omgeving even uitrolbaar — en daarna de extensie als
dunne schil (side panel naast Smartschool/Classroom + badge + stille push).
Voor leerlingen bewust géén force-geïnstalleerde extensie (monitoring-
perceptie): dezelfde bevragingsmotor, ander kanaal (link/PWA).

## 3. Ontwerpbeslissingen W1-W13

**W1 — Twee producten in één motor, gescheiden door een onomkeerbare
typekeuze.** "Vraag aan personen" (op naam, klasse A) en "Teambevraging"
(vertrouwelijk-geaggregeerd, klasse B). Klasse C (gezondheid, klinische
schalen) bestaat niet in v1 en is nooit aanmaakbaar door schoolrollen. Geen
"anoniem?"-vinkje: de typekeuze komt eerst, is onomkeerbaar, en bepaalt
daarna alles — de beschikbare vragenbank-subset (technisch bindend), de
vormtaal, de rapportvorm en het kanaalgedrag. Een belevingsvraag in een
op-naam-bevraging is geen waarschuwing maar een blokkade.

**W2 — De vragenbank als regelboek.** Elke vraag draagt een technisch
bindende classificatie (A: feit/keuze/beschikbaarheid · B: beleving/oordeel
· C: gezondheid), een bron en een ingangsdatum; wijzigen volgt het
vier-ogen-principe van de regelparameters. Gecureerde, gevalideerde sets
(FOD-vragenlijst/5 A's, ABC/zelfdeterminatie, SERV-werkbaarheidsindicatoren,
inspectieconstructen) komen er pas ná licentiecheck (⚠). De classificatie
van de vraag beslist, niet de titel van de bevraging: "hoe loopt de nieuwe
refterregeling?" vraagt een oordeel → B.

**W3 — Architecturale scheiding uitnodiging/antwoord.** De uitnodigingsdienst
kent identiteiten (gerichte targeting, herinneringen, responsgraad); de
antwoordopslag kent ze bij klasse B niet: geen respondent-id, geen IP,
tijdstempels op daggranulariteit. Herinneren doet het systeem; geen mens
ziet wie deelnam. De UI zegt "vertrouwelijk", nooit "anoniem" — tenzij het
dat aantoonbaar is. De één-persoon-één-antwoord-garantie zonder
herleidbaarheid is een expliciete architectuurspike vóór de bouw van klasse B.

**W4 — Drempels en suppressie als testcontract.** n ≥ 5 hard, overal;
n ≥ 10 voor vrije tekst in klasse B. De drempel geldt per gerapporteerde
cel, ná elke filter, met suppressie van afgeleide cellen (wie "hele school"
en "iedereen behalve team X" kan zien, kent team X). Configureerbaar
omhoog, technisch onmogelijk omlaag. Dit is een rekenmachine en krijgt
hetzelfde regime als de telregels: puur pakket, gedocumenteerde testcases.
Plus de kleine-school-modus: onder de drempel schakelt het rapport expliciet
en zichtbaar naar scholengemeenschapsniveau of een langer meetvenster —
nooit stilletjes niets tonen.

**W5 — Geen realtime voor teambevragingen.** Het resultaat verschijnt pas na
sluiting van het venster en boven de drempel. Onmiddellijkheid is voor de
respondent (invullen in twee minuten vanuit de melding), niet voor de
kijker: live meekijken terwijl één iemand invult, breekt de vertrouwelijkheid
zonder één regel data.

**W6 — "Wie ziet wat" als eerste-klas-scherm.** Vóór vraag 1 ziet elke
respondent één scherm: bij op naam — wie het antwoord ontvangt (naam); bij
vertrouwelijk — "je antwoord wordt alleen getoond als deel van een groep van
minstens N; jouw groep telt nu X genodigden; onder N ziet niemand iets". De
bestuurder ziet vóór lancering een verplichte preview van wat hij straks te
zien krijgt. In de gemengde inbox draagt elk item het typeverschil in kop,
kleur en icoon. "Liever niet zeggen" is overal een geteld antwoord.

**W7 — De terugkoppellus is een lanceervoorwaarde.** Een teambevraging kan
pas gelanceerd worden als het opvolgpad is ingevuld: wie bespreekt het
resultaat, wanneer, en waar landt de actie. Resultaten en gekoppelde acties
zijn zichtbaar voor de respondenten. Het rapport suggereert acties, de mens
beslist — suggestie-niet-besluit, zoals overal in Draagvlak.

**W8 — Het jaaractieplan als deadline-anker, met een muur naar
beslissingsstromen.** Het overlegorgaan-object (generiek per net: CPBW /
basiscomité / HOC / vakbondsafvaardiging / rechtstreeks personeel) is
verplicht geconfigureerd vóór de eerste teambevraging, mét DPIA-bevestiging.
Het Comité-pakket (export op het juiste aggregatieniveau + adviesregistratie)
en de 31 oktober-deadline van het jaaractieplan lopen mee in de bestaande
deadline-engine. Tegelijk hard: welzijnsdata is technisch onbereikbaar
vanuit TADD-, evaluatie- en dossierflows — de deadline-analogie is ritme,
geen datakoppeling.

**W9 — Individueel welzijn = gesprek, niet formulier.** De vragenbank
blokkeert welzijnsvragen op naam. Op elk teambevragingsscherm staat een
doorverwijsblok (vertrouwenspersoon, preventieadviseur psychosociale
aspecten, hulplijnen); de "ik wil hierover praten"-knop is zelf-geïnitieerd,
bereikt uitsluitend de vertrouwenspersoon/PAPS en staat buiten elke
rapportagestroom.

**W10 — Kanaal: PWA eerst, extensie als dunne schil erop.** Eén inbox-API.
De PWA is het product; de extensie voegt alleen het side panel, de badge en
stille push toe. Geen content scripts, exact één host permission, geen
telemetrie, en een architecturale invariant: geen input-timing, toetsaanslag-
of muisdata naar de server — óók niet voor UX of fraudedetectie (AI Act
art. 5.1.f verbiedt gedragsbiometrische emotie-afleiding; wij verzamelen de
grondstof niet eens). Vragenlijsten zijn server-data (JSON-schema), zodat
een nieuwe bevraging nooit op een storereview wacht. Het kanaal is generiek:
het draagt module-objecten (een invalvraag is een P3-handeling met
audittrail; een bevraging een W-object) — geen tweede planningslogica in de
bevragingsmotor.

**W11 — Uitrolregime met twee snelheden.** Force-install van het kanaal kan,
maar pas na het informatie- en overlegtraject (CAO 39-patroon: drie maanden,
⚠ toepasselijkheid per net te valideren) en met een publiek manifest plus
permissie-uitleg in gewone taal ("deze extensie kan niet zien welke websites
je bezoekt — er zijn geen content scripts"). Alles wat welzijn is, blijft
daarbinnen altijd overslaanbaar en wegklikbaar, met stiltevensters (avond,
weekend, vakantie, examens). Leerlingen bereiken bevragingen via link/PWA in
hun bestaande omgeving, nooit via een force-geïnstalleerde extensie.

**W12 — Leesbevestiging en respons-tracking uitsluitend bij klasse A.** Bij
op-naam-vragen is "gezien/beantwoord" een feature met audittrail; bij
teambevragingen ziet niemand deelname — alleen een responsgraad die zelf
boven de drempel ligt. Dat houdt het kanaal uit CAO 81-territorium (⚠) en
maakt het typeverschil ook aan bestuurderszijde voelbaar.

**W13 — Leerlingenluik: klasfoto, geen kinddossier.** Standaard is het
anonieme klimaatbeeld: strikt geaggregeerd per klas/school, de
inspectieconstructen als niet-klinisch anker (geen SDQ of andere
psychopathologie-screeners), rapport na sluiting, geen uitsplitsing binnen
de klas, geen vrije tekst naar de klasleraar, geen automatische signalering
per leerling. Zelfrapportage vanaf ±8 jaar; geen smiley-schalen bij kleuters
(validiteit niet ondersteund). De permanente, zelf-geïnitieerde "ik wil
praten"-knop naar het zorgteam is de enige individuele route — wie moet
kunnen escaleren, belooft geen anonimiteit, en dat staat er dan vooraf.
Individuele longitudinale opvolging komt er pas na extern advies over de
dunne art. 9-basis, en registreert dan handelingen ("gesprek gevoerd,
doorverwezen"), geen toestanden ("scoort 2/5 op somberheid").

## 4. Wat nooit

Klasse C aanmaakbaar door schoolrollen · welzijnsvragen op naam ·
individuele welzijnsdashboards of longitudinale psychische profielen ·
automatische risicoscores of at-risk-vlaggen · sentimentanalyse op vrije
tekst · input-timing, muis- of gedragsbiometrie (verzamelen al niet) ·
suïcide-items in anonieme bevragingen · welzijnsdata in TADD, evaluatie of
tucht · anonieme tweewegs-dialoog (een terugkanaal naar één respondent ís
herleidbaarheid) · deelnemerslijsten bij vertrouwelijke bevragingen ·
realtime mood-tracking in kleine teams · ranking of gamification op welzijn ·
force-geïnstalleerde extensie voor leerlingen · telemetrie in extensie of
leerlingenluik · "anoniem" als etiket op iets dat pseudoniem is.

## 5. Fasering

| Fase | Wat | Voorwaarde |
|---|---|---|
| **W0** | Vragenbank + bindende classificatie, overlegorgaan-object, DPIA-bouwpakket; extern juridisch advies op de vier ⚠-pijlers; architectuurspike één-antwoord-zonder-herleidbaarheid; kanaalrealiteit valideren bij de eerste prospects (leeft het lager onderwijs überhaupt in een beheerde browser?) | — |
| **W1** | **Klasse A via PWA/API**: op-naam praktische vragen, gekoppeld aan wat er al is — de invalvraag uit P3, beschikbaarheidsvragen, leesbevestiging van roosterpublicaties, datumkeuzes. Nul art. 9-risico, directe dagelijkse waarde; bewijst kanaal, inbox en push vóór er iets gevoeligs doorheen gaat | W0-fundament |
| **W2** | **Teambevraging personeel (klasse B)**: drempels + suppressie als testcontract, rapport-na-sluiting, Comité-pakket + JAP-export, terugkoppellus als lanceervoorwaarde. Piloot in een school of scholengemeenschap comfortabel boven de drempels | juridisch advies W0 |
| **W3** | **De extensie**: dunne schil op de bewezen PWA (side panel, badge, stille push), eerst alleen personeel, uitrol volgens het overlegtraject | W1 bewezen |
| **W4** | **Leerlingen, anonieme klasfoto** via link/PWA, praatknop naar het zorgteam, toestemmings-/opt-out-beheer als datamodel-object | extern advies + bijgestelde blauwdruk-module I |
| Later | Scholengemeenschaps-benchmark tegen SERV/TALIS; partnerschap met een externe preventiedienst als route naar klasse C; directeursmeting op scholengemeenschapsniveau; ouderbevragingen (eerst rechtsgrondanalyse) | per geval |

## 6. Testcontract W (aanzet — casussen bij de bouw van elke fase)

| # | Casus | Verwacht |
|---|---|---|
| WA1 | Directeur stelt invalvraag aan drie personen | drie op-naam-items in drie inboxen; antwoorden op naam terug; audittrail; leesbevestiging zichtbaar |
| WA2 | Belevingsvraag toegevoegd aan een op-naam-bevraging | geblokkeerd met uitleg — classificatie beslist, niet de titel |
| WB1 | Teambevraging, 12 genodigden, 11 antwoorden | rapport toont geaggregeerd; geen deelnemerslijst, alleen responsgraad |
| WB2 | Zelfde bevraging, filter die een cel van 4 oplevert | cel onderdrukt mét uitleg; ook de afgeleide cel (totaal minus 4) onderdrukt |
| WB3 | 8 genodigden, 6 antwoorden (onder drempel 5? nee: cel = 6) — maar uitsplitsing man/vrouw 4/2 | uitsplitsing volledig onderdrukt; hoofdcijfer zichtbaar |
| WB4 | Kleine school: teamrapport onder drempel | expliciete kleine-school-modus: voorstel scholengemeenschapsniveau of langer venster, nooit stil niets |
| WB5 | Rapport opvragen vóór sluiting | geweigerd — geen realtime voor klasse B |
| WB6 | Lancering zonder opvolgpad of zonder geconfigureerd overlegorgaan | geweigerd met uitleg (terugkoppellus en W8 zijn lanceervoorwaarden) |

## 7. Relatie met de blauwdruk

Module-familie W is de uitwerking van blauwdruk-modules H (welbevinden
personeel & bevragingen) en I (welbevinden leerlingen). Twee
blauwdrukpassages zijn op basis van het juridisch onderzoek gecorrigeerd:
de grondslag "uitdrukkelijke toestemming (9.2.a)" voor het vertrouwelijke
personeelskanaal (werknemerstoestemming is niet vrij; het kanaal loopt via
de vertrouwenspersoon/PAPS onder hun wettelijk statuut), en de beloften
"individueel verloop" en "automatische signalering bij opvallende dalingen"
in module I (strijdig met het verbod op automatische risicovlaggen en
longitudinale psychische profielen; vervangen door het klasfoto-model W13).
