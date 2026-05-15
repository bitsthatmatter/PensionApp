import { Temporal } from 'temporal-polyfill'
import type { Age, FinancialStream, BudgetedCost, SupplementPeriod } from '~/types/financial'
import type { Pensioenoverzicht } from '~/types/pensioenoverzicht'
import { isLeeftijdsGrens } from '~/types/pensioenoverzicht'
import { ageToMonths, monthsToAge, addMonthsToDate, ageAtDate } from '~/domain/age'

/** All monetary fields are in euros (floating-point). */
export interface MonthSnapshot {
  date: string
  age: Age
  /** Gross monthly income (€). */
  totalIncome: number
  /** Total monthly expenses (€). */
  totalExpenses: number
  /** totalIncome − totalExpenses (€). */
  netCashflow: number
  /** Running sum of netCashflow from projection start (€). */
  cumulativeSavings: number
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
  /** Reserved for future partner-specific projection logic. Not used in the current cashflow model. */
  partnerDateOfBirth?: string
  streams: FinancialStream[]
  expenseStreams: FinancialStream[]
  budgetedCosts: BudgetedCost[]
  pensionData: Pensioenoverzicht | null
  /** Partner pension data. Reserved for future use — not yet used in cashflow. */
  partnerPensionData?: Pensioenoverzicht | null
  /** Periods during which savings are drawn to top up income to a target amount. */
  supplementPeriods?: SupplementPeriod[]
  endAge?: number
}

export function projectRetirementTimeline(input: ProjectionInput): MonthSnapshot[] {
  const {
    dateOfBirth,
    retirementAge,
    aowAge,
    hasPartner,
    streams,
    expenseStreams,
    budgetedCosts,
    pensionData,
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

    if (pensionData && ageMonth >= retirementAgeMonths) {
      const totaalRegels = pensionData.Totalen.OuderdomsPensioenTotalen.OuderdomsPensioenTotaal
      const matchingPeriod = totaalRegels.find(p => {
        if (!isLeeftijdsGrens(p.Van)) return false
        const fromMonths = ageToMonths({ years: p.Van.Leeftijd.Jaren, months: p.Van.Leeftijd.Maanden })
        const toMonths = isLeeftijdsGrens(p.Tot)
          ? ageToMonths({ years: p.Tot.Leeftijd.Jaren, months: p.Tot.Leeftijd.Maanden })
          : Infinity
        return ageMonth >= fromMonths && ageMonth < toMonths
      })

      if (matchingPeriod) {
        totalIncome += ((matchingPeriod.Pensioen ?? 0) + (matchingPeriod.IndicatiefPensioen ?? 0)) / 12
      }
    }

    if (pensionData && ageMonth >= aowAgeMonths) {
      // samenwonend is the per-person AOW rate for cohabitants; alleenstaand for singles.
      // The partner's own AOW entitlement is not added here — this projection models
      // the primary person's individual cashflow only.
      const totaalRegels = pensionData.Totalen.OuderdomsPensioenTotalen.OuderdomsPensioenTotaal
      const aowPeriod = totaalRegels.find(p => {
        if (p.AOWSamenwonend == null) return false
        if (!isLeeftijdsGrens(p.Van)) return false
        const fromMonths = ageToMonths({ years: p.Van.Leeftijd.Jaren, months: p.Van.Leeftijd.Maanden })
        const toMonths = isLeeftijdsGrens(p.Tot)
          ? ageToMonths({ years: p.Tot.Leeftijd.Jaren, months: p.Tot.Leeftijd.Maanden })
          : Infinity
        return ageMonth >= fromMonths && ageMonth < toMonths
      })
      const aowAnnual = hasPartner
        ? (aowPeriod?.AOWSamenwonend ?? 0)
        : (aowPeriod?.AOWAlleenstaand ?? 0)
      totalIncome += aowAnnual / 12
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

    // Apply supplement: draw from savings to top up income to targetIncome.
    // Only draw if cumulativeSavings > 0 before this month's supplement.
    if (supplementPeriods.length > 0 && cumulativeSavings > 0) {
      const activePeriod = supplementPeriods.find(p => {
        const fromMonths = ageToMonths(p.fromAge)
        const toMonths = p.toAge ? ageToMonths(p.toAge) : Infinity
        return ageMonth >= fromMonths && ageMonth < toMonths
      })
      if (activePeriod) {
        const supplement = Math.max(0, activePeriod.targetIncome - totalIncome)
        totalIncome += supplement
      }
    }

    const netCashflow = totalIncome - totalExpenses
    cumulativeSavings += netCashflow

    timeline.push({
      date,
      age,
      totalIncome,
      totalExpenses,
      netCashflow,
      cumulativeSavings,
    })
  }

  return timeline
}
