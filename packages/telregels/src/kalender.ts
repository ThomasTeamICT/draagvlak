import type { ISODatum } from './types.js'

const DAG_MS = 86_400_000

export function naarUtc(datum: ISODatum): number {
  const delen = datum.split('-').map(Number)
  const [j, m, d] = delen
  if (delen.length !== 3 || !j || !m || !d) throw new Error(`Ongeldige datum: ${datum}`)
  const ms = Date.UTC(j, m - 1, d)
  if (naarIso(ms) !== datum) throw new Error(`Ongeldige datum: ${datum}`)
  return ms
}

export function naarIso(utcMs: number): ISODatum {
  return new Date(utcMs).toISOString().slice(0, 10)
}

/** Itereert alle kalenderdagen van start tot en met einde. */
export function* dagenIn(start: ISODatum, einde: ISODatum): Generator<ISODatum> {
  for (let t = naarUtc(start); t <= naarUtc(einde); t += DAG_MS) yield naarIso(t)
}

/** true voor een bestaande kalenderdag (verwerpt bv. '2026-02-30'). */
export function isGeldigeKalenderdatum(datum: string): boolean {
  try {
    naarUtc(datum)
    return true
  } catch {
    return false
  }
}

/** Aantal kalenderdagen van `van` tot `tot` (negatief wanneer `tot` eerder valt). */
export function dagenTussen(van: ISODatum, tot: ISODatum): number {
  return Math.round((naarUtc(tot) - naarUtc(van)) / DAG_MS)
}

export function isWeekend(datum: ISODatum): boolean {
  const dag = new Date(naarUtc(datum)).getUTCDay()
  return dag === 0 || dag === 6
}

/** Juli en augustus. De officiële afbakening van de zomervakantie valt hiermee samen. */
export function isZomermaand(datum: ISODatum): boolean {
  const m = Number(datum.slice(5, 7))
  return m === 7 || m === 8
}

/** Schooljaar van een datum, bv. '2025-2026' (schooljaar loopt van 1/9 t/m 31/8). */
export function schooljaarVan(datum: ISODatum): string {
  const j = Number(datum.slice(0, 4))
  const m = Number(datum.slice(5, 7))
  return m >= 9 ? `${j}-${j + 1}` : `${j - 1}-${j}`
}

/** Kalenderjaar waarin juni van het lopende schooljaar valt. */
export function juniJaarVan(datum: ISODatum): number {
  const j = Number(datum.slice(0, 4))
  const m = Number(datum.slice(5, 7))
  return m >= 9 ? j + 1 : j
}
