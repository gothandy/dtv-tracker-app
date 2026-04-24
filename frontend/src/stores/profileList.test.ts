import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const mockPush = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mockPush }) }))

import { useProfileListStore } from './profileList'

function mockFetch(data: unknown, ok = true, status = 200) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok, status, json: () => Promise.resolve(data),
  }))
}

describe('profileList store', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks() })

  describe('query string construction', () => {
    it('fetches /api/profiles with no query string when no params given', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ data: [] }) })
      vi.stubGlobal('fetch', fetchSpy)
      const store = useProfileListStore()
      await store.fetch()
      const url: string = fetchSpy.mock.calls[0][0]
      expect(url).toBe('/api/profiles')
    })

    it('sets fy=rolling param', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ data: [] }) })
      vi.stubGlobal('fetch', fetchSpy)
      const store = useProfileListStore()
      await store.fetch('rolling')
      const url: string = fetchSpy.mock.calls[0][0]
      expect(url).toContain('fy=rolling')
    })

    it('sets fy=future param', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ data: [] }) })
      vi.stubGlobal('fetch', fetchSpy)
      const store = useProfileListStore()
      await store.fetch('future')
      const url: string = fetchSpy.mock.calls[0][0]
      expect(url).toContain('fy=future')
    })

    it('sets fy param for FY* codes', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ data: [] }) })
      vi.stubGlobal('fetch', fetchSpy)
      const store = useProfileListStore()
      await store.fetch('FY2025')
      const url: string = fetchSpy.mock.calls[0][0]
      expect(url).toContain('fy=FY2025')
    })

    it('omits fy param when fy=all', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ data: [] }) })
      vi.stubGlobal('fetch', fetchSpy)
      const store = useProfileListStore()
      await store.fetch('all')
      const url: string = fetchSpy.mock.calls[0][0]
      expect(url).not.toContain('fy=')
    })

    it('appends group param', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ data: [] }) })
      vi.stubGlobal('fetch', fetchSpy)
      const store = useProfileListStore()
      await store.fetch(undefined, 'foo')
      const url: string = fetchSpy.mock.calls[0][0]
      expect(url).toContain('group=foo')
    })
  })

  it('sets profiles on success', async () => {
    const profiles = [{ id: 1, slug: 'alice', name: 'Alice' }]
    mockFetch({ data: profiles })
    const store = useProfileListStore()
    await store.fetch()
    expect(store.profiles).toEqual(profiles)
    expect(store.error).toBeNull()
  })

  it('redirects to login on 401', async () => {
    mockFetch({}, false, 401)
    const store = useProfileListStore()
    await store.fetch()
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/login?returnTo='))
  })

  it('ignores AbortError and does not set error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')))
    const store = useProfileListStore()
    await store.fetch()
    expect(store.error).toBeNull()
  })

  it('second fetch call aborts the first', async () => {
    const fetchSpy = vi.fn()
      .mockImplementationOnce((_url: string, { signal }: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
        })
      )
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ data: [] }) })
    vi.stubGlobal('fetch', fetchSpy)
    const store = useProfileListStore()
    const first = store.fetch()
    const second = store.fetch()
    await Promise.all([first, second])
    // First fetch was aborted (silently); second fetch's empty data wins
    expect(store.profiles).toEqual([])
    expect(store.error).toBeNull()
  })

  it('sets loading false after fetch', async () => {
    mockFetch({ data: [] })
    const store = useProfileListStore()
    await store.fetch()
    expect(store.loading).toBe(false)
  })
})
