# Art-bijbel — De Levende School

> Technische specificatie + kant-en-klare prompts voor het aanleveren van
> artwork. Doel: alles wat via beeldgeneratie binnenkomt past **zonder
> nabewerking-drama** in de engine, en oogt als één wereld.

## 1. Harde specificaties (niet onderhandelbaar, anders sluit niets aan)

| Wat | Waarde | Waarom |
|---|---|---|
| Projectie | **dimetrisch 2:1** (true isometric "2:1 pixel art", geen 30° trimetrie) | tegels moeten naadloos tegen elkaar |
| Basistegel | **64 × 32 px** (vloer), hoogte-eenheid 16 px | vaste rasterwiskunde |
| Muur/objecthoogte | veelvouden van 16 px | stapelbaar |
| Personages | **32 × 48 px** staand, voetpunt onderaan gecentreerd | pivot = midden-onder |
| Richtingen | 4: ZO, ZW, NO, NW (ZW/NW zijn gespiegeld) | halveert de art |
| Frames | idle 2, lopen 4, actie 2 | genoeg leven, weinig werk |
| Lichtrichting | **altijd linksboven (NW)**, schaduw naar rechtsonder | consistente belichting |
| Achtergrond | **transparant PNG**, geen schaduw ingebakken | engine tekent de schaduw |
| Anti-aliasing | **geen** — harde pixelranden | pixel-look |
| Palet | max 48 kleuren, uit het vaste palet hieronder | eenheid + kleurrijk |
| Outline | 1 px donkerder variant van de vlakkleur (geen zwart) | "mooier dan Game Boy" |

**Vast palet (uitbreidbaar, maar dit is de basis):** diepgroen `#0f2e26`,
schoolgroen `#1f6f5c`, mintgroen `#56c0a2`, warm wit `#f6f3e7`, zandbeige
`#e8d5a9`, baksteen `#c96f4a`, dakrood `#8f3b2c`, hemelsblauw `#69b8e8`,
diepblauw `#2b5f9e`, zonnegeel `#f2c14e`, amber `#9a6700`, karmozijn `#ad1457`,
lila `#8f6bb5`, asgrijs `#5a6a64`, steengrijs `#9aa8a2`, nachtblauw `#1b2422`.

## 2. Werkwijze: prompt losse assets, geen sheets

1. Prompt **één asset per beeld**, groot (1024 × 1024), met de assetnaam in het
   bestand.
2. Downschalen naar doelmaat met **nearest neighbor** (nooit bicubic).
3. Kleuren terugbrengen tot het palet (quantize, geen dithering).
4. Pivot en tegelraster controleren tegen `raster.png` (hulpbestand: één
   64 × 32 ruit + een 32 × 48 personagekader).
5. In de map `apps/spel/kit/` volgens de naamgeving hieronder.

**Naamgeving:** `vloer_klas.png`, `vloer_gang.png`, `muur_baksteen_nw.png`,
`prop_bank.png`, `prop_bord.png`, `pers_leraar_zo_walk1.png` … Consequent klein
geschreven, onderdelen met `_`, richting als `zo/zw/no/nw`, frames genummerd.

## 3. Assetlijst (eerste levering, ±40 stuks)

**Vloeren (64 × 32):** klasvloer (parket), gangvloer (linoleum), refter,
speelplaatstegels, gras, zand, betonpad, turnzaal, drempel/deurmat.

**Bouwdelen (64 × 32 basis, hoogte 48–96):** buitenmuur baksteen (2 richtingen),
binnenmuur, raamsegment, deur dicht/open, hoekstuk, dakrand, trap.

**Props:** schoolbank, lerarenbureau, (digitaal) bord, kast, kapstok,
refter-tafel, vuilbak, plantenbak, boom (3 seizoenen), struik, bank
(speelplaats), basketbalpaal, voetbaldoeltje, zandbak, fietsenstalling,
schoolbel, prikbord, fotokopieermachine, koffiezet (lerarenkamer).

**Personages (32 × 48, 4 richtingen, idle+walk):** leerling kleuter,
leerling lager, leraar, directeur, zorgleerkracht, klusjesman, secretariaat,
externe bezoeker (badge), vervanger (herkenbaar accent).

**Effecten:** stofwolkje (voetstap), zonnestralen, regendruppel, blad,
gedachteballon leeg (3 maten), uitroepteken, hartje/duim (waardering),
selectie-ring (ellips), pad-marker.

## 4. Kant-en-klare prompts

> Plak letterlijk; vervang alleen het cursieve deel. De laatste zin is de
> belangrijkste — laat hem staan.

**Vloertegel**
```
2:1 isometric pixel art floor tile of a *Belgian primary school classroom
parquet floor*, single diamond tile, seamless tileable, flat top-down-angled
surface, warm colorful palette (deep green #0f2e26, cream #f6f3e7, sand
#e8d5a9), light from upper left, crisp 1px darker outline, no anti-aliasing,
no shadow baked in, transparent background, centered, retro 16-bit SNES pixel
art style but bright and modern, clean readable shapes.
```

**Muur- of bouwdeel**
```
2:1 isometric pixel art *red brick school wall segment with a tall window*,
height 64px on a 64x32 base tile, north-west facing side lit, south-east side
in shade, single isolated object, no floor, no ground shadow, transparent
background, palette: brick #c96f4a, roof red #8f3b2c, cream #f6f3e7, sky blue
#69b8e8, 1px darker outline, no anti-aliasing, retro 16-bit pixel art, bright
and modern, clean readable silhouette.
```

**Prop / meubel**
```
2:1 isometric pixel art *wooden school desk with a chair*, single isolated
object on transparent background, no ground shadow, light from upper left,
warm colorful limited palette, 1px darker outline, no anti-aliasing, small
readable silhouette (fits within 64x64 px when downscaled), retro 16-bit pixel
art, cheerful modern school style.
```

**Personage (per richting)**
```
32x48 pixel art character sprite of a *friendly Flemish primary school
teacher, 30s, cardigan, holding a folder*, isometric 3/4 view facing
south-east, standing idle, full body, feet centered at the bottom edge,
transparent background, no shadow, light from upper left, limited warm palette,
1px darker outline instead of black, no anti-aliasing, expressive but simple
face (2-3 px eyes), retro 16-bit RPG sprite style, bright and modern.
```
Herhaal met `facing south-west`, `facing north-east` (rug), `facing north-west`
en met `mid-stride walking, left leg forward` / `right leg forward` voor de
loopframes.

**Effect**
```
Pixel art *empty speech/thought bubble*, isometric game UI element, 3 sizes,
transparent background, cream fill #f6f3e7 with 1px dark green outline
#0f2e26, no anti-aliasing, crisp, retro 16-bit game style.
```

**Sfeerbeeld (voor de art direction, niet voor de engine)**
```
Wide isometric pixel art illustration of a *Flemish primary school on a sunny
autumn morning*: brick building with tall windows, playground with children
playing, bicycle shed, trees, teacher on supervision duty. 2:1 isometric,
16-bit SNES pixel art, bright saturated palette, light from upper left, cozy
and lively, lots of small storytelling details.
```

## 5. Hoe het in de engine landt

De renderer werkt met een **kit-object**: elke assetnaam wijst naar een
`ImageBitmap` of naar een procedurele tekenfunctie. Zolang een asset ontbreekt,
tekent de engine de procedurele versie — het spel is dus altijd speelbaar en
elk aangeleverd bestand vervangt stilletjes de placeholder. Geen big bang.

```
kit['vloer_klas']  → PNG zodra geleverd, anders proceduraal
kit['pers_leraar'] → PNG-set zodra geleverd, anders procedurale pixelfiguur
```

## 6. Wat bewust procedureel blijft

De **massa-avatars** (honderden leerlingen) blijven gegenereerd: uiterlijk uit
`hash(persoon_id + tenant-salt)`, palette-swaps op een handvol basisvormen.
Geprompte art is voor wat de speler *herkent* — gebouw, decor, hero-personages.
Zo blijft de wereld eindeloos gevarieerd zonder duizend bestanden.
