import { describe, it, expect } from 'vitest'
import type { Pensioenoverzicht } from '~/types/pensioenoverzicht'
import { deriveIngangsdatum } from './pension-overview'

function makeOverzicht(regels: Array<{
  jaren: number
  maanden: number
  pensioen?: number
  indicatief?: number
}>): Pensioenoverzicht {
  return {
    StatusCode: '000',
    TijdstipAanmakenBericht: '2026-01-01T00:00:00',
    Totalen: {
      OuderdomsPensioenTotalen: {
        OuderdomsPensioenTotaal: regels.map(r => ({
          Van: { Leeftijd: { Jaren: r.jaren, Maanden: r.maanden } },
          Tot: { OuderdomsPensioenEvent: 'Overlijden' as const },
          ...(r.pensioen !== undefined ? { Pensioen: r.pensioen } : {}),
          ...(r.indicatief !== undefined ? { IndicatiefPensioen: r.indicatief } : {}),
        })),
      },
      PartnerPensioenTotalen: { PartnerPensioenTotaal: [] },
      WezenPensioenTotalen: { WezenPensioenTotaal: [] },
    },
    Details: {
      OuderdomsPensioenDetails: { OuderdomsPensioen: [] },
      PartnerPensioenDetails: { PartnerPensioen: [] },
      WezenPensioenDetails: { WezenPensioen: [] },
    },
  }
}

describe('deriveIngangsdatum', () => {
  it('returns the Van.Leeftijd of the single pension row', () => {
    const overzicht = makeOverzicht([{ jaren: 67, maanden: 0, pensioen: 24000 }])
    expect(deriveIngangsdatum(overzicht)).toEqual({ years: 67, months: 0 })
  })

  it('returns the lowest Van.Leeftijd when multiple rows have pensioen > 0', () => {
    const overzicht = makeOverzicht([
      { jaren: 67, maanden: 0, pensioen: 24000 },
      { jaren: 62, maanden: 0, pensioen: 18000 },
      { jaren: 65, maanden: 6, pensioen: 20000 },
    ])
    expect(deriveIngangsdatum(overzicht)).toEqual({ years: 62, months: 0 })
  })

  it('ignores rows with pensioen = 0 or missing', () => {
    const overzicht = makeOverzicht([
      { jaren: 60, maanden: 0, pensioen: 0 },
      { jaren: 67, maanden: 0, pensioen: 24000 },
    ])
    expect(deriveIngangsdatum(overzicht)).toEqual({ years: 67, months: 0 })
  })

  it('counts IndicatiefPensioen toward the pensioen total', () => {
    const overzicht = makeOverzicht([
      { jaren: 65, maanden: 0, indicatief: 12000 },
    ])
    expect(deriveIngangsdatum(overzicht)).toEqual({ years: 65, months: 0 })
  })

  it('ignores rows without a LeeftijdsGrens as Van', () => {
    const overzicht: Pensioenoverzicht = {
      StatusCode: '000',
      TijdstipAanmakenBericht: '2026-01-01T00:00:00',
      Totalen: {
        OuderdomsPensioenTotalen: {
          OuderdomsPensioenTotaal: [
            {
              Van: { OuderdomsPensioenEvent: 'Overlijden' },
              Tot: { OuderdomsPensioenEvent: 'Overlijden' },
              Pensioen: 24000,
            },
            {
              Van: { Leeftijd: { Jaren: 67, Maanden: 0 } },
              Tot: { OuderdomsPensioenEvent: 'Overlijden' },
              Pensioen: 24000,
            },
          ],
        },
        PartnerPensioenTotalen: { PartnerPensioenTotaal: [] },
        WezenPensioenTotalen: { WezenPensioenTotaal: [] },
      },
      Details: {
        OuderdomsPensioenDetails: { OuderdomsPensioen: [] },
        PartnerPensioenDetails: { PartnerPensioen: [] },
        WezenPensioenDetails: { WezenPensioen: [] },
      },
    }
    expect(deriveIngangsdatum(overzicht)).toEqual({ years: 67, months: 0 })
  })

  it('throws when no qualifying row exists', () => {
    const overzicht = makeOverzicht([{ jaren: 67, maanden: 0, pensioen: 0 }])
    expect(() => deriveIngangsdatum(overzicht)).toThrow()
  })

  it('handles months correctly (e.g. 65 years 6 months)', () => {
    const overzicht = makeOverzicht([{ jaren: 65, maanden: 6, pensioen: 20000 }])
    expect(deriveIngangsdatum(overzicht)).toEqual({ years: 65, months: 6 })
  })
})
