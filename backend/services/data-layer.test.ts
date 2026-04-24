import { describe, it, expect } from 'vitest'
import { calculateFinancialYear, calculateCurrentFY, calculateSessionStats } from './data-layer'
import type { SharePointEntry } from '../../types/sharepoint'

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

  it('counts newCount from snapshot.booking = New', () => {
    const newStats = JSON.stringify({ snapshot: { booking: 'New' } })
    const stats = calculateSessionStats([entry('1', { Stats: newStats }), entry('1')])
    expect(stats.get('1')?.newCount).toBe(1)
  })

  it('counts regularCount from snapshot.booking = Regular', () => {
    const regStats = JSON.stringify({ snapshot: { booking: 'Regular' } })
    const stats = calculateSessionStats([entry('1', { Stats: regStats })])
    expect(stats.get('1')?.regularCount).toBe(1)
  })

  it('counts childCount from snapshot.isChild', () => {
    const childStats = JSON.stringify({ snapshot: { isChild: true } })
    const stats = calculateSessionStats([entry('1', { Stats: childStats })])
    expect(stats.get('1')?.childCount).toBe(1)
  })

  it('counts eventbriteCount from manual.eventbrite', () => {
    const ebStats = JSON.stringify({ manual: { eventbrite: true } })
    const stats = calculateSessionStats([entry('1', { Stats: ebStats })])
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
