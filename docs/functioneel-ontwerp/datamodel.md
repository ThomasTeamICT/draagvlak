# Datamodel — Fase 1 (MVP)

Conceptueel datamodel voor de MVP-modules (A, B, C, D, E-spoor 1), conform blauwdruk § 9. Het model is netneutraal en multi-tenant: **elke rij draagt `tenant_id` (scholengroep) en waar van toepassing `school_id`**, afgedwongen met row-level security in PostgreSQL — onafhankelijk van applicatielogica.

## 1. Organisatie & identiteit

Identiteit wordt gesynchroniseerd vanuit het identiteitsplatform (Entra ID / Google Workspace via SCIM); Draagvlak is nooit de bron van identiteitsgegevens.

```mermaid
erDiagram
    TENANT ||--o{ SCHOOL : omvat
    SCHOOL ||--o{ TEAM : omvat
    TENANT ||--o{ PERSOON : "synct (SCIM)"
    PERSOON ||--o{ ROLTOEWIJZING : heeft
    SCHOOL ||--o{ ROLTOEWIJZING : "geldt voor"
    TEAM ||--o{ TEAMLIDMAATSCHAP : heeft
    PERSOON ||--o{ TEAMLIDMAATSCHAP : is-lid

    TENANT {
        uuid id PK
        string naam
        jsonb idp_koppeling
    }
    SCHOOL {
        uuid id PK
        uuid tenant_id FK
        string instellingsnummer
        string naam
        string onderwijsniveau
    }
    PERSOON {
        uuid id PK
        uuid tenant_id FK
        string idp_subject "koppeling SSO"
        string naam
        string email
        date in_dienst
    }
    ROLTOEWIJZING {
        uuid id PK
        uuid persoon_id FK
        uuid school_id FK
        string rol "BG|AD|DIR|TE|BO|ME|PL|DPO"
        date geldig_vanaf
        date geldig_tot
    }
```

## 2. Module A — Strategie

De doelenboom is één hiërarchie met vier lagen (visie → strategisch doel → jaardoel → actie); de laag zit in `type`, de hiërarchie in `parent_id`. Elk koppelbaar object in het platform verwijst via `DOELKOPPELING` naar een knoop — dat is de technische vorm van "de gouden draad".

```mermaid
erDiagram
    SCHOOL ||--o{ DOEL : heeft
    DOEL ||--o{ DOEL : "parent (4 lagen)"
    DOEL ||--o{ ACTIE : realiseert
    DOEL ||--o{ ROKTAG : "getagd met"
    ACTIE ||--o{ ROKTAG : "getagd met"
    DOEL ||--o{ INDICATOR : "gemeten door"
    INDICATOR ||--o{ MEETWAARDE : heeft
    DOEL ||--o{ EVALUATIEMOMENT : "cyclisch geëvalueerd"
    DOEL ||--o{ DOELKOPPELING : "gouden draad"
    DOEL ||--o{ OVERLEGLOG : "gedragenheid"

    DOEL {
        uuid id PK
        uuid school_id FK
        uuid parent_id FK
        string type "visie|strategisch|jaardoel"
        string titel
        text smart_formulering
        uuid eigenaar_id FK
        string status
    }
    ACTIE {
        uuid id PK
        uuid doel_id FK
        string titel
        uuid eigenaar_id FK
        date start
        date einde
        string status
        text middelen
    }
    INDICATOR {
        uuid id PK
        uuid doel_id FK
        string naam
        string bron "platform|import|handmatig"
        string richting "stijgend|dalend|doel"
    }
    EVALUATIEMOMENT {
        uuid id PK
        uuid doel_id FK
        date gepland
        text keep_stop_change_start
        text beslissing_motivering
        date uitgevoerd
    }
    DOELKOPPELING {
        uuid id PK
        uuid doel_id FK
        string object_type "actie|gesprek|traject|navorming|..."
        uuid object_id
    }
    OVERLEGLOG {
        uuid id PK
        uuid object_id "doel|plan|functiebeschrijving|..."
        string gremium "pedagogische raad|schoolraad|lokaal comité"
        date datum
        string uitkomst
        int versie
    }
```

## 3. Module B — Personeelsdossier & tellers

Tellers worden nooit opgeslagen als "waarheid" maar altijd herleidbaar berekend uit `AANSTELLING` + `AFWEZIGHEID` + de geldende `REGELPARAMETER`-versies; `TELLERSNAPSHOT` cachet het resultaat mét verantwoording.

```mermaid
erDiagram
    PERSOON ||--o{ AMBTBEVOEGDHEID : heeft
    PERSOON ||--o{ AANSTELLING : heeft
    AANSTELLING }o--|| SCHOOL : bij
    PERSOON ||--o{ AFWEZIGHEID : "leesweergave sync"
    PERSOON ||--o{ TELLERSNAPSHOT : heeft
    PERSOON ||--o{ DOCUMENT : documentenkluis
    PERSOON ||--o{ DEADLINE : heeft

    AMBTBEVOEGDHEID {
        uuid id PK
        uuid persoon_id FK
        string ambt
        string bewijs "VE|VO|AND"
        date vervaldatum_bewijs
    }
    AANSTELLING {
        uuid id PK
        uuid persoon_id FK
        uuid school_id FK
        string ambt
        string statuut "TABD|TADD|benoemd|TAO"
        decimal opdrachtbreuk
        date start
        date einde
        string bron "sync|import|handmatig"
    }
    AFWEZIGHEID {
        uuid id PK
        uuid persoon_id FK
        string code
        date start
        date einde
        boolean telt_effectief "afgeleid via telregels"
    }
    TELLERSNAPSHOT {
        uuid id PK
        uuid persoon_id FK
        string ambt
        int dagen_totaal
        int dagen_effectief
        date peildatum
        date prognose_30juni
        jsonb berekening "periodes+telregels+parameterversies"
    }
    DOCUMENT {
        uuid id PK
        uuid persoon_id FK
        string type "functiebeschrijving|overeenkomst|verslag|..."
        string dossiertype "ontwikkel|formeel"
        int versie
        string opslagverwijzing
    }
    DEADLINE {
        uuid id PK
        uuid persoon_id FK
        string type "TADD_kandidaat|beoordeling|opleiding_evaluator|..."
        date datum
        string status
        int escalatieniveau
    }
```

## 4. Module C — Opdrachten & desiderata

```mermaid
erDiagram
    PERSOON ||--o{ DESIDERATUM : "geeft door"
    SCHOOL ||--o{ OPDRACHTSCENARIO : "puzzelt in"
    OPDRACHTSCENARIO ||--o{ OPDRACHT : bevat
    PERSOON ||--o{ OPDRACHT : krijgt
    PERSOON ||--o{ TAAKTOEWIJZING : draagt
    SCHOOL ||--o{ TAAK : "taakregister"
    TAAK ||--o{ TAAKTOEWIJZING : "verdeeld via"

    DESIDERATUM {
        uuid id PK
        uuid persoon_id FK
        string schooljaar
        string categorie "vak|klas|rooster|taak|deeltijds|professionalisering"
        text inhoud
        text beslissing_motivering "gelogd bij toekenning"
    }
    OPDRACHTSCENARIO {
        uuid id PK
        uuid school_id FK
        string schooljaar
        string status "concept|gepubliceerd"
    }
    OPDRACHT {
        uuid id PK
        uuid scenario_id FK
        uuid persoon_id FK
        string soort "lestijden|plage|BPT|mentoruren"
        decimal omvang
        date leesbevestiging
    }
    TAAK {
        uuid id PK
        uuid school_id FK
        string naam "toezicht|werkgroep|uitstap|..."
        decimal geschatte_belasting
    }
    TAAKTOEWIJZING {
        uuid id PK
        uuid taak_id FK
        uuid persoon_id FK
        string schooljaar
    }
```

## 5. Module D — Aanvangsbegeleiding & beoordeling

Het trajectdossier (coaching) en het beoordelingsverslag (formeel) zijn **gescheiden objecten met gescheiden rechten**; het logboek is leesbaar voor de eerste evaluator, maar de beoordeling verwijst er hooguit naar.

```mermaid
erDiagram
    PERSOON ||--o{ TRAJECT : "als starter"
    TRAJECT ||--|| OVEREENKOMST_AB : "start met"
    TRAJECT ||--o{ MENTORTOEWIJZING : begeleid-door
    TRAJECT ||--o{ LOGBOEKITEM : bevat
    TRAJECT ||--o{ KLASBEZOEK : bevat
    KLASBEZOEK }o--|| KIJKWIJZER : volgens
    TRAJECT ||--o{ REFLECTIE : "van de starter"
    TRAJECT ||--o| BEOORDELING : "mondt uit in"
    BEOORDELING ||--o| TRAJECT : "vervolgtraject bij werkpunten"
    BEOORDELING ||--o| BEZWAAR : "verhaal bij bestuur"

    TRAJECT {
        uuid id PK
        uuid persoon_id FK
        uuid school_id FK
        string type "regulier|vervolg_werkpunten"
        string status
    }
    OVEREENKOMST_AB {
        uuid id PK
        uuid traject_id FK
        text duur_intensiteit_afspraken
        date bevestigd_starter
        date bevestigd_evaluator
    }
    LOGBOEKITEM {
        uuid id PK
        uuid traject_id FK
        uuid auteur_id FK
        string type "coaching|overleg"
        date datum
        text inhoud
    }
    KLASBEZOEK {
        uuid id PK
        uuid traject_id FK
        uuid kijkwijzer_id FK
        date datum
        text feed_up
        text feed_back
        text feed_forward
    }
    REFLECTIE {
        uuid id PK
        uuid traject_id FK
        text inhoud
        boolean gedeeld_met_mentor
    }
    BEOORDELING {
        uuid id PK
        uuid traject_id FK
        uuid evaluator_id FK
        string uitkomst "positief|werkpunten|negatief"
        text motivering
        text trajectbeschrijving
        date datum
    }
    BEZWAAR {
        uuid id PK
        uuid beoordeling_id FK
        date ingediend
        date termijn
        string uitkomst
    }
```

## 6. Module E — spoor 1: gesprekkencyclus

```mermaid
erDiagram
    PERSOON ||--o{ GESPREK : "deelnemer"
    GESPREK ||--o| GESPREKSVERSLAG : heeft
    PERSOON ||--o{ GESPREKAANVRAAG : "decretaal recht"
    GESPREKAANVRAAG ||--o| GESPREK : "leidt tot"
    PERSOON ||--o| FUNCTIEBESCHRIJVING : heeft
    FUNCTIEBESCHRIJVING }o--|| FB_SJABLOON : "op basis van"

    GESPREK {
        uuid id PK
        uuid persoon_id FK
        uuid gespreksleider_id FK
        string type "informeel_functionerings|opdracht|welkom"
        date gepland
        string agenda_koppeling "Graph|Google"
    }
    GESPREKSVERSLAG {
        uuid id PK
        uuid gesprek_id FK
        text afspraken
        text ondersteuningsvragen
        text aanvulling_personeelslid
        date kennisname_personeelslid
    }
    GESPREKAANVRAAG {
        uuid id PK
        uuid persoon_id FK
        date ingediend
        date bevestigingstermijn
        string status
    }
    FB_SJABLOON {
        uuid id PK
        uuid tenant_id FK
        string ambt
        int versie
    }
    FUNCTIEBESCHRIJVING {
        uuid id PK
        uuid persoon_id FK
        uuid sjabloon_id FK
        text individuele_toevoegingen
        int versie
        date ondertekend
    }
```

## 7. Systeemlaag

```mermaid
erDiagram
    TENANT ||--o{ REGELPARAMETER : configureert
    TENANT ||--o{ AUDITLOG : logt
    TENANT ||--o{ BEWAARREGEL : configureert

    REGELPARAMETER {
        uuid id PK
        string code
        string waarde
        string eenheid
        date geldig_vanaf
        date geldig_tot
        string bron "Edulex-verwijzing"
    }
    AUDITLOG {
        uuid id PK
        uuid tenant_id FK
        uuid actor_id FK
        string actie "lees|schrijf|export|config"
        string object_type
        uuid object_id
        timestamptz tijdstip
        jsonb context "onveranderbaar, append-only"
    }
    BEWAARREGEL {
        uuid id PK
        string object_type
        string termijn
        string grondslag
        string actie_na_termijn "wissen|anonimiseren"
    }
```

## 8. Ontwerpnotities

- **Gouden draad als koppeltabel.** `DOELKOPPELING` is polymorf (object_type + object_id) zodat elke module — ook toekomstige (navormingen, PLG's, welbevindenacties) — zonder schemawijziging aan de doelenboom kan koppelen. De strategiecockpit is een query over deze tabel.
- **Dossiertype als hard attribuut.** `DOCUMENT.dossiertype` (`ontwikkel` | `formeel`) stuurt de rechten en maakt de scheiding ontwikkeling↔beoordeling controleerbaar op databankniveau; een foreign key-constraint verhindert dat ontwikkelobjecten aan een formeel dossier hangen.
- **Berekend, niet beweerd.** `TELLERSNAPSHOT.berekening` bewaart de volledige verantwoording (periodes, telregels, parameterversies) zodat elke teller uitlegbaar en reproduceerbaar is — de basis van het vertrouwen in de deadline-engine.
- **Append-only audit.** `AUDITLOG` is technisch append-only (geen UPDATE/DELETE-rechten, ook niet voor de applicatierol); export voor juridische procedures gebeurt via een aparte, gelogde functie.
- **Voorbereid op Fase 2-3.** Pseudonimisering (scheiding identiteit ↔ antwoorden) is in Fase 1 nog niet nodig — er zijn geen meetdata — maar het schema reserveert er ruimte voor: metingtabellen komen in een apart schema met een sleuteltabel die alleen een aparte servicerol kan lezen.
