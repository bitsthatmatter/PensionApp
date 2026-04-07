<template>
  <UCard variant="outline">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="flex size-9 items-center justify-center rounded-lg bg-(--ui-primary)/10">
          <UIcon name="i-heroicons-cog-6-tooth" class="size-5 text-(--ui-primary)" />
        </div>
        <div>
          <h3 class="text-base font-semibold text-(--ui-text-highlighted)">AOW-instellingen</h3>
          <p class="text-sm text-(--ui-text-muted)">
            Huidige AOW-leeftijd: {{ formatAge(store.profile.aowAge) }}
          </p>
        </div>
      </div>
    </template>

    <div class="space-y-3">
      <label class="block text-sm font-semibold text-(--ui-text-highlighted)">AOW-leeftijd</label>
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-2 rounded-lg border border-(--ui-border) bg-(--ui-bg-elevated)/50 px-3 py-2.5 focus-within:ring-2 focus-within:ring-(--ui-primary)/30 focus-within:border-(--ui-primary) transition-all">
          <input
            type="number"
            :min="60"
            :max="75"
            v-model.number="store.profile.aowAge.years"
            class="w-12 bg-transparent text-sm text-(--ui-text-highlighted) outline-none text-center font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span class="text-xs font-medium text-(--ui-text-muted) shrink-0 uppercase tracking-wide">jaar</span>
        </div>
        <div class="flex items-center gap-2 rounded-lg border border-(--ui-border) bg-(--ui-bg-elevated)/50 px-3 py-2.5 focus-within:ring-2 focus-within:ring-(--ui-primary)/30 focus-within:border-(--ui-primary) transition-all">
          <input
            type="number"
            :min="0"
            :max="11"
            v-model.number="store.profile.aowAge.months"
            class="w-8 bg-transparent text-sm text-(--ui-text-highlighted) outline-none text-center font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span class="text-xs font-medium text-(--ui-text-muted) shrink-0 uppercase tracking-wide">mnd</span>
        </div>
      </div>
      <p v-if="store.aowStartDate" class="flex items-center gap-1.5 text-sm text-(--ui-text-muted)">
        <UIcon name="i-heroicons-calendar-days" class="size-3.5" />
        AOW-ingangsdatum: <span class="font-medium text-(--ui-primary)">{{ formatDate(store.aowStartDate) }}</span>
      </p>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { useProfileStore } from '~/stores/profile'

const store = useProfileStore()
const { formatAge, formatDate } = useFormatting()
</script>
