<template>
  <UCard variant="outline">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="flex size-9 items-center justify-center rounded-lg bg-pink-500/10">
          <UIcon name="i-heroicons-heart" class="size-5 text-pink-500" />
        </div>
        <div>
          <h2 class="text-base font-semibold text-(--ui-text-highlighted)">Profiel partner</h2>
          <p class="text-sm text-(--ui-text-muted)">Gegevens van uw partner voor de pensioenberekening</p>
        </div>
      </div>
    </template>

    <div class="space-y-6">
    <div class="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
      <div class="space-y-2">
        <label class="block text-sm font-semibold text-(--ui-text-highlighted)">
          Geboortedatum partner
        </label>
        <div class="flex items-center gap-2 rounded-lg border border-(--ui-border) bg-(--ui-bg-elevated)/50 px-3 py-2.5 focus-within:ring-2 focus-within:ring-pink-500/30 focus-within:border-pink-500 transition-all">
          <UIcon name="i-heroicons-heart" class="size-5 text-pink-500 shrink-0" />
          <input
            v-model="store.profile.partnerDateOfBirth"
            type="date"
            class="w-full bg-transparent text-sm text-(--ui-text-highlighted) outline-none placeholder:text-(--ui-text-dimmed)"
          >
        </div>
        <p v-if="store.partnerCurrentAge" class="text-sm text-pink-500 font-medium">
          {{ formatAge(store.partnerCurrentAge) }}
        </p>
      </div>

      <div class="space-y-2">
        <label class="block text-sm font-semibold text-(--ui-text-highlighted)">
          AOW-leeftijd partner
        </label>
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2 rounded-lg border border-(--ui-border) bg-(--ui-bg-elevated)/50 px-3 py-2.5 focus-within:ring-2 focus-within:ring-pink-500/30 focus-within:border-pink-500 transition-all">
            <input
              v-model.number="store.profile.partnerAowAge.years"
              type="number"
              :min="60"
              :max="75"
              class="w-12 bg-transparent text-sm text-(--ui-text-highlighted) outline-none text-center font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            >
            <span class="text-xs font-medium text-(--ui-text-muted) shrink-0 uppercase tracking-wide">jaar</span>
          </div>
          <div class="flex items-center gap-2 rounded-lg border border-(--ui-border) bg-(--ui-bg-elevated)/50 px-3 py-2.5 focus-within:ring-2 focus-within:ring-pink-500/30 focus-within:border-pink-500 transition-all">
            <input
              v-model.number="store.profile.partnerAowAge.months"
              type="number"
              :min="0"
              :max="11"
              class="w-8 bg-transparent text-sm text-(--ui-text-highlighted) outline-none text-center font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            >
            <span class="text-xs font-medium text-(--ui-text-muted) shrink-0 uppercase tracking-wide">mnd</span>
          </div>
        </div>
        <p v-if="store.partnerAowStartDate" class="flex items-center gap-1.5 text-sm text-(--ui-text-muted)">
          <UIcon name="i-heroicons-calendar-days" class="size-3.5" />
          AOW start: <span class="font-medium text-pink-500">{{ formatDate(store.partnerAowStartDate) }}</span>
        </p>
      </div>
    </div>

      <div v-if="store.profile.partnerDateOfBirth" class="grid grid-cols-2 gap-4 border-t border-(--ui-border) pt-5">
        <div class="flex items-center gap-3 rounded-xl bg-(--ui-bg-elevated)/50 border border-(--ui-border) px-4 py-3">
          <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-pink-500/10">
            <UIcon name="i-heroicons-arrow-trending-up" class="size-5 text-pink-500" />
          </div>
          <div class="min-w-0">
            <p class="text-xs font-medium uppercase tracking-wider text-(--ui-text-dimmed)">Inkomstenbronnen</p>
            <p class="text-sm font-bold text-(--ui-text-highlighted)">{{ partnerStreams }}</p>
          </div>
        </div>
        <div class="flex items-center gap-3 rounded-xl bg-(--ui-bg-elevated)/50 border border-(--ui-border) px-4 py-3">
          <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-pink-500/10">
            <UIcon name="i-heroicons-document-check" class="size-5 text-pink-500" />
          </div>
          <div class="min-w-0">
            <p class="text-xs font-medium uppercase tracking-wider text-(--ui-text-dimmed)">Pensioenoverzicht</p>
            <p class="text-sm font-bold text-(--ui-text-highlighted)">{{ pensionStore.partnerPensionData.length > 0 ? `${pensionStore.partnerPensionData.length} geladen` : 'Niet geladen' }}</p>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { useProfileStore } from '~/stores/profile'
import { useFinancialStore } from '~/stores/financial'
import { usePensionStore } from '~/stores/pension'

const store = useProfileStore()
const financialStore = useFinancialStore()
const pensionStore = usePensionStore()
const { formatAge, formatDate } = useFormatting()

const partnerStreams = computed(() =>
  financialStore.streams.filter(s => s.type === 'partner-pension' || s.type === 'partner-aow').length
)
</script>
