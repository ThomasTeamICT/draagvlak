import type {
  ISODatum,
  SchooljaarTelling,
  TellerInvoer,
  TellerResultaat,
} from './types.js'
import { naarUtc } from './kalender.js'
import { DAG_MS, loopGeteldeDagen, maakParameterResolver } from './telkern.js'

/**
 * Berekent dienstanciënniteit (totaal en effectief gepresteerd) tot en met de peildatum.
 *
 * Semantiek (testcases-telregels.md):
 * - elke kalenderdag binnen een aanstellingsperiode telt één keer, ook bij
 *   gelijktijdige aanstellingen in meerdere scholen (F1);
 * - weekends en korte vakanties binnen de periode tellen mee; de zomervakantie
 *   in regel niet (A2, B1); telregels komen uit de parameterversie die op die dag gold (G1)
 *   — óók voor de effectiviteit van een afwezigheid, per dag;
 * - afwezigheden verminderen "effectief gepresteerd", niet het totaal (C1),
 *   tenzij de code op de lijst effectieve codes staat (C3); een afwezigheid die
 *   geen enkele getelde dag raakt (bv. vóór elke parameterversie) is onschadelijk
 *   en crasht de berekening niet;
 * - per schooljaar geldt een plafond (B3), geresolveerd op de eerste getelde dag
 *   van dat schooljaar (⚠ TE VALIDEREN: plafondwijziging middenin een schooljaar);
 * - het resultaat bevat de volledige verantwoording en is reproduceerbaar (G2/G3).
 *
 * De functie is puur: geen klok, geen databank, geen configuratie buiten de invoer.
 */
export function berekenTeller(invoer: TellerInvoer): TellerResultaat {
  const { aanstellingen, afwezigheden = [], parameters, peildatum } = invoer
  const peil = naarUtc(peildatum)
  const resolver = maakParameterResolver(parameters)

  const parameterbronnen = new Set<string>()
  const geteldeDagen = new Set<number>()
  const perJaarRuw = new Map<string, { totaal: number; effectief: number; eersteDag: number }>()

  let cacheJaar = -1
  let cacheMaand = -1
  let cacheTelling: { totaal: number; effectief: number; eersteDag: number } | undefined

  loopGeteldeDagen(aanstellingen, resolver, parameterbronnen, undefined, peil, geteldeDagen, (t, jaar, maand) => {
    if (jaar !== cacheJaar || maand !== cacheMaand) {
      const sj = maand >= 9 ? `${jaar}-${jaar + 1}` : `${jaar - 1}-${jaar}`
      let telling = perJaarRuw.get(sj)
      if (telling === undefined) {
        telling = { totaal: 0, effectief: 0, eersteDag: t }
        perJaarRuw.set(sj, telling)
      }
      cacheJaar = jaar
      cacheMaand = maand
      cacheTelling = telling
    }
    const telling = cacheTelling!
    telling.totaal += 1
    telling.effectief += 1
    if (t < telling.eersteDag) telling.eersteDag = t
  })

  // Effectiviteit van een afwezigheid wordt per dag bepaald (G1): een
  // afwezigheid over een parameterversiegrens heen kan deels wél, deels niet
  // effectief zijn. teltEffectief in de verantwoording betekent: "deze
  // afwezigheid heeft het effectief gepresteerde niet verminderd".
  const nietEffectief = new Set<number>()
  const afwezigheidsVerantwoording = afwezigheden.map((af) => {
    let verminderde = false
    const einde = naarUtc(af.einde)
    for (let t = naarUtc(af.start); t <= einde; t += DAG_MS) {
      if (!geteldeDagen.has(t) || nietEffectief.has(t)) continue
      if (resolver(t).telregels.effectieveAfwezigheidscodes.includes(af.code)) continue
      nietEffectief.add(t)
      verminderde = true
      const d = new Date(t)
      const jaar = d.getUTCFullYear()
      const sj = d.getUTCMonth() + 1 >= 9 ? `${jaar}-${jaar + 1}` : `${jaar - 1}-${jaar}`
      const telling = perJaarRuw.get(sj)
      if (telling !== undefined) telling.effectief -= 1
    }
    return { start: af.start, einde: af.einde, code: af.code, teltEffectief: !verminderde }
  })

  const perSchooljaar: SchooljaarTelling[] = [...perJaarRuw.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([schooljaar, ruw]) => {
      const max = resolver(ruw.eersteDag).maxPerSchooljaar
      const totaal = Math.min(ruw.totaal, max)
      return {
        schooljaar,
        totaal,
        effectief: Math.min(ruw.effectief, totaal),
        geplafonneerd: ruw.totaal > max,
      }
    })

  const telregelsOpPeildatum = resolver(peil).telregels

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
