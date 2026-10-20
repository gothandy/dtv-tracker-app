import { describe, it, expect } from 'vitest'
import { isFutureOrNew, statusShown, NO_STATUS } from './projectFilters'
import type { Session } from '../types/session'

const link = (p: { id: number }, s: Session) => (s as any).projectId === p.id
const session = (projectId: number, date: string) => ({ projectId, date, financialYear: 'FY2026', stats: { hours: 0 } }) as unknown as Session

describe('isFutureOrNew', () => {
  it('includes a project with no sessions at all', () => {
    expect(isFutureOrNew({ id: 1 }, [session(2, '2020-01-01')], link)).toBe(true)
  })

  it('includes a project with a session still to come', () => {
    expect(isFutureOrNew({ id: 1 }, [session(1, '2020-01-01'), session(1, '2099-01-01')], link)).toBe(true)
  })

  it('leaves out a project whose sessions are all past', () => {
    expect(isFutureOrNew({ id: 1 }, [session(1, '2020-01-01')], link)).toBe(false)
  })
})

describe('statusShown', () => {
  it('shows everything when nothing is crossed out', () => {
    expect(statusShown(undefined, [])).toBe(true)
    expect(statusShown('Active', [])).toBe(true)
  })

  it('hides a crossed-out status, and No status', () => {
    expect(statusShown('Closed', ['Closed'])).toBe(false)
    expect(statusShown('Active', ['Closed'])).toBe(true)
    expect(statusShown(undefined, [NO_STATUS])).toBe(false)
    expect(statusShown('Active', [NO_STATUS])).toBe(true)
  })
})
