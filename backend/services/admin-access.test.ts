import { describe, it, expect, beforeAll } from 'vitest'
import { staffSessionUser } from './personal-auth'
import { chosenAccess } from './auth-store'
import type { SharePointProfile } from '../../types/sharepoint'

const profile = { ID: 7, Title: 'Alice Admin', Created: '', Modified: '' } as SharePointProfile
const NOW = '2026-10-18T10:00:00Z'

beforeAll(() => { process.env.TRACKER_ADMIN_USERS = 'alice@dtv.org.uk' })

describe('chosenAccess', () => {
  it('is Check In unless the device has Admin switched on', () => {
    expect(chosenAccess({ cookies: {} } as any)).toBe('checkin')
    expect(chosenAccess({ cookies: { 'dtv-access': 'admin' } } as any)).toBe('admin')
    expect(chosenAccess({ cookies: { 'dtv-access': 'superuser' } } as any)).toBe('checkin')
  })
})

describe('staffSessionUser', () => {
  it('starts an Admin as Check In by default', () => {
    const user = staffSessionUser(profile, 'alice@dtv.org.uk', NOW)
    expect(user.role).toBe('checkin')
    expect(user.canBeAdmin).toBe(true)
  })

  it('gives an Admin Admin when they switched it on', () => {
    expect(staffSessionUser(profile, 'alice@dtv.org.uk', NOW, 'admin').role).toBe('admin')
  })

  it('never gives Admin to someone not on the admin list', () => {
    const user = staffSessionUser(profile, 'bob@dtv.org.uk', NOW, 'admin')
    expect(user.role).toBe('checkin')
    expect(user.canBeAdmin).toBe(false)
  })
})
