import { describe, it, expect } from 'vitest'
import { buildPreSessionVars, buildProfileTemplateVars, buildProfileLoginUrl, profileIsMember } from './email-vars'
import { SESSION_TIME, SESSION_LENGTH } from './field-names'
import type { SharePointEntry, SharePointProfile, SharePointRecord } from '../../types/sharepoint'
import type { SharePointSession } from '../../types/session'
import type { SharePointGroup } from '../../types/group'

const baseEntry = {
  ID: 1,
  Created: '',
  Modified: '',
  ProfileLookupId: 10,
  Profile: 'Alice',
} as SharePointEntry

const baseProfile = {
  ID: 10,
  Created: '',
  Modified: '',
} as SharePointProfile

const baseGroup = {
  ID: 5,
  Title: 'Trail Crew',
  Name: 'Trail Crew',
  Created: '',
  Modified: '',
} as SharePointGroup

describe('buildPreSessionVars', () => {
  it('includes formattedTime from session schedule with defaults', () => {
    const session = {
      ID: 100,
      Date: '2026-04-23',
      Created: '',
      Modified: '',
    } as SharePointSession

    const vars = buildPreSessionVars(baseEntry, session, baseProfile, baseGroup, [], 'https://example.com')

    expect(vars.formattedTime).toBe('9:30 to 12:30 (about 3 hours)')
  })

  it('includes formattedTime from SharePoint Time and Length', () => {
    const session = {
      ID: 100,
      Date: '2026-04-23',
      Created: '',
      Modified: '',
      [SESSION_TIME]: '10:00',
      [SESSION_LENGTH]: 2,
    } as SharePointSession

    const vars = buildPreSessionVars(baseEntry, session, baseProfile, baseGroup, [], 'https://example.com')

    expect(vars.formattedTime).toBe('10:00 to 12:00 (about 2 hours)')
  })

  it('sets isMember from Charity Membership record', () => {
    const session = {
      ID: 100,
      Date: '2026-04-23',
      Created: '',
      Modified: '',
    } as SharePointSession

    const records = [{
      ID: 1,
      Type: 'Charity Membership',
      Status: 'Accepted',
      Created: '',
      Modified: '',
    }] as SharePointRecord[]

    const vars = buildPreSessionVars(baseEntry, session, baseProfile, baseGroup, [], 'https://example.com', records)
    expect(vars.isMember).toBe(true)
  })
})

describe('profileIsMember', () => {
  it('is true for Accepted Charity Membership', () => {
    expect(profileIsMember([{
      ID: 1,
      Type: 'Charity Membership',
      Status: 'Accepted',
      Created: '',
      Modified: '',
    } as SharePointRecord])).toBe(true)
  })

  it('is false for Invited or missing record', () => {
    expect(profileIsMember([{
      ID: 1,
      Type: 'Charity Membership',
      Status: 'Invited',
      Created: '',
      Modified: '',
    } as SharePointRecord])).toBe(false)
    expect(profileIsMember([])).toBe(false)
  })
})

describe('buildProfileTemplateVars', () => {
  const profile = {
    ID: 42,
    Title: 'Alice Smith',
    Email: 'alice@example.com, other@example.com',
    Created: '',
    Modified: '',
  } as SharePointProfile

  it('builds membership-invite vars with loginUrl', () => {
    const vars = buildProfileTemplateVars('membership-invite', profile, 'https://example.com', [])

    expect(vars.name).toBe('Alice Smith')
    expect(vars.email).toBe('alice@example.com')
    expect(vars.loginUrl).toBe('https://example.com/login?email=alice%40example.com')
  })

  it('includes charityMembershipDate for membership-invite', () => {
    const records = [{
      ID: 1,
      Type: 'Charity Membership',
      Status: 'Accepted',
      Date: '2024-04-01T00:00:00Z',
      Created: '',
      Modified: '',
    }] as SharePointRecord[]

    const vars = buildProfileTemplateVars('membership-invite', profile, 'https://example.com', records)

    expect(vars.charityMembershipDate).toBe('1 April 2024')
  })
})

describe('buildProfileLoginUrl', () => {
  it('encodes email in login query param', () => {
    expect(buildProfileLoginUrl('https://example.com', 'a+b@c.com')).toBe(
      'https://example.com/login?email=a%2Bb%40c.com',
    )
  })
})
