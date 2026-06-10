import { describe, it, expect } from 'vitest'
import { nameToSlug } from './slug'

describe('nameToSlug', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(nameToSlug('Andrew Davies')).toBe('andrew-davies')
    expect(nameToSlug('Health and Safety')).toBe('health-and-safety')
  })

  it('strips apostrophes', () => {
    expect(nameToSlug("O'Brien")).toBe('obrien')
  })

  it('returns empty string for undefined', () => {
    expect(nameToSlug(undefined)).toBe('')
  })

  it('replaces special characters with hyphens', () => {
    expect(nameToSlug('(#2305774137) Certificate - C&SO Select Renewal Policy from Zurich'))
      .toBe('2305774137-certificate-c-so-select-renewal-policy-from-zurich')
  })
})
