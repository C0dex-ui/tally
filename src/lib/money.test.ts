import { describe, expect, it } from 'vitest'
import {
  centsToMajor,
  centsToMajorString,
  currencyFractionDigits,
  formatMajorGrouped,
  formatMoney,
  majorToCents,
  parseMajorInput,
} from './money.ts'

describe('currencyFractionDigits', () => {
  it('uses 2 for USD and 0 for JPY', () => {
    expect(currencyFractionDigits('USD')).toBe(2)
    expect(currencyFractionDigits('JPY')).toBe(0)
  })
})

describe('majorToCents', () => {
  it('converts dollars to cents', () => {
    expect(majorToCents(12.34, 'USD')).toBe(1234)
    expect(parseMajorInput('1.005', 'USD')).toBe(101)
  })

  it('stores yen as whole units', () => {
    expect(majorToCents(1000, 'JPY')).toBe(1000)
  })
})

describe('parseMajorInput', () => {
  it('accepts commas and dollars', () => {
    expect(parseMajorInput('1,234.50', 'USD')).toBe(123450)
    expect(parseMajorInput('0', 'USD')).toBe(0)
  })

  it('rejects empty, negative, and garbage', () => {
    expect(parseMajorInput('', 'USD')).toBeNull()
    expect(parseMajorInput('-4', 'USD')).toBeNull()
    expect(parseMajorInput('abc', 'USD')).toBeNull()
  })
})

describe('formatMoney', () => {
  it('formats USD with a minus for negatives', () => {
    expect(formatMoney(1234, 'USD')).toMatch(/12\.34/)
    expect(formatMoney(-500, 'USD')).toMatch(/^−/)
  })

  it('always groups with commas', () => {
    expect(formatMoney(3_600_000, 'USD')).toMatch(/36,000/)
    expect(formatMoney(3_600_000, 'PHP')).toMatch(/36,000/)
  })

  it('round-trips cents through major string', () => {
    expect(centsToMajor(199, 'USD')).toBe(1.99)
    expect(centsToMajorString(199, 'USD')).toBe('1.99')
  })

  it('puts commas in typed and stored amounts', () => {
    expect(centsToMajorString(3_600_000, 'USD')).toBe('36,000.00')
    expect(centsToMajorString(3_600_000, 'PHP')).toBe('36,000.00')
    expect(centsToMajorString(36_000, 'JPY')).toBe('36,000')
    expect(formatMajorGrouped('36000', 'USD')).toBe('36,000')
    expect(formatMajorGrouped('36000.', 'USD')).toBe('36,000.')
    expect(parseMajorInput('36,000.00', 'USD')).toBe(3_600_000)
  })
})
