import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGroupDetailStore } from './groupDetail'

function mockFetch(data: unknown, ok = true, status = 200) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok, status, json: () => Promise.resolve(data),
  }))
}

describe('groupDetail store', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks() })

  it('sets group on success', async () => {
    const group = { id: 1, key: 'foo', displayName: 'Foo' }
    mockFetch({ data: group })
    const store = useGroupDetailStore()
    await store.fetch('foo')
    expect(store.group).toEqual(group)
    expect(store.httpStatus).toBe(200)
    expect(store.error).toBeNull()
  })

  it('sets httpStatus and error on 404', async () => {
    mockFetch({}, false, 404)
    const store = useGroupDetailStore()
    await store.fetch('missing')
    expect(store.httpStatus).toBe(404)
    expect(store.group).toBeNull()
    expect(store.error).toMatch('404')
  })

  it('sets loading false after fetch', async () => {
    mockFetch({ data: {} })
    const store = useGroupDetailStore()
    await store.fetch('foo')
    expect(store.loading).toBe(false)
  })

  it('refresh updates group in place on success', async () => {
    const g1 = { id: 1, key: 'foo', displayName: 'Foo', regulars: [] as unknown[] }
    mockFetch({ data: g1 })
    const store = useGroupDetailStore()
    await store.fetch('foo')
    const g2 = { id: 1, key: 'foo', displayName: 'Foo Updated', regulars: [{ profileId: 1 }] }
    mockFetch({ data: g2 })
    const ok = await store.refresh('foo')
    expect(ok).toBe(true)
    expect(store.group?.displayName).toBe('Foo Updated')
    expect(store.group?.regulars?.length).toBe(1)
  })

  it('refresh returns false on error response', async () => {
    mockFetch({}, false, 500)
    const store = useGroupDetailStore()
    const ok = await store.refresh('foo')
    expect(ok).toBe(false)
  })
})
