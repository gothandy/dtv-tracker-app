import { describe, it, expect } from 'vitest'
import { RECORD_TYPE_NAMES } from './record-types'

describe('RECORD_TYPE_NAMES', () => {
  it('has the ten Types, including one DofE', () => {
    expect(RECORD_TYPE_NAMES).toHaveLength(10)
    expect(RECORD_TYPE_NAMES.filter(t => t.includes('DofE'))).toEqual(['DofE'])
  })
})
