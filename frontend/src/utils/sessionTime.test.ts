import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SESSION_LENGTH,
  DEFAULT_SESSION_TIME,
  formatSessionTimeRange,
  resolveSessionLength,
  resolveSessionTime,
} from './sessionTime'

describe('resolveSessionTime', () => {
  it('returns default for blank values', () => {
    expect(resolveSessionTime('')).toBe(DEFAULT_SESSION_TIME)
    expect(resolveSessionTime('   ')).toBe(DEFAULT_SESSION_TIME)
    expect(resolveSessionTime(undefined)).toBe(DEFAULT_SESSION_TIME)
    expect(resolveSessionTime(null)).toBe(DEFAULT_SESSION_TIME)
  })

  it('keeps explicit times', () => {
    expect(resolveSessionTime('10:00')).toBe('10:00')
  })
})

describe('resolveSessionLength', () => {
  it('returns default for blank values only', () => {
    expect(resolveSessionLength('')).toBe(DEFAULT_SESSION_LENGTH)
    expect(resolveSessionLength('   ')).toBe(DEFAULT_SESSION_LENGTH)
    expect(resolveSessionLength(undefined)).toBe(DEFAULT_SESSION_LENGTH)
    expect(resolveSessionLength(null)).toBe(DEFAULT_SESSION_LENGTH)
  })

  it('returns null for invalid non-blank values', () => {
    expect(resolveSessionLength(0)).toBeNull()
    expect(resolveSessionLength(-1)).toBeNull()
    expect(resolveSessionLength('0')).toBeNull()
    expect(resolveSessionLength('abc')).toBeNull()
  })

  it('keeps positive lengths', () => {
    expect(resolveSessionLength(2.5)).toBe(2.5)
    expect(resolveSessionLength('4')).toBe(4)
  })
})

describe('formatSessionTimeRange', () => {
  it('formats start time, end time, and duration', () => {
    expect(formatSessionTimeRange('09:30', 3)).toBe('9:30 to 12:30 (3h)')
  })

  it('supports fractional hours', () => {
    expect(formatSessionTimeRange('10:00', 2.5)).toBe('10:00 to 12:30 (2.5h)')
  })

  it('rounds fractional-minute end times from floating-point arithmetic', () => {
    expect(formatSessionTimeRange('09:30', 2.33)).toBe('9:30 to 11:50 (2.33h)')
  })

  it('defaults blank time and length to 09:30 and 3h', () => {
    expect(formatSessionTimeRange()).toBe('9:30 to 12:30 (3h)')
    expect(formatSessionTimeRange('', undefined)).toBe('9:30 to 12:30 (3h)')
  })

  it('defaults missing length when only time is provided', () => {
    expect(formatSessionTimeRange('10:00')).toBe('10:00 to 13:00 (3h)')
  })

  it('defaults missing time when only length is provided', () => {
    expect(formatSessionTimeRange(undefined, 2)).toBe('9:30 to 11:30 (2h)')
  })
})
