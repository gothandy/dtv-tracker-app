import { describe, it, expect } from 'vitest'
import { matchesTag, NO_TAGS } from './tagFilter'

const tags = [{ label: 'XC:Verderers' }]

describe('matchesTag', () => {
  it('no filter matches everything', () => {
    expect(matchesTag(undefined, '')).toBe(true)
    expect(matchesTag(tags, '')).toBe(true)
  })

  it('No tags matches only untagged items', () => {
    expect(matchesTag([], NO_TAGS)).toBe(true)
    expect(matchesTag(tags, NO_TAGS)).toBe(false)
  })

  it('a tag matches itself and its children, not lookalikes', () => {
    expect(matchesTag(tags, 'XC')).toBe(true)
    expect(matchesTag(tags, 'XC:Verderers')).toBe(true)
    expect(matchesTag(tags, 'XC:Verd')).toBe(false)
    expect(matchesTag(undefined, 'XC')).toBe(false)
  })
})
