import { describe, it, expect } from 'vitest'
import { placeDropdown, GAP, MARGIN } from './dropdownPlacement'

const area = { top: 0, bottom: 800, layoutHeight: 800 }
const box = (top: number, height = 40) => ({ top, bottom: top + height, left: 20, width: 300 })

describe('placeDropdown', () => {
  it('goes below, at full height, when there is room', () => {
    expect(placeDropdown(box(100), area, 280)).toEqual({
      side: 'below', top: 140 + GAP, left: 20, width: 300, maxHeight: 280,
    })
  })

  it('stays below, shorter, while below still has a reasonable amount of room', () => {
    const p = placeDropdown(box(560), area, 280)   // 800 - 600 - 4 - 8 = 188 below
    expect(p.side).toBe('below')
    expect(p.maxHeight).toBe(800 - 600 - GAP - MARGIN)
  })

  it('flips above when below is cramped and above has more room', () => {
    const p = placeDropdown(box(700), area, 280)   // 52 below, 688 above
    expect(p).toEqual({ side: 'above', bottom: 800 - 700 + GAP, left: 20, width: 300, maxHeight: 280 })
  })

  it('stays below when cramped both ways but below has more', () => {
    const p = placeDropdown(box(60, 600), { top: 0, bottom: 800, layoutHeight: 800 }, 280)
    expect(p.side).toBe('below')
    expect(p.maxHeight).toBe(800 - 660 - GAP - MARGIN)
  })

  it('uses the visible area, so a phone keyboard counts as the bottom', () => {
    // Keyboard up: only the top 400px is visible, though the page is 800px tall.
    const p = placeDropdown(box(300), { top: 0, bottom: 400, layoutHeight: 800 }, 240)
    expect(p.side).toBe('above')
    expect(p.bottom).toBe(800 - 300 + GAP)
    expect(p.maxHeight).toBe(240)
  })

  it('a short list stays below in a small space if it fits', () => {
    expect(placeDropdown(box(700), area, 40).side).toBe('below')   // 52 below, wants 40
  })

  it('never gives a negative height', () => {
    expect(placeDropdown(box(5, 40), { top: 0, bottom: 10, layoutHeight: 10 }, 200).maxHeight).toBe(0)
  })
})
