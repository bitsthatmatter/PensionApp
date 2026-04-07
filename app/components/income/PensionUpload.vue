<template>
  <UCard variant="outline">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="flex size-9 items-center justify-center rounded-lg bg-(--ui-primary)/10">
          <UIcon name="i-heroicons-arrow-up-tray" class="size-5 text-(--ui-primary)" />
        </div>
        <div>
          <h3 class="text-base font-semibold text-(--ui-text-highlighted)">Pensioenoverzicht uploaden</h3>
          <p class="text-sm text-(--ui-text-muted)">Upload uw JSON-bestand van mijnpensioenoverzicht.nl</p>
        </div>
      </div>
    </template>

    <div class="space-y-4">
      <div class="flex items-center gap-3">
        <button
          class="inline-flex items-center gap-3 rounded-lg bg-(--ui-primary) px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:opacity-90 active:opacity-80"
          @click="($refs.fileInput as HTMLInputElement).click()"
        >
          <UIcon name="i-heroicons-arrow-up-tray" class="size-5" />
          Bestand kiezen
        </button>
        <input
          ref="fileInput"
          type="file"
          accept=".json"
          class="hidden"
          @change="handleUpload"
        />
        <span v-if="store.isLoading" class="text-sm text-(--ui-text-muted)">Bezig met verwerken...</span>
      </div>

      <UAlert
        v-if="store.error"
        color="error"
        variant="subtle"
        icon="i-heroicons-exclamation-circle"
        :title="store.error"
      />

      <template v-if="store.pensionData">
        <UAlert
          color="success"
          variant="subtle"
          icon="i-heroicons-check-circle"
          title="Pensioenoverzicht geladen"
        />

        <div class="space-y-6">
          <div>
            <h4 class="mb-3 text-sm font-semibold uppercase tracking-wider text-(--ui-text-dimmed)">AOW (jaarlijks bruto)</h4>
            <div class="grid grid-cols-2 gap-4">
              <div class="rounded-xl border border-(--ui-border) bg-(--ui-bg-elevated)/50 p-4">
                <p class="text-xs font-medium uppercase tracking-wider text-(--ui-text-dimmed)">Samenwonend</p>
                <p class="mt-1 text-lg font-bold text-(--ui-text-highlighted)">{{ formatCurrency(store.pensionData.aow.samenwonend) }}</p>
              </div>
              <div class="rounded-xl border border-(--ui-border) bg-(--ui-bg-elevated)/50 p-4">
                <p class="text-xs font-medium uppercase tracking-wider text-(--ui-text-dimmed)">Alleenstaand</p>
                <p class="mt-1 text-lg font-bold text-(--ui-text-highlighted)">{{ formatCurrency(store.pensionData.aow.alleenstaand) }}</p>
              </div>
            </div>
          </div>

          <div>
            <h4 class="mb-3 text-sm font-semibold uppercase tracking-wider text-(--ui-text-dimmed)">Ouderdomspensioen per periode</h4>
            <UTable :data="pensionTableData" :columns="pensionColumns" />
          </div>

          <div>
            <h4 class="mb-3 text-sm font-semibold uppercase tracking-wider text-(--ui-text-dimmed)">Pensioenuitvoerders</h4>
            <UTable :data="providerTableData" :columns="providerColumns" />
          </div>
        </div>

        <div class="pt-2">
          <UButton
            color="error"
            variant="soft"
            icon="i-heroicons-trash"
            label="Pensioengegevens wissen"
            @click="store.clear()"
          />
        </div>
      </template>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { usePensionStore } from '~/stores/pension'

const store = usePensionStore()
const { formatCurrency, formatAge } = useFormatting()

async function handleUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  await store.uploadPensionFile(file)
}

const pensionColumns: TableColumn[] = [
  { accessorKey: 'periode', header: 'Periode' },
  { accessorKey: 'pensioen', header: 'Pensioen' },
  { accessorKey: 'aow', header: 'AOW' },
]

const pensionTableData = computed(() =>
  (store.pensionData?.ouderdomsPensioen ?? []).map((period) => ({
    periode: `${formatAge(period.fromAge)} → ${period.toAge ? formatAge(period.toAge) : period.toEvent ?? '—'}`,
    pensioen: formatCurrency(period.pension + (period.indicatiefPensioen ?? 0)),
    aow: period.aowSamenwonend ? formatCurrency(period.aowSamenwonend) : '—',
  }))
)

const providerColumns: TableColumn[] = [
  { accessorKey: 'name', header: 'Uitvoerder' },
  { accessorKey: 'amount', header: 'Jaarlijks bedrag' },
  { accessorKey: 'startAge', header: 'Vanaf leeftijd' },
]

const providerTableData = computed(() =>
  (store.pensionData?.providers ?? []).map((p) => ({
    name: p.name,
    amount: formatCurrency(p.annualAmount),
    startAge: formatAge(p.startAge),
  }))
)
</script>
