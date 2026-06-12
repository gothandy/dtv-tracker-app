import { describe, expect, it } from 'vitest'
import { formatSessionTimeRange } from './sessionTime'

describe('formatSessionTimeRange', () => {
  it('formats start time, end time, and duration', () => {
    expect(formatSessionTimeRange('09:30', 3)).toBe('9:30 to 12:30 (3h)')
  })

  it('supports fractional hours', () => {
    expect(formatSessionTimeRange('10:00', 2.5)).toBe('10:00 to 12:30 (2.5h)')
  })

  it('shows start time only when length is missing', () => {
    expect(formatSessionTimeRange('09:30')).toBe('9:30')
  })

  it('shows duration only when start time is missing', () => {
    expect(formatSessionTimeRange(undefined, 3)).toBe('3h')
  })

  it('returns null when both values are missing', () => {
    expect(formatSessionTimeRange()).toBeNull()
  })
})
