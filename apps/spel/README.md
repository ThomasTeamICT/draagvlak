# De Levende School — spike (module-familie S)

Speelbare verkenning van de simulatielaag uit
[`docs/functioneel-ontwerp/simulatielaag.md`](../../docs/functioneel-ontwerp/simulatielaag.md).
Eén zelfstandig HTML-bestand, geen build, geen afhankelijkheden: openen volstaat.

## Wat werkt

**De wereld.** Deterministisch gegenereerd schooldomein (68×50 tegels) uit één
zaad: hoofdgebouw met acht klassen rond een centrale gang, refter, turnzaal,
inkomhal, een annex voor directie en administratie, speelplaats met markeringen
en doelen, tuin, fietsenstalling en een hek met poort. ~260 agents met een
dagritme uit de schoolkalender (aankomst → lesblokken → speeltijd → middag →
einde), A*-pathfinding en vaste zitplaatsen: tijdens een lesblok zit elke klas
in rijen aan de bank.

**Het beeld.** Alles wordt getekend in een low-res pixelbuffer die
nearest-neighbour wordt opgeschaald — échte pixelart, geen gladde vectorvormen.
Tegels, bakstenen gevels met ramen en deuren, props en personages worden één
keer procedureel gebakken (zie [`art-bible.md`](../../docs/functioneel-ontwerp/art-bible.md)).
Gebouwen zijn volumes: gevelvlakken worden weggesneden waar een buur staat,
elk lokaal draagt een pannendak met nok, gevelpunt, schouw en overstek, en de
hele grondlaag (vloer + slagschaduw) wordt één keer gebakken en per beeld als
één blit getekend. Verder: dag- en avondlicht, wolkenschaduwen, bladeren,
vogels, regen, gloeiende ramen met bloom, en een aardrand die het domein tot
een diorama maakt.

**Daken weg.** Eén knop (of het bezielen van iemand binnen) tilt de daken van
de gebouwen: je kijkt in elk lokaal tegelijk.

**De lerarenkamer.** Toets `L` of de knop rechtsboven opent het intranet van de
school: prikbord (wat het systeem ziet + wat mensen zelf prikken), teamoverzicht
met dienstanciënniteit en signalen per personeelslid, de plannen en deelplannen
die een Vlaamse school moet kunnen voorleggen (met het kader en wie erover
beslist), beleidskeuzes die meteen doorwerken in het schoolklimaat, en het
weekbeeld van een personeelslid. Klikken op een rij in Team zoekt die persoon op
in de wereld.

**Verder.** Klok met scrubber en snelheden (een tijdsprong zet iedereen meteen
waar hij hoort), drie modi (spiegel / zandbak / vrij spel), zes krachten
waaronder bezieling met Diablo-navigatie (klik op de vloer = lopen), signalen
als gedachteballonnen, en klimaat dat weer en kleur stuurt.

## Wat nog niet

Echte API-koppeling (alles is fictief), geprompte art (de procedurele
tekenfuncties zijn placeholders), meerspeler, en de beleidskeuzes uit de
lerarenkamer schrijven nog nergens naartoe.

## Bediening

| | |
|---|---|
| slepen | pannen |
| klik op een figuur | selecteren |
| `Ver` / `Mid` / `Dicht` | zoom (hele pixels, dus altijd scherp) |
| `🏠 Daken` | daken tonen of wegnemen |
| `L` | lerarenkamer openen/sluiten |
| Bezielen → klik op de vloer | lopen zoals in Diablo |

Prestatie: 60 fps bij ~260 figuren op `Mid` in Chromium (Canvas2D); op `Ver`
is de buffer vier keer zo groot en telt de vulsnelheid van de GPU mee.
