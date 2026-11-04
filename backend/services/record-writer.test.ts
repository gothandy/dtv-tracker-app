import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./repositories/records-repository', () => ({
  recordsRepository: { create: vi.fn(), update: vi.fn() },
}))
vi.mock('./repositories/states-repository', () => ({
  statesRepository: { getStates: vi.fn() },
}))

import { recordsRepository } from './repositories/records-repository'
import { statesRepository } from './repositories/states-repository'
import { createRecord, setRecordState } from './record-writer'

const states = [
  { id: 1, type: 'Photo Consent', name: 'Accepted' },
  { id: 2, type: 'Photo Consent', name: 'Declined' },
]
const record = (id: number, profileId: number, name: string, date = '2025-01-01') =>
  ({ ID: id, ProfileLookupId: profileId, State: states.find(s => s.name === name), Date: date }) as any

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(recordsRepository.create).mockResolvedValue(50)
  vi.mocked(recordsRepository.update).mockResolvedValue(undefined)
  vi.mocked(statesRepository.getStates).mockResolvedValue(states)
})

describe('createRecord', () => {
  it('writes the Profile, the State lookup (and the old Type and Status) and Date, and returns the Record with its State', async () => {
    const created = await createRecord({ profileId: 10, type: 'Photo Consent', status: 'Accepted', date: '2026-11-03' })
    expect(recordsRepository.create).toHaveBeenCalledWith({ ProfileLookupId: 10, StateLookupId: 1, Type: 'Photo Consent', Status: 'Accepted', Date: '2026-11-03' })
    expect(created.ID).toBe(50)
    expect(created.State).toEqual(states[0])
  })

  it('says plainly when the States list has no such State, and writes nothing', async () => {
    await expect(createRecord({ profileId: 10, type: 'Photo Consent', status: 'Withdrawn', date: '2026-11-03' }))
      .rejects.toThrow('The States list has no State "Withdrawn" for Photo Consent')
    expect(recordsRepository.create).not.toHaveBeenCalled()
  })
})

describe('setRecordState', () => {
  const values = { profileId: 10, type: 'Photo Consent', status: 'Declined', date: '2026-11-03' }

  it('creates a Record when the Profile has none of the Type, and adds it to the batch', async () => {
    const records = [record(1, 11, 'Accepted')]
    expect(await setRecordState(records, values, 'refreshDate')).toBe('created')
    expect(records.map(r => r.ID)).toEqual([1, 50])
  })

  it('creates a new Record when the current State is different, leaving the old one as it was', async () => {
    const records = [record(1, 10, 'Accepted', '2025-01-01')]
    expect(await setRecordState(records, values, 'refreshDate')).toBe('created')
    expect(recordsRepository.create).toHaveBeenCalledWith({ ProfileLookupId: 10, StateLookupId: 2, Type: 'Photo Consent', Status: 'Declined', Date: '2026-11-03' })
    expect(recordsRepository.update).not.toHaveBeenCalled()
  })

  it('compares with the current Record (the latest by Date), not an older one', async () => {
    const records = [record(1, 10, 'Declined', '2025-01-01'), record(2, 10, 'Accepted', '2025-06-01')]
    expect(await setRecordState(records, values, 'leave')).toBe('created')
  })

  it('the same State: refreshDate sets its Date; leave changes nothing', async () => {
    const records = [record(1, 10, 'Declined', '2025-01-01')]
    expect(await setRecordState(records, values, 'leave')).toBe('unchanged')
    expect(recordsRepository.update).not.toHaveBeenCalled()
    expect(await setRecordState(records, values, 'refreshDate')).toBe('updated')
    expect(recordsRepository.update).toHaveBeenCalledWith(1, { Date: '2026-11-03' })
    expect(recordsRepository.create).not.toHaveBeenCalled()
  })
})
