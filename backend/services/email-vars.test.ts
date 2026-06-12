import { describe, it, expect } from 'vitest'
import { buildPreSessionVars } from './email-vars'
import { SESSION_TIME, SESSION_LENGTH } from './field-names'
import type { SharePointEntry, SharePointProfile } from '../../types/sharepoint'
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
})
