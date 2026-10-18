import { describe, it, expect, vi } from 'vitest'
import { requirePermission } from './require-permission'
import { can, PERMISSIONS } from '../../types/permissions'

function run(role?: 'admin' | 'checkin' | 'selfservice') {
  const req = { session: role ? { user: { role } } : {} } as any
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any
  const next = vi.fn()
  requirePermission('editTemplates')(req, res, next)
  return { res, next }
}

describe('can', () => {
  it('follows the table', () => {
    expect(can('checkin', 'viewTemplates')).toBe(true)
    expect(can('checkin', 'editTemplates')).toBe(false)
    expect(can('admin', 'editTemplates')).toBe(true)
    expect(can('checkin', 'editProjects')).toBe(false)
    expect(can('admin', 'editProjects')).toBe(true)
  })

  it('gives nothing to Self-Service or the public', () => {
    for (const permission of Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[]) {
      expect(can('selfservice', permission)).toBe(false)
      expect(can(undefined, permission)).toBe(false)
    }
  })
})

describe('requirePermission', () => {
  it('lets a permitted role through', () => {
    const { next, res } = run('admin')
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('refuses other roles and the public with 403', () => {
    for (const role of ['checkin', 'selfservice', undefined] as const) {
      const { next, res } = run(role)
      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(403)
    }
  })
})
