export const MONEY_KINDS = ['expense', 'income'] as const
export type MoneyKind = (typeof MONEY_KINDS)[number]

export const FREQUENCIES = ['weekly', 'monthly', 'yearly'] as const
export type Frequency = (typeof FREQUENCIES)[number]

export const THEMES = ['system', 'light', 'dark'] as const
export type ThemePref = (typeof THEMES)[number]

export const PERIOD_MODES = ['pay', 'month'] as const
export type PeriodMode = (typeof PERIOD_MODES)[number]

export interface Settings {
  id: number
  displayName: string
  currency: string
  monthStartDay: number
  periodMode: PeriodMode
  payday1: number
  payday2: number
  savePercent: 0 | 5 | 8 | 10
  theme: ThemePref
  onboarded: boolean
  capitalCents?: number
  capitalDate?: string
  capitalPeriodStart?: string
}

export interface Category {
  id: string
  name: string
  kind: MoneyKind
  icon: string
  color: string
  monthlyLimitCents: number
  sortOrder: number
  archived: boolean
}

export interface Transaction {
  id: string
  kind: MoneyKind
  amountCents: number
  date: string
  categoryId: string
  payee: string
  notes: string
  recurringId?: string
  createdAt: string
  updatedAt: string
}

export interface Recurring {
  id: string
  name: string
  kind: MoneyKind
  amountCents: number
  categoryId: string
  frequency: Frequency
  nextDate: string
  dueDay: number
  autoLog: boolean
  active: boolean
}

export interface RecurringSkip {
  id: string
  recurringId: string
  periodStart: string
}

export interface Goal {
  id: string
  name: string
  targetCents: number
  savedCents: number
  deadline?: string
  color: string
  archived: boolean
  allowedUses: string[]
  monthlyContributionCents: number
  startedOn: string
}

export interface GoalEvent {
  id: string
  goalId: string
  amountCents: number
  date: string
  notes: string
  purpose: string
}

export interface FundBorrow {
  id: string
  goalId: string
  amountCents: number
  remainingCents: number
  purpose: string
  date: string
  notes: string
}

export interface Utang {
  id: string
  name: string
  amountCents: number
  date: string
  archived: boolean
}

export interface DailyOver {
  id: string
  date: string
  spentCents: number
  dailyMaxCents: number
  overCents: number
}

export const SETTINGS_ID = 1
