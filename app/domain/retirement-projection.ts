import type { Age, FinancialStream, BudgetedCost, PensionOverview } from '~/types/financial'
import { ageToMonths, monthsToAge, addMonthsToDate, ageAtDate } from '~/domain/age'

export interface MonthSnapshot {
  date: string
  age: Age
  totalIncome: number
  totalExpenses: number
  netCashflow: number
  cumulativeSavings: number
}

export interface RetirementScenario {
  id: string
  label: string
  retirementAge: Age
  timeline: MonthSnapshot[]
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
  pensionData: PensionOverview | null
  endAge?: number
}

export function projectRetirementTimeline(input: ProjectionInput): MonthSnapshot[] {
  const {
    dateOfBirth,
    retirementAge,
    aowAge,
    hasPartner,
    partnerDateOfBirth,
    streams,
    expenseStreams,
    budgetedCosts,
    pensionData,
    endAge = 95,
  } = input

  const now = new Date()
  const currentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
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
      const matchingPeriod = pensionData.ouderdomsPensioen.find(p => {
        const fromMonths = ageToMonths(p.fromAge)
        const toMonths = p.toAge ? ageToMonths(p.toAge) : Infinity
        return ageMonth >= fromMonths && ageMonth < toMonths
      })

      if (matchingPeriod) {
        totalIncome += (matchingPeriod.pension + (matchingPeriod.indicatiefPensioen ?? 0)) / 12
      }
    }

    if (pensionData && ageMonth >= aowAgeMonths) {
      const aowAnnual = hasPartner ? pensionData.aow.samenwonend : pensionData.aow.alleenstaand
      totalIncome += aowAnnual / 12
    }

    if (hasPartner && partnerDateOfBirth && ageMonth >= aowAgeMonths) {
      const partnerAge = ageAtDate(partnerDateOfBirth, date)
      const partnerAgeMonths = ageToMonths(partnerAge)
      if (partnerAgeMonths >= aowAgeMonths && pensionData) {
        totalIncome += pensionData.aow.samenwonend / 12
      }
    }

    for (const cost of budgetedCosts) {
      const costDate = new Date(cost.date)
      const currentMonth = new Date(date)

      if (cost.recurring === 'once') {
        if (costDate.getFullYear() === currentMonth.getFullYear() &&
            costDate.getMonth() === currentMonth.getMonth()) {
          totalExpenses += cost.amount
        }
      } else if (cost.recurring === 'monthly') {
        if (currentMonth >= costDate) {
          const endDate = cost.endDate ? new Date(cost.endDate) : null
          if (!endDate || currentMonth <= endDate) {
            totalExpenses += cost.amount
          }
        }
      } else if (cost.recurring === 'yearly') {
        if (currentMonth >= costDate && costDate.getMonth() === currentMonth.getMonth()) {
          const endDate = cost.endDate ? new Date(cost.endDate) : null
          if (!endDate || currentMonth <= endDate) {
            totalExpenses += cost.amount
          }
        }
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
