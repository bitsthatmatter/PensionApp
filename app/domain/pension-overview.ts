import type { Age } from '~/types/financial'
import type { Pensioenoverzicht } from '~/types/pensioenoverzicht'
import { isLeeftijdsGrens } from '~/types/pensioenoverzicht'
import { ageToMonths } from '~/domain/age'

/**
 * Derives the pension start age from an overview by finding the lowest Van.Leeftijd
 * among all total rows that have a Pensioen amount > 0.
 *
 * Throws if no qualifying row is found.
 */
export function deriveIngangsdatum(overzicht: Pensioenoverzicht): Age {
  const totaalRegels = overzicht.Totalen.OuderdomsPensioenTotalen.OuderdomsPensioenTotaal

  let lowestMonths = Infinity
  let result: Age | null = null

  for (const regel of totaalRegels) {
    if (!isLeeftijdsGrens(regel.Van)) continue
    const pensioen = (regel.Pensioen ?? 0) + (regel.IndicatiefPensioen ?? 0)
    if (pensioen <= 0) continue

    const months = ageToMonths({ years: regel.Van.Leeftijd.Jaren, months: regel.Van.Leeftijd.Maanden })
    if (months < lowestMonths) {
      lowestMonths = months
      result = { years: regel.Van.Leeftijd.Jaren, months: regel.Van.Leeftijd.Maanden }
    }
  }

  if (result === null) {
    throw new Error('Geen geldige ingangsdatum gevonden in het pensioenoverzicht.')
  }

  return result
}
