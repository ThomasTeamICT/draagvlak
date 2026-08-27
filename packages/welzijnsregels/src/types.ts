/**
 * Module-familie W — kernbegrippen (functioneel ontwerp welzijn.md).
 *
 * De classificatie is de spil van alles: zij bepaalt — technisch bindend —
 * in welk bevragingstype een vraag mag zitten, welke drempel geldt en wat
 * er van het antwoord zichtbaar wordt. De klasse van de vraag beslist,
 * nooit de titel van de bevraging.
 */

/** A: feit/keuze/beschikbaarheid · B: beleving/oordeel/relatie · C: gezondheid. */
export type Vraagklasse = 'A' | 'B' | 'C'

/** Op naam ("Vraag aan personen") of vertrouwelijk-geaggregeerd ("Teambevraging"). */
export type BevragingsType = 'op_naam' | 'team'

export type VraagVorm = 'keuze' | 'meerkeuze' | 'schaal' | 'ja_nee' | 'datumkeuze' | 'tekst'

export interface Vraag {
  klasse: Vraagklasse
  vorm: VraagVorm
}

export interface KlasseOordeel {
  toegestaan: boolean
  reden: string
}

/** Een te rapporteren cel: een groep respondenten met een aantal. */
export interface Cel {
  /** Stabiele sleutel van de cel (bv. 'team:kleuter' of 'totaal'). */
  sleutel: string
  /** Aantal respondenten waarop de cel steunt. */
  n: number
}

export interface CelUitkomst extends Cel {
  zichtbaar: boolean
  reden: string
}

export interface SuppressieUitkomst {
  cellen: readonly CelUitkomst[]
  /** Is er (na suppressie) überhaupt iets te tonen? */
  ietsZichtbaar: boolean
  /** Uitleg voor de kleine-school-modus als álles onderdrukt is. */
  advies?: string
}
