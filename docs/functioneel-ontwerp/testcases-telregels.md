# Testcasusset telregels dienstanciënniteit (TADD)

De statuuttellers zijn de meest foutgevoelige rekenlogica van het platform: een fout kan een TADD-recht of een beoordelingstermijn schaden (DPIA-risico R3). Dit document is het **testcontract**: elke casus beschrijft invoer en verwacht resultaat. De verwachte waarden zijn afgeleid uit de blauwdruk en [regelparameters.md](regelparameters.md); casussen met **⚠ TE VALIDEREN** moeten vóór livegang samen met een personeelsdienst tegen de geldende tekst van PERS/2019/03 worden geverifieerd. De set wordt daarna als geautomatiseerde testsuite geïmplementeerd en groeit bij elke gemelde afwijking (regressiebescherming).

**Conventies.** Alle casussen betreffen één ambt in één instelling tenzij anders vermeld. "kd" = kalenderdagen dienstanciënniteit; "eff" = effectief gepresteerde dagen. Peildatum is 30 juni van het lopende schooljaar. Schoolvakanties volgen de Vlaamse kalender van het genoemde schooljaar.

## Groep A — Basistellingen

| # | Casus | Invoer | Verwacht |
|---|---|---|---|
| A1 | Voltijds, volledig schooljaar | Aanstelling 01/09–30/06, geen afwezigheid | kd = aantal kalenderdagen 1/9 t/m 30/6 (303 in een niet-schrikkeljaar-combinatie; 304 met 29/2); eff = kd |
| A2 | Weekends en korte vakanties | Als A1 | Weekends, herfst-, kerst-, krokus- en paasvakantie binnen de periode tellen mee in kd én eff |
| A3 | Korte interim | Aanstelling ma 06/10 – vr 19/12 | kd = 75 (kalenderdagen incl. tussenliggende weekends); dagen buiten de aanstelling tellen nooit |
| A4 | Twee losse interims met gat | 06/10–24/10 en 12/01–27/03 | kd = som van beide periodes; het gat telt niet; geen afronding |
| A5 | Deeltijdse opdracht | Aanstelling 01/09–30/06, 12/24 lestijden | kd en eff identiek aan A1: het volume van de opdracht beïnvloedt de dagenteller niet **⚠ TE VALIDEREN** |

## Groep B — Zomervakantie en jaargrenzen

| # | Casus | Invoer | Verwacht |
|---|---|---|---|
| B1 | Aanstelling eindigt 30/6 | TABD 01/09–30/06 | Zomervakantie telt niet mee (geen aanstelling) |
| B2 | Aanstelling loopt door de zomer | Aanstelling t/m 31/08 | **⚠ TE VALIDEREN:** de regel "zomervakantie telt in regel niet" — vastleggen welke uitzonderingen gelden en hoe de teller de zomerdagen behandelt |
| B3 | Plafond per schooljaar | Aanstellingen die samen > 360 kd in één schooljaar opleveren (meerdere scholen) | Maximaal 360 kd aangerekend per schooljaar (`ANC_MAX_PER_SCHOOLJAAR`) |
| B4 | Anciënniteit over schooljaren heen | 120 kd in jaar 1 + 190 kd in jaar 2 | Sommatie over schooljaren: 310 kd totaal; drempelcontrole gebeurt op het totaal |

## Groep C — Afwezigheden en "effectief gepresteerd"

| # | Casus | Invoer | Verwacht |
|---|---|---|---|
| C1 | Ziekte binnen aanstelling | A1 + ziekteverlof 12/01–23/01 (12 kd) | kd ongewijzigd; eff = kd − 12 |
| C2 | Afwezigheid over een weekend | Ziekte vr 16/01 t/m ma 26/01 (11 kd) | De weekenddagen binnen de ziekteperiode tellen niet als eff **⚠ TE VALIDEREN** (consistentie met C1) |
| C3 | Welke codes tellen wél als effectief | Aanstelling + omstandigheidsverlof / klein verlet | **⚠ TE VALIDEREN:** de lijst afwezigheidscodes die als effectief gepresteerd gelden — minimale sync-set vastleggen met de personeelsdienst (DPIA § 6.4) |
| C4 | Drempel wel/niet gehaald door afwezigheid | 295 kd waarvan 198 eff | Drempel **niet** bereikt (200 eff vereist): geen beoordelingsplicht dit schooljaar; dashboard toont dit expliciet met de reden |

## Groep D — Drempeldetectie en deadlines

| # | Casus | Invoer | Verwacht |
|---|---|---|---|
| D1 | Prognose bereikt drempel | Op 1/3: 250 kd / 180 eff; aanstelling loopt t/m 30/6 | Prognose 30/6 ≥ 290/200 → starter verschijnt op startersdashboard; deadlines 15/6 (kandidaatstelling) en 30/6 (beoordeling) actief met escalatieladder |
| D2 | Prognose net niet | Prognose 30/6 = 288 kd | Geen beoordelingssignaal; wél informatieve teller voor volgend schooljaar |
| D3 | Afwezigheid ná prognose | D1, daarna ziekte in mei waardoor eff onder 200 zakt | Herberekening bij elke mutatie: signaal wordt ingetrokken mét melding en logboekspoor van de wijziging |
| D4 | Geen beoordeling geregistreerd op 30/6 | D1, evaluator registreert niets | Uitkomst geldt als positief (decretale regel); het platform registreert "geen beoordeling = positief" expliciet, mét de gemiste-registratie-escalaties in de audittrail |

## Groep E — Werkpunten en vervolgtraject

| # | Casus | Invoer | Verwacht |
|---|---|---|---|
| E1 | Beoordeling met werkpunten | D1 + uitkomst "werkpunten" | Vervolgtraject start automatisch: teller van 200 bijkomende **effectieve** dagen, aangepast traject gekoppeld aan de werkpunten |
| E2 | Tweede keer werkpunten, zelfde ambt | E1 afgerond, opnieuw "werkpunten" gekozen | Geblokkeerd: werkpunten kan maar één keer per ambt (`WERKPUNTEN_MAX_PER_AMBT`); platform toont de decretale reden |
| E3 | Werkpunten in ander ambt | E1 in ambt X; nieuw traject in ambt Y | Toegestaan: de beperking geldt per ambt; tellers per ambt gescheiden |
| E4 | Negatieve beoordeling | Uitkomst "negatief" | Opgebouwde anciënniteit in die instelling telt niet meer mee voor TADD **⚠ TE VALIDEREN** (exacte draagwijdte instelling vs. ambt); verhaaltermijn bij het bestuur wordt bewaakt |

## Groep F — Meerdere scholen en ambten

| # | Casus | Invoer | Verwacht |
|---|---|---|---|
| F1 | Zelfde ambt in twee scholen van de groep | Gelijktijdige aanstellingen school A (12/24) en B (10/24) | Overlappende kalenderdagen tellen één keer (geen dubbeltelling); B3-plafond bewaakt |
| F2 | Twee ambten | Leraar (ambt X) + ander wervingsambt (Y) | Gescheiden tellers per ambt; drempeldetectie per ambt |
| F3 | Beoordeling bij prestatie in meerdere scholen | F1 + drempel bereikt | Signaal aan beide eerste evaluatoren + gelogde overlegflow richting één coherente beoordeling (blauwdruk § 5.4) |

## Groep G — Parameterversies en reproduceerbaarheid

| # | Casus | Invoer | Verwacht |
|---|---|---|---|
| G1 | Parameterwijziging met ingangsdatum | Drempel wijzigt (fictief) naar 300 kd vanaf 01/09/jaar+1 | Periodes vóór de ingangsdatum blijven berekend met de oude versie; het dossier toont welke versie waar gold |
| G2 | Reproduceerbaarheid | Willekeurige casus hierboven | `TELLERSNAPSHOT.berekening` bevat periodes, telregels en parameterversies; herberekening levert bit-voor-bit hetzelfde resultaat |
| G3 | Uitlegbaarheid | Willekeurige teller in de UI | "Toon berekening" toont dezelfde verantwoording als de snapshot — wat de gebruiker ziet ís wat berekend werd |

## Afnameprotocol

1. **Fase 0:** deze tabel doornemen met een personeelsdienst; alle ⚠-casussen beslechten tegen de geldende omzendbrieftekst en de uitkomsten hier vastleggen (met Edulex-citaat in de commit message).
2. **Bouw:** elke casus wordt één geautomatiseerde test; de suite draait bij elke wijziging aan telregels of parameters.
3. **Beheer:** elke gemelde afwijking in productie wordt eerst als nieuwe casus aan deze set toegevoegd (rood), dan pas gefikst (groen) — de set is het levende contract tussen regelgeving en code.
