import { describe, it, expect } from 'vitest'
import { calculateFinancialYear, calculateCurrentFY, calculateSessionStats, toMatchName } from './data-layer'
import type { SharePointEntry } from '../../types/sharepoint'

describe('toMatchName', () => {
  it('returns empty string for undefined',        () => expect(toMatchName(undefined)).toBe(''))
  it('returns empty string for empty string',     () => expect(toMatchName('')).toBe(''))
  it('lowercases',                                () => expect(toMatchName('JOHN SMITH')).toBe('john smith'))
  it('preserves hyphens',                         () => expect(toMatchName('Smith-Jones')).toBe('smith-jones'))
  it('replaces apostrophes with space',           () => expect(toMatchName("O'Brien")).toBe('o brien'))
  it('collapses multiple spaces',                 () => expect(toMatchName('John  Smith')).toBe('john smith'))
  it('trims leading and trailing whitespace',     () => expect(toMatchName('  John Smith  ')).toBe('john smith'))
  it('collapses mixed punctuation to one space',  () => expect(toMatchName('Dr. J. Smith')).toBe('dr j smith'))
  it('preserves digits',                          () => expect(toMatchName('Team2')).toBe('team2'))
  it('normalises accented characters via NFD',    () => expect(toMatchName('René')).toBe('rené'.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()))
  it('René and Rene normalise to the same key',   () => expect(toMatchName('René')).toBe(toMatchName('Rene')))
  it('Renée and Renee normalise to the same key', () => expect(toMatchName('Renée')).toBe(toMatchName('Renee')))
})

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

// ---- minimal entry fixture for calculateSessionStats ----

// SESSION_LOOKUP = 'SessionLookupId' — value type matches what calculateSessionStats uses as map key
function entry(sessionId: string, overrides: Partial<SharePointEntry> = {}): SharePointEntry {
  return { ID: 1, Created: '', Modified: '', SessionLookupId: sessionId, Hours: 0, ...overrides }
}

describe('calculateSessionStats', () => {
  it('returns empty map for empty entries array', () => {
    expect(calculateSessionStats([]).size).toBe(0)
  })

  it('counts registrations for a session', () => {
    const stats = calculateSessionStats([entry('1'), entry('1'), entry('1')])
    expect(stats.get('1')?.registrations).toBe(3)
  })

  it('sums hours across entries', () => {
    const stats = calculateSessionStats([entry('1', { Hours: 3 }), entry('1', { Hours: 1.5 })])
    expect(stats.get('1')?.hours).toBeCloseTo(4.5)
  })

  it('excludes cancelled entries from all counts', () => {
    const stats = calculateSessionStats([
      entry('1', { Hours: 3 }),
      entry('1', { Hours: 2, Cancelled: '2024-06-01T10:00:00Z' }),
    ])
    expect(stats.get('1')?.registrations).toBe(1)
    expect(stats.get('1')?.hours).toBeCloseTo(3)
  })

  it('counts newCount from profileFirstSessionMap', () => {
    const profileFirstSessionMap = new Map([[42, 1]])
    const stats = calculateSessionStats(
      [entry('1', { ProfileLookupId: '42' }), entry('1', { ProfileLookupId: '99' })],
      profileFirstSessionMap
    )
    expect(stats.get('1')?.newCount).toBe(1)
  })

  it('counts regularCount from Labels', () => {
    const stats = calculateSessionStats([entry('1', { Labels: ['Regular'] })])
    expect(stats.get('1')?.regularCount).toBe(1)
  })

  it('counts childCount from AccompanyingAdultLookupId', () => {
    const stats = calculateSessionStats([entry('1', { AccompanyingAdultLookupId: 7 })])
    expect(stats.get('1')?.childCount).toBe(1)
  })

  it('counts eventbriteCount from EventbriteAttendeeID', () => {
    const stats = calculateSessionStats([entry('1', { EventbriteAttendeeID: '12345' })])
    expect(stats.get('1')?.eventbriteCount).toBe(1)
  })

  it('handles multiple sessions independently', () => {
    const stats = calculateSessionStats([entry('1'), entry('1'), entry('2')])
    expect(stats.get('1')?.registrations).toBe(2)
    expect(stats.get('2')?.registrations).toBe(1)
  })

  it('ignores entries with no SessionLookupId', () => {
    const stats = calculateSessionStats([{ ID: 1, Created: '', Modified: '', Hours: 3 } as SharePointEntry])
    expect(stats.size).toBe(0)
  })
})
