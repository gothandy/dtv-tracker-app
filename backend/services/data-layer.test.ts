import { describe, it, expect } from 'vitest'
import { calculateFinancialYear, calculateCurrentFY } from './data-layer'

describe('calculateFinancialYear', () => {
  it('Apr 1 is in FY of that year',   () => expect(calculateFinancialYear(new Date('2025-04-01'))).toBe(2025))
  it('Dec 15 is in FY of that year',  () => expect(calculateFinancialYear(new Date('2024-12-15'))).toBe(2024))
  it('Mar 31 is in previous FY',      () => expect(calculateFinancialYear(new Date('2025-03-31'))).toBe(2024))
  it('Jan 1 is in previous FY',       () => expect(calculateFinancialYear(new Date('2025-01-01'))).toBe(2024))
  it('Apr 1 boundary (FY2024)',       () => expect(calculateFinancialYear(new Date('2024-04-01'))).toBe(2024))
  it('Mar 31 boundary (FY2023)',      () => expect(calculateFinancialYear(new Date('2024-03-31'))).toBe(2023))
})

describe('calculateCurrentFY', () => {
  it('returns consistent shape', () => {
    const fy = calculateCurrentFY()
    expect(typeof fy.startYear).toBe('number')
    expect(fy.endYear).toBe(fy.startYear + 1)
    expect(fy.key).toBe(`FY${fy.startYear}`)
  })

  it('startYear matches calculateFinancialYear(today)', () => {
    const fy = calculateCurrentFY()
    expect(fy.startYear).toBe(calculateFinancialYear(new Date()))
  })
})
