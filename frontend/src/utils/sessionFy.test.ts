import { describe, it, expect } from 'vitest'
import { dateMatchesFy, financialYearOfDate } from './sessionFy'

describe('financialYearOfDate', () => {
  it('runs 1 April to 31 March', () => {
    expect(financialYearOfDate('2025-03-31')).toBe('FY2024')
    expect(financialYearOfDate('2025-04-01')).toBe('FY2025')
  })
})

describe('dateMatchesFy', () => {
  const today = '2026-06-01'
  it('Future is today or later', () => {
    expect(dateMatchesFy('2026-06-01', 'future', today)).toBe(true)
    expect(dateMatchesFy('2026-05-31', 'future', today)).toBe(false)
  })

  it('Rolling is the year up to the given today, not the real one', () => {
    expect(dateMatchesFy('2025-06-01', 'rolling', today)).toBe(true)
    expect(dateMatchesFy('2025-05-31', 'rolling', today)).toBe(false)
    expect(dateMatchesFy('2026-06-02', 'rolling', today)).toBe(false)
  })

  it('a blank date only matches All', () => {
    expect(dateMatchesFy(undefined, 'all', today)).toBe(true)
    expect(dateMatchesFy('', 'FY2025', today)).toBe(false)
  })
})
