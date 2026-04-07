<template>
  <UCard variant="outline">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="flex size-9 items-center justify-center rounded-lg bg-(--ui-primary)/10">
            <UIcon name="i-heroicons-queue-list" class="size-5 text-(--ui-primary)" />
          </div>
          <h3 class="text-base font-semibold text-(--ui-text-highlighted)">Inkomstenbronnen</h3>
        </div>
        <button
          class="inline-flex items-center gap-2 rounded-full bg-(--ui-primary)/10 px-4 py-2 text-sm font-semibold text-(--ui-primary) transition-colors hover:bg-(--ui-primary)/20 active:bg-(--ui-primary)/25"
          @click="showForm = true"
        >
          <UIcon name="i-heroicons-plus-circle" class="size-5" />
          Toevoegen
        </button>
      </div>
    </template>

    <div v-if="financialStore.streams.length === 0" class="py-12 text-center">
      <div class="flex size-14 mx-auto items-center justify-center rounded-xl bg-(--ui-bg-elevated) mb-3">
        <UIcon name="i-heroicons-inbox" class="size-7 text-(--ui-text-dimmed)" />
      </div>
      <p class="text-sm font-medium text-(--ui-text-muted)">Nog geen inkomstenbronnen toegevoegd.</p>
      <p class="text-xs text-(--ui-text-dimmed) mt-1">Klik op 'Toevoegen' om te beginnen.</p>
    </div>

    <UTable v-else :data="tableData" :columns="columns">
      <template #type-cell="{ row }">
        <UBadge :color="badgeColor(row.original.rawType)" variant="subtle" size="sm">
          {{ row.original.typeLabel }}
        </UBadge>
      </template>
      <template #monthly-cell="{ row }">
        <span :class="row.original.monthlyRaw < 0 ? 'text-red-500' : 'text-green-500'" class="font-mono text-sm">
          {{ row.original.monthly }}
        </span>
      </template>
      <template #actions-cell="{ row }">
        <div class="flex gap-1">
          <UButton
            icon="i-heroicons-pencil-square"
            color="neutral"
            variant="ghost"
            size="xs"
            @click="editStream(row.original.raw)"
          />
          <UButton
            icon="i-heroicons-trash"
            color="error"
            variant="ghost"
            size="xs"
            @click="financialStore.removeStream(row.original.raw.id)"
          />
        </div>
      </template>
    </UTable>

    <IncomeStreamForm
      v-if="showForm"
      v-model:open="showForm"
      :editing="editingStream"
      @save="handleSave"
    />
  </UCard>
</template>

<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { FinancialStream, StreamType } from '~/types/financial'
import { useFinancialStore } from '~/stores/financial'

const financialStore = useFinancialStore()
const { formatCurrency, formatDate } = useFormatting()

const showForm = ref(false)
const editingStream = ref<FinancialStream | null>(null)

const typeLabels: Record<StreamType, string> = {
  salary: 'Salaris',
  savings: 'Spaargeld',
  loan: 'Lening',
  pension: 'Pensioen',
  aow: 'AOW',
  'partner-pension': 'Partner pensioen',
  'partner-aow': 'Partner AOW',
  stocks: 'Aandelen',
  expense: 'Uitgave',
}

function badgeColor(type: StreamType): string {
  const map: Record<string, string> = {
    salary: 'success', savings: 'success', pension: 'primary', aow: 'warning',
    'partner-pension': 'primary', 'partner-aow': 'warning', loan: 'info',
    stocks: 'warning', expense: 'error',
  }
  return map[type] ?? 'neutral'
}

const columns: TableColumn[] = [
  { accessorKey: 'typeLabel', header: 'Type', id: 'type' },
  { accessorKey: 'label', header: 'Omschrijving' },
  { accessorKey: 'monthly', header: 'Maandelijks', id: 'monthly' },
  { accessorKey: 'lumpSum', header: 'Eenmalig' },
  { accessorKey: 'period', header: 'Periode' },
  { id: 'actions', header: '' },
]

const tableData = computed(() =>
  financialStore.streams.map((s) => ({
    raw: s,
    rawType: s.type,
    typeLabel: typeLabels[s.type] ?? s.type,
    label: s.label,
    monthly: formatCurrency(s.monthlyAmount),
    monthlyRaw: s.monthlyAmount,
    lumpSum: s.lumpSum ? formatCurrency(s.lumpSum) : '—',
    period: `${s.startDate ? formatDate(s.startDate) : '—'} → ${s.endDate ? formatDate(s.endDate) : '∞'}`,
  }))
)

function editStream(stream: FinancialStream) {
  editingStream.value = stream
  showForm.value = true
}

function handleSave(data: Omit<FinancialStream, 'id'>) {
  if (editingStream.value) {
    financialStore.updateStream(editingStream.value.id, data)
  } else {
    financialStore.addStream({
      id: Math.random().toString(36).slice(2, 9),
      ...data,
    })
  }
  editingStream.value = null
}
</script>
