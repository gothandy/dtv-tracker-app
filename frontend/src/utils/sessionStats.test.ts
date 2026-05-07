import { describe, expect, it } from 'vitest'
import { sessionDisplayStats } from './sessionStats'

describe('sessionDisplayStats', () => {
  it('reduces effective regulars by cancelled regular count', () => {
    const display = sessionDisplayStats(
      { count: 12, hours: 36, regular: 6, cancelledRegular: 2 },
      10,
      { total: 20 },
    )

    expect(display.regular).toBe(6)
    expect(display.effectiveRegularsCount).toBe(8)
  })

  it('never returns a negative effective regulars count', () => {
    const display = sessionDisplayStats(
      { count: 3, hours: 9, regular: 1, cancelledRegular: 5 },
      2,
      { total: 10 },
    )

    expect(display.effectiveRegularsCount).toBe(0)
  })
})
