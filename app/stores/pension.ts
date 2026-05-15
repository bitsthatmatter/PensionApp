import { defineStore } from 'pinia'
import type { Age } from '~/types/financial'
import type { Pensioenoverzicht } from '~/types/pensioenoverzicht'
import { deriveIngangsdatum } from '~/domain/pension-overview'
import { ageToMonths } from '~/domain/age'

const STORAGE_KEY = 'retirement-planner-pension'
const PARTNER_STORAGE_KEY = 'retirement-planner-pension-partner'
const MAX_OVERVIEWS = 3

async function parseAndValidate(file: File): Promise<Pensioenoverzicht> {
  const text = await file.text()

  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('Het bestand is geen geldig JSON-bestand.')
  }

  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Het bestand heeft een onverwachte structuur.')
  }

  const obj = raw as Record<string, unknown>

  if (obj['StatusCode'] !== '000') {
    throw new Error(`Het pensioenoverzicht bevat een foutmelding (statuscode ${obj['StatusCode'] ?? 'onbekend'}). Controleer of u het juiste bestand heeft geüpload.`)
  }

  const totalen = obj['Totalen'] as Record<string, unknown> | undefined
  const ouderdomsTotalen = totalen?.['OuderdomsPensioenTotalen'] as Record<string, unknown> | undefined
  const totaalArray = ouderdomsTotalen?.['OuderdomsPensioenTotaal']

  if (!Array.isArray(totaalArray)) {
    throw new Error('Het bestand mist de verwachte pensioengegevens (OuderdomsPensioenTotaal). Controleer of u het juiste bestand van mijnpensioenoverzicht.nl heeft geüpload.')
  }

  return raw as Pensioenoverzicht
}

function agesEqual(a: Age, b: Age): boolean {
  return a.years === b.years && a.months === b.months
}

function upsertOverzicht(list: Pensioenoverzicht[], overzicht: Pensioenoverzicht): Pensioenoverzicht[] {
  const ingangsdatum = deriveIngangsdatum(overzicht)
  const existing = list.findIndex(o => {
    try {
      return agesEqual(deriveIngangsdatum(o), ingangsdatum)
    } catch {
      return false
    }
  })
  if (existing !== -1) {
    const updated = [...list]
    updated[existing] = overzicht
    return updated
  }
  if (list.length >= MAX_OVERVIEWS) {
    throw new Error(`U kunt maximaal ${MAX_OVERVIEWS} pensioenoverzichten uploaden.`)
  }
  const updated = [...list, overzicht]
  updated.sort((a, b) => {
    try {
      return ageToMonths(deriveIngangsdatum(a)) - ageToMonths(deriveIngangsdatum(b))
    } catch {
      return 0
    }
  })
  return updated
}

export const usePensionStore = defineStore('pension', () => {
  const pensionData = ref<Pensioenoverzicht[]>([])
  const partnerPensionData = ref<Pensioenoverzicht[]>([])
  const error = ref<string | null>(null)
  const partnerError = ref<string | null>(null)
  const isLoading = ref(false)
  const isPartnerLoading = ref(false)

  function load() {
    if (import.meta.server) return
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        pensionData.value = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : [])
      } catch { /* ignore corrupt data */ }
    }
    const savedPartner = localStorage.getItem(PARTNER_STORAGE_KEY)
    if (savedPartner) {
      try {
        const parsed = JSON.parse(savedPartner)
        partnerPensionData.value = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : [])
      } catch { /* ignore corrupt data */ }
    }
  }

  function save() {
    if (import.meta.server) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pensionData.value))
  }

  function savePartner() {
    if (import.meta.server) return
    localStorage.setItem(PARTNER_STORAGE_KEY, JSON.stringify(partnerPensionData.value))
  }

  async function uploadPensionFile(file: File) {
    error.value = null
    isLoading.value = true
    try {
      const overzicht = await parseAndValidate(file)
      pensionData.value = upsertOverzicht(pensionData.value, overzicht)
      save()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Het bestand kon niet worden verwerkt.'
    } finally {
      isLoading.value = false
    }
  }

  async function uploadPartnerPensionFile(file: File) {
    partnerError.value = null
    isPartnerLoading.value = true
    try {
      const overzicht = await parseAndValidate(file)
      partnerPensionData.value = upsertOverzicht(partnerPensionData.value, overzicht)
      savePartner()
    } catch (e) {
      partnerError.value = e instanceof Error ? e.message : 'Het bestand kon niet worden verwerkt.'
    } finally {
      isPartnerLoading.value = false
    }
  }

  function removePensionFile(index: number) {
    pensionData.value = pensionData.value.filter((_, i) => i !== index)
    save()
  }

  function removePartnerPensionFile(index: number) {
    partnerPensionData.value = partnerPensionData.value.filter((_, i) => i !== index)
    savePartner()
  }

  function clear() {
    pensionData.value = []
    error.value = null
    save()
  }

  function clearPartner() {
    partnerPensionData.value = []
    partnerError.value = null
    savePartner()
  }

  load()

  return {
    pensionData,
    partnerPensionData,
    error,
    partnerError,
    isLoading,
    isPartnerLoading,
    uploadPensionFile,
    uploadPartnerPensionFile,
    removePensionFile,
    removePartnerPensionFile,
    clear,
    clearPartner,
  }
})
