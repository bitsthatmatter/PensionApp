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
