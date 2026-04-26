import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SharePointProfile } from '../../types/sharepoint'

vi.mock('./repositories/entries-repository', () => ({
  entriesRepository: { create: vi.fn(), updateFields: vi.fn(), getAll: vi.fn(), getBySessionIds: vi.fn() }
}))

vi.mock('./repositories/profiles-repository', () => ({
  profilesRepository: {
    create: vi.fn().mockResolvedValue(999),
    updateFields: vi.fn().mockResolvedValue(undefined)
  }
}))

vi.mock('./repositories/records-repository', () => ({
  recordsRepository: { available: false, getAll: vi.fn(), create: vi.fn(), update: vi.fn() }
}))

import { findOrCreateProfile } from './eventbrite-sync'
import { profilesRepository } from './repositories/profiles-repository'

function profile(overrides: Partial<SharePointProfile> & { ID: number }): SharePointProfile {
  return { Title: 'Test User', Email: undefined, MatchName: undefined, Created: '', Modified: '', ...overrides }
}

beforeEach(() => {
  vi.mocked(profilesRepository.create).mockResolvedValue(999)
  vi.mocked(profilesRepository.updateFields).mockResolvedValue(undefined)
})

describe('findOrCreateProfile — name + email match', () => {
  it('returns existing profile when name and email match', async () => {
    const profiles = [profile({ ID: 1, Title: 'Jane Smith', Email: 'jane@example.com', MatchName: 'jane smith' })]
    const result = await findOrCreateProfile('Jane Smith', 'jane@example.com', profiles, 'Test')
    expect(result.profile.ID).toBe(1)
    expect(result.isNew).toBe(false)
    expect(profilesRepository.create).not.toHaveBeenCalled()
  })

  it('matches via MatchName field', async () => {
    const profiles = [profile({ ID: 2, Title: 'Jane Smith', Email: 'jane@example.com', MatchName: 'jane smith' })]
    const result = await findOrCreateProfile('Jane  Smith', 'jane@example.com', profiles, 'Test')
    expect(result.profile.ID).toBe(2)
    expect(result.isNew).toBe(false)
  })

  it('matches case-insensitively', async () => {
    const profiles = [profile({ ID: 3, Title: 'JANE SMITH', Email: 'jane@example.com', MatchName: 'jane smith' })]
    const result = await findOrCreateProfile('jane smith', 'jane@example.com', profiles, 'Test')
    expect(result.profile.ID).toBe(3)
    expect(result.isNew).toBe(false)
  })
})

describe('findOrCreateProfile — name-only match', () => {
  it('returns existing profile when names match and neither has email', async () => {
    const profiles = [profile({ ID: 4, Title: 'John Doe', MatchName: 'john doe' })]
    const result = await findOrCreateProfile('John Doe', undefined, profiles, 'Test')
    expect(result.profile.ID).toBe(4)
    expect(result.isNew).toBe(false)
  })

  it('returns existing profile when names match and only profile has email', async () => {
    const profiles = [profile({ ID: 5, Title: 'John Doe', Email: 'john@example.com', MatchName: 'john doe' })]
    const result = await findOrCreateProfile('John Doe', undefined, profiles, 'Test')
    expect(result.profile.ID).toBe(5)
    expect(result.isNew).toBe(false)
  })

  it('backfills email onto profile when attendee has one and profile does not', async () => {
    const p = profile({ ID: 6, Title: 'John Doe', MatchName: 'john doe' })
    const profiles = [p]
    const result = await findOrCreateProfile('John Doe', 'john@example.com', profiles, 'Test')
    expect(result.profile.ID).toBe(6)
    expect(result.isNew).toBe(false)
    expect(profilesRepository.updateFields).toHaveBeenCalledWith(6, { Email: 'john@example.com' })
  })
})

describe('findOrCreateProfile — email clash creates new profile', () => {
  it('creates new profile when name matches but emails differ', async () => {
    const profiles = [profile({ ID: 7, Title: 'Alex Jones', Email: 'alex1@example.com', MatchName: 'alex jones' })]
    const result = await findOrCreateProfile('Alex Jones', 'alex2@example.com', profiles, 'Test')
    expect(result.isNew).toBe(true)
    expect(result.clash).toBe(true)
    expect(profilesRepository.create).toHaveBeenCalled()
  })

  it('pushes new profile into the profiles array so subsequent lookups see it', async () => {
    const profiles: SharePointProfile[] = [profile({ ID: 8, Title: 'Alex Jones', Email: 'alex1@example.com', MatchName: 'alex jones' })]
    await findOrCreateProfile('Alex Jones', 'alex2@example.com', profiles, 'Test')
    expect(profiles).toHaveLength(2)
    expect(profiles[1].ID).toBe(999)
  })
})

describe('findOrCreateProfile — no match creates new profile', () => {
  it('creates new profile when name is not found', async () => {
    const profiles = [profile({ ID: 9, Title: 'Someone Else', MatchName: 'someone else' })]
    const result = await findOrCreateProfile('New Person', 'new@example.com', profiles, 'Test')
    expect(result.isNew).toBe(true)
    expect(result.clash).toBeFalsy()
    expect(profilesRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      Title: 'New Person',
      Email: 'new@example.com',
      MatchName: 'new person'
    }))
  })

  it('pushes new profile into the profiles array', async () => {
    const profiles: SharePointProfile[] = []
    await findOrCreateProfile('Brand New', undefined, profiles, 'Test')
    expect(profiles).toHaveLength(1)
    expect(profiles[0].Title).toBe('Brand New')
  })
})
