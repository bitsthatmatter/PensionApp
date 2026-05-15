import { defineStore } from 'pinia'
import type { Pensioenoverzicht } from '~/types/pensioenoverzicht'

const STORAGE_KEY = 'retirement-planner-pension'
const PARTNER_STORAGE_KEY = 'retirement-planner-pension-partner'

async function parseAndValidate(file: File): Promise<Pensioenoverzicht> {
  const text = await file.text()
  const json = JSON.parse(text) as Pensioenoverzicht
  if (json.StatusCode !== '000') {
    throw new Error(`Pension data has error status: ${json.StatusCode}`)
  }
  return json
}

export const usePensionStore = defineStore('pension', () => {
  const pensionData = ref<Pensioenoverzicht | null>(null)
  const partnerPensionData = ref<Pensioenoverzicht | null>(null)
  const error = ref<string | null>(null)
  const partnerError = ref<string | null>(null)
  const isLoading = ref(false)
  const isPartnerLoading = ref(false)

  function load() {
    if (import.meta.server) return
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try { pensionData.value = JSON.parse(saved) } catch { /* ignore corrupt data */ }
    }
    const savedPartner = localStorage.getItem(PARTNER_STORAGE_KEY)
    if (savedPartner) {
      try { partnerPensionData.value = JSON.parse(savedPartner) } catch { /* ignore corrupt data */ }
    }
  }

  function save() {
    if (import.meta.server) return
    if (pensionData.value) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pensionData.value))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  function savePartner() {
    if (import.meta.server) return
    if (partnerPensionData.value) {
      localStorage.setItem(PARTNER_STORAGE_KEY, JSON.stringify(partnerPensionData.value))
    } else {
      localStorage.removeItem(PARTNER_STORAGE_KEY)
    }
  }

  async function uploadPensionFile(file: File) {
    error.value = null
    isLoading.value = true
    try {
      pensionData.value = await parseAndValidate(file)
      save()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to parse pension file'
      pensionData.value = null
    } finally {
      isLoading.value = false
    }
  }

  async function uploadPartnerPensionFile(file: File) {
    partnerError.value = null
    isPartnerLoading.value = true
    try {
      partnerPensionData.value = await parseAndValidate(file)
      savePartner()
    } catch (e) {
      partnerError.value = e instanceof Error ? e.message : 'Failed to parse partner pension file'
      partnerPensionData.value = null
    } finally {
      isPartnerLoading.value = false
    }
  }

  function clear() {
    pensionData.value = null
    error.value = null
    save()
  }

  function clearPartner() {
    partnerPensionData.value = null
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
    clear,
    clearPartner,
  }
})
