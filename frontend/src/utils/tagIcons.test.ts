import { describe, it, expect } from 'vitest'
import { iconsForEntry } from './tagIcons'

describe('iconsForEntry — isChild', () => {
  it('shows child icon when isChild is true', () => {
    const icons = iconsForEntry({ isChild: true })
    expect(icons.some(i => i.alt === 'Child')).toBe(true)
  })

  it('omits child icon when isChild is absent', () => {
    const icons = iconsForEntry({})
    expect(icons.some(i => i.alt === 'Child')).toBe(false)
  })

  it('omits child icon when snapshot.isChild is set but isChild is not passed', () => {
    const icons = iconsForEntry({ stats: { snapshot: { isChild: true } } })
    expect(icons.some(i => i.alt === 'Child')).toBe(false)
  })
})

describe('iconsForEntry — Profile Warning', () => {
  it('shows Profile Warning badge when hasProfileWarning is true', () => {
    const icons = iconsForEntry({ hasProfileWarning: true })
    const w = icons.find(i => i.alt === 'Profile Warning')
    expect(w).toBeDefined()
    expect(w?.type).toBe('badge')
  })

  it('omits Profile Warning when hasProfileWarning is absent', () => {
    const icons = iconsForEntry({})
    expect(icons.some(i => i.alt === 'Profile Warning')).toBe(false)
  })

  it('omits Duplicate Warning — manual.duplicate no longer drives a warning icon', () => {
    const icons = iconsForEntry({ stats: { manual: { duplicate: true } } })
    expect(icons.some(i => i.alt === 'Duplicate Warning')).toBe(false)
    expect(icons.some(i => i.alt === 'Profile Warning')).toBe(false)
  })
})
