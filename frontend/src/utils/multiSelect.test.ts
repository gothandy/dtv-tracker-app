import { describe, it, expect } from 'vitest'
import { toggleExcluded, multiSelectSummary, parseValueList, valueListParam, MULTI_SELECT_ALL } from './multiSelect'

const options = [
  { value: 'Active', label: 'Active' },
  { value: 'Closed', label: 'Closed' },
  { value: 'Draft', label: 'Draft' },
  { value: 'none', label: 'No status' },
]

describe('toggleExcluded', () => {
  it('crosses out an option, then ticks it again', () => {
    expect(toggleExcluded([], 'Closed')).toEqual(['Closed'])
    expect(toggleExcluded(['Closed', 'Draft'], 'Closed')).toEqual(['Draft'])
  })

  it('All puts every tick back', () => {
    expect(toggleExcluded(['Closed', 'Draft'], MULTI_SELECT_ALL)).toEqual([])
  })
})

describe('multiSelectSummary', () => {
  it('shows the All label when nothing is crossed out', () => {
    expect(multiSelectSummary(options, [], 'All statuses')).toBe('All statuses')
  })

  it('names up to two crossed-out options, then counts them', () => {
    expect(multiSelectSummary(options, ['Closed'], 'All statuses')).toBe('Hiding: Closed')
    expect(multiSelectSummary(options, ['Closed', 'none'], 'All statuses')).toBe('Hiding: Closed, No status')
    expect(multiSelectSummary(options, ['Closed', 'Draft', 'none'], 'All statuses')).toBe('Hiding 3')
  })
})

describe('parseValueList / valueListParam', () => {
  it('reads and writes the address form', () => {
    expect(parseValueList('Closed,Draft')).toEqual(['Closed', 'Draft'])
    expect(parseValueList(undefined)).toEqual([])
    expect(valueListParam(['Closed', 'Draft'])).toBe('Closed,Draft')
    expect(valueListParam([])).toBeUndefined()
  })
})
