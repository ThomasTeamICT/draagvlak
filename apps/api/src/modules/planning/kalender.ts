import type { KalenderPeriode } from '@draagvlak/planregels'
import type { Trx } from '../../db.js'

export interface KalenderRij extends KalenderPeriode {
  id: string
  schooljaar: string
  schoolId: string | null
}

/** Alle kalenderperiodes van de tenant voor één schooljaar (RLS scopet al). */
export async function haalKalender(trx: Trx, schooljaar: string): Promise<KalenderRij[]> {
  const rijen = (await trx`
    select id,
           school_id,
           schooljaar,
           type,
           to_char(start, 'YYYY-MM-DD') as start,
           to_char(einde, 'YYYY-MM-DD') as einde,
           dagdeel,
           omschrijving,
           opvang_voorzien
    from core.kalenderperiode
    where schooljaar = ${schooljaar}
    order by start`) as unknown as {
    id: string
    school_id: string | null
    schooljaar: string
    type: KalenderPeriode['type']
    start: string
    einde: string
    dagdeel: KalenderPeriode['dagdeel']
    omschrijving: string | null
    opvang_voorzien: boolean
  }[]

  return rijen.map((r) => ({
    id: r.id,
    schoolId: r.school_id,
    schooljaar: r.schooljaar,
    type: r.type,
    start: r.start,
    einde: r.einde,
    dagdeel: r.dagdeel,
    ...(r.omschrijving !== null ? { omschrijving: r.omschrijving } : {}),
    opvangVoorzien: r.opvang_voorzien,
  }))
}

/**
 * Alle korte vakanties van de tenant, voor de TADD-teller (testcase B2):
 * relevant zodra een parameterversie korteVakantieTeltMee=false stelt.
 * Tenant-brede periodes én schoolspecifieke worden meegenomen (verfijning
 * per school volgt wanneer tellers school-gescoped worden).
 */
export async function haalKorteVakanties(
  trx: Trx,
): Promise<{ start: string; einde: string }[]> {
  return (await trx`
    select to_char(start, 'YYYY-MM-DD') as start,
           to_char(einde, 'YYYY-MM-DD') as einde
    from core.kalenderperiode
    where type = 'vakantie'
    order by start`) as unknown as { start: string; einde: string }[]
}
