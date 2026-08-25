# De Levende School — spike (module-familie S)

Speelbare verkenning van de simulatielaag uit
[`docs/functioneel-ontwerp/simulatielaag.md`](../../docs/functioneel-ontwerp/simulatielaag.md).
Eén zelfstandig HTML-bestand, geen build, geen afhankelijkheden: openen volstaat.

**Wat werkt:** isometrische schoolwereld (deterministisch gegenereerd uit een zaad),
~240 agents met een dagritme uit de schoolkalender (aankomst → lesblokken →
speeltijd → middag → einde), procedurele pixelavatars (uiterlijk = hash van het
id, dus stabiel zonder extra persoonsgegevens), A*-pathfinding, klok met
scrubber en snelheden, drie modi (spiegel / zandbak / vrij spel), zes krachten
waaronder bezieling met Diablo-navigatie (klik op de vloer = lopen), signalen
als gedachteballonnen, en klimaat dat weer en kleur stuurt.

**Wat nog niet:** echte API-koppeling (alles is fictief), geprompte art (de
procedurele tekenfuncties zijn placeholders — zie
[`art-bible.md`](../../docs/functioneel-ontwerp/art-bible.md)), meerspeler.

Prestatie: 60 fps bij ~240 figuren in Chromium (Canvas2D).
