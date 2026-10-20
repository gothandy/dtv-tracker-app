import { describe, it, expect } from 'vitest'
import { toggleExcluded, multiSelectSummary, lastTicked, parseValueList, valueListParam, MULTI_SELECT_ALL } from './multiSelect'

const options = [
  { value: 'Active', label: 'Active' },
  { value: 'Closed', label: 'Closed' },
  { value: 'Draft', label: 'Draft' },
  { value: '__none__', label: 'No status' },
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

  it('names the crossed-out options while they are fewer', () => {
    expect(multiSelectSummary(options, ['Closed'], 'All statuses')).toBe('Hide: Closed')
  })

  it('names the ticked options when they are fewer, or as many', () => {
    expect(multiSelectSummary(options, ['Active', 'Closed', 'Draft'], 'All statuses')).toBe('Show: No status')
    expect(multiSelectSummary(options, ['Active', 'Draft'], 'All statuses')).toBe('Show: Closed, No status')
  })

  it('says when everything is crossed out', () => {
    expect(multiSelectSummary(options, ['Active', 'Closed', 'Draft', '__none__'], 'All statuses')).toBe('All hidden')
  })
})

describe('lastTicked', () => {
  it('is the one option still ticked, so it cannot be crossed out', () => {
    expect(lastTicked(options, ['Active', 'Closed', 'Draft'])).toBe('__none__')
  })

  it('is nothing while two or more are ticked, or none are', () => {
    expect(lastTicked(options, ['Closed'])).toBeUndefined()
    expect(lastTicked(options, ['Active', 'Closed', 'Draft', '__none__'])).toBeUndefined()
  })
})

describe('parseValueList / valueListParam', () => {
  it('reads and writes the address form', () => {
    expect(parseValueList(['Closed', 'Draft'])).toEqual(['Closed', 'Draft'])
    expect(parseValueList('Closed')).toEqual(['Closed'])
    expect(parseValueList(undefined)).toEqual([])
    expect(valueListParam(['Closed', 'Draft'])).toEqual(['Closed', 'Draft'])
    expect(valueListParam([])).toBeUndefined()
  })

  it('keeps a value with a comma in it whole', () => {
    expect(parseValueList(valueListParam(['Design, funded']))).toEqual(['Design, funded'])
  })
})
