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
}

export interface SupplementPeriod {
  /** Start age (inclusive). */
  fromAge: Age
  /** End age (exclusive). If absent, the period runs to end of timeline or until savings run out. */
  toAge?: Age
  /** Desired total gross monthly income in euros. The supplement is max(0, targetIncome − regularIncome). */
  targetIncome: number
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
