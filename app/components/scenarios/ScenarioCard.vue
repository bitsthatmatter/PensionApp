<template>
  <UCard variant="outline">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="size-3 rounded-full" :style="{ backgroundColor: color }" />
          <h4 class="text-base font-semibold text-(--ui-text-highlighted)">{{ scenario.label }}</h4>
        </div>
        <button
          class="flex size-7 items-center justify-center rounded-md text-(--ui-text-dimmed) transition-colors hover:bg-(--ui-bg-elevated) hover:text-(--ui-text-highlighted)"
          @click="$emit('remove')"
        >
          <UIcon name="i-heroicons-x-mark" class="size-4" />
        </button>
      </div>
    </template>

    <div class="space-y-4">
      <!-- Key metrics -->
      <div v-for="metric in metrics" :key="metric.label" class="flex items-center justify-between gap-2">
        <span class="text-sm text-(--ui-text-muted)">{{ metric.label }}</span>
        <span class="font-mono text-sm font-semibold" :class="metric.class">{{ metric.value }}</span>
      </div>

      <!-- Savings depletion -->
      <div class="flex items-center justify-between gap-2 border-t border-(--ui-border) pt-3">
        <span class="text-sm text-(--ui-text-muted)">Spaargeld op</span>
        <span class="font-mono text-sm font-semibold" :class="savingsDepletedAge ? 'text-orange-500' : 'text-green-500'">
          {{ savingsDepletedAge ? formatAge(savingsDepletedAge) : 'Nooit (voldoende)' }}
        </span>
      </div>

      <!-- Supplement periods -->
      <div class="border-t border-(--ui-border) pt-3 space-y-3">
        <p class="text-xs font-semibold uppercase tracking-wider text-(--ui-text-dimmed)">Aanvulperiodes</p>

        <div
          v-for="(period, index) in localPeriods"
          :key="index"
          class="rounded-lg border border-(--ui-border) bg-(--ui-bg-elevated)/40 p-3 space-y-2"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-medium text-(--ui-text-muted)">Periode {{ index + 1 }}</span>
            <button
              class="flex size-6 items-center justify-center rounded text-(--ui-text-dimmed) hover:text-red-500 transition-colors"
              @click="removePeriod(index)"
            >
              <UIcon name="i-heroicons-trash" class="size-3.5" />
            </button>
          </div>

          <div class="grid grid-cols-2 gap-2 items-end">
            <div class="space-y-1">
              <label class="text-xs text-(--ui-text-dimmed)">Vanaf (jaar)</label>
              <input
                v-model.number="period.fromAge.years"
                type="number"
                :min="0"
                :max="120"
                class="w-full rounded border border-(--ui-border) bg-(--ui-bg) px-2 py-1 text-sm text-(--ui-text-highlighted) outline-none focus:border-(--ui-primary) [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                @change="onPeriodsChange"
              >
            </div>
            <div class="space-y-1">
              <label class="text-xs text-(--ui-text-dimmed)">Vanaf (mnd)</label>
              <input
                v-model.number="period.fromAge.months"
                type="number"
                :min="0"
                :max="11"
                class="w-full rounded border border-(--ui-border) bg-(--ui-bg) px-2 py-1 text-sm text-(--ui-text-highlighted) outline-none focus:border-(--ui-primary) [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                @change="onPeriodsChange"
              >
            </div>
            <div class="space-y-1">
              <label class="text-xs text-(--ui-text-dimmed)">Tot jaar <span class="text-(--ui-text-muted)">(leeg = open)</span></label>
              <input
                v-model.number="period._toYears"
                type="number"
                :min="0"
                :max="120"
                placeholder="—"
                class="w-full rounded border border-(--ui-border) bg-(--ui-bg) px-2 py-1 text-sm text-(--ui-text-highlighted) outline-none focus:border-(--ui-primary) [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                @change="onPeriodsChange"
              >
            </div>
            <div class="space-y-1">
              <label class="text-xs text-(--ui-text-dimmed)">Tot (mnd)</label>
              <input
                v-model.number="period._toMonths"
                type="number"
                :min="0"
                :max="11"
                placeholder="—"
                class="w-full rounded border border-(--ui-border) bg-(--ui-bg) px-2 py-1 text-sm text-(--ui-text-highlighted) outline-none focus:border-(--ui-primary) [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                @change="onPeriodsChange"
              >
            </div>
          </div>

          <div class="space-y-1">
            <label class="text-xs text-(--ui-text-dimmed)">Gewenst totaalinkomen (€/mnd)</label>
            <input
              v-model.number="period.targetIncome"
              type="number"
              :min="0"
              step="100"
              class="w-full rounded border border-(--ui-border) bg-(--ui-bg) px-2 py-1 text-sm text-(--ui-text-highlighted) outline-none focus:border-(--ui-primary) [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              @change="onPeriodsChange"
            >
          </div>

          <div class="flex items-center justify-between gap-2 rounded-md bg-(--ui-bg-elevated) px-2 py-1.5">
            <span class="text-xs text-(--ui-text-muted)">Benodigde spaarpot</span>
            <span class="font-mono text-xs font-semibold text-orange-500">
              {{ formatCurrency(periodSavingsNeeded[index] ?? 0) }}
            </span>
          </div>
        </div>

        <button
          class="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-(--ui-border) py-2 text-sm text-(--ui-text-muted) hover:border-(--ui-primary) hover:text-(--ui-primary) transition-colors"
          @click="addPeriod"
        >
          <UIcon name="i-heroicons-plus" class="size-4" />
          Periode toevoegen
        </button>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { RetirementScenario } from '~/domain/retirement-projection'
import type { SupplementPeriod } from '~/types/financial'
import { useScenarioStore } from '~/stores/scenarios'
import { useProfileStore } from '~/stores/profile'

const props = defineProps<{
  scenario: RetirementScenario
  color: string
}>()

defineEmits<{ remove: [] }>()

const scenarioStore = useScenarioStore()
const profileStore = useProfileStore()
const { formatCurrency, formatAge } = useFormatting()

// Local editable copy of periods with split toAge fields for easier binding
interface LocalPeriod {
  fromAge: { years: number; months: number }
  _toYears: number | null
  _toMonths: number | null
  targetIncome: number
}

function toLocal(periods: SupplementPeriod[]): LocalPeriod[] {
  return periods.map(p => ({
    fromAge: { years: p.fromAge.years, months: p.fromAge.months },
    _toYears: p.toAge?.years ?? null,
    _toMonths: p.toAge?.months ?? null,
    targetIncome: p.targetIncome,
  }))
}

function fromLocal(locals: LocalPeriod[]): SupplementPeriod[] {
  return locals.map(p => ({
    fromAge: { years: p.fromAge.years, months: p.fromAge.months },
    toAge: p._toYears != null ? { years: p._toYears, months: p._toMonths ?? 0 } : undefined,
    targetIncome: p.targetIncome,
  }))
}

const localPeriods = ref<LocalPeriod[]>(toLocal(props.scenario.supplementPeriods))

// Keep in sync if scenario changes externally
watch(() => props.scenario.supplementPeriods, (newPeriods) => {
  localPeriods.value = toLocal(newPeriods)
}, { deep: true })

function onPeriodsChange() {
  scenarioStore.updateSupplementPeriods(props.scenario.id, fromLocal(localPeriods.value))
}

function addPeriod() {
  localPeriods.value.push({
    fromAge: { years: props.scenario.retirementAge.years, months: props.scenario.retirementAge.months },
    _toYears: null,
    _toMonths: null,
    targetIncome: 0,
  })
  onPeriodsChange()
}

function removePeriod(index: number) {
  localPeriods.value.splice(index, 1)
  onPeriodsChange()
}

const retirementSnapshot = computed(() => {
  const retAge = props.scenario.retirementAge
  return props.scenario.timeline.find(
    s => s.age.years === retAge.years && s.age.months === retAge.months
  ) ?? props.scenario.timeline[0]
})

// Use baseIncome so supplement periods don't affect the displayed pension income
const incomeAtRetirement = computed(() => retirementSnapshot.value?.baseIncome ?? 0)
const expensesAtRetirement = computed(() => retirementSnapshot.value?.totalExpenses ?? 0)
const netAtRetirement = computed(() => {
  const snap = retirementSnapshot.value
  if (!snap) return 0
  return snap.baseIncome - snap.totalExpenses
})

// Snapshot at AOW age — only relevant when retirement is before AOW
const aowSnapshot = computed(() => {
  const aowAge = profileStore.profile.aowAge
  const retAge = props.scenario.retirementAge
  // No separate AOW snapshot needed when retiring at or after AOW age
  if (aowAge.years < retAge.years || (aowAge.years === retAge.years && aowAge.months <= retAge.months)) return null
  return props.scenario.timeline.find(
    s => s.age.years === aowAge.years && s.age.months === aowAge.months
  ) ?? null
})

const incomeAtAow = computed(() => aowSnapshot.value?.baseIncome ?? null)
const netAtAow = computed(() => {
  const snap = aowSnapshot.value
  if (!snap) return null
  return snap.baseIncome - snap.totalExpenses
})

const savingsDepletedAge = computed(() => {
  const snap = props.scenario.timeline.find(s => s.cumulativeSavings <= 0)
  return snap?.age ?? null
})

// Total savings drawn per supplement period (sum of supplementDrawn over the period's months)
const periodSavingsNeeded = computed(() => {
  return localPeriods.value.map((period) => {
    const fromMonths = period.fromAge.years * 12 + period.fromAge.months
    const toMonths = period._toYears != null
      ? period._toYears * 12 + (period._toMonths ?? 0)
      : Infinity
    return props.scenario.timeline
      .filter(s => {
        const m = s.age.years * 12 + s.age.months
        return m >= fromMonths && m < toMonths
      })
      .reduce((sum, s) => sum + s.supplementDrawn, 0)
  })
})

const metrics = computed(() => {
  const aowAge = profileStore.profile.aowAge
  const rows = [
    {
      label: 'Pensioenleeftijd',
      value: formatAge(props.scenario.retirementAge),
      class: 'text-(--ui-text-highlighted)',
    },
    {
      label: 'Inkomen bij pensioen',
      value: `${formatCurrency(incomeAtRetirement.value)} /mnd`,
      class: 'text-green-500',
    },
    {
      label: 'Uitgaven bij pensioen',
      value: `${formatCurrency(expensesAtRetirement.value)} /mnd`,
      class: 'text-red-500',
    },
    {
      label: 'Netto bij pensioen',
      value: `${formatCurrency(netAtRetirement.value)} /mnd`,
      class: netAtRetirement.value >= 0 ? 'text-green-500' : 'text-red-500',
    },
  ]

  if (incomeAtAow.value !== null) {
    rows.push(
      {
        label: `Inkomen vanaf ${formatAge(aowAge)} (met AOW)`,
        value: `${formatCurrency(incomeAtAow.value)} /mnd`,
        class: 'text-green-500',
      },
      {
        label: `Netto vanaf ${formatAge(aowAge)}`,
        value: `${formatCurrency(netAtAow.value!)} /mnd`,
        class: (netAtAow.value ?? 0) >= 0 ? 'text-green-500' : 'text-red-500',
      },
    )
  }

  return rows
})
</script>
