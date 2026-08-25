# Simulatielaag — "De Levende School" (module-familie S)

> **Status: concept ter bespreking (augustus 2026).** Nog geen bouwbeslissing.
> Inspiratie: ambient 2D-ruimtes (midnight.city), *Black & White* (hand, krachten,
> wereld die je beleid weerspiegelt), *RollerCoaster Tycoon* (isometrische sim,
> individuele "peeps" met gedachten, schaarse middelen), Game Boy-Pokémon
> (pixel-vibe, tile-wereld) — maar kleurrijker en moderner.

## 1. De kern-these

Niet: "een spelletje bovenop het platform."
Wel: **de wereld ís het dashboard.** Elk beeldelement is een bestaand,
uitlegbaar gegeven uit het platform. Een gedachteballon boven een leraar is
een escalatieniveau; het weer is de staat van je wettelijke verplichtingen;
de hand die een leraar naar een klas sleept, is een vervangingstoewijzing met
audittrail. Wie het spel begrijpt, begrijpt zijn school — en omgekeerd.

Vier redenen waarom dit géén gimmick is:

1. **Begrijpelijkheid.** Een tabel met 31 rijen toont *wat*; een levende school
   toont *hoe het voelt* — waar de druk zit, wie steeds op de speelplaats staat.
2. **Draagvlak.** Op een personeelsvergadering samen naar de school kijken werkt
   anders dan een spreadsheet projecteren. De billijkheidstellers worden zichtbaar
   als *beleving*, niet als beschuldiging.
3. **Snellere handelingen.** Een leraar naar een klas slepen is sneller en
   intuïtiever dan drie dropdowns (dagroosterbeheer — de killer-feature uit het
   marktonderzoek).
4. **Opleiding zonder gevolgen.** Een "vluchtsimulator voor directeurs":
   griepgolf met vier zieken en één vervanger, in zandbakmodus, zonder dat er
   iets echt gebeurt. Voor startende directeurs en voor de pilootsessies.

## 2. De economie bestaat al

Een tycoon heeft schaarse middelen nodig. Die hoeven we niet te verzinnen —
het Vlaamse onderwijs levert ze (zie planning.md):

| Tycoon-concept | Echte tegenhanger |
|---|---|
| Budget | lestijdenpakket, puntenenveloppes, SES-lestijden |
| Personeel inhuren | aanstellingen, opdrachtbreuken, plage-uren, bekwaamheidsbewijzen |
| Noodgevallen | afwezigheden, 10-werkdagenregel, vervangingseenheden, lerarenplatform |
| Bezoekerstevredenheid | gesprekdekking, billijkheid toezichten, verstreken deadlines |
| Seizoenen/kalender | schooljaar, vakanties, examenperiodes, teldatum 1 februari |

In **vrij spel** mag die economie volledig uitgespeeld worden: gebouwen zetten,
klassen splitsen, personeel aanwerven binnen bekwaamheidsbewijzen, plage-uren
uitdelen (en de gevolgen voelen), een inspectiebezoek overleven, groeien van
dorpsschooltje tot campus. De regels zijn echt; de school is verzonnen.

## 3. Ontwerpkeuzes (met aanbeveling)

**K1 — Projectie: dimetrisch isometrisch (herzien).** Eerste voorstel was
top-down met gekantelde camera; de wens "navigeren zoals Diablo" beslecht het
anders: **dimetrische iso-wereld (2:1), klik-om-te-gaan, camera die volgt.**
Diablo's gevoel zit precies in die combinatie — klikken op de vloer, personage
loopt er met pathfinding heen, diepte-gesorteerde sprites, muren die wegvallen.
De Pokémon-charme leeft dan in de *sprite-stijl en het palet*, niet in de
projectie. Kost: iso-art (zie art-bible.md), maar dat is exact wat wél
aanleverbaar is via prompting.

**Navigatiemodel (twee camera's, één wereld):**
- **Godsmodus (RCT/B&W)**: slepen om te pannen, scrollen om te zoomen, klikken
  om te selecteren, krachten via de hand.
- **Bezield (Diablo)**: klik op de vloer = die persoon loopt erheen, camera
  volgt, de rest van de school leeft door om je heen.

**K2 — Sprites: procedureel, niet getekend.** Avatars worden bij het laden
*gegenereerd*: gelaagde pixeldelen (lichaam, hoofd, haar, kleding, accessoire)
met palette-swaps, 16×24 px, 4 richtingen × 3 frames. Voordelen: geen
asset-pijplijn, oneindige variatie, mini-payload (past in een CSP-strikte
webpagina), en massa-generatie is gratis. ~60-80 unieke uiterlijken volstaan
visueel voor 440 agents; bitmaps worden gecachet op uiterlijk-hash.

**K3 — Identiteit zonder extra data.** Het uiterlijk van een persoon is een
*deterministische functie* van `hash(persoon_id + tenant-salt)`. Zelfde persoon
= altijd zelfde avatar, over sessies en toestellen heen, zonder één byte extra
persoonsgegeven op te slaan. Wie zijn avatar zelf wil aanpassen, kan dat
(opt-in, zelf beheerd, uitzetbaar → generieke figuur).

**K4 — Simulatiekern als puur pakket.** `packages/simkern`: agents, schema's,
pathfinding, klok — puur, zaadgestuurd, deterministisch en unit-getest, zonder
I/O. Exact de discipline van `telregels` en `planregels`. Renderer apart in
`apps/spel`. Zelfde dag + zelfde zaad = zelfde film: reproduceerbaar, dus
demonstreerbaar en debugbaar.

**K5 — Drie modi, met één ijzeren principe: hoe wilder de modus, hoe fictiever
de data.**
1. **Spiegel** (dagelijks gebruik, directeur): read-only weergave van de echte
   dag. Niets schrijft, tenzij een expliciete handeling — via dezelfde API,
   rolchecks en audittrail als de gewone schermen.
2. **Zandbak** (wat-als op echte cijfers): griepgolf, vier zieken, één
   vervanger. Rekent met de echte school, schrijft nooit. Voor beslissingen
   voorbereiden en voor opleiding.
3. **Vrij spel — "Schooltycoon"** (volledig los): fictieve school, fictief
   personeel, echte Vlaamse regels als spelregels. Bouwen, aanwerven,
   lestijdenpakket verdelen, crisissen overleven, seizoenen doorlopen. **Geen
   enkel persoonsgegeven**, dus ook geen enkele juridische rem: hier mag het
   spel volledig spel zijn. Dit is tegelijk de veiligste demo-modus voor
   beurzen, opleidingen en verkoop.

**K6 — Krachten die echte handelingen zijn.** De B&W-hand mag nooit "straffen".
De krachten zijn organisatorisch: *Bezielen* (perspectiefwissel), *Verplaatsen*
(vervanging toewijzen), *Bijeenroepen* (gesprek plannen), *Onthullen* (toon
escalaties/gouden draad), *Vooruitspoelen* (prognose: hoe staat de school er in
juni voor?), *Terugspoelen* (audittrail als tijdlijn). Elke kracht die schrijft,
vraagt bevestiging en logt.

**K7 — Klimaat in plaats van alignment.** B&W's goed/kwaad-morphing wordt hier
**schoolklimaat**, en uitsluitend gevoed door harde, uitlegbare, *geaggregeerde*
feiten: open/verstreken deadlines, spreiding toezichtbeurten, gesprekdekking,
niet-ingevulde vervangingen. Goed beleid → zon, kleur, bloeiende speelplaats.
Signalen stapelen → grijzer, regen. **Nooit** per individu, **nooit** afgeleid
uit emotie of gedrag (AI Act art. 5 verbiedt emotieherkenning op de werkplek).

**K8 — Art via prompting: een *kit*, geen sprite sheets.** Beeldgeneratoren
leveren onbetrouwbare sprite sheets maar uitstekende *losse* assets. Daarom:
per asset één afbeelding prompten (één tegel, één prop, één personagepose),
op vaste specificaties (2:1 dimetrie, vaste lichtrichting, vast palet,
transparante achtergrond), en de sheets zelf samenstellen. De massa-avatars
blijven procedureel (K2) — prompted art is voor de *herkenbare* dingen:
gebouwdelen, meubels, speelplaats, decor, en een handvol hero-personages.
Volledige specificatie en kant-en-klare prompts: `art-bible.md`.

## 4. Technische realisatie

**Lagen.**
1. `GET /api/v1/simulatie/wereld?school=…&datum=…` — read-model dat de wereld
   samenstelt: rolaantallen, klasgroepen, lokalen, kalender, toezichtbeurten,
   open deadlines met escalatieniveau. Alles door RLS + rolchecks; standaard
   gepseudonimiseerd, namen alleen waar de kijker ze sowieso al mag zien.
2. `packages/simkern` — agents + schema's + klok, puur en deterministisch.
3. `apps/spel` — Canvas2D-renderer (later PixiJS/WebGL indien nodig).

**Prestatiebudget.** 440 agents (400 leerlingen + 40 personeel) is klein:
- simulatie 20 Hz vast, rendering 60 Hz met interpolatie;
- **flow fields** per bestemming i.p.v. 440× A* (speelplaats, refter, lokaal);
- sprite-atlas + viewport-culling; Canvas2D haalt dit ruim, WebGL pas bij >2000.

**Tijd.** Eén schoolklok (0,5×–60×, scrubbaar) gevoed door kalender en rooster:
lesuren, speeltijden, middagpauze, toezichtmomenten. Vakantiedag = lege school.

**Wereldgeneratie.** Uit de schoolgegevens een plausibele plattegrond genereren
(aantal klassen → lokalen, gangen, speelplaats, refter), daarna handmatig
bij te schuiven en op te slaan. "Genereer mijn school" als eerste indruk.

## 5. Wat we al hebben — en wat ontbreekt

**Aanwezig:** personen, aanstellingen (ambt, statuut), afwezigheden, deadlines
met escalatieniveau, beoordelingen, kalenderperiodes, toezichtsoorten en
-beurten, regelparameters. Genoeg voor een geloofwaardige personeelssimulatie.

**Ontbreekt:** leerlingen (bewust buiten scope — Discimus-terrein), lokalen en
plattegrond, klasgroepen, uurrooster (P4/P5). Daarom in de eerste fase:
leerlingen als **fictieve, geaggregeerde massa** op basis van een ingevoerd
aantal per klas. Niet identificeerbaar, geen persoonsgegevens — en meteen de
juiste keuze qua privacy.

## 6. Randvoorwaarden (niet onderhandelbaar)

- **Geen surveillance.** De simulatie toont geroosterde/administratieve feiten,
  nooit werkelijke verplaatsingen of aanwezigheid in real time.
- **Geen individuele scores, geen emotie-inschatting** (AI Act art. 5).
- **Opt-out per persoon** op het eigen avatar-uiterlijk; generieke figuur blijft.
- **Sociaal overleg vóór livegang**: dit raakt beleving van werk en is een
  verwerking — DPIA-addendum + agendapunt lokaal comité. Gamification van
  collega's kan als vernederend ervaren worden; het ontwerp moet aantoonbaar
  respectvol zijn (dat is precies waarom K6 en K7 zo streng staan).
- **Planlast mag niet stijgen.** Het spel is een extra bril op bestaande data,
  nooit een extra invoerscherm.

## 7. Fasering

| Fase | Levert | Kern |
|---|---|---|
| **S0** | concept + ADR + DPIA-addendum + art-direction-spike | beslissing en kader |
| **S1** | **Levende plattegrond** (read-only): één schooldag, echte aantallen, procedurele avatars, klok-scrubber | bewijst de vibe én de architectuur |
| **S2** | **Signalen & klimaat**: gedachteballonnen uit echte deadlines/toezichten, weer uit geaggregeerde indicatoren | de wereld ís het dashboard |
| **S3** | **Bezieling**: door de ogen van een rol, met exact de rechten van die rol | perspectief als privacy-veilige mechaniek |
| **S4** | **Krachten**: slepen = vervangen, bijeenroepen = gesprek plannen; zandbak voor wat-als | echte handelingen, met audit |
| **S5** | **Ambient/meerspeler** (optioneel, opt-in): collega's zichtbaar in de ruimte | midnight.city-gevoel |

**S1-spike: gebouwd** — zie [`apps/spel/`](../../apps/spel/). Isometrische
wereld, ~240 agents met dagritme, procedurele avatars, A*-pathfinding,
bezieling met klik-om-te-lopen, krachten, drie modi en klimaatweer. 60 fps in
Canvas2D. Bevestigt de architectuur uit K1-K8 vóór er productiecode aan hangt.

**Oorspronkelijke omschrijving:** een zelfstandige webpagina met de
procedurele avatargenerator, een gegenereerde schoolplattegrond, ~200 agents met
dagschema uit de kalender, en de klok-scrubber — op fictieve maar realistisch
gevormde cijfers. Doel: binnen één iteratie zien of de vibe klopt, vóór er
één regel productiecode aan vasthangt.
