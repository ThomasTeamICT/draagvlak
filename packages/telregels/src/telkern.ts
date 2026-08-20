import type { ISODatum, ParameterVersie } from './types.js'
import { naarIso, naarUtc } from './kalender.js'

export const DAG_MS = 86_400_000

/**
 * Interne telkern, gedeeld door teller.ts en vervolgtraject.ts.
 *
 * De dag-per-dag-semantiek (G1: telregels van de versie die op díé dag gold)
 * blijft exact behouden, maar de lus werkt op UTC-milliseconden in plaats van
 * per dag ISO-strings te bouwen en terug te valideren — op tenant-schaal
 * (2000 personeelsleden × 5 schooljaren) het verschil tussen ~19 s en ~2 s
 * pure rekentijd per herberekening.
 */

/**
 * Segment-gecachete parameterresolutie: de winnende versie is constant tussen
 * twee geldigheidsgrenzen, dus binnen zo'n venster volstaat één vergelijking.
 */
export function maakParameterResolver(
  parameters: readonly ParameterVersie[],
): (t: number) => ParameterVersie {
  const versies = parameters.map((p) => ({
    p,
    vanaf: naarUtc(p.geldigVanaf),
    tot: p.geldigTot !== undefined ? naarUtc(p.geldigTot) : Infinity,
  }))
  let huidig: ParameterVersie | undefined
  let vensterVan = 1
  let vensterTot = 0

  return (t: number): ParameterVersie => {
    if (huidig !== undefined && t >= vensterVan && t <= vensterTot) return huidig

    let beste: (typeof versies)[number] | undefined
    for (const v of versies) {
      if (v.vanaf > t || v.tot < t) continue
      if (beste === undefined || v.vanaf > beste.vanaf) beste = v
    }
    if (beste === undefined) throw new Error(`Geen parameterversie geldig op ${naarIso(t)}`)

    // venster rond t waarbinnen geen enkele geldigheidsgrens overschreden
    // wordt — daarbinnen kan de winnaar niet wisselen
    let van = beste.vanaf
    let tot = beste.tot
    for (const v of versies) {
      if (v.vanaf > t) tot = Math.min(tot, v.vanaf - DAG_MS)
      if (v.tot < t) van = Math.max(van, v.tot + DAG_MS)
    }
    huidig = beste.p
    vensterVan = van
    vensterTot = tot
    return beste.p
  }
}

/**
 * Loopt alle telbare kalenderdagen van de aanstellingen af (elke dag telt één
 * keer, ook bij overlappende aanstellingen — F1) en roept `cb` aan voor elke
 * dag die volgens de telregels van die dag meetelt. Weekdag en maand worden
 * incrementeel bijgehouden zodat er per dag geen datum geparset wordt.
 */
/** Alle kalenderdagen van de periodes als UTC-ms-set (voor de korte vakanties). */
export function periodesAlsDagenSet(
  periodes: readonly { start: ISODatum; einde: ISODatum }[] | undefined,
): Set<number> | undefined {
  if (periodes === undefined) return undefined
  const dagen = new Set<number>()
  for (const p of periodes) {
    const einde = naarUtc(p.einde)
    for (let t = naarUtc(p.start); t <= einde; t += DAG_MS) dagen.add(t)
  }
  return dagen
}

export function loopGeteldeDagen(
  aanstellingen: readonly { start: ISODatum; einde: ISODatum }[],
  resolver: (t: number) => ParameterVersie,
  bronnen: Set<string>,
  ondergrensMs: number | undefined,
  peilMs: number,
  geteldeDagen: Set<number>,
  cb: (t: number, jaar: number, maand: number) => void,
  korteVakantieDagen?: Set<number>,
): void {
  for (const a of aanstellingen) {
    let t = naarUtc(a.start)
    if (ondergrensMs !== undefined && ondergrensMs > t) t = ondergrensMs
    const einde = Math.min(naarUtc(a.einde), peilMs)
    if (t > einde) continue

    const d = new Date(t)
    let weekdag = d.getUTCDay()
    let jaar = d.getUTCFullYear()
    let maand = d.getUTCMonth() + 1
    let volgendeMaand = Date.UTC(jaar, maand, 1)

    for (; t <= einde; t += DAG_MS, weekdag = (weekdag + 1) % 7) {
      if (t >= volgendeMaand) {
        maand += 1
        if (maand === 13) {
          maand = 1
          jaar += 1
        }
        volgendeMaand = Date.UTC(jaar, maand, 1)
      }
      if (geteldeDagen.has(t)) continue

      const versie = resolver(t)
      bronnen.add(versie.bron)
      const regels = versie.telregels
      if (!regels.korteVakantieTeltMee) {
        // testcase B2: dagen in korte vakanties tellen niet — vereist de
        // schoolkalender als invoer (⚠ TE VALIDEREN welke periodes precies)
        if (korteVakantieDagen === undefined) {
          throw new Error(
            'korteVakantieTeltMee=false vereist de schoolkalender (korteVakanties) als invoer (testcase B2)',
          )
        }
        if (korteVakantieDagen.has(t)) continue
      }
      if ((maand === 7 || maand === 8) && !regels.zomervakantieTeltMee) continue
      if ((weekdag === 0 || weekdag === 6) && !regels.weekendTeltMee) continue

      geteldeDagen.add(t)
      cb(t, jaar, maand)
    }
  }
}
