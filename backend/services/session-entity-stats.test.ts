import { describe, it, expect } from 'vitest'
import { aggregateSessionStatsForScope } from './session-entity-stats'
import type { SharePointSession } from '../../types/session'

function session(
  id: number,
  date: string,
  overrides: Partial<SharePointSession> = {}
): SharePointSession {
  return {
    ID: id,
    Title: String(id),
    Created: '',
    Modified: '',
    Date: date,
    GroupLookupId: 1,
    Stats: JSON.stringify({ count: 5, hours: 10 }),
    ...overrides,
  }
}

describe('aggregateSessionStatsForScope', () => {
  it('sums sessions and hours for group scope in current FY', () => {
    const sessions = [
      session(1, '2025-06-01', { GroupLookupId: 10, Stats: JSON.stringify({ count: 3, hours: 4 }) }),
      session(2, '2025-07-01', { GroupLookupId: 10, Stats: JSON.stringify({ count: 2, hours: 6.5 }) }),
      session(3, '2025-07-01', { GroupLookupId: 99, Stats: JSON.stringify({ count: 1, hours: 100 }) }),
    ]
    const result = aggregateSessionStatsForScope(sessions, { groupId: 10 }, { fyScope: 'all' })
    expect(result.sessions).toBe(2)
    expect(result.hours).toBe(10.5)
  })

  it('filters by project lookup id', () => {
    const sessions = [
      session(1, '2025-06-01', { ProjectLookupId: 5, Stats: JSON.stringify({ count: 1, hours: 3 }) }),
      session(2, '2025-06-01', { ProjectLookupId: 6, Stats: JSON.stringify({ count: 1, hours: 8 }) }),
    ]
    const result = aggregateSessionStatsForScope(sessions, { projectId: 5 }, { fyScope: 'all' })
    expect(result.sessions).toBe(1)
    expect(result.hours).toBe(3)
  })

  it('ignores sessions without a date', () => {
    const sessions = [
      session(1, '', { GroupLookupId: 1, Stats: JSON.stringify({ count: 1, hours: 5 }) }),
      session(2, '2025-06-01', { GroupLookupId: 1, Stats: JSON.stringify({ count: 1, hours: 2 }) }),
    ]
    const result = aggregateSessionStatsForScope(sessions, { groupId: 1 }, { fyScope: 'all' })
    expect(result.sessions).toBe(1)
    expect(result.hours).toBe(2)
  })
})
