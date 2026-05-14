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
      <div class="flex items-center gap-3">
        <button
          class="inline-flex items-center gap-3 rounded-full bg-(--ui-primary) px-5 py-2.5 text-sm font-semibold text-[#163300] transition-all hover:scale-105 active:scale-95"
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
        >
        <span v-if="isLoading" class="text-sm text-(--ui-text-muted)">Bezig met verwerken...</span>
      </div>

      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        icon="i-heroicons-exclamation-circle"
        :title="error"
      />

      <template v-if="pensionData">
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

        <div class="pt-2">
          <UButton
            color="error"
            variant="soft"
            icon="i-heroicons-trash"
            label="Pensioengegevens wissen"
            @click="onClear"
          />
        </div>
      </template>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { usePensionStore } from '~/stores/pension'
import { isLeeftijdsGrens } from '~/types/pensioenoverzicht'

const props = withDefaults(defineProps<{ person?: 'primary' | 'partner' }>(), { person: 'primary' })

const store = usePensionStore()
const { formatCurrency } = useFormatting()

const isPartner = computed(() => props.person === 'partner')

const title = computed(() =>
  isPartner.value ? 'Pensioenoverzicht partner uploaden' : 'Pensioenoverzicht uploaden'
)
const pensionData = computed(() =>
  isPartner.value ? store.partnerPensionData : store.pensionData
)
const isLoading = computed(() =>
  isPartner.value ? store.isPartnerLoading : store.isLoading
)
const error = computed(() =>
  isPartner.value ? store.partnerError : store.error
)

async function handleUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (isPartner.value) {
    await store.uploadPartnerPensionFile(file)
  } else {
    await store.uploadPensionFile(file)
  }
}

function onClear() {
  if (isPartner.value) {
    store.clearPartner()
  } else {
    store.clear()
  }
}

function formatLeeftijd(jaren: number, maanden: number): string {
  if (maanden === 0) return `${jaren} jaar`
  return `${jaren} jaar en ${maanden} maanden`
}

const aow = computed(() => {
  const regel = pensionData.value?.Totalen.OuderdomsPensioenTotalen.OuderdomsPensioenTotaal
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
  (pensionData.value?.Totalen.OuderdomsPensioenTotalen.OuderdomsPensioenTotaal ?? []).map((regel) => {
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
  const periodes = pensionData.value?.Details.OuderdomsPensioenDetails.OuderdomsPensioen ?? []
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
