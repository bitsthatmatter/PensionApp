import { describe, it, expect } from 'vitest'
import type { ProjectionInput } from './retirement-projection'
import { projectRetirementTimeline } from './retirement-projection'

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
      pensionData: {
        providers: [],
        aow: { samenwonend: 12000, alleenstaand: 18000 },
        ouderdomsPensioen: [
          {
            fromAge: { years: 67, months: 0 },
            pension: 24000,
          },
        ],
        partnerPensioen: [],
      },
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
      pensionData: {
        providers: [],
        aow: { samenwonend: 12000, alleenstaand: 18000 },
        ouderdomsPensioen: [],
        partnerPensioen: [],
      },
    }))

    // Before AOW age: no AOW
    const beforeAow = timeline.find(s => s.age.years === 67 && s.age.months === 0)
    expect(beforeAow!.totalIncome).toBe(0)

    // After AOW age: alleenstaand AOW (18000/12 = 1500/month)
    const afterAow = timeline.find(s => s.age.years === 67 && s.age.months === 6)
    expect(afterAow).toBeDefined()
    expect(afterAow!.totalIncome).toBe(1500)
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
