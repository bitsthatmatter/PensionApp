import { defineStore } from 'pinia'
import type { PensionOverview, PensionPeriod, PensionProvider, PartnerPensionPeriod, Age } from '~/types/financial'

const STORAGE_KEY = 'retirement-planner-pension'

function parseAge(obj: { Jaren: number; Maanden: number } | undefined): Age | undefined {
  if (!obj) return undefined
  return { years: obj.Jaren, months: obj.Maanden }
}

// Minimal shape of the raw MijnPensioenoverzicht JSON — only the fields we access.
// Full schema: see AGENTS.md § Data formats › MijnPensioenoverzicht JSON.
type RawPeriod = Record<string, unknown>
type RawJson = { Totalen?: Record<string, unknown>; Details?: Record<string, unknown> }

function asArray(val: unknown): RawPeriod[] {
  return Array.isArray(val) ? (val as RawPeriod[]) : []
}

function asRecord(val: unknown): RawPeriod {
  return (val != null && typeof val === 'object' ? val : {}) as RawPeriod
}

function parsePensionJson(data: RawJson): PensionOverview {
  const totalen = asRecord(data.Totalen)
  const details = asRecord(data.Details)

  // Parse ouderdomspensioen periods from totals
  const ouderdomsPensioen: PensionPeriod[] = asArray(
    asRecord(totalen.OuderdomsPensioenTotalen).OuderdomsPensioenTotaal,
  ).flatMap((period) => {
    const fromAge = parseAge(asRecord(period.Van).Leeftijd as { Jaren: number; Maanden: number } | undefined)
    if (!fromAge) return []
    const toAge = parseAge(asRecord(period.Tot).Leeftijd as { Jaren: number; Maanden: number } | undefined)
    const toEvent = asRecord(period.Tot).OuderdomsPensioenEvent as string | undefined

    return [{
      fromAge,
      toAge,
      toEvent,
      pension: (period.Pensioen as number) ?? 0,
      indicatiefPensioen: period.IndicatiefPensioen as number | undefined,
      aowSamenwonend: period.AOWSamenwonend as number | undefined,
      aowAlleenstaand: period.AOWAlleenstaand as number | undefined,
    }]
  })

  // Extract AOW amounts from the first period that has them
  const aowPeriod = ouderdomsPensioen.find(p => p.aowSamenwonend != null)
  const aow = {
    samenwonend: aowPeriod?.aowSamenwonend ?? 0,
    alleenstaand: aowPeriod?.aowAlleenstaand ?? 0,
  }

  // Extract individual providers from details
  const providers: PensionProvider[] = []
  const detailPeriods = asArray(asRecord(details.OuderdomsPensioenDetails).OuderdomsPensioen)

  for (const period of detailPeriods) {
    const fromAge = parseAge(asRecord(period.Van).Leeftijd as { Jaren: number; Maanden: number } | undefined)
    if (!fromAge) continue

    const pensionItems: RawPeriod[] = [
      ...asArray(period.Pensioen),
      ...asArray(period.IndicatiefPensioen),
    ]

    for (const item of pensionItems) {
      const name = item.PensioenUitvoerder as string | undefined
      const amount = (item.TeBereiken ?? item.Opgebouwd ?? 0) as number
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
  const partnerPensioen: PartnerPensionPeriod[] = asArray(
    asRecord(totalen.PartnerPensioenTotalen).PartnerPensioenTotaal,
  ).map((period) => {
    const fromAge = parseAge(asRecord(period.Van).Leeftijd as { Jaren: number; Maanden: number } | undefined)
    const fromEvent = asRecord(period.Van).PartnerEvent as string | undefined
    const toAge = parseAge(asRecord(period.Tot).Leeftijd as { Jaren: number; Maanden: number } | undefined)
    const toEvent = asRecord(period.Tot).PartnerEvent as string | undefined
    // period.Pensioen here is a nested object { VerzekerdBedrag, OpgebouwdBedrag },
    // distinct from the numeric period.Pensioen field in ouderdomspensioen periods.
    const pensioenBedragen = asRecord(period.Pensioen)

    return {
      fromAge,
      fromEvent,
      toAge,
      toEvent,
      verzekerdBedrag: (pensioenBedragen.VerzekerdBedrag as number) ?? 0,
      opgebouwdBedrag: (pensioenBedragen.OpgebouwdBedrag as number) ?? 0,
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
      try { pensionData.value = JSON.parse(saved) } catch { /* ignore corrupt data */ }
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
      const json = JSON.parse(text) as RawJson & { StatusCode?: string }

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
