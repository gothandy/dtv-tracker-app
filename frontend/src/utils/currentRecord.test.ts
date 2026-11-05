import { describe, it, expect } from 'vitest'
import { isCurrentRecord } from './currentRecord'

describe('isCurrentRecord', () => {
  const records = [
    { id: 1, type: 'Photo Consent', date: '2025-01-01', profileId: 10 },
    { id: 2, type: 'Photo Consent', date: '2026-01-01', profileId: 10 },
    { id: 3, type: 'Photo Consent', date: '2026-01-01', profileId: 10 },
    { id: 4, type: 'Privacy Consent', date: '2020-01-01', profileId: 10 },
    { id: 5, type: 'Photo Consent', date: '2027-01-01', profileId: 11 },
    { id: 6, type: 'Photo Consent', profileId: 12 },
  ]
  it('is the latest of the Profile’s Records of the Type, by Date then ID', () => {
    expect(records.filter(r => isCurrentRecord(records, r)).map(r => r.id)).toEqual([3, 4, 5, 6])
  })
})
