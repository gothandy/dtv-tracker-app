import { describe, it, expect } from 'vitest'
import { buildBadgeLookups, findRecord, recordProfileId, recordsForProfile, statusOn, toRecordResponse } from './records'

const record = (id: number, profileId: number | string | undefined, type: string, status: string) =>
  ({ ID: id, ProfileLookupId: profileId, Type: type, Status: status }) as any

describe('recordProfileId', () => {
  it('reads the Profile lookup, whether SharePoint gives a number or a string', () => {
    expect(recordProfileId(record(1, 12, 'Photo Consent', 'Accepted'))).toBe(12)
    expect(recordProfileId(record(1, '12', 'Photo Consent', 'Accepted'))).toBe(12)
    expect(recordProfileId(record(1, undefined, 'Photo Consent', 'Accepted'))).toBeUndefined()
  })
})

describe('findRecord and recordsForProfile', () => {
  const records = [
    record(1, 10, 'Photo Consent', 'Declined'),
    record(2, 11, 'Photo Consent', 'Accepted'),
    record(3, 10, 'Photo Consent', 'Accepted'),
    record(4, 10, 'Privacy Consent', 'Accepted'),
  ]

  it('finds the first of the Profile’s Records of the Type, in list order', () => {
    expect(findRecord(records, 10, 'Photo Consent')?.ID).toBe(1)
    expect(findRecord(records, 11, 'Photo Consent')?.ID).toBe(2)
    expect(findRecord(records, 12, 'Photo Consent')).toBeUndefined()
  })

  it('lists only that Profile’s Records', () => {
    expect(recordsForProfile(records, 10).map(r => r.ID)).toEqual([1, 3, 4])
  })
})

describe('statusOn', () => {
  it('gives the stored status for now (Records v2 PR 1 changes the evaluator)', () => {
    expect(statusOn(record(1, 10, 'First Aid Certificate', 'Expires'), '2026-11-02')).toBe('Expires')
    expect(statusOn(record(1, 10, 'Photo Consent', undefined as any), '2026-11-02')).toBe('')
  })
})

describe('buildBadgeLookups', () => {
  it('finds members and the last Discount Card status for each Profile', () => {
    const { memberIds, cardStatusMap } = buildBadgeLookups([
      record(1, 10, 'Charity Membership', 'Accepted'),
      record(2, 11, 'Charity Membership', 'Invited'),
      record(3, 10, 'Discount Card', 'Invited'),
      record(4, 10, 'Discount Card', 'Accepted'),
      record(5, undefined, 'Charity Membership', 'Accepted'),
    ], '2026-11-02')
    expect([...memberIds]).toEqual([10])
    expect(cardStatusMap.get(10)).toBe('Accepted')
    expect(cardStatusMap.has(11)).toBe(false)
  })
})

describe('toRecordResponse', () => {
  it('gives the status as of the date and the stored status, with the Date and Notes', () => {
    const r = { ID: 7, ProfileLookupId: 10, Type: 'DofE', Status: 'Accepted', Date: '2026-01-01', Notes: 'Gold 1223123' } as any
    expect(toRecordResponse(r, '2026-11-03')).toEqual({
      id: 7, type: 'DofE', status: 'Accepted', storedStatus: 'Accepted', date: '2026-01-01', notes: 'Gold 1223123',
    })
  })
})
