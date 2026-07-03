import type { ISODatum, ParameterVersie } from './types.js'
import { naarUtc } from './kalender.js'

/**
 * Startset conform regelparameters.md. Waarden overgenomen uit PERS/2019/03;
 * vóór livegang verifiëren tegen de geldende omzendbrieftekst op Edulex
 * (afnameprotocol testcases-telregels.md, stap 1).
 */
export const PERS_2019_03: ParameterVersie = {
  geldigVanaf: '2019-09-01',
  bron: 'PERS/2019/03 — data-onderwijs.vlaanderen.be/edulex/document.aspx?docid=15412',
  drempelTotaal: 290,
  drempelEffectief: 200,
  maxPerSchooljaar: 360,
  telregels: {
    weekendTeltMee: true,
    korteVakantieTeltMee: true,
    zomervakantieTeltMee: false,
    effectieveAfwezigheidscodes: [],
  },
}

/** De versie die op de gegeven dag gold: laatste geldigVanaf ≤ dag, binnen eventuele geldigTot. */
export function resolveerParameters(
  parameters: readonly ParameterVersie[],
  datum: ISODatum,
): ParameterVersie {
  const t = naarUtc(datum)
  let resultaat: ParameterVersie | undefined
  for (const p of parameters) {
    if (naarUtc(p.geldigVanaf) > t) continue
    if (p.geldigTot !== undefined && naarUtc(p.geldigTot) < t) continue
    if (resultaat === undefined || naarUtc(p.geldigVanaf) > naarUtc(resultaat.geldigVanaf)) {
      resultaat = p
    }
  }
  if (resultaat === undefined) throw new Error(`Geen parameterversie geldig op ${datum}`)
  return resultaat
}
