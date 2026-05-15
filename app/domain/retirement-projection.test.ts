import { describe, it, expect } from 'vitest'
import type { ProjectionInput } from './retirement-projection'
import type { Pensioenoverzicht } from '~/types/pensioenoverzicht'
import { projectRetirementTimeline } from './retirement-projection'

/** Minimale Pensioenoverzicht fixture met ouderdomspensioen en AOW. */
function makePensioenoverzicht(opts: {
  pensionAnnual?: number
  pensionFromAge?: { years: number; months: number }
  aowSamenwonend?: number
  aowAlleenstaand?: number
}): Pensioenoverzicht {
  const {
    pensionAnnual = 0,
    pensionFromAge = { years: 67, months: 0 },
    aowSamenwonend = 0,
    aowAlleenstaand = 0,
  } = opts

  return {
    StatusCode: '000',
    TijdstipAanmakenBericht: '2026-01-01T00:00:00',
    Totalen: {
      OuderdomsPensioenTotalen: {
        OuderdomsPensioenTotaal: [
          ...(pensionAnnual > 0 ? [{
            Van: { Leeftijd: { Jaren: pensionFromAge.years, Maanden: pensionFromAge.months } },
            Tot: { OuderdomsPensioenEvent: 'Overlijden' as const },
            Pensioen: pensionAnnual,
          }] : []),
          ...(aowSamenwonend > 0 || aowAlleenstaand > 0 ? [{
            Van: { Leeftijd: { Jaren: 67, Maanden: 3 } },
            Tot: { OuderdomsPensioenEvent: 'Overlijden' as const },
            AOWSamenwonend: aowSamenwonend,
            AOWAlleenstaand: aowAlleenstaand,
          }] : []),
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
}

function makeInput(overrides: Partial<ProjectionInput> = {}): ProjectionInput {
  return {
    dateOfBirth: '1990-01-15',
    retirementAge: { years: 67, months: 0 },
    aowAge: { years: 67, months: 3 },
    hasPartner: false,
    streams: [],
    expenseStreams: [],
    budgetedCosts: [],
    pensionData: null,
    ...overrides,
  }
}

describe('projectRetirementTimeline', () => {
  it('returns empty timeline when no dateOfBirth context allows computation', () => {
    const input = makeInput()
    const timeline = projectRetirementTimeline(input)
    expect(timeline.length).toBeGreaterThan(0)
    expect(timeline[0]).toHaveProperty('date')
    expect(timeline[0]).toHaveProperty('age')
    expect(timeline[0]).toHaveProperty('totalIncome')
    expect(timeline[0]).toHaveProperty('totalExpenses')
    expect(timeline[0]).toHaveProperty('netCashflow')
    expect(timeline[0]).toHaveProperty('cumulativeSavings')
  })

  it('projects timeline up to endAge', () => {
    const timeline = projectRetirementTimeline(makeInput({ endAge: 70 }))
    const lastSnapshot = timeline[timeline.length - 1]!
    expect(lastSnapshot.age.years).toBe(70)
    expect(lastSnapshot.age.months).toBe(0)
  })

  it('includes salary income before retirement age', () => {
    const timeline = projectRetirementTimeline(makeInput({
      retirementAge: { years: 67, months: 0 },
      endAge: 68,
      streams: [
        { id: '1', type: 'salary', label: 'Salaris', monthlyAmount: 4000 },
      ],
      expenseStreams: [],
    }))

    // Find a snapshot before retirement (age 36, which is current age for 1990 DOB in 2026)
    const preRetirement = timeline.find(s => s.age.years === 40)
    expect(preRetirement).toBeDefined()
    expect(preRetirement!.totalIncome).toBe(4000)

    // After retirement, salary stops
    const postRetirement = timeline.find(s => s.age.years === 67 && s.age.months === 6)
    expect(postRetirement).toBeDefined()
    expect(postRetirement!.totalIncome).toBe(0)
  })

  it('includes pension income from retirement age', () => {
    const timeline = projectRetirementTimeline(makeInput({
      retirementAge: { years: 67, months: 0 },
      endAge: 68,
      pensionData: makePensioenoverzicht({ pensionAnnual: 24000, pensionFromAge: { years: 67, months: 0 } }),
    }))

    // Before retirement: no pension income
    const preRetirement = timeline.find(s => s.age.years === 66)
    expect(preRetirement!.totalIncome).toBe(0)

    // After retirement: pension kicks in (24000/12 = 2000/month)
    const postRetirement = timeline.find(s => s.age.years === 67 && s.age.months === 1)
    expect(postRetirement).toBeDefined()
    expect(postRetirement!.totalIncome).toBe(2000)
  })

  it('includes AOW from AOW age', () => {
    const timeline = projectRetirementTimeline(makeInput({
      retirementAge: { years: 65, months: 0 },
      aowAge: { years: 67, months: 3 },
      endAge: 68,
      hasPartner: false,
      pensionData: makePensioenoverzicht({ aowSamenwonend: 12000, aowAlleenstaand: 18000 }),
    }))

    // Before AOW age: no AOW
    const beforeAow = timeline.find(s => s.age.years === 67 && s.age.months === 0)
    expect(beforeAow!.totalIncome).toBe(0)

    // After AOW age: alleenstaand AOW (18000/12 = 1500/month)
    const afterAow = timeline.find(s => s.age.years === 67 && s.age.months === 6)
    expect(afterAow).toBeDefined()
    expect(afterAow!.totalIncome).toBe(1500)
  })

  it('uses samenwonend AOW rate when hasPartner, without double-adding', () => {
    const timeline = projectRetirementTimeline(makeInput({
      retirementAge: { years: 65, months: 0 },
      aowAge: { years: 67, months: 3 },
      endAge: 68,
      hasPartner: true,
      partnerDateOfBirth: '1992-01-01',
      pensionData: makePensioenoverzicht({ aowSamenwonend: 12000, aowAlleenstaand: 18000 }),
    }))

    // After primary person's AOW age: only samenwonend / 12 = 1000/month (no double-add)
    const afterAow = timeline.find(s => s.age.years === 67 && s.age.months === 6)
    expect(afterAow).toBeDefined()
    expect(afterAow!.totalIncome).toBe(1000)
  })

  it('applies baseline expenses throughout timeline', () => {
    const timeline = projectRetirementTimeline(makeInput({
      endAge: 40,
      expenseStreams: [
        { id: '1', type: 'expense', label: 'Wonen', monthlyAmount: -2000 },
        { id: '2', type: 'expense', label: 'Eten', monthlyAmount: -500 },
      ],
    }))

    // Every month should have baseline expense of 2500
    for (const snapshot of timeline) {
      expect(snapshot.totalExpenses).toBeGreaterThanOrEqual(2500)
    }
  })

  it('handles one-time budgeted costs', () => {
    const timeline = projectRetirementTimeline(makeInput({
      dateOfBirth: '1990-06-15',
      endAge: 40,
      budgetedCosts: [
        { id: '1', label: 'Verbouwing', amount: 50000, recurring: 'once', date: '2028-06-01' },
      ],
    }))

    const costMonth = timeline.find(s => s.date === '2028-06-15')
    const noCostMonth = timeline.find(s => s.date === '2028-07-15')
    expect(costMonth!.totalExpenses).toBe(50000)
    expect(noCostMonth!.totalExpenses).toBe(0)
  })

  it('handles monthly recurring budgeted costs', () => {
    const timeline = projectRetirementTimeline(makeInput({
      dateOfBirth: '1990-06-15',
      endAge: 45,
      budgetedCosts: [
        { id: '1', label: 'Hypotheek', amount: 1200, recurring: 'monthly', date: '2026-01-01', endDate: '2030-12-31' },
      ],
    }))

    // During cost period
    const duringCost = timeline.find(s => s.age.years === 38)
    expect(duringCost!.totalExpenses).toBe(1200)
    // After endDate (2031+), cost no longer applies
    const afterCost = timeline.find(s => s.age.years === 42)
    expect(afterCost!.totalExpenses).toBe(0)
  })

  it('accumulates savings over time', () => {
    const timeline = projectRetirementTimeline(makeInput({
      endAge: 38,
      streams: [
        { id: '1', type: 'salary', label: 'Salaris', monthlyAmount: 3000 },
      ],
      expenseStreams: [
        { id: '2', type: 'expense', label: 'Kosten', monthlyAmount: -2000 },
      ],
    }))

    // Net cashflow is 1000/month, savings should accumulate
    for (let i = 1; i < timeline.length; i++) {
      expect(timeline[i]!.cumulativeSavings).toBeGreaterThan(timeline[i - 1]!.cumulativeSavings)
    }
  })

  it('includes initial lump sum savings', () => {
    const timeline = projectRetirementTimeline(makeInput({
      endAge: 37,
      streams: [
        { id: '1', type: 'savings', label: 'Spaargeld', monthlyAmount: 0, lumpSum: 50000 },
      ],
    }))

    expect(timeline[0]!.cumulativeSavings).toBe(50000)
  })
})

describe('projectRetirementTimeline — supplementPeriods', () => {
  it('tops up income to targetIncome when savings are available', () => {
    // Pension of 2000/month from age 67; targetIncome 3000 → supplement 1000/month
    const timeline = projectRetirementTimeline(makeInput({
      retirementAge: { years: 67, months: 0 },
      endAge: 68,
      streams: [
        { id: 'savings', type: 'savings', label: 'Spaargeld', monthlyAmount: 0, lumpSum: 100000 },
      ],
      pensionData: makePensioenoverzicht({ pensionAnnual: 24000, pensionFromAge: { years: 67, months: 0 } }),
      supplementPeriods: [
        { fromAge: { years: 67, months: 0 }, targetIncome: 3000 },
      ],
    }))

    const atRetirement = timeline.find(s => s.age.years === 67 && s.age.months === 0)!
    expect(atRetirement.totalIncome).toBe(3000)
  })

  it('supplement is dynamic: adjusts when regular income changes (e.g. AOW starts)', () => {
    // Pension 2000/month from 67; AOW 1500/month from 67y3m; targetIncome 3500
    // Before AOW: supplement = 3500 - 2000 = 1500
    // After AOW:  supplement = 3500 - (2000 + 1500) = 0
    const timeline = projectRetirementTimeline(makeInput({
      retirementAge: { years: 67, months: 0 },
      aowAge: { years: 67, months: 3 },
      endAge: 68,
      hasPartner: false,
      streams: [
        { id: 'savings', type: 'savings', label: 'Spaargeld', monthlyAmount: 0, lumpSum: 200000 },
      ],
      pensionData: makePensioenoverzicht({
        pensionAnnual: 24000,
        pensionFromAge: { years: 67, months: 0 },
        aowAlleenstaand: 18000,
      }),
      supplementPeriods: [
        { fromAge: { years: 67, months: 0 }, targetIncome: 3500 },
      ],
    }))

    const beforeAow = timeline.find(s => s.age.years === 67 && s.age.months === 1)!
    expect(beforeAow.totalIncome).toBe(3500)

    // After AOW: regular income = 2000 + 1500 = 3500, supplement = 0
    const afterAow = timeline.find(s => s.age.years === 67 && s.age.months === 6)!
    expect(afterAow.totalIncome).toBe(3500) // same total, but no supplement needed
  })

  it('supplement stops when cumulativeSavings reaches zero', () => {
    // Use a DOB that puts current age just before retirement so the timeline
    // starts close to 67 and the lump sum isn't drained before we get there.
    // DOB 1959-01-15 → current age ~67y4m in 2026, so timeline starts at 67y4m.
    // Lump sum 500, expenses 2000/month, supplement target 1000.
    // At 67y4m: cumulativeSavings=500>0, supplement=1000, income=1000, expenses=2000, net=-1000 → cumSavings=-500
    // At 67y5m: cumulativeSavings=-500<=0, no supplement, income=0
    const timeline = projectRetirementTimeline({
      dateOfBirth: '1959-01-15',
      retirementAge: { years: 67, months: 0 },
      aowAge: { years: 67, months: 3 },
      hasPartner: false,
      streams: [
        { id: 'savings', type: 'savings', label: 'Spaargeld', monthlyAmount: 0, lumpSum: 500 },
      ],
      expenseStreams: [
        { id: 'exp', type: 'expense', label: 'Kosten', monthlyAmount: -2000 },
      ],
      budgetedCosts: [],
      pensionData: null,
      supplementPeriods: [
        { fromAge: { years: 67, months: 0 }, targetIncome: 1000 },
      ],
      endAge: 68,
    })

    // First snapshot: savings=500>0, supplement applied
    const firstSnap = timeline[0]!
    expect(firstSnap.totalIncome).toBe(1000)

    // Second snapshot: savings went negative, no supplement
    const secondSnap = timeline[1]!
    expect(secondSnap.totalIncome).toBe(0)
  })

  it('open-ended period (no toAge) runs until end of timeline', () => {
    const timeline = projectRetirementTimeline(makeInput({
      retirementAge: { years: 67, months: 0 },
      endAge: 68,
      streams: [
        { id: 'savings', type: 'savings', label: 'Spaargeld', monthlyAmount: 0, lumpSum: 1000000 },
      ],
      supplementPeriods: [
        { fromAge: { years: 67, months: 0 }, targetIncome: 2000 },
      ],
    }))

    const lastSnapshot = timeline[timeline.length - 1]!
    expect(lastSnapshot.totalIncome).toBe(2000)
  })

  it('period with toAge stops supplement at that age', () => {
    const timeline = projectRetirementTimeline(makeInput({
      retirementAge: { years: 67, months: 0 },
      endAge: 68,
      streams: [
        { id: 'savings', type: 'savings', label: 'Spaargeld', monthlyAmount: 0, lumpSum: 1000000 },
      ],
      supplementPeriods: [
        { fromAge: { years: 67, months: 0 }, toAge: { years: 67, months: 6 }, targetIncome: 2000 },
      ],
    }))

    const withinPeriod = timeline.find(s => s.age.years === 67 && s.age.months === 3)!
    const afterPeriod = timeline.find(s => s.age.years === 67 && s.age.months === 6)!

    expect(withinPeriod.totalIncome).toBe(2000)
    expect(afterPeriod.totalIncome).toBe(0) // no supplement, no other income
  })

  it('does not supplement when regular income already meets targetIncome', () => {
    // Pension 3000/month, targetIncome 2000 → no supplement needed
    const timeline = projectRetirementTimeline(makeInput({
      retirementAge: { years: 67, months: 0 },
      endAge: 68,
      streams: [
        { id: 'savings', type: 'savings', label: 'Spaargeld', monthlyAmount: 0, lumpSum: 100000 },
      ],
      pensionData: makePensioenoverzicht({ pensionAnnual: 36000, pensionFromAge: { years: 67, months: 0 } }),
      supplementPeriods: [
        { fromAge: { years: 67, months: 0 }, targetIncome: 2000 },
      ],
    }))

    const atRetirement = timeline.find(s => s.age.years === 67 && s.age.months === 0)!
    expect(atRetirement.totalIncome).toBe(3000) // no supplement added
  })
})
