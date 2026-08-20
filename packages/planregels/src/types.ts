export type ISODatum = string

export type Onderwijsniveau = 'basis' | 'secundair'

export type Dagdeel = 'voormiddag' | 'namiddag' | 'heel'

export type KalenderType =
  | 'vakantie'
  | 'facultatieve_verlofdag'
  | 'pedagogische_studiedag'
  | 'wettelijke_feestdag'
  | 'lesvrij_overmacht'

export interface KalenderPeriode {
  type: KalenderType
  start: ISODatum
  einde: ISODatum
  dagdeel: Dagdeel
  omschrijving?: string
  opvangVoorzien?: boolean
}

/**
 * Kalenderregelboek met ingangsschooljaar en bronvermelding — zelfde patroon
 * als de telregel-parameterversies: regelgeving wijzigt per schooljaar, dus
 * regels zijn data met een geldigheidsbereik, nooit hardgecodeerde waarheden.
 */
export interface KalenderRegelboek {
  /** Eerste schooljaar waarin dit regelboek geldt, bv. '2026-2027'. */
  vanafSchooljaar: string
  bron: string
  /** Maximum facultatieve verlofdagen, uitgedrukt in halve dagen. */
  maxFacultatieveHalveDagen: Record<Onderwijsniveau, number>
  /** Maximum lesvrije pedagogische studiedagen, uitgedrukt in halve dagen. */
  maxPedagogischeStudiedagenHalve: Record<Onderwijsniveau, number>
  /** Moeten leerlingen opvang krijgen op lesvrije dagen? */
  opvangplichtBijLesvrij: boolean
}

export interface KalenderMelding {
  ernst: 'fout' | 'waarschuwing'
  code: string
  boodschap: string
}
