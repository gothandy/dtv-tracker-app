import { describe, it, expect } from 'vitest'
import { templateHelpText } from './templateHelp'
import { TEMPLATE_VARIABLES } from '../../../types/email-template'

describe('templateHelpText', () => {
  it("lists each of the context's variables, ready to copy", () => {
    const help = templateHelpText('Profile')
    for (const v of TEMPLATE_VARIABLES.Profile) expect(help).toContain(`{{${v.name}}}`)
    expect(help).not.toContain('volunteerName')
  })

  it('includes the Handlebars basics', () => {
    expect(templateHelpText('Session')).toContain('{{#if volunteerName}}')
    expect(templateHelpText('Session')).toContain('{{#section style="dark"}}')
  })
})
