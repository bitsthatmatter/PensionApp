<template>
  <UCard variant="outline">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="flex size-9 items-center justify-center rounded-lg bg-(--ui-primary)/10">
          <UIcon name="i-heroicons-table-cells" class="size-5 text-(--ui-primary)" />
        </div>
        <div>
          <h3 class="text-base font-semibold text-(--ui-text-highlighted)">Netto pensioenbedragen</h3>
          <p class="text-sm text-(--ui-text-muted)">Lees de bedragen af van uw pensioenoverzicht en vul ze hieronder in.</p>
        </div>
      </div>
    </template>

    <div class="space-y-4">
      <p class="text-sm text-(--ui-text-muted)">
        <strong>Vóór AOW:</strong> netto pensioenuitkering per maand.
        <strong>Ná AOW:</strong> totaal netto per maand (inclusief AOW).
      </p>

      <!-- Scrollable wrapper for narrow screens -->
      <div class="overflow-x-auto">
        <table class="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr>
              <th class="w-36 py-2 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-(--ui-text-dimmed)" />
              <th
                v-for="entry in pensionStore.entries"
                :key="ageKey(entry.retirementAge)"
                class="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider text-(--ui-text-highlighted)"
              >
                {{ formatAge(entry.retirementAge) }}
              </th>
            </tr>
          </thead>
          <tbody>
            <!-- Row: before AOW -->
            <tr class="border-t border-(--ui-border)">
              <td class="py-3 pr-4 text-sm font-medium text-(--ui-text-muted) whitespace-nowrap">
                Netto/mnd vóór AOW
              </td>
              <td
                v-for="entry in pensionStore.entries"
                :key="ageKey(entry.retirementAge)"
                class="px-2 py-2"
              >
                <UInput
                  :model-value="entry.amounts.netBeforeAow || ''"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  class="text-right"
                  @update:model-value="val => onUpdate(entry.retirementAge, 'netBeforeAow', val)"
                />
              </td>
            </tr>

            <!-- Row: after AOW -->
            <tr class="border-t border-(--ui-border)">
              <td class="py-3 pr-4 text-sm font-medium text-(--ui-text-muted) whitespace-nowrap">
                Netto/mnd ná AOW
              </td>
              <td
                v-for="entry in pensionStore.entries"
                :key="ageKey(entry.retirementAge)"
                class="px-2 py-2"
              >
                <UInput
                  :model-value="entry.amounts.netAfterAow || ''"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  class="text-right"
                  @update:model-value="val => onUpdate(entry.retirementAge, 'netAfterAow', val)"
                />
              </td>
            </tr>

            <!-- Row: formatted display -->
            <tr class="border-t border-(--ui-border) bg-(--ui-bg-elevated)/40">
              <td class="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-(--ui-text-dimmed) whitespace-nowrap">
                Ingevoerd
              </td>
              <td
                v-for="entry in pensionStore.entries"
                :key="ageKey(entry.retirementAge)"
                class="px-2 py-2 text-center"
              >
                <span
                  v-if="entry.amounts.netBeforeAow > 0 || entry.amounts.netAfterAow > 0"
                  class="inline-flex size-5 items-center justify-center rounded-full bg-green-500/15"
                >
                  <UIcon name="i-heroicons-check" class="size-3 text-green-500" />
                </span>
                <span v-else class="text-(--ui-text-dimmed)">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="text-xs text-(--ui-text-dimmed)">
        {{ pensionStore.filledCount }} van {{ pensionStore.entries.length }} leeftijden ingevuld.
        Elke ingevulde leeftijd genereert automatisch een scenario op de scenario's pagina.
      </p>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { Age } from '~/types/financial'
import { usePensionStore } from '~/stores/pension'

const pensionStore = usePensionStore()
const { formatAge } = useFormatting()

function ageKey(age: Age): string {
  return `${age.years}-${age.months}`
}

function onUpdate(retirementAge: Age, field: 'netBeforeAow' | 'netAfterAow', val: string | number) {
  const parsed = typeof val === 'string' ? parseFloat(val) : val
  pensionStore.updateAmount(retirementAge, field, isNaN(parsed) ? 0 : parsed)
}
</script>
