import { describe, it, expect } from 'vitest'
import { ukDate, ukToday, ukYearAgo } from './uk-date'

describe('ukToday', () => {
  it('gives the UK date during BST, where UTC is still the day before', () => {
    // 00:30 BST on 2 Jul 2026 is 23:30 UTC on 1 Jul 2026
    expect(ukToday(new Date('2026-07-01T23:30:00Z'))).toBe('2026-07-02')
  })

  it('matches the UTC date in winter (GMT)', () => {
    expect(ukToday(new Date('2026-11-02T10:00:00Z'))).toBe('2026-11-02')
  })

  it('stays on the same day late in the evening during BST', () => {
    // 23:30 BST on 2 Jul 2026 is 22:30 UTC on 2 Jul 2026
    expect(ukToday(new Date('2026-07-02T22:30:00Z'))).toBe('2026-07-02')
  })

  it('handles the clocks going forward', () => {
    // 01:30 UTC on 29 Mar 2026 is 02:30 BST, just after the change
    expect(ukToday(new Date('2026-03-29T01:30:00Z'))).toBe('2026-03-29')
  })
})

describe('ukDate', () => {
  it('gives the UK date of any moment', () => {
    expect(ukDate(new Date('2025-06-30T23:15:00Z'))).toBe('2025-07-01')
  })
})

describe('ukYearAgo', () => {
  it('is the same UK date last year', () => {
    expect(ukYearAgo(new Date('2026-11-02T10:00:00Z'))).toBe('2025-11-02')
  })

  it('counts back from the UK date, not the UTC one', () => {
    // 00:30 BST on 2 Jul 2026: UK date 2 Jul, so a year ago is 2 Jul 2025
    expect(ukYearAgo(new Date('2026-07-01T23:30:00Z'))).toBe('2025-07-02')
  })

  it('turns 29 Feb into 1 Mar, as setFullYear did', () => {
    expect(ukYearAgo(new Date('2028-02-29T12:00:00Z'))).toBe('2027-03-01')
  })
})
