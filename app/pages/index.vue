<template>
  <div class="min-h-[calc(100vh-4rem)]">
    <!-- Hero section -->
    <div class="relative overflow-hidden border-b border-(--ui-border) bg-gradient-to-br from-(--ui-primary)/5 via-(--ui-bg) to-(--ui-primary)/3">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--ui-primary)/8,transparent)]" />
      <div class="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div class="max-w-2xl">
          <h1 class="text-3xl font-bold tracking-tight text-(--ui-text-highlighted) sm:text-4xl">
            Pensioenplanner
          </h1>
          <p class="mt-2 text-lg text-(--ui-text-muted)">
            Plan uw financiele toekomst en ontdek wanneer u met pensioen kunt.
          </p>
        </div>
      </div>
    </div>

    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <!-- Profile form -->
      <ProfileForm />

      <!-- Overview cards -->
      <template v-if="profileStore.profile.dateOfBirth">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <UCard
            v-for="card in overviewCards"
            :key="card.label"
            variant="subtle"
            :ui="{ body: 'p-5' }"
          >
            <div class="flex items-center gap-4">
              <div class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-(--ui-primary)/10">
                <UIcon :name="card.icon" class="size-6 text-(--ui-primary)" />
              </div>
              <div class="min-w-0">
                <p class="text-xs font-medium uppercase tracking-wider text-(--ui-text-dimmed)">
                  {{ card.label }}
                </p>
                <p class="text-sm font-bold text-(--ui-text-highlighted) truncate" :title="card.value">
                  {{ card.value }}
                </p>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Quick links -->
        <div>
          <h2 class="text-lg font-semibold text-(--ui-text-highlighted) mb-4">Aan de slag</h2>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <NuxtLink
              v-for="link in quickLinks"
              :key="link.to"
              :to="link.to"
              class="group"
            >
              <UCard variant="outline" :ui="{ body: 'p-5 sm:p-6' }" class="h-full transition-all duration-200 group-hover:shadow-lg group-hover:border-(--ui-primary)/40">
                <div class="flex flex-col gap-3">
                  <div class="flex size-11 items-center justify-center rounded-xl bg-(--ui-primary)/10 transition-colors group-hover:bg-(--ui-primary)/20">
                    <UIcon :name="link.icon" class="size-5 text-(--ui-primary)" />
                  </div>
                  <div>
                    <p class="font-semibold text-(--ui-text-highlighted) group-hover:text-(--ui-primary) transition-colors">
                      {{ link.title }}
                    </p>
                    <p class="mt-1 text-sm text-(--ui-text-muted) leading-relaxed">{{ link.desc }}</p>
                  </div>
                  <div class="flex items-center gap-1 text-sm font-medium text-(--ui-primary) opacity-0 group-hover:opacity-100 transition-opacity">
                    Openen
                    <UIcon name="i-heroicons-arrow-right" class="size-4" />
                  </div>
                </div>
              </UCard>
            </NuxtLink>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useProfileStore } from '~/stores/profile'
import { useFinancialStore } from '~/stores/financial'
import { usePensionStore } from '~/stores/pension'

const profileStore = useProfileStore()
const financialStore = useFinancialStore()
const pensionStore = usePensionStore()
const { formatAge, formatDate } = useFormatting()

const overviewCards = computed(() => [
  {
    label: 'Leeftijd',
    value: profileStore.currentAge ? formatAge(profileStore.currentAge) : '—',
    icon: 'i-heroicons-user',
  },
  {
    label: 'AOW-ingangsdatum',
    value: profileStore.aowStartDate ? formatDate(profileStore.aowStartDate) : '—',
    icon: 'i-heroicons-calendar-days',
  },
  {
    label: 'Inkomstenbronnen',
    value: financialStore.streams.length.toString(),
    icon: 'i-heroicons-arrow-trending-up',
  },
  {
    label: 'Pensioenoverzicht',
    value: pensionStore.pensionData ? 'Geladen' : 'Niet geladen',
    icon: 'i-heroicons-document-check',
  },
])

const quickLinks = [
  {
    to: '/income',
    icon: 'i-heroicons-wallet',
    title: 'Inkomen beheren',
    desc: 'Pensioenoverzicht uploaden, salaris en andere inkomsten instellen',
  },
  {
    to: '/expenses',
    icon: 'i-heroicons-banknotes',
    title: 'Uitgaven analyseren',
    desc: 'Transacties uploaden en geplande kosten beheren',
  },
  {
    to: '/scenarios',
    icon: 'i-heroicons-scale',
    title: 'Scenario\'s vergelijken',
    desc: 'Verschillende pensioenleeftijden vergelijken en uw toekomst plannen',
  },
]
</script>
