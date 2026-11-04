import { describe, it, expect } from 'vitest'
import { hoursInView, matchesHoursFilter } from './hours'

describe('matchesHoursFilter', () => {
  const inFilter = (filter: string) => [0, 0.5, 14.9, 15, 29.9, 30, 31].filter(h => matchesHoursFilter(h, filter))

  it('includes the lower boundary in each band', () => {
    expect(inFilter('0')).toEqual([0])
    expect(inFilter('lt15')).toEqual([0.5, 14.9])
    expect(inFilter('15plus')).toEqual([15, 29.9, 30, 31])
    expect(inFilter('15to30')).toEqual([15, 29.9])
    expect(inFilter('30plus')).toEqual([30, 31])
  })

  it('matches everything with no filter', () => {
    expect(inFilter('')).toHaveLength(7)
    expect(matchesHoursFilter(3, undefined)).toBe(true)
  })
})

describe('hoursInView', () => {
  it('uses all-time hours for "all", the selected period otherwise', () => {
    const p = { hoursAll: 100, hoursThisFY: 12 }
    expect(hoursInView(p, 'all')).toBe(100)
    expect(hoursInView(p, 'FY2025')).toBe(12)
    expect(hoursInView(p, 'rolling')).toBe(12)
  })
})
