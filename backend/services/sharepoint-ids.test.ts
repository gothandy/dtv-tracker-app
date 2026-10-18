import { describe, it, expect } from 'vitest'
import { addressOf, matchAddresses } from './sharepoint-ids'
import { SHAREPOINT_ADDRESSES } from '../config'

const SITE = 'https://dtvolunteers.sharepoint.com/sites/tracker-preview'

function located(address: string, id = `id-${address}`) {
  return { id, webUrl: `${SITE}/${address.split('/').map(encodeURIComponent).join('/')}` }
}

const ALL_LISTS = Object.values(SHAREPOINT_ADDRESSES.lists).map(a => located(a))
const ALL_DRIVES = Object.values(SHAREPOINT_ADDRESSES.libraries).map(a => located(a))

describe('addressOf', () => {
  it('is the path after the site, decoded and in lower case', () => {
    expect(addressOf(`${SITE}/Shared%20Documents`, SITE)).toBe('shared documents')
    expect(addressOf(`${SITE}/Lists/Groups/`, SITE)).toBe('lists/groups')
  })

  it('ignores case in the site part', () => {
    expect(addressOf('https://dtvolunteers.sharepoint.com/sites/Tracker-Preview/Lists/Groups', SITE)).toBe('lists/groups')
  })
})

describe('matchAddresses', () => {
  it('finds every list and library by address', () => {
    const ids = matchAddresses(ALL_LISTS, ALL_DRIVES, SITE)
    expect(ids.lists.templates).toBe('id-Lists/Templates')
    expect(ids.libraries.documents).toBe('id-Shared Documents')
  })

  it("uses each list's own ID", () => {
    const lists = ALL_LISTS.map(l => l.id === 'id-Lists/Groups' ? { ...l, id: 'groups-id' } : l)
    expect(matchAddresses(lists, ALL_DRIVES, SITE).lists.groups).toBe('groups-id')
  })

  it("names what's missing and what is on the site", () => {
    const lists = ALL_LISTS.filter(l => !l.webUrl.endsWith('/Templates'))
    expect(() => matchAddresses(lists, ALL_DRIVES, SITE)).toThrow(/Not found on .*: Lists\/Templates\. On the site: .*lists\/groups/)
  })
})
