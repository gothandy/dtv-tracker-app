import { describe, it, expect } from 'vitest'
import { recordFlags } from './record-rules'

let id = 0
const record = (type: string, name: string, date?: string) =>
  ({ ID: ++id, ProfileLookupId: 10, State: { id: 0, type, name }, Date: date }) as any

const today = '2026-11-04'

describe('recordFlags', () => {
  it('gives today’s results for a Profile with one Record per Type', () => {
    expect(recordFlags([
      record('Charity Membership', 'Accepted'),
      record('Discount Card', 'Invited'),
      record('First Aid Certificate', 'Expires', '2027-01-01'),
      record('Photo Consent', 'Accepted'),
      record('Privacy Consent', 'Accepted'),
      record('DofE', 'Active', '2026-09-01'),
    ], today)).toEqual({
      isMember: true, cardStatus: 'Invited', isFirstAider: true, noPhoto: false, hasPrivacyConsent: true, isDofE: true,
    })
  })

  it('gives nothing for a Profile with no Records', () => {
    expect(recordFlags([], today)).toEqual({
      isMember: false, cardStatus: null, isFirstAider: false, noPhoto: true, hasPrivacyConsent: false, isDofE: false,
    })
  })

  it('reads each Type’s current Record, so a later State replaces an earlier one', () => {
    const flags = recordFlags([
      record('Charity Membership', 'Accepted', '2025-01-01'),
      record('Charity Membership', 'Removed', '2026-01-01'),
      record('Photo Consent', 'Accepted', '2025-01-01'),
      record('Photo Consent', 'Withdrawn', '2026-02-01'),
      record('DofE', 'Active', '2025-09-01'),
      record('DofE', 'Complete', '2026-06-01'),
    ], today)
    expect(flags).toMatchObject({ isMember: false, noPhoto: true, isDofE: false })
  })

  it('First Aider holds up to and including the certificate’s expiry, and a renewal counts', () => {
    expect(recordFlags([record('First Aid Certificate', 'Expires', today)], today).isFirstAider).toBe(true)
    expect(recordFlags([record('First Aid Certificate', 'Expires', '2026-11-03')], today).isFirstAider).toBe(false)
    expect(recordFlags([record('First Aid Certificate', 'Expires')], today).isFirstAider).toBe(false)
    expect(recordFlags([
      record('First Aid Certificate', 'Expires', '2026-01-01'),
      record('First Aid Certificate', 'Expires', '2029-01-01'),
    ], today).isFirstAider).toBe(true)
  })
})
