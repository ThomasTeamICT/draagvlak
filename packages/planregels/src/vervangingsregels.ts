import { dagenIn, isWeekend } from '@draagvlak/telregels'
import type { ISODatum, Onderwijsniveau } from './types.js'

/**
 * Vervangingen (module P3, planning.md).
 *
 * Waarom dit een eigen regelmachine is: een directeur die iemand ziek ziet
 * uitvallen, moet binnen het uur weten wélk kanaal openstaat. Dat hangt niet
 * af van goede wil maar van geteld recht: hoeveel wérkdagen duurt de reeks,
 * telt de vorige afwezigheid mee, is er nog contingent, moet er eerst een
 * reaffectatiecheck gebeuren. Vandaag zit die redenering in hoofden en in
 * Excel; hier wordt ze telbaar en navertelbaar.
 *
 * Ontwerpprincipes (gelijk aan P1/P2):
 * - het advies is een SUGGESTIE met zichtbare verantwoording — een mens
 *   beslist (beslispunt 2: nooit geautomatiseerde besluitvorming);
 * - deterministisch: dezelfde invoer geeft altijd hetzelfde advies, dus
 *   "waarom kreeg ik geen vervanger?" heeft een controleerbaar antwoord;
 * - alle regelgevingswaarden zijn geparametriseerd per schooljaar, nooit
 *   hardgecodeerd — regelgeving veroudert binnen het jaar.
 *
 * ⚠ TE VALIDEREN: alle drempels en contingenten hieronder komen uit
 * secundair regelgevingsonderzoek. Vóór livegang aftoetsen met een
 * personeelsdienst tegen de primaire teksten (Edulex).
 */

export type Vervangingskanaal =
  | 'lerarenplatform'
  | 'tijdelijke_aanstelling'
  | 'vervangingseenheden'
  | 'intern'
  | 'geen_vervanging'

export interface VervangingRegelboek {
  vanafSchooljaar: string
  bron: string
  /** Vanaf hoeveel samengetelde werkdagen ontstaat recht op een vervangingsaanstelling. */
  drempelWerkdagen: Record<Onderwijsniveau, number>
  /** Vanaf hoeveel werkdagen moet eerst de reaffectatie-/wedertewerkstellingscheck gebeuren. */
  reaffectatieVanafWerkdagen: number
  /** Bestaat het lerarenplatform dit schooljaar op dit niveau? */
  lerarenplatform: Record<Onderwijsniveau, boolean>
  /** Kan de school korte afwezigheden betalen uit een contingent vervangingseenheden? */
  vervangingseenheden: Record<Onderwijsniveau, boolean>
  /** Eenheden die één vervangen werkdag kost. */
  eenhedenPerWerkdag: number
  /**
   * Twee afwezigheden van dezelfde persoon tellen samen als er niet meer dan
   * dit aantal werkdagen tussen zit — anders knipt een dag aanwezigheid de
   * reeks in stukken die elk onder de drempel blijven.
   */
  aaneensluitendVensterWerkdagen: number
}

export const VERVANGINGSREGELS: readonly VervangingRegelboek[] = [
  {
    vanafSchooljaar: '2000-2001',
    bron: 'Algemeen regime tijdelijke vervangingen — vervangingsaanstelling vanaf 10 werkdagen aaneensluitende afwezigheid, met voorafgaande reaffectatie-/wedertewerkstellingscheck (⚠ te valideren tegen PERS/2005/21 en het reaffectatiebesluit van 29/4/1992)',
    drempelWerkdagen: { basis: 10, secundair: 10 },
    reaffectatieVanafWerkdagen: 10,
    lerarenplatform: { basis: false, secundair: false },
    vervangingseenheden: { basis: false, secundair: false },
    eenhedenPerWerkdag: 1,
    aaneensluitendVensterWerkdagen: 1,
  },
  {
    vanafSchooljaar: '2018-2019',
    bron: 'Lerarenplatform ingevoerd: vervangers met een aanstelling tot 30 juni, inzetbaar vanaf dag één (⚠ te valideren tegen Bao/2018/01 en SO/2018/01)',
    drempelWerkdagen: { basis: 10, secundair: 10 },
    reaffectatieVanafWerkdagen: 10,
    lerarenplatform: { basis: true, secundair: true },
    vervangingseenheden: { basis: false, secundair: false },
    eenhedenPerWerkdag: 1,
    aaneensluitendVensterWerkdagen: 1,
  },
  {
    vanafSchooljaar: '2021-2022',
    bron: 'Lerarenplatform behouden in het basisonderwijs, stopgezet in het secundair; contingent vervangingseenheden voor korte afwezigheden in het basisonderwijs (⚠ te valideren — jaartal, niveaus én contingentberekening)',
    drempelWerkdagen: { basis: 10, secundair: 10 },
    reaffectatieVanafWerkdagen: 10,
    lerarenplatform: { basis: true, secundair: false },
    vervangingseenheden: { basis: true, secundair: false },
    eenhedenPerWerkdag: 1,
    aaneensluitendVensterWerkdagen: 1,
  },
]

/** Het vervangingsregelboek dat geldt voor het gegeven schooljaar ('JJJJ-JJJJ'). */
export function vervangingsregelboekVoor(schooljaar: string): VervangingRegelboek {
  let resultaat: VervangingRegelboek | undefined
  for (const boek of VERVANGINGSREGELS) {
    if (boek.vanafSchooljaar > schooljaar) continue
    if (resultaat === undefined || boek.vanafSchooljaar > resultaat.vanafSchooljaar) resultaat = boek
  }
  if (resultaat === undefined) throw new Error(`Geen vervangingsregelboek voor schooljaar ${schooljaar}`)
  return resultaat
}

export interface Afwezigheidsperiode {
  id?: string
  start: ISODatum
  einde: ISODatum
  /** Vrije tekst uit de bron (ziekte, verlof…). Alleen voor de verantwoording. */
  code?: string
}

/** Werkdagen in een periode: weekdagen minus de vrije dagen uit de schoolkalender. */
export function werkdagenIn(
  start: ISODatum,
  einde: ISODatum,
  vrijeDagen: ReadonlySet<ISODatum> = new Set(),
): ISODatum[] {
  if (einde < start) return []
  const dagen: ISODatum[] = []
  for (const dag of dagenIn(start, einde)) {
    if (isWeekend(dag) || vrijeDagen.has(dag)) continue
    dagen.push(dag)
  }
  return dagen
}

export interface Reeks {
  start: ISODatum
  einde: ISODatum
  werkdagen: number
  onderdelen: readonly Afwezigheidsperiode[]
}

/**
 * Koppelt afwezigheden van één persoon tot reeksen. Een dag aanwezigheid
 * tussen twee ziekteperiodes knipt de reeks niet automatisch door: alleen
 * een onderbreking van meer dan `venster` werkdagen doet dat.
 */
export function koppelReeksen(
  afwezigheden: readonly Afwezigheidsperiode[],
  vrijeDagen: ReadonlySet<ISODatum> = new Set(),
  vensterWerkdagen = 1,
): Reeks[] {
  const geldig = afwezigheden.filter((a) => a.einde >= a.start)
  const gesorteerd = [...geldig].sort((a, b) => a.start.localeCompare(b.start) || a.einde.localeCompare(b.einde))
  const reeksen: Reeks[] = []

  for (const a of gesorteerd) {
    const lopend = reeksen[reeksen.length - 1]
    if (lopend !== undefined) {
      // gat tussen het einde van de reeks en de start van deze periode
      const gat = werkdagenIn(volgendeDag(lopend.einde), vorigeDag(a.start), vrijeDagen).length
      const overlapt = a.start <= lopend.einde
      if (overlapt || gat <= vensterWerkdagen) {
        lopend.einde = a.einde > lopend.einde ? a.einde : lopend.einde
        ;(lopend.onderdelen as Afwezigheidsperiode[]).push(a)
        continue
      }
    }
    reeksen.push({ start: a.start, einde: a.einde, werkdagen: 0, onderdelen: [a] })
  }

  // werkdagen tellen we over de effectieve afwezigheidsdagen, niet over het gat
  for (const r of reeksen) {
    const dagen = new Set<ISODatum>()
    for (const deel of r.onderdelen) for (const d of werkdagenIn(deel.start, deel.einde, vrijeDagen)) dagen.add(d)
    r.werkdagen = dagen.size
  }
  return reeksen
}

function volgendeDag(datum: ISODatum): ISODatum {
  const d = new Date(datum + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}
function vorigeDag(datum: ISODatum): ISODatum {
  const d = new Date(datum + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

export interface KanaalOptie {
  kanaal: Vervangingskanaal
  mogelijk: boolean
  reden: string
}

export interface KanaalAdvies {
  reeks: Reeks
  /** Werkdagen die meetellen voor de drempel — inclusief eerder gekoppelde afwezigheden. */
  werkdagen: number
  drempel: number
  drempelBereikt: boolean
  opties: readonly KanaalOptie[]
  aanbevolen: Vervangingskanaal
  /** Checks die een mens moet uitvoeren vóór hij het kanaal gebruikt. */
  verplichteChecks: readonly { code: string; boodschap: string }[]
  eenhedenNodig: number
  verantwoording: readonly string[]
  bron: string
}

export interface KanaalInvoer {
  schooljaar: string
  niveau: Onderwijsniveau
  /** Alle afwezigheden van deze persoon in dit schooljaar — nodig om reeksen te koppelen. */
  afwezigheden: readonly Afwezigheidsperiode[]
  /** De afwezigheid waarover het advies gaat; standaard de laatste. */
  peilDatum?: ISODatum
  vrijeDagen?: readonly ISODatum[]
  /** Resterend contingent vervangingseenheden van de school. */
  contingentRestant?: number
  /** Is er een lid van het lerarenplatform vrij voor deze opdracht? */
  platformlidBeschikbaar?: boolean
  regelboek?: VervangingRegelboek
}

/**
 * Kanaalkeuze-assistent: welk vervangingskanaal staat open voor deze
 * afwezigheid, en wat moet er eerst gecontroleerd worden?
 */
export function bepaalKanaal(invoer: KanaalInvoer): KanaalAdvies {
  const boek = invoer.regelboek ?? vervangingsregelboekVoor(invoer.schooljaar)
  const vrij = new Set(invoer.vrijeDagen ?? [])
  const reeksen = koppelReeksen(invoer.afwezigheden, vrij, boek.aaneensluitendVensterWerkdagen)

  const peil = invoer.peilDatum
  const reeks =
    (peil !== undefined ? reeksen.find((r) => peil >= r.start && peil <= r.einde) : undefined) ??
    reeksen[reeksen.length - 1]

  if (reeks === undefined) {
    return {
      reeks: { start: '', einde: '', werkdagen: 0, onderdelen: [] },
      werkdagen: 0,
      drempel: boek.drempelWerkdagen[invoer.niveau],
      drempelBereikt: false,
      opties: [],
      aanbevolen: 'geen_vervanging',
      verplichteChecks: [],
      eenhedenNodig: 0,
      verantwoording: ['geen afwezigheid gevonden om te beoordelen'],
      bron: boek.bron,
    }
  }

  const drempel = boek.drempelWerkdagen[invoer.niveau]
  const werkdagen = reeks.werkdagen
  const bereikt = werkdagen >= drempel
  const eenhedenNodig = werkdagen * boek.eenhedenPerWerkdag
  const contingent = invoer.contingentRestant ?? 0
  const platformActief = boek.lerarenplatform[invoer.niveau]
  const eenhedenActief = boek.vervangingseenheden[invoer.niveau]
  const platformVrij = invoer.platformlidBeschikbaar === true

  const verantwoording: string[] = []
  if (reeks.onderdelen.length > 1) {
    verantwoording.push(
      `${reeks.onderdelen.length} afwezigheden zijn samengeteld tot één reeks van ${reeks.start} t/m ${reeks.einde}: er zat telkens hoogstens ${boek.aaneensluitendVensterWerkdagen} werkdag(en) tussen`,
    )
  }
  verantwoording.push(
    `${werkdagen} werkdagen afwezig (weekends en kalendervrije dagen niet meegeteld); drempel voor ${invoer.niveau}onderwijs is ${drempel}`,
  )

  const opties: KanaalOptie[] = [
    {
      kanaal: 'lerarenplatform',
      mogelijk: platformActief && platformVrij,
      reden: !platformActief
        ? `geen lerarenplatform in het ${invoer.niveau}onderwijs dit schooljaar`
        : platformVrij
          ? 'een platformlid is vrij — die is hier net voor aangesteld, en de inzet kost de school geen extra middelen'
          : 'het lerarenplatform bestaat, maar er is nu geen lid vrij',
    },
    {
      kanaal: 'tijdelijke_aanstelling',
      mogelijk: bereikt,
      reden: bereikt
        ? `de reeks haalt de drempel van ${drempel} werkdagen — een vervangingsaanstelling is mogelijk`
        : `nog ${drempel - werkdagen} werkdagen te kort voor de drempel van ${drempel}`,
    },
    {
      kanaal: 'vervangingseenheden',
      mogelijk: eenhedenActief && contingent >= eenhedenNodig && eenhedenNodig > 0,
      reden: !eenhedenActief
        ? `geen contingent vervangingseenheden in het ${invoer.niveau}onderwijs dit schooljaar`
        : contingent >= eenhedenNodig
          ? `${eenhedenNodig} van de ${contingent} resterende eenheden volstaan om deze reeks te dekken`
          : `${eenhedenNodig} eenheden nodig, nog ${contingent} over — onvoldoende`,
    },
    {
      kanaal: 'intern',
      mogelijk: true,
      reden: 'altijd mogelijk, maar het gat verschuift naar een collega — leg vast wat het kost',
    },
  ]

  const volgorde: Vervangingskanaal[] = bereikt
    ? ['lerarenplatform', 'tijdelijke_aanstelling', 'vervangingseenheden', 'intern']
    : ['lerarenplatform', 'vervangingseenheden', 'tijdelijke_aanstelling', 'intern']
  const aanbevolen =
    volgorde.find((k) => opties.find((o) => o.kanaal === k)?.mogelijk === true) ?? 'geen_vervanging'

  const verplichteChecks: { code: string; boodschap: string }[] = []
  if (aanbevolen === 'tijdelijke_aanstelling' && werkdagen >= boek.reaffectatieVanafWerkdagen) {
    verplichteChecks.push({
      code: 'reaffectatie',
      boodschap: `vanaf ${boek.reaffectatieVanafWerkdagen} werkdagen moet je eerst nagaan of er een te reaffecteren of weder tewerk te stellen personeelslid is voordat je zelf iemand aanstelt (${boek.bron})`,
    })
  }
  if (aanbevolen === 'vervangingseenheden') {
    verplichteChecks.push({
      code: 'contingent',
      boodschap: `deze inzet verbruikt ${eenhedenNodig} eenheden; er blijven er ${contingent - eenhedenNodig} over voor de rest van het schooljaar`,
    })
  }
  if (aanbevolen === 'intern') {
    verplichteChecks.push({
      code: 'noodmaatregel',
      boodschap:
        'kies een noodscenario en leg vast wát je opoffert — zorguren die vandaag wegvallen zijn de onzichtbaarste kost van het lerarentekort',
    })
  }

  verantwoording.push(
    `aanbevolen kanaal: ${aanbevolen} — ${opties.find((o) => o.kanaal === aanbevolen)?.reden ?? ''}`,
  )

  return {
    reeks,
    werkdagen,
    drempel,
    drempelBereikt: bereikt,
    opties,
    aanbevolen,
    verplichteChecks,
    eenhedenNodig,
    verantwoording,
    bron: boek.bron,
  }
}
