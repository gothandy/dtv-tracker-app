import { describe, it, expect } from 'vitest'
import { isUntil, stateLabel, stateStyle, stateTypes, statesOfType, type RecordState } from './record-state'

const invited: RecordState = { id: 1, type: 'Parking Permit', name: 'Invite', after: 'Invited', afterStyle: 'Info' }
const permit: RecordState = { id: 3, type: 'Parking Permit', name: 'Active', before: 'Expires', after: 'Expired', beforeStyle: 'Active', afterStyle: 'Warn' }
const bare: RecordState = { id: 9, type: 'Photo Consent', name: 'Accepted' }

describe('From and Until States', () => {
  it('an empty Before is a From State; a filled one is an Until State', () => {
    expect(isUntil(invited)).toBe(false)
    expect(isUntil(permit)).toBe(true)
    expect(isUntil({ ...permit, before: '  ' })).toBe(false)
  })

  it('a From State shows its After label (or Name) whatever the date', () => {
    expect(stateLabel(invited, '2026-11-10', '2026-11-04')).toBe('Invited')
    expect(stateLabel(invited, '2026-01-01', '2026-11-04')).toBe('Invited')
    expect(stateLabel(bare, '2026-01-01', '2026-11-04')).toBe('Accepted')
  })

  it('an Until State shows Before up to and including its Date, After from the next day', () => {
    expect(stateLabel(permit, '2026-12-31', '2026-11-04')).toBe('Expires')
    expect(stateLabel(permit, '2026-12-31', '2026-12-31')).toBe('Expires')
    expect(stateLabel(permit, '2026-12-31', '2027-01-01')).toBe('Expired')
    expect(stateLabel(permit, '2026-12-31T00:00:00Z', '2027-01-01')).toBe('Expired')
  })

  it('an Until State with no Date shows its Before side', () => {
    expect(stateLabel(permit, undefined, '2026-11-04')).toBe('Expires')
  })

  it('the style follows the side showing, with no fallback between the two', () => {
    expect(stateStyle(permit, '2026-12-31', '2026-11-04')).toBe('active')
    expect(stateStyle(permit, '2026-12-31', '2027-01-01')).toBe('warn')
    expect(stateStyle(invited, '2026-11-01', '2026-11-04')).toBe('info')
    expect(stateStyle({ ...permit, afterStyle: undefined }, '2026-12-31', '2027-01-01')).toBeUndefined()
    expect(stateStyle({ ...permit, beforeStyle: 'Default' }, '2026-12-31', '2026-11-04')).toBeUndefined()
    expect(stateStyle(bare, '2026-01-01', '2026-11-04')).toBeUndefined()
  })
})

describe('stateTypes and statesOfType', () => {
  const states: RecordState[] = [
    { id: 5, type: 'Privacy Consent', name: 'Consent' },
    { id: 2, type: 'Parking Permit', name: 'Decline' },
    { id: 1, type: 'Parking Permit', name: 'Invite' },
    { id: 4, type: 'Privacy Consent', name: 'Invite' },
    { id: 3, type: 'Parking Permit', name: 'Active' },
  ]
  it('lists the Types, and a Type’s States, by ID', () => {
    expect(stateTypes(states)).toEqual(['Parking Permit', 'Privacy Consent'])
    expect(statesOfType(states, 'Parking Permit').map(s => s.name)).toEqual(['Invite', 'Decline', 'Active'])
    expect(statesOfType(states, 'DofE')).toEqual([])
  })
})
