import { describe, it, expect } from 'vitest'
import { projectGroups } from './projectGroups'

const s = (groupKey: string | undefined, hours: number, groupName?: string) =>
  ({ groupKey, groupName, stats: { count: 1, hours } })

describe('projectGroups', () => {
  it('totals each group, most hours first', () => {
    expect(projectGroups([s('sat', 10.25, 'Saturday Dig'), s('wed', 30, 'Wednesday'), s('sat', 5, 'Saturday Dig')])).toEqual([
      { groupKey: 'wed', groupName: 'Wednesday', sessions: 1, hours: 30 },
      { groupKey: 'sat', groupName: 'Saturday Dig', sessions: 2, hours: 15.3 },
    ])
  })

  it('counts a group with no hours yet, and skips sessions with no group', () => {
    expect(projectGroups([s('new', 0, 'New'), s(undefined, 12)])).toEqual([
      { groupKey: 'new', groupName: 'New', sessions: 1, hours: 0 },
    ])
  })

  it('gives none for no sessions', () => {
    expect(projectGroups([])).toEqual([])
  })
})
