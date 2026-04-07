<template>
  <UCard v-if="transactions.length" variant="outline">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="flex size-9 items-center justify-center rounded-lg bg-(--ui-primary)/10">
          <UIcon name="i-heroicons-table-cells" class="size-5 text-(--ui-primary)" />
        </div>
        <h3 class="text-base font-semibold text-(--ui-text-highlighted)">Transacties ({{ transactions.length }})</h3>
      </div>
    </template>

    <UTable :data="tableData" :columns="columns">
      <template #amount-cell="{ row }">
        <span
          :class="row.original.amountRaw < 0 ? 'text-red-500' : 'text-green-500'"
          class="font-mono text-sm"
        >
          {{ row.original.amount }}
        </span>
      </template>
      <template #balance-cell="{ row }">
        <span class="font-mono text-sm">{{ row.original.balance }}</span>
      </template>
    </UTable>
  </UCard>
</template>

<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

const { transactions } = useTransactions()
const { formatCurrency } = useFormatting()

const columns: TableColumn[] = [
  { accessorKey: 'date', header: 'Datum' },
  { accessorKey: 'description', header: 'Omschrijving' },
  { accessorKey: 'amount', header: 'Bedrag', id: 'amount' },
  { accessorKey: 'balance', header: 'Eindsaldo', id: 'balance' },
]

const tableData = computed(() =>
  transactions.value.map((tx) => ({
    date: tx.transactionDate,
    description: tx.description,
    amount: formatCurrency(tx.amount),
    amountRaw: tx.amount,
    balance: formatCurrency(tx.closingBalance),
  }))
)
</script>
