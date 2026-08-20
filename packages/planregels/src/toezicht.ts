import type { ISODatum } from './types.js'

/**
 * Beurtrolverdeling voor toezichten (module P2, planning.md).
 *
 * Ontwerpprincipes:
 * - de verdeling is een SUGGESTIE met zichtbare tellers — een mens beslist en
 *   kan ruilen (beslispunt 2: geen geautomatiseerde besluitvorming);
 * - deterministisch en uitlegbaar: bij elke beurt wint de kandidaat met de
 *   laagste teller (gelijke stand: vaste volgorde op id), zodat "waarom sta
 *   ik dinsdag?" altijd een controleerbaar antwoord heeft;
 * - binnen één verdeelronde krijgt niemand twee beurten op dezelfde dag,
 *   tenzij het niet anders kan (minder kandidaten dan plekken).
 */

export interface BeurtKandidaat {
  id: string
  /** Historische beurtteller (billijkheid): wie minder deed, komt eerst. */
  teller: number
}

export interface BeurtToewijzing {
  datum: ISODatum
  kandidaatId: string
}

export function verdeelBeurten(
  datums: readonly ISODatum[],
  kandidaten: readonly BeurtKandidaat[],
): BeurtToewijzing[] {
  if (kandidaten.length === 0) return []

  const stand = new Map<string, number>()
  for (const k of kandidaten) stand.set(k.id, k.teller)

  const perDatum = new Map<string, Set<string>>()
  const toewijzingen: BeurtToewijzing[] = []

  const laagste = (uitgesloten: ReadonlySet<string>): string | undefined =>
    [...stand.entries()]
      .filter(([id]) => !uitgesloten.has(id))
      .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))[0]?.[0]

  for (const datum of [...datums].sort()) {
    const bezet = perDatum.get(datum) ?? new Set<string>()
    const gekozen = laagste(bezet) ?? laagste(new Set())
    if (gekozen === undefined) continue
    stand.set(gekozen, stand.get(gekozen)! + 1)
    bezet.add(gekozen)
    perDatum.set(datum, bezet)
    toewijzingen.push({ datum, kandidaatId: gekozen })
  }
  return toewijzingen
}

/** Spreiding van een verdeling: verschil tussen de hoogste en laagste eindteller. */
export function spreiding(
  toewijzingen: readonly BeurtToewijzing[],
  kandidaten: readonly BeurtKandidaat[],
): number {
  const stand = new Map<string, number>()
  for (const k of kandidaten) stand.set(k.id, k.teller)
  for (const t of toewijzingen) stand.set(t.kandidaatId, (stand.get(t.kandidaatId) ?? 0) + 1)
  const waarden = [...stand.values()]
  return Math.max(...waarden) - Math.min(...waarden)
}
