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
})
