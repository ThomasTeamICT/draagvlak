import type { ISODatum, TellerInvoer, VervolgtrajectStand } from './types.js'
import { naarIso, naarUtc } from './kalender.js'
import { DAG_MS, loopGeteldeDagen, maakParameterResolver, periodesAlsDagenSet } from './telkern.js'

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
  const resolver = maakParameterResolver(parameters)

  const bronnen = new Set<string>()
  const geteldeDagen = new Set<number>()
  loopGeteldeDagen(
    aanstellingen,
    resolver,
    bronnen,
    start,
    peil,
    geteldeDagen,
    () => {},
    periodesAlsDagenSet(invoer.korteVakanties),
  )

  // effectiviteit per dag (G1) — en een afwezigheid buiten de getelde dagen
  // (bv. vóór elke parameterversie) is onschadelijk
  for (const af of afwezigheden) {
    const einde = naarUtc(af.einde)
    for (let t = naarUtc(af.start); t <= einde; t += DAG_MS) {
      if (!geteldeDagen.has(t)) continue
      if (resolver(t).telregels.effectieveAfwezigheidscodes.includes(af.code)) continue
      geteldeDagen.delete(t)
    }
  }

  const effectieveDagen = [...geteldeDagen].sort((a, b) => a - b)
  const gepresteerd = effectieveDagen.length
  const voltooidMs = effectieveDagen[doelEffectief - 1]

  return {
    doelEffectief,
    gepresteerd,
    resterend: Math.max(0, doelEffectief - gepresteerd),
    ...(voltooidMs !== undefined ? { voltooidOp: naarIso(voltooidMs) } : {}),
  }
}
