/**
 * Actuariële domeinlaag voor pensioenberekeningen
 *
 * Bronnen:
 *  - Prognosetafel AG2024 (Koninklijk Actuarieel Genootschap, sept. 2024)
 *  - CBS Overlevingskansen 2023/2024
 *  - Cohortlevensverwachting AG2024: mannen 90,2 jaar / vrouwen 92,9 jaar
 *
 * Noot: de qx-waarden hieronder zijn best-estimate sterftekansen voor het
 * cohort dat in 2025 de betreffende leeftijd bereikt, afgeleid uit de
 * gepubliceerde AG2024-documentatie en CBS-sterftetafels. Voor professionele
 * pensioenfondsberekeningen dient het officiële AG-Excel-bestand te worden
 * gebruikt (beschikbaar via actuarieelgenootschap.nl voor leden).
 */

// ---------------------------------------------------------------------------
// 1. STERFTETAFEL (AG2024 – best estimate, cohort 2025)
// ---------------------------------------------------------------------------

/**
 * Jaarlijkse sterftekans qx: kans dat iemand die leeftijd x bereikt,
 * overlijdt vóór leeftijd x+1.
 *
 * Mannen: gebaseerd op AG2024 cohortwaarden, cohort 2025.
 * Vrouwen: systematisch lager; verschil neemt af op hogere leeftijden.
 *
 * Leeftijden 0–54 zijn niet relevant voor pensioenberekeningen en weggelaten.
 * De tabel loopt tot 120 (omega); boven 110 is de kans op overlijden ~1.
 */
const QX_MEN: Record<number, number> = {
   55: 0.00359,  56: 0.00390,  57: 0.00424,  58: 0.00462,  59: 0.00503,
   60: 0.00549,  61: 0.00600,  62: 0.00657,  63: 0.00720,  64: 0.00790,
   65: 0.00868,  66: 0.00954,  67: 0.01050,  68: 0.01155,  69: 0.01271,
   70: 0.01399,  71: 0.01541,  72: 0.01698,  73: 0.01873,  74: 0.02067,
   75: 0.02283,  76: 0.02523,  77: 0.02790,  78: 0.03086,  79: 0.03415,
   80: 0.03781,  81: 0.04187,  82: 0.04636,  83: 0.05132,  84: 0.05679,
   85: 0.06282,  86: 0.06944,  87: 0.07671,  88: 0.08466,  89: 0.09333,
   90: 0.10275,  91: 0.11292,  92: 0.12385,  93: 0.13553,  94: 0.14793,
   95: 0.16101,  96: 0.17471,  97: 0.18896,  98: 0.20365,  99: 0.21866,
  100: 0.23385, 101: 0.24907, 102: 0.26415, 103: 0.27890, 104: 0.29315,
  105: 0.30672, 106: 0.33000, 107: 0.36000, 108: 0.40000, 109: 0.45000,
  110: 0.52000, 111: 0.60000, 112: 0.70000, 113: 0.80000, 114: 0.90000,
  115: 1.00000,
}

const QX_WOMEN: Record<number, number> = {
   55: 0.00208,  56: 0.00228,  57: 0.00250,  58: 0.00275,  59: 0.00303,
   60: 0.00334,  61: 0.00369,  62: 0.00408,  63: 0.00452,  64: 0.00501,
   65: 0.00556,  66: 0.00617,  67: 0.00685,  68: 0.00761,  69: 0.00846,
   70: 0.00942,  71: 0.01049,  72: 0.01169,  73: 0.01303,  74: 0.01453,
   75: 0.01621,  76: 0.01809,  77: 0.02019,  78: 0.02254,  79: 0.02517,
   80: 0.02811,  81: 0.03139,  82: 0.03505,  83: 0.03913,  84: 0.04366,
   85: 0.04869,  86: 0.05426,  87: 0.06042,  88: 0.06722,  89: 0.07470,
   90: 0.08291,  91: 0.09188,  92: 0.10163,  93: 0.11218,  94: 0.12352,
   95: 0.13562,  96: 0.14842,  97: 0.16182,  98: 0.17572,  99: 0.19000,
  100: 0.20450, 101: 0.21910, 102: 0.23360, 103: 0.24790, 104: 0.26180,
  105: 0.27500, 106: 0.30000, 107: 0.33000, 108: 0.38000, 109: 0.44000,
  110: 0.51000, 111: 0.59000, 112: 0.69000, 113: 0.79000, 114: 0.89000,
  115: 1.00000,
}

export type Gender = 'male' | 'female'

const OMEGA = 115 // maximale leeftijd in de tabel

/**
 * Overlevingskans: kans dat iemand van leeftijd `fromAge`
 * de leeftijd `fromAge + t` bereikt.
 * tPx in actuariële notatie.
 */
export function survivalProbability(
  fromAge: number,
  t: number,
  gender: Gender,
): number {
  const qx = gender === 'male' ? QX_MEN : QX_WOMEN
  let px = 1.0
  for (let age = fromAge; age < fromAge + t; age++) {
    if (age >= OMEGA) return 0
    const q = qx[age] ?? 1.0
    px *= 1 - q
  }
  return px
}

// ---------------------------------------------------------------------------
// 2. ANNUÏTEITSFACTOR (ä_x)
// ---------------------------------------------------------------------------

/**
 * Berekent de actuariële annuïteitsfactor ä_x (begin-van-jaar-uitkering):
 * de contante waarde van €1 per jaar, levenslang, beginnend op leeftijd x.
 *
 * ä_x = Σ(t=0 tot ω-x) [ v^t × tPx ]
 *
 * waarbij v = 1 / (1 + discountRate)
 *
 * @param startAge      Leeftijd bij ingang uitkering
 * @param discountRate  Rekenrente als decimaal (bijv. 0.03 voor 3%)
 * @param gender        'male' | 'female'
 */
export function computeAnnuityFactor(
  startAge: number,
  discountRate: number,
  gender: Gender,
): number {
  const v = 1 / (1 + discountRate)
  let factor = 0
  const maxT = OMEGA - startAge

  for (let t = 0; t <= maxT; t++) {
    const tPx = survivalProbability(startAge, t, gender)
    if (tPx < 1e-8) break // verwaarloosbaar klein
    factor += Math.pow(v, t) * tPx
  }
  return factor
}

/**
 * Zet opgebouwd kapitaal (in eurocent) om naar een jaarlijkse brutoutkering
 * (in eurocent) op basis van de actuariële annuïteitsfactor.
 */
export function capitalToAnnualBenefit(
  capitalEurocents: number,
  startAge: number,
  discountRate: number,
  gender: Gender,
): number {
  const factor = computeAnnuityFactor(startAge, discountRate, gender)
  if (factor <= 0) return 0
  return Math.round(capitalEurocents / factor)
}

/** Maandelijkse brutoutkering (eurocent) */
export function capitalToMonthlyBenefit(
  capitalEurocents: number,
  startAge: number,
  discountRate: number,
  gender: Gender,
): number {
  return Math.round(capitalToAnnualBenefit(capitalEurocents, startAge, discountRate, gender) / 12)
}

// ---------------------------------------------------------------------------
// 3. RESTERENDE LEVENSVERWACHTING (e_x)
// ---------------------------------------------------------------------------

/**
 * Resterende (cohort)levensverwachting op leeftijd x.
 * Nuttig om aan de gebruiker te tonen naast de uitkering.
 *
 * e_x = Σ(t=1 tot ω-x) [ tPx ]   (complete expectation of life, afgekort)
 */
export function remainingLifeExpectancy(startAge: number, gender: Gender): number {
  let expectancy = 0
  for (let t = 1; t <= OMEGA - startAge; t++) {
    const tPx = survivalProbability(startAge, t, gender)
    if (tPx < 1e-8) break
    expectancy += tPx
  }
  return Math.round(expectancy * 10) / 10
}

// ---------------------------------------------------------------------------
// 4. SCENARIOMODEL
// ---------------------------------------------------------------------------

export type ScenarioKey = 'pessimistic' | 'neutral' | 'optimistic' | 'custom'

export interface AnnuityScenario {
  key: ScenarioKey
  label: string
  discountRate: number   // decimaal, bijv. 0.01
  description: string
}

/**
 * Drie standaardscenario's conform Nederlandse pensioenpraktijk.
 * De rekenrente weerspiegelt het verwachte lange-termijn rendement
 * op het belegde pensioenkapitaal na pensioendatum.
 *
 * Historische context:
 *  - Vóór 2008 hanteerden verzekeraars doorgaans 4%
 *  - Na 2015: rekenrente daalde mee met marktrente naar ~1–2%
 *  - Actueel (2025): marktrente hersteld; gangbaar 2–4%
 */
export const STANDARD_SCENARIOS: Record<Exclude<ScenarioKey, 'custom'>, AnnuityScenario> = {
  pessimistic: {
    key: 'pessimistic',
    label: 'Pessimistisch',
    discountRate: 0.01,
    description: 'Rekenrente 1% – lage rente, hoge reservering (vergelijkbaar met situatie 2020–2022)',
  },
  neutral: {
    key: 'neutral',
    label: 'Neutraal',
    discountRate: 0.03,
    description: 'Rekenrente 3% – gangbaar voor collectieve pensioenfondsen (DNB UFR-curve 2025)',
  },
  optimistic: {
    key: 'optimistic',
    label: 'Optimistisch',
    discountRate: 0.05,
    description: 'Rekenrente 5% – hoger rendement, lagere reservering (pre-2008 standaard)',
  },
}

export interface AnnuityInput {
  capitalEurocents: number
  retirementAge: number
  gender: Gender
  scenario: AnnuityScenario
}

export interface AnnuityResult {
  scenario: AnnuityScenario
  annuityFactor: number
  annualBenefitEurocents: number
  monthlyBenefitEurocents: number
  remainingLifeExpectancyYears: number
  /** Verwachte totale uitkering over de rest van het leven */
  totalExpectedPayoutEurocents: number
}

/**
 * Hoofdfunctie: berekent het volledige resultaat voor één scenario.
 */
export function calculateAnnuityResult(input: AnnuityInput): AnnuityResult {
  const { capitalEurocents, retirementAge, gender, scenario } = input
  const { discountRate } = scenario

  const annuityFactor = computeAnnuityFactor(retirementAge, discountRate, gender)
  const annualBenefit = annuityFactor > 0 ? Math.round(capitalEurocents / annuityFactor) : 0
  const monthlyBenefit = Math.round(annualBenefit / 12)
  const lifeExpectancy = remainingLifeExpectancy(retirementAge, gender)

  return {
    scenario,
    annuityFactor: Math.round(annuityFactor * 100) / 100,
    annualBenefitEurocents: annualBenefit,
    monthlyBenefitEurocents: monthlyBenefit,
    remainingLifeExpectancyYears: lifeExpectancy,
    totalExpectedPayoutEurocents: Math.round(annualBenefit * lifeExpectancy),
  }
}

/**
 * Berekent alle drie standaardscenario's + optioneel een custom scenario.
 * Dit is de primaire interface voor de Pinia store.
 */
export function calculateAllScenarios(
  capitalEurocents: number,
  retirementAge: number,
  gender: Gender,
  customRate?: number,
): AnnuityResult[] {
  const results: AnnuityResult[] = Object.values(STANDARD_SCENARIOS).map((scenario) =>
    calculateAnnuityResult({ capitalEurocents, retirementAge, gender, scenario }),
  )

  if (customRate !== undefined) {
    const customScenario: AnnuityScenario = {
      key: 'custom',
      label: 'Eigen rekenrente',
      discountRate: customRate,
      description: `Rekenrente ${(customRate * 100).toFixed(1)}% – handmatig ingesteld`,
    }
    results.push(
      calculateAnnuityResult({ capitalEurocents, retirementAge, gender, scenario: customScenario }),
    )
  }

  return results
}

// ---------------------------------------------------------------------------
// 5. HULPFUNCTIES (eurocent ↔ euro display)
// ---------------------------------------------------------------------------

/** Eurocent → leesbaar euro-bedrag (bijv. 123456 → "€ 1.234,56") */
export function formatEurocents(eurocents: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(eurocents / 100)
}

/** Euro-invoer → eurocent (bijv. 1234.56 → 123456) */
export function euroToEurocents(euro: number): number {
  return Math.round(euro * 100)
}
