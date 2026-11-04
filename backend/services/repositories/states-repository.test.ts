import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../sharepoint-client', () => ({
  sharePointClient: {
    getListItems: vi.fn(), createListItem: vi.fn(), updateListItem: vi.fn(), clearCacheKey: vi.fn(),
    cache: { get: vi.fn(), set: vi.fn() },
  },
  CACHE_TTL: { states: 300 },
}))
vi.mock('../../config', () => ({ sharePoint: { lists: { states: 'states-guid' } } }))

import { sharePointClient } from '../sharepoint-client'
import { statesRepository } from './states-repository'

beforeEach(() => vi.clearAllMocks())

describe('statesRepository and the RecordType column', () => {
  it('reads Name and RecordType into Name and Type', async () => {
    vi.mocked(sharePointClient.getListItems).mockResolvedValue([{ ID: 3, Title: 'x', Name: 'Accepted', RecordType: 'Photo Consent' }])
    expect(await statesRepository.getAll()).toEqual([{ ID: 3, Name: 'Accepted', Type: 'Photo Consent', Title: 'x' }])
    expect(vi.mocked(sharePointClient.getListItems).mock.calls[0][1]).toBe('ID,Title,Name,RecordType')
  })

  it('writes Name and RecordType, and Title as Type then Name', async () => {
    vi.mocked(sharePointClient.createListItem).mockResolvedValue(4)
    expect(await statesRepository.create({ Name: 'Approved', Type: 'Charity Membership' })).toBe(4)
    expect(vi.mocked(sharePointClient.createListItem).mock.calls[0][1]).toEqual({ Title: 'Charity Membership Approved', Name: 'Approved', RecordType: 'Charity Membership' })
  })

  it('updates only the Title', async () => {
    await statesRepository.updateTitle(4, 'Photo Consent Accepted')
    expect(vi.mocked(sharePointClient.updateListItem).mock.calls[0]).toEqual(['states-guid', 4, { Title: 'Photo Consent Accepted' }])
  })

  it('reads every State with its labels and styles, and caches them', async () => {
    vi.mocked(sharePointClient.cache.get).mockReturnValue(undefined)
    vi.mocked(sharePointClient.getListItems).mockResolvedValue([
      { ID: 3, Name: 'Active', RecordType: 'Parking Permit', Before: 'Expires', After: 'Expired', BeforeStyle: 'Active', AfterStyle: 'Warn' },
      { ID: 4, Name: 'Invite', RecordType: 'Parking Permit', After: 'Invited', Before: null },
    ])
    expect(await statesRepository.getStates()).toEqual([
      { id: 3, type: 'Parking Permit', name: 'Active', before: 'Expires', after: 'Expired', beforeStyle: 'Active', afterStyle: 'Warn' },
      { id: 4, type: 'Parking Permit', name: 'Invite', before: undefined, after: 'Invited', beforeStyle: undefined, afterStyle: undefined },
    ])
    expect(vi.mocked(sharePointClient.getListItems).mock.calls[0][1]).toBe('ID,Name,RecordType,Before,After,BeforeStyle,AfterStyle')
    expect(vi.mocked(sharePointClient.cache.set).mock.calls[0][0]).toBe('states')
  })

  it('creating a State clears the cached States', async () => {
    vi.mocked(sharePointClient.createListItem).mockResolvedValue(5)
    await statesRepository.create({ Name: 'Active', Type: 'DofE' })
    expect(sharePointClient.clearCacheKey).toHaveBeenCalledWith('states')
  })
})
