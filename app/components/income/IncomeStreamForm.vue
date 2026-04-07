<template>
  <UModal v-model:open="open">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-(--ui-text-highlighted)">
              {{ editing ? 'Inkomen bewerken' : 'Inkomen toevoegen' }}
            </h3>
            <UButton
              icon="i-heroicons-x-mark"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="open = false"
            />
          </div>
        </template>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <UFormField label="Type">
            <USelect v-model="form.type" :items="typeOptions" />
          </UFormField>

          <UFormField label="Omschrijving">
            <UInput v-model="form.label" placeholder="bijv. Salaris werkgever" required />
          </UFormField>

          <UFormField label="Maandelijks bedrag (€)">
            <UInput type="number" step="0.01" v-model.number="form.monthlyAmount" icon="i-heroicons-currency-euro" />
          </UFormField>

          <UFormField v-if="showLumpSum" label="Eenmalig bedrag (€)">
            <UInput type="number" step="0.01" v-model.number="form.lumpSum" icon="i-heroicons-currency-euro" />
          </UFormField>

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Startdatum">
              <UInput type="date" v-model="form.startDate" />
            </UFormField>
            <UFormField label="Einddatum">
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
import type { FinancialStream, StreamType } from '~/types/financial'

const props = defineProps<{
  editing?: FinancialStream | null
}>()

const emit = defineEmits<{
  save: [stream: Omit<FinancialStream, 'id'>]
}>()

const open = defineModel<boolean>('open', { default: true })

const typeOptions = [
  { label: 'Salaris', value: 'salary' },
  { label: 'Spaargeld', value: 'savings' },
  { label: 'Lening (aan u)', value: 'loan' },
  { label: 'Pensioen', value: 'pension' },
  { label: 'AOW', value: 'aow' },
  { label: 'Partnerpensioen', value: 'partner-pension' },
  { label: 'Partner AOW', value: 'partner-aow' },
  { label: 'Aandelen/Beleggingen', value: 'stocks' },
  { label: 'Uitgave', value: 'expense' },
]

const form = reactive({
  type: 'salary' as StreamType,
  label: '',
  monthlyAmount: 0,
  lumpSum: undefined as number | undefined,
  startDate: '',
  endDate: '',
})

const showLumpSum = computed(() =>
  ['savings', 'loan', 'stocks'].includes(form.type)
)

if (props.editing) {
  form.type = props.editing.type
  form.label = props.editing.label
  form.monthlyAmount = props.editing.monthlyAmount
  form.lumpSum = props.editing.lumpSum
  form.startDate = props.editing.startDate ?? ''
  form.endDate = props.editing.endDate ?? ''
}

function handleSubmit() {
  emit('save', {
    type: form.type,
    label: form.label,
    monthlyAmount: form.monthlyAmount,
    lumpSum: showLumpSum.value ? form.lumpSum : undefined,
    startDate: form.startDate || undefined,
    endDate: form.endDate || undefined,
  })
  open.value = false
}
</script>
