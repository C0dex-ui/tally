import { addMonthsClamped, inRange } from './dates.ts'

export const DEFAULT_EMERGENCY_USES = [
  'Medical',
  'Lost income',
  'Urgent repair',
  'Family emergency',
  'Other',
] as const

export function isEmergencyGoal(goal: { name: string }): boolean {
  return /emergency/i.test(goal.name)
}

export function usesForGoal(goal: { name: string; allowedUses?: string[] }): string[] {
  if (goal.allowedUses && goal.allowedUses.length > 0) return goal.allowedUses
  if (isEmergencyGoal(goal)) return [...DEFAULT_EMERGENCY_USES]
  return []
}

export function sortGoalEventsNewestFirst<T extends { date: string; id: string }>(
  events: T[],
): T[] {
  return [...events].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date)
    return b.id.localeCompare(a.id)
  })
}

export function lastUse(
  events: {
    amountCents: number
    date: string
    purpose?: string
    notes: string
    id?: string
  }[],
): { date: string; purpose: string; amountCents: number } | undefined {
  const used = [...events.filter((e) => e.amountCents < 0)].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date)
    return (b.id ?? '').localeCompare(a.id ?? '')
  })
  const e = used[0]
  if (!e) return undefined
  const purpose = (e.purpose || e.notes || 'Unspecified').trim()
  return { date: e.date, purpose, amountCents: Math.abs(e.amountCents) }
}

export function requireWithdrawPurpose(purpose: string): string {
  const trimmed = purpose.trim()
  if (!trimmed) throw new Error('Say what you used the fund for.')
  return trimmed
}

export function paycheckGoalShare(monthlyCents: number, paychecks = 2): number {
  if (monthlyCents <= 0) return 0
  if (paychecks <= 0) return monthlyCents
  return Math.round(monthlyCents / paychecks)
}

export function remainingGoalCents(goal: { targetCents: number; savedCents: number }): number {
  return Math.max(0, goal.targetCents - goal.savedCents)
}

export function goalPaycheckSetAside(goal: {
  targetCents: number
  savedCents: number
  monthlyContributionCents?: number
  archived?: boolean
}): number {
  if (goal.archived) return 0
  const remaining = remainingGoalCents(goal)
  if (remaining <= 0) return 0
  const share = paycheckGoalShare(goal.monthlyContributionCents ?? 0)
  return Math.min(share, remaining)
}

export function goalAllotmentCents(
  goals: {
    targetCents: number
    savedCents: number
    monthlyContributionCents?: number
    archived?: boolean
  }[],
): number {
  return goals.reduce((sum, g) => sum + goalPaycheckSetAside(g), 0)
}

export function timeToGoal(input: {
  remainingCents: number
  monthlyCents: number
  fromISO?: string
}): {
  months: number
  paydays: number
  years: number
  reachISO?: string
} | null {
  const remaining = Math.max(0, input.remainingCents)
  const monthly = input.monthlyCents
  if (remaining <= 0) return { months: 0, paydays: 0, years: 0 }
  if (monthly <= 0) return null
  const months = Math.ceil(remaining / monthly)
  const share = paycheckGoalShare(monthly)
  const paydays = share > 0 ? Math.ceil(remaining / share) : months
  const years = months / 12
  const from = input.fromISO
  return {
    months,
    paydays,
    years,
    reachISO: from ? addMonthsClamped(from, months) : undefined,
  }
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

export interface MissedMonth {
  month: string
  expectedCents: number
  putCents: number
  stillDueCents: number
}

export function missedMonths(input: {
  monthlyCents: number
  startedOn: string
  contributions: { amountCents: number; date: string }[]
  today: string
}): MissedMonth[] {
  const monthly = input.monthlyCents
  if (monthly <= 0 || !input.startedOn) return []
  const start = monthKey(input.startedOn)
  const current = monthKey(input.today)
  if (start >= current) return []

  const putByMonth = new Map<string, number>()
  for (const c of input.contributions) {
    if (c.amountCents <= 0) continue
    const key = monthKey(c.date)
    putByMonth.set(key, (putByMonth.get(key) ?? 0) + c.amountCents)
  }

  const rows: MissedMonth[] = []
  let cursor = `${start}-01`
  while (monthKey(cursor) < current) {
    const key = monthKey(cursor)
    const putCents = putByMonth.get(key) ?? 0
    const stillDueCents = Math.max(0, monthly - putCents)
    if (stillDueCents > 0) {
      rows.push({ month: key, expectedCents: monthly, putCents, stillDueCents })
    }
    cursor = addMonthsClamped(cursor, 1)
  }
  return rows
}

export function missedTotal(rows: MissedMonth[]): number {
  return rows.reduce((s, r) => s + r.stillDueCents, 0)
}

export function catchUpPaidInRange(
  contributions: { amountCents: number; date: string }[],
  range: { start: string; end: string },
  missedBefore: MissedMonth[],
): number {
  const added = contributions
    .filter((c) => c.amountCents > 0 && inRange(c.date, range.start, range.end))
    .reduce((s, c) => s + c.amountCents, 0)
  return Math.min(added, missedTotal(missedBefore))
}

export function isRepayEvent(event: { notes?: string }): boolean {
  return /^Repay /i.test(event.notes ?? '')
}

export function contributionsOf(
  events: { amountCents: number; date: string; notes?: string }[],
): { amountCents: number; date: string }[] {
  return events
    .filter((e) => e.amountCents > 0 && !isRepayEvent(e))
    .map((e) => ({ amountCents: e.amountCents, date: e.date }))
}

export function repayPaidInRange(
  events: { amountCents: number; date: string; notes?: string }[],
  range: { start: string; end: string },
): number {
  return events
    .filter(
      (e) =>
        e.amountCents > 0 &&
        isRepayEvent(e) &&
        inRange(e.date, range.start, range.end),
    )
    .reduce((s, e) => s + e.amountCents, 0)
}

export function goalStartedOn(
  goal: { startedOn?: string },
  events: { amountCents: number; date: string }[],
  fallback = '',
): string {
  if (goal.startedOn) return goal.startedOn
  const first = [...events]
    .filter((e) => e.amountCents > 0)
    .sort((a, b) => a.date.localeCompare(b.date))[0]
  return first?.date ?? fallback
}

export function missedForGoal(
  goal: { monthlyContributionCents?: number; startedOn?: string },
  events: { amountCents: number; date: string }[],
  today: string,
): MissedMonth[] {
  return missedMonths({
    monthlyCents: goal.monthlyContributionCents ?? 0,
    startedOn: goalStartedOn(goal, events),
    contributions: contributionsOf(events),
    today,
  })
}

export function catchUpForGoal(
  goal: { monthlyContributionCents?: number; startedOn?: string },
  events: { amountCents: number; date: string }[],
  range: { start: string; end: string },
): number {
  const missedBefore = missedMonths({
    monthlyCents: goal.monthlyContributionCents ?? 0,
    startedOn: goalStartedOn(goal, events),
    contributions: contributionsOf(events),
    today: range.start,
  })
  return catchUpPaidInRange(contributionsOf(events), range, missedBefore)
}

export function goalCatchUpThisPeriod(
  goals: {
    id: string
    archived?: boolean
    monthlyContributionCents?: number
    startedOn?: string
  }[],
  events: { goalId: string; amountCents: number; date: string; notes?: string }[],
  range: { start: string; end: string },
): number {
  const monthCatchUp = goals
    .filter((g) => !g.archived)
    .reduce((sum, g) => {
      const ev = events.filter((e) => e.goalId === g.id)
      return sum + catchUpForGoal(g, ev, range)
    }, 0)
  return monthCatchUp + repayPaidInRange(events, range)
}

export function formatTimeToGoal(
  eta: { months: number; paydays: number } | null,
): string {
  if (!eta) return 'Set a monthly amount'
  if (eta.months === 0) return 'Reached'
  const years = Math.floor(eta.months / 12)
  const rem = eta.months % 12
  let span: string
  if (years > 0 && rem === 0) span = years === 1 ? '1 year' : `${years} years`
  else if (years > 0) span = `${years}y ${rem}mo`
  else span = eta.months === 1 ? '1 month' : `${eta.months} months`
  const paydayLabel = eta.paydays === 1 ? '1 payday' : `${eta.paydays} paydays`
  return `${span} · ${paydayLabel}`
}

