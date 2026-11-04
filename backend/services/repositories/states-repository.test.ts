import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../sharepoint-client', () => ({
  sharePointClient: {
    getListItems: vi.fn(),
    cache: { get: vi.fn(), set: vi.fn() },
  },
  CACHE_TTL: { states: 300 },
}))
vi.mock('../../config', () => ({ sharePoint: { lists: { states: 'states-guid' } } }))

import { sharePointClient } from '../sharepoint-client'
import { statesRepository } from './states-repository'

beforeEach(() => vi.clearAllMocks())

describe('statesRepository', () => {
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
})
