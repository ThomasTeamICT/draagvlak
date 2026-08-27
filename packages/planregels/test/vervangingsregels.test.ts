import { describe, expect, it } from 'vitest'
import {
  bepaalKanaal,
  koppelReeksen,
  vervangingsregelboekVoor,
  werkdagenIn,
} from '../src/vervangingsregels.js'

/**
 * Testcontract module P3 — casussen V1 t/m V8 (functioneel ontwerp
 * planning.md § P3). Elke casus is een verhaal dat een directeur herkent;
 * de verwachte uitkomst staat erbij zoals een personeelsdienst hem zou
 * navertellen.
 */

// Ma 2/2/2026 t/m vr 13/2/2026 = exact 10 werkdagen.
const HERFST = ['2025-10-27', '2025-10-28', '2025-10-29', '2025-10-30', '2025-10-31']

describe('werkdagenIn', () => {
  it('telt weekdagen en slaat weekend en kalendervrije dagen over', () => {
    // week met een woensdag als vrije dag: 4 werkdagen
    expect(werkdagenIn('2026-02-02', '2026-02-06', new Set(['2026-02-04']))).toHaveLength(4)
    // weekend levert niets op
    expect(werkdagenIn('2026-02-07', '2026-02-08')).toHaveLength(0)
    // omgekeerde periode is leeg, geen fout
    expect(werkdagenIn('2026-02-06', '2026-02-02')).toHaveLength(0)
  })
})

describe('koppelReeksen', () => {
  it('V1 — één aaneengesloten ziekte is één reeks', () => {
    const reeksen = koppelReeksen([{ start: '2026-02-02', einde: '2026-02-13' }])
    expect(reeksen).toHaveLength(1)
    expect(reeksen[0]).toMatchObject({ start: '2026-02-02', einde: '2026-02-13', werkdagen: 10 })
  })

  it('V2 — één dag aanwezig knipt de reeks níét (venster 1 werkdag)', () => {
    // ziek ma–wo, donderdag aanwezig, weer ziek vr t/m volgende week
    const reeksen = koppelReeksen(
      [
        { start: '2026-02-02', einde: '2026-02-04' },
        { start: '2026-02-06', einde: '2026-02-13' },
      ],
      new Set(),
      1,
    )
    expect(reeksen).toHaveLength(1)
    // 3 + 6 effectieve werkdagen; de aanwezige donderdag telt niet mee
    expect(reeksen[0]?.werkdagen).toBe(9)
    expect(reeksen[0]?.onderdelen).toHaveLength(2)
  })

  it('V3 — een week aanwezig knipt de reeks wél', () => {
    const reeksen = koppelReeksen(
      [
        { start: '2026-02-02', einde: '2026-02-06' },
        { start: '2026-02-16', einde: '2026-02-20' },
      ],
      new Set(),
      1,
    )
    expect(reeksen).toHaveLength(2)
  })

  it('V4 — een vakantie tussen twee ziekteperiodes is geen onderbreking', () => {
    // ziek de week vóór en de week ná de herfstvakantie: vakantiedagen zijn
    // geen werkdagen, dus het gat telt 0 werkdagen → één reeks
    const reeksen = koppelReeksen(
      [
        { start: '2025-10-20', einde: '2025-10-24' },
        { start: '2025-11-03', einde: '2025-11-07' },
      ],
      new Set(HERFST),
      1,
    )
    expect(reeksen).toHaveLength(1)
    expect(reeksen[0]?.werkdagen).toBe(10)
  })

  it('overlappende registraties tellen elke dag één keer', () => {
    const reeksen = koppelReeksen([
      { start: '2026-02-02', einde: '2026-02-06' },
      { start: '2026-02-04', einde: '2026-02-10' },
    ])
    expect(reeksen).toHaveLength(1)
    expect(reeksen[0]?.werkdagen).toBe(7)
  })
})

describe('bepaalKanaal', () => {
  const basisInvoer = {
    schooljaar: '2025-2026',
    niveau: 'basis' as const,
  }

  it('V5 — korte ziekte (3 dagen) onder de drempel: eenheden of intern', () => {
    const advies = bepaalKanaal({
      ...basisInvoer,
      afwezigheden: [{ start: '2026-02-02', einde: '2026-02-04' }],
      contingentRestant: 20,
    })
    expect(advies.werkdagen).toBe(3)
    expect(advies.drempelBereikt).toBe(false)
    // geen platformlid vrij → vervangingseenheden zijn het eerste kanaal
    expect(advies.aanbevolen).toBe('vervangingseenheden')
    expect(advies.eenhedenNodig).toBe(3)
    expect(advies.verplichteChecks.map((c) => c.code)).toContain('contingent')
    // tijdelijke aanstelling expliciet uitgelegd als niet mogelijk
    const ta = advies.opties.find((o) => o.kanaal === 'tijdelijke_aanstelling')
    expect(ta?.mogelijk).toBe(false)
    expect(ta?.reden).toContain('7 werkdagen te kort')
  })

  it('V5b — zelfde ziekte maar het contingent is op: intern, met verplichte log', () => {
    const advies = bepaalKanaal({
      ...basisInvoer,
      afwezigheden: [{ start: '2026-02-02', einde: '2026-02-04' }],
      contingentRestant: 2,
    })
    expect(advies.aanbevolen).toBe('intern')
    expect(advies.verplichteChecks.map((c) => c.code)).toContain('noodmaatregel')
  })

  it('V6 — 10 werkdagen: drempel bereikt, aanstelling mogelijk mét reaffectatiecheck', () => {
    const advies = bepaalKanaal({
      ...basisInvoer,
      afwezigheden: [{ start: '2026-02-02', einde: '2026-02-13' }],
    })
    expect(advies.werkdagen).toBe(10)
    expect(advies.drempelBereikt).toBe(true)
    expect(advies.aanbevolen).toBe('tijdelijke_aanstelling')
    expect(advies.verplichteChecks.map((c) => c.code)).toContain('reaffectatie')
  })

  it('V6b — platformlid vrij: dat gaat vóór de tijdelijke aanstelling', () => {
    const advies = bepaalKanaal({
      ...basisInvoer,
      afwezigheden: [{ start: '2026-02-02', einde: '2026-02-13' }],
      platformlidBeschikbaar: true,
    })
    expect(advies.aanbevolen).toBe('lerarenplatform')
    // en zonder reaffectatiecheck: die hoort bij de aanstelling
    expect(advies.verplichteChecks.map((c) => c.code)).not.toContain('reaffectatie')
  })

  it('V7 — de vakantiebrug haalt de drempel: 2×5 dagen rond de herfstvakantie', () => {
    const advies = bepaalKanaal({
      ...basisInvoer,
      afwezigheden: [
        { start: '2025-10-20', einde: '2025-10-24' },
        { start: '2025-11-03', einde: '2025-11-07' },
      ],
      vrijeDagen: HERFST,
    })
    expect(advies.werkdagen).toBe(10)
    expect(advies.drempelBereikt).toBe(true)
    expect(advies.verantwoording.join(' ')).toContain('samengeteld')
  })

  it('V8 — secundair 2025-2026: geen platform en geen eenheden', () => {
    const advies = bepaalKanaal({
      schooljaar: '2025-2026',
      niveau: 'secundair',
      afwezigheden: [{ start: '2026-02-02', einde: '2026-02-04' }],
      contingentRestant: 50,
      platformlidBeschikbaar: true,
    })
    const platform = advies.opties.find((o) => o.kanaal === 'lerarenplatform')
    const eenheden = advies.opties.find((o) => o.kanaal === 'vervangingseenheden')
    expect(platform?.mogelijk).toBe(false)
    expect(eenheden?.mogelijk).toBe(false)
    expect(advies.aanbevolen).toBe('intern')
  })

  it('de peildatum kiest de juiste reeks als er meerdere zijn', () => {
    const advies = bepaalKanaal({
      ...basisInvoer,
      afwezigheden: [
        { start: '2025-09-08', einde: '2025-09-09' },
        { start: '2026-02-02', einde: '2026-02-13' },
      ],
      peilDatum: '2025-09-08',
    })
    expect(advies.werkdagen).toBe(2)
    expect(advies.drempelBereikt).toBe(false)
  })

  it('zonder afwezigheden komt er een leeg advies, geen fout', () => {
    const advies = bepaalKanaal({ ...basisInvoer, afwezigheden: [] })
    expect(advies.aanbevolen).toBe('geen_vervanging')
    expect(advies.werkdagen).toBe(0)
  })
})

describe('vervangingsregelboekVoor', () => {
  it('kiest het juiste regime per schooljaar', () => {
    expect(vervangingsregelboekVoor('2017-2018').lerarenplatform.basis).toBe(false)
    expect(vervangingsregelboekVoor('2019-2020').lerarenplatform.secundair).toBe(true)
    expect(vervangingsregelboekVoor('2025-2026').lerarenplatform).toEqual({ basis: true, secundair: false })
    expect(vervangingsregelboekVoor('2025-2026').vervangingseenheden.basis).toBe(true)
  })
})
