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

  it('leaves Records already on their State, and reports any with no Type or Status', () => {
    const plan = planMigration(
      [rec(1, 'Photo Consent', 'Accepted', 7), rec(2, 'Photo Consent', ''), rec(3, undefined, 'Accepted')],
      [{ ID: 7, Name: 'Accepted', Type: 'Photo Consent', Title: 'Photo Consent Accepted' }],
    )
    expect(plan.alreadySet).toBe(1)
    expect(plan.missingTypeOrStatus.map(m => m.id)).toEqual([2, 3])
    expect(plan.statesToInsert).toEqual([])
    expect(plan.recordsToSet).toEqual({})
  })

  it('re-sets Records on a deleted State or another State', () => {
    const plan = planMigration(
      [rec(1, 'Photo Consent', 'Accepted', 99), rec(2, 'Photo Consent', 'Accepted', 8)],
      [{ ID: 7, Name: 'Accepted', Type: 'Photo Consent', Title: 'Photo Consent Accepted' }, { ID: 8, Name: 'Declined', Type: 'Photo Consent', Title: 'Photo Consent Declined' }],
    )
    expect(plan.statesToInsert).toEqual([])
    expect(plan.recordsToSet).toEqual({ 'Photo Consent': { Accepted: 2 } })
    expect(plan.alreadySet).toBe(0)
  })

  it('inserts again after the States are deleted, even where Records still hold the old IDs', () => {
    const plan = planMigration([rec(1, 'Photo Consent', 'Accepted', 7)], [])
    expect(plan.statesToInsert).toEqual([{ type: 'Photo Consent', name: 'Accepted' }])
    expect(plan.recordsToSet).toEqual({ 'Photo Consent': { Accepted: 1 } })
  })

  it('overwrites any Title that is not "{Type} {Name}"', () => {
    const plan = planMigration([], [
      { ID: 7, Name: 'Accepted', Type: 'Photo Consent', Title: 'Accepted' },
      { ID: 8, Name: 'Declined', Type: 'Photo Consent' },
      { ID: 9, Name: 'Given', Type: 'Photo Consent', Title: 'Photo Consent Given' },
    ])
    expect(plan.titlesToSet).toEqual([
      { id: 7, from: 'Accepted', to: 'Photo Consent Accepted' },
      { id: 8, from: '', to: 'Photo Consent Declined' },
    ])
  })

  it('uses the lowest ID when a Type and Name is in the States list twice', () => {
    const plan = planMigration([rec(1, 'Photo Consent', 'Accepted', 5)], [
      { ID: 9, Name: 'Accepted', Type: 'Photo Consent', Title: 'Photo Consent Accepted' },
      { ID: 5, Name: 'Accepted', Type: 'Photo Consent', Title: 'Photo Consent Accepted' },
    ])
    expect(plan.alreadySet).toBe(1)
  })

  it('finds nothing to do on a repeat run', () => {
    const plan = planMigration([rec(1, 'Photo Consent', 'Accepted', 7)], [{ ID: 7, Name: 'Accepted', Type: 'Photo Consent', Title: 'Photo Consent Accepted' }])
    expect(plan).toEqual({ statesToInsert: [], titlesToSet: [], recordsToSet: {}, alreadySet: 1, missingTypeOrStatus: [] })
  })
})
