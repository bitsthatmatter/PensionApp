<template>
  <UCard variant="outline">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="flex size-9 items-center justify-center rounded-lg bg-(--ui-primary)/10">
            <UIcon name="i-heroicons-calendar" class="size-5 text-(--ui-primary)" />
          </div>
          <h3 class="text-base font-semibold text-(--ui-text-highlighted)">Geplande kosten</h3>
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

    <div v-if="financialStore.budgetedCosts.length === 0" class="py-12 text-center">
      <div class="flex size-14 mx-auto items-center justify-center rounded-xl bg-(--ui-bg-elevated) mb-3">
        <UIcon name="i-heroicons-currency-euro" class="size-7 text-(--ui-text-dimmed)" />
      </div>
      <p class="text-sm font-medium text-(--ui-text-muted)">Nog geen geplande kosten.</p>
      <p class="text-xs text-(--ui-text-dimmed) mt-1">Voeg kosten toe zoals een auto, vakantie of verbouwing.</p>
    </div>

    <UTable v-else :data="tableData" :columns="columns">
      <template #amount-cell="{ row }">
        <span class="font-mono text-sm text-red-500">{{ row.original.amountFormatted }}</span>
      </template>
      <template #recurring-cell="{ row }">
        <UBadge color="neutral" variant="subtle" size="sm">{{ row.original.recurringLabel }}</UBadge>
      </template>
      <template #actions-cell="{ row }">
        <div class="flex gap-1">
          <UButton icon="i-heroicons-pencil-square" color="neutral" variant="ghost" size="xs" @click="editCost(row.original.raw)" />
          <UButton icon="i-heroicons-trash" color="error" variant="ghost" size="xs" @click="financialStore.removeBudgetedCost(row.original.raw.id)" />
        </div>
      </template>
    </UTable>

    <ExpensesBudgetedCostForm
      v-if="showForm"
      v-model:open="showForm"
      :editing="editingCost"
      @save="handleSave"
    />
  </UCard>
</template>

<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { BudgetedCost, RecurringType } from '~/types/financial'
import { useFinancialStore } from '~/stores/financial'

const financialStore = useFinancialStore()
const { formatCurrency, formatDate } = useFormatting()

const showForm = ref(false)
const editingCost = ref<BudgetedCost | null>(null)

const recurringLabels: Record<RecurringType, string> = {
  once: 'Eenmalig',
  monthly: 'Maandelijks',
  yearly: 'Jaarlijks',
}

const columns: TableColumn[] = [
  { accessorKey: 'label', header: 'Omschrijving' },
  { accessorKey: 'amountFormatted', header: 'Bedrag', id: 'amount' },
  { accessorKey: 'recurringLabel', header: 'Type', id: 'recurring' },
  { accessorKey: 'period', header: 'Datum' },
  { id: 'actions', header: '' },
]

const tableData = computed(() =>
  financialStore.budgetedCosts.map((c) => ({
    raw: c,
    label: c.label,
    amountFormatted: formatCurrency(c.amount),
    recurringLabel: recurringLabels[c.recurring],
    period: `${formatDate(c.date)}${c.endDate ? ` → ${formatDate(c.endDate)}` : ''}`,
  }))
)

function editCost(cost: BudgetedCost) {
  editingCost.value = cost
  showForm.value = true
}

function handleSave(data: Omit<BudgetedCost, 'id'>) {
  if (editingCost.value) {
    financialStore.updateBudgetedCost(editingCost.value.id, data)
  } else {
    financialStore.addBudgetedCost({
      id: Math.random().toString(36).slice(2, 9),
      ...data,
    })
  }
  editingCost.value = null
}
</script>
