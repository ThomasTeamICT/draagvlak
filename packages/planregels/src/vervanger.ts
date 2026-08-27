import type { ISODatum } from './types.js'

/**
 * Vervangersvoorstellen en noodscenario's (module P3, planning.md).
 *
 * De rangschikking is een suggestie met zichtbare redenen én bezwaren: de
 * directeur ziet niet alleen wie bovenaan staat, maar ook waaróm — en wat het
 * kost. Dat laatste is de kern: een noodmaatregel die niemand vastlegt, is een
 * verlies dat nergens bestaat.
 */

export interface VervangerKandidaat {
  id: string
  /** Lid van het lerarenplatform: hiervoor aangesteld, kost de school niets extra. */
  platformlid?: boolean
  /** Draagt het vereiste bekwaamheidsbewijs voor dit ambt. */
  bevoegd: boolean
  /** Vrij op alle gevraagde momenten. */
  beschikbaar: boolean
  /** Nog niet-ingevulde lestijden binnen de opdracht. */
  vrijeRuimte?: number
  /** Billijkheid: hoeveel vervangingen deze persoon dit schooljaar al deed. */
  teller?: number
  /** Staat zelf voor een klas — inzet maakt een tweede gat. */
  eigenKlas?: boolean
  /** Is zelf zorgleerkracht: inzet betekent dat zorguren wegvallen. */
  zorgopdracht?: number
}

export interface VervangerVoorstel {
  kandidaatId: string
  score: number
  inzetbaar: boolean
  aanbevolen: boolean
  waarom: readonly string[]
  bezwaren: readonly string[]
}

/**
 * Rangschikt kandidaten deterministisch. Geen gewichtenmagie: elke term staat
 * hieronder benoemd en komt terug in `waarom`, zodat de volgorde navertelbaar
 * is voor wie hem in twijfel trekt.
 */
export function stelVervangersVoor(
  kandidaten: readonly VervangerKandidaat[],
): VervangerVoorstel[] {
  const tellers = kandidaten.map((k) => k.teller ?? 0)
  const gemiddeld = tellers.length === 0 ? 0 : tellers.reduce((s, t) => s + t, 0) / tellers.length

  const voorstellen: VervangerVoorstel[] = kandidaten.map((k) => {
    const waarom: string[] = []
    const bezwaren: string[] = []
    let score = 0

    if (k.beschikbaar) { score += 40; waarom.push('vrij op de gevraagde momenten') }
    else bezwaren.push('niet beschikbaar op de gevraagde momenten')

    if (k.bevoegd) { score += 40; waarom.push('draagt het vereiste bekwaamheidsbewijs') }
    else bezwaren.push('geen vereist bekwaamheidsbewijs voor dit ambt')

    if (k.platformlid === true) {
      score += 100
      waarom.push('lid van het lerarenplatform — daar net voor aangesteld, kost de school geen extra middelen')
    }

    const teller = k.teller ?? 0
    score -= teller * 3
    if (teller < gemiddeld) {
      waarom.push(`deed dit schooljaar ${teller} vervangingen, minder dan het teamgemiddelde van ${gemiddeld.toFixed(1)}`)
    } else if (teller > gemiddeld) {
      bezwaren.push(`deed er dit schooljaar al ${teller}, meer dan het teamgemiddelde van ${gemiddeld.toFixed(1)}`)
    }

    const ruimte = k.vrijeRuimte ?? 0
    score += Math.min(ruimte, 12)
    if (ruimte > 0) waarom.push(`heeft nog ${ruimte} lestijden vrije ruimte`)

    if (k.eigenKlas === true) {
      score -= 25
      bezwaren.push('staat zelf voor een klas — inzet verplaatst het gat alleen maar')
    }
    if ((k.zorgopdracht ?? 0) > 0) {
      score -= (k.zorgopdracht ?? 0) * 2
      bezwaren.push(`zorgleerkracht: ${k.zorgopdracht} zorguren vallen weg zolang de vervanging duurt`)
    }

    return {
      kandidaatId: k.id,
      score,
      inzetbaar: k.beschikbaar && k.bevoegd,
      aanbevolen: false,
      waarom,
      bezwaren,
    }
  })

  voorstellen.sort(
    (a, b) =>
      Number(b.inzetbaar) - Number(a.inzetbaar) ||
      b.score - a.score ||
      a.kandidaatId.localeCompare(b.kandidaatId),
  )
  const top = voorstellen.find((v) => v.inzetbaar)
  if (top !== undefined) top.aanbevolen = true
  return voorstellen
}

export type NoodSoort = 'klas_verdelen' | 'zorg_inzetten' | 'klassen_samenvoegen' | 'externe_invaller'

export interface NoodInvoer {
  datum?: ISODatum
  /** Aantal leerlingen in de klas zonder leerkracht. */
  klasgrootte: number
  /** De andere klassen waarover verdeeld kan worden. */
  andereKlassen: readonly { id: string; grootte: number }[]
  /** Zorguren die vandaag opgeofferd kunnen worden. */
  zorgurenBeschikbaar?: number
  /** Staat er een externe invaller op de lijst? */
  externeInvallerBeschikbaar?: boolean
  /** Bovengrens die de school zichzelf oplegt voor een opgevangen klas. */
  maxGroepsgrootte?: number
}

export interface Noodscenario {
  soort: NoodSoort
  mogelijk: boolean
  gevolg: string
  /** Wat het kost. Dit hoort in de log — anders bestaat het verlies niet. */
  verlies: string
  /** Lager is minder ingrijpend. */
  zwaarte: number
}

/**
 * Noodscenario's als er géén vervanger is. Geen van deze opties is gratis;
 * de functie maakt de prijs expliciet zodat ze mee in de audittrail kan.
 */
export function noodscenarios(invoer: NoodInvoer): Noodscenario[] {
  const max = invoer.maxGroepsgrootte ?? 30
  const scenarios: Noodscenario[] = []

  const n = invoer.andereKlassen.length
  if (n > 0) {
    const perKlas = Math.ceil(invoer.klasgrootte / n)
    const grootste = Math.max(...invoer.andereKlassen.map((k) => k.grootte)) + perKlas
    scenarios.push({
      soort: 'klas_verdelen',
      mogelijk: grootste <= max,
      gevolg: `de ${invoer.klasgrootte} leerlingen worden verdeeld over ${n} klassen: elke klas krijgt er ongeveer ${perKlas} bij, de grootste groep komt op ${grootste}`,
      verlies:
        grootste > max
          ? `de grootste groep zou op ${grootste} leerlingen komen, boven de eigen grens van ${max}`
          : `${n} collega's geven vandaag les aan een grotere groep; wat gepland stond, schuift op`,
      zwaarte: 2,
    })
  }

  const zorg = invoer.zorgurenBeschikbaar ?? 0
  if (zorg > 0) {
    scenarios.push({
      soort: 'zorg_inzetten',
      mogelijk: true,
      gevolg: 'de zorgleerkracht neemt de klas over',
      verlies: `${zorg} zorguren vallen weg — precies bij de leerlingen die ze het hardst nodig hebben. Dit is de kost die nergens gelogd wordt.`,
      zwaarte: 3,
    })
  }

  if (n > 0) {
    const partner = [...invoer.andereKlassen].sort((a, b) => a.grootte - b.grootte)[0]!
    const samen = partner.grootte + invoer.klasgrootte
    scenarios.push({
      soort: 'klassen_samenvoegen',
      mogelijk: samen <= max,
      gevolg: `samenvoegen met klas ${partner.id}: één groep van ${samen} leerlingen bij één leerkracht`,
      verlies:
        samen > max
          ? `${samen} leerlingen in één groep, boven de eigen grens van ${max}`
          : 'één leerkracht draagt twee klassen; differentiatie ligt die dag stil',
      zwaarte: 4,
    })
  }

  if (invoer.externeInvallerBeschikbaar === true) {
    scenarios.push({
      soort: 'externe_invaller',
      mogelijk: true,
      gevolg: 'een externe invaller neemt de klas over',
      verlies: 'iemand zonder binding met de klas; de continuïteit van de leerlijn breekt',
      zwaarte: 1,
    })
  }

  return scenarios.sort((a, b) => Number(b.mogelijk) - Number(a.mogelijk) || a.zwaarte - b.zwaarte)
}
