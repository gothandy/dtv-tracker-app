import { describe, it, expect } from 'vitest'
import { ukToday } from './uk-today'

describe('ukToday', () => {
  it('gives the UK date during BST, where UTC is still the day before', () => {
    // 00:30 BST on 2 Jul 2026 is 23:30 UTC on 1 Jul 2026
    expect(ukToday(new Date('2026-07-01T23:30:00Z'))).toBe('2026-07-02')
  })

  it('gives the same date as UTC during GMT', () => {
    expect(ukToday(new Date('2026-11-02T10:00:00Z'))).toBe('2026-11-02')
  })

  it('gives the UK date just before midnight UK time', () => {
    // 23:30 BST on 2 Jul 2026 is 22:30 UTC on 2 Jul 2026
    expect(ukToday(new Date('2026-07-02T22:30:00Z'))).toBe('2026-07-02')
  })

  it('uses the UK clock across the spring change', () => {
    // 01:30 GMT on 29 Mar 2026 is 01:30 UTC; BST starts at 01:00 UTC that day
    expect(ukToday(new Date('2026-03-29T01:30:00Z'))).toBe('2026-03-29')
  })
})
