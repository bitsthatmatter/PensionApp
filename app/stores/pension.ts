import { defineStore } from 'pinia'
import type { Age, PensionScenarioEntry } from '~/types/financial'

const STORAGE_KEY = 'retirement-planner-pension-v2'

const FIXED_AGES: Age[] = [
  { years: 62, months: 0 },
  { years: 63, months: 0 },
  { years: 64, months: 0 },
  { years: 65, months: 0 },
  { years: 67, months: 3 },
]

function defaultEntries(): PensionScenarioEntry[] {
  return FIXED_AGES.map(age => ({
    retirementAge: age,
    amounts: { netBeforeAow: 0, netAfterAow: 0 },
  }))
}

function agesEqual(a: Age, b: Age): boolean {
  return a.years === b.years && a.months === b.months
}

export const usePensionStore = defineStore('pension', () => {
  const entries = ref<PensionScenarioEntry[]>(defaultEntries())

  function load() {
    if (import.meta.server) return
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as PensionScenarioEntry[]
        if (Array.isArray(parsed)) {
          // Merge saved amounts into the fixed entries (preserves order, adds new ages)
          entries.value = defaultEntries().map((entry) => {
            const match = parsed.find(p => agesEqual(p.retirementAge, entry.retirementAge))
            return match ? { ...entry, amounts: match.amounts } : entry
          })
        }
      } catch { /* ignore corrupt data */ }
    }
  }

  function save() {
    if (import.meta.server) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.value))
  }

  function updateAmount(
    retirementAge: Age,
    field: 'netBeforeAow' | 'netAfterAow',
    value: number,
  ) {
    const entry = entries.value.find(e => agesEqual(e.retirementAge, retirementAge))
    if (!entry) return
    entry.amounts[field] = value
    save()
  }

  const filledCount = computed(() =>
    entries.value.filter(e => e.amounts.netBeforeAow > 0 || e.amounts.netAfterAow > 0).length
  )

  load()

  return {
    entries,
    fixedAges: FIXED_AGES,
    filledCount,
    updateAmount,
  }
})
