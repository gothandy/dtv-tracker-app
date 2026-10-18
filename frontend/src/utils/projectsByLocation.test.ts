import { describe, it, expect } from 'vitest'
import { projectsByLocationRows } from './projectsByLocation'
import type { Session } from '../types/session'

const TODAY = '2026-10-18'
const ORIGIN = 'https://tracker.dtv.org.uk'
const tree = [
  { label: 'XC', id: '1', children: [{ label: 'Freeminers', id: '2', children: [{ label: 'Boneyard', id: '3' }] }] },
  { label: 'DH', id: '4', children: [{ label: 'Corkscrew', id: '5' }] },
]
const s = (projectId: number, date: string) => ({ projectId, date }) as unknown as Session

const projects = [
  { id: 1, key: 'past', displayName: 'Past project', metadata: [{ label: 'XC:Freeminers:Boneyard' }], sessionCount: 1, hours: 10 },
  { id: 2, key: 'future', displayName: 'Future project', status: 'Active', metadata: [{ label: 'XC:Freeminers' }], sessionCount: 2, hours: 5.5 },
  { id: 3, key: 'new', displayName: 'New project', metadata: [{ label: 'XC' }], sessionCount: 0, hours: 0 },
]
const sessions = [s(1, '2026-01-10'), s(2, '2026-01-01'), s(2, '2026-11-03')]
const rows = projectsByLocationRows(projects, sessions, tree, '', ORIGIN, TODAY)
const locations = rows.filter(r => r[0] === 'Location')
const projectRows = (path: string) => rows.filter(r => r[0] === 'Project' && r[1] === path)

describe('projectsByLocationRows', () => {
  it('has a Location row for every tag, in order, saying No projects where there are none', () => {
    expect(locations.map(r => r[1])).toEqual(['XC', 'XC:Freeminers', 'XC:Freeminers:Boneyard', 'DH', 'DH:Corkscrew'])
    expect(locations.find(r => r[1] === 'DH:Corkscrew')?.[4]).toBe('No projects')
  })

  it('totals sessions and hours on each Location row', () => {
    const xc = locations.find(r => r[1] === 'XC')!
    expect([xc[4], xc[6], xc[7]]).toEqual(['3 projects', 3, 15.5])
    expect(xc[11]).toBe(`${ORIGIN}/projects?tag=XC`)
  })

  it('counts a project for its tags and the tags above, ordered none, future, past', () => {
    expect(projectRows('XC').map(r => r[4])).toEqual(['New project', 'Future project', 'Past project'])
  })

  it('gives each project its status, totals, timing, dates and link', () => {
    expect(projectRows('XC:Freeminers').find(r => r[4] === 'Future project')).toEqual([
      'Project', 'XC:Freeminers', 'XC', 2, 'Future project', 'Active',
      2, 5.5, 'Future', '2026-11-03', '2026-01-01', `${ORIGIN}/projects/future`,
    ])
  })

  it('with a tag filter, only that tag and beneath', () => {
    const filtered = projectsByLocationRows(projects, sessions, tree, 'XC:Freeminers', ORIGIN, TODAY)
    expect(filtered.filter(r => r[0] === 'Location').map(r => r[1])).toEqual(['XC:Freeminers', 'XC:Freeminers:Boneyard'])
  })
})
