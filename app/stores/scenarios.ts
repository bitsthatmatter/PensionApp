import { defineStore } from 'pinia'
import type { Age, SupplementPeriod } from '~/types/financial'
import type { RetirementScenario } from '~/domain/retirement-projection'
import { projectRetirementTimeline } from '~/domain/retirement-projection'
import { ageToMonths } from '~/domain/age'
import { useProfileStore } from './profile'
import { useFinancialStore } from './financial'
import { usePensionStore } from './pension'

const SUPPLEMENT_PERIODS_KEY = 'retirement-planner-supplement-periods'

function generateId(): string {
  return Math.random().toString(36).slice(2, 9)
}

function agesEqual(a: Age, b: Age): boolean {
  return a.years === b.years && a.months === b.months
}

function ageKey(age: Age): string {
  return `${age.years}-${age.months}`
}

export const useScenarioStore = defineStore('scenarios', () => {
  const scenarios = ref<RetirementScenario[]>([])
  // Persisted map of ageKey → SupplementPeriod[]. Survives page reloads.
  const savedPeriods = ref<Record<string, SupplementPeriod[]>>({})
  const profileStore = useProfileStore()
  const financialStore = useFinancialStore()
  const pensionStore = usePensionStore()

  function loadSavedPeriods() {
    if (import.meta.server) return
    const raw = localStorage.getItem(SUPPLEMENT_PERIODS_KEY)
    if (raw) {
      try { savedPeriods.value = JSON.parse(raw) } catch { /* ignore corrupt data */ }
    }
  }

  function savePeriods() {
    if (import.meta.server) return
    localStorage.setItem(SUPPLEMENT_PERIODS_KEY, JSON.stringify(savedPeriods.value))
  }

  loadSavedPeriods()

  function projectScenario(
    retirementAge: Age,
    pensionAmounts: Parameters<typeof projectRetirementTimeline>[0]['pensionAmounts'],
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
      pensionAmounts,
      supplementPeriods,
    })
  }

  function buildLabel(retirementAge: Age): string {
    return `Pensioen bij ${retirementAge.years}${retirementAge.months > 0 ? ` jaar en ${retirementAge.months} mnd` : ' jaar'}`
  }

  // Sync scenarios with pension entries.
  // - Entries with both amounts = 0 are skipped (no scenario generated).
  // - Existing scenarios preserve their supplementPeriods.
  // - Scenarios for removed/zeroed entries are removed.
  watch(
    () => pensionStore.entries,
    (entries) => {
      const newScenarios: RetirementScenario[] = []

      for (const entry of entries) {
        const { netBeforeAow, netAfterAow } = entry.amounts
        if (netBeforeAow === 0 && netAfterAow === 0) continue

        const retirementAge = entry.retirementAge

        // Restore persisted supplementPeriods, falling back to in-memory if already loaded
        const existing = scenarios.value.find(s => agesEqual(s.retirementAge, retirementAge))
        const supplementPeriods = savedPeriods.value[ageKey(retirementAge)] ?? existing?.supplementPeriods ?? []

        const timeline = projectScenario(retirementAge, entry.amounts, supplementPeriods)

        newScenarios.push({
          id: existing?.id ?? generateId(),
          label: buildLabel(retirementAge),
          retirementAge,
          timeline,
          supplementPeriods,
        })
      }

      // Sort by retirement age ascending
      newScenarios.sort((a, b) => ageToMonths(a.retirementAge) - ageToMonths(b.retirementAge))
      scenarios.value = newScenarios
    },
    { deep: true, immediate: true },
  )

  function removeScenario(id: string) {
    scenarios.value = scenarios.value.filter(s => s.id !== id)
  }

  function updateSupplementPeriods(id: string, periods: SupplementPeriod[]) {
    const scenario = scenarios.value.find(s => s.id === id)
    if (!scenario) return

    scenario.supplementPeriods = periods

    // Persist so periods survive page reloads
    savedPeriods.value[ageKey(scenario.retirementAge)] = periods
    savePeriods()

    // Find the matching entry for this scenario
    const entry = pensionStore.entries.find(e => agesEqual(e.retirementAge, scenario.retirementAge))
    const pensionAmounts = entry?.amounts ?? null

    scenario.timeline = projectScenario(scenario.retirementAge, pensionAmounts, periods)
  }

  return {
    scenarios,
    removeScenario,
    updateSupplementPeriods,
  }
})
