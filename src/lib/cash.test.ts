import { describe, expect, it } from 'vitest'
import { pocketCentsForCashOnHand } from './cash.ts'

describe('pocketCentsForCashOnHand', () => {
  it('lumps the missing cash into pocket spend', () => {
    expect(pocketCentsForCashOnHand(200000, 8000, 150000)).toEqual({
      pocketCents: 42000,
      extraCents: 0,
    })
  })

  it('clears pocket when cash matches the books', () => {
    expect(pocketCentsForCashOnHand(200000, 8000, 192000)).toEqual({
      pocketCents: 0,
      extraCents: 0,
    })
  })

  it('reports extra when counted cash is higher than books', () => {
    expect(pocketCentsForCashOnHand(200000, 8000, 210000)).toEqual({
      pocketCents: 0,
      extraCents: 18000,
    })
  })
})
