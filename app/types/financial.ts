export interface Age {
  years: number
  months: number
}

export interface UserProfile {
  dateOfBirth: string
  hasPartner: boolean
  partnerDateOfBirth?: string
  aowAge: Age
  partnerAowAge: Age
}

export type StreamType =
  | 'salary'
  | 'savings'
  | 'loan'
  | 'pension'
  | 'aow'
  | 'partner-pension'
  | 'partner-aow'
  | 'expense'
  | 'stocks'

export interface FinancialStream {
  id: string
  type: StreamType
  label: string
  /** Monthly amount in euros. Positive for income types; positive (as entered) for expenses. */
  monthlyAmount: number
  /** One-time amount in euros (savings, loan, stocks). */
  lumpSum?: number
  startDate?: string
  endDate?: string
  startAge?: Age
  endAge?: Age
  /** Account name, e.g. 'Gouden Internet Rekening'. Used for savings/loan streams. */
  accountName?: string
  /** Account number in IBAN format. Used for savings/loan streams. */
  accountNumber?: string
  /** Annual interest rate as a percentage, e.g. 2.8 for 2.80%. Used for savings/loan streams. */
  interestRate?: number
}

export interface SupplementPeriod {
  /** Start age (inclusive). */
  fromAge: Age
  /** End age (exclusive). If absent, the period runs to end of timeline or until savings run out. */
  toAge?: Age
  /** Desired total gross monthly income in euros. The supplement is max(0, targetIncome − regularIncome). */
  targetIncome: number
}

export interface PensionPeriodAmount {
  /** Net monthly amount before AOW age (€/mnd). */
  netBeforeAow: number
  /** Net monthly amount from AOW age onwards (€/mnd, includes AOW). */
  netAfterAow: number
}

export interface PensionEmployer {
  id: string
  /** Display name, e.g. 'Werkgever A' */
  label: string
  amounts: PensionPeriodAmount
}

export interface PensionScenarioEntry {
  retirementAge: Age
  /** Per-employer breakdown. The projection engine receives the summed `amounts`. */
  employers: PensionEmployer[]
  /** Aggregate of all employer amounts — derived, kept in sync by the store. */
  amounts: PensionPeriodAmount
}

export type RecurringType = 'once' | 'monthly' | 'yearly'

export interface BudgetedCost {
  id: string
  label: string
  /** Cost magnitude in euros. Always positive. */
  amount: number
  recurring: RecurringType
  date: string
  endDate?: string
}
