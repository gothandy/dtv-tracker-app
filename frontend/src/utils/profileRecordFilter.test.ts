import { describe, it, expect } from 'vitest'
import type { ProfileResponse } from '../../../types/api-responses'
import { profileRecordFilterOptions } from './profileRecordFilter'

const profile = (id: number, records: { type: string; status: string }[]) => ({ id, records }) as unknown as ProfileResponse

const profiles = [
  profile(1, [{ type: 'Photo Consent', status: 'Declined' }, { type: 'Discount Card', status: 'Accepted' }]),
  profile(2, [{ type: 'Photo Consent', status: 'Accepted' }]),
  profile(3, []),
]

describe('profileRecordFilterOptions', () => {
  it('offers only the Types and Statuses the shown Profiles have', () => {
    expect(profileRecordFilterOptions(profiles, '', '')).toEqual({
      types: ['Photo Consent', 'Discount Card'],
      statuses: ['Accepted', 'Declined'],
      noRecord: true,
    })
  })

  it('with a Type, offers that Type’s Statuses, and No record when someone lacks it', () => {
    expect(profileRecordFilterOptions(profiles, 'Discount Card', '')).toEqual({
      types: ['Photo Consent', 'Discount Card'],
      statuses: ['Accepted'],
      noRecord: true,
    })
  })

  it('with a Status, offers only Types that have it', () => {
    expect(profileRecordFilterOptions(profiles, '', 'Declined').types).toEqual(['Photo Consent'])
  })

  it('leaves out No record when everyone shown has the Type', () => {
    expect(profileRecordFilterOptions(profiles.slice(0, 2), 'Photo Consent', '').noRecord).toBe(false)
  })

  it('offers nothing for an empty list', () => {
    expect(profileRecordFilterOptions([], '', '')).toEqual({ types: [], statuses: [], noRecord: false })
  })
})
