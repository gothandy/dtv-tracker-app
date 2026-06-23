import { describe, it, expect } from 'vitest'
import { bulkEntrySessionOptions } from './bulkEntrySessionOptions'

describe('bulkEntrySessionOptions', () => {
  it('returns future bookable sessions sorted by date ascending with labels', () => {
    const result = bulkEntrySessionOptions([
      { id: 3, date: '2026-12-01', groupName: 'Far', isBookable: true },
      { id: 1, date: '2026-06-01', groupName: 'Near', isBookable: true },
      { id: 2, date: '2025-01-01', groupName: 'Past', isBookable: false },
    ])

    expect(result).toEqual([
      { id: 1, label: '1 Jun 2026 — Near' },
      { id: 3, label: '1 Dec 2026 — Far' },
    ])
  })
})
