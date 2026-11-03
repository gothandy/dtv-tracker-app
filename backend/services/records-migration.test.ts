import { describe, it, expect } from 'vitest'
import { planMigration } from './records-migration'

const rec = (ID: number, Type: string | undefined, Status: string | undefined, StateLookupId?: number) => ({ ID, Type, Status, StateLookupId })

describe('planMigration', () => {
  it('inserts one State per Type and Status not yet in the list, and counts the Records to set', () => {
    const plan = planMigration([
      rec(1, 'Charity Membership', 'Accepted'),
      rec(2, 'Charity Membership', 'Accepted'),
      rec(3, 'Charity Membership', 'Expired'),
      rec(4, 'Photo Consent', 'Accepted'),
    ], [{ ID: 7, Name: 'Accepted', Type: 'Photo Consent' }])
    expect(plan.statesToInsert).toEqual([
      { type: 'Charity Membership', name: 'Accepted' },
      { type: 'Charity Membership', name: 'Expired' },
    ])
    expect(plan.recordsToSet).toEqual({ 'Charity Membership': { Accepted: 2, Expired: 1 }, 'Photo Consent': { Accepted: 1 } })
  })

  it('matches on Type then Status: the same Status under another Type is a different State', () => {
    const plan = planMigration([rec(1, 'Discount Card', 'Accepted')], [{ ID: 7, Name: 'Accepted', Type: 'Photo Consent' }])
    expect(plan.statesToInsert).toEqual([{ type: 'Discount Card', name: 'Accepted' }])
  })

  it('skips Records that already have a State, and reports any with no Type or Status', () => {
    const plan = planMigration([rec(1, 'Photo Consent', 'Accepted', 7), rec(2, 'Photo Consent', ''), rec(3, undefined, 'Accepted')], [])
    expect(plan.alreadySet).toBe(1)
    expect(plan.missingTypeOrStatus.map(m => m.id)).toEqual([2, 3])
    expect(plan.statesToInsert).toEqual([])
    expect(plan.recordsToSet).toEqual({})
  })

  it('finds nothing to do once every Record has a State (a repeat run)', () => {
    const plan = planMigration([rec(1, 'Photo Consent', 'Accepted', 7)], [{ ID: 7, Name: 'Accepted', Type: 'Photo Consent' }])
    expect(plan).toEqual({ statesToInsert: [], recordsToSet: {}, alreadySet: 1, missingTypeOrStatus: [] })
  })
})
