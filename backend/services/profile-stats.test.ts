import { describe, it, expect } from 'vitest'
import { buildProfileStats, buildSessionLookups, findLinkedProfileIds, findPossibleDuplicates } from './profile-stats'

const sessions = buildSessionLookups([
  { ID: 1, Date: '2025-06-01', GroupLookupId: 7 },
  { ID: 2, Date: '2026-05-10', GroupLookupId: 8 },
  { ID: 3, Date: '2026-12-01', GroupLookupId: 7 },
] as any)

const entry = (sessionId: number, hours: number, extra: Record<string, unknown> = {}) =>
  ({ ID: sessionId * 100, SessionLookupId: sessionId, ProfileLookupId: 10, Hours: hours, ...extra }) as any
const record = (type: string, status: string, date?: string) =>
  ({ ID: Math.random(), ProfileLookupId: 10, Type: type, Status: status, State: { id: 0, type, name: status }, Date: date }) as any

function build(overrides: Partial<Parameters<typeof buildProfileStats>[0]> = {}) {
  return buildProfileStats({
    profileId: 10,
    profile: { ID: 10, Title: 'Alice Example', MatchName: 'alice example' } as any,
    entries: [],
    records: [],
    regulars: [],
    sessions,
    linkedProfileIds: [],
    isPossibleDuplicate: false,
    today: '2026-11-03',
    ...overrides,
  })
}

describe('buildProfileStats', () => {
  it('adds up hours and sessions per FY, leaving out cancelled bookings', () => {
    const stats = build({ entries: [entry(1, 3), entry(2, 2.25), entry(2, 1, { Cancelled: '2026-05-01T10:00:00Z' }), entry(3, 0)] })
    expect(stats.hoursByFY).toEqual({ FY2025: 3, FY2026: 2.3 })
    expect(stats.sessionsByFY).toEqual({ FY2025: 1, FY2026: 2 })
    expect(stats.sessionIds).toEqual([1, 2, 3])
    expect(stats.repeatGroupIds.sort()).toEqual([7, 8])
  })

  it('works out the badges from Records', () => {
    const stats = build({ records: [
      record('Charity Membership', 'Accepted'),
      record('Discount Card', 'Invited'),
      record('First Aid Certificate', 'Expires', '2027-01-01'),
      record('Photo Consent', 'Accepted'),
    ] })
    expect(stats).toMatchObject({ isMember: true, cardStatus: 'Invited', isFirstAider: true, noPhoto: false })
    // Up to and including the expiry (#322 §1); the day after, not
    expect(build({ records: [record('First Aid Certificate', 'Expires', '2026-11-03')] }).isFirstAider).toBe(true)
    expect(build({ records: [record('First Aid Certificate', 'Expires', '2026-11-02')] }).isFirstAider).toBe(false)
    expect(build().noPhoto).toBe(true)
  })

  it('warns in a fixed order', () => {
    const stats = build({
      profile: { ID: 10, Title: 'Alice Example', MatchName: 'wrong', IsGroup: false } as any,
      isPossibleDuplicate: true,
      entries: [entry(3, 0, { Notes: '#child' })],
    })
    expect(stats.warnings.map(w => w.text)).toEqual(['Possible Duplicate', 'Match Name Error', 'Child No Adult', 'No Consent'])
    expect(build({ entries: [entry(3, 0)], records: [record('Privacy Consent', 'Accepted')] }).warnings).toEqual([])
  })

  it('keeps the stored key order, which the nightly refresh compares', () => {
    expect(Object.keys(build())).toEqual([
      'hoursByFY', 'sessionsByFY', 'isMember', 'cardStatus', 'regularGroupIds', 'repeatGroupIds',
      'sessionIds', 'linkedProfileIds', 'isFirstAider', 'noPhoto', 'isDofE', 'warnings',
    ])
  })
})

describe('findPossibleDuplicates and findLinkedProfileIds', () => {
  const profiles = [
    { ID: 1, Title: 'Sam Smith', MatchName: 'sam smith', Email: 'sam@example.com' },
    { ID: 2, Title: 'sam  smith', MatchName: 'other', Email: 'x@example.com, SAM@example.com' },
    { ID: 3, Title: '', MatchName: 'jo bloggs', Email: '' },
    { ID: 4, Title: 'Jo B', MatchName: 'jo bloggs', Email: '' },
  ] as any

  it('finds Profiles sharing a name or Match Name', () => {
    expect([...findPossibleDuplicates(profiles)].sort()).toEqual([1, 2, 3, 4])
  })

  it('links Profiles sharing an email, ignoring case', () => {
    expect(findLinkedProfileIds(1, profiles[0], profiles)).toEqual([2])
    expect(findLinkedProfileIds(3, profiles[2], profiles)).toEqual([])
  })
})
