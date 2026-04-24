import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const mockPush = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mockPush }) }))

import { useProfileDetailStore } from './profileDetail'

function mockFetch(data: unknown, ok = true, status = 200) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok, status, json: () => Promise.resolve(data),
  }))
}

describe('profileDetail store', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks() })

  it('sets profile on success', async () => {
    const profile = { id: 1, slug: 'alice', name: 'Alice' }
    mockFetch({ data: profile })
    const store = useProfileDetailStore()
    await store.fetch('alice')
    expect(store.profile).toEqual(profile)
    expect(store.httpStatus).toBe(200)
    expect(store.error).toBeNull()
  })

  it('redirects to login on 401', async () => {
    mockFetch({}, false, 401)
    const store = useProfileDetailStore()
    await store.fetch('alice')
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/login?returnTo='))
    expect(store.profile).toBeNull()
  })

  it('sets httpStatus and error on 404', async () => {
    mockFetch({}, false, 404)
    const store = useProfileDetailStore()
    await store.fetch('missing')
    expect(store.httpStatus).toBe(404)
    expect(store.profile).toBeNull()
    expect(store.error).toMatch('404')
  })

  it('sets loading false after fetch', async () => {
    mockFetch({ data: {} })
    const store = useProfileDetailStore()
    await store.fetch('alice')
    expect(store.loading).toBe(false)
  })
})
