import { describe, it, expect } from 'vitest'
import { fyOptionsForEntities } from './entitySessionTotals'
import type { Session } from '../types/session'

const projects = [{ id: 1, key: 'a', displayName: 'Alpha' }]
const sessions: Session[] = [
  {
    id: 10,
    date: '2025-06-01',
    financialYear: 'FY2025',
    isBookable: false,
    limits: {},
    stats: { count: 1, hours: 5 },
    projectId: 1,
    isRegistered: false,
    isAttended: false,
    isRegular: false,
  },
  {
    id: 11,
    date: '2019-05-01',
    financialYear: 'FY2019',
    isBookable: false,
    limits: {},
    stats: { count: 1, hours: 1 },
    projectId: 99,
    isRegistered: false,
    isAttended: false,
    isRegular: false,
  },
]

describe('fyOptionsForEntities', () => {
  it('omits FY keys with no linked project sessions', () => {
    const opts = fyOptionsForEntities(projects, sessions, (p, s) => s.projectId === p.id)
    expect(opts.some(o => o.value === 'all')).toBe(true)
    expect(opts.some(o => o.value === 'FY2025')).toBe(true)
    expect(opts.some(o => o.value === 'FY2019')).toBe(false)
  })
})
