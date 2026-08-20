/** Beurtrolverdeling (module P2): deterministisch, billijk, uitlegbaar. */
import { describe, expect, it } from 'vitest'
import { spreiding, verdeelBeurten } from '../src/index.js'

const kandidaten = (tellers: Record<string, number>) =>
  Object.entries(tellers).map(([id, teller]) => ({ id, teller }))

describe('verdeelBeurten', () => {
  it('verdeelt gelijk bij gelijke starttellers', () => {
    const datums = ['2025-10-20', '2025-10-21', '2025-10-23', '2025-10-24']
    const uitkomst = verdeelBeurten(datums, kandidaten({ els: 0, karim: 0, lien: 0, nora: 0 }))
    expect(uitkomst).toHaveLength(4)
    const perPersoon = new Map<string, number>()
    for (const t of uitkomst) perPersoon.set(t.kandidaatId, (perPersoon.get(t.kandidaatId) ?? 0) + 1)
    expect([...perPersoon.values()]).toEqual([1, 1, 1, 1])
    expect(spreiding(uitkomst, kandidaten({ els: 0, karim: 0, lien: 0, nora: 0 }))).toBe(0)
  })

  it('trekt historische achterstand recht: wie minder deed, krijgt meer beurten', () => {
    const datums = ['2025-11-03', '2025-11-04', '2025-11-06', '2025-11-07']
    const start = { els: 4, karim: 4, lien: 4, nora: 0 }
    const uitkomst = verdeelBeurten(datums, kandidaten(start))
    const voorNora = uitkomst.filter((t) => t.kandidaatId === 'nora')
    expect(voorNora).toHaveLength(4)
    expect(spreiding(uitkomst, kandidaten(start))).toBe(0)
  })

  it('is deterministisch: zelfde invoer geeft exact dezelfde verdeling', () => {
    const datums = ['2025-10-20', '2025-10-21', '2025-10-23']
    const a = verdeelBeurten(datums, kandidaten({ els: 1, karim: 0, lien: 2 }))
    const b = verdeelBeurten(datums, kandidaten({ els: 1, karim: 0, lien: 2 }))
    expect(a).toEqual(b)
    // laagste teller eerst; gelijke stand valt terug op vaste id-volgorde
    expect(a[0]).toEqual({ datum: '2025-10-20', kandidaatId: 'karim' })
  })

  it('vermijdt twee beurten op dezelfde dag zolang dat kan', () => {
    // twee plekken per dag, drie kandidaten
    const datums = ['2025-10-20', '2025-10-20', '2025-10-21', '2025-10-21']
    const uitkomst = verdeelBeurten(datums, kandidaten({ els: 0, karim: 0, lien: 0 }))
    for (const dag of ['2025-10-20', '2025-10-21']) {
      const opDag = uitkomst.filter((t) => t.datum === dag).map((t) => t.kandidaatId)
      expect(new Set(opDag).size).toBe(opDag.length)
    }
  })

  it('met minder kandidaten dan plekken per dag mag dubbelen — maar blijft billijk', () => {
    const datums = ['2025-10-20', '2025-10-20', '2025-10-20']
    const start = { els: 0, karim: 0 }
    const uitkomst = verdeelBeurten(datums, kandidaten(start))
    expect(uitkomst).toHaveLength(3)
    expect(spreiding(uitkomst, kandidaten(start))).toBe(1)
  })

  it('zonder kandidaten: geen toewijzingen, geen fout', () => {
    expect(verdeelBeurten(['2025-10-20'], [])).toEqual([])
  })
})
