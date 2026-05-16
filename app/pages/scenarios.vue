<template>
  <div class="min-h-[calc(100vh-4rem)]">
    <!-- Hero section -->
    <div class="relative overflow-hidden border-b border-(--ui-border) bg-gradient-to-br from-(--ui-primary)/5 via-(--ui-bg) to-(--ui-primary)/3">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--ui-primary)/8,transparent)]" />
      <div class="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div class="max-w-2xl">
          <h1 class="text-3xl font-black tracking-tight text-(--ui-text-highlighted) sm:text-4xl">Scenario's vergelijken</h1>
          <p class="mt-2 text-lg text-(--ui-text-muted)">Vergelijk verschillende pensioenleeftijden en ontdek wat het beste bij u past.</p>
        </div>
      </div>
    </div>

    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <!-- Empty state -->
      <div v-if="scenarioStore.scenarios.length === 0" class="flex flex-col items-center justify-center rounded-xl border border-dashed border-(--ui-border) py-16 text-center">
        <div class="flex size-14 items-center justify-center rounded-full bg-(--ui-bg-elevated)">
          <UIcon name="i-heroicons-pencil-square" class="size-7 text-(--ui-text-dimmed)" />
        </div>
        <h3 class="mt-4 text-base font-semibold text-(--ui-text-highlighted)">Geen scenario's beschikbaar</h3>
        <p class="mt-1 text-sm text-(--ui-text-muted)">Vul netto pensioenbedragen in op de <NuxtLink to="/income" class="text-(--ui-primary) underline underline-offset-2">inkomenspagina</NuxtLink> om automatisch scenario's te genereren.</p>
      </div>

      <ScenariosScenarioComparison v-if="scenarioStore.scenarios.length > 0" />
      <ScenariosTimelineChart
        v-if="scenarioStore.scenarios.length > 0"
        :scenarios="scenarioStore.scenarios"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useScenarioStore } from '~/stores/scenarios'

const scenarioStore = useScenarioStore()
</script>
