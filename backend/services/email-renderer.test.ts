import { describe, it, expect } from 'vitest'
import { renderEmail } from './email-renderer'

const PRE_SESSION_VARS = {
  volunteerName:     'Alice',
  groupName:         'Trail Crew',
  formattedDateLong: 'Saturday 3 May 2025',
  formattedDateShort:'3 May',
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

  it('renders html with volunteer name and session URL', async () => {
    const { html } = await renderEmail('pre-session', PRE_SESSION_VARS)
    expect(html).toContain('Alice')
    expect(html).toContain('sessions/trail-crew/2025-05-03')
  })

  it('renders non-empty text', async () => {
    const { text } = await renderEmail('pre-session', PRE_SESSION_VARS)
    expect(text.length).toBeGreaterThan(0)
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
