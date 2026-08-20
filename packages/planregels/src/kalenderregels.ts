import { dagenIn, isWeekend } from '@draagvlak/telregels'
import type {
  KalenderMelding,
  KalenderPeriode,
  KalenderRegelboek,
  Onderwijsniveau,
} from './types.js'

/**
 * Kalenderregelboeken (functioneel ontwerp planning.md § 2/P1).
 *
 * ⚠ TE VALIDEREN: alle waarden zijn overgenomen uit het regelgevingsonderzoek
 * (secundaire bronnen met omzendbriefvermelding; primaire Edulex-teksten waren
 * vanuit de onderzoeksomgeving niet integraal raadpleegbaar). Vóór livegang
 * verifiëren tegen BaO/2020/03 en SO 74 (huidig regime) en de hervormings-
 * omzendbrief per 1/9/2026, samen met een personeelsdienst.
 */
export const KALENDERREGELS: readonly KalenderRegelboek[] = [
  {
    vanafSchooljaar: '2000-2001',
    bron: 'BaO/2020/03 (basis) en SO 74 (secundair) — regime t/m schooljaar 2025-2026',
    // basis: 2 facultatieve verlofdagen, splitsbaar in halve dagen (= 4 halve);
    // secundair: 1 dag of 2 halve dagen
    maxFacultatieveHalveDagen: { basis: 4, secundair: 2 },
    // basis: 1,5 dag (= 3 halve); secundair: 1 dag (= 2 halve)
    maxPedagogischeStudiedagenHalve: { basis: 3, secundair: 2 },
    opvangplichtBijLesvrij: false,
  },
  {
    vanafSchooljaar: '2026-2027',
    bron: 'Hervorming schooljaarorganisatie per 1/9/2026 (beslissing min. Demir, dec. 2025) — facultatieve verlofdagen afgeschaft; basis max. 3 halve studiedagen; secundair geen lesschorsing meer voor studiedagen; opvangplicht',
    maxFacultatieveHalveDagen: { basis: 0, secundair: 0 },
    maxPedagogischeStudiedagenHalve: { basis: 3, secundair: 0 },
    opvangplichtBijLesvrij: true,
  },
]

/** Het regelboek dat geldt voor het gegeven schooljaar ('JJJJ-JJJJ'). */
export function regelboekVoor(schooljaar: string): KalenderRegelboek {
  let resultaat: KalenderRegelboek | undefined
  for (const boek of KALENDERREGELS) {
    if (boek.vanafSchooljaar > schooljaar) continue
    if (resultaat === undefined || boek.vanafSchooljaar > resultaat.vanafSchooljaar) {
      resultaat = boek
    }
  }
  if (resultaat === undefined) throw new Error(`Geen kalenderregelboek voor schooljaar ${schooljaar}`)
  return resultaat
}

/** Grenzen van een schooljaar 'JJJJ-JJJJ': 1 september t/m 31 augustus. */
export function schooljaarGrenzen(schooljaar: string): { start: string; einde: string } {
  if (!/^\d{4}-\d{4}$/.test(schooljaar)) throw new Error(`Ongeldig schooljaar: ${schooljaar}`)
  const [van, tot] = schooljaar.split('-').map(Number)
  if (tot !== van! + 1) throw new Error(`Ongeldig schooljaar: ${schooljaar}`)
  return { start: `${van}-09-01`, einde: `${tot}-08-31` }
}

/** Telbare halve dagen van een periode: weekdagen × dagdeelfactor. */
function halveDagenVan(periode: KalenderPeriode): number {
  let weekdagen = 0
  for (const dag of dagenIn(periode.start, periode.einde)) {
    if (!isWeekend(dag)) weekdagen += 1
  }
  return weekdagen * (periode.dagdeel === 'heel' ? 2 : 1)
}

/**
 * Valideert een kalenderjaargang tegen het regelboek van dat schooljaar.
 * Fouten blokkeren opslaan; waarschuwingen informeren (transparantie boven
 * betutteling — het regelboek zelf is ⚠ TE VALIDEREN).
 */
export function valideerKalender(
  periodes: readonly KalenderPeriode[],
  schooljaar: string,
  niveau: Onderwijsniveau,
): KalenderMelding[] {
  const meldingen: KalenderMelding[] = []
  const boek = regelboekVoor(schooljaar)
  const grenzen = schooljaarGrenzen(schooljaar)

  let facultatiefHalve = 0
  let studiedagHalve = 0

  for (const p of periodes) {
    if (p.einde < p.start) {
      meldingen.push({
        ernst: 'fout',
        code: 'periode_omgekeerd',
        boodschap: `periode ${p.start} – ${p.einde}: einde ligt vóór start`,
      })
      continue
    }
    if (p.start < grenzen.start || p.einde > grenzen.einde) {
      meldingen.push({
        ernst: 'fout',
        code: 'buiten_schooljaar',
        boodschap: `periode ${p.start} – ${p.einde} valt buiten schooljaar ${schooljaar} (${grenzen.start} t/m ${grenzen.einde})`,
      })
    }

    if (p.type === 'facultatieve_verlofdag') facultatiefHalve += halveDagenVan(p)
    if (p.type === 'pedagogische_studiedag') studiedagHalve += halveDagenVan(p)

    if (
      boek.opvangplichtBijLesvrij &&
      (p.type === 'pedagogische_studiedag' || p.type === 'lesvrij_overmacht') &&
      p.opvangVoorzien !== true
    ) {
      meldingen.push({
        ernst: 'waarschuwing',
        code: 'opvangplicht',
        boodschap: `${p.start}: leerlingen hebben vanaf 2026-2027 recht op zinvolle opvang op lesvrije dagen — opvang is niet aangeduid`,
      })
    }
  }

  const maxFacultatief = boek.maxFacultatieveHalveDagen[niveau]
  if (facultatiefHalve > maxFacultatief) {
    meldingen.push({
      ernst: 'fout',
      code: 'facultatief_overschreden',
      boodschap:
        maxFacultatief === 0
          ? `facultatieve verlofdagen zijn afgeschaft vanaf schooljaar 2026-2027 (${boek.bron})`
          : `${facultatiefHalve} halve facultatieve verlofdagen gepland; maximum voor ${niveau} is ${maxFacultatief} (${boek.bron})`,
    })
  }

  const maxStudiedagen = boek.maxPedagogischeStudiedagenHalve[niveau]
  if (studiedagHalve > maxStudiedagen) {
    meldingen.push({
      ernst: 'fout',
      code: 'studiedagen_overschreden',
      boodschap:
        maxStudiedagen === 0
          ? `pedagogische studiedagen mogen in het ${niveau} onderwijs niet meer tot lesschorsing leiden vanaf 2026-2027 (${boek.bron})`
          : `${studiedagHalve} halve pedagogische studiedagen gepland; maximum voor ${niveau} is ${maxStudiedagen} (${boek.bron})`,
    })
  }

  // overlappende periodes: dubbel geplande dagen zijn bijna altijd een vergissing
  const gesorteerd = [...periodes]
    .filter((p) => p.einde >= p.start)
    .sort((a, b) => a.start.localeCompare(b.start))
  for (let i = 1; i < gesorteerd.length; i++) {
    const vorige = gesorteerd[i - 1]!
    const huidige = gesorteerd[i]!
    if (huidige.start <= vorige.einde) {
      meldingen.push({
        ernst: 'waarschuwing',
        code: 'overlap',
        boodschap: `periodes overlappen: ${vorige.type} t/m ${vorige.einde} en ${huidige.type} vanaf ${huidige.start}`,
      })
    }
  }

  return meldingen
}
