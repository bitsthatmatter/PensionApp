<template>
  <UCard variant="outline">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="flex size-9 items-center justify-center rounded-lg bg-(--ui-primary)/10">
          <UIcon name="i-heroicons-adjustments-horizontal" class="size-5 text-(--ui-primary)" />
        </div>
        <div>
          <h3 class="text-base font-semibold text-(--ui-text-highlighted)">Pensioenleeftijd kiezen</h3>
          <p class="text-sm text-(--ui-text-muted)">Sleep de slider om een pensioenleeftijd te selecteren</p>
        </div>
      </div>
    </template>

    <div class="space-y-5">
      <div class="flex items-center gap-6">
        <div class="flex-1 space-y-2">
          <USlider
            v-model="selectedMonths"
            :min="minMonths"
            :max="maxMonths"
            :step="3"
            color="primary"
            size="lg"
          />
          <div class="flex items-center justify-between text-xs font-medium text-(--ui-text-dimmed)">
            <span>55 jaar</span>
            <span>70 jaar</span>
          </div>
        </div>
        <div class="min-w-[160px] rounded-xl border border-(--ui-primary)/30 bg-(--ui-primary)/5 px-5 py-3 text-center">
          <p class="text-xs font-medium uppercase tracking-wider text-(--ui-text-dimmed)">Pensioenleeftijd</p>
          <p class="mt-0.5 text-xl font-bold text-(--ui-primary)">{{ formatAge(selectedAge) }}</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <button
          class="inline-flex items-center gap-3 rounded-lg bg-(--ui-primary) px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:opacity-90 active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="scenarioStore.scenarios.length >= 4 || !profileStore.profile.dateOfBirth"
          @click="addScenario"
        >
          <UIcon name="i-heroicons-plus" class="size-5" />
          Scenario toevoegen voor {{ formatAge(selectedAge) }}
        </button>
        <UBadge v-if="scenarioStore.scenarios.length >= 4" color="warning" variant="subtle">
          Maximaal 4 scenario's
        </UBadge>
      </div>

      <UAlert
        v-if="!profileStore.profile.dateOfBirth"
        color="warning"
        variant="subtle"
        icon="i-heroicons-exclamation-triangle"
        title="Stel eerst uw geboortedatum in bij het Dashboard."
      />
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { Age } from '~/types/financial'
import { useScenarioStore } from '~/stores/scenarios'
import { useProfileStore } from '~/stores/profile'

const scenarioStore = useScenarioStore()
const profileStore = useProfileStore()
const { formatAge } = useFormatting()

const minMonths = 55 * 12
const maxMonths = 70 * 12
const selectedMonths = ref(62 * 12)

const selectedAge = computed<Age>(() => ({
  years: Math.floor(selectedMonths.value / 12),
  months: selectedMonths.value % 12,
}))

function addScenario() {
  scenarioStore.addScenario(selectedAge.value)
}
</script>
