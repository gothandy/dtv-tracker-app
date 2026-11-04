import { describe, it, expect } from 'vitest'
import { buildBadgeLookups, currentRecord, currentRecords, findState, recordProfileId, recordStateName, recordType, recordsForProfile, toRecordResponse } from './records'
import type { RecordState } from '../../types/record-state'

let nextStateId = 100
const state = (type: string, name: string, extra: Partial<RecordState> = {}): RecordState => ({ id: nextStateId++, type, name, ...extra })
const record = (id: number, profileId: number | string | undefined, type: string, name: string, date?: string) =>
  ({ ID: id, ProfileLookupId: profileId, State: state(type, name), Date: date }) as any

describe('recordProfileId', () => {
  it('reads the Profile lookup, whether SharePoint gives a number or a string', () => {
    expect(recordProfileId(record(1, 12, 'Photo Consent', 'Accepted'))).toBe(12)
    expect(recordProfileId(record(1, '12', 'Photo Consent', 'Accepted'))).toBe(12)
    expect(recordProfileId(record(1, undefined, 'Photo Consent', 'Accepted'))).toBeUndefined()
  })
})

describe('recordType and recordStateName', () => {
  it('come from the State, not the old columns', () => {
    const r = { ID: 1, Type: 'Old', Status: 'Old', State: state('Photo Consent', 'Accepted') } as any
    expect(recordType(r)).toBe('Photo Consent')
    expect(recordStateName(r)).toBe('Accepted')
  })

  it('are blank for a Record with no State', () => {
    expect(recordType({ ID: 1, Type: 'Photo Consent' } as any)).toBe('')
    expect(recordStateName({ ID: 1, Status: 'Accepted' } as any)).toBe('')
  })
})

describe('currentRecord and recordsForProfile', () => {
  const records = [
    record(1, 10, 'Photo Consent', 'Declined', '2026-01-01'),
    record(2, 11, 'Photo Consent', 'Accepted', '2026-01-01'),
    record(3, 10, 'Photo Consent', 'Accepted', '2026-03-01'),
    record(4, 10, 'Privacy Consent', 'Accepted'),
    record(5, 10, 'Photo Consent', 'Withdrawn', '2026-03-01'),
    record(6, 10, 'Photo Consent', 'Invited'),
  ]

  it('is the latest by Date, then the higher ID; a blank Date is the earliest', () => {
    expect(currentRecord(records, 10, 'Photo Consent')?.ID).toBe(5)
    expect(currentRecord(records, 11, 'Photo Consent')?.ID).toBe(2)
    expect(currentRecord(records, 10, 'Privacy Consent')?.ID).toBe(4)
    expect(currentRecord(records, 12, 'Photo Consent')).toBeUndefined()
  })

  it('treats a future Date as later (an Until Record is dated at its expiry)', () => {
    const permits = [record(1, 10, 'Parking Permit', 'Invite', '2026-01-03'), record(2, 10, 'Parking Permit', 'Active', '2026-12-31')]
    expect(currentRecord(permits, 10, 'Parking Permit')?.ID).toBe(2)
  })

  it('currentRecords keeps one Record per Profile and Type, leaving out Records with no Profile or State', () => {
    const list = [...records, record(7, undefined, 'Photo Consent', 'Accepted'), { ID: 8, ProfileLookupId: 10 } as any]
    expect(currentRecords(list).map(r => r.ID).sort()).toEqual([2, 4, 5])
  })

  it('lists only that Profile’s Records', () => {
    expect(recordsForProfile(records, 10).map(r => r.ID)).toEqual([1, 3, 4, 5, 6])
  })
})

describe('findState', () => {
  it('matches on Type, then Name', () => {
    const states = [state('Photo Consent', 'Accepted'), state('Privacy Consent', 'Accepted')]
    expect(findState(states, 'Privacy Consent', 'Accepted')).toBe(states[1])
    expect(findState(states, 'Discount Card', 'Accepted')).toBeUndefined()
  })
})

describe('buildBadgeLookups', () => {
  it('finds members and each Profile’s Discount Card State from their current Records', () => {
    const { memberIds, cardStatusMap } = buildBadgeLookups([
      record(1, 10, 'Charity Membership', 'Accepted'),
      record(2, 11, 'Charity Membership', 'Invited'),
      record(3, 10, 'Discount Card', 'Invited', '2026-01-01'),
      record(4, 10, 'Discount Card', 'Accepted', '2026-02-01'),
      record(5, undefined, 'Charity Membership', 'Accepted'),
      record(6, 12, 'Charity Membership', 'Accepted', '2025-01-01'),
      record(7, 12, 'Charity Membership', 'Removed', '2026-01-01'),
    ])
    expect([...memberIds]).toEqual([10])
    expect(cardStatusMap.get(10)).toBe('Accepted')
    expect(cardStatusMap.has(11)).toBe(false)
  })
})

describe('toRecordResponse', () => {
  it('gives the State, and the label and style it shows on the day', () => {
    const permit = state('Parking Permit', 'Active', { before: 'Expires', after: 'Expired', beforeStyle: 'Active', afterStyle: 'Warn' })
    const r = { ID: 7, ProfileLookupId: 10, State: permit, Date: '2026-12-31', Notes: 'AB12 CDE' } as any
    expect(toRecordResponse(r, '2026-11-04')).toEqual({
      id: 7, type: 'Parking Permit', stateId: permit.id, status: 'Active', storedStatus: 'Active',
      label: 'Expires', style: 'active', date: '2026-12-31', notes: 'AB12 CDE',
    })
    expect(toRecordResponse(r, '2027-01-01')).toMatchObject({ label: 'Expired', style: 'warn' })
  })

  it('shows the State Name for a From State with no labels', () => {
    expect(toRecordResponse(record(1, 10, 'Photo Consent', 'Accepted', '2026-01-01'), '2026-11-04')).toMatchObject({ label: 'Accepted', style: undefined })
  })
})
