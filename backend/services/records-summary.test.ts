import { describe, it, expect } from 'vitest'
import { summariseRecords, summariseStates } from './records-summary'

const record = (id: number, profileId: number | undefined, type: string, status: string, date?: string) =>
  ({ ID: id, ProfileLookupId: profileId, Type: type, Status: status, State: { id: 0, type, name: status }, Date: date }) as any

const base = {
  environment: 'Preview',
  generatedAt: '2026-11-02T20:00:00.000Z',
  today: '2026-11-02',
  recordsColumns: [],
}

describe('summariseRecords', () => {
  it('counts each Type by Status, with blank and future Dates and the Date range', () => {
    const summary = summariseRecords({
      ...base,
      profiles: [],
      records: [
        record(1, 10, 'First Aid Certificate', 'Expires', '2027-05-01'),
        record(2, 11, 'First Aid Certificate', 'Expires', '2025-01-15'),
        record(3, 12, 'First Aid Certificate', 'Expires'),
        record(4, 10, 'Photo Consent', 'Declined', '2024-03-01'),
      ],
    })
    expect(summary.records.total).toBe(4)
    expect(summary.records.byType['First Aid Certificate'].byStatus.Expires).toEqual({
      count: 3, blankDate: 1, earliestDate: '2025-01-15', latestDate: '2027-05-01', dateAfterToday: 1,
    })
    expect(summary.records.byType['Photo Consent'].total).toBe(1)
  })

  it('counts Profile and Type pairs with more than one Record, and Records with no Profile', () => {
    const summary = summariseRecords({
      ...base,
      profiles: [],
      records: [
        record(1, 10, 'Bike Park Wales', 'Accepted', '2025-06-01'),
        record(2, 10, 'Bike Park Wales', 'Invited', '2026-06-01'),
        record(3, 10, 'Bike Park Wales', 'Invited', '2026-07-01'),
        record(4, 11, 'Bike Park Wales', 'Accepted', '2025-06-01'),
        record(5, undefined, 'Bike Park Wales', 'Accepted', '2025-06-01'),
      ],
    })
    expect(summary.records.withoutProfile).toBe(1)
    expect(summary.records.byType['Bike Park Wales'].profilesWithMoreThanOne).toBe(1)
    expect(summary.records.byType['Bike Park Wales'].recordsInThosePairs).toBe(3)
  })

  it('gives Profile results as counts and fingerprints, never IDs', () => {
    const records = [
      record(1, 10, 'Charity Membership', 'Accepted', '2025-01-01'),
      record(2, 11, 'Charity Membership', 'Invited', '2025-01-01'),
      record(3, 10, 'Discount Card', 'Accepted', '2025-01-01'),
      record(4, 11, 'Discount Card', 'Invited', '2025-01-01'),
    ]
    const profiles = [
      { ID: 10, Stats: JSON.stringify({ isFirstAider: true, noPhoto: false }) },
      { ID: 11, Stats: JSON.stringify({ isFirstAider: false, noPhoto: true }) },
      { ID: 12 },
    ]
    const summary = summariseRecords({ ...base, records, profiles })

    expect(summary.profiles.total).toBe(3)
    expect(summary.profiles.withoutStats).toBe(1)
    expect(summary.profiles.members.count).toBe(1)
    expect(summary.profiles.cardStatus.Accepted.count).toBe(1)
    expect(summary.profiles.cardStatus.Invited.count).toBe(1)
    expect(summary.profiles.firstAiders.count).toBe(1)
    expect(summary.profiles.noPhoto.count).toBe(1)
    expect(JSON.stringify(summary)).not.toMatch(/"(ID|ProfileLookupId)"/)

    // The same Profiles give the same fingerprint; a different Profile changes it
    const again = summariseRecords({ ...base, records, profiles })
    expect(again.profiles.members.fingerprint).toBe(summary.profiles.members.fingerprint)
    const moved = summariseRecords({ ...base, profiles, records: [record(1, 11, 'Charity Membership', 'Accepted', '2025-01-01')] })
    expect(moved.profiles.members.count).toBe(1)
    expect(moved.profiles.members.fingerprint).not.toBe(summary.profiles.members.fingerprint)
  })

  it('lists matching Records columns, so a duplicate Start shows as two entries', () => {
    const summary = summariseRecords({
      ...base,
      records: [],
      profiles: [],
      recordsColumns: [
        { name: 'Start', displayName: 'Start', dateTime: { format: 'dateOnly' } },
        { name: 'Start0', displayName: 'Start', dateTime: { format: 'dateOnly' } },
        { name: 'Status', displayName: 'Status', choice: { choices: ['Invited', 'Accepted'] } },
        { name: 'Title', displayName: 'Title', text: {} },
      ],
    })
    expect(summary.columns.Start).toHaveLength(2)
    expect(summary.columns.Start[0]).toEqual({ name: 'Start', displayName: 'Start', kind: 'dateTime', dateFormat: 'dateOnly', readOnly: false })
    expect(summary.columns.Status[0].choices).toEqual(['Invited', 'Accepted'])
    expect(summary.columns.Notes).toEqual([])
  })
})

describe('summariseStates', () => {
  it('counts Records with and without a State, by the State’s Type and Name, and flags mismatches', () => {
    const summary = summariseStates({
      states: [
        { ID: 1, Name: 'Approved', Type: 'Charity Membership' },
        { ID: 2, Name: 'Accepted', Type: 'Photo Consent' },
      ],
      recordStates: [
        { ID: 10, Type: 'Charity Membership', StateLookupId: 1 },
        { ID: 11, Type: 'Charity Membership', StateLookupId: '1' },
        { ID: 12, Type: 'Charity Membership', StateLookupId: 2 },
        { ID: 13, Type: 'Photo Consent', StateLookupId: 99 },
        { ID: 14, Type: 'Photo Consent' },
      ],
    })
    expect(summary).toEqual({
      statesInList: 2,
      recordsWithState: 4,
      recordsWithoutState: 1,
      byType: { 'Charity Membership': { Approved: 2 }, 'Photo Consent': { Accepted: 1 } },
      typeMismatch: 1,
      stateNotFound: 1,
    })
  })
})
