import { describe, expect, it } from 'vitest'
import type { EntryListItemResponse } from '../../../types/api-responses'
import {
  entryQualityOptionsForEntries,
  isEntryError,
  matchesEntryQualityFilter,
  showEntryQualityFilter,
} from './entryQuality'

const TODAY = '2026-05-15'

function entry(overrides: Partial<EntryListItemResponse> = {}): EntryListItemResponse {
  return {
    id: 1,
    date: '2026-04-01',
    groupKey: 'dig',
    groupName: 'Dig',
    checkedIn: false,
    hours: 0,
    count: 1,
    isGroup: false,
    hasAccompanyingAdult: false,
    ...overrides,
  }
}

describe('entryQuality', () => {
  it('flags past entries with zero hours regardless of check-in', () => {
    expect(isEntryError(entry({ checkedIn: false, hours: 0 }), TODAY)).toBe(true)
    expect(isEntryError(entry({ checkedIn: true, hours: 0 }), TODAY)).toBe(true)
    expect(isEntryError(entry({ checkedIn: false, hours: 3 }), TODAY)).toBe(false)
    expect(isEntryError(entry({ checkedIn: true, hours: 3 }), TODAY)).toBe(false)
    expect(isEntryError(entry({ date: '2026-06-01', hours: 0 }), TODAY)).toBe(false)
    expect(isEntryError(entry({ hours: 0, cancelled: 'x' }), TODAY)).toBe(false)
  })

  it('matchesEntryQualityFilter and legacy URL values', () => {
    const err = entry({ hours: 0 })
    const ok = entry({ hours: 3 })

    expect(matchesEntryQualityFilter(err, 'error', TODAY)).toBe(true)
    expect(matchesEntryQualityFilter(err, 'unchecked', TODAY)).toBe(true)
    expect(matchesEntryQualityFilter(err, 'no-hours', TODAY)).toBe(true)
    expect(matchesEntryQualityFilter(ok, 'no-error', TODAY)).toBe(true)
    expect(matchesEntryQualityFilter(ok, 'error', TODAY)).toBe(false)
  })

  it('builds dynamic options from the loaded entry set', () => {
    const entries = [
      entry({ hours: 0 }),
      entry({ id: 2, hours: 3 }),
    ]
    const options = entryQualityOptionsForEntries(entries, TODAY)
    expect(options.map(o => o.value)).toEqual(['error', 'no-error'])
    expect(showEntryQualityFilter(entries, TODAY)).toBe(true)
  })

  it('hides quality filter when only future sessions are loaded', () => {
    const entries = [entry({ date: '2026-06-01', hours: 0 })]
    expect(showEntryQualityFilter(entries, TODAY)).toBe(false)
    expect(entryQualityOptionsForEntries(entries, TODAY).map(o => o.value)).toEqual(['no-error'])
  })
})
