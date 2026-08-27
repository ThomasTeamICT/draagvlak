import { describe, expect, it } from 'vitest'
import { drempelVoor, magVraagInBevraging } from '../src/classificatie.js'

describe('magVraagInBevraging — de classificatie beslist, niet de titel (W1/W2)', () => {
  it('WA2 — een belevingsvraag (B) in een op-naam-bevraging is een blokkade', () => {
    const oordeel = magVraagInBevraging('op_naam', 'B')
    expect(oordeel.toegestaan).toBe(false)
    expect(oordeel.reden).toContain('gesprek, geen formulier')
  })

  it('klasse C is nooit aanmaakbaar, in geen enkel type', () => {
    expect(magVraagInBevraging('op_naam', 'C').toegestaan).toBe(false)
    expect(magVraagInBevraging('team', 'C').toegestaan).toBe(false)
  })

  it('praktische vragen (A) mogen overal; belevingsvragen (B) alleen in een teambevraging', () => {
    expect(magVraagInBevraging('op_naam', 'A').toegestaan).toBe(true)
    expect(magVraagInBevraging('team', 'A').toegestaan).toBe(true)
    expect(magVraagInBevraging('team', 'B').toegestaan).toBe(true)
  })
})

describe('drempelVoor (W4)', () => {
  it('standaard 5; vrije tekst in klasse B: 10', () => {
    expect(drempelVoor('A', false)).toBe(5)
    expect(drempelVoor('B', false)).toBe(5)
    expect(drempelVoor('B', true)).toBe(10)
  })

  it('configureerbaar omhoog, technisch onmogelijk omlaag', () => {
    expect(drempelVoor('B', false, 8)).toBe(8)
    expect(drempelVoor('B', false, 3)).toBe(5)
    expect(drempelVoor('B', true, 7)).toBe(10)
  })
})
