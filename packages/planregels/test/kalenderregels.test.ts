/**
 * Kalenderregelboek per schooljaar (planning.md P1). De regelboekwaarden zelf
 * zijn ⚠ TE VALIDEREN tegen Edulex; deze tests borgen het mechanisme.
 */
import { describe, expect, it } from 'vitest'
import {
  regelboekVoor,
  schooljaarGrenzen,
  valideerKalender,
  type KalenderPeriode,
} from '../src/index.js'

const dag = (
  type: KalenderPeriode['type'],
  start: string,
  dagdeel: KalenderPeriode['dagdeel'] = 'heel',
  extra: Partial<KalenderPeriode> = {},
): KalenderPeriode => ({ type, start, einde: start, dagdeel, ...extra })

describe('regelboek per schooljaar', () => {
  it('kiest het regime dat op het schooljaar van toepassing is', () => {
    expect(regelboekVoor('2025-2026').maxFacultatieveHalveDagen.basis).toBe(4)
    expect(regelboekVoor('2026-2027').maxFacultatieveHalveDagen.basis).toBe(0)
    expect(regelboekVoor('2026-2027').opvangplichtBijLesvrij).toBe(true)
  })

  it('schooljaargrenzen: 1 september t/m 31 augustus', () => {
    expect(schooljaarGrenzen('2026-2027')).toEqual({ start: '2026-09-01', einde: '2027-08-31' })
    expect(() => schooljaarGrenzen('2026-2028')).toThrow(/Ongeldig schooljaar/)
  })
})

describe('validatie t/m 2025-2026 (huidig regime)', () => {
  it('twee volledige facultatieve verlofdagen in het basisonderwijs zijn toegestaan', () => {
    const meldingen = valideerKalender(
      [dag('facultatieve_verlofdag', '2025-10-06'), dag('facultatieve_verlofdag', '2026-05-04')],
      '2025-2026',
      'basis',
    )
    expect(meldingen).toEqual([])
  })

  it('een derde facultatieve dag overschrijdt het maximum (fout)', () => {
    const meldingen = valideerKalender(
      [
        dag('facultatieve_verlofdag', '2025-10-06'),
        dag('facultatieve_verlofdag', '2026-05-04'),
        dag('facultatieve_verlofdag', '2026-05-15'),
      ],
      '2025-2026',
      'basis',
    )
    expect(meldingen.some((m) => m.code === 'facultatief_overschreden' && m.ernst === 'fout')).toBe(true)
  })

  it('secundair heeft een lager maximum (1 dag of 2 halve)', () => {
    const ok = valideerKalender([dag('facultatieve_verlofdag', '2025-10-06')], '2025-2026', 'secundair')
    expect(ok).toEqual([])
    const teVeel = valideerKalender(
      [dag('facultatieve_verlofdag', '2025-10-06'), dag('facultatieve_verlofdag', '2026-05-04')],
      '2025-2026',
      'secundair',
    )
    expect(teVeel.some((m) => m.code === 'facultatief_overschreden')).toBe(true)
  })

  it('1,5 dag pedagogische studiedagen (3 halve) is het basismaximum', () => {
    const ok = valideerKalender(
      [dag('pedagogische_studiedag', '2025-11-14'), dag('pedagogische_studiedag', '2026-03-13', 'voormiddag')],
      '2025-2026',
      'basis',
    )
    expect(ok).toEqual([])
    const teVeel = valideerKalender(
      [dag('pedagogische_studiedag', '2025-11-14'), dag('pedagogische_studiedag', '2026-03-13')],
      '2025-2026',
      'basis',
    )
    expect(teVeel.some((m) => m.code === 'studiedagen_overschreden')).toBe(true)
  })
})

describe('validatie vanaf 2026-2027 (hervormd regime)', () => {
  it('facultatieve verlofdagen zijn afgeschaft', () => {
    const meldingen = valideerKalender([dag('facultatieve_verlofdag', '2026-10-05')], '2026-2027', 'basis')
    expect(meldingen.some((m) => m.code === 'facultatief_overschreden' && m.boodschap.includes('afgeschaft'))).toBe(true)
  })

  it('studiedag zonder opvang geeft een opvangplicht-waarschuwing; mét opvang niet', () => {
    const zonder = valideerKalender([dag('pedagogische_studiedag', '2026-11-13', 'voormiddag')], '2026-2027', 'basis')
    expect(zonder.some((m) => m.code === 'opvangplicht' && m.ernst === 'waarschuwing')).toBe(true)

    const met = valideerKalender(
      [dag('pedagogische_studiedag', '2026-11-13', 'voormiddag', { opvangVoorzien: true })],
      '2026-2027',
      'basis',
    )
    expect(met).toEqual([])
  })

  it('secundair: studiedagen mogen niet meer tot lesschorsing leiden', () => {
    const meldingen = valideerKalender([dag('pedagogische_studiedag', '2026-11-13', 'voormiddag')], '2026-2027', 'secundair')
    expect(meldingen.some((m) => m.code === 'studiedagen_overschreden')).toBe(true)
  })
})

describe('structuurfouten en overlap', () => {
  it('periode buiten het schooljaar is een fout', () => {
    const meldingen = valideerKalender([dag('vakantie', '2025-07-15')], '2025-2026', 'basis')
    expect(meldingen.some((m) => m.code === 'buiten_schooljaar')).toBe(true)
  })

  it('omgekeerde periode is een fout', () => {
    const meldingen = valideerKalender(
      [{ type: 'vakantie', start: '2025-11-03', einde: '2025-10-27', dagdeel: 'heel' }],
      '2025-2026',
      'basis',
    )
    expect(meldingen.some((m) => m.code === 'periode_omgekeerd')).toBe(true)
  })

  it('overlappende periodes geven een waarschuwing', () => {
    const meldingen = valideerKalender(
      [
        { type: 'vakantie', start: '2025-10-27', einde: '2025-11-02', dagdeel: 'heel' },
        dag('facultatieve_verlofdag', '2025-10-31'),
      ],
      '2025-2026',
      'basis',
    )
    expect(meldingen.some((m) => m.code === 'overlap' && m.ernst === 'waarschuwing')).toBe(true)
  })

  it('weekenddagen tellen niet mee in de halve-dagen-telling', () => {
    // za 2025-10-04 t/m zo 2025-10-05: 0 weekdagen → telt niet als facultatief verlof
    const meldingen = valideerKalender(
      [
        { type: 'facultatieve_verlofdag', start: '2025-10-04', einde: '2025-10-05', dagdeel: 'heel' },
        dag('facultatieve_verlofdag', '2025-10-06'),
        dag('facultatieve_verlofdag', '2026-05-04'),
      ],
      '2025-2026',
      'basis',
    )
    expect(meldingen.filter((m) => m.code === 'facultatief_overschreden')).toEqual([])
  })
})
