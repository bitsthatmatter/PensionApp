import { defineStore } from 'pinia'
import type { Age } from '~/types/financial'
import type { RetirementScenario } from '~/domain/retirement-projection'
import { projectRetirementTimeline } from '~/domain/retirement-projection'
import { useProfileStore } from './profile'
import { useFinancialStore } from './financial'
import { usePensionStore } from './pension'

function generateId(): string {
  return Math.random().toString(36).slice(2, 9)
}

export const useScenarioStore = defineStore('scenarios', () => {
  const scenarios = ref<RetirementScenario[]>([])
  const profileStore = useProfileStore()
  const financialStore = useFinancialStore()
  const pensionStore = usePensionStore()

  function projectScenario(retirementAge: Age, endAge?: number): RetirementScenario['timeline'] {
    const dob = profileStore.profile.dateOfBirth
    if (!dob) return []

    return projectRetirementTimeline({
      dateOfBirth: dob,
      retirementAge,
      aowAge: profileStore.profile.aowAge,
      hasPartner: profileStore.profile.hasPartner,
      partnerDateOfBirth: profileStore.profile.partnerDateOfBirth,
      streams: financialStore.streams,
      expenseStreams: financialStore.expenseStreams,
      budgetedCosts: financialStore.budgetedCosts,
      pensionData: pensionStore.pensionData,
      endAge,
    })
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
