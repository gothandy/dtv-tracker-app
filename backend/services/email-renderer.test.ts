import { describe, it, expect } from 'vitest'
import { renderEmail } from './email-renderer'

const PRE_DIG_VARS = {
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

describe('pre-dig email', () => {
  it('renders subject with group name and date', async () => {
    const { subject } = await renderEmail('pre-dig', PRE_DIG_VARS)
    expect(subject).toContain('Trail Crew')
    expect(subject).toContain('3 May')
  })

  it('renders apostrophes in subject as plain text', async () => {
    const { subject } = await renderEmail('pre-dig', {
      ...PRE_DIG_VARS,
      groupName: "Women's Dig",
    })
    expect(subject).toBe("Women's Dig details for 3 May")
    expect(subject).not.toContain('&#x27;')
  })

  it('renders html with volunteer name and session URL', async () => {
    const { html } = await renderEmail('pre-dig', {
      ...PRE_DIG_VARS,
      sessionTitle: 'Women Dig Intro Session',
    })
    expect(html).toContain('Alice')
    expect(html).toContain('sessions/trail-crew/2025-05-03')
    expect(html).toContain('Women Dig Intro Session')
  })

  it('includes dig clothing guidance', async () => {
    const { html, text } = await renderEmail('pre-dig', PRE_DIG_VARS)
    expect(html).toContain('sturdy boots')
    expect(text).toContain('sturdy boots')
  })

  it('renders non-empty text', async () => {
    const { text } = await renderEmail('pre-dig', PRE_DIG_VARS)
    expect(text.length).toBeGreaterThan(0)
  })

  it('renders session time from template vars', async () => {
    const { html, text } = await renderEmail('pre-dig', {
      ...PRE_DIG_VARS,
      formattedTime: '10:00 to 12:30 (about 2.5 hours)',
    })
    expect(html).toContain('10:00 to 12:30 (about 2.5 hours)')
    expect(text).toContain('Time: 10:00 to 12:30 (about 2.5 hours)')
  })

  it('omits isRegular block when not set', async () => {
    const { html } = await renderEmail('pre-dig', PRE_DIG_VARS)
    expect(html).not.toContain('regular')
  })

  it('omits myChildNames block when not set', async () => {
    const { html } = await renderEmail('pre-dig', PRE_DIG_VARS)
    expect(html).not.toContain('accompanying adult')
  })

  it('includes optional blocks when set', async () => {
    const { html } = await renderEmail('pre-dig', {
      ...PRE_DIG_VARS,
      description:  'Bring extra gloves.',
      isRegular:    true,
      myChildNames: 'Sam',
    })
    expect(html).toContain('Bring extra gloves.')
    expect(html).toContain('regular')
    expect(html).toContain('accompanying adult')
  })
})

describe('pre-social email', () => {
  it('renders like pre-dig but without dig clothing guidance', async () => {
    const { subject, html, text } = await renderEmail('pre-social', PRE_DIG_VARS)
    expect(subject).toContain('Trail Crew')
    expect(html).toContain('Alice')
    expect(html).toContain('sessions/trail-crew/2025-05-03')
    expect(html).not.toContain('sturdy boots')
    expect(text).not.toContain('sturdy boots')
    expect(text).not.toContain('hi-viz')
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
