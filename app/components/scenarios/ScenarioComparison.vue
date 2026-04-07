<template>
  <div>
    <div v-if="scenarioStore.scenarios.length === 0" class="rounded-xl border border-dashed border-(--ui-border) py-16 text-center">
      <div class="flex size-14 mx-auto items-center justify-center rounded-xl bg-(--ui-bg-elevated) mb-3">
        <UIcon name="i-heroicons-scale" class="size-7 text-(--ui-text-dimmed)" />
      </div>
      <p class="text-sm font-medium text-(--ui-text-muted)">Gebruik de slider hierboven om scenario's toe te voegen.</p>
      <p class="text-xs text-(--ui-text-dimmed) mt-1">U kunt maximaal 4 scenario's vergelijken.</p>
    </div>

    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <ScenariosScenarioCard
        v-for="(scenario, idx) in scenarioStore.scenarios"
        :key="scenario.id"
        :scenario="scenario"
        :color="colors[idx % colors.length]"
        @remove="scenarioStore.removeScenario(scenario.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useScenarioStore } from '~/stores/scenarios'

const scenarioStore = useScenarioStore()
const colors = ['#6366f1', '#ef4444', '#22c55e', '#a855f7']
</script>
