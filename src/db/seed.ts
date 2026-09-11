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
  { id: 'housing', name: 'Housing', kind: 'expense', icon: 'home', color: '#5B7C6A', monthlyLimitCents: 0, sortOrder: 0, archived: false },
  { id: 'groceries', name: 'Groceries', kind: 'expense', icon: 'cart', color: '#3D7A54', monthlyLimitCents: 0, sortOrder: 1, archived: false },
  { id: 'dining', name: 'Dining', kind: 'expense', icon: 'utensils', color: '#C45C3E', monthlyLimitCents: 0, sortOrder: 2, archived: false },
  { id: 'transport', name: 'Transport', kind: 'expense', icon: 'car', color: '#3E6B8A', monthlyLimitCents: 0, sortOrder: 3, archived: false },
  { id: 'utilities', name: 'Utilities', kind: 'expense', icon: 'zap', color: '#C9A227', monthlyLimitCents: 0, sortOrder: 4, archived: false },
  { id: 'health', name: 'Health', kind: 'expense', icon: 'heart', color: '#B4566C', monthlyLimitCents: 0, sortOrder: 5, archived: false },
  { id: 'fun', name: 'Fun', kind: 'expense', icon: 'smile', color: '#6B5B95', monthlyLimitCents: 0, sortOrder: 6, archived: false },
  { id: 'shopping', name: 'Shopping', kind: 'expense', icon: 'bag', color: '#8A5A3E', monthlyLimitCents: 0, sortOrder: 7, archived: false },
  { id: 'subscriptions', name: 'Subscriptions', kind: 'expense', icon: 'repeat', color: '#4A6FA5', monthlyLimitCents: 0, sortOrder: 8, archived: false },
  { id: 'other-expense', name: 'Other', kind: 'expense', icon: 'more', color: '#6E726E', monthlyLimitCents: 0, sortOrder: 9, archived: false },
  { id: 'pocket', name: 'Pocket', kind: 'expense', icon: 'wallet', color: '#8A6B3E', monthlyLimitCents: 0, sortOrder: 10, archived: false },
  { id: 'paycheck', name: 'Paycheck', kind: 'income', icon: 'bank', color: '#2F6B4F', monthlyLimitCents: 0, sortOrder: 100, archived: false },
  { id: 'other-income', name: 'Other income', kind: 'income', icon: 'plus', color: '#4E8B6A', monthlyLimitCents: 0, sortOrder: 101, archived: false },
]

export const ONBOARDING_BUDGET_IDS = ['housing', 'groceries', 'transport', 'fun'] as const
