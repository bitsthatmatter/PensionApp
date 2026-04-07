/**
 * Pinia store: annuiteitsScenarios
 *
 * Beheert de invoer voor pensioenberekeningen en berekent alle scenario's
 * als computed properties. Geen API-calls nodig — alles client-side.
 */

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  calculateAllScenarios,
  formatEurocents,
  euroToEurocents,
  remainingLifeExpectancy,
  type Gender,
  type AnnuityResult,
} from '~/domain/annuity-domain'

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
