import type { DrempelEvaluatie, ISODatum, ParameterVersie, TellerResultaat } from './types.js'
import { juniJaarVan } from './kalender.js'
import { resolveerParameters } from './parameters.js'

/**
 * Toetst een tellerresultaat aan de TADD-drempels (testcases C4, D1, D2).
 * Bij een bereikte drempel horen de decretale deadlines van het lopende schooljaar:
 * kandidaatstelling vóór 15 juni, beoordeling uiterlijk 30 juni.
 */
export function evalueerDrempel(
  resultaat: TellerResultaat,
  parameters: readonly ParameterVersie[],
): DrempelEvaluatie {
  const peildatum = resultaat.verantwoording.peildatum
  const versie = resolveerParameters(parameters, peildatum)

  const totaalOk = resultaat.dagenTotaal >= versie.drempelTotaal
  const effectiefOk = resultaat.dagenEffectief >= versie.drempelEffectief

  if (totaalOk && effectiefOk) {
    const juniJaar = juniJaarVan(peildatum)
    return {
      drempelBereikt: true,
      beoordelingVereist: true,
      redenen: [
        `drempel bereikt: ${resultaat.dagenTotaal} dagen dienstanciënniteit (≥ ${versie.drempelTotaal}) waarvan ${resultaat.dagenEffectief} effectief (≥ ${versie.drempelEffectief})`,
      ],
      deadlines: {
        kandidaatstellingTadd: `${juniJaar}-06-15`,
        beoordeling: `${juniJaar}-06-30`,
      },
    }
  }

  const redenen: string[] = []
  if (!totaalOk) {
    redenen.push(
      `dienstanciënniteit ${resultaat.dagenTotaal} dagen < drempel ${versie.drempelTotaal}`,
    )
  } else {
    redenen.push(
      `effectief gepresteerd ${resultaat.dagenEffectief} dagen < drempel ${versie.drempelEffectief} — drempel niet bereikt ondanks ${resultaat.dagenTotaal} dagen dienstanciënniteit`,
    )
  }
  return { drempelBereikt: false, beoordelingVereist: false, redenen }
}

/** Peildatum voor de prognose: 30 juni van het lopende schooljaar (deadline-engine, stap 1). */
export function prognosePeildatum(vandaag: ISODatum): ISODatum {
  return `${juniJaarVan(vandaag)}-06-30`
}
