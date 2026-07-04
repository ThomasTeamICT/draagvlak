import { describe, expect, it } from 'vitest'
import { bepaalEscalatie, NIVEAU_VERSTREKEN } from '../src/index.js'

describe('escalatieladder deadline-engine', () => {
  it('ver weg (106 dagen): niveau 0, geen doelgroep', () => {
    const stand = bepaalEscalatie('2026-06-15', '2026-03-01')
    expect(stand).toEqual({ niveau: 0, dagenResterend: 106, verstreken: false })
  })

  it('trappen: 42 → eigenaar, 21 → herhaling, 14 → directeur, 7 → AD/bestuur', () => {
    expect(bepaalEscalatie('2026-06-15', '2026-05-04').niveau).toBe(1) // 42 dagen
    expect(bepaalEscalatie('2026-06-15', '2026-05-25')).toMatchObject({
      niveau: 2,
      doelgroep: 'eigenaar (herhaling)',
      dagenResterend: 21,
    })
    expect(bepaalEscalatie('2026-06-15', '2026-06-01').niveau).toBe(3) // 14 dagen
    expect(bepaalEscalatie('2026-06-15', '2026-06-10')).toMatchObject({
      niveau: 4,
      doelgroep: 'algemeen directeur / bestuur',
      dagenResterend: 5,
    })
  })

  it('op de deadline zelf: hoogste trap, nog niet verstreken', () => {
    const stand = bepaalEscalatie('2026-06-15', '2026-06-15')
    expect(stand).toMatchObject({ niveau: 4, dagenResterend: 0, verstreken: false })
  })

  it('verstreken: niveau 5 en gemarkeerd — deadlines verstrijken nooit stil', () => {
    const stand = bepaalEscalatie('2026-06-15', '2026-06-16')
    expect(stand).toMatchObject({
      niveau: NIVEAU_VERSTREKEN,
      dagenResterend: -1,
      verstreken: true,
    })
  })

  it('eigen trappen zijn mogelijk (later per tenant configureerbaar)', () => {
    const stand = bepaalEscalatie('2026-06-15', '2026-06-10', [
      { dagenVoorDeadline: 10, niveau: 1, doelgroep: 'eigenaar' },
    ])
    expect(stand).toMatchObject({ niveau: 1, doelgroep: 'eigenaar' })
  })
})
