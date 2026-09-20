import { db } from './index.ts'
import { newId, nowISO } from '../lib/ids.ts'
import { addDays, addMonthsClamped, inRange, monthRangeForDate, todayISO } from '../lib/dates.ts'
import { daysUntil, paydayLabel, payPeriodRangeForDate } from '../lib/payPeriod.ts'
import { advanceNextDate, catchUpDates } from '../lib/recurring.ts'
import { dueDateForPeriod, dueDayFromIso, isDueInPeriod, monthlyExpenseTotal, paycheckBillShare } from '../lib/responsibilities.ts'
import type {
  Category,
  Goal,
  MoneyKind,
  Recurring,
  Settings,
  Transaction,
} from './types.ts'
import { SETTINGS_ID } from './types.ts'
import { clampSavePercent, dailyBudget, livingSpendOnDate, livingSpendOnOrAfter } from '../lib/daily.ts'
import { dailyOverRowId, overCents } from '../lib/dailyOver.ts'
import {
  DEFAULT_EMERGENCY_USES,
  goalAllotmentCents,
  goalCatchUpThisPeriod,
  isEmergencyGoal,
  requireWithdrawPurpose,
} from '../lib/goals.ts'
import { hasPeriodCapital, whatsLeftFromCapital } from '../lib/leftover.ts'

function isEmergencyName(name: string): boolean {
  return isEmergencyGoal({ name })
}
import { DEFAULT_SETTINGS } from './seed.ts'

export async function getSettings(): Promise<Settings> {
  const row = await db.settings.get(SETTINGS_ID)
  return { ...DEFAULT_SETTINGS, ...row }
}

export async function updateSettings(patch: Partial<Omit<Settings, 'id'>>): Promise<void> {
  const current = await getSettings()
  await db.settings.put({ ...current, ...patch, id: SETTINGS_ID })
}

export async function addTransaction(
  input: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
): Promise<string> {
  if (input.amountCents <= 0) throw new Error('Amount must be greater than zero.')
  if (!input.categoryId) throw new Error('Pick a category.')
  if (!input.date) throw new Error('Pick a date.')
  const id = input.id ?? newId()
  const now = nowISO()
  await db.transactions.add({
    ...input,
    id,
    payee: input.payee.trim(),
    notes: input.notes.trim(),
    createdAt: now,
    updatedAt: now,
  })
  scheduleDailyOverSync(input.date)
  return id
}

export async function updateTransaction(
  id: string,
  patch: Partial<Omit<Transaction, 'id' | 'createdAt'>>,
): Promise<void> {
  const current = await db.transactions.get(id)
  if (!current) throw new Error('Transaction not found.')
  const next = { ...current, ...patch, id, updatedAt: nowISO() }
  if (next.amountCents <= 0) throw new Error('Amount must be greater than zero.')
  await db.transactions.put(next)
  scheduleDailyOverSync(current.date)
  if (next.date !== current.date) scheduleDailyOverSync(next.date)
}

export async function deleteTransaction(id: string): Promise<void> {
  const current = await db.transactions.get(id)
  await db.transactions.delete(id)
  if (current) scheduleDailyOverSync(current.date)
}

export async function addCategory(
  input: Omit<Category, 'id' | 'archived' | 'sortOrder'> & {
    sortOrder?: number
  },
): Promise<string> {
  const id = newId()
  const max = await db.categories.orderBy('sortOrder').last()
  await db.categories.add({
    ...input,
    id,
    name: input.name.trim(),
    archived: false,
    sortOrder: input.sortOrder ?? (max ? max.sortOrder + 1 : 0),
  })
  return id
}

export async function updateCategory(
  id: string,
  patch: Partial<Omit<Category, 'id'>>,
): Promise<void> {
  const current = await db.categories.get(id)
  if (!current) throw new Error('Category not found.')
  await db.categories.put({ ...current, ...patch, id })
}

export async function archiveCategory(id: string): Promise<void> {
  await updateCategory(id, { archived: true })
}

export async function addRecurring(
  input: Omit<Recurring, 'id' | 'active' | 'dueDay'> & {
    active?: boolean
    dueDay?: number
  },
): Promise<string> {
  if (input.amountCents <= 0) throw new Error('Amount must be greater than zero.')
  const id = newId()
  await db.recurring.add({
    ...input,
    id,
    name: input.name.trim(),
    dueDay: input.dueDay ?? dueDayFromIso(input.nextDate),
    active: input.active ?? true,
  })
  return id
}

export async function updateRecurring(
  id: string,
  patch: Partial<Omit<Recurring, 'id'>>,
): Promise<void> {
  const current = await db.recurring.get(id)
  if (!current) throw new Error('Bill not found.')
  await db.recurring.put({ ...current, ...patch, id })
}

export async function deleteRecurring(id: string): Promise<void> {
  await db.transaction('rw', db.recurring, db.recurringSkips, async () => {
    await db.recurring.delete(id)
    await db.recurringSkips.where('recurringId').equals(id).delete()
  })
}

async function postRecurringOccurrence(item: Recurring, date: string): Promise<void> {
  await addTransaction({
    kind: item.kind,
    amountCents: item.amountCents,
    date,
    categoryId: item.categoryId,
    payee: item.name,
    notes: '',
    recurringId: item.id,
  })
}

export async function logRecurringPayment(
  id: string,
  date?: string,
): Promise<void> {
  const item = await db.recurring.get(id)
  if (!item) throw new Error('Bill not found.')
  const when = date ?? (item.nextDate <= todayISO() ? item.nextDate : todayISO())
  await db.transaction('rw', db.recurring, db.transactions, async () => {
    const latest = await db.recurring.get(id)
    if (!latest) return
    await postRecurringOccurrence(latest, when)
    await db.recurring.update(id, {
      nextDate: advanceNextDate(latest.nextDate, latest.frequency),
    })
  })
}

export async function skipRecurring(id: string): Promise<void> {
  const item = await db.recurring.get(id)
  if (!item) throw new Error('Bill not found.')
  await db.recurring.update(id, {
    nextDate: advanceNextDate(item.nextDate, item.frequency),
  })
}

export async function markResponsibilityPaid(
  id: string,
  range: { start: string; end: string },
  today = todayISO(),
): Promise<void> {
  const item = await db.recurring.get(id)
  if (!item) throw new Error('Bill not found.')
  const due = dueDateForPeriod(item.dueDay ?? dueDayFromIso(item.nextDate), range)
  const date = inRange(today, range.start, range.end) ? today : due
  await db.transaction(
    'rw',
    db.recurring,
    db.transactions,
    db.recurringSkips,
    async () => {
      const latest = await db.recurring.get(id)
      if (!latest) return
      const already = await db.transactions
        .where('recurringId')
        .equals(id)
        .filter((t) => inRange(t.date, range.start, range.end))
        .first()
      if (already) return
      await postRecurringOccurrence(latest, date)
      await db.recurringSkips
        .where('[recurringId+periodStart]')
        .equals([id, range.start])
        .delete()
      if (latest.frequency === 'monthly') {
        await db.recurring.update(id, { nextDate: addMonthsClamped(due, 1) })
      } else {
        await db.recurring.update(id, {
          nextDate: advanceNextDate(latest.nextDate, latest.frequency),
        })
      }
    },
  )
}

export async function skipResponsibility(
  id: string,
  periodStart: string,
): Promise<void> {
  const existing = await db.recurringSkips
    .where('[recurringId+periodStart]')
    .equals([id, periodStart])
    .first()
  if (existing) return
  await db.recurringSkips.add({
    id: newId(),
    recurringId: id,
    periodStart,
  })
}

export async function unskipResponsibility(
  id: string,
  periodStart: string,
): Promise<void> {
  await db.recurringSkips
    .where('[recurringId+periodStart]')
    .equals([id, periodStart])
    .delete()
}

export async function undoResponsibilityPayment(
  id: string,
  range: { start: string; end: string },
): Promise<void> {
  const txns = await db.transactions.where('recurringId').equals(id).toArray()
  const ids = txns
    .filter((t) => inRange(t.date, range.start, range.end))
    .map((t) => t.id)
  if (ids.length) await db.transactions.bulkDelete(ids)
}

export interface AutoLogResult {
  logged: { name: string; amountCents: number; date: string; kind: MoneyKind }[]
}

let autoLogChain: Promise<unknown> = Promise.resolve()

export function processAutoLog(today = todayISO()): Promise<AutoLogResult> {
  const run = autoLogChain.then(() => processAutoLogInner(today))
  autoLogChain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

async function processAutoLogInner(today: string): Promise<AutoLogResult> {
  const logged: AutoLogResult['logged'] = []
  const due = await db.recurring
    .filter(
      (r) =>
        r.active &&
        r.autoLog &&
        r.frequency !== 'monthly' &&
        r.nextDate <= today,
    )
    .toArray()
  for (const item of due) {
    await db.transaction('rw', db.recurring, db.transactions, async () => {
      const latest = await db.recurring.get(item.id)
      if (!latest || !latest.active || !latest.autoLog) return
      const { dates, nextDate } = catchUpDates(
        latest.nextDate,
        latest.frequency,
        today,
      )
      for (const date of dates) {
        await postRecurringOccurrence(latest, date)
        logged.push({
          name: latest.name,
          amountCents: latest.amountCents,
          date,
          kind: latest.kind,
        })
      }
      await db.recurring.update(latest.id, { nextDate })
    })
  }
  return { logged }
}

export async function addGoal(
  input: Omit<Goal, 'id' | 'archived' | 'savedCents' | 'allowedUses'> & {
    savedCents?: number
    allowedUses?: string[]
  },
): Promise<string> {
  if (input.targetCents <= 0) throw new Error('Target must be greater than zero.')
  const id = newId()
  const name = input.name.trim()
  await db.goals.add({
    ...input,
    id,
    name,
    savedCents: input.savedCents ?? 0,
    archived: false,
    allowedUses: input.allowedUses ?? (isEmergencyName(name) ? [...DEFAULT_EMERGENCY_USES] : []),
  })
  return id
}

export async function updateGoal(
  id: string,
  patch: Partial<Omit<Goal, 'id'>>,
): Promise<void> {
  const current = await db.goals.get(id)
  if (!current) throw new Error('Goal not found.')
  await db.goals.put({ ...current, ...patch, id })
}

export async function archiveGoal(id: string): Promise<void> {
  await updateGoal(id, { archived: true })
}

export async function contributeToGoal(
  id: string,
  amountCents: number,
  date: string,
  notes = '',
): Promise<void> {
  if (amountCents <= 0) throw new Error('Amount must be greater than zero.')
  await db.transaction('rw', db.goals, db.goalEvents, async () => {
    const goal = await db.goals.get(id)
    if (!goal || goal.archived) throw new Error('Goal not found.')
    await db.goals.update(id, { savedCents: goal.savedCents + amountCents })
    await db.goalEvents.add({
      id: newId(),
      goalId: id,
      amountCents,
      date,
      notes: notes.trim(),
      purpose: '',
    })
  })
}

export async function withdrawFromGoal(
  id: string,
  amountCents: number,
  date: string,
  purpose: string,
  notes = '',
): Promise<void> {
  if (amountCents <= 0) throw new Error('Amount must be greater than zero.')
  const why = requireWithdrawPurpose(purpose)
  await db.transaction('rw', db.goals, db.goalEvents, async () => {
    const goal = await db.goals.get(id)
    if (!goal || goal.archived) throw new Error('Goal not found.')
    if (amountCents > goal.savedCents) {
      throw new Error('Cannot withdraw more than you have saved.')
    }
    await db.goals.update(id, { savedCents: goal.savedCents - amountCents })
    await db.goalEvents.add({
      id: newId(),
      goalId: id,
      amountCents: -amountCents,
      date,
      notes: notes.trim(),
      purpose: why,
    })
  })
}

export async function borrowFromFund(
  goalId: string,
  amountCents: number,
  date: string,
  purpose: string,
  notes = '',
): Promise<void> {
  if (amountCents <= 0) throw new Error('Amount must be greater than zero.')
  const why = requireWithdrawPurpose(purpose)
  await db.transaction('rw', db.goals, db.goalEvents, db.fundBorrows, async () => {
    const goal = await db.goals.get(goalId)
    if (!goal || goal.archived) throw new Error('Goal not found.')
    if (amountCents > goal.savedCents) {
      throw new Error('Cannot borrow more than you have saved.')
    }
    await db.goals.update(goalId, { savedCents: goal.savedCents - amountCents })
    await db.goalEvents.add({
      id: newId(),
      goalId,
      amountCents: -amountCents,
      date,
      notes: notes.trim(),
      purpose: why,
    })
    await db.fundBorrows.add({
      id: newId(),
      goalId,
      amountCents,
      remainingCents: amountCents,
      purpose: why,
      date,
      notes: notes.trim(),
    })
  })
}

export async function repayBorrow(
  borrowId: string,
  amountCents: number,
  date: string,
): Promise<void> {
  if (amountCents <= 0) throw new Error('Amount must be greater than zero.')
  await db.transaction('rw', db.goals, db.goalEvents, db.fundBorrows, async () => {
    const row = await db.fundBorrows.get(borrowId)
    if (!row) throw new Error('Borrow not found.')
    if (amountCents > row.remainingCents) {
      throw new Error('Cannot repay more than you owe.')
    }
    const goal = await db.goals.get(row.goalId)
    if (!goal || goal.archived) throw new Error('Goal not found.')
    await db.goals.update(row.goalId, { savedCents: goal.savedCents + amountCents })
    await db.goalEvents.add({
      id: newId(),
      goalId: row.goalId,
      amountCents,
      date,
      notes: `Repay ${row.purpose}`,
      purpose: '',
    })
    await db.fundBorrows.update(borrowId, {
      remainingCents: row.remainingCents - amountCents,
    })
  })
}

export async function setPeriodCapital(input: {
  capitalCents: number
  date: string
  periodStart: string
  keepCountDate?: boolean
}): Promise<void> {
  if (input.capitalCents < 0) throw new Error('Cash cannot be negative.')
  const current = await getSettings()
  const keepDate =
    input.keepCountDate &&
    current.capitalPeriodStart === input.periodStart &&
    current.capitalDate
  await updateSettings({
    capitalCents: input.capitalCents,
    capitalDate: keepDate || input.date,
    capitalPeriodStart: input.periodStart,
  })
}

export async function completeOnboarding(input: {
  displayName: string
  currency: string
  incomeCents: number
  repeatIncome: boolean
  payday1: number
  payday2: number
  limits: { id: string; monthlyLimitCents: number }[]
}): Promise<void> {
  const today = todayISO()
  const payday1 = input.payday1
  const payday2 = input.payday2
  const period = payPeriodRangeForDate(today, payday1, payday2)
  await db.transaction(
    'rw',
    db.settings,
    db.categories,
    db.transactions,
    db.recurring,
    async () => {
      const current = await getSettings()
      await db.settings.put({
        ...current,
        displayName: input.displayName.trim() || 'Leonel',
        currency: input.currency,
        periodMode: 'pay',
        payday1,
        payday2,
        onboarded: true,
      })
      for (const limit of input.limits) {
        if (limit.monthlyLimitCents < 0) continue
        await db.categories.update(limit.id, {
          monthlyLimitCents: limit.monthlyLimitCents,
        })
      }
      if (input.incomeCents > 0) {
        const days = payday1 === payday2 ? [payday1] : [payday1, payday2]
        let linkedId: string | undefined
        if (input.repeatIncome) {
          for (const day of days) {
            const dueDay = day >= 29 ? 31 : day
            const id = await addRecurring({
              name: `Paycheck (${paydayLabel(day)})`,
              kind: 'income',
              amountCents: input.incomeCents,
              categoryId: 'paycheck',
              frequency: 'monthly',
              nextDate: addMonthsClamped(today, 1),
              dueDay,
              autoLog: false,
              active: true,
            })
            if (isDueInPeriod(dueDay, period)) linkedId = id
          }
        }
        await addTransaction({
          kind: 'income',
          amountCents: input.incomeCents,
          date: today,
          categoryId: 'paycheck',
          payee: 'Paycheck',
          notes: '',
          recurringId: linkedId,
        })
      }
    },
  )
}

export async function addUtang(name: string, amountCents: number, date: string): Promise<string> {
  const who = name.trim()
  if (!who) throw new Error('Who do you owe?')
  if (amountCents <= 0) throw new Error('Amount must be greater than zero.')
  const id = newId()
  await db.utangs.add({
    id,
    name: who,
    amountCents,
    date,
    archived: false,
  })
  return id
}

export async function archiveUtang(id: string): Promise<void> {
  const row = await db.utangs.get(id)
  if (!row) throw new Error('Utang not found.')
  await db.utangs.update(id, { archived: true })
}

async function currentDailyMaxCents(): Promise<{ hasCapital: boolean; dailyMaxCents: number }> {
  const settings = await getSettings()
  const periodMode = settings.periodMode ?? 'pay'
  const payday1 = settings.payday1 ?? 1
  const payday2 = settings.payday2 ?? 16
  const today = todayISO()
  const range =
    periodMode === 'pay'
      ? payPeriodRangeForDate(today, payday1, payday2)
      : monthRangeForDate(today, settings.monthStartDay)
  if (!hasPeriodCapital(settings, range.start)) {
    return { hasCapital: false, dailyMaxCents: 0 }
  }
  const recurring = (await db.recurring.toArray()).filter((r) => r.active)
  const monthlyBillsCents = monthlyExpenseTotal(recurring)
  const billAllotmentCents = periodMode === 'pay' ? paycheckBillShare(monthlyBillsCents) : 0
  const goals = await db.goals.toArray()
  const goalEvents = await db.goalEvents.toArray()
  const goalReserveCents = periodMode === 'pay' ? goalAllotmentCents(goals) : 0
  const catchUpCents = periodMode === 'pay' ? goalCatchUpThisPeriod(goals, goalEvents, range) : 0
  const transactions = await db.transactions.toArray()
  const livingAfterCountCents = livingSpendOnOrAfter(
    transactions,
    settings.capitalDate || range.start,
    range,
  )
  const whatsLeftCents = whatsLeftFromCapital({
    capitalCents: settings.capitalCents ?? 0,
    billAllotmentCents,
    goalAllotmentCents: goalReserveCents,
    catchUpCents,
    livingAfterCountCents,
  })
  const todayLivingCents = livingSpendOnDate(transactions, today)
  const leftoverBeforeToday =
    whatsLeftCents +
    (settings.capitalDate && today >= settings.capitalDate ? todayLivingCents : 0)
  const daily = dailyBudget({
    leftoverBeforeTodayCents: leftoverBeforeToday,
    savePercent: clampSavePercent(settings.savePercent ?? 10),
    daysUntilPayday: daysUntil(today, addDays(range.end, 1)),
  })
  return { hasCapital: true, dailyMaxCents: daily.dailyMaxCents }
}

function scheduleDailyOverSync(date: string) {
  window.setTimeout(() => {
    void syncDailyOverForDate(date)
  }, 0)
}

export async function syncDailyOverForDate(date: string): Promise<void> {
  const { hasCapital, dailyMaxCents } = await currentDailyMaxCents()
  const existing = await db.dailyOvers.where('date').equals(date).first()
  if (!hasCapital) {
    if (existing) await db.dailyOvers.delete(existing.id)
    return
  }
  const transactions = await db.transactions.toArray()
  const spentCents = livingSpendOnDate(transactions, date)
  const over = overCents(spentCents, dailyMaxCents)
  if (over <= 0) {
    if (existing) await db.dailyOvers.delete(existing.id)
    return
  }
  await db.dailyOvers.put({
    id: existing?.id ?? dailyOverRowId(date),
    date,
    spentCents,
    dailyMaxCents,
    overCents: over,
  })
}
