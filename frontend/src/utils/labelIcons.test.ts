import { describe, it, expect } from 'vitest'
import { iconsForEntry } from './labelIcons'

describe('iconsForEntry — isChild', () => {
  it('shows child icon when isChild is true', () => {
    const icons = iconsForEntry({ isChild: true })
    expect(icons.some(i => i.alt === 'Child')).toBe(true)
  })

  it('omits child icon when isChild is absent', () => {
    const icons = iconsForEntry({})
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
})

describe('iconsForEntry — Eventbrite', () => {
  it('shows Eventbrite icon when eventbriteAttendeeId is set', () => {
    const icons = iconsForEntry({ eventbriteAttendeeId: '12345' })
    expect(icons.some(i => i.alt === 'Eventbrite')).toBe(true)
  })

  it('omits Eventbrite icon when eventbriteAttendeeId is absent', () => {
    const icons = iconsForEntry({})
    expect(icons.some(i => i.alt === 'Eventbrite')).toBe(false)
  })
})

describe('iconsForEntry — labels', () => {
  it('shows Regular when labels includes Regular', () => {
    expect(iconsForEntry({ labels: ['Regular'] }).some(i => i.alt === 'Regular')).toBe(true)
  })

  it('shows CSR when labels includes CSR', () => {
    expect(iconsForEntry({ labels: ['CSR'] }).some(i => i.alt === 'CSR')).toBe(true)
  })

  it('shows Late when labels includes Late', () => {
    expect(iconsForEntry({ labels: ['Late'] }).some(i => i.alt === 'Late')).toBe(true)
  })

  it('shows Dig Lead when labels includes DigLead', () => {
    expect(iconsForEntry({ labels: ['DigLead'] }).some(i => i.alt === 'Dig Lead')).toBe(true)
  })

  it('omits label icons when labels is empty', () => {
    const icons = iconsForEntry({ labels: [] })
    expect(icons.some(i => i.alt === 'Regular')).toBe(false)
    expect(icons.some(i => i.alt === 'CSR')).toBe(false)
  })
})

describe('iconsForEntry — First Aider', () => {
  it('shows On Duty icon when FirstAider label is set', () => {
    const icons = iconsForEntry({ labels: ['FirstAider'] })
    expect(icons.some(i => i.alt === 'First Aider (On Duty)')).toBe(true)
    expect(icons.some(i => i.alt === 'First Aider (Available)')).toBe(false)
  })

  it('shows Available icon when isFirstAiderAvailable and no label', () => {
    const icons = iconsForEntry({ isFirstAiderAvailable: true })
    const fa = icons.find(i => i.alt === 'First Aider (Available)')
    expect(fa).toBeDefined()
    expect(fa?.subdued).toBe(true)
  })

  it('On Duty takes precedence over Available', () => {
    const icons = iconsForEntry({ labels: ['FirstAider'], isFirstAiderAvailable: true })
    expect(icons.some(i => i.alt === 'First Aider (On Duty)')).toBe(true)
    expect(icons.some(i => i.alt === 'First Aider (Available)')).toBe(false)
  })

  it('omits both when neither label nor available', () => {
    const icons = iconsForEntry({})
    expect(icons.some(i => i.alt.startsWith('First Aider'))).toBe(false)
  })
})

describe('iconsForEntry — isNew / noPhoto', () => {
  it('shows New icon when isNew is true', () => {
    expect(iconsForEntry({ isNew: true }).some(i => i.alt === 'New')).toBe(true)
  })

  it('shows No Photo icon when noPhoto is true', () => {
    const icons = iconsForEntry({ noPhoto: true })
    const np = icons.find(i => i.alt === 'No Photo')
    expect(np).toBeDefined()
    expect(np?.color).toBe('red')
  })

  it('omits New and No Photo when absent', () => {
    const icons = iconsForEntry({})
    expect(icons.some(i => i.alt === 'New')).toBe(false)
    expect(icons.some(i => i.alt === 'No Photo')).toBe(false)
  })
})

describe('iconsForEntry — member badges', () => {
  it('shows Charity Member badge for isMember non-group', () => {
    expect(iconsForEntry({ isMember: true }).some(i => i.alt === 'Charity Member')).toBe(true)
  })

  it('shows Charity Member badge for group if isMember is true (data anomaly surfaced as profile warning)', () => {
    expect(iconsForEntry({ isMember: true, isGroup: true }).some(i => i.alt === 'Charity Member')).toBe(true)
  })

  it('shows Benefits Card for Accepted cardStatus', () => {
    expect(iconsForEntry({ cardStatus: 'Accepted' }).some(i => i.alt === 'Benefits Card')).toBe(true)
  })

  it('shows Card Invited for Invited cardStatus', () => {
    const icons = iconsForEntry({ cardStatus: 'Invited' })
    expect(icons.some(i => i.alt === 'Card Invited')).toBe(true)
  })
})
