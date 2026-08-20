/** ISO-datum in de vorm 'JJJJ-MM-DD'. Alle berekeningen zijn dag-gebaseerd; tijdzones spelen geen rol. */
export type ISODatum = string

export interface Aanstelling {
  start: ISODatum
  /** Inclusieve einddatum van de aanstellingsperiode. */
  einde: ISODatum
  ambt: string
  school?: string
}

export interface Afwezigheid {
  start: ISODatum
  /** Inclusieve einddatum. */
  einde: ISODatum
  /** Afwezigheidscode uit het administratiepakket (zonder medische inhoud, zie DPIA § 1.2). */
  code: string
}

export interface Telregels {
  /** Weekends binnen een aanstellingsperiode tellen mee (TELREGEL_WEEKEND). */
  weekendTeltMee: boolean
  /** Korte vakanties binnen een aanstellingsperiode tellen mee (TELREGEL_KORTE_VAKANTIE). */
  korteVakantieTeltMee: boolean
  /** Zomervakantie (juli/augustus) telt mee (TELREGEL_ZOMERVAKANTIE) — in regel niet; uitzonderingen ⚠ TE VALIDEREN (testcase B2). */
  zomervakantieTeltMee: boolean
  /** Afwezigheidscodes die WÉL als effectief gepresteerd blijven tellen — lijstinhoud ⚠ TE VALIDEREN (testcase C3). */
  effectieveAfwezigheidscodes: readonly string[]
}

/** Eén versie van de decretale parameters, met ingangsdatum (regelparameters.md § 1). */
export interface ParameterVersie {
  geldigVanaf: ISODatum
  geldigTot?: ISODatum
  /** Regelgevende bron met verwijzing (Edulex). */
  bron: string
  /** TADD_ANC_TOTAAL */
  drempelTotaal: number
  /** TADD_ANC_EFFECTIEF */
  drempelEffectief: number
  /** ANC_MAX_PER_SCHOOLJAAR */
  maxPerSchooljaar: number
  telregels: Telregels
}

export interface TellerInvoer {
  aanstellingen: readonly Aanstelling[]
  afwezigheden?: readonly Afwezigheid[]
  /** Alle relevante parameterversies; per dag wordt de versie toegepast die op die dag gold. */
  parameters: readonly ParameterVersie[]
  /** Dagen na de peildatum tellen niet mee; een peildatum in de toekomst geeft een prognose. */
  peildatum: ISODatum
  /**
   * Korte vakanties uit de schoolkalender (herfst, kerst, krokus, paas…).
   * Alleen relevant wanneer een parameterversie korteVakantieTeltMee=false
   * stelt (testcase B2): die dagen tellen dan niet. Vereist in dat geval.
   */
  korteVakanties?: readonly { start: ISODatum; einde: ISODatum }[]
}

export interface SchooljaarTelling {
  /** bv. '2025-2026' */
  schooljaar: string
  totaal: number
  effectief: number
  /** true wanneer het plafond per schooljaar werd toegepast. */
  geplafonneerd: boolean
}

/** De verantwoording maakt elke teller uitlegbaar en reproduceerbaar (testcases G2/G3, datamodel TELLERSNAPSHOT.berekening). */
export interface Verantwoording {
  peildatum: ISODatum
  periodes: { start: ISODatum; einde: ISODatum; school?: string }[]
  afwezigheden: { start: ISODatum; einde: ISODatum; code: string; teltEffectief: boolean }[]
  parameterbronnen: string[]
  telregels: Telregels
}

export interface TellerResultaat {
  dagenTotaal: number
  dagenEffectief: number
  perSchooljaar: SchooljaarTelling[]
  verantwoording: Verantwoording
}

export interface DrempelEvaluatie {
  drempelBereikt: boolean
  /** true → beoordeling door de eerste evaluator vereist vóór 30 juni. */
  beoordelingVereist: boolean
  /** Menselijk leesbare redenen, o.a. "wel voldoende anciënniteit maar te weinig effectief" (testcase C4). */
  redenen: string[]
  deadlines?: {
    kandidaatstellingTadd: ISODatum
    beoordeling: ISODatum
  }
}

export interface VervolgtrajectStand {
  doelEffectief: number
  gepresteerd: number
  resterend: number
  /** De datum waarop de doelstelling (bv. 200 bijkomende effectieve dagen) bereikt werd of zal worden. */
  voltooidOp?: ISODatum
}
