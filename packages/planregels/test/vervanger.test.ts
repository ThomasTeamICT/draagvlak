import { describe, expect, it } from 'vitest'
import { noodscenarios, stelVervangersVoor } from '../src/vervanger.js'

describe('stelVervangersVoor', () => {
  const basis = { bevoegd: true, beschikbaar: true }

  it('een platformlid wint van iedereen die inzetbaar is', () => {
    const voorstel = stelVervangersVoor([
      { id: 'a', ...basis, teller: 0, vrijeRuimte: 10 },
      { id: 'b', ...basis, platformlid: true, teller: 5 },
    ])
    expect(voorstel[0]?.kandidaatId).toBe('b')
    expect(voorstel[0]?.aanbevolen).toBe(true)
    expect(voorstel[0]?.waarom.join(' ')).toContain('lerarenplatform')
  })

  it('billijkheid: bij gelijke inzetbaarheid wint de laagste teller', () => {
    const voorstel = stelVervangersVoor([
      { id: 'veel', ...basis, teller: 8 },
      { id: 'weinig', ...basis, teller: 1 },
    ])
    expect(voorstel[0]?.kandidaatId).toBe('weinig')
    expect(voorstel[1]?.bezwaren.join(' ')).toContain('meer dan het teamgemiddelde')
  })

  it('niet-inzetbare kandidaten zakken onder inzetbare, met redenen', () => {
    const voorstel = stelVervangersVoor([
      { id: 'onbevoegd', bevoegd: false, beschikbaar: true, teller: 0 },
      { id: 'ok', ...basis, teller: 6 },
    ])
    expect(voorstel[0]?.kandidaatId).toBe('ok')
    expect(voorstel[1]?.inzetbaar).toBe(false)
    expect(voorstel[1]?.bezwaren.join(' ')).toContain('bekwaamheidsbewijs')
  })

  it('een zorgleerkracht draagt haar prijs als bezwaar mee', () => {
    const voorstel = stelVervangersVoor([{ id: 'zorg', ...basis, zorgopdracht: 6 }])
    expect(voorstel[0]?.bezwaren.join(' ')).toContain('6 zorguren vallen weg')
  })

  it('deterministisch: gelijke stand valt terug op id-volgorde', () => {
    const a = stelVervangersVoor([{ id: 'x', ...basis }, { id: 'y', ...basis }])
    const b = stelVervangersVoor([{ id: 'y', ...basis }, { id: 'x', ...basis }])
    expect(a.map((v) => v.kandidaatId)).toEqual(b.map((v) => v.kandidaatId))
  })
})

describe('noodscenarios', () => {
  it('verdelen berekent de nieuwe groepsgroottes en benoemt het verlies', () => {
    const s = noodscenarios({
      klasgrootte: 20,
      andereKlassen: [
        { id: '1B', grootte: 16 },
        { id: '2A', grootte: 18 },
      ],
    })
    const verdelen = s.find((x) => x.soort === 'klas_verdelen')
    expect(verdelen?.mogelijk).toBe(true)
    expect(verdelen?.gevolg).toContain('ongeveer 10')
    expect(verdelen?.verlies).not.toBe('')
  })

  it('boven de eigen groepsgrens wordt verdelen als niet mogelijk gemarkeerd', () => {
    const s = noodscenarios({
      klasgrootte: 24,
      andereKlassen: [{ id: '1B', grootte: 25 }],
      maxGroepsgrootte: 30,
    })
    expect(s.find((x) => x.soort === 'klas_verdelen')?.mogelijk).toBe(false)
    expect(s.find((x) => x.soort === 'klassen_samenvoegen')?.mogelijk).toBe(false)
  })

  it('zorg inzetten bestaat alleen als er zorguren zijn, en benoemt de onzichtbare kost', () => {
    expect(noodscenarios({ klasgrootte: 20, andereKlassen: [] })).toHaveLength(0)
    const s = noodscenarios({ klasgrootte: 20, andereKlassen: [], zorgurenBeschikbaar: 4 })
    expect(s[0]?.soort).toBe('zorg_inzetten')
    expect(s[0]?.verlies).toContain('nergens gelogd')
  })

  it('mogelijke scenario’s komen vóór onmogelijke, lichtste eerst', () => {
    const s = noodscenarios({
      klasgrootte: 20,
      andereKlassen: [{ id: '1B', grootte: 28 }],
      zorgurenBeschikbaar: 4,
      externeInvallerBeschikbaar: true,
      maxGroepsgrootte: 30,
    })
    expect(s.every((x, i) => i === 0 || Number(s[i - 1]!.mogelijk) >= Number(x.mogelijk))).toBe(true)
    expect(s[0]?.soort).toBe('externe_invaller')
  })
})
