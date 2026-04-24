import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const mockViewer: { user: { profileStats?: { sessionIds?: number[]; regularGroupIds?: number[] } } | null } = { user: null }
vi.mock('../composables/useViewer', () => ({ useViewer: () => mockViewer }))

import { useSessionListStore } from './sessionList'

const baseSession = {
  id: 1,
  date: '2024-01-15',
  groupId: 10,
  groupKey: 'foo',
  financialYear: 'FY2024',
  isBookable: true,
  limits: {},
  stats: {},
}

function mockFetch(data: unknown, ok = true) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok, status: ok ? 200 : 500, json: () => Promise.resolve(data),
  }))
}

describe('sessionList store', () => {
  beforeEach(() => {
    mockViewer.user = null
    setActivePinia(createPinia())
  })
  afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks() })

  describe('mapSession derived flags', () => {
    it('defaults all flags to false when viewer has no profileStats', async () => {
      mockFetch({ data: [baseSession] })
      const store = useSessionListStore()
      await store.fetch()
      expect(store.sessions[0].isRegistered).toBe(false)
      expect(store.sessions[0].isAttended).toBe(false)
      expect(store.sessions[0].isRegular).toBe(false)
    })

    it('sets isRegistered when session id is in viewer sessionIds', async () => {
      mockViewer.user = { profileStats: { sessionIds: [1], regularGroupIds: [] } }
      mockFetch({ data: [baseSession] })
      const store = useSessionListStore()
      await store.fetch()
      expect(store.sessions[0].isRegistered).toBe(true)
    })

    it('sets isAttended when session is not bookable and id is in viewer sessionIds', async () => {
      mockViewer.user = { profileStats: { sessionIds: [1], regularGroupIds: [] } }
      const nonBookable = { ...baseSession, isBookable: false }
      mockFetch({ data: [nonBookable] })
      const store = useSessionListStore()
      await store.fetch()
      expect(store.sessions[0].isAttended).toBe(true)
    })

    it('does not set isAttended when session is bookable even if registered', async () => {
      mockViewer.user = { profileStats: { sessionIds: [1], regularGroupIds: [] } }
      mockFetch({ data: [baseSession] }) // isBookable: true
      const store = useSessionListStore()
      await store.fetch()
      expect(store.sessions[0].isAttended).toBe(false)
    })

    it('sets isRegular when groupId is in viewer regularGroupIds', async () => {
      mockViewer.user = { profileStats: { sessionIds: [], regularGroupIds: [10] } }
      mockFetch({ data: [baseSession] })
      const store = useSessionListStore()
      await store.fetch()
      expect(store.sessions[0].isRegular).toBe(true)
    })
  })

  describe('applyTag', () => {
    it('adds a tag to matching sessions', async () => {
      mockFetch({ data: [baseSession] })
      const store = useSessionListStore()
      await store.fetch()
      const tag = { label: 'Special', termGuid: 'abc-123' }
      store.applyTag([1], tag)
      expect(store.sessions[0].metadata).toContainEqual(tag)
    })

    it('does not duplicate an existing tag', async () => {
      const sessionWithTag = { ...baseSession, metadata: [{ label: 'Special', termGuid: 'abc-123' }] }
      mockFetch({ data: [sessionWithTag] })
      const store = useSessionListStore()
      await store.fetch()
      store.applyTag([1], { label: 'Special', termGuid: 'abc-123' })
      expect(store.sessions[0].metadata?.filter(t => t.termGuid === 'abc-123')).toHaveLength(1)
    })

    it('does not modify sessions not in the id list', async () => {
      const session2 = { ...baseSession, id: 2 }
      mockFetch({ data: [baseSession, session2] })
      const store = useSessionListStore()
      await store.fetch()
      store.applyTag([1], { label: 'Tag', termGuid: 'xyz' })
      expect(store.sessions[1].metadata).not.toContainEqual({ label: 'Tag', termGuid: 'xyz' })
    })
  })

  it('sets error on failed fetch', async () => {
    mockFetch({}, false)
    const store = useSessionListStore()
    await store.fetch()
    expect(store.error).toMatch('500')
    expect(store.sessions).toEqual([])
  })

  it('sets loading false after fetch', async () => {
    mockFetch({ data: [] })
    const store = useSessionListStore()
    await store.fetch()
    expect(store.loading).toBe(false)
  })
})
