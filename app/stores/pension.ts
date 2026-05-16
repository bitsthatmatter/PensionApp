import { watch } from 'vue'
import { defineStore } from 'pinia'
import type { Age, PensionEmployer, PensionScenarioEntry } from '~/types/financial'

const STORAGE_KEY = 'retirement-planner-pension-v3'

const FIXED_AGES: Age[] = [
  { years: 62, months: 0 },
  { years: 63, months: 0 },
  { years: 64, months: 0 },
  { years: 65, months: 0 },
  { years: 67, months: 3 },
]

function newId(): string {
  return Math.random().toString(36).slice(2, 9)
}

function defaultEmployer(): PensionEmployer {
  return {
    id: newId(),
    label: 'Werkgever 1',
    amounts: { netBeforeAow: 0, netAfterAow: 0 },
  }
}

function sumAmounts(employers: PensionEmployer[]) {
  return employers.reduce(
    (acc, e) => ({
      netBeforeAow: acc.netBeforeAow + (e.amounts.netBeforeAow || 0),
      netAfterAow: acc.netAfterAow + (e.amounts.netAfterAow || 0),
    }),
    { netBeforeAow: 0, netAfterAow: 0 },
  )
}

function defaultEntries(): PensionScenarioEntry[] {
  return FIXED_AGES.map(age => {
    const employers = [defaultEmployer()]
    return {
      retirementAge: age,
      employers,
      amounts: sumAmounts(employers),
    }
  })
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
          entries.value = defaultEntries().map(entry => {
            const match = parsed.find(p => agesEqual(p.retirementAge, entry.retirementAge))
            if (!match) return entry
            // Support both old format (no employers) and new format
            const employers: PensionEmployer[] = Array.isArray(match.employers) && match.employers.length > 0
              ? match.employers
              : [{ id: newId(), label: 'Werkgever 1', amounts: match.amounts ?? { netBeforeAow: 0, netAfterAow: 0 } }]
            return { ...entry, employers, amounts: sumAmounts(employers) }
          })
        }
      } catch { /* ignore corrupt data */ }
    }
  }

  function save() {
    if (import.meta.server) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.value))
  }

  function getEntry(retirementAge: Age): PensionScenarioEntry | undefined {
    return entries.value.find(e => agesEqual(e.retirementAge, retirementAge))
  }

  function recompute(entry: PensionScenarioEntry) {
    entry.amounts = sumAmounts(entry.employers)
  }

  function addEmployer(retirementAge: Age) {
    const entry = getEntry(retirementAge)
    if (!entry) return
    const n = entry.employers.length + 1
    entry.employers.push({
      id: newId(),
      label: `Werkgever ${n}`,
      amounts: { netBeforeAow: 0, netAfterAow: 0 },
    })
    recompute(entry)
    save()
  }

  function removeEmployer(retirementAge: Age, employerId: string) {
    const entry = getEntry(retirementAge)
    if (!entry || entry.employers.length <= 1) return
    entry.employers = entry.employers.filter(e => e.id !== employerId)
    recompute(entry)
    save()
  }

  function updateEmployerLabel(retirementAge: Age, employerId: string, label: string) {
    const entry = getEntry(retirementAge)
    if (!entry) return
    const employer = entry.employers.find(e => e.id === employerId)
    if (!employer) return
    employer.label = label
    save()
  }

  function updateEmployerAmount(
    retirementAge: Age,
    employerId: string,
    field: 'netBeforeAow' | 'netAfterAow',
    value: number,
  ) {
    const entry = getEntry(retirementAge)
    if (!entry) return
    const employer = entry.employers.find(e => e.id === employerId)
    if (!employer) return
    employer.amounts[field] = value
    recompute(entry)
    save()
  }

  const filledCount = computed(() =>
    entries.value.filter(e => e.amounts.netBeforeAow > 0 || e.amounts.netAfterAow > 0).length,
  )

  load()

  watch(entries, save, { deep: true })

  return {
    entries,
    fixedAges: FIXED_AGES,
    filledCount,
    addEmployer,
    removeEmployer,
    updateEmployerLabel,
    updateEmployerAmount,
  }
})
