/** Unit: de DST-gevoelige kloklogica van de planner, zonder klok of databank. */
import { describe, expect, it } from 'vitest'
import { klokBrussel, moetNuDraaien } from '../src/scheduler.js'

describe('planner-kloklogica', () => {
  const tijdstip = '03:30'

  it('draait niet vóór het tijdstip', () => {
    expect(moetNuDraaien({ datum: '2026-08-18', tijd: '03:29' }, tijdstip, undefined)).toBe(false)
  })

  it('draait op en ná het tijdstip zolang er vandaag nog niet gedraaid is', () => {
    expect(moetNuDraaien({ datum: '2026-08-18', tijd: '03:30' }, tijdstip, undefined)).toBe(true)
    // gemiste tik (herstart, DST-sprong): dezelfde dag nog inhalen
    expect(moetNuDraaien({ datum: '2026-08-18', tijd: '11:07' }, tijdstip, '2026-08-17')).toBe(true)
  })

  it('draait maar één keer per dag', () => {
    expect(moetNuDraaien({ datum: '2026-08-18', tijd: '03:31' }, tijdstip, '2026-08-18')).toBe(false)
    expect(moetNuDraaien({ datum: '2026-08-19', tijd: '03:30' }, tijdstip, '2026-08-18')).toBe(true)
  })

  it('klokBrussel geeft datum en tijd in Belgische tijd', () => {
    // 31/3/2026 01:30 UTC = 03:30 in Brussel (zomertijd, UTC+2)
    const klok = klokBrussel(new Date('2026-03-31T01:30:00Z'))
    expect(klok).toEqual({ datum: '2026-03-31', tijd: '03:30' })
    // wintertijd: 31/12 02:30 UTC = 03:30 in Brussel (UTC+1)
    expect(klokBrussel(new Date('2026-12-31T02:30:00Z')).tijd).toBe('03:30')
  })
})
