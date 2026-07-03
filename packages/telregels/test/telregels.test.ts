/**
 * Geautomatiseerde uitvoering van docs/functioneel-ontwerp/testcases-telregels.md.
 * Elke test draagt het casusnummer uit het testcontract. Casussen die eerst met
 * een personeelsdienst tegen PERS/2019/03 beslecht moeten worden (⚠ TE VALIDEREN)
 * staan als `it.todo` — zichtbaar in elke testrun, conform het afnameprotocol.
 */
import { describe, expect, it } from 'vitest'
import {
  berekenPerAmbt,
  berekenTeller,
  berekenVervolgtraject,
  evalueerDrempel,
  PERS_2019_03,
  prognosePeildatum,
  type Aanstelling,
  type ParameterVersie,
  type TellerInvoer,
} from '../src/index.js'

const P = [PERS_2019_03]

function aanstelling(start: string, einde: string, extra?: Partial<Aanstelling>): Aanstelling {
  return { start, einde, ambt: 'leraar', ...extra }
}

function teller(deel: Partial<TellerInvoer> & Pick<TellerInvoer, 'aanstellingen'>) {
  return berekenTeller({ parameters: P, peildatum: '2026-06-30', ...deel })
}

describe('Groep A — basistellingen', () => {
  it('A1: voltijds volledig schooljaar → 303 kd, 303 eff', () => {
    const r = teller({ aanstellingen: [aanstelling('2025-09-01', '2026-06-30')] })
    expect(r.dagenTotaal).toBe(303)
    expect(r.dagenEffectief).toBe(303)
  })

  it('A2: weekends binnen de aanstelling tellen mee (14 kd incl. 4 weekenddagen)', () => {
    const r = teller({ aanstellingen: [aanstelling('2025-10-06', '2025-10-19')] })
    expect(r.dagenTotaal).toBe(14)

    const zonderWeekend: ParameterVersie = {
      ...PERS_2019_03,
      telregels: { ...PERS_2019_03.telregels, weekendTeltMee: false },
    }
    const r2 = berekenTeller({
      aanstellingen: [aanstelling('2025-10-06', '2025-10-19')],
      parameters: [zonderWeekend],
      peildatum: '2026-06-30',
    })
    expect(r2.dagenTotaal).toBe(10)
  })

  it('A3: korte interim ma 06/10 – vr 19/12 → 75 kd', () => {
    const r = teller({ aanstellingen: [aanstelling('2025-10-06', '2025-12-19')] })
    expect(r.dagenTotaal).toBe(75)
  })

  it('A4: twee losse interims — het gat telt niet → 19 + 75 = 94 kd', () => {
    const r = teller({
      aanstellingen: [
        aanstelling('2025-10-06', '2025-10-24'),
        aanstelling('2026-01-12', '2026-03-27'),
      ],
    })
    expect(r.dagenTotaal).toBe(94)
  })

  // Verwachting "volume van de opdracht beïnvloedt de dagenteller niet" eerst
  // bevestigen tegen de omzendbrieftekst; de engine kent bewust geen volumeveld.
  it.todo('A5 ⚠ TE VALIDEREN: deeltijdse opdracht telt als volledige kalenderdagen')
})

describe('Groep B — zomervakantie en jaargrenzen', () => {
  it('B1: aanstelling eindigt 30/6 — zomer telt niet, ook niet met latere peildatum', () => {
    const r = teller({
      aanstellingen: [aanstelling('2025-09-01', '2026-06-30')],
      peildatum: '2026-08-31',
    })
    expect(r.dagenTotaal).toBe(303)
  })

  it.todo('B2 ⚠ TE VALIDEREN: aanstelling die door de zomer loopt — uitzonderingen op TELREGEL_ZOMERVAKANTIE')

  it('B3: plafond per schooljaar (360) wordt toegepast en gemarkeerd', () => {
    const metZomer: ParameterVersie = {
      ...PERS_2019_03,
      telregels: { ...PERS_2019_03.telregels, zomervakantieTeltMee: true },
    }
    const r = berekenTeller({
      aanstellingen: [aanstelling('2025-09-01', '2026-08-31')],
      parameters: [metZomer],
      peildatum: '2026-08-31',
    })
    expect(r.dagenTotaal).toBe(360)
    expect(r.perSchooljaar).toEqual([
      { schooljaar: '2025-2026', totaal: 360, effectief: 360, geplafonneerd: true },
    ])
  })

  it('B4: sommatie over schooljaren heen → 120 + 190 = 310 kd', () => {
    const r = teller({
      aanstellingen: [
        aanstelling('2024-09-01', '2024-12-29'),
        aanstelling('2025-09-01', '2026-03-09'),
      ],
    })
    expect(r.perSchooljaar.map((j) => j.totaal)).toEqual([120, 190])
    expect(r.dagenTotaal).toBe(310)
  })
})

describe('Groep C — afwezigheden en "effectief gepresteerd"', () => {
  it('C1: ziekte binnen aanstelling — totaal ongewijzigd, effectief −12', () => {
    const r = teller({
      aanstellingen: [aanstelling('2025-09-01', '2026-06-30')],
      afwezigheden: [{ start: '2026-01-12', einde: '2026-01-23', code: 'ziekte' }],
    })
    expect(r.dagenTotaal).toBe(303)
    expect(r.dagenEffectief).toBe(291)
  })

  it('C2: afwezigheid over een weekend — alle 11 dagen niet effectief (⚠ consistentie TE VALIDEREN)', () => {
    // Huidig engine-gedrag, vastgelegd als vertrekpunt voor de validatie met de personeelsdienst.
    const r = teller({
      aanstellingen: [aanstelling('2025-09-01', '2026-06-30')],
      afwezigheden: [{ start: '2026-01-16', einde: '2026-01-26', code: 'ziekte' }],
    })
    expect(r.dagenTotaal).toBe(303)
    expect(r.dagenEffectief).toBe(292)
  })

  it('C3: code op de lijst effectieve afwezigheidscodes vermindert effectief niet (lijstinhoud ⚠ TE VALIDEREN)', () => {
    const metCode: ParameterVersie = {
      ...PERS_2019_03,
      telregels: { ...PERS_2019_03.telregels, effectieveAfwezigheidscodes: ['klein-verlet'] },
    }
    const r = berekenTeller({
      aanstellingen: [aanstelling('2025-09-01', '2026-06-30')],
      afwezigheden: [{ start: '2026-01-12', einde: '2026-01-13', code: 'klein-verlet' }],
      parameters: [metCode],
      peildatum: '2026-06-30',
    })
    expect(r.dagenEffectief).toBe(303)
    expect(r.verantwoording.afwezigheden[0]?.teltEffectief).toBe(true)
  })

  it('C4: 295 kd maar 198 eff → drempel niet bereikt, met expliciete reden', () => {
    const r = teller({
      aanstellingen: [aanstelling('2025-09-01', '2026-06-22')],
      afwezigheden: [{ start: '2026-01-05', einde: '2026-04-11', code: 'ziekte' }],
    })
    expect(r.dagenTotaal).toBe(295)
    expect(r.dagenEffectief).toBe(198)

    const e = evalueerDrempel(r, P)
    expect(e.drempelBereikt).toBe(false)
    expect(e.beoordelingVereist).toBe(false)
    expect(e.redenen.join(' ')).toContain('effectief gepresteerd 198')
  })
})

describe('Groep D — drempeldetectie en deadlines', () => {
  it('D1: prognose op 30/6 bereikt de drempel → beoordeling vereist, deadlines 15/6 en 30/6', () => {
    expect(prognosePeildatum('2026-03-01')).toBe('2026-06-30')
    const r = teller({
      aanstellingen: [
        aanstelling('2025-02-24', '2025-06-30'),
        aanstelling('2026-01-01', '2026-06-30'),
      ],
      afwezigheden: [
        { start: '2025-03-17', einde: '2025-03-19', code: 'ziekte' },
        { start: '2026-02-09', einde: '2026-02-18', code: 'ziekte' },
      ],
    })
    expect(r.dagenTotaal).toBe(308)
    expect(r.dagenEffectief).toBe(295)

    const e = evalueerDrempel(r, P)
    expect(e.drempelBereikt).toBe(true)
    expect(e.beoordelingVereist).toBe(true)
    expect(e.deadlines).toEqual({
      kandidaatstellingTadd: '2026-06-15',
      beoordeling: '2026-06-30',
    })
  })

  it('D2: prognose 288 kd → geen beoordelingssignaal', () => {
    const r = teller({ aanstellingen: [aanstelling('2025-09-16', '2026-06-30')] })
    expect(r.dagenTotaal).toBe(288)
    const e = evalueerDrempel(r, P)
    expect(e.drempelBereikt).toBe(false)
  })

  it('D3: nieuwe afwezigheid duwt effectief onder de drempel → signaal vervalt bij herberekening', () => {
    const basis = {
      aanstellingen: [aanstelling('2025-09-01', '2026-06-22')],
      parameters: P,
      peildatum: '2026-06-30',
    }
    const voor = evalueerDrempel(berekenTeller(basis), P)
    expect(voor.drempelBereikt).toBe(true)

    const na = evalueerDrempel(
      berekenTeller({
        ...basis,
        afwezigheden: [{ start: '2026-01-05', einde: '2026-04-11', code: 'ziekte' }],
      }),
      P,
    )
    expect(na.drempelBereikt).toBe(false)
  })

  // "Geen beoordeling geldt als positief" is gedrag van de beoordelingsflow
  // (module D, applicatielaag), niet van de teller-engine.
  it.todo('D4: geen beoordeling geregistreerd op 30/6 geldt als positief — applicatielaag')
})

describe('Groep E — werkpunten en vervolgtraject', () => {
  it('E1: vervolgtraject van 200 extra effectieve dagen — voltooid op 19/03/2027', () => {
    const stand = berekenVervolgtraject(
      {
        aanstellingen: [aanstelling('2026-09-01', '2027-06-30')],
        parameters: P,
        peildatum: '2027-06-30',
      },
      '2026-09-01',
    )
    expect(stand.doelEffectief).toBe(200)
    expect(stand.gepresteerd).toBe(303)
    expect(stand.resterend).toBe(0)
    expect(stand.voltooidOp).toBe('2027-03-19')
  })

  it('E1b: onderweg — afwezigheid schuift de voltooiingsdatum op', () => {
    const stand = berekenVervolgtraject(
      {
        aanstellingen: [aanstelling('2026-09-01', '2027-06-30')],
        afwezigheden: [{ start: '2026-10-05', einde: '2026-10-14', code: 'ziekte' }],
        parameters: P,
        peildatum: '2027-01-31',
      },
      '2026-09-01',
    )
    expect(stand.gepresteerd).toBe(153 - 10)
    expect(stand.resterend).toBe(200 - 143)
    expect(stand.voltooidOp).toBeUndefined()
  })

  it.todo('E2: tweede beoordeling met werkpunten in hetzelfde ambt geblokkeerd — applicatielaag')
  it.todo('E3: werkpunten in een ander ambt toegestaan, tellers gescheiden — applicatielaag')
  it.todo('E4 ⚠ TE VALIDEREN: draagwijdte van anciënniteitsverlies na negatieve beoordeling')
})

describe('Groep F — meerdere scholen en ambten', () => {
  it('F1: gelijktijdige aanstellingen in twee scholen — elke kalenderdag telt één keer', () => {
    const r = teller({
      aanstellingen: [
        aanstelling('2025-09-01', '2026-06-30', { school: 'A' }),
        aanstelling('2025-09-01', '2026-06-30', { school: 'B' }),
      ],
    })
    expect(r.dagenTotaal).toBe(303)
  })

  it('F2: gescheiden tellers per ambt', () => {
    const perAmbt = berekenPerAmbt({
      aanstellingen: [
        aanstelling('2025-09-01', '2026-06-30', { ambt: 'leraar' }),
        aanstelling('2025-10-06', '2025-12-19', { ambt: 'ict-coordinator' }),
      ],
      parameters: P,
      peildatum: '2026-06-30',
    })
    expect(perAmbt.get('leraar')?.dagenTotaal).toBe(303)
    expect(perAmbt.get('ict-coordinator')?.dagenTotaal).toBe(75)
  })

  it.todo('F3: gelogde overlegflow bij prestatie in meerdere scholen — applicatielaag')
})

describe('Groep G — parameterversies en reproduceerbaarheid', () => {
  it('G1: elke dag wordt geteld met de versie die op die dag gold', () => {
    const versieA: ParameterVersie = {
      ...PERS_2019_03,
      geldigVanaf: '2019-09-01',
      geldigTot: '2025-12-31',
      bron: 'fictieve versie A',
    }
    const versieB: ParameterVersie = {
      ...PERS_2019_03,
      geldigVanaf: '2026-01-01',
      bron: 'fictieve versie B — weekend telt niet meer',
      telregels: { ...PERS_2019_03.telregels, weekendTeltMee: false },
    }
    // ma 29/12 t/m zo 04/01: 3 dagen onder A (ma-wo), do+vr onder B, weekend za+zo valt weg onder B
    const r = berekenTeller({
      aanstellingen: [aanstelling('2025-12-29', '2026-01-04')],
      parameters: [versieA, versieB],
      peildatum: '2026-06-30',
    })
    expect(r.dagenTotaal).toBe(5)
    expect(r.verantwoording.parameterbronnen).toEqual([
      'fictieve versie A',
      'fictieve versie B — weekend telt niet meer',
    ])
  })

  it('G2: identieke invoer → bit-voor-bit identiek resultaat', () => {
    const invoer: TellerInvoer = {
      aanstellingen: [aanstelling('2025-09-01', '2026-06-30')],
      afwezigheden: [{ start: '2026-01-12', einde: '2026-01-23', code: 'ziekte' }],
      parameters: P,
      peildatum: '2026-06-30',
    }
    expect(berekenTeller(invoer)).toEqual(berekenTeller(invoer))
  })

  it('G3: de verantwoording bevat periodes, afwezigheden, bronnen en telregels', () => {
    const r = teller({
      aanstellingen: [aanstelling('2025-09-01', '2026-06-30')],
      afwezigheden: [{ start: '2026-01-12', einde: '2026-01-23', code: 'ziekte' }],
    })
    expect(r.verantwoording.peildatum).toBe('2026-06-30')
    expect(r.verantwoording.periodes).toHaveLength(1)
    expect(r.verantwoording.afwezigheden).toEqual([
      { start: '2026-01-12', einde: '2026-01-23', code: 'ziekte', teltEffectief: false },
    ])
    expect(r.verantwoording.parameterbronnen[0]).toContain('PERS/2019/03')
    expect(r.verantwoording.telregels.zomervakantieTeltMee).toBe(false)
  })
})

describe('Randgevallen buiten het testcontract (regressiebescherming)', () => {
  it('ongeldige datums worden geweigerd', () => {
    expect(() => teller({ aanstellingen: [aanstelling('2026-02-30', '2026-06-30')] })).toThrow(
      /Ongeldige datum/,
    )
  })

  it('peildatum vóór de aanstelling → nul dagen', () => {
    const r = teller({
      aanstellingen: [aanstelling('2026-09-01', '2027-06-30')],
      peildatum: '2026-06-30',
    })
    expect(r.dagenTotaal).toBe(0)
    expect(evalueerDrempel(r, P).drempelBereikt).toBe(false)
  })

  it('geen parameterversie geldig op een geteld moment → expliciete fout', () => {
    expect(() =>
      berekenTeller({
        aanstellingen: [aanstelling('2018-09-01', '2019-06-30')],
        parameters: P,
        peildatum: '2019-06-30',
      }),
    ).toThrow(/Geen parameterversie geldig/)
  })
})
