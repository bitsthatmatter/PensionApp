import { defineStore } from 'pinia'
import type { Age, FinancialStream, BudgetedCost, MonthSnapshot, RetirementScenario } from '~/types/financial'
import { useProfileStore } from './profile'
import { useFinancialStore } from './financial'
import { usePensionStore } from './pension'

function ageToMonths(age: Age): number {
  return age.years * 12 + age.months
}

function monthsToAge(totalMonths: number): Age {
  return { years: Math.floor(totalMonths / 12), months: totalMonths % 12 }
}

function addMonthsToDate(isoDate: string, months: number): string {
  const d = new Date(isoDate)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 9)
}

export const useScenarioStore = defineStore('scenarios', () => {
  const scenarios = ref<RetirementScenario[]>([])
  const profileStore = useProfileStore()
  const financialStore = useFinancialStore()
  const pensionStore = usePensionStore()

  function projectScenario(retirementAge: Age, endAge: number = 95): MonthSnapshot[] {
    const dob = profileStore.profile.dateOfBirth
    if (!dob) return []

    const now = new Date()
    const currentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const currentAgeMonths = ageToMonths(profileStore.ageAtDate(dob, currentDate))
    const endAgeMonths = endAge * 12
    const retirementAgeMonths = ageToMonths(retirementAge)
    const aowAgeMonths = ageToMonths(profileStore.profile.aowAge)

    // Get pension data for income calculation
    const pension = pensionStore.pensionData
    const isCohabiting = profileStore.profile.hasPartner

    // Find monthly baseline expense from expense-type streams
    const baselineExpense = financialStore.expenseStreams.reduce(
      (sum, s) => sum + Math.abs(s.monthlyAmount), 0
    )

    // Starting savings from savings-type streams
    let cumulativeSavings = financialStore.streams
      .filter(s => s.type === 'savings' && s.lumpSum)
      .reduce((sum, s) => sum + (s.lumpSum ?? 0), 0)

    const timeline: MonthSnapshot[] = []

    for (let ageMonth = currentAgeMonths; ageMonth <= endAgeMonths; ageMonth++) {
      const age = monthsToAge(ageMonth)
      const date = addMonthsToDate(dob, ageMonth)

      let totalIncome = 0
      let totalExpenses = baselineExpense

      // Salary: active until retirement
      for (const stream of financialStore.streams) {
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

      // Pension income: active from retirement age
      if (pension && ageMonth >= retirementAgeMonths) {
        // Find the matching pension period based on age
        const matchingPeriod = pension.ouderdomsPensioen.find(p => {
          const fromMonths = ageToMonths(p.fromAge)
          const toMonths = p.toAge ? ageToMonths(p.toAge) : Infinity
          return ageMonth >= fromMonths && ageMonth < toMonths
        })

        if (matchingPeriod) {
          totalIncome += (matchingPeriod.pension + (matchingPeriod.indicatiefPensioen ?? 0)) / 12
        }
      }

      // AOW: active from AOW age
      if (pension && ageMonth >= aowAgeMonths) {
        const aowAnnual = isCohabiting ? pension.aow.samenwonend : pension.aow.alleenstaand
        totalIncome += aowAnnual / 12
      }

      // Partner AOW (if partner has reached AOW age)
      if (isCohabiting && profileStore.profile.partnerDateOfBirth && ageMonth >= aowAgeMonths) {
        const partnerAge = profileStore.ageAtDate(
          profileStore.profile.partnerDateOfBirth,
          date
        )
        const partnerAgeMonths = ageToMonths(partnerAge)
        if (partnerAgeMonths >= aowAgeMonths && pension) {
          totalIncome += pension.aow.samenwonend / 12
        }
      }

      // Budgeted costs
      for (const cost of financialStore.budgetedCosts) {
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

  function addScenario(retirementAge: Age) {
    const label = `Pensioen bij ${retirementAge.years}${retirementAge.months > 0 ? ` jaar en ${retirementAge.months} mnd` : ' jaar'}`
    const timeline = projectScenario(retirementAge)
    scenarios.value.push({
      id: generateId(),
      label,
      retirementAge,
      timeline,
    })
  }

  function removeScenario(id: string) {
    scenarios.value = scenarios.value.filter(s => s.id !== id)
  }

  function refreshScenarios() {
    for (const scenario of scenarios.value) {
      scenario.timeline = projectScenario(scenario.retirementAge)
    }
  }

  function clearScenarios() {
    scenarios.value = []
  }

  return {
    scenarios,
    projectScenario,
    addScenario,
    removeScenario,
    refreshScenarios,
    clearScenarios,
  }
})
