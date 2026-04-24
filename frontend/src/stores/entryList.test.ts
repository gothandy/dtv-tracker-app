import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEntryListStore } from './entryList'

describe('entryList store', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks() })

  function makeFetchSpy() {
    const spy = vi.fn().mockResolvedValue({
      ok: true, status: 200, json: () => Promise.resolve({ data: [] }),
    })
    vi.stubGlobal('fetch', spy)
    return spy
  }

  describe('query string construction', () => {
    it('fetches /api/entries with no query string when no params', async () => {
      const spy = makeFetchSpy()
      const store = useEntryListStore()
      await store.fetch()
      expect(spy.mock.calls[0][0]).toBe('/api/entries')
    })

    it('includes q param', async () => {
      const spy = makeFetchSpy()
      const store = useEntryListStore()
      await store.fetch({ q: 'alice' })
      expect(spy.mock.calls[0][0]).toContain('q=alice')
    })

    it('includes fy param', async () => {
      const spy = makeFetchSpy()
      const store = useEntryListStore()
      await store.fetch({ fy: 'FY2025' })
      expect(spy.mock.calls[0][0]).toContain('fy=FY2025')
    })

    it('includes cancelled param', async () => {
      const spy = makeFetchSpy()
      const store = useEntryListStore()
      await store.fetch({ cancelled: 'true' })
      expect(spy.mock.calls[0][0]).toContain('cancelled=true')
    })

    it('includes accompanyingAdult param', async () => {
      const spy = makeFetchSpy()
      const store = useEntryListStore()
      await store.fetch({ accompanyingAdult: 'true' })
      expect(spy.mock.calls[0][0]).toContain('accompanyingAdult=true')
    })

    it('combines all params', async () => {
      const spy = makeFetchSpy()
      const store = useEntryListStore()
      await store.fetch({ q: 'bob', fy: 'FY2025', cancelled: 'true', accompanyingAdult: 'false' })
      const url: string = spy.mock.calls[0][0]
      expect(url).toContain('q=bob')
      expect(url).toContain('fy=FY2025')
      expect(url).toContain('cancelled=true')
      expect(url).toContain('accompanyingAdult=false')
    })
  })

  it('sets entries on success', async () => {
    const entries = [{ id: 1, slug: 'entry-1' }]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200, json: () => Promise.resolve({ data: entries }),
    }))
    const store = useEntryListStore()
    await store.fetch()
    expect(store.entries).toEqual(entries)
    expect(store.error).toBeNull()
  })

  it('sets error on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, url: '/api/entries' }))
    const store = useEntryListStore()
    await store.fetch()
    expect(store.error).toMatch('500')
  })

  it('sets error on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
    const store = useEntryListStore()
    await store.fetch()
    expect(store.error).toBe('Network error')
  })

  it('sets loading false after fetch', async () => {
    makeFetchSpy()
    const store = useEntryListStore()
    await store.fetch()
    expect(store.loading).toBe(false)
  })
})
