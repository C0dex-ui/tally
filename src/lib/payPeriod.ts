import { addDays, parseISODate, toISODate, todayISO } from './dates.ts'

/** 31 means the last calendar day of that month. */
export const LAST_DAY = 31

export function clampPayday(day: number): number {
  return Math.min(LAST_DAY, Math.max(1, Math.trunc(day) || 1))
}

export function normalizePaydays(a: number, b: number): [number, number] {
  const x = clampPayday(a)
  const y = clampPayday(b)
  if (x === y) {
    const second = x >= 16 ? 1 : 16
    return x < second ? [x, second] : [second, x]
  }
  return x < y ? [x, y] : [y, x]
}

function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function dateOnPayday(year: number, monthIndex: number, payday: number): Date {
  const last = lastDayOfMonth(year, monthIndex)
  const day = Math.min(clampPayday(payday), last)
  return new Date(year, monthIndex, day)
}

/** Paycheck window containing `dateISO`: last payday through the day before the next. */
export function payPeriodRangeForDate(
  dateISO: string,
  payday1: number,
  payday2: number,
): { start: string; end: string } {
  const [p1, p2] = normalizePaydays(payday1, payday2)
  const date = parseISODate(dateISO || todayISO())
  const y = date.getFullYear()
  const m = date.getMonth()
  const d = date.getDate()
  const first = dateOnPayday(y, m, p1)
  const second = dateOnPayday(y, m, p2)
  const d1 = first.getDate()
  const d2 = second.getDate()

  let start: Date
  let nextStart: Date
  if (d >= d2) {
    start = second
    nextStart = dateOnPayday(y, m + 1, p1)
  } else if (d >= d1) {
    start = first
    nextStart = second
  } else {
    start = dateOnPayday(y, m - 1, p2)
    nextStart = first
  }
  const end = new Date(nextStart.getFullYear(), nextStart.getMonth(), nextStart.getDate())
  end.setDate(end.getDate() - 1)
  return { start: toISODate(start), end: toISODate(end) }
}

export function daysUntil(fromISO: string, toISO: string): number {
  const from = parseISODate(fromISO).getTime()
  const to = parseISODate(toISO).getTime()
  return Math.max(0, Math.round((to - from) / 86400000))
}

export function formatPeriodLabel(range: { start: string; end: string }): string {
  const start = parseISODate(range.start)
  const end = parseISODate(range.end)
  const a = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const b = end.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${a} – ${b}`
}

export function formatPeriodTick(iso: string): string {
  return parseISODate(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

export function payPeriodsInCalendarMonth(
  monthKey: string,
  payday1: number,
  payday2: number,
): { start: string; end: string }[] {
  const m = /^\d{4}-\d{2}$/.test(monthKey) ? monthKey : monthKey.slice(0, 7)
  const start = `${m}-01`
  const [y, mo] = m.split('-').map(Number)
  const last = new Date(y, mo, 0).getDate()
  const end = `${m}-${String(last).padStart(2, '0')}`
  const seen = new Set<string>()
  const ranges: { start: string; end: string }[] = []
  let cursor = start
  while (cursor <= end) {
    const range = payPeriodRangeForDate(cursor, payday1, payday2)
    if (!seen.has(range.start) && range.start.slice(0, 7) === m) {
      seen.add(range.start)
      ranges.push(range)
    }
    const next = addDays(range.end, 1)
    if (next <= cursor) break
    cursor = next
  }
  return ranges
}

export function lastNPayPeriods(
  anchorISO: string,
  payday1: number,
  payday2: number,
  n: number,
): { start: string; end: string }[] {
  const ranges: { start: string; end: string }[] = []
  let cursor = anchorISO
  for (let i = 0; i < n; i++) {
    const range = payPeriodRangeForDate(cursor, payday1, payday2)
    ranges.unshift(range)
    cursor = addDays(range.start, -1)
  }
  return ranges
}

export function paydayLabel(day: number): string {
  const d = clampPayday(day)
  if (d === LAST_DAY) return 'last day'
  const j = d % 10
  const k = d % 100
  if (j === 1 && k !== 11) return `${d}st`
  if (j === 2 && k !== 12) return `${d}nd`
  if (j === 3 && k !== 13) return `${d}rd`
  return `${d}th`
}

export const PAYDAY_PRESETS = [
  { id: 'halves', label: '1st and 16th', payday1: 1, payday2: 16, hint: 'Two ~15-day halves' },
  { id: 'mid-end', label: '15th and last day', payday1: 15, payday2: 31, hint: 'Common twice-a-month pay' },
  { id: 'first-mid', label: '1st and 15th', payday1: 1, payday2: 15, hint: 'Start and mid-month' },
] as const
