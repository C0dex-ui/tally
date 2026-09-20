import { describe, expect, it } from 'vitest'
import { dailyOverRowId, overCents } from './dailyOver.ts'

describe('overCents', () => {
  it('is spent minus the daily max', () => {
    expect(overCents(700_00, 500_00)).toBe(200_00)
  })

  it('is zero when spend stays under the limit', () => {
    expect(overCents(400_00, 500_00)).toBe(0)
    expect(overCents(500_00, 500_00)).toBe(0)
  })

  it('treats a zero max as all living spend over', () => {
    expect(overCents(150_00, 0)).toBe(150_00)
  })
})

describe('dailyOverRowId', () => {
  it('is stable per date', () => {
    expect(dailyOverRowId('2026-09-20')).toBe('over-2026-09-20')
  })
})
