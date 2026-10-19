import { describe, it, expect } from 'vitest'
import { sampleTemplateVars } from './email-vars'
import { TEMPLATE_VARIABLES, TEMPLATE_CONTEXT_NAMES } from '../../types/email-template'

describe('TEMPLATE_VARIABLES', () => {
  it('lists exactly the variables each context gives a template', () => {
    for (const context of TEMPLATE_CONTEXT_NAMES) {
      const given = Object.keys(sampleTemplateVars(context, 'https://example.org')).sort()
      const listed = TEMPLATE_VARIABLES[context].map(v => v.name).sort()
      expect(listed, context).toEqual(given)
    }
  })
})
