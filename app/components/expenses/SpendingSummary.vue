<template>
  <UCard variant="outline">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="flex size-9 items-center justify-center rounded-lg bg-(--ui-primary)/10">
          <UIcon name="i-heroicons-chart-bar-square" class="size-5 text-(--ui-primary)" />
        </div>
        <h3 class="text-base font-semibold text-(--ui-text-highlighted)">Uitgavenanalyse</h3>
      </div>
    </template>

    <div v-if="transactions.length === 0" class="py-12 text-center">
      <div class="flex size-14 mx-auto items-center justify-center rounded-xl bg-(--ui-bg-elevated) mb-3">
        <UIcon name="i-heroicons-cloud-arrow-up" class="size-7 text-(--ui-text-dimmed)" />
      </div>
      <p class="text-sm font-medium text-(--ui-text-muted)">Upload transacties om uw gemiddelde maandelijkse uitgaven te berekenen.</p>
    </div>

    <template v-else>
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div class="rounded-xl border border-(--ui-border) bg-(--ui-bg-elevated)/50 p-4">
          <p class="text-xs font-medium uppercase tracking-wider text-(--ui-text-dimmed)">Gem. uitgaven/mnd</p>
          <p class="mt-1 text-lg font-bold text-red-500">{{ formatCurrency(monthlyAvgExpenses) }}</p>
        </div>
        <div class="rounded-xl border border-(--ui-border) bg-(--ui-bg-elevated)/50 p-4">
          <p class="text-xs font-medium uppercase tracking-wider text-(--ui-text-dimmed)">Gem. inkomsten/mnd</p>
          <p class="mt-1 text-lg font-bold text-green-500">{{ formatCurrency(monthlyAvgIncome) }}</p>
        </div>
        <div class="rounded-xl border border-(--ui-border) bg-(--ui-bg-elevated)/50 p-4">
          <p class="text-xs font-medium uppercase tracking-wider text-(--ui-text-dimmed)">Netto/mnd</p>
          <p class="mt-1 text-lg font-bold" :class="monthlyNet >= 0 ? 'text-green-500' : 'text-red-500'">
            {{ formatCurrency(monthlyNet) }}
          </p>
        </div>
        <div class="rounded-xl border border-(--ui-border) bg-(--ui-bg-elevated)/50 p-4">
          <p class="text-xs font-medium uppercase tracking-wider text-(--ui-text-dimmed)">Periode</p>
          <p class="mt-1 text-lg font-bold text-(--ui-text-highlighted)">{{ monthsCovered }} maanden</p>
        </div>
      </div>

      <div class="mt-5 flex items-center gap-3">
        <UCheckbox v-model="useManualBaseline" label="Handmatig maandelijks uitgavenbedrag instellen" />
        <UInput
          v-if="useManualBaseline"
          v-model.number="manualBaseline"
          type="number"
          step="0.01"
          icon="i-heroicons-currency-euro"
          class="w-36"
        />
      </div>
    </template>
  </UCard>
</template>

<script setup lang="ts">
import { Temporal } from 'temporal-polyfill'
import { useFinancialStore } from '~/stores/financial'

const { transactions } = useTransactions()
const { formatCurrency } = useFormatting()
const financialStore = useFinancialStore()

// Restore manual baseline state from the persisted store value on mount.
// If a baseline was saved, re-enable the manual toggle and show the saved value.
const persistedBaseline = financialStore.monthlyExpenseBaseline
const useManualBaseline = ref(persistedBaseline !== null)
const manualBaseline = ref(persistedBaseline ?? 0)

const monthsCovered = computed(() => {
  if (transactions.value.length === 0) return 0
  const dates = transactions.value.map(t => t.transactionDate).sort()
  const first = Temporal.PlainDate.from(dates[0])
  const last = Temporal.PlainDate.from(dates[dates.length - 1])
  const dur = first.until(last, { largestUnit: 'months' })
  const months = dur.years * 12 + dur.months
  return Math.max(months, 1)
})

const monthlyAvgExpenses = computed(() => {
  if (transactions.value.length === 0) return 0
  const totalExpenses = transactions.value
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
  return totalExpenses / Math.max(monthsCovered.value, 1)
})

const monthlyAvgIncome = computed(() => {
  if (transactions.value.length === 0) return 0
  const totalIncome = transactions.value
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0)
  return totalIncome / Math.max(monthsCovered.value, 1)
})

const monthlyNet = computed(() => monthlyAvgIncome.value - monthlyAvgExpenses.value)

const effectiveMonthlyExpenses = computed(() => {
  if (useManualBaseline.value) return manualBaseline.value
  return monthlyAvgExpenses.value
})

// Clear persisted baseline when the manual toggle is turned off
watch(useManualBaseline, (enabled) => {
  if (!enabled) financialStore.setMonthlyExpenseBaseline(null)
})

// Keep the store in sync so the projection engine picks up the baseline.
// When manual override is active, persist the value regardless of whether
// transactions are loaded (transactions are session-only; the manual value is not).
watch(
  effectiveMonthlyExpenses,
  (value) => {
    if (useManualBaseline.value) {
      financialStore.setMonthlyExpenseBaseline(value)
    } else {
      financialStore.setMonthlyExpenseBaseline(transactions.value.length > 0 ? value : null)
    }
  },
  { immediate: true },
)
</script>
