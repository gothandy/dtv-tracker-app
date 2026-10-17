import { describe, it, expect } from 'vitest'
import { renderEmail } from './email-renderer'

// Templates are rows of the SharePoint Templates list; these stand in for one.
const TEMPLATE = {
  Subject: '{{groupName}} details for {{formattedDateShort}}',
  HTML: [
    '{{#section}}<p>Hi {{volunteerName}}</p>{{/section}}',
    '{{#section style="green"}}{{#if isRegular}}<p>You are a regular.</p>{{/if}}{{/section}}',
    '{{#if description}}<p>{{{nl2br description}}}</p>{{/if}}',
  ].join('\n'),
  Text: '\nHi {{volunteerName}}\n{{#if isRegular}}You are a regular.{{/if}}\n',
}

const VARS = {
  volunteerName: 'Alice',
  groupName: 'Trail Crew',
  formattedDateShort: '3 May',
}

describe('renderEmail', () => {
  it('renders the subject with variables', async () => {
    const { subject } = await renderEmail(TEMPLATE, VARS)
    expect(subject).toBe('Trail Crew details for 3 May')
  })

  it('renders apostrophes in the subject as plain text', async () => {
    const { subject } = await renderEmail(TEMPLATE, { ...VARS, groupName: "Women's Dig" })
    expect(subject).toBe("Women's Dig details for 3 May")
  })

  it('escapes variables in the HTML', async () => {
    const { html } = await renderEmail(TEMPLATE, { ...VARS, volunteerName: '<b>Al</b>' })
    expect(html).toContain('&lt;b&gt;Al&lt;/b&gt;')
  })

  it('wraps the HTML in the base layout', async () => {
    const { html } = await renderEmail(TEMPLATE, VARS)
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true)
    expect(html).toContain('Hi Alice')
  })

  it('section helper wraps content in a table row with the style colours', async () => {
    const { html } = await renderEmail(TEMPLATE, { ...VARS, isRegular: true })
    expect(html).toContain('max-width:600px')
    expect(html).toContain('You are a regular.')
  })

  it('omits optional blocks when not set', async () => {
    const { html, text } = await renderEmail(TEMPLATE, VARS)
    expect(html).not.toContain('regular')
    expect(text).not.toContain('regular')
  })

  it('nl2br turns new lines into breaks', async () => {
    const { html } = await renderEmail(TEMPLATE, { ...VARS, description: 'Bring gloves.\nAnd water.' })
    expect(html).toContain('Bring gloves.<br>And water.')
  })

  it('trims the text version', async () => {
    const { text } = await renderEmail(TEMPLATE, VARS)
    expect(text).toBe('Hi Alice')
  })

  it('renders an empty template without failing', async () => {
    const { subject, text } = await renderEmail({}, VARS)
    expect(subject).toBe('')
    expect(text).toBe('')
  })
})
