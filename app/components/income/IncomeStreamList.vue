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
        <UButton
          color="primary"
          variant="soft"
          icon="i-heroicons-plus-circle"
          label="Toevoegen"
          @click="showForm = true"
        />
      </div>
    </template>

    <div v-if="financialStore.streams.length === 0" class="py-12 text-center">
      <div class="flex size-14 mx-auto items-center justify-center rounded-xl bg-(--ui-bg-elevated) mb-3">
        <UIcon name="i-heroicons-inbox" class="size-7 text-(--ui-text-dimmed)" />
      </div>
      <p class="text-sm font-medium text-(--ui-text-muted)">Nog geen inkomstenbronnen toegevoegd.</p>
      <p class="text-xs text-(--ui-text-dimmed) mt-1">Klik op 'Toevoegen' om te beginnen.</p>
    </div>

    <template v-else>
      <!-- Card-style rows for savings/loan streams with account details -->
      <div
        v-for="s in accountStreams"
        :key="s.id"
        class="flex items-center gap-4 px-4 py-4 border-b border-(--ui-border) last:border-b-0"
      >
        <!-- Icon + account info -->
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-green-600 text-green-600">
            <UIcon name="i-heroicons-banknotes" class="size-5" />
          </div>
          <div class="min-w-0">
            <p class="font-semibold text-(--ui-text-highlighted) truncate">
              {{ s.accountName || s.label }}
            </p>
            <p v-if="s.accountNumber" class="text-xs text-(--ui-text-muted) font-mono">
              {{ formatIban(s.accountNumber) }}
            </p>
            <p v-if="s.accountName && s.label" class="text-xs text-(--ui-text-dimmed)">
              {{ s.label }}
            </p>
          </div>
        </div>

        <!-- Interest + accrued info -->
        <div class="hidden sm:block flex-1 text-sm text-(--ui-text-muted) space-y-0.5">
          <p v-if="s.interestRate !== undefined">
            Rentepercentage: {{ formatPercent(s.interestRate) }} op jaarbasis
          </p>
          <p v-if="accruedInterest(s) !== null">
            Opgebouwde rente: <span class="font-medium">{{ formatCurrency(accruedInterest(s)!) }}</span>
          </p>
          <p v-if="s.startDate" class="text-xs">
            {{ formatDate(s.startDate) }} → {{ s.endDate ? formatDate(s.endDate) : '∞' }}
          </p>
        </div>

        <!-- Balance -->
        <div class="text-right shrink-0">
          <p class="font-semibold text-(--ui-text-highlighted)">
            {{ s.lumpSum ? formatCurrency(s.lumpSum) : formatCurrency(s.monthlyAmount) }}
          </p>
        </div>

        <!-- Actions -->
        <div class="flex gap-1 shrink-0">
          <UButton
            icon="i-heroicons-pencil-square"
            color="neutral"
            variant="ghost"
            size="xs"
            @click="editStream(s)"
          />
          <UButton
            icon="i-heroicons-trash"
            color="error"
            variant="ghost"
            size="xs"
            @click="financialStore.removeStream(s.id)"
          />
        </div>
      </div>

      <!-- Total savings balance (shown only when there are multiple savings/loan streams) -->
      <div
        v-if="accountStreams.length > 1"
        class="flex items-center justify-between px-4 py-3 bg-(--ui-bg-elevated) border-b border-(--ui-border)"
      >
        <span class="text-sm font-medium text-(--ui-text-muted)">Totaal spaarsaldo (incl. opgebouwde rente)</span>
        <span class="font-semibold text-(--ui-text-highlighted)">{{ formatCurrency(totalSavings) }}</span>
      </div>

      <!-- Table for all other streams -->
      <UTable v-if="tableData.length > 0" :data="tableData" :columns="columns">
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
    </template>

    <IncomeStreamForm
      v-if="showForm"
      :key="editingStream?.id ?? 'new'"
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
const { formatCurrency, formatDate, formatIban } = useFormatting()

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

function formatPercent(value: number): string {
  return new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + '%'
}

/**
 * Simple interest accrued from startDate to today:
 * lumpSum × (interestRate / 100) × (days elapsed / 365)
 * Returns null when any required input is missing.
 */
function accruedInterest(s: FinancialStream): number | null {
  if (!s.lumpSum || s.interestRate === undefined || !s.startDate) return null
  const start = new Date(s.startDate).getTime()
  const now = Date.now()
  if (now <= start) return null
  const daysElapsed = (now - start) / (1000 * 60 * 60 * 24)
  return s.lumpSum * (s.interestRate / 100) * (daysElapsed / 365)
}

// Streams with account details rendered as cards
const accountStreams = computed(() =>
  financialStore.streams.filter(s => ['savings', 'loan'].includes(s.type))
)

// Sum of lumpSum + accrued interest across all savings/loan streams
const totalSavings = computed(() =>
  accountStreams.value.reduce((sum, s) => {
    const base = s.lumpSum ?? 0
    const interest = accruedInterest(s) ?? 0
    return sum + base + interest
  }, 0)
)

// All other streams rendered in the table
const otherStreams = computed(() =>
  financialStore.streams.filter(s => !['savings', 'loan'].includes(s.type))
)

const columns: TableColumn[] = [
  { accessorKey: 'typeLabel', header: 'Type', id: 'type' },
  { accessorKey: 'label', header: 'Omschrijving' },
  { accessorKey: 'monthly', header: 'Maandelijks', id: 'monthly' },
  { accessorKey: 'lumpSum', header: 'Eenmalig' },
  { accessorKey: 'period', header: 'Periode' },
  { id: 'actions', header: '' },
]

const tableData = computed(() =>
  otherStreams.value.map((s) => ({
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
