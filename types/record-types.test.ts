import { describe, it, expect } from 'vitest'
import { RECORD_TYPES, recordType } from './record-types'

describe('RECORD_TYPES', () => {
  it('has the ten Types from #322, including one DofE', () => {
    expect(Object.keys(RECORD_TYPES)).toHaveLength(10)
    expect(Object.keys(RECORD_TYPES).filter(t => t.includes('DofE'))).toEqual(['DofE'])
  })

  it('looks up a Type by its SharePoint name, and gives undefined for an unknown one', () => {
    expect(recordType('Parking Permit')?.notesHint).toBe('Two Veh. Reg.')
    expect(recordType('Privacy Consent')?.dateFields).toBe('start')
    expect(recordType('Something New')).toBeUndefined()
    expect(recordType(undefined)).toBeUndefined()
  })
})
