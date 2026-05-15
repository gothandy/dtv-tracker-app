import { describe, expect, it } from 'vitest'
import { pruneSelectionToVisible, visibleSelected } from './listSelection'

describe('listSelection', () => {
  it('pruneSelectionToVisible keeps only ids present in the visible list', () => {
    expect(pruneSelectionToVisible([1, 2, 3], [{ id: 2 }, { id: 4 }])).toEqual([2])
  })

  it('visibleSelected returns visible rows that are selected', () => {
    const visible = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }]
    expect(visibleSelected([1, 3], visible)).toEqual([{ id: 1, name: 'a' }])
  })
})
