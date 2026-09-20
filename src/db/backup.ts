import { db } from './index.ts'
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS } from './seed.ts'
import type {
  Category,
  DailyOver,
  FundBorrow,
  Goal,
  GoalEvent,
  Recurring,
  RecurringSkip,
  Settings,
  Transaction,
  Utang,
} from './types.ts'
import { dueDayFromIso } from '../lib/responsibilities.ts'

export const BACKUP_VERSION = 1

export interface BackupFile {
  version: number
  exportedAt: string
  settings: Settings[]
  categories: Category[]
  transactions: Transaction[]
  recurring: Recurring[]
  recurringSkips?: RecurringSkip[]
  goals: Goal[]
  goalEvents: GoalEvent[]
  fundBorrows?: FundBorrow[]
  utangs?: Utang[]
  dailyOvers?: DailyOver[]
}

export async function exportBackup(): Promise<BackupFile> {
  const [settings, categories, transactions, recurring, recurringSkips, goals, goalEvents, fundBorrows, utangs, dailyOvers] =
    await Promise.all([
      db.settings.toArray(),
      db.categories.toArray(),
      db.transactions.toArray(),
      db.recurring.toArray(),
      db.recurringSkips.toArray(),
      db.goals.toArray(),
      db.goalEvents.toArray(),
      db.fundBorrows.toArray(),
      db.utangs.toArray(),
      db.dailyOvers.toArray(),
    ])
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    settings,
    categories,
    transactions,
    recurring,
    recurringSkips,
    goals,
    goalEvents,
    fundBorrows,
    utangs,
    dailyOvers,
  }
}

function normalizeRecurring(rows: Recurring[]): Recurring[] {
  return rows.map((r) => ({
    ...r,
    dueDay: r.dueDay ?? dueDayFromIso(r.nextDate),
  }))
}

export function parseBackup(raw: unknown): BackupFile {
  if (!raw || typeof raw !== 'object') throw new Error('Not a Tally backup file.')
  const data = raw as Partial<BackupFile>
  if (data.version !== BACKUP_VERSION) {
    throw new Error('This backup is from a different app version.')
  }
  if (!Array.isArray(data.settings) || !Array.isArray(data.categories)) {
    throw new Error('Backup file is missing required data.')
  }
  return {
    version: BACKUP_VERSION,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    settings: (data.settings ?? []).map((s) => ({ ...DEFAULT_SETTINGS, ...s })),
    categories: data.categories,
    transactions: Array.isArray(data.transactions) ? data.transactions : [],
    recurring: normalizeRecurring(Array.isArray(data.recurring) ? data.recurring : []),
    recurringSkips: Array.isArray(data.recurringSkips) ? data.recurringSkips : [],
    goals: (Array.isArray(data.goals) ? data.goals : []).map((g) => ({
      ...g,
      allowedUses: Array.isArray(g.allowedUses) ? g.allowedUses : [],
      monthlyContributionCents: g.monthlyContributionCents ?? 0,
      startedOn: g.startedOn ?? '',
    })),
    goalEvents: (Array.isArray(data.goalEvents) ? data.goalEvents : []).map((e) => ({
      ...e,
      purpose: e.purpose ?? e.notes ?? '',
    })),
    fundBorrows: Array.isArray(data.fundBorrows) ? data.fundBorrows : [],
    utangs: Array.isArray(data.utangs) ? data.utangs : [],
    dailyOvers: Array.isArray(data.dailyOvers) ? data.dailyOvers : [],
  }
}

export async function importBackup(
  backup: BackupFile,
  mode: 'replace' | 'merge',
): Promise<void> {
  if (mode === 'replace') {
    await db.transaction(
      'rw',
      [
        db.settings,
        db.categories,
        db.transactions,
        db.recurring,
        db.recurringSkips,
        db.goals,
        db.goalEvents,
        db.fundBorrows,
        db.utangs,
        db.dailyOvers,
      ],
      async () => {
        await Promise.all([
          db.settings.clear(),
          db.categories.clear(),
          db.transactions.clear(),
          db.recurring.clear(),
          db.recurringSkips.clear(),
          db.goals.clear(),
          db.goalEvents.clear(),
          db.fundBorrows.clear(),
          db.utangs.clear(),
          db.dailyOvers.clear(),
        ])
        if (backup.settings.length) await db.settings.bulkPut(backup.settings)
        else await db.settings.put(DEFAULT_SETTINGS)
        if (backup.categories.length) await db.categories.bulkPut(backup.categories)
        else await db.categories.bulkPut(DEFAULT_CATEGORIES)
        if (backup.transactions.length) await db.transactions.bulkPut(backup.transactions)
        if (backup.recurring.length) {
          await db.recurring.bulkPut(normalizeRecurring(backup.recurring))
        }
        if (backup.recurringSkips?.length) await db.recurringSkips.bulkPut(backup.recurringSkips)
        if (backup.goals.length) await db.goals.bulkPut(backup.goals)
        if (backup.goalEvents.length) await db.goalEvents.bulkPut(backup.goalEvents)
        if (backup.fundBorrows?.length) await db.fundBorrows.bulkPut(backup.fundBorrows)
        if (backup.utangs?.length) await db.utangs.bulkPut(backup.utangs)
        if (backup.dailyOvers?.length) await db.dailyOvers.bulkPut(backup.dailyOvers)
      },
    )
    return
  }

  await db.transaction(
    'rw',
    [
      db.settings,
      db.categories,
      db.transactions,
      db.recurring,
      db.recurringSkips,
      db.goals,
      db.goalEvents,
      db.fundBorrows,
      db.utangs,
      db.dailyOvers,
    ],
    async () => {
      const existing = {
        categories: new Set((await db.categories.toCollection().primaryKeys()).map(String)),
        transactions: new Set((await db.transactions.toCollection().primaryKeys()).map(String)),
        recurring: new Set((await db.recurring.toCollection().primaryKeys()).map(String)),
        skips: new Set((await db.recurringSkips.toCollection().primaryKeys()).map(String)),
        goals: new Set((await db.goals.toCollection().primaryKeys()).map(String)),
        goalEvents: new Set((await db.goalEvents.toCollection().primaryKeys()).map(String)),
        fundBorrows: new Set((await db.fundBorrows.toCollection().primaryKeys()).map(String)),
        utangs: new Set((await db.utangs.toCollection().primaryKeys()).map(String)),
        dailyOvers: new Set((await db.dailyOvers.toCollection().primaryKeys()).map(String)),
      }
      const cats = backup.categories.filter((c) => !existing.categories.has(c.id))
      const txns = backup.transactions.filter((t) => !existing.transactions.has(t.id))
      const rec = normalizeRecurring(backup.recurring).filter((r) => !existing.recurring.has(r.id))
      const skips = (backup.recurringSkips ?? []).filter((s) => !existing.skips.has(s.id))
      const goals = backup.goals.filter((g) => !existing.goals.has(g.id))
      const events = backup.goalEvents.filter((e) => !existing.goalEvents.has(e.id))
      const borrows = (backup.fundBorrows ?? []).filter((b) => !existing.fundBorrows.has(b.id))
      const utangs = (backup.utangs ?? []).filter((u) => !existing.utangs.has(u.id))
      const overs = (backup.dailyOvers ?? []).filter((o) => !existing.dailyOvers.has(o.id))
      if (cats.length) await db.categories.bulkAdd(cats)
      if (txns.length) await db.transactions.bulkAdd(txns)
      if (rec.length) await db.recurring.bulkAdd(rec)
      if (skips.length) await db.recurringSkips.bulkAdd(skips)
      if (goals.length) await db.goals.bulkAdd(goals)
      if (events.length) await db.goalEvents.bulkAdd(events)
      if (borrows.length) await db.fundBorrows.bulkAdd(borrows)
      if (utangs.length) await db.utangs.bulkAdd(utangs)
      if (overs.length) await db.dailyOvers.bulkAdd(overs)
      if (backup.settings[0]) {
        const current = await db.settings.get(DEFAULT_SETTINGS.id)
        await db.settings.put({
          ...DEFAULT_SETTINGS,
          ...current,
          ...backup.settings[0],
          id: DEFAULT_SETTINGS.id,
        })
      }
    },
  )
}

export async function resetAllData(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.settings,
      db.categories,
      db.transactions,
      db.recurring,
      db.recurringSkips,
      db.goals,
      db.goalEvents,
      db.fundBorrows,
      db.utangs,
      db.dailyOvers,
    ],
    async () => {
      await Promise.all([
        db.settings.clear(),
        db.categories.clear(),
        db.transactions.clear(),
        db.recurring.clear(),
        db.recurringSkips.clear(),
        db.goals.clear(),
        db.goalEvents.clear(),
        db.fundBorrows.clear(),
        db.utangs.clear(),
        db.dailyOvers.clear(),
      ])
      await db.settings.put({ ...DEFAULT_SETTINGS, onboarded: false })
      await db.categories.bulkPut(DEFAULT_CATEGORIES)
    },
  )
}
