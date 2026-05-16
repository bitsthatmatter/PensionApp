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
        Voeg per pensioenleeftijd meerdere werkgevers toe; de bedragen worden opgeteld.
      </p>

      <!-- Scrollable wrapper for narrow screens -->
      <div class="overflow-x-auto">
        <table class="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr>
              <th class="w-48 py-2 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-(--ui-text-dimmed)" />
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
            <!--
              Employer rows: one group per employer index.
              We iterate over the maximum employer count so all columns stay aligned.
            -->
            <template v-for="employerIndex in maxEmployerCount" :key="employerIndex">
              <!-- Label row -->
              <tr class="border-t border-(--ui-border)">
                <td class="py-2 pr-4">
                  <div class="flex items-center gap-1">
                    <UInput
                      :model-value="getEmployerLabel(employerIndex - 1)"
                      size="xs"
                      placeholder="Werkgever naam"
                      class="flex-1 min-w-0"
                      @update:model-value="val => updateAllLabels(employerIndex - 1, String(val))"
                    />
                    <UButton
                      v-if="employerIndex === maxEmployerCount && employerIndex > 1"
                      icon="i-heroicons-trash"
                      size="xs"
                      color="error"
                      variant="ghost"
                      :aria-label="`Werkgever ${employerIndex} verwijderen`"
                      @click="removeEmployerAtIndex(employerIndex - 1)"
                    />
                  </div>
                </td>
                <td
                  v-for="entry in pensionStore.entries"
                  :key="ageKey(entry.retirementAge)"
                  class="px-2 py-1 text-center text-xs text-(--ui-text-dimmed)"
                >
                  <span v-if="entry.employers[employerIndex - 1]">
                    {{ entry.employers[employerIndex - 1].label }}
                  </span>
                  <span v-else class="text-(--ui-text-dimmed)">—</span>
                </td>
              </tr>

              <!-- Vóór AOW row -->
              <tr>
                <td class="py-1 pr-4 pl-2 text-sm text-(--ui-text-muted) whitespace-nowrap">
                  Netto/mnd vóór AOW
                </td>
                <td
                  v-for="entry in pensionStore.entries"
                  :key="ageKey(entry.retirementAge)"
                  class="px-2 py-1"
                >
                  <UInput
                    v-if="entry.employers[employerIndex - 1]"
                    :model-value="entry.employers[employerIndex - 1].amounts.netBeforeAow || ''"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    class="text-right"
                    @update:model-value="val => onUpdate(entry.retirementAge, entry.employers[employerIndex - 1].id, 'netBeforeAow', val)"
                  />
                  <span v-else class="block text-center text-(--ui-text-dimmed)">—</span>
                </td>
              </tr>

              <!-- Ná AOW row -->
              <tr>
                <td class="py-1 pr-4 pl-2 text-sm text-(--ui-text-muted) whitespace-nowrap">
                  Netto/mnd ná AOW
                </td>
                <td
                  v-for="entry in pensionStore.entries"
                  :key="ageKey(entry.retirementAge)"
                  class="px-2 py-1"
                >
                  <UInput
                    v-if="entry.employers[employerIndex - 1]"
                    :model-value="entry.employers[employerIndex - 1].amounts.netAfterAow || ''"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    class="text-right"
                    @update:model-value="val => onUpdate(entry.retirementAge, entry.employers[employerIndex - 1].id, 'netAfterAow', val)"
                  />
                  <span v-else class="block text-center text-(--ui-text-dimmed)">—</span>
                </td>
              </tr>
            </template>

            <!-- Add employer row -->
            <tr class="border-t border-(--ui-border)">
              <td class="py-2 pr-4">
                <UButton
                  icon="i-heroicons-plus"
                  size="xs"
                  variant="ghost"
                  label="Werkgever toevoegen"
                  @click="addEmployerToAll"
                />
              </td>
              <td
                v-for="entry in pensionStore.entries"
                :key="ageKey(entry.retirementAge)"
                class="px-2 py-2"
              />
            </tr>

            <!-- Totaal row (only shown when >1 employer) -->
            <template v-if="maxEmployerCount > 1">
              <tr class="border-t-2 border-(--ui-border) bg-(--ui-bg-elevated)/40">
                <td class="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-(--ui-text-dimmed) whitespace-nowrap">
                  Totaal vóór AOW
                </td>
                <td
                  v-for="entry in pensionStore.entries"
                  :key="ageKey(entry.retirementAge)"
                  class="px-2 py-2 text-center text-sm font-semibold text-(--ui-text-highlighted)"
                >
                  {{ entry.amounts.netBeforeAow > 0 ? formatCurrency(entry.amounts.netBeforeAow) : '—' }}
                </td>
              </tr>
              <tr class="bg-(--ui-bg-elevated)/40">
                <td class="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-(--ui-text-dimmed) whitespace-nowrap">
                  Totaal ná AOW
                </td>
                <td
                  v-for="entry in pensionStore.entries"
                  :key="ageKey(entry.retirementAge)"
                  class="px-2 py-2 text-center text-sm font-semibold text-(--ui-text-highlighted)"
                >
                  {{ entry.amounts.netAfterAow > 0 ? formatCurrency(entry.amounts.netAfterAow) : '—' }}
                </td>
              </tr>
            </template>

            <!-- Ingevoerd row -->
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
const { formatAge, formatCurrency } = useFormatting()

function ageKey(age: Age): string {
  return `${age.years}-${age.months}`
}

/** Maximum number of employers across all retirement age entries. */
const maxEmployerCount = computed(() =>
  Math.max(...pensionStore.entries.map(e => e.employers.length)),
)

/**
 * Returns the label of the employer at `index` from the first entry that has one.
 * Used to populate the shared label input (labels are kept in sync across all ages).
 */
function getEmployerLabel(index: number): string {
  for (const entry of pensionStore.entries) {
    if (entry.employers[index]) return entry.employers[index].label
  }
  return `Werkgever ${index + 1}`
}

/** Sync a label change across all entries at the same employer index. */
function updateAllLabels(index: number, label: string) {
  for (const entry of pensionStore.entries) {
    const employer = entry.employers[index]
    if (employer) {
      pensionStore.updateEmployerLabel(entry.retirementAge, employer.id, label)
    }
  }
}

function onUpdate(
  retirementAge: Age,
  employerId: string,
  field: 'netBeforeAow' | 'netAfterAow',
  val: string | number,
) {
  const parsed = typeof val === 'string' ? parseFloat(val) : val
  pensionStore.updateEmployerAmount(retirementAge, employerId, field, isNaN(parsed) ? 0 : parsed)
}

/** Add a new employer slot to every retirement age entry. */
function addEmployerToAll() {
  for (const entry of pensionStore.entries) {
    pensionStore.addEmployer(entry.retirementAge)
  }
}

/** Remove the employer at `index` from every retirement age entry. */
function removeEmployerAtIndex(index: number) {
  for (const entry of pensionStore.entries) {
    const employer = entry.employers[index]
    if (employer) {
      pensionStore.removeEmployer(entry.retirementAge, employer.id)
    }
  }
}
</script>
