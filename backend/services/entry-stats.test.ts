import { describe, it, expect } from 'vitest'
import { computeEntryStatsForEntry } from './entry-stats'
import type { SharePointEntry, SharePointProfile, SharePointRecord } from '../../types/sharepoint'
import type { EntryStatsManual } from '../../types/entry-stats'

// ---- minimal fixtures ----

function entry(overrides: Partial<SharePointEntry> = {}): SharePointEntry {
  return { ID: 1, Created: '2024-01-01T00:00:00Z', Modified: '2024-01-01T00:00:00Z', SessionLookupId: 100, ...overrides }
}

function profile(overrides: Partial<SharePointProfile> = {}): SharePointProfile {
  return { ID: 1, Created: '2024-01-01T00:00:00Z', Modified: '2024-01-01T00:00:00Z', ...overrides }
}

function record(type: string, status: string, date?: string): SharePointRecord {
  return { ID: 1, Created: '2024-01-01T00:00:00Z', Modified: '2024-01-01T00:00:00Z', Type: type, Status: status, Date: date }
}

const profileStatsWithSessions = (sessionIds: number[]) =>
  JSON.stringify({ sessionIds })

// ---- booking flag ----

describe('computeEntryStatsForEntry — booking', () => {
  it('Regular: sessionGroupId is in regularGroupIds', () => {
    const result = computeEntryStatsForEntry(entry(), profile(), undefined, [], 10, [10])
    expect(result.snapshot?.booking).toBe('Regular')
  })

  it('New: entry sessionId is first element of profileStats.sessionIds', () => {
    const result = computeEntryStatsForEntry(
      entry({ SessionLookupId: 5 }),
      profile(),
      profileStatsWithSessions([5, 10, 20]),
      [],
      undefined,
      []
    )
    expect(result.snapshot?.booking).toBe('New')
  })

  it('Repeat (booking omitted): not first session, not a regular', () => {
    const result = computeEntryStatsForEntry(
      entry({ SessionLookupId: 5 }),
      profile(),
      profileStatsWithSessions([3, 5]),
      [],
      undefined,
      []
    )
    expect(result.snapshot?.booking).toBeUndefined()
  })

  it('Regular takes precedence over New when both would apply', () => {
    // sessionGroupId in regularGroupIds AND first in sessionIds
    const result = computeEntryStatsForEntry(
      entry({ SessionLookupId: 5 }),
      profile(),
      profileStatsWithSessions([5]),
      [],
      10,
      [10]
    )
    expect(result.snapshot?.booking).toBe('Regular')
  })
})

// ---- isChild ----

describe('computeEntryStatsForEntry — isChild', () => {
  it('isChild: true when AccompanyingAdultLookupId is set', () => {
    const result = computeEntryStatsForEntry(
      entry({ AccompanyingAdultLookupId: 42 }),
      profile(), undefined, [], undefined, []
    )
    expect(result.snapshot?.isChild).toBe(true)
  })

  it('isChild: omitted when AccompanyingAdultLookupId is absent', () => {
    const result = computeEntryStatsForEntry(entry(), profile(), undefined, [], undefined, [])
    expect(result.snapshot?.isChild).toBeUndefined()
  })
})

// ---- isGroup ----

describe('computeEntryStatsForEntry — isGroup', () => {
  it('isGroup: true when profile.IsGroup is true', () => {
    const result = computeEntryStatsForEntry(entry(), profile({ IsGroup: true }), undefined, [], undefined, [])
    expect(result.snapshot?.isGroup).toBe(true)
  })

  it('isGroup: omitted when profile.IsGroup is false', () => {
    const result = computeEntryStatsForEntry(entry(), profile({ IsGroup: false }), undefined, [], undefined, [])
    expect(result.snapshot?.isGroup).toBeUndefined()
  })
})

// ---- consent / membership / card flags ----

describe('computeEntryStatsForEntry — record-derived flags', () => {
  it('noPhoto and noConsent: both true when no records', () => {
    const result = computeEntryStatsForEntry(entry(), profile(), undefined, [], undefined, [])
    expect(result.snapshot?.noPhoto).toBe(true)
    expect(result.snapshot?.noConsent).toBe(true)
  })

  it('noPhoto: omitted when Photo Consent Accepted', () => {
    const result = computeEntryStatsForEntry(entry(), profile(), undefined, [record('Photo Consent', 'Accepted')], undefined, [])
    expect(result.snapshot?.noPhoto).toBeUndefined()
  })

  it('noConsent: omitted when Privacy Consent Accepted', () => {
    const result = computeEntryStatsForEntry(entry(), profile(), undefined, [record('Privacy Consent', 'Accepted')], undefined, [])
    expect(result.snapshot?.noConsent).toBeUndefined()
  })

  it('isMember: true when Charity Membership Accepted', () => {
    const result = computeEntryStatsForEntry(entry(), profile(), undefined, [record('Charity Membership', 'Accepted')], undefined, [])
    expect(result.snapshot?.isMember).toBe(true)
  })

  it('isMember: omitted when Charity Membership is Invited (not Accepted)', () => {
    const result = computeEntryStatsForEntry(entry(), profile(), undefined, [record('Charity Membership', 'Invited')], undefined, [])
    expect(result.snapshot?.isMember).toBeUndefined()
  })

  it('hasDiscountCard: true when Discount Card Accepted', () => {
    const result = computeEntryStatsForEntry(entry(), profile(), undefined, [record('Discount Card', 'Accepted')], undefined, [])
    expect(result.snapshot?.hasDiscountCard).toBe(true)
  })

  it('hasDiscountCard: true when Discount Card Invited', () => {
    const result = computeEntryStatsForEntry(entry(), profile(), undefined, [record('Discount Card', 'Invited')], undefined, [])
    expect(result.snapshot?.hasDiscountCard).toBe(true)
  })

  it('hasDiscountCard: omitted when Discount Card Declined', () => {
    const result = computeEntryStatsForEntry(entry(), profile(), undefined, [record('Discount Card', 'Declined')], undefined, [])
    expect(result.snapshot?.hasDiscountCard).toBeUndefined()
  })
})

// ---- isFirstAider ----

describe('computeEntryStatsForEntry — isFirstAider', () => {
  it('isFirstAider: true when certificate expires after session date', () => {
    const result = computeEntryStatsForEntry(
      entry(), profile(), undefined,
      [record('First Aid Certificate', 'Expires', '2030-01-01')],
      undefined, [], '2025-01-01'
    )
    expect(result.snapshot?.isFirstAider).toBe(true)
  })

  it('isFirstAider: omitted when certificate has already expired', () => {
    const result = computeEntryStatsForEntry(
      entry(), profile(), undefined,
      [record('First Aid Certificate', 'Expires', '2020-01-01')],
      undefined, [], '2025-01-01'
    )
    expect(result.snapshot?.isFirstAider).toBeUndefined()
  })

  it('isFirstAider: omitted when Status is not Expires', () => {
    const result = computeEntryStatsForEntry(
      entry(), profile(), undefined,
      [record('First Aid Certificate', 'Accepted', '2030-01-01')],
      undefined, [], '2025-01-01'
    )
    expect(result.snapshot?.isFirstAider).toBeUndefined()
  })
})

// ---- manual stats preservation ----

describe('computeEntryStatsForEntry — manual stats', () => {
  it('preserves existing manual stats unchanged', () => {
    const existingManual: EntryStatsManual = { eventbrite: true, duplicate: true }
    const result = computeEntryStatsForEntry(entry(), profile(), undefined, [], undefined, [], undefined, existingManual)
    expect(result.manual).toEqual(existingManual)
  })

  it('manual is undefined when no existing manual stats', () => {
    const result = computeEntryStatsForEntry(entry(), profile(), undefined, [], undefined, [])
    expect(result.manual).toBeUndefined()
  })

  it('manual is undefined when existingManual is an empty object', () => {
    const result = computeEntryStatsForEntry(entry(), profile(), undefined, [], undefined, [], undefined, {})
    expect(result.manual).toBeUndefined()
  })
})

// ---- snapshot omitted when all flags are absent ----

describe('computeEntryStatsForEntry — empty snapshot', () => {
  it('snapshot is undefined when all flags default to absent (member with consent)', () => {
    const records = [
      record('Privacy Consent', 'Accepted'),
      record('Photo Consent', 'Accepted'),
    ]
    const result = computeEntryStatsForEntry(
      entry({ SessionLookupId: 5 }),
      profile(),
      profileStatsWithSessions([3, 5]),  // not new
      records,
      undefined,
      []                                 // not regular
    )
    // booking omitted (Repeat), noPhoto omitted, noConsent omitted — snapshot should be empty/undefined
    expect(result.snapshot).toBeUndefined()
  })
})
