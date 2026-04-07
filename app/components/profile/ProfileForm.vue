<template>
  <UCard variant="outline">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="flex size-9 items-center justify-center rounded-lg bg-(--ui-primary)/10">
          <UIcon name="i-heroicons-user-circle" class="size-5 text-(--ui-primary)" />
        </div>
        <div>
          <h2 class="text-base font-semibold text-(--ui-text-highlighted)">Persoonlijk profiel</h2>
          <p class="text-sm text-(--ui-text-muted)">Vul uw gegevens in om uw pensioen te berekenen</p>
        </div>
      </div>
    </template>

    <div class="space-y-6">
      <!-- Row 1: Date of birth + AOW age -->
      <div class="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-(--ui-text-highlighted)">
            Geboortedatum
            <span class="text-(--ui-primary)">*</span>
          </label>
          <div class="flex items-center gap-2 rounded-lg border border-(--ui-border) bg-(--ui-bg-elevated)/50 px-3 py-2.5 focus-within:ring-2 focus-within:ring-(--ui-primary)/30 focus-within:border-(--ui-primary) transition-all">
            <UIcon name="i-heroicons-cake" class="size-5 text-(--ui-primary) shrink-0" />
            <input
              type="date"
              v-model="store.profile.dateOfBirth"
              class="w-full bg-transparent text-sm text-(--ui-text-highlighted) outline-none placeholder:text-(--ui-text-dimmed)"
            />
          </div>
          <p v-if="store.currentAge" class="text-sm text-(--ui-primary) font-medium">
            {{ formatAge(store.currentAge) }}
          </p>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-semibold text-(--ui-text-highlighted)">
            AOW-leeftijd
          </label>
          <div class="flex items-center gap-3">
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
            AOW start: <span class="font-medium text-(--ui-primary)">{{ formatDate(store.aowStartDate) }}</span>
          </p>
        </div>
      </div>

      <!-- Row 2: Partner toggle -->
      <div class="border-t border-(--ui-border) pt-5">
        <label
          class="flex items-start gap-4 rounded-lg border cursor-pointer px-4 py-3.5 transition-all"
          :class="store.profile.hasPartner
            ? 'border-(--ui-primary) bg-(--ui-primary)/5 shadow-sm'
            : 'border-(--ui-border) hover:border-(--ui-border-hover) bg-(--ui-bg-elevated)/30'"
        >
          <div
            class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors"
            :class="store.profile.hasPartner
              ? 'border-(--ui-primary) bg-(--ui-primary) text-white'
              : 'border-(--ui-border-hover)'"
          >
            <UIcon v-if="store.profile.hasPartner" name="i-heroicons-check" class="size-3.5" />
          </div>
          <input type="checkbox" v-model="store.profile.hasPartner" class="sr-only" />
          <div>
            <p class="text-sm font-semibold text-(--ui-text-highlighted)">Ik heb een partner</p>
            <p class="text-sm text-(--ui-text-muted) mt-0.5">Activeer om ook het pensioen en de AOW van uw partner mee te nemen in de berekening</p>
          </div>
        </label>
      </div>

      <!-- Row 3: Partner details (conditional) -->
      <div v-if="store.profile.hasPartner" class="space-y-2">
        <label class="block text-sm font-semibold text-(--ui-text-highlighted)">
          Geboortedatum partner
        </label>
        <div class="flex items-center gap-2 rounded-lg border border-(--ui-border) bg-(--ui-bg-elevated)/50 px-3 py-2.5 focus-within:ring-2 focus-within:ring-(--ui-primary)/30 focus-within:border-(--ui-primary) transition-all sm:max-w-xs">
          <UIcon name="i-heroicons-heart" class="size-5 text-pink-500 shrink-0" />
          <input
            type="date"
            v-model="store.profile.partnerDateOfBirth"
            class="w-full bg-transparent text-sm text-(--ui-text-highlighted) outline-none placeholder:text-(--ui-text-dimmed)"
          />
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { useProfileStore } from '~/stores/profile'

const store = useProfileStore()
const { formatAge, formatDate } = useFormatting()
</script>
