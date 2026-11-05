import { describe, it, expect } from 'vitest'
import { matchesProfileRecordFilter, NO_RECORD, oneRecordPerType } from './profile-record-filter'

const alice = [{ type: 'Photo Consent', state: 'Declined' }, { type: 'Discount Card', state: 'Accepted' }]
const bob = [{ type: 'Photo Consent', state: 'Accepted' }]
const cy: { type: string; state: string }[] = []
const people = { alice, bob, cy }
const who = (type: string, state: string) =>
  Object.entries(people).filter(([, recs]) => matchesProfileRecordFilter(recs, type, state)).map(([name]) => name)

describe('matchesProfileRecordFilter', () => {
  it('matches everyone with no Record filter', () => {
    expect(who('', '')).toEqual(['alice', 'bob', 'cy'])
  })

  it('Type alone: has a Record of the Type', () => {
    expect(who('Discount Card', '')).toEqual(['alice'])
  })

  it('Type and Status: the Type’s Record has the Status, or No record of it', () => {
    expect(who('Photo Consent', 'Accepted')).toEqual(['bob'])
    expect(who('Discount Card', NO_RECORD)).toEqual(['bob', 'cy'])
  })

  it('Status alone: any Record has the Status, or No Records at all', () => {
    expect(who('', 'Declined')).toEqual(['alice'])
    expect(who('', 'Accepted')).toEqual(['alice', 'bob'])
    expect(who('', NO_RECORD)).toEqual(['cy'])
  })
})

describe('oneRecordPerType', () => {
  it('keeps the first Record of each Type', () => {
    const recs = [{ type: 'A', state: '1' }, { type: 'B', state: '2' }, { type: 'A', state: '3' }]
    expect(oneRecordPerType(recs)).toEqual([{ type: 'A', state: '1' }, { type: 'B', state: '2' }])
  })
})
