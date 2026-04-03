<template>
  <div class="transaction-upload">
    <label class="upload-label">
      <span>Upload XLS / XLSX file</span>
      <input
        type="file"
        accept=".xls,.xlsx"
        class="upload-input"
        @change="handleFileUpload"
      />
    </label>

    <p v-if="isLoading" class="status-loading">Processing file...</p>
    <p v-if="error" class="status-error">{{ error }}</p>
    <p v-if="!isLoading && transactions.length" class="status-success">
      {{ transactions.length }} transactions loaded.
    </p>
  </div>
</template>

<script setup lang="ts">
const { parseFile, transactions, error, isLoading } = useTransactions()

async function handleFileUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  await parseFile(file)
}
</script>

<style scoped>
.transaction-upload {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.upload-label {
  display: inline-flex;
  flex-direction: column;
  gap: 0.25rem;
  font-weight: 600;
  cursor: pointer;
}

.upload-input {
  font-weight: normal;
  cursor: pointer;
}

.status-loading { color: #666; }
.status-error   { color: #c0392b; }
.status-success { color: #27ae60; }
</style>
