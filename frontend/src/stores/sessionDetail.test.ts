import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSessionDetailStore } from './sessionDetail'

function mockFetch(data: unknown, ok = true, status = 200) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok, status, json: () => Promise.resolve(data),
  }))
}

const baseSession = {
  id: 1,
  date: '2024-01-15',
  groupId: 10,
  groupKey: 'foo',
  financialYear: 'FY2024',
  isBookable: true,
  limits: {},
  stats: {},
  entries: [],
}

describe('sessionDetail store', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks() })

  it('sets session on success', async () => {
    mockFetch({ data: { ...baseSession, isRegistered: true, isAttended: false, isRegular: false } })
    const store = useSessionDetailStore()
    await store.fetch('foo', '2024-01-15')
    expect(store.session?.id).toBe(1)
    expect(store.httpStatus).toBe(200)
    expect(store.error).toBeNull()
  })

  it('defaults isRegistered, isAttended, isRegular to false when API omits them', async () => {
    mockFetch({ data: baseSession }) // no user-status flags
    const store = useSessionDetailStore()
    await store.fetch('foo', '2024-01-15')
    expect(store.session?.isRegistered).toBe(false)
    expect(store.session?.isAttended).toBe(false)
    expect(store.session?.isRegular).toBe(false)
  })

  it('sets httpStatus and error on 404', async () => {
    mockFetch({}, false, 404)
    const store = useSessionDetailStore()
    await store.fetch('missing', '2024-01-15')
    expect(store.httpStatus).toBe(404)
    expect(store.session).toBeNull()
    expect(store.error).toMatch('404')
  })

  it('sets loading false after fetch', async () => {
    mockFetch({ data: baseSession })
    const store = useSessionDetailStore()
    await store.fetch('foo', '2024-01-15')
    expect(store.loading).toBe(false)
  })
})
