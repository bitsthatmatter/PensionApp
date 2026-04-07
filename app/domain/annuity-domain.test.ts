/**
 * Unit tests: actuariële domeinlaag
 *
 * Referentiewaarden gebaseerd op:
 *  - AG2024 cohortlevensverwachting: mannen 20,4 jr op 65 / vrouwen 23,3 jr op 65
 *    (bron: AG2022 samenvatting; AG2024 wijkt <0.2 jaar af)
 *  - Annuïteitsfactoren geverifieerd tegen bekende actuariële tabellen
 */

import { describe, it, expect } from 'vitest'
import {
  survivalProbability,
  computeAnnuityFactor,
  capitalToMonthlyBenefit,
  remainingLifeExpectancy,
  calculateAllScenarios,
  calculateAnnuityResult,
  STANDARD_SCENARIOS,
  formatEurocents,
  euroToEurocents,
} from './annuity-domain'

// ---------------------------------------------------------------------------
// survivalProbability
// ---------------------------------------------------------------------------
describe('survivalProbability', () => {
  it('tPx op t=0 is altijd 1', () => {
    expect(survivalProbability(65, 0, 'male')).toBe(1)
    expect(survivalProbability(65, 0, 'female')).toBe(1)
  })

  it('kans neemt af naarmate t groter wordt', () => {
    const p5  = survivalProbability(65, 5,  'male')
    const p10 = survivalProbability(65, 10, 'male')
    const p20 = survivalProbability(65, 20, 'male')
    expect(p5).toBeGreaterThan(p10)
    expect(p10).toBeGreaterThan(p20)
    expect(p20).toBeGreaterThan(0)
  })

  it('vrouwen hebben hogere overlevingskans dan mannen', () => {
    const male   = survivalProbability(65, 20, 'male')
    const female = survivalProbability(65, 20, 'female')
    expect(female).toBeGreaterThan(male)
  })

  it('overlevingskans op omega is ~0', () => {
    expect(survivalProbability(55, 60, 'male')).toBeLessThan(0.001)
  })
})

// ---------------------------------------------------------------------------
// remainingLifeExpectancy
// ---------------------------------------------------------------------------
describe('remainingLifeExpectancy', () => {
  it('65-jarige man: ~20 jaar (AG2024 referentie: 20.4)', () => {
    const e = remainingLifeExpectancy(65, 'male')
    expect(e).toBeGreaterThan(19)
    expect(e).toBeLessThan(22)
  })

  it('65-jarige vrouw: ~23 jaar (AG2024 referentie: 23.3)', () => {
    const e = remainingLifeExpectancy(65, 'female')
    expect(e).toBeGreaterThan(21)
    expect(e).toBeLessThan(25)
  })

  it('vrouwen leven langer dan mannen op elke leeftijd', () => {
    for (const age of [55, 60, 65, 70, 75]) {
      expect(remainingLifeExpectancy(age, 'female')).toBeGreaterThan(
        remainingLifeExpectancy(age, 'male'),
      )
    }
  })

  it('levensverwachting neemt af met leeftijd', () => {
    const e65 = remainingLifeExpectancy(65, 'male')
    const e70 = remainingLifeExpectancy(70, 'male')
    // e70 < e65, maar e70 + 5 > e65 (overlevenden zijn geselecteerd)
    expect(e65).toBeGreaterThan(e70)
  })
})

// ---------------------------------------------------------------------------
// computeAnnuityFactor
// ---------------------------------------------------------------------------
describe('computeAnnuityFactor', () => {
  it('factor is positief', () => {
    expect(computeAnnuityFactor(67, 0.03, 'male')).toBeGreaterThan(0)
  })

  it('hogere rekenrente → lagere factor → hogere uitkering', () => {
    const f1 = computeAnnuityFactor(67, 0.01, 'male')
    const f3 = computeAnnuityFactor(67, 0.03, 'male')
    const f5 = computeAnnuityFactor(67, 0.05, 'male')
    expect(f1).toBeGreaterThan(f3)
    expect(f3).toBeGreaterThan(f5)
  })

  it('vrouwenfactor groter dan mannenfactor (langere levensduur)', () => {
    const fm = computeAnnuityFactor(65, 0.03, 'male')
    const ff = computeAnnuityFactor(65, 0.03, 'female')
    expect(ff).toBeGreaterThan(fm)
  })

  it('factor bij 0% rekenrente ≈ levensverwachting (definitie)', () => {
    const factor = computeAnnuityFactor(65, 0, 'male')
    const expectancy = remainingLifeExpectancy(65, 'male')
    // Beide beginnen op t=0, dus factor = 1 + Σ(t=1...) tPx = 1 + e_x
    expect(factor).toBeCloseTo(1 + expectancy, 0)
  })

  it('factor bij 67 jaar, 3%, man: realistisch bereik 12–15', () => {
    const f = computeAnnuityFactor(67, 0.03, 'male')
    expect(f).toBeGreaterThan(12)
    expect(f).toBeLessThan(15)
  })
})

// ---------------------------------------------------------------------------
// capitalToMonthlyBenefit
// ---------------------------------------------------------------------------
describe('capitalToMonthlyBenefit', () => {
  it('€100.000 kapitaal → redelijke maanduitkering', () => {
    // Bij 3% rekenrente, 67 jaar, man: verwacht ~€550-700/maand
    const monthly = capitalToMonthlyBenefit(100_000_00, 67, 0.03, 'male')
    expect(monthly).toBeGreaterThan(50_000)  // > €500
    expect(monthly).toBeLessThan(90_000)     // < €900
  })

  it('vrouw krijgt lagere uitkering dan man (hogere levensverwachting)', () => {
    const male   = capitalToMonthlyBenefit(100_000_00, 67, 0.03, 'male')
    const female = capitalToMonthlyBenefit(100_000_00, 67, 0.03, 'female')
    expect(male).toBeGreaterThan(female)
  })

  it('hogere rekenrente → hogere maanduitkering', () => {
    const low  = capitalToMonthlyBenefit(100_000_00, 67, 0.01, 'male')
    const high = capitalToMonthlyBenefit(100_000_00, 67, 0.05, 'male')
    expect(high).toBeGreaterThan(low)
  })

  it('0 kapitaal → 0 uitkering', () => {
    expect(capitalToMonthlyBenefit(0, 67, 0.03, 'male')).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// calculateAllScenarios
// ---------------------------------------------------------------------------
describe('calculateAllScenarios', () => {
  const capital = 300_000_00 // €300.000

  it('geeft drie resultaten terug zonder custom rate', () => {
    const results = calculateAllScenarios(capital, 67, 'male')
    expect(results).toHaveLength(3)
  })

  it('geeft vier resultaten terug met custom rate', () => {
    const results = calculateAllScenarios(capital, 67, 'male', 0.035)
    expect(results).toHaveLength(4)
    expect(results.find((r) => r.scenario.key === 'custom')).toBeDefined()
  })

  it('pessimistisch < neutraal < optimistisch (uitkering)', () => {
    const results = calculateAllScenarios(capital, 67, 'male')
    const pess = results.find((r) => r.scenario.key === 'pessimistic')!
    const neut = results.find((r) => r.scenario.key === 'neutral')!
    const opt  = results.find((r) => r.scenario.key === 'optimistic')!
    expect(pess.monthlyBenefitEurocents).toBeLessThan(neut.monthlyBenefitEurocents)
    expect(neut.monthlyBenefitEurocents).toBeLessThan(opt.monthlyBenefitEurocents)
  })

  it('alle resultaten hebben consistente data', () => {
    const results = calculateAllScenarios(capital, 67, 'male')
    for (const r of results) {
      expect(r.annuityFactor).toBeGreaterThan(0)
      expect(r.monthlyBenefitEurocents).toBeGreaterThan(0)
      expect(r.annualBenefitEurocents).toBe(r.monthlyBenefitEurocents * 12)
      expect(r.remainingLifeExpectancyYears).toBeGreaterThan(10)
    }
  })
})

// ---------------------------------------------------------------------------
// STANDARD_SCENARIOS
// ---------------------------------------------------------------------------
describe('STANDARD_SCENARIOS', () => {
  it('bevat pessimistic, neutral en optimistic', () => {
    expect(STANDARD_SCENARIOS.pessimistic.discountRate).toBe(0.01)
    expect(STANDARD_SCENARIOS.neutral.discountRate).toBe(0.03)
    expect(STANDARD_SCENARIOS.optimistic.discountRate).toBe(0.05)
  })
})

// ---------------------------------------------------------------------------
// Hulpfuncties
// ---------------------------------------------------------------------------
describe('formatEurocents', () => {
  it('formatteert correct naar euro-notatie', () => {
    expect(formatEurocents(100_000)).toBe('€ 1.000')
    expect(formatEurocents(1_234_500)).toBe('€ 12.345')
  })
})

describe('euroToEurocents', () => {
  it('converteert correct', () => {
    expect(euroToEurocents(1000)).toBe(100_000)
    expect(euroToEurocents(1.5)).toBe(150)
  })
})
