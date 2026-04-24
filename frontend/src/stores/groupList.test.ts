import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGroupListStore } from './groupList'

function mockFetch(data: unknown, ok = true, status = 200) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok, status, json: () => Promise.resolve(data),
  }))
}

describe('groupList store', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks() })

  it('sets groups on success', async () => {
    const groups = [{ id: 1, key: 'foo', displayName: 'Foo' }]
    mockFetch({ data: groups })
    const store = useGroupListStore()
    await store.fetch()
    expect(store.groups).toEqual(groups)
    expect(store.error).toBeNull()
  })

  it('sets error on non-ok response', async () => {
    mockFetch({}, false, 500)
    const store = useGroupListStore()
    await store.fetch()
    expect(store.error).toMatch('500')
    expect(store.groups).toEqual([])
  })

  it('sets loading false after fetch', async () => {
    mockFetch({ data: [] })
    const store = useGroupListStore()
    expect(store.loading).toBe(true)
    await store.fetch()
    expect(store.loading).toBe(false)
  })
})
