<template>
  <UCard variant="outline">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="flex size-9 items-center justify-center rounded-lg bg-(--ui-primary)/10">
          <UIcon name="i-heroicons-document-arrow-up" class="size-5 text-(--ui-primary)" />
        </div>
        <div>
          <h3 class="text-base font-semibold text-(--ui-text-highlighted)">Transacties uploaden</h3>
          <p class="text-sm text-(--ui-text-muted)">Upload een XLS/XLSX-bestand met banktransacties</p>
        </div>
      </div>
    </template>

    <div class="space-y-3">
      <div class="flex items-center gap-3">
        <button
          class="inline-flex items-center gap-3 rounded-lg bg-(--ui-primary) px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:opacity-90 active:opacity-80"
          @click="($refs.fileInput as HTMLInputElement).click()"
        >
          <UIcon name="i-heroicons-arrow-up-tray" class="size-5" />
          Bestand kiezen (.xls, .xlsx)
        </button>
        <input
          ref="fileInput"
          type="file"
          accept=".xls,.xlsx"
          class="hidden"
          @change="handleFileUpload"
        />
      </div>

      <p v-if="isLoading" class="flex items-center gap-2 text-sm text-(--ui-text-muted)">
        <UIcon name="i-heroicons-arrow-path" class="size-4 animate-spin" />
        Bezig met verwerken...
      </p>
      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        icon="i-heroicons-exclamation-circle"
        :title="error"
      />
      <UAlert
        v-if="!isLoading && transactions.length"
        color="success"
        variant="subtle"
        icon="i-heroicons-check-circle"
        :title="`${transactions.length} transacties geladen.`"
      />
    </div>
  </UCard>
</template>

<script setup lang="ts">
const { parseFile, transactions, error, isLoading } = useTransactions()

async function handleFileUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  await parseFile(file)
}
</script>
