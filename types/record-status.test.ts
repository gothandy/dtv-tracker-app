import { describe, it, expect } from 'vitest'
import { recordStatus } from './record-status'

describe('recordStatus', () => {
  it('returns the stored status unchanged, whatever the date (until Records v2 PR 1)', () => {
    for (const status of ['Invited', 'Accepted', 'Declined', 'Expires', 'Expired', '']) {
      expect(recordStatus({ status }, '2026-11-02')).toBe(status)
    }
  })
})
