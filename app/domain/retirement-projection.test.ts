import { describe, it, expect } from 'vitest'
import type { ProjectionInput } from './retirement-projection'
import type { PensionPeriodAmount } from '~/types/financial'
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
    pensionAmounts: null,
    ...overrides,
  }
}

describe('projectRetirementTimeline', () => {
  it('returns a non-empty timeline with expected shape', () => {
    const timeline = projectRetirementTimeline(makeInput())
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

    const preRetirement = timeline.find(s => s.age.years === 40)
    expect(preRetirement).toBeDefined()
    expect(preRetirement!.totalIncome).toBe(4000)

    // After retirement, salary stops
    const postRetirement = timeline.find(s => s.age.years === 67 && s.age.months === 6)
    expect(postRetirement).toBeDefined()
    expect(postRetirement!.totalIncome).toBe(0)
  })

  it('uses netBeforeAow from retirement age until AOW age', () => {
    const pensionAmounts: PensionPeriodAmount = { netBeforeAow: 2000, netAfterAow: 3500 }
    const timeline = projectRetirementTimeline(makeInput({
      retirementAge: { years: 67, months: 0 },
      aowAge: { years: 67, months: 3 },
      endAge: 68,
      pensionAmounts,
    }))

    // Before retirement: no pension
    const preRetirement = timeline.find(s => s.age.years === 66)
    expect(preRetirement!.totalIncome).toBe(0)

    // After retirement, before AOW: netBeforeAow
    const beforeAow = timeline.find(s => s.age.years === 67 && s.age.months === 1)!
    expect(beforeAow.totalIncome).toBe(2000)

    // After AOW age: netAfterAow
    const afterAow = timeline.find(s => s.age.years === 67 && s.age.months === 6)!
    expect(afterAow.totalIncome).toBe(3500)
  })

  it('uses netAfterAow when retirement age equals AOW age', () => {
    const pensionAmounts: PensionPeriodAmount = { netBeforeAow: 2000, netAfterAow: 3500 }
    const timeline = projectRetirementTimeline(makeInput({
      retirementAge: { years: 67, months: 3 },
      aowAge: { years: 67, months: 3 },
      endAge: 68,
      pensionAmounts,
    }))

    // At retirement (= AOW age): netAfterAow
    const atRetirement = timeline.find(s => s.age.years === 67 && s.age.months === 3)!
    expect(atRetirement.totalIncome).toBe(3500)
  })

  it('no pension income when pensionAmounts is null', () => {
    const timeline = projectRetirementTimeline(makeInput({
      retirementAge: { years: 67, months: 0 },
      endAge: 68,
      pensionAmounts: null,
    }))

    const postRetirement = timeline.find(s => s.age.years === 67 && s.age.months === 6)!
    expect(postRetirement.totalIncome).toBe(0)
  })

  it('applies baseline expenses throughout timeline', () => {
    const timeline = projectRetirementTimeline(makeInput({
      endAge: 40,
      expenseStreams: [
        { id: '1', type: 'expense', label: 'Wonen', monthlyAmount: -2000 },
        { id: '2', type: 'expense', label: 'Eten', monthlyAmount: -500 },
      ],
    }))

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

    const duringCost = timeline.find(s => s.age.years === 38)
    expect(duringCost!.totalExpenses).toBe(1200)
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
    // Pension 2000/month before AOW; targetIncome 3000 → supplement 1000/month
    const timeline = projectRetirementTimeline(makeInput({
      retirementAge: { years: 67, months: 0 },
      aowAge: { years: 67, months: 3 },
      endAge: 68,
      streams: [
        { id: 'savings', type: 'savings', label: 'Spaargeld', monthlyAmount: 0, lumpSum: 100000 },
      ],
      pensionAmounts: { netBeforeAow: 2000, netAfterAow: 3500 },
      supplementPeriods: [
        { fromAge: { years: 67, months: 0 }, targetIncome: 3000 },
      ],
    }))

    const atRetirement = timeline.find(s => s.age.years === 67 && s.age.months === 0)!
    expect(atRetirement.totalIncome).toBe(3000)
  })

  it('supplement is dynamic: adjusts when regular income changes at AOW age', () => {
    // Before AOW: pension 2000, targetIncome 3500 → supplement 1500
    // After AOW: pension 3500 (netAfterAow), targetIncome 3500 → supplement 0
    const timeline = projectRetirementTimeline(makeInput({
      retirementAge: { years: 67, months: 0 },
      aowAge: { years: 67, months: 3 },
      endAge: 68,
      streams: [
        { id: 'savings', type: 'savings', label: 'Spaargeld', monthlyAmount: 0, lumpSum: 200000 },
      ],
      pensionAmounts: { netBeforeAow: 2000, netAfterAow: 3500 },
      supplementPeriods: [
        { fromAge: { years: 67, months: 0 }, targetIncome: 3500 },
      ],
    }))

    const beforeAow = timeline.find(s => s.age.years === 67 && s.age.months === 1)!
    expect(beforeAow.totalIncome).toBe(3500)

    // After AOW: regular income already 3500, no supplement needed
    const afterAow = timeline.find(s => s.age.years === 67 && s.age.months === 6)!
    expect(afterAow.totalIncome).toBe(3500)
  })

  it('supplement stops when cumulativeSavings reaches zero', () => {
    // DOB 1959-01-15 → current age ~67y4m in 2026, timeline starts at 67y4m.
    // Lump sum 500, expenses 2000/month, supplement target 1000.
    // Month 1: savings=500>0, supplement=1000, income=1000, expenses=2000, net=-1000 → cumSavings=-500
    // Month 2: savings=-500<=0, no supplement, income=0
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
      pensionAmounts: null,
      supplementPeriods: [
        { fromAge: { years: 67, months: 0 }, targetIncome: 1000 },
      ],
      endAge: 68,
    })

    const firstSnap = timeline[0]!
    expect(firstSnap.totalIncome).toBe(1000)

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
    expect(afterPeriod.totalIncome).toBe(0)
  })

  it('does not supplement when regular income already meets targetIncome', () => {
    // Pension 3000/month (netBeforeAow), targetIncome 2000 → no supplement
    const timeline = projectRetirementTimeline(makeInput({
      retirementAge: { years: 67, months: 0 },
      aowAge: { years: 67, months: 3 },
      endAge: 68,
      streams: [
        { id: 'savings', type: 'savings', label: 'Spaargeld', monthlyAmount: 0, lumpSum: 100000 },
      ],
      pensionAmounts: { netBeforeAow: 3000, netAfterAow: 4500 },
      supplementPeriods: [
        { fromAge: { years: 67, months: 0 }, targetIncome: 2000 },
      ],
    }))

    const atRetirement = timeline.find(s => s.age.years === 67 && s.age.months === 0)!
    expect(atRetirement.totalIncome).toBe(3000)
  })
})
