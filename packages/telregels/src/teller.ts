import type {
  ISODatum,
  SchooljaarTelling,
  TellerInvoer,
  TellerResultaat,
} from './types.js'
import { dagenIn, isWeekend, isZomermaand, naarIso, naarUtc, schooljaarVan } from './kalender.js'
import { resolveerParameters } from './parameters.js'

/**
 * Berekent dienstanciënniteit (totaal en effectief gepresteerd) tot en met de peildatum.
 *
 * Semantiek (testcases-telregels.md):
 * - elke kalenderdag binnen een aanstellingsperiode telt één keer, ook bij
 *   gelijktijdige aanstellingen in meerdere scholen (F1);
 * - weekends en korte vakanties binnen de periode tellen mee; de zomervakantie
 *   in regel niet (A2, B1); telregels komen uit de parameterversie die op die dag gold (G1);
 * - afwezigheden verminderen "effectief gepresteerd", niet het totaal (C1),
 *   tenzij de code op de lijst effectieve codes staat (C3);
 * - per schooljaar geldt een plafond (B3);
 * - het resultaat bevat de volledige verantwoording en is reproduceerbaar (G2/G3).
 *
 * De functie is puur: geen klok, geen databank, geen configuratie buiten de invoer.
 */
export function berekenTeller(invoer: TellerInvoer): TellerResultaat {
  const { aanstellingen, afwezigheden = [], parameters, peildatum } = invoer
  const peil = naarUtc(peildatum)

  const parameterbronnen = new Set<string>()
  const geteldeDagen = new Set<ISODatum>()

  for (const a of aanstellingen) {
    const eindeMs = Math.min(naarUtc(a.einde), peil)
    if (naarUtc(a.start) > eindeMs) continue
    for (const dag of dagenIn(a.start, naarIso(eindeMs))) {
      if (geteldeDagen.has(dag)) continue
      const versie = resolveerParameters(parameters, dag)
      parameterbronnen.add(versie.bron)
      const regels = versie.telregels
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

  const nietEffectief = new Set<ISODatum>()
  const afwezigheidsVerantwoording = afwezigheden.map((af) => {
    const versie = resolveerParameters(parameters, af.start)
    const teltEffectief = versie.telregels.effectieveAfwezigheidscodes.includes(af.code)
    if (!teltEffectief) {
      for (const dag of dagenIn(af.start, af.einde)) {
        if (geteldeDagen.has(dag)) nietEffectief.add(dag)
      }
    }
    return { start: af.start, einde: af.einde, code: af.code, teltEffectief }
  })

  const perJaarRuw = new Map<string, { totaal: number; effectief: number }>()
  for (const dag of geteldeDagen) {
    const sj = schooljaarVan(dag)
    const telling = perJaarRuw.get(sj) ?? { totaal: 0, effectief: 0 }
    telling.totaal += 1
    if (!nietEffectief.has(dag)) telling.effectief += 1
    perJaarRuw.set(sj, telling)
  }

  const perSchooljaar: SchooljaarTelling[] = [...perJaarRuw.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([schooljaar, ruw]) => {
      const startVanSchooljaar: ISODatum = `${schooljaar.slice(0, 4)}-09-01`
      const max = resolveerParameters(parameters, startVanSchooljaar).maxPerSchooljaar
      const totaal = Math.min(ruw.totaal, max)
      return {
        schooljaar,
        totaal,
        effectief: Math.min(ruw.effectief, totaal),
        geplafonneerd: ruw.totaal > max,
      }
    })

  const telregelsOpPeildatum = resolveerParameters(parameters, peildatum).telregels

  return {
    dagenTotaal: perSchooljaar.reduce((som, j) => som + j.totaal, 0),
    dagenEffectief: perSchooljaar.reduce((som, j) => som + j.effectief, 0),
    perSchooljaar,
    verantwoording: {
      peildatum,
      periodes: aanstellingen
        .map((a) => ({ start: a.start, einde: a.einde, ...(a.school !== undefined ? { school: a.school } : {}) }))
        .sort((a, b) => a.start.localeCompare(b.start)),
      afwezigheden: afwezigheidsVerantwoording,
      parameterbronnen: [...parameterbronnen].sort(),
      telregels: telregelsOpPeildatum,
    },
  }
}

/** Gescheiden tellers per ambt (testcase F2): groepeert de aanstellingen en berekent per ambt. */
export function berekenPerAmbt(invoer: TellerInvoer): Map<string, TellerResultaat> {
  const perAmbt = new Map<string, TellerResultaat>()
  const ambten = [...new Set(invoer.aanstellingen.map((a) => a.ambt))].sort()
  for (const ambt of ambten) {
    perAmbt.set(
      ambt,
      berekenTeller({ ...invoer, aanstellingen: invoer.aanstellingen.filter((a) => a.ambt === ambt) }),
    )
  }
  return perAmbt
}
