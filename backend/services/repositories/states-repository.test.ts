import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../sharepoint-client', () => ({
  sharePointClient: { getListItems: vi.fn(), createListItem: vi.fn(), updateListItem: vi.fn() },
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
})
