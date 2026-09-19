export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function todayISO(now = new Date()): string {
  return toISODate(now)
}

export function parseISODate(iso: string): Date {
  const m = typeof iso === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso) : null
  if (!m) throw new Error(`Invalid date: ${String(iso)}`)
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

export function addMonthsClamped(iso: string, months: number): string {
  const d = parseISODate(iso)
  const day = d.getDate()
  const start = new Date(d.getFullYear(), d.getMonth() + months, 1)
  const last = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
  start.setDate(Math.min(day, last))
  return toISODate(start)
}

export function clampMonthStartDay(day: number): number {
  return Math.min(28, Math.max(1, Math.trunc(day) || 1))
}

export function monthRangeForDate(
  dateISO: string,
  monthStartDay: number,
): { start: string; end: string } {
  const startDay = clampMonthStartDay(monthStartDay)
  const date = parseISODate(dateISO)
  const y = date.getFullYear()
  const m = date.getMonth()
  const d = date.getDate()
  const start =
    d >= startDay ? new Date(y, m, startDay) : new Date(y, m - 1, startDay)
  const end = new Date(start.getFullYear(), start.getMonth() + 1, startDay)
  end.setDate(end.getDate() - 1)
  return { start: toISODate(start), end: toISODate(end) }
}

export function inRange(dateISO: string, start: string, end: string): boolean {
  return dateISO >= start && dateISO <= end
}

export function formatMonthLabel(
  range: { start: string; end: string },
  monthStartDay: number,
): string {
  const start = parseISODate(range.start)
  const end = parseISODate(range.end)
  if (clampMonthStartDay(monthStartDay) === 1) {
    return start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  }
  const a = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const b = end.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${a} – ${b}`
}

export function formatShortDate(iso: string): string {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return ''
  return parseISODate(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function formatChartMonth(iso: string): string {
  return parseISODate(iso).toLocaleDateString(undefined, { month: 'short' })
}

export function formatMonthKey(key: string): string {
  const iso = /^\d{4}-\d{2}$/.test(key) ? `${key}-01` : key
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return key
  return parseISODate(iso).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

export function formatMonthYear(iso: string): string {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return ''
  return parseISODate(iso).toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  })
}

export function lastNMonthRanges(
  anchorISO: string,
  monthStartDay: number,
  n: number,
): { start: string; end: string }[] {
  const ranges: { start: string; end: string }[] = []
  let cursor = anchorISO
  for (let i = 0; i < n; i++) {
    const range = monthRangeForDate(cursor, monthStartDay)
    ranges.unshift(range)
    cursor = addDays(range.start, -1)
  }
  return ranges
}
