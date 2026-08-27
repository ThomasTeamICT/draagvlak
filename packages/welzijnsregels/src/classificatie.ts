import type { BevragingsType, KlasseOordeel, Vraagklasse } from './types.js'

/**
 * W1/W2 (welzijn.md): de typekeuze is onomkeerbaar en de classificatie is
 * technisch bindend. Een belevingsvraag in een op-naam-bevraging is geen
 * waarschuwing maar een blokkade; klasse C bestaat niet in v1.
 */
export function magVraagInBevraging(type: BevragingsType, klasse: Vraagklasse): KlasseOordeel {
  if (klasse === 'C') {
    return {
      toegestaan: false,
      reden:
        'klasse C (gezondheid) is niet aanmaakbaar door schoolrollen: gezondheidsvragen horen bij de externe preventiedienst of een écht anonieme afname — niet in dit platform (ontwerpbeslissing W1)',
    }
  }
  if (type === 'op_naam' && klasse === 'B') {
    return {
      toegestaan: false,
      reden:
        'een beleving of oordeel (klasse B) mag nooit op naam bevraagd worden: individueel welzijn is een gesprek, geen formulier (W9) — maak er een teambevraging van, of stel de vraag in een gesprek',
    }
  }
  return { toegestaan: true, reden: 'toegestaan' }
}

/** Standaarddrempels (W4): n ≥ 5 overal; n ≥ 10 voor vrije tekst in klasse B. */
export const DREMPEL_STANDAARD = 5
export const DREMPEL_VRIJE_TEKST = 10

export function drempelVoor(klasse: Vraagklasse, vrijeTekst: boolean, geconfigureerd?: number): number {
  const basis = klasse === 'B' && vrijeTekst ? DREMPEL_VRIJE_TEKST : DREMPEL_STANDAARD
  // configureerbaar omhoog, technisch onmogelijk omlaag
  return Math.max(basis, geconfigureerd ?? 0)
}
