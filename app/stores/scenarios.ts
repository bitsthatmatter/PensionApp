import { defineStore } from 'pinia'
import type { Age, SupplementPeriod } from '~/types/financial'
import type { RetirementScenario } from '~/domain/retirement-projection'
import { projectRetirementTimeline } from '~/domain/retirement-projection'
import { deriveIngangsdatum } from '~/domain/pension-overview'
import { ageToMonths } from '~/domain/age'
import { useProfileStore } from './profile'
import { useFinancialStore } from './financial'
import { usePensionStore } from './pension'

function generateId(): string {
  return Math.random().toString(36).slice(2, 9)
}

function agesEqual(a: Age, b: Age): boolean {
  return a.years === b.years && a.months === b.months
}

export const useScenarioStore = defineStore('scenarios', () => {
  const scenarios = ref<RetirementScenario[]>([])
  const profileStore = useProfileStore()
  const financialStore = useFinancialStore()
  const pensionStore = usePensionStore()

  function projectScenario(
    retirementAge: Age,
    pensionData: RetirementScenario['timeline'] extends never ? never : Parameters<typeof projectRetirementTimeline>[0]['pensionData'],
    partnerPensionData: Parameters<typeof projectRetirementTimeline>[0]['partnerPensionData'],
    supplementPeriods: SupplementPeriod[],
  ): RetirementScenario['timeline'] {
    const dob = profileStore.profile.dateOfBirth
    if (!dob) return []

    const baseline = financialStore.monthlyExpenseBaseline
    const baselineStream = baseline !== null
      ? [{ id: '__baseline__', type: 'expense' as const, label: 'Maandelijkse uitgaven (analyse)', monthlyAmount: baseline }]
      : []

    return projectRetirementTimeline({
      dateOfBirth: dob,
      retirementAge,
      aowAge: profileStore.profile.aowAge,
      hasPartner: profileStore.profile.hasPartner,
      partnerDateOfBirth: profileStore.profile.partnerDateOfBirth,
      streams: financialStore.streams,
      expenseStreams: [...financialStore.expenseStreams, ...baselineStream],
      budgetedCosts: financialStore.budgetedCosts,
      pensionData,
      partnerPensionData,
      supplementPeriods,
    })
  }

  function buildLabel(retirementAge: Age): string {
    return `Pensioen bij ${retirementAge.years}${retirementAge.months > 0 ? ` jaar en ${retirementAge.months} mnd` : ' jaar'}`
  }

  // Sync scenarios with the pension overviews list.
  // - Add a new scenario for each new overview.
  // - Update the timeline of existing scenarios (preserving supplementPeriods).
  // - Remove scenarios whose overview was deleted.
  watch(
    () => pensionStore.pensionData,
    (overviews) => {
      const newScenarios: RetirementScenario[] = []

      for (const overzicht of overviews) {
        let ingangsdatum: Age
        try {
          ingangsdatum = deriveIngangsdatum(overzicht)
        } catch {
          continue
        }

        // Find matching partner overview (same ingangsdatum)
        const partnerOverzicht = pensionStore.partnerPensionData.find(p => {
          try {
            return agesEqual(deriveIngangsdatum(p), ingangsdatum)
          } catch {
            return false
          }
        }) ?? null

        // Preserve existing scenario's supplementPeriods if it exists
        const existing = scenarios.value.find(s => agesEqual(s.retirementAge, ingangsdatum))
        const supplementPeriods = existing?.supplementPeriods ?? []

        const timeline = projectScenario(ingangsdatum, overzicht, partnerOverzicht, supplementPeriods)

        newScenarios.push({
          id: existing?.id ?? generateId(),
          label: buildLabel(ingangsdatum),
          retirementAge: ingangsdatum,
          timeline,
          supplementPeriods,
        })
      }

      // Sort by retirement age ascending
      newScenarios.sort((a, b) => ageToMonths(a.retirementAge) - ageToMonths(b.retirementAge))
      scenarios.value = newScenarios
    },
    { deep: true },
  )

  function removeScenario(id: string) {
    scenarios.value = scenarios.value.filter(s => s.id !== id)
  }

  function updateSupplementPeriods(id: string, periods: SupplementPeriod[]) {
    const scenario = scenarios.value.find(s => s.id === id)
    if (!scenario) return

    scenario.supplementPeriods = periods

    // Find the matching overview for this scenario
    const overzicht = pensionStore.pensionData.find(o => {
      try {
        return agesEqual(deriveIngangsdatum(o), scenario.retirementAge)
      } catch {
        return false
      }
    }) ?? null

    const partnerOverzicht = pensionStore.partnerPensionData.find(p => {
      try {
        return agesEqual(deriveIngangsdatum(p), scenario.retirementAge)
      } catch {
        return false
      }
    }) ?? null

    scenario.timeline = projectScenario(scenario.retirementAge, overzicht, partnerOverzicht, periods)
  }

  return {
    scenarios,
    removeScenario,
    updateSupplementPeriods,
  }
})
