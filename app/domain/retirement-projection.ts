import { Temporal } from 'temporal-polyfill'
import type { Age, FinancialStream, BudgetedCost, SupplementPeriod, PensionPeriodAmount } from '~/types/financial'
import { ageToMonths, monthsToAge, addMonthsToDate, ageAtDate } from '~/domain/age'

/** All monetary fields are in euros (floating-point). */
export interface MonthSnapshot {
  date: string
  age: Age
  /** Gross monthly income before any supplement draw (€). */
  baseIncome: number
  /** Gross monthly income including any supplement draw (€). */
  totalIncome: number
  /** Total monthly expenses (€). */
  totalExpenses: number
  /** totalIncome − totalExpenses (€). */
  netCashflow: number
  /** Running sum of netCashflow from projection start (€). */
  cumulativeSavings: number
  /** Amount drawn from savings as supplement this month (€). */
  supplementDrawn: number
}

export interface RetirementScenario {
  id: string
  label: string
  retirementAge: Age
  timeline: MonthSnapshot[]
  supplementPeriods: SupplementPeriod[]
}

export interface ProjectionInput {
  dateOfBirth: string
  retirementAge: Age
  aowAge: Age
  hasPartner: boolean
  partnerDateOfBirth?: string
  streams: FinancialStream[]
  expenseStreams: FinancialStream[]
  budgetedCosts: BudgetedCost[]
  /**
   * Net monthly pension amounts per period.
   * netBeforeAow: used from retirementAge up to (but not including) aowAge.
   * netAfterAow: used from aowAge onwards (includes AOW).
   * null = no pension income.
   */
  pensionAmounts: PensionPeriodAmount | null
  /** Periods during which savings are drawn to top up income to a target amount. */
  supplementPeriods?: SupplementPeriod[]
  endAge?: number
}

export function projectRetirementTimeline(input: ProjectionInput): MonthSnapshot[] {
  const {
    dateOfBirth,
    retirementAge,
    aowAge,
    streams,
    expenseStreams,
    budgetedCosts,
    pensionAmounts,
    supplementPeriods = [],
    endAge = 95,
  } = input

  const today = Temporal.Now.plainDateISO()
  const currentDate = Temporal.PlainDate.from({ year: today.year, month: today.month, day: 1 }).toString()
  const currentAgeMonths = ageToMonths(ageAtDate(dateOfBirth, currentDate))
  const endAgeMonths = endAge * 12
  const retirementAgeMonths = ageToMonths(retirementAge)
  const aowAgeMonths = ageToMonths(aowAge)

  const baselineExpense = expenseStreams.reduce(
    (sum, s) => sum + Math.abs(s.monthlyAmount), 0
  )

  let cumulativeSavings = streams
    .filter(s => s.type === 'savings' && s.lumpSum)
    .reduce((sum, s) => sum + (s.lumpSum ?? 0), 0)

  const timeline: MonthSnapshot[] = []

  for (let ageMonth = currentAgeMonths; ageMonth <= endAgeMonths; ageMonth++) {
    const age = monthsToAge(ageMonth)
    const date = addMonthsToDate(dateOfBirth, ageMonth)

    let totalIncome = 0
    let totalExpenses = baselineExpense

    for (const stream of streams) {
      if (stream.type === 'salary' && ageMonth < retirementAgeMonths) {
        totalIncome += stream.monthlyAmount
      }
      if (stream.type === 'savings' && stream.monthlyAmount > 0) {
        totalIncome += stream.monthlyAmount
      }
      if (stream.type === 'loan') {
        totalIncome += stream.monthlyAmount
      }
    }

    if (pensionAmounts && ageMonth >= retirementAgeMonths) {
      if (ageMonth < aowAgeMonths) {
        totalIncome += pensionAmounts.netBeforeAow
      } else {
        totalIncome += pensionAmounts.netAfterAow
      }
    }

    const currentPlain = Temporal.PlainDate.from(date)

    for (const cost of budgetedCosts) {
      const costPlain = Temporal.PlainDate.from(cost.date)

      if (cost.recurring === 'once') {
        if (costPlain.year === currentPlain.year && costPlain.month === currentPlain.month) {
          totalExpenses += cost.amount
        }
      } else if (cost.recurring === 'monthly') {
        if (Temporal.PlainDate.compare(currentPlain, costPlain) >= 0) {
          const endPlain = cost.endDate ? Temporal.PlainDate.from(cost.endDate) : null
          if (!endPlain || Temporal.PlainDate.compare(currentPlain, endPlain) <= 0) {
            totalExpenses += cost.amount
          }
        }
      } else if (cost.recurring === 'yearly') {
        if (Temporal.PlainDate.compare(currentPlain, costPlain) >= 0 && costPlain.month === currentPlain.month) {
          const endPlain = cost.endDate ? Temporal.PlainDate.from(cost.endDate) : null
          if (!endPlain || Temporal.PlainDate.compare(currentPlain, endPlain) <= 0) {
            totalExpenses += cost.amount
          }
        }
      }
    }

    const baseIncome = totalIncome

    // Apply supplement: draw from savings to top up income to targetIncome.
    // Only draw if cumulativeSavings > 0 before this month's supplement.
    let supplementDrawn = 0
    if (supplementPeriods.length > 0 && cumulativeSavings > 0) {
      const activePeriod = supplementPeriods.find(p => {
        const fromMonths = ageToMonths(p.fromAge)
        const toMonths = p.toAge ? ageToMonths(p.toAge) : Infinity
        return ageMonth >= fromMonths && ageMonth < toMonths
      })
      if (activePeriod) {
        supplementDrawn = Math.max(0, activePeriod.targetIncome - totalIncome)
        totalIncome += supplementDrawn
      }
    }

    const netCashflow = totalIncome - totalExpenses
    cumulativeSavings += netCashflow

    timeline.push({
      date,
      age,
      baseIncome,
      totalIncome,
      totalExpenses,
      netCashflow,
      cumulativeSavings,
      supplementDrawn,
    })
  }

  return timeline
}
