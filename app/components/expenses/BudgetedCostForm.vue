<template>
  <UModal v-model:open="open">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-(--ui-text-highlighted)">
              {{ editing ? 'Kosten bewerken' : 'Kosten toevoegen' }}
            </h3>
            <UButton icon="i-heroicons-x-mark" color="neutral" variant="ghost" size="sm" @click="open = false" />
          </div>
        </template>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <UFormField label="Omschrijving">
            <UInput v-model="form.label" placeholder="bijv. Auto kopen, Vakantie" required />
          </UFormField>

          <UFormField label="Bedrag (€)">
            <UInput type="number" step="0.01" min="0" v-model.number="form.amount" icon="i-heroicons-currency-euro" required />
          </UFormField>

          <UFormField label="Herhaling">
            <USelect v-model="form.recurring" :items="recurringOptions" />
          </UFormField>

          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="form.recurring === 'once' ? 'Datum' : 'Startdatum'">
              <UInput type="date" v-model="form.date" required />
            </UFormField>
            <UFormField v-if="form.recurring !== 'once'" label="Einddatum (optioneel)">
              <UInput type="date" v-model="form.endDate" />
            </UFormField>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <UButton color="neutral" variant="soft" label="Annuleren" @click="open = false" />
            <UButton type="submit" :label="editing ? 'Opslaan' : 'Toevoegen'" icon="i-heroicons-check" />
          </div>
        </form>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { BudgetedCost, RecurringType } from '~/types/financial'

const props = defineProps<{
  editing?: BudgetedCost | null
}>()

const emit = defineEmits<{
  save: [cost: Omit<BudgetedCost, 'id'>]
}>()

const open = defineModel<boolean>('open', { default: true })

const recurringOptions = [
  { label: 'Eenmalig', value: 'once' },
  { label: 'Maandelijks', value: 'monthly' },
  { label: 'Jaarlijks', value: 'yearly' },
]

const form = reactive({
  label: '',
  amount: 0,
  recurring: 'once' as RecurringType,
  date: '',
  endDate: '',
})

if (props.editing) {
  form.label = props.editing.label
  form.amount = props.editing.amount
  form.recurring = props.editing.recurring
  form.date = props.editing.date
  form.endDate = props.editing.endDate ?? ''
}

function handleSubmit() {
  emit('save', {
    label: form.label,
    amount: form.amount,
    recurring: form.recurring,
    date: form.date,
    endDate: form.endDate || undefined,
  })
  open.value = false
}
</script>
