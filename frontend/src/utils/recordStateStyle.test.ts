import { describe, it, expect } from 'vitest'
import { todayStyle } from './recordStateStyle'

describe('todayStyle', () => {
  it('Accepted is Active; Invited and Declined are Warn; the rest are Default', () => {
    expect(todayStyle('Accepted')).toBe('active')
    expect(todayStyle('Invited')).toBe('warn')
    expect(todayStyle('Declined')).toBe('warn')
    expect(todayStyle('Expires')).toBeUndefined()
    expect(todayStyle('Requested')).toBeUndefined()
  })
})
