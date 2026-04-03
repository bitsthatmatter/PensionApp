<template>
  <main class="page">
    <h1>Transactions</h1>

    <TransactionUpload />

    <table v-if="transactions.length" class="transaction-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Amount</th>
          <th>Closing balance</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(tx, index) in transactions" :key="index">
          <td>{{ tx.transactionDate }}</td>
          <td>{{ tx.description }}</td>
          <td :class="tx.amount < 0 ? 'negative' : 'positive'">
            {{ formatAmount(tx.amount, tx.currency) }}
          </td>
          <td>{{ formatAmount(tx.closingBalance, tx.currency) }}</td>
        </tr>
      </tbody>
    </table>
  </main>
</template>

<script setup lang="ts">
const { transactions } = useTransactions()

function formatAmount(value: number, currency: string): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: currency || 'EUR',
  }).format(value)
}
</script>

<style scoped>
.page {
  max-width: 960px;
  margin: 2rem auto;
  padding: 0 1rem;
  font-family: sans-serif;
}

h1 {
  margin-bottom: 1.5rem;
}

.transaction-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1.5rem;
  font-size: 0.9rem;
}

.transaction-table th,
.transaction-table td {
  text-align: left;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #ddd;
}

.transaction-table th {
  background: #f5f5f5;
  font-weight: 600;
}

.negative { color: #c0392b; }
.positive { color: #27ae60; }
</style>
