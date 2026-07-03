# Functioneel ontwerp — Fase 0-1

Dit deel van de documentatie werkt de blauwdruk ([docs/blauwdruk.md](../blauwdruk.md)) uit tot een functioneel ontwerp voor **Fase 0 (fundament)** en **Fase 1 (MVP)**, conform § 12 van de blauwdruk.

## Scope van het MVP

| Module | Inhoud in Fase 1 |
|---|---|
| A — Strategisch beleid | Doelenboom, kwaliteitskalender, visieradar, ROK-tagging |
| B — Personeelsdossier | Dossier, statuuttellers, deadline-engine, documentenkluis |
| C — Opdrachten & desiderata | Desiderata-ronde, opdrachtenpuzzel, taakregister, publicatieflow |
| D — Aanvangsbegeleiding | Trajectdossier, logboek, klasbezoeken, TADD-beoordelingsflow |
| E — spoor 1 | Gesprekkencyclus, gesprek-aanvraag, functiebeschrijvingen, dekkingsmonitor |

De modules F t.e.m. J (waardering, professionalisering, welbevinden, leerlingbegeleiding) volgen in Fase 2-3 en vallen **buiten** dit ontwerp; waar hun komst het datamodel of de toegangsmatrix nu al beïnvloedt, is dat expliciet gemarkeerd met *(Fase 2+)*.

**Belangrijk voor de DPIA-scope:** Fase 1 verwerkt uitsluitend gegevens van **personeelsleden**. Er worden in het MVP géén leerlinggegevens verwerkt. De leerlingmodules (I en J) krijgen in Fase 3 een eigen, voorafgaande DPIA.

## Documenten

| Document | Wat het vastlegt | Blauwdruk-referentie |
|---|---|---|
| [toegangsmatrix.md](toegangsmatrix.md) | Wie mag wat zien en doen, per rol en per gegevensobject; harde ontwerpregels | § 4, § 8, ontwerpprincipes 3-4 |
| [regelparameters.md](regelparameters.md) | Decretale drempels en termijnen als configuratie met ingangsdatum | § 5.2, § 5.4, § 5.5, § 6, ontwerpprincipe 7 |
| [datamodel.md](datamodel.md) | Entiteiten en relaties van het MVP, multi-tenant-scoping, audittrail | § 9 |
| [wireframes.md](wireframes.md) | Low-fi wireframes van de kernflows, te valideren met directies | § 11, § 12 (Fase 0) |
| [../dpia/dpia-aanzet.md](../dpia/dpia-aanzet.md) | Aanzet gegevensbeschermingseffectbeoordeling Fase 1 (personeelsluik) | § 8 |

## Status en werkwijze

Deze documenten zijn **werkdocumenten voor de validatieronde van Fase 0**: co-creatie met 2-3 pilootscholen, aftoetsing met de DPO en onderhandeling in het bevoegde lokaal comité. Ze zijn ontworpen om per sessie bijgewerkt te worden; wijzigingen verlopen via versiebeheer in deze repository zodat de historiek van beslissingen bewaard blijft (het "overleg-logboek"-principe uit § 6 van de blauwdruk, toegepast op het ontwerp zelf).

Openstaande beslispunten zijn in elk document gemarkeerd met **⚠ TE VALIDEREN**.
