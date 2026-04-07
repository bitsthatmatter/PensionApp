export interface Age {
  years: number
  months: number
}

export interface UserProfile {
  dateOfBirth: string
  hasPartner: boolean
  partnerDateOfBirth?: string
  aowAge: Age
}

export interface PensionPeriod {
  fromAge: Age
  toAge?: Age
  toEvent?: string
  pension: number
  indicatiefPensioen?: number
  aowSamenwonend?: number
  aowAlleenstaand?: number
}

export interface PensionProvider {
  name: string
  annualAmount: number
  startAge: Age
}

export interface PartnerPensionPeriod {
  fromAge?: Age
  fromEvent?: string
  toAge?: Age
  toEvent?: string
  verzekerdBedrag: number
  opgebouwdBedrag: number
}

export interface PensionOverview {
  providers: PensionProvider[]
  aow: { samenwonend: number; alleenstaand: number }
  ouderdomsPensioen: PensionPeriod[]
  partnerPensioen: PartnerPensionPeriod[]
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

export interface MonthSnapshot {
  date: string
  age: Age
  totalIncome: number
  totalExpenses: number
  netCashflow: number
  cumulativeSavings: number
}

export interface RetirementScenario {
  id: string
  label: string
  retirementAge: Age
  timeline: MonthSnapshot[]
}
