# DPIA-aanzet — Fase 1 (personeelsluik)

**Status: aanzet ter voorbereiding van de formele gegevensbeschermingseffectbeoordeling (AVG art. 35). Dit document is de technische en functionele input van het platformteam; de DPIA zelf wordt gevoerd onder regie van de verwerkingsverantwoordelijke (het schoolbestuur/de scholengroep) met de DPO, vóór ingebruikname.**

De structuur volgt AVG art. 35, lid 7: (a) systematische beschrijving, (b) noodzaak en evenredigheid, (c) risicobeoordeling, (d) maatregelen.

## 0. Waarom een DPIA

Fase 1 verwerkt systematisch en op schaal personeelsgegevens, waaronder gegevens met rechtspositionele gevolgen (statuuttellers, beoordelingen, functioneringsverslagen). Er is sprake van systematische monitoring van werknemers in een gezagsverhouding — een context die de Gegevensbeschermingsautoriteit als verhoogd-risico aanmerkt. Een DPIA vóór livegang is daarom aangewezen; voor Fase 3 (leerlinggegevens, minderjarigen) is ze onmiskenbaar verplicht en volgt een **afzonderlijke DPIA**.

## 1. Systematische beschrijving van de verwerkingen (art. 35.7.a)

### 1.1 Context en partijen

| Aspect | Invulling |
|---|---|
| Verwerkingsverantwoordelijke | Schoolbestuur / scholengroep |
| Verwerker | Platformleverancier Draagvlak (verwerkersovereenkomst cf. AVG art. 28, sub-verwerkerslijst, EU-datalocatie) |
| Betrokkenen Fase 1 | Personeelsleden van de deelnemende scholen (leraren, starters, mentoren, directies) |
| Géén betrokkenen in Fase 1 | Leerlingen en ouders — er worden geen leerlinggegevens verwerkt |
| Bron van de gegevens | IdP-synchronisatie (SCIM), import uit schooladministratiepakket, eigen invoer door gebruikers |

### 1.2 Verwerkingen, doeleinden en grondslagen

| # | Verwerking | Doeleinde | Grondslag | Gegevenscategorieën |
|---|---|---|---|---|
| V1 | Identiteit & organisatie (sync) | Toegang, rollen, organisatiestructuur | 6.1.b (arbeidsrelatie) | naam, e-mail, school, functie, team |
| V2 | Statuutopvolging & tellers | Naleving decretale termijnen (TADD, beoordeling) | 6.1.c (Decreten Rechtspositie, PERS/2019/03) | ambten, aanstellingen, statuut, anciënniteitstellers |
| V3 | Afwezigheden (leesweergave) | Correcte berekening "effectief gepresteerd" | 6.1.c | afwezigheidscode en -periode (géén medische inhoud) |
| V4 | Aanvangsbegeleiding | Decretaal traject en beoordeling starters | 6.1.c (PERS/2019/03) | overeenkomst, logboek, klasbezoeken, beoordelingsverslag |
| V5 | Gesprekkencyclus (informeel) | Decretale functioneringsgesprekken en recht op aanvraag | 6.1.c (PERS/2007/09) | verslagen, afspraken, aanvragen |
| V6 | Opdrachten & desiderata | Opdrachtverdeling; billijke taakverdeling | 6.1.b/6.1.c; desiderata op eigen initiatief | opdrachten, voorkeuren, motiveringen |
| V7 | Strategiemodule | Schoolontwikkeling, kwaliteitszorg (ROK) | 6.1.e | doelen, acties, eigenaarschap (beperkte persoonsgegevens) |
| V8 | Audittrail & logging | Beveiliging, aantoonbaarheid, rechten van betrokkenen | 6.1.c/6.1.f | wie-zag/wijzigde-wat-wanneer |

**Bijzondere categorieën (art. 9):** niet beoogd in Fase 1. Twee waakpunten: (1) afwezigheidscodes worden gesynchroniseerd zónder medische duiding (alleen categorie en periode, voor de telregels); (2) vrije-tekstvelden (verslagen, logboek) kunnen door gebruikers gevuld worden met gevoelige informatie — zie risico R4.

### 1.3 Datastromen

```
IdP (Entra/Google) ──SCIM──▶ ┌──────────────┐ ◀──CSV/API── administratiepakket
                             │  DRAAGVLAK   │              (WISA/Informat/Broekx)
gebruikers ──HTTPS/SSO─────▶ │  EU-regio    │ ──uitnodiging──▶ agenda (Graph/Google)
                             │  PostgreSQL  │ ──export (PDF/Excel)──▶ bestuur/DPO
                             │  RLS + audit │
                             └──────────────┘
```

- Geen doorgifte buiten de EU; sub-verwerkers contractueel EU-gebonden.
- Geen AI-verwerking in Fase 1 (de AI-laag volgt later, per functie met eigen DPIA-toets, cf. blauwdruk § 10 — oranje zone).
- Geen zendingen naar AGODI; het administratiepakket blijft de bron.

### 1.4 Bewaartermijnen (principe-invulling, af te toetsen)

| Object | Voorstel | Rationale |
|---|---|---|
| Gespreksverslagen (informeel spoor) | duur dienstverband + af te toetsen naperiode | ontwikkeldoel, geen evaluatiedossier |
| Beoordelingsverslagen TADD | volgens decretale en verjaringslogica | rechtspositioneel document |
| Desiderata | 3 schooljaren (billijkheidshistoriek) | ⚠ TE VALIDEREN |
| Tellersnapshots | herleidbaar, dus regenereerbaar; snapshots beperkt bewaren | dataminimalisatie |
| Audittrail | conform beveiligings- en verjaringslogica | aantoonbaarheid |

## 2. Noodzaak en evenredigheid (art. 35.7.b)

- **Doelbinding:** elke verwerking is herleidbaar tot een decretale verplichting (V2-V5), de arbeidsrelatie (V1, V6) of de wettelijke kwaliteitszorgopdracht (V7). Er worden geen gegevens verzameld "omdat het kan"; velden die een rol niet nodig heeft, verlaten de server niet.
- **Dataminimalisatie by design:** synchronisatie in plaats van herinvoer beperkt kopieën; afwezigheden zonder medische inhoud; geaggregeerde rapportage met n ≥ 5-drempel vanaf Fase 1.
- **Evenredigheid van de monitoring:** de dekkingsmonitor en deadline-engine monitoren processen (is er een gesprek geweest? nadert een termijn?), geen gedrag of prestaties. Er zijn geen productiviteitsmetrieken, geen tijdsregistratie, geen individuele vergelijkingen tussen personeelsleden.
- **Alternatievenafweging:** het alternatief (Excel/Word/mail, de huidige praktijk) biedt aantoonbaar mindere bescherming: geen toegangscontrole op maat, geen audittrail, geen bewaartermijn-automatisering, kopieën in mailboxen. De verwerking in het platform is de minder ingrijpende weg om dezelfde wettelijke verplichtingen na te leven.
- **Geen geautomatiseerde besluitvorming (art. 22):** het platform signaleert en structureert; elke beslissing (beoordeling, toekenning, evaluatie) wordt door een mens genomen en gemotiveerd. Tellers zijn 100% regelgebaseerd en uitlegbaar.

## 3. Risicobeoordeling (art. 35.7.c)

Schaal: kans × impact (L/M/H) vóór maatregelen.

| # | Risico | Kans | Impact | Toelichting |
|---|---|---|---|---|
| R1 | Onrechtmatige toegang tot dossiers (intern) | M | H | rollencumul in kleine scholen; nieuwsgierigheid is het reële scenario |
| R2 | Vermenging ontwikkelspoor ↔ beoordeling | M | H | grootste vertrouwensrisico van het concept (blauwdruk § 13) |
| R3 | Foutieve tellers → verkeerde rechtspositionele beslissing | M | H | complexe telregels; fout kan een TADD-recht of beoordelingstermijn schaden |
| R4 | Gevoelige inhoud in vrije-tekstvelden | H | M | verslagen en logboeken nodigen uit tot context (gezondheid, privésituatie) |
| R5 | Datalek bij leverancier of sub-verwerker | L | H | standaard verwerkersrisico |
| R6 | Function creep: rapportages worden beoordelingsinstrument | M | H | bv. dekkingsmonitor misbruikt als prestatie-indicator per leraar |
| R7 | Onvolledige verwijdering bij einde dienstverband | M | M | verspreide objecten over modules |
| R8 | Chilling effect: personeel durft desiderata/aanvragen niet te gebruiken | M | M | schaadt het doel van het platform zelf |

## 4. Maatregelen (art. 35.7.d)

| Risico | Maatregelen |
|---|---|
| R1 | Toegangsmatrix technisch afgedwongen (RBAC + row-level security); leessporen op gevoelige dossiers zichtbaar in audittrail; **⚠ TE VALIDEREN:** inzage eigen leessporen door personeelslid als afschrikmiddel |
| R2 | Apart dossiertype met aparte rechten; technische onmogelijkheid tot koppeling/kopie (constraint op databankniveau); communicatiecharter; onderhandeling in lokaal comité vóór livegang |
| R3 | Tellers reproduceerbaar met volledige verantwoording (parameterversie + telregels + periodes); testset met gedocumenteerde casussen, gevalideerd door een personeelsdienst; teller is signaal, mens beslist; bronvermelding bij elke prognose |
| R4 | Invoervelden met gerichte prompts i.p.v. één groot tekstveld; schrijfwijzer bij het veld ("noteer afspraken, geen diagnoses"); periodieke steekproef door DPO op veldgebruik; bewaartermijnen |
| R5 | Verwerkersovereenkomst, EU-datalocatie, encryptie in transit/at rest, jaarlijkse pentest, incidentprocedure met 72-uursmelding (art. 33), sub-verwerkerslijst met wijzigingsmelding |
| R6 | Geaggregeerde rapportages met n ≥ 5; dekkingsmonitor toont proces-status, geen ranking; afspraak in het lokaal comité over toegestaan gebruik van rapportages; duidingsplicht bij elke grafiek |
| R7 | Bewaarregels per objecttype, automatisch uitgevoerd en gelogd (vernietigingslog); exit-procedure per persoon als geteste workflow |
| R8 | Transparantie vooraf (privacyverklaring personeel, toelichting op sociaal overleg); desiderata zichtbaar enkel voor directie met motiveringsplicht; vrijwilligheid van optionele onderdelen expliciet in de interface |

## 5. Rechten van betrokkenen

Ingebouwde workflows voor inzage, verbetering en wissing (met DPO als behandelaar); privacyverklaring op maat van personeel, opgenomen in het arbeidsreglement waar vereist; kennisgeving en toelichting op het bevoegde lokaal comité vóór ingebruikname (dit raakt arbeidsvoorwaarden en is onderhandelingsmaterie).

## 6. Openstaande punten voor de DPO en het overleg

1. Kwalificatie van de grondslag per verwerking verfijnen (m.n. V6 desiderata en V7): 6.1.b, 6.1.c of 6.1.e — tabel § 1.2 is een voorzet.
2. Bewaartermijnen vaststellen tegen de selectielijsten voor onderwijsarchieven (tabel § 1.4).
3. Beslissing over inzage van eigen leessporen (R1-maatregel vs. onderlinge verhoudingen in kleine teams).
4. Lijst afwezigheidscodes die gesynchroniseerd worden: minimale set vastleggen met de personeelsdienst.
5. Raadpleging van de betrokkenen zelf (art. 35.9): vorm bepalen — voorstel: bevraging in de pilootscholen tijdens Fase 0.
6. Drempelanalyse formeel bevestigen: staat deze verwerking op de GBA-lijst van verplichte DPIA's, en zo niet, gemotiveerd vastleggen waarom de DPIA toch (of niet) gevoerd wordt.

## 7. Besluit (in te vullen na de formele DPIA)

Restrisico's, advies van de DPO, standpunt van het lokaal comité, beslissing van de verwerkingsverantwoordelijke, en — indien restrisico hoog blijft — voorafgaande raadpleging van de GBA (art. 36).
