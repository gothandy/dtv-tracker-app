import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./repositories/records-repository', () => ({
  recordsRepository: { create: vi.fn(), update: vi.fn() },
}))

import { recordsRepository } from './repositories/records-repository'
import { createRecord, upsertRecord } from './record-writer'

const record = (id: number, profileId: number, type: string, status: string, date = '2025-01-01') =>
  ({ ID: id, ProfileLookupId: profileId, Type: type, Status: status, Date: date }) as any

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(recordsRepository.create).mockResolvedValue(50)
  vi.mocked(recordsRepository.update).mockResolvedValue(undefined)
})

describe('createRecord', () => {
  it('writes Profile, Type, Status and Date, and returns the Record', async () => {
    const created = await createRecord({ profileId: 10, type: 'Photo Consent', status: 'Accepted', date: '2026-11-03' })
    expect(recordsRepository.create).toHaveBeenCalledWith({ ProfileLookupId: 10, Type: 'Photo Consent', Status: 'Accepted', Date: '2026-11-03' })
    expect(created.ID).toBe(50)
  })
})

describe('upsertRecord', () => {
  const values = { profileId: 10, type: 'Photo Consent', status: 'Declined', date: '2026-11-03' }

  it('creates a Record when the Profile has none of the Type, and adds it to the batch', async () => {
    const records = [record(1, 11, 'Photo Consent', 'Accepted')]
    expect(await upsertRecord(records, values, 'statusAndDate')).toBe('created')
    expect(records.map(r => r.ID)).toEqual([1, 50])
    expect(await upsertRecord(records, { ...values, status: 'Accepted' }, 'statusAndDate')).toBe('updated')
    expect(recordsRepository.create).toHaveBeenCalledTimes(1)
  })

  it('statusAndDate overwrites Status and Date on the first matching Record', async () => {
    const records = [record(1, 10, 'Photo Consent', 'Accepted'), record(2, 10, 'Photo Consent', 'Accepted')]
    expect(await upsertRecord(records, values, 'statusAndDate')).toBe('updated')
    expect(recordsRepository.update).toHaveBeenCalledWith(1, { Status: 'Declined', Date: '2026-11-03' })
  })

  it('statusIfChanged changes only a different Status and keeps the Date', async () => {
    const records = [record(1, 10, 'Photo Consent', 'Accepted')]
    expect(await upsertRecord(records, { ...values, status: 'Accepted' }, 'statusIfChanged')).toBe('unchanged')
    expect(recordsRepository.update).not.toHaveBeenCalled()
    expect(await upsertRecord(records, values, 'statusIfChanged')).toBe('updated')
    expect(recordsRepository.update).toHaveBeenCalledWith(1, { Status: 'Declined' })
  })
})
