import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const mockUser = vi.hoisted(() => ({ value: null as { role: string } | null }))
vi.mock('../composables/useAuth', () => ({
  user: mockUser,
  ensureAuth: vi.fn().mockResolvedValue(undefined),
}))

import { authGuard } from './index'

function to(path: string, meta: { requiresTrusted?: boolean; requiresAdmin?: boolean; requiresAuth?: boolean } = {}) {
  return { path, meta }
}

describe('authGuard — protected routes', () => {
  beforeEach(() => { mockUser.value = null })
  afterEach(() => { vi.clearAllMocks() })

  it('unauthenticated to requiresAuth route → /not-found', async () => {
    expect(await authGuard(to('/profiles/alice', { requiresAuth: true }))).toBe('/not-found')
  })

  it('unauthenticated to requiresTrusted route → /not-found', async () => {
    expect(await authGuard(to('/profiles', { requiresTrusted: true }))).toBe('/not-found')
  })

  it('unauthenticated to requiresAdmin route → /not-found', async () => {
    expect(await authGuard(to('/entries', { requiresAdmin: true }))).toBe('/not-found')
  })

  it('self-service to requiresTrusted route → /forbidden', async () => {
    mockUser.value = { role: 'selfservice' }
    expect(await authGuard(to('/profiles', { requiresTrusted: true }))).toBe('/forbidden')
  })

  it('checkin to requiresTrusted route → allowed', async () => {
    mockUser.value = { role: 'checkin' }
    expect(await authGuard(to('/profiles', { requiresTrusted: true }))).toBeUndefined()
  })

  it('readonly to requiresTrusted route → allowed', async () => {
    mockUser.value = { role: 'readonly' }
    expect(await authGuard(to('/profiles', { requiresTrusted: true }))).toBeUndefined()
  })

  it('non-admin (checkin) to requiresAdmin route → /forbidden', async () => {
    mockUser.value = { role: 'checkin' }
    expect(await authGuard(to('/entries', { requiresAdmin: true }))).toBe('/forbidden')
  })

  it('non-admin (readonly) to requiresAdmin route → /forbidden', async () => {
    mockUser.value = { role: 'readonly' }
    expect(await authGuard(to('/entries', { requiresAdmin: true }))).toBe('/forbidden')
  })

  it('non-admin (selfservice) to requiresAdmin route → /forbidden', async () => {
    mockUser.value = { role: 'selfservice' }
    expect(await authGuard(to('/entries', { requiresAdmin: true }))).toBe('/forbidden')
  })

  it('admin to requiresAdmin route → allowed', async () => {
    mockUser.value = { role: 'admin' }
    expect(await authGuard(to('/entries', { requiresAdmin: true }))).toBeUndefined()
  })

  it('authenticated (selfservice) to requiresAuth route → allowed', async () => {
    mockUser.value = { role: 'selfservice' }
    expect(await authGuard(to('/profiles/alice', { requiresAuth: true }))).toBeUndefined()
  })
})

describe('authGuard — sandbox gating', () => {
  const env = import.meta.env as Record<string, unknown>

  beforeEach(() => { mockUser.value = null; env.DEV = false })
  afterEach(() => { env.DEV = true; vi.clearAllMocks() })

  it('unauthenticated in prod to /sandbox → /', async () => {
    expect(await authGuard(to('/sandbox/icons'))).toBe('/')
  })

  it('non-admin in prod to /sandbox → /', async () => {
    mockUser.value = { role: 'readonly' }
    expect(await authGuard(to('/sandbox/icons'))).toBe('/')
  })

  it('admin in prod to /sandbox → allowed', async () => {
    mockUser.value = { role: 'admin' }
    expect(await authGuard(to('/sandbox/icons'))).toBeUndefined()
  })

  it('in dev mode any user can access /sandbox', async () => {
    env.DEV = true
    expect(await authGuard(to('/sandbox/icons'))).toBeUndefined()
  })
})

describe('authGuard — unprotected routes', () => {
  afterEach(() => { vi.clearAllMocks() })

  it('public route with no meta → allowed without auth check', async () => {
    expect(await authGuard(to('/sessions'))).toBeUndefined()
  })

  it('/ → allowed', async () => {
    expect(await authGuard(to('/'))).toBeUndefined()
  })
})
