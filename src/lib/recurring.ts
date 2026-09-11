import { addDays, addMonthsClamped } from './dates.ts'
import type { Frequency } from '../db/types.ts'

export function advanceNextDate(nextDate: string, frequency: Frequency): string {
  if (frequency === 'weekly') return addDays(nextDate, 7)
  if (frequency === 'monthly') return addMonthsClamped(nextDate, 1)
  return addMonthsClamped(nextDate, 12)
}

export function isDue(
  nextDate: string,
  today: string,
  active: boolean,
): boolean {
  return active && nextDate <= today
}

export function catchUpDates(
  nextDate: string,
  frequency: Frequency,
  today: string,
  max = 24,
): { dates: string[]; nextDate: string } {
  const dates: string[] = []
  let cursor = nextDate
  let i = 0
  while (cursor <= today && i < max) {
    dates.push(cursor)
    cursor = advanceNextDate(cursor, frequency)
    i += 1
  }
  return { dates, nextDate: cursor }
}
