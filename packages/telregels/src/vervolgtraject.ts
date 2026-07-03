import type { ISODatum, TellerInvoer, VervolgtrajectStand } from './types.js'
import { dagenIn, isWeekend, isZomermaand, naarIso, naarUtc } from './kalender.js'
import { resolveerParameters } from './parameters.js'

/**
 * Stand van een vervolgtraject na een beoordeling met werkpunten (testcase E1):
 * telt effectief gepresteerde dagen vanaf de startdatum, met dezelfde telregels
 * als de hoofdteller, en bepaalt wanneer het doel (WERKPUNTEN_EXTRA_EFFECTIEF,
 * in regel 200) bereikt is of zal zijn.
 *
 * Het plafond per schooljaar wordt hier niet toegepast: het doel is een absolute
 * dagenteller binnen het traject. ⚠ TE VALIDEREN samen met testcase-groep E.
 */
export function berekenVervolgtraject(
  invoer: TellerInvoer,
  startDatum: ISODatum,
  doelEffectief = 200,
): VervolgtrajectStand {
  const { aanstellingen, afwezigheden = [], parameters, peildatum } = invoer
  const peil = naarUtc(peildatum)
  const start = naarUtc(startDatum)

  const geteldeDagen = new Set<ISODatum>()
  for (const a of aanstellingen) {
    const vanMs = Math.max(naarUtc(a.start), start)
    const totMs = Math.min(naarUtc(a.einde), peil)
    if (vanMs > totMs) continue
    for (const dag of dagenIn(naarIso(vanMs), naarIso(totMs))) {
      if (geteldeDagen.has(dag)) continue
      const regels = resolveerParameters(parameters, dag).telregels
      if (!regels.korteVakantieTeltMee) {
        throw new Error(
          'korteVakantieTeltMee=false vereist een vakantiekalender als invoer — nog niet ondersteund (⚠ TE VALIDEREN, testcase B2)',
        )
      }
      if (isZomermaand(dag) && !regels.zomervakantieTeltMee) continue
      if (isWeekend(dag) && !regels.weekendTeltMee) continue
      geteldeDagen.add(dag)
    }
  }

  for (const af of afwezigheden) {
    const teltEffectief = resolveerParameters(parameters, af.start).telregels
      .effectieveAfwezigheidscodes.includes(af.code)
    if (teltEffectief) continue
    for (const dag of dagenIn(af.start, af.einde)) geteldeDagen.delete(dag)
  }

  const effectieveDagen = [...geteldeDagen].sort()
  const gepresteerd = effectieveDagen.length
  const voltooidOp = effectieveDagen[doelEffectief - 1]

  return {
    doelEffectief,
    gepresteerd,
    resterend: Math.max(0, doelEffectief - gepresteerd),
    ...(voltooidOp !== undefined ? { voltooidOp } : {}),
  }
}
