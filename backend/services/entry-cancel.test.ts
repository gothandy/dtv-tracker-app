import { describe, it, expect } from 'vitest'
import { cancelledChange } from './entry-cancel'

const now = '2026-11-04T21:00:00.000Z'

describe('cancelledChange', () => {
  it('changes nothing when the entry already is as asked (Edit Entry always sends cancelled)', () => {
    expect(cancelledChange(false, undefined, now)).toEqual({ kind: 'none' })
    expect(cancelledChange(false, null, now)).toEqual({ kind: 'none' })
    expect(cancelledChange(true, '2026-10-01T10:00:00Z', now)).toEqual({ kind: 'none' })
  })

  it('cancels with today’s date, and un-cancels by clearing it', () => {
    expect(cancelledChange(true, undefined, now)).toEqual({ kind: 'set', value: now })
    expect(cancelledChange(false, '2026-10-01T10:00:00Z', now)).toEqual({ kind: 'set', value: null })
  })
})
