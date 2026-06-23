import { describe, it, expect } from 'vitest'
import { renderEmail } from './email-renderer'

const PRE_SESSION_VARS = {
  volunteerName:     'Alice',
  groupName:         'Trail Crew',
  formattedDateLong: 'Saturday 3 May 2025',
  formattedDateShort:'3 May',
  formattedTime:     '9:30 to 12:30 (about 3 hours)',
  sessionUrl:        'https://example.com/sessions/trail-crew/2025-05-03',
  loginUrl:          'https://example.com/login',
}

const POST_SESSION_VARS = {
  volunteerName:     'Alice',
  groupName:         'Trail Crew',
  formattedDateLong: 'Saturday 3 May 2025',
  formattedDateShort:'3 May',
  userHours:         3,
  groupUrl:          'https://example.com/groups/trail-crew',
  uploadUrl:         'https://example.com/upload?entryId=42',
  stats:             { count: 8, hours: 24 },
}

describe('pre-session email', () => {
  it('renders subject with group name and date', async () => {
    const { subject } = await renderEmail('pre-session', PRE_SESSION_VARS)
    expect(subject).toContain('Trail Crew')
    expect(subject).toContain('3 May')
  })

  it('renders apostrophes in subject as plain text', async () => {
    const { subject } = await renderEmail('pre-session', {
      ...PRE_SESSION_VARS,
      groupName: "Women's Dig",
    })
    expect(subject).toBe("Women's Dig details for 3 May")
    expect(subject).not.toContain('&#x27;')
  })

  it('renders html with volunteer name and session URL', async () => {
    const { html } = await renderEmail('pre-session', {
      ...PRE_SESSION_VARS,
      sessionTitle: 'Women Dig Intro Session',
    })
    expect(html).toContain('Alice')
    expect(html).toContain('sessions/trail-crew/2025-05-03')
    expect(html).toContain('Women Dig Intro Session')
  })

  it('renders non-empty text', async () => {
    const { text } = await renderEmail('pre-session', PRE_SESSION_VARS)
    expect(text.length).toBeGreaterThan(0)
  })

  it('renders session time from template vars', async () => {
    const { html, text } = await renderEmail('pre-session', {
      ...PRE_SESSION_VARS,
      formattedTime: '10:00 to 12:30 (about 2.5 hours)',
    })
    expect(html).toContain('10:00 to 12:30 (about 2.5 hours)')
    expect(text).toContain('Time: 10:00 to 12:30 (about 2.5 hours)')
  })

  it('omits isRegular block when not set', async () => {
    const { html } = await renderEmail('pre-session', PRE_SESSION_VARS)
    expect(html).not.toContain('regular')
  })

  it('omits myChildNames block when not set', async () => {
    const { html } = await renderEmail('pre-session', PRE_SESSION_VARS)
    expect(html).not.toContain('accompanying adult')
  })

  it('includes optional blocks when set', async () => {
    const { html } = await renderEmail('pre-session', {
      ...PRE_SESSION_VARS,
      description:  'Bring extra gloves.',
      isRegular:    true,
      myChildNames: 'Sam',
    })
    expect(html).toContain('Bring extra gloves.')
    expect(html).toContain('regular')
    expect(html).toContain('accompanying adult')
  })
})

describe('post-session email', () => {
  it('renders subject with group name and date', async () => {
    const { subject } = await renderEmail('post-session', POST_SESSION_VARS)
    expect(subject).toContain('Trail Crew')
    expect(subject).toContain('3 May')
  })

  it('renders html with volunteer name and hours', async () => {
    const { html } = await renderEmail('post-session', POST_SESSION_VARS)
    expect(html).toContain('Alice')
    expect(html).toContain('3')
  })

  it('renders stats block', async () => {
    const { html } = await renderEmail('post-session', POST_SESSION_VARS)
    expect(html).toContain('8') // stats.count
  })

  it('renders non-empty text', async () => {
    const { text } = await renderEmail('post-session', POST_SESSION_VARS)
    expect(text.length).toBeGreaterThan(0)
  })

  it('omits cover photo block when not set', async () => {
    const { html } = await renderEmail('post-session', POST_SESSION_VARS)
    expect(html).not.toContain('photo.jpg')
  })

  it('includes optional blocks when set', async () => {
    const { html } = await renderEmail('post-session', {
      ...POST_SESSION_VARS,
      coverPhotoUrl:   'https://example.com/photo.jpg',
      description:     'Great session.',
      nextSessionUrl:  'https://example.com/sessions/trail-crew/2025-06-07',
      nextSessionDate: '7 June',
    })
    expect(html).toContain('photo.jpg')
    expect(html).toContain('Great session.')
    expect(html).toContain('7 June')
  })
})

describe('pre-agm email', () => {
  const PRE_AGM_VARS = {
    baseUrl: 'https://example.com',
    volunteerName: 'Alice',
    groupName: 'Trail Crew',
    sessionTitle: null,
    formattedDateShort: '26 June',
    formattedDateLong: 'Friday, 26 June 2026',
    formattedTime: '7pm',
    description: '',
    sessionUrl: 'https://example.com/sessions/trail-crew/2026-06-26',
    loginUrl: 'https://example.com/login?returnTo=%2Fsessions%2Ftrail-crew%2F2026-06-26',
    myChildNames: null,
    isRegular: false,
    isMember: false,
    tags: null,
    agendaUrl: 'https://example.com/docs/charity/annual-reports/2025-26/agm-agenda-25-26.pdf',
    reportUrl: 'https://example.com/docs/charity/annual-reports/2025-26/agm-presentation-25-26.pdf',
    financialUrl: 'https://example.com/docs/charity/annual-reports/2025-26/dtv-draft-accounts-2025-26-22-jun-2026-14-53.pdf',
  }

  it('renders AGM copy with doc and session links', async () => {
    const { subject, text, html } = await renderEmail('pre-agm', PRE_AGM_VARS)
    expect(subject).toContain("Thursday's AGM")
    expect(text).toContain('Dear Alice')
    expect(text).toContain('agm-agenda-25-26.pdf')
    expect(text).toContain('sessions/trail-crew/2026-06-26')
    expect(html).toContain('Dear Alice')
    expect(html).toContain('href="' + PRE_AGM_VARS.sessionUrl + '"')
    expect(html).toContain('>My Tracker</a>')
  })
})

describe('membership-invite email', () => {
  it('renders membership date when set', async () => {
    const { html, text } = await renderEmail('membership-invite', {
      baseUrl: 'https://example.com',
      name: 'Alice',
      email: 'alice@example.com',
      loginUrl: 'https://example.com/login?email=alice%40example.com',
      charityMembershipDate: '1 April 2024',
    })
    expect(text).toContain('1 April 2024')
    expect(html).toContain('1 April 2024')
  })
})
