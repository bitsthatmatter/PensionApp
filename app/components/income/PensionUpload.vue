<template>
  <UCard variant="outline">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="flex size-9 items-center justify-center rounded-lg bg-(--ui-primary)/10">
          <UIcon name="i-heroicons-arrow-up-tray" class="size-5 text-(--ui-primary)" />
        </div>
        <div>
          <h3 class="text-base font-semibold text-(--ui-text-highlighted)">{{ title }}</h3>
          <p class="text-sm text-(--ui-text-muted)">Upload het JSON-bestand van mijnpensioenoverzicht.nl</p>
        </div>
      </div>
    </template>

    <div class="space-y-4">
      <!-- Upload button -->
      <div class="flex items-center gap-3">
        <UButton
          color="primary"
          icon="i-heroicons-arrow-up-tray"
          label="Bestand kiezen"
          :disabled="overviews.length >= 3"
          @click="($refs.fileInput as HTMLInputElement).click()"
        />
        <input
          ref="fileInput"
          type="file"
          accept=".json"
          class="hidden"
          @change="handleUpload"
        >
        <span v-if="isLoading" class="text-sm text-(--ui-text-muted)">Bezig met verwerken...</span>
        <UBadge v-if="overviews.length >= 3" color="warning" variant="subtle">Maximaal 3 overzichten</UBadge>
      </div>

      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        icon="i-heroicons-exclamation-circle"
        :title="error"
      />

      <!-- List of loaded overviews -->
      <div v-if="overviews.length > 0" class="space-y-2">
        <p class="text-xs font-semibold uppercase tracking-wider text-(--ui-text-dimmed)">Geladen overzichten</p>
        <div
          v-for="(overzicht, index) in overviews"
          :key="index"
          class="flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors cursor-pointer"
          :class="selectedIndex === index
            ? 'border-(--ui-primary) bg-(--ui-primary)/5'
            : 'border-(--ui-border) hover:border-(--ui-border-hover)'"
          @click="selectedIndex = index"
        >
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-document-check" class="size-4 text-(--ui-primary)" />
            <span class="text-sm font-medium text-(--ui-text-highlighted)">
              {{ formatOverzichtLabel(overzicht) }}
            </span>
          </div>
          <button
            class="flex size-6 items-center justify-center rounded text-(--ui-text-dimmed) hover:text-red-500 transition-colors"
            @click.stop="onRemove(index)"
          >
            <UIcon name="i-heroicons-trash" class="size-4" />
          </button>
        </div>
      </div>

      <!-- Detail tables for selected overview -->
      <template v-if="selectedOverzicht">
        <div class="space-y-6">
          <div>
            <h4 class="mb-3 text-sm font-semibold uppercase tracking-wider text-(--ui-text-dimmed)">AOW (jaarlijks bruto)</h4>
            <div class="grid grid-cols-2 gap-4">
              <div class="rounded-xl border border-(--ui-border) bg-(--ui-bg-elevated)/50 p-4">
                <p class="text-xs font-medium uppercase tracking-wider text-(--ui-text-dimmed)">Samenwonend</p>
                <p class="mt-1 text-lg font-bold text-(--ui-text-highlighted)">{{ formatCurrency(aow.samenwonend) }}</p>
              </div>
              <div class="rounded-xl border border-(--ui-border) bg-(--ui-bg-elevated)/50 p-4">
                <p class="text-xs font-medium uppercase tracking-wider text-(--ui-text-dimmed)">Alleenstaand</p>
                <p class="mt-1 text-lg font-bold text-(--ui-text-highlighted)">{{ formatCurrency(aow.alleenstaand) }}</p>
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
      </template>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { usePensionStore } from '~/stores/pension'
import { isLeeftijdsGrens } from '~/types/pensioenoverzicht'
import { deriveIngangsdatum } from '~/domain/pension-overview'

const props = withDefaults(defineProps<{ person?: 'primary' | 'partner' }>(), { person: 'primary' })

const store = usePensionStore()
const { formatCurrency } = useFormatting()

const isPartner = computed(() => props.person === 'partner')

const title = computed(() =>
  isPartner.value ? 'Pensioenoverzicht partner uploaden' : 'Pensioenoverzicht uploaden'
)
const overviews = computed(() =>
  isPartner.value ? store.partnerPensionData : store.pensionData
)
const isLoading = computed(() =>
  isPartner.value ? store.isPartnerLoading : store.isLoading
)
const error = computed(() =>
  isPartner.value ? store.partnerError : store.error
)

const selectedIndex = ref(0)

// Reset selection when list changes
watch(() => overviews.value.length, () => {
  if (selectedIndex.value >= overviews.value.length) {
    selectedIndex.value = Math.max(0, overviews.value.length - 1)
  }
})

const selectedOverzicht = computed(() => overviews.value[selectedIndex.value] ?? null)

async function handleUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (isPartner.value) {
    await store.uploadPartnerPensionFile(file)
  } else {
    await store.uploadPensionFile(file)
  }
  // Select the newly uploaded overview
  selectedIndex.value = overviews.value.length - 1
  // Reset file input so the same file can be re-uploaded
  ;(event.target as HTMLInputElement).value = ''
}

function onRemove(index: number) {
  if (isPartner.value) {
    store.removePartnerPensionFile(index)
  } else {
    store.removePensionFile(index)
  }
}

function formatLeeftijd(jaren: number, maanden: number): string {
  if (maanden === 0) return `${jaren} jaar`
  return `${jaren} jaar en ${maanden} maanden`
}

function formatOverzichtLabel(overzicht: typeof overviews.value[0]): string {
  try {
    const age = deriveIngangsdatum(overzicht)
    return `Vanaf ${formatLeeftijd(age.years, age.months)}`
  } catch {
    return 'Onbekende ingangsdatum'
  }
}

const aow = computed(() => {
  const regel = selectedOverzicht.value?.Totalen.OuderdomsPensioenTotalen.OuderdomsPensioenTotaal
    .find(r => r.AOWSamenwonend != null)
  return {
    samenwonend: regel?.AOWSamenwonend ?? 0,
    alleenstaand: regel?.AOWAlleenstaand ?? 0,
  }
})

const pensionColumns: TableColumn[] = [
  { accessorKey: 'periode', header: 'Periode' },
  { accessorKey: 'pensioen', header: 'Pensioen' },
  { accessorKey: 'aow', header: 'AOW' },
  { accessorKey: 'totaal', header: 'Totaal' },
]

const pensionTableData = computed(() =>
  (selectedOverzicht.value?.Totalen.OuderdomsPensioenTotalen.OuderdomsPensioenTotaal ?? []).map((regel) => {
    const van = isLeeftijdsGrens(regel.Van)
      ? formatLeeftijd(regel.Van.Leeftijd.Jaren, regel.Van.Leeftijd.Maanden)
      : '—'
    const tot = isLeeftijdsGrens(regel.Tot)
      ? formatLeeftijd(regel.Tot.Leeftijd.Jaren, regel.Tot.Leeftijd.Maanden)
      : 'overlijden'
    const pensioenBedrag = (regel.Pensioen ?? 0) + (regel.IndicatiefPensioen ?? 0)
    const aowBedrag = regel.AOWSamenwonend ?? 0
    return {
      periode: `${van} → ${tot}`,
      pensioen: formatCurrency(pensioenBedrag),
      aow: aowBedrag > 0 ? formatCurrency(aowBedrag) : '—',
      totaal: formatCurrency(pensioenBedrag + aowBedrag),
    }
  })
)

const providerColumns: TableColumn[] = [
  { accessorKey: 'name', header: 'Uitvoerder' },
  { accessorKey: 'amount', header: 'Jaarlijks bedrag' },
  { accessorKey: 'startAge', header: 'Vanaf leeftijd' },
]

const providerTableData = computed(() => {
  const periodes = selectedOverzicht.value?.Details.OuderdomsPensioenDetails.OuderdomsPensioen ?? []
  const seen = new Set<string>()
  const rows: { name: string; amount: string; startAge: string }[] = []

  for (const periode of periodes) {
    if (!isLeeftijdsGrens(periode.Van)) continue
    const { Jaren, Maanden } = periode.Van.Leeftijd
    const startAge = formatLeeftijd(Jaren, Maanden)

    const items = [...(periode.Pensioen ?? []), ...(periode.IndicatiefPensioen ?? [])]
    for (const item of items) {
      const key = `${item.PensioenUitvoerder}-${Jaren}-${Maanden}`
      if (seen.has(key)) continue
      seen.add(key)
      rows.push({
        name: item.PensioenUitvoerder,
        amount: formatCurrency(item.TeBereiken ?? item.Opgebouwd ?? 0),
        startAge,
      })
    }
  }
  return rows
})
</script>
