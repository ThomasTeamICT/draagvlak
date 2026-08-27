import { describe, expect, it } from 'vitest'
import { onderdrukCellen, toonbareResponsgraad } from '../src/suppressie.js'

const zichtbaar = (u: ReturnType<typeof onderdrukCellen>, sleutel: string) =>
  u.cellen.find((c) => c.sleutel === sleutel)?.zichtbaar

describe('onderdrukCellen — testcontract W4', () => {
  it('WB2 — een cel van 4 wordt onderdrukt mét uitleg', () => {
    const u = onderdrukCellen(
      [
        { sleutel: 'team:kleuter', n: 12 },
        { sleutel: 'team:lager', n: 9 },
        { sleutel: 'team:zorg', n: 4 },
      ],
      5,
    )
    expect(zichtbaar(u, 'team:zorg')).toBe(false)
    expect(u.cellen.find((c) => c.sleutel === 'team:zorg')?.reden).toContain('onder de drempel')
  })

  it('WB2b — secundaire suppressie: één onderdrukte cel sleept de kleinste zichtbare mee', () => {
    // totaal zichtbaar + alle cellen op één na zichtbaar = terugrekenbaar
    const u = onderdrukCellen(
      [
        { sleutel: 'a', n: 12 },
        { sleutel: 'b', n: 9 },
        { sleutel: 'c', n: 4 },
      ],
      5,
    )
    expect(zichtbaar(u, 'c')).toBe(false)
    expect(zichtbaar(u, 'b')).toBe(false) // meegetrokken
    expect(zichtbaar(u, 'a')).toBe(true)
    expect(u.cellen.find((c) => c.sleutel === 'b')?.reden).toContain('terugrekenen')
  })

  it('twee onderdrukte cellen die sámen boven de drempel liggen volstaan — geen derde offer', () => {
    const u = onderdrukCellen(
      [
        { sleutel: 'a', n: 12 },
        { sleutel: 'b', n: 4 },
        { sleutel: 'c', n: 3 },
      ],
      5,
    )
    expect(zichtbaar(u, 'a')).toBe(true)
    expect(zichtbaar(u, 'b')).toBe(false)
    expect(zichtbaar(u, 'c')).toBe(false)
  })

  it('twee onderdrukte cellen die sámen onder de drempel blijven, slepen alsnog een cel mee', () => {
    const u = onderdrukCellen(
      [
        { sleutel: 'a', n: 12 },
        { sleutel: 'b', n: 8 },
        { sleutel: 'c', n: 2 },
        { sleutel: 'd', n: 1 },
      ],
      5,
    )
    // c+d = 3 < 5 → kleinste zichtbare (b) gaat mee dicht
    expect(zichtbaar(u, 'b')).toBe(false)
    expect(zichtbaar(u, 'a')).toBe(true)
  })

  it('WB3 — uitsplitsing 4/2 volledig onderdrukt, hoofdcijfer blijft', () => {
    const u = onderdrukCellen(
      [
        { sleutel: 'm', n: 4 },
        { sleutel: 'v', n: 2 },
      ],
      5,
    )
    expect(u.ietsZichtbaar).toBe(false)
    expect(u.advies).toContain('kleine-school-modus')
  })

  it('WB4 — alles onder de drempel: expliciete kleine-school-modus, nooit stil niets', () => {
    const u = onderdrukCellen([{ sleutel: 'team', n: 3 }], 5)
    expect(u.ietsZichtbaar).toBe(false)
    expect(u.advies).toContain('scholengemeenschap')
  })

  it('zonder zichtbaar totaal is er geen terugrekenrisico en dus geen secundaire suppressie', () => {
    const u = onderdrukCellen(
      [
        { sleutel: 'a', n: 12 },
        { sleutel: 'b', n: 9 },
        { sleutel: 'c', n: 4 },
      ],
      5,
      { totaalZichtbaar: false },
    )
    expect(zichtbaar(u, 'b')).toBe(true)
    expect(zichtbaar(u, 'c')).toBe(false)
  })

  it('deterministisch: gelijke stand valt terug op de sleutelvolgorde', () => {
    const a = onderdrukCellen(
      [
        { sleutel: 'x', n: 6 },
        { sleutel: 'y', n: 6 },
        { sleutel: 'klein', n: 2 },
      ],
      5,
    )
    const b = onderdrukCellen(
      [
        { sleutel: 'y', n: 6 },
        { sleutel: 'klein', n: 2 },
        { sleutel: 'x', n: 6 },
      ],
      5,
    )
    expect(zichtbaar(a, 'x')).toBe(zichtbaar(b, 'x'))
    expect(zichtbaar(a, 'y')).toBe(zichtbaar(b, 'y'))
  })
})

describe('toonbareResponsgraad (W12)', () => {
  it('een responsgraad die verraadt wie ontbrak, wordt niet getoond', () => {
    expect(toonbareResponsgraad(4, 4, 5).toonbaar).toBe(false)
    expect(toonbareResponsgraad(12, 3, 5).toonbaar).toBe(false)
    expect(toonbareResponsgraad(12, 11, 5)).toMatchObject({ toonbaar: true, procent: 92 })
  })
})
