import { describe, it, expect } from 'vitest'
import type { RecordListItemResponse } from '../../../types/api-responses'
import { DEFAULT_RECORD_FILTERS, matchesRecordFilters, recordFilterOptions, recordHoursIn, sortRecords } from './recordFilters'

const rec = (id: number, type: string, status: string, profileName: string, hoursByFY: Record<string, number> = {}): RecordListItemResponse => ({
  id, type, status, storedStatus: status, date: '2026-01-01', profileId: id, profileName, profileSlug: `p-${id}`,
  hoursByFY, sessionsByFY: Object.fromEntries(Object.keys(hoursByFY).map(k => [k, 1])),
})

const records = [
  rec(1, 'Photo Consent', 'Accepted', 'Bea', { FY2025: 10, FY2026: 20 }),
  rec(2, 'Discount Card', 'Invited', 'Al', { FY2026: 15 }),
  rec(3, 'Discount Card', 'Accepted', 'Cy', { FY2025: 30 }),
  rec(4, 'DofE', 'Accepted', 'Di'),
]
const f = (change: Partial<typeof DEFAULT_RECORD_FILTERS>) => ({ ...DEFAULT_RECORD_FILTERS, ...change })

describe('recordHoursIn', () => {
  it('sums every year for All, or takes the chosen FY', () => {
    expect(recordHoursIn(records[0], 'all')).toBe(30)
    expect(recordHoursIn(records[0], 'FY2026')).toBe(20)
    expect(recordHoursIn(records[3], 'FY2026')).toBe(0)
  })
})

describe('matchesRecordFilters', () => {
  const ids = (filters: typeof DEFAULT_RECORD_FILTERS) => records.filter(r => matchesRecordFilters(r, filters)).map(r => r.id)

  it('shows everything by default', () => {
    expect(ids(DEFAULT_RECORD_FILTERS)).toEqual([1, 2, 3, 4])
  })

  it('filters by Type and Status', () => {
    expect(ids(f({ type: 'Discount Card' }))).toEqual([2, 3])
    expect(ids(f({ type: 'Discount Card', status: 'Accepted' }))).toEqual([3])
  })

  it('shows only Profiles active in a chosen FY, unless filtering for 0h', () => {
    expect(ids(f({ fy: 'FY2026' }))).toEqual([1, 2])
    expect(ids(f({ fy: 'FY2026', hours: '0' }))).toEqual([3, 4])
  })

  it('uses the Hours bands on the chosen FY, 15 and 30 included in their band', () => {
    expect(ids(f({ fy: 'FY2026', hours: '15to30' }))).toEqual([1, 2])
    expect(ids(f({ fy: 'all', hours: '30plus' }))).toEqual([1, 3])
  })
})

describe('recordFilterOptions', () => {
  it('offers only the choices left by the other filters', () => {
    const options = recordFilterOptions(records, f({ type: 'Discount Card' }), ['FY2024', 'FY2025', 'FY2026'])
    expect(options.statuses).toEqual(['Invited', 'Accepted'])
    expect(options.types).toEqual(['Photo Consent', 'Discount Card', 'DofE'])
    expect(options.financialYears).toEqual(['FY2025', 'FY2026'])
    expect(options.hours).toEqual(['15plus', '15to30', '30plus'])
  })
})

describe('sortRecords', () => {
  it('sorts by Type in the Types table order, then Profile name', () => {
    expect(sortRecords(records).map(r => r.id)).toEqual([1, 2, 3, 4])
  })
})
