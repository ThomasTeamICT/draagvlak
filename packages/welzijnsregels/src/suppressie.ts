import type { Cel, CelUitkomst, SuppressieUitkomst } from './types.js'

/**
 * Drempel- en suppressierekenmachine (W4, welzijn.md).
 *
 * Regels:
 * 1. Een cel is pas zichtbaar vanaf de drempel — per gerapporteerde cel,
 *    ná elke filter, nooit op de brutogroep.
 * 2. Secundaire suppressie tegen terugrekenen: wie het totaal ziet en alle
 *    cellen op één na, kent die ene cel. Daarom geldt: zolang de som van de
 *    onderdrukte cellen zelf onder de drempel blijft (of er precies één cel
 *    onderdrukt is), wordt óók de kleinste nog zichtbare cel onderdrukt —
 *    het Viva Glint-model, hier deterministisch uitgeschreven.
 * 3. Wordt er niets toonbaar, dan zegt de uitkomst dat expliciet, mét het
 *    advies voor de kleine-school-modus — nooit stilletjes niets.
 */
export function onderdrukCellen(
  cellen: readonly Cel[],
  drempel: number,
  opties: { totaalZichtbaar?: boolean } = {},
): SuppressieUitkomst {
  const totaalZichtbaar = opties.totaalZichtbaar ?? true
  const uitkomsten: CelUitkomst[] = cellen.map((c) => ({
    ...c,
    zichtbaar: c.n >= drempel,
    reden: c.n >= drempel ? 'boven de drempel' : `onder de drempel (${c.n} < ${drempel})`,
  }))

  if (totaalZichtbaar) {
    // secundaire suppressie: deterministisch, kleinste zichtbare eerst
    // (gelijke stand: vaste volgorde op sleutel, zodat hetzelfde rapport
    // altijd dezelfde cellen onderdrukt)
    let onderdrukte = uitkomsten.filter((c) => !c.zichtbaar)
    const somOnderdrukt = () => onderdrukte.reduce((s, c) => s + c.n, 0)
    while (
      onderdrukte.length > 0 &&
      (onderdrukte.length === 1 || somOnderdrukt() < drempel)
    ) {
      const kandidaten = uitkomsten
        .filter((c) => c.zichtbaar)
        .sort((a, b) => a.n - b.n || a.sleutel.localeCompare(b.sleutel))
      const offer = kandidaten[0]
      if (offer === undefined) break
      offer.zichtbaar = false
      offer.reden = 'onderdrukt om terugrekenen van een kleinere groep te verhinderen'
      onderdrukte = uitkomsten.filter((c) => !c.zichtbaar)
    }
  }

  const ietsZichtbaar = uitkomsten.some((c) => c.zichtbaar)
  const uitkomst: SuppressieUitkomst = {
    cellen: uitkomsten,
    ietsZichtbaar,
  }
  if (!ietsZichtbaar) {
    uitkomst.advies =
      'geen enkele groep haalt de drempel: toon het resultaat op een hoger niveau (scholengemeenschap) of over een langer meetvenster — de kleine-school-modus (W4)'
  }
  return uitkomst
}

/**
 * Responsgraad die zelf de vertrouwelijkheid niet breekt (W12): pas tonen
 * als het aantal genodigden én het aantal respondenten elk boven de drempel
 * liggen — anders verraadt "9 van de 10" wie er niet was.
 */
export function toonbareResponsgraad(
  genodigden: number,
  respondenten: number,
  drempel: number,
): { toonbaar: boolean; procent?: number; reden: string } {
  if (genodigden < drempel) {
    return { toonbaar: false, reden: `minder dan ${drempel} genodigden` }
  }
  if (respondenten < drempel) {
    return { toonbaar: false, reden: `minder dan ${drempel} respondenten` }
  }
  return {
    toonbaar: true,
    procent: Math.round((respondenten / genodigden) * 100),
    reden: 'boven de drempel',
  }
}
