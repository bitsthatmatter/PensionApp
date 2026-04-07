<template>
  <div class="min-h-[calc(100vh-4rem)]">
    <!-- Hero section -->
    <div class="relative overflow-hidden border-b border-(--ui-border) bg-gradient-to-br from-(--ui-primary)/5 via-(--ui-bg) to-(--ui-primary)/3">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--ui-primary)/8,transparent)]" />
      <div class="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div class="max-w-2xl">
          <h1 class="text-3xl font-bold tracking-tight text-(--ui-text-highlighted) sm:text-4xl">Scenario's vergelijken</h1>
          <p class="mt-2 text-lg text-(--ui-text-muted)">Vergelijk verschillende pensioenleeftijden en ontdek wat het beste bij u past.</p>
        </div>
      </div>
    </div>

    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <ScenariosScenarioSelector />
      <ScenariosScenarioComparison />
      <ScenariosTimelineChart
        v-if="scenarioStore.scenarios.length > 0"
        :scenarios="scenarioStore.scenarios"
      />

      <div v-if="scenarioStore.scenarios.length > 1" class="flex gap-3">
        <button
          class="inline-flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-500 transition-colors hover:bg-red-500/20"
          @click="scenarioStore.clearScenarios()"
        >
          <UIcon name="i-heroicons-trash" class="size-4" />
          Alle scenario's wissen
        </button>
        <button
          class="inline-flex items-center gap-2 rounded-lg bg-(--ui-primary)/10 px-4 py-2.5 text-sm font-semibold text-(--ui-primary) transition-colors hover:bg-(--ui-primary)/20"
          @click="scenarioStore.refreshScenarios()"
        >
          <UIcon name="i-heroicons-arrow-path" class="size-4" />
          Herberekenen
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useScenarioStore } from '~/stores/scenarios'

const scenarioStore = useScenarioStore()
</script>
