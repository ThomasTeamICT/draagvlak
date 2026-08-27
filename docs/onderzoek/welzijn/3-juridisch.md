# JURIDISCH MEMO — WELZIJNSBEVRAGINGEN (agent 3, kern)
⚠ Alle bronnen ongeverifieerd (egress geblokkeerd); artikelnummers vóór gebruik verifiëren. Uitsluitend Belgisch recht.

## 1. AVG
- **Art. 9 ruim**: mentale gezondheid incl.; ook onrechtstreekse conclusies (HvJ, ruim). Driedeling vragenbank:
  - **Klasse A** organisatorisch/praktisch → gewone gegevens, art. 6 volstaat.
  - **Klasse B** werkbeleving (werkdruk, steun) → grijze zone, behandel als art. 9-nabij.
  - **Klasse C** gezondheid (symptomen, slaap, uitputting; klinische schalen UBOS/MBI, WHO-5, PHQ-9, GAD-7) → onmiskenbaar art. 9.
  → **verplicht, technisch bindend classificatieveld A/B/C op elke vraag**; klasse C voor een directeur niet aanmaakbaar.
  ⚠ Detectie/voorspelling burn-out kan MEDISCH HULPMIDDEL worden (Vo. 2017/745, CE) — nooit score als diagnose presenteren.
- **Toestemming werknemer is GEEN bruikbare grondslag** (WP249, EDPB 05/2020, GBA: gezagsverhouding; art. 9.2.a nooit "vrij").
- Grondslagen: wettelijke PSR-analyse → 6.1.c (Welzijnswet art. 32/2; art. 9.2.b ⚠ betwist); aanvullende klimaatmeting → 6.1.f + LIA, dus GEEN klasse C; praktisch → 6.1.f/6.1.e; individuele hulpvraag → hoort NIET in het platform (PAPS/vertrouwenspersoon, 9.2.h + beroepsgeheim).
- **Kernontwerpbeslissing: vermijd art. 9 volledig** — klasse C alleen (1) écht anoniem of (2) via externe preventiedienst als verwerkingsverantwoordelijke. Werkgever ziet nooit individuele gezondheidsantwoorden.
- **Anoniem vs. pseudoniem**: overweging 26; EDPB 01/2025: pseudoniem = persoonsgegeven. Wat pseudoniem maakt: unieke tokens, IP/user-agent, timestamps (team van 8!), respondent-tracking voor herinneringen, open tekst, demografische filters, longitudinale koppeling. → scheid uitnodigingsdienst (kent identiteiten) van antwoordenopslag (kent ze niet); IP weg; timestamps afronden op dag; niemand ziet wie deelnam (alleen responsgraad); UI zegt "vertrouwelijk" als het pseudoniem is.
- **Drempels** (sectorpraktijk, geen wet): n≥5 hard overal; n≥10 klasse B/C en alle vrije tekst; NA elke filter; differencing-bescherming (suppressie van afgeleide cellen); configureerbaar omhoog, technisch onmogelijk omlaag; vooraf tonen aan respondent: "jouw groep telt n personen; onder 5 wordt niets getoond".

## 2. Welzijnswet + codex
- Verplichte PSR-risicoanalyse (art. 32/2), vijf A's, via dynamisch risicobeheersingssysteem, globaal preventieplan + jaaractieplan; maatregelen NA advies van het Comité.
- Eigen bevragingen MOGEN naast de wettelijke analyse (FOD-instrumenten bestaan), maar: vervangen de a-priori-analyse niet automatisch; PAPS-advies vereist; 1/3 van werknemersvertegenwoordigers kan analyse afdwingen. → positioneer als AANVULLEND; veld "ingezet als wettelijke risicoanalyse? ja/nee" met checklist; **"Comité-pakket"** (export op juist aggregatieniveau + adviesregistratie).
- **Overlegorgaan verschilt per net**: vrij onderwijs CPBW (≥50)/LOC; GO! basiscomité; officieel HOC; ontstentenis → vakbondsafvaardiging → personeel. → generiek "overlegorgaan"-object, verplicht geconfigureerd vóór klasse B/C-bevraging.
- **PAPS-beroepsgeheim = scherpste grens**: individuele signalen bij de directeur laten landen = de facto PAPS-rol overnemen zonder beroepsgeheim/procedure/represaillebescherming. → geen "meld je probleem"-knop naar directeur; doorverwijsblok (vertrouwenspersoon, PAPS, informele/formele interventie) op elk gevoelig scherm; vrije tekst klasse B/C niet ongefilterd naar werkgever.

## 3. AI Act art. 5.1.f (sinds 2/2/2025, absoluut verbod)
- Verbod emotie-afleiding op werkplek + onderwijs, ALLEEN op basis van biometrie (art. 3.39+3.34; gedragsbiometrie incl. **toetsaanslagritme**). Commissie-richtsnoeren C(2025) 884: sentimentanalyse op tekst valt erbuiten; keystrokes erbinnen.
- **Mag**: zelfrapportage (schaal, smiley, tekst als tekst) — fundament van het product.
- **Mag net, maar afraden**: sentimentanalyse op vrije tekst (art. 9-afgeleiden) → niet doen.
- **Nooit**: webcam/gezicht, stem, typritme/muis/scroll/invulsnelheid ("stress uit aarzelpatronen" = verleidelijke feature die recht in het verbod loopt), aandachtsmeting, wearables. → **architecturale invariant: extensie/webapp sturen geen input-timing of muisdata naar de server**, ook niet voor UX/fraude.
- Bijlage III: welzijnsscore die HR-beslissing of leerlingenoriëntering voedt → hoogrisico (vanaf 2/8/2026) → welzijnsdata structureel gescheiden van elke beslissingsstroom.

## 4. Leerlingen
- **13-jaargrens geldt alleen bij toestemming × dienst van de informatiemaatschappij** — meestal de verkeerde toets. School = verwerkingsverantwoordelijke op decretale opdracht (decreet leerlingenbegeleiding 27/4/2018, domein psychisch en sociaal functioneren); Draagvlak = verwerker (art. 28).
- ⚠ Art. 9-basis voor schoolinterne welbevindenregistratie is DUN (decreet regelt CLB-dossier expliciet, schoolregistratie niet) — zwakste punt; extern advies. → **klasgroep-/schoolbevragingen welbevinden principieel écht anoniem**; individuele opvolging hoort bij zorgco/CLB.
- Toestemming toch nodig? Opt-out-model: beide ouders geïnformeerd, één weigering volstaat, kind kan altijd zelf weigeren/overslaan; deelnemerstatus als datamodel-object.
- **Bekwame minderjarige** (decreet rechtspositie 2004): vermoeden vanaf 12 → bekwaamheidsvlag; 12+ zeggenschap over wat ouders zien. ⚠ netafhankelijk, koepel-DPO's.
- School registreren over individueel psychisch welbevinden: **handelingen vastleggen, geen toestanden** ("gesprek gevoerd, doorverwezen" — niet "scoort 2/5 somberheid"); inzagerecht = productvereiste; CLB heeft beroepsgeheim, schoolpersoneel alleen ambtsgeheim.
- **Suïcidale gedachten**: geen algemene meldplicht, wel handelingsplicht (art. 422bis Sw.); VLESP-richtlijn; kernprincipe **"stel geen vraag waarvan je het antwoord niet opvangt"**. Twee configuraties: **A anoniem klimaatbeeld** (geen acute items, hulplijnen permanent) of **B begeleidingsinstrument niet-anoniem** (vooraf gezegd, benoemde opvolger, getoetst protocol, geconfigureerd vóór activatie). **Anonimiteit en risicodetectie sluiten elkaar uit.** Altijd zichtbaar: 1813, Awel 102, CLB, JAC, 112. Altijd een zelfgestuurde "ik wil hier met iemand over praten"-knop.
- **Leerkracht bevraagt eigen klas = hoogste risico**: beoordelingsrelatie; klassen klein; vrije tekst herleidbaar aan stem. → volledig geaggregeerd zonder uitsplitsing binnen de klas; geen vrije tekst (of alleen naar zorgco); nooit koppeling met evaluatie; resultaten pas na sluiting en voldoende respons, niet realtime.

## 5. DPIA
- Beide modules halen ruim de drempel (gevoelige gegevens + kwetsbare betrokkenen + systematische monitoring + evaluatie). DPIA-plicht ligt bij de SCHOOL; → lever een **DPIA-bouwpakket** (model-DPIA per module, registerfiche, art. 28-overeenkomst, TOM's, subverwerkers, modelparagrafen) + eigen leveranciers-DPIA. VTC verwacht DPIA bij nieuwe schooltools. Hoog restrisico → art. 36 voorafgaande raadpleging → ontwerp zodat je daar niet komt.

## 6. Extensiekanaal
- **ePrivacy/art. 129 WEC**: opslag op eindapparatuur alleen strikt noodzakelijk of met toestemming; toestemming in gezagsverhouding niet vrij → **geen analytics/telemetrie in de extensie, punt**; documenteer per storage-sleutel waarom noodzakelijk.
- **CAO 81** (privésector = vrij onderwijs ⚠): extensie die alleen pusht en niets over surfgedrag registreert = geen controlesysteem; zodra URL's/tabs/actieve tijd/"melding gezien" gelogd → wél, met procedureplicht. → strikt eenrichtings; geen tabs/history; manifest publiceren; open source overwegen.
- **CAO 39**: ≥50 werknemers + belangrijke collectieve gevolgen → 3 maanden vooraf schriftelijke info + overleg → uitrolkalender met 3-maandenfase + informatiedocument.
- Recht op deconnectie ⚠ → geen push buiten schooluren; stiltevensters (vakanties, examens); geen dwingende UX; alles overslaanbaar; "liever niet zeggen" als geteld antwoord; kindvriendelijke transparantie (art. 12).

## HARDE REGELS H1-H20 (samengevat)
H1 nooit emotie-afleiding uit (gedrags)biometrie, zelfs niet verzamelen · H2 nooit individuele antwoorden bij directeur/leerkracht uit "anonieme" bevraging · H3 nooit "anoniem" noemen wat pseudoniem is · H4 nooit onder drempel tonen, ook niet na filter/differencing · H5 nooit welzijn koppelen aan beslissingsstromen (evaluatie/TADD/rapport/tucht) · H6 nooit werknemerstoestemming als grondslag in de UI · H7 nooit PAPS/vertrouwenspersoon-kanaal omzeilen · H8 nooit klinische schalen als HR-tool, nooit automatische risicoscores per persoon · H9 nooit suïcide-items in anonieme bevraging · H10 nooit gevoelig item zonder zichtbare hulplijnen + geconfigureerd opvolgpad · H11 nooit surfgedrag/tabs/aanwezigheid via extensie · H12 nooit telemetrie in extensie/leerlingenluik · H13 nooit deelnemerslijst zichtbaar · H14 nooit vrije tekst B/C ongefilterd of onder n=10 · H15 nooit data voor productverbetering/AI-training/benchmark zonder onomkeerbare anonimisering + contract · H16 nooit buiten EER, geen stille subverwerkers · H17 nooit B/C-bevraging zonder overlegorgaan-config + DPIA-vink · H18 nooit push buiten venster, nooit onwegklikbaar · H19 nooit gamification/ranking op welzijn · H20 nooit longitudinaal psychisch profiel per individu — handelingen, geen toestanden.

## ZACHT (selectie)
Twee productlijnen "Klimaat" (anoniem) en "Praktisch" (op naam) · scheiding uitnodiging/antwoorden · preview "wat ziet mijn directeur" · korte retentie ruwe antwoorden · auditlog rapportinzage · geen realtime bij kleine groepen · partnerschap externe preventiedienst (lost art. 9 structureel op) · koepel-DPO's + VTC vooraf · aansluiten bij gevalideerde instrumenten · advocaat arbeidsrecht+gegevensbescherming.
