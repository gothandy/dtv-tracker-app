import { describe, it, expect } from 'vitest'
import type { RecordListItemResponse } from '../../../types/api-responses'
import { DEFAULT_RECORD_FILTERS, matchesRecordFilters, recordFilterOptions, sortRecords } from './recordFilters'
import { ukToday } from '../../../types/uk-date'

const rec = (id: number, type: string, status: string, profileName: string, date: string): RecordListItemResponse => ({
  id, type, status, storedStatus: status, label: status, date, profileId: id, profileName, profileSlug: `p-${id}`,
})

const today = ukToday()
const nextYear = `${parseInt(today.slice(0, 4), 10) + 1}${today.slice(4)}`
const records = [
  rec(1, 'Photo Consent', 'Accepted', 'Bea', '2024-05-01'),
  rec(2, 'Discount Card', 'Invited', 'Al', '2025-03-31'),
  rec(3, 'Discount Card', 'Accepted', 'Cy', '2025-04-01'),
  rec(4, 'First Aid Certificate', 'Expires', 'Di', nextYear),
  rec(5, 'Discount Card', 'Accepted', 'Ed', ''),
]
const f = (change: Partial<typeof DEFAULT_RECORD_FILTERS>) => ({ ...DEFAULT_RECORD_FILTERS, ...change })
const ids = (filters: typeof DEFAULT_RECORD_FILTERS) => records.filter(r => matchesRecordFilters(r, filters)).map(r => r.id)

describe('matchesRecordFilters', () => {
  it('shows everything by default, including Records with no Date', () => {
    expect(ids(DEFAULT_RECORD_FILTERS)).toEqual([1, 2, 3, 4, 5])
  })

  it('filters to one Profile’s Records', () => {
    expect(ids(f({ profileId: 3 }))).toEqual([3])
    expect(ids(f({ profileId: 3, type: 'Photo Consent' }))).toEqual([])
  })

  it('filters by Type and Status', () => {
    expect(ids(f({ type: 'Discount Card' }))).toEqual([2, 3, 5])
    expect(ids(f({ type: 'Discount Card', status: 'Accepted' }))).toEqual([3, 5])
  })

  it('filters by the financial year of the Record’s Date (1 April to 31 March); no Date only under All', () => {
    expect(ids(f({ fy: 'FY2024' }))).toEqual([1, 2])
    expect(ids(f({ fy: 'FY2025' }))).toEqual([3])
  })

  it('Future is today or later; Rolling is the year up to today', () => {
    expect(ids(f({ fy: 'future' }))).toEqual([4])
    expect(ids(f({ fy: 'rolling' }))).not.toContain(4)
  })
})

describe('recordFilterOptions', () => {
  it('offers only the choices left by the other filters, FY in the usual order', () => {
    const options = recordFilterOptions(records, f({ type: 'Discount Card' }))
    expect(options.statuses).toEqual(['Invited', 'Accepted'])
    expect(options.types).toEqual(['Photo Consent', 'Discount Card', 'First Aid Certificate'])
    expect(options.fyOptions.map(o => o.value)).toEqual(['all', 'FY2024', 'FY2025'])
  })

  it('offers Future when a Record is dated today or later', () => {
    expect(recordFilterOptions(records, DEFAULT_RECORD_FILTERS).fyOptions.map(o => o.value)).toContain('future')
  })
})

describe('sortRecords', () => {
  it('sorts by Type in the Types order, then Profile name', () => {
    expect(sortRecords(records).map(r => r.id)).toEqual([1, 2, 3, 5, 4])
  })
})
