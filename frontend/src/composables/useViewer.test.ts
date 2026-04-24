import { describe, it, expect, vi } from 'vitest'

const mockAuth = vi.hoisted(() => ({
  user: { value: null as { role: string } | null },
  ready: { value: true },
}))
vi.mock('./useAuth', () => ({
  useAuth: () => ({ user: mockAuth.user, ready: mockAuth.ready }),
}))

import { useViewer } from './useViewer'

function viewer(role: string | null, ready = true) {
  mockAuth.user.value = role ? { role } : null
  mockAuth.ready.value = ready
  return useViewer()
}

describe('useViewer role matrix', () => {
  it.each([
    { role: 'admin',       isAdmin: true,  isCheckIn: false, isReadOnly: false, isSelfService: false, isTrusted: true,  isAuthenticated: true,  isOperational: true  },
    { role: 'checkin',     isAdmin: false, isCheckIn: true,  isReadOnly: false, isSelfService: false, isTrusted: true,  isAuthenticated: true,  isOperational: true  },
    { role: 'readonly',    isAdmin: false, isCheckIn: false, isReadOnly: true,  isSelfService: false, isTrusted: true,  isAuthenticated: true,  isOperational: false },
    { role: 'selfservice', isAdmin: false, isCheckIn: false, isReadOnly: false, isSelfService: true,  isTrusted: false, isAuthenticated: true,  isOperational: false },
    { role: null,          isAdmin: false, isCheckIn: false, isReadOnly: false, isSelfService: false, isTrusted: false, isAuthenticated: false, isOperational: false },
  ])('$role', ({ role, isAdmin, isCheckIn, isReadOnly, isSelfService, isTrusted, isAuthenticated, isOperational }) => {
    const v = viewer(role)
    expect(v.isAdmin).toBe(isAdmin)
    expect(v.isCheckIn).toBe(isCheckIn)
    expect(v.isReadOnly).toBe(isReadOnly)
    expect(v.isSelfService).toBe(isSelfService)
    expect(v.isTrusted).toBe(isTrusted)
    expect(v.isAuthenticated).toBe(isAuthenticated)
    expect(v.isOperational).toBe(isOperational)
  })
})

describe('useViewer — role derived from user', () => {
  it('null user → role null', () => expect(viewer(null).role).toBeNull())
  it('admin user → role admin', () => expect(viewer('admin').role).toBe('admin'))
})

describe('useViewer — isPublic', () => {
  it('null user + ready=true → isPublic true', () => expect(viewer(null, true).isPublic).toBe(true))
  it('null user + ready=false → isPublic false', () => expect(viewer(null, false).isPublic).toBe(false))
  it('authenticated user → isPublic false regardless of ready', () => expect(viewer('admin', true).isPublic).toBe(false))
})

describe('useViewer — context snapshot', () => {
  it('context mirrors individual booleans for admin', () => {
    const v = viewer('admin')
    expect(v.context).toEqual({
      isAdmin: true,
      isCheckIn: false,
      isReadOnly: false,
      isSelfService: false,
      isTrusted: true,
      isAuthenticated: true,
      isPublic: false,
      isOperational: true,
    })
  })
})
