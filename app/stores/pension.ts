import { defineStore } from 'pinia'
import type { PensionOverview, PensionPeriod, PensionProvider, PartnerPensionPeriod, Age } from '~/types/financial'

const STORAGE_KEY = 'retirement-planner-pension'

function parseAge(obj: { Jaren: number; Maanden: number } | undefined): Age | undefined {
  if (!obj) return undefined
  return { years: obj.Jaren, months: obj.Maanden }
}

function parsePensionJson(data: any): PensionOverview {
  const totalen = data.Totalen
  const details = data.Details

  // Parse ouderdomspensioen periods from totals
  const ouderdomsPensioen: PensionPeriod[] = (
    totalen?.OuderdomsPensioenTotalen?.OuderdomsPensioenTotaal ?? []
  ).map((period: any) => {
    const fromAge = parseAge(period.Van?.Leeftijd)!
    const toAge = parseAge(period.Tot?.Leeftijd)
    const toEvent = period.Tot?.OuderdomsPensioenEvent as string | undefined

    return {
      fromAge,
      toAge,
      toEvent,
      pension: period.Pensioen ?? 0,
      indicatiefPensioen: period.IndicatiefPensioen,
      aowSamenwonend: period.AOWSamenwonend,
      aowAlleenstaand: period.AOWAlleenstaand,
    }
  })

  // Extract AOW amounts from the first period that has them
  const aowPeriod = ouderdomsPensioen.find(p => p.aowSamenwonend != null)
  const aow = {
    samenwonend: aowPeriod?.aowSamenwonend ?? 0,
    alleenstaand: aowPeriod?.aowAlleenstaand ?? 0,
  }

  // Extract individual providers from details
  const providers: PensionProvider[] = []
  const detailPeriods = details?.OuderdomsPensioenDetails?.OuderdomsPensioen ?? []

  for (const period of detailPeriods) {
    const fromAge = parseAge(period.Van?.Leeftijd)
    if (!fromAge) continue

    const pensionItems = [
      ...(period.Pensioen ?? []),
      ...(period.IndicatiefPensioen ?? []),
    ]

    for (const item of pensionItems) {
      const name = item.PensioenUitvoerder
      const amount = item.TeBereiken ?? item.Opgebouwd ?? 0
      if (!name || amount === 0) continue

      // Only add if we haven't seen this provider at this age
      const exists = providers.some(
        p => p.name === name && p.startAge.years === fromAge.years && p.startAge.months === fromAge.months
      )
      if (!exists) {
        providers.push({ name, annualAmount: amount, startAge: fromAge })
      }
    }
  }

  // Parse partner pension
  const partnerPensioen: PartnerPensionPeriod[] = (
    totalen?.PartnerPensioenTotalen?.PartnerPensioenTotaal ?? []
  ).map((period: any) => {
    const fromAge = parseAge(period.Van?.Leeftijd)
    const fromEvent = period.Van?.PartnerEvent as string | undefined
    const toAge = parseAge(period.Tot?.Leeftijd)
    const toEvent = period.Tot?.PartnerEvent as string | undefined
    const pensioen = period.Pensioen ?? {}

    return {
      fromAge,
      fromEvent,
      toAge,
      toEvent,
      verzekerdBedrag: pensioen.VerzekerdBedrag ?? 0,
      opgebouwdBedrag: pensioen.OpgebouwdBedrag ?? 0,
    }
  })

  return { providers, aow, ouderdomsPensioen, partnerPensioen }
}

export const usePensionStore = defineStore('pension', () => {
  const pensionData = ref<PensionOverview | null>(null)
  const error = ref<string | null>(null)
  const isLoading = ref(false)

  function load() {
    if (import.meta.server) return
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try { pensionData.value = JSON.parse(saved) } catch {}
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

  async function uploadPensionFile(file: File) {
    error.value = null
    isLoading.value = true

    try {
      const text = await file.text()
      const json = JSON.parse(text)

      if (json.StatusCode !== '000') {
        throw new Error(`Pension data has error status: ${json.StatusCode}`)
      }

      pensionData.value = parsePensionJson(json)
      save()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to parse pension file'
      pensionData.value = null
    } finally {
      isLoading.value = false
    }
  }

  function clear() {
    pensionData.value = null
    error.value = null
    save()
  }

  load()

  return {
    pensionData,
    error,
    isLoading,
    uploadPensionFile,
    clear,
  }
})
