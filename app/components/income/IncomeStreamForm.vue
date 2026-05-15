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

        <form class="space-y-4" @submit.prevent="handleSubmit">
          <UFormField label="Type">
            <USelect v-model="form.type" :items="typeOptions" />
          </UFormField>

          <UFormField label="Omschrijving" hint="Optioneel">
            <UInput v-model="form.label" placeholder="bijv. Salaris werkgever" />
          </UFormField>

          <template v-if="showAccountFields">
            <UFormField label="Naam van de rekening">
              <UInput v-model="form.accountName" placeholder="bijv. Gouden Internet Rekening" />
            </UFormField>

            <UFormField label="Rekeningnummer (IBAN)">
              <UInput v-model="form.accountNumber" placeholder="bijv. NL49 UGBI 2018 6366 69" />
            </UFormField>

            <UFormField label="Rentepercentage op jaarbasis (%)">
              <UInput
                v-model.number="form.interestRate"
                type="number"
                step="0.01"
                min="0"
                placeholder="bijv. 2.80"
              />
            </UFormField>
          </template>

          <UFormField label="Maandelijks bedrag (€)">
            <UInput v-model.number="form.monthlyAmount" type="number" step="0.01" icon="i-heroicons-currency-euro" />
          </UFormField>

          <UFormField v-if="showLumpSum" label="Eenmalig bedrag (€)">
            <UInput v-model.number="form.lumpSum" type="number" step="0.01" icon="i-heroicons-currency-euro" />
          </UFormField>

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Startdatum">
              <UInput v-model="form.startDate" type="date" />
            </UFormField>
            <UFormField label="Einddatum">
              <UInput v-model="form.endDate" type="date" />
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
  accountName: '',
  accountNumber: '',
  interestRate: undefined as number | undefined,
})

const showLumpSum = computed(() =>
  ['savings', 'loan', 'stocks'].includes(form.type)
)

// Show account/interest fields for savings and loan streams
const showAccountFields = computed(() =>
  ['savings', 'loan'].includes(form.type)
)

if (props.editing) {
  form.type = props.editing.type
  form.label = props.editing.label
  form.monthlyAmount = props.editing.monthlyAmount
  form.lumpSum = props.editing.lumpSum
  form.startDate = props.editing.startDate ?? ''
  form.endDate = props.editing.endDate ?? ''
  form.accountName = props.editing.accountName ?? ''
  form.accountNumber = props.editing.accountNumber ?? ''
  form.interestRate = props.editing.interestRate
}

function handleSubmit() {
  emit('save', {
    type: form.type,
    label: form.label,
    monthlyAmount: form.monthlyAmount,
    lumpSum: showLumpSum.value ? form.lumpSum : undefined,
    startDate: form.startDate || undefined,
    endDate: form.endDate || undefined,
    accountName: showAccountFields.value && form.accountName ? form.accountName : undefined,
    accountNumber: showAccountFields.value && form.accountNumber ? form.accountNumber : undefined,
    interestRate: showAccountFields.value && form.interestRate !== undefined ? form.interestRate : undefined,
  })
  open.value = false
}
</script>
