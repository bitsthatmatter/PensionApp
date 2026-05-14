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
  monthlyAmount: number
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
  amount: number
  recurring: RecurringType
  date: string
  endDate?: string
}
