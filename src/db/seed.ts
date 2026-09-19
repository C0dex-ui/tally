import type { Category, Settings } from './types.ts'
import { SETTINGS_ID } from './types.ts'

export const DEFAULT_SETTINGS: Settings = {
  id: SETTINGS_ID,
  displayName: 'Leonel',
  currency: 'USD',
  monthStartDay: 1,
  periodMode: 'pay',
  payday1: 1,
  payday2: 16,
  savePercent: 10,
  theme: 'system',
  onboarded: false,
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'home-credit', name: 'Home Credit', kind: 'expense', icon: 'creditCard', color: '#3E6B8A', monthlyLimitCents: 0, sortOrder: 0, archived: false },
  { id: 'pldt', name: 'PLDT', kind: 'expense', icon: 'wifi', color: '#4A6FA5', monthlyLimitCents: 0, sortOrder: 1, archived: false },
  { id: 'insurance', name: 'Insurance', kind: 'expense', icon: 'shield', color: '#2F6B4F', monthlyLimitCents: 0, sortOrder: 2, archived: false },
  { id: 'savings', name: 'Savings', kind: 'expense', icon: 'piggy', color: '#C9A227', monthlyLimitCents: 0, sortOrder: 3, archived: false },
  { id: 'lola', name: 'Lola', kind: 'expense', icon: 'heart', color: '#B4566C', monthlyLimitCents: 0, sortOrder: 4, archived: false },
  { id: 'atome', name: 'Atome', kind: 'expense', icon: 'device', color: '#6B5B95', monthlyLimitCents: 0, sortOrder: 5, archived: false },
  { id: 'electric', name: 'Electric', kind: 'expense', icon: 'zap', color: '#C9A227', monthlyLimitCents: 0, sortOrder: 6, archived: false },
  { id: 'food', name: 'Food', kind: 'expense', icon: 'utensils', color: '#C45C3E', monthlyLimitCents: 0, sortOrder: 7, archived: false },
  { id: 'gasoline', name: 'Gasoline', kind: 'expense', icon: 'gas', color: '#8A5A3E', monthlyLimitCents: 0, sortOrder: 8, archived: false },
  { id: 'others', name: 'Others', kind: 'expense', icon: 'more', color: '#6E726E', monthlyLimitCents: 0, sortOrder: 9, archived: false },
  { id: 'paycheck', name: 'Paycheck', kind: 'income', icon: 'bank', color: '#2F6B4F', monthlyLimitCents: 0, sortOrder: 100, archived: false },
  { id: 'other-income', name: 'Other income', kind: 'income', icon: 'plus', color: '#4E8B6A', monthlyLimitCents: 0, sortOrder: 101, archived: false },
]

export const LEGACY_EXPENSE_IDS = [
  'housing',
  'groceries',
  'dining',
  'transport',
  'utilities',
  'health',
  'fun',
  'shopping',
  'subscriptions',
  'other-expense',
  'pocket',
] as const

export const ONBOARDING_BUDGET_IDS = ['home-credit', 'pldt', 'insurance', 'electric'] as const
