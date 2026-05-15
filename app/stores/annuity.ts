/**
 * Pinia store: annuiteitsScenarios
 *
 * Beheert de invoer voor pensioenberekeningen en berekent alle scenario's
 * als computed properties. Geen API-calls nodig — alles client-side.
 */

import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import {
  calculateAllScenarios,
  remainingLifeExpectancy,
  type Gender,
  type AnnuityResult,
} from '~/domain/annuity-domain'
import { euroToEurocents } from '~/domain/money'
import { useFormatting } from '~/composables/useFormatting'

const STORAGE_KEY = 'retirement-planner-annuity'

interface PersistedAnnuityState {
  capitalEuro: number
  retirementAge: number
  gender: Gender
  customDiscountRate: number | null
}

export const useAnnuityStore = defineStore('annuity', () => {

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  /** Opgebouwd pensioenkapitaal in euro (gebruikersinvoer) */
  const capitalEuro = ref<number>(200_000)

  /** Pensioenleeftijd */
  const retirementAge = ref<number>(67)

  /** Geslacht — bepaalt sterftetafel */
  const gender = ref<Gender>('male')

  /**
   * Aangepaste rekenrente (decimaal, bijv. 0.035).
   * null = alleen standaardscenario's tonen.
   */
  const customDiscountRate = ref<number | null>(null)

  // -------------------------------------------------------------------------
  // Persistence
  // -------------------------------------------------------------------------

  function load() {
    if (import.meta.server) return
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as PersistedAnnuityState
        capitalEuro.value = parsed.capitalEuro ?? 200_000
        retirementAge.value = parsed.retirementAge ?? 67
        gender.value = parsed.gender ?? 'male'
        customDiscountRate.value = parsed.customDiscountRate ?? null
      } catch { /* ignore corrupt data */ }
    }
  }

  function save() {
    if (import.meta.server) return
    const state: PersistedAnnuityState = {
      capitalEuro: capitalEuro.value,
      retirementAge: retirementAge.value,
      gender: gender.value,
      customDiscountRate: customDiscountRate.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }

  // -------------------------------------------------------------------------
  // Computed: afgeleid uit state
  // -------------------------------------------------------------------------

  const capitalEurocents = computed(() => euroToEurocents(capitalEuro.value))

  /**
   * Alle scenarioresultaten — pessimistisch / neutraal / optimistisch
   * + eventueel custom. Worden opnieuw berekend zodra één van de
   * invoerwaarden wijzigt.
   */
  const scenarioResults = computed<AnnuityResult[]>(() =>
    calculateAllScenarios(
      capitalEurocents.value,
      retirementAge.value,
      gender.value,
      customDiscountRate.value ?? undefined,
    ),
  )

  /** Neutraal scenario als primair resultaat (voor samenvatting) */
  const primaryResult = computed<AnnuityResult | undefined>(() =>
    scenarioResults.value.find((r) => r.scenario.key === 'neutral'),
  )

  /** Resterende levensverwachting (informatief, geen rekenrente nodig) */
  const lifeExpectancy = computed(() =>
    remainingLifeExpectancy(retirementAge.value, gender.value),
  )

  const { formatEurocents } = useFormatting()

  /** Geformatteerde weergave van het kapitaal */
  const capitalFormatted = computed(() => formatEurocents(capitalEurocents.value))

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  function setCapital(euro: number) {
    capitalEuro.value = Math.max(0, Math.round(euro))
  }

  function setRetirementAge(age: number) {
    retirementAge.value = Math.min(75, Math.max(55, age))
  }

  function setGender(g: Gender) {
    gender.value = g
  }

  /**
   * Stel een aangepaste rekenrente in als extra scenario.
   * @param ratePercent  Bijv. 3.5 voor 3,5%
   */
  function setCustomDiscountRate(ratePercent: number | null) {
    if (ratePercent === null) {
      customDiscountRate.value = null
      return
    }
    // Begrens op realistisch bereik 0–10%
    customDiscountRate.value = Math.min(0.10, Math.max(0, ratePercent / 100))
  }

  function clearCustomDiscountRate() {
    customDiscountRate.value = null
  }

  load()

  watch([capitalEuro, retirementAge, gender, customDiscountRate], save)

  return {
    // state (readonly via store interface)
    capitalEuro,
    retirementAge,
    gender,
    customDiscountRate,

    // computed
    capitalEurocents,
    scenarioResults,
    primaryResult,
    lifeExpectancy,
    capitalFormatted,

    // actions
    setCapital,
    setRetirementAge,
    setGender,
    setCustomDiscountRate,
    clearCustomDiscountRate,
  }
})
