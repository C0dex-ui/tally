import Dexie, { type Table } from 'dexie'
import type {
  Category,
  FundBorrow,
  Goal,
  GoalEvent,
  Recurring,
  RecurringSkip,
  Settings,
  Transaction,
} from './types.ts'
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS, LEGACY_EXPENSE_IDS } from './seed.ts'
import { dueDayFromIso } from '../lib/responsibilities.ts'

export class BudgetDB extends Dexie {
  settings!: Table<Settings, number>
  categories!: Table<Category, string>
  transactions!: Table<Transaction, string>
  recurring!: Table<Recurring, string>
  recurringSkips!: Table<RecurringSkip, string>
  goals!: Table<Goal, string>
  goalEvents!: Table<GoalEvent, string>
  fundBorrows!: Table<FundBorrow, string>

  constructor() {
    super('tally-budget')
    this.version(1).stores({
      settings: 'id',
      categories: 'id, kind, archived, sortOrder',
      transactions: 'id, date, kind, categoryId, recurringId',
      recurring: 'id, nextDate, active, kind',
      goals: 'id, archived',
      goalEvents: 'id, goalId, date',
    })
    this.version(2)
      .stores({
        settings: 'id',
        categories: 'id, kind, archived, sortOrder',
        transactions: 'id, date, kind, categoryId, recurringId',
        recurring: 'id, nextDate, active, kind, dueDay',
        recurringSkips: 'id, recurringId, periodStart, [recurringId+periodStart]',
        goals: 'id, archived',
        goalEvents: 'id, goalId, date',
      })
      .upgrade(async (trans) => {
        await trans
          .table('recurring')
          .toCollection()
          .modify((row: { nextDate: string; dueDay?: number }) => {
            if (row.dueDay == null) {
              row.dueDay = dueDayFromIso(row.nextDate)
            }
          })
      })
    this.version(3).upgrade(async (trans) => {
      await trans
        .table('settings')
        .toCollection()
        .modify((row: { periodMode?: string; payday1?: number; payday2?: number }) => {
          if (row.periodMode == null) row.periodMode = 'pay'
          if (row.payday1 == null) row.payday1 = 1
          if (row.payday2 == null) row.payday2 = 16
        })
    })
    this.version(4).upgrade(async (trans) => {
      await trans
        .table('goals')
        .toCollection()
        .modify((row: { allowedUses?: string[] }) => {
          if (!Array.isArray(row.allowedUses)) row.allowedUses = []
        })
      await trans
        .table('goalEvents')
        .toCollection()
        .modify((row: { purpose?: string; notes?: string }) => {
          if (row.purpose == null) row.purpose = row.notes ?? ''
        })
    })
    this.version(5).upgrade(async (trans) => {
      await trans
        .table('settings')
        .toCollection()
        .modify((row: { savePercent?: number }) => {
          if (row.savePercent !== 5 && row.savePercent !== 8 && row.savePercent !== 10) {
            row.savePercent = 10
          }
        })
    })
    this.version(6).upgrade(async (trans) => {
      await trans
        .table('settings')
        .toCollection()
        .modify((row: { displayName?: string }) => {
          if (!row.displayName) row.displayName = 'Leonel'
        })
    })
    this.version(7).stores({
      settings: 'id',
      categories: 'id, kind, archived, sortOrder',
      transactions: 'id, date, kind, categoryId, recurringId',
      recurring: 'id, nextDate, active, kind, dueDay',
      recurringSkips: 'id, recurringId, periodStart, [recurringId+periodStart]',
      goals: 'id, archived',
      goalEvents: 'id, goalId, date',
      fundBorrows: 'id, goalId, date, remainingCents',
    })
    this.version(8).upgrade(async (trans) => {
      await trans
        .table('settings')
        .toCollection()
        .modify(
          (row: {
            capitalCents?: number
            capitalDate?: string
            capitalPeriodStart?: string
          }) => {
            if (row.capitalDate == null) row.capitalDate = ''
            if (row.capitalPeriodStart == null) row.capitalPeriodStart = ''
          },
        )
    })
    this.version(9).upgrade(async (trans) => {
      const cats = trans.table('categories')
      const legacy = new Set<string>(LEGACY_EXPENSE_IDS)
      await cats.toCollection().modify((row: { id: string; archived?: boolean }) => {
        if (legacy.has(row.id)) row.archived = true
      })
      for (const category of DEFAULT_CATEGORIES) {
        const exists = await cats.get(category.id)
        if (!exists) await cats.put(category)
      }
    })
    this.version(10).upgrade(async (trans) => {
      await trans
        .table('goals')
        .toCollection()
        .modify((row: { monthlyContributionCents?: number; startedOn?: string }) => {
          if (row.monthlyContributionCents == null) row.monthlyContributionCents = 0
          if (!row.startedOn) row.startedOn = ''
        })
    })
  }
}

export const db = new BudgetDB()

let seeded = false

export async function ensureSeeded(): Promise<void> {
  if (seeded) return
  const existing = await db.settings.get(DEFAULT_SETTINGS.id)
  if (!existing) {
    await db.transaction('rw', db.settings, db.categories, async () => {
      const again = await db.settings.get(DEFAULT_SETTINGS.id)
      if (again) return
      await db.settings.put(DEFAULT_SETTINGS)
      await db.categories.bulkPut(DEFAULT_CATEGORIES)
    })
  }
  await ensureDefaultCategories()
  seeded = true
}

async function ensureDefaultCategories(): Promise<void> {
  for (const category of DEFAULT_CATEGORIES) {
    const exists = await db.categories.get(category.id)
    if (!exists) await db.categories.put(category)
  }
}
