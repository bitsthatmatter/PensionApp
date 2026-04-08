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

    <div class="space-y-3">
      <div v-for="metric in metrics" :key="metric.label" class="flex items-center justify-between gap-2">
        <span class="text-sm text-(--ui-text-muted)">{{ metric.label }}</span>
        <span class="font-mono text-sm font-semibold" :class="metric.class">{{ metric.value }}</span>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { RetirementScenario } from '~/domain/retirement-projection'
import type { Age } from '~/types/financial'

const props = defineProps<{
  scenario: RetirementScenario
  color: string
}>()

defineEmits<{ remove: [] }>()

const { formatCurrency, formatAge } = useFormatting()

const retirementSnapshot = computed(() => {
  const retAge = props.scenario.retirementAge
  return props.scenario.timeline.find(
    s => s.age.years === retAge.years && s.age.months === retAge.months
  ) ?? props.scenario.timeline[0]
})

const incomeAtRetirement = computed(() => retirementSnapshot.value?.totalIncome ?? 0)
const expensesAtRetirement = computed(() => retirementSnapshot.value?.totalExpenses ?? 0)
const netAtRetirement = computed(() => retirementSnapshot.value?.netCashflow ?? 0)

const savingsDepletedAge = computed<Age | null>(() => {
  const depleted = props.scenario.timeline.find(s => s.cumulativeSavings < 0)
  return depleted ? depleted.age : null
})

const metrics = computed(() => [
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
  {
    label: 'Spaargeld op',
    value: savingsDepletedAge.value ? formatAge(savingsDepletedAge.value) : 'Nooit (voldoende)',
    class: savingsDepletedAge.value ? 'text-red-500' : 'text-green-500',
  },
])
</script>
